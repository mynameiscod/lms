import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import './PublicQuizAdmin.css';

const SKIP_KEYS = new Set(['name', 'email', 'phone', 'mobile']);

const labelFor = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const RegistrationDetail: React.FC = () => {
  const { subId } = useParams<{ subId: string }>();
  const navigate = useNavigate();
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    publicQuizAdminApi.getRegistrationDetail(subId!)
      .then(setSub)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subId]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await publicQuizAdminApi.approveRegistration(subId!);
      setSub((prev: any) => ({ ...prev, isApproved: true, rejectionReason: undefined }));
      setMessage({ text: 'Registration approved.', type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setMessage({ text: 'Please enter a rejection reason.', type: 'danger' }); return; }
    setActionLoading(true);
    try {
      await publicQuizAdminApi.rejectRegistration(subId!, rejectReason.trim());
      setSub((prev: any) => ({ ...prev, isApproved: false, rejectionReason: rejectReason.trim() }));
      setShowRejectBox(false);
      setRejectReason('');
      setMessage({ text: 'Registration rejected.', type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
    }
    setActionLoading(false);
  };

  if (loading) return <div className="pq-loading">Loading...</div>;
  if (!sub) return <div className="pq-page"><p className="text-danger">Registration not found.</p></div>;

  const rd = sub.registrationData || {};
  const files: any[] = sub.uploadedFiles || [];
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];

  const approvalStatus = sub.isApproved === true
    ? { label: 'Approved', color: '#22c55e', bg: '#f0fdf4' }
    : sub.isApproved === false
    ? { label: 'Rejected', color: '#ef4444', bg: '#fef2f2' }
    : { label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb' };

  return (
    <div className="pq-page">
      {/* Header */}
      <div className="pq-header">
        <div>
          <button className="btn btn-sm btn-outline-secondary mb-2" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="pq-title">{sub.name}</h1>
          <p className="pq-subtitle">
            {sub.weekLabel && (
              <span className="badge me-2" style={{ background: '#e8f0fe', color: '#1a56db' }}>{sub.weekLabel}</span>
            )}
            {sub.isPreRegistration && (
              <span className="badge bg-warning text-dark">Pre-Registration</span>
            )}
          </p>
        </div>
        <div
          className="px-4 py-2 rounded-3 fw-semibold"
          style={{ background: approvalStatus.bg, color: approvalStatus.color, border: `1.5px solid ${approvalStatus.color}`, fontSize: 15 }}
        >
          {approvalStatus.label}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type} d-flex justify-content-between align-items-center`}>
          {message.text}
          <button className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      <div className="row g-4">
        {/* Left: Details */}
        <div className="col-lg-7">
          {/* Core info */}
          <div className="card mb-4">
            <div className="card-header fw-semibold">Contact Information</div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { label: 'Full Name', value: sub.name },
                  { label: 'Email', value: sub.email },
                  { label: 'Phone', value: rd.phone || rd.mobile || '—' },
                  { label: 'WhatsApp', value: rd.whatsapp || '—' },
                ].map(f => (
                  <div key={f.label} className="col-sm-6">
                    <div className="text-muted small">{f.label}</div>
                    <div className="fw-semibold">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional form fields */}
          {Object.keys(rd).filter(k => !SKIP_KEYS.has(k) && rd[k]).length > 0 && (
            <div className="card mb-4">
              <div className="card-header fw-semibold">Registration Details</div>
              <div className="card-body">
                <div className="row g-3">
                  {Object.entries(rd)
                    .filter(([k]) => !SKIP_KEYS.has(k))
                    .map(([k, v]) => (
                      <div key={k} className="col-sm-6">
                        <div className="text-muted small">{labelFor(k)}</div>
                        <div className="fw-semibold">{String(v) || '—'}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="card">
            <div className="card-header fw-semibold">Meta</div>
            <div className="card-body">
              <div className="row g-2 small text-muted">
                <div className="col-sm-6"><strong>Registered:</strong> {new Date(sub.createdAt).toLocaleString('en-IN')}</div>
                <div className="col-sm-6"><strong>IP:</strong> {sub.ipAddress || '—'}</div>
                {sub.approvedBy && <div className="col-sm-6"><strong>Approved By:</strong> {sub.approvedBy}</div>}
                {sub.approvedAt && <div className="col-sm-6"><strong>Approved At:</strong> {new Date(sub.approvedAt).toLocaleString('en-IN')}</div>}
                {sub.rejectionReason && <div className="col-12"><strong>Rejection Reason:</strong> {sub.rejectionReason}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Files + Approval */}
        <div className="col-lg-5">
          {/* Uploaded files */}
          <div className="card mb-4">
            <div className="card-header fw-semibold">Uploaded Documents</div>
            <div className="card-body">
              {files.length === 0 ? (
                <p className="text-muted small mb-0">No files uploaded.</p>
              ) : (
                files.map((f, i) => (
                  <div key={i} className="mb-3">
                    <div className="text-muted small mb-1">{labelFor(f.fieldName)} — <span className="text-muted">{f.originalName}</span></div>
                    {imageTypes.includes(f.mimeType) ? (
                      <a href={f.filePath} target="_blank" rel="noreferrer">
                        <img
                          src={f.filePath}
                          alt={f.fieldName}
                          style={{ width: '100%', maxHeight: 280, objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa' }}
                        />
                      </a>
                    ) : (
                      <a href={f.filePath} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary w-100">
                        📄 View / Download {f.originalName}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Approval actions */}
          <div className="card">
            <div className="card-header fw-semibold">Admin Decision</div>
            <div className="card-body d-flex flex-column gap-3">
              {sub.isApproved === true && (
                <div className="alert alert-success mb-0 py-2">✅ Approved</div>
              )}
              {sub.isApproved === false && (
                <div className="alert alert-danger mb-0 py-2">❌ Rejected — <em>{sub.rejectionReason}</em></div>
              )}
              {sub.isApproved == null && (
                <div className="alert alert-warning mb-0 py-2">⏳ Pending review — no decision yet.</div>
              )}

              <button
                className="btn btn-success"
                disabled={actionLoading || sub.isApproved === true}
                onClick={handleApprove}
              >
                {actionLoading ? 'Saving...' : '✅ Approve'}
              </button>

              {!showRejectBox ? (
                <button
                  className="btn btn-outline-danger"
                  disabled={actionLoading || sub.isApproved === false}
                  onClick={() => setShowRejectBox(true)}
                >
                  ❌ Reject
                </button>
              ) : (
                <div>
                  <textarea
                    className="form-control mb-2"
                    rows={2}
                    placeholder="Reason for rejection (required)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div className="d-flex gap-2">
                    <button className="btn btn-danger flex-grow-1" disabled={actionLoading} onClick={handleReject}>
                      Confirm Reject
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => { setShowRejectBox(false); setRejectReason(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationDetail;
