import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { CareerContext, CareerContextOptions } from '../../api/passportApi';
import './careerSetup.css';

/**
 * CareerPilot onboarding — four questions, not a registration form.
 *
 * Everything the LMS already knows is filled in before the member sees it. A student who
 * entered their degree, branch and college on their profile is not asked again; asking
 * would suggest the two systems are unrelated, and every re-typed answer is a chance for
 * the two records to disagree.
 *
 * Each step saves as it advances, so closing the tab on step 3 does not lose steps 1-2.
 * Only the final step sends `complete`, because a partial save must never mark someone
 * done — later modules will act on that flag.
 *
 * Career stage is NOT asked and NOT chosen here. The server derives it and this screen
 * displays what came back. Duplicating that rule in React is how the two would drift.
 */

type Answers = {
  degree: string; branch: string; currentAcademicYear: string;
  primaryRole: string;
  preferredProgrammingLanguages: string[];
  minutesPerDay: number | null;
};

const STEPS = ['Education', 'Direction', 'Technology', 'Commitment'];

const CareerSetup: React.FC = () => {
  const nav = useNavigate();
  const [ctx, setCtx] = useState<CareerContext | null>(null);
  const [opts, setOpts] = useState<CareerContextOptions | null>(null);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    degree: '', branch: '', currentAcademicYear: '',
    primaryRole: '', preferredProgrammingLanguages: [], minutesPerDay: null,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

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
        });
        if (r.context.status.onboardingCompleted) setDone(true);
      })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your details.'));
  }, []);

  const patchFor = (upto: number) => {
    const p: any = {};
    if (upto >= 0) { p.degree = a.degree; p.program = a.degree; p.branch = a.branch; p.currentAcademicYear = a.currentAcademicYear; }
    if (upto >= 1) p.primaryRole = a.primaryRole;
    if (upto >= 2) p.preferredProgrammingLanguages = a.preferredProgrammingLanguages;
    if (upto >= 3 && a.minutesPerDay) p.minutesPerDay = a.minutesPerDay;
    return p;
  };

  /** Advancing saves. Losing three answered steps to a closed tab is not acceptable. */
  const go = async (next: number, complete = false) => {
    setBusy(true); setErr('');
    try {
      const r = await passportApi.updateCareerContext({ ...patchFor(step), ...(complete ? { complete: true } : {}) });
      setCtx(r.context);
      if (complete) setDone(true); else setStep(next);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not save that. Please try again.');
    }
    setBusy(false);
  };

  const canAdvance = useMemo(() => {
    if (step === 0) return !!a.degree && !!a.currentAcademicYear;
    if (step === 1) return !!a.primaryRole;             // NOT_SURE is a valid answer
    if (step === 2) return true;                        // technology interest is optional
    return !!a.minutesPerDay;
  }, [step, a]);

  const toggleLang = (l: string) =>
    setA(s => ({
      ...s,
      preferredProgrammingLanguages: s.preferredProgrammingLanguages.includes(l)
        ? s.preferredProgrammingLanguages.filter(x => x !== l)
        : [...s.preferredProgrammingLanguages, l],
    }));

  if (err && !ctx) return <div className="cps"><div className="cps-err">{err}</div></div>;
  if (!ctx || !opts) return <div className="cps"><div className="cps-load">Loading your details…</div></div>;

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
            <div className="r"><span>Aiming for</span><b>{role?.label || 'Not sure yet'}</b></div>
            <div className="r"><span>Interested in</span><b>{ctx.career.preferredProgrammingLanguages.join(', ') || '—'}</b></div>
            <div className="r"><span>Time each day</span><b>{ctx.availability.minutesPerDay ? `${ctx.availability.minutesPerDay} minutes` : '—'}</b></div>
          </div>

          {stage && (
            <div className="cps-stage">
              {/* Derived by the server from course and year — never asked, never chosen. */}
              <span>Your career stage</span>
              <b>{stage.label}</b>
              <em>{stage.blurb}</em>
            </div>
          )}

          <button className="cps-btn primary" onClick={() => nav('/careerpilot/dashboard')}>
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cps">
      <div className="cps-hd">
        <h1>Set up CareerPilot</h1>
        <p>Four quick questions so your plan fits you. Anything we already know is filled in.</p>
      </div>

      <ol className="cps-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'on' : i < step ? 'ok' : ''}>
            <span>{i < step ? <i className="bi bi-check" /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      {err && <div className="cps-err">{err}</div>}

      <div className="cps-card">
        {step === 0 && (
          <>
            <h2>What are you studying?</h2>
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

        {step === 1 && (
          <>
            <h2>What would you like to become?</h2>
            <p className="cps-sub">Not sure is a real answer — CareerPilot can suggest one later.</p>
            <div className="cps-roles">
              {opts.roles.map(r => (
                <button key={r.key} className={`cps-role${a.primaryRole === r.key ? ' on' : ''}`}
                  onClick={() => setA(s => ({ ...s, primaryRole: r.key }))}>
                  <b>{r.label}</b><span>{r.blurb}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
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

        {step === 3 && (
          <>
            <h2>How much time can you realistically give?</h2>
            <p className="cps-sub">Be honest rather than ambitious — a plan you can keep beats one you cannot.</p>
            <div className="cps-chips big">
              {opts.availability.map(o => (
                <button key={o.minutes} className={`cps-chip${a.minutesPerDay === o.minutes ? ' on' : ''}`}
                  onClick={() => setA(s => ({ ...s, minutesPerDay: o.minutes }))}>{o.label} a day</button>
              ))}
            </div>
          </>
        )}

        <div className="cps-nav">
          {step > 0 && <button className="cps-btn ghost" disabled={busy} onClick={() => setStep(step - 1)}>Back</button>}
          <button className="cps-btn primary" disabled={busy || !canAdvance}
            onClick={() => (step === STEPS.length - 1 ? go(step, true) : go(step + 1))}>
            {busy ? 'Saving…' : step === STEPS.length - 1 ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerSetup;
