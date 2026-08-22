import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import type { OnboardingField } from '../../api/passportApi';
import AuthSplit, { FormMark } from './AuthSplit';
import OtpVerify from './OtpVerify';
import './careerpilot.css';

/** Six-up capability row. */
const CAPABILITIES: { ic: string; bg: string; title: string; desc: string }[] = [
  { ic: '📘', bg: '#eef0ff', title: 'Learn In-Demand Skills', desc: 'Industry-relevant courses mapped to real hiring needs' },
  { ic: '🎯', bg: '#fdeaf3', title: 'Assess & Discover', desc: 'Identify your strengths and the gaps holding you back' },
  { ic: '🗺️', bg: '#fff3e0', title: 'Personalized Roadmap', desc: 'A 90-day plan tailored to your goal and academic year' },
  { ic: '⚡', bg: '#e7f8ef', title: 'Practice & Improve', desc: 'Hands-on projects, coding challenges and quizzes' },
  { ic: '🚀', bg: '#e6f2ff', title: 'Get Placed', desc: 'Mock interviews, resume reviews and placement guidance' },
  { ic: '🤝', bg: '#f3eaff', title: 'Ongoing Support', desc: 'Mentors and progress tracking the whole way through' },
];

/** How it works — three steps. */
const STEPS: { n: string; ic: string; title: string; desc: string }[] = [
  { n: '1', ic: '👤', title: 'Create Your Profile', desc: 'Fill in your details and tell us about your goals' },
  { n: '2', ic: '📝', title: 'Take Assessment', desc: 'Discover your strengths and get your Career Score' },
  { n: '3', ic: '🚀', title: 'Get Your Roadmap', desc: 'Follow your personalized path and achieve your goals' },
];

/**
 * Partner colleges and success stories.
 *
 * These are MARKETING CLAIMS on a public page that sells a paid membership, so they
 * must describe real, consented students and real institutional relationships. They
 * are isolated here so they are easy to replace or empty out — an empty array simply
 * hides its section rather than breaking the page.
 */
// Emptied 2026-07-30: the owner confirmed these were placeholder copy from the
// mockup, not real institutional relationships. The section is hidden while empty.
// Add real, agreed partners here to bring it back.
const COLLEGES: { name: string; sub: string }[] = [];

// Emptied 2026-07-30: the owner confirmed these named students and employers were
// placeholder copy. Fabricated placement outcomes on a page selling a paid
// membership are a claim we cannot stand behind. Only add real, consented stories.
const STORIES: { quote: string; name: string; role: string; company: string }[] = [];

/**
 * What the form will accept, decided in one place.
 *
 * Every rule here is also enforced by the server, and that is the copy that matters — this
 * one exists so the member finds out while their cursor is still in the field rather than
 * after a round trip. Where the two could drift the server wins; the wording is kept the
 * same as `utils/phone.ts` so a rejection reads identically whichever side catches it.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Digits only, at most ten. Applied on every keystroke, so an over-long paste is trimmed
 *  as it lands instead of being accepted and rejected later. A pasted +91 or a number with
 *  spaces becomes the ten digits it was always meant to be. */
export const toMobile = (raw: string) => raw.replace(/\D/g, '').slice(-10);

function validateJoin(
  form: Record<string, any>,
  extra: OnboardingField[],
): Record<string, string> {
  const e: Record<string, string> = {};

  const name = String(form.name || '').trim();
  if (!name) e.name = 'Please enter your full name.';
  else if (name.length < 2) e.name = 'That looks too short — please enter your full name.';
  else if (!/[A-Za-z]/.test(name)) e.name = 'Your name should contain letters.';

  const mob = toMobile(String(form.mobile || ''));
  if (!mob) e.mobile = 'Mobile number is required.';
  else if (mob.length < 10) e.mobile = `That is only ${mob.length} digit${mob.length === 1 ? '' : 's'}. Enter your 10-digit mobile number.`;
  else if (!/^[6-9]/.test(mob)) e.mobile = 'That does not look like a mobile number. It should start with 6, 7, 8 or 9.';

  const email = String(form.email || '').trim();
  if (!email) e.email = 'Email address is required.';
  else if (!EMAIL_RE.test(email)) e.email = 'That does not look like a valid email address.';

  // Whatever else this tenant has marked required. The server checks the same list, so a
  // field added in the admin screen starts being enforced here without a code change.
  for (const f of extra) {
    if (f.required && !String(form[f.key] || '').trim()) e[f.key] = `${f.label} is required.`;
  }
  return e;
}

