import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { SkillDnaRow } from '../../api/passportApi';
import './skillDna.css';

/**
 * What the assessment showed about each skill.
 *
 * Three numbers, kept visibly distinct: the SCORE is how the student performed, the
 * CONFIDENCE is how much evidence sits behind it, and the COUNT is that evidence. Showing
 * a bar alone would let one lucky answer read as mastery — which is the single most
 * misleading thing this screen could do, because the student would act on it.
 *
 * No verdicts. Nothing here says ready, weak, good or bad: a score is an observation, and
 * what it means for a career depends on a target role this module deliberately does not
 * consult. Turning 64 into a judgement is a later module's job and a heavier claim than
 * the evidence currently supports.
 */

const CONFIDENCE_COPY: Record<string, string> = {
  HIGH: 'Well evidenced',
  MEDIUM: 'Some evidence',
  LOW: 'Limited evidence',
};

const SkillDna: React.FC = () => {
  const nav = useNavigate();
  const [skills, setSkills] = useState<SkillDnaRow[]>([]);
  const [assessed, setAssessed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getMySkillDna()
      .then(r => { setSkills(r.skills); setAssessed(r.assessed); })
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your skills.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dna"><div className="dna-load">Loading your skills…</div></div>;
  if (err) return <div className="dna"><div className="dna-err">{err}</div></div>;

  // Absence of evidence is "not measured yet", never a screen of zeros — those would read
  // as "you know nothing" rather than "we have not asked you".
  if (!assessed) {
    return (
      <div className="dna">
        <div className="dna-empty">
          <i className="bi bi-fingerprint" />
          <b>Your Skill DNA appears after your assessment</b>
          <span>
            Once you complete your CareerPilot assessment, this page shows what it revealed
            about each skill — and how much evidence sits behind every number.
          </span>
          <button className="pm-btn primary" onClick={() => nav('/careerpilot/assessment')}>
            Go to my assessment
          </button>
        </div>
      </div>
    );
  }

  const lowEvidence = skills.filter(s => s.confidence === 'LOW').length;

  return (
    <div className="dna">
      <div className="dna-hd">
        <h1>Your Skill DNA</h1>
        <p>
          What your assessment showed about each skill. The score is how you did; the
          confidence is how much we have to go on so far.
        </p>
      </div>

      {!!lowEvidence && (
        <div className="dna-note">
          <i className="bi bi-info-circle" />
          {lowEvidence} skill{lowEvidence === 1 ? ' has' : 's have'} limited evidence — a
          single question tells us less than several. Taking the assessment again adds to it.
        </div>
      )}

      <div className="dna-list">
        {skills.map(s => (
          <div className={`dna-row c-${s.confidence.toLowerCase()}`} key={s.skillKey}>
            <div className="top">
              <b>{s.skillName}</b>
              <span className="score">{s.score}</span>
            </div>

            <div className="bar"><i style={{ width: `${s.score}%` }} /></div>

            <div className="meta">
              {/* Confidence sits beside the score deliberately — a number without it invites
                  the reader to treat one answer as proof. */}
              <span className={`conf ${s.confidence.toLowerCase()}`}>
                {CONFIDENCE_COPY[s.confidence] || s.confidence}
              </span>
              <em>
                {s.evidenceCount} answer{s.evidenceCount === 1 ? '' : 's'}
                {s.distinctItems !== s.evidenceCount && ` · ${s.distinctItems} question${s.distinctItems === 1 ? '' : 's'}`}
              </em>
              {!s.skillActive && <i className="retired" title="No longer part of the skill graph">retired</i>}
            </div>
          </div>
        ))}
      </div>

      <p className="dna-foot">
        <i className="bi bi-question-circle" />
        Confidence shows how much assessment evidence CareerPilot has for a skill — not how
        good you are at it. A score based on one answer is less settled than one based on eight.
      </p>

      {/* Where the journey goes next.
          This page used to end here. A student finished their assessment, read their
          scores, and found no way onward — the readiness, roadmap and daily plan all
          existed and nothing linked to them. The only button on the page sent them to the
          OTHER assessment, which is backwards. */}
      <div className="dna-next">
        <h2>What happens next</h2>
        <p>Your scores feed straight into the plan — here is where they go.</p>
        <div className="dna-next-row">
          <button className="pm-btn primary" onClick={() => nav('/careerpilot/readiness')}>
            <i className="bi bi-clipboard-check" /> See how ready I am for my role
          </button>
          <button className="pm-btn" onClick={() => nav('/careerpilot/roadmap')}>
            <i className="bi bi-map" /> My roadmap
          </button>
          <button className="pm-btn ghost" onClick={() => nav('/careerpilot')}>
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillDna;
