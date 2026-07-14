import mongoose from 'mongoose';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import AssessmentSubmission from '../models/AssessmentSubmission';
import InterviewAttempt from '../models/InterviewAttempt';
import CommunicationAttempt from '../models/CommunicationAttempt';
import CommunicationStreak from '../models/CommunicationStreak';
import CareerProfile from '../models/CareerProfile';
import ProjectPlan from '../models/ProjectPlan';
import Resume from '../models/Resume';
import Certificate from '../models/Certificate';

/**
 * candidateProofService — aggregate a student's verifiable "proof" into one object
 * for the HR-facing Candidate Proof Profile. Everything is best-effort: each source
 * is guarded so a missing/renamed field or absent record just omits that section.
 *
 * Gotchas handled (per the data-map trace):
 *  - Skill Assessment is keyed on `candidateUserId`, not `studentId`.
 *  - `tenantId` is a String on AssessmentSubmission/ProjectPlan and ObjectId elsewhere
 *    — Mongoose casts a hex string to ObjectId for ObjectId fields, and matches the
 *    String fields directly, so passing the string id works for all queries.
 *  - Multiple attempts exist → take best/latest.
 *  - Release gates: only surface published/reviewed/released, non-revoked data.
 */

export interface ProofProfile {
  student: { name: string; firstName: string; avatar?: string; city?: string; targetRole?: string; batch?: string; tagline?: string };
  assessment?: { readiness?: number; percentile?: number; careerReadiness?: number; targetRole?: string; salaryBand?: string; subScores: { dimension: string; percentage: number }[] };
  interview?: { score?: number; percentage?: number; readinessLevel?: string; strengths: string[]; weaknesses: string[] };
  communication?: { score?: number; readinessLevel?: string; currentStreak?: number; longestStreak?: number };
  career?: { resumeScore?: number; githubScore?: number; linkedinScore?: number; githubUrl?: string; linkedinUrl?: string };
  projects: { title: string; techStack?: string[]; githubUrl?: string }[];
  resume?: { score?: number; url?: string };
  certificates: { title: string; type?: string; verifyCode?: string }[];
  skills: string[];
  generatedAt: Date;
}

const num = (v: any): number | undefined => (typeof v === 'number' && isFinite(v) ? Math.round(v) : undefined);
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const strList = (v: any): string[] => arr(v).map((x) => (typeof x === 'string' ? x : x?.skill || x?.name || x?.label)).filter(Boolean);

