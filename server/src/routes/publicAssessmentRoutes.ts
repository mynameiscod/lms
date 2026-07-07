import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  registerAssessment,
  verifyAssessmentOtp,
  resendAssessmentOtp,
  uploadAssessmentResume,
  startAssessment,
  advanceAssessment,
  submitAssessment,
  getAssessmentResult,
  runAssessmentCode,
} from '../controllers/publicAssessmentController';

// Public, unauthenticated skill-assessment funnel (Meta-ad → exam → roadmap).
const router = express.Router();

// Resume uploads → server/uploads/resumes
const resumeDir = path.join(process.cwd(), 'uploads', 'resumes');
try { fs.mkdirSync(resumeDir, { recursive: true }); } catch { /* exists */ }
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename: (_req, file, cb) => cb(null, `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|docx?|txt)$/i.test(file.originalname);
    cb(null, ok);
  },
});

router.post('/register', registerAssessment);
router.post('/verify-otp', verifyAssessmentOtp);
router.post('/resend-otp', resendAssessmentOtp);
router.post('/resume', upload.single('resume'), uploadAssessmentResume);
router.post('/start', startAssessment);
router.post('/advance', advanceAssessment);
router.post('/run-code', runAssessmentCode);
router.post('/submit', submitAssessment);
router.get('/result/:token', getAssessmentResult);

export default router;
