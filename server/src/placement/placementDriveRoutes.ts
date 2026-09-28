import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from './placementDriveController';
import * as certCtrl from './certificateController';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

// Managing drives and applicants is staff-only. These routes used to be open to any signed-in
// user, so a student could create or delete a drive or change who was placed.
const manage = roleGuard(['manage_placement', 'manage_tenant']);
const setStatus = roleGuard(['manage_placement', 'manage_placement_status', 'manage_tenant']);

router.get('/stats',             manage, ctrl.getStats);
router.get('/snapshot',          manage, ctrl.getSnapshot);
router.get('/analytics',         manage, ctrl.getAnalytics);
router.get('/overview',          manage, ctrl.overview);
router.get('/my-applications',   ctrl.getMyApplications);
router.get('/',              ctrl.list);
router.get('/:id',           manage, ctrl.getOne);
router.post('/',             manage, ctrl.create);
router.put('/:id',           manage, ctrl.update);
router.delete('/:id',        manage, ctrl.remove);
router.post('/:id/apply',    ctrl.apply);
router.post('/:id/withdraw', ctrl.withdraw);
// Applicant status
router.get('/:id/applicants',                              setStatus, ctrl.listApplicants);
router.post('/:id/applicants/bulk-status',                 setStatus, ctrl.bulkStatusImport);
router.patch('/:id/applicants/:userId/status',             setStatus, ctrl.setApplicantStatus);
// Interview rounds
router.post('/:id/rounds',                                 manage, ctrl.addRound);
router.put('/:id/rounds/:roundIndex',                      manage, ctrl.updateRound);
router.delete('/:id/rounds/:roundIndex',                   manage, ctrl.removeRound);
// Certificate
router.get('/:driveId/certificate/:userId',                certCtrl.downloadCertificate);

export default router;
