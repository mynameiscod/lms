import { Response } from 'express';
import AssessmentSubmission from '../models/AssessmentSubmission';
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
