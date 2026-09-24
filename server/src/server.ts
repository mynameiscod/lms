import dotenv from 'dotenv';
dotenv.config();

// Before any import below can register a listener, open a socket or schedule a timer:
// an uncaught error from a background job used to kill the whole platform mid-exam.
import { installCrashGuard, markServing } from './config/crashGuard';
installCrashGuard();

import app from './app';
import http from 'http';
import cluster from 'cluster';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/database';
import { assertSecretsPresent } from './config/secrets';
import { initSettings } from './services/settingsService';
import { syncAllActiveSheets } from './services/googleSheetSyncService';
import { fireFollowUpReminders, CRON_INTERVAL_MS } from './jobs/followUpCron';
import { startDailySummaryScheduler } from './jobs/dailySummaryCron';
import { startSlaCronScheduler } from './jobs/slaCron';
import { startAICallWorker, stopAICallWorker } from './workers/aiCallWorker';
import { startArchiveQuizScheduler } from './jobs/archiveQuizCron';
import { startDueReminderScheduler } from './jobs/dueReminderCron';
import { startAssessmentMissedSweep } from './jobs/assessmentMissedSweepCron';
import { startRecordingAlertScheduler } from './jobs/recordingAlertCron';
import { startSpeakingReminderScheduler } from './jobs/speakingReminderCron';
import { startInterviewReminderScheduler } from './jobs/interviewReminderCron';
import { startLiveClassReminderScheduler } from './jobs/liveClassReminderCron';
import { startBattleReminderScheduler } from './jobs/battleReminderCron';
import { startHackathonExamScheduler } from './jobs/hackathonExamCron';
import { startCommunicationReminderScheduler } from './jobs/communicationReminderCron';
import { startInterviewRecordingRetentionScheduler } from './jobs/interviewRecordingRetentionCron';
import { startPartnerOutreachScheduler } from './jobs/partnerOutreachCron';
import { startPartnerRetentionScheduler } from './jobs/partnerRetentionCron';
import { startPartnerReplyScheduler } from './jobs/partnerReplyCron';

