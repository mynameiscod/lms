import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { examResultsApi, ExamResults as Results, PaperDetail, QuestionStat, ResultRow, ResultStatus, examError } from '../../api/poolExamApi';
import { DifficultyPill, LANG_SHORT, VERDICT_LABEL, useToast } from '../ProblemBank/shared';
import '../ProblemBank/ProblemBank.css';
import '../QuestionPools/questionPools.css';
import './examResults.css';

/**
 * A pool exam's results, for the teacher: everyone it was given to, ranked on their best marked
 * attempt; each student's paper with the key beside their answers; how every question performed;
 * releasing results to students; and the spreadsheet.
 */

const STATUS: Record<ResultStatus, { label: string; cls: string }> = {
  graded: { label: 'Marked', cls: 'ok' },
  marking: { label: 'Being marked', cls: 'info' },
  in_progress: { label: 'In progress', cls: 'warn' },
  not_started: { label: 'Not started', cls: 'neutral' },
};
const ENDED: Record<string, string> = { student: 'Submitted', time_up: 'Time ran out', tab_switch: 'Auto-submitted: left the tab' };
const FILTERS: { key: string; label: string; test: (r: ResultRow) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'graded', label: 'Marked', test: r => r.status === 'graded' },
  { key: 'marking', label: 'Being marked', test: r => r.status === 'marking' },
  { key: 'in_progress', label: 'In progress', test: r => r.status === 'in_progress' },
  { key: 'not_started', label: 'Not started', test: r => r.status === 'not_started' },
  { key: 'flagged', label: 'Flagged', test: r => r.tabSwitches > 0 || r.pasteAttempts > 0 },
];
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
const LETTERS = 'ABCDEFGHIJ';

const Bar: React.FC<{ value: number | null; pass?: boolean | null }> = ({ value, pass }) => (
  <span className="xr-bar" aria-hidden><span className={pass === false ? 'bad' : pass ? 'ok' : ''} style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></span>
);

