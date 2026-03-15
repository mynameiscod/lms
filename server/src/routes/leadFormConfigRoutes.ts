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

router.get('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getFormConfig);
router.put('/', authMiddleware, tenantResolver, roleGuard(['manage_leads']), updateFormConfig);
router.post('/fields', authMiddleware, tenantResolver, roleGuard(['manage_leads']), addCustomField);
router.delete('/fields/:fieldKey', authMiddleware, tenantResolver, roleGuard(['manage_leads']), deleteCustomField);

export default router;
