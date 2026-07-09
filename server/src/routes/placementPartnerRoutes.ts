import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getStages, listPartners, getPartner, createPartner, updatePartner, moveStage, deletePartner, importPartners,
  matchStudents, addCandidate, removeCandidate, candidatePdf, scheduleInterview, markPlaced, analytics, uploadAttachment,
} from '../controllers/placementPartnerController';
import {
  startOutreach, startOutreachBulk, markReplied, markBounced, draftVouchEndpoint, draftCandidateProfilesEndpoint,
  getPartnerMessages, getQueue, updateMessage, approveMessage, cancelMessage,
  getPartnerThread, markInboundRead, testImap, replyToPartner,
} from '../controllers/partnerOutreachController';
import { listTasks, completeTask, snoozeTask, addTask } from '../controllers/partnerTaskController';

const router = express.Router();

// CSV held in memory for parsing (no disk write needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Email attachments written to disk (served publicly from /uploads). Up to 25 MB
// — the send path attaches ≤10 MB inline and turns anything larger into a link.
const attachDir = path.join(__dirname, '..', '..', 'uploads', 'partner-attachments');
fs.mkdirSync(attachDir, { recursive: true });
const attachUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, attachDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(pdf|png|jpe?g|ppt|pptx)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, PNG, JPG, and PPT/PPTX files are allowed'));
  },
});

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

// reply inbox (Slice A) — static prefixes before /:id
router.post('/imap-test', testImap);
router.patch('/inbound/:mid/read', markInboundRead);
router.post('/attachments', attachUpload.single('file'), uploadAttachment);

// reminders / tasks dashboard (static prefixes before /:id)
router.get('/tasks', listTasks);
router.patch('/tasks/:tid/complete', completeTask);
router.patch('/tasks/:tid/snooze', snoozeTask);

router.get('/', listPartners);
router.post('/', createPartner);
router.get('/:id', getPartner);
router.patch('/:id', updatePartner);
router.patch('/:id/stage', moveStage);
router.delete('/:id', deletePartner);

// per-partner outreach actions
router.get('/:id/messages', getPartnerMessages);
router.get('/:id/thread', getPartnerThread);
router.post('/:id/reply', replyToPartner);
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
router.post('/:id/tasks', addTask);

export default router;
