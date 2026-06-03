import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  changeLeadStage,
  approveStageChange,
  addLeadActivity,
  deleteLead,
  getLeadAnalytics,
  convertToStudent,
  exportLeads,
  importLeads,
  getManagerBoard,
  getLeadAuditLogs,
  getMyPerformance,
  getTeamActivity,
  quickUpdateLead,
  getAgingLeads,
  getDuplicateLeads,
  mergeDuplicateLeads,
  getFunnelAnalytics,
  updateLeadFee,
  getStaleFollowupLeads,
} from '../controllers/leadController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

// Ensure recordings directory exists
const recordingsDir = 'uploads/recordings';
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Multer config: accept audio files only, max 50 MB
const recordingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `recording-${unique}${path.extname(file.originalname)}`);
  }
});
// Multer config for call recordings — no file-type filter so all phone
// audio formats work (iOS/Android send various MIME types). Limit 100 MB.
const uploadRecording = multer({
  storage: recordingStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB
});

const router = express.Router();

// Analytics & reports (need view_lead_analytics or manage_leads)
router.get('/stale-followups', authMiddleware, tenantResolver, roleGuard(['view_lead_analytics', 'manage_leads']), getStaleFollowupLeads);
router.get('/analytics', authMiddleware, tenantResolver, roleGuard(['view_lead_analytics', 'manage_leads']), getLeadAnalytics);
router.get('/funnel-analytics', authMiddleware, tenantResolver, roleGuard(['view_lead_analytics', 'manage_leads']), getFunnelAnalytics);
router.get('/manager-board', authMiddleware, tenantResolver, roleGuard(['view_lead_analytics', 'manage_leads']), getManagerBoard);
router.get('/audit-logs', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getLeadAuditLogs);

// Telecaller self-performance
router.get('/my-performance', authMiddleware, tenantResolver, roleGuard(['view_leads', 'manage_leads', 'create_leads', 'edit_leads']), getMyPerformance);
// Team activity report (per-person, daily) — admins/managers
router.get('/team-activity', authMiddleware, tenantResolver, roleGuard(['manage_leads', 'view_lead_analytics', 'view_reports', 'view_analytics']), getTeamActivity);

// Export / Import (need export_leads or manage_leads)
router.get('/export', authMiddleware, tenantResolver, roleGuard(['export_leads', 'manage_leads']), exportLeads);
router.post('/import', authMiddleware, tenantResolver, roleGuard(['export_leads', 'manage_leads']), importLeads);

// CRUD — granular permissions
router.get('/', authMiddleware, tenantResolver, roleGuard(['view_leads', 'manage_leads']), getLeads);
router.get('/:leadId', authMiddleware, tenantResolver, roleGuard(['view_leads', 'manage_leads']), getLeadById);
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_leads', 'manage_leads']), createLead);
router.put('/:leadId', authMiddleware, tenantResolver, roleGuard(['edit_leads', 'manage_leads']), updateLead);
router.delete('/:leadId', authMiddleware, tenantResolver, roleGuard(['delete_leads', 'manage_leads']), deleteLead);

// Quick update (telecaller-friendly single endpoint)
router.patch('/:leadId/quick-update', authMiddleware, tenantResolver, roleGuard(['edit_leads', 'manage_leads', 'create_leads']), quickUpdateLead);

// Stage change (need edit permission or create_leads for telecallers)
router.patch('/:leadId/stage', authMiddleware, tenantResolver, roleGuard(['edit_leads', 'manage_leads', 'create_leads']), changeLeadStage);

// Approve pending stage change (admins/managers only)
router.post('/:leadId/approve-stage', authMiddleware, tenantResolver, roleGuard(['manage_leads']), approveStageChange);

// Activities (anyone who can view or edit can add activities)
router.post('/:leadId/activities', authMiddleware, tenantResolver, roleGuard(['edit_leads', 'view_leads', 'manage_leads']), uploadRecording.single('recording'), addLeadActivity);

// Convert to student (need convert_leads or manage_leads)
router.post('/:leadId/convert', authMiddleware, tenantResolver, roleGuard(['convert_leads', 'manage_leads']), convertToStudent);

// Lead aging board
router.get('/aging', authMiddleware, tenantResolver, roleGuard(['view_leads', 'manage_leads']), getAgingLeads);

// Duplicate lead detection + merge
router.get('/duplicates', authMiddleware, tenantResolver, roleGuard(['manage_leads']), getDuplicateLeads);
router.post('/duplicates/merge', authMiddleware, tenantResolver, roleGuard(['manage_leads']), mergeDuplicateLeads);

// P5: Fee & Payment
router.patch('/:leadId/fee', authMiddleware, tenantResolver, roleGuard(['edit_leads', 'manage_leads']), updateLeadFee);

export default router;
