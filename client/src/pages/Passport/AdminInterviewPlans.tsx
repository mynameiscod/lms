import React, { useEffect, useMemo, useState } from 'react';
import passportApi, {
  InterviewPlan, InterviewPlanInput, InterviewPlansResponse, InterviewPlanPreview,
  InterviewRound, InterviewRoundType, emptyPlanAudience,
} from '../../api/passportApi';
import MemberAudiencePicker, { audienceSummary } from '../../components/common/MemberAudiencePicker';
import './interviewPlans.css';

/**
 * Mock interview plans — how many sittings a member gets, and what each one is made of.
 *
 * A PRIORITISED LIST, NOT A GRID. "Configure by year, course, branch and role" reads like a
 * matrix, but a matrix of every year against every branch against every role is thousands of
 * cells nobody fills in — and it still has a hole for the student who matches none of them.
 * So plans are ordered, the first one a member matches wins, and one is the catch-all. Five
 * plans describe a college.
 *
 * THE MEMBER COUNT IS WHAT EACH PLAN WINS, not how many match its audience. When plans
 * overlap those are different numbers, and the second is the one that misleads: three plans
 * could each claim 400 of 500 members and the screen would still not say which one a given
 * student gets. Hence the preview at the bottom.
 */

/** What each type is actually graded on, from interviewAIService.CATEGORY_KEYS. */
const ROUND_HINT: Record<InterviewRoundType, string> = {
  technical:     'Graded on correctness, depth, logical thinking, debugging.',
  hr:            'Graded on relevance, maturity, ownership, situational thinking.',
  communication: 'Graded on confidence, fluency, clarity, structure.',
};

/** Placeholder only — shows the kind of name that reads well on a member's result. */
const ROUND_LABEL_EG: Record<InterviewRoundType, string> = {
  technical:     'DSA & fundamentals',
  hr:            'Motivation & fit',
  communication: 'Self-introduction',
};

const emptyPlan = (): InterviewPlanInput => ({
  name: '', active: true, fallback: false, priority: 0,
  audience: emptyPlanAudience(),
  rounds: [{ type: 'technical', label: '', questions: 3, minutes: 12 }],
  quota: { perThirtyDays: 4, cooldownHours: 24 },
  notes: '',
});

const inr = (n: number): string =>
  `₹${n >= 1000 ? Math.round(n).toLocaleString('en-IN') : n.toFixed(n < 10 ? 2 : 0)}`;

