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
  const [quizUrl, setQuizUrl] = useState<string>('');

  // Quiz assignment panel state
  const [availQuizzes, setAvailQuizzes] = useState<{ _id: string; title: string }[]>([]);
  const [assignQuizId, setAssignQuizId] = useState('');
  const [assignWeekLabel, setAssignWeekLabel] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false);

  useEffect(() => {
    publicQuizAdminApi.getRegistrationDetail(subId!)
      .then((data: any) => {
        setSub(data);
        // Pre-fill week label from existing registration
        if (data?.weekLabel) setAssignWeekLabel(data.weekLabel);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subId]);

  // Load available quizzes once on mount
  useEffect(() => {
    publicQuizAdminApi.getAvailableQuizzes()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.quizzes || []);
        setAvailQuizzes(list);
        setQuizzesLoaded(true);
      })
      .catch(console.error);
  }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await publicQuizAdminApi.approveRegistration(subId!);
      setSub((prev: any) => ({ ...prev, isApproved: true, rejectionReason: undefined, quizToken: res.quizToken }));
      if (res.quizUrl) setQuizUrl(res.quizUrl);
      const msg = res.quizUrl
        ? 'Registration approved. Quiz link generated — copy and send to candidate.'
        : 'Registration approved. Configure the Week Settings in All Registrations to auto-generate a quiz link.';
      setMessage({ text: msg, type: 'success' });
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

  // Directly assign a quiz and generate/regenerate a quiz link
  const handleGenerateLink = async () => {
    if (!assignQuizId) { setMessage({ text: 'Please select a quiz first.', type: 'danger' }); return; }
    setAssignLoading(true);
    try {
      const res = await publicQuizAdminApi.generateQuizLink(subId!, assignQuizId, assignWeekLabel || undefined);
      setSub((prev: any) => ({
        ...prev,
        isApproved: true,
        quizToken: res.quizToken,
        weekLabel: assignWeekLabel || prev.weekLabel,
        isPreRegistration: assignWeekLabel ? false : prev.isPreRegistration,
      }));
      setQuizUrl(res.quizUrl);
      setMessage({ text: 'Quiz link generated! Copy and send it to the candidate.', type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
    }
    setAssignLoading(false);
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

  const activeQuizUrl = quizUrl || (sub.quizToken ? `${window.location.origin}/quiz/${sub.quizToken}` : '');
  // Show the quiz assignment panel when: no quiz link yet, OR approved but no token
  const needsQuizAssignment = !sub.quizToken && !quizUrl;

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
            {sub.isPreRegistration && !sub.weekLabel && (
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

        {/* Right: Files + Quiz + Approval */}
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

          {/* ── Quiz Link (if already generated) ── */}
          {activeQuizUrl && (
            <div className="card mb-4 border-primary">
              <div className="card-header fw-semibold text-primary d-flex align-items-center justify-content-between">
                <span><i className="fa-solid fa-link me-2" />Quiz Link</span>
                {quizzesLoaded && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    style={{ fontSize: 11 }}
                    onClick={() => setAssignQuizId('__reassign__')}
                    title="Reassign a different quiz"
                  >
                    Reassign
                  </button>
                )}
              </div>
              <div className="card-body">
                <p className="text-muted small mb-2">Send this link to the candidate. No login required.</p>
                <div className="input-group">
                  <input
                    className="form-control form-control-sm font-monospace"
                    readOnly
                    value={activeQuizUrl}
                  />
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => navigator.clipboard.writeText(activeQuizUrl)}
                  >
                    <i className="fa-solid fa-copy" /> Copy
                  </button>
                </div>
                {sub.quizInfo && (
                  <div className="text-muted small mt-2">
                    Quiz: <strong>{sub.quizInfo.title}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Assign Quiz panel (always show when no quiz link OR reassigning) ── */}
          {(needsQuizAssignment || assignQuizId === '__reassign__') && (
            <div className="card mb-4 border-warning">
              <div className="card-header fw-semibold text-warning-emphasis d-flex align-items-center gap-2" style={{ background: '#fffbeb' }}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                {activeQuizUrl ? 'Reassign Quiz' : 'Assign Quiz & Generate Link'}
              </div>
              <div className="card-body d-flex flex-column gap-3">
                {needsQuizAssignment && (
                  <div className="alert alert-warning py-2 small mb-0">
                    {sub.isApproved === true
                      ? 'This student was approved but no quiz link was generated (Week Config was not set at the time). Select a quiz below to generate a link now.'
                      : 'Select a quiz to assign to this student. Approving will generate a unique quiz link.'}
                  </div>
                )}

                <div>
                  <label className="form-label small fw-semibold mb-1">Week Label <span className="text-muted fw-normal">(optional — e.g. "Week 1")</span></label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="e.g. Week 1"
                    value={assignWeekLabel}
                    onChange={e => setAssignWeekLabel(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label small fw-semibold mb-1">Select Quiz <span className="text-danger">*</span></label>
                  <select
                    className="form-select form-select-sm"
                    value={assignQuizId === '__reassign__' ? '' : assignQuizId}
                    onChange={e => setAssignQuizId(e.target.value)}
                  >
                    <option value="">— Choose a quiz —</option>
                    {availQuizzes.map(q => (
                      <option key={q._id} value={q._id}>{q.title}</option>
                    ))}
                  </select>
                  {!quizzesLoaded && <div className="text-muted small mt-1">Loading quizzes…</div>}
                  {quizzesLoaded && availQuizzes.length === 0 && (
                    <div className="text-danger small mt-1">No active quizzes found. Create one in Manage Quizzes first.</div>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-warning flex-grow-1 fw-semibold"
                    disabled={assignLoading || !assignQuizId || assignQuizId === '__reassign__'}
                    onClick={handleGenerateLink}
                  >
                    {assignLoading
                      ? <><span className="spinner-border spinner-border-sm me-1" />Generating…</>
                      : <><i className="fa-solid fa-link me-1" />Generate Quiz Link</>}
                  </button>
                  {assignQuizId === '__reassign__' && (
                    <button className="btn btn-outline-secondary" onClick={() => setAssignQuizId('')}>Cancel</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Approval actions ── */}
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
