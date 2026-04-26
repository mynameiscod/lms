import React, { useEffect, useState, useCallback } from 'react';
import './WhatsAppQualificationConfig.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

interface ScoreImpact {
  answerValue: string;
  impact: number;
}

interface QualificationQuestion {
  id: string;
  question: string;
  category: string;
  answerType: 'text' | 'number' | 'multiple_choice' | 'boolean' | 'date';
  options: string[];
  order: number;
  required: boolean;
  enabled: boolean;
  fieldToUpdate: string;
  scoreImpact: ScoreImpact[];
}

interface WhatsAppSettings {
  enabled: boolean;
  welcomeMessage: string;
  completionMessage: string;
  maxQuestions: number;
  noResponseTimeoutHours: number;
}

interface Config {
  questions: QualificationQuestion[];
  whatsappSettings: WhatsAppSettings;
}

const EMPTY_QUESTION: QualificationQuestion = {
  id: '',
  question: '',
  category: 'general',
  answerType: 'text',
  options: [],
  order: 0,
  required: false,
  enabled: true,
  fieldToUpdate: '',
  scoreImpact: [],
};

const FIELD_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'name', label: 'Name' },
  { value: 'yearOfGraduation', label: 'Year of Graduation' },
  { value: 'courseInterest', label: 'Course Interest' },
  { value: 'interests.mode', label: 'Training Mode' },
  { value: 'interests.urgency', label: 'Urgency' },
  { value: 'interests.affordability', label: 'Affordability' },
  { value: 'interests.placement', label: 'Placement Interest' },
  { value: 'city', label: 'City' },
  { value: 'customFields.budget', label: 'Custom: Budget' },
];

