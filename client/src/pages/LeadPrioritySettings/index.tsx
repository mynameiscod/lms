import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadPriorityApi } from '../../api';
import './LeadPrioritySettings.css';

interface RuleCondition {
  field: string;
  operator: string;
  value: any;
}

interface PriorityRule {
  _id?: string;
  id?: string;
  name?: string;
  condition: RuleCondition | string;  // Can be either object from backend or string for legacy
  operator?: string;  // Legacy flat structure
  value?: any;  // Legacy flat structure
  scoreImpact: number;
  setPriority?: 'hot' | 'warm' | 'cold';
  category?: string;
  description?: string;
  isActive?: boolean;
  enabled?: boolean;
}

// Helper to normalize rule structure from backend
const normalizeRule = (rule: any): { field: string; operator: string; value: any } => {
  if (rule.condition && typeof rule.condition === 'object') {
    return {
      field: rule.condition.field || '',
      operator: rule.condition.operator || 'equals',
      value: rule.condition.value
    };
  }
  // Legacy flat structure
  return {
    field: rule.condition || '',
    operator: rule.operator || 'equals',
    value: rule.value
  };
};

interface PriorityConfig {
  _id?: string;
  rules: PriorityRule[];
  thresholds: {
    hot: number;
    warm: number;
  };
  eligibilityRules: any[];
  settings: {
    autoRecalculate: boolean;
    recalculateOnActivity: boolean;
  };
}

const FIELD_OPTIONS = [
  { value: 'source', label: 'Lead Source' },
  { value: 'courseInterest', label: 'Course Interest' },
  { value: 'budget', label: 'Budget' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'graduationYear', label: 'Graduation Year' },
  { value: 'employmentStatus', label: 'Employment Status' },
  { value: 'preferenceMode', label: 'Training Mode' },
  { value: 'activities.length', label: 'Number of Activities' },
  { value: 'whatsappEngagement.messagesSent', label: 'WhatsApp Messages Sent' },
  { value: 'whatsappEngagement.messagesReceived', label: 'WhatsApp Messages Received' },
  { value: 'noReplyHours', label: 'Hours Since Last Reply' },
  { value: 'daysSinceCreated', label: 'Days Since Created' },
  { value: 'daysSinceLastAction', label: 'Days Since Last Action' },
  { value: 'qualificationProgress', label: 'Qualification Progress (%)' }
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does Not Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'greaterOrEqual', label: 'Greater or Equal' },
  { value: 'lessOrEqual', label: 'Less or Equal' },
  { value: 'exists', label: 'Exists' },
  { value: 'notExists', label: 'Does Not Exist' }
];

const CATEGORY_OPTIONS = [
  { value: 'source', label: 'Source Quality' },
  { value: 'engagement', label: 'Engagement Level' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'timing', label: 'Timing/Urgency' },
  { value: 'behavior', label: 'Behavior' },
  { value: 'demographic', label: 'Demographics' }
];

