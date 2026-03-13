import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export const tenantResolver = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;

  if (!tenantId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Tenant ID not provided' 
    });
  }

  req.tenantId = tenantId;
  req.userId = req.user?.id;
  next();
};