import express, { Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { AuthenticatedRequest } from '../types';
import LeadSavedView from '../models/LeadSavedView';

/**
 * Saved views for the Leads list — mounted at /lead-views.
 * A view is a plain filter map; only these keys are kept, as short strings, so a view can
 * never smuggle a query operator into the list endpoint.
 */
const router = express.Router();
const guard = [authMiddleware, tenantResolver, roleGuard(['view_leads', 'manage_leads'])];

const FILTER_KEYS = ['tab', 'rangeKey', 'stageId', 'subStageId', 'milestone', 'source', 'assignedTo', 'priority', 'adId', 'reEnquiry',
  'search', 'dateFrom', 'dateTo', 'datePreset', 'course', 'campaign', 'followUp', 'sort', 'dir'];
const cleanFilters = (raw: any): Record<string, string> => {
  const out: Record<string, string> = {};
  if (raw && typeof raw === 'object') {
    for (const k of FILTER_KEYS) {
      const v = raw[k];
      if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200);
    }
  }
  return out;
};
const isAdmin = (req: AuthenticatedRequest) => ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(req.user!.role);

/** GET / — my views + views others shared. */
router.get('/', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const views = await LeadSavedView.find({ tenantId: req.tenantId, $or: [{ userId: req.user!.id }, { shared: true }] })
      .sort({ name: 1 }).populate('userId', 'firstName lastName').lean();
    res.json({ success: true, data: views.map((v: any) => ({ ...v, mine: String(v.userId?._id || v.userId) === String(req.user!.id) })) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** POST /  { name, filters, shared } — saving with an existing name of mine replaces it. */
router.post('/', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
    if (!name) return res.status(400).json({ success: false, message: 'Give the view a name' });
    const shared = !!req.body?.shared && isAdmin(req);
    const view = await LeadSavedView.findOneAndUpdate(
      { tenantId: req.tenantId, userId: req.user!.id, name },
      { $set: { filters: cleanFilters(req.body?.filters), shared } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ success: true, data: view });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** DELETE /:id — my own view (an admin may also remove a shared one). */
router.delete('/:id', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid view' });
    const q: any = { _id: req.params.id, tenantId: req.tenantId };
    if (!isAdmin(req)) q.userId = req.user!.id;
    const r = await LeadSavedView.deleteOne(q);
    if (!r.deletedCount) return res.status(404).json({ success: false, message: 'View not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
