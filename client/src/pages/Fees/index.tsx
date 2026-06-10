import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { feeApi, FeeRow, FeeSummary, PaymentInput, Installment } from '../../api/feeApi';
import { batchApi } from '../../api';
import './Fees.css';

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const STATUS_LABEL: Record<string, string> = { paid: 'Paid', partial: 'Partial', pending: 'Pending', overdue: 'Overdue' };
const PAGE_SIZE = 20;

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

  const [page, setPage] = useState(1);

  // Payment modal
  const [modalRow, setModalRow] = useState<FeeRow | null>(null);
  const [totalFee, setTotalFee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [registrationFee, setRegistrationFee] = useState('');
  const [studyMaterials, setStudyMaterials] = useState('');
  const [otherCharges, setOtherCharges] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([]);
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
  // Reset to first page whenever filters change
  useEffect(() => { setPage(1); }, [search, batch, status]);

  const openModal = (r: FeeRow) => {
    setModalRow(r);
    setTotalFee(r.totalAmount ? String(r.totalAmount) : '');
    setDueDate(r.dueDate ? r.dueDate.slice(0, 10) : '');
    setDiscount(r.discount ? String(r.discount) : '');
    setDiscountReason(r.discountReason || '');
    setRegistrationFee(r.registrationFee ? String(r.registrationFee) : '');
    setStudyMaterials(r.studyMaterials ? String(r.studyMaterials) : '');
    setOtherCharges(r.otherCharges ? String(r.otherCharges) : '');
    setFollowupDate(r.followupDate ? r.followupDate.slice(0, 10) : '');
    setInstallments((r.installments || []).map(i => ({
      label: i.label || '',
      amount: i.amount,
      dueDate: i.dueDate ? i.dueDate.slice(0, 10) : '',
      status: i.status || 'pending',
      paidDate: i.paidDate ? i.paidDate.slice(0, 10) : null,
    })));
    setAmount(''); setMethod('cash'); setTxnId(''); setRemarks('');
    setPayDate(new Date().toISOString().slice(0, 10));
  };

  const addInstallment = () => setInstallments(prev => [...prev, { amount: 0, dueDate: '', status: 'pending', label: '' }]);
  const updateInstallment = (idx: number, patch: Partial<Installment>) =>
    setInstallments(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeInstallment = (idx: number) => setInstallments(prev => prev.filter((_, i) => i !== idx));
  const autoSplit = (n: number) => {
    const net = Math.max(0, (Number(totalFee) || 0) - (Number(discount) || 0));
    if (!net || n < 1) return;
    const base = Math.floor(net / n);
    const items: Installment[] = Array.from({ length: n }, (_, i) => ({
      label: `Installment ${i + 1}`,
      amount: i === n - 1 ? net - base * (n - 1) : base,
      dueDate: '',
      status: 'pending',
    }));
    setInstallments(items);
  };

  const submitPayment = async () => {
    if (!modalRow) return;
    setSaving(true);
    try {
      await feeApi.upsert(modalRow.studentId, {
        totalAmount: totalFee === '' ? undefined : Number(totalFee),
        dueDate: dueDate || undefined,
        discount: discount === '' ? 0 : Number(discount),
        discountReason: discountReason || undefined,
        registrationFee: registrationFee === '' ? 0 : Number(registrationFee),
        studyMaterials: studyMaterials === '' ? 0 : Number(studyMaterials),
        otherCharges: otherCharges === '' ? 0 : Number(otherCharges),
        followupDate: followupDate || undefined,
        installments: installments
          .filter(i => Number(i.amount) > 0)
          .map(i => ({ ...i, dueDate: i.dueDate || null })),
      });
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

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage]
  );
  const netPayable = Math.max(0, (Number(totalFee) || 0) - (Number(discount) || 0));
  const installmentTotal = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);

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
              {pagedRows.map(r => (
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

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="fees-pagination">
          <span className="fees-page-info">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div className="fees-page-controls">
            <button className="fees-btn sm" onClick={() => setPage(1)} disabled={currentPage <= 1}>« First</button>
            <button className="fees-btn sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>‹ Prev</button>
            <span className="fees-page-num">Page {currentPage} of {totalPages}</span>
            <button className="fees-btn sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next ›</button>
            <button className="fees-btn sm" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}>Last »</button>
          </div>
        </div>
      )}

      {/* Payment / Set-fee modal */}
      {modalRow && (
        <div className="fees-modal-overlay" onClick={() => setModalRow(null)}>
          <div className="fees-modal" onClick={e => e.stopPropagation()}>
            <h3>Payment · {modalRow.name}</h3>
            <p className="fees-modal-sub">Current: paid {inr(modalRow.paidAmount)} of {inr(modalRow.totalAmount)} · due {inr(modalRow.dueAmount)}</p>
            <div className="fees-form-grid">
              <label>Total Fee (₹)<input type="number" value={totalFee} onChange={e => setTotalFee(e.target.value)} placeholder="e.g. 50000" /></label>
              <label>Due Date<input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
              <label>Discount (₹)<input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" /></label>
              <label>Discount Reason<input value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="e.g. Early bird, scholarship" /></label>
              <label>Follow-up Date<input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} /></label>
              <label>Net Payable<input value={inr(netPayable)} readOnly disabled /></label>
            </div>

            {/* Receipt fee breakdown (carved out of Total Fee) */}
            <div className="fees-form-grid" style={{ marginTop: 12 }}>
              <label className="full" style={{ marginBottom: -4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>Receipt breakdown</span>
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 11.5 }}>These are part of the Total Fee; Course Fee on the receipt = Total − these.</span>
              </label>
              <label>Registration Fee (₹)<input type="number" value={registrationFee} onChange={e => setRegistrationFee(e.target.value)} placeholder="0" /></label>
              <label>Study Materials (₹)<input type="number" value={studyMaterials} onChange={e => setStudyMaterials(e.target.value)} placeholder="0" /></label>
              <label>Other Charges (₹)<input type="number" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} placeholder="0" /></label>
              <label>Course Fee (auto)<input value={inr(Math.max(0, (Number(totalFee) || 0) - (Number(registrationFee) || 0) - (Number(studyMaterials) || 0) - (Number(otherCharges) || 0)))} readOnly disabled /></label>
            </div>

            {/* Installments */}
            <div className="fees-installments">
              <div className="fees-installments-head">
                <span>Installments</span>
                <div className="fees-installments-actions">
                  <button type="button" className="fees-btn sm" onClick={() => autoSplit(2)}>Split 2</button>
                  <button type="button" className="fees-btn sm" onClick={() => autoSplit(3)}>Split 3</button>
                  <button type="button" className="fees-btn sm" onClick={() => autoSplit(4)}>Split 4</button>
                  <button type="button" className="fees-btn sm primary" onClick={addInstallment}>+ Add</button>
                </div>
              </div>
              {installments.length === 0 ? (
                <p className="fees-empty" style={{ margin: '4px 0' }}>No installments — full amount due at once.</p>
              ) : (
                <div className="fees-installment-list">
                  {installments.map((it, idx) => (
                    <div key={idx} className="fees-installment-row">
                      <input className="ins-label" placeholder={`Installment ${idx + 1}`} value={it.label || ''} onChange={e => updateInstallment(idx, { label: e.target.value })} />
                      <input className="ins-amt" type="number" placeholder="Amount" value={it.amount || ''} onChange={e => updateInstallment(idx, { amount: Number(e.target.value) })} />
                      <input className="ins-date" type="date" value={(it.dueDate as string) || ''} onChange={e => updateInstallment(idx, { dueDate: e.target.value })} />
                      <select className="ins-status" value={it.status} onChange={e => updateInstallment(idx, { status: e.target.value as any })}>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                      <button type="button" className="fees-icon" title="Remove" onClick={() => removeInstallment(idx)}>🗑️</button>
                    </div>
                  ))}
                  <div className={`fees-installment-total ${installmentTotal !== netPayable ? 'mismatch' : ''}`}>
                    Installments total: {inr(installmentTotal)} {installmentTotal !== netPayable && `(net payable ${inr(netPayable)})`}
                  </div>
                </div>
              )}
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
