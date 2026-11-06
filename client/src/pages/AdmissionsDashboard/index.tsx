import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { leadReportApi, userApi } from '../../api';
import './AdmissionsDashboard.css';

/**
 * Admissions dashboard — conversion of leads CREATED in the chosen dates, from first-reach
 * milestones (server: services/admissionsReportService.ts, which documents every definition).
 * Single-series funnel bars in one hue; tables are the accessible view of everything shown.
 */
type Preset = '7' | '30' | '90' | 'month' | 'custom';
const iso = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
const inr = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);
const pc = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n}%`);

const AdmissionsDashboard: React.FC = () => {
  const [preset, setPreset] = useState<Preset>('30');
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(iso(new Date()));
  const [assignedTo, setAssignedTo] = useState('');
  const [source, setSource] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    userApi.getUsers().then((r: any) => setStaff((r.data || []).filter((u: any) => ['TENANT_ADMIN', 'STAFF', 'INSTRUCTOR'].includes(u.role) || u.customRoleId))).catch(() => {});
  }, []);

  const pickPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === 'month') { setFrom(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(iso(now)); }
    else if (p !== 'custom') { setFrom(iso(new Date(Date.now() - (Number(p) - 1) * 86_400_000))); setTo(iso(now)); }
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r: any = await leadReportApi.admissions({ from, to, assignedTo: assignedTo || undefined, source: source || undefined });
      setData(r.data);
    } catch (e: any) { setError(e.message || 'Could not load the report'); }
    finally { setLoading(false); }
  }, [from, to, assignedTo, source]);
  useEffect(() => { load(); }, [load]);

  const funnelMax = useMemo(() => Math.max(1, ...(data?.funnel || []).map((s: any) => s.count)), [data]);
  const f = (key: string) => data?.funnel?.find((s: any) => s.key === key);

  return (
    <div className="ad-page">
      <header className="ad-header">
        <div>
          <h1>Admissions dashboard</h1>
          <p>How leads created in these dates moved through admissions.</p>
        </div>
      </header>

      <div className="ad-filters" role="group" aria-label="Filters">
        <div className="btn-group btn-group-sm" role="group" aria-label="Date range">
          {([['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['custom', 'Custom']] as [Preset, string][]).map(([k, l]) => (
            <button key={k} type="button" className={`btn ${preset === k ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => pickPreset(k)}>{l}</button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="d-flex align-items-center gap-1">
            <input type="date" className="form-control form-control-sm" value={from} max={to} onChange={e => setFrom(e.target.value)} aria-label="From" />
            <span className="small text-muted">to</span>
            <input type="date" className="form-control form-control-sm" value={to} min={from} onChange={e => setTo(e.target.value)} aria-label="To" />
          </div>
        )}
        <select className="form-select form-select-sm ad-select" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} aria-label="Counsellor">
          <option value="">All counsellors</option>
          {staff.map(u => <option key={u._id} value={u._id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}</option>)}
        </select>
        <select className="form-select form-select-sm ad-select" value={source} onChange={e => setSource(e.target.value)} aria-label="Source">
          <option value="">All sources</option>
          {['meta_form', 'google_ads', 'website', 'whatsapp', 'walkin', 'referral', 'google_sheet', 'other'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {loading && !data ? <div className="ad-empty">Loading…</div> : data && (
        <>
          {data.truncated && <div className="alert alert-warning py-2">Only the first 50,000 leads are counted. Narrow the dates.</div>}

          <section className="ad-tiles" aria-label="Headline numbers">
            <Tile label="Leads" value={data.cohort.toLocaleString('en-IN')} />
            <Tile label="Qualified" value={(f('qualified')?.count ?? 0).toLocaleString('en-IN')} sub={`${pc(f('qualified')?.ofCohort)} of leads`} />
            <Tile label="Enrolled" value={(f('enrolled')?.count ?? 0).toLocaleString('en-IN')} sub={`${pc(f('enrolled')?.ofCohort)} of leads`} />
            <Tile label="Lost" value={data.lost.toLocaleString('en-IN')} sub={`Nurture ${data.nurture}`} />
            <Tile label="Median first contact" value={data.firstContact.medianHours === null ? '—' : `${data.firstContact.medianHours} h`} sub={`${pc(data.firstContact.within1hPct)} within 1 hour`} />
            <Tile label="Overdue follow-ups" value={data.open.overdue.toLocaleString('en-IN')} sub={`${pc(data.open.overduePct)} of ${data.open.total} open`} />
            {data.cost.hasSpend ? (
              <>
                <Tile label="Meta spend" value={inr(data.cost.spend)} />
                <Tile label="Cost per lead" value={inr(data.cost.costPerLead)} />
                <Tile label="Cost per qualified" value={inr(data.cost.costPerQualified)} />
                <Tile label="Cost per enrolment" value={inr(data.cost.costPerEnrolment)} />
              </>
            ) : (
              <div className="ad-tile ad-tile-note">No Meta spend synced for these dates. Connect ad spend on the Meta sync page to see cost per lead.</div>
            )}
          </section>

          <section className="ad-card" aria-labelledby="ad-funnel-h">
            <h2 id="ad-funnel-h">Funnel</h2>
            <p className="ad-note">Bar = leads that ever reached the step. “Step” = share of the previous step; “Overall” = share of all leads in these dates.</p>
            <div className="ad-funnel">
              {data.funnel.map((s: any) => (
                <div key={s.key} className={`ad-frow${hover === s.key ? ' hover' : ''}`} onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}
                  title={`${s.label}: ${s.count} leads · step ${pc(s.fromPrevious)} · overall ${pc(s.ofCohort)}`}>
                  <div className="ad-flabel">{s.label}</div>
                  <div className="ad-fbar-track"><div className="ad-fbar" style={{ width: `${(s.count / funnelMax) * 100}%` }} /></div>
                  <div className="ad-fnum"><strong>{s.count.toLocaleString('en-IN')}</strong></div>
                  <div className="ad-fpct">{s.fromPrevious === null ? '' : `step ${pc(s.fromPrevious)}`}</div>
                  <div className="ad-fpct">{s.key === 'created' ? '' : `overall ${pc(s.ofCohort)}`}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="ad-two">
            <section className="ad-card" aria-labelledby="ad-c-h">
              <h2 id="ad-c-h">Counsellors</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead><tr><th>Counsellor</th><th className="text-end">Leads</th><th className="text-end">Contacted</th><th className="text-end">Qualified</th><th className="text-end">Enrolled</th><th className="text-end">Enrol %</th></tr></thead>
                  <tbody>
                    {data.counsellors.map((c: any) => (
                      <tr key={c.id}><td>{c.name}</td><td className="text-end">{c.leads}</td><td className="text-end">{c.contacted} <span className="text-muted">({pc(c.contactRate)})</span></td>
                        <td className="text-end">{c.qualified}</td><td className="text-end">{c.enrolled}</td><td className="text-end">{pc(c.enrolRate)}</td></tr>
                    ))}
                    {!data.counsellors.length && <tr><td colSpan={6} className="text-muted">No leads.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="ad-card" aria-labelledby="ad-a-h">
              <h2 id="ad-a-h">Open leads by age</h2>
              <p className="ad-note">All open leads now (not only these dates). Lost and enrolled are left out.</p>
              <table className="table table-sm align-middle">
                <tbody>
                  <tr><td>Under 1 day</td><td className="text-end">{data.open.aging.under1d}</td></tr>
                  <tr><td>1–7 days</td><td className="text-end">{data.open.aging.d1to7}</td></tr>
                  <tr><td>7–30 days</td><td className="text-end">{data.open.aging.d7to30}</td></tr>
                  <tr><td>Over 30 days</td><td className="text-end">{data.open.aging.over30}</td></tr>
                  <tr><td>No follow-up set</td><td className="text-end">{data.open.noFollowUp}</td></tr>
                </tbody>
              </table>
            </section>
          </div>

          <section className="ad-card" aria-labelledby="ad-camp-h">
            <h2 id="ad-camp-h">Campaigns</h2>
            <p className="ad-note">Lead quality by campaign. Cost columns need Meta spend synced for these dates.</p>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead><tr><th>Campaign</th><th className="text-end">Leads</th><th className="text-end">Qualified</th><th className="text-end">Qualified %</th><th className="text-end">Enrolled</th>
                  <th className="text-end">Spend</th><th className="text-end">Per lead</th><th className="text-end">Per qualified</th><th className="text-end">Per enrolment</th></tr></thead>
                <tbody>
                  {data.campaigns.map((c: any, i: number) => (
                    <tr key={`${c.campaignId || c.name}-${i}`}><td>{c.name}</td><td className="text-end">{c.leads}</td><td className="text-end">{c.qualified}</td><td className="text-end">{pc(c.qualifyRate)}</td>
                      <td className="text-end">{c.enrolled}</td><td className="text-end">{inr(c.spend)}</td><td className="text-end">{inr(c.costPerLead)}</td>
                      <td className="text-end">{inr(c.costPerQualified)}</td><td className="text-end">{inr(c.costPerEnrolment)}</td></tr>
                  ))}
                  {!data.campaigns.length && <tr><td colSpan={9} className="text-muted">No campaign leads in these dates.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <p className="ad-note">Milestone dates exist only from the CRM redesign onward, so leads moved before it show only their current stage and older dates under-count the early steps.</p>
        </>
      )}
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="ad-tile">
    <div className="ad-tile-label">{label}</div>
    <div className="ad-tile-value">{value}</div>
    {sub && <div className="ad-tile-sub">{sub}</div>}
  </div>
);

export default AdmissionsDashboard;
