import { Response } from 'express';
import mongoose from 'mongoose';
import AssessmentSubmission from '../models/AssessmentSubmission';
import User from '../models/User';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import Payment from '../models/Payment';
import PlacementPartner from '../models/PlacementPartner';
import Lead from '../models/Lead';
import { AuthenticatedRequest } from '../types';
import { unlockCandidatePlans } from '../services/assessmentEnrollmentService';

/**
 * Team-facing view of assessment candidates: who registered, who's mid-exam
 * (so the team can nudge/call), who finished, their Readiness + roadmap, plus an
 * "unlock full content" action after a sale.
 */

const esc = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listAssessmentCandidates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const { status, segment, search } = req.query as any;
    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (segment) filter['candidate.segment'] = segment;
    if (search) {
      const rx = { $regex: esc(search), $options: 'i' };
      filter.$or = [{ 'candidate.name': rx }, { 'candidate.phone': rx }, { 'candidate.email': rx }];
    }

    const subs = await AssessmentSubmission.find(filter)
      .sort({ updatedAt: -1 })
      .limit(500)
      .select('candidate status readinessScore percentile items roadmap leadId candidateUserId createdAt submittedAt')
      .lean();

    const rows = subs.map((s: any) => {
      const items = s.items || [];
      const answered = items.filter((i: any) =>
        i.graded || i.selectedOptionIds?.length || i.predictedOutput || i.identifiedLine != null || i.code || (i.blankAnswers && Object.keys(i.blankAnswers).length)
      ).length;
      const total = items.length;
      return {
        id: String(s._id),
        name: s.candidate?.name,
        phone: s.candidate?.phone,
        email: s.candidate?.email,
        segment: s.candidate?.segment,
        primaryLanguage: s.candidate?.primaryLanguage,
        yearsExperience: s.candidate?.yearsExperience,
        status: s.status,
        progress: total ? Math.round((answered / total) * 100) : 0,
        answered,
        total,
        readinessScore: s.readinessScore,
        percentile: s.percentile,
        roadmapPlan: s.roadmap?.planTitle,
        leadId: s.leadId ? String(s.leadId) : null,
        userId: s.candidateUserId ? String(s.candidateUserId) : null,
        createdAt: s.createdAt,
        submittedAt: s.submittedAt,
      };
    });

    res.json({ success: true, message: 'Candidates fetched', data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch candidates', error: e.message });
  }
};

export const getCandidateStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const agg = await AssessmentSubmission.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus: Record<string, number> = {};
    agg.forEach((a: any) => { byStatus[a._id] = a.count; });
    res.json({ success: true, message: 'Stats', data: { byStatus } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: e.message });
  }
};

/**
 * Full per-candidate journey for the founder/admin debug view: first touch
 * (ad/media) → registration → OTP → account → exam → score → roadmap → enrol →
 * payment → learning → interviews → placed. Each step has a status + timestamp +
 * human detail (and failure reason where relevant), so it's obvious exactly
 * where a candidate is — or where they got stuck.
 */
