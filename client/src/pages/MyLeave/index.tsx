import React, { useEffect, useState, useCallback } from 'react';
import { leaveApi } from '../../api';

const STATUS_COLOR: Record<string, string> = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };
const fmt = (d: string) => new Date(d).toLocaleDateString();

const MyLeave: React.FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { const r = await leaveApi.my(); setList(r.data || []); } catch { /* ignore */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) { setMsg('Please pick dates and enter a reason.'); return; }
    if (toDate < fromDate) { setMsg('End date cannot be before start date.'); return; }
    try {
      setSubmitting(true); setMsg('');
      await leaveApi.apply({ fromDate, toDate, reason: reason.trim() });
      setFromDate(''); setToDate(''); setReason('');
      setMsg('✅ Leave request submitted — your admin will review it.');
      load();
    } catch (err: any) { setMsg(err.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginTop: 6, boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#334155' };

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>📝 Apply for Leave</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 18px' }}>Request leave for a date range. Once approved, those days are marked as leave in your attendance.</p>

      <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><span style={lbl}>From *</span><input type="date" style={inp} value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
          <div><span style={lbl}>To *</span><input type="date" style={inp} value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 14 }}><span style={lbl}>Reason *</span>
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Family function, medical, etc." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <button type="submit" disabled={submitting} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
        </div>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>My Requests</h2>
      {list.length === 0 ? <div style={{ color: '#94a3b8', padding: 20 }}>No leave requests yet.</div> : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
          {list.map(l => (
            <div key={l._id} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 110px', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{fmt(l.fromDate)} → {fmt(l.toDate)}</div>
              <div style={{ fontSize: 13, color: '#475569' }}>{l.reason}{l.reviewNote && <span style={{ color: '#94a3b8' }}> · note: {l.reviewNote}</span>}</div>
              <span style={{ justifySelf: 'end', background: (STATUS_COLOR[l.status] || '#6b7280') + '22', color: STATUS_COLOR[l.status] || '#6b7280', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLeave;
