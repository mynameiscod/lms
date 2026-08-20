import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { AssessmentAvailability, CareerContext, CareerContextOptions } from '../../api/passportApi';
import './careerSetup.css';

/**
 * CareerPilot onboarding — the questions registration did not already answer.
 *
 * Joining CareerPilot already asks for degree, branch and academic year. This screen used
 * to open by asking for all three again, which reads as though the two forms belong to
 * different companies, and every re-typed answer is a chance for the two records to
 * disagree. A member arriving with that data now starts at Direction.
 *
 * WHICH STEPS APPEAR IS THE SERVER'S ANSWER, NOT THIS FILE'S. `status.missing` already
 * states what onboarding still needs; re-deriving completeness here would be a second copy
 * of a rule that lives in careerContextService.missingFor(), and the copy would drift.
 * Education therefore appears only as a repair step — for a legacy member, an
 * admin-created account, or a signup whose optional academic fields were skipped.
 *
 * Each step saves as it advances, so closing the tab on step 2 does not lose step 1.
 * Only the final step sends `complete`, because a partial save must never mark someone
 * done — later modules act on that flag.
 *
 * Career stage is NOT asked and NOT chosen here. The server derives it and this screen
 * displays what came back. Duplicating that rule in React is how the two would drift.
 */

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

