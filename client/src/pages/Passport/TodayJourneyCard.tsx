import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { FoundationJourney, FoundationJourneyDay } from '../../api/passportApi';

/**
 * Today, from the student's ninety-day Foundation journey — at the top of Home.
 *
 * A student the unit engine plans has ONE plan, and Home is where they land. Without this card Home
 * led with the mission pool, so the first thing they read was not the day their journey says they
 * are on. It renders nothing at all for a student the topic engine plans: their Home is unchanged.
 */

const TYPE_LABEL: Record<string, string> = {
  video: 'Watch', notes: 'Read', worked_example: 'Worked example', practice_theory: 'Practice',
  practice_coding: 'Code practice', quiz: 'Checkpoint', assignment: 'Project',
};

const mins = (n: number) =>
  (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

const TodayJourneyCard: React.FC = () => {
  const nav = useNavigate();
  const [journey, setJourney] = useState<FoundationJourney | null>(null);
  const [day, setDay] = useState<FoundationJourneyDay | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const j = await passportApi.myFoundationJourney();
        if (cancelled) return;
        setJourney(j);
        if (j.engine === 'UNIT' && j.available && j.access !== 'PREVIEW' && j.currentDay) {
          const d = await passportApi.myFoundationJourneyDay(j.currentDay);
          if (!cancelled) setDay(d);
        }
      } catch { /* Home still renders; this card simply stays away */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!journey || journey.engine !== 'UNIT') return null;

  // Not configured, being prepared, or incomplete: said as it is, with nothing to press.
  if (!journey.available && journey.reason !== 'NO_JOURNEY') {
    return (
      <section className="md-card md-journey">
        <header className="md-card-head"><div><h2><i className="bi bi-map" /> Your 90-day Foundation journey</h2><p>{journey.message}</p></div></header>
      </section>
    );
  }

  if (!journey.available) {
    return (
      <section className="md-card md-journey">
        <header className="md-card-head"><div><h2><i className="bi bi-map" /> Your 90-day Foundation journey</h2>
          <p>Your {journey.totalDays} learning days are built from your skill check, so they start from what
          you already know. Take it and your journey appears here and on My Roadmap.</p></div></header>
        <div className="md-journey-actions"><button className="md-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>Take your skill check</button></div>
      </section>
    );
  }

  // Before membership: the first day of their own plan, and the offer to unlock the rest.
  if (journey.access === 'PREVIEW') {
    const first = journey.preview?.[0];
    const total = journey.totalDays ?? 90;
    return (
      <section className="md-card md-journey">
        <header className="md-card-head">
          <div><h2><i className="bi bi-map" /> Your {total}-day Foundation journey</h2>
            {first && <p>Day 1 · <b>{first.title}</b>{first.objective ? ` — ${first.objective}` : ''}</p>}</div>
          <span className="md-pill">First {journey.preview?.length ?? 0} days open</span>
        </header>
        <p className="md-journey-note"><i className="bi bi-lock-fill" /> Take membership to unlock and start all {total} days of your roadmap.</p>
        <div className="md-journey-actions"><button className="md-btn primary" onClick={() => nav('/careerpilot/roadmap')}>See my roadmap</button></div>
      </section>
    );
  }

  const current = journey.currentDay ?? 1;
  const total = journey.totalDays ?? 90;
  const pct = journey.percentComplete ?? 0;

  const ICON: Record<string, string> = { video: 'bi-play-circle', notes: 'bi-file-text', worked_example: 'bi-lightbulb', practice_theory: 'bi-pencil-square', practice_coding: 'bi-code-slash', quiz: 'bi-patch-question', assignment: 'bi-upload' };

  return (
    <section className="md-card md-journey">
      <header className="md-card-head">
        <div>
          <span className="md-kicker">Today in your Foundation journey</span>
          <h2 className="md-journey-title">{day ? day.title : `Day ${current}`}</h2>
          {day?.objective && <p>{day.objective}</p>}
        </div>
        <span className="md-pill">Day {current} of {total} · {pct}% done</span>
      </header>

      <div className="md-journey-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
        <i style={{ width: `${Math.max(1, pct)}%` }} />
      </div>

      {day && (
        <ol className="md-journey-acts">
          {day.activities.map(a => (
            <li key={a.id || a.order} className={a.gating ? 'gating' : ''}>
              <span className={`ic t-${a.type}`}><i className={`bi ${ICON[a.type] || 'bi-journal-text'}`} /></span>
              <div><b>{a.title}</b><span>{TYPE_LABEL[a.type] || a.type}{a.minutes ? ` · ${mins(a.minutes)}` : ''}{a.gating ? ' · must be completed' : ''}</span></div>
            </li>
          ))}
        </ol>
      )}

      <div className="md-journey-actions">
        {journey.enrollmentId && (
          <button className="md-btn primary" onClick={() => nav(`/careerpilot/journey/day/${current}`)}>
            Start today&apos;s work <i className="bi bi-arrow-right" />
          </button>
        )}
        <button className="md-btn" onClick={() => nav('/careerpilot/roadmap')}>See all {total} days</button>
      </div>
    </section>
  );
};

export default TodayJourneyCard;
