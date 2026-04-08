import express from 'express';
import {
  getIntegrations,
  getIntegrationById,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  fetchHeaders,
  fetchTabs,
  triggerSync,
  resetSync
} from '../controllers/googleSheetController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// All routes require authentication + tenant + manage_leads permission
router.use(authMiddleware, tenantResolver, roleGuard(['manage_leads']));

// Fetch tab names from a Google Sheet URL
router.post('/fetch-tabs', fetchTabs);

// Fetch headers from a Google Sheet URL (before creating integration)
router.post('/fetch-headers', fetchHeaders);

// CRUD
router.get('/', getIntegrations);
router.get('/:id', getIntegrationById);
router.post('/', createIntegration);
router.put('/:id', updateIntegration);
router.delete('/:id', deleteIntegration);

// Sync operations
router.post('/:id/sync', triggerSync);
router.post('/:id/reset-sync', resetSync);

export default router;
