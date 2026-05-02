import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { seatReservationApi } from '../../api';
import './SeatReservations.css';

// ── Types ────────────────────────────────────────────────────────────────────

type ReservationStatus = 'pending' | 'partial_paid' | 'paid' | 'confirmed' | 'enrolled' | 'cancelled' | 'expired';

interface Payment {
  _id: string;
  amount: number;
  method: string;
  transactionId?: string;
  paidAt: string;
  receiptNumber?: string;
}

interface Reservation {
  _id: string;
  leadId: { _id: string; name?: string; firstName?: string; lastName?: string; phone?: string; email?: string; };
  courseName: string;
  batchName?: string;
  seatNumber?: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  paidAmount: number;
  balanceAmount: number;
  payments: Payment[];
  status: ReservationStatus;
  reservedAt: string;
  expiresAt?: string;
  createdBy?: { firstName?: string; lastName?: string; };
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

function leadName(r: Reservation): string {
  if (!r.leadId) return 'Unknown';
  const l = r.leadId;
  if (l.name) return l.name;
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || 'Unknown';
}

// ── Component ────────────────────────────────────────────────────────────────

const SeatReservationsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [paymentModal, setPaymentModal] = useState<Reservation | null>(null);
  const [emailModal, setEmailModal] = useState<Reservation | null>(null);
  const [cancelModal, setCancelModal] = useState<Reservation | null>(null);
  const [emailTab, setEmailTab] = useState<'confirmation' | 'reminder' | 'prejoining' | 'joiningday'>('confirmation');

  // Payment form
  const [payForm, setPayForm] = useState({ amount: '', method: 'upi', transactionId: '', notes: '' });

