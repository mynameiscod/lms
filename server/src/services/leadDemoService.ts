/**
 * Demos and visits are Meetings (models/Meeting.ts). This writes their outcome onto the lead:
 * a timeline entry for every status change, `demoBookedAt` for display, and the
 * `milestones.demoAttendedAt` stamp (first time only) when a demo or campus visit is attended.
 *
 * It never changes the lead's stage — the counsellor decides that; automation (no-show
 * follow-ups) reads the Meeting status.
 */
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import { onMeetingNoShow } from './leadAutomationService';

const DEMO_TYPES = ['online_demo', 'campus_visit'];
const LABEL: Record<string, string> = {
  online_demo: 'Demo', campus_visit: 'Campus visit', trainer_call: 'Trainer call', payment_discussion: 'Payment discussion',
};
const fmt = (d: any) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export async function recordMeetingOutcome(tenantId: string, meeting: any, before: any, actorId: string): Promise<void> {
  const what = LABEL[meeting.type] || 'Meeting';
  const isDemo = DEMO_TYPES.includes(meeting.type);
  const now = new Date();
  const set: Record<string, any> = {};
  let description = '';

  if (meeting.status !== before.status) {
    switch (meeting.status) {
      case 'completed':
        description = `${what} attended`;
        if (isDemo) set['milestones.demoAttendedAt'] = now;
        break;
      case 'no_show': description = `${what} no-show (was ${fmt(meeting.scheduledAt)})`; break;
      case 'cancelled': description = `${what} cancelled${meeting.cancellationReason ? `: ${meeting.cancellationReason}` : ''}`; break;
      case 'declined': description = `${what} declined by the student${meeting.cancellationReason ? `: ${meeting.cancellationReason}` : ''}`; break;
      case 'rescheduled': description = `${what} rescheduled to ${fmt(meeting.scheduledAt)}`; break;
      case 'scheduled': description = `${what} scheduled for ${fmt(meeting.scheduledAt)}`; break;
      default: description = `${what} marked ${meeting.status}`;
    }
  } else {
    description = `${what} moved to ${fmt(meeting.scheduledAt)}`;
  }
  if (meeting.feedback) description += `. Feedback: ${meeting.feedback}`;
  if (meeting.nextAction) description += `. Next: ${meeting.nextAction}`;
  if (isDemo && ['scheduled', 'rescheduled'].includes(meeting.status)) set.demoBookedAt = meeting.scheduledAt;

  const leadQ = { _id: meeting.leadId, tenantId: new mongoose.Types.ObjectId(tenantId) };
  // demoAttendedAt is first-time only, so it is set with a separate guarded update.
  const { 'milestones.demoAttendedAt': attendedAt, ...rest } = set;
  await Lead.updateOne(leadQ, {
    ...(Object.keys(rest).length ? { $set: rest } : {}),
    $push: { activities: { type: 'meeting', description, createdBy: actorId, createdAt: now, metadata: { meetingId: String(meeting._id), status: meeting.status, meetingType: meeting.type } } },
  });
  if (meeting.status === 'no_show' && before.status !== 'no_show') await onMeetingNoShow(tenantId, meeting);
  if (attendedAt) {
    await Lead.updateOne({ ...leadQ, 'milestones.demoAttendedAt': { $exists: false } }, { $set: { 'milestones.demoAttendedAt': attendedAt } });
  }
}
