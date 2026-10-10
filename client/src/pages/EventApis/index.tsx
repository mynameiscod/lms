import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventApisApi, evError, EvCollection, EvEvent } from '../../api/eventApisApi';
import IntegrationPanel from './IntegrationPanel';
import DataView from './DataView';
import { StatePill, istDate } from './shared';
import './eventApis.css';

/**
 * Event APIs — registration APIs the website calls for workshops, hackathons and other events.
 * Two tabs: the events (create, edit, pause, integrate) and the data they have collected.
 */
const EventApis: React.FC = () => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'data' ? 'data' : 'events';
  const [events, setEvents] = useState<EvEvent[]>([]);
  const [collections, setCollections] = useState<EvCollection[]>([]);
  const [tenantSlug, setTenantSlug] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [integrate, setIntegrate] = useState<EvEvent | null>(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      const [evs, cols, meta] = await Promise.all([eventApisApi.events(), eventApisApi.collections(), eventApisApi.meta()]);
      setEvents(evs); setCollections(cols); setTenantSlug(meta.tenantSlug);
    } catch (e) { setErr(evError(e, 'Could not load event APIs.')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const togglePause = async (ev: EvEvent) => {
    try {
      await eventApisApi.setStatus(ev._id, ev.status === 'paused' ? 'live' : 'paused');
      setMsg(ev.status === 'paused' ? `${ev.eventName} is taking registrations again.` : `${ev.eventName} is paused. The website will show it as paused.`);
      load();
    } catch (e) { setErr(evError(e)); }
  };

  const shown = filter ? events.filter((e) => String(e.collectionId) === filter) : events;
  const libraryOf = (ev: EvEvent) => collections.find((c) => c._id === String(ev.collectionId))?.fields || [];
  const goTab = (t: 'events' | 'data', extra: Record<string, string> = {}) => setParams({ ...(t === 'data' ? { tab: 'data' } : {}), ...extra });

  return (
    <div className="ev-root">
      <div className="ev-head">
        <div className="ev-grow">
          <h1>Event APIs</h1>
          <p className="ev-sub">Create a registration API for a workshop, hackathon or any event. The website reads its fields and sends registrations here, and you see them under Data.</p>
        </div>
        <button className="ev-btn ev-btn-primary" onClick={() => nav('/event-apis/new')}><i className="fa-solid fa-plus" /> New event API</button>
      </div>

      <div className="ev-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'on' : ''} onClick={() => goTab('events')}>Events</button>
        <button role="tab" aria-selected={tab === 'data'} className={tab === 'data' ? 'on' : ''} onClick={() => goTab('data')}>Data</button>
      </div>

      {err && <div className="ev-alert ev-alert-bad" role="alert">{err}</div>}
      {msg && <div className="ev-alert ev-alert-ok" role="status">{msg}</div>}

      {tab === 'data' ? (
        <DataView collections={collections} events={events}
          initialCollection={params.get('collection') || ''} initialEvent={params.get('event') || ''} />
      ) : (
        <section className="ev-card">
          <div className="ev-filters">
            <select id="ev-filter-col" className="ev-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Collection">
              <option value="">All collections</option>
              {collections.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          {loading ? <p className="ev-sub">Loading…</p> : !shown.length ? (
            <div className="ev-empty">
              <p><b>No event APIs yet.</b></p>
              <p>Create one for your next workshop or hackathon, then give the API to the website team.</p>
              <button className="ev-btn ev-btn-primary" onClick={() => nav('/event-apis/new')}><i className="fa-solid fa-plus" /> New event API</button>
            </div>
          ) : (
            <div className="ev-table-wrap">
              <table className="ev-table">
                <thead><tr><th>Event</th><th>Collection</th><th>API name</th><th>Closes</th><th>Status</th><th>Registrations</th><th /></tr></thead>
                <tbody>
                  {shown.map((ev) => (
                    <tr key={ev._id}>
                      <td><b>{ev.eventName}</b></td>
                      <td>{ev.collectionName}</td>
                      <td className="ev-mono">{ev.apiName}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{istDate(ev.closesAt)}</td>
                      <td><StatePill s={ev.state} /></td>
                      <td className="ev-num">
                        <button className="ev-btn ev-btn-ghost ev-btn-sm" onClick={() => goTab('data', { collection: String(ev.collectionId), event: ev._id })}>
                          {ev.submissionCount.toLocaleString('en-IN')} <i className="fa-solid fa-arrow-right" />
                        </button>
                      </td>
                      <td>
                        <div className="ev-row" style={{ flexWrap: 'nowrap' }}>
                          <button className="ev-btn ev-btn-sm" onClick={() => setIntegrate(ev)}><i className="fa-solid fa-code" /> Integrate</button>
                          <button className="ev-btn ev-btn-sm" onClick={() => nav(`/event-apis/${ev._id}/edit`)}><i className="fa-solid fa-pen" /> Edit</button>
                          <button className="ev-btn ev-btn-sm" onClick={() => togglePause(ev)}>
                            {ev.status === 'paused' ? <><i className="fa-solid fa-play" /> Resume</> : <><i className="fa-solid fa-pause" /> Pause</>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {integrate && <IntegrationPanel event={integrate} library={libraryOf(integrate)} tenantSlug={tenantSlug} onClose={() => setIntegrate(null)} />}
    </div>
  );
};

export default EventApis;
