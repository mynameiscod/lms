import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [resendIn, setResendIn] = useState(25);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    (async () => {
      try { const c = await passportPublicApi.getConfig(tenant); setFieldsDef(c.onboardingFields || []); setPriceInr(c.priceInr); setEnabled(c.enabled); }
      catch { setEnabled(false); setMsg('Career Passport is not available right now.'); }
    })();
  }, [tenant]);

  // Resend countdown while on the OTP step.
  useEffect(() => {
    if (step !== 'otp') return;
    setResendIn(25);
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step, token]);

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const arr = (code + '      ').slice(0, 6).split('');
    arr[i] = d || ' ';
    const next = arr.join('').replace(/\s+$/, '');
    setCode(next.replace(/\s/g, ''));
    if (d && i < 5) boxRefs.current[i + 1]?.focus();
  };
  const onBoxKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxRefs.current[i - 1]?.focus();
  };

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
      // Full page load so the auth context re-initializes from the new token — a
      // client-side nav would hit the protected route before the context knows we're
      // logged in and bounce to /login.
      window.location.href = '/passport';
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Verification failed'); }
    setBusy(false);
  };

  const resend = async () => {
    setResendIn(25);
    try { const r = await passportPublicApi.resend(token); setDevCode(r.otp?.devCode || ''); setMsg(r.otp?.sent ? 'New code sent.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Code resent.')); } catch { /* ignore */ }
  };

  // OTP verification step — full-screen branded gradient (matches CareerPilot mockup).
  if (enabled && step === 'otp') return (
    <div className="otp-page">
      <div className="otp-top">
        <div className="otp-brand"><span className="mk">🧭</span><div><b>CareerPilot</b><small>Powered by CodeBegun</small></div></div>
        <button className="otp-change" onClick={() => { setStep('form'); setMsg(''); setCode(''); }}>← Change Number</button>
      </div>

      <div className="otp-mid">
        <div className="otp-card">
          <div className="otp-wa">🟢</div>
          <h1>Verify Your Number</h1>
          <div className="lead">We've sent a 6-digit verification code to your WhatsApp number</div>
          <div className="otp-num">+91 {form.mobile || '—'}<button onClick={() => { setStep('form'); setMsg(''); setCode(''); }}>✏️ Change</button></div>
          <div className="otp-hint">Enter the 6-digit code below</div>
          <div className="otp-boxes">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input key={i} ref={el => (boxRefs.current[i] = el)} className="otp-box" inputMode="numeric" maxLength={1}
                value={code[i] || ''} onChange={e => setDigit(i, e.target.value)} onKeyDown={e => onBoxKey(i, e)}
                onFocus={e => e.target.select()} />
            ))}
          </div>
          <div className="otp-resend">
            Didn't receive the code?{' '}
            {resendIn > 0
              ? <>Resend code in <b>00:{String(resendIn).padStart(2, '0')}</b></>
              : <a onClick={resend}>Resend code</a>}
          </div>
          {devCode && <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 10 }}>Dev code: <b>{devCode}</b></div>}
          {msg && !msg.startsWith('We sent') && <div className="cp-err" style={{ marginBottom: 12 }}>{msg}</div>}
          <button className="otp-verify" disabled={busy || code.length < 6} onClick={verify}>{busy ? 'Verifying…' : 'Verify & Continue →'}</button>
        </div>
      </div>

      <div className="otp-banner">
        <span className="sh">🛡️</span>
        <div><b>Your account is protected</b><p>We never share your number with anyone.</p></div>
        <span className="lock">🔒</span>
      </div>
    </div>
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
