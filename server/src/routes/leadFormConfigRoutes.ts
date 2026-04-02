import express from 'express';
import {
  getFormConfig,
  updateFormConfig,
  addCustomField,
  deleteCustomField,
  getStatsCardsConfig,
  updateStatsCardsConfig,
  getTableColumnsConfig,
  updateTableColumnsConfig
} from '../controllers/leadFormConfigController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// GET is read-only — any user with lead access can read the form config
router.get('/', authMiddleware, tenantResolver, roleGuard(['manage_leads', 'view_leads', 'create_leads', 'edit_leads']), getFormConfig);
// Write operations still require manage_leads
router.put('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), updateFormConfig);
router.post('/fields', authMiddleware, tenantResolver, roleGuard(['manage_leads']), addCustomField);
router.delete('/fields/:fieldKey', authMiddleware, tenantResolver, roleGuard(['manage_leads']), deleteCustomField);

// Stats cards configuration
router.get('/stats-cards', authMiddleware, tenantResolver, roleGuard(['manage_leads', 'view_leads', 'create_leads', 'edit_leads']), getStatsCardsConfig);
router.put('/stats-cards', authMiddleware, tenantResolver, roleGuard(['manage_leads']), updateStatsCardsConfig);

// Table columns configuration
router.get('/table-columns', authMiddleware, tenantResolver, roleGuard(['manage_leads', 'view_leads', 'create_leads', 'edit_leads']), getTableColumnsConfig);
router.put('/table-columns', authMiddleware, tenantResolver, roleGuard(['manage_leads']), updateTableColumnsConfig);

export default router;
