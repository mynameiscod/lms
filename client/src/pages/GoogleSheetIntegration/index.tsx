import React, { useState, useEffect, useCallback } from 'react';
import { googleSheetApi } from '../../api';
import './GoogleSheetIntegration.css';

interface ColumnMapping {
  sheetColumn: string;
  leadField: string;
}

interface SyncLog {
  syncedAt: string;
  rowsSynced: number;
  newLeads: number;
  duplicatesSkipped: number;
  errors: number;
  errorDetails?: string[];
}

interface Integration {
  _id: string;
  name: string;
  sheetId: string;
  sheetUrl: string;
  sheetName: string;
  columnMapping: ColumnMapping[];
  headerRow: number;
  lastSyncedRow: number;
  syncInterval: number;
  isActive: boolean;
  defaultSource: string;
  defaultPriority: 'hot' | 'warm' | 'cold';
  defaultStageId?: any;
  assignToUserId?: any;
  createdBy?: any;
  syncLogs: SyncLog[];
  lastSyncAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const LEAD_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'courseInterest', label: 'Course Interest' },
  { value: 'source', label: 'Source' },
];

const GoogleSheetIntegration: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSheetUrl, setFormSheetUrl] = useState('');
  const [formSheetName, setFormSheetName] = useState('Sheet1');
  const [formSyncInterval, setFormSyncInterval] = useState(10);
  const [formPriority, setFormPriority] = useState<'hot' | 'warm' | 'cold'>('warm');
  const [formSource, setFormSource] = useState('google_sheet');

  // Headers & mapping
  const [fetchingHeaders, setFetchingHeaders] = useState(false);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [saving, setSaving] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await googleSheetApi.getIntegrations();
      setIntegrations(res.data || []);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const resetForm = () => {
    setFormName('');
    setFormSheetUrl('');
    setFormSheetName('Sheet1');
    setFormSyncInterval(10);
    setFormPriority('warm');
    setFormSource('google_sheet');
    setSheetHeaders([]);
    setColumnMapping([]);
    setEditingId(null);
  };

  const handleFetchHeaders = async () => {
    if (!formSheetUrl) {
      showAlert('error', 'Please enter a Google Sheet URL');
      return;
    }
    try {
      setFetchingHeaders(true);
      const res = await googleSheetApi.fetchHeaders(formSheetUrl, formSheetName);
      const headers = res.data.headers || [];
      setSheetHeaders(headers);

      // Auto-map obvious columns
      const autoMapping: ColumnMapping[] = [];
      for (const header of headers) {
        const lower = header.toLowerCase().trim();
        if (lower.includes('name') && !lower.includes('course')) {
          autoMapping.push({ sheetColumn: header, leadField: 'name' });
        } else if (lower.includes('email') || lower.includes('mail')) {
          autoMapping.push({ sheetColumn: header, leadField: 'email' });
        } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) {
          autoMapping.push({ sheetColumn: header, leadField: 'phone' });
        } else if (lower.includes('course') || lower.includes('program') || lower.includes('interest')) {
          autoMapping.push({ sheetColumn: header, leadField: 'courseInterest' });
        } else if (lower.includes('source') || lower.includes('platform')) {
          autoMapping.push({ sheetColumn: header, leadField: 'source' });
        }
      }
      setColumnMapping(autoMapping.length > 0 ? autoMapping : headers.map(h => ({ sheetColumn: h, leadField: '' })));

      showAlert('success', `Found ${headers.length} columns in the sheet`);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to fetch headers. Make sure the sheet is shared publicly.');
    } finally {
      setFetchingHeaders(false);
    }
  };

  const updateMapping = (index: number, leadField: string) => {
    const updated = [...columnMapping];
    updated[index] = { ...updated[index], leadField };
    setColumnMapping(updated);
  };

  const addMappingRow = (header: string) => {
    if (!columnMapping.find(m => m.sheetColumn === header)) {
      setColumnMapping([...columnMapping, { sheetColumn: header, leadField: '' }]);
    }
  };

  const removeMappingRow = (index: number) => {
    setColumnMapping(columnMapping.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showAlert('error', 'Please enter a name for this integration');
      return;
    }
    if (!formSheetUrl.trim()) {
      showAlert('error', 'Please enter a Google Sheet URL');
      return;
    }

    const validMappings = columnMapping.filter(m => m.leadField);
    if (validMappings.length === 0) {
      showAlert('error', 'Please map at least one column to a lead field');
      return;
    }

    // Check that name and phone are mapped
    const hasName = validMappings.some(m => m.leadField === 'name');
    const hasPhone = validMappings.some(m => m.leadField === 'phone');
    if (!hasName || !hasPhone) {
      showAlert('error', 'Name and Phone columns must be mapped');
      return;
    }

    try {
      setSaving(true);
      const data = {
        name: formName,
        sheetUrl: formSheetUrl,
        sheetName: formSheetName,
        columnMapping: validMappings,
        syncInterval: formSyncInterval,
        defaultPriority: formPriority,
        defaultSource: formSource,
      };

      if (editingId) {
        await googleSheetApi.updateIntegration(editingId, data);
        showAlert('success', 'Integration updated successfully');
      } else {
        await googleSheetApi.createIntegration(data);
        showAlert('success', 'Integration created successfully');
      }

      resetForm();
      setShowForm(false);
      loadIntegrations();
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (integration: Integration) => {
    setEditingId(integration._id);
    setFormName(integration.name);
    setFormSheetUrl(integration.sheetUrl);
    setFormSheetName(integration.sheetName);
    setFormSyncInterval(integration.syncInterval);
    setFormPriority(integration.defaultPriority);
    setFormSource(integration.defaultSource);
    setColumnMapping(integration.columnMapping);
    setSheetHeaders(integration.columnMapping.map(m => m.sheetColumn));
    setShowForm(true);
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      await googleSheetApi.updateIntegration(integration._id, { isActive: !integration.isActive });
      showAlert('success', `Integration ${integration.isActive ? 'paused' : 'activated'}`);
      loadIntegrations();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleSync = async (id: string) => {
    try {
      setSyncing(id);
      const res = await googleSheetApi.triggerSync(id);
      showAlert('success', res.message || 'Sync completed');
      loadIntegrations();
    } catch (err: any) {
      showAlert('error', err.message || 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete integration "${name}"? This won't delete imported leads.`)) return;
    try {
      await googleSheetApi.deleteIntegration(id);
      showAlert('success', 'Integration deleted');
      loadIntegrations();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const handleResetSync = async (id: string) => {
    if (!window.confirm('Reset sync position? Next sync will re-process all rows (duplicates will be skipped).')) return;
    try {
      await googleSheetApi.resetSync(id);
      showAlert('success', 'Sync position reset');
      loadIntegrations();
    } catch (err: any) {
      showAlert('error', err.message);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="gsheet-page">
        <div className="gsheet-loading">
          <i className="fa-solid fa-spinner fa-spin"></i> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="gsheet-page">
      {alert && (
        <div className={`gsheet-alert gsheet-alert-${alert.type}`}>
          <i className={`fa-solid ${alert.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {alert.message}
          <button className="gsheet-alert-close" onClick={() => setAlert(null)}>×</button>
        </div>
      )}

      <div className="gsheet-header">
        <div>
          <h1><i className="fa-solid fa-table"></i> Google Sheets Integration</h1>
          <p className="gsheet-subtitle">Import leads automatically from Google Sheets</p>
        </div>
        {!showForm && (
          <button className="gsheet-btn gsheet-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <i className="fa-solid fa-plus"></i> Add Sheet
          </button>
        )}
      </div>

      {showForm && (
        <div className="gsheet-form-card">
          <div className="gsheet-form-header">
            <h2>{editingId ? 'Edit Integration' : 'New Google Sheet Integration'}</h2>
            <button className="gsheet-btn gsheet-btn-ghost" onClick={() => { resetForm(); setShowForm(false); }}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>

          <div className="gsheet-form-body">
            <div className="gsheet-form-section">
              <h3>Sheet Details</h3>
              <div className="gsheet-form-grid">
                <div className="gsheet-form-group">
                  <label>Integration Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Facebook Lead Sheet" />
                </div>
                <div className="gsheet-form-group">
                  <label>Sheet Tab Name</label>
                  <input type="text" value={formSheetName} onChange={e => setFormSheetName(e.target.value)} placeholder="Sheet1" />
                </div>
              </div>
              <div className="gsheet-form-group">
                <label>Google Sheet URL *</label>
                <div className="gsheet-url-row">
                  <input type="url" value={formSheetUrl} onChange={e => setFormSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                  <button className="gsheet-btn gsheet-btn-secondary" onClick={handleFetchHeaders} disabled={fetchingHeaders}>
                    {fetchingHeaders ? <><i className="fa-solid fa-spinner fa-spin"></i> Fetching...</> : <><i className="fa-solid fa-download"></i> Fetch Columns</>}
                  </button>
                </div>
                <small className="gsheet-hint">
                  <i className="fa-solid fa-info-circle"></i> Sheet must be shared as "Anyone with the link can view"
                </small>
              </div>
            </div>

            {(sheetHeaders.length > 0 || columnMapping.length > 0) && (
              <div className="gsheet-form-section">
                <h3>Column Mapping</h3>
                <p className="gsheet-hint">Map Google Sheet columns to lead fields. Name and Phone are required.</p>

                <div className="gsheet-mapping-table">
                  <div className="gsheet-mapping-header">
                    <span>Sheet Column</span>
                    <span>Lead Field</span>
                    <span></span>
                  </div>
                  {columnMapping.map((mapping, idx) => (
                    <div className="gsheet-mapping-row" key={idx}>
                      <span className="gsheet-mapping-col">{mapping.sheetColumn}</span>
                      <select value={mapping.leadField} onChange={e => updateMapping(idx, e.target.value)}>
                        <option value="">-- Skip --</option>
                        {LEAD_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                        <option value="custom">Custom Field</option>
                      </select>
                      <button className="gsheet-btn-icon" onClick={() => removeMappingRow(idx)} title="Remove">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {sheetHeaders.filter(h => !columnMapping.find(m => m.sheetColumn === h)).length > 0 && (
                  <div className="gsheet-unmapped">
                    <small>Unmapped columns:</small>
                    {sheetHeaders.filter(h => !columnMapping.find(m => m.sheetColumn === h)).map(h => (
                      <button key={h} className="gsheet-chip" onClick={() => addMappingRow(h)}>
                        <i className="fa-solid fa-plus"></i> {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="gsheet-form-section">
              <h3>Sync Settings</h3>
              <div className="gsheet-form-grid gsheet-form-grid-3">
                <div className="gsheet-form-group">
                  <label>Sync Interval (minutes)</label>
                  <input type="number" min={1} max={1440} value={formSyncInterval} onChange={e => setFormSyncInterval(Number(e.target.value))} />
                </div>
                <div className="gsheet-form-group">
                  <label>Default Priority</label>
                  <select value={formPriority} onChange={e => setFormPriority(e.target.value as any)}>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🌡️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>
                <div className="gsheet-form-group">
                  <label>Lead Source Label</label>
                  <input type="text" value={formSource} onChange={e => setFormSource(e.target.value)} placeholder="google_sheet" />
                </div>
              </div>
            </div>
          </div>

          <div className="gsheet-form-footer">
            <button className="gsheet-btn gsheet-btn-ghost" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
            <button className="gsheet-btn gsheet-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-save"></i> {editingId ? 'Update' : 'Create'} Integration</>}
            </button>
          </div>
        </div>
      )}

      {integrations.length === 0 && !showForm ? (
        <div className="gsheet-empty">
          <i className="fa-solid fa-table fa-3x"></i>
          <h3>No Google Sheet Integrations</h3>
          <p>Connect a Google Sheet to automatically import leads into your CRM.</p>
          <button className="gsheet-btn gsheet-btn-primary" onClick={() => setShowForm(true)}>
            <i className="fa-solid fa-plus"></i> Add Your First Sheet
          </button>
        </div>
      ) : (
        <div className="gsheet-list">
          {integrations.map(integration => (
            <div key={integration._id} className={`gsheet-card ${!integration.isActive ? 'gsheet-card-inactive' : ''}`}>
              <div className="gsheet-card-header">
                <div className="gsheet-card-title">
                  <h3>
                    <i className={`fa-solid fa-circle gsheet-status-dot ${integration.isActive ? 'gsheet-status-active' : 'gsheet-status-paused'}`}></i>
                    {integration.name}
                  </h3>
                  <span className="gsheet-card-badge">{integration.isActive ? 'Active' : 'Paused'}</span>
                </div>
                <div className="gsheet-card-actions">
                  <button className="gsheet-btn gsheet-btn-sm gsheet-btn-success" onClick={() => handleSync(integration._id)} disabled={syncing === integration._id} title="Sync Now">
                    {syncing === integration._id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-sync"></i>}
                  </button>
                  <button className="gsheet-btn gsheet-btn-sm gsheet-btn-secondary" onClick={() => handleEdit(integration)} title="Edit">
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button className="gsheet-btn gsheet-btn-sm" onClick={() => handleToggleActive(integration)} title={integration.isActive ? 'Pause' : 'Activate'}>
                    <i className={`fa-solid ${integration.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                  <button className="gsheet-btn gsheet-btn-sm gsheet-btn-danger" onClick={() => handleDelete(integration._id, integration.name)} title="Delete">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="gsheet-card-body">
                <div className="gsheet-card-info">
                  <div className="gsheet-info-item">
                    <span className="gsheet-info-label">Sheet URL</span>
                    <a href={integration.sheetUrl} target="_blank" rel="noopener noreferrer" className="gsheet-link">
                      <i className="fa-solid fa-external-link"></i> Open Sheet
                    </a>
                  </div>
                  <div className="gsheet-info-item">
                    <span className="gsheet-info-label">Tab</span>
                    <span>{integration.sheetName}</span>
                  </div>
                  <div className="gsheet-info-item">
                    <span className="gsheet-info-label">Sync Every</span>
                    <span>{integration.syncInterval} min</span>
                  </div>
                  <div className="gsheet-info-item">
                    <span className="gsheet-info-label">Rows Synced</span>
                    <span>{integration.lastSyncedRow}</span>
                  </div>
                  <div className="gsheet-info-item">
                    <span className="gsheet-info-label">Last Sync</span>
                    <span>{formatDate(integration.lastSyncAt)}</span>
                  </div>
                  <div className="gsheet-info-item">
                    <span className="gsheet-info-label">Priority</span>
                    <span>{integration.defaultPriority === 'hot' ? '🔥' : integration.defaultPriority === 'warm' ? '🌡️' : '❄️'} {integration.defaultPriority}</span>
                  </div>
                </div>

                <div className="gsheet-mapping-preview">
                  <span className="gsheet-info-label">Column Mapping:</span>
                  <div className="gsheet-mapping-chips">
                    {integration.columnMapping.map((m, i) => (
                      <span key={i} className="gsheet-mapping-chip">
                        {m.sheetColumn} → {LEAD_FIELDS.find(f => f.value === m.leadField)?.label || m.leadField}
                      </span>
                    ))}
                  </div>
                </div>

                {integration.lastError && (
                  <div className="gsheet-error-banner">
                    <i className="fa-solid fa-exclamation-triangle"></i> {integration.lastError}
                  </div>
                )}

                {integration.syncLogs.length > 0 && (
                  <div className="gsheet-logs-section">
                    <button className="gsheet-btn gsheet-btn-ghost gsheet-btn-sm" onClick={() => setExpandedLogs(expandedLogs === integration._id ? null : integration._id)}>
                      <i className={`fa-solid fa-chevron-${expandedLogs === integration._id ? 'up' : 'down'}`}></i> Sync History ({integration.syncLogs.length})
                    </button>

                    {expandedLogs === integration._id && (
                      <div className="gsheet-logs-list">
                        <button className="gsheet-btn gsheet-btn-ghost gsheet-btn-sm" onClick={() => handleResetSync(integration._id)} style={{ marginBottom: '0.5rem' }}>
                          <i className="fa-solid fa-rotate-left"></i> Reset Sync Position
                        </button>
                        {integration.syncLogs.slice().reverse().slice(0, 10).map((log, i) => (
                          <div key={i} className="gsheet-log-entry">
                            <span className="gsheet-log-date">{formatDate(log.syncedAt)}</span>
                            <span className="gsheet-log-stat gsheet-log-new">+{log.newLeads} new</span>
                            <span className="gsheet-log-stat gsheet-log-dup">{log.duplicatesSkipped} dup</span>
                            {log.errors > 0 && <span className="gsheet-log-stat gsheet-log-err">{log.errors} err</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoogleSheetIntegration;
