import React, { useEffect, useMemo, useState } from 'react';
import { systemSettingsApi, SettingField, SettingGroup, TenantOption } from '../../api/systemSettingsApi';
import './PlatformSettings.css';

const SOURCE_BADGE: Record<string, { text: string; cls: string }> = {
  tenant: { text: 'Tenant override', cls: 'src-tenant' },
  ui:     { text: 'Set in UI',       cls: 'src-ui' },
  env:    { text: 'From .env',       cls: 'src-env' },
  unset:  { text: 'Not set',         cls: 'src-unset' },
};

const PlatformSettings: React.FC = () => {
  const [groups, setGroups] = useState<SettingGroup[]>([]);
  const [fields, setFields] = useState<SettingField[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [testing, setTesting] = useState<string>('');
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Which module (group) is open in the right panel; '' when a search is active.
  const [active, setActive] = useState<string>('');
  const [query, setQuery] = useState('');

  // Scope: '' = platform, or a tenantId
  const [scope, setScope] = useState<string>('');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [testEmailTo, setTestEmailTo] = useState('');

  const load = async (tenantId: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await systemSettingsApi.get(tenantId || undefined);
      setGroups(data.groups);
      setFields(data.settings);
      const init: Record<string, string> = {};
      data.settings.forEach((f) => { init[f.key] = f.isSecret ? '' : (f.value || ''); });
      setForm(init);
      setDirty(new Set());
      setTestResult({});
    } catch (e: any) {
      setError(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { systemSettingsApi.tenants().then(setTenants).catch(() => {}); }, []);
  useEffect(() => { load(scope); /* eslint-disable-next-line */ }, [scope]);
  // Keep an active module selected as groups load / scope changes.
  useEffect(() => {
    if (groups.length && !groups.find((g) => g.id === active)) setActive(groups[0].id);
  }, [groups, active]);

  const onChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty((d) => new Set(d).add(key));
  };

  const clearOverride = (key: string) => {
    setForm((f) => ({ ...f, [key]: '' }));
    setDirty((d) => new Set(d).add(key));
  };

  const save = async () => {
    if (dirty.size === 0) { setToast('No changes to save'); setTimeout(() => setToast(''), 2000); return; }
    setSaving(true);
    setError('');
    try {
      const entries = [...dirty].map((key) => ({ key, value: form[key] ?? '' }));
      await systemSettingsApi.update(entries, scope || undefined);
      setToast('✓ Settings saved');
      setTimeout(() => setToast(''), 2500);
      await load(scope);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (provider: 'anthropic' | 'openai') => {
    setTesting(provider);
    setTestResult((r) => ({ ...r, [provider]: { ok: false, msg: 'Testing…' } }));
    try {
      const res = await systemSettingsApi.test(provider);
      setTestResult((r) => ({ ...r, [provider]: { ok: res.success, msg: res.message } }));
    } catch (e: any) {
      setTestResult((r) => ({ ...r, [provider]: { ok: false, msg: e.message || 'Test failed' } }));
    } finally {
      setTesting('');
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailTo) { setTestResult((r) => ({ ...r, email: { ok: false, msg: 'Enter a recipient email first.' } })); return; }
    setTesting('email');
    setTestResult((r) => ({ ...r, email: { ok: false, msg: 'Sending…' } }));
    try {
      const res = await systemSettingsApi.testEmail(testEmailTo, scope || undefined);
      setTestResult((r) => ({ ...r, email: { ok: res.success, msg: res.message } }));
    } catch (e: any) {
      setTestResult((r) => ({ ...r, email: { ok: false, msg: e.message || 'Send failed' } }));
    } finally {
      setTesting('');
    }
  };

  const byGroup = useMemo(() => {
    const m: Record<string, SettingField[]> = {};
    fields.forEach((f) => { (m[f.group] = m[f.group] || []).push(f); });
    return m;
  }, [fields]);

  // Unsaved-change count + configured count per module, for the nav badges.
  const stats = useMemo(() => {
    const m: Record<string, { dirty: number; set: number; total: number }> = {};
    groups.forEach((g) => { m[g.id] = { dirty: 0, set: 0, total: 0 }; });
    fields.forEach((f) => {
      const s = m[f.group]; if (!s) return;
      s.total += 1;
      if (dirty.has(f.key)) s.dirty += 1;
      if (f.source === 'ui' || f.source === 'tenant') s.set += 1;
    });
    return m;
  }, [fields, dirty, groups]);

  const isTenant = !!scope;
  const q = query.trim().toLowerCase();
  const matches = (f: SettingField) =>
    !q || f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || (f.help || '').toLowerCase().includes(q);

  // When searching → every group with a hit; otherwise just the active module.
  const visibleGroups = q
    ? groups.filter((g) => (byGroup[g.id] || []).some(matches))
    : groups.filter((g) => g.id === active);

  const renderField = (f: SettingField) => {
    const badge = SOURCE_BADGE[f.source];
    const placeholder = f.isSecret && f.isSet
      ? `${f.masked}  (leave blank to keep)`
      : (isTenant && f.inheritedMasked ? `Inherits: ${f.inheritedMasked}` : f.placeholder);
    const canClear =
      (f.isSecret && f.isSet && f.source === (isTenant ? 'tenant' : 'ui')) ||
      (!f.isSecret && f.source === (isTenant ? 'tenant' : 'ui'));
    return (
      <div className={`ps-field ${dirty.has(f.key) ? 'is-dirty' : ''}`} key={f.key}>
        <div className="ps-field-label">
          <label htmlFor={f.key}>{f.label}</label>
          <span className={`ps-badge ${badge.cls}`}>{badge.text}</span>
          <code className="ps-key">{f.key}</code>
        </div>
        <div className="ps-field-input">
          {f.type === 'select' ? (
            <select id={f.key} value={form[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)}>
              <option value="">{isTenant ? '(inherit)' : '(default)'}</option>
              {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              id={f.key}
              type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
              value={form[f.key] ?? ''}
              placeholder={placeholder}
              onChange={(e) => onChange(f.key, e.target.value)}
              autoComplete="off"
            />
          )}
          {canClear && (
            <button className="ps-clear" type="button" onClick={() => clearOverride(f.key)} title="Remove this value">
              Clear
            </button>
          )}
        </div>
        {f.help && <div className="ps-help">{f.help}</div>}
      </div>
    );
  };

  return (
    <div className="ps-wrap">
      {/* Sticky top bar: title + scope + save (no scrolling to save) */}
      <div className="ps-topbar">
        <div className="ps-title">
          <h1>⚙️ Platform Settings</h1>
          <p>Manage API keys, models and integrations here instead of the server <code>.env</code>. Values here override <code>.env</code> and take effect immediately.</p>
        </div>
        <div className="ps-topbar-actions">
          <div className="ps-scope">
            <button className={`ps-scope-btn ${!isTenant ? 'active' : ''}`} onClick={() => setScope('')}>🌐 Platform</button>
            <select className="ps-scope-sel" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">Tenant override…</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button className="ps-save" onClick={save} disabled={saving || dirty.size === 0}>
            {saving ? 'Saving…' : dirty.size > 0 ? `Save (${dirty.size})` : 'Saved'}
          </button>
        </div>
      </div>

      {isTenant && <div className="ps-scope-hint">Showing only per-tenant fields for this tenant. Blank = inherit from platform.</div>}
      {error && <div className="ps-error">{error}</div>}

      {loading ? (
        <div className="ps-loading">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="ps-loading">No settings in this scope.</div>
      ) : (
        <div className="ps-layout">
          {/* Left: module nav */}
          <aside className="ps-nav">
            <div className="ps-search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                placeholder="Search settings…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && <button className="ps-search-clear" onClick={() => setQuery('')} title="Clear">×</button>}
            </div>
            {groups.map((g) => {
              const s = stats[g.id] || { dirty: 0, set: 0, total: 0 };
              return (
                <button
                  key={g.id}
                  className={`ps-nav-item ${!q && g.id === active ? 'active' : ''}`}
                  onClick={() => { setActive(g.id); setQuery(''); }}
                >
                  <span className="ps-nav-ic">{g.icon}</span>
                  <span className="ps-nav-label">{g.label}</span>
                  {s.dirty > 0
                    ? <span className="ps-nav-dot" title={`${s.dirty} unsaved`} />
                    : <span className="ps-nav-count">{s.set}/{s.total}</span>}
                </button>
              );
            })}
            <div className="ps-nav-note">
              <i className="fa-solid fa-shield-halved" /> Secrets are encrypted at rest. <code>MONGODB_URI</code>, <code>JWT_SECRET</code> &amp; <code>ENCRYPTION_KEY</code> stay in <code>.env</code>.
            </div>
          </aside>

          {/* Right: only the active module (or search results) */}
          <main className="ps-panel">
            {visibleGroups.length === 0 && (
              <div className="ps-empty">No settings match “{query}”.</div>
            )}
            {visibleGroups.map((g) => {
              const groupFields = (byGroup[g.id] || []).filter(matches);
              return (
                <section className="ps-card" key={g.id}>
                  <div className="ps-card-head">
                    <span className="ps-card-ic">{g.icon}</span>
                    <div className="ps-card-title">
                      <h2>{g.label}</h2>
                      <p>{g.description}</p>
                    </div>
                    {g.id === 'ai' && !isTenant && (
                      <div className="ps-test-row">
                        <button className="ps-test" disabled={!!testing} onClick={() => runTest('anthropic')}>
                          {testing === 'anthropic' ? 'Testing…' : 'Test Anthropic'}
                        </button>
                        <button className="ps-test" disabled={!!testing} onClick={() => runTest('openai')}>
                          {testing === 'openai' ? 'Testing…' : 'Test OpenAI'}
                        </button>
                      </div>
                    )}
                  </div>

                  {g.id === 'ai' && (['anthropic', 'openai'] as const).map((p) =>
                    testResult[p] ? (
                      <div key={p} className={`ps-test-result ${testResult[p].ok ? 'ok' : 'bad'}`}>
                        <strong>{p}:</strong> {testResult[p].msg}
                      </div>
                    ) : null
                  )}

                  <div className="ps-fields">
                    {groupFields.map(renderField)}
                  </div>

                  {g.id === 'email' && (
                    <div className="ps-email-test">
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                      />
                      <button className="ps-test" disabled={testing === 'email'} onClick={sendTestEmail}>
                        {testing === 'email' ? 'Sending…' : '✉️ Send test email'}
                      </button>
                      {testResult.email && (
                        <span className={`ps-inline-result ${testResult.email.ok ? 'ok' : 'bad'}`}>{testResult.email.msg}</span>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </main>
        </div>
      )}

      {toast && <div className="ps-toast">{toast}</div>}
    </div>
  );
};

export default PlatformSettings;
