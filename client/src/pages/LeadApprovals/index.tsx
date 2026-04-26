import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi } from '../../api';

interface PendingLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  priority: string;
  stageId?: { _id: string; name: string; color?: string };
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string };
  pendingApproval?: {
    stageId: string;
    stageName: string;
    requestedBy: string;
    requestedAt: string;
    reason?: string;
  };
}

export default function LeadApprovalsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<PendingLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ leadId: string; stageName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadApi.getPendingApprovals();
      const data = res?.data || res;
      // API returns { leads, total, … } pagination wrapper
      const arr: PendingLead[] = Array.isArray(data) ? data : (data?.leads || []);
      // Keep only those with pendingApproval set
      setLeads(arr.filter((l: PendingLead) => l.pendingApproval?.stageId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (leadId: string) => {
    setActingOn(leadId);
    try {
      await leadApi.approveStageChange(leadId, true);
      setSuccessMsg('Stage change approved.');
      await load();
    } catch (e: any) {
      console.error(e);
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActingOn(rejectModal.leadId);
    try {
      await leadApi.approveStageChange(rejectModal.leadId, false, rejectReason);
      setSuccessMsg('Stage change rejected.');
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch (e: any) {
      console.error(e);
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-0 fw-bold">
            <i className="fas fa-clipboard-check me-2 text-primary" />
            Manager Approval Queue
          </h4>
          <small className="text-muted">
            Pending stage changes that require manager approval
          </small>
        </div>
        <div className="ms-auto">
          <button className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="fas fa-sync-alt me-1" />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success alert-dismissible">
          <i className="fas fa-check-circle me-2" />{successMsg}
          <button className="btn-close" onClick={() => setSuccessMsg('')} />
        </div>
      )}

      {loading && (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border mb-3" />
          <div>Loading approvals…</div>
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <i className="fas fa-check-double fa-3x text-success mb-3 d-block" />
            <h5>No pending approvals</h5>
            <p className="text-muted mb-0">All stage changes have been processed.</p>
          </div>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom py-3">
            <span className="fw-semibold">{leads.length} pending request{leads.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Lead</th>
                  <th>Current Stage</th>
                  <th>Requested Stage</th>
                  <th>Requested By</th>
                  <th>Reason</th>
                  <th>Requested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const pa = lead.pendingApproval!;
                  const isActing = actingOn === lead._id;
                  return (
                    <tr key={lead._id}>
                      <td>
                        <div className="fw-semibold">{lead.name}</div>
                        <small className="text-muted">{lead.phone}</small>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: lead.stageId?.color || '#6c757d', color: '#fff' }}
                        >
                          {lead.stageId?.name || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-warning text-dark">
                          {pa.stageName}
                        </span>
                      </td>
                      <td>
                        {lead.assignedTo
                          ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span className="text-muted small">{pa.reason || '—'}</span>
                      </td>
                      <td className="text-muted small">
                        {new Date(pa.requestedAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-success"
                            disabled={isActing}
                            onClick={() => handleApprove(lead._id)}
                          >
                            {isActing
                              ? <span className="spinner-border spinner-border-sm" />
                              : <><i className="fas fa-check me-1" />Approve</>
                            }
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={isActing}
                            onClick={() => setRejectModal({ leadId: lead._id, stageName: pa.stageName })}
                          >
                            <i className="fas fa-times me-1" />Reject
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => navigate(`/leads/${lead._id}`)}
                          >
                            <i className="fas fa-eye" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-times-circle text-danger me-2" />
                  Reject Stage Change
                </h5>
                <button className="btn-close" onClick={() => setRejectModal(null)} />
              </div>
              <div className="modal-body">
                <p>
                  Reject the request to move lead to <strong>{rejectModal.stageName}</strong>?
                </p>
                <label className="form-label">Reason (optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Explain why this request is being rejected…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleReject} disabled={!!actingOn}>
                  {actingOn ? <span className="spinner-border spinner-border-sm" /> : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
