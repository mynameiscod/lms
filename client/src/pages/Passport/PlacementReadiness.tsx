import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  PlacementReadinessView, ResumeReadinessView, InterviewReadinessView, InterviewCoverageView,
  ClaimStatus,
} from '../../api/passportApi';
import './placementReadiness.css';

/**
 * Placement readiness — three questions, three answers, never one number.
 *
 * THE WHOLE POINT IS THAT THEY ARE SEPARATE. "Can you do the job", "does your resume show
 * it" and "can you show it in an interview" have completely different fixes: three months of
 * study, an afternoon of editing, and practice. A blended score would hide which one the
 * student is actually facing, so this screen never adds them up and offers no overall figure.
 *
 * NEVER MEASURED IS NOT ZERO. Every panel here can be in an unmeasured state, and each says
 * so plainly instead of rendering 0%. A student shown 0% for an interview they never sat
 * would go and practise the wrong thing.
 *
 * A CLAIM IS NOT AN ACCUSATION. Where the resume says more than the evidence supports, the
 * copy reports what we have measured. The student may well be right and simply untested —
 * and the fix offered is a check-in, not an apology.
 */

const CLAIM_META: Record<ClaimStatus, { label: string; icon: string; tone: string }> = {
  VERIFIED:               { label: 'Backed by evidence', icon: 'bi-patch-check',      tone: 'ok' },
  NEEDS_VALIDATION:       { label: 'Not measured yet',   icon: 'bi-question-circle',  tone: 'neutral' },
  CLAIM_EXCEEDS_EVIDENCE: { label: 'Ahead of evidence',  icon: 'bi-arrow-up-right',   tone: 'warn' },
  MISSING_FROM_RESUME:    { label: 'Missing from resume', icon: 'bi-file-earmark-x',  tone: 'info' },
};

const CLAIM_ORDER: ClaimStatus[] = [
  'MISSING_FROM_RESUME', 'CLAIM_EXCEEDS_EVIDENCE', 'NEEDS_VALIDATION', 'VERIFIED',
];

const DIMENSION_LABEL: Record<string, string> = {
  COMPLETENESS: 'Completeness',
  ROLE_ALIGNMENT: 'Role alignment',
  SKILL_EVIDENCE: 'Skill evidence',
  PROJECT_STRENGTH: 'Project strength',
  IMPACT: 'Impact',
  ATS_QUALITY: 'ATS quality',
  TECHNICAL: 'Technical',
  PROBLEM_SOLVING: 'Problem solving',
  COMMUNICATION: 'Communication',
  DELIVERY: 'Delivery',
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: 'Do first', IMPORTANT: 'Worth doing', OPTIONAL: 'If you have time',
};

const band = (n: number) => (n >= 70 ? 'good' : n >= 40 ? 'mid' : 'low');

/** One of the three headline figures — or an honest statement that it is not measured. */
const Figure: React.FC<{
  title: string; question: string; value: number | null | undefined;
  unmeasured?: string; foot?: React.ReactNode;
}> = ({ title, question, value, unmeasured, foot }) => (
  <div className="plr-fig">
    <span className="ttl">{title}</span>
    <em className="q">{question}</em>
    {typeof value === 'number'
      ? <b className={`val ${band(value)}`}>{value}<i>%</i></b>
      : <span className="none">{unmeasured || 'Not measured yet'}</span>}
    {foot}
  </div>
);

const Bars: React.FC<{ rows: { dimension: string; score: number; detail?: string }[] }> = ({ rows }) => (
  <ul className="plr-bars">
    {rows.map(d => (
      <li key={d.dimension}>
        <span className="nm">{DIMENSION_LABEL[d.dimension] || d.dimension}</span>
        <span className="track"><i className={band(d.score)} style={{ width: `${d.score}%` }} /></span>
        <span className="pc">{d.score}%</span>
        {d.detail && <em className="dt">{d.detail}</em>}
      </li>
    ))}
  </ul>
);

