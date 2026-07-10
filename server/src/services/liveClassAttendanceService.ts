/**
 * liveClassAttendanceService — turns 100ms peer.join / peer.leave webhook events into
 * watch-time logs, then finalises them into the main Attendance module when a class ends.
 */
import LiveClass from '../models/LiveClass';
import LiveClassAttendance from '../models/LiveClassAttendance';
import User from '../models/User';
import attendanceService from './attendanceService';

const BROADCASTER = 'broadcaster';

// Present if the student watched at least 40% of the class, with a 5-minute floor.
function presentThresholdSeconds(durationMin: number): number {
  return Math.max(300, Math.round(0.4 * (durationMin || 60) * 60));
}

async function findClassByRoom(roomId: string) {
  if (!roomId) return null;
  return LiveClass.findOne({ hmsRoomId: roomId });
}

export async function recordJoin(roomId: string, userId: string, role?: string): Promise<void> {
  if (!userId) return;
  const lc = await findClassByRoom(roomId);
  if (!lc) return;
  const now = new Date();
  await LiveClassAttendance.updateOne(
    { liveClassId: lc._id, userId },
    {
      $setOnInsert: { tenantId: lc.tenantId, firstJoinedAt: now },
      $set: { lastSeenAt: now, ...(role ? { role } : {}) },
    },
    { upsert: true }
  );
}

export async function recordLeave(roomId: string, userId: string, durationSeconds?: number): Promise<void> {
  if (!userId) return;
  const lc = await findClassByRoom(roomId);
  if (!lc) return;
  const secs = Math.max(0, Math.round(durationSeconds || 0));
  await LiveClassAttendance.updateOne(
    { liveClassId: lc._id, userId },
    {
      $setOnInsert: { tenantId: lc.tenantId, firstJoinedAt: new Date() },
      $set: { lastSeenAt: new Date() },
      $inc: { totalSeconds: secs },
    },
    { upsert: true }
  );
}

/**
 * Compute present/absent for everyone who joined and, if the class is tied to a batch,
 * push a "present" record into the main Attendance module for qualifying students.
 * Idempotent — only unfinalised rows are pushed.
 */
export async function finalizeAttendance(liveClassId: string): Promise<{ present: number; marked: number }> {
  const lc = await LiveClass.findById(liveClassId);
  if (!lc) return { present: 0, marked: 0 };

  const threshold = presentThresholdSeconds(lc.durationMin);
  const rows = await LiveClassAttendance.find({ liveClassId: lc._id }).lean();

  let present = 0;
  let marked = 0;
  for (const r of rows) {
    const isHost = r.role === BROADCASTER || String(r.userId) === String(lc.instructorId);
    const qualifies = !isHost && (r.totalSeconds || 0) >= threshold;
    await LiveClassAttendance.updateOne({ _id: r._id }, { $set: { present: qualifies } });
    if (!qualifies) continue;
    present++;

    // Only mark into the batch attendance sheet if this class belongs to a batch,
    // the user is a student of that batch, and we haven't already pushed it.
    if (lc.batchId && !r.finalized) {
      try {
        const student = await User.findOne({ _id: r.userId, tenantId: lc.tenantId }).select('role batchId').lean();
        if (student && student.role === 'STUDENT' && String((student as any).batchId) === String(lc.batchId)) {
          await attendanceService.markAttendance(
            String(r.userId),
            String(lc.batchId),
            lc.scheduledAt || new Date(),
            undefined,
            undefined,
            'present',
            String(lc.instructorId || lc.createdBy),
            String(lc.tenantId),
            `Live class: ${lc.title}`
          );
          marked++;
        }
        await LiveClassAttendance.updateOne({ _id: r._id }, { $set: { finalized: true } });
      } catch {
        // best-effort — a single failure shouldn't block the rest
      }
    }
  }
  return { present, marked };
}
