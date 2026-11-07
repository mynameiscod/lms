/**
 * CareerPilot Journey — the learner's own programme, Foundation or Build.
 *
 * ── WHAT THIS SCREEN IS FOR ───────────────────────────────────────────────────────────────
 *
 * One question: what am I doing today, and where does it sit in the ninety. Everything on the
 * page serves that and nothing else appears.
 *
 * ── WHAT A STUDENT NEVER SEES HERE ────────────────────────────────────────────────────────
 *
 * The 337-unit master curriculum, composer scores, role allocations, readiness rungs,
 * publication status, reallocation reports. The server does not send them, and it would be
 * wrong to show them if it did: they are instruments for authoring the curriculum, and a
 * student reading "ADVANCED_UNIVERSAL, rank 41" learns nothing about today and quite a lot
 * about how little of this was written for them.
 *
 * The one piece of planning that IS shown is the day's objective, in the unit's own words.
 * "Why am I doing this" deserves an answer.
 *
 * ── NINETY IS ALWAYS NINETY ───────────────────────────────────────────────────────────────
 *
 * The header says "Day 31 of 90" for every student. A strong learner must not be able to
 * infer they were given harder material by noticing a shorter course, and somebody struggling
 * must never see a longer one. What differs is the content of the days, which is the thing
 * the screen actually shows.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, {
  FoundationJourney as Journey, FoundationJourneyDay, FoundationJourneyActivity, PlacementAvailability,
  OrientationView,
} from '../../api/passportApi';
import SectionLock, { useUnlock } from './SectionLock';
import { dayState, dayRanges, initialDay, STATE_LABEL } from './foundationRoadmapPresenter';
import CareerTrackPicker from './CareerTrackPicker';
import './foundationJourney.css';
import './foundationPreview.css';
import './foundationMember.css';
import './orientation.css';
import './journeyDashboard.css';
import { useProgramDays } from './useProgramDays';
import { barWidth } from '../../utils/barWidth';

/** Content types, in words a first-year recognises. */
const TYPE_LABEL: Record<string, string> = {
  video: 'Watch',
  notes: 'Read',
  worked_example: 'Worked example',
  interactive_lesson: 'Interactive',
  interactive_activity: 'Activity',
  tech_qa: 'Q&A',
  behavioral_qa: 'Q&A',
  practice_theory: 'Practice',
  practice_coding: 'Code practice',
  aptitude: 'Aptitude',
  quiz: 'Checkpoint',
  assignment: 'Project',
};

const ICON: Record<string, string> = {
  video: 'bi-play-circle',
  notes: 'bi-file-text',
  worked_example: 'bi-lightbulb',
  practice_theory: 'bi-pencil-square',
  practice_coding: 'bi-code-slash',
  quiz: 'bi-patch-question',
  assignment: 'bi-upload',
};
/** Solid glyphs for the activity badges: the outline set read as faint at .75 zoom. */
const ICON_FILLED: Record<string, string> = {
  video: 'bi-play-fill',
  notes: 'bi-file-text-fill',
  worked_example: 'bi-lightbulb-fill',
  practice_theory: 'bi-pencil-fill',
  practice_coding: 'bi-code-slash',
  quiz: 'bi-patch-question-fill',
  assignment: 'bi-upload',
};

const mins = (n: number) =>
  (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

/** "~ 1 hr 10 min" — the day's length as the plan states it. */
const approx = (n: number) =>
  (n >= 60 ? `~ ${Math.floor(n / 60)} hr${n % 60 ? ` ${n % 60} min` : ''}` : `~ ${n} min`);

/** One line under each task, in words, by what kind of task it is. */
const TYPE_HINT: Record<string, string> = {
  video: 'Watch the lesson and learn the idea.',
  notes: 'Read the key concepts and syntax.',
  worked_example: 'See a real example and follow how it works.',
  interactive_lesson: 'Learn by trying it as you go.',
  interactive_activity: 'A short hands-on activity.',
  tech_qa: 'Questions interviewers ask on this topic.',
  behavioral_qa: 'Questions interviewers ask on this topic.',
  practice_theory: 'Practise what you just learned.',
  practice_coding: 'Write and run the code yourself.',
  aptitude: 'Sharpen your aptitude.',
  quiz: 'A quick check of your understanding.',
  assignment: 'Build it and submit your work.',
};

/** How many tasks the day card lists before "View more". */
const FIRST_TASKS = 5;

/** A task's title without the "— video" / "— notes" its kind already says. */
const lessonName = (title: string) => title.split(/\s+[—–]\s+/)[0].trim();

/**
 * THE TOP OF THE PAGE: where the member is, and the numbers that matter today.
 *
 * Title on the left; on the right the ring, the day count, today's plan and the one button. It is
 * the same for a member and before membership, so buying changes the figures, not the furniture.
 */
const JourneyHead: React.FC<{
  badge: string; stage: string; sub: string; pct: number; pctLabel: string;
  daysLine: string; plan?: { title: string; line: string } | null;
  action: React.ReactNode;
}> = ({ badge, stage, sub, pct, pctLabel, daysLine, plan, action }) => {
  const r = 26; const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <header className="jd-top">
      <div className="jd-top-copy">
        <span className="jd-badge">{badge}</span>
        <h1>{stage} Journey</h1>
        <p>{sub}</p>
      </div>
      <div className="jd-stats">
        <div className="jd-stat jd-stat-ring">
          <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
            <circle cx="32" cy="32" r={r} className="jd-ring-bg" />
            <circle cx="32" cy="32" r={r} className="jd-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 32 32)" />
          </svg>
          <span><b>{p}%</b><small>{pctLabel}</small></span>
        </div>
        <div className="jd-stat">
          <span className="jd-stat-ic"><i className="bi bi-calendar3" aria-hidden /></span>
          <span><b>{daysLine}</b></span>
        </div>
        {plan && (
          <div className="jd-stat">
            <span className="jd-stat-ic play"><i className="bi bi-play-fill" aria-hidden /></span>
            <span><b>{plan.title}</b><small>{plan.line}</small></span>
          </div>
        )}
        <div className="jd-stat-act">{action}</div>
      </div>
    </header>
  );
};

/** A welcome-day task, as it is listed on the plan (the same glyphs the welcome day page uses). */
const WELCOME_ICON: Record<string, string> = {
  video: 'bi-play-fill', notes: 'bi-journal-text', image: 'bi-image-fill', checklist: 'bi-check2-square', recording: 'bi-mic-fill',
};
const WELCOME_LABEL: Record<string, string> = {
  video: 'Video', notes: 'Notes', image: 'Image', checklist: 'Checklist', recording: 'Recording',
};

/**
 * THE DAYS, AS A STRIP YOU STEP THROUGH — NOT ONE YOU SCROLL.
 *
 * Ninety (or 130) chips never fit, and a scrollbar under them was the only way along: thin,
 * easy to miss, and on a laptop a horizontal scrollbar is a thing nobody drags. The owner asked
 * for arrows instead, so the strip has a large arrow on each side that steps a page of chips,
 * greys out at either end, and the scrollbar is gone in every browser. Swiping still works on a
 * phone and the range jumps above still move it; the day in focus is centred on load.
 *
 * Positions are read with offsetLeft against the strip itself (it is position:relative), not
 * getBoundingClientRect, because #root renders at zoom .75 and the two disagree under zoom.
 */
