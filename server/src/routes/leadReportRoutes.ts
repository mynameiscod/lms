import express, { Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { buildLeadScopeFilter } from '../middleware/leadScope';
import { AuthenticatedRequest } from '../types';
import { admissionsReport } from '../services/admissionsReportService';

/** Admissions reports — mounted at /lead-reports. */
const router = express.Router();

/** GET /admissions?from=YYYY-MM-DD&to=YYYY-MM-DD&assignedTo=&source= (max 366 days) */
router.get('/admissions', authMiddleware, tenantResolver, roleGuard(['view_lead_analytics', 'manage_leads']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const to = q.to ? new Date(`${q.to}T23:59:59.999+05:30`) : new Date();
    const from = q.from ? new Date(`${q.from}T00:00:00.000+05:30`) : new Date(to.getTime() - 29 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }
    if (to.getTime() - from.getTime() > 366 * 86_400_000) return res.status(400).json({ success: false, message: 'Pick at most one year' });
    const data = await admissionsReport({
      tenantId: String(req.tenantId), from, to, scope: await buildLeadScopeFilter(req),
      assignedTo: q.assignedTo || undefined, source: q.source || undefined,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to build the report' });
  }
});

export default router;
