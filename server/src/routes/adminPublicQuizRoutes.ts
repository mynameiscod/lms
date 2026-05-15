import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/publicQuizController';

const router = express.Router();

// All admin routes require auth
router.use(authMiddleware, tenantMiddleware);

router.get('/available-quizzes', ctrl.getAvailableQuizzesForPublic);
router.get('/', ctrl.listPublicQuizConfigs);
router.post('/', roleGuard(['create_quiz']), ctrl.createPublicQuizConfig);
router.get('/:id', ctrl.getPublicQuizConfig);
router.put('/:id', roleGuard(['create_quiz']), ctrl.updatePublicQuizConfig);
router.delete('/:id', roleGuard(['create_quiz']), ctrl.deletePublicQuizConfig);
router.put('/:id/feature', roleGuard(['create_quiz']), ctrl.setFeaturedQuiz);
router.get('/:id/submissions', ctrl.getPublicQuizSubmissions);
router.post('/:id/submissions/:subId/convert-to-lead', ctrl.convertSubmissionToLead);

export default router;
