import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/projectController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/recommend', ctrl.getRecommendations);
router.get('/', ctrl.listProjects);
router.post('/', ctrl.createProject);
router.get('/:id', ctrl.getProject);
router.patch('/:id/task', ctrl.toggleTask);
router.patch('/:id', ctrl.updateProject);
router.delete('/:id', ctrl.deleteProject);

export default router;
