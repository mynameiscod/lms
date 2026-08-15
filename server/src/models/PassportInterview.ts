import mongoose, { Document, Schema } from 'mongoose';

/**
 * PassportInterview — one AI mock-interview session for a Passport member.
 *
 * Deliberately separate from the LMS InterviewAttempt/InterviewTemplate stack: a
 * Passport member has no batch, no template and no scheduled slot. The AI brain is
 * shared (interviewAIService.nextInterviewerTurn + evaluateTranscript); only the
 * session record is Passport-owned.
 */

export interface IPassportTurn {
  role: 'interviewer' | 'candidate';
  text: string;
  at: Date;
}

export interface IPassportInterviewEval {
  overallScore: number;                 // 0–100
  readinessLevel: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedPracticeAreas: string[];
  areaScores: { title: string; percentage: number; feedback: string }[];
  questionFeedback?: { question: string; verdict: string; whatWorked: string; whatToFix: string; betterAnswer: string }[];
}

/**
 * A canonical skill this sitting was built to probe.
 *
 * Present only on role interviews, whose areas are chosen from the student's role
 * blueprint (Module 8). Legacy pathway interviews cover free-text topics like "Learning
 * mindset" that correspond to no canonical skill, and they carry none of these — which is
 * why they can never produce skill evidence. Recorded at START, so the mapping from a
 * graded area back to a skill cannot be invented after the fact.
 */
export interface IInterviewSkillTarget {
  skillKey: string;
  skillName: string;
}

export interface IPassportInterview extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  role: string;                          // target role the interview is for
  areas: string[];                       // topic areas covered
  skillTargets: IInterviewSkillTarget[]; // canonical skills behind those areas, role mode only
  /** Whether evidence has already been written for this sitting. */
  evidenceProjectedAt?: Date | null;
  interviewerName: string;
  companySlug?: string;
  companyName?: string;
  maxQuestions: number;
  askedCount: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  transcript: IPassportTurn[];
  evaluation?: IPassportInterviewEval | null;
  xpAwarded: number;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TurnSchema = new Schema<IPassportTurn>({
  role: { type: String, enum: ['interviewer', 'candidate'], required: true },
  text: { type: String, default: '' },
  at:   { type: Date, default: Date.now },
}, { _id: false });

const EvalSchema = new Schema<IPassportInterviewEval>({
  overallScore:   { type: Number, default: 0 },
  readinessLevel: { type: String, default: 'needs_improvement' },
  summary:        { type: String, default: '' },
  strengths:      [{ type: String }],
  improvements:   [{ type: String }],
  recommendedPracticeAreas: [{ type: String }],
  areaScores: [{ title: String, percentage: Number, feedback: String }],
  // Per-question coaching. Area scores tell a member WHERE they are weak; this tells them
  // what to have said instead, which is the only part they can act on before the real
  // interview. Kept on the session so it is still there months later.
  questionFeedback: [{
    question: String, verdict: String, whatWorked: String, whatToFix: String, betterAnswer: String,
  }],
}, { _id: false });

const PassportInterviewSchema = new Schema<IPassportInterview>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role:            { type: String, default: 'Software Engineer' },
    areas:           [{ type: String }],
    skillTargets:    [new Schema<IInterviewSkillTarget>({
      skillKey:  { type: String, required: true },
      skillName: { type: String, default: '' },
    }, { _id: false })],
    evidenceProjectedAt: { type: Date, default: null },
    interviewerName: { type: String, default: 'Siva' },
    // Set when the mock was started from a company page, so follow-up turns and the
    // history list can both stay company-aware.
    companySlug: { type: String, index: true },
    companyName: { type: String },
    maxQuestions:    { type: Number, default: 6 },
    askedCount:      { type: Number, default: 0 },
    status:     { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress', index: true },
    transcript: [TurnSchema],
    evaluation: { type: EvalSchema, default: null },
    xpAwarded:  { type: Number, default: 0 },
    startedAt:   { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

PassportInterviewSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });

export default mongoose.model<IPassportInterview>('PassportInterview', PassportInterviewSchema);
