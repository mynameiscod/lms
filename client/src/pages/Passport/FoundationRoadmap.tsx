/**
 * CareerPilot — My Roadmap, for whichever programme the learner is on.
 *
 * ── WHAT THIS SCREEN IS FOR ───────────────────────────────────────────────────────────────
 *
 * "Where am I going over these ninety days?" The whole personalised journey at a glance: every day,
 * the topic it belongs to, what kind of day it is, and where the student is. Learning happens in
 * My N Days; this page sends them there.
 *
 * ── WHAT IT READS ─────────────────────────────────────────────────────────────────────────
 *
 * The journey already persisted for this student — the same overview the day list reads. Nothing is
 * composed or generated here, so a refresh shows the same ninety days, and a reassessment that rewrote
 * future days is simply what the next read returns.
 *
 * ── ROADMAP VISIBILITY IS NOT CONTENT ACCESS ──────────────────────────────────────────────
 *
 * A locked day shows its title and topic and nothing it contains: the overview carries no activities,
 * questions or assignment detail for any day, and a locked day is not a link. Whether a day is locked is
 * the server's answer, never worked out here.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { FoundationJourney as Journey } from '../../api/passportApi';
import FoundationJourneyPage from './FoundationJourney';
import { useUnlock } from './SectionLock';
import {
  dayState, canOpenDay, planLinkFor, groupJourneyDays, dayRanges, KIND_LABEL, STATE_LABEL, RoadmapGroup,
} from './foundationRoadmapPresenter';
import './foundationJourney.css';
import './foundationRoadmap.css';
import './foundationMember.css';

const GROUP_LABEL: Record<RoadmapGroup['state'], string> = {
  COMPLETED: 'Completed',
  CURRENT: 'In progress',
  IN_PROGRESS: 'In progress',
  AVAILABLE: 'Available',
  LOCKED: 'Upcoming',
};

const STATE_ICON: Record<string, string> = {
  COMPLETED: 'bi-check-lg',
  CURRENT: 'bi-play-fill',
  AVAILABLE: 'bi-circle',
  SKIPPED: 'bi-exclamation',
  LOCKED: 'bi-lock-fill',
  IN_PROGRESS: 'bi-play-fill',
};

const FoundationRoadmap: React.FC = () => {
  const nav = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [range, setRange] = useState<'all' | number>('all');
  const { unlock, busy, priceInr } = useUnlock();

  useEffect(() => {
    let cancelled = false;
    passportApi.myFoundationJourney()
      .then(j => { if (!cancelled) setJourney(j); })
      .catch((e: any) => { if (!cancelled) setErr(e?.response?.data?.message || 'Could not load your roadmap.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => groupJourneyDays(journey?.days || []), [journey]);
  const totalDays = journey?.totalDays ?? 90;
  /** The welcome days, 0.1–0.5. Open by default while they still have to be done. */
  const orientation = journey?.orientation || null;
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const currentDay = journey?.currentDay ?? 1;

  // The group holding today is open on arrival, so the student lands where they are.
  useEffect(() => {
    const current = groups.find(g => g.days.some(d => d.day === currentDay));
    if (current) setOpen(o => (o[current.key] === undefined ? { ...o, [current.key]: true } : o));
  }, [groups, currentDay]);

  if (loading) return <div className="fj-page"><div className="fj-skeleton">Loading your roadmap…</div></div>;
  if (err) return <div className="fj-page"><div className="fj-msg err">{err}</div></div>;

  /**
   * Every state that is not a plan at all — not configured, being prepared, membership required —
   * is already said by the journey screen, in the same words. Handed to it rather than restated,
   * so this page can never show a different plan in its place.
   *
   * A NON-MEMBER IS NOT ONE OF THOSE. They have a plan; they simply cannot open most of it. This
   * page used to hand them over too, which made My Roadmap and My 90 Days the same screen for
   * anybody who had not paid — and the one question this page answers, "what will I be taught",
   * is exactly the question somebody deciding whether to pay is asking. They now get the whole
   * road grouped by topic, with everything past the preview locked, from the same server fields
   * a member's roadmap uses.
   */
  if (!journey || !journey.available) return <FoundationJourneyPage />;

  /* A non-member sees the same road; what differs is that most of it is shut, and why. */
  const preview = journey.access === 'PREVIEW';
  const previewDays = journey.previewDays ?? 7;
  const lockedDays = journey.lockedDays ?? Math.max(0, totalDays - previewDays);

  const days = journey.days || [];
  const completedCount = journey.completedCount ?? 0;
  const percentComplete = journey.percentComplete ?? 0;
  const today = days.find(d => d.day === currentDay);
  const allDone = completedCount >= totalDays;

  const ranges = dayRanges(totalDays);
  const selected = range === 'all' ? null : ranges.find(r => r.from === range) || null;
  const visible = selected ? groups.filter(g => g.toDay >= selected.from && g.fromDay <= selected.to) : groups;
  const allOpen = visible.length > 0 && visible.every(g => open[g.key]);
  const setAll = (value: boolean) => setOpen(o => {
    const next = { ...o };
    for (const g of visible) next[g.key] = value;
    return next;
  });

  return (
    <div className="fj-page fr-page frm">
      <section className="fjm-hero">
        <div className="fjm-hero-copy">
          <span className="fjm-eyebrow">Your personalised {totalDays}-day roadmap</span>
          <h1>{journey.stageLabel || 'Foundation'} <span>Journey</span></h1>
          <p>
            {preview
              ? `Every day of your plan, grouped by topic — built from your skill check. The first ${previewDays} days are open to read.`
              : `Every day of your plan, grouped by topic. Learning happens in My ${totalDays} Days — this is where you see the whole road.`}
          </p>
          <div className="fjm-chips">
            {preview ? (
              <>
                <span><i className="bi bi-eye" /> {previewDays} days to preview</span>
                <span><i className="bi bi-lock-fill" /> {lockedDays} unlock with membership</span>
              </>
            ) : (
              <>
                <span><i className="bi bi-check2-circle" /> {completedCount} of {totalDays} days done</span>
                <span><i className="bi bi-graph-up-arrow" /> {percentComplete}% complete</span>
              </>
            )}
          </div>
          {/* A progress bar reading zero against somebody's own plan is worse than no bar. */}
          {!preview && (
            <div className="fjm-hero-bar" role="progressbar" aria-valuenow={percentComplete}
                 aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
              <i style={{ width: `${Math.max(1, percentComplete)}%` }} />
            </div>
          )}
        </div>
        <div className="fjm-today">
          {preview ? (
            <>
              <small>Day 1 of {totalDays}</small>
              <b>{today?.title || `Day 1`}</b>
              {today?.topic && <span>{today.topic}</span>}
              <button type="button" className="fjm-btn light" onClick={() => unlock()} disabled={busy}>
                {busy ? 'Opening payment…' : `Unlock all ${totalDays} days${priceInr ? ` — ₹${priceInr}` : ''}`}
                <i className="bi bi-arrow-right" />
              </button>
            </>
          ) : (
            <>
              <small>{allDone ? 'Journey complete' : `Today · Day ${currentDay} of ${totalDays}`}</small>
              <b>{allDone ? 'You have completed every day' : today?.title || `Day ${currentDay}`}</b>
              {!allDone && today?.topic && <span>{today.topic}</span>}
              <button type="button" className="fjm-btn light" onClick={() => nav(planLinkFor(allDone ? totalDays : currentDay))}>
                {allDone ? 'Review your journey' : `Continue Day ${currentDay}`} <i className="bi bi-arrow-right" />
              </button>
            </>
          )}
        </div>
      </section>

      <div className="fr-tools">
        <div className="fr-ranges" role="group" aria-label="Show days">
          <button type="button" className={range === 'all' ? 'on' : ''} onClick={() => setRange('all')}>All {totalDays} days</button>
          {ranges.map(r => (
            <button type="button" key={r.from} className={range === r.from ? 'on' : ''} onClick={() => setRange(r.from)}>{r.label}</button>
          ))}
        </div>
        <button type="button" className="fr-toggle" onClick={() => setAll(!allOpen)}>
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/*
        * SAY WHAT IS BEHIND THE LOCK, RATHER THAN LEAVING IT TO BE INFERRED.
        *
        * A non-member sees seven days and then nothing, and without a word for it the page reads
        * like a roadmap that stops — as though the plan really were seven days long. It is not:
        * the rest exists and was built for them. Saying so is both honest and the argument.
        */}
      {preview && (
        <div className="fr-locked-note">
          <span className="ic"><i className="bi bi-lock-fill" aria-hidden /></span>
          <div>
            <b>Unlock to see your full {totalDays}-day roadmap</b>
            <span>
              These are the first {previewDays} days of the plan built from your skill check.
              Membership opens the remaining {lockedDays}, day by day, with everything each one teaches.
            </span>
          </div>
          <button type="button" className="fjm-btn light" onClick={() => unlock()} disabled={busy}>
            {busy ? 'Opening payment…' : `Unlock${priceInr ? ` — ₹${priceInr}` : ''}`}
          </button>
        </div>
      )}

      <ul className="fr-legend" aria-label="Legend">
        {(['COMPLETED', 'CURRENT', 'AVAILABLE', 'LOCKED'] as const).map(s => (
          <li key={s}><span className={`fr-dot st-${s.toLowerCase()}`}><i className={`bi ${STATE_ICON[s]}`} aria-hidden /></span>{STATE_LABEL[s]}</li>
        ))}
      </ul>

      <ol className="fr-timeline">
        {/*
          * THE WELCOME, AT THE HEAD OF THE ROAD.
          *
          * Days 0.1 to 0.5, before Day 1 and outside the count in the hero — the programme is
          * {totalDays} learning days and these are not learning days. Shown to every member,
          * whenever they enrolled, because the server reads them rather than storing them.
          *
          * Hidden entirely when the tenant has the welcome off, and never shown once it is
          * finished and was not required: a completed optional welcome is clutter at the top of
          * somebody's roadmap for the rest of the year.
          */}
        {orientation && orientation.days.length > 0 && (!orientation.complete || orientation.mandatory) && (
          <li className={`fr-group gs-${orientation.complete ? 'done' : 'in_progress'} fr-group-welcome`}>
            <span className={`fr-dot st-${orientation.complete ? 'completed' : 'current'}`} aria-hidden>
              <i className={`bi ${orientation.complete ? 'bi-check-lg' : 'bi-stars'}`} />
            </span>
            <div className="fr-card">
              <button
                type="button" className="fr-card-head" aria-expanded={welcomeOpen}
                onClick={() => setWelcomeOpen(w => !w)}
              >
                <span className="fr-span">Days 0.1–0.{orientation.days.length}</span>
                <span className="fr-title">
                  <b>Welcome to CareerPilot</b>
                  <small>{orientation.blocking
                    ? 'Finish these before Day 1 opens'
                    : 'A short welcome — your plan stays open either way'}</small>
                </span>
                <span className="fr-meta">
                  <span className={`fr-chip gs-${orientation.complete ? 'done' : 'in_progress'}`}>
                    {orientation.complete ? 'Done' : orientation.blocking ? 'Required' : 'Optional'}
                  </span>
                  <small>{orientation.completedDays}/{orientation.totalDays} done</small>
                </span>
                <i className={`bi ${welcomeOpen ? 'bi-chevron-up' : 'bi-chevron-down'} fr-caret`} aria-hidden />
              </button>

              {welcomeOpen && (
                <ol className="fr-days">
                  {orientation.days.map(d => {
                    const st = d.status === 'COMPLETED' ? 'COMPLETED' : d.locked ? 'LOCKED' : d.status === 'CURRENT' ? 'CURRENT' : 'AVAILABLE';
                    const body = (
                      <>
                        <span className={`fr-dot small st-${st.toLowerCase()}`} aria-hidden><i className={`bi ${STATE_ICON[st]}`} /></span>
                        <span className="fr-day-n">Day {d.day}</span>
                        <span className="fr-day-t">
                          <b>{d.title}</b>
                          {d.blurb && <small>{d.blurb}</small>}
                        </span>
                        <span className={`fr-state st-${st.toLowerCase()}`}>{STATE_LABEL[st]}</span>
                      </>
                    );
                    return (
                      <li key={d.day} className={`fr-day st-${st.toLowerCase()}`}>
                        {d.locked ? (
                          <div className="fr-day-row" aria-label={`Day ${d.day}: ${d.title}, locked`}>{body}</div>
                        ) : (
                          <button type="button" className="fr-day-row" onClick={() => nav('/careerpilot/orientation')}
                                  aria-label={`Open day ${d.day}: ${d.title}`}>
                            {body}
                            <i className="bi bi-chevron-right fr-go" aria-hidden />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </li>
        )}

        {visible.map(g => {
          const isOpen = !!open[g.key];
          const heading = g.topic || g.days[0].title;
          const span = g.fromDay === g.toDay ? `Day ${g.fromDay}` : `Days ${g.fromDay}–${g.toDay}`;
          return (
            <li key={g.key} className={`fr-group gs-${g.state.toLowerCase()}`}>
              <span className={`fr-dot st-${g.state === 'IN_PROGRESS' ? 'current' : g.state.toLowerCase()}`} aria-hidden>
                <i className={`bi ${STATE_ICON[g.state]}`} />
              </span>
              <div className="fr-card">
                <button
                  type="button" className="fr-card-head" aria-expanded={isOpen}
                  onClick={() => setOpen(o => ({ ...o, [g.key]: !isOpen }))}
                >
                  <span className="fr-span">{span}</span>
                  <span className="fr-title">
                    <b>{heading}</b>
                    {g.module && <small>{g.module}</small>}
                  </span>
                  <span className="fr-meta">
                    <span className={`fr-chip gs-${g.state.toLowerCase()}`}>{GROUP_LABEL[g.state]}</span>
                    {g.days.length > 1 && <small>{g.completed}/{g.days.length} done</small>}
                  </span>
                  <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} fr-caret`} aria-hidden />
                </button>

                {isOpen && (
                  <ol className="fr-days">
                    {g.days.map(d => {
                      const state = preview ? 'LOCKED' : dayState(d);
                      const body = (
                        <>
                          <span className={`fr-dot small st-${state.toLowerCase()}`} aria-hidden><i className={`bi ${STATE_ICON[state]}`} /></span>
                          <span className="fr-day-n">Day {d.day}</span>
                          <span className="fr-day-t">
                            <b>{d.title}</b>
                            {d.kind && <small>{KIND_LABEL[d.kind] || ''}</small>}
                          </span>
                          <span className={`fr-state st-${state.toLowerCase()}`}>{STATE_LABEL[state]}</span>
                        </>
                      );
                      return (
                        <li key={d.day} className={`fr-day st-${state.toLowerCase()}`}>
                          {/*
                            * Locked days are not links: the roadmap names them and opens nothing.
                            *
                            * For a non-member that is EVERY day. This page shows them what the
                            * programme is; reading the seven preview days happens on My N Days,
                            * and a roadmap that opened them would be that page again.
                            */}
                          {canOpenDay(d) && !preview ? (
                            <button type="button" className="fr-day-row" onClick={() => nav(planLinkFor(d.day))}
                                    aria-label={`Open day ${d.day}: ${d.title}, ${STATE_LABEL[state]}`}>
                              {body}
                              <i className="bi bi-chevron-right fr-go" aria-hidden />
                            </button>
                          ) : (
                            <div className="fr-day-row" aria-label={`Day ${d.day}: ${d.title}, locked`}>{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default FoundationRoadmap;
