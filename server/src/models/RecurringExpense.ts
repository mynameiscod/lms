import mongoose, { Schema, Document } from 'mongoose';

/** A cost that comes round every month (rent, a subscription): set once, and the ledger line appears each month. */
const RecurringExpenseSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  vendor: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  gst: { type: Number, min: 0, default: 0 },
  /** Day of the month it falls due, 1-28 (kept to 28 so every month has it). */
  dayOfMonth: { type: Number, min: 1, max: 28, default: 1 },
  /** First and last month it applies to, YYYY-MM. No end month = until switched off. */
  startMonth: { type: String, required: true },
  endMonth: { type: String },
  paymentMode: { type: String, trim: true },
  notes: { type: String, trim: true },
  active: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

RecurringExpenseSchema.index({ tenantId: 1, active: 1 });

export interface IRecurringExpense extends Document { [k: string]: any }
export default mongoose.model<IRecurringExpense>('RecurringExpense', RecurringExpenseSchema);
