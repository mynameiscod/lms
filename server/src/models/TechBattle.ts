import mongoose, { Document, Schema } from 'mongoose';

/**
 * TechBattle — a public/college competition run on a Quiz. Created ONCE by an admin;
 * everything after (link issue, reminders, opening on time, grading, ranking) is
 * automatic. Registrants come in through one or more "doors" (public / college / group),
 * each with its own shareable link and optional gating. Separate from the legacy
 * publicquizsubmissions flow.
 */

export type BattleDoorType = 'public' | 'college' | 'group';
export type BattleStatus = 'draft' | 'live' | 'closed';

export interface IBattleDoor {
  code: string;               // slug segment, e.g. 'public' | 'abc-college'
  label: string;              // display, e.g. 'ABC Engineering College'
  type: BattleDoorType;
  colleges?: string[];        // colleges covered (for group doors)
  accessCode?: string;        // optional gate: students must enter this code
  emailDomain?: string;       // optional gate: only @domain emails may register
}

export interface IBattleField {
  key: string; label: string; type: 'text' | 'select'; required: boolean; options?: string[];
}

export interface ITechBattle extends Document {
  tenantId: string;
  title: string;
  slug: string;               // public URL segment (unique per tenant)
  quizId: string;
  bannerUrl?: string;
  description?: string;
  prize?: string;
  rules?: string;

  registerOpensAt?: Date;
  registerClosesAt?: Date;
  startAt: Date;              // exam window open
  endAt: Date;               // exam window close (hard stop)
  joinCutoffMins: number;    // can't START after startAt + this (0 = until endAt)

  visibility: 'public' | 'private';
  doors: IBattleDoor[];
  registrationFields: IBattleField[];  // extra fields beyond name/mobile/email/college

  registrationMode: 'auto' | 'approval'; // auto = OTP self-serve; approval = admin verifies proofs, then link is sent
  proofNote?: string;                     // instructions shown on the form, e.g. "Upload your college ID"

  proctoring: { camera: boolean; tabSwitch: boolean };
  status: BattleStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DoorSchema = new Schema<IBattleDoor>({
  code:       { type: String, required: true },
  label:      { type: String, required: true },
  type:       { type: String, enum: ['public', 'college', 'group'], default: 'public' },
  colleges:   [{ type: String }],
  accessCode: { type: String },
  emailDomain:{ type: String },
}, { _id: false });

const FieldSchema = new Schema<IBattleField>({
  key: String, label: String, type: { type: String, enum: ['text', 'select'], default: 'text' },
  required: { type: Boolean, default: false }, options: [{ type: String }],
}, { _id: false });

const TechBattleSchema = new Schema<ITechBattle>({
  tenantId:   { type: String, required: true, index: true },
  title:      { type: String, required: true },
  slug:       { type: String, required: true },
  quizId:     { type: String, required: true },
  bannerUrl:  { type: String },
  description:{ type: String },
  prize:      { type: String },
  rules:      { type: String },

  registerOpensAt:  { type: Date },
  registerClosesAt: { type: Date },
  startAt:    { type: Date, required: true },
  endAt:      { type: Date, required: true },
  joinCutoffMins: { type: Number, default: 15 },

  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  doors:      { type: [DoorSchema], default: [{ code: 'public', label: 'Public', type: 'public' }] },
  registrationFields: { type: [FieldSchema], default: [] },

  registrationMode: { type: String, enum: ['auto', 'approval'], default: 'approval' },
  proofNote:  { type: String },

  proctoring: { camera: { type: Boolean, default: true }, tabSwitch: { type: Boolean, default: true } },
  status:     { type: String, enum: ['draft', 'live', 'closed'], default: 'draft', index: true },
  createdBy:  { type: String },
}, { timestamps: true });

TechBattleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
TechBattleSchema.index({ tenantId: 1, startAt: 1 });

export default mongoose.model<ITechBattle>('TechBattle', TechBattleSchema);
