import express from 'express';
import {
  getFormConfig,
  updateFormConfig,
  addCustomField,
  deleteCustomField
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

export default router;
