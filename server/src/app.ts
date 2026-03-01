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

// Serve static files FIRST - before security headers interfere
const staticPath = process.env.NODE_ENV === 'production' 
  ? '/app/client/build'
  : path.join(__dirname, '..', 'client', 'build');

app.use(express.static(staticPath));
console.log(`📁 Serving static files from: ${staticPath}`);

// Middleware - Helmet with relaxed settings for static files
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking static assets
}));
app.use(morgan('combined'));

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
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    };

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

// API Routes
app.use('/api/v1', apiRoutes);

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