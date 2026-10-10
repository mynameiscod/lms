import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadArchiveRun from '../models/LeadArchiveRun';
import FollowUpReminder from '../models/FollowUpReminder';
import Meeting from '../models/Meeting';
import SeatReservation from '../models/SeatReservation';
import LeadStageHistory from '../models/LeadStageHistory';
import OutperoCall from '../models/OutperoCall';
import SalesCallRecording from '../models/SalesCallRecording';
import WhatsAppThread from '../models/WhatsAppThread';
import AssessmentSubmission from '../models/AssessmentSubmission';
import BattleRegistration from '../models/BattleRegistration';
import SalesContent from '../models/SalesContent';
import User from '../models/User';
import { runWithTenant } from './requestContext';

/**
 * Archiving leads nobody works any more — chosen by an admin with filters, previewed, then done in
 * the background in batches so the system never stalls.
 *
 * Archived is not deleted: the lead keeps everything and leaves the working lists, counts and sends.
 * Reports still count it. If the person enquires again the lead comes back by itself. Three years
 * after archiving an admin may delete it for good, together with what points at it.
 */

export class ArchiveError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const BATCH = 500;
export const PURGE_AFTER_YEARS = 3;
/** Leads a counsellor touched this recently are never archived, whatever the filter says. */
export const DEFAULT_PROTECT_DAYS = 14;
export const MIN_PROTECT_DAYS = 7;

const oid = (v: unknown) => new mongoose.Types.ObjectId(String(v));
const ids = (v: unknown) => (Array.isArray(v) ? v : []).map(String).filter((x) => mongoose.Types.ObjectId.isValid(x)).map(oid);
const strs = (v: unknown) => (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 50);
const date = (v: unknown) => { if (!v) return null; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d; };
const DAY = 86_400_000;

export interface ArchiveFilters {
  stageIds?: string[];
  sources?: string[];
  priorities?: string[];
  createdFrom?: string;
  createdTo?: string;
  /** No counsellor action (or, if never touched, created) for at least this many days. */
  inactiveDays?: number;
  assignment?: 'any' | 'assigned' | 'unassigned';
  campaign?: string;
  duplicatesOnly?: boolean;
  /** Skip leads a counsellor touched in this many days. Never below MIN_PROTECT_DAYS. */
  protectDays?: number;
}

export function cleanFilters(raw: any): ArchiveFilters {
  const f: ArchiveFilters = {
    stageIds: strs(raw?.stageIds).filter((x) => mongoose.Types.ObjectId.isValid(x)),
    sources: strs(raw?.sources),
    priorities: strs(raw?.priorities).filter((p) => ['hot', 'warm', 'cold'].includes(p)),
    createdFrom: date(raw?.createdFrom)?.toISOString(),
    createdTo: date(raw?.createdTo)?.toISOString(),
    inactiveDays: Number(raw?.inactiveDays) > 0 ? Math.min(3650, Math.round(Number(raw.inactiveDays))) : undefined,
    assignment: ['assigned', 'unassigned'].includes(raw?.assignment) ? raw.assignment : 'any',
    campaign: String(raw?.campaign || '').trim().slice(0, 120) || undefined,
    duplicatesOnly: raw?.duplicatesOnly === true,
    protectDays: Math.max(MIN_PROTECT_DAYS, Number(raw?.protectDays) > 0 ? Math.round(Number(raw.protectDays)) : DEFAULT_PROTECT_DAYS),
  };
  const narrows = f.stageIds!.length || f.sources!.length || f.priorities!.length || f.createdFrom || f.createdTo
    || f.inactiveDays || f.assignment !== 'any' || f.campaign || f.duplicatesOnly;
  if (!narrows) throw new ArchiveError('Choose at least one filter, so the whole lead list is never archived by accident.');
  return f;
}

