import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { codingPracticeApi, LearnerSetDetail, LearnerSetSummary } from '../../api/problemSetApi';
import { pbError } from '../../api/problemBankApi';
import { DifficultyPill, LANG_SHORT } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';

/**
 * Coding practice — the learner's side of the Problem Bank. The same pages serve LMS students
 * (/coding-practice) and CareerPilot members (/careerpilot/coding); `base` is the only difference.
 */

const dueLabel = (iso?: string) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.floor(ms / 86400000);
  if (ms < 0) return { text: `Was due ${new Date(iso).toLocaleDateString()}`, cls: 'pb-badge-bad' };
  if (days < 1) return { text: `Due in ${Math.max(1, Math.floor(ms / 3600000))}h`, cls: 'pb-badge-warn' };
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, cls: days <= 2 ? 'pb-badge-warn' : 'pb-badge-neutral' };
};

export const MySets: React.FC<{ base: string }> = ({ base }) => {
  const nav = useNavigate();
  const [sets, setSets] = useState<LearnerSetSummary[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { codingPracticeApi.sets().then(setSets).catch((e) => setErr(pbError(e))); }, []);

  const totals = (sets || []).reduce((a, s) => ({ solved: a.solved + s.solved, total: a.total + s.problemCount }), { solved: 0, total: 0 });
  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 1100 }}>
        <div className="pb-head">
          <div className="pb-grow">
            <h1>Coding Practice</h1>
            <p>Problem sets from your mentors. Solve them in any allowed language — Run checks the examples, Submit checks every hidden test.</p>
          </div>
          {!!sets?.length && <div className="pb-card pb-stat" style={{ minWidth: 180 }}><div className="l">Solved</div><div className="n">{totals.solved}<span className="pb-faint" style={{ fontSize: 16 }}> / {totals.total}</span></div></div>}
        </div>
        {err && <div className="pb-alert pb-alert-bad">{err}</div>}
        {!sets ? <div className="pb-muted"><span className="pb-spinner" /> Loading…</div> : !sets.length ? (
          <div className="pb-card pb-empty"><h2>Nothing assigned yet</h2><p className="pb-muted">When your mentor assigns a problem set, it appears here.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {sets.map((s) => {
              const due = dueLabel(s.dueAt);
              const pct = s.problemCount ? Math.round((s.solved / s.problemCount) * 100) : 0;
              return (
                <div key={s._id} className="pb-card pb-create-card" onClick={() => nav(`${base}/${s._id}`)}>
                  <div className="pb-row" style={{ marginBottom: 6 }}>
                    <span className="pb-tag">{s.kind === 'practice' ? 'Practice' : 'Assignment'}</span>
                    {s.status === 'closed' && <span className="pb-pill pb-badge-neutral">Closed</span>}
                    <span className="pb-spacer" />
                    {due && <span className={`pb-pill ${due.cls}`}>{due.text}</span>}
                  </div>
                  <b style={{ fontSize: 16 }}>{s.title}</b>
                  {s.description && <div className="pb-muted" style={{ fontSize: 13, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</div>}
                  <div className="pb-diffbar" style={{ marginTop: 12 }}><span style={{ width: `${pct}%`, background: 'var(--pb-ok)' }} /></div>
                  <div className="pb-row" style={{ fontSize: 12.5 }}>
                    <span><b>{s.solved}</b>/{s.problemCount} solved</span><span className="pb-spacer" />
                    <span className="pb-muted">{s.score} / {s.totalMarks} marks</span>
                  </div>
                  <div className="pb-row" style={{ gap: 10, fontSize: 12, marginTop: 6 }}>
                    <span style={{ color: 'var(--pb-easy)' }}>{s.counts.easy} easy</span>
                    <span style={{ color: 'var(--pb-medium)' }}>{s.counts.medium} medium</span>
                    <span style={{ color: 'var(--pb-hard)' }}>{s.counts.hard} hard</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const SetView: React.FC<{ base: string }> = ({ base }) => {
  const { setId } = useParams();
  const nav = useNavigate();
  const [s, setS] = useState<LearnerSetDetail | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { codingPracticeApi.set(setId!).then(setS).catch((e) => setErr(pbError(e))); }, [setId]);
  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div><button className="pb-btn" onClick={() => nav(base)}>Back</button></div></div>;
  if (!s) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading…</div></div>;
  const due = dueLabel(s.dueAt);
  const solved = s.problems.filter((p) => p.status === 'solved').length;
  return (
    <div className="pb-root">
      <div className="pb-page" style={{ maxWidth: 1000 }}>
        <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => nav(base)}><i className="fa-solid fa-arrow-left" /> All problem sets</button>
        <div className="pb-head" style={{ marginTop: 10 }}>
          <div className="pb-grow">
            <h1>{s.title}</h1>
            {s.description && <p>{s.description}</p>}
          </div>
          <div className="pb-row">{due && <span className={`pb-pill ${due.cls}`}>{due.text}</span>}<span className="pb-pill pb-badge-ok">{solved}/{s.problems.length} solved</span></div>
        </div>
        {s.isStaff && <div className="pb-alert pb-alert-info">You are previewing as staff — your submissions are recorded as practice and do not appear in the report.</div>}
        <div className="pb-card pb-table-wrap">
          <table className="pb-table">
            <thead><tr><th style={{ width: 50 }}>Status</th><th>Problem</th><th>Difficulty</th><th>Languages</th><th>Score</th></tr></thead>
            <tbody>
              {s.problems.map((p) => (
                <tr key={String(p._id)} onClick={() => !p.missing && nav(`${base}/${s._id}/${p._id}`)} style={{ opacity: p.missing ? 0.5 : 1 }}>
                  <td style={{ fontSize: 16 }}>{p.status === 'solved' ? <i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)' }} title="Solved" />
                    : p.status === 'attempted' ? <i className="fa-solid fa-circle-half-stroke" style={{ color: 'var(--pb-warn)' }} title="Attempted" />
                      : <i className="fa-regular fa-circle" style={{ color: 'var(--pb-faint)' }} title="Not started" />}</td>
                  <td className="pb-title-cell"><div className="t">{p.order}. {p.title}</div></td>
                  <td>{!p.missing && <DifficultyPill d={p.difficulty} />}</td>
                  <td><div className="pb-langs">{(p.languages || []).map((l) => <span key={l} className="pb-lang">{LANG_SHORT[l] || l}</span>)}</div></td>
                  <td>{p.missing ? '' : <><b>{p.bestScore}</b><span className="pb-faint"> / {p.marks}</span></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
