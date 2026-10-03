import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/placementProgramController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/** Cheque uploads land in a temp folder, then the service moves them into the private folder. */
const chequeTmp = path.join(process.cwd(), 'uploads', '.private', 'tmp');
try { fs.mkdirSync(chequeTmp, { recursive: true }); } catch { /* exists */ }
const chequeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, chequeTmp),
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
    if (!ok) (req as any).chequeRejectedType = true; // so the reply says "wrong type", not "no file"
    cb(null, ok);
  },
});

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
publicPlacementProgramRoutes.post('/portal/:token/agreement/otp', rateLimit('otp'), ctrl.portalAgreementOtp);
publicPlacementProgramRoutes.post('/portal/:token/agreement/sign', rateLimit('hackathonPayment'), ctrl.portalSign);
publicPlacementProgramRoutes.get('/portal/:token/agreement.pdf', ctrl.portalAgreementPdf);
publicPlacementProgramRoutes.post('/portal/:token/cheque', rateLimit('hackathonPayment'), chequeUpload.single('file'), ctrl.portalCheque);

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
router.get('/agreement/preview', ctrl.agreementPreview);
router.post('/push', ctrl.pushStudents);
router.post('/broadcast', ctrl.stageBroadcast);
router.get('/conversions/status', ctrl.conversionsStatus);
router.get('/conversions/google.csv', ctrl.googleCsv);
router.post('/bookings/:bookingId/cancel', ctrl.cancelBooking);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.put('/:id/stage', ctrl.setStage);
router.post('/:id/notes', ctrl.addNote);
router.put('/:id/waive', ctrl.waive);
router.post('/:id/refund', ctrl.refund);
router.post('/:id/portal-link', ctrl.portalLink);
router.post('/:id/agreement/send', ctrl.sendAgreement);
router.get('/:id/agreement.pdf', ctrl.agreementPdf);
router.put('/:id/cheque', ctrl.chequeStatus);
router.get('/:id/cheque/file', ctrl.chequeFile);
export default router;