/* ── One student's paper ── */
const PaperPanel: React.FC<{ row: ResultRow; onClose: () => void; onChanged: () => void }> = ({ row, onClose, onChanged }) => {
  const [attemptId, setAttemptId] = useState(row.attemptId!);
  const [p, setP] = useState<PaperDetail | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setP(null); setErr(''); examResultsApi.paper(attemptId).then(setP).catch(e => setErr(examError(e, 'Could not open this paper.'))); }, [attemptId]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const remark = async () => {
    setBusy(true);
    try { setP(await examResultsApi.regrade(attemptId)); onChanged(); } catch (e) { setErr(examError(e, 'Could not re-mark this paper.')); }
    setBusy(false);
  };

  // Portalled to <body>: inside the app layout, an ancestor offsets position:fixed, which left a strip of page showing on phones.
  return createPortal(
    <div className="xr-panel-back pb-root" onMouseDown={onClose}>
      <aside className="xr-panel" role="dialog" aria-modal="true" aria-label={`${row.name}'s paper`} onMouseDown={e => e.stopPropagation()}>
        <header className="xr-panel-head">
          <div className="pb-grow" style={{ minWidth: 0 }}>
            <h2>{row.name}</h2>
            <small>{row.email}{row.batch ? ` · ${row.batch}` : ''}</small>
          </div>
          <button className="pb-btn pb-btn-ghost pb-btn-icon" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
        </header>
        {row.allAttempts.length > 1 && (
          <div className="xr-attempts" role="tablist" aria-label="Attempts">
            {row.allAttempts.map(a => (
              <button key={a.id} role="tab" aria-selected={a.id === attemptId} className={a.id === attemptId ? 'on' : ''} onClick={() => setAttemptId(a.id)}>
                Attempt {a.attemptNumber}{a.score !== null ? ` · ${a.score}` : ''}
              </button>
            ))}
          </div>
        )}
        <div className="xr-panel-body">
          {err && <div className="pb-alert pb-alert-bad">{err}</div>}
          {!p ? !err && <div className="pb-muted"><span className="pb-spinner" /> Opening the paper…</div> : <>
            <div className="xr-paper-sum">
              <div className="xr-big">
                {p.score !== null ? <><b>{p.score}</b><span>/ {p.maxScore}</span></> : <span className="pb-muted">{STATUS[p.status].label}</span>}
                {p.passed !== null && <span className={`pb-pill ${p.passed ? 'pb-badge-ok' : 'pb-badge-bad'}`}>{p.passed ? 'Pass' : 'Fail'}</span>}
              </div>
              <dl>
                <div><dt>Started</dt><dd>{when(p.startedAt)}</dd></div>
                <div><dt>Ended</dt><dd>{when(p.submittedAt)}{p.submitReason ? ` · ${ENDED[p.submitReason] || p.submitReason}` : ''}</dd></div>
                <div><dt>Tab switches</dt><dd className={p.tabSwitches ? 'warn' : ''}>{p.tabSwitches}</dd></div>
                <div><dt>Copy / paste tries</dt><dd className={p.violations.some(v => v.type !== 'tab_switch') ? 'warn' : ''}>
                  {p.violations.filter(v => v.type === 'copy').length} / {p.violations.filter(v => v.type === 'paste').length}</dd></div>
              </dl>
              {p.status !== 'in_progress' && (
                <button className="pb-btn pb-btn-sm" onClick={remark} disabled={busy} title="Mark this paper again, e.g. after fixing a question's tests">
                  {busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-rotate" />} Re-mark
                </button>
              )}
            </div>

            {p.items.map(it => (
              <section key={it.key} className={`xr-q ${it.score === null ? '' : it.score >= it.marks ? 'ok' : it.score > 0 ? 'part' : 'bad'}`}>
                <div className="xr-q-head">
                  <b>Q{it.n}</b><span className="pb-tag">{it.section}</span><DifficultyPill d={it.difficulty} />
                  <span className="pb-spacer" />
                  <span className="xr-q-score">{it.score === null ? '—' : it.score} / {it.marks}</span>
                </div>
                {it.kind === 'mcq' ? <>
                  <p className="xr-q-text">{it.question}</p>
                  <ul className="xr-opts">
                    {(it.options || []).map((o, i) => {
                      const right = (it.answerKey || []).includes(i);
                      const chosen = (it.selected || []).includes(i);
                      return (
                        <li key={i} className={`${right ? 'right' : ''} ${chosen && !right ? 'wrong' : ''}`}>
                          <span className="xr-letter">{LETTERS[i]}</span><span className="pb-grow">{o}</span>
                          {chosen && <span className="xr-tag">{right ? 'Their answer ✓' : 'Their answer'}</span>}
                          {right && !chosen && <span className="xr-tag key">Correct answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {!(it.selected || []).length && <p className="pb-muted xr-none">Not answered</p>}
                </> : <>
                  <p className="xr-q-text"><i className="fa-solid fa-code" /> {it.title}</p>
                  {it.code?.trim() ? <>
                    <div className="xr-code-meta">
                      <span className="pb-lang">{LANG_SHORT[it.language || ''] || it.language}</span>
                      {it.result?.verdict && <span><b>{VERDICT_LABEL[it.result.verdict] || it.result.verdict}</b>{it.result.total ? ` · ${it.result.passed}/${it.result.total} tests passed` : ''}</span>}
                      <span className="pb-muted">{it.runs || 0} run{it.runs === 1 ? '' : 's'}</span>
                      {it.result?.simulated && <span className="xr-sim" title="Set PISTON_URL on the server, then Re-mark this exam."><i className="fa-solid fa-triangle-exclamation" /> Marked without a code runner — not a real result</span>}
                    </div>
                    <pre className="xr-code">{it.code}</pre>
                  </> : <p className="pb-muted xr-none">Not answered</p>}
                </>}
              </section>
            ))}

            {!!p.violations.length && (
              <section className="xr-timeline">
                <h3>Proctoring</h3>
                <ul>{p.violations.map((v, i) => (
                  <li key={i}><i className={`fa-solid ${v.type === 'tab_switch' ? 'fa-window-restore' : v.type === 'paste' ? 'fa-paste' : 'fa-copy'}`} />
                    {v.type === 'tab_switch' ? 'Left the exam tab' : v.type === 'paste' ? 'Tried to paste' : 'Tried to copy'}
                    <span className="pb-muted">{new Date(v.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span></li>
                ))}</ul>
              </section>
            )}
          </>}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

/* ── The page ── */
const ExamResultsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const [r, setR] = useState<Results | null>(null);
  const [qs, setQs] = useState<{ graded: number; rows: QuestionStat[] } | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'students' | 'questions'>('students');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<ResultRow | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    examResultsApi.results(id).then(setR).catch(e => setErr(examError(e, 'Could not load the results.')));
    examResultsApi.questions(id).then(setQs).catch(() => undefined);
  }, [id]);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter) || FILTERS[0];
    const s = search.trim().toLowerCase();
    return (r?.rows || []).filter(f.test).filter(x => !s || `${x.name} ${x.email} ${x.batch}`.toLowerCase().includes(s));
  }, [r, filter, search]);

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div>
    <button className="pb-btn" onClick={() => nav('/admin/assignments')}><i className="fa-solid fa-arrow-left" /> Assignments</button></div></div>;
  if (!r) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading results…</div></div>;

  const toggleRelease = async () => {
    const next = !r.exam.released;
    if (next && !window.confirm('Release results? Every student who sat this exam will see their score.')) return;
    setBusy('release');
    try { await examResultsApi.release(id, next); toast.show(next ? 'Results released to students' : 'Results hidden from students'); load(); }
    catch (e) { toast.show(examError(e), true); }
    setBusy('');
  };
  const doExport = async () => {
    setBusy('export');
    try { await examResultsApi.exportXlsx(id, r.exam.title); } catch (e) { toast.show(examError(e, 'Could not export.'), true); }
    setBusy('');
  };
  const s = r.summary;
  const rank = new Map(r.rows.filter(x => x.status === 'graded').map((x, i) => [x.id, i + 1]));

  return (
    <div className="pb-root xr">
      <div className="pb-page">
        <button className="pb-btn pb-btn-ghost pb-btn-sm" style={{ marginBottom: 8 }} onClick={() => nav('/admin/assignments')}><i className="fa-solid fa-arrow-left" /> Assignments</button>
        <div className="pb-head xr-head">
          <div className="pb-grow" style={{ minWidth: 0 }}>
            <h1>{r.exam.title}</h1>
            <p><span className="pb-tag">Exam results</span> {r.exam.totalMarks} marks · pass mark {r.exam.passMark}</p>
          </div>
          <div className="xr-actions">
            {r.exam.showImmediately
              ? <span className="xr-note"><i className="fa-solid fa-eye" /> Students see their score as soon as they submit</span>
              : <button className={`pb-btn ${r.exam.released ? '' : 'pb-btn-primary'}`} onClick={toggleRelease} disabled={busy === 'release'}>
                {busy === 'release' ? <span className="pb-spinner" /> : <i className={`fa-solid ${r.exam.released ? 'fa-eye-slash' : 'fa-paper-plane'}`} />}
                {r.exam.released ? ' Hide results' : ' Release results'}
              </button>}
            <button className="pb-btn" onClick={doExport} disabled={busy === 'export'}>{busy === 'export' ? <span className="pb-spinner" /> : <i className="fa-solid fa-file-excel" />} Export</button>
          </div>
        </div>
        {!r.exam.showImmediately && (
          <div className={`pb-alert ${r.exam.released ? 'pb-alert-ok' : 'pb-alert-info'}`}>
            {r.exam.released
              ? <><i className="fa-solid fa-circle-check" /> Released {when(r.exam.releasedAt)} — students can see their scores.</>
              : <><i className="fa-solid fa-lock" /> Results are hidden from students until you release them.</>}
          </div>
        )}

        <div className="xr-kpis">
          <div className="pb-card xr-kpi"><b>{s.assigned}</b><span>given the exam</span></div>
          <div className="pb-card xr-kpi"><b>{s.submitted}</b><span>submitted{s.inProgress ? ` · ${s.inProgress} sitting now` : ''}</span></div>
          <div className="pb-card xr-kpi"><b>{s.average === null ? '—' : `${s.average}%`}</b><span>average score</span></div>
          <div className="pb-card xr-kpi"><b>{s.passRate === null ? '—' : `${s.passRate}%`}</b><span>passed</span></div>
          <div className="pb-card xr-kpi"><b>{s.highest === null ? '—' : `${s.highest}%`}</b><span>highest</span></div>
          <div className={`pb-card xr-kpi${s.flagged ? ' warn' : ''}`}><b>{s.flagged}</b><span>flagged by proctoring</span></div>
        </div>
        {s.marking > 0 && <div className="pb-alert pb-alert-warn">{s.marking} paper{s.marking === 1 ? ' is' : 's are'} still being marked — coding answers run against every test, which can take a minute.</div>}

        <div className="pb-tabs xr-tabs">
          <button className={tab === 'students' ? 'on' : ''} onClick={() => setTab('students')}><i className="fa-solid fa-user-graduate" /> Students<span className="cnt">{s.assigned}</span></button>
          <button className={tab === 'questions' ? 'on' : ''} onClick={() => setTab('questions')}><i className="fa-solid fa-chart-column" /> Questions<span className="cnt">{qs?.rows.length ?? 0}</span></button>
        </div>

        {tab === 'students' ? <>
          <div className="xr-filters">
            <div className="xr-chips" role="tablist" aria-label="Filter students">
              {FILTERS.map(f => {
                const n = r.rows.filter(f.test).length;
                return <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>{f.label} <span>{n}</span></button>;
              })}
            </div>
            <div className="pb-search xr-search"><i className="fa-solid fa-magnifying-glass" /><input className="pb-input" placeholder="Search name, email or batch" value={search} onChange={e => setSearch(e.target.value)} /></div>
          </div>
          {!rows.length ? (
            <div className="pb-card pb-empty"><h2>{r.rows.length ? 'Nobody matches' : 'Nobody has been given this exam yet'}</h2>
              <p className="pb-muted">{r.rows.length ? 'Try another filter or search.' : 'Publish the exam, then use Assign to Batches on the Assignments list.'}</p></div>
          ) : (
            <div className="pb-card pb-table-wrap">
              <table className="pb-table qp-table xr-table">
                <thead><tr><th className="xr-hide-md">#</th><th>Student</th><th>Status</th><th>Score</th><th>Result</th><th>Time</th><th>Proctoring</th><th className="xr-hide-md" /></tr></thead>
                <tbody>
                  {rows.map(x => (
                    <tr key={x.id} onClick={() => x.attemptId && setOpen(x)} className={x.attemptId ? '' : 'xr-idle'}>
                      <td className="pb-muted qp-hide-sm xr-hide-md">{rank.get(x.id) || ''}</td>
                      <td className="qp-main"><div className="xr-name">{x.name}</div><div className="pb-muted xr-sub">{x.email}{x.batch ? ` · ${x.batch}` : ''}</div></td>
                      <td className="qp-meta"><span className={`xr-status ${STATUS[x.status].cls}`}>{STATUS[x.status].label}</span>{x.attempts > 1 && <span className="pb-muted xr-sub"> · {x.attempts} attempts</span>}
                        {x.submitReason && x.submitReason !== 'student' ? <div className="xr-sub xr-ended">{ENDED[x.submitReason]}</div> : null}</td>
                      <td className="qp-meta xr-score-cell">{x.score !== null ? <><b>{x.score}</b><span className="pb-muted">/{x.maxScore}</span><Bar value={x.percentage} pass={x.passed} /></> : <span className="pb-muted">—</span>}</td>
                      <td className="qp-meta">{x.passed === null ? '' : <span className={`pb-pill ${x.passed ? 'pb-badge-ok' : 'pb-badge-bad'}`}>{x.passed ? 'Pass' : 'Fail'}</span>}</td>
                      <td className="pb-muted qp-meta xr-time">{x.minutes !== null ? (x.minutes < 1 ? '< 1 min' : `${x.minutes} min`) : ''}</td>
                      <td className="qp-meta">
                        {x.tabSwitches > 0 && <span className="xr-flag" title="Times they left the exam tab"><i className="fa-solid fa-window-restore" /> {x.tabSwitches}</span>}
                        {x.pasteAttempts > 0 && <span className="xr-flag" title="Paste attempts"><i className="fa-solid fa-paste" /> {x.pasteAttempts}</span>}
                      </td>
                      <td className="qp-hide-sm xr-hide-md">{x.attemptId && <span className="xr-open">Paper <i className="fa-solid fa-chevron-right" /></span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </> : (
          !qs || !qs.rows.length ? (
            <div className="pb-card pb-empty"><h2>No marked papers yet</h2><p className="pb-muted">Question statistics appear once papers have been marked.</p></div>
          ) : <>
            <p className="pb-muted xr-qnote">Across {qs.graded} marked paper{qs.graded === 1 ? '' : 's'}. Every student gets different questions, so a low score here usually means one question, not the whole exam — check the flagged ones first.</p>
            <div className="pb-card pb-table-wrap">
              <table className="pb-table qp-table xr-table">
                <thead><tr><th>Question</th><th>Type</th><th>Level</th><th>Drawn</th><th>Average score</th><th>Note</th></tr></thead>
                <tbody>
                  {qs.rows.map(q => (
                    <tr key={q.id} style={{ cursor: 'default' }}>
                      <td className="qp-main"><div className="xr-qtitle">{q.title}</div><div className="pb-muted xr-sub">{q.section}</div></td>
                      <td className="qp-meta"><span className="pb-tag">{q.kind === 'mcq' ? 'MCQ' : 'Coding'}</span></td>
                      <td className="qp-meta"><DifficultyPill d={q.difficulty} /></td>
                      <td className="pb-muted qp-meta" data-label="Drawn">{q.drawn}×</td>
                      <td className="qp-meta xr-score-cell"><b>{q.scoreRate}%</b><Bar value={q.scoreRate} pass={q.scoreRate >= 50} /></td>
                      <td className="qp-meta">{q.flag === 'check' ? <span className="pb-pill pb-badge-bad"><i className="fa-solid fa-triangle-exclamation" /> Nobody got full marks — check it</span>
                        : q.flag === 'hard' ? <span className="pb-pill pb-badge-warn">Hard for students</span>
                          : q.flag === 'easy' ? <span className="pb-pill pb-badge-neutral">Very easy</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {open && <PaperPanel row={open} onClose={() => setOpen(null)} onChanged={load} />}
      {toast.node}
    </div>
  );
};

export default ExamResultsPage;
