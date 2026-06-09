import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import AssessmentSubmission from '../models/AssessmentSubmission';
import AssessmentItem from '../models/AssessmentItem';
import { composeExam } from '../services/assessmentBlueprintService';
import { gradeSubmission } from '../services/assessmentScoringService';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';
import { syncSubmissionToLead } from '../services/assessmentLeadService';
import { generateRoadmap } from '../services/assessmentRoadmapService';
import { CANDIDATE_SEGMENTS, CandidateSegment } from '../constants/assessment';

/**
 * Public (unauthenticated) assessment funnel:
 *   POST /public/assessment/register     → capture inputs, create lead, send OTP
 *   POST /public/assessment/verify-otp   → verify phone
 *   POST /public/assessment/resend-otp   → re-send OTP
 *   POST /public/assessment/start        → compose & return the exam (no answers)
 *   POST /public/assessment/submit       → grade, score, enrich lead
 *   GET  /public/assessment/result/:token→ fetch result summary
 *
 * Tenant is resolved from the `tenantId` supplied by the landing page.
 */

const newToken = () => crypto.randomBytes(16).toString('hex');
const normalizePhone = (raw: string): string => {
  let d = (raw || '').replace(/[^0-9]/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 13 && d.startsWith('091')) d = d.slice(3);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
};

/** Strip correct answers / hidden test data before sending an item to the browser. */
function sanitizeItem(itemDoc: any, sub: any) {
  return {
    itemId: String(itemDoc._id),
    type: itemDoc.type,
    dimension: itemDoc.dimension,
    difficulty: itemDoc.difficulty,
    language: itemDoc.language,
    prompt: itemDoc.prompt,
    codeSnippet: itemDoc.codeSnippet,
    options: itemDoc.options?.map((o: any) => ({ id: o.id, text: o.text })),
    starterCode: itemDoc.starterCode,
    functionSignature: itemDoc.functionSignature,
    blanks: itemDoc.blanks?.map((b: any) => ({ id: b.id })),
    sampleTestCases: itemDoc.testCases?.filter((t: any) => !t.hidden).map((t: any) => ({ input: t.input, expectedOutput: t.expectedOutput })),
    stage: sub.stage,
    optional: sub.optional,
    timeLimitSeconds: itemDoc.timeLimitSeconds,
  };
}

