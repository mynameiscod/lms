import mongoose, { Document, Schema } from 'mongoose';
import { ContentSlot, DayActivityKind } from './DayPlan';

/**
 * BatchOffering — a curriculum template instantiated for a specific batch/cohort.
 * Holds the cohort calendar (start date + holidays) and per-day overrides so an
 * instructor can add/remove activities for THIS batch without mutating the
 * shared template. Enrollments link to an offering via offeringId.
 */

export interface IOverrideItem {
  kind: DayActivityKind;
  contentId?: mongoose.Types.ObjectId;
  sourceModel?: string;
  sourceId?: mongoose.Types.ObjectId;
  contentTitle: string;
  contentType: string;
  slot: ContentSlot;
  isGating: boolean;
  required?: boolean;
  points?: number;
  order: number;
  estimatedDuration: number;
  dueOffsetDays?: number;
  dueTime?: string;
  latePolicy?: 'open' | 'grace' | 'hard_lock';
  graceDays?: number;
  penaltyPct?: number;
}

export interface IDayOverride {
  dayNumber: number;
  addedItems: IOverrideItem[];
  removedItemIds: string[]; // _id strings of template DayPlan items to hide for this batch
  note?: string;
}

/**
 * Per-batch deadline/late-policy override for a template DayPlan item. Target a
 * whole day (dayNumber) or one item (itemId). Any set field overrides the item's
 * template default for THIS batch — the admin's lever to soften/harden per cohort.
 */
export interface IPolicyOverride {
  dayNumber?: number;
  itemId?: string;
  latePolicy?: 'open' | 'grace' | 'hard_lock';
  graceDays?: number;
  penaltyPct?: number;
  dueOffsetDays?: number;
  dueTime?: string;
  dueDateAbsolute?: Date; // escape hatch: pin an exact deadline for this batch
}

export interface IBatchOffering extends Document {
  tenantId: string;
  curriculumId: mongoose.Types.ObjectId;
  curriculumTitle: string;
  batchId: mongoose.Types.ObjectId;
  batchName: string;
  startDate: Date;
  holidays: string[];            // 'YYYY-MM-DD'
  dayOverrides: IDayOverride[];
  policyOverrides?: IPolicyOverride[];
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const OverrideItemSchema = new Schema<IOverrideItem>(
  {
    kind:              { type: String, enum: ['content', 'quiz', 'assignment', 'codeSnippet', 'mockInterview'], default: 'content' },
    contentId:         { type: Schema.Types.ObjectId, ref: 'LearningContentLibrary' },
    sourceModel:       { type: String },
    sourceId:          { type: Schema.Types.ObjectId },
    contentTitle:      { type: String, required: true },
    contentType:       { type: String, required: true },
    slot:              { type: String, enum: ['morning', 'afternoon', 'evening', 'anytime'], default: 'anytime' },
    isGating:          { type: Boolean, default: false },
    required:          { type: Boolean, default: true },
    points:            { type: Number, default: 0 },
    order:             { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 0 },
    dueOffsetDays:     { type: Number },
    dueTime:           { type: String },
    latePolicy:        { type: String, enum: ['open', 'grace', 'hard_lock'] },
    graceDays:         { type: Number },
    penaltyPct:        { type: Number },
  },
  { _id: true }
);

const DayOverrideSchema = new Schema<IDayOverride>(
  {
    dayNumber:      { type: Number, required: true, min: 1 },
    addedItems:     [OverrideItemSchema],
    removedItemIds: [{ type: String }],
    note:           { type: String },
  },
  { _id: false }
);

const PolicyOverrideSchema = new Schema<IPolicyOverride>(
  {
    dayNumber:       { type: Number },
    itemId:          { type: String },
    latePolicy:      { type: String, enum: ['open', 'grace', 'hard_lock'] },
    graceDays:       { type: Number },
    penaltyPct:      { type: Number },
    dueOffsetDays:   { type: Number },
    dueTime:         { type: String },
    dueDateAbsolute: { type: Date },
  },
  { _id: false }
);

const BatchOfferingSchema = new Schema<IBatchOffering>(
  {
    tenantId:        { type: String, required: true, index: true },
    curriculumId:    { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', required: true },
    curriculumTitle: { type: String, required: true },
    batchId:         { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    batchName:       { type: String, required: true },
    startDate:       { type: Date, required: true },
    holidays:        [{ type: String }],
    dayOverrides:    [DayOverrideSchema],
    policyOverrides: [PolicyOverrideSchema],
    status:          { type: String, enum: ['draft', 'active', 'completed', 'archived'], default: 'draft' },
    createdBy:       { type: String, required: true },
  },
  { timestamps: true }
);

BatchOfferingSchema.index({ tenantId: 1, curriculumId: 1, batchId: 1 }, { unique: true });
BatchOfferingSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<IBatchOffering>('BatchOffering', BatchOfferingSchema);
