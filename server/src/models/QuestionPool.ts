import mongoose, { Schema, Document } from 'mongoose';

/**
 * A Question Pool — a hand-picked, reusable shortlist of bank questions that an exam draws from.
 *
 * ── A POOL HOLDS LINKS, NEVER COPIES ────────────────────────────────────────────────────────
 * The questions stay where they are written: coding problems in the Problem Bank (CodingProblem),
 * MCQs in the Question Bank (Question). A pool only records which of them may be drawn. Fixing a
 * question in its bank fixes it in every pool and every exam that uses it, and one question can
 * sit in several pools at once.
 *
 * ── ONE KIND PER POOL ───────────────────────────────────────────────────────────────────────
 * A pool is all coding or all MCQ. An exam section says "N from this pool", and a section that
 * could draw either a ten-mark program or a one-mark MCQ would give students papers of different
 * weight from the same rule.
 *
 * Whether a linked question can still be drawn (published, has tests, has a marked answer) is
 * worked out when the pool is read, not stored here, because the bank can change underneath it.
 */
export type PoolKind = 'coding' | 'mcq';
export const POOL_KINDS: PoolKind[] = ['coding', 'mcq'];

export interface IQuestionPoolItem {
  /** CodingProblem._id for a coding pool, Question._id for an MCQ pool. */
  refId: mongoose.Types.ObjectId;
  addedAt: Date;
  addedBy?: string;
  /**
   * Written by this pool's own file import, not picked from a bank. Such a question belongs to the
   * pool: deleting the pool, or removing it, deletes it too when nothing else uses it. Items from
   * before this flag are recognised by being created at the moment they were added.
   */
  imported?: boolean;
}

export interface IQuestionPool extends Document {
  tenantId: string;
  name: string;
  description: string;
  kind: PoolKind;
  items: IQuestionPoolItem[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionPoolSchema = new Schema<IQuestionPool>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  kind: { type: String, enum: POOL_KINDS, required: true },
  items: {
    type: [{
      refId: { type: Schema.Types.ObjectId, required: true },
      addedAt: { type: Date, default: Date.now },
      addedBy: String,
      imported: Boolean,
      _id: false,
    }],
    default: [],
  },
  createdBy: String,
}, { timestamps: true });

/** Two pools with one name in one institute would be indistinguishable in the exam's pool picker. */
QuestionPoolSchema.index({ tenantId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model<IQuestionPool>('QuestionPool', QuestionPoolSchema);
