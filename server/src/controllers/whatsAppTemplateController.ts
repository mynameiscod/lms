import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Batch from '../models/Batch';
import * as settings from '../services/settingsService';
import * as svc from '../services/whatsAppTemplateService';
import { WA_TEMPLATE_PURPOSES } from '../config/whatsappTemplatePurposes';

const tId = (req: Request) => (req as any).tenantId as string;
const uId = (req: Request) => (req as any).user?.id as string;

/** Meta's message on a template error is the useful part — pass it through, not "Server error". */
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (e: any) {
    const status = e instanceof svc.WaTemplateError ? e.status : 500;
    if (status === 500) console.error('[wa-templates]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

export const getConnection = wrap(async (req, res) => {
  const { wabaId, source } = await svc.getWabaId(tId(req));
  res.json({ success: true, data: { wabaId, source } });
});

export const saveConnection = wrap(async (req, res) => {
  const wabaId = String(req.body?.wabaId || '').trim();
  if (wabaId && !/^\d{6,25}$/.test(wabaId)) return res.status(400).json({ success: false, message: 'The WhatsApp Business Account ID is a number, e.g. 104567890123456.' });
  await settings.setMany([{ key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', value: wabaId }], uId(req), tId(req));
  res.json({ success: true });
});

export const testConnection = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.testConnection(tId(req)) });
});

export const list = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.listTemplates(tId(req)) });
});

export const sync = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.syncTemplates(tId(req)) });
});

export const create = wrap(async (req, res) => {
  const doc = await svc.createTemplate(tId(req), uId(req), req.body || {});
  res.status(201).json({ success: true, data: doc });
});

export const update = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.updateTemplate(tId(req), req.params.id, req.body || {}) });
});

export const remove = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.deleteTemplate(tId(req), req.params.id) });
});

export const validate = wrap(async (req, res) => {
  res.json({ success: true, data: { errors: svc.validateInput(req.body || {}) } });
});

export const usage = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.getUsage(tId(req)) });
});

export const assign = wrap(async (req, res) => {
  const r = await svc.assignPurpose(tId(req), uId(req), req.params.purpose, req.body?.templateId || null);
  res.json({ success: true, data: r });
});

/** Which templates could fill each use — so the picker only offers ones that will send. */
export const compatibility = wrap(async (req, res) => {
  const templates = await svc.listTemplates(tId(req));
  const out: Record<string, Record<string, { ok: boolean; errors: string[]; warnings: string[] }>> = {};
  for (const p of WA_TEMPLATE_PURPOSES) {
    out[p.key] = {};
    for (const t of templates) out[p.key][String(t._id)] = svc.checkCompatibility(t, p);
  }
  res.json({ success: true, data: out });
});

export const sendTest = wrap(async (req, res) => {
  const { phone, values, buttonParam } = req.body || {};
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });
  const r = await svc.sendTest(tId(req), req.params.id, String(phone), Array.isArray(values) ? values.map(String) : [], buttonParam);
  if (!r.ok) return res.status(400).json({ success: false, message: `Meta did not accept it: ${r.error}` });
  res.json({ success: true, message: 'Sent' });
});

export const broadcast = wrap(async (req, res) => {
  const { phones, batchId, values, buttonParam } = req.body || {};
  if (batchId && !mongoose.isValidObjectId(batchId)) return res.status(400).json({ success: false, message: 'Invalid batch' });
  const b = await svc.startBroadcast(tId(req), uId(req), req.params.id, {
    phones, batchId, values: Array.isArray(values) ? values.map(String) : [], buttonParam,
  });
  res.status(202).json({ success: true, data: b });
});

export const broadcasts = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.listBroadcasts(tId(req)) });
});

export const batches = wrap(async (req, res) => {
  const rows = await Batch.find({ tenantId: new mongoose.Types.ObjectId(tId(req)) }).select('name').sort({ createdAt: -1 }).limit(300).lean();
  res.json({ success: true, data: rows });
});
