import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/assessmentCandidatesController';
import { roleGuard } from '../middleware/roleGuard';

// Team dashboard for assessment candidates (progress, readiness, unlock).
const router = express.Router();

router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_skill_assessment', 'create_quiz', 'edit_quiz', 'manage_leads', 'manage_tenant']));

router.get('/', ctrl.listAssessmentCandidates);
router.get('/stats', ctrl.getCandidateStats);
router.get('/:id/journey', ctrl.getCandidateJourney);
router.post('/unlock', ctrl.unlockCandidate);

export default router;
