/**
 * Long bulk sends, off the request that started them.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────────────────────
 *
 * "Send invitations" ran the whole cohort inside the HTTP request: 443 recipients across two
 * channels, sequentially, each a network round trip to Meta or SES. It passed nginx's 600
 * second proxy_read_timeout and the admin got a 504 — while the send carried on behind it,
 * invisibly, with no way to tell how far it had got or whether pressing the button again
 * would message everyone twice.
 *
 * ── WHAT THIS DOES INSTEAD ────────────────────────────────────────────────────────────────
 *
 * The endpoint starts a job and returns immediately with its id and the number of people it
 * is about to message. The work runs on its own, recording progress as it goes, and the admin
 * screen polls. A send that takes eleven minutes is then just a send that takes eleven
 * minutes, with a number moving on the screen.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────────────────────
 *
 * It is NOT a durable queue. Progress lives in this process's memory, so a deploy or a crash
 * mid-send loses the progress record — the messages already delivered stay delivered, and the
 * per-recipient `invitesSent` flags in the database are what actually make a re-run safe, not
 * anything here. That is the same guarantee the old inline version gave; what is new is that
 * the admin can see it.
 *
 * A durable queue (BullMQ on the existing Redis) is the right destination. This is deliberately
 * the smaller change: it removes the timeout and the blindness without introducing a new
 * failure domain a week before an event.
 *
 * ── ONE SEND PER EXAM AT A TIME ───────────────────────────────────────────────────────────
 *
 * Two overlapping sends would interleave their reads of the already-invited flags and message
 * people twice. A second start while one is running is refused, and told which job is running.
 */
import { randomUUID } from 'crypto';

export type JobStatus = 'running' | 'done' | 'failed';

export interface BulkSendJob {
  id: string;
  kind: string;
  /** Scopes the "only one at a time" rule. The exam id, in practice. */
  scope: string;
  status: JobStatus;
  total: number;
  processed: number;
  email: number;
  whatsapp: number;
  failed: number;
  skipped: number;
  startedAt: Date;
  finishedAt?: Date;
  error?: string;
}

/** Progress for what one iteration of a send loop achieved. */
export interface SendTick {
  email?: number;
  whatsapp?: number;
  failed?: number;
  skipped?: number;
}

const jobs = new Map<string, BulkSendJob>();
const runningByScope = new Map<string, string>();

/** Finished jobs are kept this long so a screen that polls slowly still sees the result. */
const KEEP_FINISHED_MS = 30 * 60_000;

function sweep(): void {
  const cutoff = Date.now() - KEEP_FINISHED_MS;
  for (const [id, j] of jobs) {
    if (j.finishedAt && j.finishedAt.getTime() < cutoff) jobs.delete(id);
  }
}

export class SendAlreadyRunning extends Error {
  constructor(public readonly jobId: string) {
    super('A send is already running for this exam.');
  }
}

/**
 * Start a bulk send and return its job immediately.
 *
 * `work` receives a `tick` it must call once per recipient. The job is marked done when the
 * promise settles; a rejection marks it failed and keeps the reason, because "it stopped" with
 * no reason is exactly the blindness this exists to remove.
 */
export function startBulkSend(args: {
  kind: string;
  scope: string;
  total: number;
  work: (tick: (t: SendTick) => void) => Promise<void>;
}): BulkSendJob {
  sweep();

  const existingId = runningByScope.get(args.scope);
  if (existingId && jobs.get(existingId)?.status === 'running') {
    throw new SendAlreadyRunning(existingId);
  }

  const job: BulkSendJob = {
    id: randomUUID(),
    kind: args.kind,
    scope: args.scope,
    status: 'running',
    total: args.total,
    processed: 0,
    email: 0,
    whatsapp: 0,
    failed: 0,
    skipped: 0,
    startedAt: new Date(),
  };
  jobs.set(job.id, job);
  runningByScope.set(args.scope, job.id);

  const tick = (t: SendTick) => {
    job.processed++;
    job.email += t.email || 0;
    job.whatsapp += t.whatsapp || 0;
    job.failed += t.failed || 0;
    job.skipped += t.skipped || 0;
  };

  /*
   * Deliberately not awaited. The rejection is handled here rather than escaping as an
   * unhandled rejection -- crashGuard would log it, but the admin would still see a job stuck
   * at "running" forever with no reason attached.
   */
  void args.work(tick)
    .then(() => {
      job.status = 'done';
      job.finishedAt = new Date();
    })
    .catch((e: any) => {
      job.status = 'failed';
      job.error = e?.message || String(e);
      job.finishedAt = new Date();
      console.error(`[BULK-SEND] ${job.kind} job ${job.id} failed after ${job.processed}/${job.total}:`, e);
    })
    .finally(() => {
      if (runningByScope.get(args.scope) === job.id) runningByScope.delete(args.scope);
    });

  return job;
}

export function getBulkSend(id: string): BulkSendJob | undefined {
  return jobs.get(id);
}

/** The send currently running for this scope, if any. Lets a reloaded screen find its job. */
export function runningBulkSend(scope: string): BulkSendJob | undefined {
  const id = runningByScope.get(scope);
  const job = id ? jobs.get(id) : undefined;
  return job?.status === 'running' ? job : undefined;
}

/** Test seam: forget everything. Never called by application code. */
export function __resetBulkSends(): void {
  jobs.clear();
  runningByScope.clear();
}
