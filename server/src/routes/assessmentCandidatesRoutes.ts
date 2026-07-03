import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/assessmentCandidatesController';

// Team dashboard for assessment candidates (progress, readiness, unlock).
const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', ctrl.listAssessmentCandidates);
router.get('/stats', ctrl.getCandidateStats);
router.get('/:id/journey', ctrl.getCandidateJourney);
router.post('/unlock', ctrl.unlockCandidate);

export default router;
