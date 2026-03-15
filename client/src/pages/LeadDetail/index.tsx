import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi } from '../../api';
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
  activities: Activity[];
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

const ACTIVITY_ICONS: Record<string, string> = {
  note: '📝', call: '📞', email: '📧', whatsapp: '💬',
  status_change: '🔄', created: '✨', assignment: '👤'
};

const LeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Activity form
  const [activityType, setActivityType] = useState('note');
  const [activityDesc, setActivityDesc] = useState('');

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const [leadRes, stagesRes] = await Promise.all([
        leadApi.getLeadById(leadId),
        leadStageApi.getStages()
      ]);
      setLead(leadRes.data);
      setStages(stagesRes.data || []);
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
    try {
      await leadApi.changeStage(lead._id, newStageId);
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
      await leadApi.addActivity(lead._id, { type: activityType, description: activityDesc });
      setActivityDesc('');
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
            </div>
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div className="activity-panel">
          <h3>Activity Timeline</h3>
          <div className="add-activity">
            <div className="add-activity-row">
              <select value={activityType} onChange={e => setActivityType(e.target.value)}>
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
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
                  <div className="activity-desc">{activity.description}</div>
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
    </div>
  );
};

export default LeadDetail;
