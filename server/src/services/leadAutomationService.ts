/**
 * CRM automation (rules in models/LeadAutomationConfig.ts — all off by default).
 *
 * Every rule turns into a follow-up TASK (FollowUpReminder) for the lead's owner, keyed by an
 * `automationKey` so the same situation never creates two tasks, or into a reminder pop-up on
 * the existing `followup_reminder` socket event. Tasks show in the Follow-up queue and
 * calendar, and the follow-up reminder job notifies about them like any other.
 *
 * Rules never change a stage and never mark a lead lost.
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import FollowUpReminder from '../models/FollowUpReminder';
import Meeting from '../models/Meeting';
import LeadPicklist from '../models/LeadPicklist';
import LeadAutomationConfig, { DEFAULT_AUTOMATION_RULES, ILeadAutomationRules, AUTOMATION_LIMITS } from '../models/LeadAutomationConfig';
import { milestoneFromLegacy } from '../config/leadMilestones';

const H = 3600_000;
const tidOf = (t: any) => new mongoose.Types.ObjectId(String(t));

export async function getRules(tenantId: string): Promise<ILeadAutomationRules> {
  const cfg: any = await LeadAutomationConfig.findOne({ tenantId: tidOf(tenantId) }).lean();
  return mergeRules(cfg?.rules);
}

/** Defaults filled in, numbers clamped, unknown keys dropped. */
export function mergeRules(raw: any): ILeadAutomationRules {
  const out: any = JSON.parse(JSON.stringify(DEFAULT_AUTOMATION_RULES));
  for (const rule of Object.keys(out)) {
    const src = raw?.[rule];
    if (!src || typeof src !== 'object') continue;
    for (const field of Object.keys(out[rule])) {
      const v = src[field];
      if (field === 'enabled') { if (typeof v === 'boolean') out[rule].enabled = v; continue; }
      const lim = (AUTOMATION_LIMITS as any)[`${rule}.${field}`];
      const n = Number(v);
      if (lim && Number.isFinite(n)) out[rule][field] = Math.min(lim[1], Math.max(lim[0], Math.round(n)));
    }
  }
  return out;
}

/** Create (once per key) a follow-up task for the lead's owner. Returns true if created. */
export async function ensureTask(lead: any, opts: { key: string; title: string; description?: string; scheduledAt: Date; type?: string; priority?: string }): Promise<boolean> {
  const owner = lead.assignedTo || lead.assignment?.assignedTo;
  if (!owner) return false; // unassigned leads show in the queue's Unassigned tab instead
  const r = await FollowUpReminder.updateOne(
    { tenantId: lead.tenantId, automationKey: opts.key },
    { $setOnInsert: {
      tenantId: lead.tenantId, leadId: lead._id, assignedTo: owner, createdBy: owner, automationKey: opts.key,
      type: opts.type || 'call', title: opts.title, description: opts.description, scheduledAt: opts.scheduledAt,
      priority: opts.priority || 'medium', status: 'scheduled',
    } },
    { upsert: true },
  );
  if (!r.upsertedCount) return false;
  // Point the lead at the task if it has no earlier follow-up.
  await Lead.updateOne(
    { _id: lead._id, tenantId: lead.tenantId, $or: [{ nextFollowUp: null }, { nextFollowUp: { $gt: opts.scheduledAt } }] },
    { $set: { nextFollowUp: opts.scheduledAt } },
  );
  return true;
}

// ───────────────────────────── event hooks ─────────────────────────────

/**
 * A call was logged. If its outcome suggests a retry (call-outcome list "Retry after N h") and
 * the lead has nothing scheduled sooner, schedule the next try. After maxAttempts unanswered
 * calls since the last answered one, stop and leave a note for a person to decide — never lost.
 */
