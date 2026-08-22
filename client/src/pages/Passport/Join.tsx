import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import type { OnboardingField } from '../../api/passportApi';
import OtpVerify from './OtpVerify';
import './careerpilotJoin.css';

const FEATURES = [
  { icon: 'bi-compass', title: 'Career Direction', desc: 'Understand which roles align with your skills, interests and ambitions.', label: 'Role fit' },
  { icon: 'bi-fingerprint', title: 'Skill DNA', desc: 'See your strengths and gaps across technical, aptitude and career skills.', label: 'Strength map' },
  { icon: 'bi-speedometer2', title: 'Career Readiness Score', desc: 'Know how close you are to your target role with measurable readiness.', label: 'Readiness meter' },
  { icon: 'bi-signpost-split', title: 'Personalized Roadmap', desc: 'Follow a structured path instead of randomly choosing what to learn next.', label: 'Next steps' },
  { icon: 'bi-pencil-square', title: 'Practice & Assessment', desc: 'Improve continuously through missions, assessments and focused practice.', label: 'Evidence building' },
  { icon: 'bi-briefcase', title: 'Job Readiness', desc: 'Connect your preparation to relevant internships and career opportunities.', label: 'Opportunity match' },
];

const STEPS = [
  { n: '01', title: 'Tell Us About You', desc: 'Share your education, experience and career ambition.' },
  { n: '02', title: 'Assess Your Skills', desc: 'Discover your current strengths and the gaps that matter.' },
  { n: '03', title: 'Get Your Plan', desc: 'Receive a personalized roadmap for your target role.' },
  { n: '04', title: 'Improve Every Day', desc: 'Complete missions, practice and build evidence of progress.' },
  { n: '05', title: 'Become Job Ready', desc: 'Track readiness and discover relevant opportunities.' },
];

/**
 * Public claims on this page must be verified. Keep concrete partner names here only
 * when CodeBegun has a real relationship/engagement that can be represented publicly.
 */
const NETWORK_ITEMS = [
  { icon: 'bi-mortarboard', title: 'Narasaraopeta Engineering College', sub: 'Tech Battle campus engagement' },
  { icon: 'bi-buildings', title: 'CodeBegun College Network', sub: 'Career readiness outreach' },
  { icon: 'bi-trophy', title: 'Tech Battle Network', sub: 'Campus skill competitions' },
  { icon: 'bi-diagram-3', title: 'CareerPilot Campus Network', sub: 'Growing college engagement' },
  { icon: 'bi-plus-circle', title: 'More Colleges Joining', sub: 'Bring CareerPilot to your campus' },
];

/** Product-preview cards — intentionally no company names or live-job claims. */
const OPPORTUNITY_PREVIEW = [
  { icon: 'bi-code-slash', match: '86%', title: 'Software Engineer Intern', meta: 'Hyderabad · Internship', tags: ['Java', 'Spring Boot', 'SQL'] },
  { icon: 'bi-laptop', match: '79%', title: 'Graduate Engineer Trainee', meta: 'Bengaluru · Entry level', tags: ['DSA', 'Java', 'REST APIs'] },
  { icon: 'bi-bar-chart', match: '74%', title: 'Data Analyst Intern', meta: 'Remote · Internship', tags: ['SQL', 'Excel', 'Power BI'] },
];

const FAQS = [
  ['What exactly is CareerPilot?', 'CareerPilot is a career guidance and readiness platform that helps you define a target role, assess your current skills, follow a personalized roadmap and track your progress.'],
  ['Is CareerPilot only for freshers?', 'No. The experience can support students, freshers and working professionals depending on the onboarding options enabled for your CareerPilot program.'],
  ['How is my Career Readiness Score calculated?', 'Your score is built from the assessments and readiness signals available in CareerPilot. As you complete more evidence and activities, the product can update your readiness view.'],
  ['Does CareerPilot guarantee a job?', 'No. CareerPilot supports preparation and can surface relevant opportunities, but hiring decisions remain with employers.'],
  ['Can I change my target career later?', 'Yes. Career direction can evolve. CareerPilot is designed to help you reassess your goal and understand what changes in your roadmap.'],
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

  for (const f of extra) {
    if (f.required && !String(form[f.key] || '').trim()) e[f.key] = `${f.label} is required.`;
  }
  return e;
}

