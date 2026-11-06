/**
 * Pipeline settings — stages → sub-stages → reasons, configured per institute.
 *
 * Mounted at /api/v1/lead-pipeline. The older /lead-stages routes keep working for the
 * pages that only read stages; this controller is what the Pipeline settings page uses.
 *
 * Rules kept here (the page relies on them):
 *  - everything is tenant-scoped; a sub-stage must belong to a stage of the same institute,
 *    a reason to a sub-stage of the same institute;
 *  - nothing that leads still sit in can be deleted (deactivate instead);
 *  - a stage Outpero or a Google Sheet sync points at cannot be deleted either;
 *  - a stage's `milestone` keeps the legacy `category` / `isLostStage` flags in step, so older
 *    code (Outpero stop, lost-stage approval, team activity) keeps behaving.
 */
import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import LeadStage from '../models/LeadStage';
import LeadSubStage from '../models/LeadSubStage';
import LeadReason from '../models/LeadReason';
import Lead from '../models/Lead';
import GoogleSheetIntegration from '../models/GoogleSheetIntegration';
import { LEAD_MILESTONES, MILESTONE_LABELS, categoryForMilestone, isMilestone, milestoneFromLegacy } from '../config/leadMilestones';
import { STARTER_PIPELINE } from '../config/leadStarterPipeline';
import { getPolicy as getOutperoPolicy } from '../services/outperoPolicyService';
import LeadPicklist from '../models/LeadPicklist';
import { getList, ensureDefaults, isPicklist, codeFromLabel } from '../services/leadPicklistService';

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
const isOid = (v: any) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);
const HEX = /^#[0-9a-fA-F]{6}$/;
const str = (v: any, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const bool = (v: any) => (typeof v === 'boolean' ? v : undefined);

function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message });
}
function dupOrFail(res: Response, err: any, what: string) {
  if (err?.code === 11000) return fail(res, 400, `A ${what} with this name already exists here`);
  return fail(res, 500, err?.message || `Failed to save ${what}`);
}

// ─────────────────────────────── Read ───────────────────────────────

/** GET / — the whole pipeline (inactive items included), with lead counts. */
export const getPipeline = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = oid(req.tenantId);
    const [stages, subStages, reasons, stageCounts, subCounts] = await Promise.all([
      LeadStage.find({ tenantId }).sort({ order: 1 }).lean(),
      LeadSubStage.find({ tenantId }).sort({ order: 1 }).lean(),
      LeadReason.find({ tenantId }).sort({ order: 1 }).lean(),
      Lead.aggregate([{ $match: { tenantId, archivedAt: null } }, { $group: { _id: '$stageId', n: { $sum: 1 } } }]),
      Lead.aggregate([{ $match: { tenantId, archivedAt: null, subStageId: { $exists: true } } }, { $group: { _id: '$subStageId', n: { $sum: 1 } } }]),
    ]);
    const stageN = new Map(stageCounts.map((c: any) => [String(c._id), c.n]));
    const subN = new Map(subCounts.map((c: any) => [String(c._id), c.n]));

    const outpero = getOutperoPolicy(String(req.tenantId));
    const outperoStageIds = new Set([outpero.sentStageId, ...Object.values(outpero.stageMapping || {})].filter(Boolean).map(String));

    const data = stages.map((s: any) => ({
      ...s,
      milestoneEffective: milestoneFromLegacy(s),
      leadCount: stageN.get(String(s._id)) || 0,
      usedByOutpero: outperoStageIds.has(String(s._id)),
      subStages: subStages
        .filter((ss: any) => String(ss.stageId) === String(s._id))
        .map((ss: any) => ({
          ...ss,
          leadCount: subN.get(String(ss._id)) || 0,
          reasons: reasons.filter((r: any) => String(r.subStageId) === String(ss._id)),
        })),
    }));

    res.json({
      success: true,
      data: {
        stages: data,
        milestones: LEAD_MILESTONES.map(m => ({ value: m, label: MILESTONE_LABELS[m] })),
      },
    });
  } catch (err: any) {
    fail(res, 500, err.message || 'Failed to load pipeline');
  }
};

