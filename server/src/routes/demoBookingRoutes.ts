import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/demoBookingController';

/**
 * CRM: Book a demo.
 * /demo-slots   — admin (manage_demo_slots); the module gate refuses it while the switch is off.
 * /public/demo  — the website's booking page and each visitor's booking link (no login). The service
 *                 refuses an institute whose switch is off.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_demo_slots']));

router.get('/', ctrl.listSlots);
router.post('/', ctrl.createSlots);
router.get('/hosts', ctrl.hosts);
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.saveSettings);
router.get('/report', ctrl.report);
router.post('/bookings/:bookingId/attendance', ctrl.markAttendance);
router.get('/:id/attendees', ctrl.attendees);
router.put('/:id', ctrl.updateSlot);
router.post('/:id/cancel', ctrl.cancelSlot);
router.delete('/:id', ctrl.deleteSlot);

export const publicDemoRoutes = express.Router();
publicDemoRoutes.get('/booking/:token', rateLimit('liveJoin'), ctrl.publicBooking);
publicDemoRoutes.get('/booking/:token/slots', rateLimit('liveJoin'), ctrl.publicBookingSlots);
publicDemoRoutes.get('/booking/:token/calendar.ics', rateLimit('liveJoin'), ctrl.publicIcs);
publicDemoRoutes.post('/booking/:token/join', rateLimit('liveJoin'), ctrl.publicJoin);
publicDemoRoutes.post('/booking/:token/cancel', rateLimit('websiteIp'), ctrl.publicCancel);
publicDemoRoutes.post('/booking/:token/reschedule', rateLimit('websiteIp'), ctrl.publicReschedule);
publicDemoRoutes.get('/:tenantSlug/slots', rateLimit('liveJoin'), ctrl.publicCatalog);
publicDemoRoutes.post('/:tenantSlug/book', rateLimit('websiteIp'), ctrl.publicBook);

export default router;
