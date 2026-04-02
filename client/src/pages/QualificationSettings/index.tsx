import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { qualificationApi, leadStageApi } from '../../api';
import './QualificationSettings.css';

interface ScoreImpact {
  answerValue: any;
  impact: number;
}

interface QualificationQuestion {
  _id?: string;
  id: string;
  question: string;
  category: 'personal' | 'education' | 'career' | 'financial' | 'timeline' | 'technical';
  answerType: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date' | 'rating';
  options?: string[];
  order: number;
  showInStages?: string[];
  required: boolean;
  enabled: boolean;
  fieldToUpdate?: string;
  scoreImpact?: ScoreImpact[];
  helpText?: string;
}

interface Stage {
  _id: string;
  name: string;
}

interface QualificationConfig {
  _id?: string;
  questions: QualificationQuestion[];
  settings?: {
    showProgressBar: boolean;
    allowSkip: boolean;
    randomizeOrder: boolean;
  };
  whatsappSettings?: {
    enabled: boolean;
    welcomeMessage: string;
    completionMessage: string;
    noResponseTimeoutHours: number;
    maxQuestions: number;
  };
}

const CATEGORIES = [
  { value: 'personal', label: 'Personal Info', icon: 'fa-user', color: '#3b82f6' },
  { value: 'education', label: 'Education', icon: 'fa-graduation-cap', color: '#8b5cf6' },
  { value: 'career', label: 'Career Goals', icon: 'fa-briefcase', color: '#10b981' },
  { value: 'financial', label: 'Budget/Finance', icon: 'fa-dollar-sign', color: '#f59e0b' },
  { value: 'timeline', label: 'Timeline', icon: 'fa-clock', color: '#ef4444' },
  { value: 'technical', label: 'Technical', icon: 'fa-laptop-code', color: '#6366f1' }
];

const ANSWER_TYPES = [
  { value: 'text', label: 'Text Input', icon: 'fa-font' },
  { value: 'select', label: 'Single Select', icon: 'fa-circle-dot' },
  { value: 'multiselect', label: 'Multi Select', icon: 'fa-square-check' },
  { value: 'number', label: 'Number', icon: 'fa-hashtag' },
  { value: 'boolean', label: 'Yes/No', icon: 'fa-toggle-on' },
  { value: 'date', label: 'Date', icon: 'fa-calendar' },
  { value: 'rating', label: 'Rating (1-5)', icon: 'fa-star' }
];

const LEAD_FIELDS = [
  { value: '', label: 'Don\'t update any field' },
  { value: 'budget', label: 'Budget' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'graduationYear', label: 'Graduation Year' },
  { value: 'employmentStatus', label: 'Employment Status' },
  { value: 'preferenceMode', label: 'Training Mode Preference' },
  { value: 'city', label: 'City' },
  { value: 'courseInterest', label: 'Course Interest' },
  { value: 'notes', label: 'Append to Notes' }
];

