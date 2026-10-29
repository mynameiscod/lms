import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/questionPoolController';

/**
 * Question Pools — reusable shortlists of bank questions that pool exams draw from.
 * Authoring only: whoever may manage assignments may build the pools those assignments draw on.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_assignments']));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/bank', ctrl.browseBank);
router.post('/:id/questions', ctrl.addQuestions);
router.post('/:id/questions/remove', ctrl.removeQuestions);
router.post('/:id/import-mcq', ctrl.importMcqs);

export default router;
