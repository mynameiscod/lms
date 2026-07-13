import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { TenantService } from '../services/tenantService';
import Tenant, { IStudentFeatures, ITenantModules } from '../models/Tenant';

const tenantService = new TenantService();

export const createTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { name, slug, adminId, description } = req.body;

    if (!name || !slug || !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Name, slug, and adminId are required'
      });
    }

    const tenant = await tenantService.createTenant(name, slug, adminId, description);

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;

    const tenant = await tenantService.getTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
        error: 'Tenant does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tenant fetched successfully',
      data: tenant
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;
    const updateData = req.body;

    const tenant = await tenantService.updateTenant(tenantId, updateData);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
        error: 'Tenant does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

/**
 * Generate an invite link for students/employees to join the tenant
 * Admin/Tenant Admin can use this to create shareable links
 */
export const generateInviteLink = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;

    // Verify the requesting user is an admin of this tenant
    const user = (req as any).user;
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'TENANT_ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
        error: 'Only administrators can generate invite links'
      });
    }

    // Verify the tenant exists
    const tenant = await tenantService.getTenantById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
        error: 'Tenant does not exist'
      });
    }

    // Generate based on frontend URL - can be customized
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginLink = `${frontendUrl}/login?tenantId=${tenantId}`;
    const registerLink = `${frontendUrl}/register?tenantId=${tenantId}`;

    res.status(200).json({
      success: true,
      message: 'Invite links generated successfully',
      data: {
        loginLink,
        registerLink,
        tenantId,
        instructions: 'Share the appropriate link with students or new employees. Login link for existing users, Register link for new users.'
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getStudentFeatures = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId).select('studentFeatures');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
        error: 'Tenant does not exist'
      });
    }

    const defaults: IStudentFeatures = {
      dashboard: true,
      myCourse: true,
      topicHub: true,
      attendance: true,
      quizzes: true,
      assignments: true,
      mockInterviews: true,
      codingSnippets: true,
      classHub: true,
      feeDetails: true,
      scheduledInterviews: true,
      resumeBuilder: true,
      learningPlan: true,
      thinkingLab: true,
      speakingPractice: true,
      jobTracker: true,
      aiMentor: true,
      projectBuilder: true,
      resourceLibrary: true,
      codePlayground: true,
      careerProfile: true,
      aiCommunicationLab: true,
      liveClasses: true,
      collegePortal: true,
      myApplications: true,
      alumniDirectory: true
    };

    const featureData = { ...defaults, ...(tenant.studentFeatures || {}) };
    res.status(200).json({
      success: true,
      message: 'Student features fetched successfully',
      data: featureData
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateStudentFeatures = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;
    const features = req.body as Partial<IStudentFeatures>;

    const allowedKeys: (keyof IStudentFeatures)[] = [
      'dashboard', 'myCourse', 'topicHub', 'attendance', 'quizzes', 'assignments', 'mockInterviews',
      'codingSnippets', 'classHub', 'feeDetails', 'scheduledInterviews', 'resumeBuilder', 'learningPlan',
      'thinkingLab', 'speakingPractice', 'jobTracker', 'aiMentor', 'projectBuilder', 'resourceLibrary', 'codePlayground', 'careerProfile', 'aiCommunicationLab',
      'liveClasses', 'collegePortal', 'myApplications', 'alumniDirectory'
    ];
    const updateObj: Record<string, boolean> = {};
    for (const key of allowedKeys) {
      if (typeof features[key] === 'boolean') {
        updateObj[`studentFeatures.${key}`] = features[key]!;
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateObj },
      { new: true }
    ).select('studentFeatures');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
        error: 'Tenant does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student features updated successfully',
      data: tenant.studentFeatures
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// ── SUPER_ADMIN: list all tenants ─────────────────────────────────────────────
export const listTenants = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const tenants = await Tenant.find({})
      .select('name slug isActive type subscriptionPlan modules studentFeatures createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Tenants fetched', data: tenants });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

// ── GET tenant modules ────────────────────────────────────────────────────────
export const getTenantModules = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId).select('modules');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found', error: 'Not found' });
    }
    const defaults: ITenantModules = {
      courses: true, attendance: true, quizzes: true, assignments: true,
      classRecordings: true, codeAssessments: true, mockInterviews: true,
      placement: true, leads: true, marketing: true, feeManagement: true,
      thinkingLab: true, speakingPractice: true, resourceLibrary: true, careerPilot: true, aiCommunicationLab: true
    };
    res.status(200).json({ success: true, message: 'Modules fetched', data: tenant.modules || defaults });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

// ── SUPER_ADMIN: update tenant modules ────────────────────────────────────────
export const updateTenantModules = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { tenantId } = req.params;
    const incoming = req.body as Partial<ITenantModules>;
    const allowedKeys: (keyof ITenantModules)[] = [
      'courses', 'attendance', 'quizzes', 'assignments',
      'classRecordings', 'codeAssessments', 'mockInterviews',
      'placement', 'leads', 'marketing', 'feeManagement',
      'thinkingLab', 'speakingPractice', 'resourceLibrary', 'careerPilot', 'aiCommunicationLab'
    ];
    const updateObj: Record<string, boolean> = {};
    for (const key of allowedKeys) {
      if (typeof incoming[key] === 'boolean') {
        updateObj[`modules.${key}`] = incoming[key]!;
      }
    }
    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: updateObj },
      { new: true }
    ).select('modules');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found', error: 'Not found' });
    }
    res.status(200).json({ success: true, message: 'Tenant modules updated', data: tenant.modules });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};