// ─── POST /register ──────────────────────────────────────────────────────────
export const registerAssessment = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const tenantId = String(b.tenantId || '').trim();
    const name = String(b.name || '').trim();
    const phone = normalizePhone(b.phone || '');
    const segment = String(b.segment || '') as CandidateSegment;

    if (!tenantId || !mongoose.isValidObjectId(tenantId)) return res.status(400).json({ success: false, message: 'Valid tenantId is required' });
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (phone.length < 10) return res.status(400).json({ success: false, message: 'A valid phone number is required' });
    if (!CANDIDATE_SEGMENTS.includes(segment)) return res.status(400).json({ success: false, message: 'Valid segment is required' });

    const token = newToken();
    const submission = await AssessmentSubmission.create({
      tenantId,
      token,
      publicConfigId: b.publicConfigId && mongoose.isValidObjectId(b.publicConfigId) ? b.publicConfigId : undefined,
      candidate: {
        name,
        phone,
        email: b.email,
        city: b.city,
        segment,
        year: b.year,
        yearsExperience: b.yearsExperience != null ? Number(b.yearsExperience) : undefined,
        currentStack: Array.isArray(b.currentStack) ? b.currentStack : [],
        currentPackage: b.currentPackage != null ? Number(b.currentPackage) : undefined,
        targetRole: b.targetRole,
        targetCompany: b.targetCompany,
        targetSalary: b.targetSalary != null ? Number(b.targetSalary) : undefined,
      },
      isMobile: !!b.isMobile,
      status: 'registered',
      utmParams: b.utmParams || undefined,
    });

    // Capture the lead immediately (even if they drop off at OTP/exam).
    try {
      const leadId = await syncSubmissionToLead(submission);
      if (leadId) { submission.leadId = leadId; await submission.save(); }
    } catch (e) { /* lead capture is best-effort; never block registration */ }

    const otp = await sendOtp(tenantId, token, phone);
    return res.json({ success: true, message: 'Registered', data: { token, otp } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// ─── POST /verify-otp ────────────────────────────────────────────────────────
export const verifyAssessmentOtp = async (req: Request, res: Response) => {
  try {
    const { token, code } = req.body || {};
    if (!token || !code) return res.status(400).json({ success: false, message: 'token and code are required' });

    const result = await verifyOtp(token, code);
    if (result !== 'ok') return res.status(400).json({ success: false, message: 'OTP verification failed', data: { reason: result } });

    await AssessmentSubmission.updateOne({ token }, { $set: { phoneVerified: true } });
    return res.json({ success: true, message: 'Phone verified' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

// ─── POST /resend-otp ────────────────────────────────────────────────────────
export const resendAssessmentOtp = async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    const otp = await sendOtp(submission.tenantId, token, submission.candidate.phone);
    return res.json({ success: true, message: 'OTP re-sent', data: { otp } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Resend failed', error: error.message });
  }
};

// ─── POST /start ─────────────────────────────────────────────────────────────
export const startAssessment = async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    if (!submission.phoneVerified) return res.status(403).json({ success: false, message: 'Phone not verified' });

    // Idempotent: if already composed, just return the same exam (refresh-safe).
    if (submission.status === 'in_progress' && submission.items.length) {
      const itemDocs = await AssessmentItem.find({ _id: { $in: submission.items.map((i) => i.itemId) } }).lean();
      const byId = new Map(itemDocs.map((d: any) => [String(d._id), d]));
      const items = submission.items.map((s) => sanitizeItem(byId.get(String(s.itemId)), s)).filter(Boolean);
      return res.json({ success: true, message: 'Resumed', data: { items, title: submission.blueprintSnapshot?.title, timeLimitMinutes: submission.blueprintSnapshot?.timeLimitMinutes } });
    }

    const composed = await composeExam(submission.tenantId, submission.candidate.segment, submission.isMobile);
    if (!composed.items.length) return res.status(503).json({ success: false, message: 'No assessment items available yet' });

    submission.items = composed.items;
    submission.blueprintId = composed.blueprintId;
    submission.blueprintSnapshot = { ...composed.snapshot, timeLimitMinutes: composed.timeLimitMinutes, title: composed.title };
    submission.status = 'in_progress';
    submission.startedAt = new Date();
    await submission.save();

    const itemDocs = await AssessmentItem.find({ _id: { $in: composed.items.map((i) => i.itemId) } }).lean();
    const byId = new Map(itemDocs.map((d: any) => [String(d._id), d]));
    const items = composed.items.map((s) => sanitizeItem(byId.get(String(s.itemId)), s)).filter(Boolean);

    return res.json({ success: true, message: 'Started', data: { items, title: composed.title, timeLimitMinutes: composed.timeLimitMinutes } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to start assessment', error: error.message });
  }
};

// ─── POST /submit ────────────────────────────────────────────────────────────
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const { token, responses, antiCheatFlags } = req.body || {};
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    if (submission.status === 'submitted') {
      return res.json({ success: true, message: 'Already submitted', data: resultPayload(submission) });
    }

    // Merge responses onto the composed items by itemId.
    const respById = new Map<string, any>((responses || []).map((r: any) => [String(r.itemId), r]));
    for (const item of submission.items) {
      const r = respById.get(String(item.itemId));
      if (!r) continue;
      item.selectedOptionIds = r.selectedOptionIds;
      item.predictedOutput = r.predictedOutput;
      item.blankAnswers = r.blankAnswers;
      item.identifiedLine = r.identifiedLine != null ? Number(r.identifiedLine) : undefined;
      item.code = r.code;
      item.timeSpentSeconds = r.timeSpentSeconds != null ? Number(r.timeSpentSeconds) : undefined;
    }
    if (Array.isArray(antiCheatFlags)) submission.antiCheatFlags = antiCheatFlags;

    const graded = await gradeSubmission(submission);
    submission.items = graded.items;
    submission.subScores = graded.subScores;
    submission.readinessScore = graded.readinessScore;
    submission.percentile = graded.percentile;
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();

    // Generate the personalized roadmap (best-effort; never blocks the result).
    try {
      const roadmap = await generateRoadmap(submission);
      if (roadmap) { submission.roadmap = roadmap as any; await submission.save(); }
    } catch (e) { /* best-effort — result page falls back to "mentor will reach out" */ }

    // Enrich the CRM lead with results + bump priority.
    try {
      const leadId = await syncSubmissionToLead(submission, { withResults: true });
      if (leadId && !submission.leadId) { submission.leadId = leadId; await submission.save(); }
    } catch (e) { /* best-effort */ }

    return res.json({ success: true, message: 'Submitted', data: resultPayload(submission) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Submission failed', error: error.message });
  }
};

// ─── GET /result/:token ──────────────────────────────────────────────────────
export const getAssessmentResult = async (req: Request, res: Response) => {
  try {
    const submission = await AssessmentSubmission.findOne({ token: req.params.token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    return res.json({ success: true, message: 'Result', data: resultPayload(submission) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch result', error: error.message });
  }
};

function resultPayload(submission: any) {
  return {
    status: submission.status,
    candidateName: submission.candidate?.name,
    segment: submission.candidate?.segment,
    subScores: submission.subScores,
    readinessScore: submission.readinessScore,
    percentile: submission.percentile,
    roadmap: submission.roadmap, // populated in Slice 3
  };
}
