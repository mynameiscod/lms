import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import {
  listMembers,
  getMyMembership,
  getMembershipForUser,
  upsert,
  deactivate,
  bulkImport,
  updateAcademic
} from './membershipController';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/', listMembers);
router.get('/me', getMyMembership);
router.get('/user/:userId', getMembershipForUser);
router.post('/', upsert);
router.post('/bulk', bulkImport);
router.patch('/:userId/academic', updateAcademic);
router.delete('/:userId', deactivate);

export default router;
