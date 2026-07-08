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
  mode?: 'offline' | 'online' | 'hybrid';
  tenantId: mongoose.Types.ObjectId;
  isActive: boolean;
  capacity?: number;
  enrolledCount?: number;
  departmentId?: mongoose.Types.ObjectId;
  holidays?: string[]; // 'YYYY-MM-DD' dates that don't advance the curriculum day
  // Weekly off-days as JS getDay() numbers (0=Sun … 6=Sat). Default [0,6] (Sat+Sun off).
  // A Mon–Sat batch sets [0] so Saturdays count as content days.
  weeklyOffDays?: number[];
  // Specific dates that are NOT content days (skipped in Day counting) but are real
  // calendar events — e.g. a mock-interview day or a one-off event. Functionally these
  // skip a Day just like a holiday; `type` is for display/reporting only.
  specialDays?: { date: string; type: 'holiday' | 'mock_interview' | 'event' | 'off'; label?: string }[];
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
    mode: {
      type: String,
      enum: ['offline', 'online', 'hybrid'],
      default: 'offline'
    },
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
    },
    departmentId: {
      type: mongoose.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    holidays: {
      type: [String], // 'YYYY-MM-DD' — skipped when counting curriculum days
      default: []
    },
    weeklyOffDays: {
      type: [Number], // getDay() numbers; default Sat+Sun off. [0]=only Sunday off (Mon–Sat batch)
      default: [0, 6]
    },
    specialDays: {
      type: [
        {
          _id: false,
          date: { type: String, required: true }, // 'YYYY-MM-DD'
          type: { type: String, enum: ['holiday', 'mock_interview', 'event', 'off'], default: 'off' },
          label: { type: String }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

// Index for faster queries
BatchSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model<IBatch>('Batch', BatchSchema);