export const getCandidateJourney = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const sub: any = await AssessmentSubmission.findOne({ _id: req.params.id, tenantId }).lean();
    if (!sub) return res.status(404).json({ success: false, message: 'Candidate not found' });

    const uid = sub.candidateUserId ? new mongoose.Types.ObjectId(sub.candidateUserId) : null;
    const [user, enrollment, payment, placement, lead] = await Promise.all([
      uid ? User.findById(uid).select('email firstName lastName isActive role createdAt').lean<any>() : null,
      uid ? CurriculumEnrollment.findOne({ studentId: uid }).sort({ createdAt: -1 }).lean<any>() : null,
      uid ? Payment.findOne({ studentId: uid, status: 'paid' }).sort({ paidAt: -1 }).lean<any>() : null,
      uid ? PlacementPartner.findOne({ tenantId, 'placement.studentId': uid }).lean<any>() : null,
      sub.leadId ? Lead.findById(sub.leadId).lean<any>().catch(() => null) : null,
    ]);

    const utm = sub.utmParams || {};
    const src = sub.sourceDetails || {};
    const answered = (sub.items || []).filter((i: any) =>
      i.graded || i.selectedOptionIds?.length || i.predictedOutput || i.identifiedLine != null || i.code || (i.blankAnswers && Object.keys(i.blankAnswers).length)
    ).length;
    const totalItems = (sub.items || []).length;

    // Where did they come from? (register page stores UTMs with the utm_ prefix
    // stripped, so accept both key styles.)
    const refHost = (() => { try { return src.referrer ? new URL(String(src.referrer)).hostname : null; } catch { return null; } })();
    const attribution = {
      segment: sub.candidate?.segment || null,
      source: utm.utm_source || utm.source || refHost || 'direct',
      medium: utm.utm_medium || utm.medium || null,
      campaign: utm.utm_campaign || utm.campaign || null,
      ad: utm.utm_content || utm.content || utm.utm_term || utm.term || null,
      referrer: src.referrer || null,
      device: sub.isMobile ? 'mobile' : 'desktop',
      landedAt: src.landedAt || sub.createdAt,
    };

    const s = (status: string, at: any, detail?: string, meta?: any) => ({ status, at: at || null, detail, ...(meta ? { meta } : {}) });
    const otp = sub.otp || {};

    const steps = [
      { key: 'source', label: 'First touch — ad / media', ...s('done', attribution.landedAt,
        `${attribution.source}${attribution.medium ? ' · ' + attribution.medium : ''}${attribution.campaign ? ' · campaign: ' + attribution.campaign : ''}${attribution.ad ? ' · ad: ' + attribution.ad : ''} · segment: ${attribution.segment} · ${attribution.device}`) },
      { key: 'register', label: 'Registered', ...s('done', sub.createdAt,
        `${sub.candidate?.name || ''} · ${sub.candidate?.email || 'no email'} · ${sub.candidate?.phone || ''}`) },
      { key: 'otp_sent', label: 'OTP sent', ...s(
        otp.sentAt ? (otp.sent ? 'done' : 'failed') : (sub.phoneVerified ? 'done' : 'pending'),
        otp.sentAt,
        otp.sent === false ? '⚠ WhatsApp send failed → dev-mode code shown (check WhatsApp billing / verified recipient)' : `via ${otp.channel || 'whatsapp'}${otp.resends ? ` · ${otp.resends} resend(s)` : ''}`) },
      { key: 'otp_verified', label: 'Phone verified', ...s(
        sub.phoneVerified ? 'done' : 'pending', otp.verifiedAt,
        sub.phoneVerified ? `verified${otp.attempts ? ` after ${otp.attempts} attempt(s)` : ''}` : (otp.lastReason && otp.lastReason !== 'ok' ? `last attempt: ${otp.lastReason} (${otp.attempts || 0} tries)` : 'not yet verified')) },
      { key: 'account', label: 'Student account created', ...s(
        sub.candidateUserId ? 'done' : 'pending', sub.accountCreatedAt,
        user ? `${user.email} · ${user.role}${user.isActive ? '' : ' · INACTIVE'}` : (sub.candidateUserId ? 'account linked' : 'not created')) },
      { key: 'exam_started', label: 'Exam started', ...s(
        sub.startedAt ? 'done' : (sub.phoneVerified ? 'pending' : 'skipped'), sub.startedAt,
        sub.examDesignStatus ? `exam design: ${sub.examDesignStatus}` : undefined) },
      { key: 'exam_submitted', label: 'Exam submitted', ...s(
        sub.status === 'submitted' ? 'done' : (sub.status === 'in_progress' ? 'pending' : 'skipped'), sub.submittedAt,
        totalItems ? `${answered}/${totalItems} questions answered` : undefined) },
      { key: 'scored', label: 'Scored', ...s(
        sub.readinessScore != null ? 'done' : 'pending', sub.submittedAt,
        sub.readinessScore != null ? `readiness ${sub.readinessScore}%${sub.percentile != null ? ` · ${sub.percentile}th percentile` : ''}` : undefined) },
      { key: 'roadmap', label: 'AI roadmap generated', ...s(
        sub.roadmap?.planTitle ? 'done' : 'pending', sub.roadmap?.generatedAt,
        sub.roadmap?.planTitle ? `${sub.roadmap.planTitle}${sub.roadmap.salaryBand ? ' · ' + sub.roadmap.salaryBand : ''}` : undefined) },
      { key: 'enrolled', label: 'Enrolled in plan', ...s(
        enrollment ? 'done' : 'pending', enrollment?.createdAt,
        enrollment ? `${enrollment.curriculumTitle || 'plan'}${enrollment.previewOnly ? ' · preview (locked)' : ' · full access'}` : 'not enrolled') },
      { key: 'payment', label: 'Payment / unlock', ...s(
        payment ? 'done' : (enrollment?.previewOnly === false ? 'done' : 'pending'), payment?.paidAt,
        payment ? `paid ₹${Math.round((payment.amount || 0) / 100)}` : (enrollment && !enrollment.previewOnly ? 'unlocked (manual)' : 'not paid')) },
      { key: 'learning', label: 'Learning progress', ...s(
        enrollment && (enrollment.completedDays?.length) ? 'done' : (enrollment ? 'pending' : 'skipped'), enrollment?.lastActivityAt,
        enrollment ? `${enrollment.completedDays?.length || 0}/${enrollment.totalDays || '?'} days completed` : undefined) },
      { key: 'placed', label: 'Placed', ...s(
        placement ? 'done' : 'pending', placement?.placement?.placedAt,
        placement ? `${placement.companyName}${placement.placement?.ctc ? ` · ₹${placement.placement.ctc} LPA` : ''}` : 'not yet placed') },
    ];

    res.json({
      success: true,
      data: {
        candidate: { id: String(sub._id), name: sub.candidate?.name, email: sub.candidate?.email, phone: sub.candidate?.phone, status: sub.status, userId: sub.candidateUserId ? String(sub.candidateUserId) : null, leadId: sub.leadId ? String(sub.leadId) : null },
        attribution,
        lead: lead ? { source: lead.source, stage: lead.stage, status: lead.status } : null,
        steps,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to build journey', error: e.message });
  }
};

/** Unlock full learning content for a candidate's account (after a sale). */
export const unlockCandidate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const userId = String((req.body || {}).userId || '');
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    const unlocked = await unlockCandidatePlans(tenantId, userId);
    res.json({ success: true, message: `Unlocked ${unlocked} plan(s)`, data: { unlocked } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Unlock failed', error: e.message });
  }
};
