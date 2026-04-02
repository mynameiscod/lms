import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, qualificationApi } from '../../api';
import './LeadDetailModern.css';

// Types
interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: string;
  stageId?: { _id: string; name: string; color: string; order: number } | string;
  priority?: string;
  assignedTo?: { _id: string; firstName: string; lastName: string } | null;
  courseInterest?: string[];
  courseInterested?: string;
  location?: string;
  qualification?: string;
  nextFollowUp?: string;
  notes?: string;
  whatsappReplied?: boolean;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  activities?: Activity[];
  checklistAnswers?: Record<string, string>;
  qualificationAnswers?: Record<string, any>;
}

interface Activity {
  _id: string;
  type: 'note' | 'call' | 'whatsapp' | 'email' | 'stage_change' | 'system';
  content: string;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
  metadata?: Record<string, any>;
}

interface ChecklistItem {
  _id: string;
  question: string;
  answer?: string;
}

interface Stage {
  _id: string;
  name: string;
  order: number;
  color: string;
}

// Reusable Components

// 1. Lead Header Component
const LeadHeader: React.FC<{
  lead: Lead;
  onBack: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onFollowUp: () => void;
  onConvert: () => void;
}> = ({ lead, onBack, onCall, onWhatsApp, onFollowUp, onConvert }) => {
  const getPriorityClass = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'hot': return 'bg-danger';
      case 'warm': return 'bg-warning text-dark';
      case 'cold': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="lead-header sticky-top">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col-auto">
            <button className="btn btn-link text-dark p-0" onClick={onBack}>
              <i className="bi bi-arrow-left fs-4"></i>
            </button>
          </div>
          <div className="col">
            <h1 className="lead-name mb-0">{lead.name}</h1>
            <span className={`badge ${getPriorityClass(lead.priority)} priority-badge`}>
              {lead.priority || 'Cold'} Lead
            </span>
          </div>
          <div className="col-auto d-none d-md-flex gap-2">
            <button className="btn btn-outline-success btn-action" onClick={onCall}>
              <i className="bi bi-telephone-fill"></i> Call
            </button>
            <button className="btn btn-success btn-action" onClick={onWhatsApp}>
              <i className="bi bi-whatsapp"></i> WhatsApp
            </button>
            <button className="btn btn-outline-primary btn-action" onClick={onFollowUp}>
              <i className="bi bi-calendar-plus"></i> Follow-up
            </button>
            <button className="btn btn-primary btn-action" onClick={onConvert}>
              <i className="bi bi-person-check"></i> Convert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Lead Summary Card Component
const LeadSummaryCard: React.FC<{ lead: Lead }> = ({ lead }) => {
  const infoItems = [
    { icon: 'bi-telephone', label: 'Phone', value: lead.phone },
    { icon: 'bi-envelope', label: 'Email', value: lead.email },
    { icon: 'bi-funnel', label: 'Source', value: lead.source },
    { icon: 'bi-book', label: 'Course', value: lead.courseInterested },
    { icon: 'bi-person', label: 'Assigned To', value: lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : 'Unassigned' },
    { icon: 'bi-geo-alt', label: 'Location', value: lead.location },
    { icon: 'bi-mortarboard', label: 'Qualification', value: lead.qualification },
    { icon: 'bi-calendar3', label: 'Created', value: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-' },
  ];

  return (
    <div className="card summary-card">
      <div className="card-header">
        <h5 className="mb-0"><i className="bi bi-person-vcard me-2"></i>Lead Information</h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {infoItems.map((item, index) => (
            <div key={index} className="col-6 col-md-6">
              <div className="info-item">
                <div className="info-icon">
                  <i className={`bi ${item.icon}`}></i>
                </div>
                <div className="info-content">
                  <span className="info-label">{item.label}</span>
                  <span className="info-value">{item.value || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 3. Next Action Card Component
const NextActionCard: React.FC<{
  lead: Lead;
  onCallNow: () => void;
  onScheduleFollowUp: () => void;
}> = ({ lead, onCallNow, onScheduleFollowUp }) => {
  const getFollowUpStatus = () => {
    if (!lead.nextFollowUp) return { status: 'none', text: 'No follow-up scheduled' };
    const followUpDate = new Date(lead.nextFollowUp);
    const now = new Date();
    const diffHours = (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { status: 'overdue', text: 'Overdue!' };
    if (diffHours < 2) return { status: 'urgent', text: 'Due soon!' };
    if (diffHours < 24) return { status: 'today', text: 'Due today' };
    return { status: 'scheduled', text: 'Scheduled' };
  };

  const followUpStatus = getFollowUpStatus();
  const suggestedAction = lead.priority === 'hot' 
    ? 'High priority lead! Call immediately to close the deal.'
    : lead.priority === 'warm'
    ? 'Follow up with course details and schedule a demo.'
    : 'Send introductory content and gauge interest level.';

  return (
    <div className={`card next-action-card ${followUpStatus.status}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 className="card-title mb-1">
              <i className="bi bi-lightning-charge-fill me-2"></i>Next Action
            </h5>
            <span className={`badge status-badge status-${followUpStatus.status}`}>
              {followUpStatus.text}
            </span>
          </div>
          {lead.nextFollowUp && (
            <div className="follow-up-time text-end">
              <div className="fw-bold">{new Date(lead.nextFollowUp).toLocaleDateString()}</div>
              <div className="text-muted small">{new Date(lead.nextFollowUp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          )}
        </div>
        
        <div className="ai-suggestion mb-3">
          <i className="bi bi-robot me-2"></i>
          <span>{suggestedAction}</span>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-success flex-fill" onClick={onCallNow}>
            <i className="bi bi-telephone-fill me-2"></i>Call Now
          </button>
          <button className="btn btn-outline-primary flex-fill" onClick={onScheduleFollowUp}>
            <i className="bi bi-calendar-plus me-2"></i>Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Stage Stepper Component
const StageStepper: React.FC<{
  stages: Stage[];
  currentStage: string;
  onStageChange: (stage: string) => void;
}> = ({ stages, currentStage, onStageChange }) => {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const currentIndex = sortedStages.findIndex(s => s.name === currentStage);

  return (
    <div className="card stage-stepper-card">
      <div className="card-header">
        <h5 className="mb-0"><i className="bi bi-signpost-split me-2"></i>Lead Stage</h5>
      </div>
      <div className="card-body">
        <div className="stage-stepper">
          {sortedStages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = stage.name === currentStage;
            const isPending = index > currentIndex;
            
            return (
              <div 
                key={stage._id} 
                className={`stage-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
                onClick={() => onStageChange(stage.name)}
              >
                <div className="stage-indicator" style={{ '--stage-color': stage.color } as React.CSSProperties}>
                  {isCompleted ? <i className="bi bi-check"></i> : index + 1}
                </div>
                <span className="stage-label">{stage.name}</span>
                {index < sortedStages.length - 1 && <div className="stage-connector"></div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 5. Activity Timeline Component
const ActivityTimeline: React.FC<{
  activities: Activity[];
  onAddNote: () => void;
}> = ({ activities, onAddNote }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return 'bi-telephone-fill';
      case 'note': return 'bi-sticky-fill';
      case 'whatsapp': return 'bi-whatsapp';
      case 'email': return 'bi-envelope-fill';
      case 'stage_change': return 'bi-signpost-split-fill';
      default: return 'bi-clock-history';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'call': return 'success';
      case 'note': return 'warning';
      case 'whatsapp': return 'success';
      case 'email': return 'primary';
      case 'stage_change': return 'info';
      default: return 'secondary';
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="card activity-timeline-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Activity Timeline</h5>
        <button className="btn btn-sm btn-primary" onClick={onAddNote}>
          <i className="bi bi-plus-lg me-1"></i>Add Note
        </button>
      </div>
      <div className="card-body">
        {activities.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
            <p>No activities yet</p>
          </div>
        ) : (
          <div className="timeline">
            {activities.map((activity) => (
              <div key={activity._id} className="timeline-item">
                <div className={`timeline-icon bg-${getActivityColor(activity.type)}`}>
                  <i className={`bi ${getActivityIcon(activity.type)}`}></i>
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-type">{activity.type.replace('_', ' ')}</span>
                    <span className="timeline-time">{formatTime(activity.createdAt)}</span>
                  </div>
                  <p className="timeline-text">{activity.content}</p>
                  {activity.createdBy && (
                    <span className="timeline-author">
                      <i className="bi bi-person me-1"></i>
                      {activity.createdBy.firstName} {activity.createdBy.lastName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 6. Floating Action Bar Component
const FloatingActionBar: React.FC<{
  onAddNote: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onScheduleFollowUp: () => void;
}> = ({ onAddNote, onCall, onWhatsApp, onScheduleFollowUp }) => {
  return (
    <div className="floating-action-bar d-md-none">
      <button className="fab-btn" onClick={onAddNote}>
        <i className="bi bi-sticky-fill"></i>
        <span>Note</span>
      </button>
      <button className="fab-btn btn-call" onClick={onCall}>
        <i className="bi bi-telephone-fill"></i>
        <span>Call</span>
      </button>
      <button className="fab-btn btn-whatsapp" onClick={onWhatsApp}>
        <i className="bi bi-whatsapp"></i>
        <span>WhatsApp</span>
      </button>
      <button className="fab-btn" onClick={onScheduleFollowUp}>
        <i className="bi bi-calendar-plus"></i>
        <span>Follow-up</span>
      </button>
    </div>
  );
};

// 7. Right Panel Component (Desktop Only)
const RightPanel: React.FC<{
  lead: Lead;
  checklist: ChecklistItem[];
  onPriorityChange: (priority: string) => void;
  onChecklistSave: (answers: Record<string, string>) => void;
}> = ({ lead, checklist, onPriorityChange, onChecklistSave }) => {
  const [expandedSections, setExpandedSections] = useState({
    priority: true,
    checklist: true,
    insights: true
  });
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    checklist.forEach(item => {
      if (item.answer) initialAnswers[item._id] = item.answer;
    });
    setChecklistAnswers(initialAnswers);
  }, [checklist]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getLeadScore = () => {
    let score = 50;
    if (lead.priority === 'hot') score += 30;
    else if (lead.priority === 'warm') score += 15;
    if (lead.phone) score += 5;
    if (lead.email) score += 5;
    if (lead.whatsappReplied) score += 10;
    return Math.min(score, 100);
  };

  const answeredCount = Object.values(checklistAnswers).filter(a => a?.trim()).length;

  return (
    <div className="right-panel d-none d-lg-block">
      {/* Priority Selector */}
      <div className="card panel-card">
        <div className="card-header collapsible" onClick={() => toggleSection('priority')}>
          <h6 className="mb-0">
            <i className="bi bi-fire me-2"></i>Priority
          </h6>
          <i className={`bi bi-chevron-${expandedSections.priority ? 'up' : 'down'}`}></i>
        </div>
        {expandedSections.priority && (
          <div className="card-body">
            <div className="priority-selector">
              <button 
                className={`priority-btn hot ${lead.priority === 'hot' ? 'active' : ''}`}
                onClick={() => onPriorityChange('hot')}
              >
                <i className="bi bi-fire"></i> Hot
              </button>
              <button 
                className={`priority-btn warm ${lead.priority === 'warm' ? 'active' : ''}`}
                onClick={() => onPriorityChange('warm')}
              >
                <i className="bi bi-sun"></i> Warm
              </button>
              <button 
                className={`priority-btn cold ${lead.priority === 'cold' ? 'active' : ''}`}
                onClick={() => onPriorityChange('cold')}
              >
                <i className="bi bi-snow"></i> Cold
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Checklist */}
      <div className="card panel-card">
        <div className="card-header collapsible" onClick={() => toggleSection('checklist')}>
          <h6 className="mb-0">
            <i className="bi bi-clipboard-check me-2"></i>Call Checklist
            <span className="badge bg-primary ms-2">{answeredCount}/{checklist.length}</span>
          </h6>
          <i className={`bi bi-chevron-${expandedSections.checklist ? 'up' : 'down'}`}></i>
        </div>
        {expandedSections.checklist && (
          <div className="card-body">
            {checklist.length === 0 ? (
              <p className="text-muted small">No checklist items configured</p>
            ) : (
              <>
                <div className="checklist-progress mb-3">
                  <div className="progress">
                    <div 
                      className="progress-bar bg-success" 
                      style={{ width: `${(answeredCount / checklist.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="checklist-items">
                  {checklist.map((item, index) => (
                    <div key={item._id} className="checklist-item">
                      <div className="checklist-question">
                        <span className="question-number">{index + 1}</span>
                        {item.question}
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Enter answer..."
                        value={checklistAnswers[item._id] || ''}
                        onChange={(e) => setChecklistAnswers(prev => ({
                          ...prev,
                          [item._id]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                </div>
                <button 
                  className="btn btn-primary btn-sm w-100 mt-3"
                  onClick={() => onChecklistSave(checklistAnswers)}
                >
                  <i className="bi bi-check2-all me-2"></i>Save Answers
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="card panel-card">
        <div className="card-header collapsible" onClick={() => toggleSection('insights')}>
          <h6 className="mb-0">
            <i className="bi bi-robot me-2"></i>AI Insights
          </h6>
          <i className={`bi bi-chevron-${expandedSections.insights ? 'up' : 'down'}`}></i>
        </div>
        {expandedSections.insights && (
          <div className="card-body">
            <div className="lead-score mb-3">
              <div className="d-flex justify-content-between mb-1">
                <span className="fw-medium">Lead Score</span>
                <span className="fw-bold text-primary">{getLeadScore()}%</span>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar bg-gradient" 
                  style={{ width: `${getLeadScore()}%` }}
                ></div>
              </div>
            </div>
            <div className="ai-suggestions">
              <div className="suggestion-item">
                <i className="bi bi-lightbulb text-warning"></i>
                <span>{lead.priority === 'hot' ? 'High conversion probability. Close within 24 hours.' : 'Send personalized content to increase engagement.'}</span>
              </div>
              <div className="suggestion-item">
                <i className="bi bi-graph-up-arrow text-success"></i>
                <span>Best time to call: 10 AM - 12 PM</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add Note Modal Component
const AddNoteModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSave: (note: string, type: string) => void;
}> = ({ show, onClose, onSave }) => {
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('note');

  const handleSave = () => {
    if (note.trim()) {
      onSave(note, noteType);
      setNote('');
      setNoteType('note');
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h5 className="modal-title">Add Activity</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label">Activity Type</label>
            <div className="activity-type-selector">
              {[
                { value: 'note', icon: 'bi-sticky', label: 'Note' },
                { value: 'call', icon: 'bi-telephone', label: 'Call' },
                { value: 'whatsapp', icon: 'bi-whatsapp', label: 'WhatsApp' },
                { value: 'email', icon: 'bi-envelope', label: 'Email' }
              ].map(type => (
                <button
                  key={type.value}
                  className={`type-btn ${noteType === type.value ? 'active' : ''}`}
                  onClick={() => setNoteType(type.value)}
                >
                  <i className={`bi ${type.icon}`}></i>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Note</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="What happened?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!note.trim()}>
            <i className="bi bi-check2 me-2"></i>Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Follow-up Modal Component
const FollowUpModal: React.FC<{
  show: boolean;
  currentDate?: string;
  onClose: () => void;
  onSave: (date: string) => void;
}> = ({ show, currentDate, onClose, onSave }) => {
  const [date, setDate] = useState(currentDate || '');
  const [time, setTime] = useState('10:00');

  useEffect(() => {
    if (currentDate) {
      const d = new Date(currentDate);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
    }
  }, [currentDate]);

  const handleSave = () => {
    if (date) {
      const dateTime = `${date}T${time}`;
      onSave(dateTime);
      onClose();
    }
  };

  const setQuickDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h5 className="modal-title">Schedule Follow-up</h5>
          <button type="button" className="btn-close" onClick={onClose}></button>
        </div>
        <div className="modal-body">
          <div className="quick-dates mb-3">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setQuickDate(0)}>Today</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setQuickDate(1)}>Tomorrow</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setQuickDate(3)}>In 3 days</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setQuickDate(7)}>In a week</button>
          </div>
          <div className="row g-3">
            <div className="col-7">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="col-5">
              <label className="form-label">Time</label>
              <input 
                type="time" 
                className="form-control" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!date}>
            <i className="bi bi-calendar-check me-2"></i>Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const LeadDetailModern: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: '' });

  const showToast = (message: string, type: string = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const fetchLead = useCallback(async () => {
    try {
      const response = await leadApi.getLeadById(leadId!);
      const leadData = response.data;
      // Map the API response to our Lead interface
      const mappedLead: Lead = {
        ...leadData,
        // Extract stage name from stageId object if it's an object
        stage: typeof leadData.stageId === 'object' && leadData.stageId 
          ? leadData.stageId.name 
          : leadData.stage || '',
        // Convert courseInterest array to string
        courseInterested: Array.isArray(leadData.courseInterest) 
          ? leadData.courseInterest.join(', ') 
          : leadData.courseInterested || leadData.courseInterest || '',
        // Map qualificationAnswers to checklistAnswers format
        checklistAnswers: leadData.qualificationAnswers 
          ? Object.entries(leadData.qualificationAnswers).reduce((acc: Record<string, string>, [key, val]: [string, any]) => {
              acc[key] = val?.answer || '';
              return acc;
            }, {})
          : {}
      };
      setLead(mappedLead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      showToast('Failed to fetch lead details', 'danger');
    }
  }, [leadId]);

  const fetchStages = useCallback(async () => {
    try {
      const response = await leadStageApi.getStages();
      setStages(response.data || []);
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  }, []);

  const fetchChecklist = useCallback(async () => {
    try {
      const response = await qualificationApi.getConfig();
      const questions = response.data?.questions || [];
      setChecklist(questions.map((q: any) => ({
        _id: q._id || q.id,
        question: q.question || q.text,
        answer: lead?.checklistAnswers?.[q._id || q.id] || ''
      })));
    } catch (error) {
      console.error('Error fetching checklist:', error);
    }
  }, [lead?.checklistAnswers]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLead(), fetchStages()]);
      setLoading(false);
    };
    if (leadId) loadData();
  }, [leadId, fetchLead, fetchStages]);

  useEffect(() => {
    if (lead) {
      fetchChecklist();
    }
  }, [lead, fetchChecklist]);

  // Get activities from lead object
  const activities: Activity[] = (lead?.activities || []).map((a: any) => ({
    _id: a._id,
    type: a.type || 'note',
    content: a.description || a.content || '',
    createdAt: a.createdAt,
    createdBy: a.createdBy,
    metadata: a.metadata
  })).reverse();

  const handleStageChange = async (newStage: string) => {
    try {
      // Find the stage ID from the stage name
      const stage = stages.find(s => s.name === newStage);
      if (stage) {
        await leadApi.changeStage(id!, stage._id);
      } else {
        await leadApi.updateLead(id!, { stage: newStage });
      }
      setLead(prev => prev ? { ...prev, stage: newStage } : null);
      showToast(`Stage updated to ${newStage}`);
      fetchLead();
    } catch (error) {
      showToast('Failed to update stage', 'danger');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await leadApi.updateLead(id!, { priority: newPriority });
      setLead(prev => prev ? { ...prev, priority: newPriority } : null);
      showToast(`Priority updated to ${newPriority}`);
    } catch (error) {
      showToast('Failed to update priority', 'danger');
    }
  };

  const handleAddNote = async (content: string, type: string) => {
    try {
      await leadApi.addActivity(id!, { type, description: content });
      showToast('Activity added successfully');
      fetchLead();
    } catch (error) {
      showToast('Failed to add activity', 'danger');
    }
  };

  const handleFollowUpSave = async (dateTime: string) => {
    try {
      await leadApi.updateLead(id!, { nextFollowUp: dateTime });
      setLead(prev => prev ? { ...prev, nextFollowUp: dateTime } : null);
      showToast('Follow-up scheduled');
    } catch (error) {
      showToast('Failed to schedule follow-up', 'danger');
    }
  };

  const handleChecklistSave = async (answers: Record<string, string>) => {
    try {
      await leadApi.updateLead(id!, { checklistAnswers: answers });
      setLead(prev => prev ? { ...prev, checklistAnswers: answers } : null);
      showToast('Checklist saved');
    } catch (error) {
      showToast('Failed to save checklist', 'danger');
    }
  };

  const handleCall = () => {
    if (lead?.phone) {
      window.location.href = `tel:${lead.phone}`;
    } else {
      showToast('No phone number available', 'warning');
    }
  };

  const handleWhatsApp = () => {
    if (lead?.phone) {
      const phone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    } else {
      showToast('No phone number available', 'warning');
    }
  };

  const handleConvert = () => {
    navigate(`/leads/${id}/convert`);
  };

  if (loading) {
    return (
      <div className="lead-detail-modern loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="lead-detail-modern error">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle fs-1 text-warning"></i>
          <p className="mt-3">Lead not found</p>
          <button className="btn btn-primary" onClick={() => navigate('/leads')}>
            Back to Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lead-detail-modern">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification bg-${toast.type}`}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2`}></i>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <LeadHeader
        lead={lead}
        onBack={() => navigate('/leads')}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
        onFollowUp={() => setShowFollowUpModal(true)}
        onConvert={handleConvert}
      />

      {/* Main Content */}
      <div className="main-content">
        <div className="container-fluid">
          <div className="row g-4">
            {/* Left Column - Main Content */}
            <div className="col-12 col-lg-8">
              {/* Next Action Card */}
              <NextActionCard
                lead={lead}
                onCallNow={handleCall}
                onScheduleFollowUp={() => setShowFollowUpModal(true)}
              />

              {/* Stage Stepper */}
              <StageStepper
                stages={stages}
                currentStage={lead.stage || 'New Lead'}
                onStageChange={handleStageChange}
              />

              {/* Lead Summary */}
              <LeadSummaryCard lead={lead} />

              {/* Activity Timeline */}
              <ActivityTimeline
                activities={activities}
                onAddNote={() => setShowNoteModal(true)}
              />
            </div>

            {/* Right Column - Desktop Panel */}
            <div className="col-lg-4">
              <RightPanel
                lead={lead}
                checklist={checklist}
                onPriorityChange={handlePriorityChange}
                onChecklistSave={handleChecklistSave}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar - Mobile */}
      <FloatingActionBar
        onAddNote={() => setShowNoteModal(true)}
        onCall={handleCall}
        onWhatsApp={handleWhatsApp}
        onScheduleFollowUp={() => setShowFollowUpModal(true)}
      />

      {/* Modals */}
      <AddNoteModal
        show={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleAddNote}
      />

      <FollowUpModal
        show={showFollowUpModal}
        currentDate={lead.nextFollowUp}
        onClose={() => setShowFollowUpModal(false)}
        onSave={handleFollowUpSave}
      />
    </div>
  );
};

export default LeadDetailModern;
