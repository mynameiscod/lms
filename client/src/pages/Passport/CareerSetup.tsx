import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import passportApi, { AssessmentAvailability, CareerContext, CareerContextOptions } from '../../api/passportApi';
import { useMember } from './MemberLayout';
import './careerSetup.css';

type Answers = {
  degree: string; branch: string; currentAcademicYear: string;
  primaryRole: string;
  preferredProgrammingLanguages: string[];
  minutesPerDay: number | null;
  daysPerWeek: number | null;
};

type StepKey = 'education' | 'direction' | 'technology' | 'commitment';

type LangMeta = { icon?: string; label: string; tone: string };

const STEP_LABEL: Record<StepKey, string> = {
  education: 'Your studies', direction: 'Direction', technology: 'Technology', commitment: 'Commitment',
};

const STEP_ICON: Record<StepKey, string> = {
  education: 'bi-mortarboard', direction: 'bi-compass', technology: 'bi-code-slash', commitment: 'bi-calendar-check',
};

const BENEFITS = [
  { icon: 'bi-bullseye', title: 'Personalized Roadmap', text: 'Get a plan that fits your goals' },
  { icon: 'bi-graph-up-arrow', title: 'Smart Recommendations', text: 'Discover the right skills and paths' },
  { icon: 'bi-trophy', title: 'Track & Achieve', text: 'Complete missions and level up' },
  { icon: 'bi-briefcase', title: 'Real Opportunities', text: 'Find jobs & internships that match you' },
];

const CAPABILITIES = [
  { icon: 'bi-compass', title: 'Discover Best Career Paths' },
  { icon: 'bi-stars', title: 'Get AI-Powered Recommendations' },
  { icon: 'bi-code-slash', title: 'Build In-Demand Skills' },
  { icon: 'bi-briefcase', title: 'Unlock Real Opportunities' },
  { icon: 'bi-award', title: 'Track Progress & Earn Rewards' },
];

