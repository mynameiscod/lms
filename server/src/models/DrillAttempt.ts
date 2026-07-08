import mongoose, { Schema, Document } from 'mongoose';

export interface IDrillTestCase { input: string; expectedOutput: string; hidden: boolean; }

// One problem-solving drill: the generated micro-problem + the student's plan-first,
// hint-coached attempt. Test cases stay server-side (never sent to the client).
export interface IDrillAttempt extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  batchId?: mongoose.Types.ObjectId;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  prompt: string;
  starterCode: string;
  examples: { input: string; expectedOutput: string }[];
  testCases: IDrillTestCase[];
  plan?: string;
  planOk?: boolean;
  code?: string;
  attempts: number;
  hintsUsed: number;
  passed: boolean;
  score: number;
  status: 'in_progress' | 'solved' | 'given_up';
  solvedAt?: Date;
  assignmentId?: mongoose.Types.ObjectId; // set when this attempt fulfils an admin-assigned problem
  createdAt: Date;
  updatedAt: Date;
}

const DrillAttemptSchema = new Schema<IDrillAttempt>(
  {
    tenantId:    { type: String, required: true, index: true },
    studentId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String },
    batchId:     { type: Schema.Types.ObjectId, ref: 'Batch' },
    concept:     { type: String, required: true },
    difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    language:    { type: String, default: 'javascript' },
    prompt:      { type: String, required: true },
    starterCode: { type: String, default: '' },
    examples:    { type: [{ input: String, expectedOutput: String, _id: false }], default: [] },
    testCases:   { type: [{ input: String, expectedOutput: String, hidden: Boolean, _id: false }], default: [] },
    plan:        { type: String },
    planOk:      { type: Boolean },
    code:        { type: String },
    attempts:    { type: Number, default: 0 },
    hintsUsed:   { type: Number, default: 0 },
    passed:      { type: Boolean, default: false },
    score:       { type: Number, default: 0 },
    status:      { type: String, enum: ['in_progress', 'solved', 'given_up'], default: 'in_progress' },
    solvedAt:    { type: Date },
    assignmentId:{ type: Schema.Types.ObjectId, ref: 'DrillAssignment' },
  },
  { timestamps: true }
);
DrillAttemptSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });
DrillAttemptSchema.index({ tenantId: 1, status: 1, concept: 1 });

export default mongoose.model<IDrillAttempt>('DrillAttempt', DrillAttemptSchema);
