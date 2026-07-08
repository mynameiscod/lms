import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/speakingController';

const router = express.Router();
const tmpDir = path.join(process.cwd(), 'uploads', 'speaking-tmp');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname) || '.webm'}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB per recording
});
const ADMIN = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

router.use(authMiddleware, tenantMiddleware);

// Admin (before /:id student routes)
router.get('/admin/tasks', ADMIN, ctrl.listTasks);
router.post('/admin/tasks', ADMIN, ctrl.createTask);
router.get('/admin/submissions', ADMIN, ctrl.listSubmissions);
router.get('/admin/compliance', ADMIN, ctrl.compliance);
router.patch('/admin/tasks/:id', ADMIN, ctrl.updateTask);
router.delete('/admin/tasks/:id', ADMIN, ctrl.deleteTask);

// Student
router.get('/my-tasks', ctrl.myTasks);
router.get('/my-submissions', ctrl.mySubmissions);
router.get('/leaderboard', ctrl.leaderboard);
router.post('/submit', upload.single('recording'), ctrl.submit);
router.get('/play/:id', ctrl.playRecording);

export default router;
