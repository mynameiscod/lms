import express, { Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { AuthenticatedRequest } from '../types';
import LeadAutomationConfig from '../models/LeadAutomationConfig';
import { getRules, mergeRules } from '../services/leadAutomationService';

/** CRM automation rules — mounted at /lead-automation. */
const router = express.Router();
const guard = [authMiddleware, tenantResolver, roleGuard(['manage_leads'])];

router.get('/', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await getRules(String(req.tenantId)) }); }
  catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = mergeRules({ ...(await getRules(String(req.tenantId))), ...(req.body?.rules || {}) });
    await LeadAutomationConfig.updateOne({ tenantId: req.tenantId }, { $set: { rules, updatedBy: req.user!.id } }, { upsert: true });
    res.json({ success: true, data: rules });
  } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
