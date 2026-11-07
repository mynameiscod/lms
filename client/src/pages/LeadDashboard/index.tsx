import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadReportApi, leadStageApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common';
import StageChangeDialog from '../../components/leads/StageChangeDialog';
import FunnelChart, { FUNNEL_RAMP } from './FunnelChart';
import TrendChart, { SERIES } from './TrendChart';
import './LeadDashboard.css';

/**
 * Lead Dashboard — pipeline, conversions and the working list on one page.
 * Data: GET /lead-reports/dashboard (tiles, funnel, trend, follow-up tasks, tab counts) and
 * GET /leads (the table). Period numbers follow the date range; follow-up numbers are "now"
 * (see server/src/services/leadDashboardService.ts).
 */

type RangeKey = 'this_month' | 'last_month' | '7' | '30' | '90' | 'all' | 'custom';
type Tab = 'all' | 'mine' | 'dueToday' | 'overdue' | 'nurture' | 'lost';
const RANGE_LABEL: Record<RangeKey, string> = {
  this_month: 'This month', last_month: 'Last month', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', all: 'All time', custom: 'Custom',
};
const SOURCE_LABEL: Record<string, string> = {
  meta_form: 'Meta Ads', meta_ads: 'Meta Ads', facebook: 'Facebook', instagram: 'Instagram', google_ads: 'Google Ads', website: 'Website',
  whatsapp: 'WhatsApp', walkin: 'Walk-in', referral: 'Referral', phone: 'Phone', google_sheet: 'Google Sheet', linkedin: 'LinkedIn', youtube: 'YouTube', assessment: 'Assessment', other: 'Other',
};
const SOURCE_ICON: Record<string, string> = {
  meta_form: 'bi-meta', meta_ads: 'bi-meta', facebook: 'bi-facebook', instagram: 'bi-instagram', google_ads: 'bi-google', website: 'bi-globe',
  whatsapp: 'bi-whatsapp', walkin: 'bi-door-open', referral: 'bi-people', phone: 'bi-telephone', google_sheet: 'bi-table', linkedin: 'bi-linkedin', youtube: 'bi-youtube', assessment: 'bi-clipboard-check',
};

const istIso = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
function rangeDates(key: RangeKey, custom: { from: string; to: string }): { from?: string; to?: string } {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60_000);
  const y = ist.getUTCFullYear(); const m = ist.getUTCMonth();
  const iso = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd)).toISOString().slice(0, 10);
  switch (key) {
    case 'this_month': return { from: iso(y, m, 1), to: istIso(now) };
    case 'last_month': return { from: iso(y, m - 1, 1), to: iso(y, m, 0) };
    case '7': case '30': case '90': return { from: istIso(new Date(now.getTime() - (Number(key) - 1) * 86_400_000)), to: istIso(now) };
    case 'custom': return { from: custom.from || undefined, to: custom.to || undefined };
    default: return {};
  }
}
const prettyRange = (r: { from?: string; to?: string }) => {
  const f = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!r.from && !r.to) return 'All time';
  return `${r.from ? f(r.from) : '…'} – ${r.to ? f(r.to) : 'today'}`;
};
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const sameDay = (a: Date, b: Date) => istIso(a) === istIso(b);
const when = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (sameDay(d, now)) return `Today, ${time}`;
  if (sameDay(d, new Date(now.getTime() + 86_400_000))) return `Tomorrow, ${time}`;
  if (sameDay(d, new Date(now.getTime() - 86_400_000))) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
};
const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const fmtN = (n?: number | null) => (n === null || n === undefined ? '—' : n.toLocaleString('en-IN'));

const LeadDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = (user as any)?._id || (user as any)?.id || '';
  const canBulk = !!user && (['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role) || ((user as any).permissions || []).some((p: string) => ['manage_leads', 'assign_leads'].includes(p)));

  const [rangeKey, setRangeKey] = useState<RangeKey>('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [rangeOpen, setRangeOpen] = useState(false);
  const range = useMemo(() => rangeDates(rangeKey, custom), [rangeKey, custom]);

  const [dash, setDash] = useState<any>(null);
  const [dashError, setDashError] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [filters, setFilters] = useState({ stageId: '', course: '', source: '', campaign: '', assignedTo: '' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [stages, setStages] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [stageDialog, setStageDialog] = useState<{ leadIds: string[]; currentStageId?: string; currentSubStageId?: string | null } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', course: '', source: 'walkin' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const notify = (type: 'success' | 'danger', text: string) => { setToast({ type, text }); window.setTimeout(() => setToast(null), 3500); };

  // Ctrl/⌘+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350); return () => window.clearTimeout(t); }, [searchInput]);
  useEffect(() => { const close = () => setMenuFor(null); window.addEventListener('click', close); return () => window.removeEventListener('click', close); }, []);

  useEffect(() => {
    leadStageApi.getStages().then((r: any) => setStages(r.data || [])).catch(() => {});
    leadApi.getCounsellors().then((r: any) => setStaff(r.data || [])).catch(() => {});
    leadApi.getSources().then((r: any) => setSources((r.data || []).map((s: any) => (typeof s === 'string' ? s : s._id || s.source)).filter(Boolean))).catch(() => {});
  }, []);

  const loadDash = useCallback(() => {
    setDashError('');
    leadReportApi.dashboard(range.from, range.to).then((r: any) => setDash(r.data)).catch((e: any) => setDashError(e.message || 'Could not load the dashboard'));
  }, [range.from, range.to]);
  useEffect(() => { loadDash(); }, [loadDash]);

  // The table: tab + filters (+ the date range for the period tabs).
  const listParams = useMemo(() => {
    const p: any = { page, limit: 25, search: search || undefined, stageId: filters.stageId || undefined, course: filters.course || undefined,
      source: filters.source || undefined, campaign: filters.campaign || undefined, assignedTo: filters.assignedTo || undefined, sort: 'createdAt', dir: 'desc' };
    const period = { dateFrom: range.from, dateTo: range.to };
    switch (tab) {
      case 'mine': Object.assign(p, period, { assignedTo: myId }); break;
      case 'dueToday': Object.assign(p, { followUp: 'today', openOnly: '1', sort: 'nextFollowUp', dir: 'asc' }); break;
      case 'overdue': Object.assign(p, { followUp: 'overdue', openOnly: '1', sort: 'nextFollowUp', dir: 'asc' }); break;
      case 'nurture': Object.assign(p, { milestone: 'nurture', stageId: undefined }); break;
      case 'lost': Object.assign(p, period, { milestone: 'lost', stageId: undefined }); break;
      default: Object.assign(p, period);
    }
    return p;
  }, [page, search, filters, tab, range.from, range.to, myId]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const r: any = await leadApi.getLeads(listParams);
      setLeads(r.data?.leads || []); setTotal(r.data?.total || 0); setTotalPages(r.data?.totalPages || 1);
    } catch (e: any) { notify('danger', e.message || 'Could not load leads'); }
    finally { setLoadingLeads(false); }
  }, [listParams]);
  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { setSelected(new Set()); }, [listParams]);

  const refreshAll = () => { loadDash(); loadLeads(); };
  const goTab = (t: Tab) => { setTab(t); setPage(1); tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const setFilter = (k: keyof typeof filters, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const exportExcel = async () => {
    try {
      const q = new URLSearchParams();
      const { page: _p, limit: _l, ...rest } = listParams;
      Object.entries(rest).forEach(([k, v]) => { if (v) q.append(k, String(v)); });
      const base = leadApi.exportLeads({}).split('?')[0];
      const token = localStorage.getItem('token'); const tenantId = localStorage.getItem('tenantId');
      const resp = await fetch(`${base}?${q.toString()}`, { headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) } });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob(); const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `leads_${istIso(new Date())}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e: any) { notify('danger', e.message || 'Export failed'); }
  };

  const callLead = (l: any) => { leadApi.logCallClick(l._id).catch(() => {}); window.location.href = `tel:${l.phone}`; };

  const saveNewLead = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) { notify('danger', 'Name and mobile number are required'); return; }
    setBusy(true);
    try {
      await leadApi.createLead({ name: addForm.name.trim(), phone: addForm.phone.trim(), email: addForm.email.trim() || undefined,
        courseInterest: addForm.course ? [addForm.course.trim()] : [], source: addForm.source });
      setAddOpen(false); setAddForm({ name: '', phone: '', email: '', course: '', source: 'walkin' });
      notify('success', 'Lead added'); refreshAll();
    } catch (e: any) { notify('danger', e.message || 'Could not add the lead'); }
    finally { setBusy(false); }
  };

  const bulkAssign = async () => {
    setBusy(true);
    try {
      const r: any = await leadApi.bulkAssign(Array.from(selected), assignTo || null);
      notify('success', r.message || 'Assigned'); setAssignOpen(false); setSelected(new Set()); refreshAll();
    } catch (e: any) { notify('danger', e.message || 'Could not assign'); }
    finally { setBusy(false); }
  };

  const allChecked = leads.length > 0 && leads.every(l => selected.has(l._id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(leads.map(l => l._id)));
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const tiles = dash?.tiles;
  const TABS: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: 'all', label: 'All Leads', icon: 'bi-collection', count: dash?.tabs.all },
    { key: 'mine', label: 'My Leads', icon: 'bi-person', count: dash?.tabs.mine },
    { key: 'dueToday', label: 'Due Today', icon: 'bi-calendar-event', count: dash?.tabs.dueToday },
    { key: 'overdue', label: 'Overdue', icon: 'bi-exclamation-triangle', count: dash?.tabs.overdue },
    { key: 'nurture', label: 'Nurture', icon: 'bi-flower1', count: dash?.tabs.nurture },
    { key: 'lost', label: 'Lost', icon: 'bi-x-circle', count: dash?.tabs.lost },
  ];

  return (
    <div className="ldb-page">
      {/* ── top bar ── */}
      <div className="ldb-topbar">
        <div className="ldb-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input ref={searchRef} value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search leads by name, mobile, email…" aria-label="Search leads" />
          <kbd>Ctrl + K</kbd>
        </div>
        <button className="ldb-btn-primary" onClick={() => setAddOpen(true)}><i className="bi bi-plus-lg" /> Add Lead</button>
      </div>

      <header className="ldb-head">
        <div>
          <h1>Lead Dashboard</h1>
          <p>Track lead pipeline, conversions and team performance</p>
        </div>
        <div className="ldb-range" onClick={e => e.stopPropagation()}>
          <button className="ldb-range-btn" onClick={() => setRangeOpen(o => !o)} aria-haspopup="listbox" aria-expanded={rangeOpen}>
            <i className="bi bi-calendar3" /> {prettyRange(range)} <i className="bi bi-chevron-down" />
          </button>
          {rangeOpen && (
            <div className="ldb-range-menu" role="listbox">
              {(Object.keys(RANGE_LABEL) as RangeKey[]).map(k => (
                <button key={k} role="option" aria-selected={rangeKey === k} className={rangeKey === k ? 'active' : ''}
                  onClick={() => { setRangeKey(k); setPage(1); if (k !== 'custom') setRangeOpen(false); }}>{RANGE_LABEL[k]}</button>
              ))}
              {rangeKey === 'custom' && (
                <div className="ldb-range-custom">
                  <input type="date" value={custom.from} max={custom.to || undefined} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} aria-label="From" />
                  <input type="date" value={custom.to} min={custom.from || undefined} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} aria-label="To" />
                  <button className="ldb-btn-primary ldb-btn-sm" onClick={() => setRangeOpen(false)}>Apply</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {toast && <div className={`alert alert-${toast.type} py-2`}>{toast.text}</div>}
      {dashError && <div className="alert alert-danger py-2">{dashError}</div>}

      {/* ── tiles ── */}
      <section className="ldb-tiles" aria-label="Headline numbers">
        <div className="ldb-tile ldb-tile-hero">
          <span className="ldb-tile-icon" aria-hidden="true"><i className="bi bi-people" /></span>
          <div>
            <div className="ldb-tile-label">Total Leads</div>
            <div className="ldb-tile-row">
              <span className="ldb-tile-value">{fmtN(tiles?.total.count)}</span>
              {tiles?.total.changePct !== null && tiles?.total.changePct !== undefined && (
                <span className={`ldb-change ${tiles.total.changePct >= 0 ? 'up' : 'down'}`}>
                  <i className={`bi ${tiles.total.changePct >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'}`} aria-hidden="true" />
                  {Math.abs(tiles.total.changePct)}%<span className="ldb-change-sub">vs. previous period</span>
                </span>
              )}
            </div>
          </div>
        </div>
        {([['connected', 'Connected', 'bi-telephone'], ['qualified', 'Qualified', 'bi-bullseye'], ['demoAttended', 'Demo Attended', 'bi-calendar-check'],
          ['seatReserved', 'Seat Reserved', 'bi-person-workspace'], ['enrolled', 'Enrolled', 'bi-mortarboard']] as [string, string, string][]).map(([k, label, icon]) => (
          <div className="ldb-tile" key={k}>
            <span className="ldb-tile-icon" aria-hidden="true"><i className={`bi ${icon}`} /></span>
            <div>
              <div className="ldb-tile-label">{label}</div>
              <div className="ldb-tile-row">
                <span className="ldb-tile-value">{fmtN(tiles?.[k]?.count)}</span>
                {tiles?.[k]?.ofTotal !== null && tiles?.[k]?.ofTotal !== undefined && <span className="ldb-tile-pct">{tiles[k].ofTotal}%</span>}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── funnel / trend / tasks ── */}
      <section className="ldb-cards">
        <div className="ldb-card">
          <h2>Conversion Funnel</h2>
          {dash ? (
            <div className="ldb-funnel">
              <FunnelChart steps={dash.funnel} />
              <table className="ldb-mini-table">
                <thead><tr><th>Stage</th><th className="num">Leads</th><th className="num">Conversion</th></tr></thead>
                <tbody>
                  {dash.funnel.map((s: any, i: number) => (
                    <tr key={s.key}>
                      <td><span className="ldb-dot" style={{ background: FUNNEL_RAMP[i] }} aria-hidden="true" />{s.label}</td>
                      <td className="num">{fmtN(s.count)}</td>
                      <td className="num" title="Share of the previous stage">{s.fromPrevious === null ? '–' : `${s.fromPrevious}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="ldb-skeleton" />}
        </div>

        <div className="ldb-card">
          <div className="ldb-card-head">
            <h2>Lead Trend</h2>
            <div className="ldb-legend" aria-hidden="true">
              <span><span className="ldb-key" style={{ background: SERIES.total }} />Total Leads</span>
              <span><span className="ldb-key" style={{ background: SERIES.qualified }} />Qualified</span>
            </div>
          </div>
          {dash ? <TrendChart points={dash.trend.points} /> : <div className="ldb-skeleton" />}
        </div>

        <div className="ldb-card">
          <div className="ldb-card-head">
            <h2><i className="bi bi-check2-square" aria-hidden="true" /> Follow-up Tasks</h2>
            <button className="ldb-link" onClick={() => navigate('/follow-up-queue')}>View All</button>
          </div>
          <ul className="ldb-tasks">
            {([['dueToday', 'Due Today', 'bi-calendar-event', 'warn', 'dueToday'], ['overdue', 'Overdue', 'bi-exclamation-triangle', 'bad', 'overdue'],
              ['upcoming7', 'Upcoming (Next 7 Days)', 'bi-calendar-week', 'info', null], ['nurture', 'Nurture / Future Leads', 'bi-flower1', 'info', 'nurture']] as [string, string, string, string, Tab | null][]).map(([k, label, icon, tone, t]) => (
              <li key={k}>
                <button onClick={() => (t ? goTab(t) : navigate('/follow-up-queue'))}>
                  <i className={`bi ${icon} ldb-task-icon ${tone}`} aria-hidden="true" />
                  <span className="ldb-task-label">{label}</span>
                  <span className={`ldb-count ${tone}`}>{fmtN(dash?.tasks?.[k])}</span>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className="ldb-footnote">Follow-ups show what is due now, whatever the dates above.</p>
        </div>
      </section>

      {/* ── tabs ── */}
      <div className="ldb-tabs" role="tablist" ref={tableRef}>
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'active' : ''} onClick={() => { setTab(t.key); setPage(1); }}>
            <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}{t.count !== undefined ? ` (${fmtN(t.count)})` : ''}
          </button>
        ))}
      </div>

      {/* ── filters ── */}
      <div className="ldb-filters">
        <select value={filters.stageId} onChange={e => setFilter('stageId', e.target.value)} aria-label="Stage" disabled={tab === 'nurture' || tab === 'lost'}>
          <option value="">Stage: All</option>
          {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filters.course} onChange={e => setFilter('course', e.target.value)} aria-label="Course">
          <option value="">Course: All</option>
          {(dash?.options?.courses || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.source} onChange={e => setFilter('source', e.target.value)} aria-label="Source">
          <option value="">Source: All</option>
          {sources.map(s => <option key={s} value={s}>{SOURCE_LABEL[s] || s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filters.campaign} onChange={e => setFilter('campaign', e.target.value)} aria-label="Campaign">
          <option value="">Campaign: All</option>
          {(dash?.options?.campaigns || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.assignedTo} onChange={e => setFilter('assignedTo', e.target.value)} aria-label="Counsellor" disabled={tab === 'mine'}>
          <option value="">Counsellor: All</option>
          {staff.map(u => <option key={u._id} value={u._id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}</option>)}
        </select>
        <div className="ldb-filters-right">
          <button className="ldb-icon-btn" onClick={exportExcel} title="Export to Excel" aria-label="Export to Excel"><i className="bi bi-download" /></button>
          <button className="ldb-icon-btn" onClick={() => navigate('/lead-list')} title="Open the full leads list" aria-label="Open the full leads list"><i className="bi bi-list-ul" /></button>
        </div>
      </div>

      {selected.size > 0 && canBulk && (
        <div className="ldb-bulk">
          <strong>{selected.size} selected</strong>
          <button onClick={() => setStageDialog({ leadIds: Array.from(selected) })}>Move stage</button>
          <button onClick={() => { setAssignTo(''); setAssignOpen(true); }}>Assign</button>
          <button className="ldb-link" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* ── table ── */}
      <div className="ldb-table-wrap">
        <table className="ldb-table">
          <thead>
            <tr>
              <th className="ldb-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all on this page" /></th>
              <th>Student / Lead</th><th>Course Interest</th><th>Source</th><th>Stage</th><th>Last Contact</th><th>Next Follow-up</th><th>Counsellor</th><th>Lead Age</th><th className="ldb-actions-h">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingLeads && !leads.length ? (
              <tr><td colSpan={10} className="ldb-empty">Loading…</td></tr>
            ) : !leads.length ? (
              <tr><td colSpan={10} className="ldb-empty">No leads here.</td></tr>
            ) : leads.map(l => {
              const stage = typeof l.stageId === 'object' ? l.stageId : null;
              const owner = l.assignedTo ? `${l.assignedTo.firstName || ''} ${l.assignedTo.lastName || ''}`.trim() : '';
              const fu = l.nextFollowUp ? new Date(l.nextFollowUp) : null;
              const fuTone = !fu ? '' : fu.getTime() < Date.now() ? 'bad' : sameDay(fu, new Date()) ? 'warn' : 'soon';
              const lastContact = l.lastContactedAt || l.telecallerMetrics?.lastActionAt;
              return (
                <tr key={l._id} className={selected.has(l._id) ? 'selected' : ''}>
                  <td className="ldb-check"><input type="checkbox" checked={selected.has(l._id)} onChange={() => toggleOne(l._id)} aria-label={`Select ${l.name}`} /></td>
                  <td>
                    <button className="ldb-person" onClick={() => navigate(`/leads/${l._id}`)}>
                      <span className="ldb-avatar" aria-hidden="true">{initials(l.name)}</span>
                      <span><span className="ldb-name">{l.name}</span><span className="ldb-sub">{l.phone}</span></span>
                    </button>
                  </td>
                  <td>{(l.courseInterest || []).slice(0, 2).map((c: string) => <span key={c} className="ldb-chip">{c}</span>)}{!l.courseInterest?.length && <span className="ldb-muted">—</span>}</td>
                  <td className="ldb-nowrap"><i className={`bi ${SOURCE_ICON[l.source] || 'bi-dot'} ldb-src-icon`} aria-hidden="true" /> {SOURCE_LABEL[l.source] || (l.source || '').replace(/_/g, ' ')}</td>
                  <td>
                    <span className="ldb-stage" style={{ ['--stage' as any]: stage?.color || '#64748b' }}>{stage?.name || '—'}</span>
                    {l.subStageId?.name && <span className="ldb-sub">{l.subStageId.name}</span>}
                  </td>
                  <td className="ldb-nowrap">{lastContact ? when(lastContact) : <span className="ldb-muted">—</span>}</td>
                  <td className="ldb-nowrap">{fu ? <span className={`ldb-fu ${fuTone}`}><i className="bi bi-calendar3" aria-hidden="true" /> {when(l.nextFollowUp)}</span> : <span className="ldb-muted">—</span>}</td>
                  <td className="ldb-nowrap">{owner ? <><span className="ldb-avatar ldb-avatar-sm" aria-hidden="true">{initials(owner)}</span> {owner}</> : <span className="ldb-muted">Unassigned</span>}</td>
                  <td className="ldb-nowrap">{ageDays(l.createdAt)} day{ageDays(l.createdAt) === 1 ? '' : 's'}</td>
                  <td className="ldb-actions">
                    <button className="ldb-icon-btn" onClick={() => callLead(l)} title={`Call ${l.name}`} aria-label={`Call ${l.name}`}><i className="bi bi-telephone" /></button>
                    <button className="ldb-icon-btn" onClick={() => navigate(`/leads/${l._id}`)} title="Open and edit" aria-label={`Open ${l.name}`}><i className="bi bi-pencil" /></button>
                    <span className="ldb-menu-wrap" onClick={e => e.stopPropagation()}>
                      <button className="ldb-icon-btn" onClick={() => setMenuFor(menuFor === l._id ? null : l._id)} aria-haspopup="menu" aria-expanded={menuFor === l._id} aria-label="More actions"><i className="bi bi-three-dots" /></button>
                      {menuFor === l._id && (
                        <div className="ldb-menu" role="menu">
                          <button role="menuitem" onClick={() => navigate(`/leads/${l._id}`)}>View details</button>
                          <button role="menuitem" onClick={() => { setMenuFor(null); setStageDialog({ leadIds: [l._id], currentStageId: stage?._id, currentSubStageId: l.subStageId?._id || null }); }}>Move stage</button>
                          <a role="menuitem" href={`https://wa.me/${String(l.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
                        </div>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="ldb-pager">
        <span className="ldb-muted">{fmtN(total)} lead{total === 1 ? '' : 's'}</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      <StageChangeDialog
        open={!!stageDialog}
        onClose={() => setStageDialog(null)}
        leadIds={stageDialog?.leadIds || []}
        currentStageId={stageDialog?.currentStageId}
        currentSubStageId={stageDialog?.currentSubStageId}
        onDone={(outcome, message) => { notify('success', message); if (outcome === 'bulk') setSelected(new Set()); refreshAll(); }}
      />

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign ${selected.size} lead${selected.size === 1 ? '' : 's'}`} size="small">
        <select className="form-select mb-3" value={assignTo} onChange={e => setAssignTo(e.target.value)} aria-label="Counsellor">
          <option value="">Unassign</option>
          {staff.map(u => <option key={u._id} value={u._id}>{`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}</option>)}
        </select>
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setAssignOpen(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={bulkAssign} disabled={busy}>{busy ? 'Assigning…' : 'Assign'}</button>
        </div>
      </Modal>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add lead" size="small">
        <div className="d-flex flex-column gap-2">
          <label className="small fw-semibold">Name<input className="form-control" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} autoFocus /></label>
          <label className="small fw-semibold">Mobile number<input className="form-control" inputMode="tel" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></label>
          <label className="small fw-semibold">Email <span className="text-muted fw-normal">(optional)</span><input className="form-control" type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></label>
          <label className="small fw-semibold">Course interest
            <input className="form-control" list="ldb-courses" value={addForm.course} onChange={e => setAddForm(f => ({ ...f, course: e.target.value }))} />
            <datalist id="ldb-courses">{(dash?.options?.courses || []).map((c: string) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="small fw-semibold">Source
            <select className="form-select" value={addForm.source} onChange={e => setAddForm(f => ({ ...f, source: e.target.value }))}>
              {['walkin', 'phone', 'referral', 'website', 'whatsapp', 'meta_form', 'google_ads', 'other'].map(s => <option key={s} value={s}>{SOURCE_LABEL[s] || s}</option>)}
            </select>
          </label>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={saveNewLead} disabled={busy}>{busy ? 'Saving…' : 'Add lead'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LeadDashboard;
