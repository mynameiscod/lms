/**
 * leadAssignmentService.ts — the ONE engine that gives a new lead a counsellor.
 *
 * Owner decision (2026-11-09): one setting, chosen by the admin on Lead Assignment
 * (manual | round robin | rules). It replaced two engines that both assigned leads — Lead
 * Distribution and Lead Scoring's assignment tab — and it runs from the Lead model's create
 * hook, so every source (Meta, website, WhatsApp, sheet, Google Ads, assessment, manual,
 * import) is covered. Website and assessment leads were never assigned before because their
 * create paths called neither engine.
 *
 * Rules every method obeys:
 *   - an existing owner is never replaced
 *   - only counsellors (admins / BDM roles, see leadCounsellorService) receive leads
 *   - a member switched off as unavailable, or at their daily cap, is skipped
 *   - a lead waiting for Outpero's call is left until the result arrives (afterCall)
 *   - a lead whose AI call said not interested / wrong number / opt-out is NOT assigned
 *     (owner decision); admins see it unassigned and can assign it by hand
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadAssignmentConfig, { ILeadAssignmentConfig, LeadAssignmentMode } from '../models/LeadAssignmentConfig';
import LeadScoringConfig from '../models/LeadScoringConfig';
import { listCounsellors } from './leadCounsellorService';
import { waitsForOutpero } from './outperoPolicyService';
import { createFirstContactTask } from './leadFirstContactService';

const oid = (v: any) => new mongoose.Types.ObjectId(String(v));
export const NEGATIVE_AI_OUTCOMES = ['not_interested', 'wrong_number', 'opt_out'];

/** The institute's assignment settings. First read carries over what Lead Scoring was doing. */
export async function getAssignmentConfig(tenantId: string): Promise<ILeadAssignmentConfig> {
  const existing = await LeadAssignmentConfig.findOne({ tenantId: oid(tenantId) });
  if (existing) return existing;
  const old: any = await LeadScoringConfig.findOne({ tenantId: oid(tenantId) }).lean();
  let mode: LeadAssignmentMode = 'manual';
  let memberIds: string[] = [];
  if (old?.isActive !== false && old?.assignmentMode === 'round_robin') {
    mode = 'round_robin'; memberIds = (old.roundRobinMembers || []).map(String);
  } else if (old?.isActive !== false && old?.assignmentMode === 'rule_based') {
    // Old rules were free-form field conditions; carry the people over as one round robin.
    mode = 'round_robin';
    memberIds = [...(old.fallbackMembers || []), ...(old.assignmentRules || []).flatMap((r: any) => r.assignToMembers || [])].map(String);
  }
  const unique = [...new Set(memberIds)];
  try {
    return await LeadAssignmentConfig.create({ tenantId: oid(tenantId), mode, members: unique.map(id => ({ userId: oid(id), available: true })), rules: [] });
  } catch (e: any) {
    if (e?.code === 11000) return (await LeadAssignmentConfig.findOne({ tenantId: oid(tenantId) }))!;
    throw e;
  }
}

export interface AssignmentInput {
  mode: LeadAssignmentMode;
  members: { userId: string; available?: boolean; maxPerDay?: number | null }[];
  rules: { name?: string; enabled?: boolean; sources?: string[]; courses?: string[]; members?: string[] }[];
}

/** Validate and save. Only counsellors can be members; rules may only use members. */
export async function saveAssignmentConfig(tenantId: string, input: AssignmentInput, userId: string): Promise<ILeadAssignmentConfig> {
  if (!['manual', 'round_robin', 'rules'].includes(input?.mode)) throw Object.assign(new Error('Choose how leads are assigned'), { status: 400 });
  const counsellorIds = new Set((await listCounsellors(tenantId)).map(c => c._id));
  const seen = new Set<string>();
  const members = (input.members || []).filter(m => {
    const id = String(m.userId || '');
    if (!counsellorIds.has(id) || seen.has(id)) return false;
    seen.add(id); return true;
  }).map(m => {
    const cap = m.maxPerDay === null || m.maxPerDay === undefined || (m.maxPerDay as any) === '' ? null : Math.max(0, Math.floor(Number(m.maxPerDay)));
    return { userId: oid(m.userId), available: m.available !== false, maxPerDay: Number.isFinite(cap as number) ? cap : null };
  });
  const clean = (a?: string[]) => [...new Set((a || []).map(s => String(s || '').trim()).filter(Boolean))];
  const rules = (input.rules || []).map((r, i) => {
    const ruleMembers = clean(r.members).filter(id => seen.has(id));
    return { name: String(r.name || '').trim() || `Rule ${i + 1}`, enabled: r.enabled !== false, sources: clean(r.sources), courses: clean(r.courses), members: ruleMembers.map(oid) };
  });
  if (input.mode !== 'manual' && !members.length) throw Object.assign(new Error('Add at least one counsellor, or choose Manual'), { status: 400 });
  if (input.mode === 'rules') {
    const bad = rules.find(r => r.enabled && !r.members.length);
    if (bad) throw Object.assign(new Error(`"${bad.name}" has no counsellors`), { status: 400 });
    const empty = rules.find(r => r.enabled && !r.sources.length && !r.courses.length);
    if (empty) throw Object.assign(new Error(`"${empty.name}" needs a source or a course to match`), { status: 400 });
  }
  await getAssignmentConfig(tenantId); // make sure the document exists
  const saved = await LeadAssignmentConfig.findOneAndUpdate(
    { tenantId: oid(tenantId) },
    // Rule positions may have changed, so rule counters start again; the main rotation keeps its place.
    { $set: { mode: input.mode, members, rules, updatedBy: oid(userId) }, $unset: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`pointers.rule:${i}`, ''])) },
    { new: true },
  );
  return saved!;
}

