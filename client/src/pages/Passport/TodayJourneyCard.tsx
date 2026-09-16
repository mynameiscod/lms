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
      <div className="gd-card" style={{ marginTop: 14 }}>
        <div className="gd-card-hd"><h2><i className="bi bi-map" /> Your 90-day Foundation journey</h2></div>
        <p style={{ margin: 0 }}>{journey.message}</p>
      </div>
    );
  }

  if (!journey.available) {
    return (
      <div className="gd-card" style={{ marginTop: 14 }}>
        <div className="gd-card-hd"><h2><i className="bi bi-map" /> Your 90-day Foundation journey</h2></div>
        <p style={{ margin: '0 0 12px' }}>
          Your {journey.totalDays} learning days are built from your skill check, so they start from what
          you already know. Take it and your journey appears here and on My Roadmap.
        </p>
        <button className="gd-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>Take your skill check</button>
      </div>
    );
  }

  // Before membership: the first day of their own plan, and the offer to unlock the rest.
  if (journey.access === 'PREVIEW') {
    const first = journey.preview?.[0];
    const total = journey.totalDays ?? 90;
    return (
      <div className="gd-card" style={{ marginTop: 14 }}>
        <div className="gd-card-hd">
          <h2><i className="bi bi-map" /> Your {total}-day Foundation journey</h2>
          <span className="gd-timer">First {journey.preview?.length ?? 0} days open</span>
        </div>
        {first && (
          <p style={{ margin: '0 0 10px' }}>
            Day 1 · <b>{first.title}</b>{first.objective ? ` — ${first.objective}` : ''}
          </p>
        )}
        <p style={{ margin: '0 0 12px', color: '#475569' }}>
          🔒 Take membership to unlock and start all {total} days of your roadmap.
        </p>
        <button className="gd-btn primary" onClick={() => nav('/careerpilot/roadmap')}>See my roadmap</button>
      </div>
    );
  }

  const current = journey.currentDay ?? 1;
  const total = journey.totalDays ?? 90;
  const pct = journey.percentComplete ?? 0;

  return (
    <div className="gd-card" style={{ marginTop: 14 }}>
      <div className="gd-card-hd">
        <h2><i className="bi bi-map" /> Today in your Foundation journey</h2>
        <span className="gd-timer">Day {current} of {total} · {pct}% done</span>
      </div>

      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', margin: '0 0 12px' }}
           role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #22c55e)' }} />
      </div>

      {day && (
        <>
          <b style={{ display: 'block', fontSize: 16 }}>{day.title}</b>
          {day.objective && <p style={{ margin: '4px 0 10px', color: '#475569' }}>{day.objective}</p>}
          {day.activities.map(a => (
            <div className="gd-mission" key={a.id || a.order}>
              <span className="badge"><i className={`bi ${a.kind === 'quiz' ? 'bi-patch-question' : a.kind === 'assignment' ? 'bi-upload' : 'bi-journal-text'}`} /></span>
              <div className="txt">
                <b>{a.title}</b>
                <span>{TYPE_LABEL[a.type] || a.type}{a.minutes ? ` · ${mins(a.minutes)}` : ''}{a.gating ? ' · must be completed' : ''}</span>
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        {journey.enrollmentId && (
          <button className="gd-btn primary" onClick={() => nav(`/careerpilot/journey/day/${current}`)}>
            Start today&apos;s work
          </button>
        )}
        <button className="gd-btn" onClick={() => nav('/careerpilot/roadmap')}>See all {total} days</button>
      </div>
    </div>
  );
};

export default TodayJourneyCard;
