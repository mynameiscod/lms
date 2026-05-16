import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import * as ctrl from '../controllers/publicQuizController';

const router = express.Router();

const recordingDir = path.join(__dirname, '..', '..', 'uploads', 'recordings');
fs.mkdirSync(recordingDir, { recursive: true });

const recordingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
const recordingUpload = multer({ storage: recordingStorage, limits: { fileSize: 500 * 1024 * 1024 } }).any();

// ─── PUBLIC routes (no auth required) ───────────────────────────────────────
router.get('/certificate/:shareToken', ctrl.getPublicCertificate);
router.get('/session/:submissionId/questions', ctrl.getPublicQuizQuestions);
router.get('/session/:submissionId/results', ctrl.getPublicQuizResults);
router.post('/session/:submissionId/submit', ctrl.submitPublicQuiz);
router.post('/session/:submissionId/recording', recordingUpload, ctrl.uploadQuizRecording);
router.get('/:slug/leaderboard', ctrl.getPublicQuizLeaderboard);
router.get('/:slug', ctrl.getPublicQuizPage);
router.post('/:slug/register', ctrl.registerForPublicQuiz);

export default router;