const ResumePanel: React.FC<{ data: ResumeReadinessView }> = ({ data }) => {
  const nav = useNavigate();

  if (!data.available) {
    return (
      <section className="plr-panel">
        <div className="hd"><i className="bi bi-file-earmark-text" /><b>Your resume</b></div>
        <div className="plr-empty">
          <p>{data.message}</p>
          {data.reason === 'NO_RESUME' && (
            <button className="plr-btn primary" onClick={() => nav('/careerpilot/resume')}>Build your resume</button>
          )}
          {data.reason === 'ROLE_NOT_SELECTED' && (
            <button className="plr-btn primary" onClick={() => nav('/careerpilot/setup')}>Choose a target role</button>
          )}
        </div>
      </section>
    );
  }

  const claims = [...(data.claims || [])].sort(
    (a, b) => CLAIM_ORDER.indexOf(a.status) - CLAIM_ORDER.indexOf(b.status));

  return (
    <section className="plr-panel">
      <div className="hd">
        <i className="bi bi-file-earmark-text" />
        <b>Your resume, against {data.role?.name}</b>
      </div>

      <Bars rows={data.dimensions || []} />

      {!!(data.recommendations || []).length && (
        <div className="plr-recs">
          <span className="lbl">What to change</span>
          <ul>
            {data.recommendations!.map((r, i) => (
              <li key={i}>
                <em className={`pri ${r.priority.toLowerCase()}`}>{PRIORITY_LABEL[r.priority]}</em>
                <span>{r.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!claims.length && (
        <div className="plr-claims">
          <span className="lbl">What your resume claims, and what we have measured</span>
          <ul>
            {claims.map(c => {
              const meta = CLAIM_META[c.status];
              return (
                <li key={c.skillKey} className={meta.tone}>
                  <i className={`bi ${meta.icon}`} />
                  <span className="sk">{c.skillName}</span>
                  <em className="st">{meta.label}</em>
                  {/* Never rendered as 0 — unmeasured is its own state. */}
                  <span className="sc">{c.measuredScore === null ? '—' : `${c.measuredScore}%`}</span>
                  <em className="msg">{c.message}</em>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button className="plr-btn" onClick={() => nav('/careerpilot/resume')}>Open resume editor</button>
    </section>
  );
};

const InterviewPanel: React.FC<{
  data: InterviewReadinessView; coverage: InterviewCoverageView | null;
}> = ({ data, coverage }) => {
  const nav = useNavigate();

  return (
    <section className="plr-panel">
      <div className="hd"><i className="bi bi-mic" /><b>Under interview conditions</b></div>

      {data.available ? (
        <>
          <p className="sub">
            From your {data.role} interview{data.completedAt ? ` on ${new Date(data.completedAt).toLocaleDateString()}` : ''}.
          </p>
          <Bars rows={(data.dimensions || []).map(d => ({ dimension: d.dimension, score: d.score }))} />
          {!!(data.perSkill || []).length && (
            <div className="plr-areas">
              <span className="lbl">How each area went</span>
              <ul>
                {data.perSkill!.map(s => (
                  <li key={s.skillKey}><span>{s.area}</span><em className={band(s.score)}>{s.score}%</em></li>
                ))}
              </ul>
            </div>
          )}
          <p className="plr-note">
            What you demonstrated here counts towards your Skill DNA, weighted below a marked
            assessment — talking through an answer is real evidence, and solving the problem
            under exam conditions is stronger.
          </p>
        </>
      ) : (
        <div className="plr-empty"><p>{data.message}</p></div>
      )}

      {coverage?.ok && !!coverage.targets?.length && (
        <div className="plr-cover">
          <span className="lbl">Your next role interview would cover</span>
          <div className="tags">
            {coverage.targets.map(t => (
              <i key={t.skillKey} className={t.bands.includes('gaps') ? 'gap' : ''}>
                {t.skillName}
                {t.bands.includes('gaps') && <b>gap</b>}
              </i>
            ))}
          </div>
        </div>
      )}

      {/* The interview screen owns starting a sitting — one owner, so a member cannot
          end up with a session opened here and a second opened there. */}
      <button className="plr-btn primary" onClick={() => nav('/careerpilot/interview?mode=role')}>
        Take a role interview
      </button>
    </section>
  );
};

const PlacementReadiness: React.FC = () => {
  const nav = useNavigate();
  const [data, setData] = useState<PlacementReadinessView | null>(null);
  const [coverage, setCoverage] = useState<InterviewCoverageView | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [d, c] = await Promise.all([
          passportApi.getPlacementReadiness(),
          passportApi.getInterviewCoverage().catch(() => null),
        ]);
        setData(d);
        setCoverage(c);
      } catch (e: any) {
        setErr(e?.response?.data?.message || 'Could not load your placement readiness.');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="plr-load"><i className="bi bi-arrow-repeat spin" /> Loading…</div>;
  if (err || !data) return <div className="plr-err page">{err || 'Nothing to show yet.'}</div>;

  return (
    <div className="plr">
      <header className="plr-hd">
        <h1>Placement readiness</h1>
        <p>
          Three separate questions. We keep them apart on purpose — strong skills with a weak
          resume is an afternoon's work, and the reverse is not.
        </p>
      </header>

      <div className="plr-figs">
        <Figure
          title="Your skills"
          question="Can you do the job?"
          value={data.skill.available ? data.skill.readiness : null}
          unmeasured={data.skill.available ? 'Not enough measured yet' : 'No target role chosen'}
          foot={data.skill.available && typeof data.skill.coverage === 'number' ? (
            // Coverage travels with readiness everywhere it is shown — a score over a
            // sliver of the role means something quite different from a score over all of it.
            <em className="foot">{data.skill.coverage}% of the role measured · {String(data.skill.confidence || '').toLowerCase()} confidence</em>
          ) : undefined}
        />
        <Figure
          title="Your resume"
          question="Does it show what you can do?"
          value={data.resume.available ? data.resume.readiness : null}
          unmeasured={data.resume.reason === 'NO_RESUME' ? 'No resume yet' : 'Not reviewable yet'}
        />
        <Figure
          title="Your interview"
          question="Can you show it on the day?"
          value={data.interview.available ? data.interview.readiness : null}
          unmeasured="No role interview yet"
        />
      </div>

      <p className="plr-why">
        There is no combined score, and there will not be one: a single number could not tell
        you which of these three to spend your week on.
      </p>

      <div className="plr-cols">
        <ResumePanel data={data.resume} />
        <InterviewPanel data={data.interview} coverage={coverage} />
      </div>

      <button className="plr-link" onClick={() => nav('/careerpilot/readiness')}>
        See the full skill breakdown <i className="bi bi-arrow-right" />
      </button>
    </div>
  );
};

export default PlacementReadiness;
