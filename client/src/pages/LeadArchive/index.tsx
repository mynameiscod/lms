import React, { useCallback, useEffect, useState } from 'react';
import { leadArchiveApi, archiveError, ArchiveFilters, ArchiveLeadRow, ArchiveRun } from '../../api/leadArchiveApi';
import './leadArchive.css';

/**
 * Leads → Archive (admins). Move leads nobody works any more out of the working lists: pick
 * filters, preview, archive in the background. Restore one lead or a whole run. Three years after
 * archiving, delete for good.
 */

const EMPTY: ArchiveFilters = { stageIds: [], sources: [], priorities: [], assignment: 'any', duplicatesOnly: false, protectDays: 14 };
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtTime = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const KIND: Record<ArchiveRun['kind'], string> = { archive: 'Archived', restore: 'Restored', purge: 'Deleted permanently' };

type Tab = 'archive' | 'archived' | 'history' | 'delete';

const LeadArchive: React.FC = () => {
  const [tab, setTab] = useState<Tab>('archive');
  const [opts, setOpts] = useState<Awaited<ReturnType<typeof leadArchiveApi.options>> | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const loadOpts = useCallback(() => leadArchiveApi.options().then(setOpts).catch((e) => setErr(archiveError(e, 'Could not load.'))), []);
  useEffect(() => { loadOpts(); }, [loadOpts]);

  const say = useCallback((m: string) => { setOk(m); setErr(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const fail = useCallback((e: any) => { setErr(archiveError(e)); setOk(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  return (
    <div className="la-root">
      <div className="la-head">
        <div>
          <h1>Lead archive</h1>
          <p className="la-sub">Move leads nobody is working any more out of All Leads, counts and messages. Nothing is deleted: archived leads keep their history, reports still count them, and anyone who enquires again comes back on their own.</p>
        </div>
        {opts && (
          <div className="la-stats">
            <div><b>{opts.active.toLocaleString('en-IN')}</b><span>active leads</span></div>
            <div><b>{opts.archived.toLocaleString('en-IN')}</b><span>archived</span></div>
          </div>
        )}
      </div>

      <div className="la-tabs" role="tablist">
        {([['archive', 'Archive leads'], ['archived', 'Archived leads'], ['history', 'History'], ['delete', 'Delete after 3 years']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setOk(''); setErr(''); }}>{l}</button>
        ))}
      </div>

      {err && <div className="la-alert bad" role="alert">{err}</div>}
      {ok && <div className="la-alert ok" role="status">{ok}</div>}

      {tab === 'archive' && opts && <ArchiveTab opts={opts} onDone={(m) => { say(m); loadOpts(); setTab('history'); }} onError={fail} />}
      {tab === 'archived' && <ArchivedTab onRestored={(m) => { say(m); loadOpts(); }} onError={fail} />}
      {tab === 'history' && <HistoryTab onRestored={(m) => { say(m); loadOpts(); }} onError={fail} />}
      {tab === 'delete' && <DeleteTab onDone={(m) => { say(m); loadOpts(); setTab('history'); }} onError={fail} />}
    </div>
  );
};

/* ── Archive by filter ─────────────────────────────────────────────────────────────────── */

const ArchiveTab: React.FC<{ opts: NonNullable<Awaited<ReturnType<typeof leadArchiveApi.options>>>; onDone: (m: string) => void; onError: (e: any) => void }> = ({ opts, onDone, onError }) => {
  const [f, setF] = useState<ArchiveFilters>(EMPTY);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof leadArchiveApi.preview>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const set = (patch: Partial<ArchiveFilters>) => { setF((x) => ({ ...x, ...patch })); setPreview(null); setConfirming(false); };

  const doPreview = async () => {
    setBusy(true);
    try { setPreview(await leadArchiveApi.preview(f)); } catch (e) { onError(e); }
    setBusy(false);
  };
  const doRun = async () => {
    setBusy(true);
    try {
      const run = await leadArchiveApi.run({ ...f, reason });
      onDone(`Archiving ${(run.matched - run.skippedProtected).toLocaleString('en-IN')} leads in the background. Progress is under History.`);
      setF(EMPTY); setReason(''); setPreview(null); setConfirming(false);
    } catch (e) { onError(e); }
    setBusy(false);
  };

  return (
    <>
      <section className="la-card">
        <h2>1. Choose which leads</h2>
        <div className="la-grid">
          <div className="la-field la-wide">
            <span className="la-label">Stage</span>
            <div className="la-chips">
              {opts.stages.map((s) => (
                <button key={s._id} type="button" className={`la-chip${f.stageIds.includes(s._id) ? ' on' : ''}`} onClick={() => set({ stageIds: toggle(f.stageIds, s._id) })}>
                  {s.name} <span>{s.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="la-field la-wide">
            <span className="la-label">Source</span>
            <div className="la-chips">
              {opts.sources.map((s) => (
                <button key={s.source} type="button" className={`la-chip${f.sources.includes(s.source) ? ' on' : ''}`} onClick={() => set({ sources: toggle(f.sources, s.source) })}>
                  {s.source} <span>{s.count}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="la-field">
            <span className="la-label">No activity for at least</span>
            <select id="la-inactive" className="la-input" value={f.inactiveDays || ''} onChange={(e) => set({ inactiveDays: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">Any</option>
              {[30, 60, 90, 180, 365, 730].map((n) => <option key={n} value={n}>{n >= 365 ? `${n / 365} year${n > 365 ? 's' : ''}` : `${n} days`}</option>)}
            </select>
            <span className="la-hint">No counsellor action since then (or never touched and created before).</span>
          </label>
          <label className="la-field">
            <span className="la-label">Created from</span>
            <input id="la-from" type="date" className="la-input" value={f.createdFrom?.slice(0, 10) || ''} onChange={(e) => set({ createdFrom: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : undefined })} />
          </label>
          <label className="la-field">
            <span className="la-label">Created to</span>
            <input id="la-to" type="date" className="la-input" value={f.createdTo?.slice(0, 10) || ''} onChange={(e) => set({ createdTo: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined })} />
          </label>
          <label className="la-field">
            <span className="la-label">Owner</span>
            <select id="la-owner" className="la-input" value={f.assignment} onChange={(e) => set({ assignment: e.target.value as ArchiveFilters['assignment'] })}>
              <option value="any">Anyone</option>
              <option value="unassigned">Unassigned only</option>
              <option value="assigned">Assigned only</option>
            </select>
          </label>
          <label className="la-field">
            <span className="la-label">Priority</span>
            <div className="la-chips">
              {['hot', 'warm', 'cold'].map((p) => (
                <button key={p} type="button" className={`la-chip${f.priorities.includes(p) ? ' on' : ''}`} onClick={() => set({ priorities: toggle(f.priorities, p) })}>{p}</button>
              ))}
            </div>
          </label>
          <label className="la-field">
            <span className="la-label">Campaign contains</span>
            <input id="la-campaign" className="la-input" placeholder="e.g. Diwali 2025" value={f.campaign || ''} onChange={(e) => set({ campaign: e.target.value || undefined })} />
          </label>
          <label className="la-field la-check">
            <input id="la-dup" type="checkbox" checked={f.duplicatesOnly} onChange={(e) => set({ duplicatesOnly: e.target.checked })} />
            <span>Duplicates only <span className="la-hint">— same mobile number; the most recently worked lead is kept.</span></span>
          </label>
        </div>
        <div className="la-protect">
          <b>Never archived, whatever the filters:</b> leads that became students or paid, leads with an upcoming follow-up, demo or seat
          reservation, leads in an Outpero call, and leads a counsellor touched in the last
          <select id="la-protect" className="la-input la-inline" value={f.protectDays} onChange={(e) => set({ protectDays: Number(e.target.value) })}>
            {[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n}</option>)}
          </select> days.
        </div>
        <div className="la-actions">
          <button className="la-btn" onClick={() => { setF(EMPTY); setPreview(null); }}>Clear</button>
          <button className="la-btn primary" disabled={busy} onClick={doPreview}>{busy && !preview ? 'Checking…' : 'Preview'}</button>
        </div>
      </section>

      {preview && (
        <section className="la-card">
          <h2>2. Check before archiving</h2>
          <div className="la-stats la-stats-inline">
            <div><b>{preview.matched.toLocaleString('en-IN')}</b><span>match the filters</span></div>
            <div className="warn"><b>{preview.protected.toLocaleString('en-IN')}</b><span>protected — will stay</span></div>
            <div className="go"><b>{preview.willArchive.toLocaleString('en-IN')}</b><span>will be archived</span></div>
          </div>
          {preview.sample.length > 0 && (
            <>
              <p className="la-sub">First {preview.sample.length} of them, oldest first:</p>
              <LeadTable rows={preview.sample} />
            </>
          )}
          {preview.willArchive > 0 && (
            <>
              <label className="la-field" style={{ marginTop: 12 }}>
                <span className="la-label">Reason (optional, shown on each lead)</span>
                <input id="la-reason" className="la-input" placeholder="e.g. Lost in 2025, no response" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
              </label>
              <div className="la-actions">
                {!confirming ? (
                  <button className="la-btn primary" onClick={() => setConfirming(true)}>Archive {preview.willArchive.toLocaleString('en-IN')} leads</button>
                ) : (
                  <>
                    <span className="la-sub">They leave All Leads now. You can restore them from History at any time.</span>
                    <button className="la-btn" onClick={() => setConfirming(false)}>Cancel</button>
                    <button className="la-btn primary" disabled={busy} onClick={doRun}>{busy ? 'Starting…' : 'Yes, archive them'}</button>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
};

const LeadTable: React.FC<{ rows: ArchiveLeadRow[]; selectable?: { selected: Set<string>; toggle: (id: string) => void } }> = ({ rows, selectable }) => (
  <div className="la-table-wrap">
    <table className="la-table">
      <thead><tr>{selectable && <th />}<th>Name</th><th>Mobile</th><th>Stage</th><th>Source</th><th>Created</th><th>{rows[0]?.archivedAt ? 'Archived' : 'Last action'}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r._id}>
            {selectable && <td><input type="checkbox" aria-label={`Select ${r.name}`} checked={selectable.selected.has(r._id)} onChange={() => selectable.toggle(r._id)} /></td>}
            <td><a href={`/leads/${r._id}`}>{r.name}</a>{r.archiveReason && <div className="la-hint">{r.archiveReason}</div>}</td>
            <td className="la-mono">{r.phone}</td>
            <td>{r.stageId?.name || '—'}</td>
            <td>{r.source || '—'}</td>
            <td>{fmt(r.createdAt)}</td>
            <td>{r.archivedAt ? fmt(r.archivedAt) : fmt(r.telecallerMetrics?.lastActionAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── Archived leads ───────────────────────────────────────────────────────────────────── */

const ArchivedTab: React.FC<{ onRestored: (m: string) => void; onError: (e: any) => void }> = ({ onRestored, onError }) => {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof leadArchiveApi.archived>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => leadArchiveApi.archived({ search: search || undefined, page }).then(setData).catch(onError), [search, page, onError]);
  useEffect(() => { load(); setSelected(new Set()); }, [load]);

  const restore = async () => {
    try {
      const r = await leadArchiveApi.restore({ leadIds: [...selected] });
      onRestored(`Restored ${r.restored} lead${r.restored === 1 ? '' : 's'} to All Leads.`);
      load(); setSelected(new Set());
    } catch (e) { onError(e); }
  };

  return (
    <section className="la-card">
      <div className="la-row">
        <input id="la-search" className="la-input" placeholder="Search name, mobile or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search archived leads" />
        <button className="la-btn primary" disabled={!selected.size} onClick={restore}>Restore {selected.size || ''} selected</button>
      </div>
      {!data ? <p className="la-sub">Loading…</p> : !data.rows.length ? <p className="la-sub">No archived leads{search ? ' match that search' : ''}.</p> : (
        <>
          <LeadTable rows={data.rows} selectable={{ selected, toggle: (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }) }} />
          <div className="la-pager">
            <span className="la-sub">{data.total.toLocaleString('en-IN')} archived</span>
            <button className="la-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="la-sub">Page {page} of {data.pages}</span>
            <button className="la-btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </section>
  );
};

/* ── History ──────────────────────────────────────────────────────────────────────────── */

const describe = (r: ArchiveRun) => {
  if (r.kind === 'purge') return `Archived before ${fmt(r.filters?.archivedBefore)}`;
  if (r.kind === 'restore') return r.filters?.runId ? 'Undid an archive run' : 'Chosen leads';
  const f = r.filters || {};
  const bits: string[] = [];
  if (f.stageIds?.length) bits.push(`${f.stageIds.length} stage${f.stageIds.length === 1 ? '' : 's'}`);
  if (f.sources?.length) bits.push(`source: ${f.sources.join(', ')}`);
  if (f.inactiveDays) bits.push(`no activity ${f.inactiveDays} days`);
  if (f.createdFrom || f.createdTo) bits.push(`created ${fmt(f.createdFrom)} – ${fmt(f.createdTo)}`);
  if (f.assignment && f.assignment !== 'any') bits.push(f.assignment);
  if (f.duplicatesOnly) bits.push('duplicates');
  if (f.campaign) bits.push(`campaign "${f.campaign}"`);
  return bits.join(' · ') || '—';
};

const HistoryTab: React.FC<{ onRestored: (m: string) => void; onError: (e: any) => void }> = ({ onRestored, onError }) => {
  const [runs, setRuns] = useState<ArchiveRun[] | null>(null);
  const [undoing, setUndoing] = useState('');
  const load = useCallback(() => leadArchiveApi.runs().then(setRuns).catch(onError), [onError]);
  useEffect(() => { load(); }, [load]);
  // Keep a running run's progress current.
  useEffect(() => {
    if (!runs?.some((r) => r.status === 'running')) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [runs, load]);

  const undo = async (r: ArchiveRun) => {
    try { const x = await leadArchiveApi.restore({ runId: r._id }); onRestored(`Restored ${x.restored} leads from that run.`); setUndoing(''); load(); }
    catch (e) { onError(e); }
  };

  return (
    <section className="la-card">
      {!runs ? <p className="la-sub">Loading…</p> : !runs.length ? <p className="la-sub">Nothing archived yet.</p> : (
        <div className="la-table-wrap">
          <table className="la-table">
            <thead><tr><th>When</th><th>What</th><th>Filters</th><th>Leads</th><th>By</th><th /></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r._id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtTime(r.createdAt)}</td>
                  <td>
                    <span className={`la-pill ${r.kind}`}>{KIND[r.kind]}</span>
                    {r.status === 'running' && <span className="la-pill running">running…</span>}
                    {r.status === 'failed' && <span className="la-pill failed" title={r.error}>stopped</span>}
                    {r.reason && <div className="la-hint">{r.reason}</div>}
                  </td>
                  <td>{describe(r)}</td>
                  <td className="la-num">{r.processed.toLocaleString('en-IN')}{r.kind === 'archive' && r.skippedProtected ? <div className="la-hint">{r.skippedProtected} protected</div> : null}</td>
                  <td>{r.startedByName || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {r.kind === 'archive' && r.status !== 'running' && r.processed > 0 && (undoing === r._id ? (
                      <>
                        <button className="la-btn" onClick={() => setUndoing('')}>Keep</button>
                        <button className="la-btn primary" onClick={() => undo(r)}>Restore all</button>
                      </>
                    ) : <button className="la-btn" onClick={() => setUndoing(r._id)}>Restore this run</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

/* ── Delete after three years ─────────────────────────────────────────────────────────── */

const DeleteTab: React.FC<{ onDone: (m: string) => void; onError: (e: any) => void }> = ({ onDone, onError }) => {
  const [p, setP] = useState<Awaited<ReturnType<typeof leadArchiveApi.purgePreview>> | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { leadArchiveApi.purgePreview().then(setP).catch(onError); }, [onError]);

  const go = async () => {
    setBusy(true);
    try { const r = await leadArchiveApi.purge(Number(typed)); onDone(`Deleting ${r.matched} leads permanently in the background. Progress is under History.`); }
    catch (e) { onError(e); }
    setBusy(false);
  };

  return (
    <section className="la-card">
      <h2>Delete leads archived more than 3 years ago</h2>
      <p className="la-sub">This cannot be undone. Each lead is deleted with its follow-ups, meetings, stage history and call records. WhatsApp conversations, assessments and registrations stay, without the link to the lead.</p>
      {!p ? <p className="la-sub">Loading…</p> : !p.count ? (
        <p className="la-sub">No leads have been archived since before {fmt(p.cutoff)}. Nothing to delete.</p>
      ) : (
        <>
          <div className="la-stats la-stats-inline"><div className="bad"><b>{p.count.toLocaleString('en-IN')}</b><span>archived before {fmt(p.cutoff)}</span></div></div>
          <ul className="la-list">{p.sample.map((s, i) => <li key={i}>{s.name} <span className="la-hint">archived {fmt(s.archivedAt)}</span></li>)}</ul>
          <label className="la-field">
            <span className="la-label">Type {p.count} to confirm</span>
            <input id="la-confirm" className="la-input" inputMode="numeric" value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))} />
          </label>
          <div className="la-actions">
            <button className="la-btn danger" disabled={busy || Number(typed) !== p.count} onClick={go}>{busy ? 'Starting…' : `Delete ${p.count} leads permanently`}</button>
          </div>
        </>
      )}
    </section>
  );
};

export default LeadArchive;
