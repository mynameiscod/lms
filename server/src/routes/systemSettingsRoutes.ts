import express, { Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { getSettings, updateSettings, testProvider, sendTestEmail, listTenantsForSettings } from '../controllers/systemSettingsController';

const router = express.Router();

// Platform-wide configuration is SUPER_ADMIN only.
const superAdminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  next();
};

router.use(authMiddleware, superAdminOnly);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/tenants', listTenantsForSettings);
router.post('/test-email', sendTestEmail);
router.post('/test/:provider', testProvider);

export default router;