/** Bootstrap Icons for the three locked signup fields. */
const ICON: Record<string, string> = { name: 'bi-person-fill', mobile: 'bi-phone-fill', email: 'bi-envelope-fill' };

const PassportJoin: React.FC = () => {
  const [params] = useSearchParams();
  const tenant = params.get('tenant') || 'codebegun';

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [fieldsDef, setFieldsDef] = useState<OnboardingField[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState<Record<string, any>>({});
  const [token, setToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  /** Status vs failure: both arrive on `msg`, so one place decides which it is. */
  const sentMsg = (m: string) => m.startsWith('We sent') || m.startsWith('New code');
  const [resendIn, setResendIn] = useState(25);

  useEffect(() => {
    (async () => {
      try { const c = await passportPublicApi.getConfig(tenant); setFieldsDef(c.onboardingFields || []); setEnabled(c.enabled); }
      catch { setEnabled(false); setMsg('CareerPilot is not available right now.'); }
    })();
  }, [tenant]);

  // Resend countdown while on the OTP step.
  useEffect(() => {
    if (step !== 'otp') return;
    setResendIn(25);
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step, token]);


  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const extra = useMemo(
    () => fieldsDef.filter(f => !['name', 'mobile', 'email'].includes(f.key)),
    [fieldsDef],
  );

  /**
   * A field's problem is shown once the member has left it, or once they have tried to
   * submit — never while they are still part-way through typing it, which would put
   * "that is only 3 digits" under a number they are in the middle of entering.
   */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const errors = useMemo(() => validateJoin(form, extra), [form, extra]);
  const errFor = (k: string) => ((touched[k] || tried) ? errors[k] : '');
  const blur = (k: string) => setTouched(p => ({ ...p, [k]: true }));

  const submit = async () => {
    // Show everything that is wrong at once rather than one field per attempt.
    setTried(true);
    if (Object.keys(errors).length) { setMsg(''); return; }

    setBusy(true); setMsg('');
    try {
      const r = await passportPublicApi.signup({
        tenant,
        name: String(form.name || '').trim(),
        mobile: toMobile(String(form.mobile || '')),
        email: String(form.email || '').trim().toLowerCase(),
        fields: extra.reduce((o, f) => ({ ...o, [f.key]: form[f.key] }), {}),
      });
      setToken(r.token); setDevCode(r.otp?.devCode || ''); setStep('otp');
      setMsg(r.otp?.sent ? 'We sent a code to your WhatsApp.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Enter the code sent to you.'));
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Signup failed'); }
    setBusy(false);
  };

  const verify = async (code: string) => {
    setBusy(true); setMsg('');
    try {
      const r = await passportPublicApi.verify(token, code);
      localStorage.setItem('token', r.token);
      localStorage.setItem('tenantId', r.tenantId);
      // AuthContext only hydrates `user` when BOTH `user` and `token` are in
      // localStorage — persist the user (mapped to `_id`/`tenantId` the way the
      // context expects) or isAuthenticated stays false and /passport bounces to /login.
      if (r.user) {
        localStorage.setItem('user', JSON.stringify({
          _id: r.user.id, tenantId: r.tenantId,
          email: r.user.email, firstName: r.user.firstName, lastName: r.user.lastName, role: r.user.role,
        }));
      }
      // Straight into setup, not the dashboard.
      //
      // Registration has just collected who they are and what they study; the one thing
      // CareerPilot still needs is where they want to go. Landing on a dashboard whose
      // panels are all empty until a role and a time commitment exist made the next step
      // something the member had to go and find, behind a dismissible strip.
      //
      // A member who somehow arrives already complete — a resumed signup that was finished
      // elsewhere — goes to the dashboard instead. The server decides which; onboarding
      // completeness is not something to infer here.
      //
      // Full page load so the auth context re-initializes from the stored token/user — a
      // client-side nav would hit the protected route before the context knows we're
      // logged in and bounce to /login.
      window.location.href = r.onboardingCompleted ? '/careerpilot' : '/careerpilot/setup';
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Verification failed'); }
    setBusy(false);
  };

  const resend = async () => {
    setResendIn(25);
    try { const r = await passportPublicApi.resend(token); setDevCode(r.otp?.devCode || ''); setMsg(r.otp?.sent ? 'New code sent.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Code resent.')); } catch { /* ignore */ }
  };

  // ── OTP verification step — the shared full-page screen ──
  if (enabled && step === 'otp') return (
    <OtpVerify
      mobile={form.mobile || ''}
      busy={busy}
      resendIn={resendIn}
      devCode={devCode}
      error={msg && !sentMsg(msg) ? msg : ''}
      message={sentMsg(msg) ? msg : ''}
      onVerify={verify}
      onResend={resend}
      onBack={() => { setStep('form'); setMsg(''); }}
    />
  );

  return (
    <>
      <AuthSplit>
        <FormMark />
        <h1 className="as-h2">Create your account 🚀</h1>
        <p className="as-sub">Start your career journey — the assessment is free</p>

        {!enabled ? (
          <div className="as-msg err">{msg || 'CareerPilot is not available right now.'}</div>
        ) : (
          <>
            {msg && <div className="as-msg err">{msg}</div>}

            <label className="as-lab" htmlFor="jn-name">Full Name</label>
            <div className={`as-in${errFor('name') ? ' bad' : ''}`}>
              <span className="lic" aria-hidden="true"><i className={`bi ${ICON.name}`} /></span>
              <input id="jn-name" value={form.name || ''} autoComplete="name"
                aria-invalid={!!errFor('name')} aria-describedby={errFor('name') ? 'jn-name-err' : undefined}
                onBlur={() => blur('name')}
                onChange={e => set('name', e.target.value)} placeholder="Enter your full name" />
            </div>
            {errFor('name') && <div className="as-fe" id="jn-name-err">{errFor('name')}</div>}

            <label className="as-lab" htmlFor="jn-mob">Mobile Number</label>
            <div className={`as-in${errFor('mobile') ? ' bad' : ''}`}>
              <span className="lic" aria-hidden="true"><i className={`bi ${ICON.mobile}`} /></span>
              {/* Digits are stripped and capped as they are typed, so an eleven-digit number
                  or a pasted +91 cannot be entered at all - the field simply holds the ten
                  digits that are the number. maxLength alone would not do it: it counts
                  characters, so spaces and a leading + would still push real digits out. */}
              <input id="jn-mob" value={form.mobile || ''} inputMode="numeric" autoComplete="tel"
                maxLength={10}
                aria-invalid={!!errFor('mobile')} aria-describedby={errFor('mobile') ? 'jn-mob-err' : undefined}
                onBlur={() => blur('mobile')}
                onChange={e => set('mobile', toMobile(e.target.value))} placeholder="Enter 10-digit mobile number" />
            </div>
            {errFor('mobile') && <div className="as-fe" id="jn-mob-err">{errFor('mobile')}</div>}

            <label className="as-lab" htmlFor="jn-mail">Email Address</label>
            <div className={`as-in${errFor('email') ? ' bad' : ''}`}>
              <span className="lic" aria-hidden="true"><i className={`bi ${ICON.email}`} /></span>
              <input id="jn-mail" type="email" value={form.email || ''} autoComplete="email"
                aria-invalid={!!errFor('email')} aria-describedby={errFor('email') ? 'jn-mail-err' : undefined}
                onBlur={() => blur('email')}
                onChange={e => set('email', e.target.value)} placeholder="Enter your email address" />
            </div>
            {errFor('email') && <div className="as-fe" id="jn-mail-err">{errFor('email')}</div>}

            {/* Whatever else the admin has asked for on this tenant. */}
            {extra.map(f => (
              <div key={f.key}>
                <label className="as-lab" htmlFor={`jn-${f.key}`}>{f.label}{f.required ? '' : ' (optional)'}</label>
                <div className={`as-in plain${errFor(f.key) ? ' bad' : ''}`}>
                  {f.type === 'select'
                    ? <select id={`jn-${f.key}`} value={form[f.key] || ''}
                        aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)}
                        onChange={e => set(f.key, e.target.value)}>
                        <option value="">Select…</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    : <input id={`jn-${f.key}`} value={form[f.key] || ''}
                        aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)}
                        onChange={e => set(f.key, f.type === 'phone' ? toMobile(e.target.value) : e.target.value)}
                        maxLength={f.type === 'phone' ? 10 : undefined}
                        inputMode={f.type === 'phone' ? 'numeric' : undefined}
                        type={f.type === 'number' ? 'number' : 'text'}
                        placeholder={`Enter ${f.label.toLowerCase()}`} />}
                </div>
                {errFor(f.key) && <div className="as-fe">{errFor(f.key)}</div>}
              </div>
            ))}

            {/* Deliberately NOT disabled on invalid input. A greyed-out button states that
                something is wrong without saying what, and the member is left comparing
                fields to guess; clicking it and being shown every problem at once is the
                faster way out. Only the in-flight state disables it, to stop a double send. */}
            <button className="as-go" disabled={busy} onClick={submit}>
              {busy ? 'Please wait…' : 'Create My CareerPilot →'}
            </button>

            <div className="as-or">or</div>
            <button className="as-alt" onClick={() => { window.location.href = `/careerpilot/login?tenant=${tenant}`; }}>
              <i className="bi bi-lock-fill" aria-hidden="true" /> I already have an account
            </button>

            <div className="as-foot">
              We'll send a one-time code to your WhatsApp to confirm it's you.
            </div>
          </>
        )}
      </AuthSplit>

      <div className="cp-page" style={{ paddingTop: 8 }}>

        {/* ── Partner colleges ── */}
        {!!COLLEGES.length && (
          <section className="cp-sec cp-colleges">
            <h2>Trusted by Students and Colleges Across India</h2>
            <p className="cp-seclead">Partnering with top institutions to build future-ready careers</p>
            <div className="cp-logos">
              {COLLEGES.map(c => (
                <div className="cp-logo" key={c.name}>
                  <span className="mk">🎓</span>
                  <b>{c.name}</b>
                  <span className="sb">{c.sub}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Capabilities ── */}
        <section className="cp-sec">
          <h2>Everything You Need to Succeed</h2>
          <p className="cp-seclead">Comprehensive programs and tools designed for your career growth</p>
          <div className="cp-cap-grid">
            {CAPABILITIES.map(c => (
              <div className="cp-cap" key={c.title}>
                <div className="ic" style={{ background: c.bg }}>{c.ic}</div>
                <b>{c.title}</b>
                <span>{c.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Success stories ── */}
        {!!STORIES.length && (
          <section className="cp-sec cp-stories">
            <div className="cp-stories-hd">
              <div>
                <span className="kicker">SUCCESS STORIES</span>
                <h2>Real Students.<br />Real Success.</h2>
                <p>Hear from our students who transformed their careers with CodeBegun.</p>
              </div>
            </div>
            <div className="cp-story-grid">
              {STORIES.map(s => (
                <div className="cp-story" key={s.name}>
                  <div className="stars">★★★★★</div>
                  <q>{s.quote}</q>
                  <div className="who">
                    <span className="av">{s.name.charAt(0)}</span>
                    <div><b>{s.name}</b><span>{s.role} <em>{s.company}</em></span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── How it works ── */}
        <section className="cp-sec">
          <h2>How It Works</h2>
          <p className="cp-seclead">Start your journey in 3 simple steps</p>
          <div className="cp-steps">
            {STEPS.map((s, i) => (
              <div className="cp-step" key={s.n}>
                <span className="n">{s.n}</span>
                <div className="ic">{s.ic}</div>
                <b>{s.title}</b>
                <span>{s.desc}</span>
                {i < STEPS.length - 1 && <span className="arrow">›</span>}
              </div>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="cp-cta">
          <span className="em">🎓</span>
          <div className="tx">
            <b>Ready to Transform Your Career?</b>
            <span>Join thousands of students who are building successful careers with CodeBegun.</span>
          </div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Create My CareerPilot →</button>
        </section>
      </div>
    </>
  );
};

export default PassportJoin;
