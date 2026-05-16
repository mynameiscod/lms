import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { submitPublicLeadForm, getPublicFormConfig, submitWebsiteLead } from '../controllers/publicLeadController';
import { registerForWeeklyQuizFromWebsite, getQuizByToken, submitQuizByToken } from '../controllers/publicQuizController';

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'registrations');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const multipart = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).any();

// PUBLIC ROUTES — No authentication required
// These are used by external forms, landing pages, and embeddable forms

// Get form configuration (which fields to show)
router.get('/form/:tenantSlug', getPublicFormConfig);

// Submit a lead from an external form
router.post('/form/:tenantSlug', multipart, submitPublicLeadForm);

// Simple hot-lead capture for website contact/enquiry forms (no config needed)
// POST /api/v1/public/:tenantSlug/website-lead
router.post('/:tenantSlug/website-lead', multipart, submitWebsiteLead);

// Register for the current weekly/featured public quiz (called from external website)
// POST /api/v1/public/:tenantSlug/weekly-quiz-register
router.post('/:tenantSlug/weekly-quiz-register', multipart, registerForWeeklyQuizFromWebsite);

// Public quiz-taking routes — authenticated via token only (no login required)
// GET  /api/v1/public/quiz/:token       — fetch quiz questions (sets quizStartedAt on first call)
// POST /api/v1/public/quiz/:token/submit — submit answers, get score + rank
router.get('/quiz/:token', getQuizByToken);
router.post('/quiz/:token/submit', express.json(), submitQuizByToken);

export default router;
