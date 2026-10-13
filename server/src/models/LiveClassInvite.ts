import mongoose, { Schema, Document } from 'mongoose';

/**
 * One person invited to one live class — an LMS user picked by name, a pasted email or mobile
 * (who may have no LMS account at all), or a student added through one of the class's batches.
 *
 * `token` is the person's own join link (/live/<token>): whoever holds it joins this one class
 * under this invite's name, without logging in. It is unguessable, never listed in API responses
 * except to the class's hosts, and stops working when the invite is removed.
 */

export type InviteKind = 'user' | 'contact' | 'batch';

export interface ILiveClassInvite extends Document {
  tenantId: mongoose.Types.ObjectId;
  liveClassId: mongoose.Types.ObjectId;
  kind: InviteKind;
  /** Lower-cased email, or the +91 mobile when there is no email. One invite per person per class. */
  contactKey: string;
  name?: string;
  email?: string;
  phone?: string;
  userId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  token: string;
  invitedBy?: mongoose.Types.ObjectId;
  emailSentAt?: Date | null;
  whatsappSentAt?: Date | null;
  reminderSentAt?: Date | null;
  lastSendError?: string;
  firstJoinedAt?: Date | null;
  lastSeenAt?: Date | null;
  totalSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const LiveClassInviteSchema = new Schema<ILiveClassInvite>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  liveClassId: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true },
  kind: { type: String, enum: ['user', 'contact', 'batch'], required: true },
  contactKey: { type: String, required: true },
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 200 },
  phone: { type: String, trim: true, maxlength: 20 },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
  token: { type: String, required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  emailSentAt: { type: Date, default: null },
  whatsappSentAt: { type: Date, default: null },
  reminderSentAt: { type: Date, default: null },
  lastSendError: { type: String, maxlength: 300 },
  firstJoinedAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: null },
  totalSeconds: { type: Number, default: 0 },
}, { timestamps: true });

LiveClassInviteSchema.index({ liveClassId: 1, contactKey: 1 }, { unique: true });
LiveClassInviteSchema.index({ token: 1 }, { unique: true });
LiveClassInviteSchema.index({ tenantId: 1, userId: 1 });
LiveClassInviteSchema.index({ tenantId: 1, email: 1 });

export default mongoose.model<ILiveClassInvite>('LiveClassInvite', LiveClassInviteSchema);
