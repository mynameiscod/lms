import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicQuizAdminApi } from '../../api';
import './PublicQuizAdmin.css';

const SKIP_KEYS = new Set(['name', 'email', 'phone', 'mobile']);
const labelFor = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface BatchOption { weekLabel: string; quizId?: string; quiz?: { title: string } | null; }

const RegistrationDetail: React.FC = () => {
  const { subId } = useParams<{ subId: string }>();
  const navigate = useNavigate();

  const [sub,           setSub]          = useState<any>(null);
  const [loading,       setLoading]      = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason,  setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [message,       setMessage]      = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [quizUrl,       setQuizUrl]      = useState('');

  // Available batches (for approval dropdown)
  const [batches,       setBatches]      = useState<BatchOption[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');

  // Manual quiz assignment panel
  const [availQuizzes,   setAvailQuizzes]   = useState<{ _id: string; title: string }[]>([]);
  const [assignQuizId,   setAssignQuizId]   = useState('');
  const [assignWeekLabel, setAssignWeekLabel] = useState('');
  const [assignLoading,  setAssignLoading]  = useState(false);
  const [quizzesLoaded,  setQuizzesLoaded]  = useState(false);

  // Load registration + batch list + quiz list
  useEffect(() => {
    publicQuizAdminApi.getRegistrationDetail(subId!)
      .then((data: any) => {
        setSub(data);
        if (data?.weekLabel) {
          setAssignWeekLabel(data.weekLabel);
          setSelectedBatch(data.weekLabel);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load configured batches for the approval dropdown
    publicQuizAdminApi.getAllBatchConfigs()
      .then((list: any) => {
        const arr: BatchOption[] = (Array.isArray(list) ? list : []).map((c: any) => ({
          weekLabel: c.weekLabel,
          quizId:    c.quizId,
          quiz:      c.quiz || null,
        }));
        setBatches(arr);
      })
      .catch(console.error);

    // Load quizzes for the manual-assign panel
    publicQuizAdminApi.getAvailableQuizzes()
      .then((data: any) => {
        setAvailQuizzes(Array.isArray(data) ? data : (data?.quizzes || []));
        setQuizzesLoaded(true);
      })
      .catch(console.error);
  }, [subId]);

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await publicQuizAdminApi.approveRegistration(subId!, selectedBatch || undefined);
      setSub((prev: any) => ({
        ...prev, isApproved: true, rejectionReason: undefined,
        quizToken: res.quizToken,
        weekLabel: selectedBatch || prev.weekLabel,
        isPreRegistration: selectedBatch ? false : prev.isPreRegistration,
      }));
      if (res.quizUrl) setQuizUrl(res.quizUrl);
      const msg = res.quizToken
        ? 'Approved! Quiz link generated — copy it or use "Send Quiz Links" from All Registrations.'
        : selectedBatch
          ? 'Approved and assigned to batch. The batch has no quiz configured yet — save a quiz in the batch settings to generate a link.'
          : 'Approved. Select a batch above or use the manual assign panel below to generate a quiz link.';
      setMessage({ text: msg, type: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
    }
    setActionLoading(false);
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMessage({ text: 'Please enter a rejection reason.', type: 'danger' });
      return;
    }
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

  // ── Manual quiz assign ───────────────────────────────────────────────────
  const handleGenerateLink = async () => {
    if (!assignQuizId) {
      setMessage({ text: 'Please select a quiz first.', type: 'danger' });
      return;
    }
    setAssignLoading(true);
    try {
      const res = await publicQuizAdminApi.generateQuizLink(subId!, assignQuizId, assignWeekLabel || undefined);
      setSub((prev: any) => ({
        ...prev, isApproved: true, quizToken: res.quizToken,
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

  /* ── Render ── */
  if (loading) return <div className="pq-loading">Loading…</div>;
  if (!sub) return <div className="pq-page"><p className="text-danger">Registration not found.</p></div>;

  const rd      = sub.registrationData || {};
  const files   = (sub.uploadedFiles || []) as any[];
  const imgTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']);

  const approvalStatus =
    sub.isApproved === true  ? { label: 'Approved',       color: '#22c55e', bg: '#f0fdf4' } :
    sub.isApproved === false ? { label: 'Rejected',        color: '#ef4444', bg: '#fef2f2' } :
                               { label: 'Pending Review',  color: '#f59e0b', bg: '#fffbeb' };

  const activeQuizUrl = quizUrl || (sub.quizToken ? `${window.location.origin}/quiz/${sub.quizToken}` : '');
  const needsAssignment = !sub.quizToken && !quizUrl;

  // Which batch (if any) is currently assigned to this registration
  const currentBatch = batches.find(b => b.weekLabel === (selectedBatch || sub.weekLabel));
  const batchHasQuiz  = !!currentBatch?.quizId;

  return (
    <div className="pq-page">

      {/* ── Header ── */}
      <div className="pq-header">
        <div>
          <button className="btn btn-sm btn-outline-secondary mb-2" onClick={() => navigate(-1)}>← Back</button>
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
          <span>{message.text}</span>
          <button className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      <div className="row g-4">

        {/* ── Left: Details ── */}
        <div className="col-lg-7">

          <div className="card mb-4">
            <div className="card-header fw-semibold">Contact Information</div>
            <div className="card-body">
              <div className="row g-3">
                {[
                  { label: 'Full Name', value: sub.name },
                  { label: 'Email',     value: sub.email },
                  { label: 'Phone',     value: rd.phone || rd.mobile || '—' },
                  { label: 'WhatsApp',  value: rd.whatsapp || '—' },
                ].map(f => (
                  <div key={f.label} className="col-sm-6">
                    <div className="text-muted small">{f.label}</div>
                    <div className="fw-semibold">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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

        {/* ── Right: Files + Quiz + Approval ── */}
        <div className="col-lg-5">

          {/* Uploaded files */}
          <div className="card mb-4">
            <div className="card-header fw-semibold">Uploaded Documents</div>
            <div className="card-body">
              {files.length === 0 ? (
                <p className="text-muted small mb-0">No files uploaded.</p>
              ) : files.map((f, i) => (
                <div key={i} className="mb-3">
                  <div className="text-muted small mb-1">{labelFor(f.fieldName)} — <span>{f.originalName}</span></div>
                  {imgTypes.has(f.mimeType) ? (
                    <a href={f.filePath} target="_blank" rel="noreferrer">
                      <img src={f.filePath} alt={f.fieldName}
                        style={{ width: '100%', maxHeight: 280, objectFit: 'contain', border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa' }} />
                    </a>
                  ) : (
                    <a href={f.filePath} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary w-100">
                      📄 View / Download {f.originalName}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quiz Link (if generated) */}
          {activeQuizUrl && (
            <div className="card mb-4 border-success">
              <div className="card-header fw-semibold text-success d-flex align-items-center justify-content-between">
                <span><i className="fa-solid fa-link me-2" />Quiz Link Ready</span>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: 11 }}
                  onClick={() => setAssignQuizId('__reassign__')}
                  title="Reassign to a different quiz"
                >
                  Reassign
                </button>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-2">Share this link with the candidate — no login needed.</p>
                <div className="input-group">
                  <input className="form-control form-control-sm font-monospace" readOnly value={activeQuizUrl} />
                  <button className="btn btn-outline-success btn-sm" onClick={() => navigator.clipboard.writeText(activeQuizUrl)}>
                    <i className="fa-solid fa-copy" /> Copy
                  </button>
                </div>
                {sub.quizInfo && (
                  <div className="text-muted small mt-2">Quiz: <strong>{sub.quizInfo.title}</strong></div>
                )}
              </div>
            </div>
          )}

          {/* Manual quiz assignment (no link yet, or reassigning) */}
          {(needsAssignment || assignQuizId === '__reassign__') && (
            <div className="card mb-4 border-warning">
              <div className="card-header fw-semibold text-warning-emphasis d-flex align-items-center gap-2" style={{ background: '#fffbeb' }}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                {activeQuizUrl ? 'Reassign Quiz' : 'Manually Assign Quiz'}
              </div>
              <div className="card-body d-flex flex-column gap-3">
                {needsAssignment && (
                  <div className="alert alert-warning py-2 small mb-0">
                    {sub.isApproved === true
                      ? 'Approved but no quiz link yet. Select a quiz below to generate one.'
                      : 'Use the Approve button (with a batch selected) to auto-generate a link, or manually assign below.'}
                  </div>
                )}
                <div>
                  <label className="form-label small fw-semibold mb-1">Batch <span className="text-muted fw-normal">(optional)</span></label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="e.g. Week 1"
                    value={assignWeekLabel}
                    onChange={e => setAssignWeekLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label small fw-semibold mb-1">Quiz <span className="text-danger">*</span></label>
                  <select
                    className="form-select form-select-sm"
                    value={assignQuizId === '__reassign__' ? '' : assignQuizId}
                    onChange={e => setAssignQuizId(e.target.value)}
                  >
                    <option value="">— choose a quiz —</option>
                    {availQuizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
                  </select>
                  {!quizzesLoaded && <div className="text-muted small mt-1">Loading…</div>}
                  {quizzesLoaded && availQuizzes.length === 0 && (
                    <div className="text-danger small mt-1">No active quizzes. Create one in Manage Quizzes.</div>
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

          {/* ── Admin Decision ── */}
          <div className="card">
            <div className="card-header fw-semibold d-flex align-items-center gap-2">
              <i className="fa-solid fa-gavel" />
              Admin Decision
            </div>
            <div className="card-body d-flex flex-column gap-3">

              {/* Status badge */}
              {sub.isApproved === true  && <div className="alert alert-success mb-0 py-2">✅ Approved</div>}
              {sub.isApproved === false && <div className="alert alert-danger mb-0 py-2">❌ Rejected — <em>{sub.rejectionReason}</em></div>}
              {sub.isApproved == null   && <div className="alert alert-warning mb-0 py-2">⏳ Pending — no decision yet.</div>}

              {/* Batch selector (only meaningful when approving) */}
              {sub.isApproved !== true && (
                <div>
                  <label className="form-label fw-semibold small mb-1">
                    Assign to Batch
                    <span className="text-muted fw-normal ms-1">(auto-generates quiz link if batch has a quiz)</span>
                  </label>
                  {batches.length === 0 ? (
                    <div className="alert alert-info py-2 small mb-0">
                      No batches configured yet.{' '}
                      <a href="/registrations" className="alert-link">Go to All Registrations → New Batch</a> to create one first.
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={selectedBatch}
                      onChange={e => setSelectedBatch(e.target.value)}
                    >
                      <option value="">— approve without batch —</option>
                      {batches.map(b => (
                        <option key={b.weekLabel} value={b.weekLabel}>
                          {b.weekLabel}{b.quiz?.title ? ` — ${b.quiz.title}` : ' (no quiz yet)'}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedBatch && !batchHasQuiz && (
                    <div className="text-warning small mt-1">
                      <i className="fa-solid fa-triangle-exclamation me-1" />
                      This batch has no quiz assigned — student will be approved but won't get a link yet.
                    </div>
                  )}
                  {selectedBatch && batchHasQuiz && (
                    <div className="text-success small mt-1">
                      <i className="fa-solid fa-check me-1" />
                      Approving will auto-generate a quiz link for this student.
                    </div>
                  )}
                </div>
              )}

              {/* Approve button */}
              <button
                className="btn btn-success"
                disabled={actionLoading || sub.isApproved === true}
                onClick={handleApprove}
              >
                {actionLoading ? 'Saving…' : (
                  selectedBatch && batchHasQuiz
                    ? `✅ Approve + Generate Link (${selectedBatch})`
                    : selectedBatch
                    ? `✅ Approve + Assign to ${selectedBatch}`
                    : '✅ Approve'
                )}
              </button>

              {/* Reject */}
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