/** The leads the filters describe, before anything is protected. Active (not archived) only. */
export function matchQuery(tenantId: string, f: ArchiveFilters, now = new Date()): any {
  const q: any = { tenantId: oid(tenantId), archivedAt: null };
  const and: any[] = [];
  if (f.stageIds?.length) q.stageId = { $in: f.stageIds.map(oid) };
  if (f.sources?.length) q.source = { $in: f.sources };
  if (f.priorities?.length) q.priority = { $in: f.priorities };
  if (f.createdFrom || f.createdTo) {
    q.createdAt = {};
    if (f.createdFrom) q.createdAt.$gte = new Date(f.createdFrom);
    if (f.createdTo) q.createdAt.$lte = new Date(f.createdTo);
  }
  if (f.inactiveDays) {
    const cutoff = new Date(now.getTime() - f.inactiveDays * DAY);
    and.push({ $or: [
      { 'telecallerMetrics.lastActionAt': { $lt: cutoff } },
      { 'telecallerMetrics.lastActionAt': { $exists: false }, createdAt: { $lt: cutoff } },
      { 'telecallerMetrics.lastActionAt': null, createdAt: { $lt: cutoff } },
    ] });
  }
  if (f.assignment === 'assigned') q.assignedTo = { $ne: null };
  if (f.assignment === 'unassigned') and.push({ $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] });
  if (f.campaign) {
    const rx = new RegExp(f.campaign.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    and.push({ $or: [{ 'sourceDetails.campaignName': rx }, { 'utmParams.campaign': rx }] });
  }
  if (and.length) q.$and = and;
  return q;
}

/**
 * What is never archived: a lead someone is still working, one that became a student or paid, one
 * with something booked, and one mid-way through an AI call.
 */
export async function protectionClause(tenantId: string, f: ArchiveFilters, now = new Date()) {
  const t = oid(tenantId);
  const [followUps, meetings, seats] = await Promise.all([
    FollowUpReminder.distinct('leadId', { tenantId: t, status: 'scheduled', scheduledAt: { $gte: now } }),
    Meeting.distinct('leadId', { tenantId: t, status: { $in: ['scheduled', 'rescheduled'] }, scheduledAt: { $gte: now } }),
    SeatReservation.distinct('leadId', { tenantId: t }),
  ]);
  const booked = [...followUps, ...meetings, ...seats].filter(Boolean);
  const recent = new Date(now.getTime() - (f.protectDays || DEFAULT_PROTECT_DAYS) * DAY);
  return {
    $nor: [
      { convertedStudentId: { $exists: true, $ne: null } },
      { paymentStatus: { $in: ['deposit_paid', 'full_pending', 'full_paid'] } },
      { nextFollowUp: { $gte: now } },
      { 'outpero.status': 'pending' },
      { 'telecallerMetrics.lastActionAt': { $gte: recent } },
      ...(booked.length ? [{ _id: { $in: booked } }] : []),
    ],
  };
}

/**
 * For "duplicates only": among leads sharing the last ten digits of a phone, every one but the
 * most recently worked. The kept lead is the newest by counsellor action, then by creation.
 */
async function duplicateIds(tenantId: string): Promise<mongoose.Types.ObjectId[]> {
  // Digits only: "+91 98765 43210" and "9876543210" are the same person. Read lean and small.
  const rows: any[] = await Lead.find({ tenantId: oid(tenantId), archivedAt: null, phone: { $type: 'string', $ne: '' } })
    .select('phone createdAt telecallerMetrics.lastActionAt').lean();
  const groups = new Map<string, { id: any; when: number }[]>();
  for (const r of rows) {
    const tail = String(r.phone).replace(/\D/g, '').slice(-10);
    if (tail.length < 10) continue;
    const when = new Date(r.telecallerMetrics?.lastActionAt || r.createdAt || 0).getTime();
    if (!groups.has(tail)) groups.set(tail, []);
    groups.get(tail)!.push({ id: r._id, when });
  }
  const out: mongoose.Types.ObjectId[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.when - a.when);
    out.push(...list.slice(1).map((x) => x.id));
  }
  return out;
}

