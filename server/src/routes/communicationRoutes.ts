import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/communicationController';

const router = express.Router();
const tmpDir = path.join(process.cwd(), 'uploads', 'communication-tmp');
try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname) || '.webm'}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB per recording
});
const ADMIN = roleGuard(['manage_communication_lab', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

router.use(authMiddleware, tenantMiddleware);

// Admin — challenge management (declared before /:id student routes)
router.get('/admin/challenges', ADMIN, ctrl.listChallenges);
router.post('/admin/challenges', ADMIN, ctrl.createChallenge);
router.patch('/admin/challenges/:id', ADMIN, ctrl.updateChallenge);
router.delete('/admin/challenges/:id', ADMIN, ctrl.deleteChallenge);

// Student
router.get('/today', ctrl.getToday);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.post('/submit', upload.single('recording'), ctrl.submit);
router.get('/history', ctrl.getHistory);
router.get('/progress', ctrl.getProgress);
router.get('/attempts/:id', ctrl.getAttempt);
router.get('/play/:id', ctrl.playRecording);

export default router;
