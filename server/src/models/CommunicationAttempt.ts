import mongoose, { Schema, Document } from 'mongoose';

export type AttemptStatus =
  | 'uploading'
  | 'transcribing'
  | 'evaluating'
  | 'completed'
  | 'failed';

// Embedded AI evaluation (the strict-schema result). Kept on the attempt to avoid a second
// round-trip; scores are 0-100. Visual metrics are null unless real frame analysis ran.
export interface IEvaluation {
  overallScore: number;
  confidenceScore: number;
  clarityScore: number;
  fluencyScore: number;
  grammarScore: number;
  vocabularyScore: number;
  contentScore: number;
  structureScore: number;
  technicalScore: number;
  projectExplanationScore: number;
  strengthExplanationScore: number;
  careerGoalScore: number;
  greetingScore: number;
  closingScore: number;
  // Visual (video) — null = Not Evaluated (no frame analysis available)
  eyeContactScore: number | null;
  facialExpressionScore: number | null;
  postureScore: number | null;

  speakingSpeed: { wordsPerMinute: number; status: string; recommendedRange: string };
  fillerWords: { total: number; words: Record<string, number> };
  repeatedPhrases: string[];

  strengths: string[];
  areasToImprove: string[];
  missingSections: string[];
  grammarCorrections: { original: string; improved: string }[];
  sentenceImprovements: { original: string; improved: string }[];
  improvedIntroduction: string;
  dailyCoachMessage: string;
  nextPracticeFocus: string;
  readinessLevel: string;

  aiProvider?: string;
  aiModel?: string;
  evaluatedAt?: Date;
}

export interface ICommunicationAttempt extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;

  challengeTitle: string;
  challengeType: string;
  practiceDate: string;          // YYYY-MM-DD in the student's timezone (the "day" this counts for)
  attemptNumber: number;

  recordingType: 'audio' | 'video';
  recordingKey?: string;         // Bunny storage key (never returned to the browser directly)
  recordingName?: string;
  sizeBytes?: number;
  recordingDuration: number;     // seconds

  transcript?: string;
  detectedLanguage?: string;
  wordCount?: number;
  wordsPerMinute?: number;

  status: AttemptStatus;
  failureReason?: string;
  evaluation?: IEvaluation;

  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    overallScore: Number, confidenceScore: Number, clarityScore: Number, fluencyScore: Number,
    grammarScore: Number, vocabularyScore: Number, contentScore: Number, structureScore: Number,
    technicalScore: Number, projectExplanationScore: Number, strengthExplanationScore: Number,
    careerGoalScore: Number, greetingScore: Number, closingScore: Number,
    eyeContactScore: { type: Number, default: null },
    facialExpressionScore: { type: Number, default: null },
    postureScore: { type: Number, default: null },
    speakingSpeed: { wordsPerMinute: Number, status: String, recommendedRange: String },
    fillerWords: { total: Number, words: { type: Map, of: Number } },
    repeatedPhrases: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    areasToImprove: { type: [String], default: [] },
    missingSections: { type: [String], default: [] },
    grammarCorrections: { type: [{ original: String, improved: String, _id: false }], default: [] },
    sentenceImprovements: { type: [{ original: String, improved: String, _id: false }], default: [] },
    improvedIntroduction: { type: String, default: '' },
    dailyCoachMessage: { type: String, default: '' },
    nextPracticeFocus: { type: String, default: '' },
    readinessLevel: { type: String, default: '' },
    aiProvider: String,
    aiModel: String,
    evaluatedAt: Date,
  },
  { _id: false }
);

const CommunicationAttemptSchema = new Schema<ICommunicationAttempt>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    challengeId: { type: Schema.Types.ObjectId, ref: 'CommunicationChallenge', required: true },

    challengeTitle: { type: String, trim: true },
    challengeType: { type: String, default: 'self_introduction' },
    practiceDate: { type: String, required: true, index: true },
    attemptNumber: { type: Number, default: 1 },

    recordingType: { type: String, enum: ['audio', 'video'], default: 'video' },
    recordingKey: { type: String },
    recordingName: { type: String },
    sizeBytes: { type: Number },
    recordingDuration: { type: Number, default: 0 },

    transcript: { type: String },
    detectedLanguage: { type: String, default: 'en' },
    wordCount: { type: Number },
    wordsPerMinute: { type: Number },

    status: { type: String, enum: ['uploading', 'transcribing', 'evaluating', 'completed', 'failed'], default: 'uploading', index: true },
    failureReason: { type: String },
    evaluation: { type: EvaluationSchema, default: undefined },

    submittedAt: { type: Date },
  },
  { timestamps: true }
);

CommunicationAttemptSchema.index({ tenantId: 1, studentId: 1, practiceDate: -1 });
CommunicationAttemptSchema.index({ tenantId: 1, studentId: 1, challengeId: 1, practiceDate: 1 });
CommunicationAttemptSchema.index({ tenantId: 1, batchId: 1, practiceDate: -1 });

export default mongoose.model<ICommunicationAttempt>('CommunicationAttempt', CommunicationAttemptSchema);
