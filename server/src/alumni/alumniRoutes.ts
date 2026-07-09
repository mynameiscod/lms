import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from './alumniController';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

// Alumni stats — must be before /:id
router.get('/stats', ctrl.getStats);
router.get('/success-stories', ctrl.getSuccessStories);

// Referrals (static prefix before /:id)
router.get('/referrals', ctrl.listReferrals);
router.post('/referrals', ctrl.createReferral);
router.put('/referrals/:id', ctrl.updateReferral);
router.delete('/referrals/:id', ctrl.deleteReferral);
router.post('/referrals/:id/interest', ctrl.expressInterest);

// Mentoring requests — student creates, views their own
router.post('/mentoring-requests', ctrl.createMentoringRequest);
router.get('/mentoring-requests/mine', ctrl.listMyMentoringRequests);

// Admin/alumni views requests for a specific alumni
router.get('/:alumniId/mentoring-requests', ctrl.listAlumniMentoringRequests);

// Respond to a request (admin/alumni)
router.patch('/mentoring-requests/:requestId/respond', ctrl.respondToMentoringRequest);

// Alumni CRUD
router.get('/',      ctrl.list);
router.get('/:id',   ctrl.getOne);
router.post('/',     ctrl.create);
router.put('/:id',   ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
