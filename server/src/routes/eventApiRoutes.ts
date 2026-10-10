import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as svc from '../services/eventApiService';

/**
 * Event APIs.
 *
 * Admin (/api/v1/event-apis): collections, events and their registrations.
 * Public (/api/v1/public/events): what the website calls — the live events, one event's fields,
 * and the registration itself. No login; refused after the closing date.
 */

const fail = (res: Response, e: any, tag: string) => {
  const status = e instanceof svc.EventApiError ? e.status : 500;
  if (status === 500) console.error(`[${tag}]`, e);
  res.status(status).json({
    success: false,
    code: e instanceof svc.EventApiError ? e.code : 'SERVER_ERROR',
    message: status === 500 ? 'Something went wrong. Please try again.' : e?.message,
    ...(e?.errors ? { errors: e.errors } : {}),
  });
};

/* ── Admin ─────────────────────────────────────────────────────────────────────────────────── */

const admin = express.Router();
admin.use(authMiddleware, tenantMiddleware, roleGuard(['manage_event_apis', 'manage_tenant']));

const tId = (req: Request) => String((req as any).tenantId || '');
const uId = (req: Request) => String((req as any).user?.id || '');
const wrap = (fn: (req: Request) => Promise<any>) => async (req: Request, res: Response) => {
  try { res.json({ success: true, data: await fn(req) }); } catch (e) { fail(res, e, 'event-apis'); }
};
const query = (req: Request): svc.SubmissionQuery => ({
  collectionId: req.query.collectionId ? String(req.query.collectionId) : undefined,
  eventApiId: req.query.eventApiId ? String(req.query.eventApiId) : undefined,
  q: req.query.q ? String(req.query.q) : undefined,
  from: req.query.from ? String(req.query.from) : undefined,
  to: req.query.to ? String(req.query.to) : undefined,
  page: Number(req.query.page) || 1,
  limit: Number(req.query.limit) || 25,
});

admin.get('/meta', wrap((req) => svc.meta(tId(req))));
admin.get('/collections', wrap((req) => svc.listCollections(tId(req))));
admin.post('/collections', wrap((req) => svc.createCollection(tId(req), uId(req), req.body || {})));
admin.put('/collections/:id', wrap((req) => svc.updateCollection(tId(req), uId(req), req.params.id, req.body || {})));
admin.get('/events', wrap((req) => svc.listEvents(tId(req), { collectionId: req.query.collectionId ? String(req.query.collectionId) : undefined })));
admin.post('/events', wrap((req) => svc.createEvent(tId(req), uId(req), req.body || {})));
admin.get('/events/:id', wrap((req) => svc.getEvent(tId(req), req.params.id)));
admin.put('/events/:id', wrap((req) => svc.updateEvent(tId(req), uId(req), req.params.id, req.body || {})));
admin.post('/events/:id/status', wrap((req) => svc.setEventStatus(tId(req), uId(req), req.params.id, req.body?.status)));
admin.get('/submissions', wrap((req) => svc.listSubmissions(tId(req), query(req))));
admin.get('/submissions/export', async (req, res) => {
  try {
    const rows = svc.exportSubmissions(tId(req), query(req));
    const first = await rows.next();            // fails here, before any header is sent, if the filter is bad
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"`);
    if (!first.done) res.write(first.value);
    for await (const line of rows) res.write(line);
    res.end();
  } catch (e) {
    if (res.headersSent) { console.error('[event-apis] export', e); res.end(); } else fail(res, e, 'event-apis');
  }
});
admin.delete('/submissions/:id', wrap((req) => svc.deleteSubmission(tId(req), req.params.id)));

/* ── Public ────────────────────────────────────────────────────────────────────────────────── */

const pub = express.Router();

const withTenant = (fn: (tenantId: string, req: Request, res: Response) => Promise<any>, okStatus = 200) =>
  async (req: Request, res: Response) => {
    try {
      const tenantId = await svc.tenantBySlug(req.params.institute);
      if (!tenantId) throw new svc.EventApiError('No institute with this name.', 404, 'NOT_FOUND');
      res.status(okStatus).json({ success: true, data: await fn(tenantId, req, res) });
    } catch (e) { fail(res, e, 'public-events'); }
  };

/** Lists and forms change rarely; a minute of caching keeps a busy event page off the database. */
const cacheMinute = (_req: Request, res: Response, next: () => void) => { res.setHeader('Cache-Control', 'public, max-age=60'); next(); };

pub.get('/:institute', cacheMinute, withTenant((t) => svc.publicList(t)));
pub.get('/:institute/:apiName', cacheMinute, withTenant((t, req) => svc.publicForm(t, req.params.apiName)));
pub.post('/:institute/:apiName', rateLimit('eventSubmit'), withTenant((t, req) => {
  return svc.publicSubmit(t, req.params.apiName, req.body, {
    ip: req.ip,
    userAgent: String(req.headers['user-agent'] || ''),
    referrer: String(req.headers.referer || req.headers.origin || ''),
  });
}, 201));

export { pub as publicEventRoutes };
export default admin;
