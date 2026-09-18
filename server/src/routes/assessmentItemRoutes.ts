import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/assessmentItemController';

// Admin question-bank management for the skill assessment.
const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', ctrl.listAssessmentItems);
router.get('/coverage', ctrl.getAssessmentCoverage);
/** What the bank holds, by tag and type — what the exam setup screen picks from. */
router.get('/tags', ctrl.getAssessmentTags);
router.post('/generate', ctrl.generateAssessmentItems);
/** Prove a reference solution passes the cases BEFORE the question reaches a candidate. */
router.post('/validate', ctrl.validateAssessmentItem);
/** Tag many at once — how a set of questions becomes one exam's pool. */
router.post('/bulk-tag', ctrl.bulkTagAssessmentItems);
router.post('/', ctrl.createAssessmentItem);
router.put('/:id', ctrl.updateAssessmentItem);
router.patch('/:id/toggle', ctrl.toggleAssessmentItem);
router.delete('/:id', ctrl.deleteAssessmentItem);

export default router;
