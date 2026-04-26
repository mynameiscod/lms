import React, { useState, useEffect, useCallback } from 'react';
import { leadSourceConfigApi } from '../../api/index';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AutoActions {
  sendWhatsAppWelcome: boolean;
  whatsAppWelcomeTemplate: string;
  defaultPriority: 'hot' | 'warm' | 'cold';
  autoAssign: boolean;
  notifyAdminOnNewLead: boolean;
}

interface SourceStats {
  lastLeadAt: string | null;
  leadsThisMonth: number;
  leadsTotal: number;
}

interface SourceCard {
  isConnected: boolean;
  config: Record<string, any>;
  autoActions: AutoActions;
  stats: SourceStats;
}

interface SourceConfig {
  _id?: string;
  metaAds: SourceCard;
  whatsApp: SourceCard;
  websiteForm: SourceCard;
  googleSheet: SourceCard;
  walkin: SourceCard;
  referral: SourceCard;
  googleAds: SourceCard;
  thirdParty: Array<{
    _id?: string;
    name: string;
    apiKey: string;
    webhookUrl?: string;
    fieldMapping: Record<string, string>;
    isActive: boolean;
    stats: SourceStats;
  }>;
}

type SourceKey = 'metaAds' | 'whatsApp' | 'websiteForm' | 'googleSheet' | 'walkin' | 'referral' | 'googleAds';

// ─── Source metadata (static) ────────────────────────────────────────────────

const SOURCE_META: Record<SourceKey, {
  label: string;
  icon: string;
  color: string;
  description: string;
  alwaysActive?: boolean;
}> = {
  metaAds: {
    label: 'Meta Lead Ads',
    icon: 'fa-brands fa-meta',
    color: '#1877f2',
    description: 'Capture leads directly from Facebook & Instagram ad forms',
  },
  whatsApp: {
    label: 'WhatsApp',
    icon: 'fa-brands fa-whatsapp',
    color: '#25d366',
    description: 'Auto-qualify leads who message your WhatsApp business number',
  },
  websiteForm: {
    label: 'Website Form',
    icon: 'fa-solid fa-globe',
    color: '#6366f1',
    description: 'Embed a lead capture form on your website or landing page',
  },
  googleSheet: {
    label: 'Google Sheets',
    icon: 'fa-solid fa-table',
    color: '#34a853',
    description: 'Import leads from Google Sheets via the Google Sheets integration',
  },
  walkin: {
    label: 'Walk-in',
    icon: 'fa-solid fa-person-walking',
    color: '#f59e0b',
    description: 'Students who visit your campus / office directly',
    alwaysActive: true,
  },
  referral: {
    label: 'Referral',
    icon: 'fa-solid fa-share-nodes',
    color: '#ec4899',
    description: 'Word-of-mouth referrals from existing students or staff',
    alwaysActive: true,
  },
  googleAds: {
    label: 'Google Ads',
    icon: 'fa-brands fa-google',
    color: '#ea4335',
    description: 'Capture leads via UTM parameters from Google Ads campaigns',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'No leads yet';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function copyToClipboard(text: string, setCopied: (v: string) => void, key: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  });
}

// ─── Configure Modal ─────────────────────────────────────────────────────────

