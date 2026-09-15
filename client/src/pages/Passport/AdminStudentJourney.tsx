import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AdminFoundationJourney } from '../../api/passportApi';

/**
 * One member's ninety-day Foundation journey, as an admin needs to see it.
 *
 * The member's own screen hides the planning; this one names it. Each day shows the unit behind it,
 * its type and whether it is still published — so "why is this on day 34" has an answer, and a unit
 * someone has since unpublished or deleted is visible on the plans it still sits on.
 *
 * READ-ONLY. Upcoming days are rewritten whenever the journey recomposes, so a hand edit here would
 * be silently discarded. Changes belong in the Mega Curriculum, which is where the link goes.
 */

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Done', CURRENT: 'Today', SKIPPED: 'Behind', UPCOMING: 'Upcoming',
};

/** Days either side of today shown by default; ninety rows is a lot to scroll for "where are they". */
const WINDOW_BEFORE = 3;
const WINDOW_AFTER = 7;

const AdminStudentJourney: React.FC<{ studentId: string }> = ({ studentId }) => {
  const nav = useNavigate();
  const [data, setData] = useState<AdminFoundationJourney | null>(null);
  const [err, setErr] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null); setErr('');
    passportApi.getStudentFoundationJourney(studentId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setErr(e?.response?.data?.message || 'Could not load this member’s Foundation journey.'); });
    return () => { cancelled = true; };
  }, [studentId]);

  if (err) return <div className="sr-note warn"><b>{err}</b></div>;
  if (!data) return null;

  if (!data.available) {
    return (
      <div className="sr-note">
        <b>Foundation journey — {data.reason === 'NOT_CONFIGURED' ? 'NOT CONFIGURED for this tenant' : data.engine === 'UNIT' ? 'not created yet' : 'not on the unit engine'}</b>
        <span>{data.message}</span>
      </div>
    );
  }

  const days = data.days || [];
  const current = data.currentDay || 1;
  const shown = showAll ? days : days.filter(d => d.day >= current - WINDOW_BEFORE && d.day <= current + WINDOW_AFTER);
  const offCurriculum = days.filter(d => d.unitStatus !== 'PUBLISHED');

  return (
    <section style={{ marginBottom: 28 }}>
      <header className="sr-hd">
        <div>
          <span className="sr-eyebrow">Foundation journey · unit engine</span>
          <h1>{data.student.name}</h1>
          <p>
            Ninety days composed from the published curriculum. Upcoming days are rewritten when this
            member&apos;s evidence or direction changes, so nothing here is edited by hand — change
            the curriculum instead.
          </p>
        </div>
        <div className="sr-facts">
          <div><small>Today</small><b>Day {current} of {data.totalDays}</b></div>
          <div><small>Done</small><b>{data.completedCount ?? 0} days</b></div>
          <div><small>Progress</small><b>{data.percentComplete ?? 0}%</b></div>
          <div><small>Started</small><b>{data.startedAt ? new Date(data.startedAt).toLocaleDateString() : '—'}</b></div>
        </div>
      </header>

      {offCurriculum.length > 0 && (
        <div className="sr-note warn">
          <b>{offCurriculum.length} day{offCurriculum.length === 1 ? '' : 's'} use a unit that is no longer published.</b>
          <span>
            {offCurriculum.slice(0, 6).map(d => `Day ${d.day} · ${d.unitCode || 'no unit'} (${d.unitStatus})`).join(' — ')}
            {offCurriculum.length > 6 ? ' — …' : ''}
          </span>
        </div>
      )}

      <div className="sr-links">
        <span>Change what this journey is built from:</span>
        <button onClick={() => nav('/admin/passport/mega-curriculum')}>Mega Curriculum — units, content, checkpoints, projects</button>
      </div>

      <div className="sr-tablewrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th className="c">Day</th><th>Status</th><th>Unit</th><th>Type</th>
              <th className="c">Activities</th><th className="c">Minutes</th><th>Curriculum</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(d => (
              <tr key={d.day} style={d.status === 'CURRENT' ? { background: '#eef2ff' } : undefined}>
                <td className="c seq">{d.day}</td>
                <td>{STATUS_LABEL[d.status] || d.status}</td>
                <td>
                  <b>{d.title}</b>
                  <span className="key">{d.unitCode || '—'}</span>
                </td>
                <td>
                  {d.unitType || '—'}
                  {d.checkpoint ? ' · checkpoint' : ''}
                  {d.project ? ' · project' : ''}
                </td>
                <td className="c num">{d.activities}</td>
                <td className="c num">{d.minutes}</td>
                <td>{d.unitStatus === 'PUBLISHED' ? 'Published' : <b style={{ color: '#b45309' }}>{d.unitStatus}</b>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sr-links" style={{ marginTop: 10 }}>
        <button onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show the days around today' : `Show all ${days.length} days`}
        </button>
      </div>
    </section>
  );
};

export default AdminStudentJourney;
