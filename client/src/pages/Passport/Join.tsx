import React, { useEffect, useMemo, useRef, useState } from 'react';
import { hostTenantSlug } from '../../config/hostTenant';
import PassportLogin from './Login';
import { useSearchParams } from 'react-router-dom';
import { passportPublicApi } from '../../api/passportApi';
import type { OnboardingField, RegistrationWindow } from '../../api/passportApi';
import OtpVerify, { isOtpInfo, otpSendMessage } from './OtpVerify';
import './careerpilotJoin.css';
import { startActivityBeacon, trackPage, trackAction, trackFailure, trackNow } from './activityBeacon';
import { JOURNEY, sourceMeta } from './journeyTrack';
import CareerPilotFooter from '../../components/CareerPilotFooter';

const LOGO = '/assets/careerpilot/careerpilot-logo.png';

/**
 * Six, in two columns of three.
 *
 * The order is the order a member lives them — find a direction, measure where you are, get the
 * plan, work it week by week, practise for the interview, apply. The last two are longer than
 * the first four, so `.cpx-checks` sizes its columns as fractions rather than to content:
 * `max-content` would let one of these set a column width the hero cannot afford.
 */
const HERO_CHECKS = [
  'Discover the right career direction',
  'Know your actual skill readiness',
  /* No length named here on purpose: the programme is 90 days for a first-year and 110, 130 or
     150 for the years above, and it is admin-settable per stage — so a figure on the public
     page would be wrong for most of the people reading it. */
  'Get a personalised roadmap',
  'Track your weekly progress & skill milestones',
  'Prepare with targeted interview practice & assessments',
  'Find relevant jobs & internships',
];

/**
 * Public claims on this page must be verified. Keep concrete partner names here only
 * when CodeBegun has a real relationship/engagement that can be represented publicly.
 */
const NETWORK_ITEMS = [
  { icon: 'bi-people-fill', title: 'CareerPilot Campus Network', sub: 'Connect, explore, grow' },
  { icon: 'bi-mortarboard-fill', title: 'Narasaraopeta Engineering College', sub: 'Tech Battle campus engagement' },
  { icon: 'bi-trophy-fill', title: 'Tech Battle Network', sub: 'Campus skill competitions' },
  { icon: 'bi-bank2', title: 'CodeBegun College Network', sub: 'Career readiness outreach' },
  { icon: 'bi-plus-circle-fill', title: 'More Colleges Joining', sub: 'Bring CareerPilot to your campus' },
];

const FEATURES = [
  { icon: 'bi-compass', title: 'Career Direction', desc: 'Understand which roles align with your skills, interests and ambitions.' },
  { icon: 'bi-fingerprint', title: 'Skill DNA', desc: 'See your strengths and gaps across technical, aptitude and career skills.' },
  { icon: 'bi-speedometer2', title: 'Career Readiness Score', desc: 'Know how close you are to your target role with measurable readiness.' },
  { icon: 'bi-signpost-split', title: 'Personalised Roadmap', desc: 'Follow a structured path instead of randomly choosing what to learn next.' },
  { icon: 'bi-pencil-square', title: 'Practice & Assessment', desc: 'Improve continuously through missions, assessments and focused practice.' },
  { icon: 'bi-briefcase', title: 'Job Readiness', desc: 'Connect your preparation to relevant internships and career opportunities.' },
];

const GROWTH = [
  { icon: 'bi-calendar2-check-fill', tone: 'blue', title: 'Daily Missions', desc: 'One small step every day' },
  { icon: 'bi-fire', tone: 'orange', title: 'Career Streaks', desc: 'Build habits that last' },
  { icon: 'bi-bar-chart-fill', tone: 'teal', title: 'XP & Levels', desc: 'Track your progress' },
  { icon: 'bi-star-fill', tone: 'gold', title: 'Coins & Rewards', desc: 'Earn while learning' },
];

const STEPS = [
  { n: '01', icon: 'bi-person-lines-fill', title: 'Tell Us About You', desc: 'Share your education, experience and career ambition.' },
  { n: '02', icon: 'bi-clipboard2-check', title: 'Assess Your Skills', desc: 'Discover your current strengths and the gaps that matter.' },
  { n: '03', icon: 'bi-map', title: 'Get Your Plan', desc: 'Receive a personalised roadmap for your target role.' },
  { n: '04', icon: 'bi-graph-up-arrow', title: 'Improve Every Day', desc: 'Complete missions, practice and build evidence of progress.' },
  { n: '05', icon: 'bi-rocket-takeoff', title: 'Become Job Ready', desc: 'Track readiness and discover relevant opportunities.' },
];

