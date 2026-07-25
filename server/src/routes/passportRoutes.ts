import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/passportController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

// Admin config + students
router.get('/config',    ctrl.getConfig);
router.put('/config',    ctrl.updateConfig);
router.get('/students',  ctrl.listStudents);
router.post('/convert',  ctrl.convertStudent);

// Student
router.get('/me',        ctrl.getMyStatus);

export default router;
