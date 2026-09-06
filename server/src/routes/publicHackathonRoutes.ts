import express from 'express';
import * as ctrl from '../controllers/publicHackathonController';
import { rateLimit } from '../middleware/rateLimit';

/**
 * The public hackathon funnel — no authentication, by design. Called from codebegun.com.
 *
 * Only the two endpoints that WRITE are rate limited. The listing and the event page are
 * ordinary reads on a marketing site: limiting them would 429 a page that went slightly
 * viral, which is a worse outage than the abuse it guards against.
 */
const router = express.Router();

router.get('/hackathons/registration/:code', ctrl.getRegistration);
router.post('/hackathons/payment/verify', express.json(), rateLimit('hackathonPayment'), ctrl.verifyPayment);

// Listing and event pages. Declared AFTER the literal paths above so `registration` and
// `payment` are never captured as a tenant slug.
router.get('/hackathons/:tenantSlug', ctrl.listHackathons);
router.get('/hackathons/:tenantSlug/:slug', ctrl.getHackathon);
router.post('/hackathons/:tenantSlug/:slug/register', express.json(), rateLimit('hackathonRegister'), ctrl.register);

export default router;
