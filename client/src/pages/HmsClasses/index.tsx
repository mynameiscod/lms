import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hmsClassApi, HmsClass } from '../../api';

const HOST_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'];

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  live: '#16a34a',
  ended: '#6b7280',
  cancelled: '#dc2626',
};

const fmt = (d: string) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const HmsClassesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHost = HOST_ROLES.includes(user?.role || '');

  const [items, setItems] = useState<HmsClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title: '', description: '', mode: 'hybrid', scheduledAt: '', durationMin: 60, instructorName: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await hmsClassApi.list();
      if (res.success) setItems(res.data || []);
    } catch (e: any) {
      setMsg(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.scheduledAt) { setMsg('Title and date/time are required'); return; }
    setBusy('create');
    try {
      const res: any = await hmsClassApi.create(form);
      if (res.success) { setShowCreate(false); setForm({ title: '', description: '', mode: 'hybrid', scheduledAt: '', durationMin: 60, instructorName: '' }); load(); }
      else setMsg(res.message || 'Failed');
    } catch (e: any) { setMsg(e.message || 'Failed'); } finally { setBusy(''); }
  };

  const start = async (id: string) => {
    setBusy(id);
    try {
      const res: any = await hmsClassApi.start(id);
      if (res.success) navigate(`/hms-classes/${id}/room`);
      else setMsg(res.message || 'Could not start');
    } catch (e: any) { setMsg(e.message || 'Could not start'); } finally { setBusy(''); }
  };

  const end = async (id: string) => {
    setBusy(id);
    try { await hmsClassApi.end(id); load(); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this class?')) return;
    setBusy(id);
    try { await hmsClassApi.remove(id); load(); } catch (e: any) { setMsg(e.message); } finally { setBusy(''); }
  };

  const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const input: React.CSSProperties = { padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>🎥 Live Classes</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            {isHost ? 'Host hybrid classes — students join live and can be brought on stage.' : 'Join your live classes here.'}
          </p>
        </div>
        {isHost && (
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '10px 18px', background: '#1a5490', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Schedule Class
          </button>
        )}
      </div>

      {msg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
          {msg} <button onClick={() => setMsg('')} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, border: '2px dashed #e5e7eb', borderRadius: 12, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No live classes yet</p>
          {isHost && <p style={{ margin: '4px 0 0', fontSize: 14 }}>Click “Schedule Class” to create one.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {items.map(c => (
            <div key={c._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{c.title}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[c.status]}20`, color: STATUS_COLORS[c.status] }}>
                    {c.status === 'live' ? '🔴 LIVE' : c.status.toUpperCase()}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#f3f4f6', color: '#374151' }}>{label(c.mode)}</span>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
                  <span>⏰ {fmt(c.scheduledAt)} · {c.durationMin} min</span>
                  <span>👤 {c.instructorName}</span>
                  {c.recordingReady && <span>🎞 Recording ready</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {c.status === 'live' && (
                  <button onClick={() => navigate(`/hms-classes/${c._id}/room`)}
                    style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {isHost ? 'Rejoin' : 'Join Live'}
                  </button>
                )}
                {isHost && c.status === 'scheduled' && (
                  <button disabled={busy === c._id} onClick={() => start(c._id)}
                    style={{ padding: '8px 16px', background: '#1a5490', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {busy === c._id ? 'Starting…' : '▶ Start'}
                  </button>
                )}
                {isHost && c.status === 'live' && (
                  <button disabled={busy === c._id} onClick={() => end(c._id)}
                    style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    End
                  </button>
                )}
                {isHost && c.status !== 'live' && (
                  <button disabled={busy === c._id} onClick={() => remove(c._id)}
                    style={{ padding: '8px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <form onSubmit={create} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Schedule Live Class</h3>
            <div>
              <label style={lbl}>Title *</label>
              <input style={input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Java Full Stack — Day 12" />
            </div>
            <div>
              <label style={lbl}>Description</label>
              <input style={input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Topics covered…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Date & Time *</label>
                <input style={input} type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Duration (min)</label>
                <input style={input} type="number" min={5} value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: +e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Mode</label>
                <select style={input} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid (offline + online)</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Instructor Name</label>
                <input style={input} value={form.instructorName} onChange={e => setForm(f => ({ ...f, instructorName: e.target.value }))} placeholder={user?.email} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '9px 16px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button type="submit" disabled={busy === 'create'} style={{ padding: '9px 18px', background: '#1a5490', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {busy === 'create' ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default HmsClassesPage;
