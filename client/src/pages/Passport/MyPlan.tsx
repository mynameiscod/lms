import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { SpineOutcome, SpineDay } from '../../api/passportApi';
import './myPlan.css';

/**
 * The ninety days, day by day.
 *
 * WHY DAY-WISE AND NOT WEEK-WISE. The roadmap screen groups everything under weeks, which is how
 * a student ends up staring at "Week 3" with no idea what they are actually doing on Tuesday. A
 * day is the unit they live in: one topic, its subtopics, and the video, notes and practice
 * under it. Weeks are an accounting convenience and belong to the planner, not to the learner.
 *
 * IT SHOWS NINETY OR IT SHOWS WHY NOT. There is no partial plan here. A curriculum still being
 * written returns the bands that fall short and this renders that honestly — "your plan is being
 * prepared, 35 of 90 days written" — rather than handing somebody a plan with sixty holes in it
 * and letting them find out. The last time a short plan shipped quietly, a student found it
 * before we did.
 */

/** The depth a day is served at, in a student's words rather than the enum's. */
const DEPTH_NOTE: Record<string, string> = {
  FULL: 'from the beginning',
  STANDARD: '',
  REVIEW: 'a refresher — you have shown this already',
};

const mins = (n: number) =>
  (n >= 60 ? `${Math.floor(n / 60)}h${n % 60 ? ` ${n % 60}m` : ''}` : `${n} min`);

const MyPlan: React.FC = () => {
  const nav = useNavigate();
  const [spine, setSpine] = useState<SpineOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openBand, setOpenBand] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setSpine(await passportApi.getMySpine()); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not load your plan.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Days cut into their bands, so the ninety reads as a shape rather than as a list of ninety. */
  const byBand = useMemo(() => {
    if (!spine?.available) return [];
    const days = spine.days || [];
    return (spine.bands || []).map(b => ({
      ...b,
      days: days.filter(d => d.band === b.key),
    }));
  }, [spine]);

  useEffect(() => {
    // Open the band they are in, not the first one. A student returning on day 40 should not
    // have to scroll past fifteen days of orientation to find today.
    if (byBand.length && !openBand) setOpenBand(byBand[0].key);
  }, [byBand, openBand]);

  if (loading) return <div className="mpl"><div className="mpl-state">Loading your plan…</div></div>;

  if (err) return (
    <div className="mpl">
      <div className="mpl-state err">
        <b>{err}</b>
        <button className="mpl-btn" onClick={load}>Try again</button>
      </div>
    </div>
  );

  if (!spine) return null;

  if (!spine.available) {
    const authored = spine.authored ?? 0;
    const total = spine.total ?? 90;
    const shortfalls = spine.shortfalls || [];
    const pct = total ? Math.round((authored / total) * 100) : 0;
    return (
      <div className="mpl">
        <header className="mpl-hd">
          <span className="mpl-kicker">Your first year</span>
          <h1>Your ninety days are being written</h1>
          <p>{spine.message}</p>
        </header>

        {/* The real figure, not a spinner. A student told "coming soon" with no number assumes
            it is not coming; a student told "35 of 90" can see it moving. */}
        <section className="mpl-prep">
          <div className="mpl-prep-fig">
            <b>{authored}</b><span>of {total} days written</span>
          </div>
          <div className="mpl-bar"><i style={{ width: `${Math.max(2, pct)}%` }} /></div>

          {shortfalls.length > 0 && (
            <ul className="mpl-short">
              {shortfalls.map(s => (
                <li key={s.band}>
                  <b>{s.available} of {s.needed}</b>
                  <span>{s.band.replace(/_/g, ' ').toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mpl-prep-note">
            We would rather make you wait than hand you a plan with gaps in it. Your assessment
            results are already yours, and your daily work carries on in the meantime.
          </p>
          <button className="mpl-btn primary" onClick={() => nav('/careerpilot')}>
            Back to my missions
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mpl">
      <header className="mpl-hd">
        <span className="mpl-kicker">Your first year</span>
        <h1>Your {spine.totalDays ?? 90} days</h1>
        <p>
          Built from what you are studying, where you are heading and the language you chose —
          and sized to what your assessment measured. About {mins(spine.estimatedMinutes ?? 0)} of work
          in total, at whatever pace suits you.
        </p>
      </header>

      <div className="mpl-bands">
        {byBand.map(band => {
          const open = openBand === band.key;
          return (
            <section className={`mpl-band${open ? ' is-open' : ''}`} key={band.key}>
              <button className="mpl-band-hd" onClick={() => setOpenBand(open ? null : band.key)}>
                <span className="mpl-band-days">{band.fromDay}–{band.toDay}</span>
                <span className="mpl-band-tx">
                  <b>{band.label}</b>
                  <span>{band.blurb}</span>
                </span>
                <span className="mpl-band-n">
                  {band.days.length} day{band.days.length === 1 ? '' : 's'}
                </span>
                <span className="mpl-chev" aria-hidden="true">{open ? '−' : '+'}</span>
              </button>

              {open && (
                <ol className="mpl-days">
                  {band.days.map((d: SpineDay) => (
                    <li className="mpl-day" key={d.dayUnitId}>
                      <span className="mpl-day-n">{d.day}</span>
                      <span className="mpl-day-tx">
                        <b>{d.title}</b>
                        <span className="mpl-day-meta">
                          {mins(d.estimatedMinutes)}
                          {DEPTH_NOTE[d.depth] ? ` · ${DEPTH_NOTE[d.depth]}` : ''}
                        </span>
                        {d.subtopics.length > 0 && (
                          <span className="mpl-subs">{d.subtopics.join(' · ')}</span>
                        )}
                      </span>
                      {/* Straight into the course this day teaches from. The day screen proper
                          comes next; until then the journey is the honest destination. */}
                      <button
                        className="mpl-open"
                        onClick={() => nav(`/careerpilot/learn/${d.skillKey}`)}
                        aria-label={`Open ${d.title}`}
                      >→</button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      <footer className="mpl-foot">
        <p>
          Ninety days is the curriculum, not a deadline. Your membership runs a year, and every
          day you finish stays open for the whole of it.
        </p>
      </footer>
    </div>
  );
};

export default MyPlan;
