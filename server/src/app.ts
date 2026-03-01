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

// Middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS configuration - allow multiple localhost ports for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

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
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
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