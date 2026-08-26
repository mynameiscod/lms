import PassportInterview from '../models/PassportInterview';
import * as bunny from '../services/bunnyStorageService';

/**
 * Deletes CareerPilot mock-interview recordings once they pass their retention date.
 *
 * These files are a student's face and voice. Retention is set per upload
 * (RECORDING_RETENTION_DAYS in passportInterviewController, currently 365 days) and this is
 * what actually enforces it — a Mongo TTL index could expire the DOCUMENT but would leave
 * the video sitting in Bunny forever, still billed and still readable by anyone who later
 * gained bucket access. The file has to be deleted explicitly, so it is deleted here.
 *
 * The interview itself is kept. Its transcript, score and evidence are the member's record
 * and outlive the video; only the recording fields are cleared.
 *
 * Bunny first, database second. If the delete fails the row keeps its key and the next
 * sweep tries again — the opposite order would drop the only pointer to the file and orphan
 * it permanently.
 */

const HOUR = 3; // ~03:00 server time, away from the interview traffic peak
const BATCH = 200;

export async function sweepExpiredRecordings(): Promise<number> {
  const due = await PassportInterview.find({
    recordingExpiresAt: { $ne: null, $lte: new Date() },
    recordingKey: { $ne: null },
  }).select('_id recordingKey').limit(BATCH).lean() as any[];

  let deleted = 0;
  for (const row of due) {
    try {
      // Best-effort inside the service, so this throwing at all is unusual — but a single
      // bad row must not stop the sweep reaching the rest.
      await bunny.deleteFile(row.recordingKey);
      await PassportInterview.updateOne({ _id: row._id }, {
        $set: {
          recordingKey: null, recordingMime: null, recordingBytes: null,
          recordingDurationSec: null, recordingExpiresAt: null,
        },
      });
      deleted += 1;
    } catch (e: any) {
      console.error('[interviewRecordingRetention] failed for', String(row._id), e?.message);
    }
  }
  return deleted;
}

export function startInterviewRecordingRetentionScheduler(): NodeJS.Timeout {
  let lastFired = '';
  const handle = setInterval(async () => {
    const now = new Date();
    const k = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (now.getHours() === HOUR && lastFired !== k) {
      lastFired = k;
      try {
        const n = await sweepExpiredRecordings();
        if (n) console.log(`🎥 Expired interview recordings deleted: ${n}`);
      } catch (e: any) { console.error('[interviewRecordingRetention]', e?.message); }
    }
  }, 5 * 60 * 1000);
  console.log(`🎥 Interview-recording retention sweep started (fires daily at ${HOUR}:00)`);
  return handle;
}
