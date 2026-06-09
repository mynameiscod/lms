import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { assessmentApi, PROFILE_OPTIONS, PRIMARY_LANGUAGES } from '../../api/assessmentApi';
import './assessment.css';

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 768px)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent));

const STEPS = [
  { n: 1, icon: '📝', title: 'Tell us about you', desc: 'Your level, primary language, and resume. Takes 2 minutes.' },
  { n: 2, icon: '🧠', title: 'Take your AI-tailored exam', desc: 'Real coding tasks built for your level — freshers and seniors get different exams. ~25 min.' },
  { n: 3, icon: '🗺️', title: 'Get your roadmap + free account', desc: 'A day-by-day path to your target role, ready in your dashboard.' },
];

const FEATURES = [
  { icon: '🎯', title: 'Real Readiness Score', desc: 'Scored on actual coding, DSA and problem-solving — not keywords.' },
  { icon: '📊', title: 'Percentile vs peers', desc: 'See exactly where you stand against others targeting the same roles.' },
  { icon: '🗺️', title: 'AI roadmap to your goal', desc: 'Your gaps mapped to a step-by-step plan toward your target role & package.' },
  { icon: '🎓', title: 'Free learning account', desc: 'Concepts, assignments, quizzes and progress tracking in one place.' },
  { icon: '🧩', title: 'Designed for your level', desc: 'No system design for freshers; no aptitude for seniors. Your exam fits you.' },
  { icon: '🤝', title: 'Mentor support', desc: 'Our team helps you close the gap and get interview-ready, faster.' },
];

const FAQ = [
  { q: 'Is it really free?', a: 'Yes — the assessment, your Readiness Score, and your personalized roadmap are 100% free.' },
  { q: 'How is this different from a resume checker?', a: 'A resume tool reads keywords. We test your actual skills with real coding tasks, then build you a learning path — not just feedback.' },
  { q: 'How long does it take?', a: 'Around 20–30 minutes, tailored to your level. You can pause and resume from your account.' },
  { q: 'Do I need to install anything?', a: 'No — everything, including the code editor, runs in your browser.' },
  { q: 'What happens to my data?', a: 'Your resume and answers are private, used only to personalize your assessment and roadmap.' },
];

const COMPANIES = ['Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Adobe'];

