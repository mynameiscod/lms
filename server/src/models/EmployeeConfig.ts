import mongoose, { Schema, Document } from 'mongoose';

/** The institute's own lists and rules for the employee modules. One document per institute. */
export const DEFAULT_CONFIG = {
  departments: ['Management', 'Sales & Counselling', 'Training', 'Technology', 'Operations', 'Marketing', 'HR & Admin', 'Finance'],
  designations: ['Trainee', 'Executive', 'Senior Executive', 'Team Lead', 'Manager', 'Senior Manager', 'Director'],
  employmentTypes: ['Full-time', 'Part-time', 'Intern', 'Contract', 'Consultant'],
  workLocations: ['Head office', 'Remote'],
  documentTypes: ['Offer letter', 'ID proof', 'Address proof', 'Education certificate', 'Experience letter', 'Other'],
  expenseCategories: [
    { name: 'Travel', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
    { name: 'Food & meals', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
    { name: 'Internet & phone', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
    { name: 'Software & tools', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
    { name: 'Office supplies', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
    { name: 'Client or candidate meeting', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
    { name: 'Other', dailyLimit: 0, receiptRequiredAbove: 0, active: true },
  ],
  activityCategories: ['Calls', 'Counselling', 'Teaching', 'Content', 'Development', 'Meetings', 'Admin', 'Follow-ups', 'Other'],
  customFields: [] as { key: string; label: string; required?: boolean }[],
  expensePolicy: {
    /** reporting_manager: the employee's manager approves. approvers: only people with the approve permission.
     *  manager_then_approver: the manager first, then someone with the approve permission. */
    approvalMode: 'manager_then_approver',
    /** A receipt is needed for any claim above this (rupees). 0 = never required. */
    receiptRequiredAbove: 500,
    dailyLimit: 0,
    monthlyLimit: 0,
    /** Claims at or below this are approved at once. 0 = off. */
    autoApproveBelow: 0,
    maxBackdateDays: 30,
  },
  activityPolicy: {
    expectedHours: 8,
    workingDays: [1, 2, 3, 4, 5, 6],
    lateCheckInAfter: '10:30',
    requireCheckIn: true,
    requireEodSubmit: true,
    /** manager: the reporting manager reviews. reviewers: only people with the review permission. none: submitting is final. */
    reviewMode: 'manager',
    /** How many days back an employee may still edit or submit a log. */
    editableDays: 3,
  },
};

const EmployeeConfigSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  departments: { type: [String], default: DEFAULT_CONFIG.departments },
  designations: { type: [String], default: DEFAULT_CONFIG.designations },
  employmentTypes: { type: [String], default: DEFAULT_CONFIG.employmentTypes },
  workLocations: { type: [String], default: DEFAULT_CONFIG.workLocations },
  documentTypes: { type: [String], default: DEFAULT_CONFIG.documentTypes },
  expenseCategories: { type: [{ name: String, dailyLimit: Number, receiptRequiredAbove: Number, active: { type: Boolean, default: true } }], default: DEFAULT_CONFIG.expenseCategories },
  activityCategories: { type: [String], default: DEFAULT_CONFIG.activityCategories },
  customFields: { type: [{ key: String, label: String, required: Boolean }], default: [] },
  expensePolicy: { type: Schema.Types.Mixed, default: DEFAULT_CONFIG.expensePolicy },
  activityPolicy: { type: Schema.Types.Mixed, default: DEFAULT_CONFIG.activityPolicy },
  codeCounter: { type: Number, default: 0 },
  codePrefix: { type: String, default: 'EMP' },
}, { timestamps: true, minimize: false });

export interface IEmployeeConfig extends Document { [k: string]: any }
export default mongoose.model<IEmployeeConfig>('EmployeeConfig', EmployeeConfigSchema);
