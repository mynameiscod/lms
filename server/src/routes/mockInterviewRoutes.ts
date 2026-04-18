import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mockInterviewController } from '../controllers/mockInterviewController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

// Multer config for per-answer interview recordings
const mockRecordingsDir = path.join(__dirname, '../../uploads/interview-recordings');
if (!fs.existsSync(mockRecordingsDir)) {
  fs.mkdirSync(mockRecordingsDir, { recursive: true });
}
const mockRecordingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mockRecordingsDir),
  filename: (_req, file, cb) => cb(null, `mock-${Date.now()}${path.extname(file.originalname) || '.webm'}`)
});
const uploadMockRecording = multer({
  storage: mockRecordingStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio/video files are allowed'));
    }
  }
});

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantResolver);

// Get available interview categories (public route for authenticated users)
router.get('/categories', mockInterviewController.getCategories);

// Student routes
router.post('/', mockInterviewController.createInterview);
router.get('/my-interviews', mockInterviewController.getMyInterviews);
router.get('/my-stats', mockInterviewController.getMyStats);
router.get('/my-assigned', mockInterviewController.getMyAssignedInterviews);
router.get('/leaderboard/:batchId', mockInterviewController.getBatchLeaderboard);

// ==================== ADMIN ASSIGNMENT ROUTES ====================
// Assign to single student
router.post(
  '/assign/student',
  roleGuard(['create_courses']),
  mockInterviewController.assignToStudent
);

// Assign to batch of students
router.post(
  '/assign/batch',
  roleGuard(['create_courses']),
  mockInterviewController.assignToBatch
);

// Get all assigned interviews (admin)
router.get(
  '/assigned',
  roleGuard(['create_courses']),
  mockInterviewController.getAssignedInterviews
);

// Get assignment statistics
router.get(
  '/assignment-stats',
  roleGuard(['create_courses']),
  mockInterviewController.getAssignmentStats
);

// Get interviews with recordings (admin)
router.get(
  '/recordings',
  roleGuard(['create_courses']),
  mockInterviewController.getInterviewsWithRecordings
);

// Interview session routes
router.get('/:interviewId', mockInterviewController.getInterview);
router.post('/:interviewId/start', mockInterviewController.startInterview);
router.post('/:interviewId/answer', mockInterviewController.submitAnswer);
router.post('/:interviewId/complete', mockInterviewController.completeInterview);
router.post('/:interviewId/cancel', mockInterviewController.cancelInterview);
router.post('/:interviewId/recording', mockInterviewController.saveRecording);
router.post(
  '/:interviewId/upload-answer',
  uploadMockRecording.single('recording'),
  mockInterviewController.uploadAnswerRecording
);

export default router;
