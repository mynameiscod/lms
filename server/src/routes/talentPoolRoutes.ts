import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as c from '../controllers/talentPoolController';

/**
 * Talent Pool (admin) — /api/v1/talent-pool. docs/design/talent-pool-sharing.md
 * Offices see their candidates through /api/v1/talent-portal instead.
 */
const router = express.Router();
const auth = [authMiddleware, tenantResolver];
const view = roleGuard(['manage_talent_pool', 'view_talent_pool']);
const manage = roleGuard(['manage_talent_pool']);

const sheet = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const resumeDir = path.join(__dirname, '..', '..', 'uploads', 'talent');
const resume = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => { fs.mkdirSync(resumeDir, { recursive: true }); cb(null, resumeDir); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase().slice(0, 6)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['.pdf', '.doc', '.docx'].includes(path.extname(file.originalname).toLowerCase())),
});

router.get('/meta', ...auth, view, c.getMeta);

router.get('/partners', ...auth, view, c.listPartners);
router.post('/partners', ...auth, manage, c.savePartner);
router.patch('/partners/:id', ...auth, manage, c.savePartner);
router.post('/partners/:id/login', ...auth, manage, c.createLogin);
router.post('/partners/:id/resend-invite', ...auth, manage, c.resendInvite);
router.patch('/partners/:id/active', ...auth, manage, c.setPartnerActive);
router.get('/partners/:id/shares', ...auth, view, c.partnerShares);
router.get('/partners/:id/export', ...auth, view, c.exportPartner);

router.get('/candidates', ...auth, view, c.listCandidates);
router.post('/shares', ...auth, manage, c.shareCandidates);
router.patch('/shares/:id/status', ...auth, manage, c.setShareStatus);
router.delete('/shares/:id', ...auth, manage, c.unshare);
router.get('/tracker', ...auth, view, c.tracker);

router.get('/external/template', ...auth, view, c.downloadTemplate);
router.post('/external/import', ...auth, manage, sheet.single('file'), c.importExternal);
router.post('/external/import-placement-desk', ...auth, manage, c.importPlacementDesk);
router.post('/external/resume', ...auth, manage, resume.single('file'), c.uploadResume);
router.post('/external', ...auth, manage, c.saveExternal);
router.get('/external/:id', ...auth, view, c.getExternal);
router.patch('/external/:id', ...auth, manage, c.saveExternal);
router.delete('/external/:id', ...auth, manage, c.deleteExternal);

router.patch('/students/:id/preferences', ...auth, manage, c.setStudentPreferences);

export default router;
