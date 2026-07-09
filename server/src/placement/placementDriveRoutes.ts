import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from './placementDriveController';
import * as certCtrl from './certificateController';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/stats',             ctrl.getStats);
router.get('/snapshot',          ctrl.getSnapshot);
router.get('/analytics',         ctrl.getAnalytics);
router.get('/overview',          ctrl.overview);
router.get('/my-applications',   ctrl.getMyApplications);
router.get('/',              ctrl.list);
router.get('/:id',           ctrl.getOne);
router.post('/',             ctrl.create);
router.put('/:id',           ctrl.update);
router.delete('/:id',        ctrl.remove);
router.post('/:id/apply',    ctrl.apply);
router.post('/:id/withdraw', ctrl.withdraw);
// Applicant status
router.get('/:id/applicants',                              ctrl.listApplicants);
router.post('/:id/applicants/bulk-status',                 ctrl.bulkStatusImport);
router.patch('/:id/applicants/:userId/status',             ctrl.setApplicantStatus);
// Interview rounds
router.post('/:id/rounds',                                 ctrl.addRound);
router.put('/:id/rounds/:roundIndex',                      ctrl.updateRound);
router.delete('/:id/rounds/:roundIndex',                   ctrl.removeRound);
// Certificate
router.get('/:driveId/certificate/:userId',                certCtrl.downloadCertificate);

export default router;
