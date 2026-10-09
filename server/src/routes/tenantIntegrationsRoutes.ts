import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/tenantIntegrationsService';

/**
 * Settings → Integrations — the institute admin's own payment, email and ad accounts.
 * Always the caller's own institute (token), never another.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_tenant_settings', 'manage_tenant']));

const tId = (req: Request) => (req as any).tenantId as string;
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e: any) {
    const status = e instanceof svc.IntegrationsError ? e.status : 500;
    if (status === 500) console.error('[integrations]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

router.get('/', wrap((req) => svc.getIntegrations(tId(req))));
router.put('/', wrap((req) => svc.saveIntegrations(tId(req), (req as any).user?.id, req.body?.values || {})));
router.post('/test/razorpay', wrap((req) => svc.testRazorpay(tId(req))));
router.post('/test/email', wrap((req) => svc.testEmail(tId(req), String(req.body?.to || ''))));

export default router;
