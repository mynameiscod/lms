import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { assessmentApi, PROFILE_OPTIONS, PRIMARY_LANGUAGES, TARGET_ROLES } from '../../api/assessmentApi';
import './assessment.css';

const WEB = 'https://www.codebegun.com';

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 768px)').matches || /Mobi|Android|iPhone/i.test(navigator.userAgent));

const STEPS = [
  { n: 1, icon: '📝', title: 'Tell us about you', desc: 'Your level, primary language, and resume. Takes 2 minutes.' },
  { n: 2, icon: '🧠', title: 'Take your AI-tailored exam', desc: 'Real coding tasks built for your level — freshers and seniors get different exams. ~25 min.' },
  { n: 3, icon: '🗺️', title: 'Get your roadmap + free account', desc: 'A day-by-day path to a job-ready, hireable profile — ready in your dashboard.' },
];

const FEATURES = [
  { icon: '🎯', title: 'Real Readiness Score', desc: 'Scored on actual coding, DSA and problem-solving — not keywords.' },
  { icon: '📊', title: 'Percentile vs peers', desc: 'See exactly where you stand against others targeting the same roles.' },
  { icon: '🗺️', title: 'AI roadmap to your goal', desc: 'Your gaps mapped to a step-by-step plan toward your target role & package.' },
  { icon: '🎓', title: 'Free learning account', desc: 'Concepts, assignments, quizzes and progress tracking in one place.' },
  { icon: '🧩', title: 'Designed for your level', desc: 'No system design for freshers; no aptitude for seniors. Your exam fits you.' },
  { icon: '🤝', title: 'Placement-first mentoring', desc: 'Backed by CodeBegun — 79% placement rate and 40+ hiring partners.' },
];

const FAQ = [
  { q: 'Is it really free?', a: 'Yes — the assessment, your Readiness Score, and your personalized roadmap are 100% free.' },
  { q: 'How is this different from a resume checker?', a: 'A resume tool reads keywords. We test your actual skills with real coding tasks, then build you a learning path — not just feedback.' },
  { q: 'How long does it take?', a: 'Around 20–30 minutes, tailored to your level. You can pause and resume from your account.' },
  { q: 'Do I need to install anything?', a: 'No — everything, including the code editor, runs in your browser.' },
  { q: 'What happens to my data?', a: 'Your resume and answers are private, used only to personalize your assessment and roadmap.' },
];

