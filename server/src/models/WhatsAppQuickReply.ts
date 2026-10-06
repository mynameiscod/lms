import mongoose, { Schema, Document } from 'mongoose';

/** A saved answer staff insert into a WhatsApp reply with one click. `{name}` becomes the first name. */
export interface IWhatsAppQuickReply extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  createdBy?: mongoose.Types.ObjectId;
}

const WhatsAppQuickReplySchema = new Schema<IWhatsAppQuickReply>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 60 },
  body: { type: String, required: true, trim: true, maxlength: 4096 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<IWhatsAppQuickReply>('WhatsAppQuickReply', WhatsAppQuickReplySchema);
