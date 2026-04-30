import React, { useEffect, useState, useCallback } from 'react';
import './AICallConfig.css';

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

// ──────────────── Types ────────────────
interface AICallQuestion {
  id: string;
  text: string;
  key: string;
  order: number;
  required: boolean;
}

interface Config {
  enabled: boolean;
  exotelAccountSid: string;
  exotelApiKey: string;
  exotelApiToken: string;
  exotelVirtualNumber: string;
  exotelAppId: string;
  questions: AICallQuestion[];
  retry: {
    maxAttempts: number;
    retryGapMinutes: number;
    nextDayRetry: boolean;
    workingHoursStart: number;
    workingHoursEnd: number;
    workingDays: number[];
  };
  scoring: {
    hotThreshold: number;
    warmThreshold: number;
    assignOnScore: number;
  };
  whatsappFallback: {
    enabled: boolean;
    templateName: string;
    triggerAfterMaxAttempts: boolean;
    message: string;
  };
  llmModel: string;
}

interface Stats {
  totalCalls: number;
  answeredCalls: number;
  qualifiedLeads: number;
  answeredRate: string;
  qualifiedRate: string;
}

interface AILead {
  _id: string;
  name: string;
  phone: string;
  aiCallStatus: string;
  aiQualificationScore?: number;
  aiCategory?: string;
  aiCallAttempts: number;
  createdAt: string;
}

