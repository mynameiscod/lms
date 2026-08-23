import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import OtpVerify from './OtpVerify';
import './careerpilot.css';
import './careerpilotLogin.css';

/**
 * Returning CareerPilot member login. Two ways in:
 *  - Password: email/mobile + password (only once they've set one).
 *  - WhatsApp OTP: mobile → OTP → verify. Also the "forgot password" path.
 */

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
  const sentMsg = (m: string) => m.startsWith('We sent') || m.startsWith('New code');
  const [resendIn, setResendIn] = useState(25);

  useEffect(() => {
    const stored = localStorage.getItem('loginMessage');
    if (stored) { setMsg(stored); localStorage.removeItem('loginMessage'); }
  }, []);

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

  const land = (r: { token: string; tenantId: string; user: any; onboardingCompleted?: boolean }) => {
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
    window.location.href = r.onboardingCompleted ? '/careerpilot' : '/careerpilot/setup';
  };

  const doPassword = async () => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.loginPassword(tenant, identifier, password)); }
    catch (e: any) {
      const m = e?.response?.data;
      setMsg(m?.message || 'Login failed');
      if (m?.code === 'NO_PASSWORD') {
        setMode('otp');
        setMobile(identifier.includes('@') ? '' : identifier);
      }
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
    } catch { /* countdown already guides retry */ }
  };

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
    <main className="cpl-page">
      <section className="cpl-marketing" aria-label="CareerPilot overview">
        <div className="cpl-brand">
          <div className="cpl-brand-mark">CP</div>
          <div>
            <div className="cpl-brand-name">Career<span>Pilot</span></div>
            <div className="cpl-by">by <strong>CodeBegun</strong></div>
          </div>
        </div>

        <div className="cpl-eyebrow">AI powered · Career intelligence · Real progress</div>

        <div className="cpl-copy">
          <h1>Your career journey<br />starts <span>here.</span></h1>
          <p>Assess. Learn. Practice. Grow. CareerPilot helps you understand your strengths, build the right skills and follow a clearer path toward your career goal.</p>
        </div>

        <div className="cpl-stage" aria-hidden="true">
          <div className="cpl-feature-stack">
            <div className="cpl-feature"><div className="cpl-feature-ic"><i className="bi bi-diagram-3-fill" /></div><div><b>Skill DNA</b><span>Understand your strengths and technical profile.</span></div></div>
            <div className="cpl-feature"><div className="cpl-feature-ic"><i className="bi bi-graph-up-arrow" /></div><div><b>Career Readiness</b><span>Track progress toward your target role.</span></div></div>
            <div className="cpl-feature"><div className="cpl-feature-ic"><i className="bi bi-map-fill" /></div><div><b>Personalized Roadmap</b><span>Know what to learn and practice next.</span></div></div>
          </div>

          <img
            className="cpl-student"
            src="/assets/careerpilot/careerpilot-hero-student.png"
            alt=""
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="cpl-path" />

          <div className="cpl-readiness">
            <small>CAREER READINESS PREVIEW</small>
            <div className="cpl-score">
              <div className="cpl-ring"><strong>72%</strong></div>
              <span>See where you stand and what to improve next.</span>
            </div>
          </div>

          <div className="cpl-progress">
            <h4>Your Progress</h4>
            <div className="cpl-prog"><div className="cpl-prog-top"><span>Assessments</span><b>Progress</b></div><div className="cpl-bar"><span style={{ width: '78%' }} /></div></div>
            <div className="cpl-prog"><div className="cpl-prog-top"><span>Skills</span><b>Growing</b></div><div className="cpl-bar"><span style={{ width: '66%' }} /></div></div>
            <div className="cpl-prog"><div className="cpl-prog-top"><span>Practice</span><b>Active</b></div><div className="cpl-bar"><span style={{ width: '58%' }} /></div></div>
          </div>
        </div>

        <div className="cpl-trust">
          <div><i className="bi bi-shield-check" /><span><strong>Secure</strong>Your data stays protected</span></div>
          <div><i className="bi bi-person-check-fill" /><span><strong>Personalized</strong>Built around your goals</span></div>
          <div><i className="bi bi-lightning-charge-fill" /><span><strong>Actionable</strong>Know your next step</span></div>
        </div>
      </section>

      <section className="cpl-login-side">
        <div className="cpl-form-wrap">
          <div className="cpl-safe"><span><i className="bi bi-shield-check" /> Your data is safe & secure</span></div>

          <h2>Welcome back!</h2>
          <p className="cpl-sub">Login to continue your CareerPilot journey.</p>

          <div className="cpl-tabs" role="tablist" aria-label="Login method">
            <button role="tab" aria-selected={mode === 'password'} className={`cpl-tab${mode === 'password' ? ' on' : ''}`} onClick={() => { setMode('password'); setMsg(''); }}>
              <i className="bi bi-lock-fill" /> Password
            </button>
            <button role="tab" aria-selected={mode === 'otp'} className={`cpl-tab${mode === 'otp' ? ' on' : ''}`} onClick={() => { setMode('otp'); setMsg(''); }}>
              <i className="bi bi-whatsapp" /> WhatsApp OTP
            </button>
          </div>

          {msg && <div className={`cpl-msg ${sent ? 'ok' : 'err'}`}>{msg}</div>}

          {mode === 'password' ? (
            <>
              <label className="cpl-label" htmlFor="cp-id">Email or Mobile</label>
              <div className="cpl-input">
                <span className="left"><i className="bi bi-envelope" /></span>
                <input id="cp-id" value={identifier} autoComplete="username" onChange={e => setIdentifier(e.target.value)} placeholder="you@email.com or 10-digit mobile" onKeyDown={e => e.key === 'Enter' && identifier && password && doPassword()} />
              </div>

              <label className="cpl-label" htmlFor="cp-pw">Password</label>
              <div className="cpl-input">
                <span className="left"><i className="bi bi-lock" /></span>
                <input id="cp-pw" type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" onChange={e => setPassword(e.target.value)} placeholder="Enter your password" onKeyDown={e => e.key === 'Enter' && identifier && password && doPassword()} />
                <button type="button" className="cpl-eye" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}><i className={showPw ? 'bi bi-eye-slash' : 'bi bi-eye'} /></button>
              </div>

              <div className="cpl-row">
                <label className="cpl-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
                <button type="button" className="cpl-link" onClick={() => { setMode('otp'); setMsg(''); setMobile(identifier.includes('@') ? '' : identifier); }}>Forgot password?</button>
              </div>

              <button className="cpl-go" disabled={busy || !identifier || !password} onClick={doPassword}>{busy ? 'Logging in…' : 'Continue →'}</button>
            </>
          ) : (
            <>
              <label className="cpl-label" htmlFor="cp-mob">Registered Mobile Number</label>
              <div className="cpl-input">
                <span className="left"><i className="bi bi-phone" /></span>
                <input id="cp-mob" value={mobile} inputMode="numeric" autoComplete="tel" onChange={e => setMobile(e.target.value)} placeholder="Enter your 10-digit mobile" onKeyDown={e => e.key === 'Enter' && mobile && startOtp()} />
              </div>

              <div className="cpl-row">
                <label className="cpl-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me</label>
                <button type="button" className="cpl-link" onClick={() => { setMode('password'); setMsg(''); }}>Use password instead</button>
              </div>

              <button className="cpl-go" disabled={busy || !mobile} onClick={startOtp}>{busy ? 'Sending…' : 'Send WhatsApp Code →'}</button>
            </>
          )}

          <button className="cpl-switch" type="button" onClick={() => { setMode(mode === 'password' ? 'otp' : 'password'); setMsg(''); }}>
            <i className={mode === 'password' ? 'bi bi-whatsapp' : 'bi bi-lock-fill'} /> {mode === 'password' ? 'Continue with WhatsApp OTP' : 'Continue with Password'}
          </button>

          <div className="cpl-security">
            <i className="bi bi-shield-check" />
            <div><b>Secure Login</b><span>Your credentials are used only to authenticate your CareerPilot account.</span></div>
          </div>

          <div className="cpl-foot">New to CareerPilot? <a href={`/careerpilot/join?tenant=${tenant}`}>Create your CareerPilot account →</a></div>
        </div>
      </section>
    </main>
  );
};

export default PassportLogin;
