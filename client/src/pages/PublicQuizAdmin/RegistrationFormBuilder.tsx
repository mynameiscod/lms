import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  eligibilityRule?: { operator: string; value: string };
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

  const updateForm = (partial: Partial<typeof form>) => onChange({ ...form, ...partial });

  const addField = () => {
    const field: FormField = { id: uuid(), label: 'New Field', type: 'text', required: false };
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

  const addQuickFields = () => {
    const quick: FormField[] = [
      { id: uuid(), label: 'Full Name', type: 'text', required: true },
      { id: uuid(), label: 'Email Address', type: 'email', required: true },
      { id: uuid(), label: 'Phone Number', type: 'phone', required: true },
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

      {form.fields.map((field, idx) => (
        <div key={field.id} className={`rfb-field-row${editingId === field.id ? ' editing' : ''}`}>
          <div className="rfb-field-summary" onClick={() => setEditingId(editingId === field.id ? null : field.id)}>
            <span className="rfb-field-type-badge">{field.type}</span>
            <span className="rfb-field-label">{field.label}</span>
            {field.required && <span className="rfb-required">Required</span>}
            {field.eligibilityRule?.value && (
              <span className="rfb-eligibility-badge">
                🎯 {field.label} {field.eligibilityRule.operator} "{field.eligibilityRule.value}"
              </span>
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
                  <select className="form-select" value={field.type} onChange={e => updateField(field.id, { type: e.target.value })}>
                    {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Placeholder</label>
                  <input className="form-control" value={field.placeholder || ''} onChange={e => updateField(field.id, { placeholder: e.target.value })} />
                </div>
                <div className="col-md-1 d-flex align-items-end">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} />
                    <label className="form-check-label small">Req.</label>
                  </div>
                </div>

                {/* Options for select/radio */}
                {(field.type === 'select' || field.type === 'radio') && (
                  <div className="col-12">
                    <label className="form-label">Options (one per line)</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={(field.options || []).join('\n')}
                      onChange={e => updateField(field.id, { options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}

                {/* Eligibility rule */}
                <div className="col-12">
                  <div className="rfb-eligibility-section">
                    <div className="rfb-eligibility-title">🎯 Eligibility Rule (optional soft gate)</div>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <select
                          className="form-select form-select-sm"
                          value={field.eligibilityRule?.operator || ''}
                          onChange={e => updateField(field.id, {
                            eligibilityRule: e.target.value
                              ? { operator: e.target.value, value: field.eligibilityRule?.value || '' }
                              : undefined
                          })}
                        >
                          <option value="">No rule</option>
                          {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <input
                          className="form-control form-control-sm"
                          placeholder="Expected value e.g. 2024"
                          value={field.eligibilityRule?.value || ''}
                          onChange={e => updateField(field.id, {
                            eligibilityRule: field.eligibilityRule?.operator
                              ? { ...field.eligibilityRule, value: e.target.value }
                              : undefined
                          })}
                          disabled={!field.eligibilityRule?.operator}
                        />
                      </div>
                    </div>
                    <div className="form-text">If the student's answer doesn't match, they're flagged (soft gate — they can still take the quiz).</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {form.fields.length > 0 && (
        <div className="mt-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={addField}>+ Add Another Field</button>
        </div>
      )}
    </div>
  );
};

export default RegistrationFormBuilder;