const DayStrip: React.FC<{ totalDays: number; label: string; focusDay?: number | null; aside?: React.ReactNode; children: React.ReactNode }> =
  ({ totalDays, label, focusDay, aside, children }) => {
    const wrapRef = useRef<HTMLElement | null>(null);
    const [edge, setEdge] = useState({ prev: false, next: false });
    const [activeFrom, setActiveFrom] = useState<number | null>(null);
    const firstFocus = useRef(true);
    const ranges = dayRanges(totalDays);

    const chipFor = (n: number): HTMLElement | null => {
      const chip = document.getElementById(`fj-chip-${n}`);
      return chip && wrapRef.current?.contains(chip) ? chip : null;
    };

    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      const prev = el.scrollLeft > 2;
      const next = el.scrollLeft < max - 2;
      setEdge(e => (e.prev === prev && e.next === next ? e : { prev, next }));
      // The range whose first chip sits left of the strip's middle is the one being looked at.
      const mid = el.scrollLeft + el.clientWidth / 2;
      let active: number | null = null;
      for (const r of ranges) {
        const c = chipFor(r.from);
        if (c && c.offsetLeft <= mid) active = r.from;
      }
      // At the far end the last range is on screen even when its first chip is right of middle.
      if (!next && prev && ranges.length) active = ranges[ranges.length - 1].from;
      setActiveFrom(active);
    };
    const updateRef = useRef(update);
    updateRef.current = update;

    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return undefined;
      const run = () => updateRef.current();
      run();
      if (typeof ResizeObserver === 'undefined') {
        window.addEventListener('resize', run);
        return () => window.removeEventListener('resize', run);
      }
      const ro = new ResizeObserver(run);
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
      return () => ro.disconnect();
    }, []);

    /* The day in focus sits in the middle of the strip — instantly on load, smoothly after. */
    useEffect(() => {
      if (focusDay === null || focusDay === undefined) return;
      const el = wrapRef.current;
      const chip = chipFor(focusDay);
      if (!el || !chip) return;
      el.scrollTo({ left: chip.offsetLeft - (el.clientWidth - chip.offsetWidth) / 2, behavior: firstFocus.current ? 'auto' : 'smooth' });
      firstFocus.current = false;
      updateRef.current();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusDay]);

    /** One page of chips, less one, so the last chip seen is the first one after the step. */
    const page = (dir: 1 | -1) => {
      const el = wrapRef.current;
      if (el) el.scrollBy({ left: dir * Math.max(120, el.clientWidth - 56), behavior: 'smooth' });
    };
    const jumpTo = (from: number) => {
      const el = wrapRef.current;
      const chip = chipFor(from);
      if (el && chip) el.scrollTo({ left: chip.offsetLeft - 6, behavior: 'smooth' });
    };
    /** Left/right arrow keys walk the chips, the way a tab list does. */
    const onKey = (e: React.KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const btns = Array.from(wrapRef.current?.querySelectorAll<HTMLButtonElement>('button.fj-chip:not(:disabled)') || []);
      const i = btns.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      const to = btns[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (to) { e.preventDefault(); to.focus({ preventScroll: true }); to.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    };

    return (
      <div className="fjm-strip-card">
        <nav className="fj-range" aria-label="Jump to days">
          <div className="fj-range-jumps">
            {ranges.map(r => (
              <button type="button" key={r.from} className={`fj-range-btn${activeFrom === r.from ? ' on' : ''}`}
                      aria-current={activeFrom === r.from ? 'true' : undefined} onClick={() => jumpTo(r.from)}>{r.label}</button>
            ))}
          </div>
          {aside}
        </nav>
        <div className={`fj-strip-row${edge.prev ? ' can-prev' : ''}${edge.next ? ' can-next' : ''}`}>
          <button type="button" className="fj-strip-arrow prev" onClick={() => page(-1)} disabled={!edge.prev}
                  aria-label="Show earlier days" title="Earlier days">
            <i className="bi bi-chevron-left" aria-hidden />
          </button>
          <section className="fj-strip-wrap" aria-label={label} ref={wrapRef} onScroll={update} onKeyDown={onKey}>
            <ol className="fj-strip">{children}</ol>
          </section>
          <button type="button" className="fj-strip-arrow next" onClick={() => page(1)} disabled={!edge.next}
                  aria-label="Show later days" title="Later days">
            <i className="bi bi-chevron-right" aria-hidden />
          </button>
        </div>
      </div>
    );
  };

/** Shown before a journey exists. Still states the length, because ninety is the promise. */
/**
 * Shown before a journey exists. Still states the length, because ninety is the promise.
 *
 * For a student the unit engine plans, the skill check is what creates the journey, so the one
 * thing to press is offered here rather than leaving them on a message with nothing to do.
 */
/**
 * `stage` is the programme's own name — "Foundation" for a first-year, "Build" for a second-year —
 * and it defaults to Foundation for the one render that happens before the server has answered.
 */
const NotReady: React.FC<{ totalDays: number; stage?: string; message?: string; onAssess?: () => void; notConfigured?: boolean; preparing?: boolean }> = ({ totalDays, stage = 'Foundation', message, onAssess, notConfigured, preparing }) => (
  <div className="fj-page">
    <header className="fj-head">
      <div>
        <span className="fj-kicker">CAREERPILOT</span>
        <h1>{stage} Journey</h1>
        <p className="fj-sub">{totalDays} learning days</p>
      </div>
    </header>
    {/* Not configured is said as it is: no shorter plan is shown in its place. */}
    <div className={`fj-msg ${notConfigured ? 'err' : 'info'}`}>
      <b>{message || 'Your journey has not been created yet.'}</b>
      <p>
        {notConfigured
          ? `Your ${stage} programme is ${totalDays} learning days. It will appear here as soon as it has been set up.`
          : preparing
            ? `Your ${stage} programme is ${totalDays} learning days, personalised to what you already know. This page updates by itself.`
            : `Your ${stage} programme is ${totalDays} learning days, personalised to what you already know. It appears here once your skill check is complete.`}
      </p>
      {onAssess && (
        <button type="button" className="fj-start" onClick={onAssess}>Take your skill check</button>
      )}
    </div>
  </div>
);

/**
 * Before membership: the learner's own plan, on the page they will keep using.
 *
 * ── ONE PAGE, WHATEVER THE ACCESS ─────────────────────────────────────────────────────────
 *
 * This used to be a second layout — its own hero, its own square-grid map, its own "your first
 * week" list down the side — so buying a membership changed the furniture as well as the locks.
 * The plan a non-member was shown and the plan they got were visibly different products, which
 * is the worst possible impression to leave on the screen whose job is to sell the second one.
 *
 * It is now the member journey, with the parts a non-member has not got yet: the same hero, the
 * same day strip of every day in the programme, the same day panel in the same place. What
 * differs is what is true — the days past the preview are locked, the ring counts what is open
 * to read rather than what is finished, and the unlock is offered.
 *
 * ── SHOWN, NOT OPENED ─────────────────────────────────────────────────────────────────────
 *
 * The preview days are read in full — the objective, the outcomes, what the day contains — and
 * nothing in them can be started. Each activity carries its own lock, so the value is legible
 * and the gate is honest. The server agrees: it composes these days live and stores nothing.
 */
const PreviewJourney: React.FC<{ journey: Journey; onUnlocked: () => void }> = ({ journey, onUnlocked }) => {
  const nav = useNavigate();
  const programDays = useProgramDays();
  const previewDays = journey.preview || [];
  const [open, setOpen] = useState<number>(previewDays[0]?.day ?? 1);
  const [showAll, setShowAll] = useState(false);
  const { unlock, busy, msg, priceInr } = useUnlock();

  /** The programme's own name, from the server. Falls back to the only name this page ever had. */
  const stage = journey.stageLabel || 'Foundation';
  const totalDays = journey.totalDays ?? programDays ?? 90;
  const openCount = previewDays.length;
  const lockedCount = journey.lockedDays ?? Math.max(0, totalDays - openCount);
  const day = previewDays.find(d => d.day === open) || previewDays[0];
  const avgMins = openCount ? Math.round(previewDays.reduce((t, d) => t + (d.minutes || 0), 0) / openCount) : 0;
  const unlockLabel = busy ? 'Opening payment…' : `Unlock all ${totalDays} days${priceInr ? ` — ₹${priceInr}` : ''}`;
  const openSet = new Set(previewDays.map(d => d.day));

  /**
   * The ring counts what is OPEN TO READ, not what is finished.
   *
   * A non-member has finished nothing, so a completion ring would read 0% on every preview ever
   * shown — a zero against somebody's own plan before they have had the chance to start it. The
   * number that means something here is how much of the plan they can already see.
   */
  const openPct = totalDays ? Math.round((openCount / totalDays) * 100) : 0;

  return (
    <div className="fj-page fjm fjm-preview jd">
      {/* The member's header, with what is true before membership: how much is open, and the unlock. */}
      <JourneyHead
        badge={`Starts on Day 0.1 · ${totalDays} learning days`}
        stage={stage}
        sub={`Your personalised plan, built from your skill check. The first ${openCount} days are open to read — membership opens all ${totalDays}.`}
        pct={openPct}
        pctLabel="Open to preview"
        daysLine={`${openCount} / ${totalDays} Days open`}
        plan={avgMins > 0 ? { title: 'Each day', line: approx(avgMins) } : null}
        action={(
          <button type="button" className="jd-start" onClick={() => unlock(onUnlocked)} disabled={busy}>
            {unlockLabel} <i className="bi bi-unlock" aria-hidden />
          </button>
        )}
      />
      {msg && <p className="fj-msg err">{msg}</p>}

      {/* The whole programme, as a strip — the same one a member scrolls, with the locks a
          non-member has. Days past the preview are named by number and open nothing. */}
      <DayStrip
        totalDays={totalDays}
        label={`All ${totalDays} days`}
        focusDay={open}
        aside={(
          <button type="button" className="jd-full" onClick={() => nav('/careerpilot/roadmap')}>
            View Full Journey <i className="bi bi-arrow-right" aria-hidden />
          </button>
        )}
      >
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(n => {
              const readable = openSet.has(n);
              const title = previewDays.find(d => d.day === n)?.title;
              return (
                <li key={n}>
                  <button
                    type="button"
                    id={`fj-chip-${n}`}
                    className={`fj-chip s-upcoming${readable ? '' : ' s-locked'}${open === n ? ' open' : ''}`}
                    onClick={() => { if (readable) { setOpen(n); setShowAll(false); } }}
                    disabled={!readable}
                    aria-label={readable ? `Day ${n}: ${title || 'preview'}` : `Day ${n} — unlocks with membership`}
                    title={readable ? `Day ${n}${title ? ` — ${title}` : ''}` : `Day ${n} — unlocks with membership`}
                  >
                    <span className="fj-chip-n">{n}</span>
                    {!readable && <i className="bi bi-lock-fill fj-chip-lock" aria-hidden />}
                  </button>
                </li>
              );
            })}
      </DayStrip>

      {day && (() => {
        const shown = showAll ? day.activities : day.activities.slice(0, FIRST_TASKS);
        const hidden = day.activities.length - shown.length;
        const next = previewDays.find(d => d.day === day.day + 1) || null;
        return (
          <div className="jd-layout">
            <section className="fj-day jd-day" aria-live="polite">
              <div className="jd-day-head">
                <span className="jd-day-ic" aria-hidden><i className="bi bi-calendar2-week" /></span>
                <div className="jd-day-title">
                  <h2>Day {day.day} – {day.title}</h2>
                  {day.objective && <p>{day.objective}</p>}
                </div>
                <div className="jd-day-meta">
                  <span className="jd-tag"><i className="bi bi-eye" aria-hidden /> Preview</span>
                  {day.minutes > 0 && <span className="jd-time"><i className="bi bi-clock" aria-hidden /> {approx(day.minutes)}</span>}
                </div>
              </div>

              {day.outcomes.length > 0 && (
                <div className="jd-outcomes">
                  <span className="jd-outcomes-ic" aria-hidden><i className="bi bi-bullseye" /></span>
                  <div>
                    <b>Learning Outcomes</b>
                    <ul>{day.outcomes.map((o, i) => <li key={i}><i className="bi bi-check-circle-fill" aria-hidden /> {o}</li>)}</ul>
                  </div>
                </div>
              )}

              <ol className="jd-acts">
                {shown.map((a, i) => (
                  <li key={i} className={a.gating ? 'gating' : ''}>
                    <div className="jd-act" aria-disabled>
                      <span className={`fj-act-icon t-${a.type}`}><i className={`bi ${ICON_FILLED[a.type] || ICON[a.type] || 'bi-journal-text'}`} aria-hidden /></span>
                      <span className="jd-act-body">
                        <b>{a.title}</b>
                        <small>{TYPE_HINT[a.type] || TYPE_LABEL[a.type] || a.type}</small>
                      </span>
                      <span className="jd-act-end">
                        {a.minutes > 0 && <span className="jd-act-time"><i className="bi bi-clock" aria-hidden /> {mins(a.minutes)}</span>}
                        <span className="jd-lock"><i className="bi bi-lock-fill" aria-hidden /> Membership</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              {day.activities.length > FIRST_TASKS && (
                <div className="jd-more">
                  <span><i className="bi bi-stack" aria-hidden /> {hidden > 0 ? `+ ${hidden} more ${hidden === 1 ? 'task' : 'tasks'} on this day` : `All ${day.activities.length} tasks shown`}</span>
                  <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}>
                    {showAll ? <>Show less <i className="bi bi-arrow-up" aria-hidden /></> : <>View More ({hidden}) <i className="bi bi-arrow-down" aria-hidden /></>}
                  </button>
                </div>
              )}
            </section>

            <aside className="jd-side" aria-label="About this day">
              <div className="jd-card jd-unlock">
                <div className="jd-card-head">
                  <span className="jd-card-ic goal" aria-hidden><i className="bi bi-unlock-fill" /></span>
                  <div>
                    <span className="jd-card-title"><b>Ready to start Day {day.day}?</b></span>
                    <p>Membership opens every lesson, checkpoint and project{lockedCount > 0 ? ` — all ${totalDays} days` : ''}.</p>
                  </div>
                </div>
                <button type="button" className="jd-start" onClick={() => unlock(onUnlocked)} disabled={busy}>{unlockLabel}</button>
              </div>
              {next && (
                <button type="button" className="jd-card jd-next" onClick={() => { setOpen(next.day); setShowAll(false); }}>
                  <span className="jd-card-ic next" aria-hidden><i className="bi bi-arrow-up-right" /></span>
                  <span className="jd-next-tx"><b>Next Step</b><span>Day {next.day} – {next.title}</span></span>
                  <span className="jd-next-go" aria-hidden><i className="bi bi-arrow-right" /></span>
                </button>
              )}
            </aside>
          </div>
        );
      })()}
    </div>
  );
};

/**
 * A day the student cannot open yet, said as such — never an empty panel.
 *
 * Shows only what the roadmap already knows about the day (its number, title and topic). The day's
 * content is not fetched for it, and the server would refuse it if it were.
 */
const LockedDay: React.FC<{ day: number; title?: string | null; topic?: string | null; currentDay: number; onBack: () => void; welcomeLabel?: string | null; trialDays?: number }> =
  ({ day, title, topic, currentDay, onBack, welcomeLabel, trialDays }) => (trialDays && day > trialDays ? (
    <div className="fj-locked" role="status">
      <span className="fj-locked-icon" aria-hidden><i className="bi bi-hourglass-split" /></span>
      <span className="fj-status s-locked">Not in your trial</span>
      <h2>Day {day}{title ? ` · ${title}` : ''}</h2>
      {topic && <p className="fj-locked-topic">{topic}</p>}
      <p className="fj-locked-title">Your trial includes days 1 to {trialDays}</p>
      <p className="fj-locked-text">Membership opens the rest of your journey. Everything you have done so far stays yours.</p>
      <button type="button" className="fj-start" onClick={onBack}>Back to today (Day {welcomeLabel || currentDay})</button>
    </div>
  ) : (
    <div className="fj-locked" role="status">
      <span className="fj-locked-icon" aria-hidden><i className="bi bi-lock-fill" /></span>
      <span className="fj-status s-locked">Locked</span>
      <h2>Day {day}{title ? ` · ${title}` : ''}</h2>
      {topic && <p className="fj-locked-topic">{topic}</p>}
      <p className="fj-locked-title">This learning day is locked</p>
      {/* While the welcome is owed, what holds a learning day is the welcome, not a learning day. */}
      <p className="fj-locked-text">{welcomeLabel
        ? 'Finish your welcome days first — Day 1 opens once they are done.'
        : 'Complete your current learning day to continue your journey.'}</p>
      <button type="button" className="fj-start" onClick={onBack}>Back to today (Day {welcomeLabel || currentDay})</button>
    </div>
  ));

/**
 * "Already know this? Test out of it."
 *
 * Offered on a day still ahead, for that day's topic. Whether it is offered at all, how many
 * questions it asks and how many days it could save are the server's answers from the student's
 * own plan — this card only shows them. A refusal the student cannot act on is not shown; one they
 * can (a paper already open, a cooldown) says so.
 */
const PlacementOffer: React.FC<{ topic: string | null; day: number }> = ({ topic, day }) => {
  const nav = useNavigate();
  const [avail, setAvail] = useState<PlacementAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setAvail(null); setMsg('');
    passportApi.placementCheckAvailability(day)
      .then(a => { if (!cancelled) setAvail(a); })
      .catch(() => { /* no offer is the right answer to a failed question */ });
    return () => { cancelled = true; };
  }, [day]);

  if (!avail) return null;
  const name = topic || avail.topicTitle || 'this topic';

  if (!avail.available) {
    if (avail.refused === 'ASSESSMENT_IN_PROGRESS') {
      return (
        <div className="fj-place wait">
          <span className="fj-place-ic"><i className="bi bi-hourglass-split" aria-hidden /></span>
          <div className="fj-place-tx"><b>You have a paper open</b><span>Finish it first, then you can test out of {name}.</span></div>
          <button type="button" className="fj-place-btn ghost" onClick={() => nav('/careerpilot/skill-assessment')}>Continue it</button>
        </div>
      );
    }
    if (avail.refused === 'COOLDOWN_ACTIVE' && avail.availableAt) {
      const when = new Date(avail.availableAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return (
        <div className="fj-place wait">
          <span className="fj-place-ic"><i className="bi bi-calendar-event" aria-hidden /></span>
          <div className="fj-place-tx"><b>Test out of {name} again from {when}</b><span>A gap between attempts keeps the check measuring what you know, not what you remember of the last paper.</span></div>
        </div>
      );
    }
    return null;
  }

  const start = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await passportApi.startPlacementCheck(day);
      if (!r.ok) { setMsg(r.message || 'The check could not be started.'); setBusy(false); return; }
      const back = `/careerpilot/plan?day=${day}`;
      nav(`/careerpilot/skill-assessment?return=${encodeURIComponent(back)}&topic=${encodeURIComponent(name)}`);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'The check could not be started.');
      setBusy(false);
    }
  };

  return (
    <div className="fj-place">
      <span className="fj-place-ic"><i className="bi bi-lightning-charge-fill" aria-hidden /></span>
      <div className="fj-place-tx">
        <b>Already know {name}?</b>
        <span>
          {avail.questions ?? 0} questions. Show you know it and the lessons you have proven come out of your plan —
          {' '}{avail.daysAhead ?? 0} {avail.daysAhead === 1 ? 'day' : 'days'} of it are still ahead of you. Practice and projects stay.
        </span>
        {msg && <em>{msg}</em>}
      </div>
      <button type="button" className="fj-place-btn" onClick={start} disabled={busy}>
        {busy ? 'Preparing…' : 'Test out'}
      </button>
    </div>
  );
};

