import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/enrollmentPlanController';


const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// Student routes
router.get('/my',                                   ctrl.getMyEnrollments);
router.get('/my-tasks',                             ctrl.getMyTasks);
router.get('/:id/journey',                          ctrl.getJourney);
router.get('/:id/day/:day',                         ctrl.getStudentDayPlan);
router.patch('/:id/complete-item',                  ctrl.markContentComplete);

// Admin routes
router.get('/',                                     ctrl.listAllEnrollments);
router.post('/student',                             ctrl.enrollStudent);
router.post('/batch',                               ctrl.enrollBatch);
router.get('/curriculum/:curriculumId',             ctrl.listEnrollmentsByCurriculum);
router.get('/curriculum/:curriculumId/stats',       ctrl.getCurriculumEnrollmentStats);
router.get('/:id',                                  ctrl.getEnrollment);
router.patch('/:id/status',                         ctrl.updateStatus);
router.put('/:id/settings',                         ctrl.updateSettings);

export default router;
