import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { followUpApi, leadApi, leadStageApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common';
import StageChangeDialog from '../../components/leads/StageChangeDialog';
import './FollowUpQueue.css';

/**
 * Follow-up queue — what each counsellor should do next. Reads GET /leads/queue, which returns one
 * page of the chosen tab plus every tab's count (same filters). Counsellors see their own leads;
 * people who can see the team see everyone's and get the Counsellor filter, Assign and bulk actions.
 */
type Tab = 'today' | 'overdue' | 'upcoming' | 'unassigned' | 'nurture';
const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Due Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'nurture', label: 'Nurture' },
];
const CARDS: { key: Tab; label: string; icon: string; tone: string }[] = [
  { key: 'today', label: 'Due Today', icon: 'bi-calendar2-check', tone: 'red' },
  { key: 'overdue', label: 'Overdue', icon: 'bi-exclamation-triangle', tone: 'amber' },
  { key: 'upcoming', label: 'Upcoming (7 Days)', icon: 'bi-calendar3', tone: 'blue' },
  { key: 'nurture', label: 'Nurture Reactivation', icon: 'bi-flower1', tone: 'green' },
];
const FU_TYPES = [
  ['call', 'Call'], ['whatsapp', 'WhatsApp'], ['demo', 'Demo'], ['one_on_one', 'One-on-one'],
  ['touch_base', 'Touch base'], ['payment_reminder', 'Payment reminder'], ['email', 'Email'],
] as const;
const PAGE_SIZES = [10, 25, 50];

interface QLead {
  _id: string; name: string; phone: string; email?: string; courseInterest?: string[];
  stageId?: { _id: string; name: string; color?: string }; subStageId?: { _id: string; name: string } | null;
  assignedTo?: { _id: string; firstName?: string; lastName?: string } | null;
  nextFollowUp?: string; lastContactedAt?: string; lastCallOutcome?: string; nurture?: { reactivateAt?: string }; createdAt: string;
}
interface Filters { stageId: string; course: string; assignedTo: string }
const EMPTY: Filters = { stageId: '', course: '', assignedTo: '' };

const SAVED_KEY = 'followUpQueue.state.v1';
const loadSaved = (): any => { try { return JSON.parse(sessionStorage.getItem(SAVED_KEY) || '{}') || {}; } catch { return {}; } };

