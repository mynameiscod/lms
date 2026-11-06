import { Request, Response } from 'express';
import * as svc from '../services/dsaCurriculumService';
import { PbError } from '../services/problemBankService';
import { loadLearner } from '../services/problemDeliveryService';
import { resolveAccess } from './visualizerController';

/** DSA curriculum (Code Visualizer → Learn). Same access rule as the Visualizer it lives in. */

const ids = (req: Request) => ({
  userId: String((req as any).user?.id || ''),
  tenantId: String((req as any).tenantId || ''),
  role: String((req as any).user?.role || ''),
});

const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof PbError ? e.status : 500;
    if (status === 500) console.error('[dsa-curriculum]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

async function learnerWithAccess(req: Request) {
  const i = ids(req);
  const access = await resolveAccess(i.tenantId, i.userId);
  if (!access.allowed) throw new PbError('The Code Visualizer has not been assigned to you yet. Ask your mentor to enable it.', 403);
  return loadLearner(i.userId, i.tenantId);
}

export const listModules = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.listModules(await learnerWithAccess(req)) });
});

export const getModule = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.getModule(await learnerWithAccess(req), req.params.slug) });
});

export const adminSeed = wrap(async (req, res) => {
  const i = ids(req);
  res.json({ success: true, data: await svc.seedModules(i.tenantId, i.userId) });
});

export const adminCreatePracticeSets = wrap(async (req, res) => {
  res.status(201).json({ success: true, data: await svc.createPracticeSets(ids(req), req.params.slug) });
});
