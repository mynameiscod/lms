import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Live Class — browser-native live classroom via Jitsi (no OBS, no install).
 * Instructors/admins start a class; students join the live room. Camera, mic
 * and screen-share are all native in the embedded Jitsi room.
 */

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';
const JITSI_DOMAIN = 'meet.jit.si';

interface LiveSession { _id: string; title: string; room: string; hostName: string; startedAt: string; }

const authHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
  };
};

// Load the Jitsi external API script once.
let jitsiScriptPromise: Promise<void> | null = null;
const loadJitsi = (): Promise<void> => {
  if ((window as any).JitsiMeetExternalAPI) return Promise.resolve();
  if (jitsiScriptPromise) return jitsiScriptPromise;
  jitsiScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://${JITSI_DOMAIN}/external_api.js`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Jitsi'));
    document.body.appendChild(s);
  });
  return jitsiScriptPromise;
};

export default function LiveClass() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const role: string = user?.role || '';
  const isHost = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'].includes(role);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || (isHost ? 'Instructor' : 'Student');

  const [active, setActive] = useState<LiveSession[]>([]);
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState<string>('');     // currently-joined room
  const [sessionId, setSessionId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const jitsiRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/live-classes/active`, { headers: authHeaders() });
      const data = await res.json();
      setActive(data?.items || []);
    } catch { /* ignore */ }
  }, []);

  // Poll for live classes while not in a room.
  useEffect(() => {
    if (room) return;
    fetchActive();
    const iv = setInterval(fetchActive, 12000);
    return () => clearInterval(iv);
  }, [room, fetchActive]);

  // Mount Jitsi when a room is set.
  useEffect(() => {
    if (!room) return;
    let disposed = false;
    loadJitsi().then(() => {
      if (disposed || !jitsiRef.current) return;
      const api = new (window as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: room,
        parentNode: jitsiRef.current,
        userInfo: { displayName },
        configOverwrite: { startWithAudioMuted: !isHost, startWithVideoMuted: !isHost, prejoinPageEnabled: false, disableDeepLinking: true },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
      });
      apiRef.current = api;
      api.addEventListener('readyToClose', () => leaveRoom());
    }).catch(() => setError('Could not load the live classroom. Check your connection.'));
    return () => { disposed = true; try { apiRef.current?.dispose(); } catch { /* */ } apiRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const startLive = async () => {
    if (!title.trim()) { setError('Enter a class title.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/live-classes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ title: title.trim() }) });
      if (!res.ok) throw new Error((await res.json())?.message || 'Could not start');
      const s = await res.json();
      setSessionId(s._id); setRoom(s.room);
    } catch (e: any) { setError(e?.message || 'Could not start the class.'); }
    finally { setBusy(false); }
  };

  const joinRoom = (s: LiveSession) => { setSessionId(''); setRoom(s.room); };

  const leaveRoom = () => {
    try { apiRef.current?.dispose(); } catch { /* */ }
    apiRef.current = null;
    setRoom('');
    fetchActive();
  };

  const endClass = async () => {
    if (sessionId) { try { await fetch(`${API_BASE}/live-classes/${sessionId}/end`, { method: 'POST', headers: authHeaders() }); } catch { /* */ } }
    leaveRoom();
  };

  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' });
  const ghost: React.CSSProperties = { background: '#fff', color: '#0f172a', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };

  // ── In a room ──
  if (room) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>🟢 Live Class</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={ghost} onClick={leaveRoom}>Leave</button>
            {isHost && sessionId && <button style={btn('#dc2626')} onClick={endClass}>End class for everyone</button>}
          </div>
        </div>
        <div ref={jitsiRef} style={{ width: '100%', height: '78vh', borderRadius: 12, overflow: 'hidden', background: '#000' }} />
        {error && <div style={{ color: '#dc2626', marginTop: 10 }}>{error}</div>}
      </div>
    );
  }

  // ── Lobby ──
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a' }}>🎥 Live Class</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Browser-based live classroom — camera, mic and screen share, no install.</p>
        </div>
        <button style={ghost} onClick={() => navigate('/dashboard')}>← Back</button>
      </div>

      {error && <div style={{ background: '#fdecec', border: '1px solid #f3c9c9', color: '#b3261e', padding: '10px 14px', borderRadius: 10, margin: '12px 0', fontSize: 14 }}>{error}</div>}

      {isHost && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, margin: '14px 0' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>Start a live class</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Class title (e.g. Java — Day 12: Spring Boot)"
              style={{ flex: 1, minWidth: 220, border: '1px solid #cbd5e1', borderRadius: 8, padding: '11px 13px', fontSize: 14 }} />
            <button style={{ ...btn('#16a34a'), opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={startLive}>{busy ? 'Starting…' : '🟢 Go Live'}</button>
          </div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 8 }}>Students will see it appear below and can join. Use the in-room “Share screen” button to show slides/code.</div>
        </div>
      )}

      <div style={{ fontWeight: 700, color: '#0f172a', margin: '18px 0 10px' }}>Live now</div>
      {active.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 12, padding: 24, textAlign: 'center', color: '#64748b' }}>
          No live class right now. {isHost ? 'Start one above.' : 'Check back when your trainer goes live.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {active.map(s => (
            <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.title}</div>
                <div style={{ fontSize: 12.5, color: '#64748b' }}>Host: {s.hostName} · started {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <button style={btn('#0a66c2')} onClick={() => joinRoom(s)}>Join →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
