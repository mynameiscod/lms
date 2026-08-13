import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import AuthSplit, { FormMark } from './AuthSplit';
import OtpVerify from './OtpVerify';
import './careerpilot.css';

/**
 * Returning CareerPilot member login. Two ways in:
 *  - Password: email/mobile + password (only once they've set one).
 *  - WhatsApp OTP: mobile → OTP → verify. Also the "forgot password" path, which is why
 *    the forgot link switches tabs rather than going somewhere else — there is no reset
 *    email to send, and the OTP already proves they hold the number.
 */

/** Where a remembered identifier lives. Only the identifier — never the password. */
const REMEMBER_KEY = 'cp.login.identifier';

const PassportLogin: React.FC = () => {
  const [params] = useSearchParams();
  const tenant = params.get('tenant') || 'codebegun';

  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [mobile, setMobile] = useState('');
  const [token, setToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  /** Status vs failure: both arrive on `msg`, so one place decides which it is. */
  const sentMsg = (m: string) => m.startsWith('We sent') || m.startsWith('New code');
  const [resendIn, setResendIn] = useState(25);

  // Show why they were sent here, if anything was left for us.
  //
  // The 401 handler stores "Your session has expired" (or the deactivated-account
  // notice) before bouncing. Read once, then clear, so it cannot reappear later.
  useEffect(() => {
    const stored = localStorage.getItem('loginMessage');
    if (stored) { setMsg(stored); localStorage.removeItem('loginMessage'); }
  }, []);

  // Prefill whoever logged in last on this device. The password is never stored —
  // "remember me" remembers who you are, not how to prove it.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setIdentifier(saved); setRemember(true); }
  }, []);

  useEffect(() => {
    if (!otpStep) return;
    setResendIn(25);
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [otpStep, token]);

  const land = (r: { token: string; tenantId: string; user: any }) => {
    if (remember && identifier) localStorage.setItem(REMEMBER_KEY, identifier);
    else localStorage.removeItem(REMEMBER_KEY);

    localStorage.setItem('token', r.token);
    localStorage.setItem('tenantId', r.tenantId);
    if (r.user) {
      localStorage.setItem('user', JSON.stringify({
        _id: r.user.id, tenantId: r.tenantId,
        email: r.user.email, firstName: r.user.firstName, lastName: r.user.lastName, role: r.user.role,
      }));
    }
    // Full page load so the auth context re-initialises from the stored token — a
    // client-side nav would hit the protected route before the context knows we are in.
    window.location.href = '/careerpilot';
  };

  const doPassword = async () => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.loginPassword(tenant, identifier, password)); }
    catch (e: any) {
      const m = e?.response?.data;
      setMsg(m?.message || 'Login failed');
      // No password set yet: send them down the OTP path rather than leaving them stuck
      // on a form they can never satisfy.
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

  const verifyOtp = async (code: string) => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.verify(token, code)); }
    catch (e: any) { setMsg(e?.response?.data?.message || 'Verification failed'); }
    setBusy(false);
  };

  const resend = async () => {
    setResendIn(25);
    try {
      const r = await passportPublicApi.loginOtp(tenant, mobile);
      setToken(r.token); setDevCode(r.otp?.devCode || '');
      setMsg(r.otp?.sent ? 'New code sent.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Code resent.'));
    } catch { /* the countdown already tells them to try again */ }
  };


  // ── OTP entry — the shared full-page screen ──
  if (otpStep) return (
    <OtpVerify
      mobile={mobile}
      busy={busy}
      resendIn={resendIn}
      devCode={devCode}
      error={msg && !sentMsg(msg) ? msg : ''}
      message={sentMsg(msg) ? msg : ''}
      onVerify={verifyOtp}
      onResend={resend}
      onBack={() => { setOtpStep(false); setMsg(''); }}
    />
  );

  const sent = msg.startsWith('We sent') || msg.startsWith('New code');

  return (
    <AuthSplit>
      <FormMark />
      <h1 className="as-h2">Welcome back! 👋</h1>
      <p className="as-sub">Login to continue your learning journey</p>

      <div className="as-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'password'}
          className={`as-tab${mode === 'password' ? ' on' : ''}`}
          onClick={() => { setMode('password'); setMsg(''); }}>
          <i className="bi bi-lock-fill" aria-hidden="true" /> Password
        </button>
        <button role="tab" aria-selected={mode === 'otp'}
          className={`as-tab${mode === 'otp' ? ' on' : ''}`}
          onClick={() => { setMode('otp'); setMsg(''); }}>
          <i className="bi bi-whatsapp" aria-hidden="true" /> WhatsApp OTP
        </button>
      </div>

      {msg && <div className={`as-msg ${sent ? 'ok' : 'err'}`}>{msg}</div>}

      {mode === 'password' ? (
        <>
          <label className="as-lab" htmlFor="cp-id">Email or Mobile</label>
          <div className="as-in">
            <span className="lic" aria-hidden="true"><i className="bi bi-envelope-fill" /></span>
            <input id="cp-id" value={identifier} autoComplete="username"
              onChange={e => setIdentifier(e.target.value)}
              placeholder="you@email.com or 10-digit mobile"
              onKeyDown={e => e.key === 'Enter' && identifier && password && doPassword()} />
          </div>

          <label className="as-lab" htmlFor="cp-pw">Password</label>
          <div className="as-in">
            <span className="lic" aria-hidden="true"><i className="bi bi-lock-fill" /></span>
            <input id="cp-pw" type={showPw ? 'text' : 'password'} value={password}
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={e => e.key === 'Enter' && identifier && password && doPassword()} />
            <button type="button" className="as-eye" onClick={() => setShowPw(s => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              <i className={showPw ? 'bi bi-eye-slash' : 'bi bi-eye'} />
            </button>
          </div>

          <div className="as-row">
            <label className="as-check">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Remember me
            </label>
            {/* There is no reset email to send — the OTP already proves they hold the
                number, so "forgot password" is the OTP tab. */}
            <button type="button" className="as-link"
              onClick={() => { setMode('otp'); setMsg(''); setMobile(identifier.includes('@') ? '' : identifier); }}>
              Forgot password?
            </button>
          </div>

          <button className="as-go" disabled={busy || !identifier || !password} onClick={doPassword}>
            {busy ? 'Logging in…' : 'Log In →'}
          </button>
        </>
      ) : (
        <>
          <label className="as-lab" htmlFor="cp-mob">Registered Mobile Number</label>
          <div className="as-in">
            <span className="lic" aria-hidden="true"><i className="bi bi-phone-fill" /></span>
            <input id="cp-mob" value={mobile} inputMode="numeric" autoComplete="tel"
              onChange={e => setMobile(e.target.value)}
              placeholder="Enter your 10-digit mobile"
              onKeyDown={e => e.key === 'Enter' && mobile && startOtp()} />
          </div>

          <div className="as-row">
            <label className="as-check">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              Remember me
            </label>
            <button type="button" className="as-link" onClick={() => { setMode('password'); setMsg(''); }}>
              Use password instead
            </button>
          </div>

          <button className="as-go" disabled={busy || !mobile} onClick={startOtp}>
            {busy ? 'Sending…' : 'Send WhatsApp Code →'}
          </button>
        </>
      )}

      <div className="as-or">or</div>

      <button className="as-alt" onClick={() => { setMode(mode === 'password' ? 'otp' : 'password'); setMsg(''); }}>
        <i className={mode === 'password' ? 'bi bi-whatsapp' : 'bi bi-lock-fill'} aria-hidden="true" />
        {mode === 'password' ? 'Continue with WhatsApp OTP' : 'Continue with Password'}
      </button>

      <div className="as-foot">
        New here? <a href={`/careerpilot/join?tenant=${tenant}`}>Create your CareerPilot account</a>
      </div>
    </AuthSplit>
  );
};

export default PassportLogin;
