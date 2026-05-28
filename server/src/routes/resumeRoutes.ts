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
  getAllResumes,
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

router.use(tenantResolver);
router.use(authMiddleware);

router.get('/my', getMyResume);
router.post('/upload', upload.single('resume'), uploadResume);
router.put('/sections', saveSections);
router.post('/score', scoreMyResume);
router.get('/all', getAllResumes); // admin

export default router;
