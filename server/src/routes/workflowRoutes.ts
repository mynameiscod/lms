import express, { Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { AuthenticatedRequest } from '../types';
import { Workflow, WorkflowRun, WorkflowSettings, WEEKDAYS } from '../models/Workflow';
import LeadStage from '../models/LeadStage';
import Lead from '../models/Lead';
import User from '../models/User';
import WhatsAppTemplate from '../models/WhatsAppTemplate';
import { cleanSteps, cleanTrigger, workflowProblems, indexSteps } from '../services/workflow/shape';
import { fire, stopRuns, execute, forgetOfficeHours, officeHoursFor } from '../services/workflow/engine';
import { isOpen, nextOpening, describeOpening, validTimezone } from '../services/workflow/officeHours';
import { leadFilterOptions } from '../services/whatsAppTemplateService';
import { templateShape } from '../services/whatsAppTemplateShape';

/** Workflow Builder — mounted at /workflows. Admin only (manage_leads). */
const router = express.Router();
const guard = [authMiddleware, tenantResolver, roleGuard(['manage_leads'])];
const tid = (req: AuthenticatedRequest) => new mongoose.Types.ObjectId(String(req.tenantId));
const fail = (res: Response, e: any, status = 500) => res.status(e?.status || status).json({ success: false, message: e?.message || 'Something went wrong' });
const bad = (message: string, status = 400) => Object.assign(new Error(message), { status });

function cleanSettings(raw: any) {
  const s = raw || {};
  return {
    sendWindow: s.sendWindow === 'office_hours' ? 'office_hours' : 'any',
    allowReentry: !!s.allowReentry,
    cooldownMinutes: Math.min(525600, Math.max(0, Math.round(Number(s.cooldownMinutes) || 0))),
    stopOnReply: !!s.stopOnReply,
    runWhenHumanTakenOver: !!s.runWhenHumanTakenOver,
    stopStageIds: (Array.isArray(s.stopStageIds) ? s.stopStageIds : []).filter((x: any) => mongoose.isValidObjectId(x)).map(String).slice(0, 30),
  };
}

const summary = (w: any, live: Record<string, number>) => ({
  _id: String(w._id), name: w.name, description: w.description, status: w.status, trigger: w.trigger,
  stepCount: indexSteps(w.steps || []).size, stats: w.stats, liveRuns: live[String(w._id)] || 0,
  updatedAt: w.updatedAt, activatedAt: w.activatedAt,
});

/* ── Lists for the builder's dropdowns ─────────────────────────────────── */
router.get('/options', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const t = tid(req);
    const [filters, templates, users, courses] = await Promise.all([
      leadFilterOptions(String(t)),
      WhatsAppTemplate.find({ tenantId: t }).select('name language category status body header buttons').sort({ name: 1 }).lean(),
      User.find({ tenantId: t, role: { $in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF', 'MANAGER', 'INSTRUCTOR'] }, isActive: { $ne: false } }).select('firstName lastName email role').sort({ firstName: 1 }).limit(300).lean(),
      Lead.distinct('courseInterest', { tenantId: t }),
    ]);
    const allStages = await LeadStage.find({ tenantId: t }).select('name order isActive').sort({ order: 1 }).lean();
    res.json({ success: true, data: {
      stages: allStages.map((s: any) => ({ _id: String(s._id), name: s.name, isActive: s.isActive !== false })),
      sources: filters.sources.map((s) => s.source),
      templates: templates.map((x: any) => {
        const shape = templateShape(x);
        return { _id: String(x._id), name: x.name, language: x.language, category: x.category, status: x.status, body: x.body, variables: shape.bodyVarCount, hasUrlButton: shape.urlButtonIndex >= 0 };
      }),
      users: users.map((u: any) => ({ _id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, role: u.role })),
      courses: (courses as any[]).filter(Boolean).map(String).slice(0, 100),
    } });
  } catch (e) { fail(res, e); }
});

/* ── Office hours ──────────────────────────────────────────────────────── */
router.get('/settings', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const oh = await officeHoursFor(String(req.tenantId));
    const now = new Date();
    res.json({ success: true, data: { ...oh, openNow: isOpen(now, oh), nextOpening: describeOpening(nextOpening(now, oh), now, oh.timezone) } });
  } catch (e) { fail(res, e); }
});

router.put('/settings', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const b = req.body || {};
    const timezone = validTimezone(String(b.timezone || '')) ? String(b.timezone) : 'Asia/Kolkata';
    const time = (v: any, d: string) => (/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v || '')) ? String(v).padStart(5, '0') : d);
    const days: any = {};
    for (const d of WEEKDAYS) {
      const x = b.days?.[d] || {};
      days[d] = { open: !!x.open, start: time(x.start, '09:30'), end: time(x.end, '18:30') };
      if (days[d].open && days[d].end <= days[d].start) throw bad(`${d.toUpperCase()}: closing time must be after opening time`);
    }
    const holidays = (Array.isArray(b.holidays) ? b.holidays : [])
      .filter((h: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(h?.date || '')))
      .map((h: any) => ({ date: String(h.date), name: String(h.name || '').slice(0, 80) })).slice(0, 100);
    await WorkflowSettings.updateOne({ tenantId: tid(req) }, { $set: { timezone, days, holidays, updatedBy: req.user!.id } }, { upsert: true });
    forgetOfficeHours(String(req.tenantId));
    const oh = await officeHoursFor(String(req.tenantId));
    const now = new Date();
    res.json({ success: true, data: { ...oh, openNow: isOpen(now, oh), nextOpening: describeOpening(nextOpening(now, oh), now, oh.timezone) } });
  } catch (e) { fail(res, e); }
});

