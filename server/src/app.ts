import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';

import apiRoutes from './routes';
import { ApiResponse, AuthenticatedRequest } from './types';

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

// Middleware - PROPER ORDER for Express
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking static assets
}));
app.use(morgan('combined'));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response<ApiResponse<any>>) => {
  res.json({
    success: true,
    message: 'LMS API is running',
    data: { status: 'OK', timestamp: new Date().toISOString() }
  });
});

// Debug auth endpoint
app.post('/api/debug/auth', (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key') as any;
    res.json({
      success: true,
      message: 'Token verified successfully',
      data: { 
        token: token.substring(0, 20) + '...', 
        decoded,
        jwt_secret_set: !!process.env.JWT_SECRET 
      }
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message,
      data: { error: error.message }
    });
  }
});

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
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

export default app;