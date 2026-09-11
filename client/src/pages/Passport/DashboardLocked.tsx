import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, RoleReadinessAvailable } from '../../api/passportApi';
import SectionLock from './SectionLock';
import './dashboard.css';
import './dashboardLocked.css';

/**
 * The dashboard a student sees before they pay.
 *
 * WHY IT IS A SEPARATE COMPONENT AND NOT A FLAG ON THE OTHER ONE. The member dashboard reads
 * `stats`, `level`, `coderScore` and `dailyGoal` on almost every line and asserts all four are
 * present, because for a paying member they always are. Threading "or locked" through three
 * hundred lines of that would put a conditional in front of every number on the busiest screen
 * in the product, for a state none of those numbers exist in. This renders the same layout out
 * of the same stylesheet, and simply never touches the fields it does not have.
 *
 * IT IS THE PRODUCT, NOT AN ADVERT FOR IT. The panels sit where they sit on the real dashboard,
 * in the same order, so a student who pays recognises the screen they were looking at. What
 * they already earned — their score, their skill meter — is really there and really theirs.
 * What membership buys has a lock on it that says what it is and what it would hold FOR THEM.
 *
 * THE FIGURES ARE REAL. Readiness is not a paid endpoint, so the number of gaps in their own
 * profile costs nothing to fetch, and "12 priority gaps" is an argument in a way that "unlock
 * premium" can never be. It is the summary, not the content: the locks still hold.
 */

interface Props {
  data: DashboardData;
}

const DashboardLocked: React.FC<Props> = ({ data }) => {
  const nav = useNavigate();
  const [readiness, setReadiness] = useState<RoleReadinessAvailable | null>(null);

  useEffect(() => {
    if (!data.hasAssessment) return;   // nothing measured, so nothing to report
    let live = true;
    // Allowed to fail quietly: a student with no target role yet has no gap figures, and the
    // locks read perfectly well without them.
    passportApi.getMyReadiness()
      .then(r => { if (live && r.available) setReadiness(r); })
      .catch(() => {});
    return () => { live = false; };
  }, [data.hasAssessment]);

  const skills = data.skills || [];
  /**
   * Not measured yet. THE HOME SCREEN STILL RENDERS — it just leads with the one thing worth
   * doing instead of a skill meter of zeroes.
   *
   * This is why Mission Control stopped being the home screen. A student who had not sat the
   * paper was sent to a full-page sales pitch with its own chrome and no navigation, and a
   * student who had sat it saw the dashboard: the same click produced two completely different
   * products depending on state they could not see. The assessment is the argument at this
   * stage anyway, so it leads here and everything else stays where it will be found later.
   */
  const measured = !!data.hasAssessment;
  const assessmentHref = data.setupCompleted === false
    ? '/careerpilot/setup'
    : '/careerpilot/skill-assessment';

  const gaps = readiness?.summary.priorityGaps ?? null;
  const needsWork = readiness?.summary.needsWork ?? null;
  const measuredCount = readiness?.summary.assessedSkills ?? (skills.length || null);

  const roadmapFacts = [
    gaps !== null ? { value: gaps, label: 'priority gaps in your profile' } : null,
    needsWork !== null ? { value: needsWork, label: 'more skills needing work' } : null,
    { value: '90', label: 'days, paced to the time you have' },
  ].filter(Boolean) as { value: React.ReactNode; label: string }[];

  return (
    <div className="gd-main dlk">
      <header className="dlk-hd">
        <div>
          <h1>{data.firstName ? `Welcome back, ${data.firstName}` : 'Welcome back'}</h1>
          <p>
            {measured
              ? <>Your assessment is done and your results are below. The rest of CareerPilot — your
                  plan, your daily work and everything that runs off it — opens with membership.</>
              : <>Start with the free skill assessment. It measures where you actually are, and
                  everything else here is built from what it finds.</>}
          </p>
        </div>
        {data.careerScore !== null && data.careerScore !== undefined && (
          <div className="dlk-score">
            <b>{data.careerScore}</b>
            <span>Career score{data.careerLevel ? ` · ${data.careerLevel}` : ''}</span>
          </div>
        )}
      </header>

      {/* Free, and the reason the rest is worth having. Sits first for exactly that reason. */}
      <div className="gd-grid gd-2b">
        <div className="gd-card">
          <div className="gd-card-hd"><h2>{measured ? 'Your skill meter' : 'Start here'}</h2></div>
          {!measured ? (
            /* The one free thing, and the one thing worth doing. It gets the whole panel. */
            <div className="dlk-start">
              <p>
                Twenty minutes of questions, and you will know where you stand against the role
                you are aiming at — skill by skill, with nothing guessed.
              </p>
              <button className="dlk-cta" onClick={() => nav(assessmentHref)}>
                {data.setupCompleted === false ? 'Finish setup to start' : 'Start the free assessment'} →
              </button>
              <span className="dlk-free">Free. No membership needed.</span>
            </div>
          ) : skills.length ? (
            <ul className="dlk-skills">
              {skills.map(s => (
                <li key={s.key}>
                  <span className="nm">{s.label}</span>
                  <span className="br"><i style={{ width: `${Math.max(2, Math.min(100, s.score))}%` }} /></span>
                  <span className="vl">{s.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dlk-empty">Your assessment results will appear here shortly.</p>
          )}
          {measured && (
            <button className="dlk-link" onClick={() => nav('/careerpilot/skills')}>
              See your full Skill DNA →
            </button>
          )}
        </div>

        <div className="gd-card dlk-locked">
          <div className="gd-card-hd"><h2>Your 90-day plan</h2></div>
          <SectionLock
            section="roadmap"
            variant="panel"
            blurb={gaps !== null
              ? 'Your gaps, in the order they are worth closing, sized to the time you can give it.'
              : undefined}
            facts={roadmapFacts}
          />
        </div>
      </div>

      <div className="gd-grid gd-2b" style={{ marginTop: 14 }}>
        <div className="gd-card dlk-locked">
          <div className="gd-card-hd"><h2>Today’s work</h2></div>
          <SectionLock
            section="missions"
            variant="panel"
            facts={measuredCount ? [{ value: measuredCount, label: 'skills measured to plan from' }] : undefined}
          />
        </div>

        <div className="gd-card dlk-locked">
          <div className="gd-card-hd"><h2>Your progress</h2></div>
          <SectionLock section="progress" variant="panel" />
        </div>
      </div>

      {/* Named, not counted. A list of what opens is a reason; "premium features" is not. */}
      {(data.locked || []).length > 0 && (
        <div className="gd-card dlk-all" style={{ marginTop: 14 }}>
          <div className="gd-card-hd"><h2>What membership opens</h2></div>
          <ul className="dlk-list">
            {(data.locked || []).map(l => (
              <li key={l.section}>
                <i className="bi bi-unlock" />
                <span><b>{l.title}</b>{l.blurb}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DashboardLocked;
