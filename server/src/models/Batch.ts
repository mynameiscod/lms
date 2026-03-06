import mongoose, { Schema, Document } from 'mongoose';

export interface IBatch extends Document {
  name: string;
  courseId: mongoose.Types.ObjectId; // Links batch to a specific course
  startDate: Date;
  endDate: Date;
  timings: {
    day: string; // e.g., "Monday", "Wednesday", "Friday"
    startTime: string; // e.g., "10:00"
    endTime: string; // e.g., "11:30"
  }[];
  instructors: mongoose.Types.ObjectId[]; // References to User documents
  tenantId: mongoose.Types.ObjectId;
  isActive: boolean;
  capacity?: number;
  enrolledCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: 'Course',
      required: false // Optional for now to support existing batches
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    timings: [
      {
        day: {
          type: String,
          enum: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ],
          required: true
        },
        startTime: {
          type: String,
          required: true
        },
        endTime: {
          type: String,
          required: true
        }
      }
    ],
    instructors: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'User'
      }
    ],
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    capacity: {
      type: Number,
      default: 30
    },
    enrolledCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Index for faster queries
BatchSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IBatch>('Batch', BatchSchema);