// ─────────────────────────────── Stages ───────────────────────────────

function stageFields(body: any) {
  const out: Record<string, any> = {};
  const name = str(body.name, 60); if (name !== undefined) out.name = name;
  const description = str(body.description, 300); if (description !== undefined) out.description = description;
  // Name Meta receives for this stage's milestone (blank = default per milestone).
  const metaEventName = str(body.metaEventName, 60); if (metaEventName !== undefined) out.metaEventName = metaEventName;
  if (typeof body.color === 'string' && HEX.test(body.color)) out.color = body.color;
  for (const k of ['requiresReason', 'requiresNote', 'isActive', 'isFinal'] as const) {
    const b = bool(body[k]); if (b !== undefined) out[k] = b;
  }
  if (body.milestone !== undefined) {
    if (!isMilestone(body.milestone)) throw new Error('Unknown milestone');
    out.milestone = body.milestone;
    out.category = categoryForMilestone(body.milestone);
    out.isLostStage = body.milestone === 'lost';
  }
  return out;
}

/** POST /stages */
export const createStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields = stageFields(req.body);
    if (!fields.name) return fail(res, 400, 'Stage name is required');
    const last = await LeadStage.findOne({ tenantId: req.tenantId }).sort({ order: -1 }).select('order').lean() as any;
    const stage = await LeadStage.create({
      color: '#005897', milestone: 'none', category: 'engaging',
      ...fields, tenantId: req.tenantId, order: (last?.order ?? -1) + 1, isDefault: false,
    });
    res.status(201).json({ success: true, data: stage });
  } catch (err: any) {
    if (err.message === 'Unknown milestone') return fail(res, 400, err.message);
    dupOrFail(res, err, 'stage');
  }
};

/** PUT /stages/:id */
export const updateStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields = stageFields(req.body);
    if (fields.name === '') return fail(res, 400, 'Stage name is required');
    const stage = await LeadStage.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!stage) return fail(res, 404, 'Stage not found');
    if (fields.isActive === false && stage.isDefault) {
      return fail(res, 400, 'This is the stage new leads land in. Make another stage the landing stage first.');
    }
    stage.set(fields);
    await stage.save();
    res.json({ success: true, data: stage });
  } catch (err: any) {
    if (err.message === 'Unknown milestone') return fail(res, 400, err.message);
    dupOrFail(res, err, 'stage');
  }
};

/** PUT /stages/:id/landing — make this the one stage new leads land in. */
export const setLandingStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stage = await LeadStage.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!stage) return fail(res, 404, 'Stage not found');
    if (!stage.isActive) return fail(res, 400, 'Switch the stage on first');
    await LeadStage.updateMany({ tenantId: req.tenantId, _id: { $ne: stage._id } }, { $set: { isDefault: false } });
    stage.isDefault = true;
    await stage.save();
    res.json({ success: true, data: stage });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** Why a stage cannot be deleted, or null if it can. */
async function stageDeleteBlocker(tenantId: string, stage: any): Promise<string | null> {
  if (stage.isDefault) return 'New leads land in this stage. Make another stage the landing stage first.';
  const leads = await Lead.countDocuments({ tenantId, stageId: stage._id });
  if (leads) return `${leads} lead(s) are in this stage (including archived). Move them first, or switch the stage off instead.`;
  const outpero = getOutperoPolicy(tenantId);
  const ids = [outpero.sentStageId, ...Object.values(outpero.stageMapping || {})].filter(Boolean).map(String);
  if (ids.includes(String(stage._id))) return 'Outpero settings move leads into this stage. Change Outpero settings first.';
  const sheets = await GoogleSheetIntegration.countDocuments({ tenantId, defaultStageId: stage._id } as any);
  if (sheets) return 'A Google Sheet sync puts new leads into this stage. Change that sync first.';
  return null;
}

/** DELETE /stages/:id — also deletes its sub-stages and reasons. */
export const deleteStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stage = await LeadStage.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!stage) return fail(res, 404, 'Stage not found');
    const blocker = await stageDeleteBlocker(String(req.tenantId), stage);
    if (blocker) return fail(res, 400, blocker);
    await LeadReason.deleteMany({ tenantId: req.tenantId, stageId: stage._id });
    await LeadSubStage.deleteMany({ tenantId: req.tenantId, stageId: stage._id });
    await stage.deleteOne();
    res.json({ success: true, message: 'Stage deleted' });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** Shared reorder: `ids` in the new order, all belonging to this tenant (and parent). */