const BLANK_Q: AICallQuestion = { id: '', text: '', key: '', order: 0, required: false };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AICallConfigPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<AILead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'retry' | 'scoring' | 'leads'>('settings');
  const [editQIdx, setEditQIdx] = useState<number | null>(null);
  const [editQDraft, setEditQDraft] = useState<AICallQuestion>(BLANK_Q);
  const [triggeringLeadId, setTriggeringLeadId] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/ai-calls/config`, { headers: getHeaders() });
      const d = await r.json();
      if (d.success) setConfig(d.data);
      else setError(d.message || 'Failed to load config');
    } catch {
      setError('Network error loading config');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/ai-calls/stats`, { headers: getHeaders() });
      const d = await r.json();
      if (d.success) setStats(d.data);
    } catch {}
  }, []);

  const fetchLeads = useCallback(async (page = 1) => {
    try {
      const r = await fetch(`${API_BASE}/ai-calls/leads?page=${page}&limit=15`, { headers: getHeaders() });
      const d = await r.json();
      if (d.success) { setLeads(d.data.leads); setLeadsTotal(d.data.total); }
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchConfig(), fetchStats(), fetchLeads()]).finally(() => setLoading(false));
  }, [fetchConfig, fetchStats, fetchLeads]);

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const r = await fetch(`${API_BASE}/ai-calls/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });
      const d = await r.json();
      if (d.success) { setConfig(d.data); setSuccess('Configuration saved!'); fetchStats(); }
      else setError(d.message || 'Save failed');
    } catch {
      setError('Network error saving config');
    } finally {
      setSaving(false);
    }
  };

  const triggerCall = async (leadId: string) => {
    setTriggeringLeadId(leadId);
    try {
      const r = await fetch(`${API_BASE}/ai-calls/trigger/${leadId}`, { method: 'POST', headers: getHeaders() });
      const d = await r.json();
      if (d.success) { setSuccess('Call queued successfully!'); fetchLeads(leadsPage); }
      else setError(d.message || 'Failed to trigger call');
    } catch {
      setError('Network error triggering call');
    } finally {
      setTriggeringLeadId(null);
    }
  };

  const addQuestion = () => {
    const newQ: AICallQuestion = {
      id: `q_${Date.now()}`,
      text: '',
      key: '',
      order: (config?.questions.length || 0) + 1,
      required: true,
    };
    setEditQDraft(newQ);
    setEditQIdx(-1); // -1 = new
  };

  const saveQuestion = () => {
    if (!config || !editQDraft.text.trim()) return;
    const qs = [...(config.questions || [])];
    if (editQIdx === -1) {
      qs.push({ ...editQDraft, id: editQDraft.id || `q_${Date.now()}` });
    } else if (editQIdx !== null) {
      qs[editQIdx] = editQDraft;
    }
    setConfig({ ...config, questions: qs });
    setEditQIdx(null);
    setEditQDraft(BLANK_Q);
  };

  const removeQuestion = (idx: number) => {
    if (!config) return;
    const qs = config.questions.filter((_, i) => i !== idx);
    setConfig({ ...config, questions: qs });
  };

  const toggleDay = (day: number) => {
    if (!config) return;
    const days = config.retry.workingDays.includes(day)
      ? config.retry.workingDays.filter(d => d !== day)
      : [...config.retry.workingDays, day];
    setConfig({ ...config, retry: { ...config.retry, workingDays: days } });
  };

  const categoryBadge = (cat?: string) => {
    if (!cat) return null;
    const cls: Record<string, string> = { HOT: 'badge-hot', WARM: 'badge-warm', COLD: 'badge-cold', JUNK: 'badge-junk' };
    return <span className={`badge ${cls[cat] || 'bg-secondary'}`}>{cat}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-secondary',
      in_progress: 'bg-warning text-dark',
      answered: 'bg-info text-dark',
      not_answered: 'bg-danger',
      completed: 'bg-success',
      skipped: 'bg-secondary',
      failed: 'bg-danger',
    };
    return <span className={`badge ${map[status] || 'bg-secondary'}`}>{status.replace('_', ' ')}</span>;
  };

  if (loading) {
    return (
      <div className="ai-call-config-page d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  if (!config) {
    return <div className="ai-call-config-page"><div className="alert alert-danger">{error || 'Failed to load configuration'}</div></div>;
  }

  return (
    <div className="ai-call-config-page">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: '#6650d8' }}>🤖 AI Voice Lead Qualification</h4>
          <p className="text-muted small mb-0">Automatically call new leads, qualify them via AI, and score them.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="enableSwitch"
              checked={config.enabled}
              onChange={e => setConfig({ ...config, enabled: e.target.checked })}
              style={{ width: '3em', height: '1.6em' }}
            />
            <label className="form-check-label fw-semibold" htmlFor="enableSwitch">
              {config.enabled ? '✅ Enabled' : '⏸ Disabled'}
            </label>
          </div>
          <button className="btn btn-primary px-4" onClick={save} disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Save Changes
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="btn-close" onClick={() => setError('')} />{error}</div>}
      {success && <div className="alert alert-success alert-dismissible"><button type="button" className="btn-close" onClick={() => setSuccess('')} />{success}</div>}

      {/* Stats */}
      {stats && (
        <div className="row g-3 mb-3">
          {[
            { label: 'Total Calls', value: stats.totalCalls },
            { label: 'Answered', value: `${stats.answeredCalls} (${stats.answeredRate})` },
            { label: 'Qualified', value: `${stats.qualifiedLeads} (${stats.qualifiedRate})` },
          ].map(s => (
            <div className="col-6 col-md-3" key={s.label}>
              <div className="stat-box">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {(['settings', 'questions', 'retry', 'scoring', 'leads'] as const).map(tab => (
          <li className="nav-item" key={tab}>
            <button
              className={`nav-link ${activeTab === tab ? 'active fw-semibold' : ''}`}
              onClick={() => { setActiveTab(tab); if (tab === 'leads') fetchLeads(1); }}
            >
              {tab === 'settings' && '⚙️ Exotel'}
              {tab === 'questions' && '❓ Questions'}
              {tab === 'retry' && '🔄 Retry Rules'}
              {tab === 'scoring' && '📊 Scoring'}
              {tab === 'leads' && '📋 Leads'}
            </button>
          </li>
        ))}
      </ul>

      {/* ─── Exotel Settings Tab ─── */}
      {activeTab === 'settings' && (
        <div className="section-card">
          <h5>⚙️ Exotel Credentials</h5>
          <div className="row g-3">
            {[
              { label: 'Account SID', key: 'exotelAccountSid' as const, type: 'text', placeholder: 'ExotelSID' },
              { label: 'API Key', key: 'exotelApiKey' as const, type: 'text', placeholder: 'API Key' },
              { label: 'API Token', key: 'exotelApiToken' as const, type: 'password', placeholder: 'API Token' },
              { label: 'Virtual Number (ExoPhone)', key: 'exotelVirtualNumber' as const, type: 'text', placeholder: '0XXXXXXXXXX' },
              { label: 'App ID (Flow)', key: 'exotelAppId' as const, type: 'text', placeholder: 'Your Exotel App ID' },
            ].map(field => (
              <div className="col-12 col-md-6" key={field.key}>
                <label className="form-label small fw-semibold">{field.label}</label>
                <input
                  className="form-control"
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(config as any)[field.key] || ''}
                  onChange={e => setConfig({ ...config, [field.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">LLM Model</label>
              <select className="form-select" value={config.llmModel} onChange={e => setConfig({ ...config, llmModel: e.target.value })}>
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended)</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── Questions Tab ─── */}
      {activeTab === 'questions' && (
        <div className="section-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">❓ Qualification Questions</h5>
            <button className="btn btn-sm btn-primary" onClick={addQuestion}>+ Add Question</button>
          </div>

          {(config.questions || []).map((q, idx) => (
            <div className="question-row" key={q.id || idx}>
              <div className="q-order">{q.order || idx + 1}</div>
              <div className="flex-grow-1">
                <div className="fw-semibold small">{q.text || '(no text)'}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>key: {q.key || '—'} {q.required && <span className="badge bg-warning text-dark ms-1">Required</span>}</div>
              </div>
              <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditQIdx(idx); setEditQDraft({ ...q }); }}>Edit</button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => removeQuestion(idx)}>×</button>
            </div>
          ))}

          {config.questions.length === 0 && (
            <div className="text-muted text-center py-3">No questions yet. Add questions that the AI will use to qualify leads.</div>
          )}

          {/* Inline editor */}
          {editQIdx !== null && (
            <div className="mt-3 p-3 border rounded bg-light">
              <h6 className="fw-semibold mb-3">{editQIdx === -1 ? 'New Question' : 'Edit Question'}</h6>
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small">Question Text</label>
                  <input className="form-control" placeholder="e.g. What course are you interested in?" value={editQDraft.text}
                    onChange={e => setEditQDraft({ ...editQDraft, text: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Key (identifier)</label>
                  <input className="form-control" placeholder="e.g. course_interest" value={editQDraft.key}
                    onChange={e => setEditQDraft({ ...editQDraft, key: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Order</label>
                  <input className="form-control" type="number" min={1} value={editQDraft.order}
                    onChange={e => setEditQDraft({ ...editQDraft, order: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="reqCheck" checked={editQDraft.required}
                      onChange={e => setEditQDraft({ ...editQDraft, required: e.target.checked })} />
                    <label className="form-check-label small" htmlFor="reqCheck">Required</label>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-sm btn-primary" onClick={saveQuestion} disabled={!editQDraft.text.trim()}>Save Question</button>
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditQIdx(null); setEditQDraft(BLANK_Q); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Retry Rules Tab ─── */}
      {activeTab === 'retry' && (
        <div className="section-card">
          <h5>🔄 Retry Configuration</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Max Attempts</label>
              <input className="form-control" type="number" min={1} max={10} value={config.retry.maxAttempts}
                onChange={e => setConfig({ ...config, retry: { ...config.retry, maxAttempts: parseInt(e.target.value) || 1 } })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Retry Gap (minutes)</label>
              <input className="form-control" type="number" min={5} value={config.retry.retryGapMinutes}
                onChange={e => setConfig({ ...config, retry: { ...config.retry, retryGapMinutes: parseInt(e.target.value) || 30 } })} />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="nextDayCheck" checked={config.retry.nextDayRetry}
                  onChange={e => setConfig({ ...config, retry: { ...config.retry, nextDayRetry: e.target.checked } })} />
                <label className="form-check-label" htmlFor="nextDayCheck">Retry next day if no response</label>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Working Hours Start (IST, 0-23)</label>
              <input className="form-control" type="number" min={0} max={23} value={config.retry.workingHoursStart}
                onChange={e => setConfig({ ...config, retry: { ...config.retry, workingHoursStart: parseInt(e.target.value) || 9 } })} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Working Hours End (IST, 0-23)</label>
              <input className="form-control" type="number" min={0} max={23} value={config.retry.workingHoursEnd}
                onChange={e => setConfig({ ...config, retry: { ...config.retry, workingHoursEnd: parseInt(e.target.value) || 18 } })} />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold d-block">Working Days</label>
              <div className="working-days d-flex flex-wrap gap-2">
                {DAYS.map((day, i) => (
                  <div key={i} className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" id={`day_${i}`}
                      checked={config.retry.workingDays.includes(i)}
                      onChange={() => toggleDay(i)} />
                    <label className="form-check-label" htmlFor={`day_${i}`}>{day}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h5 className="mt-4">💬 WhatsApp Fallback</h5>
          <div className="row g-3">
            <div className="col-12">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" id="waBallback"
                  checked={config.whatsappFallback.enabled}
                  onChange={e => setConfig({ ...config, whatsappFallback: { ...config.whatsappFallback, enabled: e.target.checked } })} />
                <label className="form-check-label" htmlFor="waBallback">Send WhatsApp after max call attempts</label>
              </div>
            </div>
            {config.whatsappFallback.enabled && (
              <>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Template Name</label>
                  <input className="form-control" placeholder="e.g. lead_qualification_followup" value={config.whatsappFallback.templateName}
                    onChange={e => setConfig({ ...config, whatsappFallback: { ...config.whatsappFallback, templateName: e.target.value } })} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Fallback Message</label>
                  <textarea className="form-control" rows={3} placeholder="Hi {name}, we tried calling you..."
                    value={config.whatsappFallback.message}
                    onChange={e => setConfig({ ...config, whatsappFallback: { ...config.whatsappFallback, message: e.target.value } })} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Scoring Tab ─── */}
      {activeTab === 'scoring' && (
        <div className="section-card">
          <h5>📊 Lead Scoring Thresholds</h5>
          <p className="text-muted small">AI scores leads 0-100 based on call transcripts. Configure category thresholds below.</p>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">🔥 HOT threshold (min score)</label>
              <input className="form-control" type="number" min={0} max={100} value={config.scoring.hotThreshold}
                onChange={e => setConfig({ ...config, scoring: { ...config.scoring, hotThreshold: parseInt(e.target.value) || 75 } })} />
              <div className="form-text">Score ≥ this → HOT</div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">🌡️ WARM threshold (min score)</label>
              <input className="form-control" type="number" min={0} max={100} value={config.scoring.warmThreshold}
                onChange={e => setConfig({ ...config, scoring: { ...config.scoring, warmThreshold: parseInt(e.target.value) || 40 } })} />
              <div className="form-text">Score ≥ this (but below HOT) → WARM</div>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">🎯 Auto-assign threshold</label>
              <input className="form-control" type="number" min={0} max={100} value={config.scoring.assignOnScore}
                onChange={e => setConfig({ ...config, scoring: { ...config.scoring, assignOnScore: parseInt(e.target.value) || 40 } })} />
              <div className="form-text">Score ≥ this → auto-assign to counselor</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-light rounded border small">
            <strong>Category Map:</strong> Score ≥ {config.scoring.hotThreshold} → <span className="badge badge-hot">HOT</span> &nbsp;
            Score ≥ {config.scoring.warmThreshold} → <span className="badge badge-warm">WARM</span> &nbsp;
            Score &lt; {config.scoring.warmThreshold} → <span className="badge badge-cold">COLD</span> &nbsp;
            Not interested / invalid → <span className="badge badge-junk">JUNK</span>
          </div>
        </div>
      )}

      {/* ─── Leads Tab ─── */}
      {activeTab === 'leads' && (
        <div className="section-card">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">📋 Leads with AI Call Data</h5>
            <span className="text-muted small">{leadsTotal} total</span>
          </div>
          <div className="table-responsive">
            <table className="table leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Category</th>
                  <th>Attempts</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No AI call leads yet.</td></tr>
                )}
                {leads.map(lead => (
                  <tr key={lead._id}>
                    <td className="fw-semibold">{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td>{statusBadge(lead.aiCallStatus)}</td>
                    <td>{lead.aiQualificationScore !== undefined ? lead.aiQualificationScore : '—'}</td>
                    <td>{categoryBadge(lead.aiCategory)}</td>
                    <td>{lead.aiCallAttempts}</td>
                    <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-xs btn-outline-primary"
                        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                        disabled={triggeringLeadId === lead._id}
                        onClick={() => triggerCall(lead._id)}
                      >
                        {triggeringLeadId === lead._id
                          ? <span className="spinner-border spinner-border-sm" />
                          : '📞 Call'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {leadsTotal > 15 && (
            <div className="d-flex justify-content-center gap-2 mt-3">
              <button className="btn btn-sm btn-outline-secondary" disabled={leadsPage === 1}
                onClick={() => { const p = leadsPage - 1; setLeadsPage(p); fetchLeads(p); }}>← Prev</button>
              <span className="small align-self-center">Page {leadsPage} of {Math.ceil(leadsTotal / 15)}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={leadsPage * 15 >= leadsTotal}
                onClick={() => { const p = leadsPage + 1; setLeadsPage(p); fetchLeads(p); }}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Save footer */}
      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-primary px-5" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
