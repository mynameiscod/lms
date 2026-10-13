import mongoose, { Schema, Document } from 'mongoose';

/** One expense claimed by an employee, with its receipts and the approval trail. */
const EmployeeExpenseSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  /** Day the money was spent, YYYY-MM-DD (India), and the month it is claimed in. */
  date: { type: String, required: true },
  month: { type: String, required: true },
  category: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  merchant: { type: String, trim: true },
  description: { type: String, trim: true },
  workMode: { type: String, enum: ['office', 'remote', 'field', ''], default: '' },
  receipts: [{ fileId: Schema.Types.ObjectId, name: String }],
  status: { type: String, enum: ['submitted', 'approved', 'rejected', 'paid', 'cancelled'], default: 'submitted' },
  /** Who must act next while submitted: the employee's manager, or someone with the approve permission. */
  stage: { type: String, enum: ['manager', 'approver', 'done'], default: 'manager' },
  flags: [String],
  trail: [{ action: String, by: Schema.Types.ObjectId, byName: String, at: { type: Date, default: Date.now }, note: String }],
  approvedBy: Schema.Types.ObjectId,
  approvedAt: Date,
  rejectionReason: String,
  paidAt: Date,
  paidBy: Schema.Types.ObjectId,
  paymentMode: String,
  paymentRef: String,
}, { timestamps: true });

EmployeeExpenseSchema.index({ tenantId: 1, employeeId: 1, date: -1 });
EmployeeExpenseSchema.index({ tenantId: 1, status: 1, stage: 1 });
EmployeeExpenseSchema.index({ tenantId: 1, month: 1 });

export interface IEmployeeExpense extends Document { [k: string]: any }
export default mongoose.model<IEmployeeExpense>('EmployeeExpense', EmployeeExpenseSchema);