async function reorder(model: mongoose.Model<any>, req: AuthenticatedRequest, res: Response, parent?: Record<string, any>) {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.every(isOid)) return fail(res, 400, 'ids must be a list of ids');
  await model.bulkWrite(ids.map((id: string, i: number) => ({
    updateOne: { filter: { _id: oid(id), tenantId: oid(req.tenantId), ...(parent || {}) }, update: { $set: { order: i } } },
  })));
  res.json({ success: true });
}

/** PUT /stages/reorder  { ids } */
export const reorderStages = (req: AuthenticatedRequest, res: Response) =>
  reorder(LeadStage, req, res).catch(err => fail(res, 500, err.message));

// ─────────────────────────────── Sub-stages ───────────────────────────────

function subStageFields(body: any) {
  const out: Record<string, any> = {};
  const name = str(body.name, 80); if (name !== undefined) out.name = name;
  if (typeof body.color === 'string' && (HEX.test(body.color) || body.color === '')) out.color = body.color || undefined;
  for (const k of ['requiresReason', 'requiresNote', 'requiresFollowUp', 'isActive'] as const) {
    const b = bool(body[k]); if (b !== undefined) out[k] = b;
  }
  return out;
}

/** POST /sub-stages  { stageId, name, ... } */
export const createSubStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stageId } = req.body || {};
    if (!isOid(stageId)) return fail(res, 400, 'stageId is required');
    const stage = await LeadStage.exists({ _id: stageId, tenantId: req.tenantId });
    if (!stage) return fail(res, 404, 'Stage not found');
    const fields = subStageFields(req.body);
    if (!fields.name) return fail(res, 400, 'Sub-stage name is required');
    const last = await LeadSubStage.findOne({ tenantId: req.tenantId, stageId }).sort({ order: -1 }).select('order').lean() as any;
    const sub = await LeadSubStage.create({ ...fields, tenantId: req.tenantId, stageId, order: (last?.order ?? -1) + 1 });
    res.status(201).json({ success: true, data: sub });
  } catch (err: any) {
    dupOrFail(res, err, 'sub-stage');
  }
};

/** PUT /sub-stages/:id */
export const updateSubStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields = subStageFields(req.body);
    if (fields.name === '') return fail(res, 400, 'Sub-stage name is required');
    const sub = await LeadSubStage.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: fields }, { new: true, runValidators: true });
    if (!sub) return fail(res, 404, 'Sub-stage not found');
    res.json({ success: true, data: sub });
  } catch (err: any) {
    dupOrFail(res, err, 'sub-stage');
  }
};

/** DELETE /sub-stages/:id — also deletes its reasons. */
export const deleteSubStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sub = await LeadSubStage.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!sub) return fail(res, 404, 'Sub-stage not found');
    const leads = await Lead.countDocuments({ tenantId: req.tenantId, subStageId: sub._id });
    if (leads) return fail(res, 400, `${leads} lead(s) are in this sub-stage. Move them first, or switch it off instead.`);
    await LeadReason.deleteMany({ tenantId: req.tenantId, subStageId: sub._id });
    await sub.deleteOne();
    res.json({ success: true, message: 'Sub-stage deleted' });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** PUT /stages/:id/sub-stages/reorder  { ids } */
export const reorderSubStages = (req: AuthenticatedRequest, res: Response) =>
  reorder(LeadSubStage, req, res, { stageId: oid(req.params.id) }).catch(err => fail(res, 500, err.message));

// ─────────────────────────────── Reasons ───────────────────────────────

function reasonFields(body: any) {
  const out: Record<string, any> = {};
  const name = str(body.name, 120); if (name !== undefined) out.name = name;
  for (const k of ['requiresDetail', 'isActive'] as const) {
    const b = bool(body[k]); if (b !== undefined) out[k] = b;
  }
  return out;
}

