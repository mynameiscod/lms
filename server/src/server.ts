import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/database';
import { syncAllActiveSheets } from './services/googleSheetSyncService';

const PORT = process.env.PORT || 5000;
console.log(`🚀 Starting server with NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);

const startServer = async () => {
  try {
    console.log('📡 Attempting to connect to MongoDB...');
    // Connect to database
    await connectDB();
    console.log('✅ MongoDB connection successful');

    console.log('📦 Creating HTTP server with Socket.io...');
    // Create HTTP server with Socket.io
    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:3002',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:3002',
          process.env.CLIENT_URL
        ],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Store io instance in app for access in controllers
    app.set('io', io);

    console.log('🔌 Setting up WebSocket handlers...');
    // WebSocket connection handlers
    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // Join tenant-specific room for real-time updates
      socket.on('join_tenant', (tenantId: string) => {
        socket.join(`tenant_${tenantId}`);
        console.log(`📢 Socket ${socket.id} joined tenant_${tenantId}`);
      });

      // Join course-specific room
      socket.on('join_course', (courseId: string) => {
        socket.join(`course_${courseId}`);
        console.log(`📚 Socket ${socket.id} joined course_${courseId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
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