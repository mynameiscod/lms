import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getClientErrors, clearClientErrors, subscribeClientErrors, ClientError } from '../../utils/errorStore';

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

interface ServerLine {
  raw: string;
  level: 'ERROR' | 'WARN' | 'INFO';
}

function parseLevel(line: string): 'ERROR' | 'WARN' | 'INFO' {
  if (line.includes('[ERROR]')) return 'ERROR';
  if (line.includes('[WARN]'))  return 'WARN';
  return 'INFO';
}

function levelColor(level: 'ERROR' | 'WARN' | 'INFO') {
  return level === 'ERROR' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : '#22c55e';
}

const AdminLogPanel: React.FC = () => {
  const [open, setOpen]           = useState(false);
  const [tab, setTab]             = useState<'client' | 'server'>('client');
  const [serverLines, setServer]  = useState<ServerLine[]>([]);
  const [serverType, setServerType] = useState<'errors' | 'all'>('errors');
  const [loading, setLoading]     = useState(false);
  const [clientErrors, setClient] = useState<ClientError[]>(getClientErrors());
  const [unread, setUnread]       = useState(0);
  const prevCount                 = useRef(0);

  // Subscribe to client errors
  useEffect(() => {
    const unsub = subscribeClientErrors(() => {
      const errs = getClientErrors();
      setClient(errs);
      if (!open) setUnread(u => u + (errs.length - prevCount.current));
      prevCount.current = errs.length;
    });
    return unsub;
  }, [open]);

  // Reset unread when panel opens
  useEffect(() => {
    if (open) { setUnread(0); prevCount.current = getClientErrors().length; }
  }, [open]);

  const fetchServerLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token    = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const res = await fetch(`${API_BASE}/admin/logs?type=${serverType}&lines=200`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId || '',
        },
      });
      const data = await res.json();
      const lines: ServerLine[] = (data.lines || []).map((l: string) => ({ raw: l, level: parseLevel(l) }));
      setServer(lines);
    } catch (e: any) {
      setServer([{ raw: `Failed to fetch logs: ${e.message}`, level: 'ERROR' }]);
    } finally {
      setLoading(false);
    }
  }, [serverType]);

  useEffect(() => {
    if (open && tab === 'server') fetchServerLogs();
  }, [open, tab, serverType, fetchServerLogs]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="API Error Logs"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9000,
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: unread > 0 ? '#ef4444' : '#1e3a5f',
          color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {unread > 0 ? <span style={{ fontSize: 13, fontWeight: 800 }}>{unread > 9 ? '9+' : unread}</span> : '🪲'}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 78, right: 20, zIndex: 9000,
          width: 'min(680px, calc(100vw - 40px))', height: 'min(520px, calc(100vh - 120px))',
          background: '#0f172a', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #1e293b',
        }}>
          {/* Header */}
          <div style={{ background: '#1e293b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #334155', flexShrink: 0 }}>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14, flex: 1 }}>🪲 API Logs</span>

            {/* Tabs */}
            {(['client', 'server'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? '#3b82f6' : 'transparent',
                color: tab === t ? '#fff' : '#94a3b8',
                border: '1px solid ' + (tab === t ? '#3b82f6' : '#334155'),
                borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
              }}>{t}</button>
            ))}

            {tab === 'server' && (
              <>
                <select value={serverType} onChange={e => setServerType(e.target.value as any)}
                  style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                  <option value="errors">Errors only</option>
                  <option value="all">All requests</option>
                </select>
                <button onClick={fetchServerLogs} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                  {loading ? '…' : '↻'}
                </button>
              </>
            )}

            {tab === 'client' && clientErrors.length > 0 && (
              <button onClick={() => { clearClientErrors(); setClient([]); }} style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                Clear
              </button>
            )}

            <button onClick={() => setOpen(false)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
            {tab === 'client' ? (
              clientErrors.length === 0
                ? <div style={{ color: '#475569', padding: 20, textAlign: 'center', fontSize: 13 }}>No client-side API errors recorded.</div>
                : clientErrors.map((e, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #1e293b', padding: '8px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                    <span style={{ color: '#64748b', marginRight: 8 }}>{e.ts.replace('T', ' ').slice(0, 19)}</span>
                    <span style={{ color: e.status >= 500 ? '#ef4444' : '#f59e0b', fontWeight: 700, marginRight: 8 }}>{e.status}</span>
                    <span style={{ color: '#94a3b8', marginRight: 8 }}>{e.method}</span>
                    <span style={{ color: '#cbd5e1', marginRight: 8 }}>{e.url}</span>
                    <span style={{ color: '#fca5a5' }}>{e.message}</span>
                  </div>
                ))
            ) : (
              loading
                ? <div style={{ color: '#475569', padding: 20, textAlign: 'center', fontSize: 13 }}>Loading…</div>
                : serverLines.length === 0
                  ? <div style={{ color: '#475569', padding: 20, textAlign: 'center', fontSize: 13 }}>No log entries found. Logs are written once APIs are called.</div>
                  : serverLines.map((l, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #1e293b', padding: '6px 14px', fontFamily: 'monospace', fontSize: 11, color: levelColor(l.level), wordBreak: 'break-all', lineHeight: 1.5 }}>
                      {l.raw}
                    </div>
                  ))
            )}
          </div>

          {/* Footer */}
          <div style={{ background: '#1e293b', borderTop: '1px solid #334155', padding: '6px 14px', fontSize: 11, color: '#475569', flexShrink: 0 }}>
            {tab === 'client'
              ? `${clientErrors.length} client error${clientErrors.length !== 1 ? 's' : ''} · refreshes live`
              : `${serverLines.length} lines · VPS file: /app/logs/api-errors.log`}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminLogPanel;
