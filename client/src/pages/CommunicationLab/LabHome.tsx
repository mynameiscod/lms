import React, { useEffect, useMemo, useState } from 'react';
import type { CommAttempt } from '../../api/communicationApi';
import type { CoachState, CoachStep } from './CoachTab';
import './labHome.css';

/**
 * The student's landing screen for the Communication Lab: today's question, how they are improving, their recent
 * days and the 30-day journey. Everything here is read from what the server already returns (the coach state and the
 * attempt history); nothing is invented, so an empty account simply shows empty states.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const dayDiff = (a: string, b: string) => Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
const addDays = (k: string, n: number) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const shortDate = (k: string) => parseKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const longDate = (k: string) => parseKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** A coach recording where nothing was heard does not count (the same rule the History tab uses). */
export const isCounted = (a: CommAttempt) => {
  if (!a.evaluation) return false;
  if (a.kind === 'coach') {
    const dur = a.recordingDuration || 0;
    if (dur < 5 || (dur >= 15 && (a.wordCount ?? 0) <= 5)) return false;
  }
  return typeof a.evaluation.overallScore === 'number';
};

export const scoreTone = (s: number) => (s >= 75 ? 'good' : s >= 55 ? 'mid' : 'low');

export interface DayRow { date: string; score: number; attempt: CommAttempt; count: number }

/** One row per calendar day: the day's average score, and the best attempt of that day to open. */
export const groupDays = (history: CommAttempt[]): DayRow[] => {
  const by = new Map<string, CommAttempt[]>();
  history.filter(isCounted).forEach((a) => by.set(a.practiceDate, [...(by.get(a.practiceDate) || []), a]));
  return Array.from(by.entries()).map(([date, list]) => {
    const scores = list.map((a) => a.evaluation!.overallScore as number);
    const best = list.reduce((x, y) => ((y.evaluation!.overallScore as number) > (x.evaluation!.overallScore as number) ? y : x));
    return { date, score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length), attempt: best, count: list.length };
  }).sort((a, b) => (a.date < b.date ? -1 : 1));
};

/** When the student's 30 days began: their first recording, or today if they have none yet. */
export const journeyStart = (days: DayRow[], today: string) => (days.length ? days[0].date : today);

const FALLBACK_GUIDE = [
  'Start with a calm one-line opening',
  'Say your main point clearly',
  'Support it with one real example',
  'Link it to the role you want',
  'Finish with a short, confident close',
];

const TodayCard: React.FC<{
  state: CoachState | null; loading: boolean; today: string; dayNo: number; onStart: (s: CoachStep) => void;
}> = ({ state, loading, today, dayNo, onStart }) => {
  const firstOpen = state?.steps.find((s) => !s.done);
  const [pick, setPick] = useState<number | null>(null);
  // If the picked step has since been recorded, fall back to the next open one.
  const step = (pick != null ? state?.steps.find((s) => s.index === pick && !s.done) : undefined) || firstOpen;
  const baseline = state?.mode === 'baseline';

  if (loading && !state) return <section className="clh-card clh-today"><div className="clh-skel">Loading today's practice…</div></section>;
  if (!state) return <section className="clh-card clh-today"><div className="clh-skel">Today's practice is not available right now. Please try again in a moment.</div></section>;

  const guide = step?.prompt.guide?.length ? step.prompt.guide : FALLBACK_GUIDE;
  const allDone = !step && !state.tooMany;
  const label = (s: CoachStep) => (baseline ? s.areaLabel : s.role);

  return <section className="clh-card clh-today">
    <div className="clh-card-head">
      <span className="clh-ico"><i className="bi bi-calendar-event" /></span>
      <div>
        <h2>Today's Practice</h2>
        <p>{longDate(today)} &nbsp;•&nbsp; Day {dayNo}{dayNo <= 30 ? ' of 30' : ''}</p>
      </div>
      <span className="clh-badge">{baseline ? 'Starting point' : `Level ${state.level} · ${state.levelName}`}</span>
    </div>

    <div className="clh-steps" role="tablist" aria-label="Today's questions">
      {state.steps.map((s, i) => <button
        key={s.index} role="tab" aria-selected={step?.index === s.index}
        className={`clh-step ${step?.index === s.index ? 'on' : ''} ${s.done ? 'done' : ''}`}
        disabled={s.done || state.tooMany} onClick={() => setPick(s.index)}
      >
        <span className="n">{s.done ? <i className="bi bi-check-lg" /> : i + 1}</span>{label(s)}
      </button>)}
      <span className="clh-steps-count">{state.stepsDone} of {state.totalSteps} done today</span>
    </div>

    {baseline && <p className="clh-baseline"><b>Step 1 · Find your starting point.</b> Answer each question as you would in a real interview. Do not worry about the result: this only measures where you start, so your progress can be shown. About 10 minutes.</p>}

    <div className="clh-today-body">
      <div className="clh-question">
        {allDone ? <>
          <span className="clh-bubble ok"><i className="bi bi-check2-circle" /></span>
          <span className="clh-qlabel">TODAY'S SESSION</span>
          <h3>All done for today. Well done!</h3>
          <p className="clh-hint">Your streak is safe. Come back tomorrow for a fresh set of questions.</p>
        </> : state.tooMany ? <>
          <span className="clh-bubble"><i className="bi bi-hourglass-split" /></span>
          <span className="clh-qlabel">DAILY LIMIT REACHED</span>
          <h3>You have practised plenty today.</h3>
          <p className="clh-hint">Rest your voice and come back tomorrow.</p>
        </> : step && <>
          <span className="clh-bubble"><i className="bi bi-chat-dots-fill" /></span>
          <span className="clh-qlabel">TODAY'S QUESTION</span>
          <h3>{step.prompt.ask}</h3>
          {step.prompt.followUp && <p className="clh-follow">Then answer straight away: “{step.prompt.followUp}”</p>}
          <button className="clh-start" onClick={() => onStart(step)}>
            <i className="bi bi-mic-fill" /> Start Speaking <i className="bi bi-chevron-right" />
          </button>
          <ul className="clh-chips">
            <li><i className="bi bi-clock" /> About {Math.max(1, Math.round(step.prompt.targetSec / 60 * 10) / 10)} min</li>
            <li><i className="bi bi-card-checklist" /> Instant AI feedback</li>
            <li><i className="bi bi-lightbulb" /> Improve step by step</li>
          </ul>
        </>}
      </div>

      <aside className="clh-howto">
        <h4><i className="bi bi-lightbulb" /> How to Answer <span>(Step by Step)</span></h4>
        <ol>
          {guide.map((g, i) => <li key={i}><span className="no">{i + 1}</span><span className="tx">{g}</span></li>)}
        </ol>
        {step?.prompt.script && <details className="clh-script"><summary>Read a sample answer aloud</summary><p>{step.prompt.script}</p></details>}
      </aside>
    </div>
  </section>;
};

