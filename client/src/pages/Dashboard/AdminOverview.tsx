import React, { useEffect, useState } from 'react';
import XpLeaderboard from '../../components/dashboard/XpLeaderboard';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api';
import './AdminOverview.css';

interface Stat { value: number; deltaPct: number | null; }
interface Overview {
  stats: { students: Stat; courses: Stat; batches: Stat; revenue: Stat; placements: Stat };
  enrollmentsSeries: { label: string; value: number }[];
  topCourses: { title: string; enrolled: number }[];
  fees: { collected: number; pending: number; overdue: number };
  batchStatus: { name: string; mode: string; enrolled: number; capacity: number }[];
  reminders: { kind: string; title: string; when: string | null }[];
  recentActivity: { icon: string; text: string; when: string }[];
  bottom: { newLeads: Stat; assessments: Stat; certificates: Stat; avgAttendance: Stat };
}

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const num = (n: number) => (n || 0).toLocaleString('en-IN');

const Delta: React.FC<{ pct: number | null }> = ({ pct }) => {
  if (pct === null || pct === undefined) return null;
  const up = pct >= 0;
  return <span className={`ov-delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span>;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
};
const whenLabel = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

// Tiny area sparkline from a numeric series
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const w = 120, h = 36;
  if (!data.length) return <svg width={w} height={h} />;
  const max = Math.max(1, ...data), min = Math.min(...data);
  const span = Math.max(1, max - min);
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - ((v - min) / span) * (h - 6) - 3}`);
  return (
    <svg width={w} height={h} className="ov-spark" preserveAspectRatio="none" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const AdminOverview: React.FC<{ firstName?: string }> = ({ firstName }) => {
  const navigate = useNavigate();
  const [d, setD] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res: any = await dashboardApi.getAdminOverview();
        setD((res?.data || res) as Overview);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load dashboard');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="ov-page"><div className="ov-msg">Loading dashboard…</div></div>;
  if (err || !d) return <div className="ov-page"><div className="ov-msg err">{err || 'No data'}</div></div>;

  const series = d.enrollmentsSeries.map(p => p.value);
  const sparkVals = series.length ? series : [0, 0];

  // Enrollments area chart
  const cw = 640, ch = 220, pad = 8;
  const max = Math.max(1, ...series);
  const stepX = cw / Math.max(1, series.length - 1);
  const linePts = series.map((v, i) => `${i * stepX},${ch - pad - (v / max) * (ch - pad * 4)}`);
  const areaPath = series.length ? `M0,${ch} ${linePts.map(p => 'L' + p).join(' ')} L${cw},${ch} Z` : '';

  // Fee donut
  const feeTotal = Math.max(1, d.fees.collected + d.fees.pending + d.fees.overdue);
  const R = 54, C = 2 * Math.PI * R;
  const seg = (v: number) => (v / feeTotal) * C;
  const collectedLen = seg(d.fees.collected);
  const pendingLen = seg(d.fees.pending);
  const overdueLen = seg(d.fees.overdue);

  const STAT_CARDS = [
    { key: 'students', label: 'Total Students', icon: '🎓', tint: 'blue', value: num(d.stats.students.value), delta: d.stats.students.deltaPct },
    { key: 'courses', label: 'Total Courses', icon: '📚', tint: 'green', value: num(d.stats.courses.value), delta: d.stats.courses.deltaPct },
    { key: 'batches', label: 'Active Batches', icon: '👥', tint: 'purple', value: num(d.stats.batches.value), delta: d.stats.batches.deltaPct },
    { key: 'revenue', label: 'Total Revenue', icon: '🧾', tint: 'orange', value: inr(d.stats.revenue.value), delta: d.stats.revenue.deltaPct },
    { key: 'placements', label: 'Placements', icon: '💼', tint: 'cyan', value: num(d.stats.placements.value), delta: d.stats.placements.deltaPct },
  ];
  const sparkColors: Record<string, string> = { blue: '#3b82f6', green: '#22c55e', purple: '#8b5cf6', orange: '#f97316', cyan: '#06b6d4' };

  const topMax = Math.max(1, ...d.topCourses.map(c => c.enrolled));
  const courseColors = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4'];

  return (
    <div className="ov-page">
      <XpLeaderboard />
      <div className="ov-head">
        <div>
          <h1>Welcome back, {firstName || 'Admin'} 👋</h1>
          <p>Here's what's happening with CodeBegun today.</p>
        </div>
        <span className="ov-range">Last 30 days</span>
      </div>

      {/* Stat cards */}
      <div className="ov-stats">
        {STAT_CARDS.map(c => (
          <div className="ov-card ov-stat" key={c.key}>
            <div className="ov-stat-top">
              <span className={`ov-stat-ic ${c.tint}`}>{c.icon}</span>
              <span className="ov-stat-label">{c.label}</span>
            </div>
            <div className="ov-stat-value">{c.value}</div>
            <div className="ov-stat-foot">
              <Delta pct={c.delta} />
              {c.delta !== null && <span className="ov-stat-sub">vs last month</span>}
            </div>
            <Sparkline data={sparkVals} color={sparkColors[c.tint]} />
          </div>
        ))}
      </div>

      {/* Row: enrollments + recent activity + top courses */}
      <div className="ov-row3">
        <div className="ov-card">
          <div className="ov-card-head"><h3>Student Enrollments Overview</h3></div>
          <svg className="ov-area" viewBox={`0 0 ${cw} ${ch}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="ovArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill="url(#ovArea)" />}
            {series.length > 0 && <polyline points={linePts.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />}
          </svg>
          <div className="ov-area-x">
            <span>{d.enrollmentsSeries[0]?.label.slice(5)}</span>
            <span>{d.enrollmentsSeries[Math.floor(d.enrollmentsSeries.length / 2)]?.label.slice(5)}</span>
            <span>{d.enrollmentsSeries[d.enrollmentsSeries.length - 1]?.label.slice(5)}</span>
          </div>
        </div>

        <div className="ov-card">
          <div className="ov-card-head"><h3>Recent Activity</h3></div>
          <ul className="ov-feed">
            {d.recentActivity.length === 0 ? <li className="ov-empty">No recent activity</li> :
              d.recentActivity.map((a, i) => (
                <li key={i} className="ov-feed-item">
                  <span className="ov-feed-ic">{a.icon}</span>
                  <div className="ov-feed-body"><span>{a.text}</span><time>{timeAgo(a.when)}</time></div>
                </li>
              ))}
          </ul>
        </div>

        <div className="ov-card">
          <div className="ov-card-head"><h3>Top Courses</h3></div>
          <ul className="ov-top">
            {d.topCourses.length === 0 ? <li className="ov-empty">No courses yet</li> :
              d.topCourses.map((c, i) => (
                <li key={i} className="ov-top-item">
                  <div className="ov-top-line"><span className="ov-top-name">{c.title}</span><span className="ov-top-count">{num(c.enrolled)} Enrolled</span></div>
                  <div className="ov-top-bar"><div style={{ width: `${(c.enrolled / topMax) * 100}%`, background: courseColors[i % courseColors.length] }} /></div>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Row: fee donut + batch status + reminders */}
      <div className="ov-row3">
        <div className="ov-card">
          <div className="ov-card-head"><h3>Fee Collection Summary</h3></div>
          <div className="ov-fee">
            <div className="ov-donut-wrap">
              <svg viewBox="0 0 140 140" className="ov-donut">
                <circle cx="70" cy="70" r={R} fill="none" stroke="#eef2f7" strokeWidth="16" />
                <circle cx="70" cy="70" r={R} fill="none" stroke="#22c55e" strokeWidth="16" strokeDasharray={`${collectedLen} ${C}`} strokeDashoffset="0" transform="rotate(-90 70 70)" strokeLinecap="butt" />
                <circle cx="70" cy="70" r={R} fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray={`${pendingLen} ${C}`} strokeDashoffset={`${-collectedLen}`} transform="rotate(-90 70 70)" />
                <circle cx="70" cy="70" r={R} fill="none" stroke="#ef4444" strokeWidth="16" strokeDasharray={`${overdueLen} ${C}`} strokeDashoffset={`${-(collectedLen + pendingLen)}`} transform="rotate(-90 70 70)" />
              </svg>
              <div className="ov-donut-center"><span>{inr(d.fees.collected)}</span><small>Collected</small></div>
            </div>
            <ul className="ov-fee-legend">
              <li><i className="dot g" />Collected <b>{inr(d.fees.collected)}</b></li>
              <li><i className="dot y" />Pending <b>{inr(d.fees.pending)}</b></li>
              <li><i className="dot r" />Overdue <b>{inr(d.fees.overdue)}</b></li>
            </ul>
          </div>
          <button className="ov-btn" onClick={() => navigate('/fees')}>Go to Fee Management →</button>
        </div>

        <div className="ov-card">
          <div className="ov-card-head"><h3>Batch Status</h3></div>
          <ul className="ov-batches">
            {d.batchStatus.length === 0 ? <li className="ov-empty">No active batches</li> :
              d.batchStatus.map((b, i) => (
                <li key={i} className="ov-batch">
                  <span className="ov-batch-name">{b.name}</span>
                  <span className={`ov-batch-mode ${b.mode}`}>{b.mode}</span>
                  <span className="ov-batch-cap">{b.enrolled} / {b.capacity}</span>
                </li>
              ))}
          </ul>
        </div>

        <div className="ov-card">
          <div className="ov-card-head"><h3>Upcoming Reminders</h3></div>
          <ul className="ov-reminders">
            {d.reminders.length === 0 ? <li className="ov-empty">Nothing upcoming</li> :
              d.reminders.map((r, i) => (
                <li key={i} className="ov-reminder">
                  <span className={`ov-rem-ic ${r.kind}`}>📅</span>
                  <div className="ov-rem-body"><span>{r.title}</span><time>{whenLabel(r.when)}</time></div>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="ov-bottom">
        <div className="ov-card ov-mini"><span className="ov-mini-ic purple">🧩</span><div><div className="ov-mini-label">New Leads This Month</div><div className="ov-mini-val">{num(d.bottom.newLeads.value)} <Delta pct={d.bottom.newLeads.deltaPct} /></div></div></div>
        <div className="ov-card ov-mini"><span className="ov-mini-ic blue">📋</span><div><div className="ov-mini-label">Assessments Conducted</div><div className="ov-mini-val">{num(d.bottom.assessments.value)} <Delta pct={d.bottom.assessments.deltaPct} /></div></div></div>
        <div className="ov-card ov-mini"><span className="ov-mini-ic green">📜</span><div><div className="ov-mini-label">Certificates Issued</div><div className="ov-mini-val">{num(d.bottom.certificates.value)} <Delta pct={d.bottom.certificates.deltaPct} /></div></div></div>
        <div className="ov-card ov-mini"><span className="ov-mini-ic teal">✅</span><div><div className="ov-mini-label">Average Attendance</div><div className="ov-mini-val">{d.bottom.avgAttendance.value}% <Delta pct={d.bottom.avgAttendance.deltaPct} /></div></div></div>
      </div>
    </div>
  );
};

export default AdminOverview;
