import React, { useCallback, useEffect, useState } from 'react';
import { assignmentApi } from '../../api/assignmentApi';
import { batchApi } from '../../api';
import AssignmentPreviewModal from './AssignmentPreviewModal';

interface Row {
  _id: string; title: string; type: string; difficulty: string; dueDate?: string;
  total: number; completed: number; inProgress: number; notStarted: number; completionRate: number;
}
interface DetailStudent { _id: string; name: string; email: string; status: 'completed' | 'in_progress' | 'not_started'; }
interface Detail {
  assignment: { _id: string; title: string; type: string; dueDate?: string };
  summary: { total: number; completed: number; inProgress: number; notStarted: number };
  students: DetailStudent[];
}

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  completed: { label: 'Completed', bg: '#dcfce7', fg: '#15803d' },
  in_progress: { label: 'In progress', bg: '#fef3c7', fg: '#b45309' },
  not_started: { label: 'Not started', bg: '#f1f5f9', fg: '#64748b' },
};

const chip = (n: number, bg: string, fg: string) => (
  <span style={{ display: 'inline-block', minWidth: 30, textAlign: 'center', background: bg, color: fg, fontWeight: 800, borderRadius: 8, padding: '3px 9px', fontSize: 13 }}>{n}</span>
);

const CompletionTab: React.FC<{ typeFilter: string }> = ({ typeFilter }) => {
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [batch, setBatch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Drill-down
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reminding, setReminding] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res: any = await batchApi.getBatches();
        setBatches(res.batches || res.data || res || []);
      } catch { /* non-fatal */ }
    })();
  }, []);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (batch) params.set('batch', batch);
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter);
      const res = await assignmentApi.getCompletionReport(params.toString());
      setRows(res.data.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [batch, typeFilter]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setDetail(null); setSelected(new Set()); setMsg('');
    try {
      const res = await assignmentApi.getAssignmentCompletion(id, batch || undefined);
      setDetail(res.data.data);
    } catch { setMsg('Failed to load student list.'); }
    finally { setDetailLoading(false); }
  };

  const pendingIds = (d: Detail) => d.students.filter(s => s.status !== 'completed').map(s => s._id);

  const remind = async (studentIds?: string[]) => {
    if (!detail) return;
    setReminding(true); setMsg('');
    try {
      const res = await assignmentApi.remindPending(detail.assignment._id, studentIds ? { studentIds } : { batch: batch || undefined });
      setMsg(res.data.message || 'Reminders sent.');
      setSelected(new Set());
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Failed to send reminders.'); }
    finally { setReminding(false); }
  };

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 700, padding: '10px 12px', borderBottom: '2px solid #eef1f6' };
  const td: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13.5, color: '#334155' };
  const btn: React.CSSProperties = { border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: '#475569' };

  return (
    <div>
      {/* Batch selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '4px 0 14px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Batch</label>
        <select value={batch} onChange={e => setBatch(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, minWidth: 220 }}>
          <option value="">All batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <button style={btn} onClick={fetchRows}>🔄 Refresh</button>
        <span style={{ fontSize: 12.5, color: '#94a3b8' }}>Showing published assignments{batch ? ' for this batch' : ''}.</span>
      </div>

      {loading ? (
        <p style={{ color: '#64748b', padding: 20 }}>Loading completion data…</p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #eef1f6', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={th}>Assignment</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: 'center' }}>Assigned</th>
                <th style={{ ...th, textAlign: 'center' }}>✅ Completed</th>
                <th style={{ ...th, textAlign: 'center' }}>⏳ In progress</th>
                <th style={{ ...th, textAlign: 'center' }}>⭕ Not started</th>
                <th style={{ ...th, minWidth: 120 }}>Completion</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r._id}>
                  <td style={td}><span style={{ fontWeight: 700, color: '#0f172a' }}>{r.title}</span></td>
                  <td style={td}><span style={{ fontSize: 11.5, fontWeight: 700, background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 12 }}>{r.type}</span></td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{r.total}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{chip(r.completed, '#dcfce7', '#15803d')}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{chip(r.inProgress, '#fef3c7', '#b45309')}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{chip(r.notStarted, '#fee2e2', '#b91c1c')}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: '#eef1f6', borderRadius: 6, overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ width: `${r.completionRate}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)' }} />
                      </div>
                      <b style={{ fontSize: 12.5, color: '#0f172a' }}>{r.completionRate}%</b>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={{ ...btn, marginRight: 6 }} onClick={() => setPreviewId(r._id)}>👁 Preview</button>
                    <button style={{ ...btn, borderColor: '#c7d2fe', color: '#4f46e5' }} onClick={() => openDetail(r._id)}>👥 Students</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 26 }}>No published assignments{batch ? ' for this batch' : ''}.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {previewId && <AssignmentPreviewModal assignmentId={previewId} onClose={() => setPreviewId(null)} />}

      {/* Drill-down modal */}
      {(detail || detailLoading) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 5000, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => { setDetail(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 'min(720px, 96vw)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 70px rgba(15,23,42,.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid #eef1f6', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>STUDENT STATUS</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{detail?.assignment.title || 'Loading…'}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#475569' }}>✕</button>
            </div>

            <div style={{ padding: '14px 22px 24px' }}>
              {detailLoading && <p style={{ color: '#64748b' }}>Loading…</p>}
              {detail && (
                <>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span style={{ ...pillStat('#eef2ff', '#4f46e5') }}>Total {detail.summary.total}</span>
                    <span style={{ ...pillStat('#dcfce7', '#15803d') }}>✅ {detail.summary.completed}</span>
                    <span style={{ ...pillStat('#fef3c7', '#b45309') }}>⏳ {detail.summary.inProgress}</span>
                    <span style={{ ...pillStat('#fee2e2', '#b91c1c') }}>⭕ {detail.summary.notStarted}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <button disabled={reminding || pendingIds(detail).length === 0} onClick={() => remind()} style={{ background: pendingIds(detail).length && !reminding ? 'linear-gradient(90deg,#7c3aed,#4f46e5)' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontWeight: 700, fontSize: 13, cursor: pendingIds(detail).length && !reminding ? 'pointer' : 'default' }}>
                      {reminding ? 'Sending…' : `🔔 Remind all pending (${pendingIds(detail).length})`}
                    </button>
                    <button disabled={reminding || selected.size === 0} onClick={() => remind(Array.from(selected))} style={{ ...btn, opacity: selected.size ? 1 : .5 }}>
                      Remind selected ({selected.size})
                    </button>
                  </div>
                  {msg && <div style={{ fontSize: 13, color: '#0f766e', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{msg}</div>}

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...th, width: 32 }}></th>
                        <th style={th}>Student</th>
                        <th style={{ ...th, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.students.map(s => {
                        const meta = STATUS_META[s.status];
                        const pending = s.status !== 'completed';
                        return (
                          <tr key={s._id}>
                            <td style={td}>{pending && <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s._id)} />}</td>
                            <td style={td}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.email}</div>
                            </td>
                            <td style={{ ...td, textAlign: 'right' }}><span style={{ background: meta.bg, color: meta.fg, fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>{meta.label}</span></td>
                          </tr>
                        );
                      })}
                      {detail.students.length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#94a3b8' }}>No students assigned.</td></tr>}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const pillStat = (bg: string, fg: string): React.CSSProperties => ({ background: bg, color: fg, fontWeight: 800, fontSize: 13, padding: '5px 12px', borderRadius: 20 });

export default CompletionTab;
