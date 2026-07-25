import React, { useState, useEffect, useMemo } from 'react';
import { seatReservationApi } from '../../api';
import { feeApi } from '../../api/feeApi';
import { useStudentFeatures } from '../../contexts/StudentFeaturesContext';
import FeeDetails from '../../components/profile/FeeDetails';
import PayFeesCard from './PayFeesCard';
import './StudentFeeDetails.css';

interface PaymentEntry {
  _id: string;
  amount: number;
  method: string;
  transactionId?: string;
  paidAt: string;
  notes?: string;
  proofUrl?: string;
  installmentLabel?: string;
}

interface RefundEntry {
  _id: string;
  amount: number;
  reason?: string;
  refundedAt: string;
}

interface InstallmentEntry {
  label: string;
  amount: number;
  dueDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
}

interface StudentReservation {
  _id: string;
  courseName: string;
  batchName?: string;
  seatNumber?: string;
  originalPrice: number;
  discountAmount: number;
  discountReason?: string;
  finalPrice: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  reservedAt: string;
  payments: PaymentEntry[];
  refunds?: RefundEntry[];
  notes?: string;
  demoEnabled?: boolean;
  demoPeriodDays?: number;
  demoStartDate?: string;
  demoEndDate?: string;
  demoStatus?: string;
  installmentPlan?: InstallmentEntry[];
}

