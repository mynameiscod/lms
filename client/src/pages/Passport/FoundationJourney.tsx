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
import { OrientationDayPanel } from './Orientation';
import { dayState, dayRanges, initialDay, STATE_LABEL } from './foundationRoadmapPresenter';
import './foundationJourney.css';
import './foundationPreview.css';
import './foundationMember.css';
import './orientation.css';

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
  const previewDays = journey.preview || [];
  const [open, setOpen] = useState<number>(previewDays[0]?.day ?? 1);
  const { unlock, busy, msg, priceInr } = useUnlock();
  const stripRef = useRef<HTMLOListElement | null>(null);

  /** The programme's own name, from the server. Falls back to the only name this page ever had. */
  const stage = journey.stageLabel || 'Foundation';
  const totalDays = journey.totalDays ?? 90;
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

  const marks = [
    { key: 'start', label: 'Day 1', at: 1 },
    { key: 'preview', label: `Day ${openCount}`, at: openCount },
    { key: 'end', label: `Day ${totalDays}`, at: totalDays },
  ];

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current?.parentElement;
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' });
  };
  const jumpTo = (from: number) => {
    const chip = document.getElementById(`fj-chip-${from}`);
    if (chip && typeof chip.scrollIntoView === 'function') chip.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'smooth' });
  };

  return (
    <div className="fj-page fjm fjm-preview">
      <section className="fjm-hero">
        <div className="fjm-hero-copy">
          <span className="fjm-eyebrow">Day 1 of {totalDays}</span>
          <h1>{stage} <span>Journey</span></h1>
          <p>Your personalised plan, built from your skill check. The first {openCount} days are open to read — membership opens all {totalDays}.</p>
          <div className="fjm-chips">
            <span><i className="bi bi-calendar3" /> {totalDays} learning days</span>
            <span><i className="bi bi-eye" /> {openCount} days to preview</span>
            {avgMins > 0 && <span><i className="bi bi-clock" /> About {mins(avgMins)} a day</span>}
          </div>
        </div>

        {/* The same column the member's progress sits in, saying what is true before membership. */}
        <div className="fjm-momentum">
          <span className="fjm-eyebrow">My {totalDays}</span>
          <div className="fjm-days on">
            <span className="ic"><i className="bi bi-eye-fill" aria-hidden /></span>
            <div>
              <b>{openCount} of {totalDays} days open</b>
              <span>{lockedCount > 0 ? `${lockedCount} unlock with membership` : 'Every day is open'}</span>
            </div>
            <i className="fjm-days-art" aria-hidden="true"><em /><em /><em /></i>
          </div>
          <ol className="fjm-steps2">
            {marks.map((m, i) => (
              <li key={m.key} className={i === 0 ? 'current' : ''}><i /><span>{m.label}</span></li>
            ))}
          </ol>
          <button type="button" className="fjm-challenge" onClick={() => unlock(onUnlocked)} disabled={busy}>
            <span className="ic"><i className="bi bi-unlock-fill" aria-hidden /></span>
            <div>
              <b>{busy ? 'Opening payment…' : `Unlock all ${totalDays} days`}</b>
              <span>Every lesson, checkpoint and project</span>
              {priceInr ? <em>₹{priceInr}</em> : null}
            </div>
            <i className="bi bi-chevron-right" aria-hidden />
          </button>
          {msg && <p className="fj-msg err">{msg}</p>}
        </div>

        <div className="fjm-ring" role="progressbar" aria-valuenow={openPct} aria-valuemin={0} aria-valuemax={100}
             aria-label="Days open to preview" style={{ ['--fjm-deg' as any]: `${openPct * 3.6}deg` }}>
          <div><strong>{openCount}</strong><span>days to read</span></div>
        </div>
      </section>

      {/* The whole programme, as a strip — the same one a member scrolls, with the locks a
          non-member has. Days past the preview are named by number and open nothing. */}
      <div className="fjm-strip-card">
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
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(n => {
              const readable = openSet.has(n);
              const title = previewDays.find(d => d.day === n)?.title;
              return (
                <li key={n}>
                  <button
                    type="button"
                    id={`fj-chip-${n}`}
                    className={`fj-chip s-upcoming${readable ? '' : ' s-locked'}${open === n ? ' open' : ''}`}
                    onClick={() => readable && setOpen(n)}
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
          </ol>
        </section>
      </div>

      {day && (
        <section className="fj-day" aria-live="polite">
          <div className="fj-day-head">
            <div>
              <span className="fj-status s-upcoming"><i className="bi bi-eye" /> Preview</span>
              <h2>Day {day.day} · {day.title}</h2>
              {day.objective && <p className="fj-objective">{day.objective}</p>}
            </div>
            {day.minutes > 0 && <span className="fj-mins">{mins(day.minutes)}</span>}
          </div>

          {day.outcomes.length > 0 && (
            <div className="fjp-outcomes">
              <span>By the end of this day you can</span>
              <ul>{day.outcomes.map((o, i) => <li key={i}><i className="bi bi-check2-circle" /> {o}</li>)}</ul>
            </div>
          )}

          <h3 className="fjp-acts-title">What this day contains</h3>
          <ol className="fjp-acts">
            {day.activities.map((a, i) => (
              <li key={i} className={a.gating ? 'gating' : ''}>
                <span className={`ic t-${a.type}`}><i className={`bi ${ICON[a.type] || 'bi-journal-text'}`} aria-hidden /></span>
                <span className="body">
                  <b>{a.title}</b>
                  <small>{TYPE_LABEL[a.type] || a.type}{a.minutes > 0 && <> · {mins(a.minutes)}</>}</small>
                </span>
                <span className="lk"><i className="bi bi-lock-fill" aria-hidden /> Membership</span>
              </li>
            ))}
          </ol>

          <div className="fjp-day-cta">
            <div><b>Ready to start Day {day.day}?</b><span>Membership opens every lesson, checkpoint and project — all {totalDays} days.</span></div>
            <button type="button" className="fjp-btn primary" onClick={() => unlock(onUnlocked)} disabled={busy}>{unlockLabel}</button>
          </div>
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

/**
 * The welcome, on the plan screen.
 *
 * Shown while a member has orientation left: as the way in for somebody who must finish it before
 * Day 1, and as an invitation for somebody already learning, who is never blocked by it.
 */
const OrientationCard: React.FC<{ view: OrientationView; onOpen: () => void }> = ({ view, onOpen }) => {
  const left = view.totalDays - view.completedDays;
  return (
    <section className={`fj-orient${view.mandatory ? ' must' : ''}`}>
      <span className="fj-orient-ic"><i className={`bi ${view.mandatory ? 'bi-signpost-split-fill' : 'bi-stars'}`} aria-hidden /></span>
      <div className="fj-orient-tx">
        <b>{view.mandatory ? 'Start with your welcome' : 'A short welcome, whenever you like'}</b>
        <span>
          {view.mandatory
            ? `${left} short ${left === 1 ? 'day' : 'days'} to set you up — your learning days open once they are done.`
            : `${left} short ${left === 1 ? 'day' : 'days'} we added for new members. Your plan stays open either way.`}
        </span>
      </div>
      <button type="button" className="fj-orient-btn" onClick={onOpen}>
        {view.completedDays ? 'Continue' : 'Start'} <i className="bi bi-arrow-right" aria-hidden />
      </button>
    </section>
  );
};

const FoundationJourneyPage: React.FC = () => {
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
        const open = v.days.some(d => d.dayNumber === asked && !d.locked) ? asked
          : v.mandatory && !v.complete ? v.nextDay
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
  /** The welcome day the panel is showing, from the view the page already holds. */
  const welcomeDay = openOrientationDay === null
    ? null
    : (orientation?.days || []).find(d => d.dayNumber === openOrientationDay) || null;
  const totalDays = journey.totalDays ?? 90;
  const currentDay = journey.currentDay ?? 1;
  const completedCount = journey.completedCount ?? 0;
  const percentComplete = journey.percentComplete ?? 0;
  const days = journey.days ?? [];

  /**
   * The banner's middle column is read from what this page already holds — the overview's day
   * summaries and, when the day being read IS today, that day's own tasks. Nothing is fetched for
   * it, and a figure the page was never given is left out rather than guessed.
   */
  const daysLeft = Math.max(0, totalDays - completedCount);
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
  /* Four marks taken off the real day number: the start, today, the next week boundary, day ninety. */
  const weekMark = Math.min(totalDays, Math.ceil((currentDay + 1) / 7) * 7);
  const lastWeek = weekMark >= totalDays;
  const marks = [
    { key: 'start', label: 'Day 1', at: 1 },
    { key: 'today', label: `Day ${currentDay}`, at: currentDay },
    { key: 'week', label: lastWeek ? 'Final week' : `Day ${weekMark}`, at: lastWeek ? Math.max(currentDay + 1, totalDays - 6) : weekMark },
    { key: 'end', label: `Day ${totalDays}`, at: totalDays },
  ];
  /* Today opens in the player when there is an enrolment to open it with; otherwise the strip selects it. */
  const openToday = () => {
    if (enrollmentId) nav(`/careerpilot/journey/day/${currentDay}`);
    else selectDay(currentDay);
  };

  return (
    <div className="fj-page fjm">
      <section className="fjm-hero">
        <div className="fjm-hero-copy">
          {/* Identical for every student. The count is the promise, not a score. */}
          <span className="fjm-eyebrow">Day {currentDay} of {totalDays}</span>
          <h1>{stage} <span>Journey</span></h1>
          <p>One learning day at a time. Finish today’s tasks and the next day opens.</p>
          <div className="fjm-chips">
            <span><i className="bi bi-check2-circle" /> {completedCount} of {totalDays} days done</span>
            <span><i className="bi bi-flag" /> {Math.max(0, totalDays - completedCount)} to go</span>
          </div>
        </div>
        {/* My ninety, in the member's own numbers: the days finished, where today sits between day
            one and day ninety, and what today still holds — not decoration. */}
        <div className="fjm-momentum">
          {/* Named from the programme, not from ninety: a second-year's plan is 110 days. */}
          <span className="fjm-eyebrow">My {totalDays}</span>
          <div className={`fjm-days${completedCount > 0 ? ' on' : ''}`}>
            <span className="ic"><i className="bi bi-calendar2-check-fill" aria-hidden /></span>
            <div>
              <b>{completedCount} of {totalDays} days done</b>
              <span>{daysLeft > 0 ? `${daysLeft} learning ${daysLeft === 1 ? 'day' : 'days'} to go` : 'Every day finished — well done'}</span>
            </div>
            <i className="fjm-days-art" aria-hidden="true"><em /><em /><em /></i>
          </div>
          <ol className="fjm-steps2">
            {marks.map((m, i) => {
              const state = currentDay >= m.at && i !== 1 ? 'done' : (i === 1 ? 'current' : '');
              return <li key={m.key} className={state}><i /><span>{m.label}</span></li>;
            })}
          </ol>
          {todayLine && (
            <button type="button" className="fjm-challenge" onClick={openToday}>
              <span className="ic"><i className={`bi ${todayDone ? 'bi-check-circle-fill' : 'bi-play-circle-fill'}`} aria-hidden /></span>
              <div>
                <b>{todayDone ? 'Today is finished' : 'Today’s work'}</b>
                <span>Day {currentDay}{todaySummary?.title ? ` · ${todaySummary.title}` : ''}</span>
                <em>{todayLine}</em>
              </div>
              <i className="bi bi-chevron-right" aria-hidden />
            </button>
          )}
        </div>
        <div className="fjm-ring" role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}
             aria-label="Journey progress" style={{ ['--fjm-deg' as any]: `${percentComplete * 3.6}deg` }}>
          <div><strong>{percentComplete}%</strong><span>complete</span></div>
        </div>
      </section>

      {/* The card invites; once the welcome is finished it stops asking. The days stay in the strip. */}
      {orientation && !orientation.complete && (
        <OrientationCard view={orientation} onOpen={() => selectOrientationDay(orientation.nextDay ?? orientation.days[0]?.dayNumber ?? 1)} />
      )}

      {/* The ninety, as a strip. Scrolls horizontally on a phone rather than reflowing into
          a grid nobody can read — with jumps and arrows, so the days beyond the edge are never a
          guess, and a lock on every day that cannot be opened yet. */}
      <div className="fjm-strip-card">
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
                onClick={() => !o.locked && selectOrientationDay(o.dayNumber)}
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
      </div>

      <section className="fj-day" aria-live="polite">
        {/*
          * A WELCOME DAY, READ WHERE THE LEARNING DAYS ARE READ.
          *
          * Same panel, same place on the page, so the plan reads as one sequence: 0.1 through 0.5
          * and then Day 1. Finishing one opens the next — the gate is the server's, exactly as it
          * is for a learning day, and a locked chip cannot be clicked to get here.
          *
          * Rendered instead of the learning day rather than beside it, because exactly one of the
          * two is ever open.
          */}
        {openOrientationDay !== null && welcomeDay && (
          <OrientationDayPanel
            key={welcomeDay.dayNumber}
            day={welcomeDay}
            onChanged={setOrientation}
            onFinished={next => {
              if (next) { selectOrientationDay(next); return; }
              /*
               * The welcome is over. Reload the journey so the strip shows the days as open,
               * then land the member on the day they have been waiting for.
               */
              load();
              selectDay(currentDay);
            }}
          />
        )}

        {openOrientationDay === null && dayLoading && <div className="fj-skeleton">Loading day…</div>}

        {openOrientationDay === null && !dayLoading && openSummary && openDay !== null && openDay > currentDay && openSummary.status !== 'COMPLETED' && (
          <PlacementOffer key={openDay} topic={openSummary.topic ?? null} day={openDay} />
        )}

        {openOrientationDay === null && !dayLoading && lockedDay && (
          <LockedDay
            day={lockedDay.day} title={lockedDay.title} topic={lockedDay.topic}
            currentDay={currentDay} onBack={() => selectDay(currentDay)}
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
                  <li key={a.id || `${a.order}`} className={`${a.gating ? 'gating' : ''}${a.done ? ' done' : ''}`}>
                    <span className={`fj-act-icon t-${a.type}`}>
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
                    {(a.xp ?? 0) > 0 && <span className="fjm-xp">+{a.xp} XP</span>}
                    <span className={`fjm-check${a.done ? ' on' : ''}`} aria-label={a.done ? 'Done' : 'Not done yet'}>{a.done && <i className="bi bi-check-lg" />}</span>
                  </li>
                ))}
              </ol>
            )}
            {(day.dayBonusXp ?? 0) > 0 && day.activities.length > 0 && (
              <p className={`fjm-bonus${day.status === 'COMPLETED' ? ' done' : ''}`}>
                <i className="bi bi-gift-fill" /> {day.status === 'COMPLETED' ? 'Day complete —' : 'Finish every task for a'} <b>+{day.dayBonusXp} XP</b> day bonus
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default FoundationJourneyPage;
