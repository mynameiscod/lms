import React, { useCallback, useEffect, useMemo, useState } from 'react';
import passportApi, {
  PoolCoverageRow, QuestionDraft, DraftBatchReport, DraftOption,
} from '../../api/passportApi';
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

const AdminQuestionDrafts: React.FC = () => {
  const [pool, setPool] = useState<PoolCoverageRow[]>([]);
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [status, setStatus] = useState('pending');
  const [skillFilter, setSkillFilter] = useState('');

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

  const loadPool = useCallback(() => {
    passportApi.draftCoverage()
      .then(r => setPool(r.skills))
      .catch(e => setErr(e?.response?.data?.message || 'Could not load pool coverage.'));
  }, []);

  const loadDrafts = useCallback(() => {
    passportApi.listDrafts({ status, skillKey: skillFilter || undefined, limit: 50 })
      .then(r => setDrafts(r.drafts))
      .catch(e => setErr(e?.response?.data?.message || 'Could not load drafts.'));
  }, [status, skillFilter]);

  useEffect(loadPool, [loadPool]);
  useEffect(loadDrafts, [loadDrafts]);

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
      </header>

      {err && <div className="qd-banner err">{err}</div>}
      {msg && <div className="qd-banner ok">{msg}</div>}

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
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>
              <option value="">Every skill</option>
              {pool.map(s => <option key={s.skillKey} value={s.skillKey}>{s.skillName}</option>)}
            </select>
          </div>
        </div>

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
                <span className="chip">{d0.skillKey}</span>
                <span className={`chip d-${d0.difficulty}`}>{d0.difficulty}</span>
                {readOnly && <span className={`chip s-${d0.status}`}>{d0.status}</span>}
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
      </section>
    </div>
  );
};

export default AdminQuestionDrafts;