const StudentFeeDetailsPage: React.FC = () => {
  const { isFeatureEnabled } = useStudentFeatures();
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<StudentReservation[]>([]);
  const [error, setError] = useState('');
  const [receiptBusy, setReceiptBusy] = useState<'' | 'print' | 'email'>('');
  const [notice, setNotice] = useState('');

  const printReceipt = async () => {
    setReceiptBusy('print');
    setNotice('');
    try {
      const res = await feeApi.getMyReceipt(false);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><head><title>Fee Receipt</title></head><body>${res.data.data.html}<script>window.onload=function(){window.print();}</script></body></html>`);
        w.document.close();
      }
    } catch (err: any) {
      setNotice(err?.response?.data?.message || 'No receipt available yet.');
    } finally {
      setReceiptBusy('');
    }
  };

  const emailReceipt = async () => {
    setReceiptBusy('email');
    setNotice('');
    try {
      await feeApi.getMyReceipt(true);
      setNotice('✉️ Receipt emailed to you.');
    } catch (err: any) {
      setNotice(err?.response?.data?.message || 'Could not email the receipt.');
    } finally {
      setReceiptBusy('');
    }
  };

  useEffect(() => {
    const loadReservations = async () => {
      setLoading(true);
      try {
        const resp = await seatReservationApi.getMyReservations();
        setReservations(resp?.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load your fee details');
      } finally {
        setLoading(false);
      }
    };

    loadReservations();
  }, []);

  const totals = useMemo(() => {
    const totalFee = reservations.reduce((sum, r) => sum + (r.finalPrice || 0), 0);
    const totalPaid = reservations.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
    const totalBalance = reservations.reduce((sum, r) => sum + (r.balanceAmount || 0), 0);
    return { totalFee, totalPaid, totalBalance };
  }, [reservations]);

  if (!isFeatureEnabled('feeDetails')) {
    return (
      <div className="sfd-page">
        <div className="sfd-message">
          <h2>Fee Details are not available</h2>
          <p>Your administrator has not enabled fee visibility for students yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sfd-page">
      <div className="sfd-header">
        <div>
          <h1>Fee Details</h1>
          <p>View your reservation ledger, payments, receipts, and the latest balance.</p>
        </div>
        <div className="sfd-header-actions">
          <button className="sfd-btn" onClick={printReceipt} disabled={receiptBusy !== ''}>
            {receiptBusy === 'print' ? 'Preparing…' : '🧾 Download Receipt'}
          </button>
          <button className="sfd-btn ghost" onClick={emailReceipt} disabled={receiptBusy !== ''}>
            {receiptBusy === 'email' ? 'Sending…' : '✉️ Email me a copy'}
          </button>
        </div>
      </div>

      {notice && <div className="sfd-notice">{notice}</div>}
      {error && <div className="sfd-error">{error}</div>}

      <PayFeesCard />

      {loading ? (
        <div className="sfd-loading">Loading fee details...</div>
      ) : (
        <>
          <FeeDetails
            data={{
              totalFee: totals.totalFee,
              paidAmount: totals.totalPaid,
              pendingAmount: totals.totalBalance,
            }}
          />

          {reservations.length === 0 ? (
            <div className="sfd-empty">
              <p>No fee reservations found. Please contact your administrator for help.</p>
            </div>
          ) : (
            <div className="sfd-reservations">
              {reservations.map(reservation => (
                <div key={reservation._id} className="sfd-card">
                  <div className="sfd-card-header">
                    <div>
                      <h3>{reservation.courseName}</h3>
                      {reservation.batchName && <p className="sfd-meta">Batch: {reservation.batchName}</p>}
                      <p className="sfd-meta">Status: <span style={{ textTransform: 'capitalize' }}>{reservation.status.replace(/_/g, ' ')}</span></p>
                      {reservation.demoEnabled && (
                        <p className="sfd-meta" style={{ color: reservation.demoStatus === 'satisfied' ? '#15803d' : reservation.demoStatus === 'refunded' ? '#dc2626' : '#7c3aed' }}>
                          Demo: {reservation.demoStatus} ({reservation.demoPeriodDays} days)
                          {reservation.demoEndDate && ` · ends ${new Date(reservation.demoEndDate).toLocaleDateString('en-IN')}`}
                        </p>
                      )}
                    </div>
                    <div className="sfd-card-amounts">
                      {reservation.discountAmount > 0 && <span style={{ color: '#15803d', fontSize: 12 }}>Discount: -₹{reservation.discountAmount.toLocaleString('en-IN')}{reservation.discountReason ? ` (${reservation.discountReason})` : ''}</span>}
                      <span>Payable: ₹{reservation.finalPrice.toLocaleString('en-IN')}</span>
                      <span>Paid: ₹{reservation.paidAmount.toLocaleString('en-IN')}</span>
                      <span style={{ color: reservation.balanceAmount > 0 ? '#dc2626' : '#15803d' }}>Balance: ₹{reservation.balanceAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="sfd-card-body">
                    <div className="sfd-grid-row">
                      <div><strong>Seat</strong><br />{reservation.seatNumber || 'Not assigned'}</div>
                      <div><strong>Reserved On</strong><br />{new Date(reservation.reservedAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    {reservation.notes && (
                      <div className="sfd-notes">
                        <strong>Admin Notes:</strong> {reservation.notes}
                      </div>
                    )}

                    {reservation.installmentPlan && reservation.installmentPlan.length > 0 && (
                      <div className="sfd-subsection">
                        <h4>Installment Plan</h4>
                        <div className="sfd-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Installment</th>
                                <th>Amount</th>
                                <th>Due Date</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reservation.installmentPlan.map((inst, i) => (
                                <tr key={i} style={{ background: inst.status === 'paid' ? '#f0fdf4' : inst.status === 'overdue' ? '#fff1f2' : '' }}>
                                  <td style={{ fontWeight: 600 }}>{inst.label}</td>
                                  <td>₹{inst.amount.toLocaleString('en-IN')}</td>
                                  <td>{inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                                  <td>
                                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: inst.status === 'paid' ? '#dcfce7' : inst.status === 'overdue' ? '#fee2e2' : '#fef3c7', color: inst.status === 'paid' ? '#15803d' : inst.status === 'overdue' ? '#dc2626' : '#d97706' }}>
                                      {inst.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {reservation.payments?.length > 0 && (
                      <div className="sfd-subsection">
                        <h4>Payment History</h4>
                        <div className="sfd-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Mode</th>
                                <th>TXN / Reference</th>
                                <th>Proof</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reservation.payments.map(payment => (
                                <tr key={payment._id}>
                                  <td>{new Date(payment.paidAt).toLocaleDateString('en-IN')}</td>
                                  <td>₹{payment.amount.toLocaleString('en-IN')}</td>
                                  <td>{payment.method.replace(/_/g, ' ')}</td>
                                  <td>{payment.transactionId || payment.installmentLabel || '—'}</td>
                                  <td>{payment.proofUrl ? <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 600 }}>View</a> : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {reservation.refunds?.length > 0 && (
                      <div className="sfd-subsection">
                        <h4>Refunds</h4>
                        <div className="sfd-table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reservation.refunds.map(refund => (
                                <tr key={refund._id}>
                                  <td>{new Date(refund.refundedAt).toLocaleDateString('en-IN')}</td>
                                  <td>₹{refund.amount.toLocaleString('en-IN')}</td>
                                  <td>{refund.reason || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentFeeDetailsPage;
