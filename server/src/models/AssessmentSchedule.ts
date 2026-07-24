import mongoose, { Document, Schema } from 'mongoose';
import { LatePolicy } from '../services/deadlinePolicyService';

/**
 * AssessmentSchedule — the delivery of one reusable assessment (Assignment / Quiz)
 * to one batch, with ITS OWN window + late policy. This is what decouples content
 * from schedule: the Assignment/Quiz stays a dateless, reusable library item, and
 * each batch gets a schedule row instead of a cloned copy.
 *
 *   source='standalone' : created from the "Assign to batches" flow (replaces Clone).
 *   source='curriculum' : mirror of a DayPlan item on a BatchOffering (offeringId +
 *                         dayNumber set); dueAt is derived from the cohort calendar.
 *
 * One row per (contentType, contentId, batchId).
 */

export type AssessmentContentType = 'assignment' | 'quiz';
export type ScheduleSource = 'standalone' | 'curriculum';
export type ScheduleStatus = 'draft' | 'active' | 'archived';

export interface IAssessmentSchedule extends Document {
  tenantId: string;
  contentType: AssessmentContentType;
  contentId: mongoose.Types.ObjectId;
  contentTitle: string;

  batchId?: mongoose.Types.ObjectId;      // batch delivery
  batchName?: string;
  studentIds?: mongoose.Types.ObjectId[]; // individual delivery (batchId absent)

  // Window + policy (absolute, resolved for THIS batch)
  startAt?: Date;
  dueAt?: Date;
  latePolicy: LatePolicy;
  graceDays: number;
  penaltyPct: number;
  dueTime: string;

  // Provenance
  source: ScheduleSource;
  offeringId?: mongoose.Types.ObjectId; // when source==='curriculum'
  dayNumber?: number;

  status: ScheduleStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentScheduleSchema = new Schema<IAssessmentSchedule>(
  {
    tenantId:     { type: String, required: true, index: true },
    contentType:  { type: String, enum: ['assignment', 'quiz'], required: true },
    contentId:    { type: Schema.Types.ObjectId, required: true, index: true },
    contentTitle: { type: String, default: '' },

    batchId:      { type: Schema.Types.ObjectId, ref: 'Batch', index: true },
    batchName:    { type: String },
    studentIds:   [{ type: Schema.Types.ObjectId, ref: 'User' }],

    startAt:      { type: Date },
    dueAt:        { type: Date },
    latePolicy:   { type: String, enum: ['open', 'grace', 'hard_lock'], default: 'grace' },
    graceDays:    { type: Number, default: 2 },
    penaltyPct:   { type: Number, default: 0 },
    dueTime:      { type: String, default: '23:59' },

    source:       { type: String, enum: ['standalone', 'curriculum'], default: 'standalone' },
    offeringId:   { type: Schema.Types.ObjectId, ref: 'BatchOffering' },
    dayNumber:    { type: Number },

    status:       { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
    createdBy:    { type: String },
  },
  { timestamps: true }
);

// One schedule per assessment per batch.
AssessmentScheduleSchema.index({ contentType: 1, contentId: 1, batchId: 1 }, { unique: true });
AssessmentScheduleSchema.index({ tenantId: 1, batchId: 1, status: 1 });
AssessmentScheduleSchema.index({ tenantId: 1, dueAt: 1 });

export default mongoose.model<IAssessmentSchedule>('AssessmentSchedule', AssessmentScheduleSchema);
