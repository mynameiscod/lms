import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import multer from 'multer';
import * as c from '../controllers/placementDeskController';

const listUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const oneList: express.RequestHandler = (req, res, next) => listUpload.single('file')(req, res, (err: any) => {
  if (!err) return next();
  res.status(400).json({ success: false, message: err?.code === 'LIMIT_FILE_SIZE' ? 'The file is larger than 5 MB.' : 'Could not read the upload.' });
});

/**
 * Placement Desk — /api/v1/placement-desk
 * Everything is admin/placement-team only except GET /public/:token (a published,
 * company-level summary with no names or feedback).
 */
const router = express.Router();

router.get('/public/:token', c.getPublicSummary);

const auth = [authMiddleware, tenantResolver];
const view = roleGuard(['manage_placement_desk', 'view_placement_desk']);
const manage = roleGuard(['manage_placement_desk']);

router.get('/officers', ...auth, view, c.listOfficers);
router.post('/officers', ...auth, manage, c.saveOfficer);
router.patch('/officers/:id', ...auth, manage, c.saveOfficer);

router.get('/companies', ...auth, view, c.listCompanies);
router.post('/companies', ...auth, manage, c.saveCompany);
router.get('/companies/:id', ...auth, view, c.getCompany);
router.patch('/companies/:id', ...auth, manage, c.saveCompany);

router.get('/drives', ...auth, view, c.listDrives);
router.post('/drives', ...auth, manage, c.createDrive);
router.get('/drives/:id', ...auth, view, c.getDrive);
router.patch('/drives/:id', ...auth, manage, c.updateDrive);
router.delete('/drives/:id', ...auth, manage, c.deleteDrive);
router.get('/drives/:id/suggest', ...auth, manage, c.suggestCandidates);
router.post('/drives/:id/match-list', ...auth, manage, oneList, c.matchCandidateList);
router.post('/drives/:id/candidates', ...auth, manage, c.addCandidates);
router.patch('/drives/:id/candidates', ...auth, manage, c.bulkStatus);
router.patch('/candidates/:cid', ...auth, manage, c.updateCandidate);
router.delete('/candidates/:cid', ...auth, manage, c.removeCandidate);

router.get('/report', ...auth, view, c.getReport);
router.get('/report/export', ...auth, view, c.exportReport);
router.get('/students/:studentId/history', ...auth, view, c.getStudentHistory);

router.get('/settings', ...auth, view, c.getSettings);
router.patch('/settings', ...auth, manage, c.updateSettings);

export default router;
