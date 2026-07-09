import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as svc from './placementDriveService';
import User from '../models/User';
import { EmailService } from '../services/emailService';
import { placementOverview, notifyRound } from '../services/placementStatusService';

// Applicant userIds actively in the process (shortlisted/selected), or all applicants if none yet.
function roundAudience(drive: any): string[] {
  const map: Record<string, string> = drive.applicantStatuses instanceof Map
    ? Object.fromEntries(drive.applicantStatuses) : (drive.applicantStatuses || {});
  const active = Object.entries(map).filter(([, s]) => s === 'shortlisted' || s === 'selected').map(([uid]) => uid);
  if (active.length) return active;
  return (drive.applicants || []).map((a: any) => String(a));
}

const emailService = new EmailService();

// GET /college/placement/overview — unified placement stats from the canonical User.placement.
export const overview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await placementOverview(req.user!.tenantId, { batchId: req.query.batchId as string });
    res.json({ success: true, data });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message }); }
};

export const list = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query as { status?: string };
    const drives = await svc.listDrives(req.user!.tenantId, status);
    res.json({ success: true, data: drives });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getOne = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const drive = await svc.getDriveById(req.params.id, req.user!.tenantId);
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: drive });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { companyName, role } = req.body;
    if (!companyName || !role)
      return res.status(400).json({ success: false, message: 'companyName and role are required' });
    const drive = await svc.createDrive(req.user!.tenantId, req.user!.id, req.body);
    res.status(201).json({ success: true, data: drive });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const drive = await svc.updateDrive(req.params.id, req.user!.tenantId, req.body);
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: drive });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const remove = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.deleteDrive(req.params.id, req.user!.tenantId);
    res.json({ success: true, message: 'Drive deactivated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const apply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const drive = await svc.applyToDrive(req.params.id, req.user!.tenantId, req.user!.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found or not accepting applications' });
    res.json({ success: true, message: 'Applied successfully', data: { applicantCount: drive.applicants.length } });
  } catch (e: any) {
    const status = e.statusCode === 403 ? 403 : 500;
    res.status(status).json({ success: false, message: e.message || 'Server error' });
  }
};

export const withdraw = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.withdrawFromDrive(req.params.id, req.user!.tenantId, req.user!.id);
    res.json({ success: true, message: 'Withdrawn' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await svc.getDriveStats(req.user!.tenantId);
    res.json({ success: true, data: stats });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getSnapshot = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await svc.getCollegeSnapshot(req.user!.tenantId);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── Rounds ──────────────────────────────────────────────────────────────────

export const listApplicants = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const drive = await svc.getDriveApplicants(req.params.id, req.user!.tenantId);
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: drive });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const setApplicantStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const allowed = ['applied', 'shortlisted', 'selected', 'rejected', 'placed'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });
    const drive = await svc.updateApplicantStatus(req.params.id, req.user!.tenantId, req.params.userId, status);
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });

    // Send email alert for meaningful status changes
    if (['shortlisted', 'selected', 'placed', 'rejected'].includes(status)) {
      const userDoc = await User.findById(req.params.userId).lean() as any;
      if (userDoc?.email) {
        emailService.sendPlacementStatusEmail(
          userDoc.email,
          userDoc.firstName || 'Student',
          drive.companyName,
          drive.role,
          status as any
        ).catch(() => {/* non-fatal */});
      }
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const addRound = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, date, venue, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Round name is required' });
    const drive = await svc.addRound(req.params.id, req.user!.tenantId, { name, date, venue, description });
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });
    if (date) await notifyRound(req.user!.tenantId, roundAudience(drive), (drive as any).companyName, { name, date, venue });
    res.json({ success: true, data: drive.rounds });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const updateRound = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const idx = parseInt(req.params.roundIndex, 10);
    if (isNaN(idx)) return res.status(400).json({ success: false, message: 'Invalid round index' });
    const drive = await svc.updateRound(req.params.id, req.user!.tenantId, idx, req.body);
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });
    // Notify only when a date was (re)scheduled in this edit.
    if (req.body?.date) {
      const r: any = (drive.rounds as any[])[idx] || {};
      await notifyRound(req.user!.tenantId, roundAudience(drive), (drive as any).companyName, { name: r.name || req.body.name, date: req.body.date, venue: r.venue || req.body.venue });
    }
    res.json({ success: true, data: drive.rounds });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const removeRound = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const idx = parseInt(req.params.roundIndex, 10);
    if (isNaN(idx)) return res.status(400).json({ success: false, message: 'Invalid round index' });
    const drive = await svc.removeRound(req.params.id, req.user!.tenantId, idx);
    if (!drive) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: (drive as any).rounds });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const bulkStatusImport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || !updates.length)
      return res.status(400).json({ success: false, message: 'updates array is required' });
    if (updates.length > 1000)
      return res.status(400).json({ success: false, message: 'Max 1000 rows per import' });
    const result = await svc.bulkUpdateApplicantStatuses(req.params.id, req.user!.tenantId, updates);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await svc.getPlacementAnalytics(req.user!.tenantId);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const getMyApplications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await svc.getMyApplications(req.user!.id, req.user!.tenantId);
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

