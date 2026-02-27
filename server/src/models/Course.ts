import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  instructor: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
  enrollmentCount: number;
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
    description: { 
      type: String, 
      required: true,
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
    isPublished: { 
      type: Boolean, 
      default: false 
    },
    enrollmentCount: { 
      type: Number, 
      default: 0 
    }
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);