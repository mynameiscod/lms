/**
 * The ONE way a lead changes stage.
 *
 * Every path — the stage control on the lead page, list and Kanban, bulk move, manager
 * approval, the edit form, quick update, convert-to-student, re-engage — calls changeStage().
 * It validates against the institute's configured pipeline (stage → sub-stage → reason),
 * applies the lost-stage approval gate, records history and the first time each milestone
 * was reached, and runs the stage side effects (Google Sheet push, WhatsApp drip).
 *
 * Rules (driven by configuration, never by stage names — except the legacy "Not Interested"
 * reason rule kept until institutes move to sub-stage reasons):
 *  - the stage must belong to the institute and be switched on;
 *  - a picked sub-stage must belong to the stage and be on; a picked reason to the sub-stage;
 *  - when the stage has sub-stages, a person moving a single lead must pick one (`strict`);
 *  - sub-stage "reason required" → a reason from its list; reason "ask for details" → text;
 *  - stage "always ask for a reason" (or legacy "Not Interested") → a picked or typed reason;
 *  - stage / sub-stage "note required" → note; sub-stage "follow-up required" → a date (strict);
 *  - current stage's allowedNextStages (when set) and target allowedRoles (when set);
 *  - a lost stage moved by a non-admin waits for manager approval (manual and bulk only).
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import LeadSubStage from '../models/LeadSubStage';
import LeadReason from '../models/LeadReason';
import FollowUpReminder from '../models/FollowUpReminder';
import { recordStageTransition } from '../controllers/leadStageHistoryController';
import { pushLeadStageChange } from './googleSheetSyncService';
import { scheduleDripOnStageEntry } from './whatsAppDripService';
import { milestoneFromLegacy, LeadMilestone } from '../config/leadMilestones';

export type StageChangeSource = 'manual' | 'bulk' | 'approval' | 'outpero' | 'automation' | 'convert' | 'reopen' | 'edit';

export interface StageChangeInput {
  tenantId: string;
  leadId: string;
  stageId: string;
  subStageId?: string | null;
  reasonId?: string | null;
  /** Typed reason text (legacy "Not Interested" box, or a stage-level reason with no list). */
  reasonText?: string | null;
  reasonDetail?: string | null;
  note?: string | null;
  nextFollowUp?: string | Date | null;
  actor: { id: string; role: string };
  source: StageChangeSource;
  /** Extra filter (lead scope for counsellors). */
  scope?: Record<string, any>;
}

export interface StageChangeResult {
  status: 'moved' | 'pending_approval' | 'unchanged';
  lead: any;
  fromStageName: string;
  toStageName: string;
}

export class LifecycleError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

const ADMIN_ROLES = ['TENANT_ADMIN', 'SUPER_ADMIN'];
const MILESTONE_FIELD: Partial<Record<LeadMilestone, string>> = {
  contacting: 'contactingAt', connected: 'connectedAt', qualified: 'qualifiedAt', demo: 'demoAt',
  seat_reserved: 'seatReservedAt', enrolled: 'enrolledAt', nurture: 'nurtureAt', lost: 'lostAt',
};
/** Active-funnel order: reaching a later milestone also stamps the earlier ones it implies. */
const FUNNEL: LeadMilestone[] = ['contacting', 'connected', 'qualified', 'demo', 'seat_reserved', 'enrolled'];

