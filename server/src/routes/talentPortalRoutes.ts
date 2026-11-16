import express from 'express';
import { authMiddleware } from '../middleware/auth';
import * as c from '../controllers/talentPortalController';
import * as d from '../controllers/talentDeskController';

/**
 * Talent Portal — /api/v1/talent-portal. Placement office logins only (role PLACEMENT_PARTNER).
 * No tenant header is trusted here: the office's institute comes from its own partner record.
 */
const router = express.Router();
router.use(authMiddleware, c.loadPartner);

router.get('/me', c.me);
router.get('/candidates', c.listCandidates);
router.get('/candidates/:shareId', c.getCandidate);
router.patch('/candidates/:shareId/status', c.setStatus);
router.get('/export', c.exportXlsx);

// The office's own workspace: companies, follow-ups, openings, candidates sent to companies.
router.get('/dashboard', d.dashboard);
router.get('/companies', d.listCompanies);
router.post('/companies', d.saveCompany);
router.get('/companies/:id', d.getCompany);
router.patch('/companies/:id', d.saveCompany);
router.delete('/companies/:id', d.deleteCompany);
router.get('/companies/:id/export', d.exportCompany);
router.post('/companies/:id/followups', d.addFollowUp);
router.patch('/companies/:id/followups/:fid', d.updateFollowUp);
router.delete('/companies/:id/followups/:fid', d.deleteFollowUp);
router.get('/followups', d.listFollowUps);
router.get('/openings', d.listOpenings);
router.post('/openings', d.saveOpening);
router.patch('/openings/:id', d.saveOpening);
router.delete('/openings/:id', d.deleteOpening);
router.get('/submissions', d.listSubmissions);
router.post('/submissions', d.createSubmissions);
router.patch('/submissions/:id/status', d.setSubmissionStatus);
router.delete('/submissions/:id', d.deleteSubmission);

export default router;
