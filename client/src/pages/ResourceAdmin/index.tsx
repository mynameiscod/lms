import React, { useEffect, useState } from 'react';
import { resourceApi, Resource, ResourceRequestRow, AuditEvent, fmtSize, VISIBILITY_LABEL } from '../../api/resourceApi';
import { batchApi } from '../../api';

interface Batch { _id: string; name: string; }

const PURPLE = '#6366f1';
const inp: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, boxSizing: 'border-box' };
const field = (label: string, node: React.ReactNode) => <label style={{ display: 'block' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</span>{node}</label>;
const STATUS_C: Record<string, string> = { draft: '#94a3b8', published: '#16a34a', archived: '#b45309', requested: '#b45309', approved: '#16a34a', rejected: '#b91c1c' };

const ResourceAdmin: React.FC = () => {
  const [tab, setTab] = useState<'resources' | 'requests'>('resources');
  const [items, setItems] = useState<Resource[]>([]);
  const [requests, setRequests] = useState<ResourceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<{ title: string; events: AuditEvent[] } | null>(null);
  const [form, setForm] = useState<any>({ title: '', description: '', resourceType: 'project', tags: '', techStack: '', difficulty: '', targetRole: '', visibility: 'portal' });
  const [files, setFiles] = useState<FileList | null>(null);
  const [formBatches, setFormBatches] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [access, setAccess] = useState<{ r: Resource; visibility: string; batchIds: string[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, q, b] = await Promise.all([resourceApi.listAdmin(), resourceApi.listRequests(), batchApi.getBatches().catch(() => [])]);
      setItems(r); setRequests(q);
      setBatches((Array.isArray(b) ? b : (b?.data || b?.batches || [])).map((x: any) => ({ _id: x._id, name: x.name })));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const batchName = (id: string) => batches.find(b => b._id === id)?.name || 'batch';

  const submit = async () => {
    if (!form.title.trim()) return alert('Title is required.');
    if (!files || !files.length) return alert('Attach at least one file.');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v ?? '')));
      fd.append('batchIds', formBatches.join(','));
      Array.from(files).forEach(f => fd.append('files', f));
      await resourceApi.create(fd);
      setShowForm(false); setForm({ title: '', description: '', resourceType: 'project', tags: '', techStack: '', difficulty: '', targetRole: '', visibility: 'portal' }); setFiles(null); setFormBatches([]);
      await load();
    } catch (e: any) { alert(e?.response?.data?.message || 'Upload failed.'); } finally { setSaving(false); }
  };

  const setStatus = async (r: Resource, status: string) => { await resourceApi.update(r._id, { status }); await load(); };
  const setVis = async (r: Resource, visibility: string) => { await resourceApi.update(r._id, { visibility }); await load(); };
  const del = async (r: Resource) => { if (window.confirm(`Delete "${r.title}" and its files?`)) { await resourceApi.remove(r._id); await load(); } };
  const saveAccess = async () => {
    if (!access) return;
    await resourceApi.update(access.r._id, { visibility: access.visibility, batchIds: access.batchIds.join(',') });
    setAccess(null); await load();
  };
  const review = async (q: ResourceRequestRow, status: string) => {
    const reviewNote = status === 'rejected' ? (window.prompt('Reason (optional):', '') ?? '') : '';
    await resourceApi.reviewRequest(q._id, status, reviewNote); await load();
  };
  const openAudit = async (r: Resource) => setAudit({ title: r.title, events: await resourceApi.audit(r._id) });

  const batchGrid = (selected: string[], toggle: (id: string) => void) => (
    batches.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No batches found for this tenant.</div> : (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 130, overflow: 'auto' }}>
        {batches.map(b => {
          const on = selected.includes(b._id);
          return (
            <button key={b._id} type="button" onClick={() => toggle(b._id)}
              style={{ border: `1.5px solid ${on ? PURPLE : '#e2e8f0'}`, background: on ? '#eef0fe' : '#fff', color: on ? PURPLE : '#475569', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {on ? '✓ ' : ''}{b.name}
            </button>
          );
        })}
      </div>
    )
  );
  const toggleIn = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];

  const pending = requests.filter(q => q.status === 'requested');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>📚 Resource Library</h1>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowForm(true)} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Upload resource</button>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {(['resources', 'requests'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#eef0fe' : '#fff', color: tab === t ? PURPLE : '#475569', border: '1px solid #e2e8f0', borderRadius: 9, padding: '8px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
            {t === 'resources' ? `Resources (${items.length})` : `Requests${pending.length ? ` · ${pending.length} pending` : ''}`}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: '#94a3b8', padding: 30 }}>Loading…</div> : tab === 'resources' ? (
        <div style={{ overflowX: 'auto', border: '1px solid #e6e8f0', borderRadius: 12 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13.5, minWidth: 720 }}>
            <thead><tr style={{ background: '#f8fafc', textAlign: 'left' }}>
              {['Resource', 'Type', 'Visibility', 'Batches', 'Status', 'Files', 'Downloads', 'Requests', ''].map(h => <th key={h} style={{ padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: '#64748b', letterSpacing: '.05em' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r._id} style={{ borderTop: '1px solid #eef1f6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{r.title}</td>
                  <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{r.resourceType}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <select value={r.visibility} onChange={e => setVis(r, e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '4px 8px', fontSize: 12 }}>
                      <option value="portal">{VISIBILITY_LABEL.portal}</option><option value="public">{VISIBILITY_LABEL.public}</option><option value="approval">{VISIBILITY_LABEL.approval}</option>
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12.5, color: '#475569', maxWidth: 180 }}>
                    {!r.batchIds || r.batchIds.length === 0 ? <span style={{ color: '#94a3b8' }}>All students</span> : r.batchIds.map(id => batchName(id)).join(', ')}
                  </td>
                  <td style={{ padding: '10px 12px' }}><span style={{ color: STATUS_C[r.status], fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span></td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{r.files.length}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>{r.downloadCount}</td>
                  <td style={{ padding: '10px 12px' }}>{r.pendingRequests ? <span style={{ color: '#b45309', fontWeight: 700 }}>{r.pendingRequests}</span> : '—'}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {r.status !== 'published' ? <button onClick={() => setStatus(r, 'published')} style={ab('#16a34a')}>Publish</button> : <button onClick={() => setStatus(r, 'archived')} style={ab('#b45309')}>Archive</button>}
                    <button onClick={() => setAccess({ r, visibility: r.visibility, batchIds: r.batchIds || [] })} style={ab('#6366f1')}>Access</button>
                    <button onClick={() => openAudit(r)} style={ab('#475569')}>Audit</button>
                    <button onClick={() => del(r)} style={ab('#dc2626')}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={9} style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>No resources yet. Upload one to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.length === 0 ? <div style={{ color: '#94a3b8', padding: 30 }}>No access requests yet.</div> : requests.map(q => (
            <div key={q._id} style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{q.studentName || 'Student'} <span style={{ color: '#94a3b8', fontWeight: 500 }}>→ {q.resourceId?.title || 'resource'}</span></div>
                {q.note && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>“{q.note}”</div>}
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>{new Date(q.createdAt).toLocaleString()}</div>
              </div>
              <span style={{ color: STATUS_C[q.status], fontWeight: 700, fontSize: 12.5, textTransform: 'capitalize' }}>{q.status}</span>
              {q.status === 'requested' && <>
                <button onClick={() => review(q, 'approved')} style={{ ...ab('#16a34a'), padding: '8px 14px' }}>Approve</button>
                <button onClick={() => review(q, 'rejected')} style={{ ...ab('#dc2626'), padding: '8px 14px' }}>Reject</button>
              </>}
              {q.status === 'approved' && <button onClick={() => review(q, 'revoked')} style={ab('#b45309')}>Revoke</button>}
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showForm && (
        <div onClick={() => !saving && setShowForm(false)} style={modalBg}>
          <div onClick={e => e.stopPropagation()} style={modalCard}>
            <div style={{ padding: '15px 20px', background: PURPLE, color: '#fff', fontWeight: 700, fontSize: 16, borderRadius: '16px 16px 0 0' }}>Upload a resource</div>
            <div style={{ padding: 20, display: 'grid', gap: 12 }}>
              {field('Title *', <input style={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />)}
              {field('Description', <textarea style={{ ...inp, minHeight: 64, resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Type', <select style={inp} value={form.resourceType} onChange={e => setForm({ ...form, resourceType: e.target.value })}><option value="project">Project</option><option value="document">Document</option><option value="template">Template</option><option value="dataset">Dataset</option></select>)}
                {field('Visibility', <select style={inp} value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}><option value="portal">All students</option><option value="public">Public</option><option value="approval">Approval required</option></select>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Difficulty', <select style={inp} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}><option value="">—</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>)}
                {field('Target role', <input style={inp} value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })} placeholder="Java Full Stack" />)}
              </div>
              {field('Tech stack (comma-separated)', <input style={inp} value={form.techStack} onChange={e => setForm({ ...form, techStack: e.target.value })} placeholder="Java, Spring Boot, MySQL" />)}
              {field('Tags (comma-separated)', <input style={inp} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="capstone, backend" />)}
              {field(`Visible to batches ${formBatches.length ? `(${formBatches.length} selected)` : '(all students)'}`, batchGrid(formBatches, id => setFormBatches(b => toggleIn(b, id))))}
              {field('Files (ZIP / PDF / docs)', <input type="file" multiple onChange={e => setFiles(e.target.files)} />)}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={submit} disabled={saving} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Uploading…' : 'Upload & save (draft)'}</button>
                <button onClick={() => setShowForm(false)} disabled={saving} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '11px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Uploads as a draft — set it to <b>Publish</b> when ready. Files are stored on Bunny Storage.</div>
            </div>
          </div>
        </div>
      )}

      {/* Access editor modal */}
      {access && (
        <div onClick={() => setAccess(null)} style={modalBg}>
          <div onClick={e => e.stopPropagation()} style={modalCard}>
            <div style={{ padding: '15px 20px', background: PURPLE, color: '#fff', fontWeight: 700, borderRadius: '16px 16px 0 0' }}>Access — {access.r.title}</div>
            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              {field('Visibility', <select style={inp} value={access.visibility} onChange={e => setAccess({ ...access, visibility: e.target.value })}><option value="portal">All students</option><option value="public">Public</option><option value="approval">Approval required</option></select>)}
              {field(`Visible to batches ${access.batchIds.length ? `(${access.batchIds.length} selected)` : '(all students)'}`, batchGrid(access.batchIds, id => setAccess({ ...access, batchIds: toggleIn(access.batchIds, id) })))}
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>No batches selected = visible to all students. Selecting batches restricts it to those students only.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={saveAccess} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Save access</button>
                <button onClick={() => setAccess(null)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '11px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit modal */}
      {audit && (
        <div onClick={() => setAudit(null)} style={modalBg}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalCard, width: 'min(620px,100%)' }}>
            <div style={{ padding: '15px 20px', background: '#0f172a', color: '#fff', fontWeight: 700, borderRadius: '16px 16px 0 0' }}>Audit — {audit.title}</div>
            <div style={{ padding: 16, maxHeight: '70vh', overflow: 'auto' }}>
              {audit.events.length === 0 ? <div style={{ color: '#94a3b8' }}>No events.</div> : audit.events.map(e => (
                <div key={e._id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: STATUS_C[e.action] || '#4338ca', textTransform: 'capitalize', minWidth: 74 }}>{e.action}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0f172a' }}>{e.actorName || 'System'} {e.actorRole ? <span style={{ color: '#94a3b8' }}>({e.actorRole})</span> : ''}{e.meta?.fileName ? <span style={{ color: '#64748b' }}> · {e.meta.fileName}</span> : ''}</div>
                    <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{new Date(e.at).toLocaleString()}{e.ip ? ` · ${e.ip}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ab = (color: string): React.CSSProperties => ({ background: 'none', border: 'none', color, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginRight: 10 });
const modalBg: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' };
const modalCard: React.CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(560px,100%)', margin: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' };

export default ResourceAdmin;
