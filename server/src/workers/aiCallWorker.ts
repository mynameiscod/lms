/**
 * aiCallWorker.ts
 * BullMQ consumer — processes AI outbound call jobs.
 *
 * Flow per job:
 *   1. Load AICallConfig for the tenant (check enabled, working hours)
 *   2. Check lead is still a valid call candidate
 *   3. Call Exotel to initiate outbound call
 *   4. Save initial call log on the lead
 *   5. Schedule retry if needed (on no-answer/busy)
 *   6. After call completes (via webhook), transcript is processed separately
 */
import { Worker, Job, WorkerOptions } from 'bullmq';
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import AICallConfig, { IAICallConfig } from '../models/AICallConfig';
import { initiateExotelCall } from '../services/exotelService';
import { enqueueAICallRetry, AICallJobData } from '../services/aiCallQueueService';

const QUEUE_NAME = 'ai-lead-calls';

const workerOptions: WorkerOptions = {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  concurrency: 5  // Process up to 5 calls in parallel
};

/**
 * Check if current IST time is within working hours.
 */
function isWithinWorkingHours(config: IAICallConfig): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const istHour = istTime.getUTCHours();
  const istDay = istTime.getUTCDay(); // 0=Sun

  const { workingHoursStart, workingHoursEnd, workingDays } = config.retry;

  if (!workingDays.includes(istDay)) return false;
  if (istHour < workingHoursStart || istHour >= workingHoursEnd) return false;
  return true;
}

/**
 * Calculate delay (ms) to next working hour window.
 * Returns 0 if already within working hours.
 */
function msToNextWorkingWindow(config: IAICallConfig): number {
  if (isWithinWorkingHours(config)) return 0;

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const istHour = istNow.getUTCHours();
  const istDay = istNow.getUTCDay();

  const { workingHoursStart, workingHoursEnd, workingDays } = config.retry;

  // Try to find next valid window (look up to 7 days ahead)
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const checkDay = (istDay + daysAhead) % 7;
    if (!workingDays.includes(checkDay)) continue;

    let startHour = workingHoursStart;
    if (daysAhead === 0 && istHour >= workingHoursEnd) {
      // Today's window already passed — try next valid day
      continue;
    }
    if (daysAhead === 0 && istHour < workingHoursStart) {
      startHour = workingHoursStart;
    }

    // Calculate ms until this day's start hour
    const targetIST = new Date(istNow);
    targetIST.setUTCDate(istNow.getUTCDate() + daysAhead);
    targetIST.setUTCHours(startHour, 5, 0, 0); // 5min buffer after start
    const msDelay = targetIST.getTime() - istNow.getTime();
    return Math.max(msDelay, 60000); // Minimum 1 minute
  }

  // Fallback: 24 hours
  return 24 * 60 * 60 * 1000;
}

/**
 * Process a single AI call job.
 */
