import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, qualificationApi } from '../../api';
import './LeadDetailV2.css';

interface Lead {
  _id: string;
  name: string;
  phone: string;
  email: string;
  priority: string;
  stage: string;
  source: string;
  assignedTo?: { name: string };
  courseInterested?: string;
  nextFollowUp?: string;
  demoBookedAt?: string;
  demoNotes?: string;
  createdAt: string;
  activities?: Activity[];
  qualificationAnswers?: Record<string, string>;
  customFields?: Record<string, any>;
}

interface Activity {
  _id: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy?: { name: string };
  recordingUrl?: string;
  callOutcome?: string;
}

interface Stage {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface Question {
  _id: string;
  question: string;
  type: string;
  options?: string[];
}

const LeadDetailV2: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'checklist'>('timeline');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [followUpDate, setFollowUpDate] = useState('');
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, string>>({});
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [callOutcome, setCallOutcome] = useState('');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoDate, setDemoDate] = useState('');
  const [demoNotes, setDemoNotes] = useState('');
  const [demoSaving, setDemoSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: string }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (leadId) {
      fetchData();
    }
  }, [leadId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadRes, stagesRes, configRes] = await Promise.all([
        leadApi.getLeadById(leadId!),
        leadStageApi.getStages(),
        qualificationApi.getConfig()
      ]);
      
      const leadData = leadRes.data;
      setLead({
        ...leadData,
        stage: leadData.stageId?.name || leadData.stage || 'New',
        courseInterested: Array.isArray(leadData.courseInterest) 
          ? leadData.courseInterest.join(', ') 
          : leadData.courseInterest || ''
      });
      setStages(stagesRes.data || []);
      setQuestions(configRes.data?.questions || []);
      setChecklistAnswers(leadData.qualificationAnswers || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load lead details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: string = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleCall = () => {
    if (lead?.phone) {
      window.location.href = `tel:${lead.phone}`;
      handleAddActivity('call', `Called ${lead.name}`);
    }
  };

  const handleWhatsApp = () => {
    if (lead?.phone) {
      const phone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
      handleAddActivity('whatsapp', `WhatsApp sent to ${lead.name}`);
    }
  };

  const handleAddActivity = async (type: string, description: string) => {
    try {
      await leadApi.addActivity(leadId!, { type, description });
      fetchData();
      showToast('Activity logged');
    } catch (error) {
      showToast('Failed to log activity', 'error');
    }
  };

  const handleStageChange = async (stageName: string) => {
    try {
      const stage = stages.find(s => s.name === stageName);
      if (stage) {
        await leadApi.changeStage(leadId!, stage._id);
      }
      setLead(prev => prev ? { ...prev, stage: stageName } : null);
      showToast(`Stage updated to ${stageName}`);
    } catch (error) {
      showToast('Failed to update stage', 'error');
    }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      await leadApi.updateLead(leadId!, { priority });
      setLead(prev => prev ? { ...prev, priority } : null);
      showToast(`Priority set to ${priority}`);
    } catch (error) {
      showToast('Failed to update priority', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      const data: { type: string; description: string; callOutcome?: string } = {
        type: noteType,
        description: noteText
      };
      if (noteType === 'call' && callOutcome) {
        data.callOutcome = callOutcome;
      }
      await leadApi.addActivity(leadId!, data, recordingFile || undefined);
      setNoteText('');
      setCallOutcome('');
      setRecordingFile(null);
      setShowNoteModal(false);
      fetchData();
      showToast('Activity added');
    } catch (error) {
      showToast('Failed to add activity', 'error');
    }
  };

  const handleSaveFollowUp = async () => {
    if (!followUpDate) return;
    try {
      await leadApi.updateLead(leadId!, { nextFollowUp: followUpDate });
      setLead(prev => prev ? { ...prev, nextFollowUp: followUpDate } : null);
      setShowFollowUpModal(false);
      showToast('Follow-up scheduled');
    } catch (error) {
      showToast('Failed to schedule follow-up', 'error');
    }
  };

  const handleSaveDemo = async () => {
    if (!demoDate) return;
    setDemoSaving(true);
    try {
      await leadApi.updateLead(leadId!, { demoBookedAt: demoDate, demoNotes });
      setLead(prev => prev ? { ...prev, demoBookedAt: demoDate, demoNotes } : null);
      setShowDemoModal(false);
      showToast('Demo booked successfully');
    } catch (error) {
      showToast('Failed to book demo', 'error');
    } finally {
      setDemoSaving(false);
    }
  };

  const handleSaveChecklist = async () => {
    try {
      await leadApi.updateLead(leadId!, { qualificationAnswers: checklistAnswers });
      showToast('Checklist saved');
    } catch (error) {
      showToast('Failed to save checklist', 'error');
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date: string) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return formatDate(date);
  };

  const formatTimeDifference = (date1: string, date2: string) => {
    if (!date1 || !date2) return '';
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.abs(d1.getTime() - d2.getTime());
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    
    if (seconds < 60) return `${seconds} seconds`;
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`;
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      call: '📞',
      whatsapp: '💬',
      email: '📧',
      note: '📝',
      meeting: '📅',
      created: '✨',
      stage_change: '🔄',
      default: '📌'
    };
    return icons[type] || icons.default;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      hot: '#dc2626',
      warm: '#f59e0b',
      cold: '#3b82f6'
    };
    return colors[priority?.toLowerCase()] || colors.cold;
  };

  if (loading) {
    return (
      <div className="ld2-loading">
        <div className="ld2-spinner"></div>
        <p>Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="ld2-error">
        <h2>Lead not found</h2>
        <button onClick={() => navigate('/leads')}>Back to Leads</button>
      </div>
    );
  }

  const answeredCount = Object.keys(checklistAnswers).filter(k => checklistAnswers[k]).length;

  return (
    <div className="ld2-container">
      {/* Toast */}
      {toast.show && (
        <div className={`ld2-toast ld2-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="ld2-header">
        <div className="ld2-header-left">
          <button className="ld2-back-btn" onClick={() => navigate('/leads')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div className="ld2-lead-title">
            <h1>{lead.name}</h1>
            <span 
              className="ld2-priority-badge"
              style={{ backgroundColor: getPriorityColor(lead.priority) }}
            >
              {lead.priority?.toUpperCase() || 'COLD'}
            </span>
          </div>
        </div>
        <div className="ld2-header-actions">
          <button className="ld2-action-btn ld2-action-call" onClick={handleCall}>
            <i className="bi bi-telephone-fill"></i>
            <span>Call</span>
          </button>
          <button className="ld2-action-btn ld2-action-whatsapp" onClick={handleWhatsApp}>
            <i className="bi bi-whatsapp"></i>
            <span>WhatsApp</span>
          </button>
          <button className="ld2-action-btn ld2-action-demo" onClick={() => { setDemoDate(lead.demoBookedAt ? lead.demoBookedAt.slice(0,16) : ''); setDemoNotes(lead.demoNotes || ''); setShowDemoModal(true); }}>
            <i className="bi bi-camera-video"></i>
            <span>{lead.demoBookedAt ? 'Reschedule Demo' : 'Book Demo'}</span>
          </button>
          <button className="ld2-action-btn ld2-action-convert" onClick={() => navigate(`/leads/${leadId}/convert`)}>
            <i className="bi bi-person-check"></i>
            <span>Convert</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="ld2-main">
        {/* Left Column - Summary + Timeline */}
        <div className="ld2-left-col">
          {/* Quick Summary Card */}
          <div className="ld2-summary-card">
            <div className="ld2-summary-grid">
              <div className="ld2-summary-item">
                <i className="bi bi-telephone"></i>
                <div>
                  <label>Phone</label>
                  <a href={`tel:${lead.phone}`}>{lead.phone || '-'}</a>
                </div>
              </div>
              <div className="ld2-summary-item">
                <i className="bi bi-envelope"></i>
                <div>
                  <label>Email</label>
                  <a href={`mailto:${lead.email}`}>{lead.email || '-'}</a>
                </div>
              </div>
              <div className="ld2-summary-item">
                <i className="bi bi-flag"></i>
                <div>
                  <label>Stage</label>
                  <span>{lead.stage}</span>
                </div>
              </div>
              <div className="ld2-summary-item">
                <i className="bi bi-geo-alt"></i>
                <div>
                  <label>Source</label>
                  <span>{lead.source || '-'}</span>
                </div>
              </div>
              <div className="ld2-summary-item">
                <i className="bi bi-person"></i>
                <div>
                  <label>Assigned To</label>
                  <span>{lead.assignedTo?.name || 'Unassigned'}</span>
                </div>
              </div>
              <div className="ld2-summary-item">
                <i className="bi bi-clock"></i>
                <div>
                  <label>Last Activity</label>
                  <span>{formatRelativeTime(lead.activities?.[0]?.createdAt || lead.createdAt)}</span>
                </div>
              </div>
              {lead.demoBookedAt && (
                <div className="ld2-summary-item">
                  <i className="bi bi-camera-video-fill" style={{ color: '#7c3aed' }}></i>
                  <div>
                    <label>Demo Booked</label>
                    <span style={{ color: '#7c3aed', fontWeight: 600 }}>{formatDate(lead.demoBookedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stage Pipeline */}
          <div className="ld2-stage-pipeline">
            <h3>Lead Stage</h3>
            <div className="ld2-stages">
              {stages.slice(0, 6).map((stage, index) => (
                <button
                  key={stage._id}
                  className={`ld2-stage-btn ${lead.stage === stage.name ? 'active' : ''} ${
                    stages.findIndex(s => s.name === lead.stage) > index ? 'completed' : ''
                  }`}
                  onClick={() => handleStageChange(stage.name)}
                  style={{ 
                    '--stage-color': stage.color || '#6366f1'
                  } as React.CSSProperties}
                >
                  <span className="ld2-stage-num">{index + 1}</span>
                  <span className="ld2-stage-name">{stage.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="ld2-tabs">
            <button 
              className={activeTab === 'timeline' ? 'active' : ''} 
              onClick={() => setActiveTab('timeline')}
            >
              <i className="bi bi-clock-history"></i> Timeline
            </button>
            <button 
              className={activeTab === 'details' ? 'active' : ''} 
              onClick={() => setActiveTab('details')}
            >
              <i className="bi bi-info-circle"></i> Details
            </button>
            <button 
              className={activeTab === 'checklist' ? 'active' : ''} 
              onClick={() => setActiveTab('checklist')}
            >
              <i className="bi bi-list-check"></i> Checklist
              {answeredCount > 0 && <span className="ld2-tab-badge">{answeredCount}</span>}
            </button>
          </div>

          {/* Tab Content */}
          <div className="ld2-tab-content">
            {activeTab === 'timeline' && (
              <div className="ld2-timeline">
                <div className="ld2-timeline-header">
                  <h3>Activity Timeline</h3>
                  <button className="ld2-btn-add" onClick={() => setShowNoteModal(true)}>
                    <i className="bi bi-plus"></i> Add Note
                  </button>
                </div>
                {lead.activities && lead.activities.length > 0 ? (
                  <div className="ld2-timeline-list">
                    {(() => {
                      const sortedActivities = [...lead.activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      return sortedActivities.map((activity, index) => (
                        <React.Fragment key={activity._id || index}>
                          <div className="ld2-timeline-item">
                            <div className="ld2-timeline-icon">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="ld2-timeline-content">
                              <div className="ld2-timeline-meta">
                                <span className="ld2-timeline-type">{activity.type}</span>
                                {activity.callOutcome && (
                                  <span className={`ld2-call-outcome ld2-outcome-${activity.callOutcome}`}>
                                    {activity.callOutcome.replace('_', ' ')}
                                  </span>
                                )}
                                <span className="ld2-timeline-time">{formatRelativeTime(activity.createdAt)}</span>
                              </div>
                              <p>{activity.description}</p>
                              {activity.recordingUrl && (
                                <div className="ld2-recording">
                                  <i className="bi bi-mic-fill"></i>
                                  <audio controls src={activity.recordingUrl} />
                                </div>
                              )}
                              {activity.createdBy && (
                                <span className="ld2-timeline-user">by {activity.createdBy.name}</span>
                              )}
                            </div>
                          </div>
                          {index < sortedActivities.length - 1 && (
                            <div className="ld2-timeline-gap">
                              <span className="ld2-gap-line"></span>
                              <span className="ld2-gap-time">
                                {formatTimeDifference(activity.createdAt, sortedActivities[index + 1].createdAt)} later
                              </span>
                              <span className="ld2-gap-line"></span>
                            </div>
                          )}
                        </React.Fragment>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="ld2-empty">
                    <i className="bi bi-clock-history"></i>
                    <p>No activities yet</p>
                    <button onClick={() => setShowNoteModal(true)}>Add first note</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && (
              <div className="ld2-details">
                <h3>Lead Details</h3>
                <div className="ld2-details-list">
                  <div className="ld2-detail-row">
                    <label>Course Interest</label>
                    <span>{lead.courseInterested || '-'}</span>
                  </div>
                  <div className="ld2-detail-row">
                    <label>Next Follow-up</label>
                    <span>{lead.nextFollowUp ? formatDate(lead.nextFollowUp) : 'Not scheduled'}</span>
                  </div>
                  <div className="ld2-detail-row">
                    <label>Created</label>
                    <span>{formatDate(lead.createdAt)}</span>
                  </div>
                  {lead.customFields && Object.entries(lead.customFields).map(([key, value]) => (
                    <div key={key} className="ld2-detail-row">
                      <label>{key}</label>
                      <span>{String(value) || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'checklist' && (
              <div className="ld2-checklist">
                <div className="ld2-checklist-header">
                  <h3>Qualification Checklist</h3>
                  <span className="ld2-checklist-progress">
                    {answeredCount}/{questions.length} answered
                  </span>
                </div>
                <div className="ld2-checklist-list">
                  {questions.map((q, index) => (
                    <div key={q._id} className="ld2-checklist-item">
                      <div className="ld2-checklist-num">{index + 1}</div>
                      <div className="ld2-checklist-content">
                        <label>{q.question}</label>
                        {q.type === 'select' && q.options ? (
                          <select
                            value={checklistAnswers[q._id] || ''}
                            onChange={(e) => setChecklistAnswers(prev => ({ ...prev, [q._id]: e.target.value }))}
                          >
                            <option value="">Select...</option>
                            {q.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter answer..."
                            value={checklistAnswers[q._id] || ''}
                            onChange={(e) => setChecklistAnswers(prev => ({ ...prev, [q._id]: e.target.value }))}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {questions.length > 0 && (
                  <button className="ld2-btn-save" onClick={handleSaveChecklist}>
                    <i className="bi bi-check2"></i> Save Checklist
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Priority & Quick Actions (Desktop) */}
        <div className="ld2-right-col">
          {/* Priority Card */}
          <div className="ld2-card">
            <h4>Priority</h4>
            <div className="ld2-priority-btns">
              {['hot', 'warm', 'cold'].map(p => (
                <button
                  key={p}
                  className={`ld2-priority-btn ld2-priority-${p} ${lead.priority === p ? 'active' : ''}`}
                  onClick={() => handlePriorityChange(p)}
                >
                  {p === 'hot' && '🔥'}
                  {p === 'warm' && '☀️'}
                  {p === 'cold' && '❄️'}
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Next Follow-up Card */}
          <div className="ld2-card">
            <h4>Next Follow-up</h4>
            {lead.nextFollowUp ? (
              <div className="ld2-followup-info">
                <i className="bi bi-calendar-event"></i>
                <span>{formatDate(lead.nextFollowUp)}</span>
              </div>
            ) : (
              <p className="ld2-text-muted">No follow-up scheduled</p>
            )}
            <button className="ld2-btn-outline" onClick={() => setShowFollowUpModal(true)}>
              <i className="bi bi-calendar-plus"></i> Schedule
            </button>
          </div>

          {/* Quick Stats */}
          <div className="ld2-card">
            <h4>Quick Stats</h4>
            <div className="ld2-stats">
              <div className="ld2-stat">
                <span className="ld2-stat-value">{lead.activities?.filter(a => a.type === 'call').length || 0}</span>
                <span className="ld2-stat-label">Calls</span>
              </div>
              <div className="ld2-stat">
                <span className="ld2-stat-value">{lead.activities?.filter(a => a.type === 'note').length || 0}</span>
                <span className="ld2-stat-label">Notes</span>
              </div>
              <div className="ld2-stat">
                <span className="ld2-stat-value">{answeredCount}</span>
                <span className="ld2-stat-label">Answered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar (Mobile) */}
      <div className="ld2-bottom-bar">
        <button className="ld2-bottom-btn ld2-bottom-call" onClick={handleCall}>
          <i className="bi bi-telephone-fill"></i>
          <span>Call Now</span>
        </button>
        <button className="ld2-bottom-btn" onClick={() => setShowFollowUpModal(true)}>
          <i className="bi bi-calendar-plus"></i>
          <span>Follow-up</span>
        </button>
        <button className="ld2-bottom-btn" onClick={() => setShowNoteModal(true)}>
          <i className="bi bi-pencil"></i>
          <span>Add Note</span>
        </button>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="ld2-modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="ld2-modal" onClick={e => e.stopPropagation()}>
            <div className="ld2-modal-header">
              <h3>Add Activity</h3>
              <button onClick={() => setShowNoteModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="ld2-modal-body">
              <div className="ld2-form-group">
                <label>Type</label>
                <div className="ld2-type-btns">
                  {['note', 'call', 'whatsapp', 'email', 'meeting'].map(t => (
                    <button
                      key={t}
                      className={noteType === t ? 'active' : ''}
                      onClick={() => setNoteType(t)}
                    >
                      {getActivityIcon(t)} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ld2-form-group">
                <label>Note</label>
                <textarea
                  placeholder="Enter your note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                />
              </div>
              {noteType === 'call' && (
                <>
                  <div className="ld2-form-group">
                    <label>Call Outcome</label>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                      className="ld2-select"
                    >
                      <option value="">Select outcome...</option>
                      <option value="connected">Connected</option>
                      <option value="no_answer">No Answer</option>
                      <option value="busy">Busy</option>
                      <option value="voicemail">Voicemail</option>
                      <option value="wrong_number">Wrong Number</option>
                      <option value="callback_requested">Callback Requested</option>
                    </select>
                  </div>
                  <div className="ld2-form-group">
                    <label>
                      <i className="bi bi-mic"></i> Upload Call Recording
                    </label>
                    <div className="ld2-file-upload">
                      <input
                        type="file"
                        accept="audio/*"
                        id="recording-upload"
                        onChange={(e) => setRecordingFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="recording-upload" className="ld2-file-label">
                        <i className="bi bi-cloud-upload"></i>
                        {recordingFile ? recordingFile.name : 'Choose audio file...'}
                      </label>
                      {recordingFile && (
                        <button 
                          className="ld2-file-remove"
                          onClick={() => setRecordingFile(null)}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="ld2-modal-footer">
              <button className="ld2-btn-cancel" onClick={() => { setShowNoteModal(false); setRecordingFile(null); setCallOutcome(''); }}>Cancel</button>
              <button className="ld2-btn-primary" onClick={handleSaveNote}>Save Activity</button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Booking Modal */}
      {showDemoModal && (
        <div className="ld2-modal-overlay" onClick={() => setShowDemoModal(false)}>
          <div className="ld2-modal" onClick={e => e.stopPropagation()}>
            <div className="ld2-modal-header">
              <h3>{lead.demoBookedAt ? 'Reschedule Demo' : 'Book a Demo'}</h3>
              <button onClick={() => setShowDemoModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="ld2-modal-body">
              <div className="ld2-form-group">
                <label>Demo Date & Time *</label>
                <input
                  type="datetime-local"
                  value={demoDate}
                  onChange={(e) => setDemoDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="ld2-form-group">
                <label>Notes (optional)</label>
                <textarea
                  rows={3}
                  value={demoNotes}
                  onChange={(e) => setDemoNotes(e.target.value)}
                  placeholder="Add any notes about this demo..."
                />
              </div>
              {lead.demoBookedAt && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Currently booked: <strong>{formatDate(lead.demoBookedAt)}</strong>
                </p>
              )}
            </div>
            <div className="ld2-modal-footer">
              <button className="ld2-btn-cancel" onClick={() => setShowDemoModal(false)}>Cancel</button>
              <button className="ld2-btn-primary" onClick={handleSaveDemo} disabled={!demoDate || demoSaving}>
                {demoSaving ? 'Saving...' : 'Confirm Demo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && (
        <div className="ld2-modal-overlay" onClick={() => setShowFollowUpModal(false)}>
          <div className="ld2-modal" onClick={e => e.stopPropagation()}>
            <div className="ld2-modal-header">
              <h3>Schedule Follow-up</h3>
              <button onClick={() => setShowFollowUpModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="ld2-modal-body">
              <div className="ld2-quick-dates">
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'In 3 days', days: 3 },
                  { label: 'Next week', days: 7 }
                ].map(opt => {
                  const date = new Date();
                  date.setDate(date.getDate() + opt.days);
                  date.setHours(10, 0, 0, 0);
                  const dateStr = date.toISOString().slice(0, 16);
                  return (
                    <button
                      key={opt.label}
                      className={followUpDate === dateStr ? 'active' : ''}
                      onClick={() => setFollowUpDate(dateStr)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="ld2-form-group">
                <label>Or pick a date & time</label>
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
            </div>
            <div className="ld2-modal-footer">
              <button className="ld2-btn-cancel" onClick={() => setShowFollowUpModal(false)}>Cancel</button>
              <button className="ld2-btn-primary" onClick={handleSaveFollowUp}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailV2;
