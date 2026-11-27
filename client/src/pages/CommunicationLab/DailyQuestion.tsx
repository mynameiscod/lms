import React, { useEffect, useMemo, useRef, useState } from 'react';
import { communicationApi, CommAttempt, CommJob, CommToday } from '../../api/communicationApi';
import Recorder from './Recorder';
import SpeakingFeedback from './SpeakingFeedback';
import { ImprovementCard, RecentDays, groupDays, isCounted, journeyStart, longDate, scoreTone } from './LabHome';
import './dailyQuestion.css';

/**
 * The LMS student's Communication Lab (2026-11-27): ONLY today's question from the batch's lab track.
 *
 * One take. Sending uploads the answer and the server scores it in the background; this page follows that
 * job with a progress bar and opens the report by itself when it is ready (also after a reload, or when the
 * student comes back later). The report starts with how they changed since their last answer.
 */

const STAGES: { key: CommJob['stage']; label: string; from: number; to: number; tau: number }[] = [
  { key: 'transcribing', label: 'Listening to your answer', from: 8, to: 40, tau: 10 },
  { key: 'analysing', label: 'AI is analysing your answer', from: 40, to: 92, tau: 22 },
  { key: 'saving', label: 'Preparing your report', from: 92, to: 99, tau: 3 },
];

/** Follows one job until it is done or failed. The bar moves within the real stage and never claims 100% early. */
export const ProcessingPanel: React.FC<{ job: CommJob; onDone: (a: CommAttempt) => void; onFailed: (message: string) => void }> = ({ job, onDone, onFailed }) => {
  const [stage, setStage] = useState<CommJob['stage']>(job.stage);
  const [pct, setPct] = useState(STAGES[0].from);
  const stageAt = useRef(Date.now());
  const done = useRef(false);
  const cbs = useRef({ onDone, onFailed });
  cbs.current = { onDone, onFailed };

  useEffect(() => { stageAt.current = Date.now(); }, [stage]);

  // Poll the server every 2 s.
  useEffect(() => {
    let alive = true; let misses = 0;
    const tick = async () => {
      if (!alive || done.current) return;
      try {
        const r = await communicationApi.job(job._id);
        misses = 0;
        if (!alive) return;
        if (r.job.status === 'done' && r.attempt) { done.current = true; setPct(100); setTimeout(() => cbs.current.onDone(r.attempt!), 450); return; }
        if (r.job.status === 'failed') { done.current = true; cbs.current.onFailed(r.job.message || 'Your answer could not be scored. Your take was not used: please record again.'); return; }
        setStage(r.job.stage);
      } catch (e: any) {
        if (e?.response?.status === 404) { done.current = true; cbs.current.onFailed('We lost track of that answer. Your take was not used: please record again.'); return; }
        misses += 1; // a network blip: keep trying quietly
      }
      if (alive && !done.current) setTimeout(tick, misses ? 4000 : 2000);
    };
    const t = setTimeout(tick, 1200);
    return () => { alive = false; clearTimeout(t); };
  }, [job._id]);

  // Smooth movement inside the current stage.
  useEffect(() => {
    const t = setInterval(() => {
      if (done.current) return;
      const s = STAGES.find((x) => x.key === stage) || STAGES[0];
      const sec = (Date.now() - stageAt.current) / 1000;
      const target = s.from + (s.to - s.from) * (1 - Math.exp(-sec / s.tau));
      setPct((p) => Math.max(p, Math.round(target)));
    }, 300);
    return () => clearInterval(t);
  }, [stage]);

  const at = STAGES.findIndex((s) => s.key === stage);
  return <div className="cld-proc" role="status" aria-live="polite">
    <div className="cld-proc-top">
      <span className="cld-proc-ico"><i className="bi bi-stars" /></span>
      <div>
        <h3>Scoring your answer</h3>
        <p>This usually takes under a minute. You can leave this page: your report will be waiting here.</p>
      </div>
      <b className="cld-proc-pct">{pct}%</b>
    </div>
    <div className="cld-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: `${pct}%` }} /></div>
    <ol className="cld-stages">
      <li className="done"><i className="bi bi-check-circle-fill" /> Answer received</li>
      {STAGES.map((s, i) => <li key={s.key} className={pct >= 100 || i < at ? 'done' : i === at ? 'on' : ''}>
        <i className={`bi ${pct >= 100 || i < at ? 'bi-check-circle-fill' : i === at ? 'bi-arrow-repeat cld-spin' : 'bi-circle'}`} /> {s.label}
      </li>)}
    </ol>
  </div>;
};

