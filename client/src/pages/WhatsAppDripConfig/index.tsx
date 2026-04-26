import React, { useEffect, useState, useCallback } from 'react';

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

interface DripMessage { daysAfter: number; message: string; enabled: boolean; }
interface DripSequence { stageName: string; messages: DripMessage[]; enabled: boolean; }
interface DripConfig { sequences: DripSequence[]; isActive: boolean; isDefault?: boolean; }

const EMPTY_MSG: DripMessage = { daysAfter: 1, message: '', enabled: true };

export default function WhatsAppDripConfig() {
  const [config, setConfig] = useState<DripConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeStage, setActiveStage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/whatsapp-drip-config`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setConfig(data.data);
      else setError(data.message || 'Failed to load');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/whatsapp-drip-config`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) { setConfig(data.data); setSuccess('Drip configuration saved!'); setTimeout(() => setSuccess(''), 3000); }
      else setError(data.message || 'Save failed');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const resetDefaults = async () => {
    if (!window.confirm('Reset to default drip templates? This will overwrite your current config.')) return;
    setResetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/whatsapp-drip-config/reset`, { method: 'POST', headers: getHeaders() });
      const data = await res.json();
      if (data.success) { setConfig(data.data); setSuccess('Reset to defaults!'); }
      else setError(data.message);
    } catch (e: any) { setError(e.message); }
    finally { setResetLoading(false); }
  };

  const updateSeq = (sIdx: number, field: keyof DripSequence, value: any) => {
    if (!config) return;
    const seqs = [...config.sequences];
    (seqs[sIdx] as any)[field] = value;
    setConfig({ ...config, sequences: seqs });
  };

  const updateMsg = (sIdx: number, mIdx: number, field: keyof DripMessage, value: any) => {
    if (!config) return;
    const seqs = [...config.sequences];
    const msgs = [...seqs[sIdx].messages];
    (msgs[mIdx] as any)[field] = field === 'daysAfter' ? parseInt(value) || 0 : value;
    seqs[sIdx] = { ...seqs[sIdx], messages: msgs };
    setConfig({ ...config, sequences: seqs });
  };

  const addMsg = (sIdx: number) => {
    if (!config) return;
    const seqs = [...config.sequences];
    seqs[sIdx] = { ...seqs[sIdx], messages: [...seqs[sIdx].messages, { ...EMPTY_MSG }] };
    setConfig({ ...config, sequences: seqs });
  };

  const removeMsg = (sIdx: number, mIdx: number) => {
    if (!config) return;
    const seqs = [...config.sequences];
    seqs[sIdx] = { ...seqs[sIdx], messages: seqs[sIdx].messages.filter((_, i) => i !== mIdx) };
    setConfig({ ...config, sequences: seqs });
  };

  const addStage = () => {
    if (!config) return;
    const name = prompt('Enter stage name:');
    if (!name?.trim()) return;
    setConfig({ ...config, sequences: [...config.sequences, { stageName: name.trim(), messages: [], enabled: true }] });
    setActiveStage(config.sequences.length);
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}><div className="spinner-border text-primary" /></div>;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1"><i className="fab fa-whatsapp text-success me-2" />WhatsApp Drip Campaigns</h2>
          <p className="text-muted mb-0">Configure automated follow-up messages sent to leads at each stage</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={resetDefaults} disabled={resetLoading}>
            {resetLoading ? <span className="spinner-border spinner-border-sm" /> : <><i className="fas fa-undo me-1" />Reset Defaults</>}
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : <><i className="fas fa-save me-2" />Save</>}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {config?.isDefault && <div className="alert alert-info"><i className="fas fa-info-circle me-2" />Showing default templates. Save to persist custom configuration.</div>}

      {config && (
        <div className="row g-3">
          {/* Stage Tabs */}
          <div className="col-md-3">
            <div className="list-group">
              {config.sequences.map((seq, i) => (
                <button
                  key={i}
                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${activeStage === i ? 'active' : ''}`}
                  onClick={() => setActiveStage(i)}
                >
                  <span className={!seq.enabled ? 'text-muted' : ''}>{seq.stageName}</span>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary">{seq.messages.filter((m) => m.enabled).length}</span>
                    <div className="form-check form-switch mb-0" onClick={(e) => e.stopPropagation()}>
                      <input className="form-check-input" type="checkbox" checked={seq.enabled} onChange={() => updateSeq(i, 'enabled', !seq.enabled)} />
                    </div>
                  </div>
                </button>
              ))}
              <button className="list-group-item list-group-item-action text-primary text-center" onClick={addStage}>
                <i className="fas fa-plus me-1" />Add Stage
              </button>
            </div>
          </div>

          {/* Message Editor */}
          <div className="col-md-9">
            {config.sequences[activeStage] && (
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <strong>Messages for: <span className="text-primary">{config.sequences[activeStage].stageName}</span></strong>
                  <button className="btn btn-sm btn-success" onClick={() => addMsg(activeStage)}><i className="fas fa-plus me-1" />Add Message</button>
                </div>
                <div className="card-body">
                  {config.sequences[activeStage].messages.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <i className="fas fa-comment-slash fa-2x mb-2 opacity-25" />
                      <p className="mb-0">No messages configured for this stage.</p>
                    </div>
                  ) : (
                    config.sequences[activeStage].messages.map((msg, mIdx) => (
                      <div key={mIdx} className={`card mb-3 ${!msg.enabled ? 'opacity-50' : ''}`}>
                        <div className="card-body">
                          <div className="row g-2 align-items-center mb-2">
                            <div className="col-auto">
                              <label className="form-label mb-0 small fw-semibold">Days After Stage Entry</label>
                              <input type="number" className="form-control form-control-sm" style={{ width: 80 }} min={0} max={90} value={msg.daysAfter} onChange={(e) => updateMsg(activeStage, mIdx, 'daysAfter', e.target.value)} />
                            </div>
                            <div className="col d-flex align-items-end gap-2 justify-content-end">
                              <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" checked={msg.enabled} onChange={() => updateMsg(activeStage, mIdx, 'enabled', !msg.enabled)} />
                                <label className="form-check-label small">Active</label>
                              </div>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => removeMsg(activeStage, mIdx)}><i className="fas fa-trash" /></button>
                            </div>
                          </div>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={msg.message}
                            onChange={(e) => updateMsg(activeStage, mIdx, 'message', e.target.value)}
                            placeholder={`Message sent D+${msg.daysAfter} after entering ${config.sequences[activeStage].stageName}. Supports {{name}}.`}
                          />
                          <small className="text-muted">Supports <code>{'{{name}}'}</code> placeholder • {msg.message.length} chars</small>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