/* ── Runs (all workflows) ──────────────────────────────────────────────── */
router.get('/runs', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q: any = { tenantId: tid(req) };
    if (mongoose.isValidObjectId(req.query.workflowId)) q.workflowId = new mongoose.Types.ObjectId(String(req.query.workflowId));
    if (mongoose.isValidObjectId(req.query.leadId)) q.leadId = new mongoose.Types.ObjectId(String(req.query.leadId));
    const st = String(req.query.status || '');
    if (st === 'live') q.status = { $in: ['running', 'waiting'] };
    else if (['completed', 'stopped', 'failed'].includes(st)) q.status = st;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await WorkflowRun.find(q).sort({ createdAt: -1 }).limit(limit)
      .populate('leadId', 'name phone').populate('workflowId', 'name steps').lean();
    res.json({ success: true, data: rows.map((r: any) => {
      const idx = r.workflowId?.steps ? indexSteps(r.workflowId.steps) : new Map();
      const at = r.stepId ? idx.get(r.stepId) : null;
      return {
        _id: String(r._id), workflowId: String(r.workflowId?._id || r.workflowId), workflowName: r.workflowId?.name || '(deleted)',
        lead: r.leadId ? { _id: String(r.leadId._id), name: r.leadId.name, phone: r.leadId.phone } : null,
        phone: r.phone, status: r.status, waitingFor: r.waitingFor, resumeAt: r.resumeAt,
        currentStep: at ? { id: r.stepId, number: at.number, type: at.step.type } : null,
        answers: r.vars?.answers || {}, test: !!r.vars?.test,
        log: r.log || [], endReason: r.endReason, createdAt: r.createdAt, endedAt: r.endedAt,
      };
    }) });
  } catch (e) { fail(res, e); }
});

router.post('/runs/:runId/stop', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.runId)) throw bad('Run not found', 404);
    const me: any = await User.findById(req.user!.id).select('firstName lastName').lean();
    const by = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || 'an admin';
    const n = await stopRuns({ _id: new mongoose.Types.ObjectId(req.params.runId), tenantId: tid(req) }, `Stopped by ${by}`);
    if (!n) throw bad('That run has already ended', 409);
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

/* ── Workflows ─────────────────────────────────────────────────────────── */
router.get('/', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const t = tid(req);
    const [rows, live] = await Promise.all([
      Workflow.find({ tenantId: t }).sort({ status: 1, updatedAt: -1 }).lean(),
      WorkflowRun.aggregate([{ $match: { tenantId: t, status: { $in: ['running', 'waiting'] } } }, { $group: { _id: '$workflowId', n: { $sum: 1 } } }]),
    ]);
    const liveMap = Object.fromEntries(live.map((x: any) => [String(x._id), x.n]));
    res.json({ success: true, data: rows.map((w) => summary(w, liveMap)) });
  } catch (e) { fail(res, e); }
});

router.get('/:id', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw bad('Workflow not found', 404);
    const w: any = await Workflow.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!w) throw bad('Workflow not found', 404);
    const live = await WorkflowRun.countDocuments({ workflowId: w._id, status: { $in: ['running', 'waiting'] } });
    res.json({ success: true, data: { ...w, _id: String(w._id), liveRuns: live, problems: workflowProblems(w) } });
  } catch (e) { fail(res, e); }
});

async function save(req: AuthenticatedRequest, id: string | null) {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 120);
  if (!name) throw bad('Give the workflow a name');
  const doc = {
    name, description: String(b.description || '').trim().slice(0, 500),
    trigger: cleanTrigger(b.trigger), steps: cleanSteps(b.steps), settings: cleanSettings(b.settings),
    updatedBy: req.user!.id,
  };
  if (!id) {
    const w = await Workflow.create({ ...doc, tenantId: tid(req), status: 'draft', createdBy: req.user!.id });
    return w.toObject();
  }
  const existing: any = await Workflow.findOne({ _id: id, tenantId: tid(req) }).lean();
  if (!existing) throw bad('Workflow not found', 404);
  // A live workflow must stay valid: an edit that breaks it is refused, not half-applied.
  if (existing.status === 'active') {
    const problems = workflowProblems(doc as any);
    if (problems.length) throw bad(`This workflow is switched on, so it must stay complete. ${problems[0].message}`);
  }
  return Workflow.findOneAndUpdate({ _id: id, tenantId: tid(req) }, { $set: doc }, { new: true }).lean();
}

router.post('/', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const w: any = await save(req, null);
    res.status(201).json({ success: true, data: { ...w, _id: String(w._id), problems: workflowProblems(w) } });
  } catch (e) { fail(res, e); }
});

