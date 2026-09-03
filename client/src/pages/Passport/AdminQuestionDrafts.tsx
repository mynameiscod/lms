import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, {
  PoolCoverageRow, QuestionDraft, DraftBatchReport, DraftOption,
} from '../../api/passportApi';
import AudiencePicker, { audienceSummary } from './AudiencePicker';
import ManualQuestionForm from './ManualQuestionForm';
import './adminQuestionDrafts.css';

/**
 * AI drafts questions. A person approves them. Only then do students see them.
 *
 * The screen is built around the fact that REVIEWING is the bottleneck, not generating.
 * Generating five hundred questions nobody reads is worse than the forty-four we have, so
 * everything here is arranged to make one reviewer's pass fast: the pool table says where
 * to point the next batch, the queue shows one draft at a time with the correct answer
 * already marked, and anything the machine already noticed is on the card rather than left
 * for the reviewer to spot.
 *
 * Warnings are NOT errors. A flagged draft is still usable — the flag says where to look.
 * The commonest one, and the reason the check exists at all, is a correct option that is
 * much longer than the others: a student can pick it without knowing anything about the
 * subject, so the question measures test-taking instead of the skill.
 */

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/** Below this a skill's papers start repeating badly. Used only to colour the table. */
const THIN_POOL = 12;

/** Small enough that a page is genuinely reviewable in one sitting. */
const PAGE_SIZE = 10;

