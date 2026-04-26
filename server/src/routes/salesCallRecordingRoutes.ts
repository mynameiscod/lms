import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import {
  uploadMiddleware,
  uploadRecording,
  getRecordingsForLead,
  getRecordingById,
  reanalyzeRecording,
  updateNotes,
  deleteRecording,
} from '../controllers/salesCallRecordingController';

const router = express.Router();

router.use(authMiddleware as any);
router.use(tenantResolver as any);

// Multer wrapper that returns 400 on file-type/size errors instead of crashing
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req as any, res as any, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload error' });
    }
    next();
  });
};

router.post('/', handleUpload as any, uploadRecording as any);
router.get('/', getRecordingsForLead as any);
router.get('/:id', getRecordingById as any);
router.post('/:id/reanalyze', reanalyzeRecording as any);
router.patch('/:id/notes', updateNotes as any);
router.delete('/:id', deleteRecording as any);

export default router;
