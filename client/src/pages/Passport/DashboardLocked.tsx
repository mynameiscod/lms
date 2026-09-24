import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, RoleReadinessAvailable, SkillDnaRow, MemberSection } from '../../api/passportApi';
import { useUnlock } from './SectionLock';
import './dashboardLocked.css';

/**
 * The dashboard a student sees before they pay.
 *
 * WHY IT IS A SEPARATE COMPONENT AND NOT A FLAG ON THE OTHER ONE. The member dashboard reads
 * `stats`, `level`, `coderScore` and `dailyGoal` on almost every line and asserts all four are
 * present, because for a paying member they always are. Threading "or locked" through three
 * hundred lines of that would put a conditional in front of every number on the busiest screen
 * in the product, for a state none of those numbers exist in.
 *
 * WHAT THEY EARNED LEADS; WHAT MEMBERSHIP BUYS IS ONE PANEL. Their Skill DNA and role readiness
 * are free and really theirs, so they come first. Everything membership opens is gathered into
 * one panel with one button — it used to be three identical lock boxes, each with its own
 * "Unlock" button, which read as a wall of adverts rather than a product with a door in it.
 * The panel still names each part and shows this student's own figures beside it.
 *
 * THE FIGURES ARE REAL. Readiness and Skill DNA are not paid endpoints, so the number of gaps in
 * their own profile costs nothing to fetch, and "12 priority gaps" is an argument in a way that
 * "unlock premium" can never be. It is the summary, not the content: the server still holds the
 * locks. Payment goes through SectionLock's useUnlock, the one checkout every lock shares.
 */

interface Props {
  data: DashboardData;
}

const SECTION_ICON: Record<string, string> = {
  roadmap: 'bi-map', missions: 'bi-check2-square', progress: 'bi-graph-up-arrow', practice: 'bi-code-square',
  interview: 'bi-mic', resume: 'bi-file-earmark-person', companies: 'bi-buildings', news: 'bi-newspaper', score: 'bi-speedometer2',
};
/* The three parts of the member dashboard itself, previewed as tiles in the order they sit on it. */
/**
 * Taken as a function of the programme length rather than a constant, because it is not ninety
 * for everyone: a second-year's Build programme is 110 days, and an admin may set either to
 * anything between 30 and 180. This page is where a non-member decides whether to buy, so the
 * number it advertises has to be the number they will be given.
 */
const previewTiles = (days: number): { section: MemberSection; title: string; blurb: string }[] => [
  { section: 'roadmap', title: `Your ${days}-day plan`, blurb: 'Your gaps, in the order they are worth closing, sized to the time you can give it.' },
  { section: 'missions', title: 'Today’s work', blurb: 'A short, finishable list every day, drawn from your plan.' },
  { section: 'progress', title: 'Your progress', blurb: 'XP, streaks and badges — earned by finishing the work in your plan.' },
];

const band = (score: number) => (score >= 70 ? 'strong' : score >= 40 ? 'mid' : 'low');

