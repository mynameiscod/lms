import mongoose, { Schema, Document } from 'mongoose';

// One student's attempt at one Logical Thinking Lab problem on a given day. Enforces the
// "think before you code" gate: the editor is only unlocked once `approachWordCount` >= 30.
export interface IAiRubric {
  logicalThinking?: number; problemUnderstanding?: number; approach?: number; optimization?: number;
  edgeCases?: number; codingStyle?: number; naming?: number; communication?: number; confidence?: number; overall?: number;
  timeComplexity?: string; spaceComplexity?: string;
  strengths?: string[]; weaknesses?: string[];
  improvedSolution?: string; alternativeSolution?: string; commonMistakes?: string[]; relatedQuestions?: string[];
  summary?: string;
}

export interface IDailyChallenge extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  batchId?: mongoose.Types.ObjectId;
  date: string;                // 'YYYY-MM-DD' (IST) — the challenge day
  seq: number;                 // 1st, 2nd… challenge that day (Next Challenge)
  problemId: mongoose.Types.ObjectId;
  difficulty: string;
  status: 'assigned' | 'thinking_done' | 'in_progress' | 'submitted' | 'solved';
  approach?: string;           // thinking notes (the gate)
  approachWordCount: number;
  editorUnlocked: boolean;
  code?: string;
  language: string;
  attempts: number;
  hintsUsed: number;
  timeSpentSec: number;
  passed: boolean;
  score?: number;
  xpEarned: number;
  aiFeedback?: IAiRubric;
  startedAt: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyChallengeSchema = new Schema<IDailyChallenge>(
  {
    tenantId:   { type: String, required: true, index: true },
    studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName:{ type: String },
    batchId:    { type: Schema.Types.ObjectId, ref: 'Batch' },
    date:       { type: String, required: true },
    seq:        { type: Number, default: 1 },
    problemId:  { type: Schema.Types.ObjectId, ref: 'ThinkingProblem', required: true },
    difficulty: { type: String, default: 'easy' },
    status:     { type: String, enum: ['assigned', 'thinking_done', 'in_progress', 'submitted', 'solved'], default: 'assigned' },
    approach:   { type: String },
    approachWordCount: { type: Number, default: 0 },
    editorUnlocked: { type: Boolean, default: false },
    code:       { type: String },
    language:   { type: String, default: 'javascript' },
    attempts:   { type: Number, default: 0 },
    hintsUsed:  { type: Number, default: 0 },
    timeSpentSec: { type: Number, default: 0 },
    passed:     { type: Boolean, default: false },
    score:      { type: Number },
    xpEarned:   { type: Number, default: 0 },
    aiFeedback: { type: Schema.Types.Mixed },
    startedAt:  { type: Date, default: Date.now },
    submittedAt:{ type: Date },
  },
  { timestamps: true }
);
DailyChallengeSchema.index({ tenantId: 1, studentId: 1, date: 1, seq: 1 });
DailyChallengeSchema.index({ tenantId: 1, studentId: 1, status: 1 });

export default mongoose.model<IDailyChallenge>('DailyChallenge', DailyChallengeSchema);