const DEFAULT_QUESTIONS: QualificationQuestion[] = [
  {
    id: 'q1',
    question: 'What is your current employment status?',
    category: 'career',
    answerType: 'select',
    options: ['Student', 'Fresher', 'Working Professional', 'Career Break'],
    order: 1,
    required: true,
    enabled: true,
    fieldToUpdate: 'employmentStatus',
    helpText: 'Understanding their current situation helps tailor the pitch'
  },
  {
    id: 'q2',
    question: 'When are you planning to start the course?',
    category: 'timeline',
    answerType: 'select',
    options: ['Immediately', 'Within 1 month', 'Within 3 months', 'Just exploring'],
    order: 2,
    required: true,
    enabled: true,
    fieldToUpdate: 'timeline',
    scoreImpact: [
      { answerValue: 'Immediately', impact: 30 },
      { answerValue: 'Within 1 month', impact: 20 },
      { answerValue: 'Within 3 months', impact: 10 },
      { answerValue: 'Just exploring', impact: -10 }
    ]
  },
  {
    id: 'q3',
    question: 'What is your budget range for training?',
    category: 'financial',
    answerType: 'select',
    options: ['Below 25k', '25k - 50k', '50k - 75k', '75k+', 'Need EMI option'],
    order: 3,
    required: true,
    enabled: true,
    fieldToUpdate: 'budget',
    scoreImpact: [
      { answerValue: '75k+', impact: 20 },
      { answerValue: '50k - 75k', impact: 15 },
      { answerValue: '25k - 50k', impact: 5 },
      { answerValue: 'Below 25k', impact: -10 },
      { answerValue: 'Need EMI option', impact: 0 }
    ]
  },
  {
    id: 'q4',
    question: 'Do you prefer online or offline training?',
    category: 'personal',
    answerType: 'select',
    options: ['Online Only', 'Offline Only', 'Hybrid (Both)', 'Flexible'],
    order: 4,
    required: false,
    enabled: true,
    fieldToUpdate: 'preferenceMode'
  },
  {
    id: 'q5',
    question: 'What is your graduation year?',
    category: 'education',
    answerType: 'number',
    order: 5,
    required: false,
    enabled: true,
    fieldToUpdate: 'graduationYear'
  },
  {
    id: 'q6',
    question: 'Which city are you based in?',
    category: 'personal',
    answerType: 'text',
    order: 6,
    required: false,
    enabled: true,
    fieldToUpdate: 'city'
  },
  {
    id: 'q7',
    question: 'Are you interested in placement assistance?',
    category: 'career',
    answerType: 'boolean',
    order: 7,
    required: false,
    enabled: true
  },
  {
    id: 'q8',
    question: 'How did you hear about us?',
    category: 'personal',
    answerType: 'select',
    options: ['Google Search', 'YouTube', 'Instagram', 'Facebook', 'LinkedIn', 'Friend/Referral', 'Other'],
    order: 8,
    required: false,
    enabled: true
  }
];

