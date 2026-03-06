import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  
  // Overall course progress
  courseProgress: {
    completedSubjects: number;
    totalSubjects: number;
    completionPercentage: number;
    startedAt: Date;
    completedAt?: Date;
  };
  
  // Subject-level progress
  subjectProgress: Array<{
    subjectId: mongoose.Types.ObjectId;
    completedChapters: number;
    totalChapters: number;
    completionPercentage: number;
    isCompleted: boolean;
    startedAt?: Date;
    completedAt?: Date;
  }>;
  
  // Chapter-level progress (detailed tracking)
  chapterProgress: Array<{
    chapterId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    
    // Video progress
    videosWatched: Array<{
      videoIndex: number;
      watchedDuration: number; // seconds
      totalDuration: number;
      isCompleted: boolean;
      lastWatchedAt: Date;
    }>;
    
    // Notes progress
    notesRead: Array<{
      noteIndex: number;
      isRead: boolean;
      readAt?: Date;
    }>;
    
    // Quiz progress
    quizAttempted: boolean;
    quizScore?: number;
    quizPassed: boolean;
    quizAttemptId?: mongoose.Types.ObjectId;
    
    // Assignment progress
    assignmentsSubmitted: Array<{
      assignmentId: mongoose.Types.ObjectId;
      submissionId: mongoose.Types.ObjectId;
      status: 'pending' | 'submitted' | 'graded';
      score?: number;
    }>;
    
    // Overall chapter status
    completionPercentage: number;
    isUnlocked: boolean;
    isCompleted: boolean;
    startedAt?: Date;
    completedAt?: Date;
  }>;
  
  // Streaks and achievements
  currentStreak: number; // days
  longestStreak: number;
  lastActivityDate: Date;
  totalTimeSpent: number; // minutes
  
  createdAt: Date;
  updatedAt: Date;
}

const StudentProgressSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    batchId: {
      type: mongoose.Types.ObjectId,
      ref: 'Batch',
      required: false
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    courseProgress: {
      completedSubjects: { type: Number, default: 0 },
      totalSubjects: { type: Number, default: 0 },
      completionPercentage: { type: Number, default: 0 },
      startedAt: { type: Date, default: Date.now },
      completedAt: Date
    },
    subjectProgress: [{
      subjectId: { type: mongoose.Types.ObjectId, ref: 'Subject' },
      completedChapters: { type: Number, default: 0 },
      totalChapters: { type: Number, default: 0 },
      completionPercentage: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
      startedAt: Date,
      completedAt: Date
    }],
    chapterProgress: [{
      chapterId: { type: mongoose.Types.ObjectId, ref: 'Chapter' },
      subjectId: { type: mongoose.Types.ObjectId, ref: 'Subject' },
      videosWatched: [{
        videoIndex: Number,
        watchedDuration: { type: Number, default: 0 },
        totalDuration: { type: Number, default: 0 },
        isCompleted: { type: Boolean, default: false },
        lastWatchedAt: Date
      }],
      notesRead: [{
        noteIndex: Number,
        isRead: { type: Boolean, default: false },
        readAt: Date
      }],
      quizAttempted: { type: Boolean, default: false },
      quizScore: Number,
      quizPassed: { type: Boolean, default: false },
      quizAttemptId: { type: mongoose.Types.ObjectId, ref: 'QuizAttempt' },
      assignmentsSubmitted: [{
        assignmentId: { type: mongoose.Types.ObjectId, ref: 'Assignment' },
        submissionId: { type: mongoose.Types.ObjectId, ref: 'Submission' },
        status: { type: String, enum: ['pending', 'submitted', 'graded'], default: 'pending' },
        score: Number
      }],
      completionPercentage: { type: Number, default: 0 },
      isUnlocked: { type: Boolean, default: false },
      isCompleted: { type: Boolean, default: false },
      startedAt: Date,
      completedAt: Date
    }],
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: Date.now },
    totalTimeSpent: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes for faster queries
StudentProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
StudentProgressSchema.index({ userId: 1, batchId: 1 });
StudentProgressSchema.index({ tenantId: 1, courseId: 1 });
StudentProgressSchema.index({ batchId: 1 });

export default mongoose.model<IStudentProgress>('StudentProgress', StudentProgressSchema);
