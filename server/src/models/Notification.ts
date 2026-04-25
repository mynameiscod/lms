import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'placement_drive_new'
  | 'placement_deadline'
  | 'placement_status'
  | 'general';

export interface INotification extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;   // e.g. "/student/college"
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    userId:   { type: mongoose.Types.ObjectId, ref: 'User',   required: true },
    type:     { type: String, enum: ['placement_drive_new', 'placement_deadline', 'placement_status', 'general'], default: 'general' },
    title:    { type: String, required: true },
    body:     { type: String, required: true },
    link:     { type: String },
    read:     { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, userId: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
