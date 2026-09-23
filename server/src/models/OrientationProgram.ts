import mongoose, { Document, Schema } from 'mongoose';
import { OrientationDay, OrientationItemKind } from '../data/orientationPolicy';

/**
 * One tenant's orientation: the days every new member meets before Day 1.
 *
 * STORED, NOT DERIVED. The shipped default lives in orientationPolicy, but what a student sees is
 * this document — because an admin edits it, and their edit must survive a deployment that changes
 * the default. A tenant with no document yet is served the default and keeps it until it is edited.
 *
 * ONE PER TENANT. Orientation is the same welcome for everybody; nothing here is per student, per
 * stage or per direction. What each student has done lives in OrientationProgress.
 */

export interface IOrientationProgram extends Document {
  tenantId: string;
  /** False hides orientation entirely: no member is shown it and no member is gated by it. */
  enabled: boolean;
  days: OrientationDay[];
  /** Who last edited it, for the audit trail every other CareerPilot config carries. */
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ITEM_KINDS: OrientationItemKind[] = ['video', 'notes', 'image', 'checklist', 'recording'];

const OrientationItemSchema = new Schema({
  key:               { type: String, required: true, trim: true },
  kind:              { type: String, enum: ITEM_KINDS, required: true },
  title:             { type: String, required: true, trim: true },
  blurb:             { type: String, trim: true },
  url:               { type: String, trim: true },
  body:              { type: String },
  items:             [{ type: String }],
  targetSeconds:     { type: Number, min: 0 },
  required:          { type: Boolean, default: true },
  estimatedMinutes:  { type: Number, default: 5, min: 0 },
}, { _id: false });

const OrientationDaySchema = new Schema({
  dayNumber: { type: Number, required: true, min: 1 },
  title:     { type: String, required: true, trim: true },
  blurb:     { type: String, trim: true },
  items:     [OrientationItemSchema],
}, { _id: false });

const OrientationProgramSchema = new Schema<IOrientationProgram>(
  {
    tenantId:  { type: String, required: true, unique: true, index: true },
    enabled:   { type: Boolean, default: true },
    days:      [OrientationDaySchema],
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model<IOrientationProgram>('OrientationProgram', OrientationProgramSchema);
