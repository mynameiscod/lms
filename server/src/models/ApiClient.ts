import mongoose, { Schema, Document } from 'mongoose';

/**
 * An external consumer of the Problem Bank API — a partner college's portal, a customer's
 * hiring tool, or CodeBegun's own Interview Pilot.
 *
 * ── KEYS ────────────────────────────────────────────────────────────────────────────────────
 * The key is shown once, at creation. Only its SHA-256 is stored, with an 12-character prefix
 * kept in clear so an admin can tell keys apart. A leaked database therefore leaks no usable
 * key; a lost key is rotated, never recovered.
 *
 * ── WHAT A CLIENT MAY SEE ───────────────────────────────────────────────────────────────────
 * Published problems only, and never hidden tests, reference solutions or wrapper code. Within
 * that, `entitlement` narrows it: the whole global library, only specific problem sets, or a
 * difficulty/topic filter. A client owned by an institute additionally sees that institute's
 * own published problems when `includeTenantProblems` is on.
 */
export type ApiScope = 'problems:read' | 'judge:run' | 'judge:submit' | 'submissions:read';
export const API_SCOPES: ApiScope[] = ['problems:read', 'judge:run', 'judge:submit', 'submissions:read'];

export interface IApiClient extends Document {
  tenantId: string;
  name: string;
  description: string;
  keyPrefix: string;
  keyHash: string;
  scopes: ApiScope[];
  entitlement: {
    mode: 'all' | 'sets' | 'filter';
    setIds: string[];
    difficulties: string[];
    topics: string[];
    includeTenantProblems: boolean;
  };
  limits: { perMinute: number; judgePerDay: number };
  status: 'active' | 'revoked';
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApiClientSchema = new Schema<IApiClient>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '' },
  keyPrefix: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true },
  scopes: { type: [String], enum: API_SCOPES, default: ['problems:read', 'judge:run', 'judge:submit', 'submissions:read'] },
  entitlement: {
    mode: { type: String, enum: ['all', 'sets', 'filter'], default: 'all' },
    setIds: { type: [String], default: [] },
    difficulties: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    includeTenantProblems: { type: Boolean, default: false },
  },
  limits: {
    perMinute: { type: Number, default: 60, min: 1, max: 6000 },
    judgePerDay: { type: Number, default: 2000, min: 0, max: 1_000_000 },
  },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  expiresAt: Date,
  lastUsedAt: Date,
  createdBy: String,
}, { timestamps: true });

export default mongoose.model<IApiClient>('ApiClient', ApiClientSchema);

/* ── Daily usage ──────────────────────────────────────────────────────────────────────────── */

export interface IApiUsage extends Document {
  clientId: string;
  date: string; // YYYY-MM-DD (IST)
  requests: number;
  runs: number;
  submissions: number;
}

const ApiUsageSchema = new Schema<IApiUsage>({
  clientId: { type: String, required: true },
  date: { type: String, required: true },
  requests: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  submissions: { type: Number, default: 0 },
});
ApiUsageSchema.index({ clientId: 1, date: 1 }, { unique: true });

export const ApiUsage = mongoose.model<IApiUsage>('ApiUsage', ApiUsageSchema);