const PORT = process.env.PORT || 5000;
console.log(`🚀 Starting server with NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);

/**
 * Which process owns the background schedulers. Single-process mode: this one. Cluster
 * mode: worker 1 only, so cron work happens once rather than once per core.
 */
const IS_JOB_RUNNER = !cluster.isWorker || cluster.worker?.id === 1;

const startServer = async () => {
  try {
    /**
     * Refuse to start without a signing key.
     *
     * Before anything binds a port or opens a connection: a process that boots without
     * JWT_SECRET used to fall back to a literal published in this repository, and every
     * token it then accepted was forgeable. Failing here makes that a deploy that visibly
     * did not start rather than one that quietly started insecure.
     */
    assertSecretsPresent();

    console.log('📡 Attempting to connect to MongoDB...');
    // Connect to database
    await connectDB();
    console.log('✅ MongoDB connection successful');

    // Load admin-managed configuration from DB (keys/models set in the UI).
    await initSettings();

    console.log('📦 Creating HTTP server with Socket.io...');
    // Create HTTP server with Socket.io
    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: true,  // Allow all origins — socket auth is JWT-based
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Store io instance in app for access in controllers
    app.set('io', io);

    console.log('🔌 Setting up WebSocket handlers...');

    // ── Live Classroom session state (in-memory, single instance) ──
    interface LiveParticipant {
      socketId: string;
      userId: string;
      name: string;
      initials: string;
      role: 'host' | 'speaker' | 'viewer';
      audioEnabled: boolean;
      videoEnabled: boolean;
    }
    interface LiveSession {
      hostSocketId: string;
      participants: Map<string, LiveParticipant>;
      chatEnabled: boolean;
      recordingState: 'recording' | 'paused' | 'stopped';
      createdAt: number;
    }
    const liveSessions = new Map<string, LiveSession>();

    // WebSocket connection handlers
    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // Join tenant-specific room for real-time updates
      socket.on('join_tenant', (tenantId: string) => {
        socket.join(`tenant_${tenantId}`);
        console.log(`📢 Socket ${socket.id} joined tenant_${tenantId}`);
      });

      // Join staff-only room (receives hot lead alerts and other staff notifications)
      socket.on('join_staff', (tenantId: string) => {
        socket.join(`staff_${tenantId}`);
        console.log(`👔 Socket ${socket.id} joined staff_${tenantId}`);
      });

      // Join course-specific room
      socket.on('join_course', (courseId: string) => {
        socket.join(`course_${courseId}`);
        console.log(`📚 Socket ${socket.id} joined course_${courseId}`);
      });

      // ── Live Classroom signaling ──

      socket.on('live_class:join', ({ sessionId, userId, name, initials, role }: {
        sessionId: string; userId: string; name: string; initials: string; role: 'host' | 'viewer';
      }) => {
        if (!sessionId || !userId || !name) return;

        if (role === 'host') {
          // Create session (or reclaim if host reconnects)
          if (!liveSessions.has(sessionId)) {
            liveSessions.set(sessionId, {
              hostSocketId: socket.id,
              participants: new Map(),
              chatEnabled: true,
              recordingState: 'recording',
              createdAt: Date.now(),
            });
          } else {
            liveSessions.get(sessionId)!.hostSocketId = socket.id;
          }
        }

        const session = liveSessions.get(sessionId);
        if (!session) {
          socket.emit('live_class:error', { message: 'Session not found. Ask the host to start the session first.' });
          return;
        }

        const participant: LiveParticipant = {
          socketId: socket.id,
          userId,
          name: name.trim().substring(0, 60),
          initials: (initials || name.substring(0, 2)).toUpperCase().substring(0, 2),
          role: role === 'host' ? 'host' : 'viewer',
          audioEnabled: false,
          videoEnabled: false,
        };

        session.participants.set(socket.id, participant);
        socket.join(`live_${sessionId}`);
        console.log(`🎓 ${name} (${role}) joined live session ${sessionId}`);

        // Send current state to the new joiner
        socket.emit('live_class:participant_list', {
          participants: Array.from(session.participants.values()),
          chatEnabled: session.chatEnabled,
          recordingState: session.recordingState,
          hostSocketId: session.hostSocketId,
        });

        // Notify everyone else in the room
        socket.to(`live_${sessionId}`).emit('live_class:participant_joined', participant);
      });

      socket.on('live_class:leave', ({ sessionId }: { sessionId: string }) => {
        const session = liveSessions.get(sessionId);
        if (!session) return;
        session.participants.delete(socket.id);
        socket.leave(`live_${sessionId}`);
        socket.to(`live_${sessionId}`).emit('live_class:participant_left', { socketId: socket.id });
        if (session.participants.size === 0) liveSessions.delete(sessionId);
      });

      // WebRTC signaling — relay between peers
      socket.on('live_class:offer', ({ sessionId, to, sdp }: { sessionId: string; to: string; sdp: object }) => {
        if (liveSessions.has(sessionId)) {
          io.to(to).emit('live_class:offer', { from: socket.id, sdp });
        }
      });

      socket.on('live_class:answer', ({ sessionId, to, sdp }: { sessionId: string; to: string; sdp: object }) => {
        if (liveSessions.has(sessionId)) {
          io.to(to).emit('live_class:answer', { from: socket.id, sdp });
        }
      });

      socket.on('live_class:ice', ({ sessionId, to, candidate }: { sessionId: string; to: string; candidate: object }) => {
        if (liveSessions.has(sessionId)) {
          io.to(to).emit('live_class:ice', { from: socket.id, candidate });
        }
      });

      // Chat
      socket.on('live_class:chat', ({ sessionId, text }: { sessionId: string; text: string }) => {
        const session = liveSessions.get(sessionId);
        if (!session || !session.chatEnabled) return;
        const participant = session.participants.get(socket.id);
        if (!participant) return;
        const message = {
          id: `${Date.now()}_${socket.id.slice(-4)}`,
          senderId: participant.userId,
          senderName: participant.name,
          initials: participant.initials,
          role: participant.role,
          text: (text || '').trim().substring(0, 500),
          timestamp: Date.now(),
        };
        io.to(`live_${sessionId}`).emit('live_class:chat', message);
      });

      // Participant updates (mic/video toggle)
      socket.on('live_class:update', ({ sessionId, audioEnabled, videoEnabled }: {
        sessionId: string; audioEnabled: boolean; videoEnabled: boolean;
      }) => {
        const session = liveSessions.get(sessionId);
        if (!session) return;
        const p = session.participants.get(socket.id);
        if (!p) return;
        p.audioEnabled = !!audioEnabled;
        p.videoEnabled = !!videoEnabled;
        socket.to(`live_${sessionId}`).emit('live_class:participant_updated', {
          socketId: socket.id, audioEnabled: p.audioEnabled, videoEnabled: p.videoEnabled,
        });
      });

      // Host actions (mute/promote/remove/chat toggle/recording state)
      socket.on('live_class:host_action', ({ sessionId, action, targetSocketId, value }: {
        sessionId: string;
        action: 'mute' | 'unmute' | 'promote' | 'remove' | 'chat_toggle' | 'recording_state';
        targetSocketId?: string;
        value?: any;
      }) => {
        const session = liveSessions.get(sessionId);
        if (!session || session.hostSocketId !== socket.id) return;

        if (action === 'chat_toggle') {
          session.chatEnabled = !!value;
        } else if (action === 'recording_state') {
          session.recordingState = value;
        } else if (action === 'promote' && targetSocketId) {
          const p = session.participants.get(targetSocketId);
          if (p) p.role = value === 'speaker' ? 'speaker' : 'viewer';
        } else if (action === 'remove' && targetSocketId) {
          session.participants.delete(targetSocketId);
          io.to(targetSocketId).emit('live_class:removed');
        } else if ((action === 'mute' || action === 'unmute') && targetSocketId) {
          const p = session.participants.get(targetSocketId);
          if (p) p.audioEnabled = action === 'unmute';
        }

        io.to(`live_${sessionId}`).emit('live_class:host_action', {
          action,
          targetSocketId,
          value,
          participants: Array.from(session.participants.values()),
          chatEnabled: session.chatEnabled,
          recordingState: session.recordingState,
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        // Clean up any live sessions this socket was part of
        liveSessions.forEach((session, sessionId) => {
          if (session.participants.has(socket.id)) {
            session.participants.delete(socket.id);
            io.to(`live_${sessionId}`).emit('live_class:participant_left', { socketId: socket.id });
            if (session.participants.size === 0) liveSessions.delete(sessionId);
          }
        });
      });
    });

    // ── Background jobs ────────────────────────────────────────────────────────
    // Exactly ONE process may run these. Under clustering every worker executes this
    // file, so an ungated block would mean 8 copies of every reminder scheduler — and
    // students receiving each reminder email eight times.
    if (!IS_JOB_RUNNER) {
      console.log(`⏭️  worker ${process.pid}: schedulers skipped (job runner is another worker)`);
    } else {

    // Start Google Sheets sync cron (runs every 5 minutes)
    const GSHEET_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
    setInterval(async () => {
      try {
        await syncAllActiveSheets();
      } catch (err) {
        console.error('[GSHEET-CRON] Sync error:', err);
      }
    }, GSHEET_SYNC_INTERVAL);
    console.log(`📊 Google Sheets sync scheduled every ${GSHEET_SYNC_INTERVAL / 60000} minutes`);

    // Start follow-up reminder cron (runs every 5 minutes)
    setInterval(async () => {
      try {
        await fireFollowUpReminders(io);
      } catch (err) {
        console.error('[FOLLOWUP-CRON] Error:', err);
      }
    }, CRON_INTERVAL_MS);
    // Fire once immediately after startup to catch anything missed during downtime
    setTimeout(() => fireFollowUpReminders(io).catch(console.error), 10_000);
    console.log(`🔔 Follow-up reminder cron scheduled every ${CRON_INTERVAL_MS / 60000} minutes`);

    // Start daily summary email scheduler (fires at 8:00 PM)
    startDailySummaryScheduler();

    // Start SLA breach checker (runs every 30 minutes)
    startSlaCronScheduler(io);

    // Start AI Voice Call worker (BullMQ)
    startAICallWorker();
    console.log('🤖 AI Call Worker started');

    // Start quiz auto-archive scheduler
    startArchiveQuizScheduler();
    startAssessmentMissedSweep();

    // Start learning-plan due-date reminder scheduler (in-app, daily)
    startDueReminderScheduler();

    // Start stale class-recording alert scheduler (in-app, every 10 min)
    startRecordingAlertScheduler();

    // Start speaking-practice reminder scheduler (in-app, daily)
    startSpeakingReminderScheduler();

    // Start AI-interview start-reminder scheduler (in-app, 30m lead, every 5 min)
    startInterviewReminderScheduler();

    // Start live-class "starts soon" reminder scheduler (in-app + email, 20m lead)
    startLiveClassReminderScheduler();

    // Start Tech Battle reminder scheduler (email link at 24h / 1h / live, every 2 min)
    startBattleReminderScheduler();
    startHackathonExamScheduler();

    // Start communication-lab daily streak-nudge scheduler (in-app, once/day)
    startCommunicationReminderScheduler();
    startInterviewRecordingRetentionScheduler();

    // Start placement-partner outreach sender (cap + gap enforced in service)
    startPartnerOutreachScheduler();

    // Start placement-partner retention reminders (guarantee + quarterly check-in)
    startPartnerRetentionScheduler();

    // Start placement-partner reply poller (IMAP → auto-stop sequence on reply)
    startPartnerReplyScheduler();

    } // ── end background jobs (single process only) ─────────────────────────────

    console.log(`⏳ Starting HTTP server on port ${PORT}...`);
    // Start server
    httpServer.listen(PORT, () => {
      // From here on an uncaught exception must not end the process by default:
      // candidates are connected and a restart costs them their session.
      markServing();
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ WebSocket is ready`);
      console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Multi-core mode. CURRENTLY DISABLED, and the process refuses to start if you ask for it.
 *
 * Node runs one thread, so this process uses ONE core no matter how many the machine has.
 * `WEB_CONCURRENCY=8` would fork eight workers sharing port 5000.
 *
 * ── WHY IT IS REFUSED RATHER THAN JUST DEFAULTED OFF ──────────────────────────────────────
 *
 * The comment that used to live here said "enable it for a battle; leave it off otherwise".
 * That is the most dangerous possible advice, because a battle is exactly when the four
 * things below do maximum damage, and three of them fail SILENTLY. Somebody following that
 * instruction an hour before an event would get a platform that looks fine and is not.
 *
 * FOUR pieces of per-process state break under clustering. The repo previously recorded only
 * the first, which understated the problem:
 *
 *  1. SOCKET.IO HAS NO REDIS ADAPTER. A message emitted by one worker never reaches clients
 *     connected to another. Notifications and live classes stop working across workers.
 *
 *  2. THE EXECUTION CONCURRENCY CAP IS PER PROCESS (services/executionQueue.ts). The heavy
 *     pool is capped at CODE_EXEC_CONCURRENCY, default 2 -- per worker. Four workers means
 *     EIGHT concurrent Java compilations against a four-core sandbox. That cap is not a
 *     guess: it was measured, and at a cap of 4 twenty concurrent Java runs produced zero
 *     correct results. Clustering silently doubles or quadruples the one limit that exists
 *     to stop a compile storm. This is the worst of the four and the least obvious.
 *
 *  3. THE SETTINGS CACHE IS PER PROCESS (services/settingsService.ts). set() updates only
 *     the worker that served the request, and there is no invalidation path. An admin
 *     changing the sandbox URL updates one worker of four; the rest keep calling the old
 *     host until restart.
 *
 *  4. LIVE-CLASSROOM STATE IS PER PROCESS (`liveSessions` inside startServer). With no
 *     adapter a viewer on another worker gets a visible "Session not found". WITH an
 *     adapter it is worse: the join succeeds and the participant list silently shows only
 *     the people who happen to share that worker.
 *
 *     Same shape, added later: bulkSendJobs.ts keeps its progress and its one-send-per-exam
 *     guard in memory, so two admins on two workers could start overlapping sends.
 *
 * ── AND WHETHER IT IS EVEN WORTH BUILDING ─────────────────────────────────────────────────
 *
 * Probably not yet. Node was never the constraint on 22 September: the outage was static
 * files served through Node at 5 KB/s, whole-document Mongo writes, proctoring chunk floods
 * and Piston compile storms. All four are fixed, and this process now idles at ~0.2% CPU.
 * Fix the four items above when a load test shows CPU is actually the ceiling -- not before.
 */
