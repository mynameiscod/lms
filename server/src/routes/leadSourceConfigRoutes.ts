import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getConfig,
  updateSourceConfig,
  addThirdPartySource,
  removeThirdPartySource,
  testConnection,
} from '../controllers/leadSourceConfigController';

const router = express.Router();

router.use(authMiddleware as any, tenantResolver as any, roleGuard(['manage_leads']) as any);

// GET /lead-source-config — full config for this tenant (tokens masked)
router.get('/', getConfig as any);

// PUT /lead-source-config/:source — update a specific source (metaAds, whatsApp, etc.)
router.put('/:source', updateSourceConfig as any);

// POST /lead-source-config/:source/test — test connection
router.post('/:source/test', testConnection as any);

// Third-party integrations (IndiaMART, Sulekha, etc.)
router.post('/third-party', addThirdPartySource as any);
router.delete('/third-party/:name', removeThirdPartySource as any);

export default router;
