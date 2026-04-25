import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { list, getOne, create, update, remove, markAttendance } from './crtController';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/',                    list);
router.get('/:id',                 getOne);
router.post('/',                   create);
router.put('/:id',                 update);
router.delete('/:id',              remove);
router.post('/:id/attendance',     markAttendance);

export default router;
