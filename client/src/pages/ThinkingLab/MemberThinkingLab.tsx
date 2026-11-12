import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { memberLabApi, TQQuestion, TQReward, TQToday, TQType, TL_LANGS, TL_TEMPLATES } from '../../api/thinkingLabApi';
import { useMember } from '../Passport/MemberLayout';
import SectionLock from '../Passport/SectionLock';
import '../ProblemBank/ProblemBank.css';
import '../CodingPractice/practiceLibrary.css';
import '../CodingPractice/practiceHub.css';
import './memberThinkingLab.css';

/**
 * CareerPilot → Thinking Lab, for members.
 *
 * The day's questions from the shared bank (math puzzles, logical and critical thinking, and coding from
 * Year 2 once the basics are done). A member gives a final answer AND explains their thinking; half the
 * day's XP is for the answer and half for the reasoning, checked against the question's key steps. One
 * question a day pays; the rest is practice. The answer and model reasoning appear once a question is
 * finished (right, or out of attempts).
 */

const TYPE: Record<TQType, { label: string; icon: string }> = {
  math: { label: 'Math puzzle', icon: 'bi-calculator' },
  logical: { label: 'Logical thinking', icon: 'bi-puzzle' },
  critical: { label: 'Critical thinking', icon: 'bi-lightbulb' },
  coding: { label: 'Coding', icon: 'bi-code-slash' },
};
const SHORT: Record<TQType, string> = { math: 'Math', logical: 'Logical', critical: 'Critical', coding: 'Coding' };
const STEP_ICON = { covered: 'bi-check-circle-fill', partial: 'bi-dash-circle-fill', missing: 'bi-x-circle' } as const;
const STEP_LABEL = { covered: 'Covered', partial: 'Partly', missing: 'Missing' } as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const MIN_WORDS = 8;
/** A coding question's logic must be this long before the code editor opens. */
const LOGIC_MIN_WORDS = 20;
const errOf = (e: any, d: string) => e?.response?.data?.message || d;

type Tab = 'today' | 'practice' | 'history';
type HistoryRow = Awaited<ReturnType<typeof memberLabApi.history>>['items'][number];
const cap = (d: string) => (d ? d[0].toUpperCase() + d.slice(1) : '');

