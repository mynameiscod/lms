import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../types';
import CandidateProofProfile from '../models/CandidateProofProfile';
import { buildProofProfile } from '../services/candidateProofService';
import * as settings from '../services/settingsService';

const publicBase = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://platform.codebegun.com').replace(/\/$/, '');
const linkFor = (token: string) => `${publicBase()}/candidate/${token}`;
const tId = (req: AuthenticatedRequest) => req.user!.tenantId as string;

// GET /candidate-proof/:studentId — admin: existing share link (if any) + a live preview
export const getProof = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const tenantId = tId(req);
    const [rec, profile] = await Promise.all([
      CandidateProofProfile.findOne({ tenantId, studentId }),
      buildProofProfile(studentId, tenantId),
    ]);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({
      success: true,
      data: {
        published: !!rec?.published,
        shareToken: rec?.shareToken || null,
        url: rec?.shareToken ? linkFor(rec.shareToken) : null,
        views: rec?.views || 0,
        profile,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Failed to load proof profile' });
  }
};

// POST /candidate-proof/:studentId/publish — admin: mint/return a share link
export const publishProof = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const tenantId = tId(req);
    const profile = await buildProofProfile(studentId, tenantId);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });
    let rec = await CandidateProofProfile.findOne({ tenantId, studentId });
    if (!rec) rec = new CandidateProofProfile({ tenantId, studentId });
    if (!rec.shareToken) rec.shareToken = crypto.randomBytes(16).toString('base64url');
    rec.published = true;
    rec.sharedBy = req.user?.id as any;
    rec.sharedAt = new Date();
    await rec.save();
    res.json({ success: true, data: { shareToken: rec.shareToken, url: linkFor(rec.shareToken) } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Failed to publish' });
  }
};

// POST /candidate-proof/:studentId/unpublish — admin: disable the link
export const unpublishProof = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await CandidateProofProfile.updateOne({ tenantId: tId(req), studentId: req.params.studentId }, { $set: { published: false } });
    res.json({ success: true, message: 'Share link disabled' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Failed' });
  }
};

// GET /public/proof/:token — PUBLIC (no auth): the HR-facing candidate profile
export const getPublicProof = async (req: any, res: Response) => {
  try {
    const { token } = req.params;
    const rec = await CandidateProofProfile.findOne({ shareToken: token, published: true });
    if (!rec) return res.status(404).json({ success: false, message: 'This profile link is not available.' });
    const tenantId = rec.tenantId.toString();
    const profile = await buildProofProfile(rec.studentId.toString(), tenantId);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not available.' });
    CandidateProofProfile.updateOne({ _id: rec._id }, { $inc: { views: 1 } }).catch(() => {});
    // Contact is routed through CodeBegun — never the student's raw email/phone.
    const contact = {
      via: settings.getStr('PLACEMENT_SENDER_NAME', 'CodeBegun Placements', tenantId) || 'CodeBegun Placements',
      email: settings.getStr('EMAIL_USER', 'contact@codebegun.com', tenantId) || 'contact@codebegun.com',
    };
    res.json({ success: true, data: { profile, contact } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Failed' });
  }
};
