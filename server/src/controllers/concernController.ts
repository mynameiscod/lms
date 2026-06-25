import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Concern from '../models/Concern';
import User from '../models/User';

const VALID_CATEGORIES = ['content', 'technical', 'mentor', 'payment', 'other'];

// ─── Student: raise a concern ────────────────────────────────────────────────
export const createConcern = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { category, message, context } = req.body || {};
    if (!message || !String(message).trim()) return res.status(400).json({ success: false, message: 'A message is required' });

    const user = await User.findById(userId).select('firstName lastName name email').lean<any>();
    const concern = await Concern.create({
      tenantId,
      studentId: userId,
      studentName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name : undefined,
      studentEmail: user?.email,
      category: VALID_CATEGORIES.includes(category) ? category : 'other',
      message: String(message).slice(0, 2000),
      context: context && typeof context === 'object' ? context : undefined,
      status: 'open',
    });
    res.status(201).json({ success: true, message: 'Your concern has been raised. A mentor will get back to you.', data: concern });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to raise concern', error: e.message });
  }
};

// ─── Student: my concerns ────────────────────────────────────────────────────
export const getMyConcerns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = req.user?.id;
    const rows = await Concern.find({ tenantId, studentId: userId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch concerns', error: e.message });
  }
};

// ─── Mentor/admin: list concerns ─────────────────────────────────────────────
export const listConcerns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role === 'STUDENT') return res.status(403).json({ success: false, message: 'Forbidden' });
    const tenantId = (req as any).tenantId;
    const { status } = req.query as any;
    const filter: any = { tenantId };
    if (status) filter.status = status;
    const [rows, openCount] = await Promise.all([
      Concern.find(filter).sort({ createdAt: -1 }).limit(300).populate('studentId', 'firstName lastName email').lean(),
      Concern.countDocuments({ tenantId, status: 'open' }),
    ]);
    res.json({ success: true, data: rows, openCount });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch concerns', error: e.message });
  }
};

// ─── Mentor/admin: respond / update status ───────────────────────────────────
export const respondConcern = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role === 'STUDENT') return res.status(403).json({ success: false, message: 'Forbidden' });
    const tenantId = (req as any).tenantId;
    const { response, status } = req.body || {};
    const set: any = {};
    if (response !== undefined) { set.response = String(response).slice(0, 2000); set.respondedBy = req.user?.id; set.respondedAt = new Date(); }
    if (status && ['open', 'in_progress', 'resolved'].includes(status)) set.status = status;
    if (!Object.keys(set).length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    const concern = await Concern.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: set }, { new: true });
    if (!concern) return res.status(404).json({ success: false, message: 'Concern not found' });
    res.json({ success: true, message: 'Updated', data: concern });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to update concern', error: e.message });
  }
};