const DashboardLocked: React.FC<Props> = ({ data }) => {
  const nav = useNavigate();
  const { unlock, busy, msg, label } = useUnlock();
  const [readiness, setReadiness] = useState<RoleReadinessAvailable | null>(null);
  const [dna, setDna] = useState<SkillDnaRow[] | null>(null);

  useEffect(() => {
    if (!data.hasAssessment) return;   // nothing measured, so nothing to report
    let live = true;
    // Both allowed to fail quietly: a student with no target role has no readiness, and the
    // page reads perfectly well without either.
    passportApi.getMyReadiness().then(r => { if (live && r.available) setReadiness(r); }).catch(() => {});
    passportApi.getMySkillDna().then(r => { if (live && r.assessed) setDna(r.skills.filter(s => s.skillActive !== false)); }).catch(() => {});
    return () => { live = false; };
  }, [data.hasAssessment]);

  const measured = !!data.hasAssessment;
  const assessmentHref = data.setupCompleted === false ? '/careerpilot/setup' : '/careerpilot/skill-assessment';
  const firstName = data.firstName || '';

  /* Skill DNA when we have it (the scores the assessment actually produced); the dashboard's meter otherwise. */
  const skillRows = useMemo(() => {
    if (dna?.length) return [...dna].sort((a, b) => b.score - a.score).slice(0, 6).map(s => ({ key: s.skillKey, label: s.skillName, score: s.score }));
    return (data.skills || []).slice(0, 6);
  }, [dna, data.skills]);
  const avg = dna?.length ? Math.round(dna.reduce((t, s) => t + (s.score || 0), 0) / dna.length) : null;

  const gaps = readiness?.summary.priorityGaps ?? null;
  const needsWork = readiness?.summary.needsWork ?? null;
  const measuredCount = readiness?.summary.assessedSkills ?? (dna?.length || data.skills?.length || null);
  const ready = readiness?.readiness ?? null;
  const readyLabel = ready === null ? 'Still measuring' : ready >= 80 ? 'Strong alignment' : ready >= 60 ? 'Getting close' : ready >= 40 ? 'Building momentum' : 'Early stage';

  /** This learner's own programme length, from the dashboard endpoint. */
  const days = Number(data.programDays) || 90;
  const PREVIEW = previewTiles(days);

  const locked = data.locked || [];
  const lockOf = (s: MemberSection) => locked.find(l => l.section === s);
  const previewFacts: Record<string, string | null> = {
    roadmap: gaps !== null ? `${gaps} priority gap${gaps === 1 ? '' : 's'} to close` : `${days} days, paced to your time`,
    missions: measuredCount ? `Planned from ${measuredCount} measured skills` : null,
    progress: null,
  };
  const alsoIncluded = locked.filter(l => !PREVIEW.some(p => p.section === l.section));

  return (
    <div className="dl2">
      {/* Hero: who this is for and where they are, in the logo navy. */}
      <section className="dl2-hero">
        <div className="dl2-hero-copy">
          <span className="dl2-eyebrow">Your CareerPilot</span>
          <h1>{firstName ? <>Welcome back, <span>{firstName}</span></> : 'Welcome back'}</h1>
          <p>
            {measured
              ? 'Your assessment is done and your results are below. Your plan, your daily work and everything that runs off it open with membership.'
              : 'Start with the free skill assessment. It measures where you actually are, and everything else here is built from what it finds.'}
          </p>
          <div className="dl2-chips">
            {measured
              ? <>
                  <span><i className="bi bi-patch-check" /> Assessment complete</span>
                  {measuredCount ? <span><i className="bi bi-clipboard-data" /> {measuredCount} skills measured</span> : null}
                  {gaps !== null && <span><i className="bi bi-bullseye" /> {gaps} priority gap{gaps === 1 ? '' : 's'}</span>}
                </>
              : <>
                  <span><i className="bi bi-clock" /> About 20 minutes</span>
                  <span><i className="bi bi-gift" /> Free — no membership needed</span>
                </>}
          </div>
        </div>

        {measured ? (
          <div className="dl2-hero-score">
            <div className="dl2-ring" style={{ ['--dl2-deg' as any]: `${(ready ?? avg ?? 0) * 3.6}deg` }}>
              <div><strong>{ready ?? avg ?? '—'}</strong><em>{ready !== null ? '%' : avg !== null ? '/100' : ''}</em></div>
            </div>
            <div className="dl2-hero-score-copy">
              <small>{ready !== null ? 'Role readiness' : 'Average skill score'}</small>
              <b>{ready !== null ? readyLabel : 'From your assessment'}</b>
              <button onClick={() => nav(ready !== null ? '/careerpilot/readiness' : '/careerpilot/skills')}>
                See details <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        ) : (
          <div className="dl2-hero-start">
            <b>Know where you stand</b>
            <span>Skill by skill, against the role you are aiming at — nothing guessed.</span>
            <button className="dl2-btn primary" onClick={() => nav(assessmentHref)}>
              {data.setupCompleted === false ? 'Finish setup to start' : 'Start the free assessment'} <i className="bi bi-arrow-right" />
            </button>
          </div>
        )}
      </section>

      {/* What they already earned. Free, and the reason the rest is worth having. */}
      {measured && (
        <section className="dl2-grid">
          <article className="dl2-card">
            <header className="dl2-card-head">
              <div><h2>Your Skill DNA</h2><p>Your strongest measured skills first.</p></div>
              <button className="dl2-link" onClick={() => nav('/careerpilot/skills')}>Full Skill DNA <i className="bi bi-arrow-right" /></button>
            </header>
            {skillRows.length ? (
              <ul className="dl2-skills">
                {skillRows.map(s => (
                  <li key={s.key}>
                    <span className="nm">{s.label}</span>
                    <span className={`br ${band(s.score)}`}><i style={{ width: `${Math.max(2, Math.min(100, s.score))}%` }} /></span>
                    <span className={`vl ${band(s.score)}`}>{s.score}<em>/100</em></span>
                  </li>
                ))}
              </ul>
            ) : <p className="dl2-empty">Your assessment results will appear here shortly.</p>}
          </article>

          <article className="dl2-card">
            <header className="dl2-card-head">
              <div><h2>Role readiness</h2><p>{readiness?.role?.name ? `Against ${readiness.role.name}.` : 'Against your target role.'}</p></div>
              <button className="dl2-link" onClick={() => nav('/careerpilot/readiness')}>Details <i className="bi bi-arrow-right" /></button>
            </header>
            {readiness ? (
              <div className="dl2-ready">
                <div className="dl2-ready-top">
                  <strong>{ready === null ? '—' : `${ready}%`}</strong>
                  <div><b>{readyLabel}</b><span>{readiness.coverage}% of the role measured · {readiness.summary.assessedSkills}/{readiness.summary.requiredSkills} skills</span></div>
                </div>
                <div className="dl2-ready-bar"><i style={{ width: `${Math.max(2, ready ?? 0)}%` }} /></div>
                <div className="dl2-ready-facts">
                  <div className="danger"><b>{readiness.summary.priorityGaps}</b><span>Priority gaps</span></div>
                  <div className="warn"><b>{readiness.summary.needsWork}</b><span>Need work</span></div>
                  <div className="good"><b>{readiness.summary.onTrack + readiness.summary.strong}</b><span>On track</span></div>
                </div>
              </div>
            ) : (
              <div className="dl2-empty">
                Readiness appears once a target role is set.
                <button className="dl2-link" onClick={() => nav('/careerpilot/setup?step=direction')}>Choose my role <i className="bi bi-arrow-right" /></button>
              </div>
            )}
          </article>
        </section>
      )}

      {!measured && (
        <section className="dl2-card dl2-steps-card">
          <header className="dl2-card-head"><div><h2>How CareerPilot works</h2><p>Three steps from here to a plan built around you.</p></div></header>
          <ol className="dl2-steps">
            <li className="now"><span>1</span><div><b>Take the free assessment</b><small>Questions chosen for your stage and target role.</small></div></li>
            <li><span>2</span><div><b>See your Skill DNA</b><small>Your strengths and gaps, measured — free to view.</small></div></li>
            <li><span>3</span><div><b>Follow your {days}-day plan</b><small>Daily work built from what the assessment found.</small></div></li>
          </ol>
        </section>
      )}

      {/* Everything membership opens, in one place, with one button. */}
      <section className="dl2-member">
        <div className="dl2-member-main">
          <header className="dl2-member-head">
            <span className="dl2-badge"><i className="bi bi-lock-fill" /> Membership</span>
            <h2>Unlock your full CareerPilot</h2>
            <p>The parts of your dashboard that do the work — built from what your assessment measured.</p>
          </header>
          <div className="dl2-previews">
            {PREVIEW.map(p => (
              <div className="dl2-preview" key={p.section}>
                <div className="dl2-preview-top">
                  <span className="ic"><i className={`bi ${SECTION_ICON[p.section]}`} /></span>
                  <i className="bi bi-lock-fill lk" aria-label="Membership" />
                </div>
                <b>{lockOf(p.section)?.title || p.title}</b>
                <span>{lockOf(p.section)?.blurb || p.blurb}</span>
                {previewFacts[p.section] && <em>{previewFacts[p.section]}</em>}
              </div>
            ))}
          </div>
          {alsoIncluded.length > 0 && (
            <div className="dl2-also">
              <h3>Also included</h3>
              <ul>
                {alsoIncluded.map(l => (
                  <li key={l.section}>
                    <span className="ic"><i className={`bi ${SECTION_ICON[l.section] || 'bi-unlock'}`} /></span>
                    <div><b>{l.title}</b><span>{l.blurb}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="dl2-buy">
          <small>One membership</small>
          <b>Everything above, built for you</b>
          <ul>
            {gaps !== null && <li><i className="bi bi-check2" /> A plan for your {gaps} priority gap{gaps === 1 ? '' : 's'}</li>}
            {needsWork !== null && <li><i className="bi bi-check2" /> {needsWork} more skill{needsWork === 1 ? '' : 's'} worked on</li>}
            <li><i className="bi bi-check2" /> {days} days, paced to the time you have</li>
            {alsoIncluded.length > 0 && <li><i className="bi bi-check2" /> {alsoIncluded.length} more tool{alsoIncluded.length === 1 ? '' : 's'} — {alsoIncluded.slice(0, 2).map(l => l.title).join(', ')}{alsoIncluded.length > 2 ? ' and more' : ''}</li>}
          </ul>
          <button className="dl2-btn light" onClick={() => unlock()} disabled={busy}>{label}</button>
          {!!msg && <p className="dl2-msg">{msg}</p>}
          <span className="dl2-buy-foot">Everything your assessment measured stays yours either way.</span>
        </aside>
      </section>
    </div>
  );
};

export default DashboardLocked;
