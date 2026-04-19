import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import classRecordingController from '../controllers/classRecordingController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/class-recordings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for video uploads (up to 500MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `class-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['video/webm', 'video/mp4', 'video/x-matroska', 'video/ogg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (webm, mp4, mkv, ogg) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

router.use(authMiddleware);
router.use(tenantMiddleware);

// ==================== STUDENT ROUTES ====================
router.get('/student/list', classRecordingController.listForStudents);

// ==================== INSTRUCTOR / ADMIN ROUTES ====================
router.post(
  '/upload',
  roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']),
  upload.single('video'),
  classRecordingController.upload
);

router.get('/', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), classRecordingController.list);
router.get('/:id', classRecordingController.getById);
router.get('/:id/status', classRecordingController.getStatus);
router.put('/:id', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), classRecordingController.update);
router.delete('/:id', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), classRecordingController.delete);
router.post('/:id/publish', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), classRecordingController.togglePublish);
router.post('/:id/reprocess', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), classRecordingController.reprocess);
router.post('/:id/save-quiz', roleGuard(['create_quiz', 'edit_quiz']), classRecordingController.saveQuiz);
router.post('/:id/save-assignment', roleGuard(['manage_assignments']), classRecordingController.saveAssignment);

export default router;
