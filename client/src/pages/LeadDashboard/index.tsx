import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadPipelineApi, leadReportApi, leadStageApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common';
import StageChangeDialog from '../../components/leads/StageChangeDialog';
import FunnelChart, { FUNNEL_RAMP } from './FunnelChart';
import TrendChart, { SERIES } from './TrendChart';
import LeadKanbanPage from '../LeadKanban';
import './LeadDashboard.css';

/**
 * Lead Dashboard — pipeline, conversions and the working list on one page.
 * Data: GET /lead-reports/dashboard (tiles, funnel, trend, follow-up tasks, tab counts) and
 * GET /leads (the table). Period numbers follow the date range; follow-up numbers are "now"
 * (see server/src/services/leadDashboardService.ts).
 */

type RangeKey = 'today' | 'yesterday' | 'this_month' | 'last_month' | '7' | '30' | '90' | 'all' | 'custom';
type Tab = 'all' | 'mine' | 'dueToday' | 'overdue' | 'nurture' | 'lost';
const RANGE_LABEL: Record<RangeKey, string> = {
  today: 'Today', yesterday: 'Yesterday', this_month: 'This month', last_month: 'Last month', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', all: 'All time', custom: 'Custom',
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
    case 'today': return { from: istIso(now), to: istIso(now) };
    case 'yesterday': { const d = istIso(new Date(now.getTime() - 86_400_000)); return { from: d, to: d }; }
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

// Filters survive opening a lead and coming back (kept for this browser tab only).
const SAVED_KEY = 'leadDashboard.state.v1';
const loadSaved = (): any => { try { return JSON.parse(sessionStorage.getItem(SAVED_KEY) || '{}') || {}; } catch { return {}; } };

const LeadDashboard: React.FC = () => {
  const saved = useMemo(loadSaved, []);
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = (user as any)?._id || (user as any)?.id || '';
  const canBulk = !!user && (['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role) || ((user as any).permissions || []).some((p: string) => ['manage_leads', 'assign_leads'].includes(p)));

  const [rangeKey, setRangeKey] = useState<RangeKey>(saved.rangeKey && saved.rangeKey in RANGE_LABEL ? saved.rangeKey : 'this_month');
  const [custom, setCustom] = useState<{ from: string; to: string }>(saved.custom || { from: '', to: '' });
  const [rangeOpen, setRangeOpen] = useState(false);
  const range = useMemo(() => rangeDates(rangeKey, custom), [rangeKey, custom]);

  const [dash, setDash] = useState<any>(null);
  const [dashError, setDashError] = useState('');
  const [tab, setTab] = useState<Tab>(saved.tab || 'all');
  const [filters, setFilters] = useState({ stageId: '', subStageId: '', course: '', source: '', campaign: '', assignedTo: '', ...(saved.filters || {}) });
  const [searchInput, setSearchInput] = useState<string>(saved.search || '');
  const [search, setSearch] = useState<string>(saved.search || '');
  const [page, setPage] = useState<number>(saved.page || 1);
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [stages, setStages] = useState<any[]>([]);
  // Sub-stages per stage id, for the second-level filter (shown once a stage is picked).
  const [subStagesByStage, setSubStagesByStage] = useState<Record<string, { _id: string; name: string }[]>>({});
  const [staff, setStaff] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [stageDialog, setStageDialog] = useState<{ leadIds: string[]; currentStageId?: string; currentSubStageId?: string | null } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  // Leads the Assign dialog acts on: one lead from its row menu, or null = the selected rows.
  const [assignIds, setAssignIds] = useState<string[] | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', course: '', source: 'walkin' });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  // Everything the old "All Leads (list)" page offered, now here (single leads screen).
  const [extra, setExtra] = useState<{ priority: string; adId: string; reEnquiry: boolean }>({ priority: '', adId: '', reEnquiry: false, ...(saved.extra || {}) });
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(saved.sort || null);
  const [pageSize, setPageSize] = useState<number>(saved.pageSize || 25);
  const [view, setView] = useState<'table' | 'board'>(saved.view === 'board' ? 'board' : 'table');
  const [ads, setAds] = useState<{ adId: string; adName?: string; campaignName?: string; adSetName?: string; leads: number }[]>([]);
  const [views, setViews] = useState<{ _id: string; name: string; filters: Record<string, string>; shared: boolean; mine: boolean }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [myActivity, setMyActivity] = useState<any>(null);
  const perms: string[] = (user as any)?.permissions || [];
  const isAdmin = !!user && ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role);
  const canDelete = isAdmin || perms.some(p => ['delete_leads', 'manage_leads'].includes(p));
  const canImport = isAdmin || perms.some(p => ['export_leads', 'manage_leads'].includes(p));
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const notify = (type: 'success' | 'danger', text: string) => { setToast({ type, text }); window.setTimeout(() => setToast(null), 3500); };

  // Ctrl/⌘+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Only a changed search goes back to page 1 (so a restored page survives the first run).
  useEffect(() => {
    const t = window.setTimeout(() => { const q = searchInput.trim(); setSearch(prev => { if (prev !== q) setPage(1); return q; }); }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);
  // Remember the filters so opening a lead and pressing Back brings them back.
  useEffect(() => {
    try { sessionStorage.setItem(SAVED_KEY, JSON.stringify({ rangeKey, custom, tab, filters, extra, search: searchInput, sort, page, pageSize, view })); } catch { /* storage unavailable */ }
  }, [rangeKey, custom, tab, filters, extra, searchInput, sort, page, pageSize, view]);
  useEffect(() => { const close = () => setMenuFor(null); window.addEventListener('click', close); return () => window.removeEventListener('click', close); }, []);

  useEffect(() => {
    leadStageApi.getStages().then((r: any) => setStages(r.data || [])).catch(() => {});
    leadPipelineApi.get().then((r: any) => {
      const map: Record<string, { _id: string; name: string }[]> = {};
      (r?.data?.stages || []).forEach((s: any) => { map[String(s._id)] = (s.subStages || []).filter((x: any) => x.isActive !== false); });
      setSubStagesByStage(map);
    }).catch(() => {});
    leadApi.getCounsellors().then((r: any) => setStaff(r.data || [])).catch(() => {});
    leadApi.getSources().then((r: any) => setSources((r.data || []).map((s: any) => (typeof s === 'string' ? s : s._id || s.source)).filter(Boolean))).catch(() => {});
    leadApi.getAds().then((r: any) => setAds(r?.data || [])).catch(() => {});
    // A counsellor's own numbers for today (admins see the team on Team Activity).
    if (!isAdmin) leadApi.getMyPerformance().then((r: any) => setMyActivity(r?.data || null)).catch(() => {});
  }, [isAdmin]);

  const loadViews = useCallback(() => { leadApi.getSavedViews().then((r: any) => setViews(r.data || [])).catch(() => setViews([])); }, []);
  useEffect(() => { loadViews(); }, [loadViews]);

  const loadDash = useCallback(() => {
    setDashError('');
    leadReportApi.dashboard(range.from, range.to).then((r: any) => setDash(r.data)).catch((e: any) => setDashError(e.message || 'Could not load the dashboard'));
  }, [range.from, range.to]);
  useEffect(() => { loadDash(); }, [loadDash]);

  // The table: tab + filters (+ the date range for the period tabs).
  const listParams = useMemo(() => {
    const p: any = { page, limit: pageSize, search: search || undefined, stageId: filters.stageId || undefined, subStageId: (filters.stageId && filters.subStageId) || undefined, course: filters.course || undefined,
      source: filters.source || undefined, campaign: filters.campaign || undefined, assignedTo: filters.assignedTo || undefined, sort: 'createdAt', dir: 'desc',
      priority: extra.priority || undefined, adId: extra.adId || undefined, reEnquiry: extra.reEnquiry || undefined };
    const period = { dateFrom: range.from, dateTo: range.to };
    switch (tab) {
      case 'mine': Object.assign(p, period, { assignedTo: myId }); break;
      case 'dueToday': Object.assign(p, { followUp: 'today', openOnly: '1', sort: 'nextFollowUp', dir: 'asc' }); break;
      case 'overdue': Object.assign(p, { followUp: 'overdue', openOnly: '1', sort: 'nextFollowUp', dir: 'asc' }); break;
      case 'nurture': Object.assign(p, { milestone: 'nurture', stageId: undefined, subStageId: undefined }); break;
      case 'lost': Object.assign(p, period, { milestone: 'lost', stageId: undefined, subStageId: undefined }); break;
      default: Object.assign(p, period);
    }
    if (sort) Object.assign(p, { sort: sort.key, dir: sort.dir }); // a clicked column header wins
    return p;
  }, [page, pageSize, search, filters, extra, sort, tab, range.from, range.to, myId]);

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
  const clearFilters = () => {
    setFilters({ stageId: '', subStageId: '', course: '', source: '', campaign: '', assignedTo: '' });
    setExtra({ priority: '', adId: '', reEnquiry: false });
    setSearchInput(''); setSearch(''); setSort(null); setPage(1);
  };
  // Changing the stage clears the sub-stage: sub-stages belong to one stage.
  const setFilter = (k: keyof typeof filters, v: string) => { setFilters(f => ({ ...f, [k]: v, ...(k === 'stageId' ? { subStageId: '' } : {}) })); setPage(1); };

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
      const r: any = await leadApi.bulkAssign(assignIds || Array.from(selected), assignTo || null);
      notify('success', r.message || 'Assigned'); setAssignOpen(false); if (!assignIds) setSelected(new Set()); setAssignIds(null); refreshAll();
    } catch (e: any) { notify('danger', e.message || 'Could not assign'); }
    finally { setBusy(false); }
  };

  const importCsv = async () => {
    if (!importFile) return;
    setBusy(true);
    try {
      const r: any = await leadApi.importLeads(await importFile.text());
      notify('success', r.message || `Imported ${r.data?.imported || 0} leads`);
      setImportOpen(false); setImportFile(null); refreshAll();
    } catch (e: any) { notify('danger', e.message || 'Import failed'); }
    finally { setBusy(false); }
  };

  /** Opens WhatsApp for each selected lead with the message filled in (nothing is sent automatically). */
  const sendWhatsApp = () => {
    leads.filter(l => selected.has(l._id) && l.phone).forEach(l => {
      const msg = encodeURIComponent(waMsg.trim() ? waMsg.replace(/\{name\}/gi, l.name) : `Hi ${l.name},`);
      window.open(`https://wa.me/${String(l.phone).replace(/\D/g, '')}?text=${msg}`, '_blank');
    });
    setWaOpen(false); setSelected(new Set());
  };

  const deleteLead = async (l: any) => {
    setMenuFor(null);
    if (!window.confirm(`Delete the lead "${l.name}"? This cannot be undone. (To hide old leads instead, use Lead Archive.)`)) return;
    try { await leadApi.deleteLead(l._id); notify('success', 'Lead deleted'); refreshAll(); }
    catch (e: any) { notify('danger', e.message || 'Could not delete'); }
  };

  const toggleSort = (key: string) => {
    setSort(s => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'nextFollowUp' ? 'asc' : 'desc' }));
    setPage(1);
  };
  const sortMark = (key: string) => (sort?.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');

  // ── saved views ──
  const currentView = (): Record<string, string> => {
    const v: Record<string, string> = { tab, rangeKey, ...filters, priority: extra.priority, adId: extra.adId, reEnquiry: extra.reEnquiry ? 'true' : '', search: searchInput,
      ...(sort ? { sort: sort.key, dir: sort.dir } : {}), ...(rangeKey === 'custom' ? { dateFrom: custom.from, dateTo: custom.to } : {}) };
    Object.keys(v).forEach(k => { if (!v[k]) delete v[k]; });
    return v;
  };
  const applyView = (id: string) => {
    const v = views.find(x => x._id === id); if (!v) return;
    const f = v.filters || {};
    setTab((f.tab as Tab) || 'all');
    setRangeKey((f.rangeKey as RangeKey) || 'this_month');
    if (f.rangeKey === 'custom') setCustom({ from: f.dateFrom || '', to: f.dateTo || '' });
    setFilters({ stageId: f.stageId || '', subStageId: f.subStageId || '', course: f.course || '', source: f.source || '', campaign: f.campaign || '', assignedTo: f.assignedTo || '' });
    setExtra({ priority: f.priority || '', adId: f.adId || '', reEnquiry: f.reEnquiry === 'true' });
    setSearchInput(f.search || ''); setSearch(f.search || '');
    setSort(f.sort ? { key: f.sort, dir: f.dir === 'asc' ? 'asc' : 'desc' } : null);
    setPage(1);
  };
  const saveView = async () => {
    const name = window.prompt('Name this view (e.g. "My overdue hot leads")');
    if (!name?.trim()) return;
    const shared = isAdmin ? window.confirm('Share this view with the whole team?') : false;
    try { await leadApi.saveView(name.trim(), currentView(), shared); loadViews(); notify('success', `View "${name.trim()}" saved`); }
    catch (e: any) { notify('danger', e.message || 'Could not save the view'); }
  };
  const deleteView = async (id: string) => {
    const v = views.find(x => x._id === id);
    if (!v || !window.confirm(`Delete the view "${v.name}"?`)) return;
    try { await leadApi.deleteView(id); loadViews(); } catch (e: any) { notify('danger', e.message || 'Could not delete'); }
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
        <div className="ldb-seg" role="group" aria-label="View">
          <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}><i className="bi bi-table" /> Table</button>
          <button type="button" className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><i className="bi bi-kanban" /> Board</button>
        </div>
        {canImport && <button className="ldb-btn" onClick={() => { setImportFile(null); setImportOpen(true); }}><i className="bi bi-upload" /> Import</button>}
        <button className="ldb-btn-primary" onClick={() => setAddOpen(true)}><i className="bi bi-plus-lg" /> Add Lead</button>
      </div>

      {myActivity && (
        <div className="ldb-today" aria-label="Your activity today">
          <strong>Your day:</strong>
          <span><i className="bi bi-telephone" /> {myActivity.todayByType?.call || 0} calls</span>
          <span><i className="bi bi-whatsapp" /> {myActivity.todayByType?.whatsapp || 0} WhatsApp</span>
          <span><i className="bi bi-sticky" /> {myActivity.todayByType?.note || 0} notes</span>
          <span><i className="bi bi-signpost-split" /> {myActivity.todayByType?.stage_change || myActivity.todayByType?.status_change || 0} stage moves</span>
          <span><i className="bi bi-bullseye" /> {myActivity.uniqueleadsTouchedToday || 0} leads touched</span>
          <span className="ldb-today-sub">Week {myActivity.weekActivities ?? 0} · Month {myActivity.monthActivities ?? 0}</span>
        </div>
      )}

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
        {filters.stageId && tab !== 'nurture' && tab !== 'lost' && (subStagesByStage[filters.stageId] || []).length > 0 && (
          <select value={filters.subStageId} onChange={e => setFilter('subStageId', e.target.value)} aria-label="Sub-stage">
            <option value="">Sub-stage: All</option>
            {subStagesByStage[filters.stageId].map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        )}
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
        <select value={extra.priority} onChange={e => { setExtra(x => ({ ...x, priority: e.target.value })); setPage(1); }} aria-label="Priority">
          <option value="">Priority: All</option>
          <option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
        </select>
        {ads.length > 0 && (
          <select value={extra.adId} onChange={e => { setExtra(x => ({ ...x, adId: e.target.value })); setPage(1); }} aria-label="Ad" title="Leads that came from one ad">
            <option value="">Ad: All</option>
            {ads.map(a => <option key={a.adId} value={a.adId}>{a.adId.startsWith('form:') ? `Lead form ${a.adId.slice(5)}` : [a.campaignName, a.adName || a.adSetName || a.adId].filter(Boolean).join(' › ')} ({a.leads})</option>)}
          </select>
        )}
        <button type="button" className={`ldb-toggle${extra.reEnquiry ? ' on' : ''}`} aria-pressed={extra.reEnquiry} onClick={() => { setExtra(x => ({ ...x, reEnquiry: !x.reEnquiry })); setPage(1); }}
          title="Leads that enquired again and have not been worked since"><i className="bi bi-arrow-repeat" /> Enquired again</button>
        <select value="" onChange={e => { const v = e.target.value; if (v === '__save') saveView(); else if (v.startsWith('__del:')) deleteView(v.slice(6)); else if (v) applyView(v); }} aria-label="Saved views">
          <option value="">Saved views…</option>
          {views.map(v => <option key={v._id} value={v._id}>{v.name}{v.shared ? ' (team)' : ''}</option>)}
          <option value="__save">+ Save these filters as a view</option>
          {views.filter(v => v.mine).map(v => <option key={`d${v._id}`} value={`__del:${v._id}`}>Delete “{v.name}”</option>)}
        </select>
        {(Object.values(filters).some(Boolean) || extra.priority || extra.adId || extra.reEnquiry || searchInput) && (
          <button type="button" className="ldb-link" onClick={clearFilters} title="Reset every filter and the search"><i className="bi bi-x-circle" /> Clear filters</button>
        )}
        <div className="ldb-filters-right">
          <button className="ldb-icon-btn" onClick={exportExcel} title="Export to Excel" aria-label="Export to Excel"><i className="bi bi-download" /></button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="ldb-bulk">
          <strong>{selected.size} selected</strong>
          {canBulk && <button onClick={() => setStageDialog({ leadIds: Array.from(selected) })}>Move stage</button>}
          {canBulk && <button onClick={() => { setAssignIds(null); setAssignTo(''); setAssignOpen(true); }}>Assign</button>}
          <button onClick={() => { setWaMsg(''); setWaOpen(true); }}><i className="bi bi-whatsapp" /> WhatsApp</button>
          <button className="ldb-link" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* ── board (Kanban) ── */}
      {view === 'board' && <div className="ldb-board"><LeadKanbanPage /></div>}

      {/* ── table ── */}
      {view === 'table' && (<>
      <div className="ldb-table-wrap">
        <table className="ldb-table">
          <thead>
            <tr>
              <th className="ldb-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all on this page" /></th>
              <th className="ldb-th-sort" aria-sort={sort?.key === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" onClick={() => toggleSort('name')}>Student / Lead{sortMark('name')}</button></th>
              <th>Course Interest</th><th>Source</th><th>Stage</th>
              <th className="ldb-th-sort"><button type="button" onClick={() => toggleSort('lastContactedAt')}>Last Contact{sortMark('lastContactedAt')}</button></th>
              <th className="ldb-th-sort"><button type="button" onClick={() => toggleSort('nextFollowUp')}>Next Follow-up{sortMark('nextFollowUp')}</button></th>
              <th>Counsellor</th>
              <th className="ldb-th-sort"><button type="button" onClick={() => toggleSort('createdAt')}>Lead Age{sortMark('createdAt')}</button></th>
              <th className="ldb-actions-h">Actions</th>
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
                      <span>
                        <span className="ldb-name">{l.name}
                          {l.priority && l.priority !== 'cold' && <span className={`ldb-prio ${l.priority}`} title={`Priority: ${l.priority}`}>{l.priority === 'hot' ? 'Hot' : 'Warm'}</span>}
                          {l.reEnquiryUnseen && <span className="ldb-reenq" title="Enquired again — not worked since">🔁</span>}
                        </span>
                        <span className="ldb-sub">{l.phone}</span>
                      </span>
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
                          {canBulk && <button role="menuitem" onClick={() => { setMenuFor(null); setAssignIds([l._id]); setAssignTo(l.assignedTo?._id || (typeof l.assignedTo === 'string' ? l.assignedTo : '') || ''); setAssignOpen(true); }}>{l.assignedTo ? 'Reassign' : 'Assign'}</button>}
                          <button role="menuitem" onClick={() => { setMenuFor(null); setStageDialog({ leadIds: [l._id], currentStageId: stage?._id, currentSubStageId: l.subStageId?._id || null }); }}>Move stage</button>
                          <a role="menuitem" href={`https://wa.me/${String(l.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
                          {canDelete && <button role="menuitem" className="ldb-menu-danger" onClick={() => deleteLead(l)}>Delete</button>}
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
        <span className="ldb-muted">
          {fmtN(total)} lead{total === 1 ? '' : 's'} ·{' '}
          <label className="ldb-pagesize">Show
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Leads per page">
              {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select> per page</label>
        </span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
      </>)}

      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import leads from CSV" size="small">
        <p className="small text-muted mb-2">Columns: <strong>Name, Email, Phone, Source, Course Interest, Notes</strong>. Name and Phone are required. Duplicate phone numbers are skipped.</p>
        <label className="ldb-drop">
          <input type="file" accept=".csv,text/csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />
          <i className={`bi ${importFile ? 'bi-file-earmark-check' : 'bi-cloud-arrow-up'}`} aria-hidden="true" />
          <span>{importFile ? importFile.name : 'Choose a CSV file'}</span>
        </label>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setImportOpen(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!importFile || busy} onClick={importCsv}>{busy ? 'Importing…' : 'Import'}</button>
        </div>
      </Modal>

      <Modal isOpen={waOpen} onClose={() => setWaOpen(false)} title={`WhatsApp ${selected.size} lead${selected.size === 1 ? '' : 's'}`} size="small">
        <p className="small text-muted mb-2">Opens a WhatsApp chat for each lead with this message filled in — you press send in each. <code>{'{name}'}</code> is replaced by the lead's name.</p>
        <textarea className="form-control" rows={4} value={waMsg} onChange={e => setWaMsg(e.target.value)} placeholder="Hi {name}, thanks for your interest in CodeBegun…" maxLength={1000} />
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setWaOpen(false)}>Cancel</button>
          <button className="btn btn-success btn-sm" onClick={sendWhatsApp}><i className="bi bi-whatsapp" /> Open {selected.size} chat{selected.size === 1 ? '' : 's'}</button>
        </div>
      </Modal>

      <StageChangeDialog
        open={!!stageDialog}
        onClose={() => setStageDialog(null)}
        leadIds={stageDialog?.leadIds || []}
        currentStageId={stageDialog?.currentStageId}
        currentSubStageId={stageDialog?.currentSubStageId}
        onDone={(outcome, message) => { notify('success', message); if (outcome === 'bulk') setSelected(new Set()); refreshAll(); }}
      />

      <Modal isOpen={assignOpen} onClose={() => { setAssignOpen(false); setAssignIds(null); }} title={assignIds ? `Assign ${leads.find(x => x._id === assignIds[0])?.name || 'lead'}` : `Assign ${selected.size} lead${selected.size === 1 ? '' : 's'}`} size="small">
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
