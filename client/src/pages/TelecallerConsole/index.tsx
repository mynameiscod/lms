import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { leadApi, leadStageApi, qualificationApi, salesContentApi, leadAIApi, lostReasonApi } from '../../api';
import './TelecallerConsole.css';

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  priority?: 'hot' | 'warm' | 'cold';
  score?: number;
  stage?: { _id: string; name: string; color: string; category?: string };
  nextFollowUp?: string;
  whatsappStatus?: string;
  qualificationProgress?: number;
  assignedTo?: any;
  courseInterest?: string[];
  source?: string;
  createdAt: string;
  activities?: any[];
}

interface QualificationQuestion {
  _id: string;
  question: string;
  answerType: string;
  options?: { label: string; value: string; scoreImpact?: number }[];
  required?: boolean;
  placeholder?: string;
}

interface SalesContent {
  _id: string;
  title: string;
  category: string;
  contentType: string;
  fileUrl?: string;
  thumbnailUrl?: string;
}

interface Stage {
  _id: string;
  name: string;
  color: string;
  order: number;
  category?: string;
}

const TelecallerConsole: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Lead Queue State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  
  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'followUp' | 'recent'>('priority');
  
  // Quick Action State
  const [activityType, setActivityType] = useState<'call' | 'whatsapp' | 'note'>('call');
  const [callOutcome, setCallOutcome] = useState('');
  const [callSubOutcome, setCallSubOutcome] = useState('');
  const [activityNote, setActivityNote] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [newStageId, setNewStageId] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Qualification State
  const [questions, setQuestions] = useState<QualificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [qualificationProgress, setQualificationProgress] = useState(0);
  
  // Content Library State
  const [featuredContent, setFeaturedContent] = useState<SalesContent[]>([]);
  const [showContentModal, setShowContentModal] = useState(false);
  
  // AI Insights State
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Lost Reason State
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasons, setLostReasons] = useState<any[]>([]);
  const [selectedLostReason, setSelectedLostReason] = useState('');
  const [lostReasonDetail, setLostReasonDetail] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalLeads: 0,
    hotLeads: 0,
    todayFollowUps: 0,
    callsMade: 0
  });

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  // Load initial data
  useEffect(() => {
    loadData();
    loadStages();
    loadFeaturedContent();
    loadLostReasons();
  }, []);

  // Load leads with filters
  useEffect(() => {
    loadLeads();
  }, [priorityFilter, sortBy]);

  // Load qualification questions when lead changes
  useEffect(() => {
    if (selectedLead?.stage?._id) {
      loadQualificationQuestions(selectedLead.stage._id);
      loadLeadAnswers(selectedLead._id);
      loadAIInsights(selectedLead._id);
    }
  }, [selectedLead?._id]);

  const loadData = async () => {
    try {
      const perfRes = await leadApi.getMyPerformance();
      if (perfRes) {
        setStats({
          totalLeads: perfRes.totalAssigned || 0,
          hotLeads: perfRes.hotLeads || 0,
          todayFollowUps: perfRes.todayFollowUps || 0,
          callsMade: perfRes.callsMade || 0
        });
      }
    } catch (error) {
      console.error('Error loading performance:', error);
    }
  };

  const loadStages = async () => {
    try {
      const res = await leadStageApi.getStages();
      setStages(res.data || []);
    } catch (error) {
      console.error('Error loading stages:', error);
    }
  };

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await leadApi.getLeads({
        assignedTo: user?._id,
        limit: 50
      });
      
      let leadsList = res.data?.leads || [];
      
      // Filter by priority if selected
      if (priorityFilter !== 'all') {
        leadsList = leadsList.filter((l: Lead) => l.priority === priorityFilter);
      }
      
      // Sort leads
      leadsList.sort((a: Lead, b: Lead) => {
        if (sortBy === 'priority') {
          const priorityOrder = { hot: 0, warm: 1, cold: 2 };
          const aOrder = priorityOrder[a.priority || 'cold'];
          const bOrder = priorityOrder[b.priority || 'cold'];
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (b.score || 0) - (a.score || 0);
        } else if (sortBy === 'followUp') {
          if (!a.nextFollowUp && !b.nextFollowUp) return 0;
          if (!a.nextFollowUp) return 1;
          if (!b.nextFollowUp) return -1;
          return new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime();
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
      
      setLeads(leadsList);
      
      // Auto-select first lead if none selected
      if (!selectedLead && leadsList.length > 0) {
        setSelectedLead(leadsList[0]);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
      showAlert('error', 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const loadQualificationQuestions = async (stageId: string) => {
    try {
      const res = await qualificationApi.getQuestionsForStage(stageId);
      setQuestions(res.questions || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const loadLeadAnswers = async (leadId: string) => {
    try {
      const res = await qualificationApi.getLeadAnswers(leadId);
      if (res.answers) {
        const answerMap: Record<string, any> = {};
        res.answers.forEach((a: any) => {
          answerMap[a.questionId] = a.answer;
        });
        setAnswers(answerMap);
        setQualificationProgress(res.progress || 0);
      } else {
        setAnswers({});
        setQualificationProgress(0);
      }
    } catch (error) {
      console.error('Error loading answers:', error);
    }
  };

  const loadAIInsights = async (leadId: string) => {
    try {
      setLoadingInsights(true);
      const res = await leadAIApi.getQuickInsights(leadId);
      setAiInsights(res);
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadFeaturedContent = async () => {
    try {
      const res = await salesContentApi.getFeatured();
      setFeaturedContent(res || []);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const loadLostReasons = async () => {
    try {
      const res = await lostReasonApi.getActiveReasons();
      setLostReasons(res || []);
    } catch (error) {
      console.error('Error loading lost reasons:', error);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setActivityNote('');
    setCallOutcome('');
    setCallSubOutcome('');
  };

  const handleQuickUpdate = async () => {
    if (!selectedLead) return;
    
    try {
      setSaving(true);
      
      const updateData: any = {};
      
      if (newStageId) {
        updateData.stageId = newStageId;
      }
      if (nextFollowUpDate) {
        updateData.nextFollowUp = nextFollowUpDate;
      }
      if (activityNote || callOutcome) {
        updateData.activityType = activityType;
        updateData.activityDescription = activityNote || `${activityType} - ${callOutcome}`;
        if (callOutcome) {
          updateData.callOutcome = callOutcome;
          if (callSubOutcome) updateData.callSubOutcome = callSubOutcome;
        }
      }
      
      await leadApi.quickUpdate(selectedLead._id, updateData);
      
      showAlert('success', 'Lead updated successfully');
      
      // Clear form
      setActivityNote('');
      setCallOutcome('');
      setCallSubOutcome('');
      setNextFollowUpDate('');
      setNewStageId('');
      
      // Reload leads
      loadLeads();
      loadData();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQualificationAnswers = async () => {
    if (!selectedLead) return;
    
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));
      
      const answeredCount = answersArray.filter(a => a.answer !== undefined && a.answer !== '').length;
      const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
      
      await qualificationApi.saveLeadAnswers(selectedLead._id, {
        answers: answersArray,
        progress
      });
      
      setQualificationProgress(progress);
      showAlert('success', 'Answers saved');
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to save answers');
    }
  };

  const handleShareContent = async (contentId: string) => {
    if (!selectedLead) return;
    
    try {
      await salesContentApi.shareWithLead(contentId, {
        leadId: selectedLead._id,
        channel: 'whatsapp'
      });
      showAlert('success', 'Content shared successfully');
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to share content');
    }
  };

  const handleMarkAsLost = async () => {
    if (!selectedLead || !selectedLostReason) return;
    
    try {
      await lostReasonApi.markLeadAsLost(selectedLead._id, {
        reasonId: selectedLostReason,
        reason: lostReasons.find(r => r._id === selectedLostReason)?.label || '',
        detail: lostReasonDetail
      });
      
      showAlert('success', 'Lead marked as lost');
      setShowLostModal(false);
      setSelectedLostReason('');
      setLostReasonDetail('');
      loadLeads();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to mark lead as lost');
    }
  };

  const handleCallPhone = () => {
    if (selectedLead?.phone) {
      window.open(`tel:${selectedLead.phone}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    if (selectedLead?.phone) {
      const phone = selectedLead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const getPriorityBadge = (priority?: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      hot: { class: 'priority-hot', label: '🔥 Hot' },
      warm: { class: 'priority-warm', label: '🌡️ Warm' },
      cold: { class: 'priority-cold', label: '❄️ Cold' }
    };
    return badges[priority || 'cold'] || badges.cold;
  };

  const getFollowUpStatus = (date?: string) => {
    if (!date) return null;
    const followUp = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (followUp < today) return { class: 'followup-overdue', label: 'Overdue' };
    if (followUp.toDateString() === today.toDateString()) return { class: 'followup-today', label: 'Today' };
    return { class: 'followup-upcoming', label: formatDate(date) };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="telecaller-console">
      {/* Alert */}
      {alert && (
        <div className={`tc-alert tc-alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="tc-header">
        <h1>Telecaller Console</h1>
        <div className="tc-stats">
          <div className="tc-stat">
            <span className="tc-stat-value">{stats.totalLeads}</span>
            <span className="tc-stat-label">Assigned</span>
          </div>
          <div className="tc-stat hot">
            <span className="tc-stat-value">{stats.hotLeads}</span>
            <span className="tc-stat-label">Hot Leads</span>
          </div>
          <div className="tc-stat today">
            <span className="tc-stat-value">{stats.todayFollowUps}</span>
            <span className="tc-stat-label">Follow-ups Today</span>
          </div>
          <div className="tc-stat">
            <span className="tc-stat-value">{stats.callsMade}</span>
            <span className="tc-stat-label">Calls Made</span>
          </div>
        </div>
      </div>

      <div className="tc-main">
        {/* Lead Queue */}
        <div className="tc-lead-queue">
          <div className="tc-queue-header">
            <h2>Lead Queue</h2>
            <div className="tc-queue-filters">
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="hot">🔥 Hot Only</option>
                <option value="warm">🌡️ Warm Only</option>
                <option value="cold">❄️ Cold Only</option>
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="priority">By Priority</option>
                <option value="followUp">By Follow-up</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>

          <div className="tc-queue-list">
            {loading ? (
              <div className="tc-loading">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="tc-empty">No leads assigned</div>
            ) : (
              leads.map(lead => {
                const priorityBadge = getPriorityBadge(lead.priority);
                const followUpStatus = getFollowUpStatus(lead.nextFollowUp);
                const isSelected = selectedLead?._id === lead._id;
                
                return (
                  <div 
                    key={lead._id}
                    className={`tc-lead-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectLead(lead)}
                  >
                    <div className="tc-lead-header">
                      <span className="tc-lead-name">{lead.name}</span>
                      <span className={`tc-priority-badge ${priorityBadge.class}`}>
                        {priorityBadge.label}
                      </span>
                    </div>
                    <div className="tc-lead-info">
                      <span className="tc-lead-phone">{lead.phone}</span>
                      {lead.score !== undefined && (
                        <span className="tc-lead-score">Score: {lead.score}</span>
                      )}
                    </div>
                    <div className="tc-lead-meta">
                      <span className="tc-lead-stage" style={{ 
                        backgroundColor: (lead.stage as any)?.color || '#6b7280' 
                      }}>
                        {(lead.stage as any)?.name || 'New'}
                      </span>
                      {followUpStatus && (
                        <span className={`tc-followup-badge ${followUpStatus.class}`}>
                          {followUpStatus.label}
                        </span>
                      )}
                    </div>
                    {lead.qualificationProgress !== undefined && lead.qualificationProgress > 0 && (
                      <div className="tc-lead-progress">
                        <div 
                          className="tc-progress-bar" 
                          style={{ width: `${lead.qualificationProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Work Area */}
        <div className="tc-work-area">
          {selectedLead ? (
            <>
              {/* Lead Detail Header */}
              <div className="tc-lead-detail-header">
                <div className="tc-lead-detail-info">
                  <h2>{selectedLead.name}</h2>
                  <div className="tc-lead-contacts">
                    <span>{selectedLead.phone}</span>
                    {selectedLead.email && <span>{selectedLead.email}</span>}
                  </div>
                </div>
                <div className="tc-quick-actions">
                  <button 
                    className="tc-action-btn tc-call-btn" 
                    onClick={handleCallPhone}
                    title="Call"
                  >
                    📞 Call
                  </button>
                  <button 
                    className="tc-action-btn tc-whatsapp-btn" 
                    onClick={handleWhatsApp}
                    title="WhatsApp"
                  >
                    💬 WhatsApp
                  </button>
                  <button 
                    className="tc-action-btn tc-detail-btn" 
                    onClick={() => navigate(`/leads/${selectedLead._id}`)}
                    title="Full Details"
                  >
                    📋 Details
                  </button>
                </div>
              </div>

              {/* AI Insights Panel */}
              {aiInsights && (
                <div className="tc-ai-panel">
                  <h3>🤖 AI Insights</h3>
                  {loadingInsights ? (
                    <div className="tc-loading-small">Loading insights...</div>
                  ) : (
                    <>
                      <p className="tc-ai-summary">{aiInsights.summary}</p>
                      {aiInsights.suggestedActions && aiInsights.suggestedActions.length > 0 && (
                        <div className="tc-ai-actions">
                          <strong>Suggested Actions:</strong>
                          <ul>
                            {aiInsights.suggestedActions.slice(0, 3).map((action: string, i: number) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiInsights.conversionProbability !== undefined && (
                        <div className="tc-conversion-prob">
                          Conversion Probability: <strong>{aiInsights.conversionProbability}%</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Quick Update Form */}
              <div className="tc-update-form">
                <h3>Quick Update</h3>
                
                <div className="tc-form-row">
                  <div className="tc-activity-types">
                    <button 
                      className={`tc-type-btn ${activityType === 'call' ? 'active' : ''}`}
                      onClick={() => setActivityType('call')}
                    >
                      📞 Call
                    </button>
                    <button 
                      className={`tc-type-btn ${activityType === 'whatsapp' ? 'active' : ''}`}
                      onClick={() => setActivityType('whatsapp')}
                    >
                      💬 WhatsApp
                    </button>
                    <button 
                      className={`tc-type-btn ${activityType === 'note' ? 'active' : ''}`}
                      onClick={() => setActivityType('note')}
                    >
                      📝 Note
                    </button>
                  </div>
                </div>

                {activityType === 'call' && (
                  <div className="tc-form-row">
                    <label>Call Outcome</label>
                    <select 
                      value={callOutcome} 
                      onChange={(e) => { setCallOutcome(e.target.value); setCallSubOutcome(''); }}
                    >
                      <option value="">Select outcome...</option>
                      <option value="connected">Connected</option>
                      <option value="no_answer">No Answer</option>
                      <option value="busy">Busy</option>
                      <option value="wrong_number">Wrong Number</option>
                      <option value="switched_off">Switched Off</option>
                      <option value="callback_requested">Callback Requested</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </div>
                )}

                {activityType === 'call' && callOutcome === 'connected' && (
                  <div className="tc-form-row">
                    <label>Interest Level</label>
                    <div className="tc-sub-outcome-grid">
                      {[
                        { value: 'interested_follow_up', label: '✅ Follow Up', color: '#28a745' },
                        { value: 'interested_demo', label: '🎥 Demo', color: '#007bff' },
                        { value: 'interested_visit', label: '🏫 Visit', color: '#17a2b8' },
                        { value: 'interested_payment', label: '💳 Payment', color: '#fd7e14' },
                        { value: 'need_time', label: '⏳ Need Time', color: '#6c757d' },
                        { value: 'not_interested', label: '❌ Not Interested', color: '#dc3545' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`tc-sub-outcome-btn${callSubOutcome === opt.value ? ' active' : ''}`}
                          style={{ '--sub-color': opt.color } as any}
                          onClick={() => setCallSubOutcome(callSubOutcome === opt.value ? '' : opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="tc-form-row">
                  <label>Note</label>
                  <textarea 
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder="Add notes about the interaction..."
                    rows={3}
                  />
                </div>

                <div className="tc-form-row tc-form-row-inline">
                  <div className="tc-form-field">
                    <label>Move to Stage</label>
                    <select 
                      value={newStageId} 
                      onChange={(e) => setNewStageId(e.target.value)}
                    >
                      <option value="">Keep current stage</option>
                      {stages.map(stage => (
                        <option key={stage._id} value={stage._id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="tc-form-field">
                    <label>Next Follow-up</label>
                    <input 
                      type="datetime-local"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="tc-form-actions">
                  <button 
                    className="tc-btn tc-btn-primary"
                    onClick={handleQuickUpdate}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save & Continue'}
                  </button>
                  <button 
                    className="tc-btn tc-btn-danger"
                    onClick={() => setShowLostModal(true)}
                  >
                    Mark as Lost
                  </button>
                </div>
              </div>

              {/* Qualification Questions */}
              {questions.length > 0 && (
                <div className="tc-qualification-panel">
                  <div className="tc-panel-header">
                    <h3>Qualification Questions</h3>
                    <span className="tc-progress-text">{qualificationProgress}% Complete</span>
                  </div>
                  <div className="tc-progress-bar-container">
                    <div 
                      className="tc-progress-bar" 
                      style={{ width: `${qualificationProgress}%` }}
                    />
                  </div>
                  <div className="tc-questions-list">
                    {questions.map(q => (
                      <div key={q._id} className="tc-question">
                        <label>{q.question} {q.required && <span className="required">*</span>}</label>
                        {q.answerType === 'select' || q.answerType === 'radio' ? (
                          <select
                            value={answers[q._id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })}
                          >
                            <option value="">Select...</option>
                            {q.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : q.answerType === 'text' ? (
                          <input
                            type="text"
                            value={answers[q._id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })}
                            placeholder={q.placeholder}
                          />
                        ) : q.answerType === 'number' ? (
                          <input
                            type="number"
                            value={answers[q._id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })}
                            placeholder={q.placeholder}
                          />
                        ) : q.answerType === 'boolean' ? (
                          <div className="tc-radio-group">
                            <label>
                              <input
                                type="radio"
                                name={`q_${q._id}`}
                                value="yes"
                                checked={answers[q._id] === 'yes'}
                                onChange={() => setAnswers({ ...answers, [q._id]: 'yes' })}
                              />
                              Yes
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`q_${q._id}`}
                                value="no"
                                checked={answers[q._id] === 'no'}
                                onChange={() => setAnswers({ ...answers, [q._id]: 'no' })}
                              />
                              No
                            </label>
                          </div>
                        ) : (
                          <textarea
                            value={answers[q._id] || ''}
                            onChange={(e) => setAnswers({ ...answers, [q._id]: e.target.value })}
                            placeholder={q.placeholder}
                            rows={2}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    className="tc-btn tc-btn-secondary"
                    onClick={handleSaveQualificationAnswers}
                  >
                    Save Answers
                  </button>
                </div>
              )}

              {/* Content Library Quick Access */}
              {featuredContent.length > 0 && (
                <div className="tc-content-panel">
                  <h3>📚 Quick Share</h3>
                  <div className="tc-content-grid">
                    {featuredContent.slice(0, 4).map(content => (
                      <div key={content._id} className="tc-content-item">
                        <span className="tc-content-title">{content.title}</span>
                        <button 
                          className="tc-share-btn"
                          onClick={() => handleShareContent(content._id)}
                        >
                          Share
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="tc-btn tc-btn-link"
                    onClick={() => setShowContentModal(true)}
                  >
                    View All Content →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="tc-no-lead-selected">
              <h3>Select a lead to get started</h3>
              <p>Choose a lead from the queue to view details and take action</p>
            </div>
          )}
        </div>
      </div>

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div className="tc-modal-overlay" onClick={() => setShowLostModal(false)}>
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mark Lead as Lost</h3>
            <div className="tc-form-row">
              <label>Reason *</label>
              <select
                value={selectedLostReason}
                onChange={(e) => setSelectedLostReason(e.target.value)}
              >
                <option value="">Select reason...</option>
                {lostReasons.map(reason => (
                  <option key={reason._id} value={reason._id}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tc-form-row">
              <label>Additional Details</label>
              <textarea
                value={lostReasonDetail}
                onChange={(e) => setLostReasonDetail(e.target.value)}
                placeholder="Add any additional context..."
                rows={3}
              />
            </div>
            <div className="tc-modal-actions">
              <button 
                className="tc-btn tc-btn-secondary"
                onClick={() => setShowLostModal(false)}
              >
                Cancel
              </button>
              <button 
                className="tc-btn tc-btn-danger"
                onClick={handleMarkAsLost}
                disabled={!selectedLostReason}
              >
                Mark as Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelecallerConsole;
