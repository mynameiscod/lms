import mongoose, { Schema, Document } from 'mongoose';

/**
 * An AI-drafted assessment question, waiting for a person to look at it.
 *
 * WHY A SEPARATE COLLECTION AND NOT A FLAG ON `Question`.
 *
 * `Question` is the shared LMS quiz bank — thousands of rows, read by quizzes, the
 * assignment engine, the practice lab and CareerPilot alike. Adding a `reviewStatus` to it
 * would mean every one of those readers has to start filtering, and the day one of them is
 * missed an unreviewed question appears in a real quiz. Keeping drafts out of that
 * collection entirely means the failure cannot happen: nothing that has not been approved
 * is a Question at all.
 *
 * It also keeps the bank honest. A rejected draft leaves no trace in the bank to be found
 * later by a search and mistaken for content.
 *
 * WHAT MAKES THIS SAFE, BEYOND THE STATUS FIELD.
 *
 * A Question only reaches a CareerPilot paper when a SkillEvidence row maps it to a skill.
 * Approval creates BOTH — so an approved draft becomes a real, mapped question in one act,
 * and there is no window in which a question exists but is unreachable, or is reachable but
 * unreviewed. Rejection creates neither.
 *
 * PROVENANCE IS KEPT FOREVER. Which model wrote it, under which prompt version, who
 * approved it and when. When a question turns out to be wrong six months from now, the
 * question that matters is "what else did that batch produce", and that is only answerable
 * if the batch is recorded.
 */

export type DraftStatus = 'pending' | 'approved' | 'rejected';
export const DRAFT_STATUSES: DraftStatus[] = ['pending', 'approved', 'rejected'];

export interface IDraftOption {
  text: string;
  isCorrect: boolean;
}

export interface ISkillQuestionDraft extends Document {
  tenantId: string;

  /** The CareerSkill this was drafted to measure. Becomes the SkillEvidence mapping. */
  skillKey: string;
  difficulty: 'easy' | 'medium' | 'hard';

  question: string;
  options: IDraftOption[];
  explanation: string;
  /** Optional code the stem refers to. Carried through to the Question unchanged. */
  codeSnippet?: string;
  language?: string;

  /**
   * The misconception each wrong option is meant to catch.
   *
   * Asked for explicitly because it is the difference between a question that measures
   * something and one that is merely answerable. A distractor nobody would pick adds
   * length and no information, and "plausible-looking wrong answers" is exactly what a
   * language model is worst at unless it is made to justify each one.
   */
  distractorRationale?: string[];

  status: DraftStatus;

  /**
   * Batch provenance. Named `aiModel` and not `model` because Mongoose's Document already
   * has a `model()` method, and shadowing it makes the interface un-extendable.
   */
  aiModel?: string;
  promptVersion: number;
  batchId: string;
  generatedBy: string;
  generatedAt: Date;

  /** Review. */
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNote?: string;
  /** Set on approval — the Question this became. */
  approvedQuestionId?: string;

  /**
   * Automated checks that ran before a human saw it.
   *
   * Recorded rather than merely acted on: a reviewer deciding whether to trust a batch
   * wants to know what was already verified, and a warning is a place to look first
   * rather than a reason to discard.
   */
  warnings: string[];

  createdAt: Date;
  updatedAt: Date;
}

const DraftOptionSchema = new Schema<IDraftOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

const SkillQuestionDraftSchema = new Schema<ISkillQuestionDraft>(
  {
    tenantId:   { type: String, required: true, index: true },
    skillKey:   { type: String, required: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

    question:    { type: String, required: true },
    options:     { type: [DraftOptionSchema], default: [] },
    explanation: { type: String, default: '' },
    codeSnippet: { type: String },
    language:    { type: String },
    distractorRationale: [{ type: String }],

    status: { type: String, enum: DRAFT_STATUSES, default: 'pending', index: true },

    aiModel:       { type: String },
    promptVersion: { type: Number, default: 1 },
    batchId:       { type: String, required: true, index: true },
    generatedBy:   { type: String, required: true },
    generatedAt:   { type: Date, default: Date.now },

    reviewedBy:         { type: String },
    reviewedAt:         { type: Date },
    reviewNote:         { type: String },
    approvedQuestionId: { type: String },

    warnings: [{ type: String }],
  },
  { timestamps: true }
);

// The review queue is always "this tenant's pending drafts, newest batch first".
SkillQuestionDraftSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.model<ISkillQuestionDraft>('SkillQuestionDraft', SkillQuestionDraftSchema);
