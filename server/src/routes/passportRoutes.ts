import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/passportController';
import * as assess from '../controllers/passportAssessmentController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

// Admin config + students
router.get('/config',    ctrl.getConfig);
router.put('/config',    ctrl.updateConfig);
router.get('/students',  ctrl.listStudents);
router.post('/convert',  ctrl.convertStudent);

// Student
router.get('/me',        ctrl.getMyStatus);

// Assessment — student
router.get('/assessment',        assess.getAssessment);
router.post('/assessment/submit', assess.submitAssessment);
router.get('/assessment/result', assess.getResult);

// Assessment — admin bank management
router.get('/assessment/admin',  assess.getAssessmentAdmin);
router.put('/assessment/admin',  assess.saveAssessment);
router.post('/assessment/reset', assess.resetAssessment);

export default router;
