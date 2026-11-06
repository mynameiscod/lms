import React from 'react';

/**
 * Lead lifecycle stepper. Steps are the admissions MILESTONES (not stage names), labelled with
 * the institute's own stage name for that milestone where one exists. A step is done when the
 * lead reached it (Lead.milestones.*At, first reach), current when the lead's stage carries
 * that milestone. Clicking a step opens the stage dialog for the matching stage.
 */
export const LIFECYCLE = [
  { key: 'new', label: 'New Lead', field: null },
  { key: 'contacting', label: 'Contacting', field: 'contactingAt' },
  { key: 'connected', label: 'Connected', field: 'connectedAt' },
  { key: 'qualified', label: 'Qualified', field: 'qualifiedAt' },
  { key: 'demo', label: 'Demo', field: 'demoAt' },
  { key: 'seat_reserved', label: 'Seat Reserved', field: 'seatReservedAt' },
  { key: 'enrolled', label: 'Enrolled', field: 'enrolledAt' },
] as const;

const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

interface Props {
  lead: any;
  currentMilestone: string;
  stagesByMilestone: Record<string, { _id: string; name: string } | undefined>;
  onPick: (stageId: string | null) => void;
}

const LeadLifecycle: React.FC<Props> = ({ lead, currentMilestone, stagesByMilestone, onPick }) => {
  const ms = lead.milestones || {};
  const currentIdx = LIFECYCLE.findIndex(s => s.key === currentMilestone);
  // Furthest step reached (for leads parked in nurture / lost, the line still shows how far they got).
  const reachedIdx = LIFECYCLE.reduce((acc, s, i) => (i === 0 || (s.field && ms[s.field]) ? i : acc), 0);
  const lineTo = Math.max(currentIdx, reachedIdx);

  return (
    <ol className="ldv-steps" aria-label="Lead lifecycle">
      {LIFECYCLE.map((s, i) => {
        const at = s.field ? ms[s.field] : lead.createdAt;
        const isCurrent = i === currentIdx;
        const done = !isCurrent && (i === 0 || !!at) && i <= lineTo;
        const stage = stagesByMilestone[s.key];
        const state = isCurrent ? 'current' : done ? 'done' : 'todo';
        return (
          <li key={s.key} className={`ldv-step ${state}${i < lineTo ? ' line-on' : ''}`}>
            <button type="button" className="ldv-step-btn" onClick={() => onPick(stage?._id || null)}
              title={stage ? `Move to ${stage.name}` : 'Change stage'} aria-current={isCurrent ? 'step' : undefined}>
              <span className="ldv-step-dot" aria-hidden="true">{done ? <i className="bi bi-check-lg" /> : i + 1}</span>
              <span className="ldv-step-label">{stage?.name || s.label}</span>
              <span className="ldv-step-date">{(done || isCurrent) && at ? fmt(at) : ''}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default LeadLifecycle;
