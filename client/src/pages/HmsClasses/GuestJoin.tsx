import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { liveGuestApi } from '../../api';
import { GuestRoom } from './Room';

/**
 * /live/<token> — the personal link in a live-class invitation. Works without an LMS account:
 * the guest sees the class, gives their name, and joins when the host has started. Until then the
 * page checks every 20 seconds, so it can be opened early and left open.
 */

interface Info { title: string; description: string; scheduledAt: string; durationMin: number; instructorName: string; status: string; inviteeName: string }

const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const GuestJoin: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r: any = await liveGuestApi.info(token);
        if (stop) return;
        if (!r.success) { setErr(r.message || 'This invitation link is not valid.'); return; }
        setInfo(r.data);
        setName((n) => n || r.data.inviteeName || '');
      } catch { if (!stop) setErr('Could not load the class. Check your connection and refresh.'); }
    };
    load();
    const t = setInterval(() => { if (!joined) load(); }, 20_000);
    return () => { stop = true; clearInterval(t); };
  }, [token, joined]);

  if (joined && info) return <GuestRoom token={token} name={name.trim() || 'Guest'} exitTo={`/live/${token}`} />;

  const live = info?.status === 'live';
  const ended = info?.status === 'ended';

  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', color: '#fff', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#111827', borderRadius: 16, padding: 24 }}>
        {err ? (
          <p style={{ margin: 0, fontSize: 15 }}>⚠ {err}</p>
        ) : !info ? (
          <p style={{ margin: 0, color: '#9ca3af' }}>Loading…</p>
        ) : (
          <>
            <div style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', color: live ? '#4ade80' : '#9ca3af', fontWeight: 700 }}>
              {live ? '● Live now' : ended ? 'Ended' : 'Live class'}
            </div>
            <h1 style={{ fontSize: 22, margin: '6px 0 4px' }}>{info.title}</h1>
            <p style={{ color: '#9ca3af', margin: '0 0 4px', fontSize: 14 }}>{fmt(info.scheduledAt)} · {info.durationMin} min{info.instructorName ? ` · with ${info.instructorName}` : ''}</p>
            {info.description && <p style={{ color: '#cbd5e1', fontSize: 14 }}>{info.description}</p>}

            {ended ? (
              <p style={{ color: '#cbd5e1', marginTop: 16 }}>This class has ended.</p>
            ) : (
              <>
                <label htmlFor="guest-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, margin: '18px 0 6px' }}>Your name</label>
                <input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Shown to the host and others in the class"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#0b1220', border: '1px solid #334155', borderRadius: 8, color: '#fff', padding: '10px 12px', fontSize: 14 }} />
                <button onClick={() => setJoined(true)} disabled={!live || !name.trim()}
                  style={{ width: '100%', marginTop: 14, padding: '12px 0', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 8, cursor: live && name.trim() ? 'pointer' : 'not-allowed', background: live ? '#16a34a' : '#374151', color: '#fff' }}>
                  {live ? 'Join the class' : 'Waiting for the host to start…'}
                </button>
                {!live && <p style={{ color: '#9ca3af', fontSize: 12.5, marginTop: 10 }}>Keep this page open; the button turns green when the class starts.</p>}
                <p style={{ color: '#6b7280', fontSize: 12, marginTop: 12 }}>Chrome works best, on a laptop or a phone. No app or login is needed.</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GuestJoin;
