/**
 * Lead milestones — what a stage MEANS, independent of what an institute names it.
 *
 * Stages, sub-stages and reasons are fully configurable per institute (the CRM may be used
 * by businesses other than CodeBegun). Reports, Meta conversion events and automation must
 * therefore never look at a stage's name; they read the stage's `milestone` instead.
 */
export const LEAD_MILESTONES = [
  'new', 'contacting', 'connected', 'qualified', 'demo', 'seat_reserved', 'enrolled', 'nurture', 'lost', 'none',
] as const;
export type LeadMilestone = typeof LEAD_MILESTONES[number];

export const MILESTONE_LABELS: Record<LeadMilestone, string> = {
  new: 'New lead',
  contacting: 'Contacting',
  connected: 'Connected',
  qualified: 'Qualified',
  demo: 'Demo',
  seat_reserved: 'Seat reserved',
  enrolled: 'Enrolled / converted',
  nurture: 'Nurture (later)',
  lost: 'Lost / closed',
  none: 'No milestone',
};

type Category = 'new' | 'engaging' | 'qualified' | 'negotiation' | 'converted' | 'lost';

/** The legacy `category` older code reads (Outpero stop, team activity "closed"), kept in step. */
export function categoryForMilestone(m: LeadMilestone, fallback: Category = 'engaging'): Category {
  switch (m) {
    case 'new': return 'new';
    case 'contacting': case 'connected': case 'nurture': return 'engaging';
    case 'qualified': case 'demo': return 'qualified';
    case 'seat_reserved': return 'negotiation';
    case 'enrolled': return 'converted';
    case 'lost': return 'lost';
    default: return fallback;
  }
}

/** Best guess for a stage saved before milestones existed. Display only — never written back. */
export function milestoneFromLegacy(stage: { milestone?: string; category?: string; isLostStage?: boolean }): LeadMilestone {
  if (stage.milestone && (LEAD_MILESTONES as readonly string[]).includes(stage.milestone)) return stage.milestone as LeadMilestone;
  if (stage.isLostStage) return 'lost';
  switch (stage.category) {
    case 'new': return 'new';
    case 'converted': return 'enrolled';
    case 'lost': return 'lost';
    case 'negotiation': return 'seat_reserved';
    default: return 'none';
  }
}

export const isMilestone = (v: unknown): v is LeadMilestone =>
  typeof v === 'string' && (LEAD_MILESTONES as readonly string[]).includes(v);
