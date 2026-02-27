import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import apiRoutes from './routes';
import { ApiResponse, AuthenticatedRequest } from './types';

dotenv.config();

const app: Express = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
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