import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as svc from '../services/leadArchiveService';

/**
 * Leads → Archive. Admins only (permission archive_leads): archive by filter after a preview,
 * restore, see past runs, and — three years after archiving — delete permanently.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware, roleGuard(['archive_leads']));

const tId = (req: Request) => String((req as any).tenantId || '');
const uId = (req: Request) => String((req as any).user?.id || '');
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e: any) {
    const status = e instanceof svc.ArchiveError ? e.status : 500;
    if (status === 500) console.error('[lead-archive]', e);
    res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong. Please try again.' : e.message });
  }
};

router.get('/options', wrap((req) => svc.filterOptions(tId(req))));
router.post('/preview', wrap((req) => svc.previewArchive(tId(req), req.body || {})));
router.post('/run', wrap((req) => svc.startArchive(tId(req), uId(req), req.body || {})));
router.get('/runs', wrap((req) => svc.listRuns(tId(req))));
router.get('/runs/:id', wrap((req) => svc.getRun(tId(req), String(req.params.id))));
router.get('/archived', wrap((req) => svc.listArchived(tId(req), {
  search: req.query.search ? String(req.query.search) : undefined,
  page: Number(req.query.page) || 1,
  runId: req.query.runId ? String(req.query.runId) : undefined,
})));
router.post('/restore', wrap((req) => svc.restore(tId(req), uId(req), req.body || {})));
router.get('/purge/preview', wrap((req) => svc.previewPurge(tId(req))));
router.post('/purge', wrap((req) => svc.startPurge(tId(req), uId(req), req.body?.confirm)));

export default router;
