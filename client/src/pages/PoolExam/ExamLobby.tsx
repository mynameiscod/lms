import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { poolExamApi, ExamOverview, examError } from '../../api/poolExamApi';
import './poolExam.css';

/**
 * The exam's front page: what it is, what is in the paper, the rules, the student's attempts, and
 * Start. Starting draws this student's own paper, so it is a deliberate step behind a confirmation
 * of the rules — not something a stray click on the assignment list should do.
 */

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const minutes = (m: number) => (!m ? 'No limit' : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

const BLOCKED: Record<string, { icon: string; text: (o: ExamOverview) => string }> = {
  not_open: { icon: 'bi-hourglass-split', text: o => `This exam opens on ${when(o.window.startAt)}.` },
  closed: { icon: 'bi-lock', text: () => 'This exam has closed.' },
  no_attempts: { icon: 'bi-check2-all', text: o => `You have used all ${o.maxAttempts} attempt${o.maxAttempts === 1 ? '' : 's'}.` },
};

const ExamLobby: React.FC = () => {
  const { assignmentId = '' } = useParams<{ assignmentId: string }>();
  const nav = useNavigate();
  const [o, setO] = useState<ExamOverview | null>(null);
  const [err, setErr] = useState('');
  const [starting, setStarting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [allAttempts, setAllAttempts] = useState(false);

  useEffect(() => { poolExamApi.overview(assignmentId).then(setO).catch(e => setErr(examError(e, 'Could not open this exam.'))); }, [assignmentId]);

  const begin = async () => {
    setStarting(true); setErr('');
    try {
      const r = await poolExamApi.start(assignmentId);
      nav(`/exams/${assignmentId}/attempt/${r.attemptId}`);
    } catch (e) { setErr(examError(e, 'Could not start the exam.')); setStarting(false); }
  };

  if (!o) {
    return (
      <div className="exl">
        {err ? <div className="exl-card exl-empty"><i className="bi bi-exclamation-circle" /><h2>This exam is not available</h2><p>{err}</p>
          <button className="exl-btn" onClick={() => nav('/assignments')}><i className="bi bi-arrow-left" /> My assignments</button></div>
          : <div className="exl-card exl-empty"><span className="exl-spinner" /><p>Opening the exam…</p></div>}
      </div>
    );
  }

  const questions = o.sections.reduce((n, s) => n + s.questions, 0);
  const used = o.attempts.length;
  const block = o.blocked ? BLOCKED[o.blocked] : null;
  const rules: { icon: string; text: string }[] = [
    { icon: 'bi-shuffle', text: 'Your questions are picked at random for you — classmates get different papers of the same difficulty.' },
    ...(o.durationMinutes ? [{ icon: 'bi-stopwatch', text: `You have ${minutes(o.durationMinutes)} from the moment you start. When time runs out, your paper is submitted automatically.` }] : []),
    { icon: 'bi-cloud-check', text: 'Answers save as you go. If your connection drops, open the exam again and carry on where you left off.' },
    ...(o.rules.tabSwitch.enabled ? [{
      icon: 'bi-window-stack',
      text: `Stay on this tab. Leaving it is recorded${o.rules.tabSwitch.autoSubmit ? ` — after ${o.rules.tabSwitch.maxWarnings} warning${o.rules.tabSwitch.maxWarnings === 1 ? '' : 's'}, your paper is submitted automatically` : ''}.`,
    }] : []),
    ...(o.rules.blockCopyPaste ? [{ icon: 'bi-clipboard-x', text: 'Copy and paste are turned off during the exam.' }] : []),
    { icon: 'bi-award', text: o.resultsVisible ? 'You will see your score once your paper has been marked.' : 'Your score appears here when your instructor releases the results.' },
  ];

  return (
    <div className="exl">
      <button className="exl-back" onClick={() => nav('/assignments')}><i className="bi bi-arrow-left" /> My assignments</button>

      <section className="exl-hero">
        <div className="exl-hero-copy">
          <span className="exl-eyebrow"><i className="bi bi-bullseye" /> Exam</span>
          <h1>{o.title}</h1>
          {(o.window.startAt || o.window.dueAt) && (
            <p className="exl-window">
              {o.window.startAt && <span><i className="bi bi-calendar-event" /> Opens {when(o.window.startAt)}</span>}
              {o.window.dueAt && <span><i className="bi bi-calendar-x" /> Closes {when(o.window.dueAt)}</span>}
            </p>
          )}
        </div>
        <div className="exl-hero-cta">
          {o.inProgress ? (
            <button className="exl-btn exl-btn-light exl-btn-lg" onClick={() => nav(`/exams/${assignmentId}/attempt/${o.inProgress}`)}>
              <i className="bi bi-play-fill" /> Resume exam
            </button>
          ) : block ? (
            <div className="exl-blocked"><i className={`bi ${block.icon}`} /> {block.text(o)}</div>
          ) : (
            <a className="exl-btn exl-btn-light exl-btn-lg" href="#exl-start"><i className="bi bi-play-fill" /> Get ready</a>
          )}
        </div>
      </section>

      <div className="exl-facts">
        <div className="exl-fact"><i className="bi bi-list-ol" /><b>{questions}</b><span>question{questions === 1 ? '' : 's'}</span></div>
        <div className="exl-fact"><i className="bi bi-trophy" /><b>{o.totalMarks}</b><span>marks{o.passMark ? ` · pass ${o.passMark}` : ''}</span></div>
        <div className="exl-fact"><i className="bi bi-stopwatch" /><b>{minutes(o.durationMinutes)}</b><span>time allowed</span></div>
        <div className="exl-fact"><i className="bi bi-arrow-repeat" /><b>{o.maxAttempts ? `${used} / ${o.maxAttempts}` : used}</b><span>{o.maxAttempts ? 'attempts used' : 'attempts · no limit'}</span></div>
      </div>

      <div className="exl-grid">
        <div className="exl-main">
          <div className="exl-card">
            <h2>What is in the paper</h2>
            <ul className="exl-sections">
              {o.sections.map((s, i) => (
                <li key={i}>
                  <span className={`exl-kind ${s.kind}`}><i className={`bi ${s.kind === 'coding' ? 'bi-code-slash' : 'bi-ui-radios'}`} /></span>
                  <div><b>{s.title}</b><small>{s.questions} {s.kind === 'coding' ? 'coding problem' : 'multiple-choice question'}{s.questions === 1 ? '' : 's'}</small></div>
                  <span className="exl-marks">{s.marks} marks</span>
                </li>
              ))}
            </ul>
          </div>
          {(o.description || o.instructions) && (
            <div className="exl-card exl-rich">
              <h2>Instructions</h2>
              {o.description && <div dangerouslySetInnerHTML={{ __html: o.description }} />}
              {o.instructions && <div dangerouslySetInnerHTML={{ __html: o.instructions }} />}
            </div>
          )}
        </div>

        <aside className="exl-side">
          <div className="exl-card">
            <h2>Before you start</h2>
            <ul className="exl-rules">{rules.map(r => <li key={r.text}><i className={`bi ${r.icon}`} /><span>{r.text}</span></li>)}</ul>
          </div>
          {!!o.attempts.length && (
            <div className="exl-card">
              <h2>Your attempts</h2>
              <ul className="exl-attempts">
                {o.attempts.slice().reverse().slice(0, allAttempts ? undefined : 3).map(a => (
                  <li key={a.id}>
                    <div><b>Attempt {a.attemptNumber}</b><small>{a.submittedAt ? `Submitted ${when(a.submittedAt)}` : `Started ${when(a.startedAt)}`}</small></div>
                    {a.status === 'in_progress' ? <span className="exl-pill live">In progress</span>
                      : a.score !== undefined ? <span className="exl-score"><b>{a.score}</b> / {a.maxScore}<small>{a.percentage}%</small></span>
                        : <span className="exl-pill">{a.status === 'graded' || !o.resultsVisible ? 'Awaiting results' : 'Being marked'}</span>}
                  </li>
                ))}
              </ul>
              {o.attempts.length > 3 && (
                <button className="exl-more" onClick={() => setAllAttempts(v => !v)}>
                  {allAttempts ? 'Show fewer' : `Show all ${o.attempts.length} attempts`}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

      {!o.inProgress && o.canStart && (
        <div className="exl-card exl-start" id="exl-start">
          <label className="exl-agree">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>I have read the rules above and I am ready. The timer starts as soon as I press Start.</span>
          </label>
          {err && <div className="exl-err"><i className="bi bi-exclamation-triangle" /> {err}</div>}
          <button className="exl-btn exl-btn-lg" disabled={!agreed || starting} onClick={begin}>
            {starting ? <><span className="exl-spinner sm" /> Preparing your paper…</> : <><i className="bi bi-play-fill" /> Start exam{o.maxAttempts > 1 ? ` · attempt ${used + 1} of ${o.maxAttempts}` : ''}</>}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExamLobby;