async function eligibleQuery(tenantId: string, f: ArchiveFilters) {
  const base = matchQuery(tenantId, f);
  if (f.duplicatesOnly) base._id = { $in: await duplicateIds(tenantId) };
  const protect = await protectionClause(tenantId, f);
  return { base, eligible: { $and: [base, protect] } };
}

export async function previewArchive(tenantId: string, raw: any) {
  const f = cleanFilters(raw);
  const { base, eligible } = await eligibleQuery(tenantId, f);
  const [matched, willArchive, sample] = await Promise.all([
    Lead.countDocuments(base),
    Lead.countDocuments(eligible),
    Lead.find(eligible).select('name phone email source stageId assignedTo createdAt telecallerMetrics.lastActionAt')
      .populate('stageId', 'name').populate('assignedTo', 'firstName lastName').sort({ createdAt: 1 }).limit(10).lean(),
  ]);
  return { filters: f, matched, willArchive, protected: matched - willArchive, sample };
}

async function finish(runId: unknown, patch: Record<string, any>) {
  await LeadArchiveRun.updateOne({ _id: runId }, { $set: { ...patch, finishedAt: new Date() } });
}

/** Start an archive run. Returns at once; the run's row shows its progress. */
export async function startArchive(tenantId: string, userId: string, raw: any) {
  const f = cleanFilters(raw);
  const reason = String(raw?.reason || '').trim().slice(0, 300);
  if (await LeadArchiveRun.exists({ tenantId: oid(tenantId), status: 'running' })) {
    throw new ArchiveError('Another archive or delete is still running. Wait for it to finish.', 409);
  }
  const { base, eligible } = await eligibleQuery(tenantId, f);
  const [matched, willArchive] = await Promise.all([Lead.countDocuments(base), Lead.countDocuments(eligible)]);
  if (!willArchive) throw new ArchiveError('No leads match these filters once protected leads are left out.');
  const who: any = await User.findById(userId).select('firstName lastName').lean();
  const run = await LeadArchiveRun.create({
    tenantId: oid(tenantId), kind: 'archive', filters: f, reason, matched, skippedProtected: matched - willArchive,
    startedBy: oid(userId), startedByName: [who?.firstName, who?.lastName].filter(Boolean).join(' '),
  });

  const work = async () => {
    let processed = 0;
    try {
      for (;;) {
        // The query is asked again each batch: archived leads drop out of it, so this ends.
        const batch = (await Lead.find(eligible).select('_id').limit(BATCH).lean()).map((l: any) => l._id);
        if (!batch.length) break;
        const r = await Lead.updateMany({ _id: { $in: batch }, archivedAt: null }, {
          $set: { archivedAt: new Date(), archivedBy: oid(userId), archiveRunId: run._id, ...(reason ? { archiveReason: reason } : {}) },
        });
        processed += r.modifiedCount;
        await LeadArchiveRun.updateOne({ _id: run._id }, { $set: { processed } });
        if (!r.modifiedCount) break;
      }
      await finish(run._id, { status: 'done', processed });
    } catch (e: any) {
      await finish(run._id, { status: 'failed', processed, error: String(e?.message || e).slice(0, 500) });
    }
  };
  setImmediate(() => { runWithTenant(tenantId, work).catch(() => undefined); });
  return run.toObject();
}

