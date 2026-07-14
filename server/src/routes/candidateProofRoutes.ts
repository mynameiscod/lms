import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { getProof, publishProof, unpublishProof } from '../controllers/candidateProofController';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

// Placement team + admins can generate/share candidate proof profiles.
const guard = roleGuard(['manage_leads', 'convert_leads', 'manage_tenant', 'manage_tenant_users']);

router.get('/:studentId', guard, getProof);
router.post('/:studentId/publish', guard, publishProof);
router.post('/:studentId/unpublish', guard, unpublishProof);

export default router;
