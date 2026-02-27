import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(`[AUTH] Path: ${req.method} ${req.path}, Authorization: ${authHeader ? 'Present' : 'Missing'}`);
    
    const token = authHeader?.split(' ')[1];

    if (!token) {
      console.log('[AUTH] No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key') as any;
    console.log(`[AUTH] Token valid for user: ${decoded.id}`);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(`[AUTH] Token verification failed: ${error}`);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};