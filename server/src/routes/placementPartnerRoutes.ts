import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getStages, listPartners, getPartner, createPartner, updatePartner, moveStage, deletePartner, importPartners,
  matchStudents, addCandidate, removeCandidate, candidatePdf, scheduleInterview, markPlaced, analytics,
} from '../controllers/placementPartnerController';
import {
  startOutreach, startOutreachBulk, markReplied, markBounced, draftVouchEndpoint, draftCandidateProfilesEndpoint,
  getPartnerMessages, getQueue, updateMessage, approveMessage, cancelMessage,
} from '../controllers/partnerOutreachController';

const router = express.Router();

// CSV held in memory for parsing (no disk write needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Admin / placement team only (admins inherit all permissions).
const guard = roleGuard(['manage_leads', 'manage_tenant']);

router.use(authMiddleware, tenantResolver, guard);

// static routes before /:id
router.get('/stages', getStages);
router.get('/analytics', analytics);
router.post('/import', upload.single('file'), importPartners);
router.post('/start-outreach', startOutreachBulk);

// outreach queue + message actions (static prefix, before /:id)
router.get('/outreach/queue', getQueue);
router.patch('/outreach/messages/:mid', updateMessage);
router.post('/outreach/messages/:mid/approve', approveMessage);
router.post('/outreach/messages/:mid/cancel', cancelMessage);

router.get('/', listPartners);
router.post('/', createPartner);
router.get('/:id', getPartner);
router.patch('/:id', updatePartner);
router.patch('/:id/stage', moveStage);
router.delete('/:id', deletePartner);

// per-partner outreach actions
router.get('/:id/messages', getPartnerMessages);
router.post('/:id/start-outreach', startOutreach);
router.post('/:id/mark-replied', markReplied);
router.post('/:id/mark-bounced', markBounced);
router.post('/:id/draft-vouch', draftVouchEndpoint);

// student matching + candidate selection (Step 3)
router.get('/:id/match-students', matchStudents);
router.post('/:id/candidates', addCandidate);
router.delete('/:id/candidates/:studentId', removeCandidate);

// candidate profiles + interview scheduling (Step 4)
router.post('/:id/draft-candidate-profiles', draftCandidateProfilesEndpoint);
router.get('/:id/candidate-pdf/:studentId', candidatePdf);
router.post('/:id/schedule-interview', scheduleInterview);
router.post('/:id/mark-placed', markPlaced);

export default router;
