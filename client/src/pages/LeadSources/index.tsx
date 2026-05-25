import React, { useState, useEffect, useCallback } from 'react';
import { leadSourceConfigApi, metaLeadsApi } from '../../api/index';

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
  onTest: (sourceKey: SourceKey, currentConfig: Record<string, any>) => Promise<void>;
  onSetupWebhook?: () => Promise<void>;
  saving: boolean;
  testing: boolean;
  settingUpWebhook?: boolean;
  testResult: { success: boolean; message: string } | null;
  copied: string;
  setCopied: (v: string) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
  sourceKey, sourceData, onClose, onSave, onTest, onSetupWebhook, saving, testing, settingUpWebhook, testResult, copied, setCopied
}) => {
  const meta = SOURCE_META[sourceKey];
  const [activeTab, setActiveTab] = useState<'credentials' | 'autoActions'>('credentials');
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

  // darken the brand color for the gradient
  const headerGradient = `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%)`;

  return (
    <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 1055 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxWidth: 680 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 14, overflow: 'hidden' }}>

          {/* ── Gradient Header ── */}
          <div className="modal-header border-0 px-4 py-3" style={{ background: headerGradient }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 46, height: 46, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                <i className={`${meta.icon} fs-5 text-white`}></i>
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-white" style={{ fontSize: '1.05rem' }}>
                  Configure {meta.label}
                </h5>
                <div className="text-white opacity-75" style={{ fontSize: '0.78rem' }}>{meta.description}</div>
              </div>
            </div>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="px-4 pt-3 pb-0" style={{ background: '#fff', borderBottom: '1px solid #e9ecef' }}>
            <ul className="nav nav-tabs border-0" style={{ gap: 4 }}>
              {[
                { key: 'credentials', label: 'Configuration', icon: 'fa-solid fa-gear' },
                { key: 'autoActions', label: 'Auto-Actions', icon: 'fa-solid fa-bolt' },
              ].map(tab => (
                <li key={tab.key} className="nav-item">
                  <button
                    className={`nav-link fw-semibold px-3 py-2 border-0 ${activeTab === tab.key ? 'active' : 'text-secondary'}`}
                    style={{
                      fontSize: '0.85rem',
                      borderBottom: activeTab === tab.key ? `3px solid ${meta.color}` : '3px solid transparent',
                      color: activeTab === tab.key ? meta.color : undefined,
                      background: 'transparent',
                      borderRadius: 0,
                    }}
                    onClick={() => setActiveTab(tab.key as any)}
                  >
                    <i className={`${tab.icon} me-2`}></i>{tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Modal Body ── */}
          <div className="modal-body p-4" style={{ background: '#f8fafc', minHeight: 320 }}>

            {/* ── CREDENTIALS TAB ── */}
            {activeTab === 'credentials' && (
              <>
                {/* Connection Toggle — compact inline */}
                {!meta.alwaysActive && (
                  <div className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3 mb-4"
                    style={{
                      background: isConnected ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${isConnected ? '#bbf7d0' : '#e2e8f0'}`,
                    }}>
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                        background: isConnected ? '#16a34a' : '#94a3b8' }}></span>
                      <span className="fw-semibold" style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                        {isConnected ? 'Source is Active' : 'Source is Inactive'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        — {isConnected ? 'leads are being captured' : 'toggle to enable'}
                      </span>
                    </div>
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" role="switch"
                        checked={isConnected} onChange={e => setIsConnected(e.target.checked)}
                        style={{ width: '2.5rem', height: '1.3rem', cursor: 'pointer' }} />
                    </div>
                  </div>
                )}

                {/* ── Source-specific fields ── */}
                {sourceKey === 'metaAds' && (
                  <FieldGroup title="Meta API Credentials" icon="fa-solid fa-key" color={meta.color}>
                    <TextField label="Page Access Token" value={config.pageAccessToken || ''}
                      onChange={v => setConfig(c => ({ ...c, pageAccessToken: v }))}
                      type="password" placeholder="EAAxxxxxxxxxx..."
                      hint="Get from Meta Business Suite → Apps → Your App → API Setup" />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <TextField label="App ID" value={config.appId || ''}
                          onChange={v => setConfig(c => ({ ...c, appId: v }))}
                          placeholder="1130584002527752"
                          hint="Meta Developer Console → Your App → Settings → Basic" />
                      </div>
                      <div className="col-md-6">
                        <TextField label="App Secret" value={config.appSecret || ''}
                          onChange={v => setConfig(c => ({ ...c, appSecret: v }))}
                          type="password" placeholder="Your App Secret"
                          hint="Meta Developer Console → Your App → Settings → Basic" />
                      </div>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <TextField label="Facebook Page ID" value={config.pageId || ''}
                          onChange={v => setConfig(c => ({ ...c, pageId: v }))}
                          placeholder="123456789012345"
                          hint="Found in Facebook Page Settings → About" />
                      </div>
                      <div className="col-md-6">
                        <TextField label="Ad Account ID (Optional)" value={config.adAccountId || ''}
                          onChange={v => setConfig(c => ({ ...c, adAccountId: v }))}
                          placeholder="act_123456789"
                          hint="Used to pull campaign cost data" />
                      </div>
                    </div>
                    <ReadonlyField label="Webhook URL" hint="Paste this URL in Meta Developer Console → Your App → Webhooks → Callback URL"
                      value={config.webhookUrl || 'Save settings to generate URL'}
                      field="metaWebhook" copied={copied} setCopied={setCopied} />
                    <ReadonlyField label="Verify Token" hint="Enter this token in Meta Developer Console → Webhooks → Verify Token field"
                      value={config.verifyToken || 'codebegun_verify'}
                      field="metaVerify" copied={copied} setCopied={setCopied} />
                  </FieldGroup>
                )}

                {sourceKey === 'whatsApp' && (
                  <FieldGroup title="WhatsApp Cloud API Credentials" icon="fa-solid fa-key" color={meta.color}>
                    <TextField label="Access Token" value={config.accessToken || ''}
                      onChange={v => setConfig(c => ({ ...c, accessToken: v }))}
                      type="password" placeholder="EAAxxxxxxxxxx..."
                      hint="Get from Meta Developer Console → WhatsApp → API Setup" />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <TextField label="Phone Number ID" value={config.phoneNumberId || ''}
                          onChange={v => setConfig(c => ({ ...c, phoneNumberId: v }))}
                          placeholder="1234567890"
                          hint="WhatsApp → Phone Numbers in Developer Console" />
                      </div>
                      <div className="col-md-6">
                        <TextField label="Business Account ID" value={config.businessAccountId || ''}
                          onChange={v => setConfig(c => ({ ...c, businessAccountId: v }))}
                          placeholder="123456789"
                          hint="Your WABA ID (optional)" />
                      </div>
                    </div>
                    <ReadonlyField label="Webhook URL" hint="Paste this URL in Meta Developer Console → WhatsApp → Configuration → Webhook"
                      value={config.webhookUrl || 'Save settings to generate URL'}
                      field="waWebhook" copied={copied} setCopied={setCopied} />
                    <ReadonlyField label="Verify Token" hint="Enter this token in the Verify Token field when setting up the webhook"
                      value={config.verifyToken || 'codebegun_verify'}
                      field="waVerify" copied={copied} setCopied={setCopied} />
                    <div className="row g-3 mt-1">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold" style={{ fontSize: '0.83rem', color: '#374151' }}>
                          Qualification Language
                        </label>
                        <select className="form-select" value={config.qualificationLanguage || 'english'}
                          onChange={e => setConfig(c => ({ ...c, qualificationLanguage: e.target.value }))}>
                          <option value="english">🇬🇧 English</option>
                          <option value="telugu">🇮🇳 Telugu</option>
                          <option value="hindi">🇮🇳 Hindi</option>
                        </select>
                      </div>
                      <div className="col-md-6 d-flex align-items-end pb-1">
                        <div className="form-check form-switch mb-0">
                          <input className="form-check-input" type="checkbox" role="switch"
                            id="qaBot"
                            checked={config.enableQualificationBot !== false}
                            onChange={e => setConfig(c => ({ ...c, enableQualificationBot: e.target.checked }))} />
                          <label className="form-check-label fw-semibold" htmlFor="qaBot"
                            style={{ fontSize: '0.83rem', color: '#374151' }}>
                            Enable Qualification Bot
                          </label>
                        </div>
                      </div>
                    </div>
                  </FieldGroup>
                )}

                {sourceKey === 'websiteForm' && (
                  <FieldGroup title="Website Form Settings" icon="fa-solid fa-code" color={meta.color}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: '0.83rem', color: '#374151' }}>
                        Allowed Domains <span className="fw-normal text-muted">(one per line)</span>
                      </label>
                      <textarea className="form-control font-monospace" rows={3}
                        style={{ fontSize: '0.82rem' }}
                        placeholder={'https://yourwebsite.com\nhttps://www.yourwebsite.com'}
                        value={(config.allowedDomains || []).join('\n')}
                        onChange={e => setConfig(c => ({ ...c, allowedDomains: e.target.value.split('\n').filter(Boolean) }))} />
                      <div className="form-text">Leave blank to allow all domains (not recommended for production)</div>
                    </div>
                    <TextField label="Redirect URL after form submission" value={config.redirectUrl || ''}
                      onChange={v => setConfig(c => ({ ...c, redirectUrl: v }))}
                      placeholder="https://yourwebsite.com/thank-you" />
                    {config.webhookUrl && (
                      <ReadonlyField label="Form Submission Endpoint"
                        hint="Use this URL for custom form integrations or API calls"
                        value={config.webhookUrl} field="formUrl" copied={copied} setCopied={setCopied} />
                    )}
                    {config.embedCode && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold" style={{ fontSize: '0.83rem', color: '#374151' }}>
                          Embed Code
                        </label>
                        <div className="position-relative" style={{ borderRadius: 8, overflow: 'hidden' }}>
                          <pre className="p-3 mb-0" style={{
                            background: '#1e1e2e', color: '#cdd6f4',
                            fontSize: '0.76rem', overflowX: 'auto', borderRadius: 8
                          }}>
                            {config.embedCode}
                          </pre>
                          <button className="btn btn-sm position-absolute top-0 end-0 m-2"
                            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
                            onClick={() => copyToClipboard(config.embedCode, setCopied, 'embedCode')}>
                            <i className={`fa-solid ${copied === 'embedCode' ? 'fa-check' : 'fa-copy'} me-1`}></i>
                            {copied === 'embedCode' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="form-text">Paste before the &lt;/body&gt; tag on your website</div>
                      </div>
                    )}
                  </FieldGroup>
                )}

                {sourceKey === 'googleSheet' && (
                  <FieldGroup title="Google Sheets Integration" icon="fa-solid fa-table" color={meta.color}>
                    <div className="alert alert-info border-0 d-flex gap-3 align-items-start"
                      style={{ borderRadius: 10, background: '#eff6ff', color: '#1d4ed8' }}>
                      <i className="fa-solid fa-circle-info mt-1 flex-shrink-0"></i>
                      <div>
                        <div className="fw-semibold mb-1">Setup via Google Sheets Integration Page</div>
                        <div style={{ fontSize: '0.82rem' }}>
                          Go to <strong>Lead Sources → Google Sheets</strong> to link specific spreadsheets.
                          This toggle controls whether Sheet-imported leads appear in your pipeline.
                        </div>
                      </div>
                    </div>
                  </FieldGroup>
                )}

                {sourceKey === 'walkin' && (
                  <FieldGroup title="Walk-in Lead Settings" icon="fa-solid fa-person-walking" color={meta.color}>
                    <div className="alert border-0 d-flex gap-3 align-items-start mb-4"
                      style={{ borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>
                      <i className="fa-solid fa-circle-check mt-1 flex-shrink-0"></i>
                      <div>
                        <div className="fw-semibold">Always Active</div>
                        <div style={{ fontSize: '0.82rem' }}>Walk-in leads are always captured — no API setup needed.</div>
                      </div>
                    </div>
                    <div className="card border-0 p-3" style={{ borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" role="switch" id="quickCapture"
                          checked={config.quickCaptureEnabled !== false}
                          onChange={e => setConfig(c => ({ ...c, quickCaptureEnabled: e.target.checked }))} />
                        <label className="form-check-label fw-semibold" htmlFor="quickCapture"
                          style={{ fontSize: '0.88rem', color: '#374151' }}>
                          Show Quick Capture button on Lead List page
                        </label>
                        <div className="form-text mt-1">Adds a visible shortcut for staff to add walk-in leads in 3 taps</div>
                      </div>
                    </div>
                  </FieldGroup>
                )}

                {sourceKey === 'referral' && (
                  <FieldGroup title="Referral Settings" icon="fa-solid fa-share-nodes" color={meta.color}>
                    <div className="alert border-0 d-flex gap-3 align-items-start mb-4"
                      style={{ borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>
                      <i className="fa-solid fa-circle-check mt-1 flex-shrink-0"></i>
                      <div>
                        <div className="fw-semibold">Always Active</div>
                        <div style={{ fontSize: '0.82rem' }}>Referral leads can be added manually at any time.</div>
                      </div>
                    </div>
                    <div className="card border-0 p-3" style={{ borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" role="switch" id="trackReferrer"
                          checked={config.trackReferrerName !== false}
                          onChange={e => setConfig(c => ({ ...c, trackReferrerName: e.target.checked }))} />
                        <label className="form-check-label fw-semibold" htmlFor="trackReferrer"
                          style={{ fontSize: '0.88rem', color: '#374151' }}>
                          Prompt staff to enter referrer's name
                        </label>
                        <div className="form-text mt-1">When adding a referral lead, staff will be asked for the referrer's name</div>
                      </div>
                    </div>
                  </FieldGroup>
                )}

                {sourceKey === 'googleAds' && (
                  <FieldGroup title="Google Ads via UTM Tracking" icon="fa-brands fa-google" color={meta.color}>
                    <div className="alert border-0 d-flex gap-3 align-items-start mb-4"
                      style={{ borderRadius: 10, background: '#eff6ff', color: '#1d4ed8' }}>
                      <i className="fa-solid fa-circle-info mt-1 flex-shrink-0"></i>
                      <div>
                        <div className="fw-semibold">No API key needed</div>
                        <div style={{ fontSize: '0.82rem' }}>
                          Google Ads leads are captured when visitors fill your website form with Google Ads UTM parameters in the URL.
                        </div>
                      </div>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <TextField label="UTM Source to track" value={config.utmSource || 'google'}
                          onChange={v => setConfig(c => ({ ...c, utmSource: v }))} placeholder="google" />
                      </div>
                      <div className="col-md-6">
                        <TextField label="UTM Medium to track" value={config.utmMedium || 'cpc'}
                          onChange={v => setConfig(c => ({ ...c, utmMedium: v }))} placeholder="cpc" />
                      </div>
                    </div>
                    <div className="form-text mt-1">
                      Example: <code>https://yoursite.com?utm_source=google&amp;utm_medium=cpc</code>
                    </div>
                  </FieldGroup>
                )}
              </>
            )}

            {/* ── AUTO-ACTIONS TAB ── */}
            {activeTab === 'autoActions' && (
              <FieldGroup title="Auto-Actions for New Leads from This Source" icon="fa-solid fa-bolt" color={meta.color}>
                {/* Priority */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.83rem', color: '#374151' }}>
                    Default Priority
                  </label>
                  <div className="d-flex gap-2">
                    {(['hot', 'warm', 'cold'] as const).map(p => {
                      const styles: Record<string, { bg: string; border: string; text: string }> = {
                        hot:  { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', border: '#ef4444', text: '#fff' },
                        warm: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', border: '#f59e0b', text: '#fff' },
                        cold: { bg: 'linear-gradient(135deg,#38bdf8,#0891b2)', border: '#38bdf8', text: '#fff' },
                      };
                      const isActive = autoActions.defaultPriority === p;
                      return (
                        <button key={p} type="button"
                          className="btn fw-semibold flex-fill"
                          style={{
                            padding: '9px 0',
                            fontSize: '0.85rem',
                            background: isActive ? styles[p].bg : '#fff',
                            color: isActive ? styles[p].text : '#64748b',
                            border: `1px solid ${isActive ? styles[p].border : '#dee2e6'}`,
                            borderRadius: 8,
                            boxShadow: isActive ? '0 3px 10px rgba(0,0,0,0.15)' : 'none',
                            transition: 'all 0.15s',
                          }}
                          onClick={() => setAutoActions(a => ({ ...a, defaultPriority: p }))}>
                          {p === 'hot' && <i className="fa-solid fa-fire me-1"></i>}
                          {p === 'warm' && <i className="fa-solid fa-sun me-1"></i>}
                          {p === 'cold' && <i className="fa-solid fa-snowflake me-1"></i>}
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles */}
                <div className="card border-0 mb-4" style={{ borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div className="card-body p-0">
                    {[
                      { id: 'autoAssign', label: 'Auto-assign via Lead Scoring Engine', desc: 'New leads are automatically assigned to staff based on scoring rules', field: 'autoAssign', value: autoActions.autoAssign },
                      { id: 'notifyAdmin', label: 'Notify Admin on New Lead', desc: 'Send an email/WhatsApp notification to admin when a new lead arrives', field: 'notifyAdminOnNewLead', value: autoActions.notifyAdminOnNewLead },
                    ].map((item, idx) => (
                      <div key={item.id} className={`d-flex align-items-center justify-content-between p-3 ${idx > 0 ? 'border-top' : ''}`}>
                        <div>
                          <div className="fw-semibold" style={{ fontSize: '0.88rem', color: '#1e293b' }}>{item.label}</div>
                          <div className="text-muted" style={{ fontSize: '0.77rem' }}>{item.desc}</div>
                        </div>
                        <div className="form-check form-switch mb-0 ms-3">
                          <input className="form-check-input" type="checkbox" role="switch" id={item.id}
                            style={{ width: '2.5rem', height: '1.3rem', cursor: 'pointer' }}
                            checked={item.value}
                            onChange={e => setAutoActions(a => ({ ...a, [item.field]: e.target.checked }))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WhatsApp welcome toggle + template */}
                <div className="card border-0" style={{ borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div>
                        <div className="fw-semibold" style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                          <i className="fa-brands fa-whatsapp me-2" style={{ color: '#25d366' }}></i>
                          Send WhatsApp Welcome Message
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.77rem' }}>Auto-send a welcome message when a new lead arrives</div>
                      </div>
                      <div className="form-check form-switch mb-0 ms-3">
                        <input className="form-check-input" type="checkbox" role="switch" id="waWelcome"
                          style={{ width: '2.5rem', height: '1.3rem', cursor: 'pointer' }}
                          checked={autoActions.sendWhatsAppWelcome}
                          onChange={e => setAutoActions(a => ({ ...a, sendWhatsAppWelcome: e.target.checked }))} />
                      </div>
                    </div>
                    {autoActions.sendWhatsAppWelcome && (
                      <div className="mt-3">
                        <label className="form-label fw-semibold" style={{ fontSize: '0.83rem', color: '#374151' }}>
                          Message Template
                        </label>
                        <textarea className="form-control" rows={3}
                          placeholder="Hi {{name}}, thanks for your interest! Our team will contact you shortly."
                          value={autoActions.whatsAppWelcomeTemplate}
                          onChange={e => setAutoActions(a => ({ ...a, whatsAppWelcomeTemplate: e.target.value }))} />
                        <div className="form-text">Use <code>{'{{name}}'}</code> to personalise the message</div>
                      </div>
                    )}
                  </div>
                </div>
              </FieldGroup>
            )}

            {/* Test Result */}
            {testResult && (
              <div className={`alert border-0 d-flex gap-2 align-items-center mt-3`}
                style={{
                  borderRadius: 10,
                  background: testResult.success ? '#f0fdf4' : '#fff7ed',
                  color: testResult.success ? '#15803d' : '#c2410c',
                }}>
                <i className={`fa-solid ${testResult.success ? 'fa-circle-check' : 'fa-triangle-exclamation'} flex-shrink-0`}></i>
                <span style={{ fontSize: '0.88rem' }}>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="modal-footer border-0 px-4 py-3" style={{ background: '#fff', borderTop: '1px solid #e9ecef' }}>
            <button className="btn btn-outline-secondary btn-sm px-3" onClick={() => onTest(sourceKey, config)} disabled={testing}>
              {testing
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Testing...</>
                : <><i className="fa-solid fa-plug me-2"></i>Test Connection</>}
            </button>
            {sourceKey === 'metaAds' && onSetupWebhook && (
              <button className="btn btn-sm px-3 ms-2" onClick={onSetupWebhook} disabled={settingUpWebhook}
                title="Uses App ID + App Secret to automatically configure Meta App webhook subscription"
                style={{ background: '#1877f2', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.83rem' }}>
                {settingUpWebhook
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Setting up...</>
                  : <><i className="fa-solid fa-satellite-dish me-2"></i>Auto-Setup Webhook</>}
              </button>
            )}
            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-light btn-sm px-3" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary btn-sm px-4 fw-semibold" onClick={handleSave} disabled={saving}
                style={{ background: meta.color, borderColor: meta.color }}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                  : <><i className="fa-solid fa-floppy-disk me-2"></i>Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Small reusable sub-components ───────────────────────────────────────────

const FieldGroup: React.FC<{ title: string; icon: string; color: string; children: React.ReactNode }> = ({ title, icon, color, children }) => (
  <div className="mb-4">
    <div className="d-flex align-items-center gap-2 mb-3 pb-2" style={{ borderBottom: `2px solid ${color}30` }}>
      <i className={`${icon}`} style={{ color, fontSize: 15 }}></i>
      <span className="fw-bold" style={{ fontSize: '0.9rem', color: '#1e293b' }}>
        {title}
      </span>
    </div>
    {children}
  </div>
);

const TextField: React.FC<{
  label: string; field?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}> = ({ label, value, onChange, type = 'text', placeholder, hint }) => (
  <div className="mb-3">
    <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.88rem', color: '#1e293b' }}>{label}</label>
    <input className="form-control" type={type} value={value} placeholder={placeholder}
      style={{ fontSize: '0.9rem', borderColor: '#cbd5e1', color: '#1e293b' }}
      onChange={e => onChange(e.target.value)} />
    {hint && <div className="form-text" style={{ fontSize: '0.78rem', color: '#64748b' }}>{hint}</div>}
  </div>
);

const ReadonlyField: React.FC<{
  label: string; value: string; field: string; hint?: string;
  copied: string; setCopied: (v: string) => void;
}> = ({ label, value, field, hint, copied, setCopied }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center gap-2 mb-1">
      <span className="fw-semibold" style={{ fontSize: '0.88rem', color: '#1e293b' }}>{label}</span>
      <span className="badge rounded-pill" style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>
        <i className="fa-solid fa-copy me-1"></i>Copy Required
      </span>
    </div>
    {hint && (
      <div className="d-flex align-items-start gap-1 mb-2">
        <i className="fa-solid fa-arrow-right-long mt-1 flex-shrink-0" style={{ fontSize: 10, color: '#94a3b8' }}></i>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{hint}</span>
      </div>
    )}
    <div className="rounded-3 overflow-hidden" style={{ border: '1px solid #334155' }}>
      <div className="d-flex align-items-center justify-content-between px-3 py-2"
        style={{ background: '#1e293b' }}>
        <code className="text-break me-3" style={{ fontSize: '0.78rem', color: '#7dd3fc', wordBreak: 'break-all', lineHeight: 1.6 }}>
          {value}
        </code>
        <button className="btn btn-sm flex-shrink-0 fw-semibold"
          style={{
            background: copied === field ? '#16a34a' : '#334155',
            color: '#fff', border: 'none',
            fontSize: '0.78rem', whiteSpace: 'nowrap', minWidth: 72,
          }}
          onClick={() => copyToClipboard(value, setCopied, field)}>
          <i className={`fa-solid ${copied === field ? 'fa-check' : 'fa-copy'} me-1`}></i>
          {copied === field ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Source Card Component ────────────────────────────────────────────────────

const SourceCardComponent: React.FC<{
  sourceKey: SourceKey;
  data: SourceCard;
  onConfigure: () => void;
  onSync?: () => void;
  syncing?: boolean;
  syncResult?: { success: boolean; message: string } | null;
}> = ({ sourceKey, data, onConfigure, onSync, syncing, syncResult }) => {
  const meta = SOURCE_META[sourceKey];
  const isActive = meta.alwaysActive || data.isConnected;

  return (
    <div className="col-12 col-sm-6 col-lg-4">
      <div className="card h-100 border-0 shadow-sm" style={{
        borderRadius: 10,
        borderLeft: `4px solid ${isActive ? meta.color : '#e2e8f0'}`,
      }}>
        <div className="card-body p-3 d-flex flex-column">

          {/* ── Header: icon + name + badge ── */}
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: 44, height: 44, background: meta.color + '15' }}>
              <i className={meta.icon} style={{ color: meta.color, fontSize: 20 }}></i>
            </div>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="fw-bold text-truncate mb-1" style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                {meta.label}
              </div>
              <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-0"
                style={{
                  fontSize: '0.7rem', fontWeight: 600,
                  background: isActive ? '#dcfce7' : '#f1f5f9',
                  color: isActive ? '#15803d' : '#64748b',
                  lineHeight: '1.6',
                }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                  background: isActive ? '#16a34a' : '#94a3b8',
                }}></span>
                {meta.alwaysActive ? 'Always Active' : (isActive ? 'Connected' : 'Not connected')}
              </span>
            </div>
          </div>

          {/* ── Description ── */}
          <p className="text-muted mb-3" style={{ fontSize: '0.8rem', lineHeight: 1.55, flexGrow: 1 }}>
            {meta.description}
          </p>

          {/* ── Sync Result (Meta only) ── */}
          {sourceKey === 'metaAds' && syncResult && (
            <div className="rounded-2 px-3 py-2 mb-3 d-flex gap-2 align-items-start"
              style={{
                background: syncResult.success ? '#f0fdf4' : '#fff7ed',
                border: `1px solid ${syncResult.success ? '#bbf7d0' : '#fed7aa'}`,
                fontSize: '0.78rem',
                color: syncResult.success ? '#15803d' : '#c2410c',
              }}>
              <i className={`fa-solid ${syncResult.success ? 'fa-circle-check' : 'fa-triangle-exclamation'} flex-shrink-0 mt-1`}></i>
              <span>{syncResult.message}</span>
            </div>
          )}

          {/* ── Stats: 3-col Bootstrap grid ── */}
          <div className="row g-2 mb-3">
            <div className="col-4">
              <div className="text-center rounded-2 py-2" style={{ background: '#f8fafc' }}>
                <div className="fw-bold lh-1 mb-1" style={{ color: meta.color, fontSize: '1.15rem' }}>
                  {data.stats?.leadsThisMonth ?? 0}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>This month</div>
              </div>
            </div>
            <div className="col-4">
              <div className="text-center rounded-2 py-2" style={{ background: '#f8fafc' }}>
                <div className="fw-bold lh-1 mb-1" style={{ color: '#1e293b', fontSize: '1.15rem' }}>
                  {data.stats?.leadsTotal ?? 0}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>All time</div>
              </div>
            </div>
            <div className="col-4">
              <div className="text-center rounded-2 py-2" style={{ background: '#f8fafc' }}>
                <div className="fw-bold lh-1 mb-1 text-truncate px-1" style={{ color: '#1e293b', fontSize: '0.75rem' }}>
                  {timeAgo(data.stats?.lastLeadAt ?? null)}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Last lead</div>
              </div>
            </div>
          </div>

          {/* ── Buttons ── */}
          <div className="d-flex gap-2">
            <button className="btn btn-sm fw-semibold flex-grow-1" onClick={onConfigure}
              style={{
                background: isActive ? meta.color : '#f8fafc',
                color: isActive ? '#fff' : '#64748b',
                border: `1px solid ${isActive ? meta.color : '#e2e8f0'}`,
                borderRadius: 6,
                fontSize: '0.83rem',
              }}>
              <i className="fa-solid fa-gear me-2"></i>Configure
            </button>
            {sourceKey === 'metaAds' && isActive && onSync && (
              <button className="btn btn-sm fw-semibold" onClick={onSync} disabled={syncing}
                title="Pull leads from Meta page forms manually"
                style={{
                  background: '#fff',
                  color: meta.color,
                  border: `1px solid ${meta.color}`,
                  borderRadius: 6,
                  fontSize: '0.83rem',
                  whiteSpace: 'nowrap',
                  minWidth: 90,
                }}>
                {syncing
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Syncing</>
                  : <><i className="fa-solid fa-arrows-rotate me-1"></i>Sync Now</>}
              </button>
            )}
          </div>

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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [settingUpWebhook, setSettingUpWebhook] = useState(false);

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
      // Auto-subscribe webhook when Meta Ads is saved as connected
      if (sourceKey === 'metaAds' && isConnected) {
        try { await metaLeadsApi.setupWebhook(); } catch {}
      }
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

  const handleTest = async (sourceKey: SourceKey, currentConfig: Record<string, any> = {}) => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await leadSourceConfigApi.testConnection(sourceKey, currentConfig);
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

  const handleSetupWebhook = async () => {
    setSettingUpWebhook(true);
    setTestResult(null);
    try {
      const result = await metaLeadsApi.setupWebhook();
      setTestResult({ success: result.success, message: result.message });
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Webhook setup failed' });
    } finally {
      setSettingUpWebhook(false);
    }
  };

  const handleMetaSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await metaLeadsApi.syncLeads();
      setSyncResult({ success: result.success, message: result.message });
      if (result.success && result.created > 0) await load();
      setTimeout(() => setSyncResult(null), 8000);
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message || 'Sync failed' });
    } finally {
      setSyncing(false);
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

      {/* ── Page header ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#1e293b' }}>
            <i className="fa-solid fa-plug-circle-bolt me-2" style={{ color: '#6366f1' }}></i>
            Lead Sources & Integrations
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.88rem' }}>
            Manage every channel that brings leads into your CRM pipeline.
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm px-3" onClick={load} disabled={loading}>
          <i className={`fa-solid fa-arrows-rotate me-2 ${loading ? 'fa-spin' : ''}`}></i>Refresh
        </button>
      </div>

      {/* ── Summary stats ── */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Active Sources',          value: connectedCount,                                          icon: 'fa-solid fa-circle-dot',    color: '#6366f1' },
          { label: 'Leads This Month',         value: totalLeadsThisMonth,                                     icon: 'fa-solid fa-user-plus',     color: '#10b981' },
          { label: 'Total Sources Available',  value: sourceKeys.length + (config?.thirdParty?.length ?? 0),  icon: 'fa-solid fa-layer-group',   color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="col-12 col-sm-4">
            <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `3px solid ${s.color}` }}>
              <div className="card-body py-3 px-3 d-flex align-items-center gap-3">
                <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40, background: s.color + '15' }}>
                  <i className={s.icon} style={{ color: s.color, fontSize: 16 }}></i>
                </div>
                <div>
                  <div className="fw-bold mb-0" style={{ fontSize: '1.5rem', color: '#1e293b', lineHeight: 1.1 }}>{s.value}</div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.label}</div>
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
          {/* Section label */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="fw-bold" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
              Lead Channels
            </span>
            <span className="badge rounded-pill" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>
              {sourceKeys.length}
            </span>
          </div>
          <div className="row g-3 mb-4">
            {sourceKeys.map(key => (
              <SourceCardComponent
                key={key}
                sourceKey={key}
                data={config[key]}
                onConfigure={() => { setActiveModal(key); setTestResult(null); }}
                onSync={key === 'metaAds' ? handleMetaSync : undefined}
                syncing={key === 'metaAds' ? syncing : undefined}
                syncResult={key === 'metaAds' ? syncResult : undefined}
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
          onSetupWebhook={activeModal === 'metaAds' ? handleSetupWebhook : undefined}
          saving={saving}
          testing={testing}
          settingUpWebhook={settingUpWebhook}
          testResult={testResult}
          copied={copied}
          setCopied={setCopied}
        />
      )}
    </div>
  );
};

export default LeadSourcesPage;
