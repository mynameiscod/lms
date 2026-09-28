import mongoose, { Schema, Document } from 'mongoose';

/**
 * Every submission to a Problem Bank problem, from every product, in one collection.
 *
 * Today each module keeps its own attempt log (Submission, DrillAttempt, ProblemAttempt,
 * hackathon attempt answers…), so "how has this student done on dynamic programming" cannot be
 * asked in one place. `context` says where a submission came from; the problem, the verdict and
 * the score mean the same thing whichever product produced them.
 *
 * Per-case results are stored WITHOUT inputs or outputs: the verdict, time and weight are enough
 * to show a learner their history, and hidden test data never needs to be kept per attempt.
 */
export type SubmissionProduct = 'lms' | 'careerpilot' | 'exam' | 'practice' | 'api';

export interface IProblemSubmission extends Document {
  tenantId: string;
  userId: string;
  problemId: mongoose.Types.ObjectId;
  problemVersion: number;
  context: { product: SubmissionProduct; setId?: string; refType?: string; refId?: string };
  language: string;
  code: string;
  verdict: string;
  passed: number;
  total: number;
  score: number;
  maxScore: number;
  timeMs: number;
  late: boolean;
  cases: { verdict: string; timeMs: number; weight: number; isSample: boolean }[];
  compileError?: string;
  createdAt: Date;
}

const ProblemSubmissionSchema = new Schema<IProblemSubmission>({
  tenantId: { type: String, required: true },
  userId: { type: String, required: true },
  problemId: { type: Schema.Types.ObjectId, ref: 'CodingProblem', required: true },
  problemVersion: { type: Number, default: 1 },
  context: {
    product: { type: String, enum: ['lms', 'careerpilot', 'exam', 'practice', 'api'], required: true },
    setId: String,
    refType: String,
    refId: String,
  },
  language: { type: String, required: true },
  code: { type: String, default: '' },
  verdict: { type: String, required: true },
  passed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  timeMs: { type: Number, default: 0 },
  late: { type: Boolean, default: false },
  cases: { type: [{ verdict: String, timeMs: Number, weight: Number, isSample: Boolean, _id: false }], default: [] },
  compileError: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

ProblemSubmissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });
ProblemSubmissionSchema.index({ tenantId: 1, 'context.setId': 1, userId: 1 });
ProblemSubmissionSchema.index({ problemId: 1, verdict: 1 });

export default mongoose.model<IProblemSubmission>('ProblemSubmission', ProblemSubmissionSchema);
