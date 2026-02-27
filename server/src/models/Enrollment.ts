import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  status: 'enrolled' | 'completed' | 'dropped';
  progress: number;
  enrolledAt: Date;
  completedAt?: Date;
}

const EnrollmentSchema: Schema = new Schema(
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
    tenantId: { 
      type: mongoose.Types.ObjectId, 
      ref: 'Tenant', 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['enrolled', 'completed', 'dropped'], 
      default: 'enrolled' 
    },
    progress: { 
      type: Number, 
      default: 0, 
      min: 0, 
      max: 100 
    },
    enrolledAt: { 
      type: Date, 
      default: Date.now 
    },
    completedAt: { 
      type: Date 
    }
  },
  { timestamps: true }
);

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);