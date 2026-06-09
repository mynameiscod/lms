import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/assessmentItemController';

// Admin question-bank management for the skill assessment.
const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', ctrl.listAssessmentItems);
router.get('/coverage', ctrl.getAssessmentCoverage);
router.post('/generate', ctrl.generateAssessmentItems);
router.post('/', ctrl.createAssessmentItem);
router.put('/:id', ctrl.updateAssessmentItem);
router.patch('/:id/toggle', ctrl.toggleAssessmentItem);
router.delete('/:id', ctrl.deleteAssessmentItem);

export default router;
