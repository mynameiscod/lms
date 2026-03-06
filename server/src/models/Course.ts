import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  code: string; // e.g., "JAVA-FS", "MERN", "PYTHON-DS"
  description: string;
  thumbnail?: string;
  instructor: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };
  prerequisites?: string[];
  learningOutcomes?: string[];
  isPublished: boolean;
  isActive: boolean;
  enrollmentCount: number;
  subjectCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema = new Schema(
  {
    title: { 
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
      required: true,
      trim: true 
    },
    thumbnail: {
      type: String,
      trim: true
    },
    instructor: { 
      type: mongoose.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    tenantId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Tenant', 
      required: true 
    },
    category: { 
      type: String, 
      required: true,
      trim: true 
    },
    level: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'], 
      default: 'beginner' 
    },
    duration: {
      value: { type: Number, default: 3 },
      unit: { type: String, enum: ['days', 'weeks', 'months'], default: 'months' }
    },
    prerequisites: [{
      type: String,
      trim: true
    }],
    learningOutcomes: [{
      type: String,
      trim: true
    }],
    isPublished: { 
      type: Boolean, 
      default: false 
    },
    isActive: {
      type: Boolean,
      default: true
    },
    enrollmentCount: { 
      type: Number, 
      default: 0 
    },
    subjectCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Indexes for faster queries
CourseSchema.index({ tenantId: 1, isActive: 1 });
CourseSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export default mongoose.model<ICourse>('Course', CourseSchema);