/** Bring leads back — chosen ones, or everything one archive run took. */
export async function restore(tenantId: string, userId: string, input: { leadIds?: unknown; runId?: unknown }) {
  const q: any = { tenantId: oid(tenantId), archivedAt: { $ne: null } };
  let undoes: mongoose.Types.ObjectId | undefined;
  if (input.runId && mongoose.Types.ObjectId.isValid(String(input.runId))) {
    undoes = oid(input.runId);
    q.archiveRunId = undoes;
  } else {
    const list = ids(input.leadIds);
    if (!list.length) throw new ArchiveError('Choose the leads to restore.');
    if (list.length > 5000) throw new ArchiveError('Restore at most 5,000 leads at a time, or restore the whole run.');
    q._id = { $in: list };
  }
  const r = await Lead.updateMany(q, { $set: { archivedAt: null }, $unset: { archivedBy: 1, archiveReason: 1, archiveRunId: 1 } });
  const who: any = await User.findById(userId).select('firstName lastName').lean();
  await LeadArchiveRun.create({
    tenantId: oid(tenantId), kind: 'restore', filters: undoes ? { runId: String(undoes) } : { leads: r.modifiedCount },
    matched: r.matchedCount, processed: r.modifiedCount, status: 'done', finishedAt: new Date(),
    startedBy: oid(userId), startedByName: [who?.firstName, who?.lastName].filter(Boolean).join(' '), ...(undoes ? { undoesRunId: undoes } : {}),
  });
  return { restored: r.modifiedCount };
}

/**
 * A lead that comes back on its own: the person enquired again (form, ad, WhatsApp, assessment).
 * Called from every path that finds an existing lead by phone, so nobody becomes a duplicate.
 */
export async function reviveIfArchived(leadId: unknown, how: string): Promise<boolean> {
  if (!leadId || !mongoose.Types.ObjectId.isValid(String(leadId))) return false;
  const r = await Lead.updateOne({ _id: leadId, archivedAt: { $ne: null } }, {
    $set: { archivedAt: null },
    $unset: { archivedBy: 1, archiveReason: 1, archiveRunId: 1 },
    $push: { activities: { type: 'note', description: `♻️ Restored from archive — ${how}`, createdAt: new Date() } },
  });
  return r.modifiedCount > 0;
}

