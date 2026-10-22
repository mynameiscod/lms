import mongoose, { Schema, Document } from 'mongoose';
import { FAQ_STATUSES, FAQ_AUDIENCES, SUPPORT_MODULES, LIMITS, FaqStatus, FaqAudience, SupportModule } from '../data/supportPolicy';

/**
 * A Help Center article. Only `published` articles are ever shown to members or used by the
 * assistant; drafts carry `needsOwnerReview` until someone who knows the answer has checked it.
 *
 * `tenantId: null` is an article written by the support HQ for every college; a tenant's own
 * articles sit beside those.
 */
export interface ISupportFaq extends Document {
  tenantId?: mongoose.Types.ObjectId | null;
  question: string;
  answer: string;
  category: string;
  module: SupportModule;
  /** Empty means everyone signed in. */
  audiences: FaqAudience[];
  keywords: string[];
  status: FaqStatus;
  needsOwnerReview: boolean;
  views: number;
  helpfulYes: number;
  helpfulNo: number;
  publishedAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupportFaqSchema = new Schema<ISupportFaq>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    question:  { type: String, required: true, trim: true, minlength: 5, maxlength: LIMITS.faqQuestion },
    answer:    { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.faqAnswer },
    category:  { type: String, required: true, trim: true, maxlength: 60 },
    module:    { type: String, enum: SUPPORT_MODULES, default: 'other' },
    audiences: { type: [{ type: String, enum: FAQ_AUDIENCES }], default: [] },
    keywords:  { type: [{ type: String, trim: true, maxlength: 40 }], default: [], validate: { validator: (v: string[]) => v.length <= 30, message: 'At most 30 keywords' } },
    status:    { type: String, enum: FAQ_STATUSES, default: 'draft' },
    needsOwnerReview: { type: Boolean, default: true },
    views:      { type: Number, default: 0, min: 0 },
    helpfulYes: { type: Number, default: 0, min: 0 },
    helpfulNo:  { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date, default: null },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Publishing stamps the date; an article cannot be published while it still awaits review.
SupportFaqSchema.pre('validate', function (next) {
  if (this.status === 'published') {
    if (this.needsOwnerReview) this.invalidate('status', 'Review the article before publishing it');
    if (!this.publishedAt) this.publishedAt = new Date();
  }
  next();
});

SupportFaqSchema.index({ question: 'text', keywords: 'text', answer: 'text' }, { weights: { question: 10, keywords: 6, answer: 1 }, name: 'faq_text' });
SupportFaqSchema.index({ status: 1, tenantId: 1, category: 1 });
SupportFaqSchema.index({ status: 1, module: 1 });
SupportFaqSchema.index({ createdAt: -1 });

export default mongoose.model<ISupportFaq>('SupportFaq', SupportFaqSchema);
