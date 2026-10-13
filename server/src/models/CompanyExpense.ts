import mongoose, { Schema, Document } from 'mongoose';

/**
 * One line in the company's expense ledger: rent, a software subscription, an ad bill, a vendor
 * invoice, a month's salary for one person, or an employee's reimbursed claim. Everything the
 * institute spends goes here, whichever way it arrived.
 *
 * `kind` says how the line came to be; `status` says where it is: waiting for an approver,
 * approved and waiting to be paid, or paid. Only approved and paid lines count as money spent.
 */
const CompanyExpenseSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  kind: { type: String, enum: ['bill', 'recurring', 'salary', 'reimbursement'], default: 'bill' },
  /** The bill or payment date (India), YYYY-MM-DD, and the month it belongs to. */
  date: { type: String, required: true },
  month: { type: String, required: true },
  dueDate: { type: String },
  category: { type: String, required: true, trim: true },
  title: { type: String, trim: true },
  vendor: { type: String, trim: true },
  description: { type: String, trim: true },
  /** Total paid or payable, rupees, tax included. */
  amount: { type: Number, required: true, min: 0 },
  gst: { type: Number, min: 0, default: 0 },
  invoiceNumber: { type: String, trim: true },
  invoices: [{ fileId: Schema.Types.ObjectId, name: String }],
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'], default: 'pending' },
  paidOn: { type: String },
  paymentMode: { type: String, trim: true },
  paymentRef: { type: String, trim: true },
  /** Salary and reimbursement lines belong to a person. */
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  /** The recurring template this line was made from, and the employee claim it came from. */
  recurringId: { type: Schema.Types.ObjectId, ref: 'RecurringExpense' },
  sourceExpenseId: { type: Schema.Types.ObjectId, ref: 'EmployeeExpense' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  trail: [{ action: String, by: Schema.Types.ObjectId, byName: String, at: { type: Date, default: Date.now }, note: String }],
}, { timestamps: true });

CompanyExpenseSchema.index({ tenantId: 1, month: 1, status: 1 });
CompanyExpenseSchema.index({ tenantId: 1, date: -1 });
CompanyExpenseSchema.index({ tenantId: 1, category: 1, month: 1 });
// A person's salary once a month, a recurring item once a month, a claim once: so re-running never doubles anything.
CompanyExpenseSchema.index({ tenantId: 1, employeeId: 1, month: 1 }, { unique: true, partialFilterExpression: { kind: 'salary' } });
CompanyExpenseSchema.index({ tenantId: 1, recurringId: 1, month: 1 }, { unique: true, partialFilterExpression: { recurringId: { $type: 'objectId' } } });
CompanyExpenseSchema.index({ tenantId: 1, sourceExpenseId: 1 }, { unique: true, partialFilterExpression: { sourceExpenseId: { $type: 'objectId' } } });

export interface ICompanyExpense extends Document { [k: string]: any }
export default mongoose.model<ICompanyExpense>('CompanyExpense', CompanyExpenseSchema);
