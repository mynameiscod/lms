import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import { IAssessmentSubmission } from '../models/AssessmentSubmission';
import { SEGMENT_LABELS, CandidateSegment } from '../constants/assessment';

/**
 * Bridges an assessment submission into the Lead CRM so telecallers can follow
 * up. Called twice in a candidate's lifecycle:
 *   - on registration  → create/refresh the lead (captures drop-offs)
 *   - on submission     → enrich with sub-scores + Readiness + set HOT priority
 */

async function getTenantAdminId(tenantOid: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId | undefined> {
  const admin = await User.findOne({
    tenantId: tenantOid,
    role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'MANAGER'] },
  }).select('_id').lean();
  return admin?._id as mongoose.Types.ObjectId | undefined;
}

async function getDefaultStageId(tenantOid: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId | undefined> {
  let stage = await LeadStage.findOne({ tenantId: tenantOid, $or: [{ name: /new/i }, { order: 1 }] } as any).sort({ order: 1 });
  if (!stage) stage = await LeadStage.findOne({ tenantId: tenantOid }).sort({ order: 1 });
  return stage?._id as mongoose.Types.ObjectId | undefined;
}

/** Hot/warm/cold from segment urgency + readiness (used at submission time). */
function derivePriority(segment: CandidateSegment, readiness?: number): 'hot' | 'warm' | 'cold' {
  const urgent = segment === 'job_switcher' || segment === 'final_year' || segment === 'graduate';
  if (urgent && (readiness ?? 0) >= 40) return 'hot';
  if (urgent) return 'warm';
  return readiness != null && readiness >= 60 ? 'warm' : 'cold';
}

const last10 = (phone: string) => phone.replace(/\D/g, '').slice(-10);

/**
 * Create or update the CRM lead for a submission. Pass `withResults: true` after
 * grading to push sub-scores + Readiness + roadmap and bump priority.
 */
export async function syncSubmissionToLead(
  submission: IAssessmentSubmission,
  opts: { withResults?: boolean } = {}
): Promise<mongoose.Types.ObjectId | undefined> {
  const tenantOid = new mongoose.Types.ObjectId(submission.tenantId);
  const c = submission.candidate;
  const ten = last10(c.phone);
  if (!ten) return submission.leadId as mongoose.Types.ObjectId | undefined;

  const segmentLabel = SEGMENT_LABELS[c.segment];
  const readiness = submission.readinessScore;

  // Build a rich note for telecallers.
  const lines: string[] = [`Skill Assessment — ${segmentLabel}`];
  if (c.targetRole) lines.push(`Target: ${c.targetRole}${c.targetCompany ? ` @ ${c.targetCompany}` : ''}`);
  if (c.currentPackage != null || c.targetSalary != null) {
    lines.push(`Salary: ${c.currentPackage ?? '?'} → ${c.targetSalary ?? '?'} LPA`);
  }
  if (opts.withResults && readiness != null) {
    lines.push(`Readiness: ${readiness}/100${submission.percentile != null ? ` (top ${100 - submission.percentile}%)` : ''}`);
    const sub = submission.subScores.map((s) => `${s.dimension}:${s.percentage}%`).join(', ');
    if (sub) lines.push(`Gaps → ${sub}`);
  }
  const noteDescription = lines.join(' | ');

  const customFields = new Map<string, any>([
    ['assessmentSegment', c.segment],
    ['city', c.city || ''],
    ['currentStack', (c.currentStack || []).join(', ')],
    ['currentPackage', c.currentPackage ?? null],
    ['targetRole', c.targetRole ?? ''],
    ['targetCompany', c.targetCompany ?? ''],
    ['targetSalary', c.targetSalary ?? null],
    ['yearsExperience', c.yearsExperience ?? null],
    ['assessmentSubmissionId', String(submission._id)],
  ]);
  if (opts.withResults) {
    customFields.set('readinessScore', readiness ?? null);
    customFields.set('percentile', submission.percentile ?? null);
    customFields.set('subScores', submission.subScores.map((s) => `${s.dimension}:${s.percentage}`).join(';'));
  }

  const existing = await Lead.findOne({ tenantId: tenantOid, phone: { $regex: ten + '$' } });

  if (existing) {
    existing.activities.push({
      type: 'note',
      description: noteDescription,
      createdBy: existing.assignedTo || existing.createdBy,
      createdAt: new Date(),
      metadata: { source: 'assessment', submissionId: String(submission._id) },
    } as any);
    for (const [k, v] of customFields) existing.set(`customFields.${k}`, v);
    if (opts.withResults) {
      existing.priority = derivePriority(c.segment, readiness);
      if (readiness != null) existing.score = readiness;
    }
    await existing.save();
    return existing._id as mongoose.Types.ObjectId;
  }

  const [adminId, stageId] = await Promise.all([getTenantAdminId(tenantOid), getDefaultStageId(tenantOid)]);
  if (!stageId) return undefined; // no pipeline configured — skip lead creation gracefully

  const lead = await Lead.create({
    tenantId: tenantOid,
    name: c.name,
    phone: c.phone,
    email: c.email,
    source: 'assessment',
    stageId,
    priority: opts.withResults ? derivePriority(c.segment, readiness) : 'warm',
    score: opts.withResults ? readiness ?? 0 : 0,
    location: c.city,
    courseInterest: c.targetRole ? [c.targetRole] : [],
    customFields,
    createdBy: adminId || new mongoose.Types.ObjectId(),
    sourceDetails: { platform: 'website', landingPage: 'skill_assessment' },
    activities: [
      {
        type: 'created',
        description: noteDescription,
        createdBy: adminId || new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        metadata: { source: 'assessment', submissionId: String(submission._id) },
      },
    ],
  } as any);

  return lead._id as mongoose.Types.ObjectId;
}
