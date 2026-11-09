import React, { useState, useEffect, useCallback } from 'react';
import { leadScoringApi, leadFormConfigApi } from '../../api';
import './LeadScoringSettings.css';

interface ScoringRule {
  field: string;
  operator: string;
  value: string;
  points: number;
  label: string;
}

interface QualificationRule {
  field: string;
  operator: string;
  value: string;
  label: string;
  required: boolean;
}

interface AssignmentCondition {
  field: string;
  operator: string;
  value: string;
}

interface AssignmentRule {
  name: string;
  conditions: AssignmentCondition[];
  assignToMembers: string[];
  currentIndex: number;
}

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Config {
  isActive: boolean;
  scoringRules: ScoringRule[];
  hotThreshold: number;
  warmThreshold: number;
  qualificationRules: QualificationRule[];
  assignmentMode: 'none' | 'round_robin' | 'rule_based';
  roundRobinMembers: string[];
  assignmentRules: AssignmentRule[];
  fallbackMembers: string[];
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_equal', label: '>= (Greater or Equal)' },
  { value: 'less_equal', label: '<= (Less or Equal)' },
  { value: 'not_empty', label: 'Is Not Empty' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'in', label: 'In (comma-separated)' },
];

const STANDARD_FIELDS = [
  { value: 'name', label: 'Lead Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'source', label: 'Source' },
  { value: 'courseInterest', label: 'Course Interest' },
  { value: 'notes', label: 'Notes' },
  { value: 'platform', label: 'Platform' },
  { value: 'location', label: 'Location' },
  { value: 'mode', label: 'Mode (Online/Offline)' },
  { value: 'priority', label: 'Current Priority' },
  { value: 'score', label: 'Current Score' },
];

const NO_VALUE_OPERATORS = ['not_empty', 'is_empty'];

const defaultConfig: Config = {
  isActive: false,
  scoringRules: [],
  hotThreshold: 12,
  warmThreshold: 8,
  qualificationRules: [],
  assignmentMode: 'none',
  roundRobinMembers: [],
  assignmentRules: [],
  fallbackMembers: [],
};

const LeadScoringSettings: React.FC = () => {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'scoring' | 'qualification'>('scoring');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customFieldInputs, setCustomFieldInputs] = useState<Record<string, string>>({});
  const [customFieldOptions, setCustomFieldOptions] = useState<{value:string;label:string}[]>([]);

  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, membersRes] = await Promise.all([
          leadScoringApi.getConfig(),
          leadScoringApi.getTeamMembers()
        ]);
        if (configRes.success && configRes.data) {
          const d = configRes.data;
          setConfig({
            isActive: d.isActive || false,
            scoringRules: d.scoringRules || [],
            hotThreshold: d.hotThreshold ?? 12,
            warmThreshold: d.warmThreshold ?? 8,
            qualificationRules: d.qualificationRules || [],
            assignmentMode: d.assignmentMode || 'none',
            roundRobinMembers: (d.roundRobinMembers || []).map((m: any) => m._id || m),
            assignmentRules: (d.assignmentRules || []).map((r: any) => ({
              ...r,
              assignToMembers: (r.assignToMembers || []).map((m: any) => m._id || m)
            })),
            fallbackMembers: (d.fallbackMembers || []).map((m: any) => m._id || m),
          });
        }
        if (membersRes.success) {
          setTeamMembers(membersRes.data || []);
        }
        // Load custom fields from form config
        try {
          const formRes = await leadFormConfigApi.getConfig();
          if (formRes.data?.fields) {
            const builtInKeys = STANDARD_FIELDS.map(f => f.value);
            const cFields = (formRes.data.fields as any[])
              .filter((f: any) => !f.isBuiltIn && f.enabled && !builtInKeys.includes(f.fieldKey))
              .map((f: any) => ({ value: `custom:${f.fieldKey}`, label: `🏷️ ${f.label} (custom)` }));
            setCustomFieldOptions(cFields);
          }
        } catch(_) {}
      } catch (err: any) {
        showAlert('error', 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showAlert]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await leadScoringApi.updateConfig(config);
      if (res.success) {
        showAlert('success', 'Configuration saved successfully!');
      } else {
        showAlert('error', res.message || 'Failed to save');
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRescore = async () => {
    if (!window.confirm('Re-score all existing leads with current rules? This may take a moment.')) return;
    setRescoring(true);
    try {
      const res = await leadScoringApi.rescoreAll();
      if (res.success) {
        showAlert('success', res.message || 'All leads re-scored!');
      } else {
        showAlert('error', res.message || 'Re-scoring failed');
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Re-scoring failed');
    } finally {
      setRescoring(false);
    }
  };

  // ─── Field Selector Component ───
  const FieldSelector: React.FC<{
    value: string;
    onChange: (val: string) => void;
    id: string;
  }> = ({ value, onChange, id }) => {
    const isKnownCustom = customFieldOptions.some(f => f.value === value);
    const isManualCustom = value.startsWith('custom:') && !isKnownCustom;
    const customKey = isManualCustom ? value.replace('custom:', '') : '';

    return (
      <div className="ls-field-selector">
        <select
          value={isManualCustom ? '__custom__' : value}
          onChange={e => {
            if (e.target.value === '__custom__') {
              onChange(`custom:${customFieldInputs[id] || ''}`);
            } else {
              onChange(e.target.value);
            }
          }}
        >
          <option value="">-- Select Field --</option>
          {STANDARD_FIELDS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
          {customFieldOptions.length > 0 && (
            <optgroup label="Custom Fields">
              {customFieldOptions.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </optgroup>
          )}
          <option value="__custom__">📦 Custom Field...</option>
        </select>
        {(isManualCustom || value === '__custom__') && (
          <input
            type="text"
            placeholder="custom field key"
            className="ls-custom-key-input"
            value={customKey || customFieldInputs[id] || ''}
            onChange={e => {
              setCustomFieldInputs(prev => ({ ...prev, [id]: e.target.value }));
              onChange(`custom:${e.target.value}`);
            }}
          />
        )}
      </div>
    );
  };

  // ─── Scoring Rules ───
  const addScoringRule = () => {
    setConfig(prev => ({
      ...prev,
      scoringRules: [...prev.scoringRules, { field: '', operator: 'equals', value: '', points: 1, label: '' }]
    }));
  };

  const updateScoringRule = (index: number, updates: Partial<ScoringRule>) => {
    setConfig(prev => ({
      ...prev,
      scoringRules: prev.scoringRules.map((r, i) => i === index ? { ...r, ...updates } : r)
    }));
  };

  const removeScoringRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      scoringRules: prev.scoringRules.filter((_, i) => i !== index)
    }));
  };

  // ─── Qualification Rules ───
  const addQualificationRule = () => {
    setConfig(prev => ({
      ...prev,
      qualificationRules: [...prev.qualificationRules, { field: '', operator: 'not_empty', value: '', label: '', required: true }]
    }));
  };

  const updateQualificationRule = (index: number, updates: Partial<QualificationRule>) => {
    setConfig(prev => ({
      ...prev,
      qualificationRules: prev.qualificationRules.map((r, i) => i === index ? { ...r, ...updates } : r)
    }));
  };

  const removeQualificationRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      qualificationRules: prev.qualificationRules.filter((_, i) => i !== index)
    }));
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="ls-page">
        <div className="ls-loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="ls-page">
      {alert && (
        <div className={`ls-alert ls-alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      <div className="ls-header">
        <div>
          <h1>Lead Scoring</h1>
          <p className="ls-subtitle">Configure automatic scoring and qualification</p>
        </div>
        <div className="ls-header-actions">
          <label className="ls-toggle-label">
            <input
              type="checkbox"
              checked={config.isActive}
              onChange={e => setConfig(prev => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="ls-toggle-slider"></span>
            <span>{config.isActive ? 'Active' : 'Inactive'}</span>
          </label>
          <button className="ls-btn ls-btn-secondary" onClick={handleRescore} disabled={rescoring}>
            <i className="fa-solid fa-rotate"></i>
            {rescoring ? 'Re-scoring...' : 'Re-score All Leads'}
          </button>
          <button className="ls-btn ls-btn-primary" onClick={handleSave} disabled={saving}>
            <i className="fa-solid fa-floppy-disk"></i>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ls-tabs">
        <button className={`ls-tab ${activeTab === 'scoring' ? 'active' : ''}`} onClick={() => setActiveTab('scoring')}>
          <i className="fa-solid fa-calculator"></i> Scoring Rules
        </button>
        <button className={`ls-tab ${activeTab === 'qualification' ? 'active' : ''}`} onClick={() => setActiveTab('qualification')}>
          <i className="fa-solid fa-clipboard-check"></i> Qualification
        </button>
      </div>

      {/* ═══════ SCORING TAB ═══════ */}
      {activeTab === 'scoring' && (
        <div className="ls-section">
          <div className="ls-card">
            <div className="ls-card-header">
              <h3>Priority Thresholds</h3>
              <p>Define score ranges for automatic priority levels</p>
            </div>
            <div className="ls-thresholds">
              <div className="ls-threshold">
                <span className="ls-priority-badge hot">🔥 Hot</span>
                <span>Score ≥</span>
                <input
                  type="number"
                  value={config.hotThreshold}
                  onChange={e => setConfig(prev => ({ ...prev, hotThreshold: parseInt(e.target.value) || 0 }))}
                  className="ls-threshold-input"
                />
              </div>
              <div className="ls-threshold">
                <span className="ls-priority-badge warm">🌡️ Warm</span>
                <span>Score ≥</span>
                <input
                  type="number"
                  value={config.warmThreshold}
                  onChange={e => setConfig(prev => ({ ...prev, warmThreshold: parseInt(e.target.value) || 0 }))}
                  className="ls-threshold-input"
                />
              </div>
              <div className="ls-threshold">
                <span className="ls-priority-badge cold">❄️ Cold</span>
                <span>Score &lt; {config.warmThreshold}</span>
              </div>
            </div>
          </div>

          <div className="ls-card">
            <div className="ls-card-header">
              <h3>Scoring Rules</h3>
              <p>Award points when lead data matches conditions</p>
              <button className="ls-btn ls-btn-small" onClick={addScoringRule}>
                <i className="fa-solid fa-plus"></i> Add Rule
              </button>
            </div>

            {config.scoringRules.length === 0 ? (
              <div className="ls-empty">No scoring rules yet. Add a rule to start scoring leads automatically.</div>
            ) : (
              <div className="ls-rules-list">
                {config.scoringRules.map((rule, idx) => (
                  <div key={idx} className="ls-rule-row">
                    <input
                      type="text"
                      placeholder="Label (e.g. Has degree)"
                      value={rule.label}
                      onChange={e => updateScoringRule(idx, { label: e.target.value })}
                      className="ls-input ls-label-input"
                    />
                    <FieldSelector
                      value={rule.field}
                      onChange={val => updateScoringRule(idx, { field: val })}
                      id={`sr-${idx}`}
                    />
                    <select
                      value={rule.operator}
                      onChange={e => updateScoringRule(idx, { operator: e.target.value })}
                      className="ls-select"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {!NO_VALUE_OPERATORS.includes(rule.operator) && (
                      <input
                        type="text"
                        placeholder="Value"
                        value={rule.value}
                        onChange={e => updateScoringRule(idx, { value: e.target.value })}
                        className="ls-input ls-value-input"
                      />
                    )}
                    <div className="ls-points-wrapper">
                      <input
                        type="number"
                        value={rule.points}
                        onChange={e => updateScoringRule(idx, { points: parseInt(e.target.value) || 0 })}
                        className="ls-input ls-points-input"
                      />
                      <span className="ls-points-label">pts</span>
                    </div>
                    <button className="ls-btn-icon ls-btn-danger" onClick={() => removeScoringRule(idx)} title="Remove rule">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ QUALIFICATION TAB ═══════ */}
      {activeTab === 'qualification' && (
        <div className="ls-section">
          <div className="ls-card">
            <div className="ls-card-header">
              <h3>Qualification Criteria</h3>
              <p>Define rules that determine if a lead is eligible. Required rules must all pass.</p>
              <button className="ls-btn ls-btn-small" onClick={addQualificationRule}>
                <i className="fa-solid fa-plus"></i> Add Criterion
              </button>
            </div>

            {config.qualificationRules.length === 0 ? (
              <div className="ls-empty">No qualification criteria. All leads will be marked as "needs_review".</div>
            ) : (
              <div className="ls-rules-list">
                {config.qualificationRules.map((rule, idx) => (
                  <div key={idx} className="ls-rule-row">
                    <input
                      type="text"
                      placeholder="Label (e.g. Has phone)"
                      value={rule.label}
                      onChange={e => updateQualificationRule(idx, { label: e.target.value })}
                      className="ls-input ls-label-input"
                    />
                    <FieldSelector
                      value={rule.field}
                      onChange={val => updateQualificationRule(idx, { field: val })}
                      id={`qr-${idx}`}
                    />
                    <select
                      value={rule.operator}
                      onChange={e => updateQualificationRule(idx, { operator: e.target.value })}
                      className="ls-select"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                    {!NO_VALUE_OPERATORS.includes(rule.operator) && (
                      <input
                        type="text"
                        placeholder="Value"
                        value={rule.value}
                        onChange={e => updateQualificationRule(idx, { value: e.target.value })}
                        className="ls-input ls-value-input"
                      />
                    )}
                    <label className="ls-required-toggle">
                      <input
                        type="checkbox"
                        checked={rule.required}
                        onChange={e => updateQualificationRule(idx, { required: e.target.checked })}
                      />
                      <span className={`ls-required-badge ${rule.required ? 'required' : 'optional'}`}>
                        {rule.required ? 'Required' : 'Optional'}
                      </span>
                    </label>
                    <button className="ls-btn-icon ls-btn-danger" onClick={() => removeQualificationRule(idx)} title="Remove">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignment moved to Lead Assignment (one setting for all sources, 2026-11-09). */}
      <p className="ls-subtitle" style={{ marginTop: 12 }}>Who gets new leads is set on <a href="/lead-assignment-settings">Lead Assignment</a>.</p>
    </div>
  );
};

export default LeadScoringSettings;
