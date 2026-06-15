import React, { useEffect, useMemo, useState } from 'react';
import { systemSettingsApi, SettingField, SettingGroup } from '../../api/systemSettingsApi';
import './PlatformSettings.css';

const SOURCE_BADGE: Record<string, { text: string; cls: string }> = {
  ui:    { text: 'Set in UI',   cls: 'src-ui' },
  env:   { text: 'From .env',   cls: 'src-env' },
  unset: { text: 'Not set',     cls: 'src-unset' },
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

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await systemSettingsApi.get();
      setGroups(data.groups);
      setFields(data.settings);
      const init: Record<string, string> = {};
      data.settings.forEach((f) => { init[f.key] = f.isSecret ? '' : (f.value || ''); });
      setForm(init);
      setDirty(new Set());
    } catch (e: any) {
      setError(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty((d) => new Set(d).add(key));
  };

  const clearSecret = (key: string) => {
    setForm((f) => ({ ...f, [key]: '' }));
    setDirty((d) => new Set(d).add(key));
  };

  const save = async () => {
    if (dirty.size === 0) { setToast('No changes to save'); setTimeout(() => setToast(''), 2000); return; }
    setSaving(true);
    setError('');
    try {
      const entries = [...dirty].map((key) => ({ key, value: form[key] ?? '' }));
      await systemSettingsApi.update(entries);
      setToast('✓ Settings saved');
      setTimeout(() => setToast(''), 2500);
      await load();
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

  const byGroup = useMemo(() => {
    const m: Record<string, SettingField[]> = {};
    fields.forEach((f) => { (m[f.group] = m[f.group] || []).push(f); });
    return m;
  }, [fields]);

  if (loading) return <div className="ps-wrap"><div className="ps-loading">Loading platform settings…</div></div>;

  return (
    <div className="ps-wrap">
      <div className="ps-head">
        <div>
          <h1>⚙️ Platform Settings</h1>
          <p>Manage API keys, models and integrations here instead of the server <code>.env</code> file. Values set here override <code>.env</code> and take effect immediately.</p>
        </div>
        <button className="ps-save" onClick={save} disabled={saving || dirty.size === 0}>
          {saving ? 'Saving…' : dirty.size > 0 ? `Save Changes (${dirty.size})` : 'Saved'}
        </button>
      </div>

      <div className="ps-note">
        <i className="fa-solid fa-shield-halved" /> Secrets are encrypted at rest. A few bootstrap keys
        (<code>MONGODB_URI</code>, <code>JWT_SECRET</code>, <code>ENCRYPTION_KEY</code>) must remain in <code>.env</code>.
      </div>

      {error && <div className="ps-error">{error}</div>}
      {toast && <div className="ps-toast">{toast}</div>}

      {groups.map((g) => (
        <div className="ps-card" key={g.id}>
          <div className="ps-card-head">
            <span className="ps-card-ic">{g.icon}</span>
            <div>
              <h2>{g.label}</h2>
              <p>{g.description}</p>
            </div>
            {g.id === 'ai' && (
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
            {(byGroup[g.id] || []).map((f) => {
              const badge = SOURCE_BADGE[f.source];
              return (
                <div className="ps-field" key={f.key}>
                  <div className="ps-field-label">
                    <label htmlFor={f.key}>{f.label}</label>
                    <span className={`ps-badge ${badge.cls}`}>{badge.text}</span>
                    <code className="ps-key">{f.key}</code>
                  </div>
                  <div className="ps-field-input">
                    <input
                      id={f.key}
                      type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                      value={form[f.key] ?? ''}
                      placeholder={f.isSecret && f.isSet ? `${f.masked}  (leave blank to keep)` : f.placeholder}
                      onChange={(e) => onChange(f.key, e.target.value)}
                      autoComplete="off"
                    />
                    {f.isSecret && f.isSet && f.source === 'ui' && (
                      <button className="ps-clear" type="button" onClick={() => clearSecret(f.key)} title="Remove saved value (revert to .env)">
                        Clear
                      </button>
                    )}
                  </div>
                  {f.help && <div className="ps-help">{f.help}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="ps-foot">
        <button className="ps-save" onClick={save} disabled={saving || dirty.size === 0}>
          {saving ? 'Saving…' : dirty.size > 0 ? `Save Changes (${dirty.size})` : 'Saved'}
        </button>
      </div>
    </div>
  );
};

export default PlatformSettings;
