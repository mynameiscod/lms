import { LeadMilestone } from './leadMilestones';

/**
 * What the date range means on the Leads screen.
 *
 * The same date range answers two different questions:
 *  - "Of the leads we got in November, how far did they get?"  → dates = when the lead was CREATED
 *  - "How many seats did we reserve in November?"               → dates = when the step HAPPENED
 * A lead from August that reserves a seat on 25 Nov counts in November only in the second view.
 */

/** List filter `dateField` → the Lead path the date range applies to. */
export const LEAD_DATE_FIELDS: Record<string, string> = {
  created: 'createdAt',
  lastContact: 'lastContactedAt',
  connected: 'milestones.connectedAt',
  qualified: 'milestones.qualifiedAt',
  demo: 'milestones.demoAt',
  demoAttended: 'milestones.demoAttendedAt',
  seatReserved: 'milestones.seatReservedAt',
  enrolled: 'milestones.enrolledAt',
  nurture: 'milestones.nurtureAt',
  lost: 'milestones.lostAt',
  contacting: 'milestones.contactingAt',
};

/** List filter `reached` → milestone stamp that must exist ("reached this step, later steps included"). */
export const LEAD_REACHED_FIELDS: Record<string, string> = {
  connected: 'milestones.connectedAt',
  qualified: 'milestones.qualifiedAt',
  demoAttended: 'milestones.demoAttendedAt',
  seatReserved: 'milestones.seatReservedAt',
  enrolled: 'milestones.enrolledAt',
};

/** A stage's milestone → the dateField that says when a lead got there. */
export function dateFieldForMilestone(m: LeadMilestone): string {
  switch (m) {
    case 'contacting': return 'contacting';
    case 'connected': return 'connected';
    case 'qualified': return 'qualified';
    case 'demo': return 'demo';
    case 'seat_reserved': return 'seatReserved';
    case 'enrolled': return 'enrolled';
    case 'nurture': return 'nurture';
    case 'lost': return 'lost';
    default: return 'created';
  }
}
