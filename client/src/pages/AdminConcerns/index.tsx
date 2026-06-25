import React, { useEffect, useState, useCallback } from 'react';
import { concernApi, Concern } from '../../api/concernApi';

const PURPLE = '#6650d8', TEAL = '#14a89c', INK = '#1f2937', MUTED = '#64748b';
const statusColor: Record<string, React.CSSProperties> = {
  open:        { background: '#fff7ed', color: '#9a3412' },
  in_progress: { background: '#eff6ff', color: '#1d4ed8' },
  resolved:    { background: '#e7f8f4', color: '#0a8d7a' },
};

const AdminConcerns: React.FC = () => {
  const [rows, setRows] = useState<Concern[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await concernApi.list(filter || undefined); setRows(r.data); setOpenCount(r.openCount); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const send = async (id: string, status?: string) => {
    const response = drafts[id];
    await concernApi.respond(id, { response: response || undefined, status });
    setDrafts((d) => ({ ...d, [id]: '' }));
    load();
  };

  return (
    <div style={{ padding: '22px 26px 60px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: INK, margin: 0 }}>Student Concerns</h1>
        {openCount > 0 && <span style={{ background: '#fff7ed', color: '#9a3412', borderRadius: 20, padding: '3px 12px', fontSize: 12.5, fontWeight: 700 }}>{openCount} open</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['', 'open', 'in_progress', 'resolved'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? PURPLE : '#fff', color: filter === s ? '#fff' : MUTED, border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', fontWeight: 600 }}>{s ? s.replace('_', ' ') : 'all'}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ color: MUTED, padding: 30 }}>Loading…</div> : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: MUTED, background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0' }}>No concerns {filter ? `(${filter})` : ''} yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((c) => (
            <div key={c._id} style={{ background: '#fff', border: '1px solid #e8ecf3', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <b style={{ color: INK, fontSize: 14 }}>{c.studentName || (c.studentId as any)?.email || 'Student'}</b>
                <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '2px 9px' }}>{c.category}</span>
                <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 9px', ...(statusColor[c.status] || {}) }}>{c.status.replace('_', ' ')}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: MUTED }}>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 13.5, color: '#374151', margin: '0 0 6px', lineHeight: 1.5 }}>{c.message}</p>
              {c.context?.curriculumTitle && <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8 }}>↳ {c.context.curriculumTitle}{c.context.dayNumber ? `, Day ${c.context.dayNumber}` : ''}{c.context.page ? ` · ${c.context.page}` : ''}</div>}
              {c.response && <div style={{ fontSize: 12.8, color: '#0a8d7a', background: '#e7f8f4', borderRadius: 8, padding: '8px 11px', marginBottom: 10 }}><b>Mentor:</b> {c.response}</div>}
              {c.status !== 'resolved' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea value={drafts[c._id] || ''} onChange={(e) => setDrafts((d) => ({ ...d, [c._id]: e.target.value }))} rows={2} placeholder="Reply to the student…" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                  <button onClick={() => send(c._id)} style={{ background: '#fff', color: PURPLE, border: `1.5px solid ${PURPLE}`, borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Reply</button>
                  <button onClick={() => send(c._id, 'resolved')} style={{ background: `linear-gradient(90deg,${PURPLE},${TEAL})`, color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Resolve</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminConcerns;
