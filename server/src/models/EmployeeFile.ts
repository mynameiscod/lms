import mongoose, { Schema, Document } from 'mongoose';

/**
 * A file belonging to an employee: a receipt, a document, a photo. Kept in file storage (Bunny)
 * when that is set up; otherwise in the database itself, so receipts are never lost for want of
 * a storage account.
 */
const EmployeeFileSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  kind: { type: String, enum: ['receipt', 'document', 'photo', 'invoice'], required: true },
  name: String,
  mime: String,
  size: Number,
  storage: { type: String, enum: ['bunny', 'db'], required: true },
  key: String,
  data: { type: Buffer, select: false },
  uploadedBy: Schema.Types.ObjectId,
}, { timestamps: true });

EmployeeFileSchema.index({ tenantId: 1, employeeId: 1, kind: 1 });

export interface IEmployeeFile extends Document { [k: string]: any }
export default mongoose.model<IEmployeeFile>('EmployeeFile', EmployeeFileSchema);
