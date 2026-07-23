import express from 'express';
import {
  getBatchSummaries,
  getStudentReport,
  getStudentReportHtml,
  sendToStudent,
  sendToBatch,
  getBatches,
} from '../controllers/weeklyReportController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantResolver);

// Admin/instructor reporting surface — gated on the standard reporting permission.
const canReport = roleGuard(['view_reports', 'manage_tenant', 'view_analytics']);

router.get('/batches', canReport, getBatches);
router.get('/summaries', canReport, getBatchSummaries);
router.get('/student/:studentId', canReport, getStudentReport);
router.get('/student/:studentId/preview', canReport, getStudentReportHtml);
router.post('/send', canReport, sendToStudent);
router.post('/send-batch', canReport, sendToBatch);

export default router;
