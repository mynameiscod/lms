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

  // Stats cards configuration
  const [statsCards, setStatsCards] = useState<StatsCard[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [savingStats, setSavingStats] = useState(false);
  
  // Table columns configuration
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [savingColumns, setSavingColumns] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'fields' | 'sources' | 'stats' | 'columns'>('fields');
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
      
      const loadedStages = stagesRes.data || [];
      setStages(loadedStages);
      
      // Load existing stats cards or create default configuration
      let existingCards = statsRes.data || [];
      if (existingCards.length === 0) {
        // Create default stats cards if none exist
        const defaultCards: StatsCard[] = [
          { key: 'totalLeads', type: 'system', label: 'Total Leads', icon: '📋', color: '#2563eb', enabled: true, order: 0 },
          { key: 'todayFollowUps', type: 'system', label: "Follow-ups Today", icon: '🔔', color: '#ea580c', enabled: true, order: 1 },
          { key: 'priority_hot', type: 'priority', label: 'Hot Leads', icon: '🔥', color: '#dc2626', enabled: true, order: 2, priority: 'hot' },
          { key: 'priority_warm', type: 'priority', label: 'Warm Leads', icon: '☀️', color: '#d97706', enabled: true, order: 3, priority: 'warm' },
          { key: 'priority_cold', type: 'priority', label: 'Cold Leads', icon: '❄️', color: '#2563eb', enabled: true, order: 4, priority: 'cold' },
          ...loadedStages.slice(0, 6).map((stage: Stage, i: number) => ({
            key: `stage_${stage._id}`,
            type: 'stage' as const,
            label: stage.name,
            icon: '●',
            color: stage.color,
            enabled: true,
            order: 5 + i,
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
    return <div className="lead-form-settings"><div className="loading-spinner">Loading form configuration...</div></div>;
  }

  return (
    <div className="lead-form-settings">
      <div className="settings-header">
        <div>
          <h1>Lead Form Settings</h1>
          <p className="settings-subtitle">Customize form fields, lead sources, and stats cards display.</p>
        </div>
        <div className="settings-header-actions">
          {activeTab === 'fields' && (
            <>
              <button className="btn-secondary" onClick={() => setShowAddModal(true)}>+ Add Custom Field</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          {activeTab === 'stats' && (
            <button className="btn-primary" onClick={handleSaveStatsCards} disabled={savingStats}>
              {savingStats ? 'Saving...' : 'Save Stats Config'}
            </button>
          )}
          {activeTab === 'columns' && (
            <button className="btn-primary" onClick={handleSaveTableColumns} disabled={savingColumns}>
              {savingColumns ? 'Saving...' : 'Save Columns Config'}
            </button>
          )}
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button 
          className={`settings-tab ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          📝 Form Fields
        </button>
        <button 
          className={`settings-tab ${activeTab === 'sources' ? 'active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          🔗 Lead Sources
        </button>
        <button 
          className={`settings-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Stats Cards
        </button>
        <button 
          className={`settings-tab ${activeTab === 'columns' ? 'active' : ''}`}
          onClick={() => setActiveTab('columns')}
        >
          📋 Table Columns
        </button>
      </div>

      {/* Fields Configuration */}
      {activeTab === 'fields' && (
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
      )}

      {/* Sources Configuration */}
      {activeTab === 'sources' && (
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
      )}

      {/* Stats Cards Configuration */}
      {activeTab === 'stats' && (
      <div className="settings-section">
        <h2>Stats Cards Configuration</h2>
        <p className="section-desc">Configure which stats cards appear on the All Leads page. Enable/disable, reorder, and customize labels.</p>

        <div className="stats-cards-config">
          <div className="stats-cards-list">
            <div className="stats-cards-header">
              <span className="sc-col sc-order">Order</span>
              <span className="sc-col sc-icon">Icon</span>
              <span className="sc-col sc-label">Label</span>
              <span className="sc-col sc-type">Type</span>
              <span className="sc-col sc-enabled">Enabled</span>
              <span className="sc-col sc-actions">Actions</span>
            </div>
            {statsCards.map((card, idx) => (
              <div 
                className={`stats-card-row ${!card.enabled ? 'disabled-row' : ''}`} 
                key={card.key}
                style={{ borderLeft: `4px solid ${card.color || '#6b7280'}` }}
              >
                <span className="sc-col sc-order">
                  <button className="move-btn" onClick={() => handleMoveStatsCard(idx, 'up')} disabled={idx === 0}>▲</button>
                  <button className="move-btn" onClick={() => handleMoveStatsCard(idx, 'down')} disabled={idx === statsCards.length - 1}>▼</button>
                </span>
                <span className="sc-col sc-icon">
                  <span style={{ fontSize: '1.2rem' }}>{card.icon || '📊'}</span>
                </span>
                <span className="sc-col sc-label">
                  <input
                    type="text"
                    className="label-input"
                    value={card.label}
                    onChange={e => handleStatsCardLabelChange(card.key, e.target.value)}
                  />
                </span>
                <span className="sc-col sc-type">
                  <span className={`type-badge type-${card.type}`}>
                    {card.type === 'system' ? '⚙️ System' : 
                     card.type === 'stage' ? '📋 Stage' : 
                     card.type === 'priority' ? '🎯 Priority' :
                     card.type === 'source' ? '🔗 Source' : '✨ Custom'}
                  </span>
                </span>
                <span className="sc-col sc-enabled">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={card.enabled}
                      onChange={() => handleToggleStatsCard(card.key)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </span>
                <span className="sc-col sc-actions">
                  {card.type === 'stage' && (
                    <button
                      className="delete-field-btn"
                      onClick={() => handleRemoveStatsCard(card.key)}
                      title="Remove stage card"
                    >
                      🗑️
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Add Stage Cards */}
          {availableStages.length > 0 && (
            <div className="add-stage-cards">
              <h3>Add Stage Cards</h3>
              <p className="section-desc-small">Click a stage to add it as a stats card</p>
              <div className="available-stages">
                {availableStages.map(stage => (
                  <button
                    key={stage._id}
                    className="stage-add-btn"
                    onClick={() => handleAddStageCard(stage)}
                    style={{ borderColor: stage.color, color: stage.color }}
                  >
                    + {stage.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Table Columns Configuration */}
      {activeTab === 'columns' && (
      <div className="settings-section">
        <h2>Table Columns Configuration</h2>
        <p className="section-desc">Configure which columns appear in the Leads table. Enable/disable, reorder, and customize labels. You can also add custom field columns.</p>

        <div className="stats-cards-config">
          <div className="stats-cards-list">
            <div className="stats-cards-header">
              <span className="sc-col sc-order">Order</span>
              <span className="sc-col sc-label" style={{flex: 2}}>Label</span>
              <span className="sc-col sc-type">Type</span>
              <span className="sc-col sc-enabled">Enabled</span>
              <span className="sc-col sc-actions">Actions</span>
            </div>
            {tableColumns.map((col, idx) => {
              const isFixed = col.key === 'select' || col.key === 'actions';
              return (
              <div 
                className={`stats-card-row ${!col.enabled ? 'disabled-row' : ''} ${isFixed ? 'core-row' : ''}`} 
                key={col.key}
              >
                <span className="sc-col sc-order">
                  <button className="move-btn" onClick={() => handleMoveTableColumn(idx, 'up')} disabled={idx === 0}>▲</button>
                  <button className="move-btn" onClick={() => handleMoveTableColumn(idx, 'down')} disabled={idx === tableColumns.length - 1}>▼</button>
                </span>
                <span className="sc-col sc-label" style={{flex: 2}}>
                  <input
                    type="text"
                    className="label-input"
                    value={col.label}
                    onChange={e => handleTableColumnLabelChange(col.key, e.target.value)}
                    disabled={isFixed}
                  />
                  {isFixed && <span className="badge core" style={{marginLeft: 8}}>Fixed</span>}
                </span>
                <span className="sc-col sc-type">
                  <span className={`type-badge type-${col.type}`}>
                    {col.type === 'system' ? '⚙️ System' : '✨ Custom'}
                  </span>
                </span>
                <span className="sc-col sc-enabled">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={col.enabled}
                      onChange={() => handleToggleTableColumn(col.key)}
                      disabled={isFixed}
                    />
                    <span className="toggle-slider" />
                  </label>
                </span>
                <span className="sc-col sc-actions">
                  {col.type === 'custom' && (
                    <button
                      className="delete-field-btn"
                      onClick={() => handleRemoveTableColumn(col.key)}
                      title="Remove custom column"
                    >
                      🗑️
                    </button>
                  )}
                  {isFixed && <span className="core-lock" title="Fixed column">🔒</span>}
                </span>
              </div>
            )})}
          </div>

          {/* Add Custom Field Columns */}
          {availableCustomFields.length > 0 && (
            <div className="add-stage-cards">
              <h3>Add Custom Field Columns</h3>
              <p className="section-desc-small">Click a custom field to add it as a table column</p>
              <div className="available-stages">
                {availableCustomFields.map(field => (
                  <button
                    key={field.fieldKey}
                    className="stage-add-btn"
                    onClick={() => handleAddCustomFieldColumn(field)}
                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                  >
                    + {field.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

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
