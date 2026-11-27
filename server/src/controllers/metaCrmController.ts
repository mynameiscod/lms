/**
 * /api/v1/meta-crm — Meta CRM conversion events (Conversion Leads) and ad spend sync.
 * Everything is scoped to the caller's institute (req.tenantId).
 */
import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import MetaCrmEvent from '../models/MetaCrmEvent';
import Lead from '../models/Lead';
import * as settings from '../services/settingsService';
import { modeFor, retryFailed as retryFailedEvents, sendTestEvent, DEFAULT_EVENT_NAMES, META_GRAPH_VERSION } from '../services/metaCrmEventService';
import { syncRecentSpend, getSpendSummary, adAccountPath, MAX_BACKFILL_DAYS } from '../services/metaAdSpendService';

const tidOf = (req: AuthenticatedRequest) => new mongoose.Types.ObjectId(String(req.tenantId));
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });

/** In-process status of a running spend sync per institute (shown on the page). */
const spendJobs = new Map<string, { running: boolean; startedAt?: Date; finishedAt?: Date; result?: any; error?: string }>();

// ─────────────────────────── summary / events ───────────────────────────

/** GET /summary — counts by status and milestone, coverage, mode. */
export const getSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = tidOf(req);
    const since = new Date(Date.now() - 90 * 86_400_000);
    const [byStatus, byMilestone, metaLeads, metaQualified, last] = await Promise.all([
      MetaCrmEvent.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      MetaCrmEvent.aggregate([{ $match: { tenantId } }, { $group: { _id: { milestone: '$milestone', status: '$status' }, n: { $sum: 1 } } }]),
      Lead.countDocuments({ tenantId, 'metaSubmissionIds.0': { $exists: true }, createdAt: { $gte: since } }),
      Lead.countDocuments({ tenantId, 'metaSubmissionIds.0': { $exists: true }, createdAt: { $gte: since }, 'milestones.qualifiedAt': { $exists: true } }),
      MetaCrmEvent.findOne({ tenantId, status: 'sent' }).sort({ sentAt: -1 }).select('sentAt').lean(),
    ]);
    const status: Record<string, number> = { pending: 0, sent: 0, failed: 0, skipped: 0 };
    byStatus.forEach((r: any) => { status[r._id] = r.n; });
    const milestones: Record<string, Record<string, number>> = {};
    byMilestone.forEach((r: any) => { (milestones[r._id.milestone] ||= {})[r._id.status] = r.n; });
    res.json({
      success: true,
      data: {
        mode: modeFor(String(req.tenantId)),
        status, milestones,
        coverage: {
          windowDays: 90, metaLeads, qualified: metaQualified,
          qualifiedPct: metaLeads ? Math.round((metaQualified / metaLeads) * 1000) / 10 : 0,
        },
        lastSentAt: (last as any)?.sentAt || null,
        defaultEventNames: DEFAULT_EVENT_NAMES,
        graphVersion: META_GRAPH_VERSION,
      },
    });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** GET /events?status=&page=&limit= */
