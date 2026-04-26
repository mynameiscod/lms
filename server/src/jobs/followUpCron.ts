import mongoose from 'mongoose';
import FollowUpReminder from '../models/FollowUpReminder';

// How often to check for due reminders (every 5 minutes)
const CRON_INTERVAL_MS = 5 * 60 * 1000;

// How many minutes before scheduledAt to fire a reminder when no explicit reminderAt is set
const DEFAULT_REMIND_BEFORE_MINUTES = 15;

/**
 * Fire pending follow-up reminders via Socket.io.
 * Called by setInterval in server.ts.
 * @param io — the Socket.IO Server instance stored on the Express app
 */
export async function fireFollowUpReminders(io: any): Promise<void> {
  try {
    const now = new Date();
    const defaultReminderCutoff = new Date(now.getTime() + DEFAULT_REMIND_BEFORE_MINUTES * 60 * 1000);

    // Find reminders that are due:
    //   (a) have an explicit reminderAt that is <= now, OR
    //   (b) have no reminderAt but scheduledAt is within the next DEFAULT_REMIND_BEFORE_MINUTES
    // AND haven't been sent yet AND are still scheduled
    const dueReminders = await FollowUpReminder.find({
      reminderSent: false,
      status: 'scheduled',
      $or: [
        { reminderAt: { $lte: now } },
        {
          reminderAt: { $exists: false },
          scheduledAt: { $lte: defaultReminderCutoff }
        }
      ]
    })
      .populate('leadId', 'name phone')
      .lean();

    if (dueReminders.length === 0) return;

    console.log(`[FOLLOWUP-CRON] Firing ${dueReminders.length} reminder(s)`);

    const ids: mongoose.Types.ObjectId[] = [];

    for (const reminder of dueReminders as any[]) {
      ids.push(reminder._id);

      // Emit to the tenant socket room so the frontend can show a notification
      if (io) {
        io.to(`tenant_${reminder.tenantId}`).emit('followup_reminder', {
          reminderId: reminder._id,
          leadId: reminder.leadId?._id || reminder.leadId,
          leadName: reminder.leadId?.name || 'Unknown Lead',
          leadPhone: reminder.leadId?.phone || '',
          type: reminder.type,
          title: reminder.title,
          description: reminder.description,
          scheduledAt: reminder.scheduledAt,
          assignedTo: reminder.assignedTo,
        });
      }
    }

    // Bulk-mark as sent
    if (ids.length > 0) {
      await FollowUpReminder.updateMany(
        { _id: { $in: ids } },
        { $set: { reminderSent: true, reminderSentAt: now } }
      );
      console.log(`[FOLLOWUP-CRON] Marked ${ids.length} reminder(s) as sent`);
    }
  } catch (err) {
    console.error('[FOLLOWUP-CRON] Error firing reminders:', err);
  }
}

export { CRON_INTERVAL_MS };