/** POST /reasons  { subStageId, name, ... } */
export const createReason = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subStageId } = req.body || {};
    if (!isOid(subStageId)) return fail(res, 400, 'subStageId is required');
    const sub = await LeadSubStage.findOne({ _id: subStageId, tenantId: req.tenantId }).select('stageId').lean() as any;
    if (!sub) return fail(res, 404, 'Sub-stage not found');
    const fields = reasonFields(req.body);
    if (!fields.name) return fail(res, 400, 'Reason is required');
    const last = await LeadReason.findOne({ tenantId: req.tenantId, subStageId }).sort({ order: -1 }).select('order').lean() as any;
    const reason = await LeadReason.create({ ...fields, tenantId: req.tenantId, stageId: sub.stageId, subStageId, order: (last?.order ?? -1) + 1 });
    res.status(201).json({ success: true, data: reason });
  } catch (err: any) {
    dupOrFail(res, err, 'reason');
  }
};

/** PUT /reasons/:id */
export const updateReason = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields = reasonFields(req.body);
    if (fields.name === '') return fail(res, 400, 'Reason is required');
    const reason = await LeadReason.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: fields }, { new: true, runValidators: true });
    if (!reason) return fail(res, 404, 'Reason not found');
    res.json({ success: true, data: reason });
  } catch (err: any) {
    dupOrFail(res, err, 'reason');
  }
};

/** DELETE /reasons/:id */
export const deleteReason = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reason = await LeadReason.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!reason) return fail(res, 404, 'Reason not found');
    const leads = await Lead.countDocuments({ tenantId: req.tenantId, reasonId: reason._id });
    if (leads) return fail(res, 400, `${leads} lead(s) were closed with this reason. Switch it off instead so history stays readable.`);
    await reason.deleteOne();
    res.json({ success: true, message: 'Reason deleted' });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** PUT /sub-stages/:id/reasons/reorder  { ids } */
export const reorderReasons = (req: AuthenticatedRequest, res: Response) =>
  reorder(LeadReason, req, res, { subStageId: oid(req.params.id) }).catch(err => fail(res, 500, err.message));

// ─────────────────────────────── Starter set ───────────────────────────────

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * POST /starter — add the starter pipeline. Additive only: a stage whose name already exists is
 * reused (its milestone is filled in only if it has none); missing sub-stages and reasons are
 * added; nothing existing is renamed, recoloured, reordered or removed. Safe to run twice.
 */
export const addStarterPipeline = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const summary = { stagesCreated: 0, stagesReused: 0, subStagesCreated: 0, reasonsCreated: 0 };
    const existing = await LeadStage.find({ tenantId });
    let nextOrder = existing.reduce((m, s) => Math.max(m, s.order), -1) + 1;

    for (const st of STARTER_PIPELINE) {
      let stage = existing.find(s => sameName(s.name, st.name));
      if (stage) {
        summary.stagesReused++;
        if (!stage.milestone) {
          stage.set({ milestone: st.milestone, category: categoryForMilestone(st.milestone), isLostStage: st.milestone === 'lost' });
          await stage.save();
        }
      } else {
        stage = await LeadStage.create({
          tenantId, name: st.name, color: st.color, description: st.description, order: nextOrder++,
          milestone: st.milestone, category: categoryForMilestone(st.milestone), isLostStage: st.milestone === 'lost',
          isFinal: !!st.isFinal, isDefault: false, isActive: true,
        });
        existing.push(stage);
        summary.stagesCreated++;
      }

      const subs = await LeadSubStage.find({ tenantId, stageId: stage._id });
      let subOrder = subs.reduce((m, s) => Math.max(m, s.order), -1) + 1;
      for (const ss of st.subStages) {
        let sub = subs.find(s => sameName(s.name, ss.name));
        if (!sub) {
          sub = await LeadSubStage.create({
            tenantId, stageId: stage._id, name: ss.name, order: subOrder++,
            requiresReason: !!ss.requiresReason, requiresNote: !!ss.requiresNote, requiresFollowUp: !!ss.requiresFollowUp,
          });
          subs.push(sub);
          summary.subStagesCreated++;
        }
        const reasons = await LeadReason.find({ tenantId, subStageId: sub._id });
        let rOrder = reasons.reduce((m, r) => Math.max(m, r.order), -1) + 1;
        for (const r of ss.reasons || []) {
          if (reasons.some(x => sameName(x.name, r.name))) continue;
          await LeadReason.create({ tenantId, stageId: stage._id, subStageId: sub._id, name: r.name, requiresDetail: !!r.requiresDetail, order: rOrder++ });
          summary.reasonsCreated++;
        }
      }
    }

    // An institute with no landing stage at all gets the starter "New Lead".
    if (!(await LeadStage.exists({ tenantId, isDefault: true, isActive: true }))) {
      const landing = existing.find(s => sameName(s.name, STARTER_PIPELINE[0].name));
      if (landing) { landing.isDefault = true; await landing.save(); }
    }

    res.json({ success: true, data: summary });
  } catch (err: any) {
    fail(res, 500, err.message || 'Failed to add starter stages');
  }
};

