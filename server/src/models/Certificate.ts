import mongoose, { Schema, Document } from 'mongoose';

// A persistent, verifiable certificate issued to a student. Every issuance is auditable
// (number + public verify code) and revocable. Public verification needs no auth.
export interface ICertificate extends Document {
  tenantId: mongoose.Types.ObjectId;
  type: 'placement' | 'course' | 'quiz' | 'assignment' | 'assessment' | 'internship' | 'custom';
  studentId?: mongoose.Types.ObjectId;
  studentName: string;
  title: string;                 // e.g. "Placement Certificate"
  issuerName: string;            // org/tenant display name
  // Flexible details shown on the certificate / verification page.
  company?: string;
  role?: string;
  ctc?: number;
  score?: string;
  department?: string;
  meta?: any;
  referenceModel?: string;       // e.g. 'PlacementDrive'
  referenceId?: mongoose.Types.ObjectId;
  certificateNumber: string;     // human-readable, unique per tenant (CB-2026-XXXXXX)
  verifyCode: string;            // public token (unguessable)
  issuedAt: Date;
  issuedBy?: mongoose.Types.ObjectId;
  revoked: boolean;
  revokedReason?: string;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    type:       { type: String, enum: ['placement', 'course', 'quiz', 'assignment', 'assessment', 'internship', 'custom'], required: true },
    studentId:  { type: Schema.Types.ObjectId, ref: 'User' },
    studentName:{ type: String, required: true },
    title:      { type: String, required: true },
    issuerName: { type: String, required: true },
    company:    { type: String },
    role:       { type: String },
    ctc:        { type: Number },
    score:      { type: String },
    department: { type: String },
    meta:       { type: Schema.Types.Mixed },
    referenceModel: { type: String },
    referenceId:{ type: Schema.Types.ObjectId },
    certificateNumber: { type: String, required: true },
    verifyCode: { type: String, required: true, unique: true },
    issuedAt:   { type: Date, default: Date.now },
    issuedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    revoked:    { type: Boolean, default: false },
    revokedReason: { type: String },
    revokedAt:  { type: Date },
  },
  { timestamps: true }
);
CertificateSchema.index({ tenantId: 1, certificateNumber: 1 }, { unique: true });
CertificateSchema.index({ tenantId: 1, type: 1, studentId: 1, referenceId: 1 });
CertificateSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<ICertificate>('Certificate', CertificateSchema);
