import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('isActive customRoleId');
    if (!user) {
      console.log('[AUTH] User not found in database');
      return res.status(401).json({ 
        success: false, 
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      console.log('[AUTH] User account is deactivated');
      return res.status(401).json({ 
        success: false, 
        message: 'Your account has been deactivated. Please contact your administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    req.user = { ...decoded, customRoleId: user.customRoleId?.toString() || null };
    next();
  } catch (error) {
    console.log(`[AUTH] Token verification failed: ${error}`);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};