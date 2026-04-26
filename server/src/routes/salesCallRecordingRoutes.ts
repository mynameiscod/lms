import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import {
  uploadRecording,
  getRecordingsForLead,
  getRecordingById,
  reanalyzeRecording,
  updateNotes,
  deleteRecording,
} from '../controllers/salesCallRecordingController';

const router = express.Router();

router.use(authMiddleware as any);
router.use(tenantMiddleware as any);

// Upload handled inside controller (multer)
router.post('/', uploadRecording as any);
router.get('/', getRecordingsForLead as any);
router.get('/:id', getRecordingById as any);
router.post('/:id/reanalyze', reanalyzeRecording as any);
router.patch('/:id/notes', updateNotes as any);
router.delete('/:id', deleteRecording as any);

export default router;
