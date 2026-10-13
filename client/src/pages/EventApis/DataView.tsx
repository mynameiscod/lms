import React, { useEffect, useState } from 'react';
import { eventApisApi, evError, EvCollection, EvEvent, EvSubmissions } from '../../api/eventApisApi';
import { istDate } from './shared';

/**
 * The registrations in one collection: all of its events together, or one event with its own
 * columns. Search by name, mobile or email; export what is on screen as CSV.
 */
const cell = (v: any) => {
  if (v === undefined || v === null || v === '') return <span style={{ color: 'var(--ev-faint)' }}>—</span>;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
};

const DataView: React.FC<{ collections: EvCollection[]; events: EvEvent[]; initialCollection: string; initialEvent: string }> = ({ collections, events, initialCollection, initialEvent }) => {
  const [collectionId, setCollectionId] = useState(initialCollection || collections[0]?._id || '');
  const [eventApiId, setEventApiId] = useState(initialEvent);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EvSubmissions | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState('');

  useEffect(() => { if (!collectionId && collections[0]) setCollectionId(collections[0]._id); }, [collections, collectionId]);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [collectionId, eventApiId, debounced, from, to]);

  const query = {
    collectionId, eventApiId: eventApiId || undefined, q: debounced || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  };

  const load = async () => {
    if (!collectionId) return;
    setErr('');
    try { setData(await eventApisApi.submissions({ ...query, page })); } catch (e) { setErr(evError(e, 'Could not load registrations.')); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [collectionId, eventApiId, debounced, from, to, page]);

  const eventsHere = events.filter((e) => String(e.collectionId) === collectionId);
  const showEventCol = !eventApiId;

  const exportCsv = async () => {
    setBusy(true);
    try { await eventApisApi.exportCsv(query); } catch (e) { setErr(evError(e, 'Could not export.')); }
    setBusy(false);
  };
  const remove = async (id: string) => {
    try { await eventApisApi.deleteSubmission(id); setConfirmId(''); load(); } catch (e) { setErr(evError(e)); }
  };

  if (!collections.length) {
    return <section className="ev-card"><div className="ev-empty">No collections yet. Create an event API first; its registrations appear here.</div></section>;
  }

  return (
    <section className="ev-card">
      <div className="ev-filters">
        <select id="dv-col" className="ev-select" value={collectionId} onChange={(e) => { setCollectionId(e.target.value); setEventApiId(''); }} aria-label="Collection">
          {collections.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select id="dv-event" className="ev-select" value={eventApiId} onChange={(e) => setEventApiId(e.target.value)} aria-label="Event">
          <option value="">All events in this collection</option>
          {eventsHere.map((e) => <option key={e._id} value={e._id}>{e.eventName}</option>)}
        </select>
        <input id="dv-q" className="ev-input" placeholder="Search name, mobile or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <label className="ev-row" style={{ gap: 4 }}>From <input id="dv-from" type="date" className="ev-input" style={{ width: 'auto' }} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="ev-row" style={{ gap: 4 }}>To <input id="dv-to" type="date" className="ev-input" style={{ width: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="ev-btn" disabled={busy || !data?.total} onClick={exportCsv}><i className="fa-solid fa-file-csv" /> {busy ? 'Exporting…' : 'Export CSV'}</button>
      </div>

      {err && <div className="ev-alert ev-alert-bad" role="alert">{err}</div>}

      {!data ? <p className="ev-sub">Loading…</p> : (
        <>
          <p className="ev-sub" style={{ marginBottom: 8 }}><b className="ev-num">{data.total.toLocaleString('en-IN')}</b> registration{data.total === 1 ? '' : 's'}</p>
          <div className="ev-table-wrap">
            <table className="ev-table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  {showEventCol && <th>Event</th>}
                  {data.columns.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>Source</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!data.rows.length && <tr><td colSpan={data.columns.length + 4} className="ev-empty">No registrations match.</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{istDate(r.createdAt)}</td>
                    {showEventCol && <td>{r.eventName}</td>}
                    {data.columns.map((c) => <td key={c.key}>{cell(r.data?.[c.key])}</td>)}
                    <td>{cell(r.meta?.utm?.source)}</td>
                    <td>
                      {confirmId === r._id ? (
                        <span className="ev-row" style={{ flexWrap: 'nowrap' }}>
                          <button className="ev-btn ev-btn-sm ev-btn-danger" onClick={() => remove(r._id)}>Delete</button>
                          <button className="ev-btn ev-btn-sm" onClick={() => setConfirmId('')}>Keep</button>
                        </span>
                      ) : (
                        <button className="ev-btn ev-btn-ghost ev-btn-sm" onClick={() => setConfirmId(r._id)} aria-label="Delete registration"><i className="fa-solid fa-trash" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="ev-pager">
              <button className="ev-btn ev-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="ev-sub">Page {page} of {data.pages}</span>
              <button className="ev-btn ev-btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default DataView;
