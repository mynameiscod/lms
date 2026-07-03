import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import AssessmentSubmission from '../models/AssessmentSubmission';
import AssessmentItem from '../models/AssessmentItem';
import Tenant from '../models/Tenant';
import { composeStage, resolveBlueprint, difficultyShiftFor } from '../services/assessmentBlueprintService';
import { gradeSubmission, gradeStage, finalizeScores } from '../services/assessmentScoringService';
import { sendOtp, verifyOtp } from '../services/assessmentOtpService';
import { syncSubmissionToLead } from '../services/assessmentLeadService';
import { generateRoadmap } from '../services/assessmentRoadmapService';
import { ensureCandidateAccount } from '../services/assessmentAccountService';
import { enrollCandidateInRoadmapPlan } from '../services/assessmentEnrollmentService';
import { designExamForSubmission } from '../services/assessmentExamDesignerService';
import { extractTextFromFile, parseResumeText } from '../services/resumeParserService';
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
    let tenantId = String(b.tenantId || '').trim();
    // Accept either a tenant ObjectId or a slug (e.g. "codebegun") in the URL.
    if (tenantId && !mongoose.isValidObjectId(tenantId)) {
      const tenant = await Tenant.findOne({ slug: tenantId.toLowerCase() }).select('_id').lean();
      if (tenant) tenantId = String(tenant._id);
    }
    const firstName = String(b.firstName || '').trim();
    const lastName = String(b.lastName || '').trim();
    const name = `${firstName} ${lastName}`.trim() || String(b.name || '').trim();
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
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone,
        email: b.email,
        city: b.city,
        segment,
        year: b.year,
        yearsExperience: b.yearsExperience != null ? Number(b.yearsExperience) : undefined,
        primaryLanguage: b.primaryLanguage,
        currentStack: Array.isArray(b.currentStack) ? b.currentStack : [],
        currentPackage: b.currentPackage != null ? Number(b.currentPackage) : undefined,
        targetRole: b.targetRole,
        targetCompany: b.targetCompany,
        targetSalary: b.targetSalary != null ? Number(b.targetSalary) : undefined,
      },
      isMobile: !!b.isMobile,
      status: 'registered',
      utmParams: b.utmParams || undefined,
      sourceDetails: {
        referrer: (req.headers['referer'] as string) || b.referrer || undefined,
        userAgent: req.headers['user-agent'],
        landedAt: new Date(),
        ...(b.sourceDetails && typeof b.sourceDetails === 'object' ? b.sourceDetails : {}),
      },
    });

    // Capture the lead immediately (even if they drop off at OTP/exam).
    try {
      const leadId = await syncSubmissionToLead(submission);
      if (leadId) { submission.leadId = leadId; await submission.save(); }
    } catch (e) { /* lead capture is best-effort; never block registration */ }

    const otp = await sendOtp(tenantId, token, phone);
    submission.otp = { sentAt: new Date(), channel: otp.channel, sent: otp.sent, attempts: 0, resends: 0 };
    await submission.save();
    return res.json({ success: true, message: 'Registered', data: { token, otp } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// Flatten parsed résumé skills into a plain string list. The AI parser may
// return simple strings (["Java", ...]) OR categorized objects
// ([{ category, items: [...] }, ...]); the DB field is [String], so normalize
// both shapes to avoid a CastError on save.
const flattenSkills = (skills: any): string[] => {
  if (!skills) return [];
  const arr = Array.isArray(skills) ? skills : [skills];
  const out: string[] = [];
  for (const s of arr) {
    if (typeof s === 'string') out.push(s);
    else if (s && Array.isArray(s.items)) out.push(...s.items.filter((x: any) => typeof x === 'string'));
    else if (s && typeof s === 'object') {
      for (const v of Object.values(s)) {
        if (typeof v === 'string') out.push(v);
        else if (Array.isArray(v)) out.push(...v.filter((x: any) => typeof x === 'string'));
      }
    }
  }
  return Array.from(new Set(out.map((x) => String(x).trim()).filter(Boolean))).slice(0, 50);
};

// ─── POST /resume (multipart) ────────────────────────────────────────────────
// Optional: upload a resume for a registered candidate. Parsed text feeds the
// AI exam designer (Phase 2). Best-effort parse; never blocks the funnel.
export const uploadAssessmentResume = async (req: Request, res: Response) => {
  try {
    const token = String((req.body || {}).token || '');
    const file = (req as any).file;
    if (!token) return res.status(400).json({ success: false, message: 'token is required' });
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    if (!file) return res.status(400).json({ success: false, message: 'No resume file uploaded' });

    submission.resumeFilePath = file.path;
    try {
      const text = await extractTextFromFile(file.path);
      submission.resumeText = (text || '').slice(0, 20000);
      const sections: any = await parseResumeText(text || '');
      submission.parsedSkills = flattenSkills(sections?.skills);
    } catch (e) { /* parsing best-effort */ }

    await submission.save();
    return res.json({ success: true, message: 'Resume uploaded', data: { parsedSkills: submission.parsedSkills || [] } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Resume upload failed', error: error.message });
  }
};

// ─── POST /verify-otp ────────────────────────────────────────────────────────
export const verifyAssessmentOtp = async (req: Request, res: Response) => {
  try {
    const { token, code } = req.body || {};
    if (!token || !code) return res.status(400).json({ success: false, message: 'token and code are required' });

    const result = await verifyOtp(token, code);
    await AssessmentSubmission.updateOne({ token }, { $inc: { 'otp.attempts': 1 }, $set: { 'otp.lastReason': result } });
    if (result !== 'ok') return res.status(400).json({ success: false, message: 'OTP verification failed', data: { reason: result } });

    await AssessmentSubmission.updateOne({ token }, { $set: { phoneVerified: true, 'otp.verifiedAt': new Date() } });

    // Auto-create the candidate's Student account now that the phone is verified.
    try {
      const submission = await AssessmentSubmission.findOne({ token });
      if (submission && !submission.candidateUserId) {
        const acct = await ensureCandidateAccount(submission);
        if (acct) {
          submission.candidateUserId = acct.userId;
          submission.accountCreatedAt = new Date();
          submission.accountIsNew = acct.isNew;
          await submission.save();
        }
      }
      // Kick off AI exam design in the background so it's ready when they start
      // (resume + profile are both present by now). Falls back to default if late.
      if (submission && !submission.designedBlueprint) {
        designExamForSubmission(String(submission._id)).catch(() => { /* best-effort */ });
      }
    } catch (e) { /* best-effort — never block verification */ }

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
    submission.otp = {
      ...(submission.otp || {}),
      sentAt: new Date(), channel: otp.channel, sent: otp.sent,
      resends: ((submission.otp?.resends) || 0) + 1,
    };
    await submission.save();
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

// Respond with the candidate's current stage (resume / after-compose).
async function respondStage(res: Response, submission: any, message: string) {
  const stages = submission.blueprintSnapshot?.stages || [];
  const cur = submission.currentStage || 0;
  const items = await sanitizeStage(submission, stages[cur]?.order);
  return res.json({
    success: true,
    message,
    data: { items, stage: cur, totalStages: stages.length, isLast: cur >= stages.length - 1, title: submission.blueprintSnapshot?.title, timeLimitMinutes: submission.blueprintSnapshot?.timeLimitMinutes },
  });
}

// ─── POST /start ─────────────────────────────────────────────────────────────
// Composes and returns ONLY the first stage. Concurrency-safe: dev StrictMode
// (and double-clicks) fire this twice — an atomic status claim ensures exactly
// one request composes, and the other resumes the same exam.
export const startAssessment = async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    const submission = await AssessmentSubmission.findOne({ token });
    if (!submission) return res.status(404).json({ success: false, message: 'Session not found' });
    if (!submission.phoneVerified) return res.status(403).json({ success: false, message: 'Phone not verified' });

    // Already composed → resume at the current stage (refresh-safe, read-only).
    if (submission.status !== 'registered' && submission.items.length) {
      return respondStage(res, submission, 'Resumed');
    }

    // If the AI exam design is still in flight, wait briefly (≤3s) so we compose
    // from the personalized blueprint rather than the default fallback.
    if (submission.examDesignStatus === 'pending') {
      for (let i = 0; i < 20; i++) {
        const s = await AssessmentSubmission.findOne({ token }).select('designedBlueprint examDesignStatus').lean();
        if ((s as any)?.designedBlueprint || (s as any)?.examDesignStatus !== 'pending') break;
        await sleep(150);
      }
    }

    // Atomically claim composition — only the first concurrent request wins.
    const claimed = await AssessmentSubmission.findOneAndUpdate(
      { token, status: 'registered' },
      { $set: { status: 'in_progress', startedAt: new Date() } },
      { new: true }
    );

    if (!claimed) {
      // Another request is composing; briefly wait for the items, then resume.
      for (let i = 0; i < 15; i++) {
        const s = await AssessmentSubmission.findOne({ token });
        if (s && s.items.length) return respondStage(res, s, 'Resumed');
        await sleep(150);
      }
      return res.status(503).json({ success: false, message: 'Assessment is initializing, please retry.' });
    }

    const resolved = await resolveBlueprint(claimed.tenantId, claimed.candidate.segment, claimed.designedBlueprint);
    if (!resolved.stages.length) return res.status(503).json({ success: false, message: 'No blueprint configured' });

    const used = new Set<string>();
    const stage0 = await composeStage(claimed.tenantId, resolved.stages[0], claimed.isMobile, 0, used);
    if (!stage0.length) {
      // Release the claim so a retry (e.g. after seeding items) can compose.
      await AssessmentSubmission.updateOne({ token }, { $set: { status: 'registered' } });
      return res.status(503).json({ success: false, message: 'No assessment items available yet' });
    }

    // Persist via updateOne (atomic) rather than doc.save() to avoid version races.
    await AssessmentSubmission.updateOne(
      { token },
      {
        $set: {
          items: stage0,
          blueprintId: resolved.blueprintId,
          currentStage: 0,
          blueprintSnapshot: { title: resolved.title, timeLimitMinutes: resolved.timeLimitMinutes, dimensions: resolved.dimensions, stages: resolved.stages, isMobile: claimed.isMobile },
        },
      }
    );

    const fresh = await AssessmentSubmission.findOne({ token });
    return respondStage(res, fresh, 'Started');
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
    // Enroll the candidate's account in the recommended plan (preview/locked).
    try { await enrollCandidateInRoadmapPlan(submission); } catch (e) { /* best-effort */ }
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
    // true = we created a fresh account (credentials emailed); false = they
    // already had an account (log in with existing). Drives the Result CTA.
    newAccount: submission.accountIsNew !== false,
    hasEmail: !!submission.candidate?.email,
  };
}
