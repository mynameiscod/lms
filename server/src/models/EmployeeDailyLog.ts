import mongoose, { Schema, Document } from 'mongoose';

/** One employee's working day: when they started and finished, what they did, and the manager's sign-off. */
const EmployeeDailyLogSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  /** The calendar day in India, YYYY-MM-DD. */
  date: { type: String, required: true },
  checkInAt: Date,
  checkOutAt: Date,
  workMode: { type: String, enum: ['office', 'remote', 'field', 'leave', 'holiday'], default: 'office' },
  late: { type: Boolean, default: false },
  tasks: [{
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    hours: { type: Number, min: 0, max: 24, default: 0 },
    status: { type: String, enum: ['done', 'in_progress', 'blocked'], default: 'done' },
    note: { type: String, trim: true },
  }],
  totalHours: { type: Number, default: 0 },
  blockers: { type: String, trim: true },
  tomorrowPlan: { type: String, trim: true },
  summary: { type: String, trim: true },
  status: { type: String, enum: ['open', 'submitted', 'approved', 'returned'], default: 'open' },
  submittedAt: Date,
  reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewerName: String,
  reviewedAt: Date,
  reviewNote: String,
}, { timestamps: true });

EmployeeDailyLogSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });
EmployeeDailyLogSchema.index({ tenantId: 1, date: 1, status: 1 });

export interface IEmployeeDailyLog extends Document { [k: string]: any }
export default mongoose.model<IEmployeeDailyLog>('EmployeeDailyLog', EmployeeDailyLogSchema);
