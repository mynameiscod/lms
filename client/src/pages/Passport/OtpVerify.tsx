import React, { useEffect, useRef, useState } from 'react';
import './otpVerify.css';

/**
 * The WhatsApp OTP screen, shared by signup and login.
 *
 * It used to be copy-pasted into both, which is exactly how two screens that should be
 * identical stop being identical. The code lives here now and both callers pass a handler.
 *
 * The component owns the six digits and hands the finished code up, because every caller
 * wanted the same thing — six characters — and none of them wanted the box-focus
 * bookkeeping that produces it.
 */

const LEN = 6;

export interface OtpVerifyProps {
  /** Shown back to the member so they can spot a typo before waiting for a code. */
  mobile: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  /** "Change number" — back to the form that sent them here. */
  onBack: () => void;
  busy?: boolean;
  /** Seconds until resend is offered again. */
  resendIn: number;
  /** Something went wrong. */
  error?: string;
  /** Non-error status, e.g. "New code sent." */
  message?: string;
  /** Only present outside production, where WhatsApp is not wired up. */
  devCode?: string;
}

const FEATURES: { ic: string; title: string; desc: string }[] = [
  { ic: '🎓', title: 'Personalized Learning', desc: 'AI-powered path for your success' },
  { ic: '📊', title: 'Track & Improve', desc: 'Real-time progress & analytics' },
  { ic: '🏆', title: 'Achieve Your Goals', desc: 'Prepare, practice & get placed' },
];

/**
 * The reassurance strip along the bottom.
 *
 * NOTE: the signup screen says "100K+ students". A member sees both within about a minute
 * of each other, so if one number changes this one has to change with it.
 */
const TRUST: { ic: string; title: string; desc: string }[] = [
  { ic: '🔒', title: '100% Secure', desc: 'Your data is safe with us' },
  { ic: '👥', title: '10K+ Students', desc: 'Trust CareerPilot' },
  { ic: '🎯', title: 'Industry Mentors', desc: 'Learn from the best' },
  { ic: '⚡', title: '24/7 Support', desc: "We're here to help" },
];

const OtpVerify: React.FC<OtpVerifyProps> = ({
  mobile, onVerify, onResend, onBack, busy, resendIn, error, message, devCode,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join('');

  // Land the caret in the first box. Nobody should have to tap before typing a code
  // they are holding in their other hand.
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

  /** Pasting the whole code is how most people do it — fill every box, not just the first. */
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
      <div className="otpv-bg" aria-hidden="true"><i /><i /><i /></div>

      <header className="otpv-top">
        <div className="otpv-brand">
          <span className="mk" aria-hidden="true">🧭</span>
          <div><b>CareerPilot</b><small>Powered by CodeBegun</small></div>
        </div>
        <button type="button" className="otpv-change" onClick={onBack}>← Change Number</button>
      </header>

      <main className="otpv-body">
        {/* The pitch. Decorative on a phone, where it moves below the card. */}
        <section className="otpv-pitch">
          <h1>One Step Away<br />From Your<br /><span>Dream Career!</span></h1>
          <p className="otpv-lead">
            We've sent a 6-digit verification code to your WhatsApp number.
            Enter it below to continue your journey.
          </p>

          <ul className="otpv-feats">
            {FEATURES.map(f => (
              <li key={f.title}>
                <span className="ic" aria-hidden="true">{f.ic}</span>
                <div><b>{f.title}</b><small>{f.desc}</small></div>
              </li>
            ))}
          </ul>

          <div className="otpv-art" aria-hidden="true">
            <svg viewBox="0 0 260 200" role="presentation">
              <g opacity=".85">
                <rect x="24" y="150" width="62" height="34" rx="7" fill="#1E3A8A" />
                <rect x="24" y="150" width="62" height="9" rx="4" fill="#2E4FA8" />
                <rect x="70" y="122" width="62" height="62" rx="7" fill="#1D4ED8" />
                <rect x="70" y="122" width="62" height="9" rx="4" fill="#3B6BE8" />
                <rect x="116" y="96" width="62" height="88" rx="7" fill="#2563EB" />
                <rect x="116" y="96" width="62" height="9" rx="4" fill="#4B85F5" />
              </g>
              <path d="M178 96 L178 66" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
              <path d="M178 66 L206 74 L178 82 Z" fill="#34D399" />
              <g transform="translate(150 8) rotate(28)">
                <path d="M18 0 C30 14 32 34 26 52 L10 52 C4 34 6 14 18 0 Z" fill="#EEF4FF" />
                <circle cx="18" cy="22" r="7" fill="#2563EB" />
                <path d="M10 52 L2 66 L14 60 Z" fill="#3B82F6" />
                <path d="M26 52 L34 66 L22 60 Z" fill="#3B82F6" />
                <path d="M14 60 L18 78 L22 60 Z" fill="#FBBF24" />
              </g>
              {[[36, 44], [214, 40], [58, 108], [232, 128], [96, 70]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 2 ? 2 : 3} fill="#5EEAD4" opacity=".8" />
              ))}
            </svg>
          </div>

          <blockquote className="otpv-quote">
            Success is a journey, not a destination.<br />Let's build your future together.
          </blockquote>
        </section>

        {/* The job. */}
        <section className="otpv-card" role="region" aria-label="Verify your number">
          <div className="otpv-shield" aria-hidden="true"><span>🛡️</span></div>
          <h2>Verify Your Number</h2>
          <p className="otpv-sub">We've sent a 6-digit verification code to your WhatsApp number</p>

          <div className="otpv-num">
            <span className="wa" aria-hidden="true">💬</span>
            <b>+91 {mobile || '—'}</b>
            <button type="button" onClick={onBack}>✏️ Edit</button>
          </div>

          <label className="otpv-hint" htmlFor="otp-0">Enter the 6-digit code below</label>
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
            Didn't receive the code?{' '}
            {resendIn > 0
              ? <>Resend code in <b>00:{String(resendIn).padStart(2, '0')}</b></>
              : <button type="button" className="lnk" onClick={onResend}>Resend code</button>}
          </div>

          {devCode && <div className="otpv-dev">Dev code: <b>{devCode}</b></div>}
          {error && <div className="otpv-msg err">{error}</div>}
          {message && !error && <div className="otpv-msg ok">{message}</div>}

          <div className="otpv-or"><span>OR</span></div>

          <div className="otpv-safe">
            <span className="ic" aria-hidden="true">🛡️</span>
            <div><b>Your account is protected</b><small>We never share your number with anyone.</small></div>
            <span className="lock" aria-hidden="true">🔒</span>
          </div>

          <button className="otpv-go" disabled={busy || code.length < LEN} onClick={() => onVerify(code)}>
            {busy ? 'Verifying…' : 'Verify & Continue →'}
          </button>
        </section>
      </main>

      <footer className="otpv-trust">
        {TRUST.map(t => (
          <div key={t.title}>
            <span className="ic" aria-hidden="true">{t.ic}</span>
            <div><b>{t.title}</b><small>{t.desc}</small></div>
          </div>
        ))}
      </footer>
    </div>
  );
};

export default OtpVerify;
