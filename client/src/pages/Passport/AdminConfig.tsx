import React, { useEffect, useState } from 'react';
import passportApi, { PassportConfig } from '../../api/passportApi';

const card: React.CSSProperties = { background: '#fff', border: '1px solid #eef1f6', borderRadius: 14, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(16,24,40,.04)' };
const h: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' };
const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 5 };
const input: React.CSSProperties = { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: 13.5, background: '#fff' };

const PassportAdminConfig: React.FC = () => {
  const [cfg, setCfg] = useState<PassportConfig | null>(null);
  const [platformEnabled, setPlatformEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await passportApi.getConfig(); setCfg(r.config); setPlatformEnabled(r.platformEnabled); } catch (e: any) { setMsg(e?.response?.data?.message || 'Failed to load'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!cfg) return;
    setSaving(true); setMsg('');
    try {
      const saved = await passportApi.updateConfig({
        enabled: cfg.enabled, assessmentMode: cfg.assessmentMode, priceInr: cfg.priceInr,
        membershipMonths: cfg.membershipMonths, entitlements: cfg.entitlements, onboardingFields: cfg.onboardingFields,
      });
      setCfg(saved); setMsg('✅ Saved.');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!cfg) return <div style={{ padding: 28, color: '#dc2626' }}>{msg || 'No config'}</div>;

  const setEnt = (i: number, tier: 'free' | 'paid') => setCfg({ ...cfg, entitlements: cfg.entitlements.map((e, j) => j === i ? { ...e, tier } : e) });
  const setField = (i: number, patch: any) => setCfg({ ...cfg, onboardingFields: cfg.onboardingFields.map((f, j) => j === i ? { ...f, ...patch } : f) });

  return (
    <div style={{ padding: '22px 26px', maxWidth: 900 }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Career Passport <span style={{ color: '#cbd5e1' }}>›</span> <b style={{ color: '#334155' }}>Config</b></div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Career Passport — Configuration</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 18px' }}>Set up the whole Passport product here. Changes apply without a deploy.</p>

      {!platformEnabled && (
        <div style={{ ...card, background: '#fffbeb', borderColor: '#fde68a' }}>
          ⚠️ <b>PASSPORT_ENABLED</b> is off in Platform Settings → Other Integrations. Even with the switch below on, the student experience stays hidden until you enable it there. (This is the master kill-switch.)
        </div>
      )}

      <div style={card}>
        <div style={h}>Product</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} /> Enable Passport for this tenant
          </label>
          <div><span style={label}>Price (₹)</span><input style={{ ...input, width: 110 }} type="number" value={cfg.priceInr} onChange={e => setCfg({ ...cfg, priceInr: Number(e.target.value) })} /></div>
          <div><span style={label}>Membership (months)</span><input style={{ ...input, width: 110 }} type="number" value={cfg.membershipMonths} onChange={e => setCfg({ ...cfg, membershipMonths: Number(e.target.value) })} /></div>
          <div><span style={label}>Free assessment engine</span>
            <select style={{ ...input, minWidth: 200 }} value={cfg.assessmentMode} onChange={e => setCfg({ ...cfg, assessmentMode: e.target.value as any })}>
              <option value="deterministic">Deterministic (no AI — cheap, scales)</option>
              <option value="ai">AI (rich, costs tokens)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={h}>Free vs Paid (entitlements)</div>
        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 12px' }}>Decide which features are free (to convert) and which unlock with the ₹{cfg.priceInr} membership.</p>
        {cfg.entitlements.map((e, i) => (
          <div key={e.featureKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #f5f7fa' }}>
            <span style={{ fontSize: 13.5, color: '#334155' }}>{e.label}</span>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
              {(['free', 'paid'] as const).map(t => (
                <button key={t} onClick={() => setEnt(i, t)} style={{ border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', background: e.tier === t ? (t === 'free' ? '#16a34a' : '#4f46e5') : 'transparent', color: e.tier === t ? '#fff' : '#64748b' }}>{t}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={h}>Onboarding fields</div>
        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 12px' }}>Name / Mobile / Email are locked-mandatory. Toggle the rest.</p>
        {cfg.onboardingFields.map((f, i) => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid #f5f7fa' }}>
            <span style={{ fontSize: 13.5, color: '#334155' }}>{f.label} <span style={{ color: '#94a3b8', fontSize: 12 }}>({f.type})</span></span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: f.locked ? '#94a3b8' : '#475569' }}>
              <input type="checkbox" disabled={f.locked} checked={f.required} onChange={e => setField(i, { required: e.target.checked })} /> Required {f.locked && '🔒'}
            </label>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save changes'}</button>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{msg}</span>}
      </div>
    </div>
  );
};

export default PassportAdminConfig;
