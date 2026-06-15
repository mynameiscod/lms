import React, { useEffect, useState, useCallback } from 'react';
import { recordingLogApi } from '../../api/recordingLogApi';

const STATUS_COLOR: Record<string, string> = {
  started: '#6b7280', permission_ok: '#6b7280', recording: '#2563eb', recorded: '#7c3aed',
  saving: '#f59e0b', uploading: '#f59e0b', uploaded: '#0891b2', saved: '#10b981',
  failed: '#ef4444', abandoned: '#b45309', discarded: '#9ca3af',
};

const EVENT_COLOR = (t: string) => /error|denied|fail|unload/.test(t) ? '#ef4444'
  : /success|ok|saved/.test(t) ? '#10b981'
  : /started|start|recording/.test(t) ? '#2563eb' : '#475569';

const userName = (u: any) => !u ? '—' : (u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—');
const fmtBytes = (b?: number) => b == null ? '—' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
const fmtDur = (s?: number) => s == null ? '—' : `${Math.floor(s / 60)}m ${s % 60}s`;

const RecordingDiagnostics: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await recordingLogApi.list({ source: source || undefined, status: status || undefined, limit: 100 });
      setLogs(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [source, status]);

  useEffect(() => { load(); }, [load]);

  const openTimeline = async (sessionId: string) => {
    if (openId === sessionId) { setOpenId(null); setDetail(null); return; }
    setOpenId(sessionId); setDetail(null);
    try { const res = await recordingLogApi.get(sessionId); setDetail(res.data); } catch (e) { console.error(e); }
  };

  const badge = (s: string) => (
    <span style={{ background: (STATUS_COLOR[s] || '#6b7280') + '22', color: STATUS_COLOR[s] || '#6b7280', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{s}</span>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>🎥 Recording Diagnostics</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 16px' }}>End-to-end timeline of every recording session — see exactly where a class recording or interview video succeeded or failed.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={source} onChange={e => setSource(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
          <option value="">All sources</option>
          <option value="class_recording">Class recording</option>
          <option value="interview">Interview</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
          <option value="">All statuses</option>
          {['recording', 'recorded', 'uploading', 'uploaded', 'saved', 'failed', 'abandoned', 'discarded'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={load} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {loading ? <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading…</div> :
        logs.length === 0 ? <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>No recording sessions yet.</div> : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            {logs.map(l => (
              <div key={l.sessionId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div onClick={() => openTimeline(l.sessionId)} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px 90px 90px 150px 24px', gap: 10, alignItems: 'center', padding: '12px 16px', cursor: 'pointer', background: openId === l.sessionId ? '#f8fafc' : '#fff' }}>
                  <div>{badge(l.status)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{userName(l.userId)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{l.source === 'interview' ? 'Interview' : 'Class'} · {l.mode || '—'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(l.startedAt || l.createdAt).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{fmtDur(l.durationSec)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{fmtBytes(l.sizeBytes)}</div>
                  <div style={{ fontSize: 12, color: l.error ? '#ef4444' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.error || ''}>{l.error || (l.uploadPct != null ? `${l.uploadPct}% uploaded` : '')}</div>
                  <div style={{ color: '#94a3b8' }}>{openId === l.sessionId ? '▲' : '▼'}</div>
                </div>

                {openId === l.sessionId && (
                  <div style={{ padding: '8px 16px 18px 40px', background: '#f8fafc' }}>
                    {!detail ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading timeline…</div> : (
                      <>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                          session {detail.sessionId} · bunnyVideoId {detail.bunnyVideoId || '—'} · contentId {detail.contentId || '—'}
                        </div>
                        <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: 14 }}>
                          {(detail.events || []).map((ev: any, i: number) => (
                            <div key={i} style={{ marginBottom: 8, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: -19, top: 4, width: 8, height: 8, borderRadius: '50%', background: EVENT_COLOR(ev.type) }} />
                              <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>{new Date(ev.ts).toLocaleTimeString()}</span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: EVENT_COLOR(ev.type) }}>{ev.type}</span>
                              {ev.message && <span style={{ fontSize: 13, color: '#475569' }}> — {ev.message}</span>}
                              {ev.data && Object.keys(ev.data).length > 0 && (
                                <span style={{ fontSize: 12, color: '#94a3b8' }}> {Object.entries(ev.data).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default RecordingDiagnostics;
