import mongoose, { Document, Schema } from 'mongoose';
import { IMemberAudience, MemberAudienceSchema, EMPTY_MEMBER_AUDIENCE } from './memberAudience';

/**
 * InterviewPlan — how many mock interviews a member gets, and what shape each one is.
 *
 * A PRIORITISED LIST, NOT A MATRIX. The obvious reading of "configure by year, course,
 * branch and role" is a grid, and a grid of 4 years × 24 branches × every course × every
 * role is thousands of cells that nobody maintains and that still leaves a hole for the
 * student who matches none of them. So this is the shape pathwayMatchService already uses
 * for the same problem: a handful of plans, ordered, first match wins, and one flagged
 * `fallback` that catches whoever is left. Five plans cover a college; a grid never gets
 * filled in.
 *
 * TARGETING IS NOT REIMPLEMENTED HERE. `audience` is the shared IMemberAudience that the
 * concept bank, the Thinking Lab and the Communication Lab all already use, matched by
 * audienceServes(). Empty means everyone on each axis independently, values are OR'd within
 * an axis and AND'd across them. A second targeting implementation would drift from that one
 * and produce a member who matches a plan on one screen and not on another.
 *
 * NOTHING HERE DECIDES WHAT A SCORE MEANS. An admin sets how long a sitting is and how it is
 * divided; the interviewer prompt, the grading rubric, the transcript window and the model
 * stay in code. If a tenant could change those, two members' "72%" would stop being
 * comparable — and Skill DNA and role readiness are both built on that comparability.
 */

/**
 * The three kinds of round.
 *
 * Deliberately the SAME three keys as InterviewTemplate.sections[].sectionType and
 * interviewAIService.CATEGORY_KEYS, which already carry per-kind grading criteria —
 * confidence/fluency/clarity for communication, correctness/depth/debugging for technical.
 * A fourth vocabulary here would mean a round type that nothing knows how to grade.
 */
export const ROUND_TYPES = ['technical', 'hr', 'communication'] as const;
export type InterviewRoundType = typeof ROUND_TYPES[number];

export const ROUND_TYPE_LABEL: Record<InterviewRoundType, string> = {
  technical:     'Technical',
  hr:            'HR / Behavioural',
  communication: 'Communication',
};

export interface IInterviewRound {
  type: InterviewRoundType;
  /** The admin's own name for it ("DSA & fundamentals"). Blank falls back to the type label. */
  label: string;
  /** Target number of interviewer questions in this round. */
  questions: number;
  /**
   * Wall-clock cap for the round.
   *
   * A CAP, WITH `questions` AS THE TARGET — whichever comes first ends the round. That is
   * already how mode=intro behaves (INTRO_QUESTIONS with INTRO_LIMIT_SEC), and it is the
   * only combination that can be honestly described to a student: "about 4 questions, up to
   * 10 minutes" is a promise both halves of which are kept.
   */
  minutes: number;
}

export interface IInterviewQuota {
  /**
   * Sittings allowed per ROLLING 30 DAYS. 0 means the plan grants none.
   *
   * Rolling rather than calendar-month, so a member cannot sit their allowance on the 31st
   * and the whole of it again on the 1st.
   */
  perThirtyDays: number;
  /** Minimum gap between sittings. 0 disables it. */
  cooldownHours: number;
}

export interface IInterviewPlan extends Document {
  tenantId: string;
  name: string;
  active: boolean;
  /**
   * The catch-all. Considered only after every ordinary plan has failed to match, whatever
   * its priority, so it cannot accidentally outrank a specific plan by being saved with a
   * high number. Mirrors PathwayRule's fallback.
   */
  fallback: boolean;
  /** Higher wins. Ties keep author order, so the list an admin sees is the order applied. */
  priority: number;
  audience: IMemberAudience;
  rounds: IInterviewRound[];
  quota: IInterviewQuota;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bounds, enforced server-side and published to the admin screen.
 *
 * `questions` is capped at 12 for a reason that is not arbitrary: evaluateTranscript stores
 * `questionFeedback.slice(0, 12)`, so question thirteen is asked, answered, and then given
 * no coaching at all. A plan that exceeds it would quietly sell a member feedback they never
 * receive.
 */
export const PLAN_BOUNDS = {
  questionsPerRound: { min: 1, max: 12 },
  totalQuestions:    { min: 1, max: 12 },
  minutesPerRound:   { min: 1, max: 60 },
  rounds:            { min: 1, max: 4 },
  perThirtyDays:     { min: 0, max: 60 },
  cooldownHours:     { min: 0, max: 168 },
  priority:          { min: 0, max: 999 },
};

/** The shipped behaviour, used when no plan matches. Today's hardcoded six-question mock. */
export const DEFAULT_PLAN_SHAPE: { rounds: IInterviewRound[]; quota: IInterviewQuota } = {
  rounds: [
    { type: 'technical',     label: 'Technical',     questions: 3, minutes: 12 },
    { type: 'hr',            label: 'HR',            questions: 2, minutes: 8 },
    { type: 'communication', label: 'Communication', questions: 1, minutes: 4 },
  ],
  // Unlimited by default: this is what the product does TODAY, and a config screen that
  // silently starts rationing on the day it ships would be a behaviour change disguised as
  // a feature. An admin opts into a limit by writing a plan.
  quota: { perThirtyDays: 0, cooldownHours: 0 },
};

const RoundSchema = new Schema<IInterviewRound>({
  type:      { type: String, enum: ROUND_TYPES, required: true },
  label:     { type: String, default: '' },
  questions: { type: Number, default: 2 },
  minutes:   { type: Number, default: 8 },
}, { _id: false });

const InterviewPlanSchema = new Schema<IInterviewPlan>(
  {
    tenantId: { type: String, required: true, index: true },
    name:     { type: String, required: true },
    active:   { type: Boolean, default: true },
    fallback: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    audience: { type: new Schema(MemberAudienceSchema, { _id: false }), default: () => EMPTY_MEMBER_AUDIENCE() },
    rounds:   { type: [RoundSchema], default: () => [...DEFAULT_PLAN_SHAPE.rounds] },
    quota: {
      perThirtyDays: { type: Number, default: 0 },
      cooldownHours: { type: Number, default: 0 },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

/** The read the resolver makes: every plan for a tenant, in the order it applies. */
InterviewPlanSchema.index({ tenantId: 1, priority: -1, createdAt: 1 });

export default mongoose.model<IInterviewPlan>('InterviewPlan', InterviewPlanSchema);
