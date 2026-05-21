import mongoose, { Schema, Document } from 'mongoose';

export interface IQuiz extends Document {
  _id: string;
  title: string;
  description: string;
  instructions?: string; // Instructions shown before quiz starts
  tenantId: string;
  createdBy: string; // Instructor ID
  courseId?: mongoose.Types.ObjectId; // Optional course reference
  subjectId?: mongoose.Types.ObjectId; // Optional subject reference
  chapterId?: mongoose.Types.ObjectId; // Optional chapter reference
  topicId?: mongoose.Types.ObjectId;   // Optional topic reference (for mastery tracking)
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
  enableCamera: boolean;
  enableMicrophone: boolean;
  warningCount: number;
  warnings: number[];
  isActive: boolean;
  isExternalQuiz?: boolean; // If true, hidden from internal student dashboard (token-access only)
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
    instructions: { type: String }, // Instructions shown before quiz starts
    tenantId: { type: String, required: true },
    createdBy: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    topicId:   { type: Schema.Types.ObjectId, ref: 'Topic' },
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
    enableCamera: { type: Boolean, default: false },
    enableMicrophone: { type: Boolean, default: false },
    warningCount: { type: Number, default: 0 },
    warnings: { type: [Number], default: [] }, // [50%, 75%, 90%] etc
    isActive: { type: Boolean, default: true },
    isExternalQuiz: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', quizSchema);
