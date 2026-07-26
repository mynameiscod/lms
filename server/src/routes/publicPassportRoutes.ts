import express from 'express';
import * as ctrl from '../controllers/publicPassportController';

// Public (no auth) Career Passport signup funnel.
const router = express.Router();

router.get('/config',  ctrl.getPublicConfig);
router.post('/signup', ctrl.signup);
router.post('/verify', ctrl.verify);
router.post('/resend', ctrl.resend);

export default router;