export async function onCallLogged(tenantId: string, leadId: any, outcome: string | undefined, activityId: any): Promise<void> {
  try {
    if (!outcome) return;
    const rules = await getRules(tenantId);
    if (!rules.callRetry.enabled) return;
    const tid = tidOf(tenantId);
    const opt: any = await LeadPicklist.findOne({ tenantId: tid, list: 'call_outcome', code: outcome }).lean();
    if (!opt || opt.countsAsConnected || !(opt.retryHours > 0)) return;
    const lead: any = await Lead.findOne({ _id: leadId, tenantId: tid }).select('tenantId assignedTo assignment activities nextFollowUp name').lean();
    if (!lead) return;

    // Unanswered calls since the last answered one.
    const connected = new Set((await LeadPicklist.find({ tenantId: tid, list: 'call_outcome', countsAsConnected: true }).select('code').lean()).map((o: any) => o.code));
    connected.add('connected');
    let misses = 0;
    for (const a of [...(lead.activities || [])].reverse()) {
      if (a.type !== 'call' || !a.callOutcome) continue;
      if (connected.has(a.callOutcome)) break;
      misses++;
    }
    if (misses >= rules.callRetry.maxAttempts) {
      await Lead.updateOne({ _id: lead._id, tenantId: tid, 'activities.metadata.automation': { $ne: `retry-limit-${misses}` } }, {
        $push: { activities: { type: 'note', createdBy: lead.assignedTo || lead.assignment?.assignedTo || leadId, createdAt: new Date(),
          description: `${misses} calls in a row without an answer. Automatic retries stopped — decide whether to keep trying, nurture or close this lead.`,
          metadata: { automation: `retry-limit-${misses}` } } },
      });
      return;
    }
    const at = new Date(Date.now() + opt.retryHours * H);
    if (lead.nextFollowUp && new Date(lead.nextFollowUp) <= at && new Date(lead.nextFollowUp) > new Date()) return;
    await ensureTask(lead, { key: `retry:${lead._id}:${activityId}`, title: `Call again (${opt.label})`, scheduledAt: at, description: `Attempt ${misses + 1} of ${rules.callRetry.maxAttempts}` });
  } catch (err: any) {
    console.error('[AUTOMATION] call retry failed:', err?.message);
  }
}

/** A demo / visit was marked no-show: schedule a follow-up call. */
export async function onMeetingNoShow(tenantId: string, meeting: any): Promise<void> {
  try {
    const rules = await getRules(tenantId);
    if (!rules.noShowFollowUp.enabled) return;
    const lead: any = await Lead.findOne({ _id: meeting.leadId, tenantId: tidOf(tenantId) }).select('tenantId assignedTo assignment name').lean();
    if (!lead) return;
    await ensureTask(lead, {
      key: `noshow:${meeting._id}`, title: 'Missed the demo — call to rebook', priority: 'high',
      scheduledAt: new Date(Date.now() + rules.noShowFollowUp.hoursAfter * H),
    });
  } catch (err: any) {
    console.error('[AUTOMATION] no-show follow-up failed:', err?.message);
  }
}

// ───────────────────────────── periodic sweep ─────────────────────────────

