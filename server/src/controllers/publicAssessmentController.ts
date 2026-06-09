import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import AssessmentSubmission from '../models/AssessmentSubmission';
import AssessmentItem from '../models/AssessmentItem';
import { composeStage, resolveBlueprint, difficultyShiftFor } from '../services/assessmentBlueprintService';
import { gradeSubmission, gradeStage, finalizeScores } from '../services/assessmentScoringService';
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

// Sanitize the items of a single stage (by stage order) for the browser.
async function sanitizeStage(submission: any, stageOrder: number) {
  const stageItems = submission.items.filter((i: any) => i.stage === stageOrder);
  const docs = await AssessmentItem.find({ _id: { $in: stageItems.map((i: any) => i.itemId) } }).lean();
  const byId = new Map(docs.map((d: any) => [String(d._id), d]));
  return stageItems.map((s: any) => sanitizeItem(byId.get(String(s.itemId)), s)).filter(Boolean);
}

// ─── POST /start ─────────────────────────────────────────────────────────────
// Composes and returns ONLY the first stage; subsequent stages are served by
// /advance with an adaptive difficulty based on the prior stage's score.
export const startAssessment = async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    if (!submission.phoneVerified) return res.status(403).json({ success: false, message: 'Phone not verified' });

    // Resume an in-progress session at its current stage (refresh-safe).
    if (submission.status === 'in_progress' && submission.items.length) {
      const stages = submission.blueprintSnapshot?.stages || [];
      const cur = submission.currentStage || 0;
      const items = await sanitizeStage(submission, stages[cur]?.order);
      return res.json({ success: true, message: 'Resumed', data: { items, stage: cur, totalStages: stages.length, isLast: cur >= stages.length - 1, title: submission.blueprintSnapshot?.title, timeLimitMinutes: submission.blueprintSnapshot?.timeLimitMinutes } });
    }

    const resolved = await resolveBlueprint(submission.tenantId, submission.candidate.segment);
    if (!resolved.stages.length) return res.status(503).json({ success: false, message: 'No blueprint configured' });

    const used = new Set<string>();
    const stage0 = await composeStage(submission.tenantId, resolved.stages[0], submission.isMobile, 0, used);
    if (!stage0.length) return res.status(503).json({ success: false, message: 'No assessment items available yet' });

    submission.items = stage0;
    submission.blueprintId = resolved.blueprintId;
    submission.blueprintSnapshot = { title: resolved.title, timeLimitMinutes: resolved.timeLimitMinutes, dimensions: resolved.dimensions, stages: resolved.stages, isMobile: submission.isMobile };
    submission.currentStage = 0;
    submission.status = 'in_progress';
    submission.startedAt = new Date();
    await submission.save();

    const items = await sanitizeStage(submission, resolved.stages[0].order);
    return res.json({ success: true, message: 'Started', data: { items, stage: 0, totalStages: resolved.stages.length, isLast: resolved.stages.length === 1, title: resolved.title, timeLimitMinutes: resolved.timeLimitMinutes } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to start assessment', error: error.message });
  }
};

// ─── POST /advance ───────────────────────────────────────────────────────────
// Submit the current stage → grade it → either serve the next (difficulty-
// adapted) stage, or finalize the whole assessment.
export const advanceAssessment = async (req: Request, res: Response) => {
  try {
    const { token, responses, antiCheatFlags } = req.body || {};
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    if (submission.status === 'submitted') return res.json({ success: true, data: { done: true, result: resultPayload(submission) } });

    const stages = submission.blueprintSnapshot?.stages || [];
    const cur = submission.currentStage || 0;
    const stageOrder = stages[cur]?.order;

    // Merge this stage's responses.
    const respById = new Map<string, any>((responses || []).map((r: any) => [String(r.itemId), r]));
    for (const item of submission.items) {
      if (item.stage !== stageOrder) continue;
      const r = respById.get(String(item.itemId));
      if (!r) continue;
      item.selectedOptionIds = r.selectedOptionIds;
      item.predictedOutput = r.predictedOutput;
      item.blankAnswers = r.blankAnswers;
      item.identifiedLine = r.identifiedLine != null ? Number(r.identifiedLine) : undefined;
      item.code = r.code;
      item.timeSpentSeconds = r.timeSpentSeconds != null ? Number(r.timeSpentSeconds) : undefined;
    }
    if (Array.isArray(antiCheatFlags)) {
      submission.antiCheatFlags = Array.from(new Set([...(submission.antiCheatFlags || []), ...antiCheatFlags]));
    }

    // Grade the just-completed stage and record the routing decision.
    const runningPct = await gradeStage(submission, stageOrder);
    const shift = difficultyShiftFor(runningPct);
    submission.stageHistory.push({ stage: stageOrder, runningScorePct: runningPct } as any);
    submission.markModified('items');

    if (cur + 1 < stages.length) {
      const used = new Set<string>(submission.items.map((i) => String(i.itemId)));
      const nextItems = await composeStage(submission.tenantId, stages[cur + 1], submission.isMobile, shift, used);
      submission.items.push(...nextItems);
      submission.currentStage = cur + 1;
      submission.markModified('items');
      await submission.save();
      const items = await sanitizeStage(submission, stages[cur + 1].order);
      return res.json({ success: true, data: { done: false, stage: cur + 1, totalStages: stages.length, isLast: cur + 1 >= stages.length - 1, items } });
    }

    // Final stage → aggregate scores, roadmap, lead.
    const final = await finalizeScores(submission);
    submission.subScores = final.subScores;
    submission.readinessScore = final.readinessScore;
    submission.percentile = final.percentile;
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();

    try { const roadmap = await generateRoadmap(submission); if (roadmap) { submission.roadmap = roadmap as any; await submission.save(); } } catch (e) { /* best-effort */ }
    try { const leadId = await syncSubmissionToLead(submission, { withResults: true }); if (leadId && !submission.leadId) { submission.leadId = leadId; await submission.save(); } } catch (e) { /* best-effort */ }

    return res.json({ success: true, data: { done: true, result: resultPayload(submission) } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to advance assessment', error: error.message });
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
