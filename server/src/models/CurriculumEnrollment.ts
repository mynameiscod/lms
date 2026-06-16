import mongoose, { Document, Schema } from 'mongoose';

export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'dropped';

export interface ICompletedItem {
  contentId: string;
  dayNumber: number;
  completedAt: Date;
}

export interface IEnrollmentSettings {
  enforceSequential: boolean; // must complete gating items to unlock next day
  weekendsActive: boolean;    // whether weekend plans are shown to student
}

export interface ICurriculumEnrollment extends Document {
  tenantId: string;
  curriculumId: mongoose.Types.ObjectId;
  curriculumTitle: string;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  batchId?: mongoose.Types.ObjectId;
  batchName?: string;
  offeringId?: mongoose.Types.ObjectId; // links to a BatchOffering (cohort calendar + overrides)
  startDate: Date;
  status: EnrollmentStatus;
  settings: IEnrollmentSettings;
  currentDay: number;
  completedDays: number[];
  completedItems: ICompletedItem[];
  lastActivityAt?: Date;
  completedAt?: Date;
  enrolledBy: string;
  // Assessment-funnel gating: a free "taste" then locked until a mentor/payment unlocks.
  assessmentOriginated?: boolean;
  previewOnly?: boolean;   // when true, days beyond previewDays are locked
  previewDays?: number;    // number of free days (default 2)
  createdAt: Date;
  updatedAt: Date;
}

const CompletedItemSchema = new Schema<ICompletedItem>(
  {
    contentId:   { type: String, required: true },
    dayNumber:   { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EnrollmentSettingsSchema = new Schema<IEnrollmentSettings>(
  {
    enforceSequential: { type: Boolean, default: false },
    weekendsActive:    { type: Boolean, default: true },
  },
  { _id: false }
);

const CurriculumEnrollmentSchema = new Schema<ICurriculumEnrollment>(
  {
    tenantId:       { type: String, required: true, index: true },
    curriculumId:   { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', required: true },
    curriculumTitle:{ type: String, required: true },
    studentId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName:    { type: String, required: true },
    studentEmail:   { type: String, required: true },
    batchId:        { type: Schema.Types.ObjectId, ref: 'Batch' },
    batchName:      { type: String },
    offeringId:     { type: Schema.Types.ObjectId, ref: 'BatchOffering' },
    startDate:      { type: Date, required: true },
    status:         { type: String, enum: ['active', 'paused', 'completed', 'dropped'], default: 'active' },
    settings:       { type: EnrollmentSettingsSchema, default: () => ({}) },
    currentDay:     { type: Number, default: 1 },
    completedDays:  [{ type: Number }],
    completedItems: [CompletedItemSchema],
    lastActivityAt: { type: Date },
    completedAt:    { type: Date },
    enrolledBy:     { type: String, required: true },
    assessmentOriginated: { type: Boolean, default: false },
    previewOnly:    { type: Boolean, default: false },
    previewDays:    { type: Number, default: 2 },
  },
  { timestamps: true }
);

// Prevent duplicate enrollment of same student in same curriculum
CurriculumEnrollmentSchema.index({ curriculumId: 1, studentId: 1 }, { unique: true });
CurriculumEnrollmentSchema.index({ tenantId: 1, status: 1 });
CurriculumEnrollmentSchema.index({ tenantId: 1, studentId: 1 });
CurriculumEnrollmentSchema.index({ tenantId: 1, batchId: 1 });

export default mongoose.model<ICurriculumEnrollment>('CurriculumEnrollment', CurriculumEnrollmentSchema);
