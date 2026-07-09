import crypto from 'crypto';
import mongoose from 'mongoose';
import Certificate from '../models/Certificate';
import * as settings from './settingsService';

const rand = (n: number) => crypto.randomBytes(n).toString('hex').toUpperCase();
const verifyToken = () => crypto.randomBytes(18).toString('base64url');

// Issuer/org display name for a tenant (used on the certificate).
function issuerFor(tenantId: string): string {
  return settings.getStr('ORG_NAME', settings.getStr('PLATFORM_NAME', 'CodeBegun', tenantId), tenantId);
}

export interface IssueInput {
  tenantId: string;
  type: 'placement' | 'course' | 'quiz' | 'assignment' | 'assessment' | 'internship' | 'custom';
  studentId?: string;
  studentName: string;
  title: string;
  company?: string; role?: string; ctc?: number; score?: string; department?: string;
  referenceModel?: string; referenceId?: string;
  issuedBy?: string;
  meta?: any;
}

// Issue a certificate. Idempotent per (tenant, type, student, reference) — a re-issue
// returns the existing record so numbers/codes stay stable.
export async function issueCertificate(input: IssueInput) {
  const existing = await Certificate.findOne({
    tenantId: new mongoose.Types.ObjectId(input.tenantId),
    type: input.type,
    ...(input.studentId ? { studentId: new mongoose.Types.ObjectId(input.studentId) } : {}),
    ...(input.referenceId ? { referenceId: new mongoose.Types.ObjectId(input.referenceId) } : {}),
  });
  if (existing) return existing;

  const year = new Date().getFullYear();
  const certificateNumber = `CB-${year}-${rand(3)}`;
  const cert = await Certificate.create({
    tenantId: input.tenantId,
    type: input.type,
    studentId: input.studentId,
    studentName: input.studentName,
    title: input.title,
    issuerName: issuerFor(input.tenantId),
    company: input.company, role: input.role, ctc: input.ctc, score: input.score, department: input.department,
    meta: input.meta,
    referenceModel: input.referenceModel,
    referenceId: input.referenceId,
    certificateNumber,
    verifyCode: verifyToken(),
    issuedAt: new Date(),
    issuedBy: input.issuedBy,
  });
  return cert;
}

// Public verification (no tenant scope — the code is the secret).
export async function verifyByCode(code: string) {
  const c: any = await Certificate.findOne({ verifyCode: code }).lean();
  if (!c) return { valid: false, found: false };
  return {
    valid: !c.revoked,
    found: true,
    revoked: !!c.revoked,
    revokedReason: c.revokedReason,
    certificate: {
      certificateNumber: c.certificateNumber,
      type: c.type, title: c.title, issuerName: c.issuerName,
      studentName: c.studentName, company: c.company, role: c.role, ctc: c.ctc,
      score: c.score, department: c.department, issuedAt: c.issuedAt,
    },
  };
}

export async function listCertificates(tenantId: string, filters: { type?: string; search?: string } = {}) {
  const q: any = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (filters.type) q.type = filters.type;
  if (filters.search) q.$or = [
    { studentName: { $regex: filters.search, $options: 'i' } },
    { company: { $regex: filters.search, $options: 'i' } },
    { certificateNumber: { $regex: filters.search, $options: 'i' } },
  ];
  const rows = await Certificate.find(q).sort({ createdAt: -1 }).limit(500).lean();
  return rows.map((c: any) => ({
    id: String(c._id), certificateNumber: c.certificateNumber, type: c.type, title: c.title,
    studentName: c.studentName, company: c.company, role: c.role, ctc: c.ctc,
    issuedAt: c.issuedAt, revoked: c.revoked, verifyCode: c.verifyCode,
  }));
}

export async function revokeCertificate(tenantId: string, id: string, revoked: boolean, reason?: string) {
  return Certificate.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { revoked, revokedReason: revoked ? (reason || 'Revoked by admin') : undefined, revokedAt: revoked ? new Date() : undefined } },
    { new: true }
  );
}
