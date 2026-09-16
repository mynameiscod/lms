/**
 * CareerPilot Foundation Journey — 90 Days.
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
  FoundationJourney as Journey, FoundationJourneyDay, FoundationJourneyActivity,
} from '../../api/passportApi';
import SectionLock from './SectionLock';
import { dayState, dayRanges, initialDay, STATE_LABEL } from './foundationRoadmapPresenter';
import './foundationJourney.css';

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

const mins = (n: number) =>
  (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

/** Shown before a journey exists. Still states the length, because ninety is the promise. */
/**
 * Shown before a journey exists. Still states the length, because ninety is the promise.
 *
 * For a student the unit engine plans, the skill check is what creates the journey, so the one
 * thing to press is offered here rather than leaving them on a message with nothing to do.
 */
const NotReady: React.FC<{ totalDays: number; message?: string; onAssess?: () => void; notConfigured?: boolean; preparing?: boolean }> = ({ totalDays, message, onAssess, notConfigured, preparing }) => (
  <div className="fj-page">
    <header className="fj-head">
      <div>
        <span className="fj-kicker">CAREERPILOT</span>
        <h1>Foundation Journey</h1>
        <p className="fj-sub">{totalDays} learning days</p>
      </div>
    </header>
    {/* Not configured is said as it is: no shorter plan is shown in its place. */}
    <div className={`fj-msg ${notConfigured ? 'err' : 'info'}`}>
      <b>{message || 'Your journey has not been created yet.'}</b>
      <p>
        {notConfigured
          ? `Your Foundation programme is ${totalDays} learning days. It will appear here as soon as it has been set up.`
          : preparing
            ? `Your Foundation programme is ${totalDays} learning days, personalised to what you already know. This page updates by itself.`
            : `Your Foundation programme is ${totalDays} learning days, personalised to what you already know. It appears here once your skill check is complete.`}
      </p>
      {onAssess && (
        <button type="button" className="fj-start" onClick={onAssess}>Take your skill check</button>
      )}
    </div>
  </div>
);

/**
 * Before membership: the first days of the learner's own plan, and the rest locked.
 *
 * Topics and what each day contains, so the plan is visibly theirs — nothing to open. Membership
 * generates all ninety days from the same skill check and this page becomes the full journey.
 */
