import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import {
  getMyResume,
  uploadResume,
  saveSections,
  scoreMyResume,
  improveMyResume,
  tailorMyResume,
  getAllResumes,
  shareMyResume,
  getPublicResume,
} from '../controllers/resumeController';

const router = express.Router();

const uploadsDir = 'uploads/resumes';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `resume-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'));
  },
});

// Public, read-only share link — must be before auth middleware
/** An LMS demo student: each AI resume action (read, score, improve, tailor) comes out of the day's AI allowance. */
const demoAi = async (req: any, res: any, next: any) => {
  try {
    const { takeDemoAi } = await import('../services/lmsDemoService');
    const use = await takeDemoAi(String(req.user?.id || ''));
    if (use.demo && !use.ok) return res.status(429).json({ code: 'DEMO_AI_LIMIT', message: `You have used today's ${use.limit} AI questions. More tomorrow.` });
    next();
  } catch (e) { next(e); }
};

router.get('/public/:token', getPublicResume);

// Auth first: tenantResolver takes the tenant from the verified token, so running it
// before authMiddleware would leave it with nothing but the client's own header.
router.use(authMiddleware);
router.use(tenantResolver);

router.get('/my', getMyResume);
router.post('/upload', demoAi, upload.single('resume'), uploadResume);
router.put('/sections', saveSections);
router.post('/score', demoAi, scoreMyResume);
router.post('/improve', demoAi, improveMyResume);
router.post('/tailor', demoAi, tailorMyResume);
router.post('/share', shareMyResume);
router.get('/all', getAllResumes); // admin

export default router;
