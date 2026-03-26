import express from 'express';
import { createRequest, listRequests, getMyRequests, updateRequest, deleteRequest, getStats } from '../controllers/learningRequestController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// Student routes
router.post('/',     authMiddleware, tenantResolver, createRequest);
router.get('/my',    authMiddleware, tenantResolver, getMyRequests);
router.delete('/:id',authMiddleware, tenantResolver, deleteRequest);

// Admin routes
router.get('/stats', authMiddleware, tenantResolver, getStats);
router.get('/',      authMiddleware, tenantResolver, listRequests);
router.put('/:id',   authMiddleware, tenantResolver, updateRequest);

export default router;
