import express from 'express';
import * as ctrl from '../controllers/publicPassportController';
import * as activity from '../controllers/careerPilotActivityController';
// Public and unauthenticated: counted by address, because there is nothing else to
// count by. Every one of these either creates an account or sends/checks a code.
import { rateLimit } from '../middleware/rateLimit';

// Public (no auth) CareerPilot signup funnel.
const router = express.Router();

// The activity beacon. Public because the journey worth seeing starts before anybody has an
// account — a college opening the URL, reading a page and leaving is exactly the row an admin
// wants, and it has no session to authenticate with. Counted per visitor, not per address, so a
// college behind one router cannot throttle its own trail. Always answers 204.
router.post('/activity', rateLimit('activityBeacon'), activity.ingest);

router.get('/config',  ctrl.getPublicConfig);
router.get('/card/:slug', ctrl.getCard);
router.post('/signup', rateLimit('signupBurst'), rateLimit('signup'), ctrl.signup);
router.post('/verify', rateLimit('otp'), ctrl.verify);
router.post('/resend', rateLimit('otp'), ctrl.resend);
router.post('/login-password', rateLimit('otp'), ctrl.loginPassword);  // returning member: email/mobile + password
router.post('/login-otp', rateLimit('otp'), ctrl.loginOtpStart);       // returning member: WhatsApp OTP (then /verify)

export default router;
