import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, {
  QuestionBankRow, QuestionAudience, QuestionBankQuery,
} from '../../api/passportApi';
import AudiencePicker, { audienceSummary } from './AudiencePicker';
import './questionBank.css';

/**
 * The CareerPilot assessment question bank.
 *
 * Approved questions had nowhere to be seen. Question Drafting lists only what is still
 * pending, and Skill Evidence edits the skill mapping and nothing else — so targeting could
 * be set at the moment of approval and never again, and 638 of 640 questions sat untargeted
 * with no route to tag them.
 *
 * TWO REFUSALS ARE SHOWN, NOT HIDDEN. A question somebody has answered cannot have options
 * added, removed or reordered, because an answer names its option by array position. And a
 * question shared with the LMS quiz bank is copied into CareerPilot before it is edited,
 * rather than edited where the LMS would see it. Both say so on the row.
 */

const EMPTY_AUDIENCE: QuestionAudience = {
  audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [],
};

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

type AudienceOptions = {
  roles: { key: string; label: string }[]; years: string[]; courses: string[]; branches?: string[];
};

const keyOf = (r: { sourceType: string; sourceId: string }) => `${r.sourceType}:${r.sourceId}`;

const AdminQuestionBank: React.FC = () => {
  const [q, setQ] = useState<QuestionBankQuery>({ page: 0, pageSize: 25 });
  const [rows, setRows] = useState<QuestionBankRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [audienceOpts, setAudienceOpts] = useState<AudienceOptions | null>(null);
  const [skills, setSkills] = useState<{ key: string; name: string }[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAudience, setBulkAudience] = useState<QuestionAudience>(EMPTY_AUDIENCE);
  const [showBulk, setShowBulk] = useState(false);

  const [editing, setEditing] = useState<QuestionBankRow | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const page = await passportApi.listQuestionBank(q);
      setRows(page.rows); setTotal(page.total);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load the question bank.');
    }
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    passportApi.draftAudiences().then(setAudienceOpts).catch(() => setAudienceOpts(null));
    passportApi.mappableSkills()
      .then(r => setSkills((r.skills || []).map(x => ({ key: x.key, name: x.name }))))
      .catch(() => setSkills([]));
  }, []);

  const set = (patch: Partial<QuestionBankQuery>) =>
    setQ(prev => ({ ...prev, ...patch, page: patch.page ?? 0 }));

  const pages = Math.max(1, Math.ceil(total / (q.pageSize || 25)));
  const allOnPageSelected = rows.length > 0 && rows.every(r => selected.has(keyOf(r)));

  const toggle = (r: QuestionBankRow) => setSelected(s => {
    const n = new Set(s); const k = keyOf(r);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const toggleAll = () => setSelected(s => {
    const n = new Set(s);
    if (allOnPageSelected) rows.forEach(r => n.delete(keyOf(r)));
    else rows.forEach(r => n.add(keyOf(r)));
    return n;
  });

  const targets = useMemo(
    () => [...selected].map(k => ({ sourceType: k.slice(0, k.indexOf(':')), sourceId: k.slice(k.indexOf(':') + 1) })),
    [selected],
  );

  const applyBulk = async () => {
    setBusy('bulk'); setErr(''); setMsg('');
    try {
      const r = await passportApi.bulkBankTargeting(targets, bulkAudience);
      setMsg(`Targeting applied to ${r.questions} question${r.questions === 1 ? '' : 's'}. `
        + `They now reach: ${audienceSummary(bulkAudience as any)}`);
      setSelected(new Set()); setShowBulk(false); setBulkAudience(EMPTY_AUDIENCE);
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not apply targeting.'); }
    setBusy('');
  };

  const setActive = async (active: boolean) => {
    setBusy('active'); setErr(''); setMsg('');
    try {
      await passportApi.setBankActive(targets, active);
      setMsg(`${targets.length} question${targets.length === 1 ? '' : 's'} ${active ? 'returned to the pool' : 'retired'}.`);
      setSelected(new Set());
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not update those questions.'); }
    setBusy('');
  };

  const copyIntoCareerPilot = async (r: QuestionBankRow) => {
    setBusy(keyOf(r)); setErr(''); setMsg('');
    try {
      const out = await passportApi.copyBankQuestion(r.sourceId);
      setMsg('Copied into CareerPilot. The LMS keeps its original; you are now editing our copy.');
      await load();
      setEditing(cur => (cur && cur.sourceId === r.sourceId ? { ...cur, sourceId: out.sourceId, owned: true } : cur));
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not copy that question.'); }
    setBusy('');
  };

  const remove = async (r: QuestionBankRow) => {
    if (!window.confirm('Delete this question permanently? Retire it instead if you may want it back.')) return;
    setBusy(keyOf(r)); setErr(''); setMsg('');
    try {
      await passportApi.deleteBankQuestion(r.sourceType, r.sourceId);
      setMsg('Question deleted.');
      await load();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not delete that question.'); }
    setBusy('');
  };

  return (
    <div className="qb">
      <header className="qb-hd">
        <div>
          <span className="qb-eyebrow">CareerPilot</span>
          <h1>Assessment Question Bank</h1>
          <p>
            Every approved question, with what it measures and who it reaches. Targeting can
            be changed here at any time — it is no longer fixed at the moment of approval.
          </p>
        </div>
        <div className="qb-count"><b>{total}</b><span>{total === 1 ? 'question' : 'questions'} matching</span></div>
      </header>

      {err && <div className="qb-banner err">{err}</div>}
      {msg && <div className="qb-banner ok">{msg}</div>}

      {/* ── Filters ─────────────────────────────────────────────── */}
      <section className="qb-filters">
        <input
          className="qb-search"
          placeholder="Search question or option text…"
          value={q.search || ''}
          onChange={e => set({ search: e.target.value })}
        />

        <select value={q.skillKey || ''} onChange={e => set({ skillKey: e.target.value || undefined })}>
          <option value="">Every skill</option>
          {skills.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>

        <select value={q.difficulty || ''} onChange={e => set({ difficulty: e.target.value || undefined })}>
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>)}
        </select>

        {/* The filter that matters most while the bank is largely untagged. */}
        <select value={q.targeting || ''} onChange={e => set({ targeting: e.target.value || undefined })}>
          <option value="">Targeted or not</option>
          <option value="untargeted">Untargeted — reaches everyone</option>
          <option value="targeted">Targeted</option>
        </select>

        <select value={q.year || ''} onChange={e => set({ year: e.target.value || undefined })}>
          <option value="">Any year</option>
          {(audienceOpts?.years || []).map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={q.course || ''} onChange={e => set({ course: e.target.value || undefined })}>
          <option value="">Any course</option>
          {(audienceOpts?.courses || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={q.branch || ''} onChange={e => set({ branch: e.target.value || undefined })}>
          <option value="">Any branch</option>
          {(audienceOpts?.branches || []).map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select value={q.role || ''} onChange={e => set({ role: e.target.value || undefined })}>
          <option value="">Any role</option>
          {(audienceOpts?.roles || []).map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>

        <select value={q.provenance || ''} onChange={e => set({ provenance: e.target.value || undefined })}>
          <option value="">Every source</option>
          <option value="owned">Written for CareerPilot</option>
          <option value="borrowed">Borrowed from the LMS</option>
          <option value="exam">Exam bank</option>
        </select>

        <select value={q.status || ''} onChange={e => set({ status: e.target.value || undefined })}>
          <option value="">Active and retired</option>
          <option value="active">Active only</option>
          <option value="inactive">Retired only</option>
        </select>

        <button className="qb-clear" onClick={() => setQ({ page: 0, pageSize: q.pageSize })}>Clear filters</button>
      </section>

      {/* ── Bulk bar ────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <section className="qb-bulk">
          <div className="qb-bulk-lead">
            <b>{selected.size} selected</b>
            <button className="qb-link" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
          <div className="qb-bulk-actions">
            <button className="qb-btn primary" onClick={() => setShowBulk(v => !v)}>
              {showBulk ? 'Close targeting' : 'Set targeting'}
            </button>
            <button className="qb-btn" disabled={busy === 'active'} onClick={() => setActive(false)}>Retire</button>
            <button className="qb-btn" disabled={busy === 'active'} onClick={() => setActive(true)}>Return to pool</button>
          </div>

          {showBulk && audienceOpts && (
            <div className="qb-bulk-picker">
              <p className="qb-hint">
                This replaces the targeting on all {selected.size} selected questions. Leaving
                every row empty makes them available to everyone again.
              </p>
              <AudiencePicker
                value={bulkAudience as any}
                onChange={v => setBulkAudience(v as any)}
                options={audienceOpts}
              />
              <button className="qb-btn primary" disabled={busy === 'bulk'} onClick={applyBulk}>
                {busy === 'bulk' ? 'Applying…' : `Apply to ${selected.size} question${selected.size === 1 ? '' : 's'}`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── List ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="qb-state">Loading…</div>
      ) : !rows.length ? (
        <div className="qb-state">No questions match these filters.</div>
      ) : (
        <>
          <div className="qb-selectall">
            <label>
              <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} />
              Select all {rows.length} on this page
            </label>
          </div>

          <ul className="qb-list">
            {rows.map(r => {
              const k = keyOf(r);
              const targeted = !!(r.audience.audienceRoles.length || r.audience.audienceYears.length
                || r.audience.audienceCourses.length || r.audience.audienceBranches.length);
              return (
                <li key={k} className={`qb-row${r.active ? '' : ' retired'}${selected.has(k) ? ' on' : ''}`}>
                  <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(r)} />

                  <div className="qb-body">
                    <div className="qb-chips">
                      {r.skills.map(s => (
                        <span className="chip skill" key={s.skillKey} title={s.contribution}>{s.skillName}</span>
                      ))}
                      {r.difficulty && <span className={`chip d-${r.difficulty.toLowerCase()}`}>{r.difficulty}</span>}
                      {r.origin === 'lms' && <span className="chip borrowed" title="Shared with the LMS quiz bank — copy it before editing">Borrowed</span>}
                      {r.origin === 'exam' && <span className="chip exam" title="From the skill-assessment exam bank; edited in its own screen. Targeting still applies here.">Exam bank</span>}
                      {!r.active && <span className="chip retired">Retired</span>}
                      {r.answerCount > 0 && (
                        <span className="chip answered" title="Options are locked — answers name them by position">
                          {r.answerCount} answered
                        </span>
                      )}
                    </div>

                    <p className="qb-q">{r.question}</p>

                    <div className={`chip aud${targeted ? ' on' : ''}`}>
                      Reaches: {audienceSummary(r.audience as any)}
                    </div>
                  </div>

                  <div className="qb-actions">
                    <button className="qb-btn" onClick={() => setEditing(r)}>Edit</button>
                    {r.origin === 'lms' && (
                      <button className="qb-btn" disabled={busy === k} onClick={() => copyIntoCareerPilot(r)}>
                        {busy === k ? '…' : 'Copy into CareerPilot'}
                      </button>
                    )}
                    {r.editable.hardDelete
                      ? <button className="qb-btn danger" disabled={busy === k} onClick={() => remove(r)}>Delete</button>
                      : <span className="qb-locked" title={`${r.answerCount} recorded answers reference this`}>Retire only</span>}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="qb-pager">
            <button disabled={(q.page || 0) <= 0} onClick={() => set({ page: (q.page || 0) - 1 })}>← Previous</button>
            <span>Page {(q.page || 0) + 1} of {pages}</span>
            <button disabled={(q.page || 0) + 1 >= pages} onClick={() => set({ page: (q.page || 0) + 1 })}>Next →</button>
          </div>
        </>
      )}

      {editing && audienceOpts && (
        <EditDrawer
          row={editing}
          options={audienceOpts}
          onClose={() => setEditing(null)}
          onCopy={() => copyIntoCareerPilot(editing)}
          onSaved={async () => { setEditing(null); setMsg('Question saved.'); await load(); }}
        />
      )}
    </div>
  );
};

/** One question, opened for editing. Refusals are stated before they are attempted. */
const EditDrawer: React.FC<{
  row: QuestionBankRow;
  options: AudienceOptions;
  onClose: () => void;
  onCopy: () => void;
  onSaved: () => void;
}> = ({ row, options, onClose, onCopy, onSaved }) => {
  const [question, setQuestion] = useState(row.question);
  const [explanation, setExplanation] = useState(row.explanation);
  const [difficulty, setDifficulty] = useState(row.difficulty || '');
  const [opts, setOpts] = useState(row.options.map(o => ({ ...o })));
  const [audience, setAudience] = useState<QuestionAudience>(row.audience);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const locked = row.answerCount > 0;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await passportApi.updateBankQuestion(row.sourceType, row.sourceId, {
        question, explanation, difficulty: difficulty || undefined,
        // Options are sent only when the question is ours to change. Sending them for a
        // borrowed one would be refused by the server anyway; not sending them means a
        // targeting-only edit still succeeds.
        ...(row.owned ? { options: opts } : {}),
        audience,
      });
      onSaved();
    } catch (e: any) { setErr(e?.response?.data?.message || 'Could not save.'); }
    setBusy(false);
  };

  return (
    <div className="qb-scrim" onClick={onClose}>
      <aside className="qb-drawer" onClick={e => e.stopPropagation()}>
        <header>
          <h2>Edit question</h2>
          <button className="qb-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        {err && <div className="qb-banner err">{err}</div>}

        {row.origin === 'exam' && (
          <div className="qb-note">
            <b>This item belongs to the skill-assessment exam bank.</b>
            <span>
              Its wording and options are authored in that screen, not here. Targeting is
              still yours to change below — it lives on the skill mapping, not the item.
            </span>
          </div>
        )}

        {row.origin === 'lms' && (
          <div className="qb-note warn">
            <b>This question is shared with the LMS quiz bank.</b>
            <span>
              Editing it here would change it for LMS quizzes too. Copy it into CareerPilot
              and the LMS keeps its original untouched.
            </span>
            <button className="qb-btn primary" onClick={onCopy}>Copy into CareerPilot</button>
          </div>
        )}

        {locked && (
          <div className="qb-note">
            <b>{row.answerCount} recorded answer{row.answerCount === 1 ? '' : 's'} reference this question.</b>
            <span>
              Answers name an option by its position, so options cannot be added, removed or
              reordered — that would change what those answers meant. Wording can still be
              corrected, and targeting can always be changed.
            </span>
          </div>
        )}

        <label className="qb-lbl">Question</label>
        <textarea className="qb-ta" rows={3} value={question} disabled={!row.owned}
          onChange={e => setQuestion(e.target.value)} />

        <label className="qb-lbl">Options</label>
        {opts.map((o, i) => (
          <div className="qb-opt" key={i}>
            <input
              type="radio" name="correct" checked={o.isCorrect} disabled={!row.owned}
              onChange={() => setOpts(list => list.map((x, j) => ({ ...x, isCorrect: i === j })))}
            />
            <input
              className="qb-inp" value={o.text} disabled={!row.owned}
              onChange={e => setOpts(list => list.map((x, j) => (i === j ? { ...x, text: e.target.value } : x)))}
            />
            {!locked && row.owned && opts.length > 2 && (
              <button className="qb-x small" onClick={() => setOpts(l => l.filter((_, j) => j !== i))}>✕</button>
            )}
          </div>
        ))}
        {!locked && row.owned && (
          <button className="qb-link" onClick={() => setOpts(l => [...l, { text: '', isCorrect: false }])}>
            + Add option
          </button>
        )}

        <label className="qb-lbl">Explanation</label>
        <textarea className="qb-ta" rows={2} value={explanation} disabled={!row.owned}
          onChange={e => setExplanation(e.target.value)} />

        <label className="qb-lbl">Difficulty</label>
        <select className="qb-inp" value={difficulty} disabled={!row.owned}
          onChange={e => setDifficulty(e.target.value)}>
          <option value="">Not set</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>)}
        </select>

        {/* Always editable, on ours and borrowed alike: targeting lives on the mapping, not
            on the question, so changing it never touches LMS content. */}
        <label className="qb-lbl">Who this question reaches</label>
        <AudiencePicker value={audience as any} onChange={v => setAudience(v as any)} options={options} />

        <div className="qb-drawer-foot">
          <button className="qb-btn" onClick={onClose}>Cancel</button>
          <button className="qb-btn primary" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default AdminQuestionBank;
