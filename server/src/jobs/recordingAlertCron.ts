import RecordingActivityLog from '../models/RecordingActivityLog';
import User from '../models/User';
import { createNotifications } from '../notifications/notificationService';

// A class recording that started but went idle without reaching a terminal state
// (saved/discarded) for this long is likely lost — alert the tenant's admins so
// they can chase the instructor or recover from the diagnostics page.
const STALE_MIN = 25;

export async function checkStaleRecordings(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_MIN * 60_000);
  const stale = await RecordingActivityLog.find({
    source: 'class_recording',
    status: { $nin: ['saved', 'discarded'] },
    lastEventAt: { $lt: cutoff },
    'events.type': { $ne: 'admin_alerted' }, // not already alerted
  }).limit(50);

  let alerted = 0;
  for (const log of stale) {
    try {
      const admins = await User.find({ tenantId: log.tenantId, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] }, isActive: true })
        .select('_id').lean();
      const ids = admins.map((a: any) => a._id.toString());
      if (ids.length) {
        await createNotifications(
          log.tenantId.toString(),
          ids,
          'general',
          '⚠️ A class recording may be lost',
          `${log.userName || 'An instructor'} started a recording (${log.mode || 'class'}) that wasn't saved (status: ${log.status}). Open Recording Diagnostics to check or recover.`,
          '/admin/recording-diagnostics'
        );
      }
      log.events.push({ ts: new Date(), type: 'admin_alerted' } as any);
      await log.save();
      alerted++;
    } catch (e) {
      console.error('[rec-alert] failed for', log.sessionId, e);
    }
  }
  if (alerted) console.log(`⚠️  Recording stale-session alerts sent for ${alerted} session(s)`);
  return alerted;
}

export function startRecordingAlertScheduler(): NodeJS.Timeout {
  const handle = setInterval(() => { checkStaleRecordings().catch(e => console.error('[rec-alert] run failed', e)); }, 10 * 60_000);
  console.log('⚠️  Recording stale-session alert scheduler started (every 10 min)');
  return handle;
}
