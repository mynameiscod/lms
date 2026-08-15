import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  RoleReadinessResponse, RoleReadinessAvailable, RoleReadinessUnavailable, ReadinessSkill,
} from '../../api/passportApi';
import './roleReadiness.css';

/**
 * How the student's demonstrated skills compare with the role they are aiming at.
 *
 * TWO NUMBERS, ALWAYS TOGETHER. Readiness is how they did on what we measured; coverage is
 * how much of the role we measured at all. Shown alone, "76%" could mean a well-evidenced
 * near-miss or three lucky answers, and a student cannot tell which — so coverage and
 * confidence sit beside it rather than in a tooltip.
 *
 * UNMEASURED IS NOT FAILED. Skills with no evidence get their own section and never show a
 * score or a bar. Rendering them as 0 would tell a student they are bad at something
 * nobody has asked them about, which is the single most damaging thing this screen could
 * do — they would go and study the wrong thing.
 *
 * No verdicts and no promises. This is capability alignment against configured
 * requirements, not a probability of being hired, and the copy says so.
 */

const SECTIONS: { status: string; title: string; blurb: string }[] = [
  { status: 'PRIORITY_GAP', title: 'Priority gaps', blurb: 'Furthest from what this role expects.' },
  { status: 'NEEDS_WORK', title: 'Needs work', blurb: 'Close, but not quite at the expected level yet.' },
  { status: 'NOT_ASSESSED', title: 'Not measured yet', blurb: 'We have no evidence either way for these.' },
  { status: 'LIMITED_EVIDENCE', title: 'Limited evidence', blurb: 'Measured a little — not enough to be sure.' },
  { status: 'ON_TRACK', title: 'On track', blurb: 'At or above what the role expects.' },
  { status: 'STRONG', title: 'Strong', blurb: 'Comfortably above the expected level.' },
];

const CONFIDENCE_LABEL: Record<string, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

const RoleReadiness: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<RoleReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getMyReadiness()
      .then(setData)
      .catch(e => setErr(e?.response?.data?.message || 'Could not work out your readiness.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rdy"><div className="rdy-load">Working out your readiness…</div></div>;
  if (err) return <div className="rdy"><div className="rdy-err">{err}</div></div>;
  if (!data) return null;

  // Each unavailable reason has a different fix, so each gets its own message and action.
  // Narrowed explicitly rather than by discriminant — this tsconfig does not narrow the
  // union, and an unchecked property access would fail at runtime rather than compile.
  if (!data.available) {
    const un = data as RoleReadinessUnavailable;
    const roleMissing = un.reason === 'ROLE_NOT_SELECTED';
    return (
      <div className="rdy">
        <div className="rdy-empty">
          <i className={`bi bi-${roleMissing ? 'compass' : 'hourglass-split'}`} />
          <b>{roleMissing ? 'Choose a target role first' : 'Not available for this role yet'}</b>
          <span>{un.message}</span>
          {roleMissing && (
            <button className="pm-btn primary" onClick={() => nav('/careerpilot/setup')}>
              Set my target role
            </button>
          )}
        </div>
      </div>
    );
  }

  const ready = data as RoleReadinessAvailable;
  const { readiness, coverage, confidence, summary, role } = ready;
  const byStatus = (s: string) => (ready.skills || []).filter(x => x.status === s);

  return (
    <div className="rdy">
      <div className="rdy-hd">
        <h1>Your {role.name} readiness</h1>
        <p>
          How your demonstrated skills compare with what this role expects. This is skill
          alignment — not a prediction about jobs.
        </p>
      </div>

      {/* ── the two figures, deliberately side by side ── */}
      <div className="rdy-top">
        <div className="fig main">
          {/* Null readiness means nothing was measured — a dash, never a zero. */}
          <b>{readiness === null ? '—' : `${readiness}%`}</b>
          <span>Readiness</span>
          <em>Against the skills we have measured</em>
        </div>
        <div className={`fig${coverage < 40 ? ' warn' : ''}`}>
          <b>{coverage}%</b>
          <span>Coverage</span>
          <em>How much of the role we have measured</em>
        </div>
        <div className="fig">
          <b>{CONFIDENCE_LABEL[confidence] || confidence}</b>
          <span>Confidence</span>
          <em>Based on coverage and evidence</em>
        </div>
      </div>

      {readiness === null ? (
        <div className="rdy-note warn">
          <i className="bi bi-info-circle" />
          We have not measured enough of this role to give you a readiness figure yet.
          Completing your assessment starts building it.
        </div>
      ) : coverage < 50 && (
        <div className="rdy-note">
          <i className="bi bi-info-circle" />
          Your readiness is based on {summary.assessedSkills} of {summary.requiredSkills} required
          skills. As more are measured, this figure will become more meaningful.
        </div>
      )}

      <div className="rdy-counts">
        <span><b>{summary.onTrack + summary.strong}</b> on track</span>
        <span><b>{summary.needsWork}</b> need work</span>
        <span><b>{summary.priorityGaps}</b> priority gap{summary.priorityGaps === 1 ? '' : 's'}</span>
        <span><b>{summary.notAssessed + summary.limitedEvidence}</b> need measuring</span>
      </div>

      {SECTIONS.map(section => {
        const rows = byStatus(section.status);
        if (!rows.length) return null;
        const unmeasured = section.status === 'NOT_ASSESSED';

        return (
          <div className="rdy-sec" key={section.status}>
            <div className="sh">
              <b>{section.title}</b>
              <span>{section.blurb}</span>
            </div>

            {rows.map((s: ReadinessSkill) => (
              <div className={`rdy-row s-${s.status.toLowerCase()}`} key={s.skillKey}>
                <div className="tx">
                  <b>{s.skillName}</b>
                  {s.importance === 'ESSENTIAL' && <i className="ess">essential</i>}
                </div>

                {unmeasured ? (
                  // No score, no bar. A number here would read as a failing grade.
                  <div className="none">
                    <span>Target: {s.targetLevel.toLowerCase()}</span>
                    <em>No evidence yet</em>
                  </div>
                ) : (
                  <>
                    <div className="nums">
                      <span className="sc">{s.studentScore}</span>
                      <span className="of">/ {s.targetScore}</span>
                      {!!s.gapPoints && <span className="gp">{s.gapPoints} short</span>}
                    </div>
                    <div className="bar">
                      <i style={{ width: `${Math.min(100, ((s.studentScore || 0) / s.targetScore) * 100)}%` }} />
                    </div>
                    <div className="meta">
                      <span className={`conf ${(s.skillConfidence || 'low').toLowerCase()}`}>
                        {CONFIDENCE_LABEL[s.skillConfidence || 'LOW']} confidence
                      </span>
                      <em>{s.evidenceCount} answer{s.evidenceCount === 1 ? '' : 's'}</em>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <div className="rdy-foot">
        <p>
          <b>Readiness</b> compares your demonstrated skills with the skills configured for
          this role. <b>Coverage</b> shows how much of that role we have enough evidence to
          judge. A skill we have not measured is not counted against you.
        </p>
        {/* Being able to do the job is one of three questions. The other two — whether the
            resume shows it, and whether it survives an interview — have completely
            different fixes, which is why they live on their own screen rather than being
            folded into this number. */}
        <button className="rdy-more" onClick={() => nav('/careerpilot/placement')}>
          Your resume and interview readiness <i className="bi bi-arrow-right" />
        </button>
      </div>
    </div>
  );
};

export default RoleReadiness;
