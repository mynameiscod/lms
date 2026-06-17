import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/database';
import { initSettings } from './services/settingsService';
import { syncAllActiveSheets } from './services/googleSheetSyncService';
import { fireFollowUpReminders, CRON_INTERVAL_MS } from './jobs/followUpCron';
import { startDailySummaryScheduler } from './jobs/dailySummaryCron';
import { startSlaCronScheduler } from './jobs/slaCron';
import { startAICallWorker, stopAICallWorker } from './workers/aiCallWorker';
import { startArchiveQuizScheduler } from './jobs/archiveQuizCron';
import { startDueReminderScheduler } from './jobs/dueReminderCron';
import { startRecordingAlertScheduler } from './jobs/recordingAlertCron';

const PORT = process.env.PORT || 5000;
console.log(`🚀 Starting server with NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);

const startServer = async () => {
  try {
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

    // Start learning-plan due-date reminder scheduler (in-app, daily)
    startDueReminderScheduler();

    // Start stale class-recording alert scheduler (in-app, every 10 min)
    startRecordingAlertScheduler();

    console.log(`⏳ Starting HTTP server on port ${PORT}...`);
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ WebSocket is ready`);
      console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

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