// CodeBegun logo with a text fallback if the asset can't be hot-linked.
const Logo: React.FC = () => {
  const [ok, setOk] = useState(true);
  return ok
    ? <img className="as-logo-img" src="https://codebegun.com/images/logo.png" alt="CodeBegun" onError={() => setOk(false)} />
    : <span className="as-brand" style={{ margin: 0 }}><span className="as-dot" /><b>CodeBegun</b></span>;
};

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
    targetRole: '', linkedinUrl: '', githubUrl: '', communicationText: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [token, setToken] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Resend countdown tick
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

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
    if (!form.targetRole) return setErr('Please pick your target role — your whole plan and score are personalized to it.');
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
        targetRole: form.targetRole,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        githubUrl: form.githubUrl.trim() || undefined,
        communicationText: form.communicationText.trim() || undefined,
        isMobile: isMobileDevice(),
        utmParams,
      });
      setToken(res.token);
      if (res.otp?.devCode) setDevCode(res.otp.devCode);
      if (resumeFile) { try { await assessmentApi.uploadResume(res.token, resumeFile); } catch { /* non-blocking */ } }
      setStep('otp');
      setResendIn(45);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setErr(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onOtpChange = (i: number, v: string) => {
    // Support pasting the whole 6-digit code into any box.
    const digits = v.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = [...otp];
      for (let k = 0; k < digits.length && i + k < 6; k++) next[i + k] = digits[k];
      setOtp(next);
      const last = Math.min(i + digits.length, 5);
      (document.getElementById(`otp-${last}`) as HTMLInputElement)?.focus();
      return;
    }
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
    if (resendIn > 0 || busy) return;
    setErr('');
    setResendIn(45);
    try { const r = await assessmentApi.resendOtp(token); if (r.otp?.devCode) setDevCode(r.otp.devCode); }
    catch (e: any) { setErr(e.message); setResendIn(0); }
  };

  const changeNumber = () => { setStep('form'); setErr(''); setOtp(['', '', '', '', '', '']); };
  const fmtPhone = (p: string) => {
    const d = (p || '').replace(/\D/g, '').slice(-10);
    return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : `+91 ${p}`;
  };
  const mmss = `${String(Math.floor(resendIn / 60)).padStart(2, '0')}:${String(resendIn % 60).padStart(2, '0')}`;

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
      <div className="as-field"><label>Target role <span style={{ color: '#dc2626' }}>*</span></label>
        <select className="as-select" value={form.targetRole} onChange={(e) => set('targetRole', e.target.value)}>
          <option value="">Select the role you're aiming for</option>
          {TARGET_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="as-row">
        <div className="as-field"><label>LinkedIn URL (optional)</label><input className="as-input" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} placeholder="linkedin.com/in/you" /></div>
        <div className="as-field"><label>GitHub URL (optional)</label><input className="as-input" value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} placeholder="github.com/you" /></div>
      </div>
      <div className="as-field">
        <label>In a sentence or two, describe a project you've built or want to build</label>
        <textarea className="as-input" rows={2} value={form.communicationText} onChange={(e) => set('communicationText', e.target.value)} placeholder="e.g. I built a food-delivery app with React and Node where users can track orders live…" />
        <div className="as-note">Used to score your communication — the clearer, the better.</div>
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
      {/* Header */}
      <nav className="as-nav">
        <div className="as-nav-inner">
          <a href={WEB} className="as-logo-link"><Logo /></a>
          <div className="as-nav-actions">
            <a className="as-login-link nav-desktop" href={`${WEB}/#placements`}>Placements</a>
            <a className="as-login-link nav-desktop" href={`${WEB}/blog`}>Blog</a>
            <a className="as-login-link nav-desktop" href={`${WEB}/#about`}>About</a>
            <a className="as-login-link" href="/login">Login</a>
            {step === 'form' && <button className="as-btn small primary" onClick={() => scrollTo('as-form')}>Get Started Free</button>}
          </div>
        </div>
      </nav>

      {step === 'form' ? (
        <>
          {/* Hero */}
          <header className="as-hero-2col">
            <div className="as-hero-left">
              <div className="as-pill">⚡ AI-personalized · Placement-first · Free</div>
              <h1 className="as-hero-title">Know if you're ready.<br /><span className="grad">And exactly how to get there.</span></h1>
              <p className="as-hero-sub">CodeBegun's free, AI-personalized developer assessment scores your <b>real</b> skills — not just your resume — and builds a step-by-step roadmap to a job-ready, hireable profile.</p>
              <div className="as-hero-checks">
                <span className="as-hero-check"><span className="ico">✓</span> AI Skill Assessment</span>
                <span className="as-hero-check"><span className="ico">✓</span> Real Coding Tasks</span>
                <span className="as-hero-check"><span className="ico">✓</span> Personalized Roadmap</span>
              </div>
              <div className="as-stats-row">
                <div className="as-stat"><b>79%</b><span>Placement rate</span></div>
                <div className="as-stat"><b>₹6.2 LPA</b><span>Average salary</span></div>
                <div className="as-stat"><b>40+</b><span>Hiring partners</span></div>
              </div>
              <div className="as-trust-mini"><span className="as-stars">★★★★★</span> Hyderabad's placement-first engineering academy</div>
            </div>
            <div className="as-hero-right">
              <div className="as-form-wrap">{FormCard}</div>
            </div>
          </header>

          {/* Value strip */}
          <section className="as-valuestrip">
            <b>We build engineers companies want to hire.</b> Zero to job-ready in 145 days.
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
            <p className="as-section-sub" style={{ marginTop: 8 }}>Join thousands of developers building a hireable profile with CodeBegun.</p>
            <button className="as-btn primary" style={{ maxWidth: 300, margin: '6px auto 0' }} onClick={() => scrollTo('as-form')}>Start my free assessment →</button>
          </section>
        </>
      ) : (
        <div className="otpv-page">
          <style>{`
            .otpv-page{background:linear-gradient(180deg,#e9f1ff 0%,#f6faff 60%,#ffffff 100%);padding:40px 20px 64px;min-height:70vh;}
            .otpv-grid{max-width:1220px;margin:0 auto;display:grid;grid-template-columns:1fr minmax(430px,520px) 1fr;gap:28px;align-items:center;}
            .otpv-left h2{font-size:30px;line-height:1.15;font-weight:800;color:#0f2350;margin:0 0 14px;letter-spacing:-.01em;}
            .otpv-left h2 .g{color:#2563eb;}
            .otpv-left p.sub{color:#5b6b8c;font-size:14.5px;line-height:1.6;margin:0 0 22px;max-width:330px;}
            .otpv-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:360px;}
            .otpv-stat{background:#fff;border:1px solid #e4ecfb;border-radius:14px;padding:14px 15px;box-shadow:0 6px 18px rgba(37,99,235,.06);}
            .otpv-stat .v{font-size:19px;font-weight:800;color:#0f2350;line-height:1;}
            .otpv-stat .l{font-size:11.5px;color:#7385a8;margin-top:4px;font-weight:600;}
            .otpv-stat .ic{font-size:16px;margin-bottom:8px;display:inline-block;}
            .otpv-illus{margin-top:22px;background:linear-gradient(135deg,#dbe8ff,#eef4ff);border-radius:16px;padding:18px 16px;display:flex;align-items:center;gap:12px;max-width:360px;}
            .otpv-illus .who{font-size:40px;}
            .otpv-tags{display:flex;flex-wrap:wrap;gap:6px;}
            .otpv-tag{font-size:11px;font-weight:800;color:#fff;border-radius:7px;padding:4px 9px;}
            .otpv-card{background:#fff;border:1px solid #e6eefc;border-radius:22px;padding:30px 30px 26px;box-shadow:0 24px 60px rgba(20,50,110,.12);}
            .otpv-steps{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:26px;}
            .otpv-step{display:flex;flex-direction:column;align-items:center;gap:6px;flex:none;width:66px;}
            .otpv-step .sic{width:38px;height:38px;border-radius:50%;background:#eef2f9;color:#9aa7bd;display:grid;place-items:center;font-size:15px;}
            .otpv-step.on .sic{background:#2563eb;color:#fff;box-shadow:0 6px 14px rgba(37,99,235,.35);}
            .otpv-step span{font-size:11px;color:#9aa7bd;font-weight:700;text-align:center;line-height:1.2;}
            .otpv-step.on span{color:#2563eb;}
            .otpv-stepline{flex:1;height:2px;background:#e4e9f2;margin-top:18px;}
            .otpv-shield{width:52px;height:52px;border-radius:50%;background:#e0edff;display:grid;place-items:center;margin:2px auto 14px;}
            .otpv-title{text-align:center;font-size:20px;font-weight:800;color:#0f2350;margin:0 0 6px;display:flex;align-items:center;justify-content:center;gap:8px;}
            .otpv-desc{text-align:center;color:#5b6b8c;font-size:13.5px;margin:0 0 4px;}
            .otpv-phone{text-align:center;font-size:16px;font-weight:800;color:#0f2350;margin:2px 0 2px;}
            .otpv-change{background:none;border:none;color:#2563eb;font-weight:700;font-size:13px;cursor:pointer;padding:0 0 0 6px;}
            .otpv-boxes{display:flex;gap:10px;justify-content:center;margin:20px 0 8px;}
            .otpv-box{width:52px;height:60px;text-align:center;font-size:24px;font-weight:800;color:#0f2350;border:1.6px solid #d7e0f2;border-radius:13px;outline:none;transition:.15s;background:#fbfcff;}
            .otpv-box:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.16);background:#fff;}
            .otpv-resend{display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;color:#7385a8;margin:14px 0 4px;}
            .otpv-timer{background:#eef3ff;color:#2563eb;font-weight:800;border-radius:8px;padding:3px 9px;font-variant-numeric:tabular-nums;}
            .otpv-resend button{background:none;border:none;color:#2563eb;font-weight:800;font-size:13px;cursor:pointer;}
            .otpv-resend button:disabled{color:#b6c1d6;cursor:default;}
            .otpv-verify{width:100%;margin-top:18px;background:linear-gradient(90deg,#2563eb,#1d4ed8);color:#fff;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 12px 26px rgba(37,99,235,.32);transition:.15s;}
            .otpv-verify:hover{filter:brightness(1.05);}
            .otpv-verify:disabled{opacity:.7;cursor:default;box-shadow:none;}
            .otpv-secure{text-align:center;color:#5b6b8c;font-size:13px;font-weight:700;margin-top:16px;display:flex;align-items:center;justify-content:center;gap:6px;}
            .otpv-secure-sub{text-align:center;color:#93a1bd;font-size:12px;margin-top:3px;}
            .otpv-err{background:#fef2f2;color:#b91c1c;border-radius:10px;padding:9px 12px;font-size:13px;text-align:center;margin-top:12px;}
            .otpv-dev{background:#f1f5f9;color:#475569;border-radius:8px;padding:7px 10px;font-size:12px;text-align:center;margin-top:10px;}
            .otpv-right{display:flex;flex-direction:column;gap:16px;padding-left:6px;}
            .otpv-chip{background:#fff;border:1px solid #e6eefc;border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:11px;box-shadow:0 8px 22px rgba(37,99,235,.07);}
            .otpv-chip:nth-child(2){margin-left:26px;}
            .otpv-chip:nth-child(3){margin-left:12px;}
            .otpv-chip .cic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:16px;flex:none;}
            .otpv-chip .ct{font-size:13.5px;font-weight:800;color:#0f2350;line-height:1.2;}
            .otpv-chip .cs{font-size:11.5px;color:#7385a8;}
            @media (max-width:1040px){.otpv-grid{grid-template-columns:1fr;max-width:520px;}.otpv-left,.otpv-right{display:none;}}
            @media (max-width:520px){.otpv-card{padding:24px 18px;}.otpv-box{width:44px;height:54px;font-size:21px;}.otpv-step span{font-size:10px;}}
          `}</style>
          <div className="otpv-grid">
            {/* Left — journey + stats */}
            <aside className="otpv-left">
              <h2>Your Journey to a<br /><span className="g">Better Career Starts Here!</span> 🚀</h2>
              <p className="sub">Verify your number and take the first step towards a personalized AI-powered assessment and career success.</p>
              <div className="otpv-stats">
                <div className="otpv-stat"><span className="ic">🎓</span><div className="v">10,000+</div><div className="l">Students Trained</div></div>
                <div className="otpv-stat"><span className="ic">📈</span><div className="v">92%</div><div className="l">Placement Rate</div></div>
                <div className="otpv-stat"><span className="ic">🏢</span><div className="v">500+</div><div className="l">Hiring Partners</div></div>
                <div className="otpv-stat"><span className="ic">⭐</span><div className="v">145 Days</div><div className="l">To Job Ready</div></div>
              </div>
              <div className="otpv-illus">
                <span className="who">👨‍💻</span>
                <div className="otpv-tags">
                  <span className="otpv-tag" style={{ background: '#f59e0b' }}>JAVA</span>
                  <span className="otpv-tag" style={{ background: '#2563eb' }}>PYTHON</span>
                  <span className="otpv-tag" style={{ background: '#8b5cf6' }}>DSA</span>
                  <span className="otpv-tag" style={{ background: '#0ea5a4' }}>REACT</span>
                </div>
              </div>
            </aside>

            {/* Center — OTP card */}
            <div className="otpv-card">
              <div className="otpv-steps">
                {[
                  { ic: '📱', label: 'Verify Number', on: true },
                  { ic: '📝', label: 'Assessment', on: false },
                  { ic: '📊', label: 'Report', on: false },
                  { ic: '💼', label: 'Interview Prep', on: false },
                ].map((s, i, a) => (
                  <React.Fragment key={s.label}>
                    <div className={`otpv-step ${s.on ? 'on' : ''}`}>
                      <div className="sic">{s.ic}</div>
                      <span>{s.label}</span>
                    </div>
                    {i < a.length - 1 && <div className="otpv-stepline" />}
                  </React.Fragment>
                ))}
              </div>

              <div className="otpv-shield">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="#2563eb"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.2 14.2L7 11.4l1.4-1.4 2.4 2.4 4.8-4.8L17 9l-6.2 6.2z" /></svg>
              </div>
              <div className="otpv-title">Verify your WhatsApp number
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-2.99 0-1.42.75-2.12 1.01-2.41.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.17-.19.69-.81.88-1.09.19-.28.37-.23.62-.14.25.09 1.6.75 1.87.89.28.14.46.21.53.32.07.12.07.68-.17 1.36z" /></svg>
              </div>
              <p className="otpv-desc">We've sent a 6-digit verification code to</p>
              <div className="otpv-phone">{fmtPhone(form.phone)} <button className="otpv-change" onClick={changeNumber}>Change</button></div>

              <div className="otpv-boxes">
                {otp.map((d, i) => (
                  <input key={i} id={`otp-${i}`} className="otpv-box" value={d} inputMode="numeric" maxLength={1} autoFocus={i === 0}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); onOtpChange(0, t); } }}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus(); }} />
                ))}
              </div>

              <div className="otpv-resend">
                <span>Didn't receive the code?</span>
                {resendIn > 0 && <span className="otpv-timer">{mmss}</span>}
                <button onClick={resend} disabled={resendIn > 0 || busy}>Resend OTP</button>
              </div>

              {devCode && <div className="otpv-dev">Dev mode: your code is <b>{devCode}</b></div>}
              {err && <div className="otpv-err">{err}</div>}

              <button className="otpv-verify" disabled={busy} onClick={verify}>
                {busy ? 'Verifying…' : '✈  Verify & Start Assessment'} <span>→</span>
              </button>

              <div className="otpv-secure">🔒 100% Secure Verification</div>
              <div className="otpv-secure-sub">Your data is safe with us and will never be shared.</div>
            </div>

            {/* Right — feature chips */}
            <aside className="otpv-right">
              {[
                { ic: '🛡️', bg: '#e0edff', t: 'Secure', s: 'Verification' },
                { ic: '⚡', bg: '#fef3c7', t: 'Instant', s: 'Access' },
                { ic: '🎯', bg: '#ffe4e6', t: 'Personalized', s: 'Assessment' },
                { ic: '🏆', bg: '#fef9c3', t: 'Career', s: 'Success' },
              ].map((c) => (
                <div className="otpv-chip" key={c.t}>
                  <span className="cic" style={{ background: c.bg }}>{c.ic}</span>
                  <div><div className="ct">{c.t}</div><div className="cs">{c.s}</div></div>
                </div>
              ))}
            </aside>
          </div>
        </div>
      )}

      {/* Branded footer */}
      <footer className="as-footer-rich">
        <div className="as-footer-cols">
          <div className="as-footer-col">
            <a href={WEB} className="as-logo-link"><Logo /></a>
            <p className="as-footer-tag">Hyderabad's edutech startup — building engineers top companies want to hire. Zero to job-ready in 145 days.</p>
            <div className="as-footer-social">
              <a href="https://www.linkedin.com/company/codbegun/" target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
              <a href="https://www.instagram.com/codebegun/" target="_blank" rel="noreferrer" aria-label="Instagram">ig</a>
              <a href="https://www.youtube.com/@CodeBegun" target="_blank" rel="noreferrer" aria-label="YouTube">yt</a>
              <a href="https://www.facebook.com/share/1ut7vgqnTQdE82tS/" target="_blank" rel="noreferrer" aria-label="Facebook">fb</a>
            </div>
          </div>
          <div className="as-footer-col">
            <h4>Programs</h4>
            <a href={`${WEB}/java-full-stack`}>Java Full Stack</a>
            <a href={`${WEB}/data-science`}>Data Science</a>
            <a href={`${WEB}/data-analyst`}>Data Analyst</a>
            <a href={`${WEB}/data-engineer`}>Data Engineer</a>
            <a href={`${WEB}/generative-ai`}>Generative AI</a>
          </div>
          <div className="as-footer-col">
            <h4>Company</h4>
            <a href={`${WEB}/#about`}>About</a>
            <a href={`${WEB}/#placements`}>Placements</a>
            <a href={`${WEB}/#students`}>For Students</a>
            <a href={`${WEB}/hire-from-us`}>For Recruiters</a>
            <a href={`${WEB}/blog`}>Blog</a>
          </div>
          <div className="as-footer-col">
            <h4>Contact</h4>
            <p className="as-footer-addr">Plot No.4, Flat 102, SM Reddy Complex, Madhapur, Hyderabad, Telangana 500081</p>
            <a href="tel:+916301099587">+91 63010 99587</a>
            <a href="mailto:contact@codebegun.com">contact@codebegun.com</a>
          </div>
        </div>
        <div className="as-footer-bottom">© {new Date().getFullYear()} CodeBegun · All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Register;
