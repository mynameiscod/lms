import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import OtpVerify, { isOtpInfo } from './OtpVerify';
/* The signup form's own rule, reused so one number cannot be valid on one screen and not the other. */
import { toMobile } from './Join';
import './careerpilot.css';
import './careerpilotLogin.css';

/**
 * Returning CareerPilot member login. Two ways in:
 *  - Password: email/mobile + password (only once they've set one).
 *  - WhatsApp OTP: mobile → OTP → verify. Also the "forgot password" path.
 */

const REMEMBER_KEY = 'cp.login.identifier';

/**
 * ── ONE SIGN-IN FORM, TWO PLACES IT CAN APPEAR ───────────────────────────────────────────
 *
 * Signing in and creating an account were separate pages that linked to one another, so a
 * member who guessed wrong made a round trip through a full page load to find the other. They
 * are one screen now: Join hosts both and switches between them.
 *
 * `embedded` renders the FORM ONLY, because the host already provides the page and the
 * marketing column. Everything else is shared — a second copy of a login form is a second
 * place for the password rules, the OTP flow and the error wording to drift apart.
 */
const PassportLogin: React.FC<{
  embedded?: boolean;
  /** The host's switch back to create-account, instead of a link that reloads the page. */
  onCreateAccount?: () => void;
}> = ({ embedded = false, onCreateAccount }) => {
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

  /**
   * A SERVER THAT DID NOT ANSWER IS NOT A WRONG PASSWORD.
   *
   * Every failure on this screen read "Login failed", which is also what a member sees when the
   * API is down, their connection has dropped, or the request never left the browser — and it is
   * indistinguishable from the message for bad credentials. People then retype a password that
   * was right all along, and eventually reset one they never needed to.
   *
   * The server names every refusal it makes — "Incorrect password.", "No CareerPilot found for
   * that email/mobile." — so a rejection carrying no message at all means there was no rejection,
   * and no response either. Shared by all three ways in, because the distinction is the same for
   * a password, a code request and a code check.
   */
  const failureText = (e: any, fallback: string): string =>
    e?.response?.data?.message
    || (e?.response ? fallback : 'We could not reach CareerPilot. Check your connection and try again.');

  const doPassword = async () => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.loginPassword(tenant, identifier, password)); }
    catch (e: any) {
      const m = e?.response?.data;
      setMsg(failureText(e, 'Something went wrong signing you in. Please try again.'));
      if (m?.code === 'NO_PASSWORD') {
        setMode('otp');
        setMobile(identifier.includes('@') ? '' : toMobile(identifier));
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
    } catch (e: any) { setMsg(failureText(e, 'Could not send the code. Please try again.')); }
    setBusy(false);
  };

  const verifyOtp = async (code: string) => {
    setBusy(true); setMsg('');
    try { land(await passportPublicApi.verify(token, code)); }
    catch (e: any) { setMsg(failureText(e, 'That code could not be verified. Please try again.')); }
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

  if (otpStep) {
    const verify = (
      <OtpVerify
        mobile={mobile}
        busy={busy}
        resendIn={resendIn}
        devCode={devCode}
        error={msg && !isOtpInfo(msg) ? msg : ''}
        message={isOtpInfo(msg) ? msg : ''}
        onVerify={verifyOtp}
        onResend={resend}
        onBack={() => { setOtpStep(false); setMsg(''); }}
      />
    );

    /**
     * ── VERIFICATION TAKES THE SCREEN, EVEN WHEN THE FORM IS EMBEDDED ──────────────────
     *
     * This early return fires BEFORE the `embedded` branch below, which was fine while
     * login owned its own page and wrong the moment Join started hosting the form: a whole
     * page — nav, step indicator, hero — was rendering inside a narrow signup card, and the
     * copy beside it wrapped one word per line.
     *
     * Verification is a focused step and should own the screen wherever it was started
     * from, so embedded it lifts out of the card rather than being squeezed into it. The
     * host keeps its own layout untouched underneath.
     */
    return embedded ? <div className="cpl-verify-takeover">{verify}</div> : verify;
  }

  const sent = msg.startsWith('We sent') || msg.startsWith('New code');

  /* Defined once and used by both shapes, so the embedded form cannot drift from the page. */
  const marketing = (
      <section className="cpl-marketing" aria-label="CareerPilot overview">
        <div className="cpl-brand">
          <div className="cpl-brand-mark">
            <img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun"
              onError={e => { const el = e.currentTarget as HTMLImageElement; el.style.display = 'none'; el.parentElement?.classList.add('fallback'); }} />
            <span className="cpl-brand-name">Career<span>Pilot</span></span>
          </div>
        </div>

        <div className="cpl-eyebrow">AI powered · Career intelligence · Real progress</div>

        <div className="cpl-copy">
          <h1>Your career journey<br />starts <span>here.</span></h1>
          <p>Assess. Learn. Practice. Grow. CareerPilot helps you understand your strengths, build the right skills and follow a clearer path toward your career goal.</p>
        </div>

        <div className="cpl-showcase" aria-hidden="true">
          <div className="cpl-feature-stack">
            <div className="cpl-feature"><div className="cpl-feature-ic"><i className="bi bi-diagram-3-fill" /></div><div><b>Skill DNA</b><span>Your strengths and technical profile.</span></div></div>
            <div className="cpl-feature"><div className="cpl-feature-ic"><i className="bi bi-graph-up-arrow" /></div><div><b>Career Readiness</b><span>Progress toward your target role.</span></div></div>
            <div className="cpl-feature"><div className="cpl-feature-ic"><i className="bi bi-map-fill" /></div><div><b>Personalized Roadmap</b><span>What to learn and practice next.</span></div></div>
          </div>

          <div className="cpl-stage">
            <img
              className="cpl-student"
              src="/assets/careerpilot/careerpilot-hero-student.png"
              alt=""
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="cpl-cards">
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
          </div>
        </div>

        <div className="cpl-trust">
          <div><i className="bi bi-shield-check" /><span><strong>Secure</strong>Your data stays protected</span></div>
          <div><i className="bi bi-person-check-fill" /><span><strong>Personalized</strong>Built around your goals</span></div>
          <div><i className="bi bi-lightning-charge-fill" /><span><strong>Actionable</strong>Know your next step</span></div>
        </div>
      </section>
  );

  const form = (
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
                {/* Ten digits, and only digits — the field asked for a 10-digit mobile and then took anything. */}
                <input id="cp-mob" value={mobile} inputMode="numeric" autoComplete="tel" maxLength={10} onChange={e => setMobile(toMobile(e.target.value))} placeholder="Enter your 10-digit mobile" onKeyDown={e => e.key === 'Enter' && mobile && startOtp()} />
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

          <div className="cpl-foot">
            New to CareerPilot?{' '}
            {onCreateAccount
              ? <button type="button" className="cpl-link" onClick={onCreateAccount}>Create your CareerPilot account →</button>
              : <a href={`/careerpilot/join?tenant=${tenant}`}>Create your CareerPilot account →</a>}
          </div>
        </div>
      </section>
  );

  /* Embedded: the host owns the page and the marketing column, so only the form travels. */
  if (embedded) return form;

  return (
    <main className="cpl-page">
      {marketing}
      {form}
    </main>
  );
};

export default PassportLogin;