const Register: React.FC = () => {
  const { tenantId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const presetSegment = params.get('segment') || '';
  const presetProfile = PROFILE_OPTIONS.find((p) => p.segment === presetSegment)?.value || '';

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    profile: presetProfile, yearsExperience: '', primaryLanguage: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [token, setToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const profileMeta = PROFILE_OPTIONS.find((p) => p.value === form.profile);

  const utmParams = useMemo(() => {
    const u: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => { const v = params.get(k); if (v) u[k.replace('utm_', '')] = v; });
    return u;
  }, [params]);

  const submitForm = async () => {
    setErr('');
    if (!form.firstName.trim() || !form.lastName.trim()) return setErr('Please enter your first and last name.');
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr('Please enter a valid email — your account login is sent here.');
    if (form.phone.replace(/\D/g, '').length < 10) return setErr('Please enter a valid 10-digit phone number.');
    if (!profileMeta) return setErr('Please select where you are right now.');
    setBusy(true);
    try {
      const res = await assessmentApi.register({
        tenantId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        segment: profileMeta.segment,
        year: profileMeta.year,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        primaryLanguage: form.primaryLanguage || undefined,
        isMobile: isMobileDevice(),
        utmParams,
      });
      setToken(res.token);
      if (res.otp?.devCode) setDevCode(res.otp.devCode);
      if (resumeFile) { try { await assessmentApi.uploadResume(res.token, resumeFile); } catch { /* non-blocking */ } }
      setStep('otp');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setErr(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
  };

  const verify = async () => {
    setErr('');
    const code = otp.join('');
    if (code.length !== 6) return setErr('Enter the 6-digit code.');
    setBusy(true);
    try {
      await assessmentApi.verifyOtp(token, code);
      navigate(`/assessment/exam/${token}`);
    } catch (e: any) {
      setErr(e.message || 'Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr('');
    try { const r = await assessmentApi.resendOtp(token); if (r.otp?.devCode) setDevCode(r.otp.devCode); }
    catch (e: any) { setErr(e.message); }
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── Reusable form card ──
  const FormCard = (
    <div className="as-card as-form-card" id="as-form">
      <div className="as-form-head">Start your free assessment</div>
      <div className="as-form-sub">Get your Readiness Score + roadmap in under 30 minutes.</div>
      <div className="as-field">
        <label>Where are you right now?</label>
        <div className="as-chips">
          {PROFILE_OPTIONS.map((p) => (
            <div key={p.value} className={`as-chip ${form.profile === p.value ? 'active' : ''}`} onClick={() => set('profile', p.value)}>{p.label}</div>
          ))}
        </div>
      </div>
      <div className="as-row">
        <div className="as-field"><label>First name</label><input className="as-input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First name" /></div>
        <div className="as-field"><label>Last name</label><input className="as-input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Last name" /></div>
      </div>
      <div className="as-row">
        <div className="as-field"><label>Email (your login is sent here)</label><input className="as-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" /></div>
        <div className="as-field"><label>Mobile number</label><input className="as-input" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" /></div>
      </div>
      <div className="as-row">
        {profileMeta?.professional && (
          <div className="as-field"><label>Years of experience</label><input className="as-input" type="number" inputMode="numeric" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} placeholder="e.g. 5" /></div>
        )}
        <div className="as-field"><label>Primary programming language</label>
          <select className="as-select" value={form.primaryLanguage} onChange={(e) => set('primaryLanguage', e.target.value)}>
            <option value="">Select</option>
            {PRIMARY_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="as-field">
        <label>Resume (optional — sharpens your assessment & roadmap)</label>
        <input className="as-input as-file" type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
        {resumeFile && <div className="as-note">Selected: {resumeFile.name}</div>}
      </div>
      {err && <div className="as-err">{err}</div>}
      <button className="as-btn" disabled={busy} onClick={submitForm} style={{ marginTop: 8 }}>{busy ? 'Please wait…' : 'Start my free assessment →'}</button>
      <div className="as-note">🔒 100% secure · Private · No spam. We'll verify your number, then create your free account.</div>
    </div>
  );

  return (
    <div className="as-root as-landing">
      {/* Nav */}
      <nav className="as-nav">
        <div className="as-nav-inner">
          <div className="as-brand"><span className="as-dot" /><b>CodeBegun</b><span>Compass</span></div>
          <div className="as-nav-actions">
            <a className="as-login-link" onClick={() => scrollTo('how')} style={{ cursor: 'pointer' }}>How it works</a>
            <a className="as-login-link" onClick={() => scrollTo('features')} style={{ cursor: 'pointer' }}>Features</a>
            <a className="as-login-link" onClick={() => scrollTo('faq')} style={{ cursor: 'pointer' }}>FAQ</a>
            <a className="as-login-link" href="/login">Login</a>
            {step === 'form' && <button className="as-btn small primary" onClick={() => scrollTo('as-form')}>Get Started Free</button>}
          </div>
        </div>
      </nav>

      {step === 'form' ? (
        <>
          {/* Hero: text left, form right */}
          <header className="as-hero-2col">
            <div className="as-hero-left">
              <div className="as-pill">⚡ AI-personalized · Built for developers · Free</div>
              <h1 className="as-hero-title">Know if you're ready.<br /><span className="grad">And exactly how to get there.</span></h1>
              <p className="as-hero-sub">A free, AI-personalized developer assessment that scores your <b>real</b> skills — not just your resume — and builds a step-by-step roadmap to your dream role.</p>
              <div className="as-hero-checks">
                <span className="as-hero-check"><span className="ico">✓</span> AI Skill Assessment</span>
                <span className="as-hero-check"><span className="ico">✓</span> Real Coding Tasks</span>
                <span className="as-hero-check"><span className="ico">✓</span> Personalized Roadmap</span>
              </div>
              <div className="as-stats-row">
                <div className="as-stat"><b>12,000+</b><span>Developers assessed</span></div>
                <div className="as-stat"><b>~25 min</b><span>Personalized exam</span></div>
                <div className="as-stat"><b>Free</b><span>Roadmap + account</span></div>
              </div>
              <div className="as-trust-mini"><span className="as-stars">★★★★★</span> Trusted by students &amp; working developers across India</div>
            </div>
            <div className="as-hero-right">
              <div className="as-form-wrap">{FormCard}</div>
            </div>
          </header>

          {/* Companies band */}
          <section className="as-companies">
            <div className="as-companies-label">Prepare for interviews at companies like</div>
            <div className="as-companies-logos">{COMPANIES.map((c) => <span key={c}>{c}</span>)}</div>
          </section>

          {/* How it works */}
          <section className="as-section" id="how">
            <h2 className="as-section-title">How it works</h2>
            <p className="as-section-sub">From sign-up to a personalized roadmap in under 30 minutes.</p>
            <div className="as-steps">
              {STEPS.map((s) => (
                <div className="as-step" key={s.n}>
                  <div className="as-step-num">{s.n}</div>
                  <div className="as-step-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="as-section alt" id="features">
            <h2 className="as-section-title">What you get</h2>
            <p className="as-section-sub">Everything you need to go from "not sure" to interview-ready.</p>
            <div className="as-features">
              {FEATURES.map((f) => (
                <div className="as-feature" key={f.title}>
                  <div className="as-feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonial */}
          <section className="as-section as-trust">
            <div className="as-trust-inner">
              <div className="as-quote">“The assessment showed me exactly what was blocking my switch — DSA and system design. The roadmap got me a product-company offer in 4 months.”</div>
              <div className="as-quote-by">— Ravi K., now Backend SDE-2</div>
            </div>
          </section>

          {/* FAQ */}
          <section className="as-section" id="faq">
            <h2 className="as-section-title">Questions, answered</h2>
            <div className="as-faq">
              {FAQ.map((f) => (
                <details className="as-faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="as-section as-cta-band">
            <h2>Ready to find out where you really stand?</h2>
            <p className="as-section-sub" style={{ marginTop: 8 }}>Join thousands of developers who turned a score into an offer.</p>
            <button className="as-btn primary" style={{ maxWidth: 300, margin: '6px auto 0' }} onClick={() => scrollTo('as-form')}>Start my free assessment →</button>
          </section>
        </>
      ) : (
        <div className="as-wrap">
          <div className="as-card as-form-card as-center">
            <h2 style={{ fontSize: 22, marginBottom: 6 }}>Verify your number</h2>
            <p className="as-note" style={{ marginBottom: 18 }}>Enter the 6-digit code sent to {form.phone} on WhatsApp. We'll create your account and email your login.</p>
            <div className="as-otp">
              {otp.map((d, i) => (
                <input key={i} id={`otp-${i}`} value={d} inputMode="numeric" maxLength={1}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus(); }} />
              ))}
            </div>
            {devCode && <div className="as-dev">Dev mode: your code is {devCode}</div>}
            {err && <div className="as-err">{err}</div>}
            <button className="as-btn" disabled={busy} onClick={verify} style={{ marginTop: 16 }}>{busy ? 'Verifying…' : 'Verify & Start Assessment'}</button>
            <button className="as-btn ghost small" onClick={resend} style={{ marginTop: 10 }}>Resend code</button>
          </div>
        </div>
      )}

      <footer className="as-footer">
        <div className="as-brand"><span className="as-dot" /><b>CodeBegun</b><span>Compass</span></div>
        <span>© {new Date().getFullYear()} CodeBegun · AI-personalized skill assessments &amp; roadmaps that get developers hired.</span>
      </footer>
    </div>
  );
};

export default Register;
