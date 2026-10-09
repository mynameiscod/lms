import express, { Request, Response } from 'express';
import * as calls from '../services/outperoCallService';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/outperoForwardService';
import { leadFilterOptions } from '../services/whatsAppTemplateService';

/**
 * Leads → Outpero (AI calling). Lead administrators only: this decides which people get an
 * automated phone call, and holds the Outpero secret.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_leads']));

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e: any) {
    const status = e instanceof svc.OutperoError ? e.status : 500;
    if (status === 500) console.error('[outpero]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};
const strs = (v: any) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 50) : []);
const filter = (b: any): svc.BulkFilter => ({ stageIds: strs(b?.stageIds), sources: strs(b?.sources), courses: strs(b?.courses), includeAlreadySent: !!b?.includeAlreadySent });

router.get('/config', wrap(async (req) => ({ config: svc.getConfig(tId(req)), options: await leadFilterOptions(tId(req)) })));
router.put('/config', wrap((req) => svc.saveConfig(tId(req), uId(req), {
  mode: req.body?.mode, endpointUrl: req.body?.endpointUrl,
  secret: req.body?.secret === undefined || req.body?.secret === null ? undefined : String(req.body.secret),
  sources: strs(req.body?.sources), courses: strs(req.body?.courses), perMinute: req.body?.perMinute,
})));
router.get('/stats', wrap((req) => svc.stats(tId(req))));
router.post('/test', wrap((req) => svc.testSend(tId(req), req.body || {})));
router.post('/bulk/preview', wrap((req) => svc.previewBulk(tId(req), filter(req.body))));
router.post('/bulk', wrap((req) => svc.startBulk(tId(req), filter(req.body))));
router.post('/cancel-pending', wrap((req) => svc.cancelPending(tId(req))));
router.post('/retry-failed', wrap((req) => svc.retryFailed(tId(req))));

// Call results coming back (post-call webhook): the address to paste into Outpero, and what arrived.
router.get('/webhook', wrap((req) => calls.webhookFor(tId(req), uId(req))));
router.post('/webhook/rotate', wrap((req) => calls.webhookFor(tId(req), uId(req), true)));
router.get('/calls', wrap((req) => calls.recentCalls(tId(req))));
router.get('/calls/latest-raw', wrap((req) => calls.latestRaw(tId(req))));

export default router;
