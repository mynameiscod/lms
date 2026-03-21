import express from 'express';
import codeSnippetController from '../controllers/codeSnippetController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// ── Student routes (no roleGuard — STUDENT role handled by auth) ──
router.get('/student/list', codeSnippetController.getStudentAssessments);
router.get('/:id/my-submission', codeSnippetController.getMySubmission);
router.post('/:id/submit', codeSnippetController.submit);

// ── Instructor grading ──
router.get('/:id/submissions', roleGuard(['manage_snippets', 'grade_snippets']), codeSnippetController.getSubmissions);
router.post('/submissions/:submissionId/grade', roleGuard(['manage_snippets', 'grade_snippets']), codeSnippetController.grade);

// ── Admin CRUD ──
router.get('/', roleGuard(['manage_snippets']), codeSnippetController.list);
router.post('/', roleGuard(['manage_snippets']), codeSnippetController.create);
router.get('/:id', codeSnippetController.getById);
router.put('/:id', roleGuard(['manage_snippets']), codeSnippetController.update);
router.delete('/:id', roleGuard(['manage_snippets']), codeSnippetController.delete);
router.post('/:id/publish', roleGuard(['manage_snippets']), codeSnippetController.publish);

export default router;
