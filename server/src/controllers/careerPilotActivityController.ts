/**
 * careerPilotActivityController — the browser writes here, the admin screen reads here.
 *
 * THE INGEST ENDPOINT IS PUBLIC, AND HAS TO BE. The most valuable part of the trail happens
 * before anybody has an account: a college opens the URL, reads the landing page, starts a
 * signup and stops. If this required a session, the screen would only ever show the journeys of
 * people who already finished the journey.
 *
 * Public and unauthenticated means it is also a place a stranger can write to, so: the tenant is
 * resolved on the server and never taken from the caller, every string is clamped by the
 * service, the batch size is capped, and it is rate limited. What a determined stranger can
 * achieve is noise on an internal screen — which is worth the part of the funnel it buys.
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PassportConfig from '../models/PassportConfig';
import {
  recordActivity, listSessions, getTimeline, getSummary,
} from '../services/careerPilotActivityService';

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

/**
 * Which tenant an anonymous visitor belongs to.
 *
 * CareerPilot is single-tenant per deployment in practice — one PassportConfig — so the config
 * is the answer. Cached for a minute because this runs on every beacon from every visitor, and
 * re-reading a document that changes monthly on each page view is a self-inflicted load problem.
 */
let cachedTenant: { id: string; at: number } | null = null;
async function publicTenantId(): Promise<string | null> {
  if (cachedTenant && Date.now() - cachedTenant.at < 60_000) return cachedTenant.id;
  const cfg: any = await PassportConfig.findOne({}).select('tenantId').lean();
  if (!cfg?.tenantId) return null;
  cachedTenant = { id: String(cfg.tenantId), at: Date.now() };
  return cachedTenant.id;
}

/** Ten events per beacon. The client batches; this is what stops a batch becoming a payload. */
const MAX_BATCH = 10;

/**
 * POST /passport/activity — the browser reporting what it just did.
 *
 * Answers 204 whatever happens, including when nothing could be written. A beacon that returns
 * an error teaches the client to retry, and a retry loop over an audit trail is a way to turn a
 * logging problem into an outage. Nothing downstream depends on the response.
 */
export const ingest = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req) || await publicTenantId();
    if (!tenantId) return res.status(204).end();

    const body: any = req.body || {};
    const events: any[] = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
    const visitorId = String(body.visitorId || '').slice(0, 80);
    if (!visitorId || !events.length) return res.status(204).end();

    const user: any = (req as any).user;
    const ua = String(req.headers['user-agent'] || '');

    for (const e of events) {
      recordActivity({
        tenantId,
        visitorId,
        sessionId: body.sessionId,
        userId: user?.id,
        personName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
        personEmail: user?.email,
        kind: e?.kind,
        name: e?.name,
        route: e?.route,
        outcome: e?.outcome,
        errorMessage: e?.errorMessage,
        durationMs: e?.durationMs,
        meta: e?.meta,
        // Screen, language and timezone can only come from the browser; browser and OS are
        // parsed from the header in the service and take precedence over anything sent here.
        device: body.device,
        ip: req.ip,
        userAgent: ua,
        referrer: e?.referrer || String(req.headers.referer || ''),
      });
    }
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
};

const parseRange = (req: Request) => {
  const q: any = req.query || {};
  const to = q.to ? new Date(String(q.to)) : new Date();
  // A week, because that is the window an admin is usually asking about after a demo day.
  const from = q.from ? new Date(String(q.from)) : new Date(to.getTime() - 7 * 24 * 3600_000);
  return {
    from: isNaN(from.getTime()) ? undefined : from,
    to: isNaN(to.getTime()) ? undefined : to,
  };
};

/** GET /passport/admin/activity/sessions */
export const sessions = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });
    const q: any = req.query || {};
    const { from, to } = parseRange(req);
    res.json(await listSessions({
      tenantId, from, to,
      search: q.search ? String(q.search) : undefined,
      deviceType: q.deviceType ? String(q.deviceType) : undefined,
      outcome: q.outcome ? String(q.outcome) : undefined,
      onlyFailures: q.onlyFailures === 'true' || q.onlyFailures === '1',
      limit: Number(q.limit) || 40,
      skip: Number(q.skip) || 0,
    }));
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load activity.' });
  }
};

/** GET /passport/admin/activity/summary */
export const summary = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });
    const q: any = req.query || {};
    const { from, to } = parseRange(req);
    res.json(await getSummary({
      tenantId, from, to,
      deviceType: q.deviceType ? String(q.deviceType) : undefined,
    }));
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load the summary.' });
  }
};

/** GET /passport/admin/activity/timeline/:visitorId */
export const timeline = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });
    const visitorId = String(req.params.visitorId || '');
    if (!visitorId) return res.status(400).json({ message: 'Which visitor?' });
    const rows = await getTimeline(tenantId, visitorId, Number(req.query.limit) || 500);
    res.json({ visitorId, events: rows });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load the timeline.' });
  }
};

/** Exported for the route file, which asserts the ids it is given are real. */
export const isObjectId = (v: any) => mongoose.isValidObjectId(v);
