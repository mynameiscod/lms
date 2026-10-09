import express from 'express';
import { register, login, registerOrganization, forgotPassword, resetPassword, refreshToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
// Creating an institute is a SaaS-admin action (it used to be open to anyone on the internet).
const superAdminOnly = (req: any, res: any, next: any) =>
  req.user?.role === 'SUPER_ADMIN' ? next() : res.status(403).json({ success: false, message: 'Only the platform administrator can create an institute.' });
router.post('/register-organization', authMiddleware, superAdminOnly, registerOrganization);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', authMiddleware, refreshToken);

export default router;