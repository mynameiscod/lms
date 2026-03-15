import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import bcryptjs from 'bcryptjs';

// Get all leads for tenant with filters
export const getLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { stageId, source, assignedTo, search, page = '1', limit = '50' } = req.query;

    const filter: any = { tenantId: req.tenantId };
    if (stageId) filter.stageId = stageId;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('stageId', 'name color order')
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Lead.countDocuments(filter)
    ]);

    res.json({
      success: true,
      message: 'Leads fetched',
      data: { leads, total, page: pageNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads', error: error.message });
  }
};

// Get a single lead by ID
export const getLeadById = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.leadId, tenantId: req.tenantId })
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('activities.createdBy', 'firstName lastName');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead fetched', data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lead', error: error.message });
  }
};

// Create a new lead
export const createLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { name, email, phone, courseInterest, source, stageId, assignedTo, nextFollowUp, notes, customFields } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    // If no stageId provided, use the first stage (lowest order)
    let resolvedStageId = stageId;
    if (!resolvedStageId) {
      const firstStage = await LeadStage.findOne({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 });
      if (!firstStage) {
        return res.status(400).json({ success: false, message: 'No lead stages configured. Please set up lead stages first.' });
      }
      resolvedStageId = firstStage._id;
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      courseInterest: courseInterest || [],
      source: source || 'other',
      stageId: resolvedStageId,
      assignedTo,
      nextFollowUp,
      notes: notes || '',
      customFields: customFields || {},
      tenantId: req.tenantId,
      createdBy: req.user!.id,
      activities: [{
        type: 'created',
        description: 'Lead created',
        createdBy: req.user!.id,
        createdAt: new Date()
      }]
    });

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({ success: true, message: 'Lead created', data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create lead', error: error.message });
  }
};

// Update a lead
export const updateLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { name, email, phone, courseInterest, source, assignedTo, nextFollowUp, notes, interestConcerns, notInterestedReason, customFields } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, tenantId: req.tenantId },
      {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone && { phone }),
        ...(courseInterest && { courseInterest }),
        ...(source && { source }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
        ...(nextFollowUp !== undefined && { nextFollowUp: nextFollowUp || null }),
        ...(notes !== undefined && { notes }),
        ...(interestConcerns !== undefined && { interestConcerns }),
        ...(notInterestedReason !== undefined && { notInterestedReason }),
        ...(customFields !== undefined && { customFields })
      },
      { new: true, runValidators: true }
    )
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead updated', data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update lead', error: error.message });
  }
};

// Change lead stage
export const changeLeadStage = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { stageId, notInterestedReason } = req.body;

    if (!stageId) {
      return res.status(400).json({ success: false, message: 'stageId is required' });
    }

    // Verify stage exists
    const newStage = await LeadStage.findOne({ _id: stageId, tenantId: req.tenantId });
    if (!newStage) {
      return res.status(404).json({ success: false, message: 'Stage not found' });
    }

    // Enforce mandatory reason for "Not Interested"
    if (newStage.name === 'Not Interested' && !notInterestedReason?.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required when marking lead as Not Interested' });
    }

    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId }).populate('stageId', 'name');
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const oldStageName = (lead.stageId as any)?.name || 'Unknown';
    lead.stageId = newStage._id;
    
    if (newStage.name === 'Not Interested') {
      lead.notInterestedReason = notInterestedReason.trim();
    }

    lead.activities.push({
      type: 'status_change',
      description: `Stage changed from "${oldStageName}" to "${newStage.name}"`,
      createdBy: req.user!.id as any,
      createdAt: new Date(),
      metadata: { from: oldStageName, to: newStage.name }
    });
    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.json({ success: true, message: 'Lead stage updated', data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to change stage', error: error.message });
  }
};

