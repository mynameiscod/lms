import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import apiRoutes from './routes';
import { ApiResponse } from './types';
import { processDueMessages } from './services/whatsAppDripService';
import { apiErrorLogger } from './middleware/errorLogger';
import { logger } from './utils/logger';
import { readiness } from './services/healthService';

dotenv.config();

const app: Express = express();

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
  'https://codebegun.com',
  'https://www.codebegun.com',
  process.env.CLIENT_URL, // Production URL from env (e.g., http://187.124.97.56:5000)
].filter(Boolean);

// In production, frontend and backend are on the same origin, so allow any origin
// In development, be more permissive to avoid CORS issues during testing
const corsOptions = process.env.NODE_ENV === 'production' 
  ? { 
      origin: true, 
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id'],
    }
  : {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        // Also allow any localhost/127.0.0.1 origin in development
        if (!origin) {
          callback(null, true);
        } else if (allowedOrigins.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          console.warn(`[CORS] Blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id'],
    };

/**
 * Who the client actually is, when nginx is in front.
 *
 * Without this, `req.ip` is the address of the reverse proxy for EVERY request, so anything
 * keyed on the caller's address — rate limiting above all — collapses into a single bucket
 * shared by the whole internet. The signup limiter was therefore not "5 attempts per person
 * per hour" in production but "5 attempts for all of humanity per hour", and the first five
 * strangers to register locked the door behind them until the window rolled.
 *
 * The hop count is deliberate rather than `true`. Trusting every proxy header lets a caller
 * put whatever they like in X-Forwarded-For and mint a fresh identity per request, which
 * would defeat the limiter from the other direction. One hop is what this deployment has:
 * nginx, then the app. TRUST_PROXY_HOPS exists for the day that stops being true.
 */
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

// Middleware - PROPER ORDER for Express
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking static assets
}));
app.use(morgan('combined'));
app.use(cors(corsOptions));
app.use(apiErrorLogger); // log all 4xx/5xx responses to file + stdout
// Stash the raw body so signature-verified webhooks (e.g. Razorpay) can HMAC the
// exact bytes Razorpay signed, while routes still receive parsed JSON in req.body.
app.use(express.json({ limit: '10mb', verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Health.
 *
 * `/api/health/live` — is this process running. Nothing else, deliberately: if a restart
 * cannot fix it, it does not belong here, and a liveness probe that consults the database
 * turns a transient blip into a restart loop that guarantees the outage.
 *
 * `/api/health/ready` — should traffic come here. 503 when a REQUIRED dependency is down,
 * so blue/green stops promoting an instance that cannot reach MongoDB. Optional
 * dependencies (Redis, AI provider, payments) are reported and never gate the verdict —
 * an absent AI key means one feature says "temporarily unavailable", not that a student's
 * roadmap should stop loading.
 *
 * `/api/health` — the original path, kept because deploy scripts and uptime checks point
 * at it. It now answers the readiness question rather than returning a literal OK, which
 * is what it was always assumed to mean.
 */
app.get('/api/health/live', (_req: Request, res: Response<ApiResponse<any>>) => {
  res.json({ success: true, message: 'alive', data: { status: 'OK', at: new Date().toISOString() } });
});

app.get(['/api/health', '/api/health/ready'], (_req: Request, res: Response<ApiResponse<any>>) => {
  const report = readiness();
  res.status(report.ready ? 200 : 503).json({
    success: report.ready,
    message: report.ready ? 'ready' : 'not ready',
    data: report,
  });
});

/**
 * REMOVED: POST /api/debug/auth.
 *
 * It was public, unauthenticated, and answered two questions an attacker wants: the full
 * decoded contents of any token handed to it, and — via `jwt_secret_set` — whether the
 * server was running on the published fallback signing key. The second turned a
 * code-reading exercise into a yes/no probe against a live host.
 *
 * Nothing in the product called it. securityHardening.test.ts asserts it stays gone.
 */

// API Routes - BEFORE static files and catch-all
app.use('/api/v1', apiRoutes);

// Serve uploaded files (profile photos, resumes, etc.)
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log(`📁 Serving uploaded files from: ${uploadsPath}`);

// Serve static files AFTER API routes
const staticPath = process.env.NODE_ENV === 'production' 
  ? '/app/client/build'
  : path.join(__dirname, '..', 'client', 'build');

// Never cache the SPA shell or the service-worker script: index.html points at
// hashed bundles, and sw.js must be re-fetched so the tombstone SW can replace
// any stale one. (Hashed /static/* assets remain long-cacheable — they're
// content-addressed.) Prevents devices getting pinned to an old build.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/sw.js' || req.path === '/index.html' || req.path === '/') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

app.use(express.static(staticPath));
console.log(`📁 Serving static files from: ${staticPath}`);

// Certificate OG meta tags for LinkedIn/social media crawlers
app.get('/certificate/:type/:token', async (req: Request, res: Response) => {
  const { type, token } = req.params;
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = /linkedinbot|facebookexternalhit|twitterbot|slackbot|whatsapp|telegram|discord|googlebot|bingbot/i.test(ua);
  
  if (!isBot) {
    return res.sendFile(indexPath);
  }
  
  try {
    let title = 'Certificate of Completion';
    let description = 'View this achievement on Codebegun LMS';
    let studentName = 'Student';
    let score = '';
    let percentage = 0;
    let isPassing = false;
    const siteUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const certUrl = `${siteUrl}/certificate/${type}/${token}`;

    if (type === 'assignment') {
      const Submission = require('./models/Submission').default;
      const sub = await Submission.findOne({ shareToken: token })
        .populate('assignment', 'title totalPoints')
        .populate('student', 'firstName lastName');
      if (sub) {
        const asn = sub.assignment as any;
        const stu = sub.student as any;
        studentName = stu ? `${stu.firstName} ${stu.lastName}`.trim() : 'Student';
        title = `${studentName} completed "${asn?.title || 'Assignment'}"`;
        percentage = sub.percentage ?? 0;
        isPassing = sub.isPassing ?? false;
        score = `${sub.finalScore ?? 0}/${asn?.totalPoints ?? 0}`;
        description = `Score: ${score} (${percentage}%) • ${isPassing ? '✅ Passed' : '❌ Not Passed'} • Codebegun LMS`;
      }
    } else if (type === 'quiz') {
      const QuizAttempt = require('./models/QuizAttempt').default;
      const Quiz = require('./models/Quiz').default;
      const User = require('./models/User').default;
      const attempt = await QuizAttempt.findOne({ shareToken: token });
      if (attempt) {
        const [quiz, stu] = await Promise.all([
          Quiz.findById(attempt.quizId).select('title'),
          User.findById(attempt.studentId).select('firstName lastName')
        ]);
        studentName = stu ? `${stu.firstName} ${stu.lastName}`.trim() : 'Student';
        title = `${studentName} completed "${(quiz as any)?.title || 'Quiz'}"`;
        percentage = attempt.percentage ?? 0;
        score = `${attempt.obtainedMarks ?? 0}/${attempt.totalMarks ?? 0}`;
        description = `Score: ${score} (${percentage}%) • ${attempt.passed ? '✅ Passed' : '❌ Not Passed'} • Codebegun LMS`;
      }
    }

    // Escape HTML special characters to prevent XSS
    const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const ogHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escHtml(title)} | Codebegun</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:url" content="${escHtml(certUrl)}">
  <meta property="og:site_name" content="Codebegun LMS">
  <meta property="og:image" content="${siteUrl}/api/v1/share/og-image/${encodeURIComponent(type)}/${encodeURIComponent(token)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${siteUrl}/api/v1/share/og-image/${encodeURIComponent(type)}/${encodeURIComponent(token)}">
</head>
<body>
  <p>Redirecting...</p>
  <script>window.location.href="${escHtml(certUrl)}";</script>
</body>
</html>`;
    res.type('html').send(ogHtml);
  } catch {
    res.sendFile(indexPath);
  }
});

// Serve React index.html for all non-API routes (client-side routing)
const indexPath = process.env.NODE_ENV === 'production'
  ? '/app/client/build/index.html'
  : path.join(__dirname, '..', 'client', 'build', 'index.html');

app.get('*', (req: Request, res: Response) => {
  // SPA shell for client-side routes — never cache (points at hashed bundles).
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(indexPath);
});

// 404 handler
app.use((req: Request, res: Response<ApiResponse<any>>) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: `${req.method} ${req.path} not found`
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response<ApiResponse<any>>, next: NextFunction) => {
  logger.error(`Unhandled exception: ${req.method} ${req.originalUrl}`, {
    error: err.message,
    stack: err.stack?.split('\n').slice(0, 5),
    ip: req.ip,
  });
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// P5: WhatsApp drip sequence runner — every 60 minutes
setInterval(() => {
  processDueMessages().catch(err => console.error('[DRIP-INTERVAL]', err));
}, 60 * 60 * 1000);

export default app;