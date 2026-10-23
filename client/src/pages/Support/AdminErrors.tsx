import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import supportApi, { ErrorGroup, ErrorGroupDetail, MonitorCounters, SupportMe, errorText, moduleLabel, STAFF_STATUS_LABEL } from '../../api/supportApi';
import { Loading, ErrorState, EmptyState, fmtDateTime, StatusBadge } from './supportUi';
import './support.css';

/**
 * Detected errors — the technical side, kept apart from reported tickets. A group shows how many
 * tickets are linked to it (by request id); a ticket shows its groups. Restricted to the super
 * admin and the support HQ's managers (server: requireMonitor).
 */
const KIND_LABEL: Record<string, string> = {
  exception: 'Server exception', server_5xx: 'Server error (5xx)', slow_request: 'Slow request', client_error: 'Browser error',
  client_api: 'Failed call (browser)', ai_failure: 'AI failure', mongo_connection: 'Database connection', slow_query: 'Slow database query',
};
const COUNTER_LABEL: Record<string, string> = {
  auth_401: 'Sign-in required (401)', auth_403: 'Access refused (403)', rate_limited: 'Rate limited (429)', http_5xx: 'Server errors (5xx)',
  slow_request: 'Slow requests', exception: 'Exceptions', client_error: 'Browser errors', client_api_failure: 'Failed calls (browser)',
  slow_query: 'Slow queries', mongo_error: 'Database errors', mongo_disconnected: 'Database disconnects',
  'ai_failure:timeout': 'AI timeouts', 'ai_failure:rate_limit': 'AI rate limits', 'ai_failure:auth': 'AI key refused', 'ai_failure:not_configured': 'AI not configured', 'ai_failure:error': 'AI errors',
};
const SEV_CLASS: Record<string, string> = { info: 'sp-pr-low', warning: 'sp-pr-high', error: 'sp-pr-critical', critical: 'sp-pr-critical' };

export const SeverityBadge: React.FC<{ s: string }> = ({ s }) => <span className={`sp-badge ${SEV_CLASS[s] || 'sp-pr-medium'}`}>{s}</span>;

