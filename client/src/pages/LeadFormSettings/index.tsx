import React, { useState, useEffect, useCallback } from 'react';
import { leadFormConfigApi } from '../../api';
import './LeadFormSettings.css';

interface FormField {
  _id?: string;
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  isBuiltIn: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
];

const LeadFormSettings: React.FC = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add custom field modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newField, setNewField] = useState({ label: '', type: 'text', required: false, placeholder: '', options: '' });

  // Source editor
  const [newSource, setNewSource] = useState('');

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leadFormConfigApi.getConfig();
      const config = res.data;
      setFields((config.fields || []).sort((a: FormField, b: FormField) => a.order - b.order));
      setSources(config.sources || []);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to load form config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Name, phone, email are always protected defaults — cannot be deleted or disabled
  const CORE_FIELDS = ['name', 'phone', 'email'];

  const handleToggleEnabled = (fieldKey: string) => {
    setFields(prev => prev.map(f => {
      if (f.fieldKey === fieldKey) {
        if (CORE_FIELDS.includes(f.fieldKey)) return f;
        return { ...f, enabled: !f.enabled };
      }
      return f;
    }));
  };

  const handleToggleRequired = (fieldKey: string) => {
    setFields(prev => prev.map(f => {
      if (f.fieldKey === fieldKey) {
        // Admin can now control required for ALL fields including core fields
        return { ...f, required: !f.required };
      }
      return f;
    }));
  };

  const handleTypeChange = (fieldKey: string, newType: string) => {
    setFields(prev => prev.map(f => {
      if (f.fieldKey === fieldKey) {
        return { ...f, type: newType };
      }
      return f;
    }));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    setFields(newFields.map((f, i) => ({ ...f, order: i })));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await leadFormConfigApi.updateConfig({ fields, sources });
      showAlertMsg('success', 'Form configuration saved!');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomField = async () => {
    if (!newField.label.trim()) {
      showAlertMsg('error', 'Field label is required');
      return;
    }
    if (newField.type === 'select' && !newField.options.trim()) {
      showAlertMsg('error', 'Dropdown fields require at least one option');
      return;
    }
    try {
      const payload: any = {
        label: newField.label,
        type: newField.type,
        required: newField.required,
        placeholder: newField.placeholder
      };
      if (newField.type === 'select') {
        payload.options = newField.options.split(',').map(s => s.trim()).filter(Boolean);
      }
      await leadFormConfigApi.addCustomField(payload);
      setShowAddModal(false);
      setNewField({ label: '', type: 'text', required: false, placeholder: '', options: '' });
      loadConfig();
      showAlertMsg('success', 'Custom field added!');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to add field');
    }
  };

  const handleDeleteCustomField = async (fieldKey: string) => {
    if (!window.confirm('Delete this custom field? Data stored in leads for this field will remain but won\'t be displayed.')) return;
    try {
      await leadFormConfigApi.deleteCustomField(fieldKey);
      loadConfig();
      showAlertMsg('success', 'Custom field deleted');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to delete field');
    }
  };

  // Handles deletion of any non-core field (built-in non-core or custom)
  const handleDeleteField = async (field: FormField) => {
    if (CORE_FIELDS.includes(field.fieldKey)) return;
    if (field.isBuiltIn) {
      if (!window.confirm(`Remove "${field.label}" from the form? You can restore it by re-initializing defaults.`)) return;
      const updated = fields.filter(f => f.fieldKey !== field.fieldKey).map((f, i) => ({ ...f, order: i }));
      setFields(updated);
      try {
        await leadFormConfigApi.updateConfig({ fields: updated, sources });
        showAlertMsg('success', `"${field.label}" removed from form.`);
      } catch (error: any) {
        showAlertMsg('error', error.message || 'Failed to save');
        loadConfig();
      }
    } else {
      await handleDeleteCustomField(field.fieldKey);
    }
  };

  const handleAddSource = async () => {
    const val = newSource.trim().toLowerCase().replace(/\s+/g, '_');
    if (!val) return;
    if (sources.includes(val)) {
      showAlertMsg('error', 'Source already exists');
      return;
    }
    const updatedSources = [...sources, val];
    setSources(updatedSources);
    setNewSource('');
    try {
      await leadFormConfigApi.updateConfig({ fields, sources: updatedSources });
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save source');
    }
  };

  const handleRemoveSource = async (source: string) => {
    const updatedSources = sources.filter(s => s !== source);
    setSources(updatedSources);
    try {
      await leadFormConfigApi.updateConfig({ fields, sources: updatedSources });
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save source');
    }
  };

  const handleLabelChange = (fieldKey: string, newLabel: string) => {
    setFields(prev => prev.map(f =>
      f.fieldKey === fieldKey ? { ...f, label: newLabel } : f
    ));
  };

  if (loading) {
    return <div className="lead-form-settings"><div className="loading-spinner">Loading form configuration...</div></div>;
  }

  return (
    <div className="lead-form-settings">
      <div className="settings-header">
        <div>
          <h1>Lead Form Settings</h1>
          <p className="settings-subtitle">Customize which fields appear on the lead creation form and add custom fields.</p>
        </div>
        <div className="settings-header-actions">
          <button className="btn-secondary" onClick={() => setShowAddModal(true)}>+ Add Custom Field</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* Fields Configuration */}
      <div className="settings-section">
        <h2>Form Fields</h2>
        <p className="section-desc">Edit labels, types, enable/disable, and set required for all fields. <strong>Name, Email and Phone</strong> cannot be removed but all other settings are customizable.</p>

        <div className="fields-table">
          <div className="fields-table-header">
            <span className="ft-col ft-order">Order</span>
            <span className="ft-col ft-label">Label</span>
            <span className="ft-col ft-type">Type</span>
            <span className="ft-col ft-enabled">Enabled</span>
            <span className="ft-col ft-required">Required</span>
            <span className="ft-col ft-actions">Actions</span>
          </div>
          {fields.map((field, idx) => {
            const isCore = CORE_FIELDS.includes(field.fieldKey);
            return (
            <div className={`fields-table-row ${!field.enabled ? 'disabled-row' : ''} ${isCore ? 'core-row' : ''}`} key={field.fieldKey}>
              <span className="ft-col ft-order">
                <button className="move-btn" onClick={() => handleMoveField(idx, 'up')} disabled={idx === 0}>▲</button>
                <button className="move-btn" onClick={() => handleMoveField(idx, 'down')} disabled={idx === fields.length - 1}>▼</button>
              </span>
              <span className="ft-col ft-label">
                <div className="field-label-wrapper">
                  <input
                    type="text"
                    className="label-input"
                    value={field.label}
                    onChange={e => handleLabelChange(field.fieldKey, e.target.value)}
                  />
                  {field.isBuiltIn && (
                    isCore
                      ? <span className="badge core">Default</span>
                      : <span className="badge built-in">Built-in</span>
                  )}
                </div>
              </span>
              <span className="ft-col ft-type">
                <select
                  className="type-select"
                  value={field.type}
                  onChange={e => handleTypeChange(field.fieldKey, e.target.value)}
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </span>
              <span className="ft-col ft-enabled">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => handleToggleEnabled(field.fieldKey)}
                    disabled={isCore}
                  />
                  <span className="toggle-slider" />
                </label>
              </span>
              <span className="ft-col ft-required">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={() => handleToggleRequired(field.fieldKey)}
                  />
                  <span className="toggle-slider" />
                </label>
              </span>
              <span className="ft-col ft-actions">
                {!isCore && (
                  <button
                    className="delete-field-btn"
                    onClick={() => handleDeleteField(field)}
                    title={field.isBuiltIn ? 'Remove from form' : 'Delete custom field'}
                  >
                    🗑️
                  </button>
                )}
                {isCore && <span className="core-lock" title="Required default field">🔒</span>}
              </span>
            </div>
          );
          })}
        </div>
      </div>

      {/* Sources Configuration */}
      <div className="settings-section">
        <h2>Lead Sources</h2>
        <p className="section-desc">Customize the source options available when creating leads.</p>

        <div className="sources-config">
          <div className="source-tags">
            {sources.map(source => (
              <span className="source-tag" key={source}>
                {source.replace(/_/g, ' ')}
                <button className="source-remove" onClick={() => handleRemoveSource(source)}>×</button>
              </span>
            ))}
          </div>
          <div className="add-source-row">
            <input
              type="text"
              value={newSource}
              onChange={e => setNewSource(e.target.value)}
              placeholder="Add new source..."
              onKeyDown={e => e.key === 'Enter' && handleAddSource()}
            />
            <button className="btn-secondary" onClick={handleAddSource}>Add</button>
          </div>
        </div>
      </div>

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add Custom Field</h2>
            <div className="form-group">
              <label>Field Label *</label>
              <input
                type="text"
                value={newField.label}
                onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                placeholder="e.g., City, College Name, Budget"
                autoFocus
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Field Type *</label>
                <select value={newField.type} onChange={e => setNewField(p => ({ ...p, type: e.target.value }))}>
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Required</label>
                <label className="toggle-switch" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>Placeholder</label>
              <input
                type="text"
                value={newField.placeholder}
                onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))}
                placeholder="Placeholder text..."
              />
            </div>
            {newField.type === 'select' && (
              <div className="form-group">
                <label>Options (comma separated) *</label>
                <input
                  type="text"
                  value={newField.options}
                  onChange={e => setNewField(p => ({ ...p, options: e.target.value }))}
                  placeholder="e.g., Option 1, Option 2, Option 3"
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddCustomField}>Add Field</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFormSettings;
