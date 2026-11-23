import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/callyzerService';

/**
 * Leads → Callyzer calls (admin). Lead administrators only: it holds the Callyzer API key and
 * decides whose phone calls land on which counsellor.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_leads']));

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const wrap = (fn: (req: Request) => Promise<any> | any) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e: any) {
    const status = e instanceof svc.CallyzerError ? e.status : 500;
    if (status === 500) console.error('[callyzer]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

router.get('/config', wrap(async (req) => ({
  config: svc.getConfig(tId(req)),
  webhook: await svc.webhookFor(tId(req), uId(req)),
  lastSync: svc.lastSync(tId(req)),
  lastDelivery: svc.lastDelivery(tId(req)),
})));
router.put('/config', wrap((req) => svc.saveConfig(tId(req), uId(req), {
  enabled: !!req.body?.enabled,
  env: String(req.body?.env || 'sandbox'),
  apiKey: req.body?.apiKey === undefined || req.body?.apiKey === null || req.body?.apiKey === '' ? undefined : String(req.body.apiKey),
  keepRecordings: req.body?.keepRecordings !== false,
})));
router.post('/test', wrap((req) => svc.testConnection(tId(req))));
router.post('/webhook/rotate', wrap((req) => svc.webhookFor(tId(req), uId(req), true)));
router.get('/employees', wrap((req) => svc.employees(tId(req))));
router.put('/employees/:number', wrap((req) => svc.saveEmployeeOverride(tId(req), uId(req), String(req.params.number), req.body?.staffId ? String(req.body.staffId) : null)));
router.post('/sync', wrap((req) => (req.body?.days ? svc.backfill(tId(req), Number(req.body.days)) : svc.syncTenant(tId(req)))));
router.get('/calls', wrap((req) => svc.recentCalls(tId(req))));

export default router;