export const AdminErrorList: React.FC<{ me: SupportMe | null; base: string }> = ({ me, base }) => {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<{ groups: ErrorGroup[]; total: number; page: number; limit: number; sentry: boolean } | null>(null);
  const [counters, setCounters] = useState<MonitorCounters | null>(null);
  const [range, setRange] = useState<'24h' | '7d'>('24h');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr(''); setData(null);
    const q: Record<string, string> = { limit: '50' };
    params.forEach((v, k) => { q[k] = v; });
    if (!q.status) q.status = 'open';
    try { setData(await supportApi.errors(q)); } catch (e) { setErr(errorText(e, 'Errors could not be loaded.')); }
  }, [params]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { supportApi.monitorCounters(range).then(setCounters).catch(() => setCounters(null)); }, [range]);

  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); p.delete('page'); setParams(p); };
  if (!me) return <Loading />;
  if (!me.canMonitor) return <p className="sp-err" role="alert">The error screens are for the support HQ's managers.</p>;

  return (
    <div className="sp-stack">
      {data && !data.sentry && <p className="sp-hint">Sentry is not connected (no SENTRY_DSN). Errors are grouped here either way.</p>}
      <div className="sp-card">
        <div className="sp-head" style={{ marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Counts</h2>
          <div className="sp-filters" style={{ margin: 0 }} role="group" aria-label="Period">
            {(['24h', '7d'] as const).map(r => <button key={r} type="button" className={`sp-chip${range === r ? ' on' : ''}`} aria-pressed={range === r} onClick={() => setRange(r)}>{r === '24h' ? 'Last 24 hours' : 'Last 7 days'}</button>)}
          </div>
        </div>
        {!counters ? <Loading /> : counters.counters.length === 0 ? <p className="sp-hint">Nothing counted in this period.</p> : (
          <div className="sp-metrics">{counters.counters.map(c => <div key={c.key} className="sp-metric"><span className="sp-metric-label">{COUNTER_LABEL[c.key] || c.key}</span><span className="sp-metric-value">{c.total}</span></div>)}</div>
        )}
      </div>

      <div className="sp-filters">
        <select className="sp-select" style={{ width: 'auto' }} aria-label="Status" value={params.get('status') || 'open'} onChange={e => set('status', e.target.value)}>
          <option value="open">Open</option><option value="resolved">Resolved</option><option value="ignored">Ignored</option>
        </select>
        <select className="sp-select" style={{ width: 'auto' }} aria-label="Kind" value={params.get('kind') || ''} onChange={e => set('kind', e.target.value)}>
          <option value="">All kinds</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="sp-select" style={{ width: 'auto' }} aria-label="Severity" value={params.get('severity') || ''} onChange={e => set('severity', e.target.value)}>
          <option value="">All severities</option>{['critical', 'error', 'warning', 'info'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="sp-select" style={{ width: 'auto' }} aria-label="Linked to tickets" value={params.get('linked') || ''} onChange={e => set('linked', e.target.value)}>
          <option value="">Linked or not</option><option value="true">Linked to tickets</option><option value="false">Not linked</option>
        </select>
        <select className="sp-select" style={{ width: 'auto' }} aria-label="Sort" value={params.get('sort') || ''} onChange={e => set('sort', e.target.value)}>
          <option value="">Most recent</option><option value="count">Most frequent</option>
        </select>
      </div>

      <div className="sp-card" style={{ padding: 0, overflowX: 'auto' }}>
        {err ? <ErrorState text={err} onRetry={load} /> : !data ? <Loading /> : data.groups.length === 0 ? <EmptyState icon="check2-circle" title="No errors here" /> : (
          <table className="sp-table">
            <thead><tr><th scope="col">Problem</th><th scope="col">Kind</th><th scope="col">Severity</th><th scope="col">Times</th><th scope="col">Tickets</th><th scope="col">Last seen</th></tr></thead>
            <tbody>
              {data.groups.map(g => (
                <tr key={g.id}>
                  <td><button type="button" className="sp-linkbtn" onClick={() => nav(`${base}/${g.id}`)}>{g.title}</button><div className="sp-item-meta">{g.route || moduleLabel(g.module)}{g.lastRelease ? ` · ${g.lastRelease}` : ''}</div></td>
                  <td>{KIND_LABEL[g.kind] || g.kind}</td>
                  <td><SeverityBadge s={g.severity} /></td>
                  <td>{g.count}</td>
                  <td>{g.linkedTickets || <span className="sp-hint">—</span>}</td>
                  <td className="sp-nowrap">{fmtDateTime(g.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export const AdminErrorDetail: React.FC<{ me: SupportMe | null; base: string; ticketBase: string }> = ({ me, base, ticketBase }) => {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [g, setG] = useState<ErrorGroupDetail | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => { setErr(''); supportApi.error(id).then(setG).catch(e => setErr(errorText(e, 'This error could not be loaded.'))); }, [id]);
  useEffect(() => { load(); }, [load]);
  const update = async (body: { status?: string; severityOverride?: string | null }, ok: string) => {
    setMsg('');
    try { await supportApi.updateError(id, body); setMsg(ok); load(); } catch (e) { setMsg(errorText(e)); }
  };
  if (!me) return <Loading />;
  if (!me.canMonitor) return <p className="sp-err" role="alert">The error screens are for the support HQ's managers.</p>;
  if (err) return <ErrorState text={err} onRetry={load} />;
  if (!g) return <Loading />;
  return (
    <div className="sp-stack">
      <button type="button" className="sp-back" onClick={() => nav(base)}><i className="bi bi-arrow-left" aria-hidden /> All errors</button>
      <div className="sp-head">
        <div><h2 style={{ margin: 0 }}>{g.title}</h2><div className="sp-item-meta">{KIND_LABEL[g.kind] || g.kind} · {g.route || moduleLabel(g.module)}</div></div>
        <div style={{ display: 'flex', gap: 6 }}><SeverityBadge s={g.severity} /><span className="sp-tag">{g.status}</span></div>
      </div>
      <div className="sp-grid">
        <div className="sp-stack">
          <div className="sp-card">
            <dl className="sp-kv">
              <dt>Seen</dt><dd>{g.count} times</dd>
              <dt>First</dt><dd>{fmtDateTime(g.firstSeen)}{g.firstRelease ? ` · ${g.firstRelease}` : ''}</dd>
              <dt>Last</dt><dd>{fmtDateTime(g.lastSeen)}{g.lastRelease ? ` · ${g.lastRelease}` : ''}</dd>
              <dt>Area</dt><dd>{moduleLabel(g.module)}</dd>
              <dt>Colleges</dt><dd>{g.collegeCount || '—'}</dd>
            </dl>
            {g.message && <pre className="sp-pre">{g.message}</pre>}
            {g.topFrames.length > 0 && <pre className="sp-pre">{g.topFrames.join('\n')}</pre>}
            {g.sampleRequestIds.length > 0 && <p className="sp-hint">Recent request ids: {g.sampleRequestIds.join(', ')}</p>}
          </div>
          <div className="sp-card">
            <h2>Tickets linked by request id</h2>
            {g.tickets.length === 0 ? <p className="sp-hint">No ticket quoted a request id from this problem.</p> : (
              <ul className="sp-list">{g.tickets.map(t => (
                <li key={t.id}><button type="button" className="sp-item" onClick={() => nav(`${ticketBase}/${t.id}`)}>
                  <div className="sp-item-main"><div className="sp-item-subj">{t.subject}</div><div className="sp-item-meta">{t.ticketNumber} · {STAFF_STATUS_LABEL[t.status]}</div></div><StatusBadge status={t.status} staff />
                </button></li>
              ))}</ul>
            )}
          </div>
        </div>
        <aside className="sp-card">
          <h2>Manage</h2>
          <div className="sp-actions">
            {g.status !== 'resolved' && <button type="button" className="sp-btn sp-btn-teal" onClick={() => update({ status: 'resolved' }, 'Marked resolved. It reopens if it happens again.')}>Mark resolved</button>}
            {g.status !== 'ignored' && <button type="button" className="sp-btn sp-btn-ghost" onClick={() => update({ status: 'ignored' }, 'Ignored: no more alerts for it.')}>Ignore</button>}
            {g.status !== 'open' && <button type="button" className="sp-btn sp-btn-ghost" onClick={() => update({ status: 'open' }, 'Reopened.')}>Reopen</button>}
          </div>
          <div className="sp-field" style={{ marginTop: 12 }}>
            <label htmlFor="sev">Severity for this problem</label>
            <select id="sev" className="sp-select" value={g.severityOverride || ''} onChange={e => update({ severityOverride: e.target.value || null }, 'Severity updated.')}>
              <option value="">Default ({g.configuredSeverity})</option>{['critical', 'error', 'warning', 'info'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {msg && <p className="sp-hint" role="status">{msg}</p>}
        </aside>
      </div>
    </div>
  );
};