const PreviewJourney: React.FC<{ journey: Journey; onUnlocked: () => void }> = ({ journey, onUnlocked }) => {
  const days = journey.preview || [];
  const [open, setOpen] = useState<number>(days[0]?.day ?? 1);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState('');
  const total = journey.totalDays ?? 90;
  const locked = journey.lockedDays ?? Math.max(0, total - days.length);
  const day = days.find(d => d.day === open) || days[0];

  const unlock = async () => {
    setPaying(true); setMsg('');
    try {
      const r: any = await passportApi.membershipCheckout();
      if (r?.ok) onUnlocked();
      else setMsg(r?.message || 'Payment did not complete.');
    } catch (e: any) {
      setMsg(e?.message || 'Payment did not complete.');
    }
    setPaying(false);
  };

  return (
    <div className="fj-page">
      <header className="fj-head">
        <div>
          <span className="fj-kicker">CAREERPILOT</span>
          <h1>Foundation Journey</h1>
          <p className="fj-sub">Your {total}-day roadmap · first {days.length} days</p>
        </div>
      </header>

      <div className="fj-msg info" style={{ marginBottom: 18 }}>
        <b>🔒 Unlock to see your full {total}-day roadmap</b>
        <p>
          These are the first {days.length} days of your personalised plan, built from your skill check.
          Take membership and all {total} days are generated for you and unlocked.
        </p>
        <button type="button" className="fj-start" onClick={unlock} disabled={paying}>
          {paying ? 'Opening payment…' : `Unlock all ${total} days`}
        </button>
        {msg && <p>{msg}</p>}
      </div>

      <section className="fj-strip-wrap" aria-label="Preview days">
        <ol className="fj-strip">
          {days.map(d => (
            <li key={d.day}>
              <button
                type="button"
                className={`fj-chip${d.day === 1 ? ' s-current' : ''}${open === d.day ? ' open' : ''}`}
                onClick={() => setOpen(d.day)}
                title={`Day ${d.day} — ${d.title}`}
              >
                <span className="fj-chip-n">{d.day}</span>
              </button>
            </li>
          ))}
          {locked > 0 && (
            <li>
              <span className="fj-chip" style={{ width: 'auto', padding: '0 12px', cursor: 'default' }}
                    title={`Days ${days.length + 1}–${total} unlock with membership`}>
                <i className="bi bi-lock-fill" aria-hidden />&nbsp;{days.length + 1}–{total}
              </span>
            </li>
          )}
        </ol>
      </section>

      {day && (
        <section className="fj-day">
          <div className="fj-day-head">
            <div>
              <span className="fj-status">Preview</span>
              <h2>Day {day.day} · {day.title}</h2>
              {day.objective && <p className="fj-objective">{day.objective}</p>}
            </div>
            {day.minutes > 0 && <span className="fj-mins">{mins(day.minutes)}</span>}
          </div>
          {day.outcomes.length > 0 && (
            <div className="fj-outcomes">
              <span>By the end of this day you can</span>
              <ul>{day.outcomes.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
          )}
          <ol className="fj-acts">
            {day.activities.map((a, i) => (
              <li key={i} className={a.gating ? 'gating' : ''}>
                <span className="fj-act-icon"><i className={`bi ${ICON[a.type] || 'bi-journal-text'}`} aria-hidden /></span>
                <span className="fj-act-body">
                  <b>{a.title}</b>
                  <small>
                    {TYPE_LABEL[a.type] || a.type}
                    {a.minutes > 0 && <> · {mins(a.minutes)}</>}
                    {' · opens with membership'}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};

/**
 * A day the student cannot open yet, said as such — never an empty panel.
 *
 * Shows only what the roadmap already knows about the day (its number, title and topic). The day's
 * content is not fetched for it, and the server would refuse it if it were.
 */
const LockedDay: React.FC<{ day: number; title?: string | null; topic?: string | null; currentDay: number; onBack: () => void }> =
  ({ day, title, topic, currentDay, onBack }) => (
    <div className="fj-locked" role="status">
      <span className="fj-locked-icon" aria-hidden><i className="bi bi-lock-fill" /></span>
      <span className="fj-status s-locked">Locked</span>
      <h2>Day {day}{title ? ` · ${title}` : ''}</h2>
      {topic && <p className="fj-locked-topic">{topic}</p>}
      <p className="fj-locked-title">This learning day is locked</p>
      <p className="fj-locked-text">Complete your current learning day to continue your journey.</p>
      <button type="button" className="fj-start" onClick={onBack}>Back to current day (Day {currentDay})</button>
    </div>
  );

const FoundationJourneyPage: React.FC = () => {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [day, setDay] = useState<FoundationJourneyDay | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [lockedDay, setLockedDay] = useState<{ day: number; title?: string | null; topic?: string | null } | null>(null);
  const [dayError, setDayError] = useState('');
  const [dayRetry, setDayRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const stripRef = useRef<HTMLOListElement | null>(null);

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
    const next = new URLSearchParams(params);
    next.set('day', String(n));
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => { load(); }, [load]);

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
    setDay(null); setLockedDay(null); setDayError('');

    /**
     * A day the overview reports locked is not requested at all: the locked card is shown from what the
     * roadmap already knows. The server remains the authority — if it refuses a day the overview thought
     * open, that refusal is shown as the same locked card rather than as an empty panel.
     */
    const summary = (journey?.days || []).find(d => d.day === openDay);
    if (summary && dayState(summary) === 'LOCKED') {
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
        if (e?.response?.status === 403 && body?.reason === 'DAY_LOCKED') {
          setLockedDay({ day: openDay, title: body?.title || summary?.title, topic: summary?.topic });
        } else {
          setDayError(body?.message || 'This day could not be loaded.');
        }
      })
      .finally(() => { if (!cancelled) setDayLoading(false); });
    return () => { cancelled = true; };
  }, [openDay, journey, dayRetry]);

  /** The selected day stays in view on the strip — Day 90 included. */
  useEffect(() => {
    if (openDay === null) return;
    const chip = document.getElementById(`fj-chip-${openDay}`);
    if (chip && typeof chip.scrollIntoView === 'function') chip.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [openDay, loading]);

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current?.parentElement;
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' });
  };
  const jumpTo = (from: number) => {
    const chip = document.getElementById(`fj-chip-${from}`);
    if (chip && typeof chip.scrollIntoView === 'function') chip.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'smooth' });
  };

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
  if (!journey) return <NotReady totalDays={90} />;
  // No preview for this learner: the membership offer is the page.
  if (!journey.available && journey.reason === 'MEMBERSHIP_REQUIRED') return <SectionLock section="roadmap" />;
  if (!journey.available) {
    return (
      <NotReady
        totalDays={journey.totalDays}
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
  const totalDays = journey.totalDays ?? 90;
  const currentDay = journey.currentDay ?? 1;
  const completedCount = journey.completedCount ?? 0;
  const percentComplete = journey.percentComplete ?? 0;
  const days = journey.days ?? [];

  return (
    <div className="fj-page">
      <header className="fj-head">
        <div>
          <span className="fj-kicker">CAREERPILOT</span>
          <h1>Foundation Journey</h1>
          {/* Identical for every student. The count is the promise, not a score. */}
          <p className="fj-sub">Day {currentDay} of {totalDays}</p>
        </div>
        <div className="fj-progress-card">
          <b>{percentComplete}%</b>
          <span>{completedCount} of {totalDays} days done</span>
        </div>
      </header>

      <div className="fj-bar" role="progressbar" aria-valuenow={percentComplete}
           aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
        <span style={{ width: `${percentComplete}%` }} />
      </div>

      {/* The ninety, as a strip. Scrolls horizontally on a phone rather than reflowing into
          a grid nobody can read — with jumps and arrows, so the days beyond the edge are never a
          guess, and a lock on every day that cannot be opened yet. */}
      <nav className="fj-range" aria-label="Jump to days">
        <button type="button" className="fj-arrow" onClick={() => scrollStrip(-1)} aria-label="Earlier days">
          <i className="bi bi-chevron-left" aria-hidden />
        </button>
        <div className="fj-range-jumps">
          {dayRanges(totalDays).map(r => (
            <button type="button" key={r.from} className="fj-range-btn" onClick={() => jumpTo(r.from)}>{r.label}</button>
          ))}
        </div>
        <button type="button" className="fj-arrow" onClick={() => scrollStrip(1)} aria-label="Later days">
          <i className="bi bi-chevron-right" aria-hidden />
        </button>
      </nav>
      <section className="fj-strip-wrap" aria-label={`All ${totalDays} days`}>
        <ol className="fj-strip" ref={stripRef}>
          {days.map(d => {
            const state = dayState(d);
            return (
              <li key={d.day}>
                <button
                  type="button"
                  id={`fj-chip-${d.day}`}
                  className={`fj-chip s-${d.status.toLowerCase()}${state === 'LOCKED' ? ' s-locked' : ''}${openDay === d.day ? ' open' : ''}`}
                  onClick={() => selectDay(d.day)}
                  aria-current={d.day === currentDay ? 'step' : undefined}
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
        </ol>
      </section>

      <section className="fj-day" aria-live="polite">
        {dayLoading && <div className="fj-skeleton">Loading day…</div>}

        {!dayLoading && lockedDay && (
          <LockedDay
            day={lockedDay.day} title={lockedDay.title} topic={lockedDay.topic}
            currentDay={currentDay} onBack={() => selectDay(currentDay)}
          />
        )}

        {!dayLoading && dayError && (
          <div className="fj-msg err">
            <b>{dayError}</b>
            <button type="button" className="fj-start" onClick={() => setDayRetry(n => n + 1)}>Try again</button>
          </div>
        )}

        {!dayLoading && day && (
          <>
            <div className="fj-day-head">
              <div>
                <span className={`fj-status s-${day.status.toLowerCase()}`}>
                  {day.status === 'COMPLETED' ? 'Completed'
                    : day.status === 'CURRENT' ? 'Today' : 'Upcoming'}
                </span>
                <h2>Day {day.day} · {day.title}</h2>
                {/* The one piece of planning a student sees, in the unit's own words. */}
                {day.objective && <p className="fj-objective">{day.objective}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {day.minutes > 0 && <span className="fj-mins">{mins(day.minutes)}</span>}
                {/* The day opens inside CareerPilot, where each lesson, checkpoint and project
                    is worked through without leaving the member rail. Locking stays the
                    server's: a day not yet reachable says so there. */}
                {enrollmentId && (
                  <button
                    type="button"
                    className={`fj-start${day.status === 'CURRENT' ? '' : ' ghost'}`}
                    onClick={() => nav(`/careerpilot/journey/day/${day.day}`)}
                  >
                    {day.status === 'CURRENT' ? "Start today's work"
                      : day.status === 'COMPLETED' ? 'Review this day' : 'Open this day'}
                  </button>
                )}
              </div>
            </div>

            {day.outcomes.length > 0 && (
              <div className="fj-outcomes">
                <span>By the end of today you can</span>
                <ul>{day.outcomes.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </div>
            )}

            {day.activities.length === 0 ? (
              <p className="fj-empty">
                This day is still being prepared. It will appear here before you reach it.
              </p>
            ) : (
              <ol className="fj-acts">
                {day.activities.map((a: FoundationJourneyActivity) => (
                  <li key={a.id || `${a.order}`} className={a.gating ? 'gating' : ''}>
                    <span className="fj-act-icon">
                      <i className={`bi ${ICON[a.type] || 'bi-journal-text'}`} aria-hidden />
                    </span>
                    <span className="fj-act-body">
                      <b>{a.title}</b>
                      <small>
                        {TYPE_LABEL[a.type] || a.type}
                        {a.minutes > 0 && <> · {mins(a.minutes)}</>}
                        {a.gating && <> · must be completed</>}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default FoundationJourneyPage;
