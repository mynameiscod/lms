import mongoose from 'mongoose';
import Lead from '../models/Lead';
import FollowUpReminder from '../models/FollowUpReminder';

/**
 * A lead that is handed to a person must not just sit there. When it is assigned automatically:
 *  - the owner gets a "call this lead" task due in 30 minutes (once per lead), and
 *  - if an hour later the owner has still written nothing (no call log, note, message), the
 *    timeline says so, once, so a manager can see it.
 */

const FIRST_CONTACT_MINUTES = 30;
const UNTOUCHED_AFTER_MINUTES = 60;
const LOOKBACK_HOURS = 12;

/** Entries the system files under the owner's account: they are not the owner doing anything. */
const isSystemText = (d: string) => /^(🤖|📞 AI call|📣|⚠️ No call or note)/.test(d || '');

export async function createFirstContactTask(tenantId: string, leadId: string, assigneeId: string): Promise<void> {
  try {
    const lead: any = await Lead.findOne({ _id: leadId, tenantId }).select('name createdBy').lean();
    if (!lead || !assigneeId) return;
    const now = Date.now();
    await FollowUpReminder.updateOne(
      { tenantId: new mongoose.Types.ObjectId(tenantId), automationKey: `first-contact:${leadId}` },
      { $setOnInsert: {
        tenantId: new mongoose.Types.ObjectId(tenantId), leadId: lead._id, assignedTo: new mongoose.Types.ObjectId(String(assigneeId)),
        createdBy: lead.createdBy, type: 'call', automationKey: `first-contact:${leadId}`,
        title: `Call ${lead.name || 'new lead'} (new lead assigned to you)`,
        description: 'This lead was just assigned to you. Call within 30 minutes and log the call or a note on the lead.',
        scheduledAt: new Date(now + FIRST_CONTACT_MINUTES * 60_000), reminderAt: new Date(now + 15 * 60_000),
        priority: 'high', status: 'scheduled',
      } },
      { upsert: true },
    );
  } catch (err) {
    console.error('[first-contact] task error:', err);
  }
}

/** Put a one-time note on assigned leads whose owner has done nothing for an hour. Returns how many. */
export async function flagUntouchedLeads(limit = 100): Promise<number> {
  const now = Date.now();
  const leads: any[] = await Lead.find({
    archivedAt: null, untouchedAlertAt: null,
    'assignment.assignedAt': { $lte: new Date(now - UNTOUCHED_AFTER_MINUTES * 60_000), $gte: new Date(now - LOOKBACK_HOURS * 3_600_000) },
    assignedTo: { $ne: null },
  }).sort({ 'assignment.assignedAt': 1 }).limit(limit).select('assignedTo assignment.assignedAt activities.type activities.createdBy activities.createdAt activities.description').lean();
  let flagged = 0;
  for (const l of leads) {
    const since = new Date(l.assignment.assignedAt).getTime();
    const touched = (l.activities || []).some((a: any) =>
      String(a.createdBy) === String(l.assignedTo) && new Date(a.createdAt).getTime() >= since
      && ['note', 'call', 'email', 'whatsapp', 'meeting', 'status_change'].includes(a.type) && !isSystemText(a.description));
    if (touched) { await Lead.updateOne({ _id: l._id, untouchedAlertAt: null }, { $set: { untouchedAlertAt: new Date() } }); continue; }
    const r = await Lead.updateOne({ _id: l._id, untouchedAlertAt: null }, {
      $set: { untouchedAlertAt: new Date() },
      $push: { activities: { type: 'note', createdBy: l.assignedTo, createdAt: new Date(), description: `⚠️ No call or note by the assigned owner ${UNTOUCHED_AFTER_MINUTES} minutes after this lead was assigned. Please call now.` } },
    });
    if (r.modifiedCount) flagged++;
  }
  return flagged;
}