const MemberThinkingLab: React.FC = () => {
  const { data: member } = useMember();
  const locked = (member?.locked || []).some((l: any) => l.section === 'thinkingLab');
  const [day, setDay] = useState<TQToday | null>(null);
  const [err, setErr] = useState('');
  const [blocked, setBlocked] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [review, setReview] = useState<TQQuestion | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [diff, setDiff] = useState('');

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 5000); };
  const load = useCallback(() => memberLabApi.today()
    .then((d) => { setDay(d); setErr(''); })
    .catch((e) => { if (e?.response?.data?.reason === 'trial_limit') setBlocked(errOf(e, '')); else setErr(errOf(e, 'Could not load today’s questions.')); }), []);
  const loadHistory = useCallback(() => memberLabApi.history().then((r) => setHistory(r.items)).catch(() => setHistory([])), []);
  useEffect(() => { if (!locked) { load(); loadHistory(); } }, [load, loadHistory, locked]);

  const all = useMemo(() => [...(day?.items || []), ...(day?.practice || [])], [day]);
  const open = review || all.find((x) => x.id === openId) || null;
  const setDone = !!day && day.items.length > 0 && day.items.every((x) => x.state === 'solved' || x.state === 'finished');
  const nextUp = day?.items.find((x) => x.state === 'new' || x.state === 'trying') || null;

  const replace = (x: TQQuestion) => setDay((d) => d && ({ ...d,
    items: d.items.map((y) => (y.id === x.id ? x : y)), practice: d.practice.map((y) => (y.id === x.id ? x : y)),
    done: d.items.map((y) => (y.id === x.id ? x : y)).filter((y) => y.state === 'solved' || y.state === 'finished').length }));

  const onReward = (r: TQReward | null) => {
    loadHistory();
    if (!r) return;
    const bits = [r.xpNow ? `+${r.xpNow} XP` : r.alreadyPaid ? 'Today’s XP was already earned' : '', `Lab streak ${r.labStreak.current} day${r.labStreak.current === 1 ? '' : 's'}`];
    if (r.labStreak.usedFreezes) bits.push(`${r.labStreak.usedFreezes} freeze${r.labStreak.usedFreezes === 1 ? '' : 's'} saved your streak`);
    if (r.labStreak.earnedFreeze) bits.push('you earned a streak freeze');
    if (r.streakBonus) bits.push(`+${r.streakBonus} XP streak bonus`);
    flash(bits.filter(Boolean).join(' · '));
    memberLabApi.today().then(setDay).catch(() => { /* the screen already shows the result */ });
  };

  // Practise More follows the super admin's limit: one at a time, up to practiceLimit a day (0 = off).
  const practiceLimit = day?.practiceLimit ?? 0;
  const practiceUsed = day?.practiceUsed ?? (day?.practice.length || 0);
  const practiceLeft = Math.max(0, practiceLimit - practiceUsed);
  const openPractice = day?.practiceOpen ? day.practice[day.practice.length - 1] : undefined;
  const canPractice = !!day && setDone && !busy && !day.demo && practiceLeft > 0 && !openPractice;
  const practiceWhy = !day ? '' : day.demo ? 'Practice is not part of this demo.'
    : !setDone ? 'Opens once today’s questions are done'
      : practiceLimit <= 0 ? 'Practise More is not open for your year.'
        : openPractice ? 'Finish your practice question first.'
          : practiceLeft <= 0 ? `That is ${practiceLimit} practice question${practiceLimit === 1 ? '' : 's'} today. Come back tomorrow.` : '';

  const practice = async (t?: TQType) => {
    setBusy(true);
    try {
      const d = await memberLabApi.practice(t);
      setDay((x) => (x ? { ...d, summary: x.summary, calendar: x.calendar } : x));
      setTab('practice');
      setOpenId(d.practice[d.practice.length - 1]?.id || null);
    } catch (e) { flash(errOf(e, 'Could not add a practice question.')); }
    setBusy(false);
  };
  const openReview = async (id: string) => {
    const inDay = all.find((x) => x.id === id);
    if (inDay) { setOpenId(id); return; }
    try { setReview((await memberLabApi.review(id)).question); } catch (e) { flash(errOf(e, 'Could not open that question.')); }
  };
  const close = () => { setOpenId(null); setReview(null); };

  if (locked) return <SectionLock section="thinkingLab" />;
  if (blocked || err || !day) {
    return (
      <div className="pl pl2x plh tl3">
        <section className="pl-card pl-panel plh-panel tl3-state">
          {blocked ? <><i className="bi bi-hourglass-split" /><h2>Your trial’s Thinking Lab questions are used</h2><p>{blocked}</p></>
            : err ? <><i className="bi bi-exclamation-circle" /><h2>Could not load the Thinking Lab</h2><p>{err}</p><button className="plh-btn primary" onClick={() => { setErr(''); load(); }}>Try again</button></>
              : <><span className="tl2-spin" /> Loading today’s questions…</>}
        </section>
      </div>
    );
  }

  const s = day.summary;
  const counts: Record<Tab, number> = { today: day.items.length, practice: day.practice.length, history: history?.length ?? 0 };
  const match = (x: { title: string; type: string; difficulty: string; subCategory?: string }) =>
    (!type || x.type === type) && (!diff || x.difficulty === diff)
    && (!q.trim() || `${x.title} ${x.subCategory || ''} ${TYPE[x.type as TQType]?.label || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const list = tab === 'today' ? day.items.filter(match) : tab === 'practice' ? day.practice.filter(match) : [];
  const hist = tab === 'history' ? (history || []).filter((h) => match({ ...h, subCategory: '' })) : [];
  const shown = tab === 'history' ? hist.length : list.length;
  const filtered = !!(q.trim() || type || diff);

  return (
    <div className="pl pl2x plh tl3">
      <section className="plh-top">
        <div className="plh-copy">
          <span className="plh-eyebrow">Thinking Lab</span>
          <h1>Think First, Then <span>Answer</span></h1>
          <p>{day.perDay === 1 ? 'One question a day' : `${day.perDay} questions a day`}: give your answer and explain how you got there. Half the XP is for the answer, half for your reasoning.</p>
        </div>
        <div className="plh-bar">
          <div className="plh-actions">
            <button type="button" className="plh-btn primary" disabled={!nextUp && !openPractice && !canPractice} title={nextUp || openPractice ? '' : practiceWhy}
              onClick={() => (nextUp ? (setTab('today'), setOpenId(nextUp.id)) : openPractice ? (setTab('practice'), setOpenId(openPractice.id)) : practice())}>
              <i className={`bi ${nextUp || openPractice ? 'bi-play-fill' : 'bi-plus-lg'}`} aria-hidden /> {nextUp ? (nextUp.state === 'trying' ? 'Continue Today’s Question' : 'Start Today’s Question') : openPractice ? 'Continue Practice Question' : 'Practise More'}
            </button>
            <button type="button" className="plh-btn" disabled={!setDone || busy || day.demo} title={setDone ? '' : 'Opens once today’s questions are done'} onClick={() => setTab('practice')}>
              <i className="bi bi-collection" aria-hidden /> Practice Questions
            </button>
          </div>
          <div className="plh-stats">
            <div className="plh-stat" title={s.streakAtRisk ? 'Answer today to keep your streak' : 'Days in a row'}><i className={`bi bi-fire ic tl3-fire${s.streakAtRisk ? ' risk' : ''}`} aria-hidden /><span><b>{s.streak}</b><small>{s.streakAtRisk ? 'Streak · answer today' : 'Day streak'}</small></span></div>
            <div className="plh-stat"><i className="fa-regular fa-circle-check ic green" aria-hidden /><span><b>{s.solvedTotal}</b><small>Solved</small></span></div>
            <div className="plh-stat" title={s.freezeEvery ? `One freeze for every ${s.freezeEvery} days in a row, up to ${s.freezeMax}` : 'Freezes are off'}><i className="bi bi-snow2 ic tl3-ice" aria-hidden /><span><b>{s.freezes}<em>/{s.freezeMax}</em></b><small>Freezes</small></span></div>
          </div>
        </div>
        <p className="plh-next">
          {nextUp ? <>
            <span>{nextUp.state === 'trying' ? 'Continue' : 'Today’s question'}</span>
            <button type="button" onClick={() => { setTab('today'); setOpenId(nextUp.id); }}>{nextUp.title}</button>
            <em className={`pl-diff ${nextUp.difficulty}`}>{cap(nextUp.difficulty)}</em>
            {!s.paidToday && s.dayXp > 0 && <em className="tl3-xp"><i className="bi bi-lightning-charge-fill" aria-hidden /> up to {s.dayXp} XP</em>}
          </> : <>
            <span>{s.paidToday ? 'Done for today' : 'Today'}</span>
            <b className="tl3-done">{s.paidToday ? `+${s.paidToday} XP earned · come back tomorrow` : day.bankEmpty ? 'New questions are being added' : 'All of today’s questions are finished'}</b>
          </>}
          <CodingBadge c={day.coding} stage={day.stage} />
        </p>
      </section>

      {toast && <div className="tl3-toast" role="status"><i className="bi bi-stars" aria-hidden /> {toast}</div>}

      {open ? (
        <Solve key={open.id} q={open} practice={!!review ? false : day.practice.some((p) => p.id === open.id)} demo={day.demo} readOnly={!!review}
          onBack={close} onUpdate={(x, r) => { replace(x); onReward(r); }}
          onNext={() => { const n = day.items.find((x) => x.id !== open.id && (x.state === 'new' || x.state === 'trying')); if (n) { setReview(null); setOpenId(n.id); } else close(); }}
          hasNext={!review && day.items.some((x) => x.id !== open.id && (x.state === 'new' || x.state === 'trying'))} />
      ) : (
        <section className="pl-card pl-panel plh-panel">
          <div className="pl-tabs">
            {([['today', 'Today', 'bi-calendar-check'], ['practice', 'Practice', 'bi-collection'], ['history', 'History', 'bi-clock-history']] as [Tab, string, string][]).map(([k, l, ic]) => (
              <button key={k} className={`pl-tab${tab === k ? ' on' : ''}`} aria-pressed={tab === k} onClick={() => setTab(k)}>
                <i className={`bi ${ic}`} aria-hidden /> {l} ({counts[k]})
              </button>
            ))}
            <span className="grow" />
            <button className="pl-btn plh-random" disabled={!canPractice} title={canPractice ? 'Add another question for practice' : practiceWhy} onClick={() => practice()}>
              <i className="bi bi-shuffle" aria-hidden /> Practise More{practiceLimit > 0 && !day.demo ? ` (${practiceLeft} left)` : ''}
            </button>
          </div>

          <div className="pl-filters">
            <div className="pl-search"><i className="fa-solid fa-magnifying-glass" />
              <input placeholder="Search by title or kind of question…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search questions" /></div>
            <label className="pl-field">Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All</option>
                {(Object.keys(TYPE) as TQType[]).filter((t) => t !== 'coding' || day.coding.open).map((t) => <option key={t} value={t}>{TYPE[t].label}</option>)}
              </select></label>
            <label className="pl-field">Difficulty
              <select value={diff} onChange={(e) => setDiff(e.target.value)}>
                <option value="">All</option>{['easy', 'medium', 'hard'].map((d) => <option key={d} value={d}>{cap(d)}</option>)}
              </select></label>
            <button className="pl-btn" disabled={!filtered} onClick={() => { setQ(''); setType(''); setDiff(''); }}><i className="fa-solid fa-rotate-left" aria-hidden /> Reset</button>
          </div>

          <div className="pl-meta">
            <span>{shown ? `Showing ${shown} question${shown === 1 ? '' : 's'}` : 'No questions'}</span>
            <span className="tl3-meta-r">{tab === 'today' ? `${day.done} of ${day.items.length || day.perDay} done today` : tab === 'practice' ? `Practice earns no XP${practiceLimit > 0 && !day.demo ? ` · ${practiceUsed} of ${practiceLimit} today` : ''}` : `${(history || []).filter((h) => h.correct).length} solved`}</span>
          </div>

          {tab === 'history' && <Calendar days={day.calendar} best={s.longestStreak} />}

          {tab !== 'history' && !list.length && (
            <div className="pl-empty">
              {filtered ? <><h3>No questions match</h3><p>Try removing a filter.</p></>
                : tab === 'today' ? <><h3>{day.bankEmpty ? 'No new questions for you right now' : 'Nothing today'}</h3><p>{day.bankEmpty ? 'You have answered everything we have for your year. New questions are added regularly.' : 'Come back tomorrow.'}</p></>
                  : <><h3>No practice questions yet</h3><p>{!setDone ? `Finish today’s questions first${practiceLimit > 0 ? `, then practise up to ${practiceLimit} more` : ''}.` : canPractice ? 'Pick a kind of question to practise. Practice earns no XP.' : practiceWhy}</p>
                    {canPractice && <div className="tl3-pick">{(Object.keys(TYPE) as TQType[]).filter((t) => t !== 'coding' || day.coding.open).map((t) => (
                      <button key={t} className="plh-btn" disabled={busy} onClick={() => practice(t)}><i className={`bi ${TYPE[t].icon}`} aria-hidden /> {SHORT[t]}</button>
                    ))}</div>}</>}
            </div>
          )}
          {tab === 'history' && !hist.length && <div className="pl-empty"><h3>{filtered ? 'No questions match' : 'Nothing finished yet'}</h3><p>{filtered ? 'Try removing a filter.' : 'Questions you finish appear here, so you can read the model answer again.'}</p></div>}

          {!!list.length && (
            <div className="plh-table tl3-table" role="table" aria-label="Questions">
              <div className="plh-row plh-thead" role="row">
                <span role="columnheader" className="c-st" aria-label="Status" />
                <span role="columnheader" className="c-title">Question</span>
                <span role="columnheader" className="c-topic">Type</span>
                <span role="columnheader" className="c-att">Tries</span>
                <span role="columnheader" className="c-acc">Score</span>
                <span role="columnheader" className="c-diff">Difficulty</span>
                <span role="columnheader" className="c-act">Action</span>
              </div>
              {list.map((x) => {
                const done = x.state === 'solved' || x.state === 'finished';
                return (
                  <div key={x.id} className={`plh-row s-${x.state === 'solved' ? 'solved' : x.state === 'new' ? 'todo' : 'attempted'}`} role="row" tabIndex={0} onClick={() => setOpenId(x.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(x.id); }}>
                    <span role="cell" className="c-st" title={x.state === 'solved' ? 'Solved' : x.state === 'finished' ? 'Finished' : x.state === 'trying' ? 'In progress' : 'Not started'}>
                      {x.state === 'solved' ? <i className="fa-solid fa-circle-check" aria-label="Solved" /> : x.state === 'new' ? <i className="fa-regular fa-circle" aria-label="Not started" /> : <i className="fa-solid fa-circle-half-stroke" aria-label={done ? 'Finished' : 'In progress'} />}
                    </span>
                    <span role="cell" className="c-title"><b>{x.title}</b><small>{[x.subCategory, x.estimatedMinutes ? `~${x.estimatedMinutes} min` : '', x.xpEarned ? `+${x.xpEarned} XP` : ''].filter(Boolean).join(' · ')}</small></span>
                    <span role="cell" className="c-topic"><span className={`plh-topic tl3-type ${x.type}`}><i className={`bi ${TYPE[x.type].icon}`} aria-hidden /> {SHORT[x.type]}</span></span>
                    <span role="cell" className="c-att">{x.attemptsUsed ? `${x.attemptsUsed} of ${x.attemptsAllowed}` : '—'}</span>
                    <span role="cell" className="c-acc">{x.attemptsUsed ? `${Math.round(x.bestShare * 100)}%` : '—'}</span>
                    <span role="cell" className="c-diff"><span className={`pl-diff ${x.difficulty}`}>{cap(x.difficulty)}</span></span>
                    <span role="cell" className="c-act">
                      <button type="button" className={`plh-solve${done ? ' done' : ''}`} onClick={(e) => { e.stopPropagation(); setOpenId(x.id); }}>
                        {done ? 'Review' : x.state === 'trying' ? <>Continue <i className="fa-solid fa-arrow-right" aria-hidden /></> : <>Solve <i className="fa-solid fa-arrow-right" aria-hidden /></>}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {!!hist.length && (
            <div className="plh-table tl3-table" role="table" aria-label="Finished questions">
              <div className="plh-row plh-thead" role="row">
                <span role="columnheader" className="c-st" aria-label="Result" />
                <span role="columnheader" className="c-title">Question</span>
                <span role="columnheader" className="c-topic">Type</span>
                <span role="columnheader" className="c-att">Date</span>
                <span role="columnheader" className="c-acc">Score</span>
                <span role="columnheader" className="c-diff">Difficulty</span>
                <span role="columnheader" className="c-act">Action</span>
              </div>
              {hist.map((h) => (
                <div key={h.id} className={`plh-row s-${h.correct ? 'solved' : 'attempted'}`} role="row" tabIndex={0} onClick={() => openReview(h.id)} onKeyDown={(e) => { if (e.key === 'Enter') openReview(h.id); }}>
                  <span role="cell" className="c-st" title={h.correct ? 'Solved' : 'Finished'}>{h.correct ? <i className="fa-solid fa-circle-check" aria-label="Solved" /> : <i className="fa-solid fa-circle-half-stroke" aria-label="Finished" />}</span>
                  <span role="cell" className="c-title"><b>{h.title}</b><small>{[h.practice ? 'Practice' : 'Daily question', h.xpEarned ? `+${h.xpEarned} XP` : ''].filter(Boolean).join(' · ')}</small></span>
                  <span role="cell" className="c-topic"><span className={`plh-topic tl3-type ${h.type}`}><i className={`bi ${TYPE[h.type as TQType]?.icon || 'bi-lightbulb'}`} aria-hidden /> {SHORT[h.type as TQType] || h.type}</span></span>
                  <span role="cell" className="c-att">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span role="cell" className="c-acc">{Math.round(h.share * 100)}%</span>
                  <span role="cell" className="c-diff"><span className={`pl-diff ${h.difficulty}`}>{cap(h.difficulty)}</span></span>
                  <span role="cell" className="c-act"><button type="button" className="plh-solve done" onClick={(e) => { e.stopPropagation(); openReview(h.id); }}>Review</button></span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

/** The last five weeks, for the History tab: done, saved by a freeze, or missed. */
const Calendar: React.FC<{ days: TQToday['calendar']; best: number }> = ({ days, best }) => (
  <div className="tl3-cal-wrap">
    <div className="tl3-cal" role="img" aria-label={`Thinking Lab days in the last five weeks: ${days.filter((c) => c.state === 'done').length} done`}>
      {days.map((c) => <span key={c.date} className={c.state} title={`${new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${c.state === 'done' ? ' · done' : c.state === 'frozen' ? ' · saved by a freeze' : ''}`} />)}
    </div>
    <div className="tl3-legend">
      <b>Last 5 weeks</b><span>Best streak {best} day{best === 1 ? '' : 's'}</span>
      <span><i className="done" /> Done</span><span><i className="frozen" /> Freeze used</span><span><i className="none" /> Missed</span>
    </div>
  </div>
);

const CodingBadge: React.FC<{ c: TQToday['coding']; stage: string }> = ({ c, stage }) => {
  if (c.open) return <span className="tl3-badge open"><i className="bi bi-unlock-fill" /> Coding open</span>;
  if (c.reason === 'year1' || stage === 'foundation') return <span className="tl3-badge"><i className="bi bi-lock-fill" /> Coding from Year 2</span>;
  return <span className="tl3-badge" title="Coding questions open once you finish the basics topics in your roadmap"><i className="bi bi-lock-fill" /> Coding after basics · {c.basicsDone}/{c.basicsTotal}</span>;
};

const StateTag: React.FC<{ q: TQQuestion }> = ({ q }) => {
  if (q.state === 'solved') return <span className="tl2-tag ok"><i className="bi bi-check-circle-fill" /> Solved</span>;
  if (q.state === 'finished') return <span className="tl2-tag done"><i className="bi bi-flag-fill" /> Finished · {Math.round(q.bestShare * 100)}%</span>;
  if (q.state === 'trying') return <span className="tl2-tag go">Try {q.attemptsUsed + 1} of {q.attemptsAllowed}</span>;
  return <span className="tl2-tag">New</span>;
};

/** Where Solve sends answers, hints and code runs. CareerPilot members by default; an LMS lab-track puzzle passes its own. */
export interface SolveApi {
  answer: (id: string, body: { answer?: string; explanation: string; code?: string; language?: string }) => Promise<{ question: TQQuestion; reward: TQReward | null }>;
  hint: (id: string) => Promise<{ hints: string[]; hintsTotal: number }>;
  run: typeof memberLabApi.run;
  /** Coding only: check the plan; a good or partly right plan opens the editor. */
  logic?: typeof memberLabApi.logic;
}

/** The result of the logic check above the button: green when it opened the editor, amber when it did not. */
const LogicNote: React.FC<{ v: 'good' | 'partial' | 'off' | null; feedback: string }> = ({ v, feedback }) => (
  <div className={`tl2-logic ${v || 'partial'}`} role="status">
    <i className={`bi ${v === 'off' ? 'bi-signpost-split' : 'bi-check-circle-fill'}`} />
    <div><b>{v === 'good' ? 'Good plan. The editor is open.' : v === 'partial' ? 'On the right track. The editor is open.' : 'Not quite yet. Rethink your plan.'}</b>{feedback && <span>{feedback}</span>}</div>
  </div>
);

export const Solve: React.FC<{ q: TQQuestion; practice: boolean; demo: boolean; readOnly?: boolean; onBack: () => void; onUpdate: (q: TQQuestion, r: TQReward | null) => void; onNext: () => void; hasNext: boolean; api?: SolveApi }> =
  ({ q, practice, demo, readOnly, onBack, onUpdate, onNext, hasNext, api = memberLabApi }) => {
    const coding = q.type === 'coding';
    const finished = q.state === 'solved' || q.state === 'finished';
    const [answer, setAnswer] = useState(q.last?.answer || '');
    const [explanation, setExplanation] = useState(q.last?.explanation || q.logic?.text || '');
    /* Coding: think first, then code. The student explains their logic (LOGIC_MIN_WORDS words), which opens the
       editor; the editor takes any runnable language because every test is plain standard input → output. */
    const startLang = q.last?.language || q.language || 'python';
    const templateFor = useCallback((lang: string) => (q.starterCode && (q.language || 'python') === lang ? q.starterCode : TL_TEMPLATES[lang] || ''), [q.starterCode, q.language]);
    const [language, setLanguage] = useState(startLang);
    const [code, setCode] = useState(q.last?.code || templateFor(startLang));
    // The editor opens only after the server has checked the plan (q.logic.ok); a try made earlier also counts.
    const [unlocked, setUnlocked] = useState(!!q.logic?.ok || !!q.last?.code);
    const [pane, setPane] = useState<'logic' | 'code'>(q.logic?.ok || q.last?.code ? 'code' : 'logic');
    const [verdict, setVerdict] = useState<{ v: 'good' | 'partial' | 'off' | null; feedback: string } | null>(q.logic?.verdict ? { v: q.logic.verdict, feedback: q.logic.feedback } : null);
    const changeLanguage = (lang: string) => {
      // Swap in the new language's input skeleton only while the editor holds an untouched template.
      const untouched = !code.trim() || code === templateFor(language) || Object.values(TL_TEMPLATES).includes(code);
      setLanguage(lang); setRun(null);
      if (untouched) setCode(templateFor(lang));
    };
    const [hints, setHints] = useState<string[]>(q.hints);
    const [busy, setBusy] = useState('');
    const [err, setErr] = useState('');
    const [run, setRun] = useState<Awaited<ReturnType<typeof memberLabApi.run>> | null>(null);
    const left = q.attemptsAllowed - q.attemptsUsed;
    // Opening a question brings it into view: on a phone the list sits well below the top.
    const top = useRef<HTMLElement>(null);
    useEffect(() => { top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, []);
    const wc = words(explanation);
    // A coding question still being worked on gets the two-column workspace: the question, then Logic → Code.
    const split = coding && !(finished && q.reveal);

    const submit = async () => {
      if (!coding && !answer.trim()) { setErr('Give your final answer.'); return; }
      if (wc < MIN_WORDS) { setErr(`Explain your thinking in at least ${MIN_WORDS} words: what you noticed, what you worked out, and how you reached the answer.`); return; }
      setBusy('submit'); setErr('');
      try {
        const r = await api.answer(q.id, coding ? { code, language, explanation } : { answer, explanation });
        onUpdate(r.question, r.reward);
      } catch (e) { setErr(errOf(e, 'Could not check your answer.')); }
      setBusy('');
    };
    const hint = async () => {
      setBusy('hint');
      try { const r = await api.hint(q.id); setHints(r.hints); } catch (e) { setErr(errOf(e, 'No more hints.')); }
      setBusy('');
    };
    const checkLogic = async () => {
      if (!api.logic) { setUnlocked(true); setPane('code'); return; }
      setBusy('logic'); setErr('');
      try {
        const r = await api.logic(q.id, explanation);
        setVerdict({ v: r.verdict, feedback: r.feedback });
        if (r.ok) { setUnlocked(true); setPane('code'); }
      } catch (e) { setErr(errOf(e, 'Could not check your logic.')); }
      setBusy('');
    };
    const runCode = async () => {
      setBusy('run'); setErr('');
      try { setRun(await api.run(q.id, code, language)); } catch (e) { setErr(errOf(e, 'Could not run your code.')); }
      setBusy('');
    };

    return (
      <section ref={top} className={`pl-card pl-panel plh-panel tl2-solve${split ? ' tl2-solve-code' : ''}`}>
        <div className="tl2-solve-top">
          <button className="tl2-back" onClick={onBack}><i className="bi bi-arrow-left" /> {readOnly ? 'History' : 'Back to the list'}</button>
          <StateTag q={q} />
        </div>
        <div className={split ? 'tl2-split' : 'tl2-flow'}>
        <div className="tl2-split-q">
        <span className="tl2-q-meta">{TYPE[q.type].label}{q.subCategory ? ` · ${q.subCategory}` : ''}<em className={`tl2-diff ${q.difficulty}`}>{q.difficulty}</em>{practice ? <em className="tl2-diff practice">practice</em> : null}</span>
        <h2 className="tl2-title">{q.title}</h2>
        <div className="tl2-statement">{q.statement}</div>
        {q.imageUrl && <img className="tl2-img" src={q.imageUrl} alt="" />}

        {coding && (q.examples.length > 0) && (
          <div className="tl2-examples">{q.examples.map((x, i) => (
            <div key={i} className="tl2-ex"><div><small>Input</small><pre>{x.input || '(none)'}</pre></div><div><small>Output</small><pre>{x.expectedOutput}</pre></div>{x.explanation && <p>{x.explanation}</p>}</div>
          ))}</div>
        )}

        {!!hints.length && <ul className="tl2-hints">{hints.map((h, i) => <li key={i}><i className="bi bi-lightbulb-fill" /> <b>Hint {i + 1}</b> {h}</li>)}</ul>}

        {q.last && (
          <div className={`tl2-result ${q.last.correct ? 'ok' : finished ? 'done' : 'retry'}`}>
            <div className="tl2-result-hd">
              <i className={`bi ${q.last.correct ? 'bi-check-circle-fill' : 'bi-arrow-repeat'}`} />
              <div>
                <b>{q.last.correct ? (coding ? 'All tests passed' : 'Right answer') : coding ? `${q.last.passed ?? 0} of ${q.last.total ?? 0} tests passed` : finished ? 'Not quite. Here is the model answer.' : 'Not quite yet'}</b>
                <span>{coding ? '' : `Reasoning: ${q.last.steps.filter((x) => x.status === 'covered').length} of ${q.last.steps.length} key steps covered${q.last.steps.some((x) => x.status === 'partial') ? `, ${q.last.steps.filter((x) => x.status === 'partial').length} partly` : ''}. `}
                  Score {Math.round(q.last.share * 100)}%{finished ? (q.xpEarned ? ` · +${q.xpEarned} XP` : practice ? ' · practice' : '') : ` · ${left} attempt${left === 1 ? '' : 's'} left`}</span>
              </div>
            </div>
            {!coding && <ul className="tl2-steps">{q.last.steps.map((x, i) => (
              <li key={i} className={x.status}><i className={`bi ${STEP_ICON[x.status]}`} /> <span>{x.step || `Key step ${i + 1}`}</span><em>{STEP_LABEL[x.status]}</em></li>
            ))}</ul>}
            {q.last.feedback && <p className="tl2-feedback">{q.last.feedback}</p>}
          </div>
        )}

        </div>
        {finished && q.reveal ? (
          <div className="tl2-reveal">
            {q.reveal.answer && <p><b>Answer:</b> {q.reveal.answer}</p>}
            {q.reveal.explanation && <><h3>How to think about it</h3><p className="tl2-pre">{q.reveal.explanation}</p></>}
            {q.reveal.referenceSolution && <><h3>A model solution</h3><pre className="tl2-code ro">{q.reveal.referenceSolution}</pre></>}
            <div className="tl2-actions">
              <button className="tl2-btn" onClick={onBack}>{readOnly ? 'Back to history' : 'Back to the list'}</button>
              {hasNext && <button className="tl2-btn primary" onClick={onNext}>Next question <i className="bi bi-arrow-right" /></button>}
            </div>
          </div>
        ) : (
          <div className="tl2-form">
            {coding ? (
              <div className="tl2-ws">
                <div className="tl2-ws-tabs" role="tablist" aria-label="Logic, then code">
                  <button role="tab" aria-selected={pane === 'logic'} className={pane === 'logic' ? 'on' : ''} onClick={() => setPane('logic')}>
                    <b>1</b> Logic {unlocked && <i className="bi bi-check-circle-fill" />}
                  </button>
                  <button role="tab" aria-selected={pane === 'code'} className={pane === 'code' ? 'on' : ''} disabled={!unlocked} onClick={() => setPane('code')}
                    title={unlocked ? '' : `Explain your logic first (${LOGIC_MIN_WORDS}+ words)`}>
                    <b>2</b> Code {!unlocked && <i className="bi bi-lock-fill" />}
                  </button>
                </div>
                {pane === 'logic' ? (
                  <div className="tl2-ws-pane">
                    <p className="tl2-ws-help">Think first. In plain words: what the program reads, what it works out, and what it prints. Write at least {LOGIC_MIN_WORDS} words, then check your logic. The code editor opens when your plan is on the right track (it does not have to be perfect).</p>
                    <label className="tl2-field"><span className="tl2-lbl">Your logic <small className={wc >= LOGIC_MIN_WORDS ? 'ok' : ''}>{wc} / {LOGIC_MIN_WORDS}+ words</small></span>
                      <textarea className="tl2-input" rows={8} value={explanation} maxLength={4000} onChange={(e) => setExplanation(e.target.value)}
                        placeholder="e.g. Read the two numbers. Loop from the first to the second, add up the even ones, and print the total at the end." />
                    </label>
                    {verdict && <LogicNote v={verdict.v} feedback={verdict.feedback} />}
                    {err && <div className="tl2-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
                    <div className="tl2-actions">
                      {q.hintsTotal > hints.length && <button className="tl2-btn" disabled={!!busy} onClick={hint}><i className="bi bi-lightbulb" /> Hint {hints.length + 1} of {q.hintsTotal}</button>}
                      {unlocked
                        ? <button className="tl2-btn primary" onClick={() => { setPane('code'); setErr(''); }}>Back to the code <i className="bi bi-arrow-right" /></button>
                        : <button className="tl2-btn primary" disabled={wc < LOGIC_MIN_WORDS || !!busy} onClick={checkLogic}>
                            {busy === 'logic' ? <><span className="tl2-spin" /> Checking your logic…</> : <>Check my logic <i className="bi bi-arrow-right" /></>}
                          </button>}
                    </div>
                  </div>
                ) : (
                  <div className="tl2-ws-pane">
                    <div className="tl2-ws-bar">
                      <label className="tl2-lang"><span>Language</span>
                        <select value={language} onChange={(e) => changeLanguage(e.target.value)} aria-label="Language">
                          {TL_LANGS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                        </select>
                      </label>
                      <button className="tl2-link" onClick={() => { setCode(templateFor(language)); setRun(null); }}><i className="bi bi-arrow-counterclockwise" /> Reset</button>
                    </div>
                    <small className="tl2-ws-help">Read the input from standard input and print the answer.</small>
                    <div className="tl2-editor">
                      <Editor height="340px" theme="light" language={language} value={code} onChange={(v) => setCode(v ?? '')}
                        options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, tabSize: 4, automaticLayout: true, wordWrap: 'on' }} />
                    </div>
                    {run && (
                      <div className="tl2-run">
                        {run.compileError ? <pre className="bad">{run.compileError}</pre> : run.results.map((r) => (
                          <span key={r.index} className={r.passed ? 'ok' : 'bad'}><i className={`bi ${r.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} /> Example {r.index + 1}</span>
                        ))}
                        {run.firstFail && <pre className="bad">Input: {run.firstFail.input}{'\n'}Expected: {run.firstFail.expected}{'\n'}Got: {run.firstFail.actual}</pre>}
                      </div>
                    )}
                    {err && <div className="tl2-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
                    <div className="tl2-actions">
                      {q.hintsTotal > hints.length && <button className="tl2-btn" disabled={!!busy} onClick={hint}><i className="bi bi-lightbulb" /> Hint {hints.length + 1} of {q.hintsTotal}</button>}
                      <button className="tl2-btn" disabled={!!busy} onClick={runCode}>{busy === 'run' ? <span className="tl2-spin" /> : <i className="bi bi-play-fill" />} Run examples</button>
                      <button className="tl2-btn primary" disabled={!!busy} onClick={submit}>{busy === 'submit' ? <><span className="tl2-spin" /> Checking…</> : <>Submit {demo ? '' : `· ${left} ${left === 1 ? 'try' : 'tries'} left`}</>}</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (<>
              {q.answerFormat === 'choice' ? (
                <fieldset className="tl2-choices"><legend className="tl2-lbl">Your answer</legend>
                  {q.choices.map((c, i) => (
                    <label key={i} className={answer === c ? 'on' : ''}><input type="radio" name={`ans-${q.id}`} checked={answer === c} onChange={() => setAnswer(c)} /><b>{String.fromCharCode(65 + i)}</b><span>{c}</span></label>
                  ))}
                </fieldset>
              ) : (
                <label className="tl2-field"><span className="tl2-lbl">Your answer</span>
                  <input className="tl2-input" value={answer} inputMode={q.answerFormat === 'number' ? 'decimal' : undefined} maxLength={300}
                    placeholder={q.answerFormat === 'number' ? 'A number' : 'A word or short phrase'} onChange={(e) => setAnswer(e.target.value)} />
                </label>
              )}
              <label className="tl2-field"><span className="tl2-lbl">Explain your thinking <small className={wc >= MIN_WORDS ? 'ok' : ''}>{wc} / {MIN_WORDS}+ words</small></span>
                <textarea className="tl2-input" rows={5} value={explanation} maxLength={4000} onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Step by step: what you noticed, what you worked out, and how it gives the answer." />
              </label>
              {err && <div className="tl2-err"><i className="bi bi-exclamation-circle" /> {err}</div>}
              <div className="tl2-actions">
                {q.hintsTotal > hints.length && <button className="tl2-btn" disabled={!!busy} onClick={hint}><i className="bi bi-lightbulb" /> Hint {hints.length + 1} of {q.hintsTotal}</button>}
                <button className="tl2-btn primary" disabled={!!busy} onClick={submit}>{busy === 'submit' ? <><span className="tl2-spin" /> Checking…</> : <>Submit {demo ? '' : `· ${left} ${left === 1 ? 'try' : 'tries'} left`}</>}</button>
              </div>
            </>)}
          </div>
        )}
        </div>
      </section>
    );
  };

export default MemberThinkingLab;
