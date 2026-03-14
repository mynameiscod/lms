import mongoose, { Schema, Document } from 'mongoose';

export interface IChapter extends Document {
  subjectId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId; // Denormalized for easier queries
  title: string;
  description: string;
  order: number; // Sequence within the subject
  
  // Content items (references)
  videos: Array<{
    title: string;
    url: string;
    duration: number; // in minutes
    order: number;
    isRequired: boolean;
  }>;
  
  notes: Array<{
    title: string;
    content: string;
    attachmentUrl?: string;
    order: number;
  }>;
  
  // References to other collections
  quizId?: mongoose.Types.ObjectId;
  assignmentIds: mongoose.Types.ObjectId[];
  
  // Unlock settings
  unlockSettings: {
    type: 'always' | 'sequential' | 'date' | 'manual';
    unlockAfterChapterId?: mongoose.Types.ObjectId;
    unlockDate?: Date;
    requiredCompletionPercentage?: number; // % of previous chapter to complete
  };
  
  // Completion criteria
  completionCriteria: {
    watchAllVideos: boolean;
    readAllNotes: boolean;
    passQuiz: boolean;
    minimumQuizScore?: number;
    submitAssignments: boolean;
  };
  
  estimatedDuration: {
    months: number;
    weeks: number;
    days: number;
    hours: number;
    minutes: number;
  };
  isPublished: boolean;
  isActive: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema: Schema = new Schema(
  {
    subjectId: {
      type: mongoose.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: true,
      default: 1
    },
    videos: [{
      title: { type: String, required: true, trim: true },
      url: { type: String, required: true },
      duration: { type: Number, default: 0 },
      order: { type: Number, default: 1 },
      isRequired: { type: Boolean, default: true }
    }],
    notes: [{
      title: { type: String, required: true, trim: true },
      content: { type: String, required: true },
      attachmentUrl: { type: String },
      order: { type: Number, default: 1 }
    }],
    quizId: {
      type: mongoose.Types.ObjectId,
      ref: 'Quiz'
    },
    assignmentIds: [{
      type: mongoose.Types.ObjectId,
      ref: 'Assignment'
    }],
    unlockSettings: {
      type: {
        type: String,
        enum: ['always', 'sequential', 'date', 'manual'],
        default: 'sequential'
      },
      unlockAfterChapterId: {
        type: mongoose.Types.ObjectId,
        ref: 'Chapter'
      },
      unlockDate: Date,
      requiredCompletionPercentage: {
        type: Number,
        default: 80,
        min: 0,
        max: 100
      }
    },
    completionCriteria: {
      watchAllVideos: { type: Boolean, default: true },
      readAllNotes: { type: Boolean, default: false },
      passQuiz: { type: Boolean, default: true },
      minimumQuizScore: { type: Number, default: 60 },
      submitAssignments: { type: Boolean, default: false }
    },
    estimatedDuration: {
      months: { type: Number, default: 0 },
      weeks: { type: Number, default: 0 },
      days: { type: Number, default: 0 },
      hours: { type: Number, default: 0 },
      minutes: { type: Number, default: 0 }
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for faster queries
ChapterSchema.index({ subjectId: 1, order: 1 });
ChapterSchema.index({ courseId: 1, order: 1 });
ChapterSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