/** One sweep for one institute. Returns what it did (for logs/tests). */
export async function sweepTenant(tenantId: string, io?: any, now = new Date()) {
  const rules = await getRules(tenantId);
  const tid = tidOf(tenantId);
  const done = { firstContact: 0, overdue: 0, demoReminders: 0, seatReserved: 0, nurture: 0 };
  const stages = await LeadStage.find({ tenantId: tid }).select('milestone category isLostStage').lean();
  const ms = (m: string) => stages.filter((s: any) => milestoneFromLegacy(s) === m).map((s: any) => s._id);
  const closed = [...ms('lost'), ...ms('enrolled')];
  const emit = (payload: any) => { if (io) io.to(`staff_${tenantId}`).emit('followup_reminder', payload); };

  if (rules.firstContactSla.enabled) {
    const cutoff = new Date(now.getTime() - rules.firstContactSla.minutes * 60_000);
    const leads = await Lead.find({
      tenantId: tid, archivedAt: null, stageId: { $nin: closed },
      createdAt: { $lte: cutoff, $gte: new Date(now.getTime() - 7 * 24 * H) },
      'telecallerMetrics.firstActionAt': null, lastContactedAt: null,
    }).select('tenantId assignedTo assignment name phone createdAt').limit(200).lean();
    for (const l of leads as any[]) {
      if (await ensureTask(l, { key: `sla-first:${l._id}`, title: 'First contact overdue', priority: 'urgent', scheduledAt: now })) done.firstContact++;
    }
  }

  if (rules.overdueReminder.enabled) {
    const late = await FollowUpReminder.find({
      tenantId: tid, status: { $in: ['scheduled', 'pending'] },
      scheduledAt: { $lte: new Date(now.getTime() - rules.overdueReminder.hours * H) }, overdueNotifiedAt: null,
    }).populate('leadId', 'name phone').limit(200).lean();
    for (const r of late as any[]) {
      emit({ reminderId: r._id, leadId: r.leadId?._id || r.leadId, leadName: r.leadId?.name || 'Lead', leadPhone: r.leadId?.phone || '',
        type: r.type, title: `Overdue: ${r.title}`, description: r.description, scheduledAt: r.scheduledAt, assignedTo: r.assignedTo });
      done.overdue++;
    }
    if (late.length) await FollowUpReminder.updateMany({ _id: { $in: late.map((r: any) => r._id) } }, { $set: { overdueNotifiedAt: now } });
  }

  if (rules.demoReminder.enabled) {
    const soon = await Meeting.find({
      tenantId: String(tenantId), type: { $in: ['online_demo', 'campus_visit'] }, status: { $in: ['scheduled', 'rescheduled'] },
      scheduledAt: { $gt: now, $lte: new Date(now.getTime() + rules.demoReminder.hoursBefore * H) }, remindedAt: null,
    }).populate('leadId', 'name phone assignedTo').limit(200).lean();
    for (const m of soon as any[]) {
      emit({ meetingId: m._id, leadId: m.leadId?._id || m.leadId, leadName: m.leadId?.name || 'Lead', leadPhone: m.leadId?.phone || '',
        type: 'demo', title: `Demo soon: ${m.title}`, scheduledAt: m.scheduledAt, assignedTo: m.leadId?.assignedTo });
      done.demoReminders++;
    }
    if (soon.length) await Meeting.updateMany({ _id: { $in: soon.map((m: any) => m._id) } }, { $set: { remindedAt: now } });
  }

  if (rules.seatReservedFollowUp.enabled) {
    const seat = ms('seat_reserved');
    if (seat.length) {
      const leads = await Lead.find({
        tenantId: tid, archivedAt: null, stageId: { $in: seat },
        stageEnteredAt: { $lte: new Date(now.getTime() - rules.seatReservedFollowUp.days * 24 * H) },
      }).select('tenantId assignedTo assignment name stageEnteredAt').limit(200).lean();
      for (const l of leads as any[]) {
        const key = `seat:${l._id}:${new Date(l.stageEnteredAt).toISOString().slice(0, 10)}`;
        if (await ensureTask(l, { key, title: 'Seat reserved — follow up to complete admission', scheduledAt: now, type: 'payment_reminder' })) done.seatReserved++;
      }
    }
  }

  if (rules.nurtureReactivation.enabled) {
    const leads = await Lead.find({ tenantId: tid, archivedAt: null, 'nurture.reactivateAt': { $lte: now } })
      .select('tenantId assignedTo assignment name nurture').limit(200).lean();
    for (const l of leads as any[]) {
      const key = `nurture:${l._id}:${new Date(l.nurture.reactivateAt).toISOString()}`;
      if (await ensureTask(l, { key, title: 'Nurture lead is due back — reconnect', scheduledAt: now, priority: 'high' })) done.nurture++;
    }
  }
  return done;
}

/** Sweep every institute that has at least one rule switched on. */
export async function runAutomationSweep(io?: any): Promise<void> {
  const cfgs: any[] = await LeadAutomationConfig.find({}).select('tenantId rules').lean();
  for (const c of cfgs) {
    const r = mergeRules(c.rules);
    if (!Object.values(r).some((x: any) => x.enabled)) continue;
    try {
      const d = await sweepTenant(String(c.tenantId), io);
      if (Object.values(d).some(n => n)) console.log(`[AUTOMATION] ${c.tenantId}:`, d);
    } catch (err: any) {
      console.error(`[AUTOMATION] sweep failed for ${c.tenantId}:`, err?.message);
    }
  }
}
