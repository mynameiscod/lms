import mongoose, { Schema, Document } from 'mongoose';

/**
 * A Problem Set — how Problem Bank problems reach learners.
 *
 * The set is the DELIVERY: which problems, in what order, for whom, when, worth how much. The
 * problems themselves stay in the bank and are referenced by id, so one problem can sit in a
 * batch's weekly set, a CareerPilot practice track and an exam at the same time without copies.
 *
 * Audience uses the same four target kinds as the Code Visualizer grants — a batch, a single
 * user, every LMS student, every CareerPilot member — so admins assign it the way they already
 * assign everything else.
 */
export type SetAudienceType = 'batch' | 'user' | 'all_lms' | 'all_careerpilot';
export const SET_AUDIENCE_TYPES: SetAudienceType[] = ['batch', 'user', 'all_lms', 'all_careerpilot'];

export interface IProblemSetItem {
  problemId: mongoose.Types.ObjectId;
  /** Marks for this problem in THIS set; falls back to the problem's own marks. */
  marks?: number;
}

export interface IProblemSet extends Document {
  tenantId: string;
  title: string;
  description: string;
  kind: 'assignment' | 'practice';
  items: IProblemSetItem[];
  audience: { type: SetAudienceType; id?: string; name: string }[];
  opensAt?: Date;
  dueAt?: Date;
  allowLate: boolean;
  status: 'draft' | 'published' | 'closed';
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// `type` is a field name here, so it needs its own schema (Mongoose reads `type` as the type key).
const AudienceSchema = new Schema({
  type: { $type: String, enum: SET_AUDIENCE_TYPES, required: true },
  id: { $type: String },
  name: { $type: String, default: '' },
} as any, { _id: false, typeKey: '$type' });

const ProblemSetSchema = new Schema<IProblemSet>({
  tenantId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '' },
  // 'assignment' is graded work with a due date; 'practice' is an open track (CareerPilot style).
  kind: { type: String, enum: ['assignment', 'practice'], default: 'assignment' },
  items: {
    type: [{ problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true }, marks: Number, _id: false }],
    default: [],
  },
  audience: { type: [AudienceSchema], default: [] },
  opensAt: Date,
  dueAt: Date,
  allowLate: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
  createdBy: String,
}, { timestamps: true });

ProblemSetSchema.index({ tenantId: 1, status: 1, 'audience.type': 1, 'audience.id': 1 });
ProblemSetSchema.index({ 'items.problemId': 1 });

export default mongoose.model<IProblemSet>('ProblemSet', ProblemSetSchema);