const isOid = (v: any) => !!v && mongoose.Types.ObjectId.isValid(String(v));
const clean = (v: any, max = 1000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
/** Quotes would break the `Stage changed from "A" to "B"` text the lead page parses. */
const noQuotes = (s: string) => s.replace(/"/g, "'");

/** Stamp the first time each milestone was reached, plus the funnel steps a jump implies. */
export function milestoneStamps(existing: Record<string, any> | undefined, milestone: LeadMilestone, at: Date): Record<string, Date> {
  const set: Record<string, Date> = {};
  const has = (f: string) => !!existing?.[f];
  const idx = FUNNEL.indexOf(milestone);
  const implied = idx >= 0 ? FUNNEL.slice(0, idx + 1) : [milestone];
  for (const m of implied) {
    const f = MILESTONE_FIELD[m];
    if (f && !has(f)) set[`milestones.${f}`] = at;
  }
  return set;
}

export async function changeStage(input: StageChangeInput): Promise<StageChangeResult> {
  const { tenantId, actor, source } = input;
  const strict = source === 'manual';
  const tid = new mongoose.Types.ObjectId(tenantId);

  if (!isOid(input.stageId)) throw new LifecycleError(400, 'stageId is required');
  const stage: any = await LeadStage.findOne({ _id: input.stageId, tenantId: tid }).lean();
  if (!stage) throw new LifecycleError(404, 'Stage not found');
  if (stage.isActive === false && source !== 'approval') throw new LifecycleError(400, `"${stage.name}" is switched off`);

  const lead: any = await Lead.findOne({ _id: input.leadId, tenantId: tid, ...(input.scope || {}) });
  if (!lead) throw new LifecycleError(404, 'Lead not found');

  const fromStageId = lead.stageId ? String(lead.stageId) : null;
  const fromStage: any = fromStageId ? await LeadStage.findOne({ _id: fromStageId, tenantId: tid }).lean() : null;
  const sameStage = fromStageId === String(stage._id);

  // ── sub-stage ──
  const subStages: any[] = await LeadSubStage.find({ tenantId: tid, stageId: stage._id, isActive: true }).sort({ order: 1 }).lean();
  let sub: any = null;
  if (input.subStageId) {
    if (!isOid(input.subStageId)) throw new LifecycleError(400, 'Invalid sub-stage');
    sub = await LeadSubStage.findOne({ _id: input.subStageId, tenantId: tid, stageId: stage._id }).lean();
    if (!sub) throw new LifecycleError(400, `That sub-stage is not part of "${stage.name}"`);
    if (sub.isActive === false && source !== 'approval') throw new LifecycleError(400, `"${sub.name}" is switched off`);
  } else if (strict && subStages.length) {
    throw new LifecycleError(400, `Pick a sub-stage of "${stage.name}"`, 'SUB_STAGE_REQUIRED');
  }

  // ── reason ──
  let reason: any = null;
  if (input.reasonId) {
    if (!sub) throw new LifecycleError(400, 'Pick a sub-stage before a reason');
    if (!isOid(input.reasonId)) throw new LifecycleError(400, 'Invalid reason');
    reason = await LeadReason.findOne({ _id: input.reasonId, tenantId: tid, subStageId: sub._id }).lean();
    if (!reason) throw new LifecycleError(400, `That reason is not part of "${sub.name}"`);
    if (reason.isActive === false && source !== 'approval') throw new LifecycleError(400, `"${reason.name}" is switched off`);
  }
  const reasonText = clean(input.reasonText, 500);
  const reasonDetail = clean(input.reasonDetail);
  const note = clean(input.note, 2000);
  const skipsRules = source === 'convert' || source === 'outpero' || source === 'automation';

  if (!skipsRules) {
    if (sub?.requiresReason && !reason) throw new LifecycleError(400, `Pick a reason for "${sub.name}"`, 'REASON_REQUIRED');
    if (reason?.requiresDetail && !reasonDetail) throw new LifecycleError(400, `Add details for "${reason.name}"`, 'DETAIL_REQUIRED');
    const stageNeedsReason = !!stage.requiresReason || stage.name === 'Not Interested';
    if (stageNeedsReason && !reason && !reasonText) throw new LifecycleError(400, `A reason is required when moving a lead to "${stage.name}"`, 'REASON_REQUIRED');
    if ((stage.requiresNote || sub?.requiresNote) && !note) throw new LifecycleError(400, 'A note is required here', 'NOTE_REQUIRED');
  }

  let followUpAt: Date | null = null;
  if (input.nextFollowUp) {
    followUpAt = new Date(input.nextFollowUp);
    if (Number.isNaN(followUpAt.getTime())) throw new LifecycleError(400, 'Invalid follow-up date');
  }
  if (strict && sub?.requiresFollowUp && !followUpAt) throw new LifecycleError(400, `Set the next follow-up for "${sub.name}"`, 'FOLLOW_UP_REQUIRED');

  if (!skipsRules && !sameStage) {
    const allowedNext: string[] = (fromStage?.allowedNextStages || []).map(String);
    if (allowedNext.length && !allowedNext.includes(String(stage._id)) && !ADMIN_ROLES.includes(actor.role)) {
      throw new LifecycleError(400, `Leads cannot move from "${fromStage.name}" straight to "${stage.name}"`);
    }
    const roles: string[] = stage.allowedRoles || [];
    if (roles.length && !roles.includes(actor.role) && !ADMIN_ROLES.includes(actor.role)) {
      throw new LifecycleError(403, `Your role cannot move leads to "${stage.name}"`);
    }
  }

  if (sameStage && String(lead.subStageId || '') === String(sub?._id || '') && String(lead.reasonId || '') === String(reason?._id || '') && !note && !followUpAt) {
    return { status: 'unchanged', lead, fromStageName: stage.name, toStageName: stage.name };
  }

  const shownReason = reason?.name || reasonText;

  // ── manager approval for lost stages ──
  if (!sameStage && stage.isLostStage && !ADMIN_ROLES.includes(actor.role) && (source === 'manual' || source === 'bulk' || source === 'edit')) {
    lead.pendingApproval = {
      stageId: stage._id, stageName: stage.name, requestedBy: actor.id, requestedAt: new Date(),
      reason: [shownReason, reasonDetail].filter(Boolean).join(' — '),
      subStageId: sub?._id, reasonId: reason?._id, reasonDetail: reasonDetail || undefined,
      note: note || undefined, nextFollowUp: followUpAt || undefined,
    };
    await lead.save();
    return { status: 'pending_approval', lead, fromStageName: fromStage?.name || 'Unknown', toStageName: stage.name };
  }

  // ── apply ──
  const now = new Date();
  const milestone = milestoneFromLegacy(stage);
  lead.stageId = stage._id;
  lead.subStageId = sub?._id || undefined;
  lead.reasonId = reason?._id || undefined;
  lead.reasonDetail = reasonDetail || undefined;
  lead.pendingApproval = undefined;
  if (!sameStage) lead.stageEnteredAt = now;
  if (shownReason) lead.notInterestedReason = [shownReason, reasonDetail].filter(Boolean).join(' — ');
  if (milestone === 'lost') { lead.lostAt = lead.lostAt || now; lead.lostReason = shownReason || lead.lostReason; lead.lostReasonDetail = reasonDetail || lead.lostReasonDetail; }
  if (fromStage && milestoneFromLegacy(fromStage) === 'lost' && milestone !== 'lost') {
    // Reopened: the old close stays in history, but the lead no longer reads as lost.
    lead.lostAt = undefined; lead.lostReason = undefined; lead.lostReasonDetail = undefined; lead.lostReasonCategory = undefined;
  }
  for (const [path, at] of Object.entries(milestoneStamps(lead.milestones?.toObject?.() || lead.milestones, milestone, now))) lead.set(path, at);
  if (followUpAt) lead.nextFollowUp = followUpAt;

  const where = [sub?.name, shownReason, reasonDetail].filter(Boolean).map(s => noQuotes(String(s))).join(' · ');
  const fromName = fromStage?.name || 'Unknown';
  lead.activities.push({
    type: 'status_change',
    // Keep this wording: LeadDetailV2 parses it to colour visited stages.
    description: sameStage
      ? `Sub-stage set in "${stage.name}"${where ? ` — ${where}` : ''}`
      : `Stage changed from "${fromName}" to "${stage.name}"${where ? ` — ${where}` : ''}`,
    createdBy: actor.id, createdAt: now,
    metadata: {
      from: fromName, to: stage.name, fromStageId, toStageId: String(stage._id),
      subStageId: sub?._id ? String(sub._id) : undefined, subStage: sub?.name,
      reasonId: reason?._id ? String(reason._id) : undefined, reason: shownReason || undefined, reasonDetail: reasonDetail || undefined,
      source,
    },
  });
  if (note) lead.activities.push({ type: 'note', description: note, createdBy: actor.id, createdAt: now });

  await lead.save();

  if (followUpAt) {
    const owner = lead.assignedTo || actor.id;
    await FollowUpReminder.create({
      tenantId: tid, leadId: lead._id, assignedTo: owner, createdBy: actor.id, type: 'call',
      title: `Follow up: ${sub?.name || stage.name}`, description: note || undefined, scheduledAt: followUpAt,
    }).catch(err => console.error('[lifecycle] follow-up create failed:', err?.message));
  }

  if (!sameStage) {
    await recordStageTransition(
      lead._id, fromStageId ? new mongoose.Types.ObjectId(fromStageId) : null, stage._id, stage.name,
      new mongoose.Types.ObjectId(actor.id), tid,
      {
        source,
        ...(sub ? { subStageId: sub._id, subStageName: sub.name } : {}),
        ...(reason ? { reasonId: reason._id, reasonName: reason.name } : {}),
        ...(reasonDetail ? { reasonDetail } : {}),
        ...(note ? { note } : {}),
      },
    );
    pushLeadStageChange(tenantId, { _id: lead._id, name: lead.name, phone: lead.phone, email: lead.email, assignedTo: lead.assignedTo?.toString() }, fromName, stage.name)
      .catch(err => console.error('[lifecycle] pushLeadStageChange failed:', err));
    scheduleDripOnStageEntry(tenantId, String(lead._id), stage.name)
      .catch(err => console.error('[lifecycle] scheduleDripOnStageEntry failed:', err));
  }

  return { status: 'moved', lead, fromStageName: fromName, toStageName: stage.name };
}

/** The stage a converted lead moves to: first active "enrolled" stage, else the legacy "Converted". */
export async function enrolledStageFor(tenantId: string): Promise<any | null> {
  const tid = new mongoose.Types.ObjectId(tenantId);
  return (await LeadStage.findOne({ tenantId: tid, milestone: 'enrolled', isActive: true }).sort({ order: 1 }).lean())
    || (await LeadStage.findOne({ tenantId: tid, name: 'Converted' }).lean());
}

/** Outpero moves stages with its own atomic update; this records the milestones it reached. */
export async function stampMilestonesAfterExternalMove(tenantId: string, leadId: any, stage: any): Promise<void> {
  const lead: any = await Lead.findOne({ _id: leadId, tenantId }).select('milestones').lean();
  if (!lead) return;
  const set = milestoneStamps(lead.milestones, milestoneFromLegacy(stage), new Date());
  // The old sub-stage/reason belonged to the previous stage, so they are cleared.
  await Lead.updateOne({ _id: leadId, tenantId }, { $set: { ...set, stageEnteredAt: new Date() }, $unset: { subStageId: 1, reasonId: 1, reasonDetail: 1 } });
}
