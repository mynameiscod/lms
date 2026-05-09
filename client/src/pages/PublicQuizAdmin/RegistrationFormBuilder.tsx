import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';

interface EligibilityRule {
  id: string;
  operator: string;
  value: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  eligibilityRules?: EligibilityRule[];
}

interface Props {
  form: { fields: FormField[]; submitButtonText?: string };
  onChange: (val: any) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'upload', label: 'File Upload (Photo / Resume / ID)' },
];

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater than or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less than or equal' },
];

const RegistrationFormBuilder: React.FC<Props> = ({ form, onChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  // Local raw text for options textarea — avoids losing newlines on filter
  const [optionsText, setOptionsText] = useState<Record<string, string>>({});

  const updateForm = (partial: Partial<typeof form>) => onChange({ ...form, ...partial });

  const addField = () => {
    const field: FormField = { id: uuid(), label: 'New Field', type: 'text', required: false, eligibilityRules: [] };
    updateForm({ fields: [...form.fields, field] });
    setEditingId(field.id);
  };

  const removeField = (id: string) => {
    updateForm({ fields: form.fields.filter(f => f.id !== id) });
    if (editingId === id) setEditingId(null);
  };

  const moveField = (id: string, dir: 'up' | 'down') => {
    const fields = [...form.fields];
    const idx = fields.findIndex(f => f.id === id);
    if (dir === 'up' && idx > 0) [fields[idx - 1], fields[idx]] = [fields[idx], fields[idx - 1]];
    if (dir === 'down' && idx < fields.length - 1) [fields[idx], fields[idx + 1]] = [fields[idx + 1], fields[idx]];
    updateForm({ fields });
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    updateForm({ fields: form.fields.map(f => f.id === id ? { ...f, ...patch } : f) });
  };

  const addRule = (fieldId: string) => {
    const field = form.fields.find(f => f.id === fieldId);
    if (!field) return;
    const newRule: EligibilityRule = { id: uuid(), operator: 'eq', value: '' };
    updateField(fieldId, { eligibilityRules: [...(field.eligibilityRules || []), newRule] });
  };

  const updateRule = (fieldId: string, ruleId: string, patch: Partial<EligibilityRule>) => {
    const field = form.fields.find(f => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, {
      eligibilityRules: (field.eligibilityRules || []).map(r => r.id === ruleId ? { ...r, ...patch } : r)
    });
  };

  const removeRule = (fieldId: string, ruleId: string) => {
    const field = form.fields.find(f => f.id === fieldId);
    if (!field) return;
    updateField(fieldId, { eligibilityRules: (field.eligibilityRules || []).filter(r => r.id !== ruleId) });
  };

  // Commit raw options text to the field on blur
  const commitOptions = (fieldId: string) => {
    const raw = optionsText[fieldId] ?? '';
    const parsed = raw.split('\n').map(s => s.trim()).filter(Boolean);
    updateField(fieldId, { options: parsed });
  };

  const getOptionsText = (field: FormField) => {
    // Prefer local draft if user is actively editing
    return optionsText[field.id] !== undefined ? optionsText[field.id] : (field.options || []).join('\n');
  };

  const addQuickFields = () => {
    const quick: FormField[] = [
      { id: uuid(), label: 'Full Name', type: 'text', required: true, eligibilityRules: [] },
      { id: uuid(), label: 'Email Address', type: 'email', required: true, eligibilityRules: [] },
      { id: uuid(), label: 'Phone Number', type: 'phone', required: true, eligibilityRules: [] },
    ];
    updateForm({ fields: [...form.fields, ...quick] });
  };

  return (
    <div className="rfb-wrap">
      <div className="d-flex gap-2 mb-4 align-items-center">
        <div className="flex-grow-1">
          <label className="form-label">Submit Button Text</label>
          <input
            className="form-control"
            value={form.submitButtonText || 'Start Quiz'}
            onChange={e => updateForm({ submitButtonText: e.target.value })}
            style={{ maxWidth: 300 }}
          />
        </div>
        <div className="d-flex gap-2 align-items-end pb-1">
          <button className="btn btn-outline-secondary btn-sm" onClick={addQuickFields}>
            ⚡ Add Name + Email + Phone
          </button>
          <button className="btn btn-primary btn-sm" onClick={addField}>
            + Add Field
          </button>
        </div>
      </div>

      {form.fields.length === 0 && (
        <div className="rfb-empty">
          No fields yet. Click "Add Name + Email + Phone" to quickly add common fields, or add individually.
        </div>
      )}

      {form.fields.map((field, idx) => {
        const rules = field.eligibilityRules || [];
        return (
          <div key={field.id} className={`rfb-field-row${editingId === field.id ? ' editing' : ''}`}>
            <div className="rfb-field-summary" onClick={() => setEditingId(editingId === field.id ? null : field.id)}>
              <span className="rfb-field-type-badge">{field.type}</span>
              <span className="rfb-field-label">{field.label}</span>
              {field.required && <span className="rfb-required">Required</span>}
              {rules.length > 0 && (
                <span className="rfb-eligibility-badge">🎯 {rules.length} rule{rules.length > 1 ? 's' : ''}</span>
              )}
              <div className="rfb-field-controls ms-auto" onClick={e => e.stopPropagation()}>
                <button className="btn btn-xs btn-outline-secondary" onClick={() => moveField(field.id, 'up')} disabled={idx === 0}>↑</button>
                <button className="btn btn-xs btn-outline-secondary" onClick={() => moveField(field.id, 'down')} disabled={idx === form.fields.length - 1}>↓</button>
                <button className="btn btn-xs btn-outline-danger" onClick={() => removeField(field.id)}>✕</button>
              </div>
            </div>

            {editingId === field.id && (
              <div className="rfb-field-editor" onClick={e => e.stopPropagation()}>
                <div className="row g-2">
                  <div className="col-md-5">
                    <label className="form-label">Label *</label>
                    <input className="form-control" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={field.type} onChange={e => updateField(field.id, { type: e.target.value, options: [] })}>
                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Placeholder</label>
                    <input className="form-control" value={field.placeholder || ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                  </div>
                  <div className="col-md-1 d-flex align-items-end pb-2">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                      <label className="form-check-label small">Req.</label>
                    </div>
                  </div>

                  {/* Upload hint */}
                  {field.type === 'upload' && (
                    <div className="col-12">
                      <div className="alert alert-info py-2 mb-0 small">
                        📁 Students will see a file picker. Use the placeholder to specify what to upload (e.g. "Upload your resume (PDF, max 5MB)").
                        Files will be submitted as form data and stored by the server.
                      </div>
                    </div>
                  )}

                  {/* Options for select/radio */}
                  {(field.type === 'select' || field.type === 'radio') && (
                    <div className="col-12">
                      <label className="form-label">
                        Options <span className="text-muted small">(type each option on a new line — press Enter for next)</span>
                      </label>
                      <textarea
                        className="form-control font-monospace"
                        rows={5}
                        value={getOptionsText(field)}
                        onChange={e => {
                          // Keep raw text in local state so Enter works naturally
                          setOptionsText(prev => ({ ...prev, [field.id]: e.target.value }));
                        }}
                        onBlur={() => commitOptions(field.id)}
                        placeholder={"Option 1\nOption 2\nOption 3"}
                      />
                      <div className="form-text">
                        Preview: {(optionsText[field.id] !== undefined
                          ? optionsText[field.id].split('\n').map(s => s.trim()).filter(Boolean)
                          : (field.options || [])
                        ).map((o, i) => <span key={i} className="badge bg-light text-dark me-1">{o}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Eligibility rules */}
                  <div className="col-12">
                    <div className="rfb-eligibility-section">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="rfb-eligibility-title">🎯 Eligibility Rules (soft gate — student is flagged, not blocked)</div>
                        <button className="btn btn-xs btn-outline-warning" onClick={() => addRule(field.id)}>+ Add Rule</button>
                      </div>

                      {rules.length === 0 && (
                        <div className="text-muted small">No rules. Click "+ Add Rule" to define eligibility criteria for this field.</div>
                      )}

                      {rules.map((rule, ri) => (
                        <div key={rule.id} className="d-flex gap-2 align-items-center mb-2">
                          <span className="text-muted small" style={{ minWidth: 20 }}>#{ri + 1}</span>
                          <select
                            className="form-select form-select-sm"
                            style={{ maxWidth: 180 }}
                            value={rule.operator}
                            onChange={e => updateRule(field.id, rule.id, { operator: e.target.value })}
                          >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                          </select>
                          <input
                            className="form-control form-control-sm"
                            placeholder="Expected value e.g. 2024"
                            value={rule.value}
                            onChange={e => updateRule(field.id, rule.id, { value: e.target.value })}
                          />
                          <button className="btn btn-xs btn-outline-danger flex-shrink-0" onClick={() => removeRule(field.id, rule.id)}>✕ Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {form.fields.length > 0 && (
        <div className="mt-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={addField}>+ Add Another Field</button>
        </div>
      )}
    </div>
  );
};

export default RegistrationFormBuilder;

