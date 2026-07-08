import React, { useEffect, useState } from 'react';
import { resourceApi, Resource, fmtSize } from '../../api/resourceApi';

const PURPLE = '#6366f1', TEAL = '#14a89c';
const TYPE_ICON: Record<string, string> = { project: '🚀', document: '📄', template: '🧩', dataset: '📊' };

const ResourceLibrary: React.FC = () => {
  const [items, setItems] = useState<Resource[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');

  const load = async () => {
    try { const d = await resourceApi.list(); setItems(d.resources); setActiveProjectId(d.activeProjectId); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const request = async (r: Resource) => {
    const note = window.prompt('Add a short note for the admin (optional):', '') ?? '';
    setBusy(r._id);
    try { await resourceApi.requestAccess(r._id, note); await load(); }
    catch (e: any) { alert(e?.response?.data?.message || 'Could not send request.'); } finally { setBusy(''); }
  };
  const download = async (r: Resource, fileId: string, name: string) => {
    setBusy(r._id + fileId);
    try { await resourceApi.download(r._id, fileId, name); }
    catch (e: any) { alert(e.message || 'Download failed.'); } finally { setBusy(''); }
  };

  const filtered = items.filter(r =>
    (!type || r.resourceType === type) &&
    (!q || (r.title + ' ' + (r.tags || []).join(' ') + ' ' + (r.techStack || []).join(' ')).toLowerCase().includes(q.toLowerCase())));

  const badge = (r: Resource) => {
    const map: any = {
      approved: { t: 'Approved', c: '#16a34a', bg: '#e7f6ec' },
      requested: { t: 'Requested — pending', c: '#b45309', bg: '#fef3c7' },
      rejected: { t: 'Request declined', c: '#b91c1c', bg: '#fee2e2' },
    };
    const m = map[r.access || ''];
    return m ? <span style={{ fontSize: 11, fontWeight: 700, color: m.c, background: m.bg, borderRadius: 999, padding: '2px 9px' }}>{m.t}</span> : null;
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: 22 }}>
      <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>📚 Project Library</h1>
      <p style={{ marginTop: 4, color: '#64748b', fontSize: 13.5 }}>Download starter projects, templates and docs shared by your mentors.</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects, tech…" style={{ flex: 1, minWidth: 220, border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', fontSize: 14 }} />
        <select value={type} onChange={e => setType(e.target.value)} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
          <option value="">All types</option><option value="project">Projects</option><option value="document">Documents</option><option value="template">Templates</option><option value="dataset">Datasets</option>
        </select>
      </div>

      {loading ? <div style={{ color: '#94a3b8', padding: 30 }}>Loading…</div>
        : filtered.length === 0 ? <div style={{ color: '#94a3b8', padding: 30 }}>No resources available yet.</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {filtered.map(r => (
                <div key={r._id} style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{TYPE_ICON[r.resourceType] || '📁'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{r.title}</div>
                      {r.difficulty && <div style={{ fontSize: 11.5, color: '#94a3b8', textTransform: 'capitalize' }}>{r.difficulty}{r.targetRole ? ` · ${r.targetRole}` : ''}</div>}
                    </div>
                    {badge(r)}
                  </div>
                  {r.description && <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{r.description.slice(0, 160)}</div>}
                  {!!r.techStack?.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{r.techStack.slice(0, 6).map((t, i) => <span key={i} style={{ fontSize: 11, background: '#eef0fe', color: '#4338ca', borderRadius: 6, padding: '2px 8px' }}>{t}</span>)}</div>}

                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    {(r.access === 'open' || r.access === 'approved') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {r.files.map(f => (
                          <button key={f.fileId} onClick={() => download(r, f.fileId, f.fileName)} disabled={busy === r._id + f.fileId}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                            ⬇ {busy === r._id + f.fileId ? 'Downloading…' : f.fileName} <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 500 }}>{fmtSize(f.sizeBytes)}</span>
                          </button>
                        ))}
                      </div>
                    ) : r.access === 'requested' ? (
                      <button disabled style={{ width: '100%', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 13.5 }}>⏳ Awaiting admin approval</button>
                    ) : (activeProjectId && activeProjectId !== r._id) ? (
                      <button disabled title="You can only have one project at a time"
                        style={{ width: '100%', background: '#f8fafc', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: 10, padding: '11px', fontWeight: 600, fontSize: 12.5 }}>
                        🔒 One project at a time
                      </button>
                    ) : (
                      <button onClick={() => request(r)} disabled={busy === r._id}
                        style={{ width: '100%', background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                        {busy === r._id ? 'Sending…' : r.access === 'rejected' ? '↻ Request again' : '🔒 Request access'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
};

export default ResourceLibrary;