// Add activity to a lead
export const addLeadActivity = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { type, description, callOutcome } = req.body;

    if (!type || !description) {
      return res.status(400).json({ success: false, message: 'Activity type and description are required' });
    }

    const validTypes = ['note', 'call', 'email', 'whatsapp', 'status_change', 'assignment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid activity type. Must be one of: ${validTypes.join(', ')}` });
    }

    const validCallOutcomes = ['not_answered', 'not_connected', 'busy', 'rejected', 'connected'];
    if (type === 'call' && callOutcome && !validCallOutcomes.includes(callOutcome)) {
      return res.status(400).json({ success: false, message: `Invalid call outcome. Must be one of: ${validCallOutcomes.join(', ')}` });
    }

    const activityData: any = {
      type,
      description,
      createdBy: req.user!.id,
      createdAt: new Date()
    };
    if (type === 'call' && callOutcome) {
      activityData.callOutcome = callOutcome;
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, tenantId: req.tenantId },
      {
        $push: {
          activities: activityData
        }
      },
      { new: true }
    )
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('activities.createdBy', 'firstName lastName');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, message: 'Activity added', data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add activity', error: error.message });
  }
};

// Delete a lead
export const deleteLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const result = await Lead.findOneAndDelete({ _id: req.params.leadId, tenantId: req.tenantId });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete lead', error: error.message });
  }
};

// Get lead analytics/summary
export const getLeadAnalytics = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const [stageStats, sourceStats, totalLeads, todayFollowUps] = await Promise.all([
      Lead.aggregate([
        { $match: { tenantId: req.tenantId as any } },
        { $group: { _id: '$stageId', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { tenantId: req.tenantId as any } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.countDocuments({ tenantId: req.tenantId }),
      Lead.countDocuments({
        tenantId: req.tenantId,
        nextFollowUp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    // Get stages to map names
    const stages = await LeadStage.find({ tenantId: req.tenantId }).sort({ order: 1 });
    const stageMap = stages.reduce((acc: any, s: any) => {
      acc[s._id.toString()] = { name: s.name, color: s.color };
      return acc;
    }, {});

    const stageData = stageStats.map((s: any) => ({
      stageId: s._id,
      name: stageMap[s._id?.toString()]?.name || 'Unknown',
      color: stageMap[s._id?.toString()]?.color || '#999',
      count: s.count
    }));

    res.json({
      success: true,
      message: 'Analytics fetched',
      data: {
        totalLeads,
        todayFollowUps,
        stageData,
        sourceStats: sourceStats.map((s: any) => ({ source: s._id || 'other', count: s.count }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
};

// Convert lead to student
export const convertToStudent = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { password } = req.body;

    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.convertedStudentId) {
      return res.status(400).json({ success: false, message: 'Lead has already been converted to a student' });
    }

    if (!lead.email) {
      return res.status(400).json({ success: false, message: 'Lead must have an email to convert to student' });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: lead.email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Split name into first and last
    const nameParts = lead.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Create student user
    const student = await User.create({
      email: lead.email,
      firstName,
      lastName,
      password: password || 'Welcome@123',
      role: 'STUDENT',
      tenantId: req.tenantId,
      phone: lead.phone,
      isActive: true,
      profileComplete: false
    });

    // Update lead with converted student reference and move to "Converted" stage
    const convertedStage = await LeadStage.findOne({ tenantId: req.tenantId, name: 'Converted' });
    
    lead.convertedStudentId = student._id;
    if (convertedStage) {
      const oldStage = await LeadStage.findById(lead.stageId);
      lead.stageId = convertedStage._id;
      lead.activities.push({
        type: 'status_change',
        description: `Stage changed from "${oldStage?.name || 'Unknown'}" to "Converted"`,
        createdBy: req.user!.id as any,
        createdAt: new Date(),
        metadata: { from: oldStage?.name, to: 'Converted' }
      });
    }

    lead.activities.push({
      type: 'note',
      description: `Converted to student: ${student.firstName} ${student.lastName} (${student.email})`,
      createdBy: req.user!.id as any,
      createdAt: new Date(),
      metadata: { studentId: student._id }
    });

    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    res.json({ success: true, message: 'Lead converted to student successfully', data: { lead: populated, student } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to convert lead', error: error.message });
  }
};
