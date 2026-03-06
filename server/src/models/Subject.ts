import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  courseId: mongoose.Types.ObjectId;
  name: string;
  code: string; // e.g., "CORE-JAVA", "ADV-JAVA", "REACT"
  description: string;
  thumbnail?: string;
  order: number; // Sequence within the course
  duration: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };
  chapterCount: number;
  isPublished: boolean;
  isActive: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      trim: true
    },
    thumbnail: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: true,
      default: 1
    },
    duration: {
      value: { type: Number, default: 2 },
      unit: { type: String, enum: ['days', 'weeks', 'months'], default: 'weeks' }
    },
    chapterCount: {
      type: Number,
      default: 0
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
SubjectSchema.index({ courseId: 1, order: 1 });
SubjectSchema.index({ tenantId: 1, isActive: 1 });
SubjectSchema.index({ tenantId: 1, courseId: 1, code: 1 }, { unique: true });

export default mongoose.model<ISubject>('Subject', SubjectSchema);
