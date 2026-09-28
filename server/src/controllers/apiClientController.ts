import { Request, Response } from 'express';
import * as api from '../services/externalApiService';
import { PbError } from '../services/problemBankService';

const ids = (req: Request) => ({ userId: String((req as any).user?.id || ''), tenantId: String((req as any).tenantId || '') });

const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof PbError ? e.status : 500;
    if (status === 500) console.error('[api-clients]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

export const list = wrap(async (req, res) => { res.json({ success: true, data: await api.listClients(ids(req).tenantId) }); });
export const create = wrap(async (req, res) => { res.status(201).json({ success: true, data: await api.createClient(ids(req), req.body || {}) }); });
export const update = wrap(async (req, res) => { res.json({ success: true, data: await api.updateClient(ids(req).tenantId, req.params.id, req.body || {}) }); });
export const rotate = wrap(async (req, res) => { res.json({ success: true, data: await api.rotateKey(ids(req).tenantId, req.params.id) }); });
export const remove = wrap(async (req, res) => { res.json({ success: true, data: await api.deleteClient(ids(req).tenantId, req.params.id) }); });
export const preview = wrap(async (req, res) => { res.json({ success: true, data: await api.previewEntitlement(ids(req).tenantId, req.params.id) }); });
