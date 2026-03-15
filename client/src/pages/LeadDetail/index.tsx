import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, leadFormConfigApi } from '../../api';
import './LeadDetail.css';

interface Stage {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface Activity {
  _id: string;
  type: string;
  description: string;
  callOutcome?: string;
  createdBy: { firstName: string; lastName: string } | string;
  createdAt: string;
}

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  courseInterest: string[];
  source: string;
  stageId: Stage;
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string } | null;
  nextFollowUp?: string;
  notes: string;
  notInterestedReason?: string;
  interestConcerns?: string[];
  convertedStudentId?: string;
  activities: Activity[];
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
  customFields?: Record<string, any>;
}

interface CustomFieldConfig {
  fieldKey: string;
  label: string;
  type: string;
  isBuiltIn: boolean;
}

const ACTIVITY_ICONS: Record<string, string> = {
  note: '📝', call: '📞', email: '📧', whatsapp: '💬',
  status_change: '🔄', created: '✨', assignment: '👤'
};

const CALL_OUTCOMES: { value: string; label: string }[] = [
  { value: 'not_answered', label: 'Not Answered' },
  { value: 'not_connected', label: 'Not Connected' },
  { value: 'busy', label: 'Busy' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'connected', label: 'Connected' }
];

const INTEREST_CONCERNS: { value: string; label: string }[] = [
  { value: 'only_online', label: 'Only Online' },
  { value: 'placements', label: 'Placements' },
  { value: 'check_with_parents', label: 'Check with Parents' },
  { value: 'fee_issue', label: 'Fee Issue' },
  { value: 'timing_issue', label: 'Timing Issue' },
  { value: 'other', label: 'Other' }
];

const LeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customFieldConfigs, setCustomFieldConfigs] = useState<CustomFieldConfig[]>([]);

  // Activity form
  const [activityType, setActivityType] = useState('note');
  const [activityDesc, setActivityDesc] = useState('');
  const [callOutcome, setCallOutcome] = useState('');

  // Not Interested reason modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingStageId, setPendingStageId] = useState('');
  const [notInterestedReason, setNotInterestedReason] = useState('');

  // Interest concerns
  const [editingConcerns, setEditingConcerns] = useState(false);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  // Convert to student
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertPassword, setConvertPassword] = useState('Welcome@123');
  const [converting, setConverting] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const [leadRes, stagesRes, configRes] = await Promise.all([
        leadApi.getLeadById(leadId),
        leadStageApi.getStages(),
        leadFormConfigApi.getConfig()
      ]);
      setLead(leadRes.data);
      setStages(stagesRes.data || []);
      if (configRes.data?.fields) {
        setCustomFieldConfigs(
          configRes.data.fields
            .filter((f: any) => !f.isBuiltIn && f.enabled)
            .map((f: any) => ({ fieldKey: f.fieldKey, label: f.label, type: f.type, isBuiltIn: f.isBuiltIn }))
        );
      }
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStageChange = async (newStageId: string) => {
    if (!lead) return;
    // Check if the new stage is "Not Interested" — need reason
    const targetStage = stages.find(s => s._id === newStageId);
    if (targetStage?.name === 'Not Interested') {
      setPendingStageId(newStageId);
      setNotInterestedReason('');
      setShowReasonModal(true);
      return;
    }
    try {
      await leadApi.changeStage(lead._id, newStageId);
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to change stage');
    }
  };

  const handleConfirmNotInterested = async () => {
    if (!lead || !notInterestedReason.trim()) {
      showAlert('error', 'Please provide a reason');
      return;
    }
    try {
      await leadApi.changeStage(lead._id, pendingStageId, notInterestedReason.trim());
      setShowReasonModal(false);
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to change stage');
    }
  };

  const handleAddActivity = async () => {
    if (!lead || !activityDesc.trim()) {
      showAlert('error', 'Please enter a description');
      return;
    }
    try {
      const data: any = { type: activityType, description: activityDesc };
      if (activityType === 'call' && callOutcome) {
        data.callOutcome = callOutcome;
      }
      await leadApi.addActivity(lead._id, data);
      setActivityDesc('');
      setCallOutcome('');
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to add activity');
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    try {
      await leadApi.deleteLead(lead._id);
      navigate('/leads');
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to delete');
    }
  };

  const handleConvertToStudent = async () => {
    if (!lead) return;
    try {
      setConverting(true);
      await leadApi.convertToStudent(lead._id, convertPassword);
      setShowConvertModal(false);
      showAlert('success', 'Lead converted to student successfully!');
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  const handleSaveConcerns = async () => {
    if (!lead) return;
    try {
      await leadApi.updateLead(lead._id, { interestConcerns: selectedConcerns });
      setEditingConcerns(false);
      loadData();
      showAlert('success', 'Concerns updated');
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to update concerns');
    }
  };

  const toggleConcern = (value: string) => {
    setSelectedConcerns(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  };

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="lead-detail-page"><div className="loading-spinner">Loading lead...</div></div>;
  }

  if (!lead) {
    return <div className="lead-detail-page"><div className="loading-spinner">Lead not found</div></div>;
  }

  return (
    <div className="lead-detail-page">
      {/* Header */}
      <div className="lead-detail-header">
        <button className="back-btn" onClick={() => navigate('/leads')}>← Back</button>
        <h1>{lead.name}</h1>
        <div className="lead-detail-actions">
          {!lead.convertedStudentId && lead.email && (
            <button className="btn-convert" onClick={() => { setConvertPassword('Welcome@123'); setShowConvertModal(true); }}>
              🎓 Convert to Student
            </button>
          )}
          {lead.convertedStudentId && (
            <span className="converted-badge">✅ Converted</span>
          )}
          <button className="btn-primary" onClick={() => navigate(`/leads`, { state: { edit: lead._id } })}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      <div className="lead-detail-body">
        {/* Left: Info */}
        <div>
          <div className="lead-info-card">
            <h3>Lead Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-value">{lead.phone}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{lead.email || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Source</span>
                <span className="info-value">{lead.source.replace('_', ' ')}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Stage</span>
                <div className="stage-selector">
                  <span className="stage-dot" style={{ backgroundColor: lead.stageId?.color }} />
                  <select value={lead.stageId?._id} onChange={e => handleStageChange(e.target.value)}>
                    {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">Assigned To</span>
                <span className="info-value">
                  {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'Unassigned'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Next Follow-up</span>
                <span className={`info-value ${isOverdue(lead.nextFollowUp) ? 'overdue' : ''}`}>
                  {lead.nextFollowUp ? formatDate(lead.nextFollowUp) : 'Not set'}
                  {isOverdue(lead.nextFollowUp) && ' (Overdue!)'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Course Interest</span>
                <div className="course-tags">
                  {lead.courseInterest?.length > 0
                    ? lead.courseInterest.map((c, i) => <span key={i} className="course-tag">{c}</span>)
                    : <span className="info-value">-</span>}
                </div>
              </div>
              <div className="info-item">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(lead.createdAt)}</span>
              </div>
              {lead.notes && (
                <div className="info-item info-item-full">
                  <span className="info-label">Notes</span>
                  <span className="info-value">{lead.notes}</span>
                </div>
              )}
              {/* Custom Fields */}
              {customFieldConfigs.length > 0 && lead.customFields && customFieldConfigs.map(cf => {
                const val = lead.customFields?.[cf.fieldKey];
                if (val === undefined || val === '' || val === null) return null;
                return (
                  <div className="info-item" key={cf.fieldKey}>
                    <span className="info-label">{cf.label}</span>
                    <span className="info-value">
                      {cf.type === 'checkbox' ? (val ? 'Yes' : 'No') : String(val)}
                    </span>
                  </div>
                );
              })}
              {/* Interest Concerns */}
              <div className="info-item info-item-full">
                <span className="info-label">
                  Interest Concerns
                  <button className="edit-concerns-btn" onClick={() => {
                    setSelectedConcerns(lead.interestConcerns || []);
                    setEditingConcerns(!editingConcerns);
                  }}>
                    {editingConcerns ? '✕' : '✎'}
                  </button>
                </span>
                {editingConcerns ? (
                  <div className="concerns-editor">
                    <div className="concern-chips">
                      {INTEREST_CONCERNS.map(c => (
                        <button
                          key={c.value}
                          className={`concern-chip ${selectedConcerns.includes(c.value) ? 'active' : ''}`}
                          onClick={() => toggleConcern(c.value)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <button className="btn-save-concerns" onClick={handleSaveConcerns}>Save</button>
                  </div>
                ) : (
                  <div className="concern-tags">
                    {lead.interestConcerns && lead.interestConcerns.length > 0
                      ? lead.interestConcerns.map(c => {
                          const label = INTEREST_CONCERNS.find(ic => ic.value === c)?.label || c;
                          return <span key={c} className="concern-tag">{label}</span>;
                        })
                      : <span className="info-value">None</span>}
                  </div>
                )}
              </div>
              {/* Not Interested Reason */}
              {lead.notInterestedReason && (
                <div className="info-item info-item-full">
                  <span className="info-label">Not Interested Reason</span>
                  <span className="info-value not-interested-reason">{lead.notInterestedReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div className="activity-panel">
          <h3>Activity Timeline</h3>
          <div className="add-activity">
            <div className="add-activity-row">
              <select value={activityType} onChange={e => { setActivityType(e.target.value); setCallOutcome(''); }}>
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              {activityType === 'call' && (
                <select value={callOutcome} onChange={e => setCallOutcome(e.target.value)} className="call-outcome-select">
                  <option value="">-- Call Outcome --</option>
                  {CALL_OUTCOMES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              placeholder="Add a note, log a call..."
              value={activityDesc}
              onChange={e => setActivityDesc(e.target.value)}
            />
            <button onClick={handleAddActivity}>Add Activity</button>
          </div>

          <div className="activity-timeline">
            {[...lead.activities].reverse().map((activity: any) => (
              <div className="activity-item" key={activity._id}>
                <div className={`activity-icon ${activity.type}`}>
                  {ACTIVITY_ICONS[activity.type] || '•'}
                </div>
                <div className="activity-body">
                  <div className="activity-desc">
                    {activity.description}
                    {activity.callOutcome && (
                      <span className={`call-outcome-badge ${activity.callOutcome}`}>
                        {CALL_OUTCOMES.find(o => o.value === activity.callOutcome)?.label || activity.callOutcome}
                      </span>
                    )}
                  </div>
                  <div className="activity-meta">
                    <span>
                      {typeof activity.createdBy === 'object'
                        ? `${activity.createdBy.firstName} ${activity.createdBy.lastName}`
                        : 'System'}
                    </span>
                    <span>•</span>
                    <span>{formatTime(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Not Interested Reason Modal */}
      {showReasonModal && (
        <div className="modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h2>Not Interested - Reason Required</h2>
            <p className="modal-subtitle">Please provide a reason why this lead is not interested.</p>
            <div className="form-group">
              <label>Reason *</label>
              <textarea
                value={notInterestedReason}
                onChange={e => setNotInterestedReason(e.target.value)}
                placeholder="e.g., Found another institute, budget constraints, not looking anymore..."
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowReasonModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmNotInterested} disabled={!notInterestedReason.trim()}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Student Modal */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <h2>🎓 Convert to Student</h2>
            <p className="modal-subtitle">
              This will create a student account for <strong>{lead.name}</strong> ({lead.email}).
            </p>
            <div className="form-group">
              <label>Initial Password</label>
              <input
                type="text"
                value={convertPassword}
                onChange={e => setConvertPassword(e.target.value)}
                placeholder="e.g., Welcome@123"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConvertModal(false)}>Cancel</button>
              <button className="btn-convert" onClick={handleConvertToStudent} disabled={converting}>
                {converting ? 'Converting...' : 'Convert to Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;
