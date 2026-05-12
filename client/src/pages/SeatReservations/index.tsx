import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { seatReservationApi } from '../../api';
import './SeatReservations.css';

// ── Types ────────────────────────────────────────────────────────────────────

type ReservationStatus = 'pending' | 'partial_paid' | 'paid' | 'confirmed' | 'enrolled' | 'cancelled' | 'expired';
type DemoStatus = 'none' | 'active' | 'satisfied' | 'refunded';
type InstallmentStatus = 'pending' | 'paid' | 'overdue';

interface Payment {
  _id: string;
  amount: number;
  method: string;
  transactionId?: string;
  paidAt: string;
  receiptNumber?: string;
  installmentLabel?: string;
  proofUrl?: string;
}

interface Installment {
  _id?: string;
  label: string;
  amount: number;
  dueDate?: string;
  status: InstallmentStatus;
  paidAt?: string;
}

interface Reservation {
  _id: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  studentId?: { _id: string; email: string; firstName?: string; lastName?: string; phone?: string; profileComplete?: boolean; };
  courseName: string;
  batchName?: string;
  seatNumber?: string;
  originalPrice: number;
  discountAmount: number;
  discountReason?: string;
  finalPrice: number;
  paidAmount: number;
  balanceAmount: number;
  payments: Payment[];
  status: ReservationStatus;
  reservedAt: string;
  expiresAt?: string;
  createdBy?: { firstName?: string; lastName?: string; };
  demoEnabled: boolean;
  demoPeriodDays: number;
  demoStartDate?: string;
  demoEndDate?: string;
  demoStatus: DemoStatus;
  installmentPlan: Installment[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:      '⏳ Pending',
  partial_paid: '💳 Partial Paid',
  paid:         '✅ Paid',
  confirmed:    '🔒 Confirmed',
  enrolled:     '🎓 Enrolled',
  cancelled:    '❌ Cancelled',
  expired:      '⌛ Expired',
};
const STATUS_CLASS: Record<ReservationStatus, string> = {
  pending:      'sr-badge-pending',
  partial_paid: 'sr-badge-partial',
  paid:         'sr-badge-paid',
  confirmed:    'sr-badge-confirmed',
  enrolled:     'sr-badge-enrolled',
  cancelled:    'sr-badge-cancelled',
  expired:      'sr-badge-expired',
};

function getStudentName(r: Reservation): string {
  return r.studentName || [r.studentId?.firstName, r.studentId?.lastName].filter(Boolean).join(' ') || 'Unknown';
}
function getStudentEmail(r: Reservation): string {
  return r.studentEmail || r.studentId?.email || '';
}
function getStudentPhone(r: Reservation): string {
  return r.studentPhone || r.studentId?.phone || '';
}

// ── Component ────────────────────────────────────────────────────────────────

const SeatReservationsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user && ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(user.role);

  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Modals
  const [newModal, setNewModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<Reservation | null>(null);
  const [emailModal, setEmailModal] = useState<Reservation | null>(null);
  const [cancelModal, setCancelModal] = useState<Reservation | null>(null);
  const [emailTab, setEmailTab] = useState<'confirmation' | 'reminder' | 'prejoining' | 'joiningday' | 'whatsapp'>('confirmation');
  const [installmentModal, setInstallmentModal] = useState<Reservation | null>(null);
  const [demoModal, setDemoModal] = useState<Reservation | null>(null);
  const [detailModal, setDetailModal] = useState<Reservation | null>(null);

  // New Reservation form
  const [newForm, setNewForm] = useState({
    studentName: '', studentEmail: '', studentPhone: '',
    courseName: '', batchName: '',
    originalPrice: '', discountAmount: '', discountReason: '',
    seatNumber: '', notes: '', expiresAt: '',
    demoEnabled: false, demoPeriodDays: '3',
    installmentType: 'single' as 'single' | 'two' | 'custom',
    inst1Label: '1st Installment', inst1Amount: '', inst1DueDate: '',
    inst2Label: '2nd Installment', inst2Amount: '', inst2DueDate: '',
  });
  const [installmentRows, setInstallmentRows] = useState<Installment[]>([]);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [demoStatusVal, setDemoStatusVal] = useState<'active' | 'satisfied' | 'refunded'>('active');

  const [payForm, setPayForm] = useState({ amount: '', method: 'upi', transactionId: '', installmentLabel: '', proofUrl: '', notes: '' });
  const [refundModal, setRefundModal] = useState<Reservation | null>(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [emailForm, setEmailForm] = useState({
    dueDate: '', customMessage: '',
    batchStartDate: '', batchStartTime: '', venue: '', onlineLink: '',
    loginEmail: '', tempPassword: '',
  });
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dropdownWrapRef = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const showAlert = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resResp, statsResp] = await Promise.all([
        seatReservationApi.getAll({ status: statusFilter === 'all' ? undefined : statusFilter, page, limit: 20 }),
        seatReservationApi.getStats(),
      ]);
      setReservations(resResp?.data?.data || []);
      const total = resResp?.data?.pagination?.total || 0;
      setTotalPages(Math.max(1, Math.ceil(total / 20)));
      setStats(statsResp?.data?.data || null);
    } catch {
      showAlert('error', 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openDropdown) {
        const el = dropdownWrapRef.current[openDropdown];
        if (el && !el.contains(e.target as Node)) setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  const filteredReservations = reservations.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      getStudentName(r).toLowerCase().includes(q) ||
      r.courseName.toLowerCase().includes(q) ||
      getStudentPhone(r).includes(q) ||
      getStudentEmail(r).toLowerCase().includes(q)
    );
  });

  function statCount(status: string): number {
    if (!stats?.byStatus) return 0;
    const found = stats.byStatus.find((s: any) => s._id === status);
    return found?.count || 0;
  }
  const totalRevenue = stats?.totals?.totalRevenue || 0;
  const pendingRevenue = stats?.totals?.pendingRevenue || 0;

  const handleCreateReservation = async () => {
    if (!newForm.studentName.trim()) { showAlert('error', 'Student name is required'); return; }
    if (!newForm.studentEmail.trim()) { showAlert('error', 'Student email is required'); return; }
    if (!newForm.studentPhone.trim()) { showAlert('error', 'Mobile number is required'); return; }
    if (!newForm.courseName.trim()) { showAlert('error', 'Course name is required'); return; }
    if (!newForm.originalPrice || isNaN(Number(newForm.originalPrice))) { showAlert('error', 'Enter a valid course fee'); return; }
    setSubmitting(true);
    try {
      // Build installment plan from form
      let installmentPlan: Installment[] = [];
      if (newForm.installmentType === 'two') {
        if (newForm.inst1Amount) installmentPlan.push({ label: newForm.inst1Label, amount: Number(newForm.inst1Amount), dueDate: newForm.inst1DueDate || undefined, status: 'pending' });
        if (newForm.inst2Amount) installmentPlan.push({ label: newForm.inst2Label, amount: Number(newForm.inst2Amount), dueDate: newForm.inst2DueDate || undefined, status: 'pending' });
      } else if (newForm.installmentType === 'custom') {
        installmentPlan = installmentRows;
      }

      await seatReservationApi.create({
        studentName: newForm.studentName.trim(),
        studentEmail: newForm.studentEmail.trim().toLowerCase(),
        studentPhone: newForm.studentPhone.trim(),
        courseName: newForm.courseName.trim(),
        batchName: newForm.batchName.trim() || undefined,
        originalPrice: Number(newForm.originalPrice),
        discountAmount: Number(newForm.discountAmount) || 0,
        discountReason: newForm.discountReason.trim() || undefined,
        seatNumber: newForm.seatNumber.trim() || undefined,
        notes: newForm.notes.trim() || undefined,
        expiresAt: newForm.expiresAt || undefined,
        demoEnabled: newForm.demoEnabled,
        demoPeriodDays: Number(newForm.demoPeriodDays) || 3,
        installmentPlan,
      });
      showAlert('success', '✅ Seat reserved! Student account created and confirmation email sent.');
      setNewModal(false);
      setNewForm({ studentName: '', studentEmail: '', studentPhone: '', courseName: '', batchName: '', originalPrice: '', discountAmount: '', discountReason: '', seatNumber: '', notes: '', expiresAt: '', demoEnabled: false, demoPeriodDays: '3', installmentType: 'single', inst1Label: '1st Installment', inst1Amount: '', inst1DueDate: '', inst2Label: '2nd Installment', inst2Amount: '', inst2DueDate: '' });
      setInstallmentRows([]);
      fetchData();
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentModal) return;
    if (!payForm.amount || isNaN(Number(payForm.amount))) { showAlert('error', 'Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      await seatReservationApi.addPayment(paymentModal._id, {
        amount: Number(payForm.amount),
        method: payForm.method,
        transactionId: payForm.transactionId || undefined,
        installmentLabel: payForm.installmentLabel || undefined,
        proofUrl: payForm.proofUrl || undefined,
        notes: payForm.notes || undefined
      });
      showAlert('success', 'Payment recorded');
      setPaymentModal(null);
      setPayForm({ amount: '', method: 'upi', transactionId: '', installmentLabel: '', proofUrl: '', notes: '' });
      fetchData();
    } catch { showAlert('error', 'Failed to add payment'); }
    finally { setSubmitting(false); }
  };

  const handleSendEmail = async () => {
    if (!emailModal) return;
    setSubmitting(true);
    try {
      let resp: any;
      if (emailTab === 'confirmation') resp = await seatReservationApi.sendConfirmation(emailModal._id);
      else if (emailTab === 'reminder') resp = await seatReservationApi.sendPaymentReminder(emailModal._id, { dueDate: emailForm.dueDate || undefined, customMessage: emailForm.customMessage || undefined });
      else if (emailTab === 'prejoining') resp = await seatReservationApi.sendPreJoiningInfo(emailModal._id, { batchStartDate: emailForm.batchStartDate || undefined, batchStartTime: emailForm.batchStartTime || undefined, venue: emailForm.venue || undefined, onlineLink: emailForm.onlineLink || undefined, customMessage: emailForm.customMessage || undefined });
      else resp = await seatReservationApi.sendJoiningDay(emailModal._id, { loginEmail: emailForm.loginEmail || undefined, tempPassword: emailForm.tempPassword || undefined, onlineLink: emailForm.onlineLink || undefined, customMessage: emailForm.customMessage || undefined });
      showAlert('success', resp?.data?.message || 'Email sent');
      setEmailModal(null);
      setEmailForm({ dueDate: '', customMessage: '', batchStartDate: '', batchStartTime: '', venue: '', onlineLink: '', loginEmail: '', tempPassword: '' });
    } catch { showAlert('error', 'Failed to send email'); }
    finally { setSubmitting(false); }
  };

  const handleSendReceipt = async (id: string) => {
    try {
      const resp = await seatReservationApi.sendReceipt(id);
      showAlert('success', resp?.data?.message || 'Receipt sent');
    } catch { showAlert('error', 'Failed to send receipt'); }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setSubmitting(true);
    try {
      await seatReservationApi.cancel(cancelModal._id, cancelReason);
      showAlert('success', 'Reservation cancelled');
      setCancelModal(null); setCancelReason('');
      fetchData();
    } catch { showAlert('error', 'Failed to cancel'); }
    finally { setSubmitting(false); }
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    if (!refundForm.amount || isNaN(Number(refundForm.amount))) {
      showAlert('error', 'Enter a valid refund amount');
      return;
    }
    setSubmitting(true);
    try {
      await seatReservationApi.refundReservation(refundModal._id, {
        amount: Number(refundForm.amount),
        reason: refundForm.reason || undefined
      });
      showAlert('success', 'Refund recorded');
      setRefundModal(null);
      setRefundForm({ amount: '', reason: '' });
      fetchData();
    } catch {
      showAlert('error', 'Failed to record refund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnroll = async (r: Reservation) => {
    if (!window.confirm(`Mark ${getStudentName(r)} as enrolled in ${r.courseName}?`)) return;
    try {
      const resp = await seatReservationApi.convertToStudent(r._id);
      showAlert('success', resp?.data?.message || 'Student enrolled');
      fetchData();
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to enroll student');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!emailModal) return;
    setSubmitting(true);
    try {
      const resp = await seatReservationApi.sendWhatsAppReminder(emailModal._id, { customMessage: whatsappMsg || undefined });
      showAlert('success', resp?.data?.message || 'WhatsApp reminder sent');
      setEmailModal(null);
      setWhatsappMsg('');
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to send WhatsApp reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDemoStatus = async () => {
    if (!demoModal) return;
    setSubmitting(true);
    try {
      await seatReservationApi.updateDemoStatus(demoModal._id, demoStatusVal);
      showAlert('success', `Demo status updated to "${demoStatusVal}"`);
      setDemoModal(null);
      fetchData();
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to update demo status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveInstallmentPlan = async () => {
    if (!installmentModal) return;
    setSubmitting(true);
    try {
      await seatReservationApi.setInstallmentPlan(installmentModal._id, installmentRows);
      showAlert('success', 'Installment plan saved');
      setInstallmentModal(null);
      setInstallmentRows([]);
      fetchData();
    } catch (err: any) {
      showAlert('error', err?.response?.data?.message || 'Failed to save installment plan');
    } finally {
      setSubmitting(false);
    }
  };

  const EMAIL_DESC: Record<string, string> = {
    confirmation: '📩 Resend booking confirmation with course, seat, and payment summary.',
    reminder: '⏰ Send payment reminder with outstanding balance and payment options.',
    prejoining: '🗓️ Send batch start date, timings, venue/link, documents needed, and pre-joining checklist.',
    joiningday: '🎉 Welcome email with portal login credentials and class schedule.',
    whatsapp: '💬 Send WhatsApp payment reminder directly to the student\'s phone number.',
  };

  return (
    <div className="sr-page">
      {alert && <div className={`sr-alert ${alert.type}`}>{alert.msg}</div>}

      <div className="sr-header">
        <div>
          <h1 className="sr-header-title">🎟️ Seat Reservations</h1>
          <p className="sr-header-sub">Reserve seats, create student accounts, and manage the full onboarding email journey</p>
        </div>
        <div className="sr-header-actions">
          <button className="sr-btn sr-btn-outline" onClick={fetchData}>🔄 Refresh</button>
          <button className="sr-btn sr-btn-primary" onClick={() => setNewModal(true)}>+ New Reservation</button>
        </div>
      </div>

      <div className="sr-stats">
        <div className="sr-stat-card purple"><div className="sr-stat-val">{stats?.totals?.totalReservations || 0}</div><div className="sr-stat-label">Total</div></div>
        <div className="sr-stat-card amber"><div className="sr-stat-val">{statCount('pending') + statCount('partial_paid')}</div><div className="sr-stat-label">Pending Payment</div></div>
        <div className="sr-stat-card green"><div className="sr-stat-val">{statCount('paid') + statCount('confirmed')}</div><div className="sr-stat-label">Fully Paid</div></div>
        <div className="sr-stat-card blue"><div className="sr-stat-val">{statCount('enrolled')}</div><div className="sr-stat-label">Enrolled</div></div>
        <div className="sr-stat-card green"><div className="sr-stat-val">₹{(totalRevenue / 1000).toFixed(0)}K</div><div className="sr-stat-label">Revenue</div></div>
        <div className="sr-stat-card amber"><div className="sr-stat-val">₹{(pendingRevenue / 1000).toFixed(0)}K</div><div className="sr-stat-label">Pending</div></div>
      </div>

      <div className="sr-filters">
        <div className="sr-search">
          <input type="text" placeholder="Search name, email, phone, course..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="sr-filter-tabs">
          {(['all', 'pending', 'partial_paid', 'paid', 'confirmed', 'enrolled', 'cancelled'] as const).map(s => (
            <button key={s} className={`sr-filter-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s === 'all' ? 'All' : STATUS_LABELS[s as ReservationStatus]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="sr-loading"><div className="sr-spinner" /><p>Loading reservations...</p></div>
      ) : filteredReservations.length === 0 ? (
        <div className="sr-empty">
          <div className="sr-empty-icon">🎟️</div>
          <p>No reservations found.</p>
          <button className="sr-btn sr-btn-primary" style={{ marginTop: 12 }} onClick={() => setNewModal(true)}>+ Create First Reservation</button>
        </div>
      ) : (
        <>
          <div className="sr-table-wrap">
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course &amp; Batch</th>
                  <th>Seat</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                  <th>Reserved On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div className="sr-lead-cell">
                        <span className="sr-lead-name">{getStudentName(r)}</span>
                        <span className="sr-lead-contact">{getStudentEmail(r)}</span>
                        {getStudentPhone(r) && <span className="sr-lead-contact">{getStudentPhone(r)}</span>}
                        {r.studentId?.profileComplete === false && (
                          <span style={{ fontSize: 10, background: '#fff3cd', color: '#92400e', borderRadius: 6, padding: '1px 6px', marginTop: 2, display: 'inline-block' }}>Profile incomplete</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="sr-course-name">{r.courseName}</div>
                      {r.batchName && <div className="sr-batch-name">{r.batchName}</div>}
                    </td>
                    <td>{r.seatNumber || '—'}</td>
                    <td className="sr-amount-cell">
                      <div className="sr-amount-main">₹{r.finalPrice.toLocaleString('en-IN')}</div>
                      {r.paidAmount > 0 && <div className="sr-amount-paid">Paid: ₹{r.paidAmount.toLocaleString('en-IN')}</div>}
                      {r.balanceAmount > 0 && <div className="sr-amount-balance">Due: ₹{r.balanceAmount.toLocaleString('en-IN')}</div>}
                    </td>
                    <td><span className={`sr-badge ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                    <td>{new Date(r.reservedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="sr-actions-cell">
                      <div ref={(el) => { dropdownWrapRef.current[r._id] = el; }} style={{ position: 'relative', display: 'inline-block' }}>
                        <button className="sr-actions-btn" onClick={() => setOpenDropdown(openDropdown === r._id ? null : r._id)}>Actions ▾</button>
                        {openDropdown === r._id && (
                          <div className="sr-dropdown">
                            <button className="sr-dropdown-item" onClick={() => { setDetailModal(r); setOpenDropdown(null); }}>🔍 View Details</button>
                            <div className="sr-dropdown-divider" />
                            {!['enrolled', 'cancelled', 'expired'].includes(r.status) && (
                              <button className="sr-dropdown-item" onClick={() => { setPaymentModal(r); setOpenDropdown(null); }}>💳 Add Payment</button>
                            )}
                            {!['enrolled', 'cancelled', 'expired'].includes(r.status) && (
                              <button className="sr-dropdown-item" onClick={() => { setInstallmentModal(r); setInstallmentRows(r.installmentPlan?.length ? r.installmentPlan : []); setOpenDropdown(null); }}>📋 Installment Plan</button>
                            )}
                            {r.paidAmount > 0 && (
                              <button className="sr-dropdown-item" onClick={() => { setRefundModal(r); setOpenDropdown(null); }}>↩️ Record Refund</button>
                            )}
                            {r.paidAmount > 0 && (
                              <button className="sr-dropdown-item" onClick={() => { handleSendReceipt(r._id); setOpenDropdown(null); }}>🧾 Send Receipt</button>
                            )}
                            <button className="sr-dropdown-item" onClick={() => { setEmailModal(r); setEmailTab('confirmation'); setOpenDropdown(null); }}>📧 Send Email</button>
                            <button className="sr-dropdown-item" onClick={() => { setEmailModal(r); setEmailTab('whatsapp'); setOpenDropdown(null); }}>💬 WhatsApp Reminder</button>
                            {r.demoEnabled && !['enrolled', 'cancelled'].includes(r.status) && (
                              <button className="sr-dropdown-item" onClick={() => { setDemoModal(r); setDemoStatusVal(r.demoStatus === 'active' || r.demoStatus === 'none' ? 'satisfied' : 'active'); setOpenDropdown(null); }}>🔬 Update Demo Status</button>
                            )}
                            <div className="sr-dropdown-divider" />
                            {isAdmin && !['enrolled', 'cancelled'].includes(r.status) && (
                              <button className="sr-dropdown-item" onClick={() => { handleEnroll(r); setOpenDropdown(null); }}>🎓 Mark as Enrolled</button>
                            )}
                            {!['enrolled', 'cancelled'].includes(r.status) && (
                              <button className="sr-dropdown-item danger" onClick={() => { setCancelModal(r); setOpenDropdown(null); }}>❌ Cancel</button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="sr-pagination">
              <button className="sr-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`sr-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="sr-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          )}
        </>
      )}

      {/* ── NEW RESERVATION MODAL ────────────────────────────────────────── */}
      {newModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setNewModal(false); }}>
          <div className="sr-modal sr-modal-wide">
            <div className="sr-modal-title">🎟️ New Seat Reservation<button className="sr-modal-close" onClick={() => setNewModal(false)}>✕</button></div>
            <div className="sr-modal-notice">ℹ️ A student account is created automatically. Confirmation email with login details and profile setup link will be sent instantly.</div>
            <div className="sr-form-section-title">Student Details</div>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Full Name *</label>
                <input className="sr-form-input" placeholder="Student full name" value={newForm.studentName} onChange={e => setNewForm(f => ({ ...f, studentName: e.target.value }))} />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Email Address *</label>
                <input className="sr-form-input" type="email" placeholder="student@gmail.com" value={newForm.studentEmail} onChange={e => setNewForm(f => ({ ...f, studentEmail: e.target.value }))} />
              </div>
            </div>
            <div className="sr-form-group">
              <label className="sr-form-label">Mobile Number *</label>
              <input className="sr-form-input" type="tel" placeholder="+91 XXXXX XXXXX" value={newForm.studentPhone} onChange={e => setNewForm(f => ({ ...f, studentPhone: e.target.value }))} />
            </div>
            <div className="sr-form-section-title" style={{ marginTop: 18 }}>Course Details</div>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Course Name *</label>
                <input className="sr-form-input" placeholder="e.g. Full Stack Java" value={newForm.courseName} onChange={e => setNewForm(f => ({ ...f, courseName: e.target.value }))} />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Batch Name</label>
                <input className="sr-form-input" placeholder="e.g. Batch 2026 - May" value={newForm.batchName} onChange={e => setNewForm(f => ({ ...f, batchName: e.target.value }))} />
              </div>
            </div>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Course Fee (₹) *</label>
                <input className="sr-form-input" type="number" placeholder="e.g. 50000" value={newForm.originalPrice} onChange={e => setNewForm(f => ({ ...f, originalPrice: e.target.value }))} />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Discount (₹)</label>
                <input className="sr-form-input" type="number" placeholder="0" value={newForm.discountAmount} onChange={e => setNewForm(f => ({ ...f, discountAmount: e.target.value }))} />
              </div>
            </div>
            {Number(newForm.discountAmount) > 0 && (
              <div className="sr-form-group">
                <label className="sr-form-label">Discount Reason</label>
                <input className="sr-form-input" placeholder="e.g. Early bird, Referral" value={newForm.discountReason} onChange={e => setNewForm(f => ({ ...f, discountReason: e.target.value }))} />
              </div>
            )}
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Seat Number</label>
                <input className="sr-form-input" placeholder="e.g. A-12" value={newForm.seatNumber} onChange={e => setNewForm(f => ({ ...f, seatNumber: e.target.value }))} />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Reservation Expiry</label>
                <input className="sr-form-input" type="date" value={newForm.expiresAt} onChange={e => setNewForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>
            {newForm.originalPrice && (
              <div className="sr-fee-preview">
                Total Payable: <strong>₹{(Number(newForm.originalPrice) - (Number(newForm.discountAmount) || 0)).toLocaleString('en-IN')}</strong>
                {Number(newForm.discountAmount) > 0 && <span style={{ color: '#15803d', marginLeft: 8 }}>(₹{Number(newForm.discountAmount).toLocaleString('en-IN')} discount)</span>}
              </div>
            )}

            <div className="sr-form-section-title" style={{ marginTop: 18 }}>Demo Period</div>
            <div className="sr-form-group">
              <label className="sr-form-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={newForm.demoEnabled} onChange={e => setNewForm(f => ({ ...f, demoEnabled: e.target.checked }))} style={{ width: 16, height: 16 }} />
                Enable demo period (student can request refund if not satisfied)
              </label>
            </div>
            {newForm.demoEnabled && (
              <div className="sr-form-group">
                <label className="sr-form-label">Demo Days *</label>
                <input className="sr-form-input" type="number" min="1" max="30" placeholder="3" value={newForm.demoPeriodDays} onChange={e => setNewForm(f => ({ ...f, demoPeriodDays: e.target.value }))} style={{ maxWidth: 120 }} />
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>days from reservation date</span>
              </div>
            )}

            <div className="sr-form-section-title" style={{ marginTop: 18 }}>Payment Plan</div>
            <div className="sr-form-group">
              <label className="sr-form-label">Installment Type</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['single', 'two', 'custom'] as const).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="installmentType" value={t} checked={newForm.installmentType === t} onChange={() => { setNewForm(f => ({ ...f, installmentType: t })); setInstallmentRows(t === 'custom' ? [{ label: '1st Installment', amount: 0, status: 'pending' }] : []); }} />
                    {t === 'single' ? 'Single Payment' : t === 'two' ? '2 Installments' : 'Custom Plan'}
                  </label>
                ))}
              </div>
            </div>
            {newForm.installmentType === 'two' && (
              <>
                <div className="sr-form-row">
                  <div className="sr-form-group"><label className="sr-form-label">1st Installment Label</label><input className="sr-form-input" value={newForm.inst1Label} onChange={e => setNewForm(f => ({ ...f, inst1Label: e.target.value }))} /></div>
                  <div className="sr-form-group"><label className="sr-form-label">Amount (₹)</label><input className="sr-form-input" type="number" placeholder="e.g. 20000" value={newForm.inst1Amount} onChange={e => setNewForm(f => ({ ...f, inst1Amount: e.target.value }))} /></div>
                  <div className="sr-form-group"><label className="sr-form-label">Due Date</label><input className="sr-form-input" type="date" value={newForm.inst1DueDate} onChange={e => setNewForm(f => ({ ...f, inst1DueDate: e.target.value }))} /></div>
                </div>
                <div className="sr-form-row">
                  <div className="sr-form-group"><label className="sr-form-label">2nd Installment Label</label><input className="sr-form-input" value={newForm.inst2Label} onChange={e => setNewForm(f => ({ ...f, inst2Label: e.target.value }))} /></div>
                  <div className="sr-form-group"><label className="sr-form-label">Amount (₹)</label><input className="sr-form-input" type="number" placeholder="e.g. 30000" value={newForm.inst2Amount} onChange={e => setNewForm(f => ({ ...f, inst2Amount: e.target.value }))} /></div>
                  <div className="sr-form-group"><label className="sr-form-label">Due Date</label><input className="sr-form-input" type="date" value={newForm.inst2DueDate} onChange={e => setNewForm(f => ({ ...f, inst2DueDate: e.target.value }))} /></div>
                </div>
              </>
            )}
            {newForm.installmentType === 'custom' && (
              <div style={{ marginBottom: 12 }}>
                {installmentRows.map((row, i) => (
                  <div key={i} className="sr-form-row" style={{ alignItems: 'flex-end' }}>
                    <div className="sr-form-group"><label className="sr-form-label">Label</label><input className="sr-form-input" value={row.label} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, label: e.target.value } : r))} /></div>
                    <div className="sr-form-group"><label className="sr-form-label">Amount (₹)</label><input className="sr-form-input" type="number" value={row.amount || ''} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, amount: Number(e.target.value) } : r))} /></div>
                    <div className="sr-form-group"><label className="sr-form-label">Due Date</label><input className="sr-form-input" type="date" value={row.dueDate || ''} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, dueDate: e.target.value } : r))} /></div>
                    <button className="sr-btn sr-btn-outline" style={{ marginBottom: 4, padding: '6px 10px' }} onClick={() => setInstallmentRows(rows => rows.filter((_, ri) => ri !== i))}>✕</button>
                  </div>
                ))}
                <button className="sr-btn sr-btn-outline" style={{ marginTop: 4 }} onClick={() => setInstallmentRows(rows => [...rows, { label: `Installment ${rows.length + 1}`, amount: 0, status: 'pending' }])}>+ Add Installment</button>
              </div>
            )}

            <div className="sr-form-group">
              <label className="sr-form-label">Notes</label>
              <textarea className="sr-form-textarea" placeholder="Internal notes..." value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setNewModal(false)}>Cancel</button>
              <button className="sr-btn sr-btn-primary" onClick={handleCreateReservation} disabled={submitting}>
                {submitting ? 'Creating...' : '🎟️ Reserve Seat & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PAYMENT MODAL ───────────────────────────────────────────── */}
      {paymentModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPaymentModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">💳 Add Payment<button className="sr-modal-close" onClick={() => setPaymentModal(null)}>✕</button></div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
              {getStudentName(paymentModal)} — <strong>{paymentModal.courseName}</strong><br />
              Balance: <strong style={{ color: '#dc2626' }}>₹{paymentModal.balanceAmount.toLocaleString('en-IN')}</strong>
            </p>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Amount (₹) *</label>
                <input className="sr-form-input" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Method *</label>
                <select className="sr-form-select" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {['cash', 'upi', 'bank_transfer', 'card', 'razorpay', 'phonepe', 'paytm', 'other'].map(m => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Transaction ID</label>
                <input className="sr-form-input" type="text" placeholder="UTR / Reference" value={payForm.transactionId} onChange={e => setPayForm(f => ({ ...f, transactionId: e.target.value }))} />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Installment / Label</label>
                <input className="sr-form-input" type="text" placeholder="First installment, Demo fee, etc." value={payForm.installmentLabel} onChange={e => setPayForm(f => ({ ...f, installmentLabel: e.target.value }))} />
              </div>
            </div>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Payment Proof URL</label>
                <input className="sr-form-input" type="url" placeholder="https://drive.google.com/..." value={payForm.proofUrl} onChange={e => setPayForm(f => ({ ...f, proofUrl: e.target.value }))} />
              </div>
            </div>
            <div className="sr-form-group">
              <label className="sr-form-label">Notes</label>
              <textarea className="sr-form-textarea" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setPaymentModal(null)}>Cancel</button>
              <button className="sr-btn sr-btn-success" onClick={handleAddPayment} disabled={submitting}>{submitting ? 'Saving...' : '✅ Record Payment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND EMAIL MODAL ────────────────────────────────────────────── */}
      {emailModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEmailModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">📧 Send Email — {getStudentName(emailModal)}<button className="sr-modal-close" onClick={() => setEmailModal(null)}>✕</button></div>
            {!getStudentEmail(emailModal) && (
              <div style={{ background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                ⚠️ No email address on this reservation.
              </div>
            )}
            <div className="sr-email-tabs">
              {(['confirmation', 'reminder', 'prejoining', 'joiningday', 'whatsapp'] as const).map(tab => (
                <button key={tab} className={`sr-email-tab ${emailTab === tab ? 'active' : ''}`} onClick={() => setEmailTab(tab)}>
                  {tab === 'confirmation' ? '✅ Confirm' : tab === 'reminder' ? '⏰ Reminder' : tab === 'prejoining' ? '🗓️ Pre-Join' : tab === 'joiningday' ? '🎉 Day 1' : '💬 WhatsApp'}
                </button>
              ))}
            </div>
            <div className="sr-email-desc">{EMAIL_DESC[emailTab]}</div>
            {emailTab === 'reminder' && (
              <>
                <div className="sr-form-group"><label className="sr-form-label">Payment Due Date</label><input className="sr-form-input" type="date" value={emailForm.dueDate} onChange={e => setEmailForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Custom Message</label><textarea className="sr-form-textarea" placeholder="Additional message..." value={emailForm.customMessage} onChange={e => setEmailForm(f => ({ ...f, customMessage: e.target.value }))} /></div>
              </>
            )}
            {emailTab === 'prejoining' && (
              <>
                <div className="sr-form-row">
                  <div className="sr-form-group"><label className="sr-form-label">Start Date</label><input className="sr-form-input" type="date" value={emailForm.batchStartDate} onChange={e => setEmailForm(f => ({ ...f, batchStartDate: e.target.value }))} /></div>
                  <div className="sr-form-group"><label className="sr-form-label">Timing</label><input className="sr-form-input" placeholder="7:00 PM – 9:00 PM" value={emailForm.batchStartTime} onChange={e => setEmailForm(f => ({ ...f, batchStartTime: e.target.value }))} /></div>
                </div>
                <div className="sr-form-group"><label className="sr-form-label">Venue</label><input className="sr-form-input" placeholder="Address or 'Online'" value={emailForm.venue} onChange={e => setEmailForm(f => ({ ...f, venue: e.target.value }))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Online Link</label><input className="sr-form-input" type="url" placeholder="https://meet.google.com/..." value={emailForm.onlineLink} onChange={e => setEmailForm(f => ({ ...f, onlineLink: e.target.value }))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Custom Message</label><textarea className="sr-form-textarea" placeholder="Special instructions..." value={emailForm.customMessage} onChange={e => setEmailForm(f => ({ ...f, customMessage: e.target.value }))} /></div>
              </>
            )}
            {emailTab === 'joiningday' && (
              <>
                <div className="sr-form-row">
                  <div className="sr-form-group"><label className="sr-form-label">Login Email</label><input className="sr-form-input" type="email" placeholder={getStudentEmail(emailModal)} value={emailForm.loginEmail} onChange={e => setEmailForm(f => ({ ...f, loginEmail: e.target.value }))} /></div>
                  <div className="sr-form-group"><label className="sr-form-label">Temp Password</label><input className="sr-form-input" placeholder="Temp password" value={emailForm.tempPassword} onChange={e => setEmailForm(f => ({ ...f, tempPassword: e.target.value }))} /></div>
                </div>
                <div className="sr-form-group"><label className="sr-form-label">Class Link</label><input className="sr-form-input" type="url" placeholder="https://meet.google.com/..." value={emailForm.onlineLink} onChange={e => setEmailForm(f => ({ ...f, onlineLink: e.target.value }))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Custom Message</label><textarea className="sr-form-textarea" placeholder="Welcome message..." value={emailForm.customMessage} onChange={e => setEmailForm(f => ({ ...f, customMessage: e.target.value }))} /></div>
              </>
            )}
            {emailTab === 'whatsapp' && (
              <>
                {!emailModal.studentPhone && (
                  <div style={{ background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                    ⚠️ No phone number on this reservation.
                  </div>
                )}
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                  Phone: <strong>{emailModal.studentPhone || '—'}</strong> &nbsp;|&nbsp; Balance: <strong style={{ color: '#dc2626' }}>₹{emailModal.balanceAmount?.toLocaleString('en-IN')}</strong>
                </p>
                <div className="sr-form-group">
                  <label className="sr-form-label">Custom Message (optional)</label>
                  <textarea className="sr-form-textarea" rows={5} placeholder="Leave blank to use default reminder message..." value={whatsappMsg} onChange={e => setWhatsappMsg(e.target.value)} />
                </div>
              </>
            )}
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setEmailModal(null)}>Cancel</button>
              {emailTab === 'whatsapp' ? (
                <button className="sr-btn sr-btn-primary" onClick={handleSendWhatsApp} disabled={submitting || !emailModal.studentPhone}>
                  {submitting ? 'Sending...' : '💬 Send WhatsApp'}
                </button>
              ) : (
                <button className="sr-btn sr-btn-primary" onClick={handleSendEmail} disabled={submitting || !getStudentEmail(emailModal)}>
                  {submitting ? 'Sending...' : '📤 Send Email'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {refundModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRefundModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">↩️ Record Refund<button className="sr-modal-close" onClick={() => setRefundModal(null)}>✕</button></div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
              {getStudentName(refundModal)} — <strong>{refundModal.courseName}</strong>
            </p>
            <div className="sr-form-group">
              <label className="sr-form-label">Refund Amount (₹) *</label>
              <input className="sr-form-input" type="number" value={refundForm.amount} onChange={e => setRefundForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter refund amount" />
            </div>
            <div className="sr-form-group">
              <label className="sr-form-label">Refund Reason</label>
              <textarea className="sr-form-textarea" value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for refund (optional)" />
            </div>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setRefundModal(null)}>Cancel</button>
              <button className="sr-btn sr-btn-success" onClick={handleRefund} disabled={submitting || !refundForm.amount}>
                {submitting ? 'Recording...' : '↩️ Record Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CANCEL MODAL ───────────────────────────────────────────────── */}
      {cancelModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">❌ Cancel Reservation<button className="sr-modal-close" onClick={() => setCancelModal(null)}>✕</button></div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Cancel for <strong>{getStudentName(cancelModal)}</strong> — {cancelModal.courseName}?</p>
            <div className="sr-form-group">
              <label className="sr-form-label">Reason *</label>
              <textarea className="sr-form-textarea" placeholder="Enter reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setCancelModal(null)}>Go Back</button>
              <button className="sr-btn sr-btn-danger" onClick={handleCancel} disabled={submitting || !cancelReason.trim()}>{submitting ? 'Cancelling...' : '❌ Confirm Cancel'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── INSTALLMENT PLAN MODAL ─────────────────────────────────────── */}
      {installmentModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setInstallmentModal(null); setInstallmentRows([]); } }}>
          <div className="sr-modal sr-modal-wide">
            <div className="sr-modal-title">📋 Installment Plan — {getStudentName(installmentModal)}<button className="sr-modal-close" onClick={() => { setInstallmentModal(null); setInstallmentRows([]); }}>✕</button></div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {installmentModal.courseName} &nbsp;|&nbsp; Total: <strong>₹{installmentModal.finalPrice?.toLocaleString('en-IN')}</strong> &nbsp;|&nbsp; Paid: <strong style={{ color: '#15803d' }}>₹{installmentModal.paidAmount?.toLocaleString('en-IN')}</strong> &nbsp;|&nbsp; Balance: <strong style={{ color: '#dc2626' }}>₹{installmentModal.balanceAmount?.toLocaleString('en-IN')}</strong>
            </p>
            {installmentRows.map((row, i) => (
              <div key={i} className="sr-form-row" style={{ alignItems: 'flex-end', background: row.status === 'paid' ? '#f0fdf4' : row.status === 'overdue' ? '#fff1f2' : '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div className="sr-form-group"><label className="sr-form-label">Label</label><input className="sr-form-input" value={row.label} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, label: e.target.value } : r))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Amount (₹)</label><input className="sr-form-input" type="number" value={row.amount || ''} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, amount: Number(e.target.value) } : r))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Due Date</label><input className="sr-form-input" type="date" value={row.dueDate ? row.dueDate.split('T')[0] : ''} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, dueDate: e.target.value } : r))} /></div>
                <div className="sr-form-group"><label className="sr-form-label">Status</label>
                  <select className="sr-form-select" value={row.status} onChange={e => setInstallmentRows(rows => rows.map((r, ri) => ri === i ? { ...r, status: e.target.value as InstallmentStatus } : r))}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <button className="sr-btn sr-btn-outline" style={{ padding: '6px 10px', marginBottom: 4 }} onClick={() => setInstallmentRows(rows => rows.filter((_, ri) => ri !== i))}>✕</button>
              </div>
            ))}
            <button className="sr-btn sr-btn-outline" style={{ marginTop: 4, marginBottom: 16 }} onClick={() => setInstallmentRows(rows => [...rows, { label: `Installment ${rows.length + 1}`, amount: 0, status: 'pending' }])}>+ Add Installment</button>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => { setInstallmentModal(null); setInstallmentRows([]); }}>Cancel</button>
              <button className="sr-btn sr-btn-primary" onClick={handleSaveInstallmentPlan} disabled={submitting}>{submitting ? 'Saving...' : '💾 Save Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEMO STATUS MODAL ──────────────────────────────────────────── */}
      {demoModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDemoModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">🔬 Demo Period — {getStudentName(demoModal)}<button className="sr-modal-close" onClick={() => setDemoModal(null)}>✕</button></div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: '#64748b', fontSize: 13 }}>Course</span><strong>{demoModal.courseName}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: '#64748b', fontSize: 13 }}>Demo Days</span><strong>{demoModal.demoPeriodDays} days</strong></div>
              {demoModal.demoStartDate && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: '#64748b', fontSize: 13 }}>Demo Started</span><strong>{new Date(demoModal.demoStartDate).toLocaleDateString('en-IN')}</strong></div>}
              {demoModal.demoEndDate && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b', fontSize: 13 }}>Demo Ends</span><strong>{new Date(demoModal.demoEndDate).toLocaleDateString('en-IN')}</strong></div>}
            </div>
            <div className="sr-form-group">
              <label className="sr-form-label">Update Demo Status</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['active', 'satisfied', 'refunded'] as const).map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 8, border: `2px solid ${demoStatusVal === s ? '#7c3aed' : '#e2e8f0'}`, background: demoStatusVal === s ? '#ede9fe' : '#fff' }}>
                    <input type="radio" name="demoStatus" value={s} checked={demoStatusVal === s} onChange={() => setDemoStatusVal(s)} style={{ display: 'none' }} />
                    {s === 'active' ? '🔬 Active' : s === 'satisfied' ? '✅ Satisfied' : '↩️ Refunded'}
                  </label>
                ))}
              </div>
            </div>
            {demoStatusVal === 'refunded' && <div style={{ background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 12 }}>⚠️ Mark demo as refunded after recording the actual refund using "Record Refund" on the reservation.</div>}
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setDemoModal(null)}>Cancel</button>
              <button className="sr-btn sr-btn-primary" onClick={handleUpdateDemoStatus} disabled={submitting}>{submitting ? 'Saving...' : '✅ Update Status'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL VIEW MODAL ─────────────────────────────────────────── */}
      {detailModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDetailModal(null); }}>
          <div className="sr-modal sr-modal-wide">
            <div className="sr-modal-title">🔍 Reservation Details<button className="sr-modal-close" onClick={() => setDetailModal(null)}>✕</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Student</div>
                <div style={{ fontSize: 13, marginBottom: 4 }}><strong>{getStudentName(detailModal)}</strong></div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{getStudentEmail(detailModal)}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{getStudentPhone(detailModal)}</div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Course</div>
                <div style={{ fontSize: 13, marginBottom: 4 }}><strong>{detailModal.courseName}</strong></div>
                {detailModal.batchName && <div style={{ fontSize: 13, color: '#64748b' }}>{detailModal.batchName}</div>}
                {detailModal.seatNumber && <div style={{ fontSize: 13, color: '#64748b' }}>Seat: {detailModal.seatNumber}</div>}
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Fee Breakdown</div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Original Fee</span><strong>₹{detailModal.originalPrice?.toLocaleString('en-IN')}</strong></div>
                {detailModal.discountAmount > 0 && <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Discount {detailModal.discountReason ? `(${detailModal.discountReason})` : ''}</span><strong style={{ color: '#15803d' }}>-₹{detailModal.discountAmount?.toLocaleString('en-IN')}</strong></div>}
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4, borderTop: '1px solid #e2e8f0', paddingTop: 4 }}><span>Net Payable</span><strong>₹{detailModal.finalPrice?.toLocaleString('en-IN')}</strong></div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Paid</span><strong style={{ color: '#15803d' }}>₹{detailModal.paidAmount?.toLocaleString('en-IN')}</strong></div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>Balance</span><strong style={{ color: detailModal.balanceAmount > 0 ? '#dc2626' : '#15803d' }}>₹{detailModal.balanceAmount?.toLocaleString('en-IN')}</strong></div>
              </div>
              {detailModal.demoEnabled && (
                <div style={{ background: '#fdf4ff', borderRadius: 10, padding: 14, border: '1.5px solid #e9d5ff' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Demo Period</div>
                  <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Duration</span><strong>{detailModal.demoPeriodDays} days</strong></div>
                  {detailModal.demoStartDate && <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Started</span><strong>{new Date(detailModal.demoStartDate).toLocaleDateString('en-IN')}</strong></div>}
                  {detailModal.demoEndDate && <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Ends</span><strong>{new Date(detailModal.demoEndDate).toLocaleDateString('en-IN')}</strong></div>}
                  <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>Status</span><strong>{detailModal.demoStatus}</strong></div>
                </div>
              )}
            </div>
            {detailModal.payments?.length > 0 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Payment History</div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 16 }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{['Date','Amount','Method','TXN ID','Installment','Proof'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detailModal.payments.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                        <td style={{ padding: '8px 10px' }}>{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px 10px' }}>{p.method}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.transactionId || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{p.installmentLabel || '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{p.proofUrl ? <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed' }}>View</a> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {detailModal.installmentPlan?.length > 0 && (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Installment Plan</div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 16 }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{['Label','Amount','Due Date','Status'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detailModal.installmentPlan.map((inst, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f4f8', background: inst.status === 'paid' ? '#f0fdf4' : inst.status === 'overdue' ? '#fff1f2' : '' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{inst.label}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>₹{inst.amount?.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: inst.status === 'paid' ? '#dcfce7' : inst.status === 'overdue' ? '#fee2e2' : '#fef3c7', color: inst.status === 'paid' ? '#15803d' : inst.status === 'overdue' ? '#dc2626' : '#d97706' }}>{inst.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatReservationsPage;
