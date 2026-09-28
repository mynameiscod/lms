import mongoose, { Schema, Document } from 'mongoose';

/**
 * A WhatsApp message template, mirrored from Meta.
 *
 * Meta is the source of truth — it owns approval — so this is a local copy that an admin
 * can author from the LMS (we submit it) or that was pulled in by a sync (created in
 * Business Manager). Status is refreshed by sync and by the `message_template_status_update`
 * webhook. Sends never read components from here to build a message; they read it only to
 * learn the template's SHAPE (variable count, url button, image header) so a call site can
 * be matched to a template it can actually fill.
 */
export type WaTemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
export type WaTemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'IN_APPEAL' | 'DELETED' | 'UNKNOWN';
export type WaHeaderFormat = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
export type WaButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP' | 'COPY_CODE';

export interface IWaButton {
  type: WaButtonType;
  text: string;
  url?: string;          // URL buttons — may end in {{1}} (dynamic)
  urlExample?: string;   // full example URL for a dynamic button
  phoneNumber?: string;  // PHONE_NUMBER buttons
}

export interface IWhatsAppTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  language: string;
  category: WaTemplateCategory;
  status: WaTemplateStatus;
  metaId?: string;
  rejectedReason?: string;
  qualityScore?: string;
  header: { format: WaHeaderFormat; text?: string; imageUrl?: string };
  body: string;
  bodyExamples: string[];
  footer?: string;
  buttons: IWaButton[];
  /** AUTHENTICATION templates only — Meta generates their wording. */
  auth?: { securityRecommendation: boolean; codeExpiryMinutes?: number };
  source: 'lms' | 'meta';
  lastSyncedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ButtonSchema = new Schema<IWaButton>({
  type: { type: String, enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER', 'OTP', 'COPY_CODE'], required: true },
  text: { type: String, default: '' },
  url: String,
  urlExample: String,
  phoneNumber: String,
}, { _id: false });

const WhatsAppTemplateSchema = new Schema<IWhatsAppTemplate>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  language: { type: String, required: true, default: 'en' },
  category: { type: String, enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'], required: true },
  status: { type: String, default: 'PENDING' },
  metaId: { type: String, index: true },
  rejectedReason: String,
  qualityScore: String,
  header: {
    format: { type: String, enum: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'], default: 'NONE' },
    text: String,
    imageUrl: String,
  },
  body: { type: String, default: '' },
  bodyExamples: { type: [String], default: [] },
  footer: String,
  buttons: { type: [ButtonSchema], default: [] },
  auth: {
    securityRecommendation: { type: Boolean, default: true },
    codeExpiryMinutes: Number,
  },
  source: { type: String, enum: ['lms', 'meta'], default: 'lms' },
  lastSyncedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

WhatsAppTemplateSchema.index({ tenantId: 1, name: 1, language: 1 }, { unique: true });

export default mongoose.model<IWhatsAppTemplate>('WhatsAppTemplate', WhatsAppTemplateSchema);
