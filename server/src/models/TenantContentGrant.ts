import mongoose, { Schema, Document } from 'mongoose';

/**
 * Which of CodeBegun's shared content a tenant may use — set by the SUPER ADMIN only.
 *
 * Shared ("global") content is written once and used by many institutes. Without a grant a tenant
 * sees all of it, which is how every tenant worked before grants existed, so nobody loses access
 * when this ships. A grant narrows it: none, a filter, or a hand-picked list. A tenant's OWN content
 * is never affected by a grant.
 *
 * One document per (tenant, content type). Today the content type is the practice library
 * (Problem Bank problems); the shape is the same for any shared content added later.
 */
export type ContentGrantType = 'practice_problems';
export type ContentGrantMode = 'all' | 'none' | 'filter' | 'pick';

export interface ITenantContentGrant extends Document {
  tenantId: string;
  contentType: ContentGrantType;
  mode: ContentGrantMode;
  /** 'filter': granted when the problem matches these (empty list = no restriction on that field). */
  difficulties: string[];
  topics: string[];
  /** Problem tags, matched in any case. */
  tags: string[];
  /** 'pick': exactly these problems. */
  problemIds: mongoose.Types.ObjectId[];
  updatedBy?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantContentGrantSchema = new Schema<ITenantContentGrant>({
  tenantId: { type: String, required: true, index: true },
  contentType: { type: String, required: true, enum: ['practice_problems'] },
  mode: { type: String, required: true, enum: ['all', 'none', 'filter', 'pick'], default: 'all' },
  difficulties: { type: [String], default: [] },
  topics: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  problemIds: { type: [Schema.Types.ObjectId], default: [] },
  updatedBy: { type: String },
  updatedByName: { type: String },
}, { timestamps: true });

TenantContentGrantSchema.index({ tenantId: 1, contentType: 1 }, { unique: true });

export default mongoose.model<ITenantContentGrant>('TenantContentGrant', TenantContentGrantSchema);