const ImprovementCard: React.FC<{ days: DayRow[] }> = ({ days }) => {
  const pts = days.slice(-14);
  const W = 520; const H = 210; const L = 44; const R = 18; const T = 16; const B = 34;
  const x = (i: number) => (pts.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + ((100 - v) / 100) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const area = pts.length > 1 ? `${line} L${x(pts.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : '';
  const first = pts[0]?.score; const last = pts[pts.length - 1]?.score;
  const delta = pts.length > 1 ? last - first : 0;
  const msg = pts.length < 2
    ? { t: 'Your graph starts here', d: 'Practise on two different days and your improvement line will appear.', tone: 'info' }
    : delta >= 3
      ? { t: 'Great progress!', d: `Your score is up ${delta} points since you started. Keep going, day by day.`, tone: 'good' }
      : delta <= -3
        ? { t: 'A dip is normal', d: 'Scores move up and down early on. Re-read the answer steps and try again tomorrow.', tone: 'mid' }
        : { t: 'Holding steady', d: 'Your scores are steady. Pick one thing from the feedback and work on just that.', tone: 'mid' };
  return <section className="clh-card clh-side">
    <div className="clh-card-head tight">
      <span className="clh-ico soft"><i className="bi bi-graph-up-arrow" /></span>
      <h2>Your Improvement</h2>
      <span className="clh-pill-note">Score</span>
    </div>
    {pts.length ? <div className="clh-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your score by day">
        <defs><linearGradient id="clhArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1976d2" stopOpacity=".28" /><stop offset="100%" stopColor="#1976d2" stopOpacity=".02" /></linearGradient></defs>
        {[0, 25, 50, 75, 100].map((g) => <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="grid" />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" className="axis">{g}%</text>
        </g>)}
        {area && <path d={area} fill="url(#clhArea)" />}
        {pts.length > 1 && <path d={line} className="ln" />}
        {pts.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.score)} r={i === pts.length - 1 ? 5.5 : 4} className={i === pts.length - 1 ? 'dot last' : 'dot'}><title>{`${shortDate(p.date)}: ${p.score}`}</title></circle>)}
        {pts.length > 1 && <g><rect x={Math.min(x(pts.length - 1) - 22, W - 52)} y={y(last) - 30} width="44" height="20" rx="10" className="tag" /><text x={Math.min(x(pts.length - 1), W - 30)} y={y(last) - 16} textAnchor="middle" className="tagtx">{last}%</text></g>}
        {pts.map((p, i) => (pts.length <= 7 || i % 2 === pts.length % 2 || i === pts.length - 1) ? <text key={`l${p.date}`} x={x(i)} y={H - 10} textAnchor="middle" className="axis">{shortDate(p.date)}</text> : null)}
      </svg>
    </div> : <div className="clh-empty-sm"><i className="bi bi-graph-up" /><p>Your score graph appears after your first recording.</p></div>}
    <div className={`clh-note ${msg.tone}`}>
      <i className={`bi ${msg.tone === 'good' ? 'bi-trophy-fill' : 'bi-info-circle-fill'}`} />
      <div><b>{msg.t}</b><span>{msg.d}</span></div>
    </div>
  </section>;
};

const RecentDays: React.FC<{ days: DayRow[]; start: string; onOpen: (a: CommAttempt) => void; onAll: () => void }> = ({ days, start, onOpen, onAll }) => {
  const rows = days.slice(-6).reverse();
  return <section className="clh-card clh-side">
    <div className="clh-card-head tight">
      <span className="clh-ico soft"><i className="bi bi-calendar-check" /></span>
      <h2>Recent Practice Days</h2>
      <button className="clh-link" onClick={onAll}>View all</button>
    </div>
    {rows.length ? <ul className="clh-days">
      {rows.map((r) => <li key={r.date}>
        <button onClick={() => onOpen(r.attempt)}>
          <span className="tick"><i className="bi bi-check-lg" /></span>
          <b>Day {dayDiff(start, r.date) + 1}</b>
          <span className="dt">{longDate(r.date)}</span>
          <span className={`sc ${scoreTone(r.score)}`}>{r.score}%</span>
          <i className="bi bi-chevron-right chev" />
        </button>
      </li>)}
    </ul> : <div className="clh-empty-sm"><i className="bi bi-mic" /><p>Your practice days will be listed here.</p></div>}
  </section>;
};

/**
 * A DAY IS DONE WHEN ITS STEPS ARE DONE. One answer used to tick a day green; now the tick means the
 * day's session is finished (all its steps). Today reads the live session; earlier days count the
 * answers recorded that day. A day with some answers but not all is "partly done".
 */
const Journey: React.FC<{ days: DayRow[]; start: string; today: string; stepsPerDay: number; todayComplete: boolean }> = ({ days, start, today, stepsPerDay, todayComplete }) => {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const done = useMemo(() => new Set(days.filter((d) => d.date === today ? todayComplete : d.count >= stepsPerDay).map((d) => d.date).concat(todayComplete ? [today] : [])), [days, today, todayComplete, stepsPerDay]);
  const dayNo = dayDiff(start, today) + 1;
  const first = dayNo > 30 ? addDays(today, -29) : start;
  const cells = Array.from({ length: 30 }, (_, i) => { const date = addDays(first, i); return { date, no: dayDiff(start, date) + 1 }; });
  return <section className="clh-card clh-journey">
    <div className="clh-card-head tight">
      <h2>Your 30-Day Journey</h2>
      <span className="clh-pill-note">{done.size} day{done.size === 1 ? '' : 's'} completed</span>
    </div>
    <ol className="clh-track">
      {cells.map((c) => {
        const isToday = c.date === today; const isDone = done.has(c.date); const past = c.date < today;
        const partly = !isDone && !!byDate.get(c.date);
        const cls = isDone ? 'done' : isToday ? 'today' : partly ? 'partly' : past ? 'missed' : 'future';
        return <li key={c.date} className={cls} title={`${longDate(c.date)}${isDone ? ' · completed' : partly ? ' · partly done' : past ? ' · missed' : ''}`}>
          <span className="c">{isDone ? <i className="bi bi-check-lg" /> : c.no}</span>
          <em>{isToday ? 'Today' : `Day ${c.no}`}</em>
        </li>;
      })}
    </ol>
  </section>;
};

const LabHome: React.FC<{
  state: CoachState | null; loading: boolean; history: CommAttempt[]; today: string;
  onStart: (s: CoachStep) => void; onOpenAttempt: (a: CommAttempt) => void; onViewAll: () => void;
}> = ({ state, loading, history, today, onStart, onOpenAttempt, onViewAll }) => {
  const days = useMemo(() => groupDays(history), [history]);
  const start = journeyStart(days, today);
  const dayNo = Math.max(1, dayDiff(start, today) + 1);
  const [, force] = useState(0);
  // The date can roll over while the page stays open overnight.
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 10 * 60 * 1000); return () => clearInterval(t); }, []);
  return <div className="clh">
    <div className="clh-main">
      <TodayCard state={state} loading={loading} today={today} dayNo={dayNo} onStart={onStart} />
      <Journey days={days} start={start} today={today}
               stepsPerDay={Math.max(1, state?.totalSteps || 4)}
               todayComplete={!!state && state.totalSteps > 0 && state.stepsDone >= state.totalSteps} />
    </div>
    <div className="clh-rail">
      <ImprovementCard days={days} />
      <RecentDays days={days} start={start} onOpen={onOpenAttempt} onAll={onViewAll} />
    </div>
  </div>;
};

export default LabHome;
