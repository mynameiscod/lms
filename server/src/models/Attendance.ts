import mongoose, { Schema, Document } from 'mongoose';

interface IAttendance extends Document {
  _id: string;
  studentId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  date: Date;
  attendanceDay?: string;
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
    attendanceDay: { type: String },
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
    timestamps: true,
    autoIndex: false
  }
);

// Explicitly prepared by the attendance migration; never built by LMS startup.
AttendanceSchema.index({ tenantId: 1, batchId: 1, studentId: 1, attendanceDay: 1 },
  { name: 'attendance_day_unique', unique: true, partialFilterExpression: { attendanceDay: { $type: 'string' } } });
AttendanceSchema.pre('validate', function () {
  if (this.date) this.attendanceDay = new Date(this.date.getTime() + 19800000).toISOString().slice(0, 10);
});
// Native leave approvals use an upsert rather than document validation.
AttendanceSchema.pre('findOneAndUpdate', function () {
  const update: any = this.getUpdate();
  const date = update?.$set?.date || update?.$setOnInsert?.date;
  if (date) {
    const key = new Date(new Date(date).getTime() + 19800000).toISOString().slice(0, 10);
    const target = update.$set?.date ? update.$set : update.$setOnInsert;
    target.attendanceDay = key;
  }
});
// Compound index for tenant isolation and querying
AttendanceSchema.index({ tenantId: 1, batchId: 1, date: 1 });
AttendanceSchema.index({ tenantId: 1, studentId: 1, date: 1 });
AttendanceSchema.index({ tenantId: 1, markedBy: 1, date: 1 });

const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
