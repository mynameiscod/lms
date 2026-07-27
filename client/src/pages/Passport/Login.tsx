import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import PublicChrome from '../../components/PublicChrome';
import './careerpilot.css';

/**
 * Returning Career Passport member login. Two ways in:
 *  - Password (free): email/mobile + password (only after they've set one).
 *  - WhatsApp OTP (small cost): mobile → OTP → verify. Also the "forgot password" path.
 */
const PassportLogin: React.FC = () => {
  const [params] = useSearchParams();
  const tenant = params.get('tenant') || 'codebegun';

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [resendIn, setResendIn] = useState(25);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!otpStep) return;
    setResendIn(25);
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpStep, token]);

  const land = (r: { token: string; tenantId: string; user: any }) => {
    localStorage.setItem('token', r.token);
    localStorage.setItem('tenantId', r.tenantId);
    if (r.user) {
      localStorage.setItem('user', JSON.stringify({
        _id: r.user.id, tenantId: r.tenantId,
        email: r.user.email, firstName: r.user.firstName, lastName: r.user.lastName, role: r.user.role,
      }));
    }
    window.location.href = '/passport';
  };

  const doPassword = async () => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.loginPassword(tenant, identifier, password)); }
    catch (e: any) {
      const m = e?.response?.data;
      setMsg(m?.message || 'Login failed');
      if (m?.code === 'NO_PASSWORD') { setMode('otp'); setMobile(identifier.includes('@') ? '' : identifier); }
    }
    setBusy(false);
  };

  const startOtp = async () => {
    setBusy(true); setMsg('');
    try {
      const r = await passportPublicApi.loginOtp(tenant, mobile);
      setToken(r.token); setDevCode(r.otp?.devCode || ''); setOtpStep(true);
      setMsg(r.otp?.sent ? 'We sent a code to your WhatsApp.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Enter the code sent to you.'));
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Could not send code'); }
    setBusy(false);
  };

  const verifyOtp = async () => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.verify(token, code)); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Verification failed'); }
    setBusy(false);
  };

  const resend = async () => {
    setResendIn(25);
    try { const r = await passportPublicApi.loginOtp(tenant, mobile); setToken(r.token); setDevCode(r.otp?.devCode || ''); setMsg(r.otp?.sent ? 'New code sent.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Code resent.')); } catch { /* */ }
  };

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const arr = (code + '      ').slice(0, 6).split('');
    arr[i] = d || ' ';
    setCode(arr.join('').replace(/\s+$/, '').replace(/\s/g, ''));
    if (d && i < 5) boxRefs.current[i + 1]?.focus();
  };
  const onBoxKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) boxRefs.current[i - 1]?.focus();
  };

  // OTP entry — full-screen branded gradient (matches signup OTP).
  if (otpStep) return (
    <div className="otp-page">
      <div className="otp-top">
        <div className="otp-brand"><span className="mk">🧭</span><div><b>CareerPilot</b><small>Powered by CodeBegun</small></div></div>
        <button className="otp-change" onClick={() => { setOtpStep(false); setMsg(''); setCode(''); }}>← Back</button>
      </div>
      <div className="otp-mid">
        <div className="otp-card">
          <div className="otp-wa">🟢</div>
          <h1>Verify Your Number</h1>
          <div className="lead">We've sent a 6-digit code to your WhatsApp number</div>
          <div className="otp-num">+91 {mobile || '—'}<button onClick={() => { setOtpStep(false); setMsg(''); setCode(''); }}>✏️ Change</button></div>
          <div className="otp-hint">Enter the 6-digit code below</div>
          <div className="otp-boxes">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input key={i} ref={el => (boxRefs.current[i] = el)} className="otp-box" inputMode="numeric" maxLength={1}
                value={code[i] || ''} onChange={e => setDigit(i, e.target.value)} onKeyDown={e => onBoxKey(i, e)} onFocus={e => e.target.select()} />
            ))}
          </div>
          <div className="otp-resend">
            Didn't receive the code?{' '}
            {resendIn > 0 ? <>Resend code in <b>00:{String(resendIn).padStart(2, '0')}</b></> : <a onClick={resend}>Resend code</a>}
          </div>
          {devCode && <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 10 }}>Dev code: <b>{devCode}</b></div>}
          {msg && !msg.startsWith('We sent') && <div className="cp-err" style={{ marginBottom: 12 }}>{msg}</div>}
          <button className="otp-verify" disabled={busy || code.length < 6} onClick={verifyOtp}>{busy ? 'Verifying…' : 'Verify & Continue →'}</button>
        </div>
      </div>
    </div>
  );

  return (
    <PublicChrome>
      <div className="cp-page">
        <div className="cp-card" style={{ gridTemplateColumns: '1fr', maxWidth: 460 }}>
          <div className="cp-right" style={{ padding: '34px 32px' }}>
            <div className="cp-ric">🧭</div>
            <div className="cp-ftitle">Welcome back</div>
            <div className="cp-fsub">Log in to your Career Passport</div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 8, background: '#f1f3fa', borderRadius: 12, padding: 4, margin: '6px 0 18px' }}>
              {(['password', 'otp'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setMsg(''); }}
                  style={{ flex: 1, border: 'none', borderRadius: 9, padding: '9px 0', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#4f46e5' : '#64748b', boxShadow: mode === m ? '0 2px 8px rgba(15,23,42,.08)' : 'none' }}>
                  {m === 'password' ? '🔑 Password' : '💬 WhatsApp OTP'}
                </button>
              ))}
            </div>

            {mode === 'password' ? (
              <>
                <label className="cp-label">Email or Mobile</label>
                <div className="cp-field"><input className="cp-input" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@email.com or 10-digit mobile" onKeyDown={e => e.key === 'Enter' && doPassword()} /></div>
                <label className="cp-label">Password</label>
                <div className="cp-field"><input className="cp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" onKeyDown={e => e.key === 'Enter' && doPassword()} /></div>
                {msg && <div className="cp-err">{msg}</div>}
                <button className="cp-submit" disabled={busy || !identifier || !password} onClick={doPassword}>{busy ? 'Logging in…' : 'Log In →'}</button>
                <div className="cp-login" style={{ border: 'none', paddingTop: 12 }}>
                  Forgot password? <a onClick={() => { setMode('otp'); setMsg(''); }} style={{ cursor: 'pointer' }}>Log in with WhatsApp OTP</a>
                </div>
              </>
            ) : (
              <>
                <label className="cp-label">Registered Mobile Number</label>
                <div className="cp-field"><input className="cp-input" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Enter your 10-digit mobile" inputMode="numeric" onKeyDown={e => e.key === 'Enter' && startOtp()} /></div>
                {msg && <div className="cp-err">{msg}</div>}
                <button className="cp-submit" disabled={busy || !mobile} onClick={startOtp}>{busy ? 'Sending…' : 'Send WhatsApp Code →'}</button>
                <div className="cp-secure">💬 We’ll send a one-time code to your WhatsApp.</div>
              </>
            )}

            <div className="cp-login">New here? <a href={`/passport/join?tenant=${tenant}`}>Create your Career Passport</a></div>
          </div>
        </div>
      </div>
    </PublicChrome>
  );
};

export default PassportLogin;
