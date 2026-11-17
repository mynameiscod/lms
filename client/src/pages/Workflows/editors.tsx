import React, { useRef } from 'react';
import { Step, Path, Condition, Options, Workflow, TriggerType, WfSettings } from '../../api/workflowApi';
import {
  TRIGGERS, STEPS, BASE_VARS, DEMO_VARS, answerKeys, conditionFields, OPS, opsFor, FieldDef,
  PRIORITIES, CALL_OUTCOMES, DEMO_OUTCOMES, MEETING_TYPES, SAVE_TO, offsetText,
} from './meta';

/* ── Small inputs ─────────────────────────────────────────────────────── */

/** Textarea (or input) with clickable {{placeholder}} chips that insert at the cursor. */
export const VarText: React.FC<{ value: string; onChange: (v: string) => void; vars: { key: string; label: string }[]; rows?: number; single?: boolean; placeholder?: string }> = ({ value, onChange, vars, rows = 4, single, placeholder }) => {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const insert = (k: string) => {
    const el = ref.current;
    const token = `{{${k}}}`;
    const v = value || '';
    if (!el) { onChange(v + token); return; }
    const a = el.selectionStart ?? v.length, b = el.selectionEnd ?? v.length;
    onChange(v.slice(0, a) + token + v.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + token.length, a + token.length); });
  };
  return (
    <>
      {single
        ? <input ref={ref} className="wf-input" value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        : <textarea ref={ref} className="wf-textarea" rows={rows} value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
      <div className="wf-chips">{vars.map(v => <button type="button" key={v.key} className="wf-chip var" title={`Insert {{${v.key}}}`} onClick={() => insert(v.key)}>{v.label}</button>)}</div>
    </>
  );
};

/** Toggle chips for a multi-select; nothing selected means "any". */
export const MultiChips: React.FC<{ options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; empty?: string }> = ({ options, value, onChange, empty }) => (
  <div>
    <div className="wf-chips">
      {options.map(o => {
        const on = value.includes(o.value);
        return <button type="button" key={o.value} className={`wf-chip ${on ? 'on' : ''}`} onClick={() => onChange(on ? value.filter(x => x !== o.value) : [...value, o.value])}>{o.label}</button>;
      })}
      {!options.length && <span className="wf-hint">Nothing to choose yet.</span>}
    </div>
    {empty && !value.length && <small className="wf-hint">{empty}</small>}
  </div>
);

/** Comma/Enter separated tags (keywords). */
const Tags: React.FC<{ value: string[]; onChange: (v: string[]) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = React.useState('');
  const add = () => {
    const parts = draft.split(',').map(x => x.trim()).filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])));
    setDraft('');
  };
  return (
    <div>
      <input className="wf-input" value={draft} placeholder={placeholder} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
      <div className="wf-chips">{value.map(k => <button type="button" key={k} className="wf-chip on" onClick={() => onChange(value.filter(x => x !== k))}>{k} ×</button>)}</div>
    </div>
  );
};

const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label className="wf-check-row"><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} /><span>{label}{hint && <small>{hint}</small>}</span></label>
);

const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="wf-field"><label>{label}</label>{children}{hint && <small>{hint}</small>}</div>
);

