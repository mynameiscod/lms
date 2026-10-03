import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/placementProgramController';

/** Public: the ad landing form. Mounted at /public/placement-program, before the generic /public. */
export const publicPlacementProgramRoutes = Router();
publicPlacementProgramRoutes.post('/register', rateLimit('signupBurst'), rateLimit('placementRegister'), ctrl.publicRegister);
// The candidate's own page, reached by the secret link: fee, slots, booking.
publicPlacementProgramRoutes.get('/portal/:token', ctrl.portalView);
publicPlacementProgramRoutes.get('/portal/:token/slots', ctrl.portalSlots);
publicPlacementProgramRoutes.post('/portal/:token/order', rateLimit('hackathonPayment'), ctrl.portalOrder);
publicPlacementProgramRoutes.post('/portal/:token/verify', rateLimit('hackathonPayment'), ctrl.portalVerify);
publicPlacementProgramRoutes.post('/portal/:token/book', rateLimit('hackathonPayment'), ctrl.portalBook);
publicPlacementProgramRoutes.post('/portal/:token/cancel', rateLimit('hackathonPayment'), ctrl.portalCancel);

/** Admin: the candidate pipeline. Same permission as Placement Drives. */
const router = Router();
router.use(authMiddleware, tenantMiddleware);
// An interviewer's own list needs only a login; everything below needs placement-admin rights.
router.get('/bookings/mine', ctrl.myBookings);
router.post('/bookings/:bookingId/outcome', ctrl.bookingOutcome);
router.get('/scorecard-criteria', ctrl.scorecardCriteria);
router.use(roleGuard(['manage_placement', 'manage_tenant']));
router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.saveConfig);
router.get('/interviewers', ctrl.listInterviewers);
router.post('/interviewers', ctrl.createInterviewer);
router.put('/interviewers/:ivId', ctrl.updateInterviewer);
router.delete('/interviewers/:ivId', ctrl.deleteInterviewer);
router.get('/bookings', ctrl.listBookings);
router.get('/board', ctrl.board);
router.post('/bookings/:bookingId/cancel', ctrl.cancelBooking);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.put('/:id/stage', ctrl.setStage);
router.post('/:id/notes', ctrl.addNote);
router.put('/:id/waive', ctrl.waive);
router.post('/:id/refund', ctrl.refund);
router.post('/:id/portal-link', ctrl.portalLink);
export default router;