/** Product-preview cards — intentionally no company names or live-job claims. */
const OPPORTUNITY_PREVIEW = [
  { icon: 'bi-code-slash', match: '86%', title: 'Software Engineer Intern', meta: 'Hyderabad · Internship', tags: ['Java', 'Spring Boot', 'SQL'] },
  { icon: 'bi-laptop', match: '79%', title: 'Graduate Engineer Trainee', meta: 'Bengaluru · Entry level', tags: ['DSA', 'Java', 'REST APIs'] },
  { icon: 'bi-bar-chart', match: '74%', title: 'Data Analyst Intern', meta: 'Remote · Internship', tags: ['SQL', 'Excel', 'Power BI'] },
];

/**
 * Outcomes are published only once verified — so these describe what will appear here, and never
 * show an invented student, quote or photo.
 */
const STORIES = [
  { icon: 'bi-briefcase-fill', title: 'Verified Recent Hires', desc: 'Role, company and placement outcome, highlighted from verified CodeBegun placement records.' },
  { icon: 'bi-chat-quote-fill', title: 'Student Testimonials', desc: 'Short student stories on how their career direction, preparation and confidence improved.' },
  { icon: 'bi-buildings-fill', title: 'Campus Success Stories', desc: 'College initiatives and CareerPilot outcomes, published when the institution approves the story.' },
];

const BASE_FAQS: [string, string][] = [
  ['What exactly is CareerPilot?', 'CareerPilot is a career guidance and readiness platform that helps you define a target role, assess your current skills, follow a personalised roadmap and track your progress.'],
  ['Is CareerPilot only for freshers?', 'No. The experience can support students, freshers and working professionals depending on the onboarding options enabled for your CareerPilot program.'],
  ['How is my Career Readiness Score calculated?', 'Your score is built from the assessments and readiness signals available in CareerPilot. As you complete more evidence and activities, the product can update your readiness view.'],
  ['Does CareerPilot guarantee a job?', 'No. CareerPilot supports preparation and can surface relevant opportunities, but hiring decisions remain with employers.'],
  ['Can I change my target career later?', 'Yes. Career direction can evolve. CareerPilot is designed to help you reassess your goal and understand what changes in your roadmap.'],
];

/**
 * A field label whose required "*" can never wrap onto a line of its own: the last word and the
 * star are kept together, so "Branch / Specialization *" breaks as "Branch /" + "Specialization *".
 */
const LabelText: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => {
  const words = String(text || '').trim().split(/\s+/);
  const last = words.pop() || '';
  return (
    <>
      {words.length ? `${words.join(' ')} ` : ''}
      <span className="cpx-label-end">{last}{required ? <em>{'\u00a0'}*</em> : null}</span>
    </>
  );
};

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

