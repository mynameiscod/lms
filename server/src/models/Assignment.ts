import mongoose, { Document, Schema, Types } from 'mongoose';

// Enums
export enum AssignmentType {
  CODING = 'coding',
  PROJECT = 'project',
  MCQ = 'mcq',
  THEORY = 'theory',
  SQL = 'sql',
  FILE_UPLOAD = 'file_upload',
  WEB = 'web'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert'
}

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum ProgrammingLanguage {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  JAVA = 'java',
  CPP = 'cpp',
  C = 'c',
  CSHARP = 'csharp',
  GO = 'go',
  RUST = 'rust',
  SQL = 'sql',
  HTML = 'html',
  CSS = 'css'
}

// Interfaces for embedded documents
export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
  description?: string;
  timeLimit?: number; // in ms
}

export interface IStarterCode {
  language: ProgrammingLanguage;
  code: string;
  solutionCode?: string; // For reference/auto-grading
}

export interface IRubricItem {
  criterion: string;
  description: string;
  maxPoints: number;
  order: number;
}

export interface IMCQOption {
  text: string;
  isCorrect: boolean;
}

export interface IMCQQuestion {
  question: string;
  options: IMCQOption[];
  explanation?: string;
  points: number;
}

// Main Assignment Interface
export interface IAssignment extends Document {
  _id: Types.ObjectId;
  tenant: Types.ObjectId;
  
  // Basic Info
  title: string;
  description: string;
  instructions: string;
  type: AssignmentType;
  
  // Classification
  difficulty: DifficultyLevel;
  topics: string[];
  tags: string[];
  
  // Points & Grading
  totalPoints: number;
  passingPoints: number;
  
  // Schedule
  status: AssignmentStatus;
  startDate?: Date;
  dueDate?: Date;
  lateSubmissionDeadline?: Date;
  lateSubmissionPenalty: number; // Percentage penalty
  
  // Assignment Scope
  course?: Types.ObjectId;
  subject?: Types.ObjectId;
  chapter?: Types.ObjectId;
  batch?: Types.ObjectId;
  
  // Coding Assignment Fields
  allowedLanguages: ProgrammingLanguage[];
  testCases: ITestCase[];
  starterCode: IStarterCode[];
  timeLimit: number; // Overall time limit in minutes
  memoryLimit: number; // in MB
  
  // MCQ Fields
  mcqQuestions: IMCQQuestion[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  
  // Theory/File Upload Fields
  rubric: IRubricItem[];
  maxFileSize: number; // in MB
  allowedFileTypes: string[];
  maxFiles: number;
  
  // Settings
  maxAttempts: number;
  showTestCaseResults: boolean;
  showExpectedOutput: boolean;
  showSyntaxErrors: boolean;
  enablePlagiarismCheck: boolean;
  enableHints: boolean;
  hints: string[];
  enableCamera: boolean;
  enableMicrophone: boolean;
  
  // Bank
  isInBank: boolean;
  bankCategory?: string;
  
  // Metadata
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Statistics (cached for performance)
  stats: {
    totalSubmissions: number;
    completedSubmissions: number;
    averageScore: number;
    highestScore: number;
    averageTimeSpent: number;
  };
}

// Schema
const TestCaseSchema = new Schema<ITestCase>({
  input: { type: String, default: '' },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  weight: { type: Number, default: 1 },
  description: { type: String },
  timeLimit: { type: Number, default: 5000 }
}, { _id: false });

const StarterCodeSchema = new Schema<IStarterCode>({
  language: { type: String, enum: Object.values(ProgrammingLanguage), required: true },
  code: { type: String, default: '' },
  solutionCode: { type: String }
}, { _id: false });

const RubricItemSchema = new Schema<IRubricItem>({
  criterion: { type: String, required: true },
  description: { type: String, default: '' },
  maxPoints: { type: Number, required: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const MCQOptionSchema = new Schema<IMCQOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

const MCQQuestionSchema = new Schema<IMCQQuestion>({
  question: { type: String, required: true },
  options: [MCQOptionSchema],
  explanation: { type: String },
  points: { type: Number, default: 1 }
}, { _id: false });

const AssignmentSchema = new Schema<IAssignment>({
  tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  
  // Basic Info
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  type: { type: String, enum: Object.values(AssignmentType), required: true },
  
  // Classification
  difficulty: { type: String, enum: Object.values(DifficultyLevel), default: DifficultyLevel.MEDIUM },
  topics: [{ type: String, trim: true }],
  tags: [{ type: String, trim: true }],
  
  // Points & Grading
  totalPoints: { type: Number, required: true, default: 100 },
  passingPoints: { type: Number, default: 40 },
  
  // Schedule
  status: { type: String, enum: Object.values(AssignmentStatus), default: AssignmentStatus.DRAFT },
  startDate: { type: Date },
  dueDate: { type: Date },
  lateSubmissionDeadline: { type: Date },
  lateSubmissionPenalty: { type: Number, default: 0 },
  
  // Assignment Scope
  course: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
  chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', index: true },
  batch: { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
  
  // Coding Assignment Fields
  allowedLanguages: [{ type: String, enum: Object.values(ProgrammingLanguage) }],
  testCases: [TestCaseSchema],
  starterCode: [StarterCodeSchema],
  timeLimit: { type: Number, default: 60 },
  memoryLimit: { type: Number, default: 256 },
  
  // MCQ Fields
  mcqQuestions: [MCQQuestionSchema],
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  
  // Theory/File Upload Fields
  rubric: [RubricItemSchema],
  maxFileSize: { type: Number, default: 10 },
  allowedFileTypes: [{ type: String }],
  maxFiles: { type: Number, default: 5 },
  
  // Settings
  maxAttempts: { type: Number, default: 3 },
  showTestCaseResults: { type: Boolean, default: true },
  showExpectedOutput: { type: Boolean, default: false },
  showSyntaxErrors: { type: Boolean, default: true },
  enablePlagiarismCheck: { type: Boolean, default: false },
  enableHints: { type: Boolean, default: false },
  hints: [{ type: String }],
  enableCamera: { type: Boolean, default: false },
  enableMicrophone: { type: Boolean, default: false },
  
  // Bank
  isInBank: { type: Boolean, default: false },
  bankCategory: { type: String },
  
  // Metadata
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Statistics
  stats: {
    totalSubmissions: { type: Number, default: 0 },
    completedSubmissions: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
AssignmentSchema.index({ tenant: 1, status: 1 });
AssignmentSchema.index({ tenant: 1, batch: 1, status: 1 });
AssignmentSchema.index({ tenant: 1, course: 1, status: 1 });
AssignmentSchema.index({ tenant: 1, type: 1, difficulty: 1 });
AssignmentSchema.index({ tenant: 1, isInBank: 1, bankCategory: 1 });
AssignmentSchema.index({ topics: 1 });
AssignmentSchema.index({ tags: 1 });

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