export async function listArchived(tenantId: string, q: { search?: string; page?: number; limit?: number; runId?: string }) {
  const filter: any = { tenantId: oid(tenantId), archivedAt: { $ne: null } };
  if (q.runId && mongoose.Types.ObjectId.isValid(q.runId)) filter.archiveRunId = oid(q.runId);
  const term = String(q.search || '').trim().slice(0, 80);
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const digits = term.replace(/\D/g, '');
    filter.$or = [{ name: rx }, { email: rx }, ...(digits.length >= 4 ? [{ phone: new RegExp(digits) }] : [])];
  }
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
  const page = Math.max(1, Number(q.page) || 1);
  const [rows, total] = await Promise.all([
    Lead.find(filter).select('name phone email source stageId archivedAt archiveReason archiveRunId createdAt')
      .populate('stageId', 'name').sort({ archivedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listRuns(tenantId: string) {
  return LeadArchiveRun.find({ tenantId: oid(tenantId) }).sort({ createdAt: -1 }).limit(50).lean();
}

export async function getRun(tenantId: string, runId: string) {
  if (!mongoose.Types.ObjectId.isValid(runId)) throw new ArchiveError('Run not found', 404);
  const r = await LeadArchiveRun.findOne({ _id: runId, tenantId: oid(tenantId) }).lean();
  if (!r) throw new ArchiveError('Run not found', 404);
  return r;
}

/* ── Permanent delete, three years after archiving ─────────────────────────────────────── */

const purgeCutoff = (now = new Date()) => new Date(new Date(now).setFullYear(now.getFullYear() - PURGE_AFTER_YEARS));
const purgeQuery = (tenantId: string, now = new Date()) => ({ tenantId: oid(tenantId), archivedAt: { $ne: null, $lte: purgeCutoff(now) } });

export async function previewPurge(tenantId: string) {
  const q = purgeQuery(tenantId);
  const [count, oldest] = await Promise.all([
    Lead.countDocuments(q),
    Lead.find(q).select('name archivedAt').sort({ archivedAt: 1 }).limit(10).lean(),
  ]);
  return { count, cutoff: purgeCutoff(), sample: oldest };
}

/**
 * Delete for good. What exists only for the lead goes with it (follow-ups, meetings, stage history,
 * AI and sales calls). Records with a life of their own (a WhatsApp conversation, an assessment, a
 * registration, a seat) stay but stop pointing at it.
 */
export async function startPurge(tenantId: string, userId: string, confirm: unknown) {
  const { count } = await previewPurge(tenantId);
  if (!count) throw new ArchiveError(`No leads have been archived for ${PURGE_AFTER_YEARS} years.`);
  if (Number(confirm) !== count) throw new ArchiveError(`Type the number of leads (${count}) to confirm the permanent delete.`);
  if (await LeadArchiveRun.exists({ tenantId: oid(tenantId), status: 'running' })) {
    throw new ArchiveError('Another archive or delete is still running. Wait for it to finish.', 409);
  }
  const who: any = await User.findById(userId).select('firstName lastName').lean();
  const run = await LeadArchiveRun.create({
    tenantId: oid(tenantId), kind: 'purge', filters: { archivedBefore: purgeCutoff().toISOString() }, matched: count,
    startedBy: oid(userId), startedByName: [who?.firstName, who?.lastName].filter(Boolean).join(' '),
  });
  const work = async () => {
    let processed = 0;
    try {
      for (;;) {
        const batch = (await Lead.find(purgeQuery(tenantId)).select('_id').limit(BATCH).lean()).map((l: any) => l._id);
        if (!batch.length) break;
        const by = { leadId: { $in: batch } };
        await Promise.all([
          FollowUpReminder.deleteMany(by), Meeting.deleteMany(by), LeadStageHistory.deleteMany(by),
          OutperoCall.deleteMany(by), SalesCallRecording.deleteMany(by),
          WhatsAppThread.updateMany(by, { $unset: { leadId: 1 } }),
          AssessmentSubmission.updateMany(by, { $unset: { leadId: 1 } }),
          BattleRegistration.updateMany(by, { $unset: { leadId: 1 } }),
          SalesContent.updateMany(by, { $unset: { leadId: 1 } }),
          SeatReservation.updateMany(by, { $unset: { leadId: 1 } }),
        ]);
        const r = await Lead.deleteMany({ _id: { $in: batch }, ...purgeQuery(tenantId) });
        processed += r.deletedCount || 0;
        await LeadArchiveRun.updateOne({ _id: run._id }, { $set: { processed } });
        if (!r.deletedCount) break;
      }
      await finish(run._id, { status: 'done', processed });
    } catch (e: any) {
      await finish(run._id, { status: 'failed', processed, error: String(e?.message || e).slice(0, 500) });
    }
  };
  setImmediate(() => { runWithTenant(tenantId, work).catch(() => undefined); });
  return run.toObject();
}

/** Options for the filter screen: stages and sources with how many active leads each has. */
export async function filterOptions(tenantId: string) {
  const t = oid(tenantId);
  const LeadStage = mongoose.model('LeadStage');
  const [stages, counts, sources, archived] = await Promise.all([
    LeadStage.find({ tenantId: t }).select('name order').sort({ order: 1 }).lean(),
    Lead.aggregate([{ $match: { tenantId: t, archivedAt: null } }, { $group: { _id: '$stageId', n: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: { tenantId: t, archivedAt: null } }, { $group: { _id: '$source', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    Lead.countDocuments({ tenantId: t, archivedAt: { $ne: null } }),
  ]);
  const byStage = new Map(counts.map((c: any) => [String(c._id), c.n]));
  return {
    stages: (stages as any[]).map((s) => ({ _id: s._id, name: s.name, count: byStage.get(String(s._id)) || 0 })),
    sources: sources.filter((s: any) => s._id).map((s: any) => ({ source: s._id, count: s.n })),
    active: counts.reduce((n: number, c: any) => n + c.n, 0),
    archived,
  };
}
