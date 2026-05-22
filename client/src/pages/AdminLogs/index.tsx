import React, { useState, useEffect, useCallback } from 'react';
import { getClientErrors, clearClientErrors, ClientError } from '../../utils/errorStore';

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

type Level = 'ALL' | 'ERROR' | 'WARN' | 'INFO';

interface ServerLine { raw: string; level: Level; ts: string; msg: string }

function parseServerLine(line: string): ServerLine {
  const tsMatch  = line.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.Z]+)\]/);
  const lvlMatch = line.match(/\[(ERROR|WARN|INFO)\]/);
  return {
    raw:   line,
    ts:    tsMatch?.[1] || '',
    level: (lvlMatch?.[1] as Level) || 'INFO',
    msg:   line.replace(/^\[.*?\]\s*\[.*?\]\s*/, ''),
  };
}

function levelBadge(level: Level) {
  if (level === 'ERROR') return { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' };
  if (level === 'WARN')  return { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' };
  return { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' };
}

const AdminLogs: React.FC = () => {
  const [tab,          setTab]          = useState<'server' | 'client'>('server');
  const [serverLines,  setServerLines]  = useState<ServerLine[]>([]);
  const [rawLines,     setRawLines]     = useState<ServerLine[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [logType,      setLogType]      = useState<'errors' | 'all'>('errors');
  const [levelFilter,  setLevelFilter]  = useState<Level>('ALL');
  const [search,       setSearch]       = useState('');
  const [totalLines,   setTotalLines]   = useState(0);
  const [clientErrors, setClientErrors] = useState<ClientError[]>(getClientErrors());
  const [clientSearch, setClientSearch] = useState('');
  const [clientLevel,  setClientLevel]  = useState<'ALL' | '4xx' | '5xx'>('ALL');
  const [autoRefresh,  setAutoRefresh]  = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token    = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const res = await fetch(`${API_BASE}/admin/logs?type=${logType}&lines=500`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId || '' },
      });
      const data = await res.json();
      const parsed = (data.lines || []).map(parseServerLine);
      setRawLines(parsed);
      setTotalLines(data.total || 0);
    } catch { }
    setLoading(false);
  }, [logType]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetchLogs, 10_000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchLogs]);

  // Apply filters
  useEffect(() => {
    let filtered = rawLines;
    if (levelFilter !== 'ALL') filtered = filtered.filter(l => l.level === levelFilter);
    if (search.trim())         filtered = filtered.filter(l => l.raw.toLowerCase().includes(search.toLowerCase()));
    setServerLines(filtered);
  }, [rawLines, levelFilter, search]);

  const filteredClient = clientErrors.filter(e => {
    const matchLevel = clientLevel === 'ALL' ? true : clientLevel === '5xx' ? e.status >= 500 : e.status >= 400 && e.status < 500;
    const matchSearch = !clientSearch.trim() || `${e.url} ${e.message}`.toLowerCase().includes(clientSearch.toLowerCase());
    return matchLevel && matchSearch;
  });

  const errorCount = rawLines.filter(l => l.level === 'ERROR').length;
  const warnCount  = rawLines.filter(l => l.level === 'WARN').length;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, width: '100%' }}>

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-bold">🪲 API Logs</h4>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>
            Monitor server-side errors and client API failures
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div className="form-check form-switch mb-0 me-1">
            <input className="form-check-input" type="checkbox" id="autoRefresh"
              checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            <label className="form-check-label small text-muted" htmlFor="autoRefresh">Auto-refresh 10s</label>
          </div>
          <button className="btn btn-outline-primary btn-sm" onClick={fetchLogs} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-1" /> : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Lines', value: totalLines, color: '#1e40af', bg: '#eff6ff' },
          { label: 'Errors', value: errorCount, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Warnings', value: warnCount, color: '#d97706', bg: '#fffbeb' },
          { label: 'Client Errors', value: clientErrors.length, color: '#7c3aed', bg: '#faf5ff' },
        ].map(s => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, background: s.bg }}>
              <div className="card-body py-3">
                <div style={{ fontWeight: 800, fontSize: 26, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-3">
        {(['server', 'client'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ textTransform: 'capitalize' }}>{t === 'server' ? '🖥 Server Logs' : '🌐 Client Errors'}</button>
        ))}
      </div>

      {tab === 'server' && (
        <>
          {/* Server Filters */}
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 12 }}>
            <div className="card-body p-3">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold mb-1">Search</label>
                  <input className="form-control form-control-sm" placeholder="endpoint, error message…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small fw-semibold mb-1">Level</label>
                  <select className="form-select form-select-sm" value={levelFilter}
                    onChange={e => setLevelFilter(e.target.value as Level)}>
                    <option value="ALL">All Levels</option>
                    <option value="ERROR">Errors only</option>
                    <option value="WARN">Warnings only</option>
                    <option value="INFO">Info only</option>
                  </select>
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small fw-semibold mb-1">Log File</label>
                  <select className="form-select form-select-sm" value={logType}
                    onChange={e => { setLogType(e.target.value as any); }}>
                    <option value="errors">Errors + Warnings</option>
                    <option value="all">All Requests</option>
                  </select>
                </div>
                <div className="col-12 col-md-2 d-flex align-items-end">
                  <span className="text-muted small">{serverLines.length} / {rawLines.length} lines</span>
                </div>
              </div>
            </div>
          </div>

          {/* Server Log Table */}
          <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
            {loading ? (
              <div className="text-center py-5 text-muted">
                <span className="spinner-border spinner-border-sm me-2" />Loading logs…
              </div>
            ) : serverLines.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No log entries found. Logs are written once APIs are called.
                <br /><small>File path on VPS: <code>/app/logs/api-errors.log</code></small>
              </div>
            ) : (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                <table className="table table-sm mb-0" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ width: 180, color: '#64748b', fontWeight: 600 }}>Time</th>
                      <th style={{ width: 80, color: '#64748b', fontWeight: 600 }}>Level</th>
                      <th style={{ color: '#64748b', fontWeight: 600 }}>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverLines.map((l, i) => {
                      const badge = levelBadge(l.level);
                      return (
                        <tr key={i} style={{ background: l.level === 'ERROR' ? '#fff8f8' : 'transparent' }}>
                          <td style={{ color: '#94a3b8', verticalAlign: 'top', paddingTop: 8 }}>
                            {l.ts ? new Date(l.ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : '—'}
                          </td>
                          <td style={{ verticalAlign: 'top', paddingTop: 8 }}>
                            <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                              {l.level}
                            </span>
                          </td>
                          <td style={{ color: '#0f172a', wordBreak: 'break-all', lineHeight: 1.6, paddingTop: 6 }}>
                            {l.msg}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'client' && (
        <>
          {/* Client Filters */}
          <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 12 }}>
            <div className="card-body p-3">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-5">
                  <label className="form-label small fw-semibold mb-1">Search</label>
                  <input className="form-control form-control-sm" placeholder="URL or error message…"
                    value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                </div>
                <div className="col-6 col-md-3">
                  <label className="form-label small fw-semibold mb-1">Status</label>
                  <select className="form-select form-select-sm" value={clientLevel}
                    onChange={e => setClientLevel(e.target.value as any)}>
                    <option value="ALL">All</option>
                    <option value="5xx">5xx Server Errors</option>
                    <option value="4xx">4xx Client Errors</option>
                  </select>
                </div>
                <div className="col-6 col-md-4 d-flex gap-2 align-items-end">
                  <span className="text-muted small">{filteredClient.length} errors</span>
                  {clientErrors.length > 0 && (
                    <button className="btn btn-outline-danger btn-sm ms-auto"
                      onClick={() => { clearClientErrors(); setClientErrors([]); }}>
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
            {filteredClient.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                No client-side API errors recorded in this session.
              </div>
            ) : (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ color: '#64748b', fontWeight: 600, width: 180 }}>Time</th>
                      <th style={{ color: '#64748b', fontWeight: 600, width: 70 }}>Status</th>
                      <th style={{ color: '#64748b', fontWeight: 600, width: 70 }}>Method</th>
                      <th style={{ color: '#64748b', fontWeight: 600 }}>URL</th>
                      <th style={{ color: '#64748b', fontWeight: 600 }}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClient.map((e, i) => (
                      <tr key={i} style={{ background: e.status >= 500 ? '#fff8f8' : 'transparent' }}>
                        <td style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>
                          {new Date(e.ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: e.status >= 500 ? '#dc2626' : '#d97706', fontFamily: 'monospace' }}>
                            {e.status}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>{e.method}</td>
                        <td style={{ color: '#1e40af', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{e.url}</td>
                        <td style={{ color: '#ef4444', fontSize: 11 }}>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLogs;
