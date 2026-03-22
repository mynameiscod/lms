import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswerData {
  questionId: string;
  selectedOption?: string | number; // For MCQ
  answer?: string; // For short answer/coding
  markedForReview?: boolean;
  answered: boolean;
  timeSpent?: number; // seconds spent on this question
  isCorrect?: boolean;
  marksAwarded?: number;
  [key: string]: any;
}

export interface IQuizAttempt extends Document {
  _id: string;
  quizId: string;
  studentId: string;
  tenantId: string;
  attemptNo: number;
  startedAt: Date;
  submittedAt?: Date;
  abandonedAt?: Date;
  status: 'in_progress' | 'submitted' | 'abandoned' | 'grading';
  totalMarks: number;
  obtainedMarks?: number;
  percentage?: number;
  passed?: boolean;
  timeSpent: number; // in seconds
  questionsAnswered: number;
  tabSwitchCount: number;
  tabSwitchWarnings: number;
  isFullScreenMaintained: boolean;
  answers: IAnswerData[];
  shareToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    quizId: { type: String, required: true },
    studentId: { type: String, required: true },
    tenantId: { type: String, required: true },
    attemptNo: { type: Number, default: 1 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    abandonedAt: { type: Date },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'abandoned', 'grading'],
      default: 'in_progress'
    },
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number },
    percentage: { type: Number },
    passed: { type: Boolean },
    timeSpent: { type: Number, default: 0 }, // seconds
    questionsAnswered: { type: Number, default: 0 },
    tabSwitchCount: { type: Number, default: 0 },
    tabSwitchWarnings: { type: Number, default: 0 },
    isFullScreenMaintained: { type: Boolean, default: true },
    answers: [{ type: Schema.Types.Mixed }],
    shareToken: { type: String, sparse: true, index: true }
  },
  { timestamps: true }
);

export default mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);