export async function buildProofProfile(studentId: string, tenantId: string): Promise<ProofProfile | null> {
  const sid = studentId;
  const user: any = await User.findById(sid).lean().catch(() => null);
  if (!user) return null;

  const [profile, assessment, interview, comm, streak, career, projects, resume, certs] = await Promise.all([
    StudentProfile.findOne({ userId: sid }).lean().catch(() => null),
    AssessmentSubmission.findOne({ candidateUserId: sid, tenantId, status: 'submitted' }).sort({ submittedAt: -1 }).lean().catch(() => null),
    InterviewAttempt.find({ studentId: sid, tenantId, status: { $in: ['published', 'evaluated'] } }).sort({ overallScore: -1 }).limit(1).lean().catch(() => []),
    CommunicationAttempt.find({ studentId: sid, tenantId, status: 'completed' }).sort({ 'evaluation.overallScore': -1 }).limit(1).lean().catch(() => []),
    CommunicationStreak.findOne({ studentId: sid, tenantId }).lean().catch(() => null),
    CareerProfile.findOne({ studentId: sid, tenantId, status: { $in: ['reviewed', 'completed'] } }).lean().catch(() => null),
    ProjectPlan.find({ studentId: sid, tenantId }).sort({ updatedAt: -1 }).limit(4).lean().catch(() => []),
    Resume.findOne({ userId: sid }).sort({ updatedAt: -1 }).lean().catch(() => null),
    Certificate.find({ studentId: sid, tenantId, revoked: { $ne: true } }).sort({ createdAt: -1 }).limit(6).lean().catch(() => []),
  ]);

  const p: any = profile || {};
  const a: any = assessment || {};
  const iv: any = (interview as any[])[0] || {};
  const cm: any = (comm as any[])[0] || {};
  const c: any = career || {};

  const firstName = user.firstName || (user.name || '').split(' ')[0] || 'Candidate';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || firstName;

  const out: ProofProfile = {
    student: {
      name: fullName,
      firstName,
      avatar: user.avatar || p?.personalInfo?.profilePhoto || undefined,
      city: p?.personalInfo?.city || user.city || undefined,
      targetRole: a?.roadmap?.targetRole || a?.candidate?.targetRole || p?.courseInterest?.interestedCourse || undefined,
      batch: user.batchName || undefined,
      tagline: p?.additionalInfo?.careerGoal || undefined,
    },
    projects: [],
    certificates: [],
    skills: [],
    generatedAt: new Date(),
  };

  // Skills — union of assessment parsed skills + profile tech background
  const skills = new Set<string>();
  strList(a?.parsedSkills).forEach((s) => skills.add(s));
  strList(p?.technicalBackground?.programmingLanguages).forEach((s) => skills.add(s));
  strList(p?.technicalBackground?.technologies).forEach((s) => skills.add(s));
  out.skills = [...skills].slice(0, 18);

  // Assessment
  if (assessment) {
    const subScores = arr(a.subScores)
      .map((s: any) => ({ dimension: String(s.dimension || '').replace(/_/g, ' '), percentage: num(s.percentage) ?? 0 }))
      .filter((s: any) => s.dimension);
    out.assessment = {
      readiness: num(a.readinessScore),
      percentile: num(a.percentile),
      careerReadiness: num(a.careerReadinessScore),
      targetRole: a?.roadmap?.targetRole || undefined,
      salaryBand: a?.roadmap?.salaryBand || undefined,
      subScores,
    };
  }

  // Mock interview (best published attempt)
  if (iv && (iv.overallScore != null || iv.overallPercentage != null)) {
    out.interview = {
      score: num(iv.overallScore),
      percentage: num(iv.overallPercentage),
      readinessLevel: iv.readinessLevel || undefined,
      strengths: strList(iv.topStrengths).slice(0, 4),
      weaknesses: strList(iv.topWeaknesses).slice(0, 4),
    };
  }

  // Communication
  if (cm?.evaluation?.overallScore != null || streak) {
    out.communication = {
      score: num(cm?.evaluation?.overallScore),
      readinessLevel: cm?.readinessLevel || undefined,
      currentStreak: num((streak as any)?.currentStreak),
      longestStreak: num((streak as any)?.longestStreak),
    };
  }

  // Career pillars
  if (career) {
    out.career = {
      resumeScore: num(c?.resume?.score),
      githubScore: num(c?.github?.score),
      linkedinScore: num(c?.linkedin?.score),
      githubUrl: c?.githubUrl || p?.professionalProfiles?.githubUrl || user.github || undefined,
      linkedinUrl: c?.linkedinUrl || p?.professionalProfiles?.linkedInUrl || user.linkedin || undefined,
    };
  }

  // Projects
  out.projects = arr(projects).map((pr: any) => ({
    title: pr.title || 'Project',
    techStack: strList(pr.techStack).slice(0, 6),
    githubUrl: pr.githubUrl || undefined,
  })).filter((pr) => pr.title);

  // Resume
  if (resume) {
    out.resume = { score: num((resume as any)?.score?.total), url: (resume as any)?.uploadedFileUrl || undefined };
  }

  // Certificates
  out.certificates = arr(certs).map((ct: any) => ({
    title: ct.title || ct.type || 'Certificate',
    type: ct.type || undefined,
    verifyCode: ct.verifyCode || undefined,
  }));

  return out;
}
