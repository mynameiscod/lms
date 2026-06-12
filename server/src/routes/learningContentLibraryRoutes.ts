import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/learningContentLibraryController';
import * as bunny from '../controllers/bunnyController';

const router = express.Router();

// ─── Upload directories ────────────────────────────────────────────────────────
const videoDir = path.join(__dirname, '../../uploads/learning-videos');
const notesDir = path.join(__dirname, '../../uploads/learning-notes');

if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });

// ─── Multer: video (500 MB) ────────────────────────────────────────────────────
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, videoDir),
  filename:    (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `lcl-video-${unique}${path.extname(file.originalname)}`);
  },
});
const videoUpload = multer({
  storage: videoStorage,
  limits:  { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// ─── Multer: notes PDF / doc (50 MB) ──────────────────────────────────────────
const notesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, notesDir),
  filename:    (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `lcl-notes-${unique}${path.extname(file.originalname)}`);
  },
});
const notesUpload = multer({
  storage: notesStorage,
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(null, false);
  },
});

// ─── Middleware: attach file paths to req ──────────────────────────────────────
const attachVideoPath = (req: any, _res: any, next: any) => {
  if (req.file) req.videoFilePath = req.file.path;
  next();
};
const attachNotesPath = (req: any, _res: any, next: any) => {
  if (req.file) req.notesFilePath = req.file.path;
  next();
};

// ─── Stream route (no auth header — uses query token) ─────────────────────────
router.get('/:id/stream', (req, res) => {
  const token    = req.query.token as string;
  const tenantId = req.query.tenantId as string;
  if (!token || !tenantId) return res.status(401).json({ message: 'token and tenantId required' });
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  (req as any).tenantId = tenantId;
  return ctrl.streamVideo(req, res);
});

// ─── All other routes require auth ────────────────────────────────────────────
router.use(authMiddleware);
router.use(tenantMiddleware);

// Tags (for filter dropdowns)
router.get('/tags/topics',  ctrl.getTopicTags);
router.get('/tags/courses', ctrl.getCourseTags);

// Bunny Stream — create video + resumable upload authorization
router.get('/bunny/config',  bunny.bunnyConfigured);
router.post('/bunny/videos', bunny.createBunnyVideo);

// CRUD
router.get('/',     ctrl.listContent);
router.get('/:id',  ctrl.getContent);

// Create — optionally includes a video file OR a notes file
router.post(
  '/',
  (req: any, res: any, next: any) => {
    const contentType = req.body?.type || req.query?.type;
    if (contentType === 'video') {
      videoUpload.single('videoFile')(req, res, (err: any) => {
        if (err) return res.status(413).json({ message: err.message });
        attachVideoPath(req, res, next);
      });
    } else if (contentType === 'notes') {
      notesUpload.single('notesFile')(req, res, (err: any) => {
        if (err) return res.status(413).json({ message: err.message });
        attachNotesPath(req, res, next);
      });
    } else {
      next();
    }
  },
  ctrl.createContent
);

// Update — same dynamic upload logic
router.put(
  '/:id',
  (req: any, res: any, next: any) => {
    const contentType = req.body?.type || req.query?.type;
    if (contentType === 'video') {
      videoUpload.single('videoFile')(req, res, (err: any) => {
        if (err) return res.status(413).json({ message: err.message });
        attachVideoPath(req, res, next);
      });
    } else if (contentType === 'notes') {
      notesUpload.single('notesFile')(req, res, (err: any) => {
        if (err) return res.status(413).json({ message: err.message });
        attachNotesPath(req, res, next);
      });
    } else {
      next();
    }
  },
  ctrl.updateContent
);

router.delete('/:id',          ctrl.deleteContent);
router.patch('/:id/publish',   ctrl.togglePublish);

export default router;
