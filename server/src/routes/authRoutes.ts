import express from 'express';
import { register, login, registerOrganization, forgotPassword, resetPassword, refreshToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/register-organization', registerOrganization);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', authMiddleware, refreshToken);

export default router;