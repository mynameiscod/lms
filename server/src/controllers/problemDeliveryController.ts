import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as svc from '../services/problemDeliveryService';
import { PbError } from '../services/problemBankService';
import Batch from '../models/Batch';
import User from '../models/User';

const ids = (req: Request) => ({
  userId: String((req as any).user?.id || ''),
  tenantId: String((req as any).tenantId || ''),
  role: String((req as any).user?.role || ''),
});

const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof PbError ? e.status : 500;
    if (status === 500) console.error('[problem-sets]', e);
    res.status(status).json({ success: false, message: e?.message || 'Something went wrong' });
  }
};

const learner = (req: Request) => { const i = ids(req); return svc.loadLearner(i.userId, i.tenantId); };

/* ── Learners ─────────────────────────────────────────────────────────────────────────────── */

export const mySets = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.mySets(await learner(req)) });
});
export const learnerSet = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.setForLearner(await learner(req), req.params.setId) });
});
export const learnerProblem = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.problemForLearner(await learner(req), req.params.setId, req.params.problemId) });
});
export const learnerRun = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.runForLearner(await learner(req), req.params.setId, req.params.problemId, req.body || {}) });
});
export const learnerSubmit = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.submitForLearner(await learner(req), req.params.setId, req.params.problemId, req.body || {}) });
});

/* ── Admin ────────────────────────────────────────────────────────────────────────────────── */

export const listSets = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.listSetsAdmin(ids(req).tenantId) });
});
export const getSet = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.getSetAdmin(ids(req).tenantId, req.params.id) });
});
export const createSet = wrap(async (req, res) => {
  const s = await svc.saveSet(ids(req), null, req.body || {});
  res.status(201).json({ success: true, data: { id: s._id } });
});
export const updateSet = wrap(async (req, res) => {
  const s = await svc.saveSet(ids(req), req.params.id, req.body || {});
  res.json({ success: true, data: { id: s._id, status: s.status } });
});
export const deleteSet = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.deleteSet(ids(req).tenantId, req.params.id) });
});
export const setReport = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.setReport(ids(req).tenantId, req.params.id) });
});
export const learnerSubmissions = wrap(async (req, res) => {
  res.json({ success: true, data: await svc.learnerSubmissions(ids(req).tenantId, req.params.id, req.params.userId) });
});

export const audienceBatches = wrap(async (req, res) => {
  const t = ids(req).tenantId;
  const tid = mongoose.isValidObjectId(t) ? new mongoose.Types.ObjectId(t) : t;
  const rows = await Batch.find({ tenantId: tid }).select('name').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: rows.map((b: any) => ({ _id: b._id, name: b.name })) });
});

export const audienceUsers = wrap(async (req, res) => {
  const t = ids(req).tenantId;
  const q = String(req.query.q || '').trim();
  if (q.length < 2) { res.json({ success: true, data: [] }); return; }
  const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const tid = mongoose.isValidObjectId(t) ? new mongoose.Types.ObjectId(t) : t;
  const rows = await User.find({ tenantId: tid, $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { name: rx }] })
    .select('firstName lastName name email role').limit(20).lean();
  res.json({ success: true, data: rows.map((u: any) => ({ _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email, email: u.email, role: u.role })) });
});
