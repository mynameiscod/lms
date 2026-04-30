/**
 * aiCallQueueService.ts
 * BullMQ producer — enqueues AI outbound call jobs.
 *
 * Queue: 'ai-lead-calls'
 * Job types:
 *   'initiate'  — Place initial call for a new lead
 *   'retry'     — Scheduled retry after no-answer / busy
 */
import { Queue, QueueOptions } from 'bullmq';

export interface AICallJobData {
  leadId: string;
  tenantId: string;
  attemptNumber: number;  // 1-based
}

const QUEUE_NAME = 'ai-lead-calls';

const queueOptions: QueueOptions = {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
    attempts: 1     // Worker-level retries handled manually (we control retry logic)
  }
};

// Lazy-initialized queue singleton
let _queue: Queue<AICallJobData> | null = null;

export function getAICallQueue(): Queue<AICallJobData> {
  if (!_queue) {
    _queue = new Queue<AICallJobData>(QUEUE_NAME, queueOptions);
  }
  return _queue;
}

/**
 * Enqueue an immediate AI call job.
 */
export async function enqueueAICall(leadId: string, tenantId: string, attemptNumber = 1): Promise<void> {
  const q = getAICallQueue();
  await q.add(
    'initiate',
    { leadId, tenantId, attemptNumber },
    {
      jobId: `ai-call-${leadId}-${attemptNumber}-${Date.now()}`,
      delay: 5000  // 5-second grace delay after lead creation
    }
  );
  console.log(`[AICallQueue] Enqueued call for lead=${leadId} attempt=${attemptNumber}`);
}

/**
 * Enqueue a retry call with a delay.
 */
export async function enqueueAICallRetry(
  leadId: string,
  tenantId: string,
  attemptNumber: number,
  delayMs: number
): Promise<void> {
  const q = getAICallQueue();
  await q.add(
    'retry',
    { leadId, tenantId, attemptNumber },
    {
      jobId: `ai-call-${leadId}-${attemptNumber}-${Date.now()}`,
      delay: delayMs
    }
  );
  console.log(`[AICallQueue] Scheduled retry for lead=${leadId} attempt=${attemptNumber} in ${Math.round(delayMs / 60000)}min`);
}

/**
 * Gracefully close the queue connection.
 */
export async function closeAICallQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
}