/* ── Trigger ──────────────────────────────────────────────────────────── */
export const TriggerEditor: React.FC<{ wf: Workflow; onChange: (t: Workflow['trigger']) => void; options: Options | null }> = ({ wf, onChange, options }) => {
  const t = wf.trigger;
  const c = t.config || {};
  const set = (patch: Record<string, any>) => onChange({ ...t, config: { ...c, ...patch } });
  const list = (v: any): string[] => (Array.isArray(v) ? v : []);
  return (
    <>
      <Field label="Start this workflow when…">
        <select className="wf-select" value={t.type} onChange={e => onChange({ type: e.target.value as TriggerType, config: {} })}>
          {(Object.keys(TRIGGERS) as TriggerType[]).map(k => <option key={k} value={k}>{TRIGGERS[k].label}</option>)}
        </select>
        <small>{TRIGGERS[t.type].what}</small>
      </Field>

      {t.type === 'lead_created' && (
        <Field label="Only leads from these sources">
          <MultiChips options={(options?.sources || []).map(s => ({ value: s, label: s }))} value={list(c.sources)} onChange={v => set({ sources: v })} empty="None picked = every source." />
          <div className="wf-warn">Avoid double messages: if this workflow sends the welcome, switch off the old “WhatsApp welcome” on <a href="/lead-sources">Lead Sources</a>, and for <b>whatsapp</b> leads the old <a href="/qualification-settings">Qualification Questions</a> bot (or leave the whatsapp source out here).</div>
        </Field>
      )}
      {t.type === 'stage_changed' && (
        <Field label="When the lead moves into">
          <MultiChips options={(options?.stages || []).map(s => ({ value: s._id, label: s.name }))} value={list(c.stageIds)} onChange={v => set({ stageIds: v })} />
          <small>Stage changes made by a workflow do not start other workflows (so they cannot loop).</small>
        </Field>
      )}
      {t.type === 'message_received' && (
        <>
          <Field label="Which messages">
            <div className="wf-chips">
              <button type="button" className={`wf-chip ${c.match !== 'keywords' ? 'on' : ''}`} onClick={() => set({ match: 'any' })}>Any message</button>
              <button type="button" className={`wf-chip ${c.match === 'keywords' ? 'on' : ''}`} onClick={() => set({ match: 'keywords' })}>Contains a keyword</button>
            </div>
          </Field>
          {c.match === 'keywords' && (
            <>
              <Field label="Keywords" hint="Type and press Enter. Matches whole words in any language: “fee” matches “What is the fee?” but not “coffee”.">
                <Tags value={list(c.keywords)} onChange={v => set({ keywords: v })} placeholder="fee, fees, price…" />
              </Field>
              <Check checked={c.matchMode === 'exact'} onChange={v => set({ matchMode: v ? 'exact' : 'contains' })} label="The whole message must be the keyword" hint="For menu replies like “1”, “2”, “hi”." />
            </>
          )}
          <Field label="When">
            <select className="wf-select" value={c.officeHours || 'any'} onChange={e => set({ officeHours: e.target.value })}>
              <option value="any">Any time</option>
              <option value="outside">Only outside office hours (out-of-office reply)</option>
              <option value="inside">Only during office hours</option>
            </select>
            <small>Office hours are set on the Workflows page → Office hours.</small>
          </Field>
          <div className="wf-info">A message that answers a question a workflow asked goes to that workflow, not here. Keyword workflows win over “any message” ones; out-of-office replies still go out.</div>
        </>
      )}
      {t.type === 'demo_booked' && (
        <Field label="Meeting types">
          <MultiChips options={Object.entries(MEETING_TYPES).map(([value, label]) => ({ value, label }))} value={list(c.meetingTypes)} onChange={v => set({ meetingTypes: v })} empty="None picked = both." />
          <small>If the demo is moved, the reminders restart for the new time. If it is cancelled, they stop.</small>
        </Field>
      )}
      {t.type === 'demo_outcome' && (
        <Field label="Outcome">
          <MultiChips options={Object.entries(DEMO_OUTCOMES).map(([value, label]) => ({ value, label }))} value={list(c.outcomes)} onChange={v => set({ outcomes: v })} empty="None picked = any outcome." />
        </Field>
      )}
      {t.type === 'call_result' && (
        <Field label="Call outcome">
          <MultiChips options={Object.entries(CALL_OUTCOMES).map(([value, label]) => ({ value, label }))} value={list(c.outcomes)} onChange={v => set({ outcomes: v })} empty="None picked = any outcome." />
        </Field>
      )}
    </>
  );
};