const QualificationSettings: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<QualificationConfig | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [editingQuestion, setEditingQuestion] = useState<QualificationQuestion | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'preview'>('questions');
  const [previewMode, setPreviewMode] = useState<'bdm' | 'whatsapp'>('bdm');

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configRes, stagesRes] = await Promise.all([
        qualificationApi.getConfig(),
        leadStageApi.getStages()
      ]);
      
      // Handle both wrapped { data: config } and direct config responses
      const configData = configRes?.data || configRes;
      if (configData && configData.questions) {
        setConfig(configData);
      } else {
        // Initialize with defaults
        setConfig({
          questions: DEFAULT_QUESTIONS,
          settings: {
            showProgressBar: true,
            allowSkip: true,
            randomizeOrder: false
          },
          whatsappSettings: {
            enabled: false,
            welcomeMessage: 'Hi {name}! I\'d like to ask you a few quick questions to understand your requirements better.',
            completionMessage: 'Thank you for your responses! A counselor will connect with you shortly.',
            noResponseTimeoutHours: 24,
            maxQuestions: 5
          }
        });
      }
      
      setStages(stagesRes?.data || stagesRes || []);
    } catch (error: any) {
      console.error('Load error:', error);
      // Initialize with defaults on error
      setConfig({
        questions: DEFAULT_QUESTIONS,
        settings: {
          showProgressBar: true,
          allowSkip: true,
          randomizeOrder: false
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion({
      id: `q_${Date.now()}`,
      question: '',
      category: 'personal',
      answerType: 'text',
      order: (config?.questions.length || 0) + 1,
      required: false,
      enabled: true,
      options: []
    });
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (q: QualificationQuestion) => {
    setEditingQuestion({ ...q });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion || !config) return;
    
    if (!editingQuestion.question.trim()) {
      showAlertMsg('error', 'Question text is required');
      return;
    }

    try {
      setSaving(true);
      
      const isNew = !config.questions.find(q => q.id === editingQuestion.id);
      
      if (isNew) {
        await qualificationApi.addQuestion(editingQuestion);
        showAlertMsg('success', 'Question added successfully');
      } else {
        await qualificationApi.updateQuestion(editingQuestion.id, editingQuestion);
        showAlertMsg('success', 'Question updated successfully');
      }
      
      setShowQuestionModal(false);
      setEditingQuestion(null);
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await qualificationApi.deleteQuestion(questionId);
      showAlertMsg('success', 'Question deleted');
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to delete question');
    }
  };

  const handleToggleQuestion = async (question: QualificationQuestion) => {
    try {
      await qualificationApi.updateQuestion(question.id, { 
        ...question, 
        enabled: !question.enabled 
      });
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update question');
    }
  };

  const handleSaveSettings = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      await qualificationApi.updateConfig({
        settings: config.settings,
        whatsappSettings: config.whatsappSettings
      });
      showAlertMsg('success', 'Settings saved successfully');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('This will reset all questions to defaults. Continue?')) return;
    
    try {
      setSaving(true);
      await qualificationApi.resetToDefaults();
      showAlertMsg('success', 'Reset to defaults successfully');
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to reset');
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (questionId: string, direction: 'up' | 'down') => {
    if (!config) return;
    
    const questions = [...config.questions];
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx === -1) return;
    
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= questions.length) return;
    
    // Swap
    [questions[idx], questions[newIdx]] = [questions[newIdx], questions[idx]];
    
    // Update orders
    questions.forEach((q, i) => q.order = i + 1);
    
    try {
      await qualificationApi.reorderQuestions(
        questions.map(q => ({ id: q.id, order: q.order }))
      );
      setConfig({ ...config, questions });
    } catch (error: any) {
      showAlertMsg('error', 'Failed to reorder questions');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-lg-4">
      {/* Alert */}
      {alert && (
        <div className={`alert alert-${alert.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show d-flex align-items-center`} role="alert">
          <i className={`fa-solid ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2`}></i>
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 mb-1 fw-bold text-dark">
            <i className="fa-solid fa-circle-question text-primary me-2"></i>
            Qualification Questions
          </h1>
          <p className="text-muted mb-0 small">Configure questions for BDMs to ask leads during calls</p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={handleResetToDefaults}
          disabled={saving}
        >
          <i className="fa-solid fa-rotate-left me-2"></i>Reset to Defaults
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button 
            className={`nav-link ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <i className="fa-solid fa-list-check me-2"></i>Questions
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button 
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fa-solid fa-gear me-2"></i>Settings
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button 
            className={`nav-link ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <i className="fa-solid fa-eye me-2"></i>Preview
          </button>
        </li>
      </ul>

      {/* Content */}
      <div className="tab-content">
        {/* Questions Tab */}
        {activeTab === 'questions' && config && (
          <div className="tab-pane fade show active">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
              <span className="badge bg-light text-dark fs-6 fw-normal">
                <i className="fa-solid fa-check-circle text-success me-1"></i>
                {config.questions.filter(q => q.enabled).length} active questions
              </span>
              <button className="btn btn-primary" onClick={handleAddQuestion}>
                <i className="fa-solid fa-plus me-2"></i>Add Question
              </button>
            </div>

            {/* Category Filter */}
            <div className="d-flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(cat => (
                <span 
                  key={cat.value} 
                  className="badge rounded-pill"
                  style={{ background: cat.color, padding: '8px 14px' }}
                >
                  <i className={`fa-solid ${cat.icon} me-1`}></i>
                  {cat.label}: {config.questions.filter(q => q.category === cat.value && q.enabled).length}
                </span>
              ))}
            </div>

            {/* Questions List */}
            <div className="d-flex flex-column gap-3">
              {config.questions.length === 0 ? (
                <div className="card border-dashed text-center py-5">
                  <div className="card-body">
                    <i className="fa-solid fa-inbox fa-3x text-muted mb-3"></i>
                    <p className="text-muted mb-3">No questions configured yet</p>
                    <button className="btn btn-primary" onClick={handleAddQuestion}>
                      <i className="fa-solid fa-plus me-2"></i>Add Your First Question
                    </button>
                  </div>
                </div>
              ) : (
                config.questions
                  .sort((a, b) => a.order - b.order)
                  .map((q, index) => (
                  <div 
                    key={q.id} 
                    className={`card border ${!q.enabled ? 'bg-light opacity-50' : ''}`}
                  >
                    <div className="card-body d-flex gap-3">
                      {/* Order Controls */}
                      <div className="d-flex flex-column align-items-center" style={{ minWidth: '45px' }}>
                        <button 
                          className="btn btn-sm btn-outline-secondary mb-1"
                          onClick={() => moveQuestion(q.id, 'up')}
                          disabled={index === 0}
                          style={{ width: '32px', height: '28px', padding: 0 }}
                        >
                          <i className="fa-solid fa-chevron-up"></i>
                        </button>
                        <span className="fw-bold text-primary fs-5">{q.order}</span>
                        <button 
                          className="btn btn-sm btn-outline-secondary mt-1"
                          onClick={() => moveQuestion(q.id, 'down')}
                          disabled={index === config.questions.length - 1}
                          style={{ width: '32px', height: '28px', padding: 0 }}
                        >
                          <i className="fa-solid fa-chevron-down"></i>
                        </button>
                      </div>
                      
                      {/* Question Body */}
                      <div className="flex-grow-1">
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          <span 
                            className="badge"
                            style={{ background: CATEGORIES.find(c => c.value === q.category)?.color }}
                          >
                            <i className={`fa-solid ${CATEGORIES.find(c => c.value === q.category)?.icon} me-1`}></i>
                            {CATEGORIES.find(c => c.value === q.category)?.label}
                          </span>
                          <span className="badge bg-secondary">
                            <i className={`fa-solid ${ANSWER_TYPES.find(t => t.value === q.answerType)?.icon} me-1`}></i>
                            {ANSWER_TYPES.find(t => t.value === q.answerType)?.label}
                          </span>
                          {q.required && (
                            <span className="badge bg-danger">
                              <i className="fa-solid fa-asterisk me-1"></i>Required
                            </span>
                          )}
                          {q.fieldToUpdate && (
                            <span className="badge bg-info">
                              <i className="fa-solid fa-arrow-right me-1"></i>{q.fieldToUpdate}
                            </span>
                          )}
                        </div>
                        
                        <p className="fw-semibold mb-2 text-dark">{q.question}</p>
                        
                        {q.options && q.options.length > 0 && (
                          <p className="small text-muted mb-2">
                            <i className="fa-solid fa-list me-1"></i>
                            Options: {q.options.join(' • ')}
                          </p>
                        )}
                        
                        {q.helpText && (
                          <p className="small text-info mb-2">
                            <i className="fa-solid fa-lightbulb me-1"></i>{q.helpText}
                          </p>
                        )}
                        
                        {q.scoreImpact && q.scoreImpact.length > 0 && (
                          <div className="d-flex flex-wrap gap-1">
                            {q.scoreImpact.map((si, i) => (
                              <span key={i} className={`badge ${si.impact >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                "{si.answerValue}": {si.impact > 0 ? '+' : ''}{si.impact}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="d-flex flex-column gap-2">
                        <button 
                          className={`btn btn-sm ${q.enabled ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => handleToggleQuestion(q)}
                          title={q.enabled ? 'Disable' : 'Enable'}
                          style={{ width: '38px', height: '38px' }}
                        >
                          <i className={`fa-solid ${q.enabled ? 'fa-check' : 'fa-circle'}`}></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditQuestion(q)}
                          title="Edit"
                          style={{ width: '38px', height: '38px' }}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Delete"
                          style={{ width: '38px', height: '38px' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && config && (
          <div className="tab-pane fade show active">
            <div className="row g-4">
              <div className="col-lg-6">
                <div className="card h-100">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">
                      <i className="fa-solid fa-sliders me-2 text-primary"></i>General Settings
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="showProgressBar"
                        checked={config.settings?.showProgressBar || false}
                        onChange={(e) => setConfig({
                          ...config,
                          settings: { ...config.settings!, showProgressBar: e.target.checked }
                        })}
                      />
                      <label className="form-check-label" htmlFor="showProgressBar">
                        <i className="fa-solid fa-bars-progress me-2 text-muted"></i>
                        Show progress bar to BDMs
                      </label>
                    </div>
                    
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="allowSkip"
                        checked={config.settings?.allowSkip || false}
                        onChange={(e) => setConfig({
                          ...config,
                          settings: { ...config.settings!, allowSkip: e.target.checked }
                        })}
                      />
                      <label className="form-check-label" htmlFor="allowSkip">
                        <i className="fa-solid fa-forward me-2 text-muted"></i>
                        Allow skipping non-required questions
                      </label>
                    </div>
                    
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="randomizeOrder"
                        checked={config.settings?.randomizeOrder || false}
                        onChange={(e) => setConfig({
                          ...config,
                          settings: { ...config.settings!, randomizeOrder: e.target.checked }
                        })}
                      />
                      <label className="form-check-label" htmlFor="randomizeOrder">
                        <i className="fa-solid fa-shuffle me-2 text-muted"></i>
                        Randomize question order
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card h-100">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">
                      <i className="fa-brands fa-whatsapp me-2 text-success"></i>WhatsApp Auto-Qualification
                    </h5>
                  </div>
                  <div className="card-body">
                    <p className="text-muted small mb-3">
                      Automatically ask qualification questions via WhatsApp when a lead replies
                    </p>
                    
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="waEnabled"
                        checked={config.whatsappSettings?.enabled || false}
                        onChange={(e) => setConfig({
                          ...config,
                          whatsappSettings: { ...config.whatsappSettings!, enabled: e.target.checked }
                        })}
                      />
                      <label className="form-check-label" htmlFor="waEnabled">
                        Enable WhatsApp Auto-Qualification
                      </label>
                    </div>
                    
                    {config.whatsappSettings?.enabled && (
                      <>
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            <i className="fa-solid fa-message me-1"></i>Welcome Message
                          </label>
                          <textarea
                            className="form-control"
                            value={config.whatsappSettings?.welcomeMessage || ''}
                            onChange={(e) => setConfig({
                              ...config,
                              whatsappSettings: { ...config.whatsappSettings!, welcomeMessage: e.target.value }
                            })}
                            rows={2}
                            placeholder="Use {name} for lead's name"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label small fw-semibold">
                            <i className="fa-solid fa-circle-check me-1"></i>Completion Message
                          </label>
                          <textarea
                            className="form-control"
                            value={config.whatsappSettings?.completionMessage || ''}
                            onChange={(e) => setConfig({
                              ...config,
                              whatsappSettings: { ...config.whatsappSettings!, completionMessage: e.target.value }
                            })}
                            rows={2}
                          />
                        </div>
                        
                        <div className="row g-3">
                          <div className="col-6">
                            <label className="form-label small fw-semibold">
                              <i className="fa-solid fa-list-ol me-1"></i>Max Questions
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              value={config.whatsappSettings?.maxQuestions || 5}
                              onChange={(e) => setConfig({
                                ...config,
                                whatsappSettings: { ...config.whatsappSettings!, maxQuestions: parseInt(e.target.value) || 5 }
                              })}
                              min={1}
                              max={10}
                            />
                          </div>
                          
                          <div className="col-6">
                            <label className="form-label small fw-semibold">
                              <i className="fa-solid fa-clock me-1"></i>Timeout (hours)
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              value={config.whatsappSettings?.noResponseTimeoutHours || 24}
                              onChange={(e) => setConfig({
                                ...config,
                                whatsappSettings: { ...config.whatsappSettings!, noResponseTimeoutHours: parseInt(e.target.value) || 24 }
                              })}
                              min={1}
                              max={72}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <button 
                className="btn btn-primary"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check me-2"></i>Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && config && (
          <div className="tab-pane fade show active">
            <div className="btn-group mb-4" role="group">
              <button 
                className={`btn ${previewMode === 'bdm' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPreviewMode('bdm')}
              >
                <i className="fa-solid fa-headset me-2"></i>BDM View
              </button>
              <button 
                className={`btn ${previewMode === 'whatsapp' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setPreviewMode('whatsapp')}
              >
                <i className="fa-brands fa-whatsapp me-2"></i>WhatsApp View
              </button>
            </div>

            {previewMode === 'bdm' ? (
              <div className="card" style={{ maxWidth: '600px' }}>
                <div className="card-header bg-primary text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fa-solid fa-clipboard-question me-2"></i>
                      Qualification Questions
                    </h5>
                    <span className="badge bg-white text-primary">
                      0 / {config.questions.filter(q => q.enabled).length}
                    </span>
                  </div>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div className="progress-bar bg-white" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {config.questions
                    .filter(q => q.enabled)
                    .sort((a, b) => a.order - b.order)
                    .map((q, i) => (
                    <div key={q.id} className="mb-4 pb-3 border-bottom">
                      <div className="d-flex gap-3">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                             style={{ width: '28px', height: '28px', minWidth: '28px', fontSize: '12px', fontWeight: '600' }}>
                          {i + 1}
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-2 fw-semibold">
                            {q.question}
                            {q.required && <span className="text-danger ms-1">*</span>}
                          </p>
                          
                          {q.answerType === 'text' && (
                            <input type="text" className="form-control form-control-sm" placeholder="Type answer..." disabled />
                          )}
                          
                          {q.answerType === 'select' && (
                            <div className="d-flex flex-wrap gap-2">
                              {q.options?.map((opt, j) => (
                                <button key={j} className="btn btn-outline-secondary btn-sm">{opt}</button>
                              ))}
                            </div>
                          )}
                          
                          {q.answerType === 'multiselect' && (
                            <div className="d-flex flex-column gap-1">
                              {q.options?.map((opt, j) => (
                                <div key={j} className="form-check">
                                  <input className="form-check-input" type="checkbox" disabled />
                                  <label className="form-check-label small">{opt}</label>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {q.answerType === 'boolean' && (
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-success btn-sm">
                                <i className="fa-solid fa-check me-1"></i>Yes
                              </button>
                              <button className="btn btn-outline-danger btn-sm">
                                <i className="fa-solid fa-xmark me-1"></i>No
                              </button>
                            </div>
                          )}
                          
                          {q.answerType === 'number' && (
                            <input type="number" className="form-control form-control-sm" style={{ maxWidth: '150px' }} placeholder="Enter number..." disabled />
                          )}
                          
                          {q.answerType === 'date' && (
                            <input type="date" className="form-control form-control-sm" style={{ maxWidth: '200px' }} disabled />
                          )}
                          
                          {q.answerType === 'rating' && (
                            <div className="d-flex gap-1">
                              {[1,2,3,4,5].map(n => (
                                <button key={n} className="btn btn-outline-warning btn-sm" style={{ width: '36px' }}>
                                  <i className="fa-solid fa-star"></i>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card bg-dark" style={{ maxWidth: '380px', borderRadius: '24px' }}>
                <div className="card-header bg-success text-white d-flex align-items-center gap-3" style={{ borderRadius: '24px 24px 0 0' }}>
                  <div className="bg-white text-success rounded-circle d-flex align-items-center justify-content-center fw-bold" 
                       style={{ width: '40px', height: '40px' }}>
                    CB
                  </div>
                  <div>
                    <div className="fw-semibold">CodeBegun</div>
                    <small className="opacity-75">online</small>
                  </div>
                </div>
                <div className="card-body bg-light" style={{ maxHeight: '400px', overflowY: 'auto', backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23d1d5db" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                  <div className="d-flex flex-column gap-3 py-2">
                    <div className="bg-white rounded-3 p-3 shadow-sm ms-0" style={{ maxWidth: '85%' }}>
                      {config.whatsappSettings?.welcomeMessage?.replace('{name}', 'John') || 'Hi! Let me ask you a few questions.'}
                    </div>
                    
                    {config.questions
                      .filter(q => q.enabled)
                      .slice(0, config.whatsappSettings?.maxQuestions || 5)
                      .map((q, i) => (
                      <React.Fragment key={q.id}>
                        <div className="bg-white rounded-3 p-3 shadow-sm ms-0" style={{ maxWidth: '85%' }}>
                          <strong>{i + 1}.</strong> {q.question}
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2 small text-muted">
                              {q.options.map((opt, j) => (
                                <div key={j}>{j + 1}. {opt}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="bg-success-subtle rounded-3 p-2 shadow-sm ms-auto text-muted small" style={{ maxWidth: '70%' }}>
                          <i className="fa-solid fa-ellipsis fa-fade"></i> Lead's response...
                        </div>
                      </React.Fragment>
                    ))}
                    
                    <div className="bg-white rounded-3 p-3 shadow-sm ms-0" style={{ maxWidth: '85%' }}>
                      {config.whatsappSettings?.completionMessage || 'Thank you! A counselor will contact you soon.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Question Edit Modal */}
      {showQuestionModal && editingQuestion && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`fa-solid ${editingQuestion._id ? 'fa-pen' : 'fa-plus'} me-2 text-primary`}></i>
                  {editingQuestion._id ? 'Edit Question' : 'Add New Question'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowQuestionModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Question Text <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    value={editingQuestion.question}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                    placeholder="Enter the question to ask the lead..."
                    rows={2}
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fa-solid fa-tag me-1"></i>Category
                    </label>
                    <select
                      className="form-select"
                      value={editingQuestion.category}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value as any })}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fa-solid fa-keyboard me-1"></i>Answer Type
                    </label>
                    <select
                      className="form-select"
                      value={editingQuestion.answerType}
                      onChange={(e) => setEditingQuestion({ 
                        ...editingQuestion, 
                        answerType: e.target.value as any,
                        options: ['select', 'multiselect'].includes(e.target.value) ? editingQuestion.options || [] : undefined
                      })}
                    >
                      {ANSWER_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {['select', 'multiselect'].includes(editingQuestion.answerType) && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      <i className="fa-solid fa-list me-1"></i>Options (one per line)
                    </label>
                    <textarea
                      className="form-control"
                      value={(editingQuestion.options || []).join('\n')}
                      onChange={(e) => setEditingQuestion({
                        ...editingQuestion,
                        options: e.target.value.split('\n').filter(o => o.trim())
                      })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      rows={4}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fa-solid fa-database me-1"></i>Auto-Update Lead Field
                  </label>
                  <select
                    className="form-select"
                    value={editingQuestion.fieldToUpdate || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, fieldToUpdate: e.target.value || undefined })}
                  >
                    {LEAD_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <div className="form-text">The lead's answer will automatically update this field</div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fa-solid fa-lightbulb me-1"></i>Help Text (for BDMs)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingQuestion.helpText || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, helpText: e.target.value })}
                    placeholder="Tips for BDMs on how to ask this question..."
                  />
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="requiredCheck"
                    checked={editingQuestion.required}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="requiredCheck">
                    <i className="fa-solid fa-asterisk text-danger me-1"></i>
                    Required question (BDM must answer before moving lead)
                  </label>
                </div>

                {/* Score Impact Section */}
                {['select', 'multiselect'].includes(editingQuestion.answerType) && editingQuestion.options && editingQuestion.options.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      <i className="fa-solid fa-chart-line me-1"></i>Score Impact (optional)
                    </label>
                    <p className="form-text mb-2">Affects lead priority scoring</p>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-light">
                          <tr>
                            <th>Option</th>
                            <th style={{ width: '120px' }}>Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingQuestion.options.map((opt, i) => (
                            <tr key={i}>
                              <td className="align-middle">{opt}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="0"
                                  value={editingQuestion.scoreImpact?.find(si => si.answerValue === opt)?.impact || ''}
                                  onChange={(e) => {
                                    const impact = parseInt(e.target.value) || 0;
                                    const existing = editingQuestion.scoreImpact || [];
                                    const filtered = existing.filter(si => si.answerValue !== opt);
                                    if (impact !== 0) {
                                      filtered.push({ answerValue: opt, impact });
                                    }
                                    setEditingQuestion({ ...editingQuestion, scoreImpact: filtered });
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowQuestionModal(false);
                    setEditingQuestion(null);
                  }}
                >
                  <i className="fa-solid fa-xmark me-2"></i>Cancel
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveQuestion}
                  disabled={saving || !editingQuestion.question.trim()}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check me-2"></i>Save Question
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualificationSettings;
