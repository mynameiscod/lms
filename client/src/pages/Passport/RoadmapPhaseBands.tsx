import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoadmapGateSummary } from '../../api/passportApi';
import './roadmapPhaseBands.css';

/**
 * Roadmap V2, as a student sees it: one roadmap. How it was put together — revision, a bridge of
 * earlier years, the year — is the admin's view (the student's journey page), never the student's.
 *
 * What a student does need is why a day is locked: while the checkpoints on their earlier days
 * hold the rest of the roadmap, this says how many are passed and takes them to what is left.
 * Renders nothing otherwise, so every other roadmap looks exactly as it did.
 */
const RoadmapPhaseBands: React.FC<{ gate?: RoadmapGateSummary | null }> = ({ gate }) => {
  const nav = useNavigate();
  if (!gate || gate.open || !gate.firstYearDay) return null;
  return (
    <section className="rpb" aria-label="Checkpoints to pass">
      <div className="rpb-gate">
        <i className="bi bi-shield-lock-fill" aria-hidden />
        <div>
          <b>Checkpoints: {gate.passed} of {gate.total} passed</b>
          <span>Pass the checkpoints on your earlier days and Day {gate.firstYearDay} opens.{gate.flagged ? ` ${gate.flagged} checkpoint(s) are with your mentor.` : ''}</span>
        </div>
        <button type="button" onClick={() => nav(`/careerpilot/journey/day/${gate.firstYearDay}`)}>See what’s left</button>
      </div>
    </section>
  );
};

export default RoadmapPhaseBands;