const WEB_CONCURRENCY = Math.max(0, Number(process.env.WEB_CONCURRENCY) || 0);

if (WEB_CONCURRENCY > 1) {
  /*
   * Refuse, loudly, rather than start a platform that is subtly wrong.
   *
   * A failed boot is caught by the deploy's health check while the old slot is still serving
   * traffic. A successful boot with a split execution cap and a partial participant list is
   * discovered by candidates, during an event.
   */
  console.error([
    '',
    `❌ WEB_CONCURRENCY=${WEB_CONCURRENCY} was set, and clustering is NOT SAFE in this build.`,
    '',
    '   Four pieces of state are per-process and would break or silently mislead:',
    '     1. socket.io has no Redis adapter      — cross-worker messages are lost',
    '     2. executionQueue cap is per worker    — N workers = N × the measured safe limit',
    '     3. settingsService cache is per worker — a settings change reaches one worker',
    '     4. liveSessions / bulkSendJobs in memory — partial rosters, duplicate sends',
    '',
    '   See the comment above this check in server.ts for the detail and the measurements.',
    '   Unset WEB_CONCURRENCY (or set it to 1) to start.',
    '',
  ].join('\n'));
  process.exit(1);
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM received — stopping AI call worker...');
  await stopAICallWorker().catch(console.error);
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('[SERVER] SIGINT received — stopping AI call worker...');
  await stopAICallWorker().catch(console.error);
  process.exit(0);
});