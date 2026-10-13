import mongoose, { Schema, Document } from 'mongoose';

/**
 * An employee of the institute: the people who work here, as opposed to the students who learn here.
 * Optionally linked to a login (`userId`) so they can sign in to the employee portal with the same
 * login page as everyone else. Salary and identity numbers are kept apart in `compensationHistory`
 * and `sensitive`, and only shown to people allowed to see them.
 */
const Addr = { line1: String, line2: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } };

const EmployeeSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  /** True when the login was made by the employee module and has no other access (a portal-only login). */
  portalOnly: { type: Boolean, default: false },
  employeeCode: { type: String, required: true, trim: true },

  // Personal
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true, default: '' },
  workEmail: { type: String, trim: true, lowercase: true },
  personalEmail: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  altPhone: { type: String, trim: true },
  dob: Date,
  gender: { type: String, enum: ['male', 'female', 'other', 'undisclosed', ''], default: '' },
  maritalStatus: { type: String, enum: ['single', 'married', 'other', ''], default: '' },
  bloodGroup: { type: String, trim: true },
  nationality: { type: String, trim: true, default: 'Indian' },
  currentAddress: Addr,
  permanentAddress: Addr,
  emergencyContacts: [{ name: String, relation: String, phone: String }],
  education: [{ degree: String, institution: String, year: String, grade: String }],
  experience: [{ company: String, role: String, from: Date, to: Date, note: String }],
  skills: [String],

  // Job
  department: { type: String, trim: true },
  designation: { type: String, trim: true },
  grade: { type: String, trim: true },
  employmentType: { type: String, trim: true, default: 'Full-time' },
  workMode: { type: String, enum: ['office', 'remote', 'hybrid'], default: 'office' },
  workLocation: { type: String, trim: true },
  reportingManagerId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
  joiningDate: Date,
  probationEndDate: Date,
  confirmationDate: Date,
  noticePeriodDays: { type: Number, default: 30 },
  status: { type: String, enum: ['active', 'probation', 'on_notice', 'on_leave', 'exited'], default: 'active' },
  exitDate: Date,
  exitReason: String,
  roleHistory: [{
    effectiveFrom: Date, type: { type: String, enum: ['joining', 'promotion', 'transfer', 'role_change', 'correction'] },
    designation: String, department: String, grade: String, reportingManagerId: Schema.Types.ObjectId, note: String,
    createdBy: Schema.Types.ObjectId, createdAt: { type: Date, default: Date.now },
  }],

  // Pay: shown only to people who may see sensitive details
  currentCtc: { type: Number, default: 0 },
  payFrequency: { type: String, enum: ['monthly', 'annual'], default: 'annual' },
  compensationHistory: [{
    effectiveFrom: Date, type: { type: String, enum: ['joining', 'hike', 'promotion', 'revision', 'correction'] },
    ctc: Number, previousCtc: Number, hikePercent: Number, note: String,
    createdBy: Schema.Types.ObjectId, createdAt: { type: Date, default: Date.now },
  }],
  sensitive: {
    pan: String, aadhaar: String, uan: String, pfNumber: String, esiNumber: String,
    bankAccountHolder: String, bankName: String, bankAccountNumber: String, bankIfsc: String, bankBranch: String,
  },

  documents: [{ fileId: Schema.Types.ObjectId, name: String, kind: String, uploadedAt: { type: Date, default: Date.now }, uploadedBy: Schema.Types.ObjectId }],
  assets: [{ name: String, tag: String, issuedOn: Date, returnedOn: Date, note: String }],
  photoFileId: { type: Schema.Types.ObjectId, default: null },
  /** HR notes about the person: for admins and the manager, never the employee. */
  hrNotes: [{ text: String, by: Schema.Types.ObjectId, byName: String, at: { type: Date, default: Date.now } }],
  /** Whatever extra fields the institute defined in the employee settings. */
  customFields: { type: Map, of: String, default: {} },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

EmployeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ tenantId: 1, userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });
EmployeeSchema.index({ tenantId: 1, status: 1, department: 1 });
EmployeeSchema.index({ tenantId: 1, reportingManagerId: 1 });

export interface IEmployee extends Document { [k: string]: any }
export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
