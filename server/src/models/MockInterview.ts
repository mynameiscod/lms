import mongoose, { Schema, Document } from 'mongoose';

// Interview Response - Each question/answer pair
export interface IInterviewResponse {
  questionNumber: number;
  question: string;
  questionType: 'technical' | 'behavioral' | 'situational' | 'coding';
  expectedTopics: string[];
  
  // Student's Response
  answer: string;
  responseTime: number; // seconds taken to answer
  
  // AI Evaluation
  score: number; // 0-10
  feedback: string;
  strengths: string[];
  improvements: string[];
  keywordsCovered: string[];
  keywordsMissed: string[];
}

// Main Mock Interview Document
export interface IMockInterview extends Document {
  studentId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // Optional linking to course structure
  courseId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  
  // Assignment fields (Admin assigns to students)
  isAssigned: boolean;
  assignedBy?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  dueDate?: Date;
  assignmentNote?: string;
  assignmentPriority?: 'low' | 'medium' | 'high';
  
  // Recording fields
  recordingEnabled: boolean;
  recordingUrl?: string;
  recordingDuration?: number; // seconds
  recordingSize?: number; // bytes
  recordingType?: 'video' | 'audio';
  
  // Interview Configuration
  type: 'ai' | 'expert' | 'peer';
  category: 'technical' | 'hr' | 'behavioral' | 'aptitude' | 'company-specific' | 'mixed';
  subCategory?: string; // 'java', 'python', 'system-design', 'tcs-nqt'
  targetCompany?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
  timeLimit: number; // minutes
  
  // Session Details
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'expired';
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  actualDuration?: number; // minutes
  
  // For Expert/Peer interviews
  interviewerId?: mongoose.Types.ObjectId;
  meetingLink?: string;
  
  // Questions and Responses
  responses: IInterviewResponse[];
  currentQuestionIndex: number;
  
  // Overall Feedback
  overallScore?: number; // 0-100
  overallFeedback?: string;
  technicalScore?: number;
  communicationScore?: number;
  confidenceScore?: number;
  clarityScore?: number;
  
  // Strengths and Improvements
  topStrengths: string[];
  topImprovements: string[];
  recommendedTopics: string[];
  
  // Resume-based (future)
  resumeUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InterviewResponseSchema = new Schema<IInterviewResponse>({
  questionNumber: { type: Number, required: true },
  question: { type: String, required: true },
  questionType: { 
    type: String, 
    enum: ['technical', 'behavioral', 'situational', 'coding'],
    default: 'technical'
  },
  expectedTopics: [String],
  
  answer: { type: String, default: '' },
  responseTime: { type: Number, default: 0 },
  
  score: { type: Number, default: 0, min: 0, max: 10 },
  feedback: { type: String, default: '' },
  strengths: [String],
  improvements: [String],
  keywordsCovered: [String],
  keywordsMissed: [String]
}, { _id: false });

const MockInterviewSchema = new Schema<IMockInterview>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject'
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter'
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch'
    },
    
    // Assignment fields
    isAssigned: {
      type: Boolean,
      default: false
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    dueDate: Date,
    assignmentNote: String,
    assignmentPriority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    
    // Recording fields
    recordingEnabled: {
      type: Boolean,
      default: false
    },
    recordingUrl: String,
    recordingDuration: Number,
    recordingSize: Number,
    recordingType: {
      type: String,
      enum: ['video', 'audio']
    },
    
    type: {
      type: String,
      enum: ['ai', 'expert', 'peer'],
      default: 'ai'
    },
    category: {
      type: String,
      enum: ['technical', 'hr', 'behavioral', 'aptitude', 'company-specific', 'mixed'],
      default: 'technical'
    },
    subCategory: String,
    targetCompany: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    totalQuestions: {
      type: Number,
      default: 10,
      min: 5,
      max: 30
    },
    timeLimit: {
      type: Number,
      default: 30, // 30 minutes
      min: 10,
      max: 120
    },
    
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'expired'],
      default: 'scheduled'
    },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    actualDuration: Number,
    
    interviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    meetingLink: String,
    
    responses: [InterviewResponseSchema],
    currentQuestionIndex: {
      type: Number,
      default: 0
    },
    
    overallScore: { type: Number, min: 0, max: 100 },
    overallFeedback: String,
    technicalScore: { type: Number, min: 0, max: 100 },
    communicationScore: { type: Number, min: 0, max: 100 },
    confidenceScore: { type: Number, min: 0, max: 100 },
    clarityScore: { type: Number, min: 0, max: 100 },
    
    topStrengths: [String],
    topImprovements: [String],
    recommendedTopics: [String],
    
    resumeUrl: String
  },
  { timestamps: true }
);

// Indexes for efficient queries
MockInterviewSchema.index({ studentId: 1, tenantId: 1 });
MockInterviewSchema.index({ tenantId: 1, status: 1 });
MockInterviewSchema.index({ tenantId: 1, category: 1 });
MockInterviewSchema.index({ chapterId: 1 });
MockInterviewSchema.index({ batchId: 1 });
MockInterviewSchema.index({ isAssigned: 1, studentId: 1 });
MockInterviewSchema.index({ assignedBy: 1, tenantId: 1 });
MockInterviewSchema.index({ dueDate: 1, status: 1 });

export default mongoose.model<IMockInterview>('MockInterview', MockInterviewSchema);
