import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewQuestion extends Document {
  chapterId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  question: string;
  answer: string;
  explanation?: string;
  
  difficulty: 'easy' | 'medium' | 'hard';
  category: string; // e.g., "conceptual", "coding", "scenario-based"
  
  // Company tags where this question was asked
  companyTags: string[];
  
  // Additional metadata
  tags: string[];
  order: number;
  
  // Statistics
  viewCount: number;
  helpfulCount: number;
  
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Track student's confidence on each question
export interface IStudentQuestionProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  status: 'not_reviewed' | 'reviewing' | 'understood' | 'confident';
  notes?: string; // Student's personal notes
  reviewedAt?: Date;
  markedConfidentAt?: Date;
  reviewCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const InterviewQuestionSchema: Schema = new Schema(
  {
    chapterId: {
      type: mongoose.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true
    },
    subjectId: {
      type: mongoose.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: true,
      trim: true
    },
    explanation: {
      type: String,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    category: {
      type: String,
      trim: true,
      default: 'conceptual'
    },
    companyTags: [{
      type: String,
      trim: true
    }],
    tags: [{
      type: String,
      trim: true
    }],
    order: {
      type: Number,
      default: 1
    },
    viewCount: {
      type: Number,
      default: 0
    },
    helpfulCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const StudentQuestionProgressSchema: Schema = new Schema(
  {
    studentId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    questionId: {
      type: mongoose.Types.ObjectId,
      ref: 'InterviewQuestion',
      required: true,
      index: true
    },
    chapterId: {
      type: mongoose.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['not_reviewed', 'reviewing', 'understood', 'confident'],
      default: 'not_reviewed'
    },
    notes: {
      type: String,
      trim: true
    },
    reviewedAt: {
      type: Date
    },
    markedConfidentAt: {
      type: Date
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
InterviewQuestionSchema.index({ chapterId: 1, tenantId: 1 });
InterviewQuestionSchema.index({ courseId: 1, tenantId: 1 });
InterviewQuestionSchema.index({ difficulty: 1, tenantId: 1 });
InterviewQuestionSchema.index({ companyTags: 1 });

StudentQuestionProgressSchema.index({ studentId: 1, chapterId: 1 });
StudentQuestionProgressSchema.index({ studentId: 1, questionId: 1 }, { unique: true });

export const InterviewQuestion = mongoose.model<IInterviewQuestion>('InterviewQuestion', InterviewQuestionSchema);
export const StudentQuestionProgress = mongoose.model<IStudentQuestionProgress>('StudentQuestionProgress', StudentQuestionProgressSchema);

export default InterviewQuestion;
