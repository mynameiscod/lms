import mongoose, { Schema, Document } from 'mongoose';
import { LIMITS } from '../data/supportPolicy';

/**
 * One entry in a ticket's conversation.
 *
 * `visibility: 'internal'` is a staff-only note. It is never returned to the requester or to a
 * college coordinator; the controllers filter on this field in the query itself.
 */
export interface ISupportAttachment {
  _id: mongoose.Types.ObjectId;
  /** The name the member gave it, cleaned; shown, never used as a path. */
  name: string;
  mime: string;
  size: number;
  /** Random file name inside the ticket's private folder. */
  storedName: string;
}

export interface ISupportMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  authorId?: mongoose.Types.ObjectId | null;
  authorKind: 'requester' | 'staff' | 'system';
  visibility: 'public' | 'internal';
  body: string;
  /** Files are kept in uploads/.private/support, never served statically; see supportAttachments. */
  attachments: ISupportAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ticketId:   { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    authorId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorKind: { type: String, enum: ['requester', 'staff', 'system'], required: true },
    visibility: { type: String, enum: ['public', 'internal'], default: 'public' },
    body:       { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.body },
    attachments: {
      type: [{
        name:       { type: String, required: true, maxlength: 120 },
        mime:       { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
        size:       { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
        storedName: { type: String, required: true, match: /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/ },
      }],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= 3, message: 'At most 3 files per message' },
    },
  },
  { timestamps: true }
);

// A requester can never author an internal note, whatever the controller does.
SupportMessageSchema.pre('validate', function (next) {
  if (this.authorKind === 'requester' && this.visibility === 'internal') this.invalidate('visibility', 'A requester cannot write an internal note');
  next();
});

SupportMessageSchema.index({ ticketId: 1, createdAt: 1 });
SupportMessageSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);
