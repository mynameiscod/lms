import express from 'express';
import assignmentController from '../controllers/assignmentController';
import submissionController from '../controllers/submissionController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// ==================== STUDENT ROUTES (must be before :id routes) ====================

// Get assignments for students
router.get('/student/list', assignmentController.getStudentAssignments);
router.get('/student/submissions', submissionController.getStudentSubmissions);

// ==================== ADMIN/INSTRUCTOR ROUTES ====================

// Template download and import
router.get('/template/download', roleGuard(['manage_assignments']), assignmentController.downloadTemplate);
router.post('/import', roleGuard(['manage_assignments']), assignmentController.importFromCSV);

// Reports routes (must be before :id routes)
router.get('/reports/overall', roleGuard(['manage_assignments']), assignmentController.getOverallReports);
router.get('/reports/by-assignment', roleGuard(['manage_assignments']), assignmentController.getReportsByAssignment);
router.get('/reports/by-student', roleGuard(['manage_assignments']), assignmentController.getReportsByStudent);

// Assignment CRUD
router.post('/', roleGuard(['manage_assignments']), assignmentController.create);
router.get('/', roleGuard(['manage_assignments']), assignmentController.list);
router.get('/bank', roleGuard(['manage_assignments']), assignmentController.getBankAssignments);
router.get('/topics', roleGuard(['manage_assignments']), assignmentController.getTopics);
router.get('/tags', roleGuard(['manage_assignments']), assignmentController.getTags);
router.get('/:id', assignmentController.getById);
router.put('/:id', roleGuard(['manage_assignments']), assignmentController.update);
router.delete('/:id', roleGuard(['manage_assignments']), assignmentController.delete);

// Assignment actions
router.post('/:id/publish', roleGuard(['manage_assignments']), assignmentController.publish);
router.post('/:id/archive', roleGuard(['manage_assignments']), assignmentController.archive);
router.post('/:id/clone', roleGuard(['manage_assignments']), assignmentController.clone);

// Submission management (for instructors)
router.get('/:assignmentId/submissions', roleGuard(['grade_submissions']), submissionController.getAssignmentSubmissions);
router.get('/:assignmentId/stats', roleGuard(['grade_submissions']), submissionController.getStats);
router.post('/submissions/:submissionId/grade', roleGuard(['grade_submissions']), submissionController.grade);
router.post('/submissions/:submissionId/allow-reattempt', roleGuard(['grade_submissions']), submissionController.allowReattempt);

// ==================== STUDENT SUBMISSION WORKFLOW ====================

// Submission workflow
router.post('/:assignmentId/start', submissionController.start);
router.get('/:assignmentId/my-submission', submissionController.getMySubmission);
router.post('/submissions/:submissionId/save-code', submissionController.saveCode);
router.post('/submissions/:submissionId/run', submissionController.runCode);
router.post('/submissions/:submissionId/submit-coding', submissionController.submitCoding);
router.post('/submissions/:submissionId/submit-mcq', submissionController.submitMCQ);
router.post('/submissions/:submissionId/submit-theory', submissionController.submitTheory);
router.get('/submissions/:submissionId', submissionController.getSubmission);

export default router;
