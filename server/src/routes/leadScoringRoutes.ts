import express from 'express';
import { getConfig, updateConfig, getTeamMembers, rescoreAll } from '../controllers/leadScoringController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware, tenantResolver, roleGuard(['manage_leads']));

router.get('/config', getConfig);
router.put('/config', updateConfig);
router.get('/team-members', getTeamMembers);
router.post('/rescore-all', rescoreAll);

export default router;