  // Email form
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
    setTimeout(() => setAlert(null), 3500);
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
    } catch (err) {
      showAlert('error', 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openDropdown) {
        const el = dropdownWrapRef.current[openDropdown];
        if (el && !el.contains(e.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  const filteredReservations = reservations.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      leadName(r).toLowerCase().includes(q) ||
      r.courseName.toLowerCase().includes(q) ||
      (r.leadId?.phone || '').includes(q) ||
      (r.leadId?.email || '').toLowerCase().includes(q)
    );
  });

  // ── Stats helpers ──────────────────────────────────────────────────────────
  function statCount(status: string): number {
    if (!stats?.byStatus) return 0;
    const found = stats.byStatus.find((s: any) => s._id === status);
    return found?.count || 0;
  }
  const totalRevenue = stats?.totals?.totalRevenue || 0;
  const pendingRevenue = stats?.totals?.pendingRevenue || 0;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAddPayment = async () => {
    if (!paymentModal) return;
    if (!payForm.amount || isNaN(Number(payForm.amount))) {
      showAlert('error', 'Enter a valid amount'); return;
    }
    setSubmitting(true);
    try {
      await seatReservationApi.addPayment(paymentModal._id, {
        amount: Number(payForm.amount),
        method: payForm.method,
        transactionId: payForm.transactionId || undefined,
        notes: payForm.notes || undefined,
      });
      showAlert('success', 'Payment recorded successfully');
      setPaymentModal(null);
      setPayForm({ amount: '', method: 'upi', transactionId: '', notes: '' });
      fetchData();
    } catch (err) {
      showAlert('error', 'Failed to add payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailModal) return;
    setSubmitting(true);
    try {
      let resp;
      if (emailTab === 'confirmation') {
        resp = await seatReservationApi.sendConfirmation(emailModal._id);
      } else if (emailTab === 'reminder') {
        resp = await seatReservationApi.sendPaymentReminder(emailModal._id, {
          dueDate: emailForm.dueDate || undefined,
          customMessage: emailForm.customMessage || undefined,
        });
      } else if (emailTab === 'prejoining') {
        resp = await seatReservationApi.sendPreJoiningInfo(emailModal._id, {
          batchStartDate: emailForm.batchStartDate || undefined,
          batchStartTime: emailForm.batchStartTime || undefined,
          venue: emailForm.venue || undefined,
          onlineLink: emailForm.onlineLink || undefined,
          customMessage: emailForm.customMessage || undefined,
        });
      } else {
        resp = await seatReservationApi.sendJoiningDay(emailModal._id, {
          loginEmail: emailForm.loginEmail || undefined,
          tempPassword: emailForm.tempPassword || undefined,
          onlineLink: emailForm.onlineLink || undefined,
          customMessage: emailForm.customMessage || undefined,
        });
      }
      showAlert('success', resp?.data?.message || 'Email sent successfully');
      setEmailModal(null);
      setEmailForm({ dueDate: '', customMessage: '', batchStartDate: '', batchStartTime: '', venue: '', onlineLink: '', loginEmail: '', tempPassword: '' });
    } catch (err) {
      showAlert('error', 'Failed to send email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReceipt = async (id: string) => {
    try {
      const resp = await seatReservationApi.sendReceipt(id);
      showAlert('success', resp?.data?.message || 'Receipt sent');
    } catch {
      showAlert('error', 'Failed to send receipt');
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setSubmitting(true);
    try {
      await seatReservationApi.cancel(cancelModal._id, cancelReason);
      showAlert('success', 'Reservation cancelled');
      setCancelModal(null);
      setCancelReason('');
      fetchData();
    } catch {
      showAlert('error', 'Failed to cancel reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (r: Reservation) => {
    if (!window.confirm(`Convert ${leadName(r)} to student? This will create a portal login.`)) return;
    try {
      const resp = await seatReservationApi.convertToStudent(r._id);
      showAlert('success', `Student account created: ${resp?.data?.data?.student?.email || 'done'}`);
      fetchData();
    } catch (err: any) {
      showAlert('error', err?.message || 'Failed to convert to student');
    }
  };

  // ── Email tab descriptions ─────────────────────────────────────────────────
  const EMAIL_DESC = {
    confirmation: '📩 Sends booking confirmation with course, seat, and payment summary. Auto-sent when seat is reserved.',
    reminder: '⏰ Sends payment reminder with outstanding balance and payment options.',
    prejoining: '🗓️ Sends batch start date, timings, venue/link, documents needed, and pre-joining checklist.',
    joiningday: '🎉 Welcome email on Day 1 with portal login credentials and class schedule.',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sr-page">
      {alert && <div className={`sr-alert ${alert.type}`}>{alert.msg}</div>}

      {/* Header */}
      <div className="sr-header">
        <div>
          <h1 className="sr-header-title">🎟️ Seat Reservations</h1>
          <p className="sr-header-sub">Manage reservations, payments, and student onboarding emails</p>
        </div>
        <div className="sr-header-actions">
          <button className="sr-btn sr-btn-outline" onClick={fetchData}>🔄 Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="sr-stats">
        <div className="sr-stat-card purple">
          <div className="sr-stat-val">{stats?.totals?.totalReservations || 0}</div>
          <div className="sr-stat-label">Total Reservations</div>
        </div>
        <div className="sr-stat-card amber">
          <div className="sr-stat-val">{statCount('pending') + statCount('partial_paid')}</div>
          <div className="sr-stat-label">Pending Payment</div>
        </div>
        <div className="sr-stat-card green">
          <div className="sr-stat-val">{statCount('paid') + statCount('confirmed')}</div>
          <div className="sr-stat-label">Fully Paid</div>
        </div>
        <div className="sr-stat-card blue">
          <div className="sr-stat-val">{statCount('enrolled')}</div>
          <div className="sr-stat-label">Enrolled</div>
        </div>
        <div className="sr-stat-card green">
          <div className="sr-stat-val">₹{(totalRevenue / 1000).toFixed(0)}K</div>
          <div className="sr-stat-label">Revenue Collected</div>
        </div>
        <div className="sr-stat-card amber">
          <div className="sr-stat-val">₹{(pendingRevenue / 1000).toFixed(0)}K</div>
          <div className="sr-stat-label">Pending Balance</div>
        </div>
      </div>

      {/* Filters */}
      <div className="sr-filters">
        <div className="sr-search">
          <input
            type="text"
            placeholder="Search name, course, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sr-filter-tabs">
          {(['all', 'pending', 'partial_paid', 'paid', 'confirmed', 'enrolled', 'cancelled'] as const).map(s => (
            <button
              key={s}
              className={`sr-filter-tab ${statusFilter === s ? 'active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s as ReservationStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="sr-loading"><div className="sr-spinner" /><p>Loading reservations...</p></div>
      ) : filteredReservations.length === 0 ? (
        <div className="sr-empty">
          <div className="sr-empty-icon">🎟️</div>
          <p>No reservations found{statusFilter !== 'all' ? ` for status "${statusFilter}"` : ''}.</p>
          <p style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>Create a reservation from any Lead's detail page.</p>
        </div>
      ) : (
        <>
          <div className="sr-table-wrap">
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Student / Lead</th>
                  <th>Course & Batch</th>
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
                        <span className="sr-lead-name">{leadName(r)}</span>
                        <span className="sr-lead-contact">{r.leadId?.phone || r.leadId?.email || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="sr-course-name">{r.courseName}</div>
                      {r.batchName && <div className="sr-batch-name">{r.batchName}</div>}
                    </td>
                    <td>{r.seatNumber || '—'}</td>
                    <td className="sr-amount-cell">
                      <div className="sr-amount-main">₹{r.finalPrice.toLocaleString('en-IN')}</div>
                      {r.paidAmount > 0 && (
                        <div className="sr-amount-paid">Paid: ₹{r.paidAmount.toLocaleString('en-IN')}</div>
                      )}
                      {r.balanceAmount > 0 && (
                        <div className="sr-amount-balance">Due: ₹{r.balanceAmount.toLocaleString('en-IN')}</div>
                      )}
                    </td>
                    <td><span className={`sr-badge ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                    <td>{new Date(r.reservedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="sr-actions-cell">
                      <div
                        ref={(el) => { dropdownWrapRef.current[r._id] = el; }}
                        style={{ position: 'relative', display: 'inline-block' }}
                      >
                      <button
                        className="sr-actions-btn"
                        onClick={() => setOpenDropdown(openDropdown === r._id ? null : r._id)}
                      >
                        Actions ▾
                      </button>
                      {openDropdown === r._id && (
                        <div className="sr-dropdown">
                          <button className="sr-dropdown-item" onClick={() => { navigate(`/leads/${r.leadId?._id}`); setOpenDropdown(null); }}>
                            👤 View Lead
                          </button>
                          <div className="sr-dropdown-divider" />
                          {!['enrolled', 'cancelled', 'expired'].includes(r.status) && (
                            <button className="sr-dropdown-item" onClick={() => { setPaymentModal(r); setOpenDropdown(null); }}>
                              💳 Add Payment
                            </button>
                          )}
                          {r.paidAmount > 0 && (
                            <button className="sr-dropdown-item" onClick={() => { handleSendReceipt(r._id); setOpenDropdown(null); }}>
                              🧾 Send Receipt
                            </button>
                          )}
                          <button className="sr-dropdown-item" onClick={() => { setEmailModal(r); setEmailTab('confirmation'); setOpenDropdown(null); }}>
                            📧 Send Email
                          </button>
                          <div className="sr-dropdown-divider" />
                          {isAdmin && r.status !== 'enrolled' && r.status !== 'cancelled' && (
                            <button className="sr-dropdown-item" onClick={() => { handleConvert(r); setOpenDropdown(null); }}>
                              🎓 Convert to Student
                            </button>
                          )}
                          {!['enrolled', 'cancelled'].includes(r.status) && (
                            <button className="sr-dropdown-item danger" onClick={() => { setCancelModal(r); setOpenDropdown(null); }}>
                              ❌ Cancel Reservation
                            </button>
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

          {/* Pagination */}
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

      {/* ── Add Payment Modal ───────────────────────────────────────────── */}
      {paymentModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPaymentModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">
              💳 Add Payment
              <button className="sr-modal-close" onClick={() => setPaymentModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
              {leadName(paymentModal)} — <strong>{paymentModal.courseName}</strong><br />
              Balance due: <strong style={{ color: '#dc2626' }}>₹{paymentModal.balanceAmount.toLocaleString('en-IN')}</strong>
            </p>
            <div className="sr-form-row">
              <div className="sr-form-group">
                <label className="sr-form-label">Amount (₹) *</label>
                <input className="sr-form-input" type="number" placeholder="Enter amount" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="sr-form-group">
                <label className="sr-form-label">Payment Method *</label>
                <select className="sr-form-select" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {['cash', 'upi', 'bank_transfer', 'card', 'razorpay', 'phonepe', 'paytm', 'other'].map(m => (
                    <option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sr-form-group">
              <label className="sr-form-label">Transaction ID</label>
              <input className="sr-form-input" type="text" placeholder="UTR / Transaction reference" value={payForm.transactionId} onChange={e => setPayForm(f => ({ ...f, transactionId: e.target.value }))} />
            </div>
            <div className="sr-form-group">
              <label className="sr-form-label">Notes</label>
              <textarea className="sr-form-textarea" placeholder="Any additional notes..." value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setPaymentModal(null)}>Cancel</button>
              <button className="sr-btn sr-btn-success" onClick={handleAddPayment} disabled={submitting}>
                {submitting ? 'Saving...' : '✅ Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send Email Modal ───────────────────────────────────────────── */}
      {emailModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEmailModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">
              📧 Send Email — {leadName(emailModal)}
              <button className="sr-modal-close" onClick={() => setEmailModal(null)}>✕</button>
            </div>
            {!emailModal.leadId?.email && (
              <div style={{ background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                ⚠️ This lead has no email address. Email cannot be sent.
              </div>
            )}
            <div className="sr-email-tabs">
              {(['confirmation', 'reminder', 'prejoining', 'joiningday'] as const).map(tab => (
                <button
                  key={tab}
                  className={`sr-email-tab ${emailTab === tab ? 'active' : ''}`}
                  onClick={() => setEmailTab(tab)}
                >
                  {tab === 'confirmation' ? '✅ Confirmation' : tab === 'reminder' ? '⏰ Reminder' : tab === 'prejoining' ? '🗓️ Pre-Joining' : '🎉 Joining Day'}
                </button>
              ))}
            </div>
            <div className="sr-email-desc">{EMAIL_DESC[emailTab]}</div>

            {emailTab === 'reminder' && (
              <>
                <div className="sr-form-group">
                  <label className="sr-form-label">Payment Due Date</label>
                  <input className="sr-form-input" type="date" value={emailForm.dueDate} onChange={e => setEmailForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="sr-form-group">
                  <label className="sr-form-label">Custom Message (optional)</label>
                  <textarea className="sr-form-textarea" placeholder="Additional message to include..." value={emailForm.customMessage} onChange={e => setEmailForm(f => ({ ...f, customMessage: e.target.value }))} />
                </div>
              </>
            )}

            {emailTab === 'prejoining' && (
              <>
                <div className="sr-form-row">
                  <div className="sr-form-group">
                    <label className="sr-form-label">Batch Start Date</label>
                    <input className="sr-form-input" type="date" value={emailForm.batchStartDate} onChange={e => setEmailForm(f => ({ ...f, batchStartDate: e.target.value }))} />
                  </div>
                  <div className="sr-form-group">
                    <label className="sr-form-label">Class Timing</label>
                    <input className="sr-form-input" type="text" placeholder="e.g. 7:00 PM – 9:00 PM" value={emailForm.batchStartTime} onChange={e => setEmailForm(f => ({ ...f, batchStartTime: e.target.value }))} />
                  </div>
                </div>
                <div className="sr-form-group">
                  <label className="sr-form-label">Venue / Address</label>
                  <input className="sr-form-input" type="text" placeholder="Office address or 'Online'" value={emailForm.venue} onChange={e => setEmailForm(f => ({ ...f, venue: e.target.value }))} />
                </div>
                <div className="sr-form-group">
                  <label className="sr-form-label">Online Join Link</label>
                  <input className="sr-form-input" type="url" placeholder="https://meet.google.com/..." value={emailForm.onlineLink} onChange={e => setEmailForm(f => ({ ...f, onlineLink: e.target.value }))} />
                </div>
                <div className="sr-form-group">
                  <label className="sr-form-label">Custom Message (optional)</label>
                  <textarea className="sr-form-textarea" placeholder="Any special instructions..." value={emailForm.customMessage} onChange={e => setEmailForm(f => ({ ...f, customMessage: e.target.value }))} />
                </div>
              </>
            )}

            {emailTab === 'joiningday' && (
              <>
                <div className="sr-form-row">
                  <div className="sr-form-group">
                    <label className="sr-form-label">Login Email</label>
                    <input className="sr-form-input" type="email" placeholder="student@example.com" value={emailForm.loginEmail} onChange={e => setEmailForm(f => ({ ...f, loginEmail: e.target.value }))} />
                  </div>
                  <div className="sr-form-group">
                    <label className="sr-form-label">Temp Password</label>
                    <input className="sr-form-input" type="text" placeholder="Temporary password" value={emailForm.tempPassword} onChange={e => setEmailForm(f => ({ ...f, tempPassword: e.target.value }))} />
                  </div>
                </div>
                <div className="sr-form-group">
                  <label className="sr-form-label">Today's Class Link</label>
                  <input className="sr-form-input" type="url" placeholder="https://meet.google.com/..." value={emailForm.onlineLink} onChange={e => setEmailForm(f => ({ ...f, onlineLink: e.target.value }))} />
                </div>
                <div className="sr-form-group">
                  <label className="sr-form-label">Custom Message (optional)</label>
                  <textarea className="sr-form-textarea" placeholder="Welcome message or instructions..." value={emailForm.customMessage} onChange={e => setEmailForm(f => ({ ...f, customMessage: e.target.value }))} />
                </div>
              </>
            )}

            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setEmailModal(null)}>Cancel</button>
              <button
                className="sr-btn sr-btn-primary"
                onClick={handleSendEmail}
                disabled={submitting || !emailModal.leadId?.email}
              >
                {submitting ? 'Sending...' : '📤 Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ───────────────────────────────────────────────── */}
      {cancelModal && (
        <div className="sr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelModal(null); }}>
          <div className="sr-modal">
            <div className="sr-modal-title">
              ❌ Cancel Reservation
              <button className="sr-modal-close" onClick={() => setCancelModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Cancel reservation for <strong>{leadName(cancelModal)}</strong> — {cancelModal.courseName}?
            </p>
            <div className="sr-form-group">
              <label className="sr-form-label">Reason for Cancellation</label>
              <textarea className="sr-form-textarea" placeholder="Enter reason (required)..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="sr-modal-actions">
              <button className="sr-btn sr-btn-outline" onClick={() => setCancelModal(null)}>Go Back</button>
              <button className="sr-btn sr-btn-danger" onClick={handleCancel} disabled={submitting || !cancelReason.trim()}>
                {submitting ? 'Cancelling...' : '❌ Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatReservationsPage;