/** Sub-scores that fit the question asked: "Your project" means nothing on an HR question. */
export const scoresFor = (type: string | undefined, e: any) => {
  const base = [
    { label: 'Confidence', value: e.confidenceScore }, { label: 'Clarity', value: e.clarityScore },
    { label: 'Fluency', value: e.fluencyScore }, { label: 'Grammar', value: e.grammarScore },
    { label: 'Content', value: e.contentScore }, { label: 'Structure', value: e.structureScore },
  ];
  const extra: Record<string, { label: string; value: number }[]> = {
    self_introduction: [{ label: 'Your project', value: e.projectExplanationScore }, { label: 'Career goal', value: e.careerGoalScore }, { label: 'Closing', value: e.closingScore }],
    project_explanation: [{ label: 'Your project', value: e.projectExplanationScore }, { label: 'Technical depth', value: e.technicalScore }],
    technical_explanation: [{ label: 'Technical depth', value: e.technicalScore }],
    presentation: [{ label: 'Vocabulary', value: e.vocabularyScore }, { label: 'Closing', value: e.closingScore }],
    group_discussion: [{ label: 'Vocabulary', value: e.vocabularyScore }],
    hr_questions: [{ label: 'Vocabulary', value: e.vocabularyScore }],
  };
  return [...base, ...(extra[type || ''] || [])];
};

const addDays = (k: string, n: number) => { const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d + n); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };

