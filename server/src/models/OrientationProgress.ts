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
  /**
   * Whether this member is on the day-by-day calendar, as well as the completion ladder.
   *
   * Decided once when the record is created, exactly like `mandatory`, and never re-evaluated.
   * Members who were already learning when pacing arrived have it absent, which reads as false,
   * so nothing they had reached was taken away from them. A rule that re-decided itself every
   * request would start locking somebody out the first time a field was backfilled.
   */
  paced?: boolean;
  /**
   * The moment the programme's calendar starts for this member — day 1 of 95.
   *
   * Stored rather than derived, because the things it could be derived from move: an admin can
   * re-grant a membership, and an enrolment can be rebuilt. The clock a member is being held to
   * must not restart because something behind it was rewritten.
   */
  pacedFrom?: Date;
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
    /*
     * NO DEFAULT, DELIBERATELY. Every row written before pacing existed must read as not paced,
     * and `default: false` would be indistinguishable from a row that chose false — which is the
     * distinction that keeps members who were already learning out of this.
     */
    paced:         { type: Boolean },
    pacedFrom:     { type: Date },
    startedAt:     { type: Date },
    completedAt:   { type: Date },
  },
  { timestamps: true },
);

/** One record per member. */
OrientationProgressSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IOrientationProgress>('OrientationProgress', OrientationProgressSchema);