const AdminQuestionDrafts: React.FC = () => {
  const [pool, setPool] = useState<PoolCoverageRow[]>([]);
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [status, setStatus] = useState('pending');
  const [skillFilter, setSkillFilter] = useState('');

  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  /** Drafts ticked for bulk approval, by id. Cleared whenever the page or filter moves. */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [audienceOpts, setAudienceOpts] = useState<{
    roles: { key: string; label: string }[]; years: string[]; courses: string[]; branches: string[];
  }>({ roles: [], years: [], courses: [], branches: [] });
  const [showManual, setShowManual] = useState(false);

  const [genSkill, setGenSkill] = useState('');
  const [genDifficulty, setGenDifficulty] = useState<string>('medium');
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<DraftBatchReport | null>(null);

  const [busyId, setBusyId] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  /** Local edits, by draft id. A reviewer's correction is the truth, not the draft. */
  const [edits, setEdits] = useState<Record<string, Partial<QuestionDraft>>>({});

  /**
   * Why a load failed, in words that point somewhere.
   *
   * "Could not load pool coverage." was all this said, which is true and useless — a 401, a
   * 500 from the aggregate and a dev server that is not running all read identically, so
   * there was nothing to act on. The status and the server's own message are what separate
   * them.
   */
  const failure = (e: any, what: string): string => {
    const status = e?.response?.status;
    const said = e?.response?.data?.message;
    if (said) return `${what}: ${said}${status ? ` (${status})` : ''}`;
    if (status === 401 || status === 403) return `${what}: you are not signed in as an admin (${status}).`;
    if (status === 404) return `${what}: that endpoint is missing — the API may need restarting after an update (404).`;
    if (status) return `${what}: the server returned ${status}.`;
    return `${what}: no response from the API — check the server is running.`;
  };

  const loadPool = useCallback(() => {
    passportApi.draftCoverage()
      // Cleared on success. Without this a single transient failure left the banner up for
      // the rest of the session, over a screen that was working perfectly well.
      .then(r => { setPool(r.skills); setErr(''); })
      .catch(e => setErr(failure(e, 'Could not load pool coverage')));
  }, []);

  const loadDrafts = useCallback(() => {
    passportApi.listDrafts({ status, skillKey: skillFilter || undefined, page, limit: PAGE_SIZE })
      .then(r => { setDrafts(r.drafts); setTotal(r.total ?? r.drafts.length); setErr(''); })
      .catch(e => setErr(failure(e, 'Could not load drafts')));
  }, [status, skillFilter, page]);

  useEffect(loadPool, [loadPool]);
  useEffect(loadDrafts, [loadDrafts]);
  useEffect(() => {
    // `branches` is newer than this endpoint, so it is defaulted rather than assumed —
    // an older server simply yields no branch chips instead of breaking the picker.
    passportApi.draftAudiences()
      .then(o => setAudienceOpts({ branches: [], ...o }))
      .catch(() => { /* targeting simply stays empty */ });
  }, []);

  /**
   * A selection only means anything for the rows on screen. Changing filter or page would
   * otherwise leave ticks pointing at drafts the reviewer can no longer see, and "Approve 12"
   * would act on rows they had forgotten about.
   */
  useEffect(() => { setPicked(new Set()); }, [status, skillFilter, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingOnPage = useMemo(() => drafts.filter(d => d.status === 'pending'), [drafts]);
  const allPicked = pendingOnPage.length > 0 && pendingOnPage.every(d => picked.has(d._id));

  const togglePick = (id: string) => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(pendingOnPage.map(d => d._id)));

  /**
   * Bulk approve. The server approves each draft independently and reports per id, so a
   * single refusal (a near-duplicate, usually) never discards the rest — and the reviewer is
   * told exactly which one it was rather than being left to work it out.
   */
  const approveSelected = async () => {
    const ids = [...picked];
    if (!ids.length) return;
    setBulkBusy(true); setErr(''); setMsg('');
    try {
      const r = await passportApi.approveDrafts(ids);
      const ok = r.approved.length;
      setMsg(
        r.failed.length
          ? `${ok} approved. ${r.failed.length} could not be: ${r.failed.map(f => f.message).join('; ')}`
          : `${ok} approved and now in the pool.`,
      );
      setPicked(new Set());
      loadDrafts(); loadPool();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not approve the selection.');
    }
    setBulkBusy(false);
  };

  const thinnest = useMemo(() => pool.slice(0, 8), [pool]);

  const generate = async () => {
    if (!genSkill) { setErr('Choose a skill first.'); return; }
    setGenerating(true); setErr(''); setMsg(''); setReport(null);
    try {
      const r = await passportApi.generateDrafts({
        skillKey: genSkill, difficulty: genDifficulty, count: genCount,
      });
      setReport(r.report);
      loadDrafts(); loadPool();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not draft questions.');
    }
    setGenerating(false);
  };

  const editOf = (d: QuestionDraft): QuestionDraft => ({ ...d, ...edits[d._id] });

  const patch = (id: string, change: Partial<QuestionDraft>) =>
    setEdits(p => ({ ...p, [id]: { ...p[id], ...change } }));

  const setOption = (d: QuestionDraft, i: number, change: Partial<DraftOption>) => {
    const opts = editOf(d).options.map((o, j) => (j === i ? { ...o, ...change } : o));
    // Exactly one correct answer, always. Marking a new one clears the old rather than
    // letting the reviewer save something the server will refuse.
    if (change.isCorrect) opts.forEach((o, j) => { o.isCorrect = j === i; });
    patch(d._id, { options: opts });
  };

  const approve = async (d: QuestionDraft) => {
    setBusyId(d._id); setErr(''); setMsg('');
    try {
      const e = editOf(d);
      await passportApi.approveDraft(d._id, {
        question: e.question, options: e.options, explanation: e.explanation,
        difficulty: e.difficulty, codeSnippet: e.codeSnippet, language: e.language,
        audienceRoles: e.audienceRoles, audienceYears: e.audienceYears, audienceCourses: e.audienceCourses,
      });
      setMsg('Approved — it is now in the pool for ' + d.skillKey + '.');
      setDrafts(list => list.filter(x => x._id !== d._id));
      loadPool();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not approve.');
    }
    setBusyId('');
  };

  const reject = async (d: QuestionDraft) => {
    setBusyId(d._id); setErr(''); setMsg('');
    try {
      await passportApi.rejectDraft(d._id, edits[d._id]?.reviewNote);
      setDrafts(list => list.filter(x => x._id !== d._id));
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not reject.');
    }
    setBusyId('');
  };

  return (
    <div className="qd-page">
      <header className="qd-hd">
        <div>
          <h1>Question Drafting</h1>
          <p>
            AI writes candidates; nothing reaches a student until you approve it. An approved
            draft becomes a real question <em>and</em> its skill mapping in one step.
          </p>
        </div>
        <button className="qd-btn primary" onClick={() => setShowManual(v => !v)}>
          {showManual ? 'Close' : 'Write a question'}
        </button>
      </header>

      {err && <div className="qd-banner err">{err}</div>}
      {msg && <div className="qd-banner ok">{msg}</div>}

      {showManual && (
        <section className="qd-card">
          <ManualQuestionForm
            pool={pool}
            audienceOptions={audienceOpts}
            defaultSkill={genSkill || skillFilter}
            onCancel={() => setShowManual(false)}
            onSaved={() => {
              setShowManual(false);
              setMsg('Question saved and live in the pool.');
              loadDrafts(); loadPool();
            }}
          />
        </section>
      )}

      {/* ── Where the pool is thin ── */}
      <section className="qd-card">
        <h2>Where the pool is thin</h2>
        <p className="qd-sub">
          A paper draws slots per skill, so what matters is the count for each skill, not the
          total. Anything under {THIN_POOL} will repeat itself for a student who retakes.
        </p>
        <div className="qd-pool">
          {thinnest.map(s => (
            <button
              key={s.skillKey}
              className={`qd-pool-row${s.approved < THIN_POOL ? ' thin' : ''}${genSkill === s.skillKey ? ' picked' : ''}`}
              onClick={() => setGenSkill(s.skillKey)}
            >
              <b>{s.skillName}</b>
              <span className="n">{s.approved} in pool</span>
              {s.pending > 0 && <span className="p">{s.pending} awaiting review</span>}
            </button>
          ))}
        </div>
      </section>

      {/* ── Generate ── */}
      <section className="qd-card">
        <h2>Draft a batch</h2>
        <div className="qd-gen">
          <label>
            Skill
            <select value={genSkill} onChange={e => setGenSkill(e.target.value)}>
              <option value="">Choose a skill…</option>
              {pool.map(s => (
                <option key={s.skillKey} value={s.skillKey}>
                  {s.skillName} ({s.approved})
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulty
            <select value={genDifficulty} onChange={e => setGenDifficulty(e.target.value)}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label>
            How many
            {/* Capped at 20 server-side. Small batches are deliberate: the reviewer is the
                constraint, and forty unread drafts help nobody. */}
            <input type="number" min={1} max={20} value={genCount}
              onChange={e => setGenCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
          </label>
          <button className="qd-btn primary" disabled={generating || !genSkill} onClick={generate}>
            {generating ? 'Drafting…' : 'Draft questions'}
          </button>
        </div>

        {report && (
          <div className="qd-report">
            <b>{report.stored} drafted</b> for {report.skillKey}
            {report.flagged > 0 && <> · <span className="warn">{report.flagged} flagged for a closer look</span></>}
            {report.dropped.length > 0 && (
              <>
                {' '}· {report.dropped.length} rejected automatically
                <ul>
                  {report.dropped.map((d, i) => (
                    <li key={i}><span className="rz">{d.reason}</span> — {d.question}</li>
                  ))}
                </ul>
              </>
            )}
            {report.dropped.length > report.stored && (
              <div className="qd-hint">
                More was thrown away than kept. That is a prompt problem rather than bad luck
                — worth checking before spending another batch.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Review queue ── */}
      <section className="qd-card">
        <div className="qd-qhd">
          <h2>Review queue</h2>
          <div className="qd-filters">
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <select value={skillFilter} onChange={e => { setSkillFilter(e.target.value); setPage(0); }}>
              <option value="">Every skill</option>
              {pool.map(s => <option key={s.skillKey} value={s.skillKey}>{s.skillName}</option>)}
            </select>
          </div>
        </div>

        {/* Selection acts only on the pending rows of THIS page — see the effect that clears it. */}
        {pendingOnPage.length > 0 && (
          <div className="qd-bulk">
            <label className="qd-pickall">
              <input type="checkbox" checked={allPicked} onChange={toggleAll} />
              Select all on this page
            </label>
            <span className="qd-picked">{picked.size} selected</span>
            <button
              className="qd-btn primary"
              disabled={!picked.size || bulkBusy}
              onClick={approveSelected}
            >
              {bulkBusy ? 'Approving…' : `Approve ${picked.size || ''}`.trim()}
            </button>
          </div>
        )}

        {!drafts.length && <div className="qd-empty">Nothing here. Draft a batch above.</div>}

        {drafts.map(d0 => {
          const d = editOf(d0);
          const readOnly = d0.status !== 'pending';

          /**
           * Rationales arrive as a flat list covering the WRONG options in order, so they
           * have to be walked back onto the full option list. Done once per draft here
           * rather than recomputed inside the row, where getting the offset right depended
           * on where the correct answer happened to sit.
           */
          const rationale: Record<number, string> = {};
          let wrongSeen = 0;
          d.options.forEach((o, i) => {
            if (o.isCorrect) return;
            const why = d0.distractorRationale?.[wrongSeen];
            wrongSeen += 1;
            if (why) rationale[i] = why;
          });

          return (
            <article key={d0._id} className={`qd-draft${d0.warnings?.length ? ' flagged' : ''}`}>
              <div className="qd-meta">
                {!readOnly && (
                  <input
                    type="checkbox" className="qd-pick"
                    checked={picked.has(d0._id)}
                    onChange={() => togglePick(d0._id)}
                    aria-label="Select for bulk approval"
                  />
                )}
                <span className="chip">{d0.skillKey}</span>
                <span className={`chip d-${d0.difficulty}`}>{d0.difficulty}</span>
                {d0.manual && <span className="chip s-manual">written by hand</span>}
                {readOnly && <span className={`chip s-${d0.status}`}>{d0.status}</span>}
                {/* Who it reaches, always shown — "Everyone" is a real answer, not a blank. */}
                <span className="chip aud">{audienceSummary(d0)}</span>
              </div>

              {!!d0.warnings?.length && (
                <ul className="qd-warn">
                  {d0.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}

              <textarea
                className="qd-stem" rows={2} value={d.question} readOnly={readOnly}
                onChange={e => patch(d0._id, { question: e.target.value })}
              />

              {d.codeSnippet && <pre className="qd-code">{d.codeSnippet}</pre>}

              <div className="qd-opts">
                {d.options.map((o, i) => (
                  <label key={i} className={`qd-opt${o.isCorrect ? ' correct' : ''}`}>
                    <input
                      type="radio" name={`c-${d0._id}`} checked={o.isCorrect} disabled={readOnly}
                      onChange={() => setOption(d0, i, { isCorrect: true })}
                    />
                    <input
                      className="tx" value={o.text} readOnly={readOnly}
                      onChange={e => setOption(d0, i, { text: e.target.value })}
                    />
                    {/* Why a student would pick this one. Blank rationale is itself flagged
                        above — a distractor nobody would choose measures nothing. */}
                    {rationale[i] && <span className="why">{rationale[i]}</span>}
                  </label>
                ))}
              </div>

              <textarea
                className="qd-exp" rows={2} placeholder="Explanation shown after answering"
                value={d.explanation} readOnly={readOnly}
                onChange={e => patch(d0._id, { explanation: e.target.value })}
              />

              {!readOnly && (
                <details className="qd-aud-edit">
                  <summary>Who is this for? <b>{audienceSummary(d)}</b></summary>
                  <AudiencePicker
                    value={{
                      audienceRoles: d.audienceRoles || [],
                      audienceYears: d.audienceYears || [],
                      audienceCourses: d.audienceCourses || [],
                      audienceBranches: d.audienceBranches || [],
                    }}
                    options={audienceOpts}
                    poolCount={pool.find(x => x.skillKey === d0.skillKey)?.approved}
                    onChange={a => patch(d0._id, a as Partial<QuestionDraft>)}
                  />
                </details>
              )}

              {!readOnly && (
                <div className="qd-actions">
                  <input
                    className="qd-note" placeholder="Note (kept either way)"
                    value={(edits[d0._id]?.reviewNote as string) || ''}
                    onChange={e => patch(d0._id, { reviewNote: e.target.value })}
                  />
                  <button className="qd-btn ghost" disabled={busyId === d0._id} onClick={() => reject(d0)}>
                    Reject
                  </button>
                  <button className="qd-btn primary" disabled={busyId === d0._id} onClick={() => approve(d0)}>
                    {busyId === d0._id ? 'Saving…' : 'Approve'}
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {total > PAGE_SIZE && (
          <nav className="qd-pager">
            <button className="qd-btn ghost" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
              ← Previous
            </button>
            <span>
              Page <b>{page + 1}</b> of {pageCount} · {total} draft{total === 1 ? '' : 's'}
            </span>
            <button
              className="qd-btn ghost"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </nav>
        )}
      </section>
    </div>
  );
};

export default AdminQuestionDrafts;
