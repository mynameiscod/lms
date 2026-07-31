import mongoose, { Document, Schema } from 'mongoose';

/**
 * BattleRegistration — one clean row per person who registered for a TechBattle,
 * through a specific door. The examToken is issued AT REGISTRATION (not on approval)
 * and is the credential for the time-gated exam link. Purpose-built, separate from the
 * legacy publicquizsubmissions collection.
 */

export type RegStatus = 'registered' | 'started' | 'submitted' | 'no_show';

export interface IBattleAnswer {
  questionId: string; selectedOptions: string[]; isCorrect: boolean; marksAwarded: number;
}

export interface IBattleRegistration extends Document {
  tenantId: string;
  battleId: mongoose.Types.ObjectId;
  battleSlug: string;
  doorCode: string;
  doorLabel?: string;

  name: string;
  mobile: string;
  whatsapp?: string;
  email: string;
  college?: string;
  city?: string;
  extra?: Record<string, any>;   // all other custom registration fields (dob, gender, branch, Q&A…)

  verified: boolean;             // OTP passed (auto mode)
  reviewStatus: 'pending' | 'approved' | 'rejected';  // approval mode
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
  uploadedFiles?: { fieldName: string; filePath: string; mimeType: string; originalName: string }[];
  examToken: string;             // unique link credential
  status: RegStatus;

  startedAt?: Date;
  submittedAt?: Date;
  timeSpentSec?: number;
  activeSessionId?: string;      // single-device lock
  lastHeartbeat?: Date;

  score?: number;
  totalMarks?: number;
  percentage?: number;
  passed?: boolean;
  rank?: number;
  answers?: IBattleAnswer[];

  remindersSent: { t24: boolean; t1: boolean; live: boolean; confirm: boolean };
  leadId?: mongoose.Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BattleRegistrationSchema = new Schema<IBattleRegistration>({
  tenantId:   { type: String, required: true, index: true },
  battleId:   { type: Schema.Types.ObjectId, ref: 'TechBattle', required: true, index: true },
  battleSlug: { type: String },
  doorCode:   { type: String, default: 'public' },
  doorLabel:  { type: String },

  name:   { type: String, required: true },
  mobile: { type: String, required: true },
  whatsapp:{ type: String },
  email:  { type: String, required: true, lowercase: true, trim: true },
  college:{ type: String },
  city:   { type: String },
  extra:  { type: Schema.Types.Mixed, default: {} },

  verified:  { type: Boolean, default: false },
  reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  approvedAt:  { type: Date },
  approvedBy:  { type: String },
  rejectionReason: { type: String },
  uploadedFiles: [{ fieldName: String, filePath: String, mimeType: String, originalName: String }],
  examToken: { type: String, required: true, unique: true, index: true },
  status:    { type: String, enum: ['registered', 'started', 'submitted', 'no_show'], default: 'registered', index: true },

  startedAt:   { type: Date },
  submittedAt: { type: Date },
  timeSpentSec:{ type: Number },
  activeSessionId: { type: String },
  lastHeartbeat:   { type: Date },

  score:     { type: Number },
  totalMarks:{ type: Number },
  percentage:{ type: Number },
  passed:    { type: Boolean },
  rank:      { type: Number },
  answers:   [{ questionId: String, selectedOptions: [String], isCorrect: Boolean, marksAwarded: Number }],

  remindersSent: {
    t24: { type: Boolean, default: false },
    t1: { type: Boolean, default: false },
    live: { type: Boolean, default: false },
    confirm: { type: Boolean, default: false },
  },
  leadId:   { type: Schema.Types.ObjectId, ref: 'Lead' },
  ipAddress:{ type: String },
  userAgent:{ type: String },
}, { timestamps: true });

// One registration per person per battle.
BattleRegistrationSchema.index({ battleId: 1, mobile: 1 }, { unique: true });
BattleRegistrationSchema.index({ battleId: 1, doorCode: 1 });
BattleRegistrationSchema.index({ battleId: 1, score: -1, timeSpentSec: 1 }); // leaderboard

/**
 * Live rank counting. `status` sits second on purpose: the rank query filters on it, and
 * without it in the index Mongo had to FETCH every candidate document just to check the
 * field — 22,275 documents pulled off disk to answer one count. Measured on 50,000
 * submitted rows, adding it took the query from 215ms to 58ms.
 */
BattleRegistrationSchema.index(
  { battleId: 1, status: 1, score: -1, timeSpentSec: 1, submittedAt: 1 },
  { name: 'battle_rank_idx' },
);

export default mongoose.model<IBattleRegistration>('BattleRegistration', BattleRegistrationSchema);
