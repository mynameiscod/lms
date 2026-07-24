import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getClientErrors, ClientError } from '../../utils/errorStore';
import './AdminLogs.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

type Kind = 'ERROR' | 'WARN' | 'SUCCESS' | 'INFO';
type LogType = 'server' | 'client' | 'activity';

interface LogRow {
  id: string;
  ts: string;
  kind: Kind;
  method?: string;
  endpoint?: string;
  status?: number;
  ms?: number;
  ip?: string;
  user?: string;
  module?: string;
  message?: string;
  detail: Record<string, any>;
}

/* ── parsing helpers ── */
function parseServer(raw: string) {
  const tsMatch = raw.match(/\[(\d{4}-\d{2}-\d{2}T[\d:.Z]+)\]/);
  const lvlMatch = raw.match(/\[(ERROR|WARN|INFO)\]/);
  const level = (lvlMatch?.[1] as 'ERROR' | 'WARN' | 'INFO') || 'INFO';
  const after = raw.replace(/^\[.*?\]\s*\[.*?\]\s*/, '');
  const req = after.match(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(\S+)\s+→\s+(\d+)\s+\((\d+)ms\)/);
  let meta: any = null;
  const brace = after.indexOf('{');
  if (brace >= 0) { try { meta = JSON.parse(after.slice(brace)); } catch { /* ignore */ } }
  return {
    ts: tsMatch?.[1] || '',
    level,
    method: req?.[1],
    endpoint: req?.[2],
    status: req ? Number(req[3]) : undefined,
    ms: req ? Number(req[4]) : undefined,
    ip: meta?.ip,
    tenant: meta?.tenant,
    message: req ? undefined : after.slice(0, brace >= 0 ? brace : undefined).trim(),
    meta,
  };
}

function moduleFromPath(p = ''): string {
  const s = p.toLowerCase();
  if (s.includes('/auth') || s.includes('/login')) return 'Auth Service';
  if (s.includes('/student')) return 'Student Service';
  if (s.includes('/profile') || s.includes('/users')) return 'User Service';
  if (s.includes('/announcement')) return 'Announcement';
  if (s.includes('/interview')) return 'Interview';
  if (s.includes('/quiz')) return 'Quiz';
  if (s.includes('/assignment')) return 'Assignment';
  if (s.includes('/attendance')) return 'Attendance';
  if (s.includes('/communication') || s.includes('/thinking') || s.includes('/lab')) return 'Lab';
  if (s.includes('/playground')) return 'Playground';
  if (s.includes('/batch')) return 'Batch';
  if (s.includes('/curriculum') || s.includes('/lesson')) return 'Curriculum';
  if (s.includes('/lead') || s.includes('/crm')) return 'CRM';
  if (s.includes('/enrollment') || s.includes('/plan')) return 'Enrollment';
  return 'API';
}

