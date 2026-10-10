import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoadmapPhaseSummary, RoadmapGateSummary } from '../../api/passportApi';
import './roadmapPhaseBands.css';

/**
 * Roadmap V2: the plan in its parts — revision of what a member studied before, the bridge of
 * earlier years' foundations, then the year itself — each with its own progress, and the gate
 * between the bridge and the year while it is still closed.
 *
 * Renders nothing for a V1 journey (no `phases`), so every existing roadmap looks exactly as it did.
 */
const COPY: Record<string, { title: (stage: string) => string; blurb: string; icon: string }> = {
  REVISION: { title: () => 'Revision', blurb: 'Practice on what you already studied with us.', icon: 'bi-arrow-repeat' },
  BRIDGE: { title: () => 'Foundation bridge', blurb: 'The earlier years’ essentials your year builds on.', icon: 'bi-signpost-split' },
  YEAR: { title: (stage) => `${stage} year`, blurb: 'Your year’s own roadmap.', icon: 'bi-flag' },
};

const RoadmapPhaseBands: React.FC<{
  phases?: RoadmapPhaseSummary[];
  gate?: RoadmapGateSummary | null;
  stageLabel?: string;
}> = ({ phases, gate, stageLabel }) => {
  const nav = useNavigate();
  if (!phases?.length) return null;
  return (
    <section className="rpb" aria-label="Your roadmap, in parts">
      <div className="rpb-bands">
        {phases.map((p, i) => {
          const c = COPY[p.phase];
          const pct = p.days ? Math.round((p.completed / p.days) * 100) : 0;
          return (
            <div key={p.phase} className={`rpb-band ph-${p.phase.toLowerCase()}${pct === 100 ? ' done' : ''}`}>
              <div className="rpb-band-hd">
                <span className="rpb-ic"><i className={`bi ${c.icon}`} aria-hidden /></span>
                <div>
                  <b>{c.title(stageLabel || 'Your')}</b>
                  <small>{p.fromDay && p.toDay ? `Days ${p.fromDay}–${p.toDay}` : ''} · {p.days} {p.days === 1 ? 'day' : 'days'}</small>
                </div>
                {i < phases.length - 1 && <i className="bi bi-chevron-right rpb-next" aria-hidden />}
              </div>
              <p>{c.blurb}</p>
              <div className="rpb-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
              <span className="rpb-count">{p.completed} of {p.days} done</span>
            </div>
          );
        })}
      </div>
      {gate && !gate.open && gate.firstYearDay && (
        <div className="rpb-gate">
          <i className="bi bi-shield-lock-fill" aria-hidden />
          <div>
            <b>Foundation check: {gate.passed} of {gate.total} passed</b>
            <span>Pass the rest of your bridge checks and Day {gate.firstYearDay} opens.{gate.flagged ? ` ${gate.flagged} check(s) are with your mentor.` : ''}</span>
          </div>
          <button type="button" onClick={() => nav(`/careerpilot/journey/day/${gate.firstYearDay}`)}>See what’s left</button>
        </div>
      )}
    </section>
  );
};

export default RoadmapPhaseBands;
