/**
 * /lead-assignment — the one Lead Assignment setting (manual | round robin | rules).
 * Replaces /lead-distribution-config and Lead Scoring's assignment tab (2026-11-09).
 */
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { getAssignmentConfig, saveAssignmentConfig } from '../services/leadAssignmentService';
import { listCounsellors } from '../services/leadCounsellorService';

const router = express.Router();
router.use(authMiddleware, tenantResolver);

const present = (c: any) => ({
  mode: c.mode,
  members: (c.members || []).map((m: any) => ({ userId: String(m.userId), available: m.available !== false, maxPerDay: m.maxPerDay ?? null })),
  rules: (c.rules || []).map((r: any) => ({ name: r.name, enabled: r.enabled !== false, sources: r.sources || [], courses: r.courses || [], members: (r.members || []).map(String) })),
  updatedAt: c.updatedAt,
});

router.get('/', roleGuard(['manage_leads']), async (req: any, res) => {
  try {
    const tenantId = String(req.tenantId);
    const [config, counsellors] = await Promise.all([getAssignmentConfig(tenantId), listCounsellors(tenantId)]);
    res.json({ success: true, data: { ...present(config), counsellors } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message || 'Could not load lead assignment' }); }
});

router.put('/', roleGuard(['manage_leads']), async (req: any, res) => {
  try {
    const saved = await saveAssignmentConfig(String(req.tenantId), req.body, String(req.user.id));
    res.json({ success: true, message: 'Lead assignment saved', data: present(saved) });
  } catch (e: any) { res.status(e.status || 500).json({ success: false, message: e.message || 'Could not save' }); }
});

export default router;
