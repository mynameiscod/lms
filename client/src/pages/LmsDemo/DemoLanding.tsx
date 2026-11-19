import React, { useEffect, useRef, useState } from 'react';
import { lmsDemoApi, storeDemoLogin, demoErr, DemoCourseCard } from '../../api/lmsDemoApi';
import './demoLanding.css';

/**
 * /demo — the free LMS demo. Public: a prospective student reads what they get, enters name and
 * phone, proves the phone with an OTP and lands straight in the LMS with every demo course open.
 * No password, no payment, and CareerPilot is never offered here.
 *
 * Layout: a light hero with the sign-up form beside the pitch (no scrolling to find it), then the
 * demo courses, how it works, and a closing call to action that brings the form back into view.
 */

const ACCENTS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737'];
const STATUSES = ['College student', 'Final-year student', 'Graduate (looking for a job)', 'Working professional'];
const ICONS = ['bi-cup-hot', 'bi-filetype-py', 'bi-bar-chart-line', 'bi-cpu', 'bi-code-slash', 'bi-diagram-3'];
const NBSP = ' ';

export default function DemoLanding() {
  const [info, setInfo] = useState<{ enabled: boolean; lengthDays: number; courses: DemoCourseCard[] } | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [step, setStep] = useState<'form' | 'otp' | 'entering'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Free LMS demo · CodeBegun';
    lmsDemoApi.info().then(setInfo).catch(e => setLoadErr(demoErr(e, 'Could not load the demo.')));
  }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const toForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }), 450);
  };

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (phone.replace(/\D/g, '').length < 10) return setErr('Enter your 10-digit mobile number.');
    setBusy(true);
    try {
      const r = await lmsDemoApi.start({ name: name.trim(), phone, email: email.trim() || undefined, status: status || undefined });
      setToken(r.token);
      setChannel(r.otp.channel);
      setHint(r.otp.devCode ? `Test code: ${r.otp.devCode}` : '');
      setWait(r.otp.throttledSeconds || 30);
      setStep('otp');
    } catch (e2) {
      setErr(demoErr(e2));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (code.replace(/\D/g, '').length < 4) return setErr('Enter the code we sent you.');
    setBusy(true);
    try {
      const p = await lmsDemoApi.verify(token, code.trim());
      setStep('entering');
      storeDemoLogin(p);
      window.location.replace('/my-learning');
    } catch (e2) {
      setErr(demoErr(e2));
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr('');
    try {
      const r = await lmsDemoApi.resend(token);
      setChannel(r.otp.channel);
      setHint(r.otp.devCode ? `Test code: ${r.otp.devCode}` : '');
      setWait(r.otp.throttledSeconds || 30);
    } catch (e2) {
      setErr(demoErr(e2));
    }
  };

  const courses = info?.courses || [];
  const days = info?.lengthDays || 3;
  const closed = info && !info.enabled;

  const formCard = (
    <div className="dl-form-card" ref={formRef} id="start">
      {closed ? (
        <div className="dl-closed"><i className="bi bi-hourglass-split" /><h2>The free demo is closed right now</h2><p>Please check back soon, or talk to us to know more.</p></div>
      ) : step === 'form' ? (
        <form onSubmit={start} noValidate>
          <span className="dl-form-tag"><i className="bi bi-lightning-charge-fill" /> Takes less than a minute</span>
          <h2>Start your free demo</h2>
          <label className="dl-field"><span>Your name</span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="e.g. Priya Sharma" maxLength={80} /></label>
          <label className="dl-field"><span>Mobile number</span>
            <div className="dl-phone"><em>+91</em><input value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" /></div>
          </label>
          <label className="dl-field"><span>Email <small>(optional)</small></span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" maxLength={120} /></label>
          <div className="dl-field"><span>I am a</span>
            <div className="dl-chips">{STATUSES.map(s => <button type="button" key={s} className={status === s ? 'on' : ''} aria-pressed={status === s} onClick={() => setStatus(status === s ? '' : s)}>{s}</button>)}</div>
          </div>
          {err && <div className="dl-alert" role="alert">{err}</div>}
          <button className="dl-cta wide" disabled={busy}>{busy ? 'Sending code…' : <>Send verification code <i className="bi bi-arrow-right" /></>}</button>
          <p className="dl-fine">By continuing you agree that a CodeBegun counsellor may contact you about our courses.</p>
        </form>
      ) : step === 'otp' ? (
        <form onSubmit={verify} noValidate>
          <span className="dl-form-tag"><i className="bi bi-shield-check" /> Step 2 of 2</span>
          <h2>Enter the code</h2>
          <p className="dl-sub">We sent a code {channel === 'email' ? 'to your email' : 'on WhatsApp'} for +91 {phone.replace(/\D/g, '').slice(-10)}. <button type="button" className="dl-link" onClick={() => { setStep('form'); setCode(''); setErr(''); }}>Change number</button></p>
          <input className="dl-otp" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" autoFocus aria-label="Verification code" />
          {hint && <div className="dl-hint">{hint}</div>}
          {err && <div className="dl-alert" role="alert">{err}</div>}
          <button className="dl-cta wide" disabled={busy}>{busy ? 'Checking…' : 'Verify and start'}</button>
          <div className="dl-resend">{wait > 0 ? <span>Resend in {wait}s</span> : <button type="button" className="dl-link" onClick={resend}>Resend code</button>}</div>
        </form>
      ) : (
        <div className="dl-closed"><div className="dl-spin" /><h2>Opening your demo…</h2></div>
      )}
    </div>
  );

  return (
    <div className="dl">
      <header className="dl-top">
        <a href="/" className="dl-brand" aria-label="CodeBegun home"><img src="/assets/logo.png" alt="CodeBegun" /></a>
        <a href="/login" className="dl-login"><span>Already have an account?</span> <b>Log in</b></a>
      </header>

      <section className="dl-hero">
        <div className="dl-hero-in">
          <div className="dl-hero-copy">
            <span className="dl-eyebrow"><i className="bi bi-stars" /> Free {days}-day demo</span>
            <h1>Learn with CodeBegun <span>before you join</span></h1>
            <p>Watch real classes, read the notes and try the practice on the same learning platform our students use every day.</p>
            <ul className="dl-points">
              <li><i className="bi bi-play-circle" /><div><b>Real demo classes</b><span>{courses.length > 1 ? `From all ${courses.length} courses` : 'From our courses'}, open for {days} days</span></div></li>
              <li><i className="bi bi-journal-text" /><div><b>Notes and a day-by-day plan</b><span>Know exactly what to learn each day</span></div></li>
              <li><i className="bi bi-robot" /><div><b>An AI study helper</b><span>Ask your doubts any time</span></div></li>
            </ul>
            <div className="dl-trust">
              <span><i className="bi bi-check2-circle" /> No payment</span>
              <span><i className="bi bi-check2-circle" /> No password</span>
              <span><i className="bi bi-check2-circle" /> Start in 1 minute</span>
            </div>
          </div>
          {formCard}
        </div>
      </section>

      <main className="dl-main">
        <section aria-label="Courses in the demo">
          <div className="dl-head">
            <span className="dl-kicker">Inside the demo</span>
            <h2>{courses.length > 1 ? 'Every course is open for you' : 'What you can explore'}</h2>
            <p className="dl-sub">Start from Day 1{courses.length > 1 ? ' of any course, and switch between them anytime' : ''}.</p>
          </div>
          {loadErr && <div className="dl-alert">{loadErr}</div>}
          <div className="dl-course-grid">
            {(courses.length ? courses : Array.from({ length: info ? 0 : 3 })).map((c: any, i) => (
              <article key={c?.curriculumId || i} className={`dl-course${c ? '' : ' skel'}`} style={{ ['--acc' as any]: c?.color || ACCENTS[i % ACCENTS.length] }}>
                <div className="dl-course-top">
                  <div className="dl-course-ic"><i className={`bi ${ICONS[i % ICONS.length]}`} /></div>
                  {c && <span className="dl-course-days"><i className="bi bi-calendar3" /> {c.totalDays} day{c.totalDays === 1 ? '' : 's'}</span>}
                </div>
                <h3>{c?.title || NBSP}</h3>
                <p>{c?.blurb || (c ? 'Classes, notes and practice, day by day.' : NBSP)}</p>
              </article>
            ))}
          </div>
          {info && !courses.length && !loadErr && <div className="dl-alert soft">The demo courses are being prepared. Please check back soon.</div>}
        </section>

        <section className="dl-how" aria-label="How it works">
          <div className="dl-head center">
            <span className="dl-kicker">How it works</span>
            <h2>Three steps and you are in</h2>
          </div>
          <ol className="dl-steps">
            {[['bi-person-badge', 'Tell us who you are', 'Your name and mobile number.'], ['bi-shield-check', 'Verify your phone', 'Enter the code we send you.'], ['bi-rocket-takeoff', 'Start learning', `${days} days with every demo course open.`]].map(([ic, t, d], i) => (
              <li key={t} className="dl-step"><span className="dl-step-ic"><i className={`bi ${ic}`} /><em>{i + 1}</em></span><b>{t}</b><span>{d}</span></li>
            ))}
          </ol>
        </section>

        {!closed && step === 'form' && (
          <section className="dl-band">
            <div><h2>Ready to see it for yourself?</h2><p>{days} days, every demo course, free.</p></div>
            <button type="button" className="dl-cta light" onClick={toForm}>Start my free demo <i className="bi bi-arrow-up" /></button>
          </section>
        )}
      </main>

      <footer className="dl-foot">© {new Date().getFullYear()} CodeBegun</footer>
    </div>
  );
}
