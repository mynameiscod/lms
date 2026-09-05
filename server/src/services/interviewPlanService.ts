import InterviewPlan, {
  IInterviewPlan, IInterviewRound, IInterviewQuota, InterviewRoundType,
  ROUND_TYPES, ROUND_TYPE_LABEL, PLAN_BOUNDS, DEFAULT_PLAN_SHAPE,
} from '../models/InterviewPlan';
import {
  IMemberAudience, EMPTY_MEMBER_AUDIENCE, readMemberAudience, audienceServes,
  audienceIsOpen, AudienceMember,
} from '../models/memberAudience';

/**
 * Resolving and validating interview plans.
 *
 * Kept out of the controller because the RESOLVER is the half the interview runtime will
 * call later: `start()` will ask "which plan governs this member" with exactly the question
 * the admin preview asks now. Two implementations of that — one to show the admin, one to
 * act on — is how a preview ends up lying about what the product will do.
 */

export interface PlanTotals { questions: number; minutes: number }

export const planTotals = (rounds: IInterviewRound[] | undefined): PlanTotals => {
  const rs = rounds || [];
  return {
    questions: rs.reduce((n, r) => n + (Number(r.questions) || 0), 0),
    minutes:   rs.reduce((n, r) => n + (Number(r.minutes) || 0), 0),
  };
};

export const roundLabel = (r: IInterviewRound): string =>
  (r.label || '').trim() || ROUND_TYPE_LABEL[r.type] || r.type;

// ─── Normalising admin input ─────────────────────────────────────────────────

const clampInt = (v: any, lo: number, hi: number, dflt: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
};

const normalizeRound = (raw: any): IInterviewRound | null => {
  const type = String(raw?.type || '') as InterviewRoundType;
  if (!ROUND_TYPES.includes(type)) return null;
  return {
    type,
    label:     String(raw?.label || '').trim().slice(0, 60),
    questions: clampInt(raw?.questions, PLAN_BOUNDS.questionsPerRound.min, PLAN_BOUNDS.questionsPerRound.max, 2),
    minutes:   clampInt(raw?.minutes,   PLAN_BOUNDS.minutesPerRound.min,   PLAN_BOUNDS.minutesPerRound.max,   8),
  };
};

/**
 * Read a plan off a request body, clamped to PLAN_BOUNDS.
 *
 * Clamped rather than rejected: an admin who types 40 questions has made a typo, and the
 * useful response is a paper of the largest legal size with the ceiling shown on screen,
 * not a form that throws away everything else they typed.
 */
export function normalizePlanInput(body: any): {
  name: string; active: boolean; fallback: boolean; priority: number;
  audience: IMemberAudience; rounds: IInterviewRound[]; quota: IInterviewQuota; notes: string;
} {
  const rounds = (Array.isArray(body?.rounds) ? body.rounds : [])
    .map(normalizeRound)
    .filter((r: IInterviewRound | null): r is IInterviewRound => !!r)
    .slice(0, PLAN_BOUNDS.rounds.max);

  return {
    name:     String(body?.name || '').trim().slice(0, 80) || 'Untitled plan',
    active:   body?.active !== false,
    fallback: !!body?.fallback,
    priority: clampInt(body?.priority, PLAN_BOUNDS.priority.min, PLAN_BOUNDS.priority.max, 0),
    // A fallback plan is the catch-all by definition, so it carries no targeting however
    // the form was filled in — saving one with an audience would produce a "catches whoever
    // is left" plan that leaves most people out.
    audience: body?.fallback ? EMPTY_MEMBER_AUDIENCE() : readMemberAudience(body?.audience),
    rounds,
    quota: {
      perThirtyDays: clampInt(body?.quota?.perThirtyDays, PLAN_BOUNDS.perThirtyDays.min, PLAN_BOUNDS.perThirtyDays.max, 0),
      cooldownHours: clampInt(body?.quota?.cooldownHours, PLAN_BOUNDS.cooldownHours.min, PLAN_BOUNDS.cooldownHours.max, 0),
    },
    notes: String(body?.notes || '').trim().slice(0, 500),
  };
}

