import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import type { OnboardingField } from '../../api/passportApi';

const wrap: React.CSSProperties = { minHeight: '100vh', background: 'linear-gradient(135deg,#6650d8,#14a89c)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };
const card: React.CSSProperties = { background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,.25)', width: '100%', maxWidth: 460, padding: '30px 32px' };
const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 };
const input: React.CSSProperties = { width: '100%', padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, marginBottom: 14 };
const btn: React.CSSProperties = { width: '100%', background: 'linear-gradient(90deg,#6650d8,#14a89c)', color: '#fff', border: 'none', borderRadius: 11, padding: '13px', fontWeight: 800, fontSize: 15, cursor: 'pointer' };

const PassportJoin: React.FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const tenant = params.get('tenant') || 'codebegun';

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [fieldsDef, setFieldsDef] = useState<OnboardingField[]>([]);
  const [priceInr, setPriceInr] = useState(499);
  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState<Record<string, any>>({});
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try { const c = await passportPublicApi.getConfig(tenant); setFieldsDef(c.onboardingFields || []); setPriceInr(c.priceInr); setEnabled(c.enabled); }
      catch { setEnabled(false); setMsg('Career Passport is not available right now.'); }
    })();
  }, [tenant]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const extra = fieldsDef.filter(f => !['name', 'mobile', 'email'].includes(f.key));

  const submit = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await passportPublicApi.signup({
        tenant, name: form.name || '', mobile: form.mobile || '', email: form.email || '',
        fields: extra.reduce((o, f) => ({ ...o, [f.key]: form[f.key] }), {}),
      });
      setToken(r.token); setDevCode(r.otp?.devCode || ''); setStep('otp');
      setMsg(r.otp?.sent ? 'We sent a code to your WhatsApp.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Enter the code sent to you.'));
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Signup failed'); }
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await passportPublicApi.verify(token, code);
      localStorage.setItem('token', r.token);
      localStorage.setItem('tenantId', r.tenantId);
      nav('/passport');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Verification failed'); }
    setBusy(false);
  };

  const resend = async () => {
    try { const r = await passportPublicApi.resend(token); setDevCode(r.otp?.devCode || ''); setMsg(r.otp?.sent ? 'New code sent.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Code resent.')); } catch { /* ignore */ }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 30 }}>🎫</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>CodeBegun Career Passport</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>Your college-to-career system. Start with a free Career Readiness check.</p>
        </div>

        {!enabled ? (
          <div style={{ textAlign: 'center', color: '#dc2626', fontSize: 14, padding: 20 }}>{msg || 'Not available yet.'}</div>
        ) : step === 'form' ? (
          <>
            <span style={label}>Full Name *</span>
            <input style={input} value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Your name" />
            <span style={label}>Mobile *</span>
            <input style={input} value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" inputMode="numeric" />
            <span style={label}>Email *</span>
            <input style={input} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="you@email.com" type="email" />
            {extra.map(f => (
              <div key={f.key}>
                <span style={label}>{f.label}{f.required ? ' *' : ''}</span>
                {f.type === 'select' ? (
                  <select style={input} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
                    <option value="">Select…</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input style={input} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} type={f.type === 'number' ? 'number' : 'text'} />
                )}
              </div>
            ))}
            {msg && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{msg}</div>}
            <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{busy ? 'Please wait…' : 'Create my Career Passport'}</button>
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>Free to start · Membership ₹{priceInr}/year unlocks the full journey.</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: '#475569', textAlign: 'center', marginBottom: 14 }}>{msg || 'Enter the verification code.'}</p>
            <span style={label}>Verification code</span>
            <input style={{ ...input, textAlign: 'center', letterSpacing: 6, fontSize: 20, fontWeight: 700 }} value={code} onChange={e => setCode(e.target.value)} placeholder="••••" inputMode="numeric" />
            {devCode && <div style={{ fontSize: 12, color: '#7c3aed', textAlign: 'center', marginBottom: 10 }}>Dev code: <b>{devCode}</b></div>}
            <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={verify}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={resend} style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Resend code</button>
              <span style={{ color: '#cbd5e1' }}> · </span>
              <button onClick={() => { setStep('form'); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>Edit details</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PassportJoin;
