"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// CORS configuration - allow localhost for development and production origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    process.env.CLIENT_URL, // Production URL from env (e.g., http://187.124.97.56:5000)
].filter(Boolean);
// In production, frontend and backend are on the same origin, so allow any origin
const corsOptions = process.env.NODE_ENV === 'production'
    ? { origin: true, credentials: true }
    : {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    };
// Middleware - PROPER ORDER for Express
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disable CSP to avoid blocking static assets
}));
app.use((0, morgan_1.default)('combined'));
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'LMS API is running',
        data: { status: 'OK', timestamp: new Date().toISOString() }
    });
});
// Debug auth endpoint
app.post('/api/debug/auth', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                data: { authHeader, hasToken: false }
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret-key');
        res.json({
            success: true,
            message: 'Token verified successfully',
            data: {
                token: token.substring(0, 20) + '...',
                decoded,
                jwt_secret_set: !!process.env.JWT_SECRET
            }
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
            data: { error: error.message }
        });
    }
});
// API Routes - BEFORE static files and catch-all
app.use('/api/v1', routes_1.default);
// Serve static files AFTER API routes
const staticPath = process.env.NODE_ENV === 'production'
    ? '/app/client/build'
    : path_1.default.join(__dirname, '..', 'client', 'build');
app.use(express_1.default.static(staticPath));
console.log(`📁 Serving static files from: ${staticPath}`);
// Serve React index.html for all non-API routes (client-side routing)
const indexPath = process.env.NODE_ENV === 'production'
    ? '/app/client/build/index.html'
    : path_1.default.join(__dirname, '..', 'client', 'build', 'index.html');
app.get('*', (req, res) => {
    res.sendFile(indexPath);
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        error: `${req.method} ${req.path} not found`
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map