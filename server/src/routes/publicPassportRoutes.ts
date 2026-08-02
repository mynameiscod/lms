import express from 'express';
import * as ctrl from '../controllers/publicPassportController';

// Public (no auth) CareerPilot signup funnel.
const router = express.Router();

router.get('/config',  ctrl.getPublicConfig);
router.get('/card/:slug', ctrl.getCard);
router.post('/signup', ctrl.signup);
router.post('/verify', ctrl.verify);
router.post('/resend', ctrl.resend);
router.post('/login-password', ctrl.loginPassword);  // returning member: email/mobile + password
router.post('/login-otp', ctrl.loginOtpStart);       // returning member: WhatsApp OTP (then /verify)

export default router;