/* ── Workflow settings ───────────────────────────────────────────────── */
export const SettingsEditor: React.FC<{ wf: Workflow; onChange: (patch: Partial<Workflow>) => void; options: Options | null }> = ({ wf, onChange, options }) => {
  const s = wf.settings;
  const set = (patch: Partial<WfSettings>) => onChange({ settings: { ...s, ...patch } });
  const cooldownHours = Math.round((s.cooldownMinutes || 0) / 60 * 10) / 10;
  return (
    <>
      <Field label="Description (for your team)">
        <textarea className="wf-textarea" rows={2} value={wf.description || ''} onChange={e => onChange({ description: e.target.value })} />
      </Field>
      <Field label="When may messages go out?">
        <select className="wf-select" value={s.sendWindow} onChange={e => set({ sendWindow: e.target.value as any })}>
          <option value="any">Any time</option>
          <option value="office_hours">Only in office hours (hold until the office opens)</option>
        </select>
        <small>Replies to something the person just sent always go straight away.</small>
      </Field>
      <Check checked={s.allowReentry} onChange={v => set({ allowReentry: v })} label="The same person can go through it again" hint="Off = once per person, ever. Keyword and out-of-office replies need this on." />
      {s.allowReentry && (
        <Field label="…but not more often than every" hint="0 = no limit (still never two at the same time).">
          <div className="wf-inline"><input className="wf-input" type="number" min={0} step={0.5} value={cooldownHours} onChange={e => set({ cooldownMinutes: Math.round(Number(e.target.value || 0) * 60) })} /><span className="none wf-muted">hours</span></div>
        </Field>
      )}
      <Check checked={s.stopOnReply} onChange={v => set({ stopOnReply: v })} label="Stop when they reply" hint="For follow-up sequences: a message from them ends the sequence." />
      <Check checked={s.runWhenHumanTakenOver} onChange={v => set({ runWhenHumanTakenOver: v })} label="Also run when a counsellor has taken over the chat" hint="Normally a workflow stays quiet once someone replies by hand. Turn on for out-of-office replies." />
      <Field label="Stop when the lead reaches these stages">
        <MultiChips options={(options?.stages || []).map(x => ({ value: x._id, label: x.name }))} value={s.stopStageIds || []} onChange={v => set({ stopStageIds: v })} empty="e.g. Enrolled, Lost." />
      </Field>
    </>
  );
};