/** Today against the answer before it: per skill, with plain words for which way is better. */
export const ChangeCard: React.FC<{ a: CommAttempt; history: CommAttempt[] }> = ({ a, history }) => {
  const prev = history.filter((h) => isCounted(h) && h._id !== a._id && (h.practiceDate < a.practiceDate || (h.practiceDate === a.practiceDate && h.createdAt < a.createdAt)))
    .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))[0];
  if (!prev) return <section className="cld-change first">
    <i className="bi bi-flag-fill" />
    <div><b>Your first answer: this is your starting point.</b><span>Answer tomorrow's question and you will see exactly how you have changed.</span></div>
  </section>;
  const e: any = a.evaluation || {}; const p: any = prev.evaluation || {};
  const since = prev.practiceDate === addDays(a.practiceDate, -1) ? 'yesterday' : `your last answer (${longDate(prev.practiceDate)})`;
  const rows = [
    { label: 'Overall score', now: e.overallScore, was: p.overallScore, higher: true },
    { label: 'Confidence', now: e.confidenceScore, was: p.confidenceScore, higher: true },
    { label: 'Clarity', now: e.clarityScore, was: p.clarityScore, higher: true },
    { label: 'Fluency', now: e.fluencyScore, was: p.fluencyScore, higher: true },
    { label: 'Grammar', now: e.grammarScore, was: p.grammarScore, higher: true },
    { label: 'Content', now: e.contentScore, was: p.contentScore, higher: true },
    { label: '"Um" and "uh"', now: e.fillerWords?.total, was: p.fillerWords?.total, higher: false },
  ].filter((r) => typeof r.now === 'number' && typeof r.was === 'number');
  const d = (e.overallScore ?? 0) - (p.overallScore ?? 0);
  const headline = d >= 3 ? `Up ${d} points since ${since}. Well done!` : d <= -3 ? `Down ${-d} points since ${since}. One off day is normal: look at what to improve below.` : `About the same as ${since}. Pick one thing below and work on just that.`;
  return <section className={`cld-change ${d >= 3 ? 'up' : d <= -3 ? 'down' : 'same'}`}>
    <h3><i className={`bi ${d >= 3 ? 'bi-graph-up-arrow' : d <= -3 ? 'bi-graph-down-arrow' : 'bi-dash-circle'}`} /> {headline}</h3>
    <div className="cld-change-grid">
      {rows.map((r) => {
        const delta = r.now - r.was; const better = r.higher ? delta > 0 : delta < 0; const worse = r.higher ? delta < 0 : delta > 0;
        return <div key={r.label} className="cld-chg">
          <span>{r.label}</span>
          <b>{r.now}</b>
          <em className={better ? 'better' : worse ? 'worse' : ''}>{delta === 0 ? 'same' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}`}<small> from {r.was}</small></em>
        </div>;
      })}
    </div>
  </section>;
};

export const DailyReport: React.FC<{ a: CommAttempt; history: CommAttempt[]; onBack: () => void }> = ({ a, history, onBack }) => {
  const e: any = a.evaluation || {};
  const wpm = e.speakingSpeed?.wordsPerMinute ?? a.wordsPerMinute;
  return <div className="cld-report">
    <button className="clx-btn" onClick={onBack}><i className="bi bi-arrow-left" /> Back to today</button>
    <p className="cld-report-q"><span>{longDate(a.practiceDate)}</span>{a.challengeTitle}</p>
    <ChangeCard a={a} history={history} />
    <SpeakingFeedback
      title={a.challengeTitle || 'Your answer'} score={e.overallScore ?? 0} level={e.readinessLevel}
      message={e.dailyCoachMessage} strengths={e.strengths} improve={e.areasToImprove}
      nextFocus={e.nextPracticeFocus} betterAnswer={e.improvedIntroduction}
      fixes={[...(e.grammarCorrections || []), ...(e.sentenceImprovements || [])]}
      measures={[
        { label: 'Words per minute', value: wpm ?? '—', hint: e.speakingSpeed?.recommendedRange ? `Comfortable range: ${e.speakingSpeed.recommendedRange}` : undefined },
        { label: '"Um" and "uh"', value: e.fillerWords?.total ?? '—' },
        { label: 'Length', value: a.recordingDuration ? `${Math.floor(a.recordingDuration / 60)}:${String(Math.round(a.recordingDuration % 60)).padStart(2, '0')}` : '—' },
      ]}
      scores={scoresFor(a.challengeType, e)}
      transcript={e.transcript || a.transcript}
    />
  </div>;
};

const DailyQuestion: React.FC<{
  today: CommToday | null; loading: boolean; history: CommAttempt[]; date: string;
  onChanged: () => void; onViewAll: () => void;
}> = ({ today, loading, history, date, onChanged, onViewAll }) => {
  const [recording, setRecording] = useState(false);
  const [job, setJob] = useState<CommJob | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [report, setReport] = useState<CommAttempt | null>(null);
  const [todayAttempt, setTodayAttempt] = useState<CommAttempt | null>(null);

  // A job already running when the page opened (a reload, or they came back): pick its progress up again.
  useEffect(() => { if (today?.pendingJob && !job) setJob(today.pendingJob); }, [today?.pendingJob]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (today?.lastFailure && !job) setFailure(today.lastFailure); }, [today?.lastFailure]); // eslint-disable-line react-hooks/exhaustive-deps

  // Today's scored answer, for the "done" card.
  useEffect(() => {
    const id = today?.todaysAttemptId;
    if (!id || today?.status !== 'completed') { setTodayAttempt(null); return; }
    let alive = true;
    communicationApi.attempt(id).then((a) => { if (alive) setTodayAttempt(a); }).catch(() => {});
    return () => { alive = false; };
  }, [today?.todaysAttemptId, today?.status]);

  const daily = useMemo(() => history.filter((h) => h.kind !== 'coach'), [history]);
  const days = useMemo(() => groupDays(daily), [daily]);
  const start = journeyStart(days, date);

  const open = async (a: CommAttempt) => {
    setReport(a); // the list row first, then the full one (with the transcript)
    try { setReport(await communicationApi.attempt(a._id)); } catch { /* the row is enough */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (report) return <DailyReport a={report} history={daily} onBack={() => setReport(null)} />;

  const ch = today?.challenge;
  const done = today?.status === 'completed';
  const takes = today?.maxTakes || 1;
  const mins = ch?.targetSeconds ? Math.max(1, Math.round(ch.targetSeconds / 60 * 10) / 10) : null;
  const guide = (ch?.suggestedPoints || []).filter(Boolean);

  let body: React.ReactNode;
  if (loading && !today) body = <div className="clh-skel">Loading today's question…</div>;
  else if (job) body = <ProcessingPanel job={job}
    onDone={(a) => { setJob(null); setFailure(null); setTodayAttempt(a); setReport(a); onChanged(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
    onFailed={(m) => { setJob(null); setFailure(m); onChanged(); }} />;
  else if (!ch && today?.locked) body = <div className="cld-state">
    <span className="clh-bubble"><i className="bi bi-clock-history" /></span>
    <h3>{today.window?.status === 'upcoming' ? 'Today\'s question is not open yet' : 'Today\'s question has closed'}</h3>
    <p>{today.message}</p>
  </div>;
  else if (!ch) body = <div className="cld-state">
    <span className="clh-bubble"><i className="bi bi-calendar2-x" /></span>
    <h3>No speaking question today</h3>
    <p>Your trainer has not set a question for today. Come back tomorrow for the next one.</p>
  </div>;
  else if (done) body = <div className="cld-done">
    <div className={`cld-done-score ${scoreTone(todayAttempt?.evaluation?.overallScore ?? 0)}`}>
      <b>{todayAttempt?.evaluation?.overallScore ?? '…'}</b><span>out of 100</span>
    </div>
    <div className="cld-done-copy">
      <span className="clh-qlabel"><i className="bi bi-check-circle-fill" /> TODAY'S QUESTION IS DONE</span>
      <h3>{ch.title}</h3>
      <p>{todayAttempt?.evaluation?.dailyCoachMessage || 'Your answer has been scored. Open the report to see what went well and what to work on.'}</p>
      <div className="cld-done-actions">
        <button className="clh-start" disabled={!todayAttempt} onClick={() => todayAttempt && open(todayAttempt)}><i className="bi bi-file-earmark-bar-graph" /> View my report <i className="bi bi-chevron-right" /></button>
      </div>
      <p className="cld-next"><i className="bi bi-calendar-check" /> Your next question opens tomorrow.</p>
    </div>
  </div>;
  else body = <div className="clh-today-body">
    <div className="clh-question">
      <span className="clh-bubble"><i className="bi bi-chat-dots-fill" /></span>
      <span className="clh-qlabel">TODAY'S QUESTION</span>
      <h3>{ch.title}</h3>
      {ch.description && <p className="clh-hint">{ch.description}</p>}
      {failure && <div className="cld-fail" role="alert"><i className="bi bi-exclamation-triangle-fill" /><span>{failure}</span></div>}
      <button className="clh-start" onClick={() => { setFailure(null); setRecording(true); }}>
        <i className="bi bi-mic-fill" /> Start Speaking <i className="bi bi-chevron-right" />
      </button>
      <ul className="clh-chips">
        <li><i className="bi bi-1-circle" /> {takes === 1 ? 'One take' : `${takes} takes`}</li>
        {mins && <li><i className="bi bi-clock" /> About {mins} min</li>}
        <li><i className="bi bi-stars" /> AI report in about a minute</li>
      </ul>
    </div>
    <aside className="clh-howto">
      <h4><i className="bi bi-lightbulb" /> How to answer</h4>
      <ol>
        {(guide.length ? guide : ['Take a breath and start with a calm opening line', 'Answer the question directly first', 'Give one real example from your work or project', 'Finish with a short, confident close']).map((g, i) => <li key={i}><span className="no">{i + 1}</span><span className="tx">{g}</span></li>)}
      </ol>
      {ch.instructions && <p className="cld-instr">{ch.instructions}</p>}
      {ch.minSeconds ? <p className="cld-instr"><i className="bi bi-stopwatch" /> Speak for at least {ch.minSeconds} seconds{ch.maxSeconds ? `, up to ${Math.round(ch.maxSeconds / 60 * 10) / 10} min` : ''}.</p> : null}
    </aside>
  </div>;

  return <div className="clh">
    <div className="clh-main">
      <section className="clh-card clh-today">
        <div className="clh-card-head">
          <span className="clh-ico"><i className="bi bi-calendar-event" /></span>
          <div>
            <h2>Today's Question</h2>
            <p>{longDate(date)}{today?.dayNumber ? <> &nbsp;•&nbsp; Day {today.dayNumber}</> : null}</p>
          </div>
          {today?.window?.endTime && !done && <span className="clh-badge">Open till {today.window.endTime}</span>}
        </div>
        {body}
      </section>
    </div>
    <div className="clh-rail">
      <ImprovementCard days={days} />
      <RecentDays days={days} start={start} onOpen={open} onAll={onViewAll} byQuestion />
    </div>
    {recording && ch && <Recorder today={{ date, challenge: ch }} maxTakes={takes} onDone={() => {}}
      onSent={(j) => { setRecording(false); setFailure(null); setJob(j); }}
      onClose={() => setRecording(false)} />}
  </div>;
};

export default DailyQuestion;
