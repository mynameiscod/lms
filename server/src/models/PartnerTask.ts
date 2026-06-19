import mongoose, { Schema, Document } from 'mongoose';

/**
 * PartnerTask — a reminder created for a placement partner, mirrored to Todoist.
 * Used to dedupe (never create the same kind twice on re-run/double-click) and
 * to track guarantee/check-in reminders in later steps.
 */
export type PartnerTaskKind = 'reply' | 'interested' | 'checkin' | 'guarantee' | 'manual';

export interface IPartnerTask extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  kind: PartnerTaskKind;
  content: string;
  todoistId?: string;            // empty when no Todoist token configured
  dueAt?: Date;
  open: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPartnerTask>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'PlacementPartner', required: true, index: true },
    kind:      { type: String, enum: ['reply', 'interested', 'checkin', 'guarantee', 'manual'], required: true },
    content:   { type: String, default: '' },
    todoistId: { type: String, default: '' },
    dueAt:     { type: Date },
    open:      { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

schema.index({ tenantId: 1, partnerId: 1, kind: 1 });

export default mongoose.model<IPartnerTask>('PartnerTask', schema);
