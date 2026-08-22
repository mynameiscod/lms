import express from 'express';
import * as ctrl from '../controllers/publicPassportController';
// Public and unauthenticated: counted by address, because there is nothing else to
// count by. Every one of these either creates an account or sends/checks a code.
import { rateLimit } from '../middleware/rateLimit';

// Public (no auth) CareerPilot signup funnel.
const router = express.Router();

router.get('/config',  ctrl.getPublicConfig);
router.get('/card/:slug', ctrl.getCard);
router.post('/signup', rateLimit('signupBurst'), rateLimit('signup'), ctrl.signup);
router.post('/verify', rateLimit('otp'), ctrl.verify);
router.post('/resend', rateLimit('otp'), ctrl.resend);
router.post('/login-password', rateLimit('otp'), ctrl.loginPassword);  // returning member: email/mobile + password
router.post('/login-otp', rateLimit('otp'), ctrl.loginOtpStart);       // returning member: WhatsApp OTP (then /verify)

export default router;