interface ConfigModalProps {
  sourceKey: SourceKey;
  sourceData: SourceCard;
  onClose: () => void;
  onSave: (sourceKey: SourceKey, isConnected: boolean, config: any, autoActions: AutoActions) => Promise<void>;
  onTest: (sourceKey: SourceKey) => Promise<void>;
  saving: boolean;
  testing: boolean;
  testResult: { success: boolean; message: string } | null;
  copied: string;
  setCopied: (v: string) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  sourceKey, sourceData, onClose, onSave, onTest, saving, testing, testResult, copied, setCopied
}) => {
  const meta = SOURCE_META[sourceKey];
  const [isConnected, setIsConnected] = useState(sourceData.isConnected);
  const [config, setConfig] = useState<Record<string, any>>(sourceData.config || {});
  const [autoActions, setAutoActions] = useState<AutoActions>(sourceData.autoActions || {
    sendWhatsAppWelcome: false,
    whatsAppWelcomeTemplate: 'Hi {{name}}, thanks for your interest! Our team will contact you shortly.',
    defaultPriority: 'warm',
    autoAssign: true,
    notifyAdminOnNewLead: false,
  });

  const handleSave = () => onSave(sourceKey, isConnected, config, autoActions);

  return (
    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header" style={{ borderBottom: '2px solid #f0f0f0' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44, background: meta.color + '15' }}>
                <i className={`${meta.icon} fs-5`} style={{ color: meta.color }}></i>
              </div>
              <div>
                <h5 className="mb-0 fw-semibold">Configure {meta.label}</h5>
                <small className="text-muted">{meta.description}</small>
              </div>
            </div>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {/* Connection Toggle */}
            {!meta.alwaysActive && (
              <div className="d-flex align-items-center justify-content-between p-3 rounded mb-4"
                style={{ background: isConnected ? '#f0fdf4' : '#fff7ed', border: `1px solid ${isConnected ? '#bbf7d0' : '#fed7aa'}` }}>
                <div>
                  <div className="fw-semibold">{isConnected ? '✅ Source Active' : '⚠️ Source Inactive'}</div>
                  <small className="text-muted">
                    {isConnected ? 'Leads from this source will be captured automatically' : 'Enable this source to start capturing leads'}
                  </small>
                </div>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={isConnected} onChange={e => setIsConnected(e.target.checked)}
                    style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }} />
                </div>
              </div>
            )}

            {/* Source-specific config fields */}
            {sourceKey === 'metaAds' && (
              <FieldGroup title="Meta API Credentials" icon="fa-solid fa-key">
                <TextField label="Page Access Token" field="pageAccessToken"
                  value={config.pageAccessToken || ''} onChange={v => setConfig(c => ({ ...c, pageAccessToken: v }))}
                  type="password" placeholder="EAAxxxxxxxxxx..." hint="Get this from Meta Business Suite → WhatsApp → API Setup" />
                <TextField label="Facebook Page ID" field="pageId"
                  value={config.pageId || ''} onChange={v => setConfig(c => ({ ...c, pageId: v }))}
                  placeholder="123456789012345" hint="Found in your Facebook Page URL or Settings" />
                <TextField label="Ad Account ID (Optional)" field="adAccountId"
                  value={config.adAccountId || ''} onChange={v => setConfig(c => ({ ...c, adAccountId: v }))}
                  placeholder="act_123456789" hint="Optional: Used to pull campaign cost data" />
                <ReadonlyField label="Webhook URL (paste in Meta Developer Console)"
                  value={config.webhookUrl || 'Save to generate'} field="metaWebhook" copied={copied} setCopied={setCopied} />
                <ReadonlyField label="Verify Token (use in Meta Developer Console)"
                  value={config.verifyToken || 'codebegun_verify'} field="metaVerify" copied={copied} setCopied={setCopied} />
              </FieldGroup>
            )}

            {sourceKey === 'whatsApp' && (
              <FieldGroup title="WhatsApp Cloud API Credentials" icon="fa-solid fa-key">
                <TextField label="Access Token" field="accessToken"
                  value={config.accessToken || ''} onChange={v => setConfig(c => ({ ...c, accessToken: v }))}
                  type="password" placeholder="EAAxxxxxxxxxx..." hint="Get from Meta Developer Console → WhatsApp → API Setup" />
                <TextField label="Phone Number ID" field="phoneNumberId"
                  value={config.phoneNumberId || ''} onChange={v => setConfig(c => ({ ...c, phoneNumberId: v }))}
                  placeholder="1234567890" hint="Found under WhatsApp → Phone Numbers in Developer Console" />
                <TextField label="WhatsApp Business Account ID" field="businessAccountId"
                  value={config.businessAccountId || ''} onChange={v => setConfig(c => ({ ...c, businessAccountId: v }))}
                  placeholder="123456789" hint="Optional: Your WABA ID" />
                <ReadonlyField label="Webhook URL" value={config.webhookUrl || 'Save to generate'}
                  field="waWebhook" copied={copied} setCopied={setCopied} />
                <ReadonlyField label="Verify Token" value={config.verifyToken || 'codebegun_verify'}
                  field="waVerify" copied={copied} setCopied={setCopied} />
                <div className="row g-3 mt-1">
                  <div className="col-md-6">
                    <label className="form-label fw-medium small">Qualification Language</label>
                    <select className="form-select" value={config.qualificationLanguage || 'english'}
                      onChange={e => setConfig(c => ({ ...c, qualificationLanguage: e.target.value }))}>
                      <option value="english">English</option>
                      <option value="telugu">Telugu</option>
                      <option value="hindi">Hindi</option>
                    </select>
                  </div>
                  <div className="col-md-6 d-flex align-items-end">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" role="switch"
                        checked={config.enableQualificationBot !== false}
                        onChange={e => setConfig(c => ({ ...c, enableQualificationBot: e.target.checked }))} />
                      <label className="form-check-label fw-medium small">Enable Qualification Bot</label>
                    </div>
                  </div>
                </div>
              </FieldGroup>
            )}

            {sourceKey === 'websiteForm' && (
              <FieldGroup title="Website Form Settings" icon="fa-solid fa-code">
                <div className="mb-3">
                  <label className="form-label fw-medium small">Allowed Domains (one per line)</label>
                  <textarea className="form-control font-monospace" rows={3}
                    placeholder="https://yourwebsite.com&#10;https://www.yourwebsite.com"
                    value={(config.allowedDomains || []).join('\n')}
                    onChange={e => setConfig(c => ({ ...c, allowedDomains: e.target.value.split('\n').filter(Boolean) }))} />
                  <small className="text-muted">Leave blank to allow all domains (not recommended for production)</small>
                </div>
                <TextField label="Redirect URL after form submission" field="redirectUrl"
                  value={config.redirectUrl || ''} onChange={v => setConfig(c => ({ ...c, redirectUrl: v }))}
                  placeholder="https://yourwebsite.com/thank-you" />
                {config.embedCode && (
                  <div className="mb-3">
                    <label className="form-label fw-medium small">Embed Code</label>
                    <div className="position-relative">
                      <pre className="rounded p-3 small" style={{ background: '#1e1e2e', color: '#cdd6f4', overflowX: 'auto' }}>
                        {config.embedCode}
                      </pre>
                      <button className="btn btn-sm btn-outline-light position-absolute top-0 end-0 m-2"
                        onClick={() => copyToClipboard(config.embedCode, setCopied, 'embedCode')}>
                        <i className={`fa-solid ${copied === 'embedCode' ? 'fa-check text-success' : 'fa-copy'} me-1`}></i>
                        {copied === 'embedCode' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <small className="text-muted">Paste this snippet before the &lt;/body&gt; tag on your website</small>
                  </div>
                )}
                {config.webhookUrl && (
                  <ReadonlyField label="Form Submission Endpoint (for custom integrations)"
                    value={config.webhookUrl} field="formUrl" copied={copied} setCopied={setCopied} />
                )}
              </FieldGroup>
            )}

            {sourceKey === 'googleSheet' && (
              <FieldGroup title="Google Sheets Integration" icon="fa-solid fa-table">
                <div className="alert alert-info d-flex gap-2 align-items-start">
                  <i className="fa-solid fa-circle-info mt-1"></i>
                  <div>
                    <strong>Setup via Google Sheets Integration Page</strong><br />
                    <small>Go to <strong>Lead Sources → Google Sheets</strong> to link specific spreadsheets.
                    This toggle controls whether Sheet-imported leads appear in your pipeline.</small>
                  </div>
                </div>
              </FieldGroup>
            )}

            {sourceKey === 'walkin' && (
              <FieldGroup title="Walk-in Lead Settings" icon="fa-solid fa-person-walking">
                <div className="alert alert-success d-flex gap-2 align-items-start mb-3">
                  <i className="fa-solid fa-circle-check mt-1"></i>
                  <div><strong>Always Active</strong> — Walk-in leads are always captured, no API setup needed.</div>
                </div>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={config.quickCaptureEnabled !== false}
                    onChange={e => setConfig(c => ({ ...c, quickCaptureEnabled: e.target.checked }))} />
                  <label className="form-check-label fw-medium small">Show Quick Capture button on Lead List page</label>
                </div>
              </FieldGroup>
            )}

            {sourceKey === 'referral' && (
              <FieldGroup title="Referral Settings" icon="fa-solid fa-share-nodes">
                <div className="alert alert-success d-flex gap-2 align-items-start mb-3">
                  <i className="fa-solid fa-circle-check mt-1"></i>
                  <div><strong>Always Active</strong> — Referral leads can be added manually at any time.</div>
                </div>
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={config.trackReferrerName !== false}
                    onChange={e => setConfig(c => ({ ...c, trackReferrerName: e.target.checked }))} />
                  <label className="form-check-label fw-medium small">Prompt staff to enter the referrer's name when adding a referral lead</label>
                </div>
              </FieldGroup>
            )}

            {sourceKey === 'googleAds' && (
              <FieldGroup title="Google Ads via UTM Tracking" icon="fa-brands fa-google">
                <div className="alert alert-info d-flex gap-2 align-items-start mb-3">
                  <i className="fa-solid fa-circle-info mt-1"></i>
                  <div>
                    <strong>No API Key needed</strong> — Google Ads leads are captured when visitors fill your website form
                    with Google Ads UTM parameters in the URL.
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <TextField label="UTM Source to track" field="utmSource"
                      value={config.utmSource || 'google'} onChange={v => setConfig(c => ({ ...c, utmSource: v }))}
                      placeholder="google" />
                  </div>
                  <div className="col-md-6">
                    <TextField label="UTM Medium to track" field="utmMedium"
                      value={config.utmMedium || 'cpc'} onChange={v => setConfig(c => ({ ...c, utmMedium: v }))}
                      placeholder="cpc" />
                  </div>
                </div>
                <small className="text-muted mt-2 d-block">
                  Example URL: <code>https://yoursite.com?utm_source=google&amp;utm_medium=cpc</code>
                </small>
              </FieldGroup>
            )}

            {/* Auto Actions — all sources */}
            <FieldGroup title="Auto-Actions for New Leads from This Source" icon="fa-solid fa-bolt">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-medium small">Default Priority</label>
                  <select className="form-select" value={autoActions.defaultPriority}
                    onChange={e => setAutoActions(a => ({ ...a, defaultPriority: e.target.value as any }))}>
                    <option value="hot">🔴 Hot</option>
                    <option value="warm">🟡 Warm</option>
                    <option value="cold">🔵 Cold</option>
                  </select>
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch"
                      checked={autoActions.autoAssign}
                      onChange={e => setAutoActions(a => ({ ...a, autoAssign: e.target.checked }))} />
                    <label className="form-check-label fw-medium small">Auto-assign via Scoring Engine</label>
                  </div>
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch"
                      checked={autoActions.notifyAdminOnNewLead}
                      onChange={e => setAutoActions(a => ({ ...a, notifyAdminOnNewLead: e.target.checked }))} />
                    <label className="form-check-label fw-medium small">Notify Admin on New Lead</label>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={autoActions.sendWhatsAppWelcome}
                    onChange={e => setAutoActions(a => ({ ...a, sendWhatsAppWelcome: e.target.checked }))} />
                  <label className="form-check-label fw-medium small">Send WhatsApp Welcome Message</label>
                </div>
                {autoActions.sendWhatsAppWelcome && (
                  <textarea className="form-control mt-2" rows={3}
                    placeholder="Hi {{name}}, thanks for your interest! Our team will contact you shortly."
                    value={autoActions.whatsAppWelcomeTemplate}
                    onChange={e => setAutoActions(a => ({ ...a, whatsAppWelcomeTemplate: e.target.value }))} />
                )}
                <small className="text-muted d-block mt-1">Use <code>{'{{name}}'}</code> to personalise the message</small>
              </div>
            </FieldGroup>

            {/* Test Result */}
            {testResult && (
              <div className={`alert ${testResult.success ? 'alert-success' : 'alert-warning'} d-flex gap-2 align-items-center`}>
                <i className={`fa-solid ${testResult.success ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                {testResult.message}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={() => onTest(sourceKey)} disabled={testing}>
              {testing ? <><span className="spinner-border spinner-border-sm me-2"></span>Testing...</> : <><i className="fa-solid fa-plug me-2"></i>Test Connection</>}
            </button>
            <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fa-solid fa-floppy-disk me-2"></i>Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Small reusable sub-components ───────────────────────────────────────────

const FieldGroup: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="mb-4">
    <div className="d-flex align-items-center gap-2 mb-3">
      <i className={`${icon} text-secondary`}></i>
      <span className="fw-semibold text-secondary small text-uppercase letter-spacing-1">{title}</span>
    </div>
    {children}
  </div>
);

const TextField: React.FC<{
  label: string; field: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}> = ({ label, value, onChange, type = 'text', placeholder, hint }) => (
  <div className="mb-3">
    <label className="form-label fw-medium small">{label}</label>
    <input className="form-control" type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} />
    {hint && <small className="text-muted">{hint}</small>}
  </div>
);

const ReadonlyField: React.FC<{
  label: string; value: string; field: string;
  copied: string; setCopied: (v: string) => void;
}> = ({ label, value, field, copied, setCopied }) => (
  <div className="mb-3">
    <label className="form-label fw-medium small">{label}</label>
    <div className="input-group">
      <input className="form-control font-monospace small" readOnly value={value} />
      <button className="btn btn-outline-secondary" onClick={() => copyToClipboard(value, setCopied, field)}>
        <i className={`fa-solid ${copied === field ? 'fa-check text-success' : 'fa-copy'}`}></i>
      </button>
    </div>
  </div>
);

// ─── Source Card Component ────────────────────────────────────────────────────

const SourceCardComponent: React.FC<{
  sourceKey: SourceKey;
  data: SourceCard;
  onConfigure: () => void;
}> = ({ sourceKey, data, onConfigure }) => {
  const meta = SOURCE_META[sourceKey];
  const isActive = meta.alwaysActive || data.isConnected;

  return (
    <div className="col-sm-6 col-xl-4">
      <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ height: 4, background: isActive ? meta.color : '#e5e7eb' }}></div>
        <div className="card-body p-4">
          {/* Header row */}
          <div className="d-flex align-items-start justify-content-between mb-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 48, height: 48, background: meta.color + '15' }}>
                <i className={`${meta.icon} fs-4`} style={{ color: meta.color }}></i>
              </div>
              <div>
                <h6 className="mb-0 fw-semibold">{meta.label}</h6>
                <span className={`badge rounded-pill small ${isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {meta.alwaysActive ? 'Always Active' : (isActive ? 'Connected' : 'Not connected')}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted small mb-3" style={{ lineHeight: 1.5 }}>{meta.description}</p>

          {/* Stats row */}
          <div className="d-flex gap-3 mb-4">
            <div className="text-center px-3 py-2 rounded" style={{ background: '#f8fafc', flex: 1 }}>
              <div className="fw-bold fs-5" style={{ color: meta.color }}>{data.stats?.leadsThisMonth ?? 0}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>This month</div>
            </div>
            <div className="text-center px-3 py-2 rounded" style={{ background: '#f8fafc', flex: 1 }}>
              <div className="fw-bold fs-5">{data.stats?.leadsTotal ?? 0}</div>
              <div className="text-muted" style={{ fontSize: 11 }}>Total</div>
            </div>
            <div className="text-center px-3 py-2 rounded" style={{ background: '#f8fafc', flex: 1 }}>
              <div className="fw-semibold" style={{ fontSize: 11, color: '#64748b' }}>Last lead</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{timeAgo(data.stats?.lastLeadAt ?? null)}</div>
            </div>
          </div>

          {/* Action row */}
          <button className="btn btn-sm w-100 fw-medium"
            style={{
              background: isActive ? meta.color + '15' : '#f8fafc',
              color: isActive ? meta.color : '#64748b',
              border: `1px solid ${isActive ? meta.color + '30' : '#e2e8f0'}`,
              borderRadius: 8,
            }}
            onClick={onConfigure}>
            <i className="fa-solid fa-sliders me-2"></i>
            Configure
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LeadSourcesPage: React.FC = () => {
  const [config, setConfig] = useState<SourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeModal, setActiveModal] = useState<SourceKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Third-party section
  const [showAddTP, setShowAddTP] = useState(false);
  const [newTPName, setNewTPName] = useState('');
  const [addingTP, setAddingTP] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await leadSourceConfigApi.getSources();
      setConfig(data.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load source configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (
    sourceKey: SourceKey,
    isConnected: boolean,
    cfg: any,
    autoActions: AutoActions
  ) => {
    setSaving(true);
    setTestResult(null);
    try {
      await leadSourceConfigApi.updateSource(sourceKey, { isConnected, config: cfg, autoActions });
      setSaveSuccess(`${SOURCE_META[sourceKey].label} settings saved!`);
      setTimeout(() => setSaveSuccess(''), 3000);
      setActiveModal(null);
      await load();
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (sourceKey: SourceKey) => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await leadSourceConfigApi.testConnection(sourceKey);
      setTestResult({ success: result.success, message: result.message });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleAddTP = async () => {
    if (!newTPName.trim()) return;
    setAddingTP(true);
    try {
      await leadSourceConfigApi.addThirdPartySource({ name: newTPName.trim() });
      setNewTPName('');
      setShowAddTP(false);
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to add source');
    } finally {
      setAddingTP(false);
    }
  };

  const handleRemoveTP = async (name: string) => {
    if (!window.confirm(`Remove ${name} integration?`)) return;
    try {
      await leadSourceConfigApi.removeThirdPartySource(name);
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to remove source');
    }
  };

  const sourceKeys: SourceKey[] = ['metaAds', 'whatsApp', 'websiteForm', 'googleSheet', 'walkin', 'referral', 'googleAds'];

  const connectedCount = config
    ? sourceKeys.filter(k => SOURCE_META[k].alwaysActive || config[k]?.isConnected).length
    : 0;
  const totalLeadsThisMonth = config
    ? sourceKeys.reduce((sum, k) => sum + (config[k]?.stats?.leadsThisMonth ?? 0), 0)
    : 0;

  return (
    <div className="container-fluid py-4 px-4">
      {/* Page header */}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="fa-solid fa-plug-circle-bolt me-2 text-primary"></i>
            Lead Sources & Integrations
          </h3>
          <p className="text-muted mb-0">
            Configure every channel that brings leads into your pipeline. Each source is per-tenant and stored securely in your database.
          </p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={load} disabled={loading}>
          <i className="fa-solid fa-arrows-rotate me-2"></i>Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Active Sources', value: connectedCount, icon: 'fa-solid fa-plug', color: '#6366f1' },
          { label: 'Leads This Month', value: totalLeadsThisMonth, icon: 'fa-solid fa-users', color: '#10b981' },
          { label: 'Total Sources Available', value: sourceKeys.length + (config?.thirdParty?.length ?? 0), icon: 'fa-solid fa-layer-group', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="col-sm-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 10 }}>
              <div className="card-body py-3 px-4 d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: s.color + '15' }}>
                  <i className={`${s.icon}`} style={{ color: s.color }}></i>
                </div>
                <div>
                  <div className="fw-bold fs-4 lh-1">{s.value}</div>
                  <div className="text-muted small">{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div className="alert alert-success alert-dismissible d-flex gap-2 align-items-center mb-4">
          <i className="fa-solid fa-circle-check"></i>
          {saveSuccess}
          <button type="button" className="btn-close ms-auto" onClick={() => setSaveSuccess('')}></button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger d-flex gap-2 align-items-center mb-4">
          <i className="fa-solid fa-triangle-exclamation"></i>
          {error}
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={load}>Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="row g-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="col-sm-6 col-xl-4">
              <div className="card border-0 shadow-sm" style={{ borderRadius: 12, height: 200 }}>
                <div className="card-body p-4">
                  <div className="placeholder-glow">
                    <span className="placeholder col-8 mb-3 rounded d-block" style={{ height: 20 }}></span>
                    <span className="placeholder col-5 rounded d-block" style={{ height: 14 }}></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Source cards */}
      {!loading && config && (
        <>
          <div className="row g-4 mb-5">
            {sourceKeys.map(key => (
              <SourceCardComponent
                key={key}
                sourceKey={key}
                data={config[key]}
                onConfigure={() => { setActiveModal(key); setTestResult(null); }}
              />
            ))}
          </div>

          {/* Third-party section */}
          <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h6 className="fw-bold mb-1">
                    <i className="fa-solid fa-handshake me-2 text-secondary"></i>
                    Third-party Portals
                  </h6>
                  <small className="text-muted">IndiaMART, Sulekha, JustDial, and any other lead portals</small>
                </div>
                <button className="btn btn-sm btn-outline-primary" onClick={() => setShowAddTP(true)}>
                  <i className="fa-solid fa-plus me-2"></i>Add Portal
                </button>
              </div>

              {config.thirdParty.length === 0 && !showAddTP && (
                <div className="text-center py-5 text-muted">
                  <i className="fa-solid fa-handshake fs-1 mb-3 d-block opacity-25"></i>
                  No third-party portals configured yet.<br />
                  <small>Add IndiaMART, Sulekha, or JustDial to auto-capture those leads.</small>
                </div>
              )}

              {config.thirdParty.map(tp => (
                <div key={tp._id || tp.name} className="d-flex align-items-center justify-content-between p-3 rounded mb-2"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: 36, height: 36, background: '#dbeafe' }}>
                      <i className="fa-solid fa-building text-primary" style={{ fontSize: 14 }}></i>
                    </div>
                    <div>
                      <div className="fw-medium small">{tp.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {tp.stats.leadsThisMonth} leads this month · Last: {timeAgo(tp.stats.lastLeadAt)}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {tp.webhookUrl && (
                      <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => copyToClipboard(tp.webhookUrl!, setCopied, tp.name)}>
                        <i className={`fa-solid ${copied === tp.name ? 'fa-check text-success' : 'fa-copy'} me-1`}></i>
                        {copied === tp.name ? 'Copied!' : 'Copy URL'}
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveTP(tp.name)}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}

              {showAddTP && (
                <div className="d-flex gap-2 mt-3">
                  <input className="form-control form-control-sm" placeholder="Portal name (e.g., IndiaMART)"
                    value={newTPName} onChange={e => setNewTPName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTP()} />
                  <button className="btn btn-sm btn-primary" onClick={handleAddTP} disabled={addingTP || !newTPName.trim()}>
                    {addingTP ? <span className="spinner-border spinner-border-sm"></span> : 'Add'}
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowAddTP(false); setNewTPName(''); }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Configure Modal */}
      {activeModal && config && (
        <ConfigModal
          sourceKey={activeModal}
          sourceData={config[activeModal]}
          onClose={() => { setActiveModal(null); setTestResult(null); }}
          onSave={handleSave}
          onTest={handleTest}
          saving={saving}
          testing={testing}
          testResult={testResult}
          copied={copied}
          setCopied={setCopied}
        />
      )}
    </div>
  );
};

export default LeadSourcesPage;
