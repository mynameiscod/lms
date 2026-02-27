import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionOption {
  _id?: string;
  text: string;
  isCorrect: boolean;
}

export interface IQuestion extends Document {
  _id: string;
  quizId: string;
  tenantId: string;
  questionNo: number;
  type: 'short_answer' | 'mcq_single' | 'mcq_multiple' | 'coding';
  question: string;
  description?: string;
  options?: IQuestionOption[];
  correctAnswers?: string[]; // For short answer and coding
  correctAnswerText?: string; // For short answer
  codingLanguages?: string[]; // For coding questions (e.g., ['javascript', 'python'])
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];
  marks: number;
  negativeMarks?: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  explanation?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const questionOptionSchema = new Schema<IQuestionOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

const questionSchema = new Schema<IQuestion>(
  {
    quizId: { type: String, required: true },
    tenantId: { type: String, required: true },
    questionNo: { type: Number, required: true },
    type: {
      type: String,
      enum: ['short_answer', 'mcq_single', 'mcq_multiple', 'coding'],
      required: true
    },
    question: { type: String, required: true },
    description: { type: String },
    options: [questionOptionSchema],
    correctAnswers: [{ type: String }],
    correctAnswerText: { type: String },
    codingLanguages: [{ type: String }],
    testCases: [
      {
        input: { type: String },
        expectedOutput: { type: String }
      }
    ],
    marks: { type: Number, required: true },
    negativeMarks: { type: Number },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    explanation: { type: String },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model<IQuestion>('Question', questionSchema);