/** Start of today in IST, as a UTC instant. */
function istDayStart(): Date {
  const ist = new Date(Date.now() + 330 * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60_000);
}

/** Members who can take a lead right now: counsellor, available, under their daily cap. */
async function eligible(tenantId: string, config: ILeadAssignmentConfig, pool: string[]): Promise<string[]> {
  const counsellorIds = new Set((await listCounsellors(tenantId)).map(c => c._id));
  const byId = new Map(config.members.map(m => [String(m.userId), m]));
  const candidates = pool.filter(id => counsellorIds.has(id) && byId.get(id)?.available !== false && byId.has(id));
  const capped = candidates.filter(id => (byId.get(id)?.maxPerDay ?? null) !== null);
  if (!capped.length) return candidates;
  const counts: { _id: any; n: number }[] = await Lead.aggregate([
    { $match: { tenantId: oid(tenantId), 'assignment.assignedAt': { $gte: istDayStart() }, assignedTo: { $in: capped.map(oid) } } },
    { $group: { _id: '$assignedTo', n: { $sum: 1 } } },
  ]);
  const today = new Map(counts.map(c => [String(c._id), c.n]));
  return candidates.filter(id => {
    const cap = byId.get(id)?.maxPerDay;
    return cap === null || cap === undefined || (today.get(id) || 0) < cap;
  });
}

/**
 * Next person in a pool: the first candidate after whoever got the pool's last lead, in the pool's
 * configured order — so someone on leave or at their cap is skipped without bunching the others.
 * Compare-and-set on the stored "last" id keeps it correct across servers.
 */
async function rotate(tenantId: string, key: string, order: string[], candidates: string[]): Promise<string | null> {
  if (!candidates.length) return null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const doc = await LeadAssignmentConfig.findOne({ tenantId: oid(tenantId) }).select('pointers').lean() as any;
    const last: string | null = doc?.pointers?.[key] ?? null;
    const start = last ? order.indexOf(String(last)) : -1;
    let chosen = candidates[0];
    for (let i = 1; i <= order.length; i++) {
      const id = order[(start + i + order.length) % order.length];
      if (candidates.includes(id)) { chosen = id; break; }
    }
    const won = await LeadAssignmentConfig.findOneAndUpdate(
      { tenantId: oid(tenantId), [`pointers.${key}`]: last ?? null },
      { $set: { [`pointers.${key}`]: chosen } },
    );
    if (won) return chosen;
  }
  return null;
}

function ruleMatches(rule: any, lead: any): boolean {
  if (!rule.enabled || !rule.members?.length) return false;
  if (rule.sources?.length && !rule.sources.includes(String(lead.source || ''))) return false;
  if (rule.courses?.length) {
    const interests = (Array.isArray(lead.courseInterest) ? lead.courseInterest : [lead.courseInterest]).map((c: any) => String(c || '').toLowerCase());
    if (!rule.courses.some((c: string) => interests.some((i: string) => i.includes(c.toLowerCase())))) return false;
  }
  return true;
}

export interface AssignOptions {
  /** True when an AI call result has arrived (or Outpero's wait ran out): do not wait any longer. */
  afterCall?: boolean;
  /** The AI call outcome being processed now, before it is saved on the lead. */
  aiOutcome?: string | null;
}

/**
 * Give an unassigned lead a counsellor using the institute's setting.
 * Returns the owner's id (the existing one if the lead already had an owner), or null.
 */
export async function assignLead(tenantId: string, leadId: string, opts: AssignOptions = {}): Promise<string | null> {
  try {
    const lead: any = await Lead.findOne({ _id: leadId, tenantId }).select('assignedTo assignment source courseInterest outpero aiFeedback archivedAt createdBy').lean();
    if (!lead || lead.archivedAt) return null;
    const existing = lead.assignedTo || lead.assignment?.assignedTo;
    if (existing) return String(existing);
    const outcome = opts.aiOutcome ?? lead.aiFeedback?.outcome;
    if (NEGATIVE_AI_OUTCOMES.includes(String(outcome || '')) || lead.aiFeedback?.doNotContact) return null;
    if (!opts.afterCall && waitsForOutpero(lead, tenantId)) return null;

    const config = await getAssignmentConfig(tenantId);
    if (config.mode === 'manual' || !config.members.length) return null;
    const order = config.members.map(m => String(m.userId));

    let chosen: string | null = null;
    let how = 'round robin';
    if (config.mode === 'rules') {
      const idx = config.rules.findIndex(r => ruleMatches(r, lead));
      if (idx >= 0) {
        const rule = config.rules[idx];
        const pool = rule.members.map(String);
        chosen = await rotate(tenantId, `rule:${idx}`, pool, await eligible(tenantId, config, pool));
        if (chosen) how = `rule "${rule.name}"`;
      }
    }
    if (!chosen) chosen = await rotate(tenantId, 'all', order, await eligible(tenantId, config, order));
    if (!chosen) return null;

    const now = new Date();
    const res = await Lead.updateOne(
      { _id: leadId, tenantId, assignedTo: null, 'assignment.assignedTo': null },
      {
        $set: { assignedTo: oid(chosen), 'assignment.assignedTo': oid(chosen), 'assignment.assignedAt': now },
        $push: { activities: { type: 'assignment', description: `Assigned automatically by ${how}${opts.afterCall ? ' after the AI call' : ''}`, createdBy: lead.createdBy, createdAt: now } },
      },
    );
    if (!res.modifiedCount) return null; // someone else assigned it in the meantime
    await createFirstContactTask(tenantId, leadId, chosen).catch(() => {});
    return chosen;
  } catch (err: any) {
    console.error('[LeadAssignment] assignLead failed:', err?.message);
    return null;
  }
}
