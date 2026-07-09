import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { listCertificates, revokeCertificate } from '../controllers/certificateAdminController';

const router = Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_leads', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses']));

router.get('/', listCertificates);
router.post('/:id/revoke', revokeCertificate);

export default router;
