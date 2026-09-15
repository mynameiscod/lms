import HackathonExam from '../models/HackathonExam';
import { fireDueReminders } from '../services/hackathonExamNotifyService';
import { drainGradingQueue } from '../services/hackathonExamGradingService';
import { sweepExpiredAttempts } from '../services/hackathonExamService';
import { logger } from '../utils/logger';

/**
 * The three things that have to keep happening while an exam is running, none of which anybody
 * is going to be sitting there pressing a button for.
 *
 *   REMINDERS fire on their configured offsets.
 *   THE WINDOW opens and closes on time, and papers left open are submitted when time runs out.
 *   THE GRADING QUEUE drains, which is where the whole coding round actually gets scored.
 *
 * ── ONE TICK, AND IT NEVER OVERLAPS ITSELF ────────────────────────────────────────────────
 *
 * Grading is slow by nature — a Java run is about seven seconds and there are thousands of
 * them. If a tick can start while the previous one is still working, two passes claim work at
 * once and the execution tier gets hit twice as hard at exactly the moment it is least able to
 * take it. The guard is a plain boolean because this runs in one process: server.ts starts the
 * schedulers on worker 1 only.
 */

const TICK_MS = 60_000;
/** Bounded so one pass cannot run past the next tick and starve the reminders behind it. */
const GRADE_BATCH = 20;

let running = false;
let timer: NodeJS.Timeout | null = null;

export async function hackathonExamTick(now = new Date()): Promise<void> {
  /* Open and close on time, so nobody is waiting on an admin to press something. */
  const due = await HackathonExam.find({
    status: { $in: ['ready', 'live'] },
    startAt: { $lte: now },
  });

  for (const exam of due) {
    if (exam.status === 'ready' && now >= new Date(exam.startAt) && now < new Date(exam.endAt)) {
      exam.status = 'live';
      await exam.save();
      logger.info('hackathon exam is live', { examId: String(exam._id), title: exam.title });
    }

    /*
     * Swept every tick while live, not only at the end. Somebody who started at the beginning
     * of a two-hour window with a sixty-minute paper runs out long before the exam closes, and
     * their answers should be safely submitted at that moment rather than an hour later.
     */
    if (exam.status === 'live') {
      const swept = await sweepExpiredAttempts(exam, now);
      if (swept.autoSubmitted) {
        logger.info('hackathon exam auto-submitted expired papers', {
          examId: String(exam._id), count: swept.autoSubmitted,
        });
      }
      if (now >= new Date(exam.endAt)) {
        exam.status = 'closed';
        await exam.save();
        logger.info('hackathon exam closed', { examId: String(exam._id), noShows: swept.noShows });
      }
    }
  }

  await fireDueReminders(now);

  const graded = await drainGradingQueue(GRADE_BATCH);
  if (graded.graded || graded.review) {
    logger.info('hackathon exam grading pass', graded);
  }
}

export function startHackathonExamScheduler(): void {
  if (timer) return;
  timer = setInterval(async () => {
    if (running) return;              // a slow grading pass must not stack ticks
    running = true;
    try {
      await hackathonExamTick();
    } catch (e: any) {
      logger.error('hackathon exam tick failed', { error: e?.message });
    } finally {
      running = false;
    }
  }, TICK_MS);
  /* Never hold the process open on this alone. */
  timer.unref?.();
  logger.info('hackathon exam scheduler started');
}

export function stopHackathonExamScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
