import React, { useEffect, useState } from 'react';
import { Spinner } from '../../components/common';
import './StudentDashboard.css';

/**
 * The student profile screen, rebuilt to the supplied design.
 *
 * Every figure comes from the dashboard endpoint, which computes it from recorded
 * activity. Panels whose source has no data render an explicit empty state instead of
 * a plausible-looking placeholder — staff act on these numbers, so a blank is safer
 * than a guess.
 */

const API = (process.env.REACT_APP_API_URL || '/api/v1') + '/student-profile';
const authHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  } as Record<string, string>;
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short' }).toUpperCase();

/** "2 hrs ago" / "Yesterday" — same relative phrasing as the design. */
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

const BAR_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#ec4899', '#6366f1'];

const ACT_ICON: Record<string, { icon: string; cls: string }> = {
  quiz: { icon: '✓', cls: 'green' },
  assignment: { icon: '▤', cls: 'purple' },
  attendance: { icon: '◉', cls: 'blue' },
  code: { icon: '⌘', cls: 'orange' },
};

/** Progress ring for the headline percentage. */
const Ring: React.FC<{ value: number }> = ({ value }) => {
  const R = 30, C = 2 * Math.PI * R;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="sd-ring">
      <circle cx="36" cy="36" r={R} fill="none" stroke="#e8edf5" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={R} fill="none" stroke="#22c55e" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * C} ${C}`} transform="rotate(-90 36 36)"
      />
      <text x="36" y="41" textAnchor="middle" className="sd-ring-txt">🏆</text>
    </svg>
  );
};

/**
 * Weekly activity chart. Hand-drawn SVG rather than a charting library — the page needs
 * three lines and a grid, which is not worth a new dependency or its bundle weight.
 */
const WeeklyChart: React.FC<{ days: any[] }> = ({ days }) => {
  const W = 560, H = 210, PAD_L = 30, PAD_B = 26, PAD_T = 10;
  const series = [
    { key: 'classes', color: '#3b82f6', label: 'Classes' },
    { key: 'quizzes', color: '#8b5cf6', label: 'Quizzes' },
    { key: 'assignments', color: '#22c55e', label: 'Assignments' },
  ];
  const max = Math.max(5, ...days.flatMap(d => series.map(s => d[s.key] || 0)));
  const step = (W - PAD_L - 10) / Math.max(1, days.length - 1);
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / max);
  const x = (i: number) => PAD_L + i * step;

  const ticks = 5;
  return (
    <div className="sd-chart-wrap">
      <div className="sd-legend">
        {series.map(s => (
          <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="sd-chart" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = Math.round((max / ticks) * i);
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - 6} y1={y(v)} y2={y(v)} stroke="#eef2f7" />
              <text x={PAD_L - 8} y={y(v) + 4} textAnchor="end" className="sd-axis">{v}</text>
            </g>
          );
        })}
        {days.map((d, i) => (
          <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="sd-axis">{d.label}</text>
        ))}
        {series.map(s => (
          <g key={s.key}>
            <polyline
              fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
              points={days.map((d, i) => `${x(i)},${y(d[s.key] || 0)}`).join(' ')}
            />
            {days.map((d, i) => (
              <circle key={d.date} cx={x(i)} cy={y(d[s.key] || 0)} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2">
                <title>{`${d.label} — ${s.label}: ${d[s.key] || 0}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
};

const StudentDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/admin/${userId}/dashboard`, { headers: authHeaders() })
      .then(async r => {
        const body = await r.json();
        if (!r.ok || !body.success) throw new Error(body.message || `Failed (${r.status})`);
        setD(body.data);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="sd-loading"><Spinner /></div>;
  if (err) return <div className="sd-error">{err}</div>;
  if (!d) return null;

  const s = d.stats;
  const hoursSpent = d.weekly.totals.minutes
    ? `${Math.floor(d.weekly.totals.minutes / 60)}h ${d.weekly.totals.minutes % 60}m`
    : '—';

  const cards = [
    { icon: '📘', tint: 'blue', label: 'Classes Completed', value: `${s.classes.done}`, sub: `/ ${s.classes.total}`, pct: s.classes.total ? (s.classes.done / s.classes.total) * 100 : 0 },
    { icon: '🧩', tint: 'purple', label: 'Quizzes Attempted', value: `${s.quizzes.done}`, sub: `/ ${s.quizzes.total}`, pct: s.quizzes.total ? (s.quizzes.done / s.quizzes.total) * 100 : 0 },
    { icon: '📗', tint: 'green', label: 'Assignments Done', value: `${s.assignments.done}`, sub: `/ ${s.assignments.total}`, pct: s.assignments.total ? (s.assignments.done / s.assignments.total) * 100 : 0 },
    { icon: '📕', tint: 'orange', label: 'Avg. Quiz Score', value: `${s.avgQuizScore}`, sub: '%', pct: s.avgQuizScore },
    { icon: '🗓️', tint: 'teal', label: 'Attendance', value: `${s.attendance}`, sub: '%', pct: s.attendance },
    { icon: '🛡️', tint: 'indigo', label: 'Coder Score', value: s.coderScore.toLocaleString(), sub: '', badge: s.coderBand },
  ];

  return (
    <div className="sd">
      {/* ── Header ── */}
      <div className="sd-hero">
        <div className="sd-hero-main">
          <div className="sd-avatar">
            {d.student.photo
              ? <img src={d.student.photo} alt={d.student.name} />
              : <span>{(d.student.name || '?').charAt(0).toUpperCase()}</span>}
          </div>
          <div className="sd-hero-id">
            <h2>{d.student.name}</h2>
            <div className="sd-hero-sub">{d.student.email}</div>
            <div className="sd-chips">
              {d.student.batch && <span className="sd-chip blue">Batch: {d.student.batch}</span>}
              {d.headline.rank
                ? <span className="sd-chip amber" title={d.headline.rankBasis}>Rank: #{d.headline.rank}{d.headline.rankOf ? ` of ${d.headline.rankOf}` : ''}</span>
                : <span className="sd-chip grey" title="No quiz attempts in this batch yet">Rank: —</span>}
              <span className="sd-chip green">Streak: {d.headline.streak} Days 🔥</span>
            </div>
          </div>
        </div>

        <div className="sd-hero-progress">
          <div className="sd-hp-head">Overall Progress</div>
          <div className="sd-hp-val">{d.headline.overallProgress}%</div>
          <div className="sd-hp-bar"><div style={{ width: `${d.headline.overallProgress}%` }} /></div>
          <div className="sd-hp-note">Averaged across attendance, classes, quizzes and assignments</div>
        </div>
        <Ring value={d.headline.overallProgress} />
      </div>

      {/* ── Stat cards ── */}
      <div className="sd-cards">
        {cards.map(c => (
          <div className="sd-card" key={c.label}>
            <div className="sd-card-top">
              <span className={`sd-card-ic ${c.tint}`}>{c.icon}</span>
              <span className="sd-card-label">{c.label}</span>
            </div>
            <div className="sd-card-val">
              {c.value}{c.sub && <small>{c.sub}</small>}
            </div>
            {c.badge
              ? <span className="sd-card-badge">{c.badge}</span>
              : <div className="sd-card-bar"><div className={c.tint} style={{ width: `${Math.min(100, c.pct)}%` }} /></div>}
          </div>
        ))}
      </div>

      {/* ── Row 1 ── */}
      <div className="sd-row">
        <section className="sd-panel">
          <div className="sd-panel-head"><h3>Learning Progress</h3></div>
          {d.learningProgress.length === 0 ? (
            <p className="sd-empty">No course progress recorded yet.</p>
          ) : (
            <div className="sd-bars">
              {d.learningProgress.slice(0, 6).map((l: any, i: number) => (
                <div className="sd-bar-row" key={l.subject + i}>
                  <span className="sd-bar-name">{l.subject}</span>
                  <div className="sd-bar-track">
                    <div style={{ width: `${l.percentage}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                  </div>
                  <span className="sd-bar-pct">{l.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sd-panel">
          <div className="sd-panel-head"><h3>Weekly Activity Overview</h3></div>
          <WeeklyChart days={d.weekly.days} />
          <div className="sd-week-tiles">
            <div className="sd-wt blue"><span>Classes</span><b>{String(d.weekly.totals.classes).padStart(2, '0')}</b></div>
            <div className="sd-wt purple"><span>Quizzes</span><b>{String(d.weekly.totals.quizzes).padStart(2, '0')}</b></div>
            <div className="sd-wt green"><span>Assignments</span><b>{String(d.weekly.totals.assignments).padStart(2, '0')}</b></div>
            <div className="sd-wt amber"><span>Hours Spent</span><b>{hoursSpent}</b></div>
          </div>
        </section>

        <section className="sd-panel">
          <div className="sd-panel-head"><h3>Recent Activities</h3></div>
          {d.recent.length === 0 ? (
            <p className="sd-empty">No activity recorded yet.</p>
          ) : (
            <ul className="sd-acts">
              {d.recent.map((a: any, i: number) => {
                const ic = ACT_ICON[a.kind] || ACT_ICON.quiz;
                return (
                  <li key={i}>
                    <span className={`sd-act-ic ${ic.cls}`}>{ic.icon}</span>
                    <div className="sd-act-body">
                      <div className="sd-act-title">{a.title}</div>
                      <div className="sd-act-detail">{a.detail}</div>
                    </div>
                    <div className="sd-act-meta">
                      <span className="sd-act-time">{ago(a.at)}</span>
                      {a.badge && <span className="sd-act-badge">{a.badge}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Row 2 ── */}
      <div className="sd-row two">
        <section className="sd-panel">
          <div className="sd-panel-head"><h3>Subject Wise Performance</h3></div>
          {d.subjectPerf.length === 0 ? (
            <p className="sd-empty">No subject data recorded yet.</p>
          ) : (
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead><tr><th>Subject</th><th>Progress</th><th>Status</th></tr></thead>
                <tbody>
                  {d.subjectPerf.map((r: any, i: number) => (
                    <tr key={r.subject + i}>
                      <td>{r.subject}</td>
                      <td>
                        <div className="sd-mini-bar">
                          <div style={{ width: `${r.progress}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                        </div>
                        <span className="sd-mini-pct">{r.progress}%</span>
                      </td>
                      <td><span className={`sd-status ${r.status.toLowerCase().replace(/\s+/g, '-')}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="sd-panel">
          <div className="sd-panel-head"><h3>Upcoming Schedule</h3></div>
          {d.upcoming.length === 0 ? (
            <p className="sd-empty">Nothing scheduled.</p>
          ) : (
            <ul className="sd-sched">
              {d.upcoming.map((u: any, i: number) => (
                <li key={i}>
                  <div className="sd-sched-date">
                    <span>{fmtDay(u.at)}</span>
                    <b>{new Date(u.at).getDate()}</b>
                  </div>
                  <div className="sd-sched-body">
                    <div className="sd-sched-title">{u.title}</div>
                    {u.detail && <div className="sd-sched-detail">{u.detail}</div>}
                  </div>
                  <div className="sd-sched-time">{fmtTime(u.at)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
