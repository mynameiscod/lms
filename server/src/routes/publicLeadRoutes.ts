import express from 'express';
import multer from 'multer';
import { submitPublicLeadForm, getPublicFormConfig } from '../controllers/publicLeadController';
import { registerForWeeklyQuizFromWebsite } from '../controllers/publicQuizController';

const router = express.Router();
const multipart = multer().none(); // parse multipart/form-data text fields, discard any files

// PUBLIC ROUTES — No authentication required
// These are used by external forms, landing pages, and embeddable forms

// Get form configuration (which fields to show)
router.get('/form/:tenantSlug', getPublicFormConfig);

// Submit a lead from an external form
router.post('/form/:tenantSlug', multipart, submitPublicLeadForm);

// Register for the current weekly/featured public quiz (called from external website)
// POST /api/v1/public/:tenantSlug/weekly-quiz-register
router.post('/:tenantSlug/weekly-quiz-register', multipart, registerForWeeklyQuizFromWebsite);

export default router;