/* ── Conditions (inside a path) ──────────────────────────────────────── */
const ValueInput: React.FC<{ def?: FieldDef; cond: Condition; onChange: (v: any) => void; options: Options | null }> = ({ def, cond, onChange, options }) => {
  if (['empty', 'not_empty'].includes(cond.op)) return null;
  const v = Array.isArray(cond.value) ? cond.value[0] || '' : cond.value || '';
  const select = (opts: { value: string; label: string }[]) => (
    <select className="wf-select" value={v} onChange={e => onChange(e.target.value)}>
      <option value="">Choose…</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  switch (def?.kind) {
    case 'stage': return select((options?.stages || []).map(s => ({ value: s._id, label: s.name })));
    case 'source': return select((options?.sources || []).map(s => ({ value: s, label: s })));
    case 'priority': return select(PRIORITIES.map(p => ({ value: p, label: p })));
    case 'yesno': return select([{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]);
    case 'outcome': return select(Object.entries(CALL_OUTCOMES).map(([value, label]) => ({ value, label })));
    case 'demo': return select([...Object.entries(DEMO_OUTCOMES), ['scheduled', 'Scheduled']].map(([value, label]) => ({ value, label })));
    case 'user': return select((options?.users || []).map(u => ({ value: u._id, label: u.name })));
    default: return <input className="wf-input" type={def?.kind === 'number' ? 'number' : 'text'} value={v} placeholder="value" onChange={e => onChange(e.target.value)} list={def?.kind === 'course' ? 'wf-courses' : undefined} />;
  }
};

export const PathEditor: React.FC<{ path: Path; steps: Step[]; onChange: (p: Path) => void; options: Options | null; isLast: boolean }> = ({ path, steps, onChange, options, isLast }) => {
  const fields = conditionFields(steps);
  const [customKey, setCustomKey] = React.useState('');
  const setCond = (i: number, patch: Partial<Condition>) => onChange({ ...path, conditions: path.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const keys = answerKeys(steps);
  return (
    <>
      <Field label="Path name"><input className="wf-input" value={path.name} onChange={e => onChange({ ...path, name: e.target.value })} /></Field>
      {!path.conditions.length
        ? <div className="wf-info">No conditions: everyone who did not match an earlier path goes here.{!isLast && ' Paths are checked left to right, so keep this one last.'}</div>
        : (
          <Field label="Go this way when">
            <div className="wf-chips" style={{ marginBottom: 8 }}>
              <button type="button" className={`wf-chip ${path.match === 'all' ? 'on' : ''}`} onClick={() => onChange({ ...path, match: 'all' })}>All conditions</button>
              <button type="button" className={`wf-chip ${path.match === 'any' ? 'on' : ''}`} onClick={() => onChange({ ...path, match: 'any' })}>Any condition</button>
            </div>
          </Field>
        )}
      {path.conditions.map((c, i) => {
        const def = fields.find(f => f.key === c.field);
        return (
          <div className="wf-cond" key={i}>
            <div className="wf-inline">
              <select className="wf-select" value={def ? c.field : (c.field.startsWith('custom.') ? c.field : '')} onChange={e => setCond(i, { field: e.target.value, value: '', op: 'is' })}>
                <option value="">Choose what to check…</option>
                {Array.from(new Set(fields.map(f => f.group))).map(g => (
                  <optgroup key={g} label={g}>{fields.filter(f => f.group === g).map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</optgroup>
                ))}
                {c.field.startsWith('custom.') && !def && <option value={c.field}>Field: {c.field.slice(7)}</option>}
              </select>
              <button type="button" className="wf-x none" title="Remove condition" onClick={() => onChange({ ...path, conditions: path.conditions.filter((_, j) => j !== i) })}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="wf-inline">
              <select className="wf-select" value={c.op} onChange={e => setCond(i, { op: e.target.value })}>
                {opsFor(def?.kind || 'text').map(o => <option key={o} value={o}>{OPS[o]}</option>)}
              </select>
              <ValueInput def={def} cond={c} options={options} onChange={v => setCond(i, { value: v })} />
            </div>
          </div>
        );
      })}
      <div className="wf-row">
        <button type="button" className="wf-btn sm" onClick={() => onChange({ ...path, conditions: [...path.conditions, { field: keys[0] ? `answer.${keys[0]}` : '', op: 'is', value: '' }] })}><i className="fa-solid fa-plus" /> Condition</button>
        <input className="wf-input" style={{ width: 150 }} placeholder="custom field name" value={customKey} onChange={e => setCustomKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} />
        <button type="button" className="wf-btn sm" disabled={!customKey} onClick={() => { onChange({ ...path, conditions: [...path.conditions, { field: `custom.${customKey}`, op: 'is', value: '' }] }); setCustomKey(''); }}>+ Lead field</button>
      </div>
      <datalist id="wf-courses">{(options?.courses || []).map(c => <option key={c} value={c} />)}</datalist>
    </>
  );
};

/* ── Steps ────────────────────────────────────────────────────────────── */
const TemplatePicker: React.FC<{ templateId: string; values: string[]; buttonParam?: string; onChange: (p: { templateId?: string; values?: string[]; buttonParam?: string }) => void; options: Options | null; vars: { key: string; label: string }[] }> = ({ templateId, values, buttonParam, onChange, options, vars }) => {
  const tpls = options?.templates || [];
  const t = tpls.find(x => x._id === templateId);
  return (
    <>
      <select className="wf-select" value={templateId || ''} onChange={e => {
        const nt = tpls.find(x => x._id === e.target.value);
        onChange({ templateId: e.target.value, values: Array.from({ length: nt?.variables || 0 }, (_, i) => values[i] || (i === 0 ? '{{first_name}}' : '')) });
      }}>
        <option value="">Choose a template…</option>
        {tpls.filter(x => x.status === 'APPROVED').map(x => <option key={x._id} value={x._id}>{x.name} · {x.category.toLowerCase()} · {x.language}</option>)}
        {tpls.some(x => x.status !== 'APPROVED') && <optgroup label="Not approved by Meta yet">{tpls.filter(x => x.status !== 'APPROVED').map(x => <option key={x._id} value={x._id} disabled>{x.name} ({x.status.toLowerCase()})</option>)}</optgroup>}
      </select>
      {!tpls.length && <small className="wf-hint">No templates yet — create them on <a href="/admin/whatsapp-templates">WhatsApp Templates</a> and wait for Meta's approval.</small>}
      {t && (
        <>
          <div className="wf-tpl">{t.body}</div>
          {t.category === 'MARKETING' && <div className="wf-warn">Marketing template: Meta may hold back marketing messages to people who get many of them, and they cost more (≈ ₹0.80 vs ≈ ₹0.12 for utility).</div>}
          {Array.from({ length: t.variables }, (_, i) => (
            <div className="wf-field" key={i}>
              <label>{`{{${i + 1}}}`}</label>
              <VarText single value={values[i] || ''} vars={vars} onChange={v => { const nv = [...values]; nv[i] = v; onChange({ values: nv }); }} />
            </div>
          ))}
          {t.hasUrlButton && <Field label="Button link ending" hint="The part that replaces {{1}} in the template's button URL."><VarText single value={buttonParam || ''} vars={vars} onChange={v => onChange({ buttonParam: v })} /></Field>}
        </>
      )}
    </>
  );
};

export const StepEditor: React.FC<{ step: Step; wf: Workflow; onChange: (s: Step) => void; options: Options | null }> = ({ step, wf, onChange, options }) => {
  const c = step.config || {};
  const set = (patch: Record<string, any>) => onChange({ ...step, config: { ...c, ...patch } });
  const isDemo = wf.trigger.type === 'demo_booked' || wf.trigger.type === 'demo_outcome';
  const vars = [...BASE_VARS, ...(isDemo ? DEMO_VARS : []), ...answerKeys(wf.steps).map(k => ({ key: `answer.${k}`, label: `Answer: ${k}` }))];
  const firstContact = wf.trigger.type === 'lead_created' || wf.trigger.type === 'stage_changed' || isDemo || wf.trigger.type === 'call_result';

  switch (step.type) {
    case 'send_message': return (
      <>
        <Field label="Message"><VarText value={c.text} vars={vars} rows={5} onChange={v => set({ text: v })} /></Field>
        {firstContact && <div className="wf-warn">WhatsApp only delivers free text to people who messaged you in the last 24 hours. For everyone else, pick a fallback template below (or use “Send template” instead).</div>}
        <Field label="Fallback template (when the 24-hour window is closed)">
          <TemplatePicker templateId={c.fallbackTemplateId || ''} values={c.fallbackValues || []} options={options} vars={vars}
            onChange={p => set({ ...(p.templateId !== undefined ? { fallbackTemplateId: p.templateId } : {}), ...(p.values ? { fallbackValues: p.values } : {}) })} />
        </Field>
      </>
    );
    case 'send_template': return (
      <Field label="Template"><TemplatePicker templateId={c.templateId} values={c.values || []} buttonParam={c.buttonParam} options={options} vars={vars} onChange={p => set(p)} /></Field>
    );
    case 'send_media': return (
      <>
        <Field label="Type">
          <select className="wf-select" value={c.kind || 'document'} onChange={e => set({ kind: e.target.value })}><option value="document">PDF / document</option><option value="image">Image</option></select>
        </Field>
        <Field label="Public link (https)" hint="Upload the brochure somewhere public (Google Drive “anyone with the link” does NOT work — use your website or storage link that opens the file directly).">
          <input className="wf-input" value={c.url || ''} placeholder="https://…/brochure.pdf" onChange={e => set({ url: e.target.value.trim() })} />
        </Field>
        {c.kind !== 'image' && <Field label="File name they see"><input className="wf-input" value={c.fileName || ''} placeholder="Brochure.pdf" onChange={e => set({ fileName: e.target.value })} /></Field>}
        <Field label="Caption"><VarText single value={c.caption || ''} vars={vars} onChange={v => set({ caption: v })} /></Field>
        <div className="wf-warn">Files go only inside the 24-hour window (after they messaged you).</div>
      </>
    );
    case 'ask_question': {
      const opts: string[] = Array.isArray(c.options) ? c.options : [];
      const max = c.answerType === 'buttons' ? 3 : 10;
      const lim = c.answerType === 'buttons' ? 20 : 24;
      return (
        <>
          <Field label="Question"><VarText value={c.question} vars={vars} rows={3} onChange={v => set({ question: v })} /></Field>
          <Field label="Answer name" hint="Used as {{answer.name}} in messages and in path conditions. Letters, numbers, _ only.">
            <input className="wf-input" value={c.key || ''} placeholder="passout_year" onChange={e => set({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^[^a-z]+/, '') })} />
          </Field>
          <Field label="How they answer">
            <div className="wf-chips">
              {[['buttons', 'Buttons (up to 3)'], ['list', 'List (up to 10)'], ['text', 'Typed answer']].map(([v, l]) => (
                <button type="button" key={v} className={`wf-chip ${(c.answerType || 'text') === v ? 'on' : ''}`} onClick={() => set({ answerType: v, options: v === 'text' ? [] : opts.length ? opts.slice(0, v === 'buttons' ? 3 : 10) : ['', ''] })}>{l}</button>
              ))}
            </div>
          </Field>
          {c.answerType !== 'text' && (
            <Field label="Options" hint={`Each at most ${lim} characters (WhatsApp limit). They can also reply with the option's number.`}>
              {opts.map((o, i) => (
                <div className="wf-opt-row" key={i}>
                  <span className="n">{i + 1}.</span>
                  <input className="wf-input" value={o} maxLength={lim} onChange={e => set({ options: opts.map((x, j) => (j === i ? e.target.value : x)) })} />
                  <button type="button" className="wf-x" onClick={() => set({ options: opts.filter((_, j) => j !== i) })}><i className="fa-solid fa-xmark" /></button>
                </div>
              ))}
              {opts.length < max && <button type="button" className="wf-btn sm" onClick={() => set({ options: [...opts, ''] })}><i className="fa-solid fa-plus" /> Option</button>}
              {c.answerType === 'list' && <div className="wf-field" style={{ marginTop: 10 }}><label>List button text</label><input className="wf-input" maxLength={20} value={c.listButton || ''} placeholder="Choose" onChange={e => set({ listButton: e.target.value })} /></div>}
            </Field>
          )}
          <Field label="Save the answer on the lead">
            <select className="wf-select" value={String(c.saveTo || '').startsWith('custom.') ? 'custom' : c.saveTo || ''} onChange={e => set({ saveTo: e.target.value === 'custom' ? 'custom.' : e.target.value })}>
              {Object.entries(SAVE_TO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              <option value="custom">A lead field (custom)…</option>
            </select>
            {String(c.saveTo || '').startsWith('custom.') && <input className="wf-input" style={{ marginTop: 6 }} placeholder="field name, e.g. city" value={String(c.saveTo).slice(7)} onChange={e => set({ saveTo: `custom.${e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}` })} />}
          </Field>
          <Field label="If they don't answer within">
            <div className="wf-inline">
              <input className="wf-input" type="number" min={1} max={720} value={c.timeoutHours || 24} onChange={e => set({ timeoutHours: Number(e.target.value) })} />
              <span className="none wf-muted">hours</span>
              <select className="wf-select" value={c.onTimeout || 'continue'} onChange={e => set({ onTimeout: e.target.value })}>
                <option value="continue">continue (answer stays empty)</option>
                <option value="stop">stop the workflow</option>
              </select>
            </div>
          </Field>
          {c.answerType !== 'text' && <Check checked={c.acceptOther !== false} onChange={v => set({ acceptOther: v })} label="Keep their own words if they type something else twice" hint="Off = save nothing and move on." />}
          {firstContact && <div className="wf-info">If they have not messaged you in the last 24 hours, the workflow first waits for any message from them (e.g. a tap on a button in your welcome template), then asks.</div>}
        </>
      );
    }
    case 'ai_reply': return (
      <>
        <Field label="Knowledge sheet" hint="Everything the AI may answer from: courses, fees, timings, duration, placements, address, how to book a demo. It will not answer anything that is not here.">
          <textarea className="wf-textarea" rows={10} value={c.knowledge || ''} onChange={e => set({ knowledge: e.target.value })} />
        </Field>
        <Field label="Extra instructions (optional)"><textarea className="wf-textarea" rows={2} value={c.instructions || ''} placeholder="e.g. Always invite them to a free demo." onChange={e => set({ instructions: e.target.value })} /></Field>
        <Field label="When the AI is not sure, send"><VarText value={c.handoffMessage || ''} vars={vars} rows={2} onChange={v => set({ handoffMessage: v })} /></Field>
        <Check checked={c.pauseBot !== false} onChange={v => set({ pauseBot: v })} label="Then pause automatic replies for this chat" hint="The counsellor is notified and answers by hand." />
        <div className="wf-info">AI cost is roughly ₹0.10–0.50 per conversation.</div>
      </>
    );
    case 'wait': return (
      <>
        <Field label="Wait">
          <div className="wf-inline">
            <input className="wf-input" type="number" min={1} value={c.amount || 1} onChange={e => set({ amount: Number(e.target.value) })} />
            <select className="wf-select" value={c.unit || 'hours'} onChange={e => set({ unit: e.target.value })}><option value="minutes">minutes</option><option value="hours">hours</option><option value="days">days</option></select>
          </div>
        </Field>
        <Check checked={!!c.officeHoursOnly} onChange={v => set({ officeHoursOnly: v })} label="If that lands outside office hours, wait until the office opens" />
      </>
    );
    case 'wait_until': {
      const m = Number(c.offsetMinutes) || 0;
      const unit = Math.abs(m) % 1440 === 0 && m !== 0 ? 1440 : Math.abs(m) % 60 === 0 && m !== 0 ? 60 : 1;
      const amount = Math.abs(m) / unit;
      const setOff = (a: number, u: number, sign: number) => set({ offsetMinutes: sign * Math.abs(a) * u });
      return (
        <>
          <Field label="Wait until" hint={`= ${offsetText(m)}. If that time has already passed (demo booked late), this step is skipped — no late reminders.`}>
            <div className="wf-inline">
              <input className="wf-input" type="number" min={0} value={amount} onChange={e => setOff(Number(e.target.value), unit, m > 0 ? 1 : -1)} />
              <select className="wf-select" value={unit} onChange={e => setOff(amount, Number(e.target.value), m > 0 ? 1 : -1)}><option value={1}>minutes</option><option value={60}>hours</option><option value={1440}>days</option></select>
              <select className="wf-select" value={m > 0 ? 1 : -1} onChange={e => setOff(amount, unit, Number(e.target.value))}><option value={-1}>before</option><option value={1}>after</option></select>
            </div>
          </Field>
          {wf.trigger.type !== 'demo_booked' && <div className="wf-warn">This step only works when the trigger is “Demo booked”.</div>}
        </>
      );
    }
    case 'update_lead': return (
      <>
        <Field label="Move to stage">
          <select className="wf-select" value={c.stageId || ''} onChange={e => set({ stageId: e.target.value })}>
            <option value="">Leave as is</option>
            {(options?.stages || []).filter(s => s.isActive).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <small>Uses the normal stage rules (milestones, history). Does not start other “stage changed” workflows.</small>
        </Field>
        <Field label="Priority">
          <select className="wf-select" value={c.priority || ''} onChange={e => set({ priority: e.target.value })}>
            <option value="">Leave as is</option>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Set a field">
          <div className="wf-inline">
            <select className="wf-select" value={String(c.field || '').startsWith('custom.') ? 'custom' : c.field || ''} onChange={e => set({ field: e.target.value === 'custom' ? 'custom.' : e.target.value })}>
              <option value="">—</option><option value="email">Email</option><option value="name">Name</option><option value="course">Add course interest</option><option value="passout_year">Passout year</option><option value="custom">Custom field…</option>
            </select>
            {String(c.field || '').startsWith('custom.') && <input className="wf-input" placeholder="field name" value={String(c.field).slice(7)} onChange={e => set({ field: `custom.${e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}` })} />}
          </div>
          {c.field && <div style={{ marginTop: 6 }}><VarText single value={c.value || ''} vars={vars} onChange={v => set({ value: v })} placeholder="new value" /></div>}
        </Field>
        <Field label="Add a note to the timeline"><VarText value={c.note || ''} vars={vars} rows={2} onChange={v => set({ note: v })} /></Field>
      </>
    );
    case 'assign': return (
      <>
        <Field label="Give the lead to">
          <select className="wf-select" value={c.mode || 'auto'} onChange={e => set({ mode: e.target.value })}>
            <option value="auto">Lead Assignment setting (round robin / rules)</option>
            <option value="user">A specific person</option>
          </select>
        </Field>
        {c.mode === 'user' && (
          <>
            <Field label="Person">
              <select className="wf-select" value={c.userId || ''} onChange={e => set({ userId: e.target.value })}>
                <option value="">Choose…</option>{(options?.users || []).map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </Field>
            <Check checked={c.onlyIfUnassigned !== false} onChange={v => set({ onlyIfUnassigned: v })} label="Only if nobody owns the lead yet" />
          </>
        )}
        {c.mode !== 'user' && <small className="wf-hint">Only gives an owner to unassigned leads. Set up on <a href="/lead-assignment-settings">Lead Assignment</a>.</small>}
      </>
    );
    case 'follow_up': return (
      <>
        <Field label="Title"><VarText single value={c.title || ''} vars={vars} onChange={v => set({ title: v })} /></Field>
        <Field label="Due in"><div className="wf-inline"><input className="wf-input" type="number" min={0} value={c.inHours ?? 0} onChange={e => set({ inHours: Number(e.target.value) })} /><span className="none wf-muted">hours (0 = now)</span></div></Field>
        <Field label="Type & priority">
          <div className="wf-inline">
            <select className="wf-select" value={c.type || 'call'} onChange={e => set({ type: e.target.value })}><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option></select>
            <select className="wf-select" value={c.priority || 'medium'} onChange={e => set({ priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
          </div>
        </Field>
        <Field label="For">
          <select className="wf-select" value={c.userId || ''} onChange={e => set({ userId: e.target.value })}>
            <option value="">The lead's counsellor</option>{(options?.users || []).map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </Field>
      </>
    );
    case 'notify':
    case 'handoff': return (
      <>
        {step.type === 'handoff' && <Field label="Message to the person first (optional)"><VarText value={c.message || ''} vars={vars} rows={2} onChange={v => set({ message: v })} placeholder="Connecting you with our counsellor…" /></Field>}
        <Field label="Notify">
          <select className="wf-select" value={c.to || 'owner'} onChange={e => set({ to: e.target.value })}>
            <option value="owner">The lead's counsellor (admins if nobody)</option><option value="admins">Admins</option><option value="users">Chosen people</option>
          </select>
          {c.to === 'users' && <MultiChips options={(options?.users || []).map(u => ({ value: u._id, label: u.name }))} value={c.userIds || []} onChange={v => set({ userIds: v })} />}
        </Field>
        <Field label={step.type === 'handoff' ? 'Note for the counsellor' : 'Notification'}><VarText value={step.type === 'handoff' ? c.note || '' : c.message || ''} vars={vars} rows={2} onChange={v => set(step.type === 'handoff' ? { note: v } : { message: v })} /></Field>
        {step.type === 'handoff' && <div className="wf-info">Pauses automatic replies for this chat and ends the workflow. Resume the bot from the chat when you are done.</div>}
      </>
    );
    case 'webhook': return (
      <>
        <Field label="URL (https)"><input className="wf-input" value={c.url || ''} placeholder="https://hooks.example.com/…" onChange={e => set({ url: e.target.value.trim() })} /></Field>
        <small className="wf-hint">Sends a POST with JSON: event, workflow, lead (name, phone, email, source, course, stage), phone, answers, trigger.</small>
      </>
    );
    case 'stop': return <div className="wf-info">The workflow ends here.</div>;
    case 'paths': return <div className="wf-info">Click a path's label on the canvas to set its conditions. Paths are checked left to right; the first match is taken. Use “+ Add path” under the branches for more.</div>;
    default: return null;
  }
};

export const stepHelp = (s: Step) => STEPS[s.type]?.what || '';