const kindClass: Record<Kind, string> = { ERROR: 'b-error', WARN: 'b-warn', SUCCESS: 'b-success', INFO: 'b-info' };
const kindLabel: Record<Kind, string> = { ERROR: 'ERROR', WARN: 'WARN', SUCCESS: 'SUCCESS', INFO: 'INFO' };
function methodClass(m = '') {
  const k = m.toUpperCase();
  return k === 'GET' ? 'm-get' : k === 'POST' ? 'm-post' : k === 'PUT' ? 'm-put'
    : k === 'DELETE' ? 'm-delete' : k === 'PATCH' ? 'm-patch' : 'm-other';
}
function rtClass(ms?: number) { return ms == null ? '' : ms < 200 ? 'alogs-rt-fast' : ms < 500 ? 'alogs-rt-mid' : 'alogs-rt-slow'; }
const fmtTime = (ts: string) => {
  if (!ts) return { date: '—', time: '' };
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

/* Decorative sparkline */
const Sparkline: React.FC<{ color: string; seed: number[] }> = ({ color, seed }) => {
  const w = 92, h = 46, max = Math.max(...seed, 1);
  const pts = seed.map((v, i) => `${(i / (seed.length - 1)) * w},${h - (v / max) * (h - 6) - 3}`).join(' ');
  return (
    <svg className="alogs-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const authHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId || '' };
};

const AdminLogs: React.FC = () => {
  const [logType, setLogType] = useState<LogType>('server');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [rangePreset, setRangePreset] = useState<'today' | '7d' | '30d' | 'all'>('7d');

  // raw datasets
  const [serverRaw, setServerRaw] = useState<string[]>([]);
  const [clientErrors] = useState<ClientError[]>(getClientErrors());
  const [actRows, setActRows] = useState<any[]>([]);

  // filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Kind>('ALL');
  const [methodFilter, setMethodFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // table
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<LogRow | null>(null);

  /* ── fetching ── */
  const fetchServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/logs?type=all&lines=500`, { headers: authHeaders() });
      const data = await res.json();
      setServerRaw(data.lines || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/activity?limit=300`, { headers: authHeaders() });
      const data = await res.json();
      setActRows(data.data || []);
    } catch { setActRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchServer(); }, [fetchServer]);
  useEffect(() => { if (logType === 'activity') fetchActivity(); }, [logType, fetchActivity]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => { logType === 'activity' ? fetchActivity() : fetchServer(); }, 10_000);
    return () => clearInterval(iv);
  }, [autoRefresh, logType, fetchServer, fetchActivity]);

  // reset paging/selection when the view changes
  useEffect(() => { setPage(1); setSelected(null); }, [logType, search, statusFilter, methodFilter, moduleFilter, userFilter, rangePreset]);

  /* ── map raw → unified rows ── */
  const allRows: LogRow[] = useMemo(() => {
    if (logType === 'server') {
      return serverRaw.map((raw, i) => {
        const p = parseServer(raw);
        const kind: Kind = p.level === 'ERROR' ? 'ERROR' : p.level === 'WARN' ? 'WARN'
          : (p.status != null && p.status < 400) ? 'SUCCESS' : 'INFO';
        return {
          id: `s${i}`, ts: p.ts, kind, method: p.method, endpoint: p.endpoint, status: p.status, ms: p.ms,
          ip: p.ip, user: '—', module: p.endpoint ? moduleFromPath(p.endpoint) : 'System',
          message: p.message,
          detail: { method: p.method, endpoint: p.endpoint, status: p.status, responseTime: p.ms, ip: p.ip, tenant: p.tenant, message: p.message, request: p.meta?.reqBody, response: p.meta?.response },
        };
      });
    }
    if (logType === 'client') {
      return clientErrors.map((e, i) => {
        const kind: Kind = e.status >= 500 ? 'ERROR' : e.status >= 400 ? 'WARN' : 'INFO';
        return {
          id: `c${i}`, ts: e.ts, kind, method: e.method, endpoint: e.url, status: e.status,
          ip: '—', user: '—', module: 'Client', message: e.message,
          detail: { method: e.method, endpoint: e.url, status: e.status, error: e.message },
        };
      });
    }
    // activity
    return actRows.map((r, i) => {
      const kind: Kind = r.status >= 500 ? 'ERROR' : r.status >= 400 ? 'WARN' : 'SUCCESS';
      const u = r.userId && typeof r.userId === 'object';
      const user = u ? (`${r.userId.firstName || ''} ${r.userId.lastName || ''}`.trim() || r.userId.email) : (r.userId || '—');
      return {
        id: `a${i}`, ts: r.createdAt, kind, method: r.method, endpoint: r.route, status: r.status,
        ip: r.ip || '—', user: user || '—', module: r.module || 'other',
        message: r.errorMessage || r.action,
        detail: { user, email: u ? r.userId.email : undefined, action: r.action, method: r.method, endpoint: r.route, module: r.module, status: r.status, source: r.source, ip: r.ip, error: r.errorMessage, meta: r.meta },
      };
    });
  }, [logType, serverRaw, clientErrors, actRows]);

  /* ── derived filter option lists ── */
  const moduleOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.module).filter(Boolean))) as string[], [allRows]);
  const userOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.user).filter(u => u && u !== '—'))) as string[], [allRows]);

  /* ── date range ── */
  const rangeBounds = useMemo(() => {
    if (rangePreset === 'all') return null;
    const now = new Date();
    const to = now.getTime();
    const days = rangePreset === 'today' ? 1 : rangePreset === '7d' ? 7 : 30;
    const from = new Date(now); from.setDate(now.getDate() - (days - 1)); from.setHours(0, 0, 0, 0);
    return { from: from.getTime(), to };
  }, [rangePreset]);

  const rangeLabel = useMemo(() => {
    if (!rangeBounds) return 'All time';
    const f = new Date(rangeBounds.from), t = new Date(rangeBounds.to);
    const o: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${f.toLocaleDateString('en-IN', o)} – ${t.toLocaleDateString('en-IN', { ...o, year: 'numeric' })}`;
  }, [rangeBounds]);

  /* ── apply filters ── */
  const filtered = useMemo(() => allRows.filter(r => {
    if (statusFilter !== 'ALL' && r.kind !== statusFilter) return false;
    if (methodFilter && (r.method || '').toUpperCase() !== methodFilter) return false;
    if (moduleFilter && r.module !== moduleFilter) return false;
    if (userFilter && r.user !== userFilter) return false;
    if (rangeBounds && r.ts) { const t = new Date(r.ts).getTime(); if (t < rangeBounds.from || t > rangeBounds.to) return false; }
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.endpoint || ''} ${r.method || ''} ${r.user || ''} ${r.module || ''} ${r.message || ''} ${r.ip || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [allRows, statusFilter, methodFilter, moduleFilter, userFilter, rangeBounds, search]);

  /* ── stats (over the active log type, before paging) ── */
  const stats = useMemo(() => {
    const errors = allRows.filter(r => r.kind === 'ERROR').length;
    const warnings = allRows.filter(r => r.kind === 'WARN').length;
    const debug = allRows.filter(r => r.kind === 'INFO' || r.kind === 'SUCCESS').length;
    return { total: allRows.length, errors, warnings, debug };
  }, [allRows]);

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);
  const startIdx = filtered.length === 0 ? 0 : (page - 1) * perPage + 1;
  const endIdx = Math.min(page * perPage, filtered.length);

  const clearFilters = () => { setSearch(''); setStatusFilter('ALL'); setMethodFilter(''); setModuleFilter(''); setUserFilter(''); setRangePreset('7d'); };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${logType}-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const refreshNow = () => { logType === 'activity' ? fetchActivity() : fetchServer(); };

  const statCards = [
    { label: 'Total Logs', value: stats.total, sub: 'Total requests', color: '#2563eb', bg: 'linear-gradient(135deg,#eff6ff,#f8fbff)' },
    { label: 'Errors', value: stats.errors, sub: 'Failed requests', color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fff7f7)' },
    { label: 'Warnings', value: stats.warnings, sub: 'Warnings', color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fffdf5)' },
    { label: 'Debug Logs', value: stats.debug, sub: 'Debug entries', color: '#7c3aed', bg: 'linear-gradient(135deg,#faf5ff,#fdfbff)' },
  ];
  const sparkSeeds = [[3, 5, 4, 7, 6, 9, 8], [2, 6, 4, 8, 5, 9, 7], [4, 3, 6, 5, 8, 6, 9], [3, 7, 5, 8, 6, 9, 7]];

  const seg: [LogType, string, string][] = [
    ['server', '🖥️', 'Server Logs'], ['client', '🌐', 'Client Logs'], ['activity', '🎓', 'Student Activity Logs'],
  ];
  const quickChips: [string, string, 'ALL' | Kind][] = [
    ['📡', 'Live Logs', 'ALL'], ['⚠️', 'Error Logs', 'ERROR'], ['🔥', 'Warn Logs', 'WARN'], ['🐞', 'Debug Logs', 'INFO'],
  ];

  return (
    <div className="alogs">
      {/* Breadcrumb */}
      <div className="alogs-crumb">System <span className="sep">/</span> <b>API Logs</b></div>

      {/* Header */}
      <div className="alogs-head">
        <div>
          <h1>API Logs</h1>
          <p>Monitor and track all API requests and system activities in real-time.</p>
        </div>
        <div className="alogs-head-right">
          <div className="alogs-switch" onClick={() => setAutoRefresh(a => !a)}>
            Auto Refresh
            <span className={`alogs-toggle ${autoRefresh ? 'on' : ''}`} />
          </div>
          <div className="alogs-pill">
            <select value={rangePreset} onChange={e => setRangePreset(e.target.value as any)}>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="alogs-pill">📅 {rangeLabel}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="alogs-stats">
        {statCards.map((c, i) => (
          <div className="alogs-stat" key={c.label} style={{ background: c.bg }}>
            <div>
              <div className="alogs-stat-label" style={{ color: c.color }}>{c.label}</div>
              <div className="alogs-stat-value">{c.value}</div>
              <div className="alogs-stat-sub">{c.sub}</div>
            </div>
            <Sparkline color={c.color} seed={sparkSeeds[i]} />
          </div>
        ))}
      </div>

      {/* Log Type + filters */}
      <div className="alogs-card alogs-filtercard hl">
        <div className="alogs-fc-label">Log Type</div>
        <div className="alogs-seg">
          {seg.map(([t, ico, lbl]) => (
            <button key={t} className={logType === t ? 'active' : ''} onClick={() => setLogType(t)}>{ico} {lbl}</button>
          ))}
        </div>
        <div className="alogs-filters">
          <div className="alogs-search">
            <span>🔍</span>
            <input placeholder="Search by email, endpoint, method..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="alogs-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="ALL">All Status</option>
            <option value="ERROR">Error</option>
            <option value="WARN">Warning</option>
            <option value="SUCCESS">Success</option>
            <option value="INFO">Info</option>
          </select>
          <select className="alogs-select" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
            <option value="">All Methods</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="alogs-select" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            {moduleOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="alogs-select" value={userFilter} onChange={e => setUserFilter(e.target.value)} disabled={userOptions.length === 0}>
            <option value="">All Users</option>
            {userOptions.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <button className="alogs-ghost" onClick={() => setRangePreset(p => p === 'all' ? '7d' : 'all')}>📅 {rangePreset === 'all' ? 'Set Range' : 'Custom Range'}</button>
          <button className="alogs-ghost" onClick={clearFilters}>↺ Clear Filters</button>
        </div>
      </div>

      {/* Action bar */}
      <div className="alogs-actionbar">
        <div className="alogs-actiongrp">
          {quickChips.map(([ico, lbl, k]) => (
            <button key={lbl} className={`alogs-chip ${statusFilter === k ? (k === 'ERROR' ? 'active b-error' : k === 'WARN' ? 'active b-warn' : k === 'INFO' ? 'active b-info' : 'solid-indigo') : ''}`}
              style={statusFilter === k && k === 'ERROR' ? { background: '#dc2626' } : statusFilter === k && k === 'WARN' ? { background: '#d97706' } : statusFilter === k && k === 'INFO' ? { background: '#2563eb' } : undefined}
              onClick={() => setStatusFilter(k)}>{ico} {lbl}</button>
          ))}
        </div>
        <div className="alogs-actiongrp">
          <button className="alogs-chip" onClick={exportLogs}>⬇️ Export Logs</button>
          <button className="alogs-chip" onClick={refreshNow} disabled={loading}>{loading ? '⏳' : '⚙️'} Refresh</button>
          <button className={`alogs-chip ${autoRefresh ? 'solid-indigo' : ''}`} onClick={() => setAutoRefresh(a => !a)}>📈 Request Monitor</button>
        </div>
      </div>

      {/* Body: table + details */}
      <div className="alogs-body">
        <div className="alogs-card alogs-main">
          <div className="alogs-main-head">
            <h3>{logType === 'server' ? 'Live Logs' : logType === 'client' ? 'Client Errors' : 'Student Activity'}</h3>
            <span className="alogs-live">Showing {filtered.length === 0 ? 'no' : `${startIdx}–${endIdx} of ${filtered.length}`} logs</span>
          </div>
          <div className="alogs-tablewrap">
            <table className="alogs-table">
              <thead>
                <tr>
                  <th>Time</th><th>Status</th><th>Method</th><th>Endpoint / URL</th>
                  <th>User</th><th>Module</th><th>Response</th><th>IP Address</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={9}>
                    <div className="alogs-empty">
                      <div className="ico">{loading ? '⏳' : '📭'}</div>
                      {loading ? 'Loading logs…' : 'No log entries match the current filters.'}
                    </div>
                  </td></tr>
                ) : pageRows.map(r => {
                  const t = fmtTime(r.ts);
                  return (
                    <tr key={r.id} className={selected?.id === r.id ? 'sel' : ''} onClick={() => setSelected(r)}>
                      <td><div className="alogs-time">{t.date}<small>{t.time}</small></div></td>
                      <td><span className={`alogs-badge ${kindClass[r.kind]}`}>{kindLabel[r.kind]}</span></td>
                      <td>{r.method ? <span className={`alogs-badge ${methodClass(r.method)}`}>{r.method}</span> : <span className="alogs-ip">—</span>}</td>
                      <td><div className="alogs-endpoint" title={r.endpoint || r.message}>{r.endpoint || r.message || '—'}</div></td>
                      <td style={{ fontSize: 12 }}>{r.user || '—'}</td>
                      <td>{r.module ? <span className="alogs-module">{r.module}</span> : '—'}</td>
                      <td className={rtClass(r.ms)}>{r.ms != null ? `${r.ms} ms` : '—'}</td>
                      <td className="alogs-ip">{r.ip || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="alogs-rowbtn" title="View details" onClick={() => setSelected(r)}>👁️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="alogs-tablefoot">
              <span className="muted">Showing {startIdx} to {endIdx} of {filtered.length} results</span>
              <div className="alogs-pager">
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
                {Array.from({ length: totalPages }).slice(0, 6).map((_, i) => (
                  <button key={i} className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
              </div>
              <span className="muted">Rows per page
                <select className="alogs-select" style={{ minWidth: 64, marginLeft: 8, padding: '5px 8px' }} value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
            </div>
          )}
        </div>

        {/* Log Details */}
        <div className="alogs-card alogs-detail">
          <h3>Log Details</h3>
          {!selected ? (
            <div className="alogs-detail-empty">
              <div className="ico">🔎</div>
              <b>Select a log from the list</b>
              <span>Click any log entry to see detailed information including request payload, response, headers and more.</span>
            </div>
          ) : (
            <>
              <div className="alogs-dl">
                <div className="alogs-dl-row"><span className="k">Status</span><span className="v"><span className={`alogs-badge ${kindClass[selected.kind]}`}>{kindLabel[selected.kind]}{selected.status ? ` · ${selected.status}` : ''}</span></span></div>
                <div className="alogs-dl-row"><span className="k">Time</span><span className="v">{fmtTime(selected.ts).date} {fmtTime(selected.ts).time}</span></div>
                {selected.method && <div className="alogs-dl-row"><span className="k">Method</span><span className="v">{selected.method}</span></div>}
                {selected.endpoint && <div className="alogs-dl-row"><span className="k">Endpoint</span><span className="v">{selected.endpoint}</span></div>}
                {selected.user && selected.user !== '—' && <div className="alogs-dl-row"><span className="k">User</span><span className="v">{selected.user}</span></div>}
                {selected.module && <div className="alogs-dl-row"><span className="k">Module</span><span className="v">{selected.module}</span></div>}
                {selected.ms != null && <div className="alogs-dl-row"><span className="k">Response Time</span><span className="v">{selected.ms} ms</span></div>}
                {selected.ip && selected.ip !== '—' && <div className="alogs-dl-row"><span className="k">IP Address</span><span className="v">{selected.ip}</span></div>}
              </div>
              {selected.detail.error && (
                <div className="alogs-code"><div className="lbl">Error</div><pre style={{ background: '#450a0a', color: '#fecaca' }}>{String(selected.detail.error)}</pre></div>
              )}
              {selected.detail.request && (
                <div className="alogs-code"><div className="lbl">Request Payload</div><pre>{JSON.stringify(selected.detail.request, null, 2)}</pre></div>
              )}
              {selected.detail.response && (
                <div className="alogs-code"><div className="lbl">Response</div><pre>{JSON.stringify(selected.detail.response, null, 2)}</pre></div>
              )}
              {selected.detail.meta && (
                <div className="alogs-code"><div className="lbl">Meta</div><pre>{JSON.stringify(selected.detail.meta, null, 2)}</pre></div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