export const listEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '25'), 10) || 25));
    const filter: any = { tenantId: tidOf(req) };
    if (['pending', 'sent', 'failed', 'skipped'].includes(String(req.query.status))) filter.status = String(req.query.status);
    const [items, total] = await Promise.all([
      MetaCrmEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('leadId', 'name phone').lean(),
      MetaCrmEvent.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** GET /lead/:leadId — one lead's Meta events (for the lead page). */
export const leadEvents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.leadId)) return fail(res, 400, 'Invalid lead');
    const items = await MetaCrmEvent.find({ tenantId: tidOf(req), leadId: req.params.leadId }).sort({ eventTime: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** POST /retry-failed */
export const retryFailed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const n = await retryFailedEvents(String(req.tenantId));
    res.json({ success: true, message: `${n} event(s) queued again`, data: { requeued: n } });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** POST /test-send { leadId? } — always uses the test event code. */
export const testSend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await sendTestEvent(String(req.tenantId), req.body?.leadId);
    res.status(r.ok ? 200 : 400).json({ success: r.ok, message: r.message, data: { httpStatus: r.httpStatus, response: r.response } });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

// ─────────────────────────── settings ───────────────────────────

const mask = (v: string) => (v ? `••••${v.slice(-4)}` : '');

/** GET /settings — tokens are never returned, only whether one is set. */
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  const t = String(req.tenantId);
  const crmToken = settings.getCredential('META_CRM_ACCESS_TOKEN', t);
  const adsToken = settings.getCredential('META_ADS_ACCESS_TOKEN', t);
  res.json({
    success: true,
    data: {
      mode: modeFor(t),
      datasetId: settings.getCredential('META_CRM_DATASET_ID', t),
      hasAccessToken: !!crmToken, accessTokenHint: mask(crmToken),
      testEventCode: settings.getStr('META_CRM_TEST_EVENT_CODE', '', t),
      sourceName: settings.getStr('META_CRM_SOURCE_NAME', '', t) || 'CodeBegun LMS',
      adAccountId: settings.getCredential('META_AD_ACCOUNT_ID', t),
      hasAdsToken: !!adsToken, adsTokenHint: mask(adsToken),
    },
  });
};

/**
 * PUT /settings. A token field left blank keeps the saved token; send `clearAccessToken` /
 * `clearAdsToken: true` to remove one.
 */
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body || {};
    const entries: { key: string; value: string }[] = [];
    if (b.mode !== undefined) {
      if (!['off', 'test', 'live'].includes(String(b.mode))) return fail(res, 400, 'Mode must be off, test or live');
      entries.push({ key: 'META_CRM_MODE', value: String(b.mode) });
    }
    if (b.datasetId !== undefined) {
      const v = String(b.datasetId).trim();
      if (v && !/^\d{5,25}$/.test(v)) return fail(res, 400, 'The dataset ID is a number (Events Manager → Data sources)');
      entries.push({ key: 'META_CRM_DATASET_ID', value: v });
    }
    if (typeof b.accessToken === 'string' && b.accessToken.trim()) entries.push({ key: 'META_CRM_ACCESS_TOKEN', value: b.accessToken.trim() });
    if (b.clearAccessToken === true) entries.push({ key: 'META_CRM_ACCESS_TOKEN', value: '' });
    if (b.testEventCode !== undefined) entries.push({ key: 'META_CRM_TEST_EVENT_CODE', value: String(b.testEventCode).trim().slice(0, 50) });
    if (b.sourceName !== undefined) entries.push({ key: 'META_CRM_SOURCE_NAME', value: String(b.sourceName).trim().slice(0, 60) });
    if (b.adAccountId !== undefined) {
      const v = String(b.adAccountId).trim();
      if (v && !adAccountPath(v)) return fail(res, 400, 'The ad account ID looks like act_1234567890');
      entries.push({ key: 'META_AD_ACCOUNT_ID', value: v });
    }
    if (typeof b.adsAccessToken === 'string' && b.adsAccessToken.trim()) entries.push({ key: 'META_ADS_ACCESS_TOKEN', value: b.adsAccessToken.trim() });
    if (b.clearAdsToken === true) entries.push({ key: 'META_ADS_ACCESS_TOKEN', value: '' });

    // Going live/test needs somewhere to send.
    const t = String(req.tenantId);
    const nextMode = b.mode ?? modeFor(t);
    if (nextMode !== 'off') {
      const ds = entries.find(e => e.key === 'META_CRM_DATASET_ID')?.value ?? settings.getCredential('META_CRM_DATASET_ID', t);
      const tok = entries.find(e => e.key === 'META_CRM_ACCESS_TOKEN')?.value ?? settings.getCredential('META_CRM_ACCESS_TOKEN', t);
      if (!ds || !tok) return fail(res, 400, 'Save the dataset ID and access token before switching on test or live.');
      const code = entries.find(e => e.key === 'META_CRM_TEST_EVENT_CODE')?.value ?? settings.getStr('META_CRM_TEST_EVENT_CODE', '', t);
      if (nextMode === 'test' && !code) return fail(res, 400, 'Test mode needs a test event code.');
    }

    await settings.setMany(entries, String(req.user!.id), t);
    return getSettings(req, res);
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

// ─────────────────────────── ad spend ───────────────────────────

/** POST /spend/sync?days=3 (max 90) — runs in the background; poll GET /spend/status. */
export const startSpendSync = async (req: AuthenticatedRequest, res: Response) => {
  const t = String(req.tenantId);
  const days = Math.max(1, Math.min(MAX_BACKFILL_DAYS, parseInt(String(req.query.days || req.body?.days || '3'), 10) || 3));
  if (!adAccountPath(settings.getCredential('META_AD_ACCOUNT_ID', t)) || !settings.getCredential('META_ADS_ACCESS_TOKEN', t)) {
    return fail(res, 400, 'Save the ad account ID and an ads_read token first.');
  }
  if (spendJobs.get(t)?.running) return fail(res, 409, 'A spend sync is already running.');
  const job = { running: true, startedAt: new Date() } as any;
  spendJobs.set(t, job);
  syncRecentSpend(t, days)
    .then(r => { job.result = r; job.error = undefined; })
    .catch((e: any) => { job.error = e?.message || 'Spend sync failed'; })
    .finally(() => { job.running = false; job.finishedAt = new Date(); });
  res.status(202).json({ success: true, message: `Pulling the last ${days} day(s) of spend from Meta…`, data: { days } });
};

/** GET /spend/status */
export const spendStatus = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: spendJobs.get(String(req.tenantId)) || { running: false } });
};

/** GET /spend/summary?from=YYYY-MM-DD&to=YYYY-MM-DD (default: last 30 days) */
export const spendSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(to.getTime() - 29 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return fail(res, 400, 'Invalid date range');
    res.json({ success: true, data: await getSpendSummary(String(req.tenantId), from, to) });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};