const LANG_META: Record<string, LangMeta> = {
  JAVA: { label: 'Java', tone: '#f89820', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg' },
  PYTHON: { label: 'Python', tone: '#3776ab', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg' },
  JAVASCRIPT: { label: 'JavaScript', tone: '#d6b900', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg' },
  TYPESCRIPT: { label: 'TypeScript', tone: '#3178c6', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg' },
  C: { label: 'C', tone: '#5c6bc0', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg' },
  'C++': { label: 'C++', tone: '#00599c', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg' },
  CPP: { label: 'C++', tone: '#00599c', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg' },
  SQL: { label: 'SQL', tone: '#336791', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg' },
  HTML: { label: 'HTML', tone: '#e34f26', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg' },
  CSS: { label: 'CSS', tone: '#1572b6', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg' },
  REACT: { label: 'React', tone: '#149eca', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg' },
  NODEJS: { label: 'Node.js', tone: '#5fa04e', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg' },
  'NODE.JS': { label: 'Node.js', tone: '#5fa04e', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg' },
  GIT: { label: 'Git', tone: '#f05032', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg' },
};

const languageMeta = (name: string): LangMeta => {
  const key = name.trim().toUpperCase();
  if (key.includes('NOT SURE') || key === 'NOT_SURE') return { label: name, tone: '#359AAD' };
  return LANG_META[key] || { label: name, tone: '#359AAD' };
};

const educationMissing = (missing: string[]) =>
  missing.includes('education.degree') || missing.includes('education.currentAcademicYear');

/**
 * How many roles the picker shows before asking to be expanded.
 *
 * The list was every role in one column-pair, so it ran off the screen at nineteen and would
 * have grown a row for each one added after. A dropdown was ruled out, and grouping by category
 * is not possible honestly: a role option carries only a key, a label and a blurb, so any
 * grouping would be guessed from the label and would file every future role wrongly — which is
 * the exact failure being designed against.
 *
 * Search plus a cap needs no taxonomy and does not grow: whatever is added is findable by typing,
 * and the default view stays this many rows for ever.
 */
const ROLE_VISIBLE = 8;

/** Stable per-role tint, so a colour does not jump to a different card while filtering. */
const roleTone = (key: string): number => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 6) + 1;
};

const CareerSetup: React.FC = () => {
  const { reload: reloadMember } = useMember();
  const nav = useNavigate();
  /** `?step=direction` — which part of setup the member came back to change. */
  const [params] = useSearchParams();
  const [ctx, setCtx] = useState<CareerContext | null>(null);
  const [opts, setOpts] = useState<CareerContextOptions | null>(null);
  const [stepIx, setStepIx] = useState(0);
  const [editEducation, setEditEducation] = useState(false);
  const [a, setA] = useState<Answers>({ degree: '', branch: '', currentAcademicYear: '', primaryRole: '', preferredProgrammingLanguages: [], minutesPerDay: null, daysPerWeek: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [avail, setAvail] = useState<AssessmentAvailability | null>(null);
  /** Role search and the collapsed/expanded state of the role grid. See ROLE_VISIBLE below. */
  const [roleQuery, setRoleQuery] = useState('');
  const [rolesExpanded, setRolesExpanded] = useState(false);

  useEffect(() => {
    passportApi.getCareerContext()
      .then(r => {
        setCtx(r.context); setOpts(r.options);
        setA({
          degree: r.context.education.degree || r.context.education.program || '',
          branch: r.context.education.branch || '',
          currentAcademicYear: r.context.education.currentAcademicYear || '',
          primaryRole: r.context.career.primaryRole || '',
          preferredProgrammingLanguages: r.context.career.preferredProgrammingLanguages || [],
          minutesPerDay: r.context.availability.minutesPerDay,
          daysPerWeek: r.context.availability.daysPerWeek,
        });
        /**
         * ARRIVING TO CHANGE SOMETHING IS NOT THE SAME AS ARRIVING FRESH.
         *
         * Setup jumped straight to the "Your CareerPilot is ready!" summary whenever
         * onboarding was complete — and that summary had no way to change anything, despite
         * saying "You can change any of it later". So the roadmap's "Choose my target role"
         * button landed here and showed a page with two buttons, neither of which chose a
         * role: assessment, or dashboard. A member aiming at "Not sure yet" could go round
         * that loop forever without ever reaching the picker.
         *
         * `?step=direction` says which part they came to edit, and lands them on it.
         */
        const want = params.get('step') as StepKey | null;
        if (want) { setDone(false); setEditEducation(want === 'education'); }
        else if (r.context.status.onboardingCompleted) setDone(true);
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your details.'));
  }, []);

  const steps = useMemo<StepKey[]>(() => {
    const needsEducation = ctx ? educationMissing(ctx.status.missing) : false;
    return [...(needsEducation || editEducation ? ['education' as StepKey] : []), 'direction', 'technology', 'commitment'];
  }, [ctx, editEducation]);

  const step = steps[Math.min(stepIx, steps.length - 1)];
  const isLast = stepIx >= steps.length - 1;

  const patchFor = (upto: number) => {
    const seen = steps.slice(0, upto + 1);
    const p: any = {};
    if (seen.includes('education')) {
      p.degree = a.degree; p.program = a.degree; p.branch = a.branch; p.currentAcademicYear = a.currentAcademicYear;
    }
    if (seen.includes('direction')) p.primaryRole = a.primaryRole;
    if (seen.includes('technology')) p.preferredProgrammingLanguages = a.preferredProgrammingLanguages;
    if (seen.includes('commitment')) {
      if (a.minutesPerDay) p.minutesPerDay = a.minutesPerDay;
      if (a.daysPerWeek) p.daysPerWeek = a.daysPerWeek;
    }
    return p;
  };

  const go = async (next: number, complete = false) => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.updateCareerContext({ ...patchFor(stepIx), ...(complete ? { complete: true } : {}) });
      setCtx(r.context);
      if (complete) { setDone(true); reloadMember(); } else setStepIx(next);   // home must see setupCompleted
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save that. Please try again.');
    }
    setBusy(false);
  };

  const canAdvance = useMemo(() => {
    if (step === 'education') return !!a.degree && !!a.currentAcademicYear;
    if (step === 'direction') return !!a.primaryRole;
    if (step === 'technology') return true;
    return !!a.minutesPerDay && !!a.daysPerWeek;
  }, [step, a]);

  useEffect(() => {
    if (!done) return;
    let alive = true;
    passportApi.getAssessmentAvailability()
      .then(r => { if (alive) setAvail(r); })
      .catch(() => { if (alive) setAvail({ assessmentAvailable: false, discovery: false, inProgress: false }); });
    return () => { alive = false; };
  }, [done]);

  const toggleLang = (l: string) => setA(s => ({
    ...s,
    preferredProgrammingLanguages: s.preferredProgrammingLanguages.includes(l)
      ? s.preferredProgrammingLanguages.filter(x => x !== l)
      : [...s.preferredProgrammingLanguages, l],
  }));

  if (err && !ctx) return <div className="cps cps-state"><div className="cps-err">{err}</div></div>;
  if (!ctx || !opts) return <div className="cps cps-state"><div className="cps-load">Loading your details…</div></div>;

  const knownContext = [ctx.education.degree || ctx.education.program, ctx.education.branch, ctx.education.currentAcademicYear].filter(Boolean).join(' · ');

  const header = (
    <header className="cps-topbar">
      <a className="cps-brand" href="/careerpilot" aria-label="CareerPilot by CodeBegun"><img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun" /></a>
      <div className="cps-safe"><i className="bi bi-shield-check" /> Your data is safe & secure</div>
    </header>
  );

  if (done) {
    const stage = opts.stages.find(s => s.key === ctx.derived.stage);
    const role = opts.roles.find(r => r.key === ctx.career.primaryRole);
    const studying = [ctx.education.degree, ctx.education.branch].filter(Boolean).join(' · ');
    const langs = ctx.career.preferredProgrammingLanguages;
    const minutes = ctx.availability.minutesPerDay;
    const days = ctx.availability.daysPerWeek;
    const facts: { icon: string; label: string; value: string }[] = [
      { icon: 'bi-mortarboard', label: 'Studying', value: studying || '—' },
      { icon: 'bi-calendar3', label: 'Year', value: ctx.education.currentAcademicYear || '—' },
      ...(ctx.career.careerGoal ? [{ icon: 'bi-bullseye', label: 'Broad goal', value: ctx.career.careerGoal }] : []),
      { icon: 'bi-compass', label: 'Aiming for', value: role?.label || 'Not sure yet' },
      { icon: 'bi-code-slash', label: 'Interested in', value: langs.join(', ') || 'Open to anything' },
      { icon: 'bi-clock', label: 'Time each day', value: minutes ? `${minutes} minutes` : '—' },
      { icon: 'bi-calendar-week', label: 'Days a week', value: days ? `${days} days` : '—' },
    ];
    const pills = [role?.label && role.key !== 'NOT_SURE' ? role.label : 'Exploring directions', studying, minutes && days ? `${minutes} min × ${days} days` : ''].filter(Boolean) as string[];
    const reroutable = avail && !avail.assessmentAvailable
      && (avail.reasonCode === 'ROLE_NOT_CONFIGURED' || avail.reasonCode === 'BLUEPRINT_UNPUBLISHED' || avail.reasonCode === 'BLUEPRINT_EMPTY');
    return (
      <div className="cps">
        {header}
        <main className="cpr">
          {/* A celebration band in the logo's navy, then the plan's inputs and the one next step. */}
          <section className="cpr-band">
            <div className="cpr-wrap cpr-band-grid">
              <div className="cpr-band-copy">
                <div className="cpr-badge"><i className="bi bi-check-lg" /></div>
                <div className="cpr-eyebrow">Profile ready</div>
                <h1>Your CareerPilot is ready!</h1>
                <p>CareerPilot will use these choices to personalise your assessment, roadmap and daily missions. You can change any of it later.</p>
                <div className="cpr-pills">{pills.map(t => <span key={t}>{t}</span>)}</div>
              </div>
              <div className="cpr-band-art" aria-hidden="true">
                <div className="cpr-art-frame"><img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" /></div>
              </div>
            </div>
          </section>

          <section className="cpr-wrap cpr-body">
            <div className="cpr-card">
              <div className="cpr-col">
                <h2>Your plan is built around</h2>
                <div className="cpr-facts">
                  {facts.map(f => (
                    <div className="cpr-fact" key={f.label}>
                      <span className="cpr-fact-ic"><i className={`bi ${f.icon}`} /></span>
                      <div><small>{f.label}</small><b>{f.value}</b></div>
                    </div>
                  ))}
                </div>
                {stage && (
                  <div className="cpr-stage">
                    <i className="bi bi-flag-fill" />
                    <div><small>Your career stage</small><b>{stage.label}</b><span>{stage.blurb}</span></div>
                  </div>
                )}
              </div>

              <div className="cpr-col cpr-next">
                <h2>What happens next</h2>
                <ol className="cpr-steps">
                  <li className="now"><span>1</span><div><b>Take your skill assessment</b><small>Questions chosen for your stage and direction.</small></div></li>
                  <li><span>2</span><div><b>See your Skill DNA</b><small>Your strengths and gaps, measured — not guessed.</small></div></li>
                  <li><span>3</span><div><b>Get your personalised roadmap</b><small>A day-by-day plan built from what the assessment measured.</small></div></li>
                </ol>

                {avail === null && <div className="cps-load">Checking your assessment…</div>}
                {avail?.assessmentAvailable && (
                  <button className="cpr-cta" onClick={() => nav('/careerpilot/skill-assessment')}>
                    {avail.inProgress ? 'Continue my assessment' : 'Start my personalized assessment'} <i className="bi bi-arrow-right" />
                  </button>
                )}
                {/*
                  ONE ACTION ON THIS SCREEN: start the assessment. "Change my choices" and "Go to my dashboard" were
                  removed deliberately — two ghost buttons under the primary one gave equal weight to leaving. Changing
                  choices stays reachable from Role Readiness, Resume Center and Placement Readiness (setup?step=direction).
                  When the assessment is unavailable the primary button does not render, so the way out below remains —
                  but only where choosing another role would actually help.
                */}
                {avail && !avail.assessmentAvailable && (
                  <>
                    <div className="cps-known cps-notready"><i className="bi bi-info-circle" /><span><b>{avail.message || 'This career path is not ready for assessment yet.'}</b><em>{reroutable ? 'Choose another role, or pick “Not sure yet” — everything else in your plan still works.' : 'Nothing is wrong with your profile — we are still writing the questions for your stage. There is nothing for you to do; we will let you know the moment it is ready.'}</em></span></div>
                    {reroutable && (
                      <button className="cps-btn ghost cpr-alt" onClick={() => { setDone(false); setStepIx(steps.indexOf('direction')); }}>
                        <i className="bi bi-pencil" /> Choose a different role
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
        <footer className="cps-footer"><div className="cps-footer-brand"><img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun" /></div><span>© {new Date().getFullYear()} CodeBegun · CareerPilot. All rights reserved.</span><span className="cps-footer-made">Made for ambitious careers in India</span></footer>
      </div>
    );
  }

  return (
    <div className="cps">
      {header}
      <main className="cps-shell">
        <aside className="cps-pitch">
          <div className="cps-eyebrow">LET'S PERSONALIZE</div>
          <h1>Let’s personalize<br />your <span>career journey</span></h1>
          <p>A few quick details to understand you better and create your personalized career roadmap.</p>
          <div className="cps-benefits">
            {BENEFITS.map((item, index) => (
              <div className={`cps-benefit tone-${index + 1}`} key={item.title}><span><i className={`bi ${item.icon}`} /></span><div><b>{item.title}</b><small>{item.text}</small></div></div>
            ))}
          </div>
          <div className="cps-art" aria-hidden="true"><img src="/assets/careerpilot/careerpilot-hero-student.png" alt="" /></div>
        </aside>

        <section className="cps-panel">
          <div className="cps-progress-head"><b>Step {stepIx + 1} of {steps.length}</b><span>{Math.round(((stepIx + 1) / steps.length) * 100)}% complete</span></div>
          <ol className="cps-steps" style={{ '--cps-steps': steps.length } as CSSProperties}>
            {steps.map((s, i) => (
              <li key={s} className={i === stepIx ? 'on' : i < stepIx ? 'ok' : ''}><span>{i < stepIx ? <i className="bi bi-check" /> : <i className={`bi ${STEP_ICON[s]}`} />}</span><b>{STEP_LABEL[s]}</b></li>
            ))}
          </ol>
          {err && <div className="cps-err">{err}</div>}

          <div className="cps-card">
            {step === 'education' && (
              <>
                <div className="cps-question-head"><div className="cps-qicon"><i className="bi bi-mortarboard" /></div><div><h2>Complete your academic details</h2><p>We are missing a couple of things we need to size your plan.</p></div></div>
                <label className="cps-lbl">Program</label>
                <div className="cps-chips">{opts.programs.map(p => <button key={p} className={`cps-chip${a.degree === p ? ' on' : ''}`} onClick={() => setA(s => ({ ...s, degree: p }))}>{p}</button>)}</div>
                <label className="cps-lbl">Branch or specialisation <em>optional</em></label>
                {/* A picker only when the tenant has curated branches. Typed branches do not
                    match the values questions and material are targeted at — "CSE", "cse"
                    and "Computer Science" are three different audiences to the matcher — so
                    where a list exists the student chooses from it. */}
                {opts.branches?.length ? (
                  <div className="cps-chips">
                    {opts.branches.map(b => (
                      <button key={b} className={`cps-chip${a.branch === b ? ' on' : ''}`} onClick={() => setA(s => ({ ...s, branch: s.branch === b ? '' : b }))}>{b}</button>
                    ))}
                  </div>
                ) : (
                  <input className="cps-inp" value={a.branch} placeholder="e.g. Computer Science" onChange={e => setA(s => ({ ...s, branch: e.target.value }))} />
                )}
                <label className="cps-lbl">Which year are you in?</label>
                <div className="cps-chips">{opts.academicYears.map(y => <button key={y} className={`cps-chip${a.currentAcademicYear === y ? ' on' : ''}`} onClick={() => setA(s => ({ ...s, currentAcademicYear: y }))}>{y}</button>)}</div>
                {ctx.education.collegeName && <p className="cps-known"><i className="bi bi-info-circle" /> From your profile: <b>{ctx.education.collegeName}</b>{ctx.location.city ? ` · ${ctx.location.city}` : ''}</p>}
              </>
            )}

            {step === 'direction' && (
              <>
                <div className="cps-question-head"><div className="cps-qicon"><i className="bi bi-compass" /></div><div><h2>What role would you like to work toward?</h2><p>Pick what appeals to you now. You can change it later.</p></div></div>
                {!!knownContext && <p className="cps-known cps-ctxbadge"><i className="bi bi-mortarboard" /> <b>{knownContext}</b>{!steps.includes('education') && <button type="button" className="cps-link" onClick={() => { setEditEducation(true); setStepIx(0); }}>Change academic details</button>}</p>}
                {opts.roles.filter(r => r.key === 'NOT_SURE').map(r => <button key={r.key} className={`cps-unsure${a.primaryRole === r.key ? ' on' : ''}`} onClick={() => setA(s => ({ ...s, primaryRole: r.key }))}><i className="bi bi-compass" /><span><b>{r.label}</b><em>{r.blurb}</em></span></button>)}
                {(() => {
                  const all = opts.roles.filter(r => r.key !== 'NOT_SURE');
                  const q = roleQuery.trim().toLowerCase();
                  const matches = q
                    ? all.filter(r => `${r.label} ${r.blurb || ''}`.toLowerCase().includes(q))
                    : all;
                  /* A search shows everything it found; otherwise the first ROLE_VISIBLE, plus the
                     chosen role wherever it sits in the list — collapsing the grid must never hide
                     the answer the member has already given. */
                  const shown = (q || rolesExpanded)
                    ? matches
                    : matches.slice(0, ROLE_VISIBLE).concat(
                        matches.slice(ROLE_VISIBLE).filter(r => r.key === a.primaryRole));
                  const hidden = matches.length - shown.length;

                  return (
                    <>
                      {all.length > ROLE_VISIBLE && (
                        <div className="cps-role-search">
                          <i className="bi bi-search" />
                          <input
                            value={roleQuery}
                            onChange={e => setRoleQuery(e.target.value)}
                            placeholder={`Search ${all.length} roles — try "data", "AI", "cloud"`}
                            aria-label="Search roles"
                          />
                          {!!roleQuery && (
                            <button type="button" onClick={() => setRoleQuery('')} aria-label="Clear search">
                              <i className="bi bi-x-lg" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="cps-roles">
                        {shown.map(r => (
                          <button key={r.key} className={`cps-role tone-${roleTone(r.key)}${a.primaryRole === r.key ? ' on' : ''}`} onClick={() => setA(st => ({ ...st, primaryRole: r.key }))}>
                            <span className="cps-role-icon"><i className={`bi ${r.iconKey || 'bi-briefcase'}`} /></span><b>{r.label}</b><span>{r.blurb}</span>
                          </button>
                        ))}
                      </div>

                      {q && !matches.length && (
                        <p className="cps-role-none">
                          <i className="bi bi-search" /> No role matches <b>{roleQuery}</b>. Clear the search to see all {all.length},
                          or pick <b>Not sure yet</b> above and decide later.
                        </p>
                      )}

                      {!q && hidden > 0 && (
                        <button type="button" className="cps-role-more" onClick={() => setRolesExpanded(true)}>
                          Show {hidden} more {hidden === 1 ? 'role' : 'roles'} <i className="bi bi-chevron-down" />
                        </button>
                      )}
                      {!q && rolesExpanded && all.length > ROLE_VISIBLE && (
                        <button type="button" className="cps-role-more" onClick={() => setRolesExpanded(false)}>
                          Show fewer <i className="bi bi-chevron-up" />
                        </button>
                      )}
                    </>
                  );
                })()}
                {opts.roles.length === 1 && <p className="cps-known"><i className="bi bi-info-circle" /> No specific careers are on offer just yet. You can continue and set a direction later.</p>}
              </>
            )}

            {step === 'technology' && (
              <>
                <div className="cps-question-head"><div className="cps-qicon"><i className="bi bi-code-slash" /></div><div><h2>Which technologies interest you?</h2><p>Pick as many as you like, or skip for now.</p></div></div>
                <div className="cps-tech-grid">
                  {opts.languages.map(l => {
                    const meta = languageMeta(l);
                    const selected = a.preferredProgrammingLanguages.includes(l);
                    return (
                      <button key={l} className={`cps-tech${selected ? ' on' : ''}`} style={{ ['--lang' as any]: meta.tone }} onClick={() => toggleLang(l)}>
                        <span className="cps-tech-logo">{meta.icon ? <img src={meta.icon} alt="" /> : <i className="bi bi-question-circle" />}</span>
                        <span>{meta.label}</span>{selected && <i className="bi bi-check-circle-fill cps-tech-check" />}
                      </button>
                    );
                  })}
                </div>
                {!!ctx.career.knownProgrammingLanguages.length && <p className="cps-known"><i className="bi bi-info-circle" /> Your profile says you already know <b>{ctx.career.knownProgrammingLanguages.join(', ')}</b>. That stays separate from this.</p>}
              </>
            )}

            {step === 'commitment' && (
              <>
                <div className="cps-question-head"><div className="cps-qicon"><i className="bi bi-calendar-check" /></div><div><h2>How much time can you realistically give?</h2><p>Choose a routine you can actually keep.</p></div></div>
                <label className="cps-lbl">Time each day</label>
                <div className="cps-commit-grid">
                  {opts.availability.map(o => <button key={o.minutes} className={`cps-commit${a.minutesPerDay === o.minutes ? ' on' : ''}`} onClick={() => setA(s => ({ ...s, minutesPerDay: o.minutes }))}><i className="bi bi-clock" /><b>{o.label}</b></button>)}
                </div>
                <label className="cps-lbl">How many days a week?</label>
                <div className="cps-days">{(opts.daysPerWeek || []).map(o => <button key={o.days} className={`cps-day${a.daysPerWeek === o.days ? ' on' : ''}`} onClick={() => setA(s => ({ ...s, daysPerWeek: o.days }))}>{o.label}</button>)}</div>
              </>
            )}

            <div className="cps-nav">
              {stepIx > 0 && <button className="cps-btn ghost" disabled={busy} onClick={() => setStepIx(stepIx - 1)}><i className="bi bi-arrow-left" /> Back</button>}
              <button className="cps-btn primary" disabled={busy || !canAdvance} onClick={() => (isLast ? go(stepIx, true) : go(stepIx + 1))}>{busy ? 'Saving…' : isLast ? 'Finish setup' : 'Continue'} <i className="bi bi-arrow-right" /></button>
            </div>
          </div>
        </section>
      </main>

      <section className="cps-capabilities"><div className="cps-cap-title">With <b>Career<span>Pilot</span></b>, you can</div><div className="cps-cap-grid">{CAPABILITIES.map((item, index) => <div className={`cps-cap tone-${(index % 5) + 1}`} key={item.title}><span><i className={`bi ${item.icon}`} /></span><b>{item.title}</b></div>)}</div></section>
      <footer className="cps-footer"><div className="cps-footer-brand"><img src="/assets/careerpilot/careerpilot-logo.png" alt="CareerPilot by CodeBegun" /></div><span>© {new Date().getFullYear()} CodeBegun · CareerPilot. All rights reserved.</span><span className="cps-footer-made">Made for ambitious careers in India</span></footer>
    </div>
  );
};

export default CareerSetup;
