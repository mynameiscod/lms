import React, { useState, useEffect, useCallback } from 'react';
import { leadScoringApi } from '../../api';
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
  const [activeTab, setActiveTab] = useState<'scoring' | 'qualification' | 'assignment'>('scoring');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customFieldInputs, setCustomFieldInputs] = useState<Record<string, string>>({});

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
    const isCustom = value.startsWith('custom:');
    const customKey = isCustom ? value.replace('custom:', '') : '';

    return (
      <div className="ls-field-selector">
        <select
          value={isCustom ? '__custom__' : value}
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
          <option value="__custom__">📦 Custom Field...</option>
        </select>
        {(isCustom || value === '__custom__') && (
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

  // ─── Assignment Rules ───
  const addAssignmentRule = () => {
    setConfig(prev => ({
      ...prev,
      assignmentRules: [...prev.assignmentRules, { name: '', conditions: [{ field: '', operator: 'equals', value: '' }], assignToMembers: [], currentIndex: 0 }]
    }));
  };

  const updateAssignmentRule = (index: number, updates: Partial<AssignmentRule>) => {
    setConfig(prev => ({
      ...prev,
      assignmentRules: prev.assignmentRules.map((r, i) => i === index ? { ...r, ...updates } : r)
    }));
  };

  const removeAssignmentRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      assignmentRules: prev.assignmentRules.filter((_, i) => i !== index)
    }));
  };

  const addConditionToRule = (ruleIndex: number) => {
    setConfig(prev => ({
      ...prev,
      assignmentRules: prev.assignmentRules.map((r, i) =>
        i === ruleIndex
          ? { ...r, conditions: [...r.conditions, { field: '', operator: 'equals', value: '' }] }
          : r
      )
    }));
  };

  const updateCondition = (ruleIndex: number, condIndex: number, updates: Partial<AssignmentCondition>) => {
    setConfig(prev => ({
      ...prev,
      assignmentRules: prev.assignmentRules.map((r, i) =>
        i === ruleIndex
          ? {
              ...r,
              conditions: r.conditions.map((c, j) => j === condIndex ? { ...c, ...updates } : c)
            }
          : r
      )
    }));
  };

  const removeCondition = (ruleIndex: number, condIndex: number) => {
    setConfig(prev => ({
      ...prev,
      assignmentRules: prev.assignmentRules.map((r, i) =>
        i === ruleIndex
          ? { ...r, conditions: r.conditions.filter((_, j) => j !== condIndex) }
          : r
      )
    }));
  };

  // ─── Member Toggle ───
  const toggleMember = (list: string[], memberId: string): string[] => {
    return list.includes(memberId)
      ? list.filter(id => id !== memberId)
      : [...list, memberId];
  };

  const getMemberName = (id: string): string => {
    const m = teamMembers.find(t => t._id === id);
    return m ? `${m.firstName} ${m.lastName}` : id;
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
          <h1>Lead Scoring & Assignment</h1>
          <p className="ls-subtitle">Configure automatic scoring, qualification, and team assignment rules</p>
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
        <button className={`ls-tab ${activeTab === 'assignment' ? 'active' : ''}`} onClick={() => setActiveTab('assignment')}>
          <i className="fa-solid fa-user-group"></i> Assignment
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

      {/* ═══════ ASSIGNMENT TAB ═══════ */}
      {activeTab === 'assignment' && (
        <div className="ls-section">
          <div className="ls-card">
            <div className="ls-card-header">
              <h3>Assignment Mode</h3>
              <p>How should new leads be assigned to team members?</p>
            </div>
            <div className="ls-assignment-modes">
              {(['none', 'round_robin', 'rule_based'] as const).map(mode => (
                <label key={mode} className={`ls-mode-option ${config.assignmentMode === mode ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="assignmentMode"
                    value={mode}
                    checked={config.assignmentMode === mode}
                    onChange={() => setConfig(prev => ({ ...prev, assignmentMode: mode }))}
                  />
                  <div className="ls-mode-info">
                    <strong>
                      {mode === 'none' && '⏸️ No Auto-Assignment'}
                      {mode === 'round_robin' && '🔄 Round Robin'}
                      {mode === 'rule_based' && '🎯 Rule-Based'}
                    </strong>
                    <span>
                      {mode === 'none' && 'Leads will not be auto-assigned'}
                      {mode === 'round_robin' && 'Distribute evenly among selected team members'}
                      {mode === 'rule_based' && 'Assign based on lead properties (with fallback)'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Round Robin Members */}
          {config.assignmentMode === 'round_robin' && (
            <div className="ls-card">
              <div className="ls-card-header">
                <h3>Round Robin Members</h3>
                <p>Select team members for round-robin assignment</p>
              </div>
              <div className="ls-member-grid">
                {teamMembers.map(m => (
                  <label key={m._id} className={`ls-member-chip ${config.roundRobinMembers.includes(m._id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={config.roundRobinMembers.includes(m._id)}
                      onChange={() => setConfig(prev => ({
                        ...prev,
                        roundRobinMembers: toggleMember(prev.roundRobinMembers, m._id)
                      }))}
                    />
                    <i className="fa-solid fa-user"></i>
                    <span>{m.firstName} {m.lastName}</span>
                    <small>{m.email}</small>
                  </label>
                ))}
                {teamMembers.length === 0 && (
                  <div className="ls-empty">No team members found. Add STAFF or TENANT_ADMIN users first.</div>
                )}
              </div>
            </div>
          )}

          {/* Rule-Based Assignment */}
          {config.assignmentMode === 'rule_based' && (
            <>
              <div className="ls-card">
                <div className="ls-card-header">
                  <h3>Assignment Rules</h3>
                  <p>Define conditions to route leads to specific team members. First matching rule wins.</p>
                  <button className="ls-btn ls-btn-small" onClick={addAssignmentRule}>
                    <i className="fa-solid fa-plus"></i> Add Rule
                  </button>
                </div>

                {config.assignmentRules.length === 0 ? (
                  <div className="ls-empty">No assignment rules. Leads will go to fallback members.</div>
                ) : (
                  <div className="ls-assignment-rules">
                    {config.assignmentRules.map((rule, rIdx) => (
                      <div key={rIdx} className="ls-assignment-rule-card">
                        <div className="ls-assignment-rule-header">
                          <input
                            type="text"
                            placeholder="Rule name (e.g. Hot leads to seniors)"
                            value={rule.name}
                            onChange={e => updateAssignmentRule(rIdx, { name: e.target.value })}
                            className="ls-input ls-rule-name-input"
                          />
                          <button className="ls-btn-icon ls-btn-danger" onClick={() => removeAssignmentRule(rIdx)} title="Remove rule">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>

                        <div className="ls-conditions">
                          <label className="ls-conditions-label">Conditions (all must match):</label>
                          {rule.conditions.map((cond, cIdx) => (
                            <div key={cIdx} className="ls-condition-row">
                              <FieldSelector
                                value={cond.field}
                                onChange={val => updateCondition(rIdx, cIdx, { field: val })}
                                id={`ar-${rIdx}-${cIdx}`}
                              />
                              <select
                                value={cond.operator}
                                onChange={e => updateCondition(rIdx, cIdx, { operator: e.target.value })}
                                className="ls-select"
                              >
                                {OPERATORS.map(op => (
                                  <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                              </select>
                              {!NO_VALUE_OPERATORS.includes(cond.operator) && (
                                <input
                                  type="text"
                                  placeholder="Value"
                                  value={cond.value}
                                  onChange={e => updateCondition(rIdx, cIdx, { value: e.target.value })}
                                  className="ls-input ls-value-input"
                                />
                              )}
                              <button
                                className="ls-btn-icon ls-btn-danger"
                                onClick={() => removeCondition(rIdx, cIdx)}
                                disabled={rule.conditions.length <= 1}
                                title="Remove condition"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ))}
                          <button className="ls-btn ls-btn-tiny" onClick={() => addConditionToRule(rIdx)}>
                            <i className="fa-solid fa-plus"></i> Add Condition
                          </button>
                        </div>

                        <div className="ls-rule-members">
                          <label className="ls-conditions-label">Assign to (round-robin among):</label>
                          <div className="ls-member-grid compact">
                            {teamMembers.map(m => (
                              <label key={m._id} className={`ls-member-chip small ${rule.assignToMembers.includes(m._id) ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={rule.assignToMembers.includes(m._id)}
                                  onChange={() => updateAssignmentRule(rIdx, {
                                    assignToMembers: toggleMember(rule.assignToMembers, m._id)
                                  })}
                                />
                                <span>{m.firstName} {m.lastName}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ls-card">
                <div className="ls-card-header">
                  <h3>Fallback Members</h3>
                  <p>If no assignment rule matches, leads go to these members (round-robin)</p>
                </div>
                <div className="ls-member-grid">
                  {teamMembers.map(m => (
                    <label key={m._id} className={`ls-member-chip ${config.fallbackMembers.includes(m._id) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={config.fallbackMembers.includes(m._id)}
                        onChange={() => setConfig(prev => ({
                          ...prev,
                          fallbackMembers: toggleMember(prev.fallbackMembers, m._id)
                        }))}
                      />
                      <i className="fa-solid fa-user"></i>
                      <span>{m.firstName} {m.lastName}</span>
                      <small>{m.email}</small>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Selected Members Summary */}
          {config.assignmentMode !== 'none' && (
            <div className="ls-card ls-summary-card">
              <h4>Current Assignment Summary</h4>
              {config.assignmentMode === 'round_robin' && (
                <p>
                  <strong>{config.roundRobinMembers.length}</strong> members in round-robin pool:
                  {config.roundRobinMembers.length > 0
                    ? ` ${config.roundRobinMembers.map(getMemberName).join(', ')}`
                    : ' None selected'}
                </p>
              )}
              {config.assignmentMode === 'rule_based' && (
                <>
                  <p><strong>{config.assignmentRules.length}</strong> assignment rule(s)</p>
                  <p><strong>{config.fallbackMembers.length}</strong> fallback member(s)</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadScoringSettings;
