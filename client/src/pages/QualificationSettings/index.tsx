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
  { value: 'personal', label: '👤 Personal Info', color: '#3b82f6' },
  { value: 'education', label: '🎓 Education', color: '#8b5cf6' },
  { value: 'career', label: '💼 Career Goals', color: '#10b981' },
  { value: 'financial', label: '💰 Budget/Finance', color: '#f59e0b' },
  { value: 'timeline', label: '⏰ Timeline', color: '#ef4444' },
  { value: 'technical', label: '💻 Technical', color: '#6366f1' }
];

const ANSWER_TYPES = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'select', label: 'Single Select', icon: '☑️' },
  { value: 'multiselect', label: 'Multi Select', icon: '✅' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'boolean', label: 'Yes/No', icon: '👍' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'rating', label: 'Rating (1-5)', icon: '⭐' }
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
      
      if (configRes && configRes.questions) {
        setConfig(configRes);
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
      
      setStages(stagesRes || []);
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
    return <div className="qs-loading">Loading configuration...</div>;
  }

  return (
    <div className="qualification-settings">
      {/* Alert */}
      {alert && (
        <div className={`qs-alert qs-alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="qs-header">
        <div>
          <h1>🎯 Qualification Questions</h1>
          <p className="qs-subtitle">Configure questions for BDMs to ask leads during calls</p>
        </div>
        <div className="qs-header-actions">
          <button 
            className="qs-btn qs-btn-outline"
            onClick={handleResetToDefaults}
            disabled={saving}
          >
            ↩️ Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="qs-tabs">
        <button 
          className={`qs-tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          📝 Questions
        </button>
        <button 
          className={`qs-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button 
          className={`qs-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
      </div>

      {/* Content */}
      <div className="qs-content">
        {/* Questions Tab */}
        {activeTab === 'questions' && config && (
          <div className="qs-questions-section">
            <div className="qs-section-header">
              <div className="qs-question-count">
                {config.questions.filter(q => q.enabled).length} active questions
              </div>
              <button className="qs-btn qs-btn-primary" onClick={handleAddQuestion}>
                + Add Question
              </button>
            </div>

            {/* Category Filter */}
            <div className="qs-categories">
              {CATEGORIES.map(cat => (
                <span 
                  key={cat.value} 
                  className="qs-category-badge"
                  style={{ background: cat.color }}
                >
                  {cat.label}: {config.questions.filter(q => q.category === cat.value && q.enabled).length}
                </span>
              ))}
            </div>

            {/* Questions List */}
            <div className="qs-questions-list">
              {config.questions.length === 0 ? (
                <div className="qs-empty">
                  <p>No questions configured yet</p>
                  <button className="qs-btn qs-btn-primary" onClick={handleAddQuestion}>
                    Add Your First Question
                  </button>
                </div>
              ) : (
                config.questions
                  .sort((a, b) => a.order - b.order)
                  .map((q, index) => (
                  <div 
                    key={q.id} 
                    className={`qs-question-card ${!q.enabled ? 'disabled' : ''}`}
                  >
                    <div className="qs-question-order">
                      <button 
                        className="qs-order-btn"
                        onClick={() => moveQuestion(q.id, 'up')}
                        disabled={index === 0}
                      >▲</button>
                      <span>{q.order}</span>
                      <button 
                        className="qs-order-btn"
                        onClick={() => moveQuestion(q.id, 'down')}
                        disabled={index === config.questions.length - 1}
                      >▼</button>
                    </div>
                    
                    <div className="qs-question-body">
                      <div className="qs-question-header">
                        <span 
                          className="qs-category-tag"
                          style={{ background: CATEGORIES.find(c => c.value === q.category)?.color }}
                        >
                          {CATEGORIES.find(c => c.value === q.category)?.label}
                        </span>
                        <span className="qs-answer-type">
                          {ANSWER_TYPES.find(t => t.value === q.answerType)?.icon} {ANSWER_TYPES.find(t => t.value === q.answerType)?.label}
                        </span>
                        {q.required && <span className="qs-required-badge">Required</span>}
                        {q.fieldToUpdate && (
                          <span className="qs-field-badge">→ {q.fieldToUpdate}</span>
                        )}
                      </div>
                      
                      <div className="qs-question-text">{q.question}</div>
                      
                      {q.options && q.options.length > 0 && (
                        <div className="qs-question-options">
                          Options: {q.options.join(' • ')}
                        </div>
                      )}
                      
                      {q.helpText && (
                        <div className="qs-question-help">💡 {q.helpText}</div>
                      )}
                      
                      {q.scoreImpact && q.scoreImpact.length > 0 && (
                        <div className="qs-score-impacts">
                          {q.scoreImpact.map((si, i) => (
                            <span key={i} className={`qs-score-impact ${si.impact >= 0 ? 'positive' : 'negative'}`}>
                              "{si.answerValue}": {si.impact > 0 ? '+' : ''}{si.impact}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="qs-question-actions">
                      <button 
                        className={`qs-toggle-btn ${q.enabled ? 'active' : ''}`}
                        onClick={() => handleToggleQuestion(q)}
                        title={q.enabled ? 'Disable' : 'Enable'}
                      >
                        {q.enabled ? '✓' : '○'}
                      </button>
                      <button 
                        className="qs-icon-btn"
                        onClick={() => handleEditQuestion(q)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="qs-icon-btn danger"
                        onClick={() => handleDeleteQuestion(q.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && config && (
          <div className="qs-settings-section">
            <div className="qs-settings-group">
              <h3>📋 General Settings</h3>
              
              <label className="qs-toggle-setting">
                <input
                  type="checkbox"
                  checked={config.settings?.showProgressBar || false}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings!, showProgressBar: e.target.checked }
                  })}
                />
                <span className="qs-toggle-slider"></span>
                <span>Show progress bar to BDMs</span>
              </label>
              
              <label className="qs-toggle-setting">
                <input
                  type="checkbox"
                  checked={config.settings?.allowSkip || false}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings!, allowSkip: e.target.checked }
                  })}
                />
                <span className="qs-toggle-slider"></span>
                <span>Allow skipping non-required questions</span>
              </label>
              
              <label className="qs-toggle-setting">
                <input
                  type="checkbox"
                  checked={config.settings?.randomizeOrder || false}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings!, randomizeOrder: e.target.checked }
                  })}
                />
                <span className="qs-toggle-slider"></span>
                <span>Randomize question order</span>
              </label>
            </div>

            <div className="qs-settings-group">
              <h3>💬 WhatsApp Auto-Qualification</h3>
              <p className="qs-setting-desc">
                Automatically ask qualification questions via WhatsApp when a lead replies
              </p>
              
              <label className="qs-toggle-setting">
                <input
                  type="checkbox"
                  checked={config.whatsappSettings?.enabled || false}
                  onChange={(e) => setConfig({
                    ...config,
                    whatsappSettings: { ...config.whatsappSettings!, enabled: e.target.checked }
                  })}
                />
                <span className="qs-toggle-slider"></span>
                <span>Enable WhatsApp Auto-Qualification</span>
              </label>
              
              {config.whatsappSettings?.enabled && (
                <>
                  <div className="qs-input-group">
                    <label>Welcome Message</label>
                    <textarea
                      value={config.whatsappSettings?.welcomeMessage || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        whatsappSettings: { ...config.whatsappSettings!, welcomeMessage: e.target.value }
                      })}
                      rows={3}
                      placeholder="Use {name} for lead's name"
                    />
                  </div>
                  
                  <div className="qs-input-group">
                    <label>Completion Message</label>
                    <textarea
                      value={config.whatsappSettings?.completionMessage || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        whatsappSettings: { ...config.whatsappSettings!, completionMessage: e.target.value }
                      })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="qs-input-row">
                    <div className="qs-input-group">
                      <label>Max Questions via WhatsApp</label>
                      <input
                        type="number"
                        value={config.whatsappSettings?.maxQuestions || 5}
                        onChange={(e) => setConfig({
                          ...config,
                          whatsappSettings: { ...config.whatsappSettings!, maxQuestions: parseInt(e.target.value) || 5 }
                        })}
                        min={1}
                        max={10}
                      />
                    </div>
                    
                    <div className="qs-input-group">
                      <label>No Response Timeout (hours)</label>
                      <input
                        type="number"
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
            
            <button 
              className="qs-btn qs-btn-primary"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && config && (
          <div className="qs-preview-section">
            <div className="qs-preview-toggle">
              <button 
                className={`qs-preview-btn ${previewMode === 'bdm' ? 'active' : ''}`}
                onClick={() => setPreviewMode('bdm')}
              >
                👨‍💼 BDM View
              </button>
              <button 
                className={`qs-preview-btn ${previewMode === 'whatsapp' ? 'active' : ''}`}
                onClick={() => setPreviewMode('whatsapp')}
              >
                💬 WhatsApp View
              </button>
            </div>

            {previewMode === 'bdm' ? (
              <div className="qs-preview-bdm">
                <div className="qs-preview-card">
                  <div className="qs-preview-header">
                    <h3>Qualification Questions</h3>
                    <div className="qs-preview-progress">
                      <div className="qs-progress-bar">
                        <div className="qs-progress-fill" style={{ width: '0%' }}></div>
                      </div>
                      <span>0 / {config.questions.filter(q => q.enabled).length} answered</span>
                    </div>
                  </div>
                  
                  <div className="qs-preview-questions">
                    {config.questions
                      .filter(q => q.enabled)
                      .sort((a, b) => a.order - b.order)
                      .map((q, i) => (
                      <div key={q.id} className="qs-preview-question">
                        <div className="qs-preview-q-number">{i + 1}</div>
                        <div className="qs-preview-q-content">
                          <div className="qs-preview-q-text">
                            {q.question}
                            {q.required && <span className="qs-required">*</span>}
                          </div>
                          
                          {q.answerType === 'text' && (
                            <input type="text" placeholder="Type answer..." disabled />
                          )}
                          
                          {q.answerType === 'select' && (
                            <div className="qs-preview-options">
                              {q.options?.map((opt, j) => (
                                <button key={j} className="qs-preview-option">{opt}</button>
                              ))}
                            </div>
                          )}
                          
                          {q.answerType === 'multiselect' && (
                            <div className="qs-preview-options multi">
                              {q.options?.map((opt, j) => (
                                <label key={j} className="qs-preview-checkbox">
                                  <input type="checkbox" disabled /> {opt}
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {q.answerType === 'boolean' && (
                            <div className="qs-preview-options">
                              <button className="qs-preview-option">Yes</button>
                              <button className="qs-preview-option">No</button>
                            </div>
                          )}
                          
                          {q.answerType === 'number' && (
                            <input type="number" placeholder="Enter number..." disabled />
                          )}
                          
                          {q.answerType === 'date' && (
                            <input type="date" disabled />
                          )}
                          
                          {q.answerType === 'rating' && (
                            <div className="qs-preview-rating">
                              {[1,2,3,4,5].map(n => (
                                <button key={n} className="qs-rating-star">⭐</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="qs-preview-whatsapp">
                <div className="qs-wa-phone">
                  <div className="qs-wa-header">
                    <div className="qs-wa-contact">
                      <div className="qs-wa-avatar">CB</div>
                      <div>
                        <div className="qs-wa-name">CodeBegun</div>
                        <div className="qs-wa-status">online</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="qs-wa-chat">
                    <div className="qs-wa-msg sent">
                      {config.whatsappSettings?.welcomeMessage?.replace('{name}', 'John') || 'Hi! Let me ask you a few questions.'}
                    </div>
                    
                    {config.questions
                      .filter(q => q.enabled)
                      .slice(0, config.whatsappSettings?.maxQuestions || 5)
                      .map((q, i) => (
                      <React.Fragment key={q.id}>
                        <div className="qs-wa-msg sent">
                          {i + 1}. {q.question}
                          {q.options && q.options.length > 0 && (
                            <div className="qs-wa-options">
                              {q.options.map((opt, j) => (
                                <span key={j}>{j + 1}. {opt}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="qs-wa-msg received">
                          <span className="qs-wa-typing">Lead's response...</span>
                        </div>
                      </React.Fragment>
                    ))}
                    
                    <div className="qs-wa-msg sent">
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
        <div className="qs-modal-overlay" onClick={() => setShowQuestionModal(false)}>
          <div className="qs-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingQuestion._id ? 'Edit Question' : 'Add New Question'}</h3>
            
            <div className="qs-form-row">
              <label>Question Text <span className="required">*</span></label>
              <textarea
                value={editingQuestion.question}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                placeholder="Enter the question to ask the lead..."
                rows={2}
              />
            </div>

            <div className="qs-form-grid">
              <div className="qs-form-row">
                <label>Category</label>
                <select
                  value={editingQuestion.category}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value as any })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="qs-form-row">
                <label>Answer Type</label>
                <select
                  value={editingQuestion.answerType}
                  onChange={(e) => setEditingQuestion({ 
                    ...editingQuestion, 
                    answerType: e.target.value as any,
                    options: ['select', 'multiselect'].includes(e.target.value) ? editingQuestion.options || [] : undefined
                  })}
                >
                  {ANSWER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {['select', 'multiselect'].includes(editingQuestion.answerType) && (
              <div className="qs-form-row">
                <label>Options (one per line)</label>
                <textarea
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

            <div className="qs-form-row">
              <label>Auto-Update Lead Field</label>
              <select
                value={editingQuestion.fieldToUpdate || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, fieldToUpdate: e.target.value || undefined })}
              >
                {LEAD_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <p className="qs-form-help">The lead's answer will automatically update this field</p>
            </div>

            <div className="qs-form-row">
              <label>Help Text (for BDMs)</label>
              <input
                type="text"
                value={editingQuestion.helpText || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, helpText: e.target.value })}
                placeholder="Tips for BDMs on how to ask this question..."
              />
            </div>

            <div className="qs-form-row">
              <label className="qs-checkbox-label">
                <input
                  type="checkbox"
                  checked={editingQuestion.required}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                />
                Required question (BDM must answer before moving lead)
              </label>
            </div>

            {/* Score Impact Section */}
            {['select', 'multiselect'].includes(editingQuestion.answerType) && editingQuestion.options && editingQuestion.options.length > 0 && (
              <div className="qs-form-row">
                <label>Score Impact (optional) - affects lead priority</label>
                <div className="qs-score-inputs">
                  {editingQuestion.options.map((opt, i) => (
                    <div key={i} className="qs-score-input-row">
                      <span className="qs-score-option">{opt}</span>
                      <input
                        type="number"
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
                      <span className="qs-score-label">points</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="qs-modal-actions">
              <button 
                className="qs-btn qs-btn-secondary"
                onClick={() => {
                  setShowQuestionModal(false);
                  setEditingQuestion(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="qs-btn qs-btn-primary"
                onClick={handleSaveQuestion}
                disabled={saving || !editingQuestion.question.trim()}
              >
                {saving ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualificationSettings;