// ─── Resolving one member's plan ─────────────────────────────────────────────

export interface PlanTraceRow {
  id: string;
  name: string;
  priority: number;
  fallback: boolean;
  matched: boolean;
  /** Why it lost, in the admin's own vocabulary. */
  reason: string;
}

export interface ResolvedPlan {
  /** Null means no plan matched — the member gets DEFAULT_PLAN_SHAPE. */
  plan: IInterviewPlan | null;
  rounds: IInterviewRound[];
  quota: IInterviewQuota;
  trace: PlanTraceRow[];
}

const norm = (v: any): string => String(v ?? '').trim().toLowerCase();

/** The first axis that excluded this member, phrased for a human. */
function whyExcluded(a: IMemberAudience | undefined, m: AudienceMember): string {
  if (!a) return '';
  const fails = (allowed: string[] | undefined, values: (string | null | undefined)[]): boolean => {
    if (!allowed || !allowed.length) return false;
    const want = new Set(allowed.map(norm).filter(Boolean));
    if (!want.size) return false;
    return !values.some(v => v && want.has(norm(v)));
  };
  if (fails(a.years,    [m.yearOfStudy]))              return `year is ${m.yearOfStudy || 'not set'}`;
  if (fails(a.courses,  [m.degree, m.program]))        return `course is ${m.degree || m.program || 'not set'}`;
  if (fails(a.branches, [m.branch]))                   return `branch is ${m.branch || 'not set'}`;
  if (fails(a.roles,    [m.primaryRole, m.secondaryRole])) return `role is ${m.primaryRole || 'not set'}`;
  if (fails(a.stages,   [m.stage]))                    return `stage is ${m.stage || 'not set'}`;
  return '';
}

/**
 * Which plan governs this member.
 *
 * ORDINARY PLANS FIRST, BY PRIORITY, FIRST MATCH WINS. The fallback is considered only
 * once every one of them has failed — regardless of the number it was saved with, because a
 * catch-all that could outrank a specific plan by having a bigger priority would make the
 * specific plan unreachable for reasons invisible on the screen.
 *
 * Inactive plans are not candidates and are not traced: an admin who switched one off does
 * not need to be told repeatedly that it did not apply.
 */
export function resolvePlan(plans: IInterviewPlan[], member: AudienceMember | null): ResolvedPlan {
  const m = member || {};
  const active = plans.filter(p => p.active);
  // Stable: sort only on priority, so equal priorities keep author order.
  const ordinary = active.filter(p => !p.fallback)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const fallback = active.find(p => p.fallback) || null;

  const trace: PlanTraceRow[] = [];
  let winner: IInterviewPlan | null = null;

  for (const p of ordinary) {
    const ok = audienceServes(p.audience, m);
    if (ok && !winner) {
      winner = p;
      trace.push({ id: String(p._id), name: p.name, priority: p.priority || 0, fallback: false, matched: true, reason: 'matched' });
    } else {
      trace.push({
        id: String(p._id), name: p.name, priority: p.priority || 0, fallback: false, matched: false,
        reason: ok ? 'matched, but a higher-priority plan won' : (whyExcluded(p.audience, m) || 'audience does not match'),
      });
    }
  }

  if (fallback) {
    trace.push({
      id: String(fallback._id), name: fallback.name, priority: fallback.priority || 0, fallback: true,
      matched: !winner, reason: winner ? 'not needed — an earlier plan matched' : 'catches whoever is left',
    });
    if (!winner) winner = fallback;
  }

  return {
    plan: winner,
    rounds: winner?.rounds?.length ? winner.rounds : [...DEFAULT_PLAN_SHAPE.rounds],
    quota:  winner?.quota || { ...DEFAULT_PLAN_SHAPE.quota },
    trace,
  };
}

