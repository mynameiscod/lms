import { Request, Response, NextFunction } from 'express';

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract tenant ID from request (e.g., from headers, JWT, or params)
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }
  
  // Attach tenant ID to request object
  (req as any).tenantId = tenantId;
  
  next();
};