import mongoose, { Schema, Document } from 'mongoose';

/**
 * PlacementPartner — a target/active hiring company in the placement-outreach
 * pipeline. Separate from `Lead` (admissions) and `PlacementDrive` (student-facing).
 * One per company per tenant (deduped on companyKey for idempotent CSV re-import).
 *
 * Step 1 covers: identity, tier/priority/fit, contact, pipeline stage + history,
 * and CSV import. The `outreach` / `placement` sub-docs are scaffolded here so
 * later slices (automated sending, reply-stop, placement + 90-day guarantee)
 * don't need a schema migration.
 */

export type PartnerTier = 'tier1' | 'tier2' | 'tier3';
export type PartnerPriority = 'high' | 'medium' | 'low';
export type FresherFit = 'high' | 'medium' | 'low';
export type PartnerStage =
  | 'target' | 'contacted' | 'replied' | 'interested' | 'interviewing' | 'placed' | 'not_a_fit';

export type OutreachStatus = 'not_started' | 'in_sequence' | 'stopped' | 'replied' | 'bounced';

// Shared stage metadata (also surfaced to the frontend board).
export const PARTNER_STAGES: { id: PartnerStage; name: string; color: string }[] = [
  { id: 'target',       name: 'Target',       color: '#64748b' },
  { id: 'contacted',    name: 'Contacted',    color: '#359AAD' },
  { id: 'replied',      name: 'Replied',      color: '#0ea5e9' },
  { id: 'interested',   name: 'Interested',   color: '#8b5cf6' },
  { id: 'interviewing', name: 'Interviewing', color: '#f59e0b' },
  { id: 'placed',       name: 'Placed',       color: '#16a34a' },
  { id: 'not_a_fit',    name: 'Not a fit',    color: '#ef4444' },
];
export const PARTNER_STAGE_IDS = PARTNER_STAGES.map(s => s.id);

export interface IStageChange {
  from?: PartnerStage;
  to: PartnerStage;
  at: Date;
  by?: mongoose.Types.ObjectId;
}

export interface IPlacementPartner extends Document {
  tenantId: mongoose.Types.ObjectId;
  companyName: string;
  companyKey: string;            // normalized name for dedupe
  website?: string;
  location?: string;
  tier: PartnerTier;
  priority: PartnerPriority;
  fresherFit: FresherFit;
  outreachAngle?: string;
  notes?: string;
  source: 'csv' | 'manual';

  contactName?: string;
  contactEmail?: string;
  contactTitle?: string;
  contactPhone?: string;
  contactLinkedin?: string;

  stage: PartnerStage;
  stageHistory: IStageChange[];

  // ── Scaffolded for later slices ──
  outreach: {
    status: OutreachStatus;
    emailsSent: number;
    lastEmailAt?: Date;
    nextEmailAt?: Date;
    repliedAt?: Date;
    bouncedAt?: Date;
    stoppedReason?: string;
  };
  placement: {
    studentId?: mongoose.Types.ObjectId;
    studentName?: string;
    ctc?: number;
    placedAt?: Date;
    guaranteeEndsAt?: Date;
  };

  // Students put forward to this company (Step 3 matching → Step 4 profile send).
  candidates: { studentId: mongoose.Types.ObjectId; studentName: string; addedAt: Date; addedBy?: mongoose.Types.ObjectId }[];

  // Scheduled interviews (Step 4).
  interviews: { scheduledAt: Date; mode: string; candidateNames: string[]; notes?: string; createdAt: Date; createdBy?: mongoose.Types.ObjectId }[];

  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const normalizeCompanyKey = (name: string): string =>
  (name || '').toLowerCase().replace(/\b(pvt|private|ltd|limited|llp|inc|technologies|technology|solutions|labs|software)\b/g, '')
    .replace(/[^a-z0-9]/g, '').trim();

const PlacementPartnerSchema = new Schema<IPlacementPartner>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    companyKey:  { type: String, required: true, index: true },
    website:     { type: String, default: '' },
    location:    { type: String, default: '' },
    tier:        { type: String, enum: ['tier1', 'tier2', 'tier3'], default: 'tier3' },
    priority:    { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    fresherFit:  { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    outreachAngle: { type: String, default: '' },
    notes:       { type: String, default: '' },
    source:      { type: String, enum: ['csv', 'manual'], default: 'manual' },

    contactName:     { type: String, default: '' },
    contactEmail:    { type: String, default: '' },
    contactTitle:    { type: String, default: '' },
    contactPhone:    { type: String, default: '' },
    contactLinkedin: { type: String, default: '' },

    stage:        { type: String, enum: PARTNER_STAGE_IDS, default: 'target', index: true },
    stageHistory: { type: [{ from: String, to: String, at: Date, by: { type: Schema.Types.ObjectId, ref: 'User' } }], default: [] },

    outreach: {
      status:        { type: String, enum: ['not_started', 'in_sequence', 'stopped', 'replied', 'bounced'], default: 'not_started' },
      emailsSent:    { type: Number, default: 0 },
      lastEmailAt:   Date,
      nextEmailAt:   Date,
      repliedAt:     Date,
      bouncedAt:     Date,
      stoppedReason: String,
    },
    placement: {
      studentId:   { type: Schema.Types.ObjectId, ref: 'User' },
      studentName: String,
      ctc:         Number,
      placedAt:    Date,
      guaranteeEndsAt: Date,
    },
    candidates: { type: [{ studentId: { type: Schema.Types.ObjectId, ref: 'User' }, studentName: String, addedAt: Date, addedBy: { type: Schema.Types.ObjectId, ref: 'User' } }], default: [] },
    interviews: { type: [{ scheduledAt: Date, mode: String, candidateNames: [String], notes: String, createdAt: Date, createdBy: { type: Schema.Types.ObjectId, ref: 'User' } }], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One company per tenant (case/format-insensitive via companyKey) → idempotent import.
PlacementPartnerSchema.index({ tenantId: 1, companyKey: 1 }, { unique: true });
PlacementPartnerSchema.index({ tenantId: 1, stage: 1 });
PlacementPartnerSchema.index({ tenantId: 1, tier: 1, priority: 1 });

export default mongoose.model<IPlacementPartner>('PlacementPartner', PlacementPartnerSchema);
