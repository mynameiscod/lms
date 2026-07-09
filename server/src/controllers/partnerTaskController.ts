import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import PartnerTask from '../models/PartnerTask';
import PlacementPartner from '../models/PlacementPartner';

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const tId = (req: AuthenticatedRequest) => req.user!.tenantId as string;
const uId = (req: AuthenticatedRequest) => req.user!.id as string;

const KIND_LABEL: Record<string, string> = {
  reply: 'Reply received', interested: 'Follow up — interested', checkin: 'Check-in', guarantee: 'Guarantee ending', manual: 'Reminder',
};

// GET /placement-partners/tasks?filter=open|overdue|today|all
export const listTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter = String(req.query.filter || 'open');
    const q: any = { tenantId: oid(tId(req)) };
    if (filter !== 'all') q.open = true;

    const rows = await PartnerTask.find(q).sort({ dueAt: 1, createdAt: -1 }).limit(500).lean();

    // Attach partner context.
    const partnerIds = [...new Set(rows.map((r: any) => String(r.partnerId)))];
    const partners = partnerIds.length
      ? await PlacementPartner.find({ _id: { $in: partnerIds }, tenantId: oid(tId(req)) }).select('companyName stage tier placement').lean()
      : [];
    const pById: Record<string, any> = {};
    (partners as any[]).forEach((p: any) => { pById[String(p._id)] = p; });

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(startToday.getTime() + 86400000);

    let tasks = rows.map((t: any) => {
      const due = t.dueAt ? new Date(t.dueAt) : null;
      const overdue = !!(t.open && due && due < startToday);
      const today = !!(due && due >= startToday && due < endToday);
      const p = pById[String(t.partnerId)] || {};
      return {
        id: String(t._id), partnerId: String(t.partnerId),
        company: p.companyName || 'Partner', stage: p.stage, tier: p.tier,
        kind: t.kind, kindLabel: KIND_LABEL[t.kind] || t.kind, content: t.content,
        dueAt: t.dueAt, open: t.open, overdue, today,
      };
    });

    if (filter === 'overdue') tasks = tasks.filter(t => t.overdue);
    if (filter === 'today') tasks = tasks.filter(t => t.today);

    const openTasks = rows.filter((t: any) => t.open);
    const summary = {
      open: openTasks.length,
      overdue: openTasks.filter((t: any) => t.dueAt && new Date(t.dueAt) < startToday).length,
      today: openTasks.filter((t: any) => t.dueAt && new Date(t.dueAt) >= startToday && new Date(t.dueAt) < endToday).length,
    };
    res.json({ success: true, data: { tasks, summary } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /placement-partners/tasks/:tid/complete
export const completeTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const t = await PartnerTask.findOneAndUpdate({ _id: req.params.tid, tenantId: oid(tId(req)) }, { $set: { open: false } }, { new: true });
    if (!t) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: { id: String(t._id), open: t.open } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// PATCH /placement-partners/tasks/:tid/snooze  { days }
export const snoozeTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = Math.max(1, Math.min(60, Number(req.body?.days) || 1));
    const base = new Date();
    base.setDate(base.getDate() + days); base.setHours(9, 0, 0, 0);
    const t = await PartnerTask.findOneAndUpdate({ _id: req.params.tid, tenantId: oid(tId(req)) }, { $set: { dueAt: base, open: true } }, { new: true });
    if (!t) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: { id: String(t._id), dueAt: t.dueAt } });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /placement-partners/:id/tasks  { content, dueAt? }  — add a manual reminder
export const addTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const partner = await PlacementPartner.findOne({ _id: req.params.id, tenantId: oid(tId(req)) });
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ success: false, message: 'content required' });
    const dueAt = req.body?.dueAt ? new Date(req.body.dueAt) : new Date(Date.now() + 86400000);
    await PartnerTask.create({
      tenantId: oid(tId(req)), partnerId: partner._id, kind: 'manual',
      content, dueAt, open: true, createdBy: oid(uId(req)),
    });
    res.status(201).json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};
