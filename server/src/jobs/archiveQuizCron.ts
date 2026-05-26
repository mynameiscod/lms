import Quiz from '../models/Quiz';

// Archive quizzes whose end window closed more than GRACE_DAYS ago
const GRACE_DAYS = 7;
const INTERVAL_MS = 6 * 60 * 60 * 1000; // run every 6 hours

async function archiveExpiredQuizzes(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000);

    const result = await Quiz.updateMany(
      {
        archivedAt: null,
        isActive: true,
        endDate: { $lt: cutoff },
      },
      { $set: { archivedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[ARCHIVE-CRON] Auto-archived ${result.modifiedCount} expired quiz(zes)`);
    }
  } catch (err) {
    console.error('[ARCHIVE-CRON] Error:', err);
  }
}

export function startArchiveQuizScheduler(): void {
  // Fire once shortly after startup to catch any backlog
  setTimeout(() => archiveExpiredQuizzes(), 30_000);

  setInterval(archiveExpiredQuizzes, INTERVAL_MS);
  console.log(`[ARCHIVE-CRON] Scheduler started — checks every ${INTERVAL_MS / 3600000}h, grace period ${GRACE_DAYS} days`);
}