const AdminInterviewPlans: React.FC = () => {
  const [data, setData] = useState<InterviewPlansResponse | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  /** Which plan is open in the editor. 'new' is the unsaved one. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InterviewPlanInput | null>(null);
  const [saving, setSaving] = useState(false);

  const [previewFor, setPreviewFor] = useState('');
  const [preview, setPreview] = useState<InterviewPlanPreview | null>(null);

  const load = async () => {
    try {
      setData(await passportApi.listInterviewPlans());
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load interview plans.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Loaded once, lazily: the preview is the only thing that needs them and most visits
  // never open it.
  useEffect(() => {
    if (students.length) return;
    passportApi.listStudents().then(setStudents).catch(() => setStudents([]));
  }, [students.length]);

  const bounds = data?.bounds;
  const costPer = data?.cost.perInterviewInr ?? null;

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  const startNew = () => { setDraft(emptyPlan()); setEditingId('new'); };
  const startEdit = (p: InterviewPlan) => {
    setDraft({
      name: p.name, active: p.active, fallback: p.fallback, priority: p.priority,
      audience: { ...p.audience }, rounds: p.rounds.map(r => ({ ...r })),
      quota: { ...p.quota }, notes: p.notes,
    });
    setEditingId(p.id);
  };
  const cancel = () => { setEditingId(null); setDraft(null); setErr(''); };

  const save = async () => {
    if (!draft || !editingId) return;
    if (!draft.name.trim()) { setErr('Give the plan a name.'); return; }
    if (!draft.rounds.length) { setErr('Add at least one round.'); return; }
    setSaving(true); setErr('');
    try {
      if (editingId === 'new') await passportApi.createInterviewPlan(draft);
      else await passportApi.updateInterviewPlan(editingId, draft);
      cancel();
      await load();
      // Deliberately does NOT say "new interviews use this". They do not yet — the runtime
      // still runs its own constants — and a confirmation that overstates what just happened
      // is how an admin comes to believe a limit is in force when it is not.
      flash('Saved. Member counts and warnings updated.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save the plan.');
    }
    setSaving(false);
  };

  const remove = async (p: InterviewPlan) => {
    if (!window.confirm(`Delete "${p.name}"? Members on it fall through to the next plan that matches.`)) return;
    try { await passportApi.deleteInterviewPlan(p.id); await load(); flash('Plan deleted.'); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete.'); }
  };

  /**
   * Move one plan up or down.
   *
   * The whole order is sent, not the moved plan's new priority: two plans can legitimately
   * share a priority, and patching one of them would leave the list in an order the admin
   * never chose.
   */
  const move = async (i: number, dir: -1 | 1) => {
    if (!data) return;
    const ordinary = data.plans.filter(p => !p.fallback);
    const j = i + dir;
    if (j < 0 || j >= ordinary.length) return;
    const next = [...ordinary];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      await passportApi.reorderInterviewPlans(next.map(p => p.id));
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save the order.'); }
  };

  const runPreview = async (studentId: string) => {
    setPreviewFor(studentId);
    setPreview(null);
    if (!studentId) return;
    try { setPreview(await passportApi.previewInterviewPlan(studentId)); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not preview.'); }
  };

  // ── Draft helpers ──
  const patch = (p: Partial<InterviewPlanInput>) => setDraft(d => (d ? { ...d, ...p } : d));
  const patchRound = (i: number, r: Partial<InterviewRound>) =>
    setDraft(d => (d ? { ...d, rounds: d.rounds.map((x, j) => (j === i ? { ...x, ...r } : x)) } : d));
  const addRound = () =>
    setDraft(d => (d ? { ...d, rounds: [...d.rounds, { type: 'hr', label: '', questions: 2, minutes: 8 }] } : d));
  const dropRound = (i: number) =>
    setDraft(d => (d ? { ...d, rounds: d.rounds.filter((_, j) => j !== i) } : d));

  const draftTotals = useMemo(() => {
    const rs = draft?.rounds || [];
    return {
      questions: rs.reduce((n, r) => n + (Number(r.questions) || 0), 0),
      minutes:   rs.reduce((n, r) => n + (Number(r.minutes) || 0), 0),
    };
  }, [draft]);

  if (loading) return <div style={{ padding: 20, color: '#64748b' }}>Loading interview plans…</div>;
  if (!data) return <div style={{ padding: 20, color: '#dc2626' }}>{err || 'Could not load interview plans.'}</div>;

  const ordinary = data.plans.filter(p => !p.fallback);
  const fallbacks = data.plans.filter(p => p.fallback);

  const editor = (
    <div className="ivp-edit">
      <div className="ivp-sec">
        <h4>Plan</h4>
        <div className="ivp-fields">
          <label className="ivp-field" style={{ flex: 1, minWidth: 220 }}>
            <span>Name</span>
            <input type="text" value={draft?.name || ''} placeholder="Final-year CSE → Backend"
              onChange={e => patch({ name: e.target.value })} />
          </label>
          <label className="ivp-check">
            <input type="checkbox" checked={draft?.active ?? true} onChange={e => patch({ active: e.target.checked })} />
            Active
          </label>
          <label className="ivp-check">
            <input type="checkbox" checked={draft?.fallback ?? false} onChange={e => patch({ fallback: e.target.checked })} />
            Catch-all
          </label>
        </div>
        {draft?.fallback && (
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            The catch-all takes anyone no other plan matched, so it carries no targeting and is
            always considered last — whatever its position in the list.
          </p>
        )}
      </div>

      {!draft?.fallback && (
        <div className="ivp-sec">
          <h4>Who it applies to</h4>
          <p>Reaches: <b>{audienceSummary(draft?.audience || emptyPlanAudience())}</b></p>
          {/*
            The same picker the Thinking Lab and Communication Lab use. Reused rather than
            rebuilt so "who is this for" is asked identically everywhere — and because it
            already handles the case a chip list cannot: targeting a value no member holds
            yet, which is exactly what writing a plan ahead of a new intake needs.
          */}
          <MemberAudiencePicker
            value={draft?.audience || emptyPlanAudience()}
            onChange={a => patch({ audience: a })}
          />
        </div>
      )}

      <div className="ivp-sec">
        <h4>Rounds</h4>
        <p>
          Questions are the target, minutes the cap — whichever comes first ends the round.
          The three types are graded on different criteria, so the mix decides what the
          feedback can tell a member about.
        </p>
        {(draft?.rounds || []).map((r, i) => (
          <div className="ivp-rrow" key={i}>
            <label className="ivp-field">
              <span>Type</span>
              <select value={r.type} onChange={e => patchRound(i, { type: e.target.value as InterviewRoundType })}>
                {data.roundTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label className="ivp-field" style={{ flex: 1, minWidth: 170 }}>
              <span>Label (optional)</span>
              <input type="text" value={r.label} placeholder={ROUND_LABEL_EG[r.type]}
                onChange={e => patchRound(i, { label: e.target.value })} />
              {/* What this type is graded on. The choice of round decides what the feedback
                  can talk about at all, so it belongs next to the choice, not in a doc. */}
              <small>{ROUND_HINT[r.type]}</small>
            </label>
            <label className="ivp-field">
              <span>Questions</span>
              <input type="number" style={{ width: 84 }}
                min={bounds?.questionsPerRound.min} max={bounds?.questionsPerRound.max}
                value={r.questions} onChange={e => patchRound(i, { questions: Number(e.target.value) })} />
            </label>
            <label className="ivp-field">
              <span>Minutes</span>
              <input type="number" style={{ width: 84 }}
                min={bounds?.minutesPerRound.min} max={bounds?.minutesPerRound.max}
                value={r.minutes} onChange={e => patchRound(i, { minutes: Number(e.target.value) })} />
            </label>
            <button className="ivp-btn sm danger" type="button" onClick={() => dropRound(i)}
              disabled={(draft?.rounds.length || 0) <= 1}>Remove</button>
          </div>
        ))}
        {(draft?.rounds.length || 0) < (bounds?.rounds.max || 4) && (
          <button className="ivp-btn sm" type="button" onClick={addRound}>+ Add round</button>
        )}
        <div className={`ivp-total${draftTotals.questions > (bounds?.totalQuestions.max || 12) ? ' over' : ''}`}>
          Whole interview: <b>{draftTotals.questions} question{draftTotals.questions === 1 ? '' : 's'}</b> ·
          up to <b>{draftTotals.minutes} min</b>
          {draftTotals.questions > (bounds?.totalQuestions.max || 12) && (
            <> — only the first {bounds?.totalQuestions.max} get per-question coaching in the feedback.</>
          )}
        </div>
      </div>

      <div className="ivp-sec">
        <h4>How many</h4>
        <p>Counted over a rolling 30 days, and only once a member has actually answered something — an interview that failed to start does not use up an attempt.</p>
        <div className="ivp-fields">
          <label className="ivp-field">
            <span>Interviews per 30 days</span>
            <input type="number" style={{ width: 110 }}
              min={bounds?.perThirtyDays.min} max={bounds?.perThirtyDays.max}
              value={draft?.quota.perThirtyDays ?? 0}
              onChange={e => patch({ quota: { ...(draft!.quota), perThirtyDays: Number(e.target.value) } })} />
            <small>0 means no limit.</small>
          </label>
          <label className="ivp-field">
            <span>Gap between sittings (hours)</span>
            <input type="number" style={{ width: 110 }}
              min={bounds?.cooldownHours.min} max={bounds?.cooldownHours.max}
              value={draft?.quota.cooldownHours ?? 0}
              onChange={e => patch({ quota: { ...(draft!.quota), cooldownHours: Number(e.target.value) } })} />
            <small>0 lets them go again straight away.</small>
          </label>
        </div>
      </div>

      <div className="ivp-sec">
        <h4>Notes</h4>
        <textarea rows={2} value={draft?.notes || ''} placeholder="Why this plan exists — for whoever edits it next."
          onChange={e => patch({ notes: e.target.value })} />
      </div>

      <div className="ivp-save">
        <button className="ivp-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</button>
        <button className="ivp-btn" onClick={cancel} disabled={saving}>Cancel</button>
        {err && <span className="ivp-err">{err}</span>}
      </div>
    </div>
  );

  const card = (p: InterviewPlan, i: number, movable: boolean) => (
    <div key={p.id} className={`ivp-card${p.active ? '' : ' off'}${editingId === p.id ? ' editing' : ''}`}>
      <div className="ivp-row">
        {movable && (
          <div className="ivp-move">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">▲</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === ordinary.length - 1} title="Move down">▼</button>
          </div>
        )}
        <div className="ivp-main">
          <div className="ivp-title">
            <span className="ivp-name">{p.name}</span>
            {p.fallback && <span className="ivp-tag fallback">Catch-all</span>}
            {!p.active && <span className="ivp-tag off">Off</span>}
            {!p.fallback && audienceSummary(p.audience) === 'Everyone' && <span className="ivp-tag everyone">Everyone</span>}
          </div>
          <div className="ivp-aud">
            {p.fallback ? 'Anyone no plan above matched' : <>Reaches: <b>{audienceSummary(p.audience)}</b></>}
          </div>
          <div className="ivp-rounds">
            {p.rounds.map((r, j) => (
              <span key={j} className={`ivp-round ${r.type}`}>
                {r.label || data.roundTypes.find(t => t.key === r.type)?.label || r.type}
                {' · '}<b>{r.questions}q</b>{' · '}{r.minutes}m
              </span>
            ))}
          </div>
          <div className="ivp-meta">
            <span><b>{p.totals.questions}</b> questions · up to <b>{p.totals.minutes} min</b></span>
            <span>
              {p.quota.perThirtyDays > 0
                ? <><b>{p.quota.perThirtyDays}</b> per 30 days</>
                : <b>No limit</b>}
              {p.quota.cooldownHours > 0 && <> · <b>{p.quota.cooldownHours}h</b> gap</>}
            </span>
            <span><b>{p.members ?? 0}</b> member{(p.members ?? 0) === 1 ? '' : 's'} on this plan</span>
            {costPer !== null && p.quota.perThirtyDays > 0 && (p.members ?? 0) > 0 && (
              <span title="At the observed cost per interview, if everyone used their full allowance">
                ≈ <b>{inr(costPer * p.quota.perThirtyDays * (p.members || 0))}</b> / 30 days at full use
              </span>
            )}
          </div>
        </div>
        <div className="ivp-acts">
          <button className="ivp-btn sm" onClick={() => (editingId === p.id ? cancel() : startEdit(p))}>
            {editingId === p.id ? 'Close' : 'Edit'}
          </button>
          <button className="ivp-btn sm danger" onClick={() => remove(p)}>Delete</button>
        </div>
      </div>
      {editingId === p.id && editor}
    </div>
  );

  return (
    <div className="ivp">
      <div className="ivp-hd">
        <div>
          <h2>Mock interview plans</h2>
          <p>
            Who gets how many interviews, and what each one is made of. Plans are checked top to
            bottom and the first one a member matches wins, so put the most specific first.
          </p>
        </div>
        <button className="ivp-btn primary" onClick={startNew} disabled={editingId === 'new'}>+ New plan</button>
      </div>

      <div className="ivp-stats">
        <div className="ivp-stat">
          <b>{data.totals.members}</b><span>CareerPilot members</span>
        </div>
        <div className="ivp-stat">
          <b>{data.totals.onDefault}</b><span>on the built-in default</span>
          <small>{data.defaultShape.totals.questions} questions · unlimited</small>
        </div>
        <div className="ivp-stat">
          <b>{costPer !== null ? inr(costPer) : '—'}</b><span>per interview</span>
          <small>
            {costPer !== null
              ? `measured over ${data.cost.sample} sitting${data.cost.sample === 1 ? '' : 's'}, last ${data.cost.windowDays} days`
              : 'not enough sittings yet to measure'}
          </small>
        </div>
      </div>

      {msg && <div className="ivp-ok">{msg}</div>}
      {err && !editingId && <div className="ivp-err">{err}</div>}

      {!!data.warnings.length && (
        <div className="ivp-notes">
          {data.warnings.map((w, i) => (
            <div key={i} className={`ivp-note ${w.level}`}>{w.level === 'warn' ? '⚠️ ' : ''}{w.message}</div>
          ))}
        </div>
      )}

      {editingId === 'new' && (
        <div className="ivp-card editing">
          <div className="ivp-row">
            <div className="ivp-main"><div className="ivp-title"><span className="ivp-name">New plan</span></div></div>
          </div>
          {editor}
        </div>
      )}

      <div className="ivp-list">
        {ordinary.map((p, i) => card(p, i, true))}
        {fallbacks.map(p => card(p, 0, false))}
      </div>

      <div className="ivp-prev">
        <h3>Check one student</h3>
        <p>Which plan a member actually gets, and why the others did not win.</p>
        <select value={previewFor} onChange={e => runPreview(e.target.value)}>
          <option value="">Choose a member…</option>
          {students.map(s => (
            <option key={s._id} value={s._id}>
              {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.email}
              {s.passport?.branch ? ` — ${s.passport.branch}` : ''}
            </option>
          ))}
        </select>

        {preview && (
          <div className="ivp-verdict">
            <div className="ivp-verdict-hd">
              <b>{preview.student.name}</b> gets{' '}
              <b>{preview.plan ? preview.plan.name : 'the built-in default'}</b>
              {' — '}{preview.totals.questions} questions, up to {preview.totals.minutes} min,{' '}
              {preview.quota.perThirtyDays > 0 ? `${preview.quota.perThirtyDays} per 30 days` : 'no limit'}.
            </div>
            <div className="ivp-facts">
              <span className="ivp-fact">Year: <b>{preview.student.year || '—'}</b></span>
              <span className="ivp-fact">Course: <b>{preview.student.course || '—'}</b></span>
              <span className="ivp-fact">Branch: <b>{preview.student.branch || '—'}</b></span>
              <span className="ivp-fact">Role: <b>{preview.student.role || '—'}</b></span>
              <span className="ivp-fact">Stage: <b>{preview.student.stage || '—'}</b></span>
            </div>
            <div className="ivp-trace">
              {!preview.trace.length && <div className="ivp-tr"><span className="ivp-tr-why">No active plans — everyone is on the built-in default.</span></div>}
              {preview.trace.map(t => (
                <div key={t.id} className={`ivp-tr${t.matched ? ' win' : ''}`}>
                  <span className="ivp-tr-mark">{t.matched ? '✓' : '·'}</span>
                  <span className="ivp-tr-name">{t.name}</span>
                  <span className="ivp-tr-why">{t.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
        These plans are configuration only for now — live interviews still run the built-in
        shape ({data.defaultShape.totals.questions} questions, untimed, unlimited) until the
        runtime is wired to read them. The member counts, warnings and costs above are real.
      </p>
    </div>
  );
};

export default AdminInterviewPlans;
