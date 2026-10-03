import { Request, Response } from 'express';
import * as svc from '../services/placementProgramService';
import * as portal from '../services/placementPortalService';
import { permissionsOf } from '../middleware/roleGuard';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof svc.PlacementError ? e.status : 500;
    if (status === 500) console.error('[placement]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

/** POST /public/placement-program/register?tenant=<slug|id> — the ad landing form. */
export const publicRegister = wrap(async (req, res) => {
  const tenantId = await svc.resolveTenantId(req.query.tenant || req.body?.tenant);
  if (!tenantId) return res.status(400).json({ success: false, message: 'Unknown organisation.' });
  const r = await svc.register(tenantId, req.body || {});
  res.json({ success: true, data: { returning: r.returning, portalToken: r.portalToken } });
});

export const list = wrap(async (req, res) => {
  const { stage, source, search, page, limit } = req.query as any;
  res.json({ success: true, data: await svc.list(tId(req), { stage, source, search, page: Number(page), limit: Number(limit) }) });
});

export const get = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.get(tId(req), req.params.id) });
});

export const setStage = wrap(async (req, res) => {
  const c = await svc.setStage(tId(req), req.params.id, String(req.body?.stage || ''), uId(req), req.body?.note);
  res.json({ success: true, data: c });
});

export const addNote = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.addNote(tId(req), req.params.id, String(req.body?.text || ''), uId(req)) });
});

// ── Phase 2: the candidate's own page (public, by secret link) ────────────────

export const portalView = wrap(async (req, res) => { res.json({ success: true, data: await portal.portalView(req.params.token) }); });
export const portalSlots = wrap(async (req, res) => { res.json({ success: true, data: await portal.portalSlots(req.params.token) }); });
export const portalOrder = wrap(async (req, res) => { res.json({ success: true, data: await portal.portalCreateOrder(req.params.token) }); });
export const portalVerify = wrap(async (req, res) => { res.json({ success: true, data: await portal.portalVerifyPayment(req.params.token, req.body || {}) }); });
export const portalBook = wrap(async (req, res) => { res.json({ success: true, data: await portal.portalBook(req.params.token, String(req.body?.startsAt || '')) }); });
export const portalCancel = wrap(async (req, res) => { res.json({ success: true, data: await portal.portalCancel(req.params.token) }); });

// ── Phase 2: admin ─────────────────────────────────────────────────────────────
export const getConfig = wrap(async (req, res) => { res.json({ success: true, data: await portal.getConfig(tId(req)) }); });
export const saveConfig = wrap(async (req, res) => { res.json({ success: true, data: await portal.saveConfig(tId(req), req.body || {}) }); });
export const listInterviewers = wrap(async (req, res) => { res.json({ success: true, data: await portal.listInterviewers(tId(req)) }); });
export const createInterviewer = wrap(async (req, res) => { res.json({ success: true, data: await portal.saveInterviewer(tId(req), null, req.body || {}) }); });
export const updateInterviewer = wrap(async (req, res) => { res.json({ success: true, data: await portal.saveInterviewer(tId(req), req.params.ivId, req.body || {}) }); });
export const deleteInterviewer = wrap(async (req, res) => { res.json({ success: true, data: await portal.deleteInterviewer(tId(req), req.params.ivId) }); });
export const listBookings = wrap(async (req, res) => {
  res.json({ success: true, data: await portal.listBookings(tId(req), { range: req.query.range === 'past' ? 'past' : 'upcoming' }) });
});
/** An interviewer's own interviews — needs only a login, not placement-admin rights. */
export const myBookings = wrap(async (req, res) => {
  res.json({ success: true, data: await portal.listBookings(tId(req), { mine: '1', userId: uId(req), range: req.query.range === 'past' ? 'past' : 'upcoming' }) });
});
export const cancelBooking = wrap(async (req, res) => { res.json({ success: true, data: await portal.adminCancelBooking(tId(req), req.params.bookingId, uId(req), req.body?.reason) }); });
export const bookingOutcome = wrap(async (req, res) => {
  const perms = await permissionsOf((req as any).user || { role: '' }).catch(() => [] as string[]);
  const isAdmin = perms.includes('manage_placement') || perms.includes('manage_tenant');
  res.json({ success: true, data: await portal.setOutcome(tId(req), req.params.bookingId, req.body?.outcome, uId(req), isAdmin, req.body?.scorecard) });
});
export const waive = wrap(async (req, res) => { res.json({ success: true, data: await portal.setWaived(tId(req), req.params.id, !!req.body?.waived, uId(req)) }); });
export const refund = wrap(async (req, res) => { res.json({ success: true, data: await portal.refundFee(tId(req), req.params.id, uId(req), req.body?.reason) }); });
export const portalLink = wrap(async (req, res) => { res.json({ success: true, data: await portal.ensurePortalToken(tId(req), req.params.id) }); });

export const board = wrap(async (req, res) => { res.json({ success: true, data: await portal.board(tId(req)) }); });
/** The scorecard criteria, for the interviewer's form (no admin rights needed). */
export const scorecardCriteria = wrap(async (req, res) => { res.json({ success: true, data: (await portal.getConfig(tId(req))).scorecardCriteria }); });
