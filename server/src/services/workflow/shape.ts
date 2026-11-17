import crypto from 'crypto';
import { STEP_TYPES, TRIGGER_TYPES, WfStep, WfPath, WfCondition, StepType, TriggerType } from '../../models/Workflow';

/**
 * The step tree: cleaning what the builder sends, finding the next step, and the checks that must
 * pass before a workflow can be switched on. Pure — no database.
 */

export const LIMITS = { steps: 200, depth: 6, paths: 8, conditions: 12, text: 4096, options: 10 };
const newId = () => crypto.randomBytes(5).toString('hex');
const str = (v: any, max = LIMITS.text) => (v == null ? '' : String(v)).slice(0, max);
const isObj = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v);

/** Keep only plain JSON values (no functions, no $-keys that Mongo would refuse). */
function cleanConfig(c: any, depth = 0): Record<string, any> {
  if (!isObj(c) || depth > 4) return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(c)) {
    if (k.startsWith('$') || k.includes('.')) continue;
    if (v == null || typeof v === 'boolean' || typeof v === 'number') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, 20000);
    else if (Array.isArray(v)) out[k] = v.slice(0, 50).map((x) => (isObj(x) ? cleanConfig(x, depth + 1) : typeof x === 'string' ? x.slice(0, 2000) : x));
    else if (isObj(v)) out[k] = cleanConfig(v, depth + 1);
  }
  return out;
}

function cleanConditions(raw: any): WfCondition[] {
  return (Array.isArray(raw) ? raw : []).slice(0, LIMITS.conditions)
    .filter((c) => isObj(c) && c.op)
    .map((c) => ({ field: str(c.field, 80), op: str(c.op, 20), value: Array.isArray(c.value) ? c.value.slice(0, 50).map((x: any) => str(x, 200)) : c.value == null ? '' : str(c.value, 500) }));
}

/** Clean the tree from the builder. Gives every step/path an id; counts steps against the limit. */
export function cleanSteps(raw: any, depth = 0, seen = new Set<string>(), count = { n: 0 }): WfStep[] {
  if (!Array.isArray(raw) || depth > LIMITS.depth) return [];
  const out: WfStep[] = [];
  for (const s of raw) {
    if (!isObj(s) || !STEP_TYPES.includes(s.type)) continue;
    if (++count.n > LIMITS.steps) break;
    let id = str(s.id, 40).replace(/[^a-zA-Z0-9_-]/g, '') || newId();
    if (seen.has(id)) id = newId();
    seen.add(id);
    const step: WfStep = { id, type: s.type as StepType, config: cleanConfig(s.config) };
    if (s.type === 'paths') {
      step.paths = (Array.isArray(s.paths) ? s.paths : []).slice(0, LIMITS.paths).filter(isObj).map((p: any, i: number): WfPath => {
        let pid = str(p.id, 40).replace(/[^a-zA-Z0-9_-]/g, '') || newId();
        if (seen.has(pid)) pid = newId();
        seen.add(pid);
        return {
          id: pid, name: str(p.name, 80) || `Path ${String.fromCharCode(65 + i)}`, match: p.match === 'any' ? 'any' : 'all',
          conditions: cleanConditions(p.conditions), steps: cleanSteps(p.steps, depth + 1, seen, count),
        };
      });
    }
    out.push(step);
    if (s.type === 'stop') break; // nothing after a stop can ever run
  }
  return out;
}

export function cleanTrigger(raw: any): { type: TriggerType; config: Record<string, any> } {
  const type = TRIGGER_TYPES.includes(raw?.type) ? raw.type : 'lead_created';
  return { type, config: cleanConfig(raw?.config) };
}

/* ── Navigation ─────────────────────────────────────────────────────────── */
export interface StepIndexEntry { step: WfStep; next: string | null; number: string }
/**
 * For every step: the step itself and the step that follows it once it is done (climbing out of a
 * branch when the branch ends). Paths steps are entered by the engine choosing a branch.
 */
export function indexSteps(steps: WfStep[]): Map<string, StepIndexEntry> {
  const map = new Map<string, StepIndexEntry>();
  const walk = (list: WfStep[], after: string | null, prefix: string) => {
    list.forEach((s, i) => {
      const next = i + 1 < list.length ? list[i + 1].id : after;
      const number = `${prefix}${i + 1}`;
      map.set(s.id, { step: s, next, number });
      if (s.type === 'paths') (s.paths || []).forEach((p, pi) => walk(p.steps || [], next, `${number}${String.fromCharCode(65 + pi)}.`));
    });
  };
  walk(steps, null, '');
  return map;
}

/* ── Checks before switching on ─────────────────────────────────────────── */
export interface Problem { stepId?: string; message: string }

const BUTTON_MAX = 3, BUTTON_TITLE = 20, LIST_TITLE = 24;

