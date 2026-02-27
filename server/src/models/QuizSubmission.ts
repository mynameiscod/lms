import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizSubmission extends Document {
  _id: string;
  quizAttemptId: string;
  quizId: string;
  questionId: string;
  studentId: string;
  tenantId: string;
  questionNo: number;
  questionType: 'short_answer' | 'mcq_single' | 'mcq_multiple' | 'coding';
  studentAnswer: string | string[]; // Can be text for short answer/coding or array for MCQ
  selectedOptions?: string[]; // For MCQ questions
  codingSubmission?: {
    language: string;
    code: string;
    output?: string;
    testCasesPassed?: number;
    totalTestCases?: number;
  };
  isCorrect?: boolean;
  marksAwarded?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const codingSubmissionSchema = new Schema({
  language: { type: String },
  code: { type: String },
  output: { type: String },
  testCasesPassed: { type: Number },
  totalTestCases: { type: Number }
});

const quizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    quizAttemptId: { type: String, required: true },
    quizId: { type: String, required: true },
    questionId: { type: String, required: true },
    studentId: { type: String, required: true },
    tenantId: { type: String, required: true },
    questionNo: { type: Number, required: true },
    questionType: {
      type: String,
      enum: ['short_answer', 'mcq_single', 'mcq_multiple', 'coding'],
      required: true
    },
    studentAnswer: { type: Schema.Types.Mixed },
    selectedOptions: [{ type: String }],
    codingSubmission: codingSubmissionSchema,
    isCorrect: { type: Boolean },
    marksAwarded: { type: Number },
    feedback: { type: String },
    gradedAt: { type: Date },
    gradedBy: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IQuizSubmission>('QuizSubmission', quizSubmissionSchema);
