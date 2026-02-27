import mongoose, { Schema, Document } from 'mongoose';

interface IAttendance extends Document {
  _id: string;
  studentId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  date: Date;
  inTime?: string;
  outTime?: string;
  status: 'present' | 'absent' | 'leave';
  markedBy: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: () => new Date()
    },
    inTime: {
      type: String,
      // Format: HH:MM
    },
    outTime: {
      type: String,
      // Format: HH:MM
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'leave'],
      default: 'absent'
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    remarks: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Compound index for tenant isolation and querying
AttendanceSchema.index({ tenantId: 1, batchId: 1, date: 1 });
AttendanceSchema.index({ tenantId: 1, studentId: 1, date: 1 });
AttendanceSchema.index({ tenantId: 1, markedBy: 1, date: 1 });

const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
