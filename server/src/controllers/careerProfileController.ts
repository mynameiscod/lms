import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CareerProfile from '../models/CareerProfile';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import { reviewResume, reviewGithub, reviewLinkedin, parseGithubUsername, regenerateSection } from '../services/careerReviewService';

const PILLARS = ['resume', 'github', 'linkedin'];
async function githubToken(studentId: string): Promise<string | undefined> {
  try {
    const sp: any = await StudentProfile.findOne({ userId: new mongoose.Types.ObjectId(studentId) }).select('+oauthConnections.github.accessToken').lean();
    return sp?.oauthConnections?.github?.accessToken;
  } catch { return undefined; }
}

const tenantId = (req: Request): string => (req as any).tenantId || (req as any).user?.tenantId || '';
const userId = (req: Request): string => (req as any).user?.id || '';
const oid = (s: string) => new mongoose.Types.ObjectId(s);

// ── Student: get (or create) my career profile ───────────────────────────────
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req); const sId = userId(req);
    let cp = await CareerProfile.findOne({ tenantId: oid(tId), studentId: oid(sId) });
    if (!cp) {
      const user = await User.findById(sId).select('firstName lastName email batchId').lean() as any;
      let batchName: string | undefined;
      if (user?.batchId) { const b: any = await mongoose.model('Batch').findById(user.batchId).select('name').lean(); batchName = b?.name; }
      cp = await CareerProfile.create({
        tenantId: oid(tId), studentId: oid(sId),
        studentName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), studentEmail: user?.email || '',
        batchId: user?.batchId, batchName,
      });
    }
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Student: update my inputs ─────────────────────────────────────────────────
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req); const sId = userId(req);
    const { targetRole, githubUrl, linkedinUrl, linkedinPasted } = req.body;
    const set: any = {};
    if (targetRole !== undefined) set.targetRole = targetRole;
    if (githubUrl !== undefined) { set.githubUrl = githubUrl; set.githubUsername = parseGithubUsername(githubUrl); }
    if (linkedinUrl !== undefined) set.linkedinUrl = linkedinUrl;
    if (linkedinPasted !== undefined) set.linkedinPasted = linkedinPasted;
    const cp = await CareerProfile.findOneAndUpdate({ tenantId: oid(tId), studentId: oid(sId) }, { $set: set }, { new: true, upsert: true });
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Student: run the AI review across all three pillars ───────────────────────
export const runReview = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req); const sId = userId(req);
    const cp = await CareerProfile.findOne({ tenantId: oid(tId), studentId: oid(sId) });
    if (!cp) return res.status(404).json({ success: false, message: 'Profile not found' });

    const ghToken = await githubToken(sId);
    const tr = cp.targetRole || '';
    const [r1, r2, r3] = await Promise.allSettled([
      reviewResume(tr, sId, tId),
      cp.githubUsername ? reviewGithub(tr, cp.githubUsername, ghToken) : Promise.resolve(null),
      reviewLinkedin(tr, cp.linkedinPasted || ''),
    ]);

    if (r1.status === 'fulfilled' && r1.value) {
      cp.resume = { score: r1.value.score, issues: r1.value.issues, improved: r1.value.improved, reviewedAt: new Date() } as any;
      if ((r1.value as any).resumeId) cp.resumeId = (r1.value as any).resumeId;
    } else if (r1.status === 'rejected') {
      cp.resume = { score: 0, issues: [{ area: 'Resume', problem: 'Review failed', fix: String((r1 as any).reason?.message || r1.reason), severity: 'high' }], improved: {}, reviewedAt: new Date() } as any;
    }
    if (r2.status === 'fulfilled' && r2.value) {
      cp.github = { score: r2.value.score, issues: r2.value.issues, improved: r2.value.improved, checklist: (r2.value as any).checklist, reviewedAt: new Date() } as any;
    } else if (r2.status === 'rejected') {
      cp.github = { score: 0, issues: [{ area: 'GitHub', problem: 'Review failed', fix: String((r2 as any).reason?.message || r2.reason), severity: 'high' }], improved: {}, reviewedAt: new Date() } as any;
    }
    if (r3.status === 'fulfilled' && r3.value) {
      cp.linkedin = { score: r3.value.score, issues: r3.value.issues, improved: r3.value.improved, reviewedAt: new Date() } as any;
    } else if (r3.status === 'rejected') {
      cp.linkedin = { score: 0, issues: [{ area: 'LinkedIn', problem: 'Review failed', fix: String((r3 as any).reason?.message || r3.reason), severity: 'high' }], improved: {}, reviewedAt: new Date() } as any;
    }

    cp.markModified('resume'); cp.markModified('github'); cp.markModified('linkedin');
    cp.status = cp.status === 'completed' ? 'completed' : 'submitted';
    cp.lastReviewRunAt = new Date();
    await cp.save();
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Admin: list / get ─────────────────────────────────────────────────────────
export const listProfiles = async (req: Request, res: Response) => {
  try {
    const filter: any = { tenantId: oid(tenantId(req)) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.batchId) filter.batchId = oid(String(req.query.batchId));
    if (req.query.search) filter.studentName = { $regex: req.query.search, $options: 'i' };
    const rows = await CareerProfile.find(filter).sort({ updatedAt: -1 }).limit(300).lean();
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const getProfileById = async (req: Request, res: Response) => {
  try {
    const cp = await CareerProfile.findOne({ _id: req.params.id, tenantId: oid(tenantId(req)) }).lean();
    if (!cp) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Admin: edit a pillar's improved content / status / notes / regenerate ─────
export const updatePillar = async (req: Request, res: Response) => {
  try {
    const pillar = req.params.pillar as 'resume' | 'github' | 'linkedin';
    if (!['resume', 'github', 'linkedin'].includes(pillar)) return res.status(400).json({ success: false, message: 'Bad pillar' });
    const cp = await CareerProfile.findOne({ _id: req.params.id, tenantId: oid(tenantId(req)) });
    if (!cp) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.improved !== undefined) { (cp as any)[pillar].improved = req.body.improved; cp.markModified(`${pillar}.improved`); }
    await cp.save();
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Phase 2: regenerate a single section (student = own profile, admin = by id) ─
async function doRegenSection(cp: any, pillar: string, section: string, useToken: boolean) {
  const ghToken = useToken ? await githubToken(cp.studentId.toString()) : undefined;
  const value = await regenerateSection(pillar as any, section, {
    targetRole: cp.targetRole || '', studentId: cp.studentId.toString(), tenantId: cp.tenantId.toString(),
    githubUsername: cp.githubUsername, githubToken: ghToken, linkedinPasted: cp.linkedinPasted || '',
    currentImproved: cp[pillar]?.improved || {},
  });
  cp[pillar].improved = { ...(cp[pillar].improved || {}), [section]: value };
  cp.markModified(`${pillar}.improved`);
  await cp.save();
}

export const regenerateMySection = async (req: Request, res: Response) => {
  try {
    const { pillar, section } = req.params;
    if (!PILLARS.includes(pillar)) return res.status(400).json({ success: false, message: 'Bad pillar' });
    const cp = await CareerProfile.findOne({ tenantId: oid(tenantId(req)), studentId: oid(userId(req)) });
    if (!cp) return res.status(404).json({ success: false, message: 'Not found' });
    await doRegenSection(cp, pillar, section, true);
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const regenerateSectionAdmin = async (req: Request, res: Response) => {
  try {
    const { pillar, section } = req.params;
    if (!PILLARS.includes(pillar)) return res.status(400).json({ success: false, message: 'Bad pillar' });
    const cp = await CareerProfile.findOne({ _id: req.params.id, tenantId: oid(tenantId(req)) });
    if (!cp) return res.status(404).json({ success: false, message: 'Not found' });
    await doRegenSection(cp, pillar, section, true);
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const regeneratePillar = async (req: Request, res: Response) => {
  try {
    const pillar = req.params.pillar as 'resume' | 'github' | 'linkedin';
    const cp = await CareerProfile.findOne({ _id: req.params.id, tenantId: oid(tenantId(req)) });
    if (!cp) return res.status(404).json({ success: false, message: 'Not found' });
    const tr = cp.targetRole || '';
    let out: any;
    if (pillar === 'resume') out = await reviewResume(tr, cp.studentId.toString(), cp.tenantId.toString());
    else if (pillar === 'github') out = cp.githubUsername ? await reviewGithub(tr, cp.githubUsername) : null;
    else out = await reviewLinkedin(tr, cp.linkedinPasted || '');
    if (out) { (cp as any)[pillar] = { score: out.score, issues: out.issues, improved: out.improved, checklist: out.checklist, reviewedAt: new Date() }; cp.markModified(pillar); }
    await cp.save();
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const updateReview = async (req: Request, res: Response) => {
  try {
    const cp = await CareerProfile.findOne({ _id: req.params.id, tenantId: oid(tenantId(req)) });
    if (!cp) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.status) cp.status = req.body.status;
    if (req.body.reviewerNotes !== undefined) cp.reviewerNotes = req.body.reviewerNotes;
    if (req.body.status === 'reviewed' || req.body.status === 'completed') { cp.reviewedBy = oid(userId(req)); cp.reviewedAt = new Date(); }
    await cp.save();
    res.json({ success: true, data: cp });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
