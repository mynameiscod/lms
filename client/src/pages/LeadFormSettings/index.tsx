import React, { useState, useEffect, useCallback } from 'react';
import { leadFormConfigApi, leadStageApi } from '../../api';
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

interface StatsCard {
  key: string;
  type: 'system' | 'stage' | 'priority' | 'source' | 'custom';
  label: string;
  icon?: string;
  color?: string;
  enabled: boolean;
  order: number;
  stageId?: string;
  priority?: string;
  source?: string;
}

interface TableColumn {
  key: string;
  type: 'system' | 'custom';
  label: string;
  enabled: boolean;
  order: number;
  width?: string;
  fieldKey?: string;
}

interface Stage {
  _id: string;
  name: string;
  color: string;
  order: number;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
];

const CORE_FIELDS = ['name', 'email', 'phone'];

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

  // Stats cards configuration
  const [statsCards, setStatsCards] = useState<StatsCard[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [savingStats, setSavingStats] = useState(false);
  
  // Table columns configuration
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [savingColumns, setSavingColumns] = useState(false);
  const [tenantSlug, setTenantSlug] = useState('');
  
  const [activeTab, setActiveTab] = useState<'fields' | 'sources' | 'stats' | 'columns' | 'embed'>('fields');
  const [embedCopied, setEmbedCopied] = useState(false);
  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const [configRes, stagesRes, statsRes, columnsRes] = await Promise.all([
        leadFormConfigApi.getConfig(),
        leadStageApi.getStages(),
        leadFormConfigApi.getStatsCardsConfig(),
        leadFormConfigApi.getTableColumnsConfig()
      ]);
      
      const config = configRes.data;
      setFields((config.fields || []).sort((a: FormField, b: FormField) => a.order - b.order));
      setSources(config.sources || []);
      if (config.tenantSlug) setTenantSlug(config.tenantSlug);
      
      const loadedStages = stagesRes.data || [];
      setStages(loadedStages);
      
      // Load existing stats cards or create default configuration
      let existingCards = statsRes.data || [];
      if (existingCards.length === 0) {
        // Create default stats cards if none exist
        const defaultCards: StatsCard[] = [
          { key: 'totalLeads', type: 'system', label: 'Total Leads', icon: '📋', color: '#2563eb', enabled: true, order: 0 },
          { key: 'todayFollowUps', type: 'system', label: "Follow-ups Today", icon: '🔔', color: '#ea580c', enabled: true, order: 1 },
          { key: 'callsToday', type: 'system', label: 'Calls Today', icon: '📞', color: '#10b981', enabled: true, order: 2 },
          { key: 'priority_hot', type: 'priority', label: 'Hot Leads', icon: '🔥', color: '#dc2626', enabled: true, order: 3, priority: 'hot' },
          { key: 'priority_warm', type: 'priority', label: 'Warm Leads', icon: '☀️', color: '#d97706', enabled: true, order: 4, priority: 'warm' },
          { key: 'priority_cold', type: 'priority', label: 'Cold Leads', icon: '❄️', color: '#2563eb', enabled: true, order: 5, priority: 'cold' },
          ...loadedStages.slice(0, 6).map((stage: Stage, i: number) => ({
            key: `stage_${stage._id}`,
            type: 'stage' as const,
            label: stage.name,
            icon: '●',
            color: stage.color,
            enabled: true,
            order: 6 + i,
            stageId: stage._id
          }))
        ];
        existingCards = defaultCards;
      }
      setStatsCards(existingCards.sort((a: StatsCard, b: StatsCard) => a.order - b.order));
      
      // Load table columns configuration
      let existingColumns = columnsRes.data || [];
      if (existingColumns.length === 0) {
        // Create default table columns
        existingColumns = [
          { key: 'select', type: 'system', label: 'Select', enabled: true, order: 0, width: '40px' },
          { key: 'lead', type: 'system', label: 'Lead', enabled: true, order: 1 },
          { key: 'priority', type: 'system', label: 'Priority', enabled: true, order: 2 },
          { key: 'stage', type: 'system', label: 'Stage', enabled: true, order: 3 },
          { key: 'source', type: 'system', label: 'Source', enabled: true, order: 4 },
          { key: 'assignedTo', type: 'system', label: 'Assigned To', enabled: true, order: 5 },
          { key: 'followUp', type: 'system', label: 'Next Follow-up', enabled: true, order: 6 },
          { key: 'created', type: 'system', label: 'Created', enabled: true, order: 7 },
          { key: 'actions', type: 'system', label: 'Actions', enabled: true, order: 8, width: '60px' }
        ];
      }
      setTableColumns(existingColumns.sort((a: TableColumn, b: TableColumn) => a.order - b.order));
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
        const updated: FormField = { ...f, type: newType };
        if (['select', 'multiselect'].includes(newType) && (!f.options || f.options.length === 0)) {
          updated.options = [];
        }
        if (!['select', 'multiselect'].includes(newType)) {
          delete updated.options;
        }
        return updated;
      }
      return f;
    }));
  };

  const handleOptionsChange = (fieldKey: string, optionsStr: string) => {
    setFields(prev => prev.map(f => {
      if (f.fieldKey === fieldKey) {
        return { ...f, options: optionsStr.split('\n').map(o => o.trim()).filter(Boolean) };
      }
      return f;
    }));
  };

  const handlePlaceholderChange = (fieldKey: string, placeholder: string) => {
    setFields(prev => prev.map(f => {
      if (f.fieldKey === fieldKey) {
        return { ...f, placeholder };
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
        payload.options = newField.options.split('\n').map(s => s.trim()).filter(Boolean);
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

  // Handles deletion of any field (built-in or custom)
  const handleDeleteField = async (field: FormField) => {
    if (field.isBuiltIn) {
      if (!window.confirm(`Remove "${field.label}" from the form? You can re-add it later by resetting to defaults.`)) return;
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

  // Stats cards handlers
  const handleToggleStatsCard = (key: string) => {
    setStatsCards(prev => prev.map(card =>
      card.key === key ? { ...card, enabled: !card.enabled } : card
    ));
  };

  const handleMoveStatsCard = (index: number, direction: 'up' | 'down') => {
    const newCards = [...statsCards];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newCards.length) return;
    [newCards[index], newCards[target]] = [newCards[target], newCards[index]];
    setStatsCards(newCards.map((c, i) => ({ ...c, order: i })));
  };

  const handleStatsCardLabelChange = (key: string, newLabel: string) => {
    setStatsCards(prev => prev.map(card =>
      card.key === key ? { ...card, label: newLabel } : card
    ));
  };

  const handleAddStageCard = (stage: Stage) => {
    const key = `stage_${stage._id}`;
    if (statsCards.some(c => c.key === key)) return;
    const maxOrder = statsCards.reduce((max, c) => Math.max(max, c.order), 0);
    setStatsCards(prev => [...prev, {
      key,
      type: 'stage',
      label: stage.name,
      icon: '●',
      color: stage.color,
      enabled: true,
      order: maxOrder + 1,
      stageId: stage._id
    }]);
  };

  const handleRemoveStatsCard = (key: string) => {
    // Don't remove system cards, just disable them
    const card = statsCards.find(c => c.key === key);
    if (card?.type === 'system' || card?.type === 'priority') {
      handleToggleStatsCard(key);
      return;
    }
    setStatsCards(prev => prev.filter(c => c.key !== key).map((c, i) => ({ ...c, order: i })));
  };

  const handleSaveStatsCards = async () => {
    try {
      setSavingStats(true);
      await leadFormConfigApi.updateStatsCardsConfig(statsCards);
      showAlertMsg('success', 'Stats cards configuration saved!');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save stats cards');
    } finally {
      setSavingStats(false);
    }
  };

  // Table columns handlers
  const handleToggleTableColumn = (key: string) => {
    // Don't allow disabling select and actions columns
    if (key === 'select' || key === 'actions') return;
    setTableColumns(prev => prev.map(col =>
      col.key === key ? { ...col, enabled: !col.enabled } : col
    ));
  };

  const handleMoveTableColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...tableColumns];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newColumns.length) return;
    [newColumns[index], newColumns[target]] = [newColumns[target], newColumns[index]];
    setTableColumns(newColumns.map((c, i) => ({ ...c, order: i })));
  };

  const handleTableColumnLabelChange = (key: string, newLabel: string) => {
    setTableColumns(prev => prev.map(col =>
      col.key === key ? { ...col, label: newLabel } : col
    ));
  };

  const handleAddCustomFieldColumn = (field: FormField) => {
    const key = `custom_${field.fieldKey}`;
    if (tableColumns.some(c => c.key === key)) return;
    const maxOrder = tableColumns.reduce((max, c) => Math.max(max, c.order), 0);
    // Insert before actions column
    const actionsIndex = tableColumns.findIndex(c => c.key === 'actions');
    const newColumns = [...tableColumns];
    const newCol: TableColumn = {
      key,
      type: 'custom',
      label: field.label,
      enabled: true,
      order: actionsIndex >= 0 ? actionsIndex : maxOrder + 1,
      fieldKey: field.fieldKey
    };
    if (actionsIndex >= 0) {
      newColumns.splice(actionsIndex, 0, newCol);
      // Re-order
      setTableColumns(newColumns.map((c, i) => ({ ...c, order: i })));
    } else {
      setTableColumns([...tableColumns, newCol]);
    }
  };

  const handleRemoveTableColumn = (key: string) => {
    // Don't remove system columns, just disable them
    const col = tableColumns.find(c => c.key === key);
    if (col?.type === 'system') {
      handleToggleTableColumn(key);
      return;
    }
    setTableColumns(prev => prev.filter(c => c.key !== key).map((c, i) => ({ ...c, order: i })));
  };

  const handleSaveTableColumns = async () => {
    try {
      setSavingColumns(true);
      await leadFormConfigApi.updateTableColumnsConfig(tableColumns);
      showAlertMsg('success', 'Table columns configuration saved!');
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save table columns');
    } finally {
      setSavingColumns(false);
    }
  };

  // Get stages not yet added to stats cards
  const availableStages = stages.filter(
    stage => !statsCards.some(c => c.stageId === stage._id)
  );

  // Get custom fields not yet added to table columns
  const availableCustomFields = fields.filter(
    field => !field.isBuiltIn && field.enabled && !tableColumns.some(c => c.fieldKey === field.fieldKey)
  );

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center" style={{minHeight: '300px'}}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 lfs-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold text-dark mb-1">Lead Form Settings</h4>
          <p className="text-muted small mb-0">Customize form fields, lead sources, stats cards and table columns.</p>
        </div>
        <div className="d-flex gap-2">
          {activeTab === 'fields' && (
            <>
              <button className="btn btn-outline-primary btn-sm" onClick={() => setShowAddModal(true)}>
                <i className="fa fa-plus me-1"></i> Add Field
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          {activeTab === 'stats' && (
            <button className="btn btn-primary btn-sm" onClick={handleSaveStatsCards} disabled={savingStats}>
              {savingStats ? 'Saving...' : 'Save Config'}
            </button>
          )}
          {activeTab === 'columns' && (
            <button className="btn btn-primary btn-sm" onClick={handleSaveTableColumns} disabled={savingColumns}>
              {savingColumns ? 'Saving...' : 'Save Config'}
            </button>
          )}
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`alert alert-${alert.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>
            Form Fields
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'sources' ? 'active' : ''}`} onClick={() => setActiveTab('sources')}>
            Lead Sources
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            Stats Cards
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'columns' ? 'active' : ''}`} onClick={() => setActiveTab('columns')}>
            Table Columns
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'embed' ? 'active' : ''}`} onClick={() => setActiveTab('embed')}>
            <i className="fa-solid fa-code me-1"></i> Embed Form
          </button>
        </li>
      </ul>

      {/* Form Fields Tab */}
      {activeTab === 'fields' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h6 className="mb-0 fw-semibold">Form Fields</h6>
            <small className="text-muted">Edit labels, types, enable/disable, and set required fields.</small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{width: '70px'}}>Order</th>
                    <th>Label</th>
                    <th style={{width: '120px'}}>Type</th>
                    <th style={{width: '80px'}} className="text-center">Enabled</th>
                    <th style={{width: '80px'}} className="text-center">Required</th>
                    <th style={{width: '60px'}} className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, idx) => {
                    const isCore = CORE_FIELDS.includes(field.fieldKey);
                    return (
                      <React.Fragment key={field.fieldKey}>
                        <tr className={!field.enabled ? 'table-secondary' : ''}>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleMoveField(idx, 'up')} disabled={idx === 0}>
                                <i className="fa fa-chevron-up"></i>
                              </button>
                              <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleMoveField(idx, 'down')} disabled={idx === fields.length - 1}>
                                <i className="fa fa-chevron-down"></i>
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                style={{maxWidth: '200px'}}
                                value={field.label}
                                onChange={e => handleLabelChange(field.fieldKey, e.target.value)}
                              />
                              {field.isBuiltIn && (
                                <span className={`badge ${isCore ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary'}`}>
                                  {isCore ? 'Core' : 'Built-in'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={field.type}
                              onChange={e => handleTypeChange(field.fieldKey, e.target.value)}
                            >
                              {FIELD_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="text-center">
                            <div className="form-check form-switch d-flex justify-content-center">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={field.enabled}
                                onChange={() => handleToggleEnabled(field.fieldKey)}
                              />
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="form-check form-switch d-flex justify-content-center">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={field.required}
                                onChange={() => handleToggleRequired(field.fieldKey)}
                              />
                            </div>
                          </td>
                          <td className="text-center">
                            <button className="btn btn-link text-danger p-0" onClick={() => handleDeleteField(field)} title={isCore ? 'Delete core field' : 'Delete'}>
                              <i className="fa fa-trash-alt"></i>
                            </button>
                          </td>
                        </tr>
                        {['select', 'multiselect'].includes(field.type) && (
                          <tr className="lfs-options-row">
                            <td></td>
                            <td colSpan={5}>
                              <div className="py-1">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <i className="fa fa-list-ul text-muted small"></i>
                                  <span className="small fw-semibold text-muted">Options (one per line):</span>
                                </div>
                                <textarea
                                  className="form-control form-control-sm"
                                  style={{maxWidth: '400px', minHeight: '80px', fontFamily: 'monospace'}}
                                  value={(field.options || []).join('\n')}
                                  onChange={e => handleOptionsChange(field.fieldKey, e.target.value)}
                                  placeholder="Enter each option on a new line:&#10;Option 1&#10;Option 2&#10;Option 3"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Lead Sources Tab */}
      {activeTab === 'sources' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h6 className="mb-0 fw-semibold">Lead Sources</h6>
            <small className="text-muted">Manage source options for lead creation and tracking.</small>
          </div>
          <div className="card-body">
            {sources.length === 0 ? (
              <p className="text-muted mb-3">No sources added yet.</p>
            ) : (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {sources.map(source => (
                  <span key={source} className="lfs-source-badge">
                    {source.replace(/_/g, ' ')}
                    <button type="button" className="btn-close" style={{fontSize: '0.5rem'}} onClick={() => handleRemoveSource(source)} aria-label="Remove"></button>
                  </span>
                ))}
              </div>
            )}
            <div className="d-flex gap-2 align-items-center" style={{maxWidth: '400px'}}>
              <input
                type="text"
                className="form-control form-control-sm"
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
                placeholder="Enter new source name..."
                onKeyDown={e => e.key === 'Enter' && handleAddSource()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddSource} disabled={!newSource.trim()}>
                <i className="fa fa-plus me-1"></i>Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Tab */}
      {activeTab === 'stats' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h6 className="mb-0 fw-semibold">Stats Cards</h6>
            <small className="text-muted">Configure which stats cards appear on the All Leads page.</small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{width: '70px'}}>Order</th>
                    <th>Label</th>
                    <th style={{width: '100px'}}>Type</th>
                    <th style={{width: '80px'}} className="text-center">Enabled</th>
                    <th style={{width: '60px'}} className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {statsCards.map((card, idx) => (
                    <tr key={card.key} className={!card.enabled ? 'table-secondary' : ''} style={{borderLeft: `3px solid ${card.color || '#6b7280'}`}}>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleMoveStatsCard(idx, 'up')} disabled={idx === 0}>
                            <i className="fa fa-chevron-up"></i>
                          </button>
                          <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleMoveStatsCard(idx, 'down')} disabled={idx === statsCards.length - 1}>
                            <i className="fa fa-chevron-down"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          style={{maxWidth: '200px'}}
                          value={card.label}
                          onChange={e => handleStatsCardLabelChange(card.key, e.target.value)}
                        />
                      </td>
                      <td>
                        <span className={`badge ${card.type === 'system' ? 'bg-secondary' : card.type === 'stage' ? 'bg-info' : card.type === 'priority' ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                          {card.type}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="form-check form-switch d-flex justify-content-center">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={card.enabled}
                            onChange={() => handleToggleStatsCard(card.key)}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        {card.type === 'stage' && (
                          <button className="btn btn-link text-danger p-0" onClick={() => handleRemoveStatsCard(card.key)}>
                            <i className="fa fa-trash-alt"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {availableStages.length > 0 && (
            <div className="card-footer bg-light">
              <h6 className="small fw-semibold mb-2">Add Stage Cards</h6>
              <div className="d-flex flex-wrap gap-2">
                {availableStages.map(stage => (
                  <button
                    key={stage._id}
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleAddStageCard(stage)}
                  >
                    <i className="fa fa-plus me-1"></i> {stage.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table Columns Tab */}
      {activeTab === 'columns' && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h6 className="mb-0 fw-semibold">Table Columns</h6>
            <small className="text-muted">Configure which columns appear in the Leads table.</small>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{width: '70px'}}>Order</th>
                    <th>Label</th>
                    <th style={{width: '100px'}}>Type</th>
                    <th style={{width: '80px'}} className="text-center">Enabled</th>
                    <th style={{width: '60px'}} className="text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {tableColumns.map((col, idx) => {
                    const isFixed = col.key === 'select' || col.key === 'actions';
                    return (
                      <tr key={col.key} className={!col.enabled ? 'table-secondary' : ''}>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleMoveTableColumn(idx, 'up')} disabled={idx === 0}>
                              <i className="fa fa-chevron-up"></i>
                            </button>
                            <button className="btn btn-outline-secondary btn-sm py-0 px-1" onClick={() => handleMoveTableColumn(idx, 'down')} disabled={idx === tableColumns.length - 1}>
                              <i className="fa fa-chevron-down"></i>
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              style={{maxWidth: '200px'}}
                              value={col.label}
                              onChange={e => handleTableColumnLabelChange(col.key, e.target.value)}
                              disabled={isFixed}
                            />
                            {isFixed && <span className="badge bg-secondary">Fixed</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${col.type === 'system' ? 'bg-secondary' : 'bg-info'}`}>
                            {col.type}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="form-check form-switch d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={col.enabled}
                              onChange={() => handleToggleTableColumn(col.key)}
                              disabled={isFixed}
                            />
                          </div>
                        </td>
                        <td className="text-center">
                          {col.type === 'custom' ? (
                            <button className="btn btn-link text-danger p-0" onClick={() => handleRemoveTableColumn(col.key)}>
                              <i className="fa fa-trash-alt"></i>
                            </button>
                          ) : isFixed ? (
                            <i className="fa fa-lock text-muted"></i>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {availableCustomFields.length > 0 && (
            <div className="card-footer bg-light">
              <h6 className="small fw-semibold mb-2">Add Custom Field Columns</h6>
              <div className="d-flex flex-wrap gap-2">
                {availableCustomFields.map(field => (
                  <button
                    key={field.fieldKey}
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleAddCustomFieldColumn(field)}
                  >
                    <i className="fa fa-plus me-1"></i> {field.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Embed Form Tab */}
      {activeTab === 'embed' && (() => {
        const baseUrl = window.location.origin;
        const apiUrl = `${baseUrl}/api/v1/public/form/${tenantSlug}`;
        const enabledFields = fields.filter(f => f.enabled).sort((a, b) => a.order - b.order);
        
        const embedHtml = `<!-- Lead Capture Form - Paste this in your website -->
<div id="cb-lead-form"></div>
<script>
(function() {
  var API = '${apiUrl}';
  var container = document.getElementById('cb-lead-form');
  
  // Fetch form config
  fetch(API)
    .then(function(r) { return r.json(); })
    .then(function(config) {
      var form = document.createElement('form');
      form.id = 'cb-lead-capture';
      form.style.cssText = 'max-width:500px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
      
      // Title
      var title = document.createElement('h3');
      title.textContent = 'Get in Touch';
      title.style.cssText = 'text-align:center;margin-bottom:20px;color:#333;';
      form.appendChild(title);
      
      config.fields.forEach(function(field) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom:14px;';
        
        var label = document.createElement('label');
        label.textContent = field.label + (field.required ? ' *' : '');
        label.style.cssText = 'display:block;margin-bottom:4px;font-size:14px;font-weight:500;color:#374151;';
        wrapper.appendChild(label);
        
        var input;
        if (field.type === 'select' && field.options && field.options.length) {
          input = document.createElement('select');
          var opt = document.createElement('option');
          opt.value = '';
          opt.textContent = field.placeholder || 'Select...';
          input.appendChild(opt);
          field.options.forEach(function(o) {
            var op = document.createElement('option');
            op.value = o; op.textContent = o;
            input.appendChild(op);
          });
        } else if (field.type === 'textarea') {
          input = document.createElement('textarea');
          input.rows = 3;
        } else {
          input = document.createElement('input');
          input.type = field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type || 'text';
        }
        
        input.name = field.fieldKey;
        input.placeholder = field.placeholder || '';
        if (field.required) input.required = true;
        input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;transition:border 0.2s;';
        input.onfocus = function() { this.style.borderColor = '#4f46e5'; };
        input.onblur = function() { this.style.borderColor = '#d1d5db'; };
        wrapper.appendChild(input);
        form.appendChild(wrapper);
      });
      
      // UTM params from URL
      var params = new URLSearchParams(window.location.search);
      ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(p) {
        if (params.get(p)) {
          var h = document.createElement('input');
          h.type = 'hidden'; h.name = p; h.value = params.get(p);
          form.appendChild(h);
        }
      });
      
      // Submit button
      var btn = document.createElement('button');
      btn.type = 'submit';
      btn.textContent = 'Submit';
      btn.style.cssText = 'width:100%;padding:12px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px;transition:background 0.2s;';
      btn.onmouseover = function() { this.style.background = '#4338ca'; };
      btn.onmouseout = function() { this.style.background = '#4f46e5'; };
      form.appendChild(btn);
      
      // Message div
      var msg = document.createElement('div');
      msg.id = 'cb-form-msg';
      msg.style.cssText = 'display:none;text-align:center;padding:12px;margin-top:12px;border-radius:8px;font-size:14px;';
      form.appendChild(msg);
      
      form.onsubmit = function(e) {
        e.preventDefault();
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        var data = {};
        new FormData(form).forEach(function(v, k) { data[k] = v; });
        fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          msg.style.display = 'block';
          if (res.success) {
            msg.style.background = '#ecfdf5';
            msg.style.color = '#065f46';
            msg.textContent = res.message;
            form.reset();
          } else {
            msg.style.background = '#fef2f2';
            msg.style.color = '#991b1b';
            msg.textContent = res.error || 'Something went wrong';
          }
          btn.disabled = false;
          btn.textContent = 'Submit';
        })
        .catch(function() {
          msg.style.display = 'block';
          msg.style.background = '#fef2f2';
          msg.style.color = '#991b1b';
          msg.textContent = 'Network error. Please try again.';
          btn.disabled = false;
          btn.textContent = 'Submit';
        });
      };
      
      container.appendChild(form);
    });
})();
</script>`;

        const handleCopyEmbed = () => {
          navigator.clipboard.writeText(embedHtml);
          setEmbedCopied(true);
          setTimeout(() => setEmbedCopied(false), 2000);
        };

        return (
          <div>
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-semibold">
                  <i className="fa-solid fa-code me-2 text-primary"></i>
                  Embeddable Lead Form
                </h6>
              </div>
              <div className="card-body">
                <div className="alert alert-info mb-4">
                  <i className="fa-solid fa-circle-info me-2"></i>
                  Copy the code below and paste it into your website HTML. The form will automatically load your configured fields and submit leads directly to your CRM.
                </div>

                <h6 className="fw-semibold mb-2">API Endpoints</h6>
                <div className="mb-4">
                  <div className="bg-light rounded p-3 mb-2">
                    <small className="text-muted d-block mb-1">GET - Fetch Form Config</small>
                    <code className="text-primary">{apiUrl}</code>
                  </div>
                  <div className="bg-light rounded p-3">
                    <small className="text-muted d-block mb-1">POST - Submit Lead</small>
                    <code className="text-primary">{apiUrl}</code>
                  </div>
                </div>

                <h6 className="fw-semibold mb-2">Embed Code (HTML + JS)</h6>
                <div className="position-relative">
                  <pre className="bg-dark text-light rounded p-3" style={{maxHeight: '300px', overflow: 'auto', fontSize: '12px'}}>
                    <code>{embedHtml}</code>
                  </pre>
                  <button
                    className={`btn ${embedCopied ? 'btn-success' : 'btn-primary'} btn-sm position-absolute`}
                    style={{top: '10px', right: '10px'}}
                    onClick={handleCopyEmbed}
                  >
                    <i className={`fa-solid ${embedCopied ? 'fa-check' : 'fa-copy'} me-1`}></i>
                    {embedCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <h6 className="fw-semibold mt-4 mb-2">Fields Included in Form</h6>
                <div className="d-flex flex-wrap gap-2">
                  {enabledFields.map(f => (
                    <span key={f.fieldKey} className={`badge ${f.required ? 'bg-primary' : 'bg-secondary'}`}>
                      {f.label} {f.required ? '*' : ''}
                    </span>
                  ))}
                </div>

                <h6 className="fw-semibold mt-4 mb-2">How It Works</h6>
                <ol className="text-muted small">
                  <li className="mb-1">Customer fills the form on your website</li>
                  <li className="mb-1">Form submits to <code>{apiUrl}</code></li>
                  <li className="mb-1">Lead is automatically created in your CRM with source = "website"</li>
                  <li className="mb-1">Duplicate phone numbers are detected — existing leads get an activity log instead</li>
                  <li className="mb-1">UTM parameters (utm_source, utm_medium, etc.) are automatically captured from the URL</li>
                  <li>Rate limited to 10 submissions per minute per IP</li>
                </ol>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="lfs-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div 
            className="modal-dialog" 
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              // Allow Enter in textareas, but prevent form submission on Enter for other elements
              if (e.key === 'Enter' && e.target?.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Custom Field</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Field Label *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newField.label}
                    onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                    placeholder="e.g., City, College Name"
                    autoFocus
                  />
                </div>
                <div className="row mb-3">
                  <div className="col-8">
                    <label className="form-label small fw-semibold">Field Type *</label>
                    <select className="form-select" value={newField.type} onChange={e => setNewField(p => ({ ...p, type: e.target.value }))}>
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label small fw-semibold">Required</label>
                    <div className="form-check form-switch mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={newField.required}
                        onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Placeholder</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newField.placeholder}
                    onChange={e => setNewField(p => ({ ...p, placeholder: e.target.value }))}
                    placeholder="Placeholder text..."
                  />
                </div>
                {newField.type === 'select' && (
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Options (one per line) *</label>
                    <textarea
                      className="form-control"
                      value={newField.options}
                      onChange={e => setNewField(p => ({ ...p, options: e.target.value }))}
                      placeholder="Enter each option on a new line:&#10;Option 1&#10;Option 2&#10;Option 3"
                      style={{minHeight: '100px', fontFamily: 'monospace'}}
                    />
                    <small className="text-muted d-block mt-2">Tip: You can now use commas in option values (e.g., 'Apple, Inc.' will be treated as a single option)</small>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddCustomField}>Add Field</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFormSettings;