const personName = (u?: { firstName?: string; lastName?: string } | null) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const fmtWhen = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const istDay = (d: Date) => Math.floor((d.getTime() + 330 * 60_000) / 86_400_000);
const dayLabel = (d: string) => {
  const diff = istDay(new Date(d)) - istDay(new Date());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return diff < 0 ? `${-diff} days overdue` : `In ${diff} days`;
};
const ago = (d?: string) => {
  if (!d) return 'Never';
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60); if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
/** "YYYY-MM-DDTHH:mm" in local time for a datetime-local input, an hour from now on the quarter. */
const defaultWhen = () => {
  const d = new Date(Date.now() + 60 * 60_000); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const FollowUpQueue: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canTeam = !!user && (['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role) || ((user as any).permissions || []).some((p: string) => ['manage_leads', 'assign_leads'].includes(p)));

  const saved = useRef(loadSaved()).current;
  const [tab, setTab] = useState<Tab>(saved.tab || 'today');
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...(saved.filters || {}) });
  const [searchInput, setSearchInput] = useState<string>(saved.search || '');
  const [search, setSearch] = useState<string>(saved.search || '');
  const [page, setPage] = useState<number>(saved.page || 1);
  const [pageSize, setPageSize] = useState<number>(saved.pageSize || 10);

  const [data, setData] = useState<{ leads: QLead[]; total: number; totalPages: number; counts: Record<string, number>; courses: string[] }>({ leads: [], total: 0, totalPages: 1, counts: {}, courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);
  const [stages, setStages] = useState<{ _id: string; name: string }[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [headMenu, setHeadMenu] = useState(false);
  const [stageDialog, setStageDialog] = useState<{ leadIds: string[]; stageId?: string; subStageId?: string | null } | null>(null);
  const [assign, setAssign] = useState<{ leadIds: string[]; to: string } | null>(null);
  const [schedule, setSchedule] = useState<{ lead: QLead | null } | null>(null);

  const notify = (kind: 'success' | 'danger', text: string) => { setToast({ kind, text }); window.setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    leadStageApi.getStages().then((r: any) => setStages(r.data || [])).catch(() => {});
    if (canTeam) leadApi.getCounsellors().then((r: any) => setStaff(r.data || [])).catch(() => {});
  }, [canTeam]);

  // Debounced search; the page goes back to 1 only when the words actually changed.
  useEffect(() => {
    const t = window.setTimeout(() => { if (searchInput.trim() !== search) { setSearch(searchInput.trim()); setPage(1); } }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, search]);

  useEffect(() => {
    try { sessionStorage.setItem(SAVED_KEY, JSON.stringify({ tab, filters, search, page, pageSize })); } catch { /* storage unavailable */ }
  }, [tab, filters, search, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res: any = await leadApi.getQueue(tab, page, { limit: pageSize, search, ...filters });
      const d = res.data || {};
      setData({ leads: d.leads || [], total: d.total || 0, totalPages: d.totalPages || 1, counts: d.counts || {}, courses: d.options?.courses || [] });
      if (d.totalPages && page > d.totalPages) setPage(d.totalPages);
    } catch (e: any) {
      setError(e.message || 'Could not load the queue');
    } finally { setLoading(false); }
  }, [tab, page, pageSize, search, filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelected(new Set()); }, [tab, page, pageSize, search, filters]);

  // Close open menus on any outside click.
  useEffect(() => {
    if (!menuFor && !headMenu) return;
    const close = () => { setMenuFor(null); setHeadMenu(false); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuFor, headMenu]);

  const goTab = (t: Tab) => { setTab(t); setPage(1); };
  const setFilter = (k: keyof Filters, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };
  const hasFilters = !!(filters.stageId || filters.course || filters.assignedTo || search);
  const clearFilters = () => { setFilters(EMPTY); setSearchInput(''); setSearch(''); setPage(1); };

  const when = (l: QLead) => (tab === 'nurture' ? l.nurture?.reactivateAt : l.nextFollowUp);
  const isOverdue = (l: QLead) => { const w = when(l); return !!w && new Date(w).getTime() < Date.now(); };

  const allOnPage = data.leads.length > 0 && data.leads.every(l => selected.has(l._id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(data.leads.map(l => l._id)));
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const doAssign = async () => {
    if (!assign) return;
    try {
      const r: any = await leadApi.bulkAssign(assign.leadIds, assign.to || null);
      notify('success', r.message || (assign.to ? 'Assigned' : 'Unassigned'));
      setAssign(null); setSelected(new Set()); load();
    } catch (e: any) { notify('danger', e.message || 'Could not assign'); }
  };

  const from = data.total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, data.total);
  const pages = (() => {
    const n = data.totalPages; const out: (number | '…')[] = [];
    for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - page) <= 1) out.push(i); else if (out[out.length - 1] !== '…') out.push('…');
    return out;
  })();

  return (
    <div className="fq-page">
      <nav className="fq-crumbs" aria-label="Breadcrumb">
        <Link to="/leads">Leads (CRM)</Link><i className="bi bi-chevron-right" aria-hidden="true" /><span>Follow-ups</span>
      </nav>

      <header className="fq-header">
        <div>
          <h1>Follow-up Queue</h1>
          <p>Manage and track all lead follow-ups in one place</p>
        </div>
        <div className="fq-header-actions">
          <button className="fq-btn fq-btn-primary" onClick={() => setSchedule({ lead: null })}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Schedule Follow-up
          </button>
          <div className="fq-menu-wrap">
            <button className="fq-btn fq-btn-icon" aria-label="More actions" aria-haspopup="menu" aria-expanded={headMenu}
              onClick={e => { e.stopPropagation(); setMenuFor(null); setHeadMenu(v => !v); }}>
              <i className="bi bi-three-dots" aria-hidden="true" />
            </button>
            {headMenu && (
              <div className="fq-menu" role="menu">
                <button role="menuitem" onClick={() => load()}><i className="bi bi-arrow-clockwise" /> Refresh</button>
                <button role="menuitem" onClick={() => navigate('/follow-ups')}><i className="bi bi-calendar3" /> Calendar view</button>
                <button role="menuitem" onClick={() => navigate('/leads')}><i className="bi bi-grid" /> Lead dashboard</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="fq-cards">
        {CARDS.map(c => (
          <button key={c.key} className={`fq-card fq-${c.tone}${tab === c.key ? ' on' : ''}`} onClick={() => goTab(c.key)}>
            <span className="fq-card-icon"><i className={`bi ${c.icon}`} aria-hidden="true" /></span>
            <span className="fq-card-body">
              <span className="fq-card-label">{c.label}</span>
              <span className="fq-card-num">{data.counts[c.key] ?? '—'}</span>
            </span>
          </button>
        ))}
      </section>

      <div className="fq-tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`fq-tab${tab === t.key ? ' on' : ''}${t.key === 'overdue' ? ' warn' : ''}`} onClick={() => goTab(t.key)}>
            {t.label} <span className="fq-badge">{data.counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="fq-filters">
        <select className="fq-select" value={filters.stageId} onChange={e => setFilter('stageId', e.target.value)} aria-label="Stage">
          <option value="">Stage: All</option>
          {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="fq-select" value={filters.course} onChange={e => setFilter('course', e.target.value)} aria-label="Course">
          <option value="">Course: All</option>
          {data.courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {canTeam && (
          <select className="fq-select" value={filters.assignedTo} onChange={e => setFilter('assignedTo', e.target.value)} aria-label="Counsellor">
            <option value="">Counsellor: All</option>
            <option value="unassigned">Unassigned</option>
            {staff.map(u => <option key={u._id} value={u._id}>{personName(u) || u.email}</option>)}
          </select>
        )}
        {hasFilters && <button className="fq-link" onClick={clearFilters}>Clear filters</button>}
        <div className="fq-filters-right">
          <label className="fq-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input type="search" placeholder="Search by name, mobile..." value={searchInput} onChange={e => setSearchInput(e.target.value)} aria-label="Search leads" />
          </label>
          <div className="fq-view" role="group" aria-label="View">
            <button className="on" aria-pressed="true" title="List"><i className="bi bi-list-ul" aria-hidden="true" /></button>
            <button aria-pressed="false" title="Calendar" onClick={() => navigate('/follow-ups')}><i className="bi bi-calendar3" aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      {toast && <div className={`alert alert-${toast.kind} py-2 mb-2`}>{toast.text}</div>}
      {error && <div className="alert alert-danger py-2 mb-2">{error}</div>}

      {selected.size > 0 && canTeam && (
        <div className="fq-bulk">
          <strong>{selected.size} selected</strong>
          <button onClick={() => setStageDialog({ leadIds: Array.from(selected) })}>Move stage</button>
          <button onClick={() => setAssign({ leadIds: Array.from(selected), to: '' })}>Assign</button>
          <button className="fq-link" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="fq-table-card">
        <div className="fq-table-scroll">
          <table className="fq-table">
            <thead>
              <tr>
                {canTeam && <th className="fq-check"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" /></th>}
                <th>Lead / Contact</th>
                <th>Stage</th>
                <th>{tab === 'nurture' ? 'Reactivate' : 'Follow-up'}</th>
                <th>Last Contact</th>
                <th>Owner</th>
                <th className="fq-actions-h">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.leads.length === 0 ? (
                <tr><td colSpan={7} className="fq-empty">Loading…</td></tr>
              ) : data.leads.length === 0 ? (
                <tr><td colSpan={7} className="fq-empty">
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  <div>{hasFilters ? 'No leads match these filters.' : 'Nothing here. You are all caught up.'}</div>
                </td></tr>
              ) : data.leads.map(l => {
                const w = when(l); const late = isOverdue(l); const owner = personName(l.assignedTo);
                return (
                  <tr key={l._id} className={selected.has(l._id) ? 'sel' : ''}>
                    {canTeam && <td className="fq-check"><input type="checkbox" checked={selected.has(l._id)} onChange={() => toggle(l._id)} aria-label={`Select ${l.name}`} /></td>}
                    <td>
                      <div className="fq-lead">
                        <span className="fq-avatar">{initials(l.name || '')}</span>
                        <div className="fq-lead-text">
                          <button className="fq-name" onClick={() => navigate(`/leads/${l._id}`)}>{l.name || '(no name)'}</button>
                          {l.phone && <div className="fq-sub"><i className="bi bi-telephone" aria-hidden="true" />{l.phone}</div>}
                          {!!l.courseInterest?.length && <div className="fq-sub"><i className="bi bi-mortarboard" aria-hidden="true" />{l.courseInterest.join(', ')}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {l.stageId ? (
                        <span className="fq-stage" style={{ '--stage': l.stageId.color || '#6366f1' } as React.CSSProperties}>{l.stageId.name}</span>
                      ) : <span className="fq-muted">—</span>}
                      {l.subStageId?.name && <div className="fq-sub fq-substage">{l.subStageId.name}</div>}
                    </td>
                    <td>
                      {w ? (
                        <span className={`fq-when${late ? ' late' : ''}`}>
                          <i className="bi bi-calendar-event" aria-hidden="true" />
                          <span><span className="fq-when-time">{fmtWhen(w)}</span><span className="fq-when-day">({dayLabel(w)})</span></span>
                        </span>
                      ) : <span className="fq-muted">Not scheduled</span>}
                    </td>
                    <td>
                      <span className="fq-contact"><i className="bi bi-telephone" aria-hidden="true" />{ago(l.lastContactedAt)}</span>
                      {l.lastCallOutcome && <div className="fq-sub fq-cap">{l.lastCallOutcome.replace(/_/g, ' ')}</div>}
                    </td>
                    <td>
                      {owner ? (
                        <span className="fq-owner"><span className="fq-avatar sm">{initials(owner)}</span>{owner}</span>
                      ) : canTeam ? (
                        <button className="fq-link" onClick={() => setAssign({ leadIds: [l._id], to: '' })}>Assign</button>
                      ) : <span className="fq-muted">Unassigned</span>}
                    </td>
                    <td className="fq-actions">
                      <a className="fq-btn fq-btn-icon fq-call" href={l.phone ? `tel:${l.phone}` : undefined} aria-label={`Call ${l.name}`} title="Call"
                        onClick={() => { leadApi.logCallClick?.(l._id)?.catch?.(() => {}); }}>
                        <i className="bi bi-telephone" aria-hidden="true" />
                      </a>
                      <div className="fq-menu-wrap">
                        <button className="fq-btn fq-btn-icon" aria-label={`More for ${l.name}`} aria-haspopup="menu" aria-expanded={menuFor === l._id}
                          onClick={e => { e.stopPropagation(); setHeadMenu(false); setMenuFor(m => (m === l._id ? null : l._id)); }}>
                          <i className="bi bi-three-dots" aria-hidden="true" />
                        </button>
                        {menuFor === l._id && (
                          <div className="fq-menu right" role="menu">
                            <button role="menuitem" onClick={() => navigate(`/leads/${l._id}`)}><i className="bi bi-box-arrow-up-right" /> Open lead</button>
                            <button role="menuitem" onClick={() => setSchedule({ lead: l })}><i className="bi bi-calendar-plus" /> Schedule follow-up</button>
                            <button role="menuitem" onClick={() => setStageDialog({ leadIds: [l._id], stageId: l.stageId?._id, subStageId: l.subStageId?._id || null })}><i className="bi bi-arrow-left-right" /> Move stage</button>
                            {l.phone && <a role="menuitem" href={`https://wa.me/${l.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`} target="_blank" rel="noreferrer"><i className="bi bi-whatsapp" /> WhatsApp</a>}
                            {canTeam && <button role="menuitem" onClick={() => setAssign({ leadIds: [l._id], to: l.assignedTo?._id || '' })}><i className="bi bi-person-check" /> {l.assignedTo ? 'Reassign' : 'Assign'}</button>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="fq-foot">
        <span className="fq-muted">Showing {from}–{to} of {data.total}</span>
        <div className="fq-pager">
          <select className="fq-select sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="Rows per page">
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} per page</option>)}
          </select>
          <button className="fq-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><i className="bi bi-chevron-left" /></button>
          {pages.map((p, i) => p === '…'
            ? <span key={`gap${i}`} className="fq-gap">…</span>
            : <button key={p} className={`fq-page-btn${p === page ? ' on' : ''}`} aria-current={p === page ? 'page' : undefined} onClick={() => setPage(p)}>{p}</button>)}
          <button className="fq-page-btn" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><i className="bi bi-chevron-right" /></button>
        </div>
      </footer>

      <StageChangeDialog
        open={!!stageDialog}
        onClose={() => setStageDialog(null)}
        leadIds={stageDialog?.leadIds || []}
        currentStageId={stageDialog?.stageId}
        currentSubStageId={stageDialog?.subStageId || null}
        onDone={(_o, msg) => { notify('success', msg); setSelected(new Set()); load(); }}
      />

      <Modal isOpen={!!assign} onClose={() => setAssign(null)} title={assign && assign.leadIds.length > 1 ? `Assign ${assign.leadIds.length} leads` : 'Assign lead'} size="small">
        {assign && (
          <div className="fq-form">
            <label className="fq-label" htmlFor="fq-assign">Counsellor</label>
            <select id="fq-assign" className="form-select" value={assign.to} onChange={e => setAssign({ ...assign, to: e.target.value })}>
              <option value="">— Unassigned —</option>
              {staff.map(u => <option key={u._id} value={u._id}>{personName(u) || u.email}</option>)}
            </select>
            <div className="fq-form-actions">
              <button className="fq-btn" onClick={() => setAssign(null)}>Cancel</button>
              <button className="fq-btn fq-btn-primary" onClick={doAssign}>Save</button>
            </div>
          </div>
        )}
      </Modal>

      {schedule && (
        <ScheduleModal
          lead={schedule.lead}
          onClose={() => setSchedule(null)}
          onDone={msg => { setSchedule(null); notify('success', msg); load(); }}
          onError={msg => notify('danger', msg)}
        />
      )}
    </div>
  );
};

/** Schedule a follow-up for a chosen lead (or the row's lead). Saves through POST /follow-ups. */
const ScheduleModal: React.FC<{ lead: QLead | null; onClose: () => void; onDone: (msg: string) => void; onError: (msg: string) => void }> = ({ lead, onClose, onDone, onError }) => {
  const [picked, setPicked] = useState<{ _id: string; name: string; phone?: string } | null>(lead ? { _id: lead._id, name: lead.name, phone: lead.phone } : null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [type, setType] = useState('call');
  const [whenAt, setWhenAt] = useState(defaultWhen());
  const [title, setTitle] = useState('Follow-up call');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (picked || q.trim().length < 2) { setResults([]); return; }
    const t = window.setTimeout(() => {
      leadApi.getLeads({ search: q.trim(), limit: 8 }).then((r: any) => setResults(r.data?.leads || r.data || [])).catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, picked]);

  const save = async () => {
    if (!picked) return onError('Pick a lead first');
    if (!whenAt) return onError('Pick a date and time');
    setSaving(true);
    try {
      await followUpApi.create({ leadId: picked._id, type, title: title.trim() || 'Follow-up', scheduledAt: new Date(whenAt).toISOString(), description: notes.trim() || undefined });
      onDone(`Follow-up scheduled for ${picked.name}`);
    } catch (e: any) { onError(e.message || 'Could not schedule the follow-up'); setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Schedule follow-up" size="small">
      <div className="fq-form">
        <label className="fq-label">Lead</label>
        {picked ? (
          <div className="fq-picked">
            <span className="fq-avatar sm">{initials(picked.name)}</span>
            <span><strong>{picked.name}</strong>{picked.phone && <span className="fq-muted"> · {picked.phone}</span>}</span>
            {!lead && <button className="fq-link" onClick={() => { setPicked(null); setQ(''); }}>Change</button>}
          </div>
        ) : (
          <div className="fq-lookup">
            <input className="form-control" autoFocus placeholder="Type a name or mobile number" value={q} onChange={e => setQ(e.target.value)} />
            {results.length > 0 && (
              <div className="fq-lookup-list">
                {results.map(r => (
                  <button key={r._id} onClick={() => setPicked({ _id: r._id, name: r.name, phone: r.phone })}>
                    <strong>{r.name}</strong> <span className="fq-muted">{r.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="fq-form-row">
          <div>
            <label className="fq-label" htmlFor="fq-type">Type</label>
            <select id="fq-type" className="form-select" value={type} onChange={e => { setType(e.target.value); const lbl = FU_TYPES.find(t => t[0] === e.target.value)?.[1]; if (lbl) setTitle(`Follow-up ${lbl.toLowerCase()}`); }}>
              {FU_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="fq-label" htmlFor="fq-when">Date & time</label>
            <input id="fq-when" type="datetime-local" className="form-control" value={whenAt} onChange={e => setWhenAt(e.target.value)} />
          </div>
        </div>
        <label className="fq-label" htmlFor="fq-title">Title</label>
        <input id="fq-title" className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
        <label className="fq-label" htmlFor="fq-notes">Notes (optional)</label>
        <textarea id="fq-notes" className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="fq-form-actions">
          <button className="fq-btn" onClick={onClose}>Cancel</button>
          <button className="fq-btn fq-btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Schedule'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default FollowUpQueue;