async function processAICallJob(job: Job<AICallJobData>): Promise<void> {
  const { leadId, tenantId, attemptNumber } = job.data;
  const logPrefix = `[AICallWorker] lead=${leadId} attempt=${attemptNumber}`;

  try {
    // 1. Load config
    const config = await AICallConfig.findOne({ tenantId, enabled: true });
    if (!config) {
      console.log(`${logPrefix} — No active AICallConfig for tenant, skipping`);
      return;
    }

    // 2. Load lead
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      console.log(`${logPrefix} — Lead not found, skipping`);
      return;
    }

    // Skip if already completed or converted
    if (lead.aiCallStatus === 'completed' || lead.aiCallStatus === 'skipped') {
      console.log(`${logPrefix} — Lead already ${lead.aiCallStatus}, skipping`);
      return;
    }

    // Skip if max attempts exceeded
    if (attemptNumber > config.retry.maxAttempts) {
      await Lead.findByIdAndUpdate(leadId, {
        aiCallStatus: 'failed',
        $push: {
          activities: {
            type: 'call',
            description: `AI qualification call — max attempts (${config.retry.maxAttempts}) exhausted`,
            createdBy: new mongoose.Types.ObjectId(),
            createdAt: new Date(),
            callOutcome: 'not_answered',
            metadata: { aiCall: true }
          }
        }
      });

      // Trigger WhatsApp fallback if enabled
      if (config.whatsappFallback.enabled && config.whatsappFallback.triggerAfterMaxAttempts) {
        console.log(`${logPrefix} — Triggering WhatsApp fallback for lead ${leadId}`);
        // Fire-and-forget WhatsApp message
        triggerWhatsAppFallback(lead.phone, config, tenantId).catch(err =>
          console.error(`${logPrefix} — WhatsApp fallback error:`, err)
        );
      }
      return;
    }

    // 3. Check working hours
    if (!isWithinWorkingHours(config)) {
      const delayMs = msToNextWorkingWindow(config);
      console.log(`${logPrefix} — Outside working hours, rescheduling in ${Math.round(delayMs / 60000)}min`);
      await enqueueAICallRetry(leadId, tenantId, attemptNumber, delayMs);
      return;
    }

    // 4. Mark as in_progress
    await Lead.findByIdAndUpdate(leadId, {
      aiCallStatus: 'in_progress',
      aiCallAttempts: attemptNumber
    });

    // 5. Initiate Exotel call
    console.log(`${logPrefix} — Initiating Exotel call to ${lead.phone}`);
    const callResult = await initiateExotelCall(
      config.exotelAccountSid,
      config.exotelApiKey,
      config.exotelApiToken,
      config.exotelVirtualNumber,
      config.exotelAppId,
      lead.phone,
      leadId,
      tenantId,
      attemptNumber
    );

    // 6. Save initial call log
    await Lead.findByIdAndUpdate(leadId, {
      $push: {
        aiCallLogs: {
          attemptNumber,
          callSid: callResult.callSid,
          startedAt: new Date(),
          outcome: 'in_progress'
        },
        activities: {
          type: 'call',
          description: `AI qualification call initiated (attempt ${attemptNumber})`,
          createdBy: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          callStatus: 'scheduled',
          metadata: { aiCall: true, callSid: callResult.callSid }
        }
      }
    });

    // 7. Update config stats
    await AICallConfig.findOneAndUpdate(
      { tenantId },
      { $inc: { 'stats.totalCallsInitiated': 1 }, $set: { 'stats.lastUpdatedAt': new Date() } }
    );

    console.log(`${logPrefix} — Call initiated, callSid=${callResult.callSid}`);

  } catch (err: any) {
    console.error(`${logPrefix} — Error:`, err.message);

    // Save failure log
    await Lead.findByIdAndUpdate(leadId, {
      aiCallStatus: 'failed',
      $push: {
        aiCallLogs: {
          attemptNumber,
          startedAt: new Date(),
          outcome: 'failed',
          error: err.message?.substring(0, 200)
        }
      }
    }).catch(() => {});

    // Retry on transient errors
    const retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'socket hang up'];
    const isRetryable = retryableErrors.some(e => err.message?.includes(e));
    if (isRetryable) {
      const config = await AICallConfig.findOne({ tenantId });
      if (config && attemptNumber < config.retry.maxAttempts) {
        const delayMs = config.retry.retryGapMinutes * 60 * 1000;
        await enqueueAICallRetry(leadId, tenantId, attemptNumber + 1, delayMs);
      }
    }
  }
}

/**
 * Send WhatsApp fallback message after max call attempts.
 */
async function triggerWhatsAppFallback(
  phone: string,
  config: IAICallConfig,
  tenantId: string
): Promise<void> {
  // Uses existing whatsAppWelcomeService pattern — fire message with brochure link
  const message = config.whatsappFallback.message ||
    `Hi! We tried calling you but couldn't connect. We'd love to help you with your learning goals. Please reply to this message or call us back. 📚`;

  console.log(`[AICallWorker] WhatsApp fallback → ${phone}: ${message.substring(0, 50)}...`);
  // Integration point: call your existing WhatsApp service here
  // sendWhatsAppTemplate(phone, config.whatsappFallback.templateName, tenantId)
}

let _worker: Worker<AICallJobData> | null = null;

/**
 * Start the AI call worker. Call once at server startup.
 */
export function startAICallWorker(): Worker<AICallJobData> {
  if (_worker) return _worker;

  _worker = new Worker<AICallJobData>(
    QUEUE_NAME,
    processAICallJob,
    workerOptions
  );

  _worker.on('completed', (job) => {
    console.log(`[AICallWorker] Job ${job.id} completed`);
  });

  _worker.on('failed', (job, err) => {
    console.error(`[AICallWorker] Job ${job?.id} failed:`, err.message);
  });

  _worker.on('error', (err) => {
    console.error('[AICallWorker] Worker error:', err.message);
  });

  console.log('✅ AI Call Worker started');
  return _worker;
}

/**
 * Gracefully stop the worker.
 */
export async function stopAICallWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
  }
}
