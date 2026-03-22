import mongoose, { Document, Schema, Types } from 'mongoose';
import { ProgrammingLanguage } from './Assignment';

// Enums
export enum SubmissionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADING = 'grading',
  GRADED = 'graded',
  LATE = 'late'
}

// Interfaces
export interface ITestCaseResult {
  testCaseIndex: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number; // in ms
  memoryUsed: number; // in MB
  error?: string;
  isHidden: boolean;
}

export interface IMCQAnswer {
  questionIndex: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface IRubricScore {
  criterionIndex: number;
  criterion: string;
  maxPoints: number;
  pointsAwarded: number;
  feedback?: string;
}

export interface IUploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export interface ICodeSnapshot {
  code: string;
  language: ProgrammingLanguage;
  timestamp: Date;
}

// Main Submission Interface
export interface ISubmission extends Document {
  _id: Types.ObjectId;
  tenant: Types.ObjectId;
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  
  // Attempt Info
  attemptNumber: number;
  status: SubmissionStatus;
  
  // Timing
  startedAt?: Date;
  submittedAt?: Date;
  timeSpent: number; // in seconds
  
  // Coding Submission
  language?: ProgrammingLanguage;
  code?: string;
  codeSnapshots: ICodeSnapshot[]; // For code playback feature
  testCaseResults: ITestCaseResult[];
  compilationError?: string;
  runtimeError?: string;
  
  // MCQ Submission
  mcqAnswers: IMCQAnswer[];
  
  // Theory/File Submission
  theoryAnswer?: string;
  uploadedFiles: IUploadedFile[];
  
  // Scoring
  autoScore: number;
  manualScore: number;
  totalScore: number;
  penaltyApplied: number;
  finalScore: number;
  percentage: number;
  isPassing: boolean;
  
  // Grading
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  rubricScores: IRubricScore[];
  overallFeedback?: string;
  privateFeedback?: string; // For instructor notes
  
  // Plagiarism
  plagiarismScore?: number;
  plagiarismReport?: string;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  shareToken?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const TestCaseResultSchema = new Schema<ITestCaseResult>({
  testCaseIndex: { type: Number, required: true },
  passed: { type: Boolean, default: false },
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  actualOutput: { type: String, default: '' },
  executionTime: { type: Number, default: 0 },
  memoryUsed: { type: Number, default: 0 },
  error: { type: String },
  isHidden: { type: Boolean, default: false }
}, { _id: false });

const MCQAnswerSchema = new Schema<IMCQAnswer>({
  questionIndex: { type: Number, required: true },
  selectedOptionIndex: { type: Number, default: -1 },
  isCorrect: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 }
}, { _id: false });

const RubricScoreSchema = new Schema<IRubricScore>({
  criterionIndex: { type: Number, required: true },
  criterion: { type: String, required: true },
  maxPoints: { type: Number, required: true },
  pointsAwarded: { type: Number, default: 0 },
  feedback: { type: String }
}, { _id: false });

const UploadedFileSchema = new Schema<IUploadedFile>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const CodeSnapshotSchema = new Schema<ICodeSnapshot>({
  code: { type: String, required: true },
  language: { type: String, enum: Object.values(ProgrammingLanguage), required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const SubmissionSchema = new Schema<ISubmission>({
  tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  
  // Attempt Info
  attemptNumber: { type: Number, default: 1 },
  status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.NOT_STARTED },
  
  // Timing
  startedAt: { type: Date },
  submittedAt: { type: Date },
  timeSpent: { type: Number, default: 0 },
  
  // Coding Submission
  language: { type: String, enum: Object.values(ProgrammingLanguage) },
  code: { type: String },
  codeSnapshots: [CodeSnapshotSchema],
  testCaseResults: [TestCaseResultSchema],
  compilationError: { type: String },
  runtimeError: { type: String },
  
  // MCQ Submission
  mcqAnswers: [MCQAnswerSchema],
  
  // Theory/File Submission
  theoryAnswer: { type: String },
  uploadedFiles: [UploadedFileSchema],
  
  // Scoring
  autoScore: { type: Number, default: 0 },
  manualScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  penaltyApplied: { type: Number, default: 0 },
  finalScore: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  isPassing: { type: Boolean, default: false },
  
  // Grading
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  gradedAt: { type: Date },
  rubricScores: [RubricScoreSchema],
  overallFeedback: { type: String },
  privateFeedback: { type: String },
  
  // Plagiarism
  plagiarismScore: { type: Number },
  plagiarismReport: { type: String },
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  shareToken: { type: String, sparse: true, index: true }
}, {
  timestamps: true
});

// Compound Indexes
SubmissionSchema.index({ tenant: 1, assignment: 1, student: 1, attemptNumber: 1 }, { unique: true });
SubmissionSchema.index({ tenant: 1, student: 1, status: 1 });
SubmissionSchema.index({ tenant: 1, assignment: 1, status: 1 });
SubmissionSchema.index({ assignment: 1, submittedAt: -1 });

// Pre-save middleware to calculate scores
SubmissionSchema.pre('save', function(next) {
  // Calculate total score
  this.totalScore = this.autoScore + this.manualScore;
  
  // Apply penalty
  this.finalScore = Math.max(0, this.totalScore - this.penaltyApplied);
  
  next();
});

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
