import React, { useEffect, useState, useCallback } from 'react';
import { feeApi, FeeRow, FeeSummary, PaymentInput } from '../../api/feeApi';
import { batchApi } from '../../api';
import './Fees.css';

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const STATUS_LABEL: Record<string, string> = { paid: 'Paid', partial: 'Partial', pending: 'Pending', overdue: 'Overdue' };

const FeesPage: React.FC = () => {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [batches, setBatches] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('');
  const [status, setStatus] = useState('');
  const [toast, setToast] = useState('');

  // Payment modal
  const [modalRow, setModalRow] = useState<FeeRow | null>(null);
  const [totalFee, setTotalFee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentInput['paymentMethod']>('cash');
  const [txnId, setTxnId] = useState('');
  const [payDate, setPayDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, anaRes] = await Promise.all([
        feeApi.list({ batch: batch || undefined, status: status || undefined, search: search || undefined }),
        feeApi.analytics(),
      ]);
      setRows(listRes.data.data);
      setSummary(listRes.data.summary);
      setAnalytics(anaRes.data.data);
    } catch { showToast('❌ Failed to load fees'); }
    finally { setLoading(false); }
  }, [batch, status, search]);

  useEffect(() => { batchApi.getBatches().then((r: any) => setBatches(r.data || r)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const openModal = (r: FeeRow) => {
    setModalRow(r);
    setTotalFee(r.totalAmount ? String(r.totalAmount) : '');
    setDueDate(r.dueDate ? r.dueDate.slice(0, 10) : '');
    setAmount(''); setMethod('cash'); setTxnId(''); setRemarks('');
    setPayDate(new Date().toISOString().slice(0, 10));
  };

  const submitPayment = async () => {
    if (!modalRow) return;
    setSaving(true);
    try {
      if (totalFee !== '' || dueDate) {
        await feeApi.upsert(modalRow.studentId, {
          totalAmount: totalFee === '' ? undefined : Number(totalFee),
          dueDate: dueDate || undefined,
        });
      }
      if (Number(amount) > 0) {
        await feeApi.recordPayment(modalRow.studentId, {
          amount: Number(amount), paymentMethod: method, transactionId: txnId, remarks, paymentDate: payDate,
        });
      }
      setModalRow(null);
      showToast('✅ Saved');
      load();
    } catch (e: any) { showToast('❌ ' + (e.response?.data?.message || 'Failed to save')); }
    finally { setSaving(false); }
  };

  const printBill = async (r: FeeRow) => {
    try {
      const res = await feeApi.getReceipt(r.studentId);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><head><title>Receipt - ${r.name}</title></head><body>${res.data.data.html}<script>window.onload=function(){window.print();}</script></body></html>`);
        w.document.close();
      }
    } catch { showToast('❌ Failed to generate bill'); }
  };

  const emailReceipt = async (r: FeeRow) => {
    try { await feeApi.getReceipt(r.studentId, true); showToast(`✉️ Receipt emailed to ${r.email}`); }
    catch { showToast('❌ Failed to email receipt'); }
  };

  const remind = async (r: FeeRow) => {
    try { await feeApi.remind(r.studentId); showToast(`🔔 Reminder sent to ${r.name}`); }
    catch (e: any) { showToast('❌ ' + (e.response?.data?.message || 'Failed to send reminder')); }
  };

  const remindAll = async () => {
    if (!window.confirm('Send fee reminders to all students with pending dues' + (batch ? ' in this batch' : '') + '?')) return;
    try { const res = await feeApi.remindBulk(batch || undefined); showToast(`🔔 ${res.data.message}`); }
    catch { showToast('❌ Failed to send reminders'); }
  };

  const maxMonthly = Math.max(1, ...(analytics?.monthly || []).map((m: any) => m.amount));

  return (
    <div className="fees-page">
      {toast && <div className="fees-toast">{toast}</div>}

      <div className="fees-header">
        <div>
          <h1>💳 Fee Management</h1>
          <p>Record payments, track dues, and send reminders</p>
        </div>
        <button className="fees-btn primary" onClick={remindAll}>🔔 Remind All Pending</button>
      </div>

      {/* Analytics */}
      <div className="fees-stats">
        <div className="fees-stat"><span className="fees-stat-ic green">💰</span><div><div className="fees-stat-label">Collected (This Month)</div><div className="fees-stat-val">{inr(analytics?.collectedThisMonth || 0)}</div></div></div>
        <div className="fees-stat"><span className="fees-stat-ic blue">📈</span><div><div className="fees-stat-label">Total Collected</div><div className="fees-stat-val">{inr(analytics?.totalCollected || 0)}</div></div></div>
        <div className="fees-stat"><span className="fees-stat-ic red">⏳</span><div><div className="fees-stat-label">Total Outstanding</div><div className="fees-stat-val">{inr(analytics?.totalDue || 0)}</div></div></div>
        <div className="fees-stat"><span className="fees-stat-ic orange">⚠️</span><div><div className="fees-stat-label">Overdue Students</div><div className="fees-stat-val">{analytics?.statusCounts?.overdue ?? 0}</div></div></div>
      </div>

      {/* Monthly + Batch-wise pending */}
      <div className="fees-charts">
        <div className="fees-card">
          <h3 className="fees-card-title">Monthly Collections</h3>
          <div className="fees-bars">
            {(analytics?.monthly || []).map((m: any) => (
              <div key={m.key} className="fees-bar-col">
                <div className="fees-bar-wrap"><div className="fees-bar" style={{ height: `${Math.round((m.amount / maxMonthly) * 100)}%` }} title={inr(m.amount)} /></div>
                <div className="fees-bar-amt">{m.amount ? inr(m.amount) : '—'}</div>
                <div className="fees-bar-lbl">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="fees-card">
          <h3 className="fees-card-title">Batch-wise Pending</h3>
          {(!analytics?.batchWisePending || analytics.batchWisePending.length === 0) ? <p className="fees-empty">No pending dues 🎉</p> : (
            <div className="fees-batch-list">
              {analytics.batchWisePending.map((b: any) => (
                <div key={b.batchId} className="fees-batch-row">
                  <span className="fees-batch-name">{b.batchName}</span>
                  <span className="fees-batch-meta">{b.students} student{b.students !== 1 ? 's' : ''}</span>
                  <span className="fees-batch-due">{inr(b.due)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="fees-controls">
        <input className="fees-search" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fees-select" value={batch} onChange={e => setBatch(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="fees-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Table */}
      <div className="fees-table-wrap">
        {loading ? <div className="fees-loading">Loading…</div> : rows.length === 0 ? <div className="fees-empty" style={{ padding: 40 }}>No students found.</div> : (
          <table className="fees-table">
            <thead><tr>
              <th>Student</th><th>Batch</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Last Payment</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.studentId}>
                  <td><div className="fees-student"><b>{r.name}</b><span>{r.email}</span></div></td>
                  <td>{r.batchName}</td>
                  <td>{inr(r.totalAmount)}</td>
                  <td className="green">{inr(r.paidAmount)}</td>
                  <td className={r.dueAmount > 0 ? 'red' : ''}>{inr(r.dueAmount)}</td>
                  <td><span className={`fees-badge ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td>{r.lastPaymentDate ? `${inr(r.lastPaymentAmount || 0)} · ${new Date(r.lastPaymentDate).toLocaleDateString('en-IN')}` : '—'}</td>
                  <td>
                    <div className="fees-actions">
                      <button className="fees-btn sm primary" onClick={() => openModal(r)}>+ Payment</button>
                      <button className="fees-icon" title="Send reminder" onClick={() => remind(r)} disabled={r.dueAmount <= 0}>🔔</button>
                      <button className="fees-icon" title="Print bill" onClick={() => printBill(r)}>🧾</button>
                      <button className="fees-icon" title="Email receipt" onClick={() => emailReceipt(r)}>✉️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment / Set-fee modal */}
      {modalRow && (
        <div className="fees-modal-overlay" onClick={() => setModalRow(null)}>
          <div className="fees-modal" onClick={e => e.stopPropagation()}>
            <h3>Payment · {modalRow.name}</h3>
            <p className="fees-modal-sub">Current: paid {inr(modalRow.paidAmount)} of {inr(modalRow.totalAmount)} · due {inr(modalRow.dueAmount)}</p>
            <div className="fees-form-grid">
              <label>Total Fee (₹)<input type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} placeholder="e.g. 50000" /></label>
              <label>Due Date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
            </div>
            <hr className="fees-divider" />
            <div className="fees-form-grid">
              <label>Payment Amount (₹)<input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0 to only set fee" /></label>
              <label>Method
                <select value={method} onChange={e => setMethod(e.target.value as any)}>
                  <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
                </select>
              </label>
              <label>Transaction ID<input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="optional" /></label>
              <label>Payment Date<input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></label>
              <label className="full">Remarks<input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="optional" /></label>
            </div>
            <div className="fees-modal-actions">
              <button className="fees-btn" onClick={() => setModalRow(null)}>Cancel</button>
              <button className="fees-btn primary" onClick={submitPayment} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesPage;
