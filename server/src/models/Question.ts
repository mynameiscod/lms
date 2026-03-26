import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionOption {
  _id?: string;
  text: string;
  isCorrect: boolean;
}

export interface IQuestion extends Document {
  _id: string;
  tenantId: string;
  createdBy: string;
  quizId?: string; // Optional - for backward compatibility with embedded questions
  questionNo?: number; // Optional - for embedded questions
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
  subject?: string; // Subject name (e.g. Java, Python, DBMS)
  topic?: string;   // Topic within the subject
  source: 'manual' | 'csv' | 'ai'; // Where the question came from
  usageCount: number; // How many quizzes use this question
  usedInQuizzes?: string[]; // References to quizzes using this question
  duplicateOf?: string; // If this is marked as duplicate, reference to original
  createdAt: Date;
  updatedAt: Date;
}

const questionOptionSchema = new Schema<IQuestionOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

const questionSchema = new Schema<IQuestion>(
  {
    tenantId: { type: String, required: true },
    createdBy: { type: String, required: true },
    quizId: { type: String }, // Optional - for backward compatibility
    questionNo: { type: Number }, // Optional - for embedded questions
    type: {
      type: String,
      enum: ['short_answer', 'mcq_single', 'mcq_multiple', 'coding'],
      required: true
    },
    question: { type: String, required: true },
    description: { type: String },
    options: [{ type: Schema.Types.Mixed }], // Support both strings (Question Bank) and embedded docs (Quiz questions)
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
    tags: [{ type: String }],
    subject: { type: String, trim: true },
    topic: { type: String, trim: true },
    source: {
      type: String,
      enum: ['manual', 'csv', 'ai'],
      default: 'manual'
    },
    usageCount: {
      type: Number,
      default: 0
    },
    usedInQuizzes: [{ type: String }],
    duplicateOf: { type: String }
  },
  { timestamps: true }
);

// Indexes for performance
questionSchema.index({ tenantId: 1, createdBy: 1 });
questionSchema.index({ tenantId: 1, tags: 1 });
questionSchema.index({ tenantId: 1, subject: 1, topic: 1 });
questionSchema.index({ question: 'text' }); // Full-text search

export default mongoose.model<IQuestion>('Question', questionSchema);