// ─────────────────────────────── Option lists ───────────────────────────────
// Call outcomes and follow-up reasons (models/LeadPicklist.ts).

/** GET /picklists/:list?active=1 */
export const getPicklist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { list } = req.params;
    if (!isPicklist(list)) return fail(res, 404, 'Unknown list');
    const items = await getList(String(req.tenantId), list, req.query.active === '1');
    res.json({ success: true, data: items });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

function picklistFields(body: any) {
  const out: Record<string, any> = {};
  const label = str(body.label, 80); if (label !== undefined) out.label = label;
  for (const k of ['isActive', 'countsAsConnected'] as const) {
    const b = bool(body[k]); if (b !== undefined) out[k] = b;
  }
  if (body.retryHours !== undefined) {
    const n = Number(body.retryHours);
    if (!Number.isFinite(n) || n < 0 || n > 720) throw new Error('Retry hours must be between 0 and 720');
    out.retryHours = Math.round(n);
  }
  return out;
}

/** POST /picklists/:list  { label, ... } — the code is made from the label. */
export const createPicklistItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { list } = req.params;
    if (!isPicklist(list)) return fail(res, 404, 'Unknown list');
    const fields = picklistFields(req.body);
    if (!fields.label) return fail(res, 400, 'Label is required');
    await ensureDefaults(String(req.tenantId), list);
    const last = await LeadPicklist.findOne({ tenantId: req.tenantId, list }).sort({ order: -1 }).select('order').lean() as any;
    const item = await LeadPicklist.create({
      ...fields, tenantId: req.tenantId, list, code: codeFromLabel(fields.label), order: (last?.order ?? -1) + 1, isSystem: false,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    if (err?.code === 11000) return fail(res, 400, 'An option with this name already exists');
    fail(res, 400, err.message);
  }
};

/** PUT /picklists/items/:id */
export const updatePicklistItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fields = picklistFields(req.body);
    if (fields.label === '') return fail(res, 400, 'Label is required');
    const item = await LeadPicklist.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: fields }, { new: true, runValidators: true });
    if (!item) return fail(res, 404, 'Option not found');
    res.json({ success: true, data: item });
  } catch (err: any) {
    fail(res, 400, err.message);
  }
};

/** DELETE /picklists/items/:id — built-in options can only be switched off. */
export const deletePicklistItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await LeadPicklist.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) return fail(res, 404, 'Option not found');
    if (item.isSystem) return fail(res, 400, 'Built-in options cannot be deleted. Switch it off instead.');
    if (item.list === 'call_outcome') {
      const used = await Lead.exists({ tenantId: req.tenantId, 'activities.callOutcome': item.code });
      if (used) return fail(res, 400, 'Calls were logged with this outcome. Switch it off instead so history stays readable.');
    }
    await item.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
};

/** PUT /picklists/:list/reorder  { ids } */
export const reorderPicklist = (req: AuthenticatedRequest, res: Response) => {
  if (!isPicklist(req.params.list)) return fail(res, 404, 'Unknown list');
  return reorder(LeadPicklist, req, res, { list: req.params.list }).catch(err => fail(res, 500, err.message));
};
