import React, { useEffect, useRef, useState } from 'react';
import { lmsDemoApi, storeDemoLogin, demoErr, DemoCourseCard } from '../../api/lmsDemoApi';
import './demoLanding.css';

/**
 * /demo — the free LMS demo. Public: a prospective student reads what they get, enters name and
 * phone, proves the phone with an OTP and lands straight in the LMS with every demo course open.
 * No password, no payment, and CareerPilot is never offered here.
 */

const ACCENTS = ['#051D64', '#359AAD', '#6246C9', '#C87808', '#17885D', '#C93737'];
const STATUSES = ['College student', 'Final-year student', 'Graduate (looking for a job)', 'Working professional'];
const ICONS = ['bi-cup-hot', 'bi-filetype-py', 'bi-bar-chart-line', 'bi-cpu', 'bi-code-slash', 'bi-diagram-3'];

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

  const toForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

  return (
    <div className="dl">
      <header className="dl-top">
        <a href="/" className="dl-brand" aria-label="CodeBegun home"><img src="/assets/logo.png" alt="CodeBegun" /></a>
        <a href="/login" className="dl-login">Already have an account? <b>Log in</b></a>
      </header>

      <section className="dl-hero">
        <div className="dl-hero-copy">
          <span className="dl-eyebrow"><i className="bi bi-stars" /> Free {days}-day demo</span>
          <h1>Learn with CodeBegun before you join</h1>
          <p>Watch real classes, read the notes and try the practice — the same learning platform our students use every day. No payment, no password.</p>
          <ul className="dl-points">
            <li><i className="bi bi-play-circle-fill" /> Demo classes from {courses.length > 1 ? `all ${courses.length} courses` : 'our courses'}</li>
            <li><i className="bi bi-journal-text" /> Notes and day-by-day plan</li>
            <li><i className="bi bi-robot" /> An AI study helper to ask doubts</li>
          </ul>
          <button type="button" className="dl-cta" onClick={toForm} disabled={!!closed}>Start my free demo <i className="bi bi-arrow-right" /></button>
        </div>
        <div className="dl-hero-art" aria-hidden="true">
          <div className="dl-mock">
            <div className="dl-mock-head"><span>Day 1</span><b>Your first class</b></div>
            {['Welcome video', 'Notes: the basics', 'Quick practice'].map((t, i) => (
              <div key={t} className={`dl-mock-row${i === 0 ? ' done' : ''}`}><i className={`bi ${i === 0 ? 'bi-check-circle-fill' : 'bi-circle'}`} /><span>{t}</span></div>
            ))}
            <div className="dl-mock-bar"><i style={{ width: '34%' }} /></div>
          </div>
        </div>
      </section>

      <main className="dl-main">
        <section className="dl-courses" aria-label="Courses in the demo">
          <h2>What you get in the demo</h2>
          <p className="dl-sub">Every course below is open for you — explore any of them.</p>
          {loadErr && <div className="dl-alert">{loadErr}</div>}
          <div className="dl-course-grid">
            {(courses.length ? courses : Array.from({ length: info ? 0 : 4 })).map((c: any, i) => (
              <article key={c?.curriculumId || i} className={`dl-course${c ? '' : ' skel'}`} style={{ ['--acc' as any]: c?.color || ACCENTS[i % ACCENTS.length] }}>
                <div className="dl-course-ic"><i className={`bi ${ICONS[i % ICONS.length]}`} /></div>
                <h3>{c?.title || ' '}</h3>
                <p>{c?.blurb || ' '}</p>
                {c && <span className="dl-course-days"><i className="bi bi-calendar3" /> {c.totalDays} demo day{c.totalDays === 1 ? '' : 's'}</span>}
              </article>
            ))}
          </div>
          {info && !courses.length && !loadErr && <div className="dl-alert">The demo courses are being prepared. Please check back soon.</div>}
        </section>

        <section className="dl-steps" aria-label="How it works">
          {[['bi-person-badge', 'Tell us who you are', 'Your name and mobile number.'], ['bi-shield-check', 'Verify your phone', 'Enter the code we send you.'], ['bi-rocket-takeoff', 'Start learning', `${days} days with every demo course open.`]].map(([ic, t, d], i) => (
            <div key={t} className="dl-step"><span className="dl-step-n">{i + 1}</span><i className={`bi ${ic}`} /><b>{t}</b><span>{d}</span></div>
          ))}
        </section>

        <section className="dl-form-wrap" ref={formRef} id="start">
          <div className="dl-form-card">
            {closed ? (
              <div className="dl-closed"><i className="bi bi-hourglass-split" /><h2>The free demo is closed right now</h2><p>Please check back soon, or talk to us to know more.</p></div>
            ) : step === 'form' ? (
              <form onSubmit={start} noValidate>
                <h2>Start your free demo</h2>
                <p className="dl-sub">Takes less than a minute.</p>
                <label className="dl-field"><span>Your name</span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="e.g. Priya Sharma" maxLength={80} /></label>
                <label className="dl-field"><span>Mobile number</span>
                  <div className="dl-phone"><em>+91</em><input value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" /></div>
                </label>
                <label className="dl-field"><span>Email <small>(optional)</small></span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="you@example.com" maxLength={120} /></label>
                <div className="dl-field"><span>I am a</span>
                  <div className="dl-chips">{STATUSES.map(s => <button type="button" key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(status === s ? '' : s)}>{s}</button>)}</div>
                </div>
                {err && <div className="dl-alert" role="alert">{err}</div>}
                <button className="dl-cta wide" disabled={busy}>{busy ? 'Sending code…' : 'Send verification code'}</button>
                <p className="dl-fine">By continuing you agree that a CodeBegun counsellor may contact you about our courses.</p>
              </form>
            ) : step === 'otp' ? (
              <form onSubmit={verify} noValidate>
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
        </section>
      </main>

      <footer className="dl-foot">© {new Date().getFullYear()} CodeBegun</footer>
    </div>
  );
}
