import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export const tenantMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Extract tenant ID from request (e.g., from headers, JWT, or params)
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }
  
  // Attach tenant ID to request object
  (req as any).tenantId = tenantId;
  
  // Attach user ID from authenticated user
  if (req.user && req.user.id) {
    (req as any).userId = req.user.id;
  }
  
  next();
};