const LeadPrioritySettings: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PriorityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Edit state for flat structure (easier to work with in form)
  const [editingRuleFlat, setEditingRuleFlat] = useState<{
    _id?: string;
    id?: string;
    name?: string;
    field: string;
    operator: string;
    value: any;
    scoreImpact: number;
    setPriority?: 'hot' | 'warm' | 'cold';
    category: string;
    description?: string;
    enabled: boolean;
  } | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'thresholds' | 'settings'>('rules');

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3500);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await leadPriorityApi.getConfig();
      setConfig(res);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThresholds = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      await leadPriorityApi.updateThresholds(config.thresholds);
      showAlertMsg('success', 'Thresholds updated successfully');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update thresholds');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    setEditingRuleFlat({
      field: '',
      operator: 'equals',
      value: '',
      scoreImpact: 10,
      category: 'engagement',
      enabled: true
    });
    setShowRuleModal(true);
  };

  const handleEditRule = (rule: PriorityRule) => {
    const normalized = normalizeRule(rule);
    setEditingRuleFlat({
      _id: rule._id,
      id: rule.id,
      name: rule.name || rule.description,
      field: normalized.field,
      operator: normalized.operator,
      value: typeof normalized.value === 'object' ? JSON.stringify(normalized.value) : String(normalized.value ?? ''),
      scoreImpact: rule.scoreImpact,
      setPriority: rule.setPriority,
      category: rule.category || 'custom',
      description: rule.description || rule.name,
      enabled: rule.isActive ?? rule.enabled ?? true
    });
    setShowRuleModal(true);
  };

  const handleSaveRule = async () => {
    if (!editingRuleFlat || !config) return;
    
    try {
      setSaving(true);
      
      // Convert flat structure to backend structure
      const ruleToSave = {
        id: editingRuleFlat.id || `rule_${Date.now()}`,
        name: editingRuleFlat.name || editingRuleFlat.description || `${editingRuleFlat.field} ${editingRuleFlat.operator} ${editingRuleFlat.value}`,
        description: editingRuleFlat.description,
        enabled: editingRuleFlat.enabled,
        condition: {
          field: editingRuleFlat.field,
          operator: editingRuleFlat.operator,
          value: editingRuleFlat.value
        },
        scoreImpact: editingRuleFlat.scoreImpact,
        setPriority: editingRuleFlat.setPriority,
        category: editingRuleFlat.category
      };
      
      if (editingRuleFlat._id) {
        await leadPriorityApi.updateRule(editingRuleFlat._id, ruleToSave);
        showAlertMsg('success', 'Rule updated successfully');
      } else {
        await leadPriorityApi.addRule(ruleToSave);
        showAlertMsg('success', 'Rule added successfully');
      }
      
      setShowRuleModal(false);
      setEditingRuleFlat(null);
      loadConfig();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await leadPriorityApi.deleteRule(ruleId);
      showAlertMsg('success', 'Rule deleted successfully');
      loadConfig();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to delete rule');
    }
  };

  const handleToggleRule = async (rule: PriorityRule) => {
    if (!rule._id) return;
    
    try {
      await leadPriorityApi.updateRule(rule._id, { ...rule, isActive: !rule.isActive });
      loadConfig();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to update rule');
    }
  };

  const handleBulkRecalculate = async () => {
    if (!window.confirm('This will recalculate scores for all leads. Continue?')) return;
    
    try {
      setSaving(true);
      const res = await leadPriorityApi.bulkRecalculate();
      showAlertMsg('success', `Scores recalculated for ${res.updated || 0} leads`);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to recalculate scores');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('This will reset all rules to defaults. Continue?')) return;
    
    try {
      setSaving(true);
      await leadPriorityApi.resetToDefaults();
      showAlertMsg('success', 'Configuration reset to defaults');
      loadConfig();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="lps-loading">Loading configuration...</div>;
  }

  return (
    <div className="lead-priority-settings">
      {/* Alert */}
      {alert && (
        <div className={`lps-alert lps-alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <div className="lps-header">
        <div>
          <h1>Lead Priority & Scoring</h1>
          <p className="lps-subtitle">Configure how leads are scored and prioritized automatically</p>
        </div>
        <div className="lps-header-actions">
          <button 
            className="lps-btn lps-btn-secondary"
            onClick={handleBulkRecalculate}
            disabled={saving}
          >
            🔄 Recalculate All Scores
          </button>
          <button 
            className="lps-btn lps-btn-outline"
            onClick={handleResetToDefaults}
            disabled={saving}
          >
            ↩️ Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="lps-tabs">
        <button 
          className={`lps-tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Scoring Rules
        </button>
        <button 
          className={`lps-tab ${activeTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setActiveTab('thresholds')}
        >
          Priority Thresholds
        </button>
        <button 
          className={`lps-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="lps-content">
        {activeTab === 'rules' && config && (
          <div className="lps-rules-section">
            <div className="lps-section-header">
              <h2>Scoring Rules</h2>
              <button className="lps-btn lps-btn-primary" onClick={handleAddRule}>
                + Add Rule
              </button>
            </div>
            
            <div className="lps-rules-info">
              <p>
                Rules are evaluated in order. Each matching rule adds or subtracts from the lead's score.
                Leads are automatically categorized as Hot, Warm, or Cold based on their total score.
              </p>
            </div>

            <div className="lps-rules-list">
              {config.rules.length === 0 ? (
                <div className="lps-empty">No rules configured yet</div>
              ) : (
                config.rules.map((rule, index) => {
                  const { field, operator, value } = normalizeRule(rule);
                  return (
                  <div 
                    key={rule._id || rule.id || index} 
                    className={`lps-rule-card ${!(rule.isActive ?? rule.enabled ?? true) ? 'inactive' : ''}`}
                  >
                    <div className="lps-rule-header">
                      <span className={`lps-rule-category lps-category-${rule.category || 'custom'}`}>
                        {CATEGORY_OPTIONS.find(c => c.value === rule.category)?.label || rule.category || 'Custom'}
                      </span>
                      <div className="lps-rule-actions">
                        <button 
                          className="lps-icon-btn"
                          onClick={() => handleToggleRule(rule)}
                          title={(rule.isActive ?? rule.enabled) ? 'Disable' : 'Enable'}
                        >
                          {(rule.isActive ?? rule.enabled) ? '✓' : '○'}
                        </button>
                        <button 
                          className="lps-icon-btn"
                          onClick={() => handleEditRule(rule)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          className="lps-icon-btn danger"
                          onClick={() => (rule._id || rule.id) && handleDeleteRule(rule._id || rule.id!)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="lps-rule-body">
                      <div className="lps-rule-condition">
                        <strong>{FIELD_OPTIONS.find(f => f.value === field)?.label || field}</strong>
                        {' '}
                        <span className="lps-operator">
                          {OPERATOR_OPTIONS.find(o => o.value === operator)?.label || operator}
                        </span>
                        {' '}
                        <span className="lps-value">"{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}"</span>
                      </div>
                      <div className="lps-rule-impact">
                        <span className={`lps-score-impact ${rule.scoreImpact >= 0 ? 'positive' : 'negative'}`}>
                          {rule.scoreImpact >= 0 ? '+' : ''}{rule.scoreImpact} points
                        </span>
                        {rule.setPriority && (
                          <span className={`lps-priority-badge priority-${rule.setPriority}`}>
                            → Set as {rule.setPriority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="lps-rule-description">{rule.description || rule.name}</p>
                      )}
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'thresholds' && config && (
          <div className="lps-thresholds-section">
            <h2>Priority Thresholds</h2>
            <p className="lps-section-desc">
              Define the score thresholds that determine lead priority classification.
            </p>
            
            <div className="lps-threshold-diagram">
              <div className="lps-threshold-bar">
                <div className="lps-threshold-zone cold" style={{ width: `${config.thresholds.warm}%` }}>
                  <span>Cold</span>
                  <span className="lps-threshold-range">0 - {config.thresholds.warm - 1}</span>
                </div>
                <div className="lps-threshold-zone warm" style={{ width: `${config.thresholds.hot - config.thresholds.warm}%` }}>
                  <span>Warm</span>
                  <span className="lps-threshold-range">{config.thresholds.warm} - {config.thresholds.hot - 1}</span>
                </div>
                <div className="lps-threshold-zone hot" style={{ width: `${100 - config.thresholds.hot}%` }}>
                  <span>Hot</span>
                  <span className="lps-threshold-range">{config.thresholds.hot}+</span>
                </div>
              </div>
            </div>

            <div className="lps-threshold-inputs">
              <div className="lps-input-group">
                <label>Hot Threshold (minimum score for Hot priority)</label>
                <input
                  type="number"
                  value={config.thresholds.hot}
                  onChange={(e) => setConfig({
                    ...config,
                    thresholds: { ...config.thresholds, hot: parseInt(e.target.value) || 0 }
                  })}
                  min={1}
                  max={100}
                />
                <p className="lps-input-help">Leads scoring {config.thresholds.hot} or above will be marked as Hot</p>
              </div>
              <div className="lps-input-group">
                <label>Warm Threshold (minimum score for Warm priority)</label>
                <input
                  type="number"
                  value={config.thresholds.warm}
                  onChange={(e) => setConfig({
                    ...config,
                    thresholds: { ...config.thresholds, warm: parseInt(e.target.value) || 0 }
                  })}
                  min={0}
                  max={config.thresholds.hot - 1}
                />
                <p className="lps-input-help">Leads scoring {config.thresholds.warm} to {config.thresholds.hot - 1} will be Warm</p>
              </div>
            </div>

            <button 
              className="lps-btn lps-btn-primary"
              onClick={handleSaveThresholds}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Thresholds'}
            </button>
          </div>
        )}

        {activeTab === 'settings' && config && (
          <div className="lps-settings-section">
            <h2>Scoring Settings</h2>
            
            <div className="lps-setting">
              <label className="lps-toggle">
                <input
                  type="checkbox"
                  checked={config.settings?.autoRecalculate || false}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings, autoRecalculate: e.target.checked }
                  })}
                />
                <span className="lps-toggle-slider"></span>
                <span className="lps-toggle-label">Auto-recalculate scores on lead update</span>
              </label>
              <p className="lps-setting-help">
                When enabled, lead scores will be recalculated automatically whenever lead data changes.
              </p>
            </div>

            <div className="lps-setting">
              <label className="lps-toggle">
                <input
                  type="checkbox"
                  checked={config.settings?.recalculateOnActivity || false}
                  onChange={(e) => setConfig({
                    ...config,
                    settings: { ...config.settings, recalculateOnActivity: e.target.checked }
                  })}
                />
                <span className="lps-toggle-slider"></span>
                <span className="lps-toggle-label">Recalculate on new activity</span>
              </label>
              <p className="lps-setting-help">
                When enabled, scores will be recalculated when a new call, message, or note is added.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rule Edit Modal */}
      {showRuleModal && editingRuleFlat && (
        <div className="lps-modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="lps-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRuleFlat._id ? 'Edit Rule' : 'Add New Rule'}</h3>
            
            <div className="lps-form-row">
              <label>Field to Check</label>
              <select
                value={editingRuleFlat.field}
                onChange={(e) => setEditingRuleFlat({ ...editingRuleFlat, field: e.target.value })}
              >
                <option value="">Select field...</option>
                {FIELD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="lps-form-row">
              <label>Operator</label>
              <select
                value={editingRuleFlat.operator}
                onChange={(e) => setEditingRuleFlat({ ...editingRuleFlat, operator: e.target.value })}
              >
                {OPERATOR_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="lps-form-row">
              <label>Value</label>
              <input
                type="text"
                value={editingRuleFlat.value}
                onChange={(e) => setEditingRuleFlat({ ...editingRuleFlat, value: e.target.value })}
                placeholder="Enter value to compare"
              />
            </div>

            <div className="lps-form-row">
              <label>Score Impact</label>
              <input
                type="number"
                value={editingRuleFlat.scoreImpact}
                onChange={(e) => setEditingRuleFlat({ ...editingRuleFlat, scoreImpact: parseInt(e.target.value) || 0 })}
              />
              <p className="lps-input-help">Positive values increase score, negative decrease</p>
            </div>

            <div className="lps-form-row">
              <label>Category</label>
              <select
                value={editingRuleFlat.category}
                onChange={(e) => setEditingRuleFlat({ ...editingRuleFlat, category: e.target.value })}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="lps-form-row">
              <label>Force Priority (optional)</label>
              <select
                value={editingRuleFlat.setPriority || ''}
                onChange={(e) => setEditingRuleFlat({ 
                  ...editingRuleFlat, 
                  setPriority: e.target.value as 'hot' | 'warm' | 'cold' | undefined 
                })}
              >
                <option value="">Don't force priority</option>
                <option value="hot">Set as Hot</option>
                <option value="warm">Set as Warm</option>
                <option value="cold">Set as Cold</option>
              </select>
              <p className="lps-input-help">If set, this rule will immediately set the lead's priority</p>
            </div>

            <div className="lps-form-row">
              <label>Description (optional)</label>
              <input
                type="text"
                value={editingRuleFlat.description || ''}
                onChange={(e) => setEditingRuleFlat({ ...editingRuleFlat, description: e.target.value })}
                placeholder="Describe what this rule does"
              />
            </div>

            <div className="lps-modal-actions">
              <button 
                className="lps-btn lps-btn-secondary"
                onClick={() => {
                  setShowRuleModal(false);
                  setEditingRuleFlat(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="lps-btn lps-btn-primary"
                onClick={handleSaveRule}
                disabled={saving || !editingRuleFlat.field}
              >
                {saving ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadPrioritySettings;
