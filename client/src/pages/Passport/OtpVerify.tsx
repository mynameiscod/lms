import React, { useEffect, useRef, useState } from 'react';
import './otpVerify.css';

const LEN = 6;
const LOGO = '/assets/careerpilot/careerpilot-logo.png';

export interface OtpVerifyProps {
  mobile: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  busy?: boolean;
  resendIn: number;
  error?: string;
  message?: string;
  devCode?: string;
}

/**
 * Messages the signup and login screens pass along that are information, not failures: a code was sent, a new
 * one was sent, or — in development — the code itself. Anything else is an error. The dev code has its own line
 * on the card, so it was being shown twice, once in red as though something had gone wrong.
 */
export const isOtpInfo = (m: string) => /^(We sent|New code|Code resent|Enter the code|Dev code)/.test(m);

const BENEFITS = [
  { icon: 'bi-compass', title: 'Career Direction', desc: 'Continue into your personalised CareerPilot journey.' },
  { icon: 'bi-speedometer2', title: 'Readiness Insights', desc: 'See your skill level, gaps and next best actions.' },
  { icon: 'bi-stars', title: 'Progress That Feels Real', desc: 'Build momentum through missions, XP and milestones.' },
];

const OtpVerify: React.FC<OtpVerifyProps> = ({
  mobile, onVerify, onResend, onBack, busy, resendIn, error, message, devCode,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join('');

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const put = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigits(p => { const n = [...p]; n[i] = d; return n; });
    if (d && i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < LEN - 1) refs.current[i + 1]?.focus();
    if (e.key === 'Enter' && code.length === LEN) onVerify(code);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    const next = Array(LEN).fill('');
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    refs.current[Math.min(text.length, LEN - 1)]?.focus();
  };

  return (
    <div className="cpv">
      <header className="cpv-nav">
        <div className="cpv-wrap cpv-nav-in">
          <a className="cpv-logo" href="/careerpilot/join" aria-label="CareerPilot by CodeBegun — home">
            <img src={LOGO} alt="CareerPilot by CodeBegun" />
          </a>
          {/* Where they are in joining: details done, this step, then their plan. */}
          <ol className="cpv-steps" aria-label="Joining CareerPilot">
            <li className="done"><span><i className="bi bi-check-lg" /></span>Your details</li>
            <li className="current" aria-current="step"><span>2</span>Verify</li>
            <li><span>3</span>Your plan</li>
          </ol>
        </div>
      </header>

      <main className="cpv-hero">
        <div className="cpv-wrap cpv-grid">
          <section className="cpv-copy" aria-label="Why we verify">
            <div className="cpv-eyebrow"><i className="bi bi-shield-lock-fill" /> Secure verification</div>
            <h1>One quick step.<br /><span>Then your career journey begins.</span></h1>
            <p className="cpv-lead">
              We use a 6-digit WhatsApp code to confirm your number before opening your CareerPilot experience.
            </p>
            <ul className="cpv-benefits">
              {BENEFITS.map(item => (
                <li key={item.title}>
                  <span className="cpv-benefit-ic"><i className={`bi ${item.icon}`} /></span>
                  <div><b>{item.title}</b><small>{item.desc}</small></div>
                </li>
              ))}
            </ul>
          </section>

          <div className="cpv-stage">
            <div className="cpv-visual" aria-hidden="true">
              <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" />
            </div>

            <section className="cpv-card" aria-labelledby="cpv-title">
              <div className="cpv-card-head">
                <span className="cpv-card-mark"><i className="bi bi-whatsapp" /></span>
                <div>
                  <div className="cpv-card-eyebrow">WhatsApp verification</div>
                  <h2 id="cpv-title">Enter your 6-digit code</h2>
                </div>
              </div>

              <div className="cpv-number">
                <div><small>Code sent to</small><b>+91 {mobile || '—'}</b></div>
                <button type="button" onClick={onBack}><i className="bi bi-pencil" /> Edit</button>
              </div>

              <label className="cpv-label" htmlFor="otp-0">Verification code</label>
              <div className="cpv-boxes" onPaste={onPaste}>
                {Array.from({ length: LEN }, (_, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    ref={el => { refs.current[i] = el; }}
                    className={`cpv-box${digits[i] ? ' filled' : ''}`}
                    value={digits[i]}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    aria-label={`Digit ${i + 1} of ${LEN}`}
                    onChange={e => put(i, e.target.value)}
                    onKeyDown={e => onKey(i, e)}
                    onFocus={e => e.currentTarget.select()}
                  />
                ))}
              </div>

              <div className="cpv-resend">
                {resendIn > 0
                  ? <>Didn’t receive it? Resend in <b>00:{String(resendIn).padStart(2, '0')}</b></>
                  : <>Didn’t receive it? <button type="button" onClick={onResend}>Resend code</button></>}
              </div>

              {devCode && <div className="cpv-dev"><i className="bi bi-code-slash" /> Development code: <b>{devCode}</b></div>}
              {error && <div className="cpv-msg err" role="alert"><i className="bi bi-exclamation-circle" /> {error}</div>}
              {message && !error && !message.startsWith('Dev code') && <div className="cpv-msg ok" role="status"><i className="bi bi-check-circle" /> {message}</div>}

              <button className="cpv-go" disabled={busy || code.length < LEN} onClick={() => onVerify(code)}>
                {busy ? 'Verifying…' : <>Verify &amp; Continue <i className="bi bi-arrow-right" /></>}
              </button>

              <div className="cpv-note"><i className="bi bi-lock" /> Your number is used only to verify and protect your CareerPilot account.</div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OtpVerify;