router.put('/:id', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw bad('Workflow not found', 404);
    const w: any = await save(req, req.params.id);
    res.json({ success: true, data: { ...w, _id: String(w._id), problems: workflowProblems(w) } });
  } catch (e) { fail(res, e); }
});

/** Switch on / pause / back to draft. Switching on checks the workflow is complete. */
router.post('/:id/status', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw bad('Workflow not found', 404);
    const status = String(req.body?.status || '');
    if (!['active', 'paused', 'draft'].includes(status)) throw bad('Unknown status');
    const w: any = await Workflow.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!w) throw bad('Workflow not found', 404);
    if (status === 'active') {
      const problems = workflowProblems(w);
      if (problems.length) return res.status(400).json({ success: false, message: `Fix ${problems.length === 1 ? 'this' : `these ${problems.length} things`} first: ${problems.map((p) => p.message).join(' · ')}`, problems });
    }
    await Workflow.updateOne({ _id: w._id }, { $set: { status, ...(status === 'active' ? { activatedAt: new Date() } : {}) } });
    // Back to draft ends the people still inside it; pausing only holds them.
    if (status === 'draft') await stopRuns({ workflowId: w._id }, 'The workflow was switched off');
    if (status === 'active' && w.status === 'paused') {
      // Paused runs continue now rather than at their 15-minute recheck.
      await WorkflowRun.updateMany({ workflowId: w._id, status: 'waiting', waitingFor: 'time', resumeAt: { $gt: new Date() }, phase: null }, { $set: { resumeAt: new Date() } });
    }
    res.json({ success: true, data: { status } });
  } catch (e) { fail(res, e); }
});

router.post('/:id/duplicate', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw bad('Workflow not found', 404);
    const w: any = await Workflow.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!w) throw bad('Workflow not found', 404);
    const copy = await Workflow.create({
      tenantId: w.tenantId, name: `${w.name} (copy)`.slice(0, 120), description: w.description, status: 'draft',
      trigger: w.trigger, steps: cleanSteps(w.steps), settings: w.settings, createdBy: req.user!.id, updatedBy: req.user!.id,
    });
    res.status(201).json({ success: true, data: { _id: String(copy._id) } });
  } catch (e) { fail(res, e); }
});

router.delete('/:id', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw bad('Workflow not found', 404);
    const w: any = await Workflow.findOneAndDelete({ _id: req.params.id, tenantId: tid(req) });
    if (!w) throw bad('Workflow not found', 404);
    await stopRuns({ workflowId: w._id }, 'The workflow was deleted');
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

/**
 * Test run: put one lead through this workflow now (also a draft). Real messages are sent, so the
 * builder suggests a test lead with your own number.
 */
router.post('/:id/test', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw bad('Workflow not found', 404);
    const w: any = await Workflow.findOne({ _id: req.params.id, tenantId: tid(req) }).lean();
    if (!w) throw bad('Workflow not found', 404);
    if (!w.steps?.length) throw bad('Add a step first');
    const leadId = String(req.body?.leadId || '');
    if (!mongoose.isValidObjectId(leadId)) throw bad('Choose a lead to test with');
    const lead: any = await Lead.findOne({ _id: leadId, tenantId: tid(req) }).select('phone name').lean();
    if (!lead) throw bad('Lead not found', 404);
    const n = await fire({ tenantId: String(req.tenantId), type: w.trigger.type, workflowId: String(w._id), test: true, leadId, phone: lead.phone, data: { text: String(req.body?.message || '').slice(0, 500), name: lead.name } });
    if (!n) throw bad('Could not start the test run');
    const run: any = await WorkflowRun.findOne({ workflowId: w._id, leadId: lead._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { runId: String(run?._id || ''), status: run?.status, log: run?.log || [] } });
  } catch (e) { fail(res, e); }
});

/** Lead search for the test-run picker. */
router.get('/lookup/leads', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const s = String(req.query.q || '').trim().slice(0, 60);
    if (s.length < 2) return res.json({ success: true, data: [] });
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rows = await Lead.find({ tenantId: tid(req), archivedAt: null, $or: [{ name: new RegExp(esc, 'i') }, { phone: new RegExp(esc.replace(/\D/g, '') || esc) }, { email: new RegExp(esc, 'i') }] })
      .select('name phone email').sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data: rows.map((l: any) => ({ _id: String(l._id), name: l.name, phone: l.phone, email: l.email })) });
  } catch (e) { fail(res, e); }
});

// Re-run a stuck run immediately (used by tests and the Runs view's "Continue now").
router.post('/runs/:runId/continue', ...guard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.runId)) throw bad('Run not found', 404);
    const claimed = await WorkflowRun.findOneAndUpdate({ _id: req.params.runId, tenantId: tid(req), status: 'waiting', waitingFor: 'time' }, { $set: { status: 'running', lockedAt: new Date() } });
    if (!claimed) throw bad('Only a run that is waiting on a timer can be continued now', 409);
    await execute(claimed._id, { reason: 'time' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

export default router;
