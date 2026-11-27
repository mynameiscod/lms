import mongoose, { Schema, Document } from 'mongoose';

export interface ScanProof {
  at?: Date;
  ip?: string;
  lat?: number;
  lng?: number;
  distanceM?: number;
  deviceId?: string;
}

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
  /** How the record was made: by staff on the Attendance page, or by the student scanning the office QR. */
  method?: 'manual' | 'qr';
  /** Checked in after the institute's "late after" time. */
  late?: boolean;
  /** Where the QR scans came from — the proof shown to staff. */
  checkIn?: ScanProof;
  checkOut?: ScanProof;
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
    },
    method: { type: String, enum: ['manual', 'qr'], default: 'manual' },
    late: { type: Boolean, default: false },
    checkIn: { at: Date, ip: String, lat: Number, lng: Number, distanceM: Number, deviceId: String },
    checkOut: { at: Date, ip: String, lat: Number, lng: Number, distanceM: Number, deviceId: String },
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
// One phone, one student a day (Student Rules → onePhonePerStudent).
AttendanceSchema.index({ tenantId: 1, date: 1, 'checkIn.deviceId': 1 }, { sparse: true });

const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
