import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { leadApi, leadReportApi } from '../../api';
import { FUNNEL_RAMP } from '../LeadDashboard/FunnelChart';
import './AdmissionsDashboard.css';

/**
 * Admissions dashboard — leads CREATED in the chosen dates and how far they got, compared with
 * the period of the same length before. Every definition lives in
 * server/src/services/admissionsReportService.ts. Charts: funnel bars on the validated ordinal
 * blue ramp, one-series trend (categorical slot 1), age donut on a validated 4-step ramp.
 */
type Preset = '30' | '7' | '90' | 'month' | 'custom';
const istIso = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
const inr = (n?: number | null) => (n === null || n === undefined ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);
const num = (n?: number | null) => (n === null || n === undefined ? '—' : n.toLocaleString('en-IN'));
const pc = (n?: number | null) => (n === null || n === undefined ? '—' : `${n}%`);
/** Hours up to two days, then days. */
const fmtHours = (h?: number | null) => (h === null || h === undefined ? '—' : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} days`);
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const SOURCE_LABEL: Record<string, string> = { meta_form: 'Meta Ads', google_ads: 'Google Ads', website: 'Website', whatsapp: 'WhatsApp', walkin: 'Walk-in', referral: 'Referral', assessment: 'Assessment', google_sheet: 'Google Sheet', other: 'Other' };
const SERIES_BLUE = '#2a78d6';
const AGE_RAMP = ['#86b6ef', '#5598e7', '#1c5cab', '#0d366b']; // young → old (validated ordinal ramp)
const FUNNEL_ROWS: { key: string; label: string; icon: string }[] = [
  { key: 'created', label: 'Leads', icon: 'bi-people' },
  { key: 'contacting', label: 'Contacted', icon: 'bi-telephone' },
  { key: 'connected', label: 'Connected', icon: 'bi-check-circle' },
  { key: 'qualified', label: 'Qualified', icon: 'bi-award' },
  { key: 'demo', label: 'Demo', icon: 'bi-display' },
  { key: 'enrolled', label: 'Enrolled', icon: 'bi-mortarboard' },
];

/** ▲/▼ change with the right colour: `goodWhenUp` false for things where lower is better. */
const Change: React.FC<{ value: number | null | undefined; unit?: string; goodWhenUp?: boolean; suffix?: string; note?: string }> = ({ value, unit = '%', goodWhenUp = true, suffix, note }) => {
  if (value === null || value === undefined) return <span className="ad-change none">{note || 'No earlier data'}</span>;
  const up = value > 0; const flat = value === 0;
  const good = flat ? null : up === goodWhenUp;
  return (
    <span className={`ad-change ${flat ? 'flat' : good ? 'good' : 'bad'}`}>
      {!flat && <i className={`bi ${up ? 'bi-arrow-up' : 'bi-arrow-down'}`} aria-hidden="true" />}
      {up ? '+' : ''}{value}{unit}{suffix ? <span className="ad-change-sub"> {suffix}</span> : null}
    </span>
  );
};

/** Single-series area line with a hover crosshair + tooltip. */
const LeadsTrend: React.FC<{ points: { day: string; count: number }[]; weekly: boolean }> = ({ points, weekly }) => {
  const W = 520; const H = 220; const L = 34; const R = 14; const T = 14; const B = 28;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const maxRaw = Math.max(1, ...points.map(p => p.count));
  const step = maxRaw <= 5 ? 1 : maxRaw <= 10 ? 2 : Math.ceil(maxRaw / 5 / 5) * 5;
  const max = step * Math.ceil(maxRaw / step);
  const n = Math.max(1, points.length - 1);
  const x = (i: number) => L + (W - L - R) * (points.length === 1 ? 0.5 : i / n);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.count)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';
  const ticks: number[] = []; for (let t = 0; t <= max; t += step) ticks.push(t);
  const label = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const every = Math.max(1, Math.ceil(points.length / 8));
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = ref.current?.getBoundingClientRect(); if (!box) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(((px - L) / (W - L - R)) * n))));
  };
  if (!points.length) return <p className="ad-empty">No leads in these dates.</p>;
  const hp = hover !== null ? points[hover] : null;
  return (
    <div className="ad-trend">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Leads received per ${weekly ? 'week' : 'day'}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map(t => (<g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="ad-grid" /><text x={L - 6} y={y(t) + 3} textAnchor="end" className="ad-axis">{t}</text></g>))}
        {points.map((p, i) => ((i % every === 0 && points.length - 1 - i >= every / 2) || i === points.length - 1) && (
          <text key={p.day} x={x(i)} y={H - 8} textAnchor={i === points.length - 1 && points.length > 1 ? 'end' : i === 0 ? 'start' : 'middle'} className="ad-axis">{label(p.day)}</text>
        ))}
        <path d={area} fill={SERIES_BLUE} opacity={0.12} />
        <path d={line} fill="none" stroke={SERIES_BLUE} strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="ad-crosshair" />}
        {hover !== null && <circle cx={x(hover)} cy={y(points[hover].count)} r={5} fill={SERIES_BLUE} stroke="#fff" strokeWidth={2} />}
        {hover === null && points.length > 0 && <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].count)} r={4} fill={SERIES_BLUE} stroke="#fff" strokeWidth={2} />}
        <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent" />
      </svg>
      {hp && hover !== null && (
        <div className="ad-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
          <strong>{hp.count} lead{hp.count === 1 ? '' : 's'}</strong>
          <span>{weekly ? 'Week of ' : ''}{label(hp.day)}</span>
        </div>
      )}
    </div>
  );
};

/** Donut of open leads by age; segments carry a 2px surface gap. */
const AgeDonut: React.FC<{ parts: { label: string; value: number }[]; total: number }> = ({ parts, total }) => {
  const R = 70; const SW = 26; const C = 2 * Math.PI * R; const gap = total > 0 && parts.filter(p => p.value).length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <svg viewBox="0 0 180 180" className="ad-donut" role="img" aria-label={parts.map(p => `${p.label} ${p.value}`).join(', ')}>
      <circle cx={90} cy={90} r={R} fill="none" stroke="#eef0f3" strokeWidth={SW} />
      {total > 0 && parts.map((p, i) => {
        const len = (p.value / total) * C;
        const el = p.value ? (
          <circle key={p.label} cx={90} cy={90} r={R} fill="none" stroke={AGE_RAMP[i]} strokeWidth={SW}
            strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)">
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        ) : null;
        offset += len;
        return el;
      })}
      <text x={90} y={88} textAnchor="middle" className="ad-donut-num">{total.toLocaleString('en-IN')}</text>
      <text x={90} y={108} textAnchor="middle" className="ad-donut-label">Open Leads</text>
    </svg>
  );
};

const AdmissionsDashboard: React.FC = () => {
  const [preset, setPreset] = useState<Preset>('30');
  const [custom, setCustom] = useState({ from: istIso(new Date(Date.now() - 29 * 86_400_000)), to: istIso(new Date()) });
  const [showCustom, setShowCustom] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [source, setSource] = useState('');
  const [course, setCourse] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    const now = new Date();
    if (preset === 'custom') return custom;
    if (preset === 'month') { const ist = new Date(now.getTime() + 330 * 60_000); return { from: new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1)).toISOString().slice(0, 10), to: istIso(now) }; }
    return { from: istIso(new Date(now.getTime() - (Number(preset) - 1) * 86_400_000)), to: istIso(now) };
  }, [preset, custom]);

  useEffect(() => {
    leadApi.getCounsellors().then((r: any) => setStaff(r.data || [])).catch(() => {});
    leadApi.getSources().then((r: any) => setSources((r.data || []).map((s: any) => (typeof s === 'string' ? s : s._id || s.source)).filter(Boolean))).catch(() => {});
    leadReportApi.dashboard().then((r: any) => setCourses(r.data?.options?.courses || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r: any = await leadReportApi.admissions({ from: range.from, to: range.to, assignedTo: assignedTo || undefined, source: source || undefined, course: course || undefined });
      setData(r.data);
    } catch (e: any) { setError(e.message || 'Could not load the report'); }
    finally { setLoading(false); }
  }, [range.from, range.to, assignedTo, source, course]);
  useEffect(() => { load(); }, [load]);

  const f = (key: string) => data?.funnel?.find((s: any) => s.key === key);
  const cmp = data?.comparison;
  const days = Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000) + 1;
  const vs = `vs previous ${days} day${days === 1 ? '' : 's'}`;
  const funnelMax = Math.max(1, f('created')?.count || 0);
  const aging = data?.open?.aging || {};
  const ageParts = [
    { label: 'Under 1 day', value: aging.under1d || 0 }, { label: '1 – 7 days', value: aging.d1to7 || 0 },
    { label: '7 – 30 days', value: aging.d7to30 || 0 }, { label: 'Over 30 days', value: aging.over30 || 0 },
  ];
  const openTotal = data?.open?.total || 0;
  const campaigns = (data?.campaigns || []).filter((c: any) => c.leads > 0 || c.spend);

  return (
    <div className="ad-page">
      <header className="ad-head">
        <h1>Admissions Dashboard</h1>
        <p>Track leads, conversions, counsellors and campaign performance.</p>
      </header>

      <div className="ad-filters" role="group" aria-label="Filters">
        <div className="ad-seg" role="group" aria-label="Date range">
          {([['30', 'Last 30 Days'], ['7', 'Last 7 Days'], ['90', 'Last 90 Days'], ['month', 'This Month']] as [Preset, string][]).map(([k, l]) => (
            <button key={k} type="button" className={preset === k ? 'active' : ''} onClick={() => { setPreset(k); setShowCustom(false); }}>{l}</button>
          ))}
          <button type="button" className={preset === 'custom' ? 'active' : ''} onClick={() => { setPreset('custom'); setShowCustom(s => !s); }}>Custom <i className="bi bi-calendar3" aria-hidden="true" /></button>
        </div>
        {preset === 'custom' && showCustom && (
          <div className="ad-custom">
            <input type="date" value={custom.from} max={custom.to} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} aria-label="From" />
            <span>to</span>
            <input type="date" value={custom.to} min={custom.from} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} aria-label="To" />
          </div>
        )}
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} aria-label="Counsellor">
          <option value="">All Counsellors</option>
          {staff.map(u => <option key={u._id} value={u._id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}</option>)}
        </select>
        <select value={source} onChange={e => setSource(e.target.value)} aria-label="Source">
          <option value="">All Sources</option>
          {sources.map(s => <option key={s} value={s}>{SOURCE_LABEL[s] || s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={course} onChange={e => setCourse(e.target.value)} aria-label="Course">
          <option value="">All Courses</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && !data ? <div className="ad-skeleton" /> : data && (
        <>
          {data.truncated && <div className="alert alert-warning py-2">Only the first 50,000 leads are counted. Narrow the dates.</div>}

          <section className="ad-tiles" aria-label="Headline numbers">
            <div className="ad-tile t-blue"><span className="ad-ico"><i className="bi bi-people" /></span><div><div className="ad-tlabel">Total Leads</div><div className="ad-tvalue">{num(data.cohort)}</div><Change value={cmp?.totalChangePct} suffix={vs} /></div></div>
            <div className="ad-tile t-green"><span className="ad-ico"><i className="bi bi-funnel" /></span><div><div className="ad-tlabel">Qualified</div><div className="ad-tvalue">{num(f('qualified')?.count)}</div><Change value={cmp?.qualifiedChangePct} /></div></div>
            <div className="ad-tile t-purple"><span className="ad-ico"><i className="bi bi-mortarboard" /></span><div><div className="ad-tlabel">Enrolled</div><div className="ad-tvalue">{num(f('enrolled')?.count)}</div><Change value={cmp?.enrolledChangePct} /></div></div>
            <div className="ad-tile t-amber"><span className="ad-ico"><i className="bi bi-lightning-charge" /></span><div>
              <div className="ad-tlabel">Conversion Rate <i className="bi bi-info-circle" title="Enrolled ÷ leads created in these dates" aria-label="Enrolled divided by leads created in these dates" /></div>
              <div className="ad-tvalue">{pc(f('enrolled')?.ofCohort ?? null)}</div><Change value={cmp?.conversionChangePp} unit=" pp" /></div></div>
            <div className="ad-tile t-teal"><span className="ad-ico"><i className="bi bi-clock" /></span><div>
              <div className="ad-tlabel">Median First Contact</div>
              <div className="ad-tvalue">{fmtHours(data.firstContact.medianHours)}</div>
              <Change value={cmp?.firstContactChangePct} goodWhenUp={false} suffix={cmp?.firstContactChangePct !== null && cmp?.firstContactChangePct !== undefined ? (cmp.firstContactChangePct < 0 ? '(faster)' : cmp.firstContactChangePct > 0 ? '(slower)' : '') : ''} /></div></div>
            <div className="ad-tile t-red"><span className="ad-ico"><i className="bi bi-calendar-x" /></span><div>
              <div className="ad-tlabel">Overdue Follow-ups</div><div className="ad-tvalue">{num(data.open.overdue)}</div>
              <span className="ad-change none">{pc(data.open.overduePct)} of open leads, now</span></div></div>
          </section>

          <section className="ad-row3">
            <div className="ad-card">
              <h2>Admissions Funnel <i className="bi bi-info-circle" title="Leads created in these dates that ever reached each step" aria-hidden="true" /></h2>
              <p className="ad-sub">Lead journey from first contact to enrolment.</p>
              <ul className="ad-funnel">
                {FUNNEL_ROWS.map((r, i) => {
                  const s = f(r.key);
                  return (
                    <li key={r.key} title={s?.fromPrevious !== null && s?.fromPrevious !== undefined ? `${s.fromPrevious}% of the previous step` : undefined}>
                      <span className="ad-fico" aria-hidden="true"><i className={`bi ${r.icon}`} /></span>
                      <span className="ad-flabel">{r.label}</span>
                      <span className="ad-ftrack"><span className="ad-fbar" style={{ width: `${((s?.count || 0) / funnelMax) * 100}%`, background: FUNNEL_RAMP[i] }} /></span>
                      <span className="ad-fnum"><strong>{num(s?.count)}</strong> <span>({pc(s?.ofCohort ?? (r.key === 'created' ? 100 : null))})</span></span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="ad-card">
              <h2>Leads Trend</h2>
              <p className="ad-sub">{data.trend.unit === 'week' ? 'Weekly' : 'Daily'} leads received over time.</p>
              <LeadsTrend points={data.trend.points} weekly={data.trend.unit === 'week'} />
            </div>

            <div className="ad-card">
              <h2>Open Leads by Age</h2>
              <p className="ad-sub">All open leads now (lost and enrolled left out).</p>
              <div className="ad-age">
                <AgeDonut parts={ageParts} total={openTotal} />
                <ul className="ad-legend">
                  {ageParts.map((p, i) => (
                    <li key={p.label}><span className="ad-swatch" style={{ background: AGE_RAMP[i] }} aria-hidden="true" />{p.label}<strong>{num(p.value)}</strong><span className="ad-legend-pct">({pc(openTotal ? Math.round((p.value / openTotal) * 1000) / 10 : null)})</span></li>
                  ))}
                  <li className="ad-legend-extra"><span className="ad-swatch ad-swatch-outline" aria-hidden="true" />No follow-up set<strong>{num(data.open.noFollowUp)}</strong><span className="ad-legend-pct">({pc(openTotal ? Math.round((data.open.noFollowUp / openTotal) * 1000) / 10 : null)})</span></li>
                </ul>
              </div>
            </div>
          </section>

          <section className="ad-row2">
            <div className="ad-card">
              <div className="ad-card-head"><div><h2>Counsellor Performance</h2><p className="ad-sub">Leads, conversions and enrolments by counsellor.</p></div><Link to="/team-activity" className="ad-link">View All <i className="bi bi-arrow-right" /></Link></div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Counsellor</th><th className="num">Leads</th><th className="num">Contacted</th><th className="num">Qualified</th><th className="num">Enrolled</th><th className="num">Conversion</th></tr></thead>
                  <tbody>
                    {data.counsellors.map((c: any) => (
                      <tr key={c.id}>
                        <td><span className="ad-avatar" aria-hidden="true">{initials(c.name)}</span>{c.name}</td>
                        <td className="num">{num(c.leads)}</td><td className="num">{num(c.contacted)} <span className="ad-muted">({pc(c.contactRate)})</span></td>
                        <td className="num">{num(c.qualified)}</td><td className="num">{num(c.enrolled)}</td><td className="num">{pc(c.enrolRate)}</td>
                      </tr>
                    ))}
                    {!data.counsellors.length && <tr><td colSpan={6} className="ad-empty">No leads in these dates.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ad-card">
              <div className="ad-card-head"><div><h2>Active Campaigns</h2><p className="ad-sub">Campaign performance for the selected duration.</p></div><Link to="/meta-sync" className="ad-link">View All <i className="bi bi-arrow-right" /></Link></div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead><tr><th>Campaign</th><th className="num">Leads</th><th className="num">Qualified</th><th className="num">Conversion</th><th className="num">Spend</th><th className="num">CPL</th></tr></thead>
                  <tbody>
                    {campaigns.slice(0, 12).map((c: any, i: number) => (
                      <tr key={`${c.campaignId || c.name}-${i}`}>
                        <td className="ad-camp" title={c.name}>{c.name}</td>
                        <td className="num">{num(c.leads)}</td><td className="num">{num(c.qualified)}</td>
                        <td className="num">{c.leads ? pc(Math.round((c.enrolled / c.leads) * 1000) / 10) : '—'}</td>
                        <td className="num">{inr(c.spend)}</td><td className="num">{inr(c.costPerLead)}</td>
                      </tr>
                    ))}
                    {!campaigns.length && <tr><td colSpan={6} className="ad-empty">No campaign leads in these dates.</td></tr>}
                  </tbody>
                </table>
              </div>
              {!data.cost.hasSpend && <p className="ad-note">Spend and CPL appear once Meta ad spend is synced (Meta Sync page).</p>}
            </div>
          </section>

          <p className="ad-note">Counts use the first time each lead reached a step, so reopened leads are not counted twice. Steps are recorded from the CRM upgrade onward; older leads count only where they are now.</p>
        </>
      )}
    </div>
  );
};

export default AdmissionsDashboard;