/** Load a tenant's plans and resolve in one step. The call the runtime will make. */
export async function resolvePlanForMember(tenantId: string, member: AudienceMember | null): Promise<ResolvedPlan> {
  const plans = await InterviewPlan.find({ tenantId }).sort({ priority: -1, createdAt: 1 }).lean() as any as IInterviewPlan[];
  return resolvePlan(plans, member);
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface PlanWarning {
  level: 'warn' | 'info';
  /** The plan it is about, when it is about one. */
  planId?: string;
  message: string;
}

/**
 * Does `higher` reach everyone `lower` reaches?
 *
 * True when, on every axis, `higher` is either unconstrained or a superset of `lower`'s
 * values. If it is, `lower` can never win a match it is below in priority — it is dead
 * config, and the admin will keep editing it wondering why nothing changes.
 */
function audienceCovers(higher: IMemberAudience | undefined, lower: IMemberAudience | undefined): boolean {
  const h = higher || EMPTY_MEMBER_AUDIENCE();
  const l = lower || EMPTY_MEMBER_AUDIENCE();
  const axes: (keyof IMemberAudience)[] = ['years', 'courses', 'branches', 'roles', 'stages'];
  return axes.every(k => {
    const hv = (h[k] || []).map(norm).filter(Boolean);
    if (!hv.length) return true;                      // higher unconstrained → covers everything
    const lv = (l[k] || []).map(norm).filter(Boolean);
    if (!lv.length) return false;                     // lower unconstrained, higher is not
    const set = new Set(hv);
    return lv.every(v => set.has(v));
  });
}

/**
 * What is wrong, or worth knowing, about a set of plans.
 *
 * Warnings rather than save-blockers. Half of these are legitimate mid-edit states — a plan
 * with no rounds is what a half-written plan looks like — and a screen that refuses to save
 * work in progress is a screen admins stop using.
 */
export function validatePlans(plans: IInterviewPlan[]): PlanWarning[] {
  const out: PlanWarning[] = [];
  const active = plans.filter(p => p.active);

  if (!plans.length) {
    out.push({ level: 'info', message: 'No plans yet. Every member gets the built-in default: 6 questions, untimed, unlimited sittings.' });
    return out;
  }

  const fallbacks = active.filter(p => p.fallback);
  if (!fallbacks.length) {
    out.push({
      level: 'warn',
      message: 'No active catch-all plan. Members who match none of the plans below fall back to the built-in default (6 questions, unlimited), which no quota applies to.',
    });
  }
  if (fallbacks.length > 1) {
    out.push({
      level: 'warn',
      message: `${fallbacks.length} plans are marked as the catch-all. Only the first is ever used — mark the others as ordinary plans or switch them off.`,
    });
  }

  for (const p of plans) {
    const t = planTotals(p.rounds);
    if (!p.rounds?.length) {
      out.push({ level: 'warn', planId: String(p._id), message: `"${p.name}" has no rounds, so it cannot build an interview.` });
    }
    if (t.questions > PLAN_BOUNDS.totalQuestions.max) {
      out.push({
        level: 'warn', planId: String(p._id),
        message: `"${p.name}" asks ${t.questions} questions. Only the first ${PLAN_BOUNDS.totalQuestions.max} get per-question coaching in the feedback, so the rest are asked but never coached.`,
      });
    }
    if (p.active && !p.fallback && audienceIsOpen(p.audience)) {
      out.push({
        level: 'info', planId: String(p._id),
        message: `"${p.name}" targets everyone, so no lower-priority plan below it can ever match. Mark it as the catch-all if that is what you meant.`,
      });
    }
    if (p.active && p.quota.perThirtyDays === 0) {
      out.push({ level: 'info', planId: String(p._id), message: `"${p.name}" sets no limit — members on it can sit unlimited interviews.` });
    }
  }

  // Shadowing. Ordinary plans only, in the order they actually apply.
  const ordinary = active.filter(p => !p.fallback).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (let i = 0; i < ordinary.length; i++) {
    for (let j = 0; j < i; j++) {
      if (audienceCovers(ordinary[j].audience, ordinary[i].audience)) {
        out.push({
          level: 'warn', planId: String(ordinary[i]._id),
          message: `"${ordinary[i].name}" can never match: "${ordinary[j].name}" is above it and already reaches everyone it targets.`,
        });
        break;
      }
    }
  }

  return out;
}

export { ROUND_TYPES, ROUND_TYPE_LABEL, PLAN_BOUNDS, DEFAULT_PLAN_SHAPE };
