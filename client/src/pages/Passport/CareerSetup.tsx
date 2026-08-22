import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessmentAvailability, CareerContext, CareerContextOptions } from '../../api/passportApi';
import './careerSetup.css';

type Answers = {
  degree: string; branch: string; currentAcademicYear: string;
  primaryRole: string;
  preferredProgrammingLanguages: string[];
  minutesPerDay: number | null;
  daysPerWeek: number | null;
};

type StepKey = 'education' | 'direction' | 'technology' | 'commitment';

const STEP_LABEL: Record<StepKey, string> = {
  education: 'Your studies',
  direction: 'Direction',
  technology: 'Technology',
  commitment: 'Commitment',
};

const STEP_ICON: Record<StepKey, string> = {
  education: 'bi-mortarboard',
  direction: 'bi-compass',
  technology: 'bi-code-slash',
  commitment: 'bi-calendar-check',
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

const educationMissing = (missing: string[]) =>
  missing.includes('education.degree') || missing.includes('education.currentAcademicYear');

const CareerSetup: React.FC = () => {
  const nav = useNavigate();
  const [ctx, setCtx] = useState<CareerContext | null>(null);
  const [opts, setOpts] = useState<CareerContextOptions | null>(null);
  const [stepIx, setStepIx] = useState(0);
  const [editEducation, setEditEducation] = useState(false);
  const [a, setA] = useState<Answers>({
    degree: '', branch: '', currentAcademicYear: '',
    primaryRole: '', preferredProgrammingLanguages: [], minutesPerDay: null, daysPerWeek: null,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [avail, setAvail] = useState<AssessmentAvailability | null>(null);

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
        if (r.context.status.onboardingCompleted) setDone(true);
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your details.'));
  }, []);

  const steps = useMemo<StepKey[]>(() => {
    const needsEducation = ctx ? educationMissing(ctx.status.missing) : false;
    return [
      ...(needsEducation || editEducation ? ['education' as StepKey] : []),
      'direction', 'technology', 'commitment',
    ];
  }, [ctx, editEducation]);

  const step = steps[Math.min(stepIx, steps.length - 1)];
  const isLast = stepIx >= steps.length - 1;

  const patchFor = (upto: number) => {
    const seen = steps.slice(0, upto + 1);
    const p: any = {};
    if (seen.includes('education')) {
      p.degree = a.degree; p.program = a.degree;
      p.branch = a.branch; p.currentAcademicYear = a.currentAcademicYear;
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
      if (complete) setDone(true); else setStepIx(next);
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

  const toggleLang = (l: string) =>
    setA(s => ({
      ...s,
      preferredProgrammingLanguages: s.preferredProgrammingLanguages.includes(l)
        ? s.preferredProgrammingLanguages.filter(x => x !== l)
        : [...s.preferredProgrammingLanguages, l],
    }));

  if (err && !ctx) return <div className="cps cps-state"><div className="cps-err">{err}</div></div>;
  if (!ctx || !opts) return <div className="cps cps-state"><div className="cps-load">Loading your details…</div></div>;

  const knownContext = [ctx.education.degree || ctx.education.program, ctx.education.branch, ctx.education.currentAcademicYear]
    .filter(Boolean).join(' · ');

  if (done) {
    const stage = opts.stages.find(s => s.key === ctx.derived.stage);
    const role = opts.roles.find(r => r.key === ctx.career.primaryRole);
    return (
      <div className="cps">
        <header className="cps-topbar">
          <div className="cps-brand">
            <img src="/assets/logo.png" alt="CodeBegun" />
            <span className="cps-brand-divider" />
            <b>Career<span>Pilot</span></b>
          </div>
          <div className="cps-safe"><i className="bi bi-shield-check" /> Your data is safe & secure</div>
        </header>

        <main className="cps-done-wrap">
          <section className="cps-done">
            <div className="cps-done-icon"><i className="bi bi-check-lg" /></div>
            <div className="cps-eyebrow">PROFILE READY</div>
            <h1>Your CareerPilot is ready</h1>
            <p>This is what CareerPilot will plan around. You can change any of it later.</p>

            <div className="cps-sum">
              <div className="r"><span>Studying</span><b>{[ctx.education.degree, ctx.education.branch].filter(Boolean).join(' · ') || '—'}</b></div>
              <div className="r"><span>Year</span><b>{ctx.education.currentAcademicYear || '—'}</b></div>
              {!!ctx.career.careerGoal && <div className="r"><span>Broad goal</span><b>{ctx.career.careerGoal}</b></div>}
              <div className="r"><span>Aiming for</span><b>{role?.label || 'Not sure yet'}</b></div>
              <div className="r"><span>Interested in</span><b>{ctx.career.preferredProgrammingLanguages.join(', ') || '—'}</b></div>
              <div className="r"><span>Time each day</span><b>{ctx.availability.minutesPerDay ? `${ctx.availability.minutesPerDay} minutes` : '—'}</b></div>
              <div className="r"><span>Days a week</span><b>{ctx.availability.daysPerWeek || '—'}</b></div>
            </div>

            {stage && (
              <div className="cps-stage">
                <span>Your career stage</span>
                <b>{stage.label}</b>
                <em>{stage.blurb}</em>
              </div>
            )}

            {avail === null && <div className="cps-load">Checking your assessment…</div>}
            {avail?.assessmentAvailable && (
              <button className="cps-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>
                {avail.inProgress ? 'Continue my assessment' : 'Start my personalized assessment'}
                <i className="bi bi-arrow-right" />
              </button>
            )}
            {avail && !avail.assessmentAvailable && (
              <div className="cps-known cps-notready">
                <i className="bi bi-info-circle" />
                <span>
                  <b>{avail.message || 'This career path is not ready for assessment yet.'}</b>
                  <em>
                    {avail.reasonCode === 'ROLE_NOT_CONFIGURED' || avail.reasonCode === 'BLUEPRINT_UNPUBLISHED' || avail.reasonCode === 'BLUEPRINT_EMPTY'
                      ? 'Choose another role, or pick “Not sure yet” — everything else in your plan still works.'
                      : 'Your profile is saved and the rest of CareerPilot works. We will let you know when it is ready.'}
                  </em>
                </span>
              </div>
            )}
            <button className="cps-btn ghost" onClick={() => nav('/careerpilot')}>Go to my dashboard</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="cps">
      <header className="cps-topbar">
        <div className="cps-brand">
          <img src="/assets/logo.png" alt="CodeBegun" />
          <span className="cps-brand-divider" />
          <b>Career<span>Pilot</span></b>
        </div>
        <div className="cps-safe"><i className="bi bi-shield-check" /> Your data is safe & secure</div>
      </header>

      <main className="cps-shell">
        <aside className="cps-pitch">
          <div className="cps-eyebrow">LET'S PERSONALIZE</div>
          <h1>Let’s personalize<br />your <span>career journey</span></h1>
          <p>A few quick details to understand you better and create your personalized career roadmap.</p>

          <div className="cps-benefits">
            {BENEFITS.map(item => (
              <div className="cps-benefit" key={item.title}>
                <span><i className={`bi ${item.icon}`} /></span>
                <div><b>{item.title}</b><small>{item.text}</small></div>
              </div>
            ))}
          </div>

          <div className="cps-art">
            <div className="cps-flight-path" />
            <img src="/assets/careerpilot/careerpilot-hero-student.png" alt="CareerPilot student planning a career path" />
          </div>
        </aside>

        <section className="cps-panel">
          <div className="cps-progress-head">
            <b>Step {stepIx + 1} of {steps.length}</b>
            <span>{Math.round(((stepIx + 1) / steps.length) * 100)}% complete</span>
          </div>

          <ol className="cps-steps">
            {steps.map((s, i) => (
              <li key={s} className={i === stepIx ? 'on' : i < stepIx ? 'ok' : ''}>
                <span>{i < stepIx ? <i className="bi bi-check" /> : <i className={`bi ${STEP_ICON[s]}`} />}</span>
                <b>{STEP_LABEL[s]}</b>
              </li>
            ))}
          </ol>

          {err && <div className="cps-err">{err}</div>}

          <div className="cps-card">
            {step === 'education' && (
              <>
                <div className="cps-question-head">
                  <div className="cps-qicon"><i className="bi bi-mortarboard" /></div>
                  <div><h2>Complete your academic details</h2><p>We are missing a couple of things we need to size your plan.</p></div>
                </div>
                <label className="cps-lbl">Program</label>
                <div className="cps-chips">
                  {opts.programs.map(p => (
                    <button key={p} className={`cps-chip${a.degree === p ? ' on' : ''}`}
                      onClick={() => setA(s => ({ ...s, degree: p }))}>{p}</button>
                  ))}
                </div>
                <label className="cps-lbl">Branch or specialisation <em>optional</em></label>
                <input className="cps-inp" value={a.branch} placeholder="e.g. Computer Science"
                  onChange={e => setA(s => ({ ...s, branch: e.target.value }))} />
                <label className="cps-lbl">Which year are you in?</label>
                <div className="cps-chips">
                  {opts.academicYears.map(y => (
                    <button key={y} className={`cps-chip${a.currentAcademicYear === y ? ' on' : ''}`}
                      onClick={() => setA(s => ({ ...s, currentAcademicYear: y }))}>{y}</button>
                  ))}
                </div>
                {ctx.education.collegeName && (
                  <p className="cps-known"><i className="bi bi-info-circle" /> From your profile: <b>{ctx.education.collegeName}</b>{ctx.location.city ? ` · ${ctx.location.city}` : ''}</p>
                )}
              </>
            )}

            {step === 'direction' && (
              <>
                <div className="cps-question-head">
                  <div className="cps-qicon"><i className="bi bi-compass" /></div>
                  <div><h2>What role would you like to work toward?</h2><p>Pick what appeals to you now. You can change it later.</p></div>
                </div>

                {!!knownContext && (
                  <p className="cps-known cps-ctxbadge">
                    <i className="bi bi-mortarboard" /> <b>{knownContext}</b>
                    {!steps.includes('education') && (
                      <button type="button" className="cps-link" onClick={() => { setEditEducation(true); setStepIx(0); }}>Change</button>
                    )}
                  </p>
                )}

                {opts.roles.filter(r => r.key === 'NOT_SURE').map(r => (
                  <button key={r.key} className={`cps-unsure${a.primaryRole === r.key ? ' on' : ''}`}
                    onClick={() => setA(s => ({ ...s, primaryRole: r.key }))}>
                    <i className="bi bi-compass" />
                    <span><b>{r.label}</b><em>{r.blurb}</em></span>
                  </button>
                ))}

                <div className="cps-roles">
                  {opts.roles.filter(r => r.key !== 'NOT_SURE').map(r => (
                    <button key={r.key} className={`cps-role${a.primaryRole === r.key ? ' on' : ''}`}
                      onClick={() => setA(s => ({ ...s, primaryRole: r.key }))}>
                      <span className="cps-role-icon"><i className={`bi ${r.iconKey || 'bi-briefcase'}`} /></span>
                      <b>{r.label}</b>
                      <span>{r.blurb}</span>
                    </button>
                  ))}
                </div>

                {opts.roles.length === 1 && (
                  <p className="cps-known"><i className="bi bi-info-circle" /> No specific careers are on offer just yet. You can continue and set a direction later.</p>
                )}
              </>
            )}

            {step === 'technology' && (
              <>
                <div className="cps-question-head">
                  <div className="cps-qicon"><i className="bi bi-code-slash" /></div>
                  <div><h2>Which technologies interest you?</h2><p>Pick as many as you like, or skip for now.</p></div>
                </div>
                <div className="cps-tech-grid">
                  {opts.languages.map(l => (
                    <button key={l} className={`cps-tech${a.preferredProgrammingLanguages.includes(l) ? ' on' : ''}`}
                      onClick={() => toggleLang(l)}>
                      <i className="bi bi-code-square" /><span>{l}</span>{a.preferredProgrammingLanguages.includes(l) && <i className="bi bi-check-circle-fill" />}
                    </button>
                  ))}
                </div>
                {!!ctx.career.knownProgrammingLanguages.length && (
                  <p className="cps-known"><i className="bi bi-info-circle" /> Your profile says you already know <b>{ctx.career.knownProgrammingLanguages.join(', ')}</b>. That stays separate from this.</p>
                )}
              </>
            )}

            {step === 'commitment' && (
              <>
                <div className="cps-question-head">
                  <div className="cps-qicon"><i className="bi bi-calendar-check" /></div>
                  <div><h2>How much time can you realistically give?</h2><p>Choose a routine you can actually keep.</p></div>
                </div>
                <label className="cps-lbl">Time each day</label>
                <div className="cps-commit-grid">
                  {opts.availability.map(o => (
                    <button key={o.minutes} className={`cps-commit${a.minutesPerDay === o.minutes ? ' on' : ''}`}
                      onClick={() => setA(s => ({ ...s, minutesPerDay: o.minutes }))}>
                      <i className="bi bi-clock" /><b>{o.label}</b><span>a day</span>
                    </button>
                  ))}
                </div>
                <label className="cps-lbl">How many days a week?</label>
                <div className="cps-days">
                  {(opts.daysPerWeek || []).map(o => (
                    <button key={o.days} className={`cps-day${a.daysPerWeek === o.days ? ' on' : ''}`}
                      onClick={() => setA(s => ({ ...s, daysPerWeek: o.days }))}>{o.label}</button>
                  ))}
                </div>
              </>
            )}

            <div className="cps-tip"><i className="bi bi-info-circle" /> You can always update these details later from your profile.</div>

            <div className="cps-nav">
              {stepIx > 0 && <button className="cps-btn ghost" disabled={busy} onClick={() => setStepIx(stepIx - 1)}><i className="bi bi-arrow-left" /> Back</button>}
              <button className="cps-btn primary" disabled={busy || !canAdvance}
                onClick={() => (isLast ? go(stepIx, true) : go(stepIx + 1))}>
                {busy ? 'Saving…' : isLast ? 'Finish setup' : 'Continue'} <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <section className="cps-capabilities">
        <div className="cps-cap-title">With <b>Career<span>Pilot</span></b>, you can</div>
        <div className="cps-cap-grid">
          {CAPABILITIES.map(item => (
            <div className="cps-cap" key={item.title}><span><i className={`bi ${item.icon}`} /></span><b>{item.title}</b></div>
          ))}
        </div>
      </section>

      <footer className="cps-footer">
        <div className="cps-footer-brand"><img src="/assets/logo.png" alt="CodeBegun" /></div>
        <span>© {new Date().getFullYear()} CodeBegun. All rights reserved.</span>
        <span className="cps-footer-made">Made for ambitious careers in India</span>
      </footer>
    </div>
  );
};

export default CareerSetup;
