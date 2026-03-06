import mongoose, { Schema, Document } from 'mongoose';

export interface IContent extends Document {
  type: 'announcement' | 'note' | 'assignment' | 'cheatsheet' | 'snippet';
  title: string;
  description: string;
  content: string;
  
  author: {
    userId: Schema.Types.ObjectId;
    name: string;
    role: string;
  };
  
  course: {
    courseId: Schema.Types.ObjectId;
    courseName: string;
  };
  
  // Chapter-level association (optional)
  subjectId?: Schema.Types.ObjectId;
  chapterId?: Schema.Types.ObjectId;
  
  tenant: Schema.Types.ObjectId;
  
  // Type-specific fields
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  
  // File attachments
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: Date;
  }>;
  
  // For snippets
  code?: string;
  language?: string;
  
  // Metadata
  tags: string[];
  visibility: 'all_students' | 'specific_batch' | 'enrolled_only';
  visibleTo?: Schema.Types.ObjectId[];
  
  // Status
  isPublished: boolean;
  viewCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    type: {
      type: String,
      enum: ['announcement', 'note', 'assignment', 'cheatsheet', 'snippet'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      name: String,
      role: String,
    },
    course: {
      courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
      },
      courseName: String,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    dueDate: {
      type: Date,
      required: function (this: IContent) {
        return this.type === 'assignment';
      },
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    attachments: [
      {
        name: String,
        url: String,
        size: Number,
        type: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    code: {
      type: String,
      required: function (this: IContent) {
        return this.type === 'snippet';
      },
    },
    language: {
      type: String,
      required: function (this: IContent) {
        return this.type === 'snippet';
      },
    },
    tags: [String],
    visibility: {
      type: String,
      enum: ['all_students', 'specific_batch', 'enrolled_only'],
      default: 'enrolled_only',
    },
    visibleTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
ContentSchema.index({ tenant: 1, type: 1 });
ContentSchema.index({ tenant: 1, course: 1 });
ContentSchema.index({ tenant: 1, chapterId: 1, type: 1 });
ContentSchema.index({ tenant: 1, isPublished: 1, createdAt: -1 });
ContentSchema.index({ dueDate: 1, type: 1 });

export default mongoose.model<IContent>('Content', ContentSchema);
