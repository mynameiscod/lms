import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getStages, listPartners, getPartner, createPartner, updatePartner, moveStage, deletePartner, importPartners,
} from '../controllers/placementPartnerController';

const router = express.Router();

// CSV held in memory for parsing (no disk write needed)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Admin / placement team only (admins inherit all permissions).
const guard = roleGuard(['manage_leads', 'manage_tenant']);

router.use(authMiddleware, tenantResolver, guard);

// static routes before /:id
router.get('/stages', getStages);
router.post('/import', upload.single('file'), importPartners);

router.get('/', listPartners);
router.post('/', createPartner);
router.get('/:id', getPartner);
router.patch('/:id', updatePartner);
router.patch('/:id/stage', moveStage);
router.delete('/:id', deletePartner);

export default router;