export default function WhatsAppQualificationConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<QualificationQuestion>(EMPTY_QUESTION);
  const [optionsInput, setOptionsInput] = useState('');
  const [scoreInput, setScoreInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/qualification/config`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setConfig(data.data);
      else setError(data.message || 'Failed to load config');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/qualification/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setSuccess('Configuration saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Save failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (idx: number) => {
    const q = config!.questions[idx];
    setEditDraft({ ...q, options: [...q.options], scoreImpact: [...q.scoreImpact.map((s) => ({ ...s }))] });
    setOptionsInput(q.options.join(', '));
    setScoreInput(q.scoreImpact.map((s) => `${s.answerValue}:${s.impact}`).join(', '));
    setEditingIdx(idx);
  };

  const closeEdit = () => { setEditingIdx(null); };

  const saveEdit = () => {
    if (!config) return;
    const opts = optionsInput.split(',').map((s) => s.trim()).filter(Boolean);
    const scores: ScoreImpact[] = scoreInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [k, v] = s.split(':');
        return { answerValue: k?.trim() || '', impact: parseFloat(v) || 0 };
      });

    const updated = { ...editDraft, options: opts, scoreImpact: scores };
    const questions = [...config.questions];
    if (editingIdx === -1) {
      updated.order = questions.length;
      updated.id = `q_${Date.now()}`;
      questions.push(updated);
    } else {
      questions[editingIdx!] = updated;
    }
    setConfig({ ...config, questions });
    closeEdit();
  };

  const addQuestion = () => {
    setEditDraft({ ...EMPTY_QUESTION });
    setOptionsInput('');
    setScoreInput('');
    setEditingIdx(-1);
  };

  const removeQuestion = (idx: number) => {
    if (!config) return;
    setConfig({ ...config, questions: config.questions.filter((_, i) => i !== idx) });
  };

  const toggleQuestion = (idx: number) => {
    if (!config) return;
    const questions = [...config.questions];
    questions[idx] = { ...questions[idx], enabled: !questions[idx].enabled };
    setConfig({ ...config, questions });
  };

  const updateWA = (field: keyof WhatsAppSettings, value: any) => {
    if (!config) return;
    setConfig({ ...config, whatsappSettings: { ...config.whatsappSettings, [field]: value } });
  };

  if (loading) return <div className="wa-config-loading"><div className="spinner-border text-primary" /></div>;

  return (
    <div className="wa-config-page">
      <div className="wa-config-header">
        <div>
          <h2><i className="fab fa-whatsapp text-success me-2" />WhatsApp Qualification Bot</h2>
          <p className="text-muted mb-0">Configure the questions your bot asks new leads on WhatsApp</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="fas fa-save me-2" />Save Configuration</>}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* WhatsApp Settings */}
      {config && (
        <div className="card mb-4">
          <div className="card-header d-flex align-items-center justify-content-between">
            <strong><i className="fas fa-cog me-2" />Bot Settings</strong>
            <div className="form-check form-switch mb-0">
              <input className="form-check-input" type="checkbox" checked={config.whatsappSettings.enabled} onChange={(e) => updateWA('enabled', e.target.checked)} />
              <label className="form-check-label">Bot Active</label>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Welcome Message</label>
                <textarea className="form-control" rows={3} value={config.whatsappSettings.welcomeMessage} onChange={(e) => updateWA('welcomeMessage', e.target.value)} placeholder="Hi {name}! Welcome to our program..." />
                <small className="text-muted">Supports <code>{'{{name}}'}</code> placeholder</small>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Completion Message</label>
                <textarea className="form-control" rows={3} value={config.whatsappSettings.completionMessage} onChange={(e) => updateWA('completionMessage', e.target.value)} placeholder="Thank you for your responses..." />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">Max Questions per Session</label>
                <input type="number" className="form-control" min={1} max={20} value={config.whatsappSettings.maxQuestions} onChange={(e) => updateWA('maxQuestions', parseInt(e.target.value))} />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-semibold">No-response Timeout (hours)</label>
                <input type="number" className="form-control" min={1} max={168} value={config.whatsappSettings.noResponseTimeoutHours} onChange={(e) => updateWA('noResponseTimeoutHours', parseInt(e.target.value))} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Table */}
      {config && (
        <div className="card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <strong><i className="fas fa-question-circle me-2" />Qualification Questions ({config.questions.length})</strong>
            <button className="btn btn-sm btn-success" onClick={addQuestion}><i className="fas fa-plus me-1" />Add Question</button>
          </div>
          <div className="card-body p-0">
            {config.questions.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="fas fa-comment-dots fa-3x mb-3 opacity-25" />
                <p>No questions configured. Click "Add Question" to start.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Field</th>
                      <th>Required</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.questions.map((q, idx) => (
                      <tr key={q.id || idx} className={!q.enabled ? 'opacity-50' : ''}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>{q.question || <em className="text-muted">Untitled</em>}</td>
                        <td><span className="badge bg-secondary">{q.answerType}</span></td>
                        <td><code className="small">{q.fieldToUpdate || '—'}</code></td>
                        <td>{q.required ? <i className="fas fa-check text-success" /> : <i className="fas fa-times text-muted" />}</td>
                        <td>
                          <div className="form-check form-switch mb-0">
                            <input className="form-check-input" type="checkbox" checked={q.enabled} onChange={() => toggleQuestion(idx)} />
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(idx)}><i className="fas fa-edit" /></button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => removeQuestion(idx)}><i className="fas fa-trash" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingIdx !== null && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingIdx === -1 ? 'Add Question' : 'Edit Question'}</h5>
                <button className="btn-close" onClick={closeEdit} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold">Question Text *</label>
                    <input className="form-control" value={editDraft.question} onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })} placeholder="e.g. What course are you interested in?" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Answer Type</label>
                    <select className="form-select" value={editDraft.answerType} onChange={(e) => setEditDraft({ ...editDraft, answerType: e.target.value as any })}>
                      <option value="text">Text (free form)</option>
                      <option value="number">Number</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="boolean">Yes / No</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Field to Update in Lead</label>
                    <select className="form-select" value={editDraft.fieldToUpdate} onChange={(e) => setEditDraft({ ...editDraft, fieldToUpdate: e.target.value })}>
                      {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {editDraft.answerType === 'multiple_choice' && (
                    <div className="col-12">
                      <label className="form-label fw-semibold">Options <small className="text-muted">(comma-separated)</small></label>
                      <input className="form-control" value={optionsInput} onChange={(e) => setOptionsInput(e.target.value)} placeholder="Option 1, Option 2, Option 3" />
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label fw-semibold">Score Impact <small className="text-muted">(answer:points, e.g. "Python:10, Java:8")</small></label>
                    <input className="form-control" value={scoreInput} onChange={(e) => setScoreInput(e.target.value)} placeholder="Yes:10, No:-5" />
                  </div>
                  <div className="col-md-6 d-flex align-items-center gap-4">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="req" checked={editDraft.required} onChange={(e) => setEditDraft({ ...editDraft, required: e.target.checked })} />
                      <label className="form-check-label" htmlFor="req">Required</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="en" checked={editDraft.enabled} onChange={(e) => setEditDraft({ ...editDraft, enabled: e.target.checked })} />
                      <label className="form-check-label" htmlFor="en">Enabled</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeEdit}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={!editDraft.question}>Save Question</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