/** "2026-10-01T00:00:00Z" → "1 Oct 2026". */
const fmtDay = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const PassportJoin: React.FC = () => {
  const [params] = useSearchParams();
  const tenant = params.get('tenant') || hostTenantSlug() || 'codebegun';

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [fieldsDef, setFieldsDef] = useState<OnboardingField[]>([]);
  const [enabled, setEnabled] = useState(true);
  /** The registration window, as the server resolves it. Closed means the form is not offered. */
  const [registration, setRegistration] = useState<RegistrationWindow | null>(null);
  /**
   * WHETHER THE FORM KNOWS WHAT IT IS ASKING FOR YET.
   *
   * `fieldsDef` starts empty and the tenant's real fields — degree, branch, academic year —
   * arrive from the config call a moment later. Until then this card rendered a complete-looking
   * three-field form that PASSED VALIDATION, because validation is built from the same empty
   * list, and could be submitted.
   *
   * A visitor quick enough to do that created an account with no degree, branch or year. Those
   * three decide passport.stage, which decides whether they are taught the first year or the
   * second — so the cost of the race is not a missing dropdown, it is a student the planner
   * cannot place.
   */
  const [loaded, setLoaded] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [token, setToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [resendIn, setResendIn] = useState(25);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Where do people give up? The page tells us: it was opened, started, submitted, and where it was left.
  const startedRef = useRef(false);
  const verifiedRef = useRef(false);
  const lastFieldRef = useRef('');
  const stepRef = useRef<'form' | 'otp'>('form');
  const filledRef = useRef<string[]>([]);
  stepRef.current = step;
  filledRef.current = Object.keys(form).filter((k) => form[k]);
  useEffect(() => {
    startActivityBeacon();
    trackPage(JOURNEY.view, '/careerpilot/join', sourceMeta());
    const leave = () => { if (!verifiedRef.current) trackNow(JOURNEY.left, { step: stepRef.current, lastField: lastFieldRef.current || '(nothing typed)', filled: filledRef.current }); };
    window.addEventListener('pagehide', leave);
    return () => window.removeEventListener('pagehide', leave);
  }, []);
  useEffect(() => { if (step === 'otp') trackPage(JOURNEY.otpScreen, '/careerpilot/join'); }, [step]);

  const extra = useMemo(() => fieldsDef.filter(f => !['name', 'mobile', 'email'].includes(f.key)), [fieldsDef]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const errors = useMemo(() => validateJoin(form, extra), [form, extra]);
  const errFor = (k: string) => ((touched[k] || tried) ? errors[k] : '');
  const blur = (k: string) => setTouched(p => ({ ...p, [k]: true }));

  /** The price comes from this tenant's own config, so the answer is never a number somebody typed into the page. */
  const faqs = useMemo<[string, string][]>(() => (price == null ? BASE_FAQS : [
    ...BASE_FAQS,
    ['How much does CareerPilot cost?', `Creating your account, taking the skill assessment and seeing your Skill DNA are free. Membership, which unlocks your full personalised roadmap, is ₹${price.toLocaleString('en-IN')}. You can preview the start of your roadmap before you decide.`],
  ]), [price]);
  const faqCols = useMemo(() => [faqs.filter((_, i) => i % 2 === 0), faqs.filter((_, i) => i % 2 === 1)], [faqs]);

  useEffect(() => {
    (async () => {
      try {
        const c = await passportPublicApi.getConfig(tenant);
        setFieldsDef(c.onboardingFields || []);
        setEnabled(c.enabled);
        setRegistration(c.registration || null);
        if (typeof c.priceInr === 'number' && c.priceInr > 0) setPrice(c.priceInr);
      } catch (e: any) {
        /**
         * "NOT AVAILABLE" IS A CLAIM ABOUT THE PRODUCT. A NETWORK ERROR IS NOT.
         *
         * Every failure here said CareerPilot was not available, which is what a visitor also saw
         * when the API was restarting or their connection dropped for a second. That reads as
         * "this college has switched it off" — so somebody who would have signed up leaves, and
         * nobody finds out, because the page looked like it was working as intended.
         *
         * A tenant that really has it switched off answers `enabled: false` above, and that
         * message is the one below. Only an unanswered request lands here.
         */
        setEnabled(false);
        setMsg(e?.response?.data?.message
          || (e?.response
            ? 'CareerPilot is not available right now.'
            : 'We could not reach CareerPilot. Check your connection and try again.'));
      } finally {
        setLoaded(true);
      }
    })();
  }, [tenant]);

  useEffect(() => {
    if (step !== 'otp') return;
    setResendIn(25);
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [step, token]);

  const set = (k: string, v: any) => {
    lastFieldRef.current = k;
    if (!startedRef.current) { startedRef.current = true; trackAction(JOURNEY.started, { meta: { field: k, ...sourceMeta() } }); }
    setForm(p => ({ ...p, [k]: v }));
  };
  /**
   * ── ONE PAGE, TWO FORMS ────────────────────────────────────────────────────────────
   *
   * Every "Log In" control used to set window.location, so a member who landed on the
   * wrong one paid a full page load — and the whole marketing page they were reading was
   * torn down to show them a form. The form swaps in place now; only this card changes.
   *
   * The URL still carries it, so /careerpilot/login keeps working and a link to either
   * form can still be sent to somebody.
   */
  const [authMode, setAuthMode] = useState<'create' | 'signin'>(
    () => (typeof window !== 'undefined' && window.location.pathname.includes('/login') ? 'signin' : 'create'),
  );
  const goLogin = () => {
    setAuthMode('signin');
    setMenuOpen(false);
    document.getElementById('careerpilot-signup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const scrollToSignup = () => {
    setMenuOpen(false);
    document.getElementById('careerpilot-signup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => document.getElementById('jn-name')?.focus({ preventScroll: true }), 450);
  };
  /**
   * A section lands BELOW the sticky top bar, not under it.
   *
   * scrollIntoView({ block: 'start' }) put the section's top at the window's top, where the bar
   * covered its heading. The bar's height is measured at the moment of the jump (it is taller on a
   * phone, and the menu closes first), and the section stops just beneath it.
   */
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const bar = document.querySelector('.cpx-nav') as HTMLElement | null;
      const barBottom = bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - barBottom - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }));
  };

  const submit = async () => {
    /* Belt and braces: the form is not rendered before the fields arrive, and not sent either. */
    if (!loaded) return;
    setTried(true);
    trackAction(JOURNEY.pressed, { meta: { errorFields: Object.keys(errors) } });
    if (Object.keys(errors).length) { trackFailure(JOURNEY.errors, 'form has errors', { fields: Object.keys(errors) }); setMsg(''); return; }

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
      trackAction(JOURNEY.sent);
      setDevCode(r.otp?.devCode || '');
      setStep('otp');
      setMsg(otpSendMessage(r.otp));
    } catch (e: any) {
      trackFailure(JOURNEY.rejected, String(e?.response?.data?.message || 'Signup failed').slice(0, 140));
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
          product: 'careerpilot',
        }));
      }
      verifiedRef.current = true;
      trackNow(JOURNEY.verified, undefined, 'success');
      window.location.href = r.onboardingCompleted ? '/careerpilot' : '/careerpilot/setup';
    } catch (e: any) {
      trackFailure(JOURNEY.wrongOtp, String(e?.response?.data?.message || 'Verification failed').slice(0, 140));
      setMsg(e?.response?.data?.message || 'Verification failed');
    }
    setBusy(false);
  };

  const resend = async () => {
    setResendIn(25);
    trackAction(JOURNEY.resent);
    try {
      const r = await passportPublicApi.resend(token);
      setDevCode(r.otp?.devCode || '');
      setMsg(otpSendMessage(r.otp, true));
    } catch { /* Keep the current OTP screen usable. */ }
  };

  if (enabled && step === 'otp') {
    return (
      <OtpVerify
        mobile={form.mobile || ''}
        busy={busy}
        resendIn={resendIn}
        devCode={devCode}
        error={msg && !isOtpInfo(msg) ? msg : ''}
        message={isOtpInfo(msg) ? msg : ''}
        onVerify={verify}
        onResend={resend}
        onBack={() => { setStep('form'); setMsg(''); }}
      />
    );
  }

  const NAV: [string, string][] = [
    ['How It Works', 'how-it-works'],
    ['Career Tools', 'career-tools'],
    ['Opportunities', 'opportunities'],
    ['Success Stories', 'success-stories'],
    ['FAQs', 'faqs'],
  ];

  return (
    <div className="cpx">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="cpx-nav">
        <div className="cpx-wrap cpx-nav-in">
          <a className="cpx-logo" href={`/careerpilot/join?tenant=${tenant}`} aria-label="CareerPilot by CodeBegun — home">
            <img src={LOGO} alt="CareerPilot by CodeBegun" />
          </a>
          <nav className={`cpx-links${menuOpen ? ' open' : ''}`} aria-label="CareerPilot">
            {NAV.map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={e => { e.preventDefault(); scrollTo(id); }}>{label}</a>
            ))}
          </nav>
          <div className="cpx-nav-cta">
            <button className="cpx-btn cpx-btn-ghost" type="button" onClick={goLogin}>Log In</button>
            <button className="cpx-btn cpx-btn-primary cpx-hide-sm" type="button" onClick={scrollToSignup}>Start My Career Journey</button>
            <button className="cpx-menu" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
              <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'}`} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="cpx-hero">
          <div className="cpx-wrap cpx-hero-grid">
            <div className="cpx-hero-copy">
              <div className="cpx-eyebrow">Your future starts here</div>
              {/* The heading names what the product DOES, in the two halves it actually has.
                  "Stop Guessing Your Career / Build the Right One" could sell any careers site
                  and says nothing about a measured assessment or a day-by-day plan — the two
                  things that make this different and the two things the page goes on to explain.
                  Kept to two short parallel lines so the gradient span lands on the second and
                  the whole heading still fits one line per half on a phone. */}
              <h1>Your skills, measured.<br /><span>Your career, planned.</span></h1>
              <p className="cpx-lead">
                Take one honest assessment, then follow a plan built for your year — day by day,
                from where you are today to the job you want.
              </p>
              <ul className="cpx-checks">
                {HERO_CHECKS.map(c => <li key={c}><i className="bi bi-check-circle-fill" />{c}</li>)}
              </ul>
              <div className="cpx-hero-ctas">
                <button className="cpx-btn cpx-btn-primary cpx-btn-lg" type="button" onClick={scrollToSignup}>
                  Start My Career Journey <i className="bi bi-arrow-right" />
                </button>
                <button className="cpx-btn cpx-btn-outline cpx-btn-lg" type="button" onClick={() => scrollTo('how-it-works')}>
                  <i className="bi bi-play-circle-fill" /> See How It Works
                </button>
              </div>
              <div className="cpx-trust">
                <span className="cpx-trust-dots" aria-hidden="true">
                  <i className="bi bi-mortarboard-fill" /><i className="bi bi-person-workspace" /><i className="bi bi-briefcase-fill" />
                </span>
                Built for students, freshers and career changers
              </div>
            </div>

            {/* The illustration and the signup card share one stage, the card overlapping the picture — no empty
                gutters between three separate columns, and room for the form to be a comfortable size. */}
            <div className="cpx-stage">
            <div className="cpx-hero-visual" aria-hidden="true">
              {/* The floating card and caption are anchored to the picture, not to the column's height. */}
              <div className="cpx-visual-in">
                <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" />
                <div className="cpx-float cpx-float-fit">
                  <span className="cpx-float-ic"><i className="bi bi-star-fill" /></span>
                  <div><b>Career Fit</b><small>High Match</small></div>
                </div>
                <div className="cpx-script">A clearer, <br />brighter future</div>
              </div>
            </div>

            <section className="cpx-card cpx-signup" id="careerpilot-signup" aria-labelledby="cpx-signup-title">
              <div className="cpx-authtabs" role="tablist" aria-label="Create an account or sign in">
                <button role="tab" aria-selected={authMode === 'create'}
                        className={authMode === 'create' ? 'on' : ''}
                        onClick={() => setAuthMode('create')}>Create account</button>
                <button role="tab" aria-selected={authMode === 'signin'}
                        className={authMode === 'signin' ? 'on' : ''}
                        onClick={() => setAuthMode('signin')}>Sign in</button>
              </div>

              {authMode === 'signin' ? (
                /* The real login form, not a copy of it — see Login's `embedded`. */
                <PassportLogin embedded onCreateAccount={() => setAuthMode('create')} />
              ) : (
              <>
              <h2 id="cpx-signup-title">Create Your Account</h2>
              <p className="cpx-card-sub">Start your CareerPilot in under 2 minutes.</p>

              {/* The form is not shown until it knows what it is asking for — see `loaded`. */}
              {!loaded ? (
                <div className="cpx-msg" aria-live="polite">Loading your sign-up form…</div>
              ) : !enabled ? (
                <div className="cpx-msg err">{msg || 'CareerPilot is not available right now.'}</div>
              ) : registration && !registration.open ? (
                /* Joining is closed; existing members can still log in, so that stays. */
                <>
                  <div className="cpx-msg err">
                    {registration.reason === 'NOT_YET_OPEN'
                      ? `Registration${registration.academicSession ? ` for ${registration.academicSession}` : ''} opens on ${fmtDay(registration.opensAt)}.`
                      : `Registration${registration.academicSession ? ` for ${registration.academicSession}` : ''} closed on ${fmtDay(registration.closesAt)}.`}
                  </div>
                  <button className="cpx-btn cpx-btn-soft cpx-login" type="button" onClick={goLogin}>Log In to Your Account</button>
                </>
              ) : (
                <>
                  {msg && <div className="cpx-msg err">{msg}</div>}

                  {/* Two columns on a wide card — the same fields in about half the height. */}
                  <div className="cpx-fields">
                  <div className="cpx-field full">
                    <label htmlFor="jn-name"><LabelText text="Full Name" required /></label>
                    <div className={`cpx-input${errFor('name') ? ' bad' : ''}`}><i className={`bi ${ICON.name}`} /><input id="jn-name" value={form.name || ''} autoComplete="name" aria-invalid={!!errFor('name')} aria-describedby={errFor('name') ? 'jn-name-err' : undefined} onBlur={() => blur('name')} onChange={e => set('name', e.target.value)} placeholder="Enter your full name" /></div>
                    {errFor('name') && <div className="cpx-fe" id="jn-name-err">{errFor('name')}</div>}
                  </div>
                  <div className="cpx-field">
                    <label htmlFor="jn-mob"><LabelText text="Mobile Number" required /></label>
                    <div className={`cpx-input${errFor('mobile') ? ' bad' : ''}`}><i className={`bi ${ICON.mobile}`} /><input id="jn-mob" value={form.mobile || ''} inputMode="numeric" autoComplete="tel" maxLength={10} aria-invalid={!!errFor('mobile')} aria-describedby={errFor('mobile') ? 'jn-mob-err' : undefined} onBlur={() => blur('mobile')} onChange={e => set('mobile', toMobile(e.target.value))} placeholder="10-digit number" /></div>
                    {errFor('mobile') && <div className="cpx-fe" id="jn-mob-err">{errFor('mobile')}</div>}
                  </div>
                  <div className="cpx-field">
                    <label htmlFor="jn-mail"><LabelText text="Email Address" required /></label>
                    <div className={`cpx-input${errFor('email') ? ' bad' : ''}`}><i className={`bi ${ICON.email}`} /><input id="jn-mail" type="email" value={form.email || ''} autoComplete="email" aria-invalid={!!errFor('email')} aria-describedby={errFor('email') ? 'jn-mail-err' : undefined} onBlur={() => blur('email')} onChange={e => set('email', e.target.value)} placeholder="you@example.com" /></div>
                    {errFor('email') && <div className="cpx-fe" id="jn-mail-err">{errFor('email')}</div>}
                  </div>

                  {extra.map((f, i) => (
                    <div className={`cpx-field${extra.length % 2 === 1 && i === extra.length - 1 ? ' full' : ''}`} key={f.key}>
                      <label htmlFor={`jn-${f.key}`}><LabelText text={f.label} required={!!f.required} /></label>
                      <div className={`cpx-input plain${errFor(f.key) ? ' bad' : ''}`}>
                        {f.type === 'select' ? (
                          <select id={`jn-${f.key}`} value={form[f.key] || ''} aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)} onChange={e => set(f.key, e.target.value)}>
                            <option value="">Select…</option>
                            {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : f.type === 'textarea' ? (
                          <textarea id={`jn-${f.key}`} rows={3} maxLength={1000} value={form[f.key] || ''} aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`} />
                        ) : (
                          <input id={`jn-${f.key}`} value={form[f.key] || ''} aria-invalid={!!errFor(f.key)} onBlur={() => blur(f.key)} onChange={e => set(f.key, f.type === 'phone' ? toMobile(e.target.value) : e.target.value)} maxLength={f.type === 'phone' ? 10 : undefined} inputMode={f.type === 'phone' ? 'numeric' : undefined} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}`} />
                        )}
                      </div>
                      {errFor(f.key) && <div className="cpx-fe">{errFor(f.key)}</div>}
                    </div>
                  ))}
                  </div>

                  <button className="cpx-btn cpx-btn-navy cpx-submit" disabled={busy} onClick={submit}>
                    {busy ? 'Please wait…' : <>Start My Career Journey <i className="bi bi-arrow-right" /></>}
                  </button>
                  <div className="cpx-or"><span>Already on CareerPilot?</span></div>
                  <button className="cpx-btn cpx-btn-soft cpx-login" type="button" onClick={goLogin}>Log In to Your Account</button>
                  <p className="cpx-secure"><i className="bi bi-shield-check" aria-hidden="true" />We verify your account with a one-time WhatsApp code.</p>
                </>
              )}
              </>
              )}
            </section>
            </div>
          </div>
        </section>

        {/* ── Campus network ───────────────────────────────────────── */}
        <section className="cpx-network" aria-label="CodeBegun campus network">
          <div className="cpx-wrap cpx-network-grid">
            {NETWORK_ITEMS.map(item => (
              <div className="cpx-network-card" key={item.title}>
                <span className="cpx-network-ic"><i className={`bi ${item.icon}`} /></span>
                <div><b>{item.title}</b><small>{item.sub}</small></div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Product preview ──────────────────────────────────────── */}
        <section className="cpx-section cpx-dash-section">
          <div className="cpx-wrap">
            <div className="cpx-head">
              <div className="cpx-eyebrow">See the bigger picture</div>
              <h2>Your Entire Career, In One Dashboard</h2>
              <p>Know where you stand, what to improve and exactly what you should do next.</p>
            </div>
            {/*
              * THE PREVIEW IS THE REAL HOME, IN MINIATURE.
              *
              * Same sidebar (items and icons as MemberShell), same top bar of stats, same three-part
              * banner (Today's focus | Daily momentum | Coder score) and Today's missions — so what a
              * visitor is shown is what a member gets. Illustrative numbers, built in HTML (no image),
              * and it adapts like the app: icon rail on tablets, stacked on phones.
              */}
            <div className="cpd" role="img" aria-label="Preview of the CareerPilot member home: sidebar, today's focus, daily momentum, coder score and today's missions">
              <aside className="cpd-side" aria-hidden="true">
                <div className="cpd-logo"><img src={LOGO} alt="" /></div>
                <nav>
                  {[['house-door-fill', 'Home'], ['grid', 'My 90 Days'], ['map', 'My Roadmap'], ['code-slash', 'Practice'], ['collection', 'Coding Sets'], ['lightbulb', 'Thinking Lab'], ['chat-dots', 'Communication Lab'], ['mic-fill', 'Mock Interview'], ['file-earmark-text', 'Resume'], ['trophy-fill', 'My Progress']].map(([ic, label], i) => (
                    <span key={label} className={`cpd-nav${i === 0 ? ' on' : ''}`}><i className={`bi bi-${ic}`} /><em>{label}</em></span>
                  ))}
                </nav>
                <div className="cpd-goal"><b><i className="bi bi-bullseye" /> <em>Daily Goal</em></b><span><strong>40</strong> / 115 XP</span><i className="cpd-goal-bar"><s style={{ width: '35%' }} /></i></div>
              </aside>
              <div className="cpd-main" aria-hidden="true">
                <header className="cpd-top">
                  <div className="cpd-hello"><h3>Hey Arjun!</h3><p>Let’s code, solve problems and level up your skills.</p></div>
                  <div className="cpd-stats">
                    <span><i className="bi bi-fire c-fire" /><b>7</b></span>
                    <span><i className="bi bi-coin c-coin" /><b>120</b></span>
                    <span><i className="bi bi-award-fill c-lvl" /><b>Level 4</b></span>
                    <span><i className="bi bi-lightning-charge-fill c-xp" /><b>1,240</b><em>XP</em></span>
                  </div>
                </header>
                <section className="cpd-hero">
                  <div className="cpd-focus">
                    <span className="cpd-eyebrow">Day 12 of 90</span>
                    <h4>Today’s <span>focus</span></h4>
                    <p>75 XP to today’s goal. Finish your missions to get there.</p>
                    <div className="cpd-goalrow"><b>Today’s goal</b><span>40 / 115 XP</span></div>
                    <i className="cpd-bar"><s style={{ width: '35%' }} /></i>
                    <div className="cpd-btns"><span className="cpd-btn primary">Start Day 1 <i className="bi bi-arrow-right" /></span><span className="cpd-btn"><i className="bi bi-map" /> My roadmap</span></div>
                  </div>
                  <div className="cpd-momentum">
                    <span className="cpd-eyebrow">Daily momentum</span>
                    <div className="cpd-streak"><span className="ic"><i className="bi bi-fire" /></span><div><b>7 day streak</b><small>Show up today. Build consistency.</small></div></div>
                    <ol className="cpd-steps"><li className="done"><i /><span>Start</span></li><li className="now"><i /><span>Today</span></li><li className="done"><i /><span>7 days</span></li><li><i /><span>30 days</span></li></ol>
                    <div className="cpd-challenge"><i className="bi bi-bullseye" /><div><b>Today’s challenge</b><small>Finish all 4 tasks today (2 to go)</small></div></div>
                  </div>
                  <div className="cpd-score">
                    <div className="cpd-ring" style={{ ['--p' as any]: 64 }}><div><strong>640</strong><small>/ 1000</small></div></div>
                    <span className="cpd-eyebrow t">Coder score</span>
                    <b>On track</b>
                    <small>Ahead of <strong>72%</strong> of members</small>
                  </div>
                </section>
                <section className="cpd-missions">
                  <header><b><i className="bi bi-list-task" /> Today’s missions</b><span>2 of 4 done</span></header>
                  {[['play-circle', 'Collections in Java — List, Set and Map', 'Watch · 12 min', 20, true], ['code-slash', 'Count word frequencies with a HashMap', 'Code practice · 20 min', 40, true], ['patch-question', 'Checkpoint: choosing the right collection', 'Checkpoint · 10 min', 30, false]].map(([ic, t, meta, xp, done]) => (
                    <div key={String(t)} className={`cpd-mission${done ? ' done' : ''}`}>
                      <span className="ic"><i className={`bi bi-${ic}`} /></span>
                      <span className="tx"><b>{t}</b><small>{meta}</small></span>
                      <span className="xp">+{xp} XP</span>
                      <span className="ck">{done && <i className="bi bi-check-lg" />}</span>
                    </div>
                  ))}
                </section>
              </div>
            </div>
          </div>
        </section>

        {/* ── Growth / gamification ────────────────────────────────── */}
        <section className="cpx-section cpx-growth">
          <div className="cpx-wrap cpx-growth-grid">
            <div className="cpx-growth-copy">
              <div className="cpx-eyebrow">Career growth, made simple</div>
              <h2>Build Your Career.<br />Level Up Every Day.</h2>
              <p>CareerPilot turns meaningful progress into missions, XP, coins, streaks and achievements that keep students moving forward.</p>
              <button className="cpx-btn cpx-btn-navy" type="button" onClick={() => scrollTo('career-tools')}>
                Explore the Features <i className="bi bi-arrow-right" />
              </button>
            </div>
            <div className="cpx-growth-tiles">
              {GROWTH.map(g => (
                <div className="cpx-tile" key={g.title}>
                  <span className={`cpx-tile-ic ${g.tone}`}><i className={`bi ${g.icon}`} /></span>
                  <div><b>{g.title}</b><small>{g.desc}</small></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Career tools ─────────────────────────────────────────── */}
        <section className="cpx-section cpx-white" id="career-tools">
          <div className="cpx-wrap">
            <div className="cpx-head">
              <div className="cpx-eyebrow">Career tools</div>
              <h2>Everything You Need to Navigate Your Career</h2>
              <p>CareerPilot turns career confusion into measurable insights and a clear action plan.</p>
            </div>
            <div className="cpx-features">
              {FEATURES.map(f => (
                <article className="cpx-feature" key={f.title}>
                  <span className="cpx-feature-ic"><i className={`bi ${f.icon}`} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="cpx-section" id="how-it-works">
          <div className="cpx-wrap">
            <div className="cpx-head">
              <div className="cpx-eyebrow">How it works</div>
              <h2>From Confusion to Career Ready</h2>
            </div>
            <ol className="cpx-steps">
              {STEPS.map(s => (
                <li className="cpx-step" key={s.n}>
                  <span className="cpx-step-ic"><i className={`bi ${s.icon}`} /></span>
                  <span className="cpx-step-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Opportunities ────────────────────────────────────────── */}
        <section className="cpx-section cpx-white" id="opportunities">
          <div className="cpx-wrap">
            <div className="cpx-head">
              <div className="cpx-eyebrow">Opportunity preview</div>
              <h2>Internships &amp; Jobs That Match Your Journey</h2>
              <p>A preview of how CareerPilot presents relevant opportunities. Live company openings are shown only when they exist in the platform.</p>
            </div>
            <div className="cpx-opps">
              {OPPORTUNITY_PREVIEW.map(job => (
                <article className="cpx-job" key={job.title}>
                  <div className="cpx-job-top">
                    <span className="cpx-job-ic"><i className={`bi ${job.icon}`} /></span>
                    <span className="cpx-match">{job.match} Match</span>
                  </div>
                  <h3>{job.title}</h3>
                  <p>{job.meta} · Product preview</p>
                  <div className="cpx-tags">{job.tags.map(t => <span key={t}>{t}</span>)}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stories ──────────────────────────────────────────────── */}
        <section className="cpx-section" id="success-stories">
          <div className="cpx-wrap">
            <div className="cpx-head">
              <div className="cpx-eyebrow">Real outcomes</div>
              <h2>Recent Hires &amp; Career Stories</h2>
              <p>CareerPilot will publish student outcomes here only after the placement details and public-use consent are verified.</p>
            </div>
            <div className="cpx-stories">
              {STORIES.map(s => (
                <article className="cpx-story" key={s.title}>
                  <span className="cpx-story-ic"><i className={`bi ${s.icon}`} /></span>
                  <div><h3>{s.title}</h3><p>{s.desc}</p><small>Coming soon · verified stories only</small></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section className="cpx-section cpx-white" id="faqs">
          <div className="cpx-wrap">
            <div className="cpx-head">
              <div className="cpx-eyebrow">Questions</div>
              <h2>Frequently Asked Questions</h2>
            </div>
            <div className="cpx-faq">
              {faqCols.map((col, ci) => (
                <div className="cpx-faq-col" key={ci}>
                  {col.map(([q, a]) => (
                    <details key={q}>
                      <summary><i className="bi bi-chevron-right cpx-faq-caret" aria-hidden="true" />{q}<i className="bi bi-chevron-down cpx-faq-chev" aria-hidden="true" /></summary>
                      <p>{a}</p>
                    </details>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final call to action ─────────────────────────────────── */}
        <section className="cpx-cta">
          <div className="cpx-wrap cpx-cta-in">
            <div className="cpx-cta-copy">
              <h2>Your Career Deserves a Clear Plan.</h2>
              <p>Discover where you stand. Know what to improve. Build toward the career you want.</p>
              <button className="cpx-btn cpx-btn-white" type="button" onClick={scrollToSignup}>
                Start My Career Journey <i className="bi bi-arrow-right" />
              </button>
            </div>
            <div className="cpx-cta-art" aria-hidden="true">
              <i className="bi bi-send-fill" />
              <span className="cpx-script light">Skills today. <br />A brighter tomorrow.</span>
            </div>
          </div>
        </section>
      </main>

      <CareerPilotFooter />
    </div>
  );
};

export default PassportJoin;