export function stepProblems(s: WfStep): string[] {
  const c = s.config || {};
  const p: string[] = [];
  switch (s.type) {
    case 'send_message': if (!str(c.text).trim()) p.push('Type the message'); break;
    case 'send_template': if (!c.templateId) p.push('Choose an approved template'); break;
    case 'send_media':
      if (!/^https:\/\//i.test(str(c.url))) p.push('Give a public https link to the file');
      break;
    case 'ask_question': {
      if (!str(c.question).trim()) p.push('Type the question');
      if (!/^[a-z][a-z0-9_]{0,30}$/.test(str(c.key))) p.push('Give the answer a short name (letters, numbers, _), e.g. passout_year');
      const opts = (Array.isArray(c.options) ? c.options : []).map((o: any) => str(o).trim()).filter(Boolean);
      if (c.answerType === 'buttons') {
        if (!opts.length || opts.length > BUTTON_MAX) p.push(`Buttons need 1 to ${BUTTON_MAX} options`);
        if (opts.some((o: string) => o.length > BUTTON_TITLE)) p.push(`A button can show at most ${BUTTON_TITLE} characters`);
      }
      if (c.answerType === 'list') {
        if (!opts.length || opts.length > LIMITS.options) p.push(`A list needs 1 to ${LIMITS.options} options`);
        if (opts.some((o: string) => o.length > LIST_TITLE)) p.push(`A list option can show at most ${LIST_TITLE} characters`);
      }
      if (new Set(opts.map((o: string) => o.toLowerCase())).size !== opts.length) p.push('Two options are the same');
      break;
    }
    case 'ai_reply': if (str(c.knowledge).trim().length < 20) p.push('Add what the AI may answer from (courses, fees, timings…)'); break;
    case 'wait': if (!(Number(c.amount) > 0)) p.push('How long to wait?'); break;
    case 'wait_until': if (!Number.isFinite(Number(c.offsetMinutes))) p.push('When, relative to the demo?'); break;
    case 'paths': {
      const paths = s.paths || [];
      if (paths.length < 1) p.push('Add at least one path');
      paths.forEach((pa, i) => {
        if (!pa.conditions.length && i < paths.length - 1) p.push(`"${pa.name}" has no conditions, so it catches everyone and the paths after it never run — move it to the end or add a condition`);
        pa.conditions.forEach((cd) => {
          if (!cd.field || /\.$/.test(cd.field)) p.push(`"${pa.name}": choose what to check`);
          else if (!['empty', 'not_empty'].includes(cd.op) && (Array.isArray(cd.value) ? !cd.value.length : !String(cd.value ?? '').trim())) p.push(`"${pa.name}": give a value to compare with`);
        });
      });
      break;
    }
    case 'update_lead':
      if (!c.stageId && !c.priority && !str(c.note).trim() && !(c.field && c.field !== '')) p.push('Choose what to change');
      if (c.field && !str(c.value).trim()) p.push('Give the new value');
      break;
    case 'assign': if (c.mode === 'user' && !c.userId) p.push('Choose who gets the lead'); break;
    case 'follow_up': if (!str(c.title).trim()) p.push('Give the follow-up a title'); break;
    case 'notify': if (!str(c.message).trim()) p.push('Type the notification'); break;
    case 'webhook': if (!/^https:\/\//i.test(str(c.url))) p.push('The webhook must be an https link'); break;
    default: break;
  }
  return p;
}

/** Everything that must be fixed before the workflow may be switched on. */
export function workflowProblems(w: { trigger: { type: string; config: any }; steps: WfStep[] }): Problem[] {
  const out: Problem[] = [];
  const t = w.trigger?.config || {};
  if (w.trigger?.type === 'message_received' && t.match === 'keywords') {
    const kws = (Array.isArray(t.keywords) ? t.keywords : []).map((k: any) => str(k).trim()).filter(Boolean);
    if (!kws.length) out.push({ message: 'Add at least one keyword to the trigger' });
  }
  if (w.trigger?.type === 'stage_changed' && !(Array.isArray(t.stageIds) && t.stageIds.length)) out.push({ message: 'Choose the stage(s) that start this workflow' });
  if (!w.steps?.length) out.push({ message: 'Add at least one step' });
  const demoAnchored = ['demo_booked'].includes(w.trigger?.type);
  for (const [, e] of indexSteps(w.steps || [])) {
    for (const m of stepProblems(e.step)) out.push({ stepId: e.step.id, message: `Step ${e.number}: ${m}` });
    if (e.step.type === 'wait_until' && !demoAnchored) out.push({ stepId: e.step.id, message: `Step ${e.number}: "Wait until demo time" only works when the trigger is "Demo booked"` });
  }
  return out;
}
