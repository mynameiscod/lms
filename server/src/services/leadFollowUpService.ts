import mongoose from 'mongoose';
import FollowUpReminder from '../models/FollowUpReminder';

/**
 * ONE OPEN FOLLOW-UP PER LEAD.
 *
 * Every "Schedule follow-up" (and every stage change with a follow-up date) used to add a new task
 * next to the old ones, so "Mark this follow-up done" closed one and still left "2 more follow-ups
 * scheduled". A follow-up is the next time to talk to the lead: a new one replaces the old ones, and
 * marking it done closes them all. The closed ones are kept as `cancelled` with a reason, not deleted,
 * so the history still shows them and they never count as done work.
 */
export const OPEN_FOLLOW_UP_STATUSES = ['scheduled', 'pending', 'rescheduled'];

export const REPLACED_NOTE = 'Replaced by a newer follow-up';
export const CLOSED_WITH_DONE_NOTE = 'Closed when the follow-up was marked done';

const oid = (v: any) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)));

/** Closes every open follow-up of the lead except `keepId`. Returns the scheduled times it closed. */
export async function closeOpenFollowUps(tenantId: any, leadId: any, keepId: any, note: string): Promise<Date[]> {
  const filter: any = { tenantId: oid(tenantId), leadId: oid(leadId), status: { $in: OPEN_FOLLOW_UP_STATUSES } };
  if (keepId) filter._id = { $ne: oid(keepId) };
  const open = await FollowUpReminder.find(filter).select('_id scheduledAt').lean() as any[];
  if (!open.length) return [];
  await FollowUpReminder.updateMany(
    { _id: { $in: open.map(f => f._id) } },
    { $set: { status: 'cancelled', notes: note } },
  );
  return open.map(f => f.scheduledAt).filter(Boolean);
}
