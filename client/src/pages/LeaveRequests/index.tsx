import React, { useEffect, useState, useCallback } from 'react';
import { leaveApi } from '../../api';

const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const fmt = (d: string) => new Date(d).toLocaleDateString();
const nameOf = (u: any) => !u ? '—' : (u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—');

const LeaveRequests: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await leaveApi.list(status || undefined); setList(r.data || []); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, kind: 'approve' | 'reject') => {
    const note = kind === 'reject' ? (window.prompt('Reason for rejection (optional):') || '') : (window.prompt('Note (optional):') || '');
    try {
      setBusy(id);
      const res = kind === 'approve' ? await leaveApi.approve(id, note) : await leaveApi.reject(id, note);
      if (res?.message) alert(res.message);
      load();
    } catch (e: any) { alert(e.message || 'Action failed'); }
    finally { setBusy(null); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>📝 Leave Requests</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 16px' }}>Approve to auto-mark those weekdays as leave in the student's attendance.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <button onClick={load} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {loading ? <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>Loading…</div> :
        list.length === 0 ? <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>No {status || ''} requests.</div> : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            {list.map(l => (
              <div key={l._id} style={{ display: 'grid', gridTemplateColumns: '160px 150px 1fr 200px', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{nameOf(l.studentId) !== '—' ? nameOf(l.studentId) : l.studentName}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{fmt(l.fromDate)} → {fmt(l.toDate)}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{l.reason}</div>
                <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {l.status === 'pending' ? (
                    <>
                      <button disabled={busy === l._id} onClick={() => act(l._id, 'approve')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Approve</button>
                      <button disabled={busy === l._id} onClick={() => act(l._id, 'reject')} style={{ background: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Reject</button>
                    </>
                  ) : (
                    <span style={{ background: (STATUS_COLOR[l.status] || '#6b7280') + '22', color: STATUS_COLOR[l.status] || '#6b7280', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                      {l.status}{l.daysMarked ? ` · ${l.daysMarked}d` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default LeaveRequests;
