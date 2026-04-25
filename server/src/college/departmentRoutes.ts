import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { list, getOne, create, update, remove, getReport } from './departmentController';

const router = express.Router();

// All routes require authentication + tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/report', getReport);   // must be before /:id
router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
