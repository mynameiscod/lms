import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import type { OnboardingField } from '../../api/passportApi';
import PublicChrome from '../../components/PublicChrome';
import './careerpilot.css';

const FEATURES: [string, string][] = [
  ['🎯', 'Career Readiness Assessment'], ['🗺️', 'Personalized Roadmap'], ['📋', 'Daily Missions & Challenges'],
  ['🤖', 'AI Mock Interviews'], ['📄', 'Resume Builder'], ['🎫', 'Career Passport'],
];
const STATS: [string, string][] = [['12,000+', 'Students'], ['500+', 'Colleges'], ['98%', 'Satisfaction'], ['45', 'Career Paths']];
const ICON: Record<string, string> = { name: '👤', mobile: '📞', email: '✉️' };

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

  // OTP verification step
  if (enabled && step === 'otp') return (
    <PublicChrome>
      <div className="cp-page"><div style={{ maxWidth: 460, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 20px 50px rgba(15,23,42,.1)', padding: 30, textAlign: 'center' }}>
        <div className="cp-ric">🔐</div>
        <div className="cp-ftitle">Verify your number</div>
        <div className="cp-fsub">{msg || 'Enter the code we sent you.'}</div>
        <input className="cp-otp" value={code} maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" inputMode="numeric" />
        {devCode && <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 8 }}>Dev code: <b>{devCode}</b></div>}
        <button className="cp-submit" disabled={busy || code.length < 4} onClick={verify}>{busy ? 'Verifying…' : 'Verify & continue →'}</button>
        <div style={{ marginTop: 14, fontSize: 13 }}>
          <button onClick={resend} style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>Resend code</button>
          <span style={{ color: '#cbd5e1' }}> · </span>
          <button onClick={() => { setStep('form'); setMsg(''); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Edit details</button>
        </div>
      </div></div>
    </PublicChrome>
  );

  return (
    <PublicChrome>
      <div className="cp-page">
        <div className="cp-card">
          {/* Left hero */}
          <div className="cp-left">
            <div className="cp-brand">
              <span className="mark">🧭</span>
              <div><b>CareerPilot</b><small>Powered by <a href="https://www.codebegun.com">CodeBegun</a></small></div>
            </div>
            <span className="cp-badge">🎁 Founding Membership at <b>₹{priceInr} for 12 Months</b></span>
            <h1 className="cp-h1">Your Personal Guide from College to <span className="t">Career Success</span></h1>
            <p className="cp-sub">Assess your skills, get a personalized roadmap, complete daily missions and build your Career Passport.</p>
            <div className="cp-feats">
              {FEATURES.map(([ic, label]) => (
                <div className="cp-feat" key={label}><div className="fi">{ic}</div><b>{label}</b></div>
              ))}
            </div>
            <div className="cp-testi">
              <div className="av">🧑‍🎓</div>
              <div>
                <div className="stars">★★★★★</div>
                <q>CareerPilot showed me what to do every day. From confused to placement-ready in 90 days!</q>
                <div className="nm">Rahul Verma</div><div className="rl">B.Tech CSE, 4th Year</div>
              </div>
            </div>
            <div className="cp-stats">
              {STATS.map(([b, s]) => <div className="st" key={s}><b>{b}</b><span>{s}</span></div>)}
            </div>
          </div>

          {/* Right form */}
          <div className="cp-right">
            <div className="cp-ric">🪪</div>
            <div className="cp-ftitle">Create Your Career Passport</div>
            <div className="cp-fsub">Start your career transformation journey today</div>

            {!enabled ? (
              <div className="cp-err" style={{ textAlign: 'center' }}>{msg || 'Career Passport is not available right now.'}</div>
            ) : (
              <>
                <label className="cp-label">Full Name *</label>
                <div className="cp-field"><input className="cp-input" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Enter your full name" /><span className="ic">{ICON.name}</span></div>
                <label className="cp-label">Mobile Number *</label>
                <div className="cp-field"><input className="cp-input" value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} placeholder="Enter 10-digit mobile number" inputMode="numeric" /><span className="ic">{ICON.mobile}</span></div>
                <label className="cp-label">Email Address *</label>
                <div className="cp-field"><input className="cp-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="Enter your email address" /><span className="ic">{ICON.email}</span></div>

                {extra.map(f => (
                  <div key={f.key}>
                    <label className="cp-label">{f.label}{f.required ? ' *' : ''}</label>
                    <div className="cp-field">
                      {f.type === 'select'
                        ? <select className="cp-select" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}><option value="">Select…</option>{(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
                        : <input className="cp-input" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} type={f.type === 'number' ? 'number' : 'text'} placeholder={`Enter ${f.label.toLowerCase()}`} />}
                      <span className="ic">▾</span>
                    </div>
                  </div>
                ))}

                {msg && <div className="cp-err">{msg}</div>}
                <button className="cp-submit" disabled={busy || !form.name || !form.mobile || !form.email} onClick={submit}>{busy ? 'Please wait…' : 'Create My Career Passport →'}</button>
                <div className="cp-secure">🛡️ Your data is safe and secure with us</div>
                <div className="cp-login">Already have an account? <a href="/login">Login here</a></div>
              </>
            )}
          </div>
        </div>
      </div>
    </PublicChrome>
  );
};

export default PassportJoin;
