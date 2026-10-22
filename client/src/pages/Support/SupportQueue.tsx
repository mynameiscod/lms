import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supportApi, {
  SupportTicket, Paged, SupportMe, errorText, MODULES, CATEGORIES, moduleLabel, STAFF_STATUS_LABEL, PRIORITY_LABEL, TicketStatus, TicketPriority,
} from '../../api/supportApi';
import { StatusBadge, PriorityBadge, Loading, ErrorState, EmptyState, fmtDateTime } from './supportUi';
import './support.css';

/**
 * The ticket queue: filters, search, sorting, paging, assignment and bulk actions. Filters live
 * in the URL, so a chart in the dashboard can link straight to "these tickets" and a link can be
 * shared between agents. Coordinators get the same table, read-only.
 */
const FILTER_KEYS = ['status', 'priority', 'module', 'category', 'source', 'assignee', 'escalated', 'reopened', 'tenantId', 'q', 'from', 'to', 'sort', 'page'] as const;

const SupportQueue: React.FC<{ me: SupportMe | null; basePath: string }> = ({ me, basePath }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<Paged<SupportTicket> | null>(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [bulkMsg, setBulkMsg] = useState<{ ok?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const canWork = !!me?.can.work;

  const query = useMemo(() => {
    const q: Record<string, string> = { limit: '25' };
    FILTER_KEYS.forEach(k => { const v = params.get(k); if (v) q[k] = v; });
    return q;
  }, [params]);

  const load = useCallback(async () => {
    setErr('');
    try { setData(await supportApi.queue(query)); setSelected(new Set()); }
    catch (e) { setErr(errorText(e, 'The queue could not be loaded.')); }
  }, [query]);
  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => { if (canWork) supportApi.agents().then(setAgents).catch(() => setAgents([])); }, [canWork]);

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    if (k !== 'page') p.delete('page');
    setParams(p);
  };

  const bulk = async (update: Record<string, unknown>, label: string) => {
    if (!selected.size) return;
    setBusy(true); setBulkMsg({});
    try {
      const r = await supportApi.bulk([...selected], update);
      const failed = r.results.filter(x => !x.ok);
      setBulkMsg(failed.length ? { err: `${label}: ${r.updated} updated, ${failed.length} not — ${failed[0].error}` } : { ok: `${label}: ${r.updated} updated.` });
      await load();
    } catch (e) { setBulkMsg({ err: errorText(e) }); }
    setBusy(false);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const page = Number(params.get('page') || 1);
  const allOnPage = !!data && data.tickets.length > 0 && data.tickets.every(t => selected.has(t.id));

  return (
    <div>
      <form className="sp-filters" role="search" onSubmit={e => { e.preventDefault(); set('q', search.trim()); }}>
        <label className="sp-sr" htmlFor="sp-q">Search tickets</label>
        <input id="sp-q" className="sp-input" style={{ maxWidth: 260 }} placeholder="Ticket number or subject" value={search} onChange={e => setSearch(e.target.value)} />
        <Select label="Status" value={params.get('status') || ''} onChange={v => set('status', v)} options={(Object.keys(STAFF_STATUS_LABEL) as TicketStatus[]).map(s => [s, STAFF_STATUS_LABEL[s]])} />
        <Select label="Priority" value={params.get('priority') || ''} onChange={v => set('priority', v)} options={(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map(p => [p, PRIORITY_LABEL[p]])} />
        <Select label="Area" value={params.get('module') || ''} onChange={v => set('module', v)} options={MODULES.map(m => [m.key, m.label])} />
        <Select label="Type" value={params.get('category') || ''} onChange={v => set('category', v)} options={CATEGORIES.map(c => [c.key, c.label])} />
        <Select label="Source" value={params.get('source') || ''} onChange={v => set('source', v)} options={[['help_center', 'Help Center'], ['ai_chat', 'Assistant'], ['staff', 'Staff']]} />
        {canWork && <Select label="Assignee" value={params.get('assignee') || ''} onChange={v => set('assignee', v)} options={[['me', 'Assigned to me'], ['none', 'Unassigned'], ...agents.map(a => [a.id, a.name] as [string, string])]} />}
        <Select label="Sort" value={params.get('sort') || ''} onChange={v => set('sort', v)} options={[['urgent', 'Most urgent'], ['activity', 'Recent activity'], ['oldest', 'Oldest first']]} placeholder="Newest first" />
        <label className="sp-chip" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={params.get('escalated') === 'true'} onChange={e => set('escalated', e.target.checked ? 'true' : '')} /> Escalated
        </label>
        <label className="sp-chip" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={params.get('reopened') === 'true'} onChange={e => set('reopened', e.target.checked ? 'true' : '')} /> Reopened
        </label>
        {[...params.keys()].length > 0 && <button type="button" className="sp-btn sp-btn-ghost" onClick={() => { setSearch(''); setParams(new URLSearchParams()); }}>Clear</button>}
      </form>

      {canWork && selected.size > 0 && (
        <div className="sp-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 12, marginBottom: 10 }} aria-label="Bulk actions">
          <b>{selected.size} selected</b>
          <button type="button" className="sp-btn sp-btn-ghost" disabled={busy} onClick={() => bulk({ assigneeId: 'me' }, 'Assigned to you')}>Assign to me</button>
          <Select label="Assign to" value="" onChange={v => v && bulk({ assigneeId: v === 'none' ? null : v }, 'Assignment')} options={[['none', 'Unassigned'], ...agents.map(a => [a.id, a.name] as [string, string])]} placeholder="Assign to…" />
          <Select label="Set status" value="" onChange={v => v && bulk({ status: v }, 'Status')} options={(Object.keys(STAFF_STATUS_LABEL) as TicketStatus[]).map(s => [s, STAFF_STATUS_LABEL[s]])} placeholder="Set status…" />
          <Select label="Set priority" value="" onChange={v => v && bulk({ priority: v }, 'Priority')} options={(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map(p => [p, PRIORITY_LABEL[p]])} placeholder="Set priority…" />
          <button type="button" className="sp-btn sp-btn-danger" disabled={busy} onClick={() => bulk({ escalated: true }, 'Escalated')}>Escalate</button>
        </div>
      )}
      {bulkMsg.ok && <p className="sp-ok" role="status">{bulkMsg.ok}</p>}
      {bulkMsg.err && <p className="sp-err" role="alert">{bulkMsg.err}</p>}

      <div className="sp-card" style={{ padding: 0, overflowX: 'auto' }}>
        {err ? <ErrorState text={err} onRetry={load} />
          : !data ? <Loading text="Loading tickets…" />
          : data.tickets.length === 0 ? <EmptyState icon="check2-circle" title="No tickets match" text="Try clearing a filter." />
          : (
            <table className="sp-table">
              <thead>
                <tr>
                  {canWork && <th scope="col"><input type="checkbox" aria-label="Select all on this page" checked={allOnPage}
                    onChange={e => setSelected(e.target.checked ? new Set(data.tickets.map(t => t.id)) : new Set())} /></th>}
                  <th scope="col">Ticket</th>
                  {me?.allTenants && <th scope="col">College</th>}
                  <th scope="col">Member</th>
                  <th scope="col">Area</th>
                  <th scope="col">Status</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Assignee</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map(t => (
                  <tr key={t.id}>
                    {canWork && <td><input type="checkbox" aria-label={`Select ${t.ticketNumber}`} checked={selected.has(t.id)}
                      onChange={e => { const s = new Set(selected); if (e.target.checked) s.add(t.id); else s.delete(t.id); setSelected(s); }} /></td>}
                    <td>
                      <button type="button" className="sp-linkbtn" onClick={() => nav(`${basePath}/tickets/${t.id}`)}>{t.subject}</button>
                      <div className="sp-item-meta">{t.ticketNumber}{t.escalated ? ' · escalated' : ''}{t.reopenCount ? ` · reopened ${t.reopenCount}×` : ''}{t.source === 'ai_chat' ? ' · assistant' : ''}</div>
                    </td>
                    {me?.allTenants && <td>{t.tenant?.name || '—'}</td>}
                    <td>{t.requester?.name || '—'}</td>
                    <td>{moduleLabel(t.module)}</td>
                    <td><StatusBadge status={t.status} staff /></td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td>{t.assignee?.name || <span className="sp-hint">Unassigned</span>}</td>
                    <td className="sp-nowrap">{fmtDateTime(t.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      {data && pages > 1 && (
        <div className="sp-pager">
          <button type="button" className="sp-btn sp-btn-ghost" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</button>
          <span>Page {page} of {pages} · {data.total} tickets</span>
          <button type="button" className="sp-btn sp-btn-ghost" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Next</button>
        </div>
      )}
    </div>
  );
};

const Select: React.FC<{ label: string; value: string; onChange: (v: string) => void; options: [string, string][]; placeholder?: string }> = ({ label, value, onChange, options, placeholder }) => (
  <select className="sp-select" style={{ width: 'auto', minWidth: 130 }} aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">{placeholder || `${label}: all`}</option>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

export default SupportQueue;
