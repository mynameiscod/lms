import React, { useEffect, useRef, useState } from 'react';
import './otpVerify.css';

const LEN = 6;

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

const BENEFITS = [
  { icon: 'bi-compass', title: 'Career Direction', desc: 'Continue into your personalized CareerPilot journey.' },
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
    <div className="otpv">
      <header className="otpv-top">
        <a className="otpv-brand" href="/careerpilot/join" aria-label="CodeBegun CareerPilot">
          <img src="/assets/logo.png" alt="CodeBegun" />
          <span className="otpv-brand-divider" />
          <span className="otpv-product">Career<span>Pilot</span></span>
        </a>
        <button type="button" className="otpv-change" onClick={onBack}>
          <i className="bi bi-arrow-left" /> Change Number
        </button>
      </header>

      <main className="otpv-main">
        <section className="otpv-visual" aria-label="CareerPilot verification experience">
          <div className="otpv-kicker"><i /> Secure verification</div>
          <h1>One quick step.<br /><span>Then your career journey continues.</span></h1>
          <p className="otpv-lead">We use a 6-digit WhatsApp code to confirm your number before opening your CareerPilot experience.</p>

          <div className="otpv-hero-art">
            <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="CareerPilot student progress preview" />
            <div className="otpv-float otpv-float-a"><small>Career Readiness</small><strong>72%</strong><span>Ready</span></div>
            <div className="otpv-float otpv-float-b"><small>Next Move</small><strong>Practice DSA</strong><span>+120 XP</span></div>
          </div>

          <div className="otpv-benefits">
            {BENEFITS.map(item => (
              <div className="otpv-benefit" key={item.title}>
                <span><i className={`bi ${item.icon}`} /></span>
                <div><b>{item.title}</b><small>{item.desc}</small></div>
              </div>
            ))}
          </div>
        </section>

        <section className="otpv-card" role="region" aria-label="Verify your number">
          <div className="otpv-card-mark"><i className="bi bi-shield-check" /></div>
          <div className="otpv-eyebrow">WhatsApp verification</div>
          <h2>Enter your 6-digit code</h2>
          <p className="otpv-sub">We sent a verification code to your WhatsApp number.</p>

          <div className="otpv-number">
            <span><i className="bi bi-whatsapp" /></span>
            <div><small>Code sent to</small><b>+91 {mobile || '—'}</b></div>
            <button type="button" onClick={onBack}><i className="bi bi-pencil" /> Edit</button>
          </div>

          <label className="otpv-hint" htmlFor="otp-0">Verification code</label>
          <div className="otpv-boxes" onPaste={onPaste}>
            {Array.from({ length: LEN }, (_, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                ref={el => { refs.current[i] = el; }}
                className={`otpv-box${digits[i] ? ' filled' : ''}`}
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

          <div className="otpv-resend">
            {resendIn > 0
              ? <>Didn't receive it? Resend in <b>00:{String(resendIn).padStart(2, '0')}</b></>
              : <>Didn't receive it? <button type="button" onClick={onResend}>Resend code</button></>}
          </div>

          {devCode && <div className="otpv-dev">Dev code: <b>{devCode}</b></div>}
          {error && <div className="otpv-msg err"><i className="bi bi-exclamation-circle" /> {error}</div>}
          {message && !error && <div className="otpv-msg ok"><i className="bi bi-check-circle" /> {message}</div>}

          <button className="otpv-go" disabled={busy || code.length < LEN} onClick={() => onVerify(code)}>
            {busy ? 'Verifying…' : <>Verify &amp; Continue <i className="bi bi-arrow-right" /></>}
          </button>

          <div className="otpv-secure-note"><i className="bi bi-lock" /> Your number is used only to verify and protect your CareerPilot account.</div>
        </section>
      </main>
    </div>
  );
};

export default OtpVerify;
