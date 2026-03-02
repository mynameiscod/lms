import mongoose, { Schema, Document } from 'mongoose';

export interface IQuiz extends Document {
  _id: string;
  title: string;
  description: string;
  tenantId: string;
  createdBy: string; // Instructor ID
  startDate: Date;
  endDate: Date;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  access: 'public' | 'private';
  accessibleTo: 'everyone' | 'batch_wise' | 'individual';
  selectedBatches?: string[]; // Batch IDs if batch_wise
  selectedStudents?: string[]; // Student IDs if individual
  questionIds?: string[]; // NEW: References to Question Bank questions
  totalQuestions: number;
  totalMarks: number;
  totalTime: number; // in minutes
  questionCount: number;
  passingMarks?: number;
  passPercentage?: number;
  negativeMarking: boolean;
  negativeMarkingValue?: number;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
  showScoreAfterSubmit: boolean;
  allowReview: boolean;
  multipleAttempts: boolean;
  maxAttempts?: number;
  canCopyPaste: boolean;
  requireFullScreen: boolean;
  tabSwitchWarnings: boolean;
  warningCount: number;
  warnings: number[];
  isActive: boolean;
  // Student-specific computed properties (optional)
  isAttempted?: boolean;
  attemptCount?: number;
  lastAttemptMarks?: number;
  lastAttemptPassed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String },
    tenantId: { type: String, required: true },
    createdBy: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    access: { type: String, enum: ['public', 'private'], default: 'public' },
    accessibleTo: {
      type: String,
      enum: ['everyone', 'batch_wise', 'individual'],
      default: 'everyone'
    },
    selectedBatches: [{ type: String }],
    selectedStudents: [{ type: String }],
    questionIds: [{ type: String }], // References to Question Bank questions
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true },
    totalTime: { type: Number, required: true }, // minutes
    questionCount: { type: Number, default: 0 },
    passingMarks: { type: Number },
    passPercentage: { type: Number },
    negativeMarking: { type: Boolean, default: false },
    negativeMarkingValue: { type: Number },
    shuffleQuestions: { type: Boolean, default: false },
    showAnswersAfterSubmit: { type: Boolean, default: true },
    showScoreAfterSubmit: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },
    multipleAttempts: { type: Boolean, default: false },
    maxAttempts: { type: Number },
    canCopyPaste: { type: Boolean, default: false },
    requireFullScreen: { type: Boolean, default: false },
    tabSwitchWarnings: { type: Boolean, default: true },
    warningCount: { type: Number, default: 0 },
    warnings: { type: [Number], default: [] }, // [50%, 75%, 90%] etc
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', quizSchema);
