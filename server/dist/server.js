"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const database_1 = __importDefault(require("./config/database"));
const PORT = process.env.PORT || 5000;
console.log(`🚀 Starting server with NODE_ENV=${process.env.NODE_ENV}, PORT=${PORT}`);
const startServer = async () => {
    try {
        console.log('📡 Attempting to connect to MongoDB...');
        // Connect to database
        await (0, database_1.default)();
        console.log('✅ MongoDB connection successful');
        console.log('📦 Creating HTTP server with Socket.io...');
        // Create HTTP server with Socket.io
        const httpServer = http_1.default.createServer(app_1.default);
        const io = new socket_io_1.Server(httpServer, {
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
        app_1.default.set('io', io);
        console.log('🔌 Setting up WebSocket handlers...');
        // WebSocket connection handlers
        io.on('connection', (socket) => {
            console.log(`✅ Client connected: ${socket.id}`);
            // Join tenant-specific room for real-time updates
            socket.on('join_tenant', (tenantId) => {
                socket.join(`tenant_${tenantId}`);
                console.log(`📢 Socket ${socket.id} joined tenant_${tenantId}`);
            });
            // Join course-specific room
            socket.on('join_course', (courseId) => {
                socket.join(`course_${courseId}`);
                console.log(`📚 Socket ${socket.id} joined course_${courseId}`);
            });
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`❌ Client disconnected: ${socket.id}`);
            });
        });
        console.log(`⏳ Starting HTTP server on port ${PORT}...`);
        // Start server
        httpServer.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
            console.log(`✅ WebSocket is ready`);
            console.log(`📚 Health check: http://localhost:${PORT}/api/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map