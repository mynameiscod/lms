import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import classRecordingController from '../controllers/classRecordingController';
import ClassRecording from '../models/ClassRecording';
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
  // Accept any video/* MIME type (covers webm, mp4, mov, avi, mkv and codec variants)
  if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
    cb(null, true);
  } else {
    cb(null, false); // soft-reject: lets controller return the 400 with a clear message
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// ==================== STREAM ROUTE (before auth — uses query token) ====================
// Browser <video> elements cannot set Authorization headers, so token is passed as query param
router.get('/:id/stream', (req, res) => {
  const token = req.query.token as string;
  const tenantId = req.query.tenantId as string;
  if (!token || !tenantId) {
    return res.status(401).json({ message: 'Token and tenantId required' });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  ClassRecording.findOne({ _id: req.params.id, tenantId })
    .then(recording => {
      if (!recording || !recording.videoUrl) {
        return res.status(404).json({ message: 'Recording not found' });
      }
      const filePath: string = recording.videoUrl as string;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Video file not found on disk' });
      }
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const mimeType = (recording as any).mimeType || 'video/webm';
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    })
    .catch(() => res.status(500).json({ message: 'Server error' }));
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