const ICON: Record<string, string> = { name: 'bi-person', mobile: 'bi-phone', email: 'bi-envelope' };

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
  const [resendIn, setResendIn] = useState(25);

  const sentMsg = (m: string) => m.startsWith('We sent') || m.startsWith('New code');
  const extra = useMemo(() => fieldsDef.filter(f => !['name', 'mobile', 'email'].includes(f.key)), [fieldsDef]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const errors = useMemo(() => validateJoin(form, extra), [form, extra]);
  const errFor = (k: string) => ((touched[k] || tried) ? errors[k] : '');
  const blur = (k: string) => setTouched(p => ({ ...p, [k]: true }));
  const networkRail = useMemo(() => [...NETWORK_ITEMS, ...NETWORK_ITEMS], []);

  useEffect(() => {
    (async () => {
      try {
        const c = await passportPublicApi.getConfig(tenant);
        setFieldsDef(c.onboardingFields || []);
        setEnabled(c.enabled);
      } catch {
        setEnabled(false);
        setMsg('CareerPilot is not available right now.');
      }
    })();
  }, [tenant]);

  useEffect(() => {
    if (step !== 'otp') return;
    setResendIn(25);
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step, token]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const goLogin = () => { window.location.href = `/careerpilot/login?tenant=${tenant}`; };
  const scrollToSignup = () => document.getElementById('careerpilot-signup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const submit = async () => {
    setTried(true);
    if (Object.keys(errors).length) { setMsg(''); return; }

    setBusy(true);
    setMsg('');
    try {
      const r = await passportPublicApi.signup({
        tenant,
        name: String(form.name || '').trim(),
        mobile: toMobile(String(form.mobile || '')),
        email: String(form.email || '').trim().toLowerCase(),
        fields: extra.reduce((o, f) => ({ ...o, [f.key]: form[f.key] }), {}),
      });
      setToken(r.token);
      setDevCode(r.otp?.devCode || '');
      setStep('otp');
      setMsg(r.otp?.sent ? 'We sent a code to your WhatsApp.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Enter the code sent to you.'));
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Signup failed');
    }
    setBusy(false);
  };

  const verify = async (code: string) => {
    setBusy(true);
    setMsg('');
    try {
      const r = await passportPublicApi.verify(token, code);
      localStorage.setItem('token', r.token);
      localStorage.setItem('tenantId', r.tenantId);
      if (r.user) {
        localStorage.setItem('user', JSON.stringify({
          _id: r.user.id,
          tenantId: r.tenantId,
          email: r.user.email,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          role: r.user.role,
        }));
      }
      window.location.href = r.onboardingCompleted ? '/careerpilot' : '/careerpilot/setup';
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Verification failed');
    }
    setBusy(false);
  };

  const resend = async () => {
    setResendIn(25);
    try {
      const r = await passportPublicApi.resend(token);
      setDevCode(r.otp?.devCode || '');
      setMsg(r.otp?.sent ? 'New code sent.' : (r.otp?.devCode ? `Dev code: ${r.otp.devCode}` : 'Code resent.'));
    } catch { /* Keep the current OTP screen usable. */ }
  };

  if (enabled && step === 'otp') {
    return (
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
  }

  return (
    <div className="cpj-page">
      <header className="cpj-nav">
        <div className="cpj-wrap cpj-nav-in">
          <a className="cpj-brand" href="/careerpilot/join" aria-label="CodeBegun CareerPilot">
            <img src="/assets/logo.png" alt="CodeBegun" />
            <span className="cpj-brand-divider" />
            <span className="cpj-brand-product">Career<span>Pilot</span></span>
          </a>
          <nav className="cpj-nav-links" aria-label="CareerPilot public navigation">
            <a href="#how-it-works">How It Works</a>
            <a href="#career-tools">Career Tools</a>
            <a href="#opportunities">Opportunities</a>
            <button className="cpj-btn cpj-btn-outline" type="button" onClick={goLogin}>Login</button>
            <button className="cpj-btn cpj-btn-primary" type="button" onClick={scrollToSignup}>Start CareerPilot</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="cpj-hero">
          <div className="cpj-wrap cpj-hero-grid">
            <div>
              <div className="cpj-kicker"><i /> Your career. Decoded.</div>
              <h1>Stop Guessing Your Career.<br /><span>Build the Right One.</span></h1>
              <p className="cpj-hero-lead">CareerPilot understands your goals, measures your real skills and builds a personalized path from where you are today to where you want to go.</p>
              <div className="cpj-checks">
                <div className="cpj-check"><i className="bi bi-check-circle" />Discover the right career direction</div>
                <div className="cpj-check"><i className="bi bi-check-circle" />Know your actual skill readiness</div>
                <div className="cpj-check"><i className="bi bi-check-circle" />Get a personalized career roadmap</div>
                <div className="cpj-check"><i className="bi bi-check-circle" />Find relevant jobs & internships</div>
              </div>

              <div
                className="cpj-hero-visual"
                style={{ marginTop: 24, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <img
                  src="/assets/careerpilot/careerpilot-hero-student.png"
                  alt="CareerPilot student career readiness preview"
                  style={{ width: '100%', maxWidth: 620, height: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </div>

              <div className="cpj-intel" aria-label="CareerPilot product preview">
                <div className="cpj-intel-main">
                  <div className="cpj-intel-label">Career Intelligence</div>
                  <div className="cpj-intel-title">See your strengths, gaps and next best move.</div>
                  <div className="cpj-intel-body">
                    <div className="cpj-ring"><strong>72%</strong></div>
                    <div className="cpj-intel-copy">
                      <small>Top Strength</small><b>Problem Solving</b>
                      <div className="cpj-mini-bar"><span /></div>
                      <small>Next step</small><b>Practice DSA Patterns</b>
                    </div>
                  </div>
                </div>
                <div className="cpj-intel-side">
                  <div className="cpj-micro-card">
                    <small>Skill Progress</small>
                    <div className="cpj-bars"><span style={{ height: '34%' }} /><span /><span /><span /><span /></div>
                  </div>
                  <div className="cpj-micro-card">
                    <small>Career Roadmap</small>
                    <div className="cpj-road-mini"><span>1</span><b /><span>2</span><b /><span>3</span></div>
                  </div>
                </div>
              </div>
            </div>

            <section className="cpj-signup" id="careerpilot-signup" aria-labelledby="cpj-signup-title">
              <div className="cpj-signup-mark" aria-hidden="true"><i className="bi bi-compass" /></div>
              <h2 id="cpj-signup-title">Build Your CareerPilot</h2>
              <div className="cpj-signup-sub">Get started in less than 2 minutes.</div>

              {!enabled ? (
                <div className="cpj-msg err">{msg || 'CareerPilot is not available right now.'}</div>
              ) : (
                <>
                  {msg && <div className="cpj-msg err">{msg}</div>}

                  <div className="cpj-field">
                    <label htmlFor="jn-name">Full Name <em>*</em></label>
                    <div className={`cpj-input-wrap${errFor('name') ? ' bad' : ''}`}><i className={`bi ${ICON.name}`} /><input id="jn-name" value={form.name || ''} autoComplete="name" aria-invalid={!!errFor('name')} aria-describedby={errFor('name') ? 'jn-name-err' : undefined} onBlur={() => blur('name')} onChange={e => set('name', e.target.value)} placeholder="Enter your full name" /></div>
                    {errFor('name') && <div className="cpj-fe" id="jn-name-err">{errFor('name')}</div>}
                  </div>
                  <div className="cpj-field">
                    <label htmlFor="jn-mob">Mobile Number <em>*</em></label>
                    <div className={`cpj-input-wrap${errFor('mobile') ? ' bad' : ''}`}><i className={`bi ${ICON.mobile}`} /><input id="jn-mob" value={form.mobile || ''} inputMode="numeric" autoComplete="tel" maxLength={10} aria-invalid={!!errFor('mobile')} aria-describedby={errFor('mobile') ? 'jn-mob-err' : undefined} onBlur={() => blur('mobile')} onChange={e => set('mobile', toMobile(e.target.value))} placeholder="Enter 10-digit mobile number" /></div>
                    {errFor('mobile') && <div className="cpj-fe" id="jn-mob-err">{errFor('mobile')}</div>}
                  </div>
                  <div className="cpj-field">
                    <label htmlFor="jn-mail">Email Address <em>*</em></label>
                    <div className={`cpj-input-wrap${errFor('email') ? ' bad' : ''}`}><i className={`bi ${ICON.email}`} /><input id="jn-mail" type="email" value={form.email || ''} autoComplete="email" aria-invalid={!!errFor('email')} aria-describedby={errFor('email') ? 'jn-mail-err' : undefined} onBlur={() => blur('email')} onChange={e => set('email', e.target.value)} placeholder="Enter your email address" /></div>
                    {errFor('email') && <div className="cpj-fe" id="jn-mail-err">{errFor('email')}</div>}
                  </div>

                  {extra.map(f => (
                    <div className="cpj-field" key={f.key}>
                      <label htmlFor={`jn-${f.key}`}>{f.label}{f.required ? <em> *</em> : null}</label>
                      <div className={`cpj-input-wrap plain${errFor(f.key) ? ' bad' : ''}`}>
                        {f.type === 'select' ? (
                          <select id={`jn-${f.key}`} value={form[f.key] || ''} aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)} onChange={e => set(f.key, e.target.value)}>
                            <option value="">Select…</option>
                            {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input id={`jn-${f.key}`} value={form[f.key] || ''} aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)} onChange={e => set(f.key, f.type === 'phone' ? toMobile(e.target.value) : e.target.value)} maxLength={f.type === 'phone' ? 10 : undefined} inputMode={f.type === 'phone' ? 'numeric' : undefined} type={f.type === 'number' ? 'number' : 'text'} placeholder={`Enter ${f.label.toLowerCase()}`} />
                        )}
                      </div>
                      {errFor(f.key) && <div className="cpj-fe">{errFor(f.key)}</div>}
                    </div>
                  ))}

                  <button className="cpj-btn cpj-btn-primary cpj-submit" disabled={busy} onClick={submit}>
                    {busy ? 'Please wait…' : <>Start My Career Journey <i className="bi bi-arrow-right" /></>}
                  </button>
                  <div className="cpj-login">Already have an account? <button type="button" onClick={goLogin}>Login</button></div>
                  <div className="cpj-secure"><i className="bi bi-shield-check" /> We use a one-time WhatsApp code to verify your account.</div>
                </>
              )}
            </section>
          </div>
        </section>

        <section className="cpj-network" aria-label="CodeBegun campus network">
          <div className="cpj-wrap"><div className="cpj-network-title">Growing through our college & campus network</div></div>
          <div className="cpj-network-track">
            <div className="cpj-network-rail">
              {networkRail.map((item, index) => (
                <div className="cpj-college" key={`${item.title}-${index}`}>
                  <div className="cpj-college-ic"><i className={`bi ${item.icon}`} /></div>
                  <div><b>{item.title}</b><span>{item.sub}</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cpj-section white" id="career-tools">
          <div className="cpj-wrap">
            <div className="cpj-center"><div className="cpj-section-tag">Know yourself better</div><h2 className="cpj-title">Everything You Need to Navigate Your Career</h2><p className="cpj-desc">CareerPilot turns career confusion into measurable insights and a clear action plan.</p></div>
            <div className="cpj-feature-stage">
              <div className="cpj-feature-visual">
                <div className="cpj-section-tag">CareerPilot intelligence layer</div>
                <div className="cpj-fv-title">From “I’m not sure” to a clear career direction.</div>
                <div className="cpj-map">
                  <div className="cpj-map-avatar"><i className="bi bi-compass" /></div>
                  <div className="cpj-map-flow">
                    <div className="cpj-map-node"><b>Career Fit</b><span>Compare your profile against role pathways</span></div>
                    <div className="cpj-map-node"><b>Skill Evidence</b><span>See what you already demonstrate — and what is missing</span></div>
                    <div className="cpj-map-node"><b>Next Best Action</b><span>Turn gaps into a prioritized learning and practice plan</span></div>
                  </div>
                </div>
                <div className="cpj-visual-panels"><div className="cpj-visual-panel"><small>Role Readiness</small><strong>64%</strong></div><div className="cpj-visual-panel"><small>Top Strength</small><strong>Problem Solving</strong></div></div>
              </div>
              <div className="cpj-feature-grid">
                {FEATURES.map(f => <article className="cpj-feature" key={f.title}><div className="cpj-feature-ic"><i className={`bi ${f.icon}`} /></div><h3>{f.title}</h3><p>{f.desc}</p><div className="cpj-mini-label">{f.label}</div></article>)}
              </div>
            </div>
          </div>
        </section>

        <section className="cpj-section cpj-product">
          <div className="cpj-wrap">
            <div className="cpj-center"><div className="cpj-section-tag">See the product</div><h2 className="cpj-title">Your Entire Career, In One Dashboard</h2><p className="cpj-desc">Know where you stand, what to improve and exactly what you should do today.</p></div>
            <div className="cpj-browser" aria-label="CareerPilot student dashboard preview">
              <div className="cpj-browserbar"><i /><i /><i /></div>
              <div className="cpj-dash">
                <aside className="cpj-side"><div className="cpj-side-brand">CareerPilot</div>{['Career Dashboard','My Roadmap','Skill Meter','Missions','Assessments','Opportunities','Rewards'].map((x,i)=><div key={x} className={`cpj-side-item ${i===0?'active':''}`}>{x}</div>)}</aside>
                <div className="cpj-dash-main">
                  <div className="cpj-dash-head"><div><h3>Good morning, Arjun</h3><p>Target Role · Backend Engineer</p></div><div className="cpj-score-pill">Career Ready · 64%</div></div>
                  <div className="cpj-dash-grid">
                    <div className="cpj-panel"><h4>Career Readiness</h4><div className="cpj-readiness"><div className="cpj-score-ring"><strong>64</strong></div><div style={{flex:1}}>{[['Java',78],['Spring Boot',66],['DSA',54],['System Design',46]].map(([name,val])=><div className="cpj-skill" key={String(name)}><div className="cpj-skill-top"><span>{name}</span><b>{val}</b></div><div className="cpj-skill-bar"><b style={{width:`${val}%`}} /></div></div>)}</div></div></div>
                    <div className="cpj-panel cpj-mission"><h4>Today's Mission</h4><strong>Master Java Collections</strong><p>Complete a focused mission and assessment to improve your backend readiness.</p><div className="cpj-chips"><span className="cpj-chip">+120 XP</span><span className="cpj-chip">25 min</span><span className="cpj-chip">Intermediate</span></div></div>
                    <div className="cpj-panel cpj-road"><h4>Your Career Roadmap</h4><div className="cpj-roadline"><div className="cpj-stage done">Foundation</div><div className="cpj-stage current">Backend Engineering</div><div className="cpj-stage">System Design</div><div className="cpj-stage">Interview Ready</div><div className="cpj-stage">Job Ready</div></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cpj-section">
          <div className="cpj-wrap cpj-game-grid">
            <div className="cpj-game-copy"><div className="cpj-section-tag">Career gamification</div><h3>Build Your Career.<br />Level Up Every Day.</h3><p>CareerPilot turns meaningful progress into missions, XP, coins, streaks and achievements that keep students moving forward.</p><div className="cpj-game-stats"><div className="cpj-game-stat"><strong>Daily Missions</strong><small>Clear actions every day</small></div><div className="cpj-game-stat"><strong>Career Streaks</strong><small>Build consistency</small></div><div className="cpj-game-stat"><strong>XP & Levels</strong><small>See progress happen</small></div><div className="cpj-game-stat"><strong>Coins & Rewards</strong><small>Earn while improving</small></div></div></div>
            <div className="cpj-game-card"><div className="cpj-level-top"><span className="cpj-level">LEVEL 12 · CAREER BUILDER</span><span className="cpj-xp">2,450 / 3,400 XP</span></div><div className="cpj-big-xp">2,450 XP</div><div className="cpj-game-bar"><span /></div><div className="cpj-game-metrics"><div className="cpj-gm"><b>7 days</b><small>Current streak</small></div><div className="cpj-gm"><b>840</b><small>CareerPilot Coins</small></div><div className="cpj-gm"><b>18</b><small>Missions completed</small></div></div></div>
          </div>
        </section>

        <section className="cpj-section white" id="how-it-works"><div className="cpj-wrap"><div className="cpj-center"><div className="cpj-section-tag">How it works</div><h2 className="cpj-title">From Confusion to Career Ready</h2></div><div className="cpj-steps">{STEPS.map(s=><article className="cpj-step" key={s.n}><div className="cpj-step-num">{s.n}</div><h3>{s.title}</h3><p>{s.desc}</p></article>)}</div></div></section>

        <section className="cpj-section" id="opportunities"><div className="cpj-wrap"><div className="cpj-center"><div className="cpj-section-tag">Opportunity preview</div><h2 className="cpj-title">Internships & Jobs That Match Your Journey</h2><p className="cpj-desc">A product preview of how CareerPilot can present relevant opportunities. Live company openings are shown only when they exist in the platform.</p></div><div className="cpj-opps">{OPPORTUNITY_PREVIEW.map(job=><article className="cpj-job" key={job.title}><div className="cpj-job-top"><div className="cpj-company"><i className={`bi ${job.icon}`} /></div><span className="cpj-match">{job.match} Match</span></div><h3>{job.title}</h3><p>{job.meta} · Product preview</p><div className="cpj-tags">{job.tags.map(t=><span key={t}>{t}</span>)}</div></article>)}</div></div></section>

        <section className="cpj-section white"><div className="cpj-wrap"><div className="cpj-center"><div className="cpj-section-tag">Student outcomes</div><h2 className="cpj-title">Recent Hires & Career Stories</h2><p className="cpj-desc">CareerPilot will publish student outcomes here only after the placement details and public-use consent are verified.</p></div><div className="cpj-outcomes"><article className="cpj-outcome"><div className="cpj-avatar"><i className="bi bi-briefcase" /></div><h3>Verified Recent Hires</h3><p>Role, company and placement outcome can be highlighted from verified CodeBegun placement records.</p></article><article className="cpj-outcome"><div className="cpj-avatar"><i className="bi bi-chat-quote" /></div><h3>Student Testimonials</h3><p>Short student stories can explain how career direction, preparation and confidence improved.</p></article><article className="cpj-outcome"><div className="cpj-avatar"><i className="bi bi-buildings" /></div><h3>Campus Success Stories</h3><p>College initiatives and CareerPilot outcomes can be published when the institution approves the public story.</p></article></div></div></section>

        <section className="cpj-section"><div className="cpj-wrap"><div className="cpj-center"><div className="cpj-section-tag">The transformation</div><h2 className="cpj-title">Your Career Shouldn't Be Guesswork</h2></div><div className="cpj-journey"><div className="cpj-before"><h3>Before CareerPilot</h3><ul><li>Unclear which role to choose</li><li>Don't know your actual skill level</li><li>Learning random topics</li><li>Hard to stay consistent</li><li>No idea if you're job ready</li></ul></div><div className="cpj-arrow"><i className="bi bi-arrow-right" /></div><div className="cpj-after"><h3>With CareerPilot</h3><ul><li>Clear target career direction</li><li>Measured Skill DNA</li><li>Personalized roadmap</li><li>Missions, XP and streaks</li><li>Visible Career Readiness Score</li></ul></div></div></div></section>

        <section className="cpj-section white"><div className="cpj-wrap"><div className="cpj-center"><div className="cpj-section-tag">Questions</div><h2 className="cpj-title">Frequently Asked Questions</h2></div><div className="cpj-faq">{FAQS.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>

        <section className="cpj-final"><div className="cpj-wrap"><h2>Your Career Deserves a Clear Plan.</h2><p>Discover where you stand. Know what to improve. Build toward the career you want.</p><button className="cpj-btn" type="button" onClick={scrollToSignup}>Start My CareerPilot <i className="bi bi-arrow-right" /></button></div></section>
      </main>

      <footer className="cpj-footer"><div className="cpj-wrap"><div className="cpj-footer-grid"><div><a className="cpj-brand" href="/careerpilot/join"><img src="/assets/logo.png" alt="CodeBegun" /><span className="cpj-brand-divider" /><span className="cpj-brand-product" style={{color:'#fff'}}>Career<span>Pilot</span></span></a><p>Career clarity, skill readiness and personalized progress — built for the next generation of careers.</p></div><div><h4>CareerPilot</h4><a href="#how-it-works">How It Works</a><a href="#career-tools">Career Tools</a><a href="#opportunities">Opportunities</a></div><div><h4>CodeBegun</h4><a href="https://codebegun.com">About CodeBegun</a><a href="https://codebegun.com">Programs</a><a href="https://codebegun.com">For Colleges</a></div><div><h4>Account</h4><button className="cpj-btn cpj-btn-outline" type="button" onClick={goLogin}>CareerPilot Login</button></div></div><div className="cpj-copy">© {new Date().getFullYear()} CodeBegun · CareerPilot. All rights reserved.</div></div></footer>
    </div>
  );
};

export default PassportJoin;
