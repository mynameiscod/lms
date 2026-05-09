import express from 'express';
import * as ctrl from '../controllers/publicQuizController';

const router = express.Router();

// ─── PUBLIC routes (no auth required) ───────────────────────────────────────
router.get('/certificate/:shareToken', ctrl.getPublicCertificate);
router.get('/session/:submissionId/questions', ctrl.getPublicQuizQuestions);
router.get('/session/:submissionId/results', ctrl.getPublicQuizResults);
router.post('/session/:submissionId/submit', ctrl.submitPublicQuiz);
router.get('/:slug', ctrl.getPublicQuizPage);
router.post('/:slug/register', ctrl.registerForPublicQuiz);

export default router;
