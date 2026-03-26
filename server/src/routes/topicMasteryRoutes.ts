import express from 'express';
import { getHeatmap, getStudentMastery, getMyMastery, getTopicMastery, getSubjectsForFilter } from '../controllers/topicMasteryController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// Admin routes
router.get('/heatmap',           authMiddleware, tenantResolver, getHeatmap);
router.get('/subjects',          authMiddleware, tenantResolver, getSubjectsForFilter);
router.get('/student/:studentId',authMiddleware, tenantResolver, getStudentMastery);
router.get('/topic/:topicId',    authMiddleware, tenantResolver, getTopicMastery);

// Student routes
router.get('/my', authMiddleware, tenantResolver, getMyMastery);

export default router;