/**
 * Does the server still need academic details?
 *
 * Reads the server's own `missing` list rather than inspecting the education fields, so
 * the rule stays in one place. Branch is deliberately absent: it is optional under
 * careerContextService policy and must not start gating anybody.
 */
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
        // Prefill. Anything already known is an answer, not a blank to re-collect.
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

  /**
   * The steps this member actually needs.
   *
   * `editEducation` lets someone who spots a wrong degree on the Direction step fix it
   * without leaving onboarding — hiding a question we no longer need to ask must not also
   * remove the ability to correct it.
   */
  const steps = useMemo<StepKey[]>(() => {
    const needsEducation = ctx ? educationMissing(ctx.status.missing) : false;
    return [
      ...(needsEducation || editEducation ? ['education' as StepKey] : []),
      'direction', 'technology', 'commitment',
    ];
  }, [ctx, editEducation]);

  const step = steps[Math.min(stepIx, steps.length - 1)];
  const isLast = stepIx >= steps.length - 1;

  /** Only what this member was actually asked. Never sends education we did not show. */
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

  /** Advancing saves. Losing answered steps to a closed tab is not acceptable. */
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
    if (step === 'direction') return !!a.primaryRole;    // NOT_SURE is a valid answer
    if (step === 'technology') return true;              // technology interest is optional
    return !!a.minutesPerDay && !!a.daysPerWeek;
  }, [step, a]);

  // Whether the assessment can actually start is a server question — asked once the member
  // is done, so the closing CTA is never a button that fails on click.
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

  if (err && !ctx) return <div className="cps"><div className="cps-err">{err}</div></div>;
  if (!ctx || !opts) return <div className="cps"><div className="cps-load">Loading your details…</div></div>;

  /** "B.Tech · CSE · 3rd Year" — what we already know, shown rather than re-asked. */
  const knownContext = [ctx.education.degree || ctx.education.program, ctx.education.branch, ctx.education.currentAcademicYear]
    .filter(Boolean).join(' · ');

  // ── Result ──
  if (done) {
    const stage = opts.stages.find(s => s.key === ctx.derived.stage);
    const role = opts.roles.find(r => r.key === ctx.career.primaryRole);
    return (
      <div className="cps">
        <div className="cps-done">
          <div className="ic"><i className="bi bi-check-lg" /></div>
          <h1>CareerPilot profile ready</h1>
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
              {/* Derived by the server from course and year — never asked, never chosen. */}
              <span>Your career stage</span>
              <b>{stage.label}</b>
              <em>{stage.blurb}</em>
            </div>
          )}

          {/* The closing CTA appears only when the server says an assessment can start.
              Offering it otherwise would send the student into a known failure. */}
          {avail === null && <div className="cps-load">Checking your assessment…</div>}

          {/* /careerpilot/skill-assessment is the PERSONALISED assessment (Modules 6-7).
              /careerpilot/assessment is the free career-readiness questionnaire and is a
              different thing entirely — the preflight above speaks for the former. */}
          {avail?.assessmentAvailable && (
            <button className="cps-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>
              {avail.inProgress ? 'Continue my assessment' : 'Start my personalized assessment'}
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

          <button className="cps-btn ghost" onClick={() => nav('/careerpilot')}>
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cps">
      <div className="cps-hd">
        <h1>Choose your career direction</h1>
        <p>
          {steps.includes('education')
            ? 'A few quick questions so your plan fits you.'
            : 'We already know your academic background. Now choose where you would like CareerPilot to help you go.'}
        </p>
      </div>

      <ol className="cps-steps">
        {steps.map((s, i) => (
          <li key={s} className={i === stepIx ? 'on' : i < stepIx ? 'ok' : ''}>
            <span>{i < stepIx ? <i className="bi bi-check" /> : i + 1}</span>{STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      {err && <div className="cps-err">{err}</div>}

      <div className="cps-card">
        {step === 'education' && (
          <>
            <h2>Complete your academic details</h2>
            <p className="cps-sub">We are missing a couple of things we need to size your plan.</p>
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
              <p className="cps-known">
                <i className="bi bi-info-circle" /> From your profile: <b>{ctx.education.collegeName}</b>
                {ctx.location.city ? ` · ${ctx.location.city}` : ''}
              </p>
            )}
          </>
        )}

        {step === 'direction' && (
          <>
            <h2>What role would you like to work toward?</h2>

            {/* What we already know, shown rather than asked again. The Change link keeps
                correction possible without putting the question back in everyone's way. */}
            {!!knownContext && (
              <p className="cps-known cps-ctxbadge">
                <i className="bi bi-mortarboard" /> <b>{knownContext}</b>
                {!steps.includes('education') && (
                  <button type="button" className="cps-link"
                    onClick={() => { setEditEducation(true); setStepIx(0); }}>Change</button>
                )}
              </p>
            )}

            <p className="cps-sub">
              This list is set by your college and can change — pick what appeals to you now.
              You can change it later.
            </p>

            {/* "Not sure" is separated and leads, rather than sitting last among the real
                careers where it reads like the option you pick when you have failed to
                decide. For a first-year it is frequently the honest answer. */}
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
                  {r.iconKey && <i className={`bi ${r.iconKey}`} />}
                  <b>{r.label}</b>
                  <span>{r.blurb}</span>
                </button>
              ))}
            </div>

            {opts.roles.length === 1 && (
              <p className="cps-known">
                <i className="bi bi-info-circle" /> No specific careers are on offer just yet.
                You can continue and set a direction later.
              </p>
            )}
          </>
        )}

        {step === 'technology' && (
          <>
            <h2>Which technologies interest you?</h2>
            <p className="cps-sub">
              What you want to work in — not what you already know. Pick as many as you like, or skip.
            </p>
            <div className="cps-chips">
              {opts.languages.map(l => (
                <button key={l} className={`cps-chip${a.preferredProgrammingLanguages.includes(l) ? ' on' : ''}`}
                  onClick={() => toggleLang(l)}>{l}</button>
              ))}
            </div>
            {!!ctx.career.knownProgrammingLanguages.length && (
              <p className="cps-known">
                <i className="bi bi-info-circle" /> Your profile says you already know{' '}
                <b>{ctx.career.knownProgrammingLanguages.join(', ')}</b>. That stays separate from this.
              </p>
            )}
          </>
        )}

        {step === 'commitment' && (
          <>
            <h2>How much time can you realistically give?</h2>
            <p className="cps-sub">Be honest rather than ambitious — a plan you can keep beats one you cannot.</p>
            <div className="cps-chips big">
              {opts.availability.map(o => (
                <button key={o.minutes} className={`cps-chip${a.minutesPerDay === o.minutes ? ' on' : ''}`}
                  onClick={() => setA(s => ({ ...s, minutesPerDay: o.minutes }))}>{o.label} a day</button>
              ))}
            </div>

            {/* Both halves are needed. The roadmap plans against minutes x days, and
                without the second it refuses to generate — which used to happen only
                after the assessment was finished, having asked about time already. */}
            <label className="cps-lbl">How many days a week?</label>
            <div className="cps-chips big">
              {(opts.daysPerWeek || []).map(o => (
                <button key={o.days} className={`cps-chip${a.daysPerWeek === o.days ? ' on' : ''}`}
                  onClick={() => setA(s => ({ ...s, daysPerWeek: o.days }))}>{o.label}</button>
              ))}
            </div>
          </>
        )}

        <div className="cps-nav">
          {stepIx > 0 && <button className="cps-btn ghost" disabled={busy} onClick={() => setStepIx(stepIx - 1)}>Back</button>}
          <button className="cps-btn primary" disabled={busy || !canAdvance}
            onClick={() => (isLast ? go(stepIx, true) : go(stepIx + 1))}>
            {busy ? 'Saving…' : isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerSetup;
