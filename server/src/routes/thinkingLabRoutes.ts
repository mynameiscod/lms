import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/thinkingLabController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

// Voice "Explain to AI" upload (audio/video, transcribed then discarded).
const tmpDir = path.join(process.cwd(), 'uploads', 'thinking-voice-tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const voiceUpload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, tmpDir),
    filename: (_r, f, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname) || '.webm'}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_r, f, cb) => cb(null, /^(audio|video)\//.test(f.mimetype)),
});

// Student — daily challenge loop
router.get('/today', ctrl.getToday);
router.post('/next', ctrl.nextChallenge);
router.get('/stats', ctrl.stats);
router.get('/badges', ctrl.badges);
router.get('/leaderboard', ctrl.leaderboard);
router.get('/profile', ctrl.getProfile);
router.get('/analytics', ctrl.analytics);
router.post('/:id/approach', ctrl.saveApproach);   // think-first gate (>=30 words)
router.post('/:id/hint', ctrl.revealHint);
router.post('/:id/run', ctrl.run);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/voice', voiceUpload.single('recording'), ctrl.voiceExplain);
router.post('/:id/journal', ctrl.saveJournal);
router.post('/:id/explain', ctrl.explain);

// Admin / instructor — question bank
const adminGuard = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);
router.get('/admin/meta', adminGuard, ctrl.meta);
router.get('/admin/problems', adminGuard, ctrl.listProblems);
router.post('/admin/generate', adminGuard, ctrl.generateProblems);
router.post('/admin/generate-bulk', adminGuard, ctrl.generateBulk);
router.post('/admin/problems', adminGuard, ctrl.createProblem);
router.get('/admin/problems/:id', adminGuard, ctrl.getProblemDetail);
router.put('/admin/problems/:id', adminGuard, ctrl.updateProblem);
router.patch('/admin/problems/:id', adminGuard, ctrl.toggleProblem);
router.delete('/admin/problems/:id', adminGuard, ctrl.deleteProblem);
router.get('/admin/schedule', adminGuard, ctrl.listSchedule);
router.post('/admin/schedule', adminGuard, ctrl.scheduleChallenge);
router.delete('/admin/schedule/:id', adminGuard, ctrl.deleteSchedule);

export default router;
