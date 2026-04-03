import express from 'express';
import { submitPublicLeadForm, getPublicFormConfig } from '../controllers/publicLeadController';

const router = express.Router();

// PUBLIC ROUTES — No authentication required
// These are used by external forms, landing pages, and embeddable forms

// Get form configuration (which fields to show)
router.get('/form/:tenantSlug', getPublicFormConfig);

// Submit a lead from an external form
router.post('/form/:tenantSlug', submitPublicLeadForm);

export default router;
