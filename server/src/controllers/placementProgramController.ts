import { Request, Response } from 'express';
import * as svc from '../services/placementProgramService';

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
  res.json({ success: true, data: { returning: r.returning } });
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
