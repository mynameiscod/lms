import React, { useEffect, useState } from 'react';
import { jobApplicationApi, JobApplication, JobStatus, JOB_STATUSES } from '../../api/jobApplicationApi';

const PURPLE = '#6366f1';
const emptyApp = (): Partial<JobApplication> => ({
  company: '', role: '', location: '', workMode: '', jobUrl: '', salary: '',
  source: '', status: 'wishlist', contactName: '', contactEmail: '', nextAction: '', nextActionAt: '', notes: '',
});

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
const isOverdue = (d?: string) => !!d && new Date(d).getTime() < Date.now();

const JobTracker: React.FC = () => {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<JobApplication> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<JobStatus | null>(null);

  const load = async () => {
    try {
      const data = await jobApplicationApi.list();
      setApps(data.applications || []);
      setStats(data.stats || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.company?.trim() || !editing.role?.trim()) { alert('Company and role are required.'); return; }
    setSaving(true);
    try {
      if (editing._id) {
        const { _id, status, order, createdAt, updatedAt, ...patch } = editing as any;
        await jobApplicationApi.update(editing._id, patch);
      } else {
        await jobApplicationApi.create(editing);
      }
      setEditing(null);
      await load();
    } catch { alert('Could not save. Try again.'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this application?')) return;
    await jobApplicationApi.remove(id);
    setEditing(null);
    setApps(a => a.filter(x => x._id !== id));
  };

  const onDrop = async (status: JobStatus) => {
    setDragOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const app = apps.find(a => a._id === id);
    if (!app || app.status === status) return;
    // Optimistic move
    setApps(prev => prev.map(a => a._id === id ? { ...a, status } : a));
    try { await jobApplicationApi.move(id, status); await load(); }
    catch { load(); }
  };

  const colApps = (s: JobStatus) => apps.filter(a => a.status === s);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>🎯 Job Tracker</h1>
        <div style={{ flex: 1 }} />
        <button onClick={() => setEditing(emptyApp())}
          style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Add application
        </button>
      </div>
      <p style={{ marginTop: 0, color: '#64748b', fontSize: 13.5 }}>
        Track every application from wishlist to offer. Drag a card between columns as things progress.
      </p>

      {loading ? (
        <div style={{ padding: 40, color: '#94a3b8' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${JOB_STATUSES.length}, minmax(220px, 1fr))`, gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {JOB_STATUSES.map(col => (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(o => (o === col.key ? null : o))}
              onDrop={() => onDrop(col.key)}
              style={{ background: dragOver === col.key ? '#eef2ff' : '#f8fafc', border: `1px solid ${dragOver === col.key ? col.color : '#e2e8f0'}`, borderRadius: 12, padding: 10, minHeight: 200, transition: 'background 0.12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '2px 4px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{col.label}</span>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{stats[col.key] ?? colApps(col.key).length}</span>
              </div>

              {colApps(col.key).map(a => (
                <div key={a._id}
                  draggable
                  onDragStart={() => setDragId(a._id!)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => setEditing({ ...a, appliedAt: a.appliedAt?.slice(0, 10), nextActionAt: a.nextActionAt?.slice(0, 10) })}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 11, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', opacity: dragId === a._id ? 0.5 : 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>{a.role}</div>
                  <div style={{ fontSize: 12.5, color: '#475569', marginTop: 1 }}>{a.company}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {a.location && <span style={pill('#f1f5f9', '#475569')}>📍 {a.location}</span>}
                    {a.workMode && <span style={pill('#f1f5f9', '#475569')}>{a.workMode}</span>}
                    {a.salary && <span style={pill('#f0fdf4', '#15803d')}>{a.salary}</span>}
                  </div>
                  {a.nextAction && (
                    <div style={{ marginTop: 8, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5, color: isOverdue(a.nextActionAt) ? '#b91c1c' : '#64748b' }}>
                      <span>⏰</span>
                      <span style={{ fontWeight: 600 }}>{a.nextAction}</span>
                      {a.nextActionAt && <span>· {fmtDate(a.nextActionAt)}</span>}
                    </div>
                  )}
                </div>
              ))}

              {colApps(col.key).length === 0 && (
                <div style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '18px 6px' }}>
                  {col.key === 'wishlist' ? 'Add roles you want to apply to' : 'Drop cards here'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => !saving && setEditing(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: 'min(560px, 100%)', margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 20px', background: PURPLE, color: '#fff' }}>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>{editing._id ? 'Edit application' : 'Add application'}</div>
              <button onClick={() => !saving && setEditing(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 12 }}>
              <div style={row2}>
                {field('Company *', <input style={inp} value={editing.company || ''} onChange={e => setEditing({ ...editing, company: e.target.value })} />)}
                {field('Role *', <input style={inp} value={editing.role || ''} onChange={e => setEditing({ ...editing, role: e.target.value })} />)}
              </div>
              <div style={row2}>
                {field('Location', <input style={inp} value={editing.location || ''} onChange={e => setEditing({ ...editing, location: e.target.value })} />)}
                {field('Work mode', (
                  <select style={inp} value={editing.workMode || ''} onChange={e => setEditing({ ...editing, workMode: e.target.value as any })}>
                    <option value="">—</option><option value="onsite">Onsite</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option>
                  </select>
                ))}
              </div>
              <div style={row2}>
                {field('Status', (
                  <select style={inp} value={editing.status || 'wishlist'} onChange={e => setEditing({ ...editing, status: e.target.value as JobStatus })}>
                    {JOB_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                ))}
                {field('Salary', <input style={inp} placeholder="e.g. ₹8–12 LPA" value={editing.salary || ''} onChange={e => setEditing({ ...editing, salary: e.target.value })} />)}
              </div>
              <div style={row2}>
                {field('Source', <input style={inp} placeholder="LinkedIn / Referral / Naukri" value={editing.source || ''} onChange={e => setEditing({ ...editing, source: e.target.value })} />)}
                {field('Applied on', <input type="date" style={inp} value={(editing.appliedAt as string) || ''} onChange={e => setEditing({ ...editing, appliedAt: e.target.value })} />)}
              </div>
              {field('Job URL', <input style={inp} placeholder="https://…" value={editing.jobUrl || ''} onChange={e => setEditing({ ...editing, jobUrl: e.target.value })} />)}
              <div style={row2}>
                {field('Contact name', <input style={inp} value={editing.contactName || ''} onChange={e => setEditing({ ...editing, contactName: e.target.value })} />)}
                {field('Contact email', <input style={inp} value={editing.contactEmail || ''} onChange={e => setEditing({ ...editing, contactEmail: e.target.value })} />)}
              </div>
              <div style={row2}>
                {field('Next action', <input style={inp} placeholder="e.g. Follow up with recruiter" value={editing.nextAction || ''} onChange={e => setEditing({ ...editing, nextAction: e.target.value })} />)}
                {field('Next action date', <input type="date" style={inp} value={(editing.nextActionAt as string) || ''} onChange={e => setEditing({ ...editing, nextActionAt: e.target.value })} />)}
              </div>
              {field('Notes', <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />)}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <button onClick={save} disabled={saving}
                  style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : editing._id ? 'Save changes' : 'Add application'}
                </button>
                {editing.jobUrl && <a href={editing.jobUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: PURPLE, fontWeight: 600 }}>Open job ↗</a>}
                <div style={{ flex: 1 }} />
                {editing._id && <button onClick={() => remove(editing._id!)} style={{ background: 'transparent', color: '#dc2626', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Delete</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const pill = (bg: string, color: string): React.CSSProperties => ({ background: bg, color, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 600 });
const inp: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box' };
const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const field = (label: string, control: React.ReactNode) => (
  <label style={{ display: 'block' }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</span>
    {control}
  </label>
);

export default JobTracker;
