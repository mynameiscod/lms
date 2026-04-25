import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as membershipService from './membershipService';

// GET /api/v1/college/membership?collegeRole=STUDENT&departmentId=...&yearOfStudy=2
export const listMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { collegeRole, departmentId, yearOfStudy } = req.query as Record<string, string>;
    const members = await membershipService.listMembers(tenantId, {
      collegeRole: collegeRole as any,
      departmentId,
      yearOfStudy: yearOfStudy ? parseInt(yearOfStudy, 10) : undefined
    });
    return res.json({ success: true, data: members });
  } catch (err) {
    console.error('[MembershipController.list]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/college/membership/me
export const getMyMembership = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId)
      return res.status(400).json({ success: false, message: 'Auth context missing' });

    const membership = await membershipService.getMembershipForUser(userId, tenantId);
    return res.json({ success: true, data: membership });
  } catch (err) {
    console.error('[MembershipController.getMyMembership]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/college/membership/user/:userId
export const getMembershipForUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const membership = await membershipService.getMembershipForUser(userId, tenantId);
    if (!membership) return res.status(404).json({ success: false, message: 'Membership not found' });

    return res.json({ success: true, data: membership });
  } catch (err) {
    console.error('[MembershipController.getMembershipForUser]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/college/membership  (upsert — create or update)
export const upsert = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { userId, collegeRole, departmentId, yearOfStudy, rollNumber, academicYear, division, admissionType,
            cgpa, backlogs, semesterGrades } = req.body;
    if (!userId || !collegeRole) {
      return res.status(400).json({ success: false, message: 'userId and collegeRole are required' });
    }

    const membership = await membershipService.upsertMembership(tenantId, {
      userId, collegeRole, departmentId, yearOfStudy, rollNumber, academicYear, division, admissionType,
      cgpa, backlogs, semesterGrades
    });
    return res.status(200).json({ success: true, data: membership });
  } catch (err) {
    console.error('[MembershipController.upsert]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/v1/college/membership/:userId
export const deactivate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    await membershipService.deactivateMembership(userId, tenantId);
    return res.json({ success: true, message: 'Membership deactivated' });
  } catch (err) {
    console.error('[MembershipController.deactivate]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/college/membership/bulk
export const bulkImport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'rows array is required' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ success: false, message: 'Max 500 rows per bulk import' });
    }

    const result = await membershipService.bulkUpsertMemberships(tenantId, rows);
    return res.json({
      success: true,
      data: {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (err) {
    console.error('[MembershipController.bulkImport]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/v1/college/membership/:userId/academic
export const updateAcademic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { cgpa, backlogs, semesterGrades } = req.body;
    const updated = await membershipService.updateAcademicRecord(userId, tenantId, {
      cgpa, backlogs, semesterGrades
    });
    if (!updated) return res.status(404).json({ success: false, message: 'Membership not found' });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[MembershipController.updateAcademic]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
