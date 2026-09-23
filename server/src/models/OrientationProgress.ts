import mongoose, { Document, Schema } from 'mongoose';

/**
 * What one member has done in orientation.
 *
 * KEPT APART FROM THE PROGRAMME'S OWN PROGRESS. Orientation is not a learning day: it writes no
 * skill evidence, and it must never be confused with the enrolment that tracks the ninety. A member
 * who finishes orientation has finished a welcome, not a day of the curriculum.
 *
 * ITEMS ARE RECORDED BY KEY, not by position, so an admin reordering the welcome cannot make a
 * member's finished item point at a different one.
 *
 * `required` IS EVALUATED AT READ TIME, never frozen here. An admin who later marks an item
 * optional must not leave members stuck behind it.
 */

export interface IOrientationItemState {
  dayNumber: number;
  itemKey: string;
  doneAt: Date;
  /** checklist: which lines are ticked, by their position in the item as the member saw it. */
  checked?: number[];
  /** recording: where the member's answer is stored, matching the mock-interview recorder. */
  recordingKey?: string | null;
  recordingMime?: string | null;
  recordingDurationSec?: number | null;
}

export interface IOrientationProgress extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  /** Orientation days finished, in no particular order. */
  completedDays: number[];
  items: IOrientationItemState[];
  /**
   * A member already past Day 1 when orientation arrived is offered it and never blocked by it.
   * Decided once, when they first see it, so the answer cannot change under them mid-way.
   */
  mandatory: boolean;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ItemStateSchema = new Schema<IOrientationItemState>({
  dayNumber:            { type: Number, required: true },
  itemKey:              { type: String, required: true },
  doneAt:               { type: Date, default: Date.now },
  checked:              [{ type: Number }],
  recordingKey:         { type: String, default: null },
  recordingMime:        { type: String, default: null },
  recordingDurationSec: { type: Number, default: null },
}, { _id: false });

const OrientationProgressSchema = new Schema<IOrientationProgress>(
  {
    tenantId:      { type: String, required: true, index: true },
    studentId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    completedDays: [{ type: Number }],
    items:         [ItemStateSchema],
    mandatory:     { type: Boolean, default: true },
    startedAt:     { type: Date },
    completedAt:   { type: Date },
  },
  { timestamps: true },
);

/** One record per member. */
OrientationProgressSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IOrientationProgress>('OrientationProgress', OrientationProgressSchema);
