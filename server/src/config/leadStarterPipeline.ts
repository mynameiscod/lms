import { LeadMilestone } from './leadMilestones';

/**
 * The "Add starter stages" set on the Pipeline settings page — an admissions pipeline an
 * institute can adopt and then edit freely. Nothing here is special to the code: once added,
 * these are ordinary configurable stages, sub-stages and reasons.
 */
export interface StarterReason { name: string; requiresDetail?: boolean }
export interface StarterSubStage {
  name: string;
  requiresReason?: boolean;
  requiresNote?: boolean;
  requiresFollowUp?: boolean;
  reasons?: StarterReason[];
}
export interface StarterStage {
  name: string;
  color: string;
  milestone: LeadMilestone;
  description: string;
  isFinal?: boolean;
  subStages: StarterSubStage[];
}

const other: StarterReason = { name: 'Other', requiresDetail: true };

export const STARTER_PIPELINE: StarterStage[] = [
  {
    name: 'New Lead', color: '#3B82F6', milestone: 'new',
    description: 'Received from Meta, website or manual entry; nobody has reached them yet.',
    subStages: [{ name: 'Fresh lead' }, { name: 'Re-enquiry' }],
  },
  {
    name: 'Contacting', color: '#F97316', milestone: 'contacting',
    description: 'Counsellor is trying to reach the lead.',
    subStages: [
      { name: 'No answer', requiresFollowUp: true },
      { name: 'Not connected', requiresFollowUp: true },
      { name: 'Busy', requiresFollowUp: true },
      { name: 'Switched off', requiresFollowUp: true },
      { name: 'Callback requested', requiresFollowUp: true },
    ],
  },
  {
    name: 'Connected', color: '#22C55E', milestone: 'connected',
    description: 'Two-way conversation has happened.',
    subStages: [
      { name: 'Discussion in progress' },
      { name: 'Need time', requiresFollowUp: true },
      { name: 'Parent discussion pending', requiresFollowUp: true },
      { name: 'Fee discussion pending', requiresFollowUp: true },
    ],
  },
  {
    name: 'Qualified', color: '#06B6D4', milestone: 'qualified',
    description: 'Eligibility and genuine interest verified.',
    subStages: [{ name: 'Eligible and interested' }, { name: 'Decision pending', requiresFollowUp: true }],
  },
  {
    name: 'Demo', color: '#8B5CF6', milestone: 'demo',
    description: 'Demo scheduled or being managed.',
    subStages: [
      { name: 'Demo scheduled', requiresFollowUp: true },
      { name: 'Demo attended' },
      { name: 'Demo no-show', requiresFollowUp: true },
      { name: 'Demo rescheduled', requiresFollowUp: true },
      { name: 'Demo cancelled', requiresReason: true, reasons: [{ name: 'Student cancelled' }, { name: 'Clash with exams' }, other] },
    ],
  },
  {
    name: 'Seat Reserved', color: '#84CC16', milestone: 'seat_reserved',
    description: 'Reservation payment verified.',
    subStages: [{ name: 'Reservation paid' }, { name: 'Balance pending', requiresFollowUp: true }],
  },
  {
    name: 'Enrolled', color: '#059669', milestone: 'enrolled', isFinal: true,
    description: 'Admission confirmed.',
    subStages: [{ name: 'Admission confirmed' }],
  },
  {
    name: 'Nurture', color: '#A855F7', milestone: 'nurture',
    description: 'Interested but not now — reactivate on a set date.',
    subStages: [{
      name: 'Follow up later', requiresReason: true, requiresFollowUp: true,
      reasons: [
        { name: 'Future batch' }, { name: 'Budget pending' }, { name: 'Exams pending' },
        { name: 'Parent approval pending' }, { name: 'Future joining date' }, other,
      ],
    }],
  },
  {
    name: 'Lost', color: '#EF4444', milestone: 'lost',
    description: 'Closed. A reason is always recorded; the lead can be reopened later.',
    subStages: [
      {
        name: 'Not interested', requiresReason: true,
        reasons: [{ name: 'Not interested' }, { name: 'Fee too high' }, { name: 'Joined competitor' }, other],
      },
      { name: 'Not eligible', requiresReason: true, reasons: [{ name: 'Not eligible' }, { name: 'Wrong audience' }, other] },
      { name: 'Unreachable', requiresReason: true, reasons: [{ name: 'Invalid contact' }, { name: 'Unreachable after retries' }, other] },
    ],
  },
];