const FoundationJourneyPage: React.FC = () => {
  const programDays = useProgramDays();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [orientation, setOrientation] = useState<OrientationView | null>(null);
  const [day, setDay] = useState<FoundationJourneyDay | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  /**
   * The welcome day being read, or null when a learning day is.
   *
   * Exactly one of the two is ever set: they share one panel, because to a member there is one
   * plan and day 0.2 is simply the day before day 1.
   */
  const [openOrientationDay, setOpenOrientationDay] = useState<number | null>(null);
  const [lockedDay, setLockedDay] = useState<{ day: number; title?: string | null; topic?: string | null } | null>(null);
  const [dayError, setDayError] = useState('');
  const [dayRetry, setDayRetry] = useState(0);
  /** The day card lists its first few tasks; "View more" shows the rest. */
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const j = await passportApi.myFoundationJourney();
      setJourney(j);
      // A preview carries its days in full; only a member's journey fetches a day on its own.
      // `?day=` opens the day a roadmap link pointed at; the journey's current day otherwise.
      if (j.available && j.access !== 'PREVIEW') {
        setOpenDay(prev => prev ?? initialDay(params.get('day'), j.currentDay ?? 1, j.totalDays ?? 90));
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load your journey.');
    } finally { setLoading(false); }
    // Read once on arrival; later selections update the URL, they do not reload the journey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Select a day, and keep it in the URL so a refresh lands on the same day. */
  const selectDay = useCallback((n: number) => {
    setOpenDay(n);
    setOpenOrientationDay(null);
    const next = new URLSearchParams(params);
    next.set('day', String(n));
    setParams(next, { replace: true });
  }, [params, setParams]);

  /**
   * Open a welcome day in the same panel a learning day uses.
   *
   * It used to navigate to the orientation screen, which took the member off their plan to do
   * something that IS their plan for the next five days. The URL carries it for the same reason
   * `?day=` does: a refresh, or a link, lands back on the day they were reading.
   */
  const selectOrientationDay = useCallback((n: number) => {
    setOpenOrientationDay(n);
    setOpenDay(null);
    const next = new URLSearchParams(params);
    next.set('welcome', String(n));
    next.delete('day');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => { load(); }, [load]);

  /* Asked once, beside the journey: a welcome the member has finished is never mentioned again. */
  useEffect(() => {
    passportApi.getMyOrientation()
      /**
       * THE WHOLE VIEW IS KEPT, not only an unfinished one.
       *
       * The welcome days are shown in the strip beside the learning days now, and a member may
       * open a finished one to look at it again. Dropping the view once orientation completed
       * left those chips with nothing to render. The CARD below is still hidden once it is done;
       * that was the part that should not keep asking.
       */
      .then(v => {
        setOrientation(v.enabled ? v : null);
        if (!v.enabled) return;
        /*
         * `?welcome=` reopens the day a refresh or a link pointed at. Failing that, a member
         * who must finish the welcome before Day 1 is put straight on the day they owe, rather
         * than being shown a learning day they cannot open and a message explaining why.
         */
        const asked = Number(params.get('welcome'));
        /*
         * THE PLAN STARTS AT 0.1, NOT DAY 1.
         *
         * A member who owes the welcome lands on it. `nextDay` is the day they can open NOW,
         * which for a paced member is null once they have done today's — so they are put on the
         * last day they finished instead, where the panel can say when the next one arrives.
         * Landing them on a learning day the server would refuse is the one thing to avoid.
         */
        const owes = v.mandatory && !v.complete;
        const lastDone = [...v.days].reverse().find(d => d.done)?.dayNumber ?? null;
        const open = v.days.some(d => d.dayNumber === asked && !d.locked) ? asked
          : owes ? (v.nextDay ?? lastDone ?? v.days[0]?.dayNumber ?? null)
            : null;
        if (open) { setOpenOrientationDay(open); setOpenDay(null); }
      })
      .catch(() => { /* the plan is not blocked by a welcome that failed to load */ });
    // Read once on arrival: `?welcome=` is where the member landed, not something to follow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A journey written seconds ago is re-checked until it is whole, so the student lands on it.
  useEffect(() => {
    if (!journey || journey.available || journey.reason !== 'BEING_PREPARED') return undefined;
    const t = setTimeout(() => { load(); }, 3000);
    return () => clearTimeout(t);
  }, [journey, load]);

  /**
   * The open day is fetched on its own.
   *
   * Ninety full bundles is a large response for a screen that renders a strip of numbers, so
   * the overview carries a summary per day and only the day being read is fetched in full.
   */
  useEffect(() => {
    if (openDay === null) return undefined;
    let cancelled = false;
    setDay(null); setLockedDay(null); setDayError(''); setShowAllTasks(false);

    /**
     * A day the overview reports locked is not requested at all: the locked card is shown from what the
     * roadmap already knows. The server remains the authority — if it refuses a day the overview thought
     * open, that refusal is shown as the same locked card rather than as an empty panel.
     */
    const summary = (journey?.days || []).find(d => d.day === openDay);
    if (summary && dayState(summary, !!journey?.orientation?.blocking) === 'LOCKED') {
      setLockedDay({ day: summary.day, title: summary.title, topic: summary.topic });
      setDayLoading(false);
      return undefined;
    }

    setDayLoading(true);
    passportApi.myFoundationJourneyDay(openDay)
      .then(d => { if (!cancelled) setDay(d); })
      .catch((e: any) => {
        if (cancelled) return;
        const body = e?.response?.data;
        if (e?.response?.status === 403 && (body?.reason === 'DAY_LOCKED' || body?.reason === 'TRIAL_LIMIT')) {
          setLockedDay({ day: openDay, title: body?.title || summary?.title, topic: summary?.topic });
        } else {
          setDayError(body?.message || 'This day could not be loaded.');
        }
      })
      .finally(() => { if (!cancelled) setDayLoading(false); });
    return () => { cancelled = true; };
  }, [openDay, journey, dayRetry]);

  /* The selected day stays centred on the strip — Day 90 included. DayStrip does it (focusDay). */

  if (loading) {
    return <div className="fj-page"><div className="fj-skeleton">Loading your journey…</div></div>;
  }

  if (err) {
    return <div className="fj-page"><div className="fj-msg err">{err}</div></div>;
  }

  /**
   * No journey yet is an ordinary state, not an error.
   *
   * A member reaches it before their assessment, or while the tenant is still on the TOPIC
   * engine. The two guards are SEPARATE on purpose: this project compiles with
   * `strictNullChecks: false`, so a `journey === null` disjunct narrows nothing and, combined
   * with the availability check by `||`, leaves the union undiscriminated in the body. Split
   * apart, the second guard discriminates cleanly.
   */
  if (!journey) return <NotReady totalDays={programDays ?? 90} />;
  // No preview for this learner: the membership offer is the page.
  if (!journey.available && journey.reason === 'MEMBERSHIP_REQUIRED') return <SectionLock section="roadmap" />;
  if (!journey.available) {
    return (
      <NotReady
        totalDays={journey.totalDays}
        stage={journey.stageLabel || undefined}
        message={journey.message}
        notConfigured={journey.reason === 'NOT_CONFIGURED' || journey.reason === 'JOURNEY_INCOMPLETE'}
        preparing={journey.reason === 'BEING_PREPARED'}
        onAssess={journey.engine === 'UNIT' && journey.reason === 'NO_JOURNEY' ? () => nav('/careerpilot/skill-assessment') : undefined}
      />
    );
  }
  if (journey.access === 'PREVIEW') return <PreviewJourney journey={journey} onUnlocked={load} />;
  const enrollmentId = journey.enrollmentId || null;

  /**
   * Defaulted at the point of use, because the interface marks the available-state fields
   * optional. `totalDays` is the one that must never be guessed low — it is the promise.
   */
  const stage = journey.stageLabel || 'Foundation';
  /**
   * Still on the welcome: the first unfinished welcome day, and its label.
   *
   * `orientation.days` carries the 0.1-0.5 labels the server built, so the screen never invents
   * one — a tenant with four welcome days or six gets the right numbers without this knowing.
   */
  const welcomeOutstanding = journey.orientation && !journey.orientation.complete
    ? journey.orientation.days.find(d => !d.day.startsWith('done') && d.status !== 'COMPLETED') || null
    : null;
  const onWelcome = !!welcomeOutstanding;
  /** The welcome must be finished before Day 1 opens, so Day 1 is not "today" yet. */
  const welcomeFirst = !!journey.orientation?.blocking && onWelcome;
  const welcomeLabel = welcomeOutstanding?.day || '0.1';
  /** The welcome day the panel is showing, from the view the page already holds. */
  const welcomeDay = openOrientationDay === null
    ? null
    : (orientation?.days || []).find(d => d.dayNumber === openOrientationDay) || null;
  const totalDays = journey.totalDays ?? programDays ?? 90;
  const currentDay = journey.currentDay ?? 1;
  const completedCount = journey.completedCount ?? 0;
  const percentComplete = journey.percentComplete ?? 0;
  const days = journey.days ?? [];

  /**
   * The banner's middle column is read from what this page already holds — the overview's day
   * summaries and, when the day being read IS today, that day's own tasks. Nothing is fetched for
   * it, and a figure the page was never given is left out rather than guessed.
   */
  const openSummary = openDay !== null ? days.find(d => d.day === openDay) || null : null;
  const todaySummary = days.find(d => d.day === currentDay) || null;
  const todayActs = day && day.day === currentDay ? (day.activities || []) : [];
  const todayLeft = todayActs.filter(a => !a.done).length;
  const todayDone = todayActs.length > 0 && todayLeft === 0;
  const todayLine = todayActs.length > 0
    ? (todayDone ? `All ${todayActs.length} tasks finished` : `${todayLeft} of ${todayActs.length} tasks left`)
    : todaySummary && todaySummary.activities > 0
      ? `${todaySummary.activities} ${todaySummary.activities === 1 ? 'task' : 'tasks'}${todaySummary.minutes > 0 ? ` · ${mins(todaySummary.minutes)}` : ''}`
      : '';
  /**
   * What the one big button does.
   *
   * It used to go straight to learning day one whatever the member's state. For anybody still on
   * the welcome that is a day the server refuses, so the most prominent control on the page was
   * the one guaranteed to fail. While a welcome day is outstanding this opens THAT day instead —
   * they finish 0.1, then 0.2, and Day 1 arrives when the welcome is done.
   */
  const openToday = () => {
    if (onWelcome && welcomeOutstanding) { nav(`/careerpilot/journey/welcome/${welcomeOutstanding.dayNumber}`); return; }
    if (enrollmentId) nav(`/careerpilot/journey/day/${currentDay}`);
    else selectDay(currentDay);
  };

  /** Today's plan, for the top of the page: the welcome day still owed, or today's learning day. */
  const owedWelcome = welcomeOutstanding
    ? (orientation?.days || []).find(d => d.dayNumber === welcomeOutstanding.dayNumber) || null
    : null;
  const plan = onWelcome && welcomeOutstanding
    ? {
      title: 'Today’s Plan',
      line: [
        owedWelcome ? `${owedWelcome.items.length} ${owedWelcome.items.length === 1 ? 'Task' : 'Tasks'}` : `Day ${welcomeLabel}`,
        welcomeOutstanding.minutes > 0 ? approx(welcomeOutstanding.minutes) : '',
      ].filter(Boolean).join(' · '),
    }
    : todayDone
      ? { title: 'Today is finished', line: `All ${todayActs.length} tasks done` }
      : todaySummary
        ? {
          title: 'Today’s Plan',
          line: [
            todayActs.length > 0 && todayLeft < todayActs.length ? `${todayLeft} of ${todayActs.length} Tasks left` : todayActs.length > 0 ? `${todayActs.length} Tasks` : `${todaySummary.activities} ${todaySummary.activities === 1 ? 'Task' : 'Tasks'}`,
            todaySummary.minutes > 0 ? approx(todaySummary.minutes) : '',
          ].filter(Boolean).join(' · '),
        }
        : null;
  const startLabel = onWelcome && welcomeOutstanding
    ? `Start Day ${welcomeLabel}`
    : todayDone ? `Review Day ${currentDay}` : `${todayActs.length > 0 && todayLeft < todayActs.length ? 'Continue' : 'Start'} Day ${currentDay}`;

  /** The day after the one being read, for "Next step". After the last welcome day it is Day 1. */
  const shownDay = openOrientationDay === null ? (day?.day ?? lockedDay?.day ?? openDay) : null;
  const nextWelcome = openOrientationDay !== null
    ? (orientation?.days || []).find(d => d.dayNumber === openOrientationDay + 1) || null
    : null;
  const nextSummary = shownDay !== null
    ? days.find(d => d.day === shownDay + 1) || null
    : openOrientationDay !== null && !nextWelcome ? days.find(d => d.day === 1) || null : null;

  /** What the day card lists before "View more". */
  const acts = day?.activities || [];
  const shownActs = showAllTasks ? acts : acts.slice(0, FIRST_TASKS);
  const hiddenActs = acts.length - shownActs.length;
  const doneActs = acts.filter(a => a.done).length;
  const dayXp = acts.reduce((t, a) => t + (a.xp ?? 0), 0) + (day?.dayBonusXp ?? 0);
  const isTodayOpen = !!day && day.status === 'CURRENT';
  /**
   * "Today You'll Learn": the day's lessons by name, once each — left out when it only repeats the
   * day's own title — then what the day is made of ("1 video · 1 notes · 1 practice · 1 checkpoint").
   */
  const learnList = Array.from(new Set(
    acts.filter(a => ['video', 'notes', 'worked_example', 'interactive_lesson'].includes(a.type)).map(a => lessonName(a.title)),
  )).filter(t => t && t.toLowerCase() !== (day?.title || '').toLowerCase()).slice(0, 5);
  const makeup = Object.entries(acts.reduce<Record<string, number>>((m, a) => {
    const k = (TYPE_LABEL[a.type] || a.type).toLowerCase(); m[k] = (m[k] || 0) + 1; return m;
  }, {})).map(([k, n]) => `${n} ${k}`).join(' · ');
  const openPlayer = (n: number) => { if (enrollmentId) nav(`/careerpilot/journey/day/${n}`); };

  return (
    <div className="fj-page fjm jd">
      <JourneyHead
        badge={onWelcome ? `Day ${welcomeLabel} · before Day 1` : `Day ${currentDay} of ${totalDays}`}
        stage={stage}
        sub="One learning day at a time. Finish today’s tasks and unlock what’s next."
        pct={percentComplete}
        pctLabel="Complete"
        daysLine={`${completedCount} / ${totalDays} Days`}
        plan={plan}
        action={(
          <button type="button" className="jd-start" onClick={openToday}>
            {startLabel} <i className="bi bi-arrow-right" aria-hidden />
          </button>
        )}
      />

      <CareerTrackPicker onPicked={() => { load(); }} />

      {/* The days, as a strip you step through with the arrows either side (see DayStrip) — with
          range tabs, so the days beyond the edge are never a guess, and the whole road one click away. */}
      <DayStrip
        totalDays={totalDays}
        label={`All ${totalDays} days`}
        focusDay={openOrientationDay === null ? openDay : null}
        aside={(
          <button type="button" className="jd-full" onClick={() => nav('/careerpilot/roadmap')}>
            View Full Journey <i className="bi bi-arrow-right" aria-hidden />
          </button>
        )}
      >
          {/*
            * The welcome days sit at the head of the strip, numbered 0.1 onward, so the plan
            * reads in the order it is actually met. They open the welcome screen rather than the
            * day player, because that is where they are done — and they are not counted in
            * `totalDays`, which is why the label above still says "All {totalDays} days".
            */}
          {(journey.orientation?.days || []).map(o => (
            <li key={`o-${o.day}`}>
              <button
                type="button"
                className={`fj-chip fj-chip-welcome s-${o.status.toLowerCase()}${o.locked ? ' s-locked' : ''}${openOrientationDay === o.dayNumber ? ' open' : ''}`}
                onClick={() => !o.locked && nav(`/careerpilot/journey/welcome/${o.dayNumber}`)}
                disabled={o.locked}
                aria-label={`Welcome day ${o.day}: ${o.title}${o.locked ? ', locked' : ''}`}
                title={`Day ${o.day} — ${o.title}`}
              >
                <span className="fj-chip-n">{o.day}</span>
                {o.status === 'COMPLETED' && <i className="bi bi-check-lg" aria-hidden />}
                {o.locked && <i className="bi bi-lock-fill fj-chip-lock" aria-hidden />}
              </button>
            </li>
          ))}
          {days.map(d => {
            const state = dayState(d, welcomeFirst);
            /* Day 1 while the welcome is owed: the server calls it CURRENT, but today is the welcome day. */
            const statusClass = d.status === 'CURRENT' && state === 'LOCKED' ? 'upcoming' : d.status.toLowerCase();
            return (
              <li key={d.day}>
                <button
                  type="button"
                  id={`fj-chip-${d.day}`}
                  className={`fj-chip s-${statusClass}${state === 'LOCKED' ? ' s-locked' : ''}${openDay === d.day && openOrientationDay === null ? ' open' : ''}`}
                  onClick={() => selectDay(d.day)}
                  aria-current={d.day === currentDay && !welcomeFirst ? 'step' : undefined}
                  aria-label={`Day ${d.day}, ${STATE_LABEL[state]}: ${d.title}`}
                  title={`Day ${d.day} — ${d.title} (${STATE_LABEL[state]})`}
                >
                  <span className="fj-chip-n">{d.day}</span>
                  {state === 'COMPLETED' && <i className="bi bi-check-lg" aria-hidden />}
                  {state === 'LOCKED' && <i className="bi bi-lock-fill fj-chip-lock" aria-hidden />}
                </button>
              </li>
            );
          })}
      </DayStrip>

      {openOrientationDay === null && !dayLoading && openSummary && openDay !== null && openDay > currentDay && openSummary.status !== 'COMPLETED' && (
        <PlacementOffer key={openDay} topic={openSummary.topic ?? null} day={openDay} />
      )}

      <div className="jd-layout">
        <section className="fj-day jd-day" aria-live="polite">
          {/*
            * A WELCOME DAY, SHOWN THE WAY A LEARNING DAY IS.
            *
            * The plan is an overview: a learning day shows what it holds and opens on its own page
            * to be worked through, and a welcome day does the same — its tasks are listed here, and
            * the videos, recordings and checklist are done on the welcome day page
            * (/careerpilot/journey/welcome/:day), which finishes the day and moves on. The gate is
            * the server's either way, and a locked chip cannot be clicked to get here.
            */}
          {openOrientationDay !== null && welcomeDay && (() => {
            const wd = welcomeDay;
            const doneCount = wd.items.filter(i => i.done).length;
            const finished = !!wd.done || (wd.items.length > 0 && doneCount === wd.items.length);
            const isToday = welcomeOutstanding?.dayNumber === wd.dayNumber;
            const minutes = wd.minutes ?? wd.items.reduce((t, i) => t + (i.estimatedMinutes || 0), 0);
            return (
              <>
                <div className="jd-day-head">
                  <span className="jd-day-ic" aria-hidden><i className="bi bi-calendar2-week" /></span>
                  <div className="jd-day-title">
                    <h2>Day {wd.day} – {wd.title}</h2>
                    {wd.blurb && <p>{wd.blurb}</p>}
                  </div>
                  <div className="jd-day-meta">
                    <span className={`jd-tag s-${finished ? 'completed' : isToday ? 'current' : 'upcoming'}`}>
                      {finished ? 'Completed' : isToday ? 'Today' : 'Upcoming'}
                    </span>
                    {minutes > 0 && <span className="jd-time"><i className="bi bi-clock" aria-hidden /> {approx(minutes)}</span>}
                  </div>
                </div>
                {wd.items.length === 0 ? (
                  <p className="fj-empty">This day is still being prepared. It will appear here before you reach it.</p>
                ) : (
                  <ol className="jd-acts">
                    {wd.items.map(it => (
                      <li key={it.key} className={it.done ? 'done' : ''}>
                        <button type="button" className="jd-act" disabled={wd.locked} onClick={() => nav(`/careerpilot/journey/welcome/${wd.dayNumber}`)}>
                          <span className={`fj-act-icon t-${it.kind}`}>
                            <i className={`bi ${WELCOME_ICON[it.kind] || 'bi-journal-text'}`} aria-hidden />
                          </span>
                          <span className="jd-act-body">
                            <b>{it.title}</b>
                            <small>{WELCOME_LABEL[it.kind] || it.kind}{it.required ? ' · must be completed' : ' · optional'}</small>
                          </span>
                          <span className="jd-act-end">
                            {it.estimatedMinutes > 0 && <span className="jd-act-time"><i className="bi bi-clock" aria-hidden /> {mins(it.estimatedMinutes)}</span>}
                            <span className={`fjm-check${it.done ? ' on' : ''}`} aria-label={it.done ? 'Done' : 'Not done yet'}>{it.done && <i className="bi bi-check-lg" />}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            );
          })()}

          {openOrientationDay === null && dayLoading && <div className="fj-skeleton">Loading day…</div>}

          {openOrientationDay === null && !dayLoading && lockedDay && (
            <LockedDay
              day={lockedDay.day} title={lockedDay.title} topic={lockedDay.topic}
              currentDay={currentDay}
              welcomeLabel={welcomeFirst && welcomeOutstanding ? welcomeOutstanding.day : null}
              trialDays={(journey as any)?.trialDays}
              onBack={() => (welcomeFirst && welcomeOutstanding
                ? nav(`/careerpilot/journey/welcome/${welcomeOutstanding.dayNumber}`)
                : selectDay(currentDay))}
            />
          )}

          {openOrientationDay === null && !dayLoading && dayError && (
            <div className="fj-msg err">
              <b>{dayError}</b>
              <button type="button" className="fj-start" onClick={() => setDayRetry(n => n + 1)}>Try again</button>
            </div>
          )}

          {openOrientationDay === null && !dayLoading && day && (
            <>
              <div className="jd-day-head">
                <span className="jd-day-ic" aria-hidden><i className="bi bi-calendar2-week" /></span>
                <div className="jd-day-title">
                  <h2>Day {day.day} – {day.title}</h2>
                  {/* The one piece of planning a student sees, in the unit's own words. */}
                  {day.objective && <p>{day.objective}</p>}
                </div>
                <div className="jd-day-meta">
                  <span className={`jd-tag s-${day.status.toLowerCase()}`}>
                    {day.status === 'COMPLETED' ? 'Completed' : day.status === 'CURRENT' ? 'Today' : 'Upcoming'}
                  </span>
                  {day.minutes > 0 && <span className="jd-time"><i className="bi bi-clock" aria-hidden /> {approx(day.minutes)}</span>}
                </div>
              </div>

              {day.outcomes.length > 0 && (
                <div className="jd-outcomes">
                  <span className="jd-outcomes-ic" aria-hidden><i className="bi bi-bullseye" /></span>
                  <div>
                    <b>{isTodayOpen ? 'Today’s Learning Outcomes' : 'Learning Outcomes'}</b>
                    <ul>{day.outcomes.map((o, i) => <li key={i}><i className="bi bi-check-circle-fill" aria-hidden /> {o}</li>)}</ul>
                  </div>
                </div>
              )}

              {acts.length === 0 ? (
                <p className="fj-empty">This day is still being prepared. It will appear here before you reach it.</p>
              ) : (
                <>
                  <ol className="jd-acts">
                    {shownActs.map((a: FoundationJourneyActivity) => (
                      <li key={a.id || `${a.order}`} className={`${a.gating ? 'gating' : ''}${a.done ? ' done' : ''}`}>
                        <button type="button" className="jd-act" disabled={!enrollmentId} onClick={() => openPlayer(day.day)}>
                          <span className={`fj-act-icon t-${a.type}`}>
                            <i className={`bi ${ICON_FILLED[a.type] || ICON[a.type] || 'bi-journal-text'}`} aria-hidden />
                          </span>
                          <span className="jd-act-body">
                            <b>{a.title}</b>
                            <small>{TYPE_HINT[a.type] || TYPE_LABEL[a.type] || a.type}{a.gating ? ' · must be completed' : ''}</small>
                          </span>
                          <span className="jd-act-end">
                            {a.minutes > 0 && <span className="jd-act-time"><i className="bi bi-clock" aria-hidden /> {mins(a.minutes)}</span>}
                            {(a.xp ?? 0) > 0 && <span className="fjm-xp">+{a.xp} XP</span>}
                            <span className={`fjm-check${a.done ? ' on' : ''}`} aria-label={a.done ? 'Done' : 'Not done yet'}>{a.done && <i className="bi bi-check-lg" />}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  {acts.length > FIRST_TASKS && (
                    <div className="jd-more">
                      <span><i className="bi bi-stack" aria-hidden /> {hiddenActs > 0 ? `+ ${hiddenActs} more ${hiddenActs === 1 ? 'task' : 'tasks'} ${isTodayOpen ? 'for today' : 'on this day'}` : `All ${acts.length} tasks shown`}</span>
                      <button type="button" onClick={() => setShowAllTasks(v => !v)} aria-expanded={showAllTasks}>
                        {showAllTasks ? <>Show less <i className="bi bi-arrow-up" aria-hidden /></> : <>View More ({hiddenActs}) <i className="bi bi-arrow-down" aria-hidden /></>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        {/* The side column: the day's goal, what it teaches, and where it leads. */}
        <aside className="jd-side" aria-label="About this day">
          {openOrientationDay === null && !dayLoading && day && acts.length > 0 && (
            <div className="jd-card">
              <div className="jd-card-head">
                <span className="jd-card-ic goal" aria-hidden><i className="bi bi-bullseye" /></span>
                <div>
                  <span className="jd-card-title"><b>Day Goal</b><span className="jd-count">{doneActs} / {acts.length} Tasks</span></span>
                  <p>{day.status === 'COMPLETED'
                    ? `Day complete${dayXp > 0 ? ` — ${dayXp} XP earned` : ''}.`
                    : dayXp > 0 ? `Complete all tasks and earn ${dayXp} XP.` : 'Complete every task to finish the day.'}</p>
                </div>
              </div>
              <div className="jd-bar" role="progressbar" aria-valuenow={doneActs} aria-valuemin={0} aria-valuemax={acts.length} aria-label="Tasks done today">
                <i style={{ width: `${barWidth(acts.length ? Math.round((doneActs / acts.length) * 100) : 0)}%` }} />
              </div>
              {(day.dayBonusXp ?? 0) > 0 && (
                <p className="jd-bonus"><i className="bi bi-gift-fill" aria-hidden /> <span>Includes a <b>+{day.dayBonusXp} XP</b> day bonus</span></p>
              )}
            </div>
          )}

          {openOrientationDay === null && !dayLoading && day && acts.length > 0 && (
            <div className="jd-card">
              <div className="jd-card-head">
                <span className="jd-card-ic learn" aria-hidden><i className="bi bi-book" /></span>
                <div><b>{isTodayOpen ? 'Today You’ll Learn' : 'You’ll Learn'}</b></div>
              </div>
              <ul className="jd-learn">
                {learnList.map(t => <li key={t}>{t}</li>)}
                {openSummary?.topic && <li>Topic: <b>{openSummary.topic}</b></li>}
                {openSummary?.module && <li>Part of: <b>{openSummary.module}</b></li>}
              </ul>
              {makeup && <p className="jd-topic">This day: <b>{makeup}</b></p>}
            </div>
          )}

          {openOrientationDay !== null && welcomeDay && welcomeDay.items.length > 0 && (() => {
            const done = welcomeDay.items.filter(i => i.done).length;
            return (
              <div className="jd-card">
                <div className="jd-card-head">
                  <span className="jd-card-ic goal" aria-hidden><i className="bi bi-bullseye" /></span>
                  <div>
                    <span className="jd-card-title"><b>Day Goal</b><span className="jd-count">{done} / {welcomeDay.items.length} Tasks</span></span>
                    <p>Finish the welcome tasks — Day 1 opens when the welcome is done.</p>
                  </div>
                </div>
                <div className="jd-bar" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={welcomeDay.items.length} aria-label="Welcome tasks done">
                  <i style={{ width: `${barWidth(Math.round((done / welcomeDay.items.length) * 100))}%` }} />
                </div>
              </div>
            );
          })()}

          {nextWelcome && (
            <button type="button" className="jd-card jd-next" onClick={() => selectOrientationDay(nextWelcome.dayNumber)}>
              <span className="jd-card-ic next" aria-hidden><i className="bi bi-arrow-up-right" /></span>
              <span className="jd-next-tx"><b>Next Step</b><span>Day {nextWelcome.day} – {nextWelcome.title}</span></span>
              <span className="jd-next-go" aria-hidden><i className="bi bi-arrow-right" /></span>
            </button>
          )}
          {nextSummary && (
            <button type="button" className="jd-card jd-next" onClick={() => selectDay(nextSummary.day)}>
              <span className="jd-card-ic next" aria-hidden><i className="bi bi-arrow-up-right" /></span>
              <span className="jd-next-tx"><b>Next Step</b><span>Day {nextSummary.day} – {nextSummary.title}</span></span>
              <span className="jd-next-go" aria-hidden><i className="bi bi-arrow-right" /></span>
            </button>
          )}
          {openOrientationDay === null && !nextSummary && day && day.day === totalDays && (
            <div className="jd-card jd-next last">
              <span className="jd-card-ic next" aria-hidden><i className="bi bi-flag-fill" /></span>
              <span className="jd-next-tx"><b>The last day</b><span>Finish it and your {stage} Journey is complete.</span></span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default FoundationJourneyPage;
