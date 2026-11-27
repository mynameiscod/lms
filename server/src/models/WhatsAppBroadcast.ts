import mongoose, { Schema, Document } from 'mongoose';

/** One admin-initiated send of a template to many recipients, processed in the background. */
export interface IWhatsAppBroadcast extends Document {
  tenantId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  templateName: string;
  audience: string;            // human label: "Batch: FSD-July", "12 pasted numbers"
  /** What it was for. Only 'sales' replies may start the bot or become leads. Missing = sent before 2026-11-19. */
  purpose?: 'sales' | 'hiring' | 'wishes' | 'update';
  total: number;
  sent: number;
  failed: number;
  status: 'running' | 'done' | 'failed';
  failures: { phone: string; error: string }[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  finishedAt?: Date;
}

const WhatsAppBroadcastSchema = new Schema<IWhatsAppBroadcast>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate', required: true },
  templateName: { type: String, required: true },
  audience: { type: String, default: '' },
  purpose: { type: String, enum: ['sales', 'hiring', 'wishes', 'update'] },
  total: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
  failures: { type: [{ phone: String, error: String, _id: false }], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  finishedAt: Date,
}, { timestamps: true });

export default mongoose.model<IWhatsAppBroadcast>('WhatsAppBroadcast', WhatsAppBroadcastSchema);
