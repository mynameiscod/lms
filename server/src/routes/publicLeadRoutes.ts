import express from 'express';
import { submitPublicLeadForm, getPublicFormConfig } from '../controllers/publicLeadController';
import { registerForWeeklyQuizFromWebsite } from '../controllers/publicQuizController';

const router = express.Router();

// PUBLIC ROUTES — No authentication required
// These are used by external forms, landing pages, and embeddable forms

// Get form configuration (which fields to show)
router.get('/form/:tenantSlug', getPublicFormConfig);

// Submit a lead from an external form
router.post('/form/:tenantSlug', submitPublicLeadForm);

// Register for the current weekly/featured public quiz (called from external website)
// POST /api/v1/public/:tenantSlug/weekly-quiz-register
router.post('/:tenantSlug/weekly-quiz-register', registerForWeeklyQuizFromWebsite);

export default router;
