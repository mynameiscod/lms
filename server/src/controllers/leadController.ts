import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import bcryptjs from 'bcryptjs';

// Build common filter from query params
const buildLeadFilter = (query: any, tenantId: string) => {
  const { stageId, source, assignedTo, search, dateFrom, dateTo } = query;
  const filter: any = { tenantId };
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
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(String(dateFrom));
    if (dateTo) {
      const endDate = new Date(String(dateTo));
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }
  return filter;
};

// Get all leads for tenant with filters
export const getLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const filter = buildLeadFilter(req.query, req.tenantId!);

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

// Export leads as CSV
export const exportLeads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter = buildLeadFilter(req.query, req.tenantId!);

    const leads = await Lead.find(filter)
      .populate('stageId', 'name')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    // Build CSV
    const headers = ['Name', 'Email', 'Phone', 'Source', 'Course Interest', 'Stage', 'Assigned To', 'Next Follow-up', 'Notes', 'Created At'];
    const escapeCSV = (val: string) => {
      if (!val) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const rows = leads.map((lead: any) => [
      escapeCSV(lead.name),
      escapeCSV(lead.email || ''),
      escapeCSV(lead.phone),
      escapeCSV(lead.source),
      escapeCSV((lead.courseInterest || []).join('; ')),
      escapeCSV(lead.stageId?.name || ''),
      escapeCSV(lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : ''),
      escapeCSV(lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : ''),
      escapeCSV(lead.notes || ''),
      escapeCSV(new Date(lead.createdAt).toISOString().split('T')[0])
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads_export.csv');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to export leads', error: error.message });
  }
};

// Import leads from CSV
export const importLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ success: false, message: 'CSV data is required' });
    }

    // Parse CSV
    const lines = csvData.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV must have a header row and at least one data row' });
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

    // Map header names to field keys
    const fieldMap: Record<string, string> = {
      'name': 'name', 'email': 'email', 'phone': 'phone',
      'source': 'source', 'course interest': 'courseInterest',
      'notes': 'notes', 'next follow-up': 'nextFollowUp', 'next followup': 'nextFollowUp'
    };

    // Get first stage for default
    const firstStage = await LeadStage.findOne({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 });
    if (!firstStage) {
      return res.status(400).json({ success: false, message: 'No lead stages configured' });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          const key = fieldMap[h];
          if (key && idx < values.length) {
            row[key] = values[idx].trim();
          }
        });

        if (!row.name || !row.phone) {
          skipped++;
          errors.push(`Row ${i + 1}: Missing name or phone`);
          continue;
        }

        await Lead.create({
          name: row.name,
          email: row.email || undefined,
          phone: row.phone,
          source: row.source || 'other',
          courseInterest: row.courseInterest ? row.courseInterest.split(';').map(s => s.trim()).filter(Boolean) : [],
          notes: row.notes || '',
          nextFollowUp: row.nextFollowUp || undefined,
          stageId: firstStage._id,
          tenantId: req.tenantId,
          createdBy: req.user!.id,
          activities: [{ type: 'created', description: 'Imported from CSV', createdBy: req.user!.id, createdAt: new Date() }]
        });
        imported++;
      } catch (rowErr: any) {
        skipped++;
        errors.push(`Row ${i + 1}: ${rowErr.message}`);
      }
    }

    res.json({
      success: true,
      message: `Imported ${imported} leads${skipped > 0 ? `, skipped ${skipped}` : ''}`,
      data: { imported, skipped, errors: errors.slice(0, 10) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to import leads', error: error.message });
  }
};

// Helper to parse a CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

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

// Manager Board — per-employee lead stats
export const getManagerBoard = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    // Get all stages
    const stages = await LeadStage.find({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 }).lean();

    // Get staff who can have leads assigned
    const staffUsers = await User.find({
      tenantId: req.tenantId,
      role: { $in: ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'] },
      isActive: true
    }).select('firstName lastName email role').lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Aggregate leads per assignee per stage
    const leadsByAssignee = await Lead.aggregate([
      { $match: { tenantId: req.tenantId as any } },
      {
        $group: {
          _id: { assignedTo: '$assignedTo', stageId: '$stageId' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Count today's follow-ups per assignee
    const followUpsByAssignee = await Lead.aggregate([
      {
        $match: {
          tenantId: req.tenantId as any,
          nextFollowUp: { $gte: today, $lte: todayEnd }
        }
      },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    // Count overdue follow-ups per assignee
    const overdueByAssignee = await Lead.aggregate([
      {
        $match: {
          tenantId: req.tenantId as any,
          nextFollowUp: { $lt: today, $ne: null }
        }
      },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    // Build per-employee data
    const stageMap = stages.reduce((acc: any, s: any) => {
      acc[s._id.toString()] = { name: s.name, color: s.color, order: s.order };
      return acc;
    }, {});

    const followUpMap: Record<string, number> = {};
    followUpsByAssignee.forEach((f: any) => { followUpMap[String(f._id || 'unassigned')] = f.count; });

    const overdueMap: Record<string, number> = {};
    overdueByAssignee.forEach((o: any) => { overdueMap[String(o._id || 'unassigned')] = o.count; });

    // Group counts by assignee
    const assigneeData: Record<string, { total: number; stages: Record<string, number> }> = {};
    leadsByAssignee.forEach((item: any) => {
      const aId = String(item._id.assignedTo || 'unassigned');
      const sId = String(item._id.stageId);
      if (!assigneeData[aId]) assigneeData[aId] = { total: 0, stages: {} };
      assigneeData[aId].total += item.count;
      assigneeData[aId].stages[sId] = item.count;
    });

    // Build final response
    const employees = staffUsers.map((user: any) => {
      const uid = user._id.toString();
      const data = assigneeData[uid] || { total: 0, stages: {} };
      return {
        _id: uid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        totalLeads: data.total,
        todayFollowUps: followUpMap[uid] || 0,
        overdueFollowUps: overdueMap[uid] || 0,
        stageBreakdown: stages.map((s: any) => ({
          stageId: s._id.toString(),
          name: s.name,
          color: s.color,
          count: data.stages[s._id.toString()] || 0
        }))
      };
    });

    // Add unassigned bucket
    const unassignedData = assigneeData['unassigned'] || { total: 0, stages: {} };
    if (unassignedData.total > 0) {
      employees.push({
        _id: 'unassigned',
        firstName: 'Unassigned',
        lastName: '',
        email: '',
        role: '',
        totalLeads: unassignedData.total,
        todayFollowUps: followUpMap['unassigned'] || 0,
        overdueFollowUps: overdueMap['unassigned'] || 0,
        stageBreakdown: stages.map((s: any) => ({
          stageId: s._id.toString(),
          name: s.name,
          color: s.color,
          count: unassignedData.stages[s._id.toString()] || 0
        }))
      });
    }

    // Sort: most leads first
    employees.sort((a: any, b: any) => b.totalLeads - a.totalLeads);

    res.json({
      success: true,
      message: 'Manager board data fetched',
      data: { employees, stages }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch manager board', error: error.message });
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
