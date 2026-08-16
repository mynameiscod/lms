import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest, ApiResponse } from '../types';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import FollowUpReminder from '../models/FollowUpReminder';
import Role from '../models/Role';
import AuditLog from '../models/AuditLog';
import bcryptjs from 'bcryptjs';
import XLSX from 'xlsx';
import { buildLeadScopeFilter, resolveLeadScope } from '../middleware/leadScope';
import { initializeLeadStageHistory, recordStageTransition } from './leadStageHistoryController';
import { linkLeadToCampaign } from './adCampaignController';
import { scoreAndAssignLead } from '../services/leadScoringService';
import { sendLeadWelcomeWhatsApp } from '../services/whatsAppWelcomeService';
import { autoAssignLead } from '../services/leadDistributionService';
import { pushLeadStageChange } from '../services/googleSheetSyncService';
import { scheduleDripOnStageEntry } from '../services/whatsAppDripService';
import leadAIService from '../services/leadAIService';
import { enqueueAICall } from '../services/aiCallQueueService';
import AICallConfig from '../models/AICallConfig';

// Helper to create audit log entries
const auditLog = async (
  req: AuthenticatedRequest,
  action: string,
  details: string,
  targetId?: any,
  metadata?: Record<string, any>
) => {
  try {
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user!.id,
      action,
      module: 'LEAD',
      targetType: 'Lead',
      targetId,
      details,
      metadata,
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err);
  }
};

// Helper to emit real-time events
const emitLeadEvent = (req: AuthenticatedRequest, event: string, data: any) => {
  const io = req.app.get('io');
  if (io && req.tenantId) {
    io.to(`tenant_${req.tenantId}`).emit(event, data);
  }
};

// Build common filter from query params, merged with scope filter
const buildLeadFilter = (query: any, tenantId: string, scopeFilter: Record<string, any> = {}) => {
  const { stageId, source, assignedTo, search, dateFrom, dateTo, priority, hasPendingApproval } = query;
  const filter: any = { tenantId, ...scopeFilter };
  if (stageId) filter.stageId = stageId;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (priority && ['hot', 'warm', 'cold'].includes(priority)) {
    filter.priority = priority;
  }
  if (hasPendingApproval === 'true') {
    filter['pendingApproval.stageId'] = { $exists: true };
  }
  if (search) {
    const searchRegex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { courseInterest: searchRegex }
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

// Get all leads for tenant with filters + data scope
export const getLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const scopeFilter = await buildLeadScopeFilter(req);
    const filter = buildLeadFilter(req.query, req.tenantId!, scopeFilter);

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

    const scope = await resolveLeadScope(req);

    res.json({
      success: true,
      message: 'Leads fetched',
      data: { leads, total, page: pageNum, totalPages: Math.ceil(total / limitNum), scope }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads', error: error.message });
  }
};

// Export leads as CSV (scope-filtered)
export const exportLeads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scopeFilter = await buildLeadScopeFilter(req);
    const filter = buildLeadFilter(req.query, req.tenantId!, scopeFilter);

    const leads = await Lead.find(filter)
      .populate('stageId', 'name')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    // P5: Enhanced export headers
    const headers = [
      'Name', 'Email', 'Phone', 'Source', 'Course Interest',
      'Stage', 'Priority', 'Score',
      'Assigned To', 'Next Follow-up', 'Notes',
      'Language', 'Payment Status', 'Fee Quote (₹)', 'Discount (₹)',
      'Activity Count', 'Last Contact Date',
      'Total Calls', 'Connected Calls',
      'Created At', 'Updated At',
    ];

    const rows = leads.map((lead: any) => {
      const activities = lead.activities || [];
      const callActivities = activities.filter((a: any) => a.type === 'call');
      const connectedCalls = callActivities.filter((a: any) => a.callOutcome === 'connected').length;
      const lastActivity = activities.length > 0 ? activities[activities.length - 1]?.createdAt : undefined;

      return [
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.source || '',
        (lead.courseInterest || []).join('; '),
        lead.stageId?.name || '',
        lead.priority || '',
        lead.score || 0,
        lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '',
        lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
        lead.notes || '',
        lead.language || 'english',
        lead.paymentStatus || 'not_started',
        lead.feeQuote || '',
        lead.feeDiscount || '',
        activities.length,
        lastActivity ? new Date(lastActivity).toISOString().split('T')[0] : '',
        callActivities.length,
        connectedCalls,
        new Date(lead.createdAt).toISOString().split('T')[0],
        new Date(lead.updatedAt).toISOString().split('T')[0],
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-width columns
    const colWidths = headers.map((h, i) => ({
      wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length), 10)
    }));
    ws['!cols'] = colWidths;

    // P5: Add a summary sheet
    const total = leads.length;
    const converted = leads.filter((l: any) => l.convertedStudentId).length;
    const byStage: Record<string, number> = {};
    leads.forEach((l: any) => {
      const s = l.stageId?.name || 'Unknown';
      byStage[s] = (byStage[s] || 0) + 1;
    });
    const summaryData = [
      ['Export Summary', ''],
      ['Generated At', new Date().toISOString()],
      ['Total Leads', total],
      ['Converted', converted],
      ['Conversion Rate', total > 0 ? `${((converted / total) * 100).toFixed(1)}%` : '0%'],
      ['', ''],
      ['Stage Breakdown', ''],
      ...Object.entries(byStage).map(([stage, count]) => [stage, count]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.end(buf);
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

// Get a single lead by ID (scope-enforced)
export const getLeadById = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const scopeFilter = await buildLeadScopeFilter(req);
    const lead = await Lead.findOne({ _id: req.params.leadId, tenantId: req.tenantId, ...scopeFilter })
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('activities.createdBy', 'firstName lastName');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Track first telecaller view + fire-and-forget AI summary on first view
    const isFirstView = !lead.telecallerMetrics?.firstViewedAt;
    if (isFirstView) {
      Lead.findByIdAndUpdate(lead._id, {
        $set: { 'telecallerMetrics.firstViewedAt': new Date() },
      }).exec().catch(console.error);
      // Generate AI summary asynchronously on first view
      leadAIService.getOrGenerateSummary(lead._id as mongoose.Types.ObjectId).catch(console.error);
    }

    res.json({ success: true, message: 'Lead fetched', data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lead', error: error.message });
  }
};

// Create a new lead
export const createLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { name, email, phone, courseInterest, source, stageId, assignedTo, nextFollowUp, notes, customFields, utmParams, campaignId, priority } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    // If no stageId provided, use the first stage (lowest order)
    let resolvedStageId = stageId;
    let resolvedStageName = '';
    if (!resolvedStageId) {
      const firstStage = await LeadStage.findOne({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 });
      if (!firstStage) {
        return res.status(400).json({ success: false, message: 'No lead stages configured. Please set up lead stages first.' });
      }
      resolvedStageId = firstStage._id;
      resolvedStageName = firstStage.name;
    } else {
      const stage = await LeadStage.findById(resolvedStageId);
      resolvedStageName = stage?.name || 'Unknown';
    }

    // Duplicate phone check — last 10 digits match
    const lastTen = phone.replace(/\D/g, '').slice(-10);
    if (lastTen) {
      const dup = await Lead.findOne({
        tenantId: req.tenantId,
        phone: { $regex: lastTen + '$' }
      }).lean();
      if (dup) {
        return res.status(409).json({
          success: false,
          message: 'A lead with this phone number already exists',
          data: { existingLeadId: (dup as any)._id }
        });
      }
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
      campaignId: campaignId || undefined,
      utmParams: utmParams || undefined,
      priority: priority || 'cold',
      tenantId: req.tenantId,
      createdBy: req.user!.id,
      activities: [{
        type: 'created',
        description: 'Lead created',
        createdBy: req.user!.id,
        createdAt: new Date()
      }]
    });

    // Initialize stage history for time tracking
    await initializeLeadStageHistory(
      lead._id as mongoose.Types.ObjectId,
      resolvedStageId,
      resolvedStageName,
      req.user!.id as unknown as mongoose.Types.ObjectId,
      req.tenantId as unknown as mongoose.Types.ObjectId
    );

    // Auto-link to campaign based on UTM params
    if (utmParams && (utmParams.source || utmParams.campaign)) {
      await linkLeadToCampaign(
        lead._id as mongoose.Types.ObjectId,
        utmParams,
        req.tenantId as unknown as mongoose.Types.ObjectId
      );
    }

    // Auto-score and auto-assign lead based on scoring rules
    try {
      console.log(`[LEAD-CREATE] ===== SCORING START for lead ${lead._id} =====`);
      // Source and priority are what scoring turns on; the name and phone are the person.
      // The id above is enough to find them when a scoring run needs investigating.
      console.log(`[LEAD-CREATE] Lead data: source="${lead.source}", priority="${lead.priority}"`);
      console.log(`[LEAD-CREATE] CustomFields type: ${lead.customFields?.constructor?.name}, value:`, lead.customFields instanceof Map ? Object.fromEntries(lead.customFields) : lead.customFields);
      console.log(`[LEAD-CREATE] TenantId: ${req.tenantId}`);
      const scoringResult = await scoreAndAssignLead(lead, req.tenantId as unknown as mongoose.Types.ObjectId);
      console.log(`[LEAD-CREATE] ===== SCORING RESULT: score=${scoringResult.score}, priority=${scoringResult.priority}, eligibility=${scoringResult.eligibility}${scoringResult.assignedTo ? `, auto-assigned=${scoringResult.assignedTo}` : ''} =====`);
    } catch (scoringError) {
      console.error('[LEAD-CREATE] Scoring FAILED:', scoringError);
    }

    // Send WhatsApp welcome message if configured for this source
    sendLeadWelcomeWhatsApp(name, phone, source || 'other', req.tenantId!).catch(err =>
      console.error('[LEAD-CREATE] WhatsApp welcome failed:', err)
    );

    // Auto-distribute lead if tenant has distribution enabled (fire-and-forget)
    autoAssignLead(req.tenantId!, lead._id.toString()).catch(err =>
      console.error('[LEAD-CREATE] autoAssignLead failed:', err)
    );

    // AI Voice Qualification call — enqueue if enabled for this tenant (fire-and-forget)
    AICallConfig.findOne({ tenantId: req.tenantId, enabled: true })
      .then(cfg => {
        if (cfg) {
          Lead.findByIdAndUpdate(lead._id, { aiCallStatus: 'pending' }).exec().catch(() => {});
          enqueueAICall(lead._id.toString(), req.tenantId!, 1).catch(err =>
            console.error('[LEAD-CREATE] AI call enqueue failed:', err)
          );
        }
      })
      .catch(err => console.error('[LEAD-CREATE] AI config lookup failed:', err));

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('campaignId', 'name platform');

    // Audit log
    await auditLog(req, 'CREATE', `Lead created: ${name}`, lead._id, { name, phone, source, utmParams });

    // Real-time notification
    emitLeadEvent(req, 'lead_created', populated);

    // Hot lead real-time alert — emit only to the staff room, not to students
    if (lead.priority === 'hot') {
      const io = req.app.get('io');
      if (io) {
        io.to(`staff_${req.tenantId}`).emit('hot_lead_created', {
          leadId: lead._id,
          leadName: name,
          phone,
          source,
          score: lead.score,
        });
      }
    }

    // Notify assigned user if different from creator
    if (assignedTo && String(assignedTo) !== String(req.user!.id)) {
      const io = req.app.get('io');
      if (io) {
        io.to(`tenant_${req.tenantId}`).emit('lead_assigned', {
          leadId: lead._id,
          leadName: name,
          assignedTo,
          assignedBy: req.user!.id
        });
      }
    }

    res.status(201).json({ success: true, message: 'Lead created', data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create lead', error: error.message });
  }
};

// Update a lead (scope-enforced)
export const updateLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { name, email, phone, courseInterest, source, stageId, assignedTo, nextFollowUp, notes, interestConcerns, notInterestedReason, customFields, priority, demoBookedAt, demoNotes } = req.body;

    const scopeFilter = await buildLeadScopeFilter(req);

    // Fetch the current lead first so we can detect assignedTo changes
    const currentLead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId, ...scopeFilter })
      .populate('assignedTo', 'firstName lastName');

    if (!currentLead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const oldAssignedToId = currentLead.assignedTo ? String((currentLead.assignedTo as any)._id) : null;
    const newAssignedToId = assignedTo !== undefined ? (assignedTo || null) : oldAssignedToId;
    const oldStageId = currentLead.stageId ? String(currentLead.stageId) : null;
    const stageChanged = stageId && stageId !== oldStageId;

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, tenantId: req.tenantId, ...scopeFilter },
      {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone && { phone }),
        ...(courseInterest && { courseInterest }),
        ...(source && { source }),
        ...(stageId && { stageId }),
        ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
        ...(nextFollowUp !== undefined && { nextFollowUp: nextFollowUp || null }),
        ...(notes !== undefined && { notes }),
        ...(interestConcerns !== undefined && { interestConcerns }),
        ...(notInterestedReason !== undefined && { notInterestedReason }),
        ...(customFields !== undefined && { customFields }),
        ...(priority !== undefined && { priority }),
        ...(demoBookedAt !== undefined && { demoBookedAt: demoBookedAt || null }),
        ...(demoNotes !== undefined && { demoNotes })
      },
      { new: true, runValidators: true }
    )
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // If assignedTo changed, record it as an activity in the timeline
    if (assignedTo !== undefined && String(newAssignedToId || '') !== String(oldAssignedToId || '')) {
      let assigneeLabel = 'Unassigned';
      if (newAssignedToId) {
        const newUser = await User.findById(newAssignedToId).select('firstName lastName');
        if (newUser) assigneeLabel = `${(newUser as any).firstName} ${(newUser as any).lastName}`;
      }
      const actorUser = await User.findById(req.user!.id).select('firstName lastName');
      const actorName = actorUser ? `${(actorUser as any).firstName} ${(actorUser as any).lastName}` : 'Someone';
      await Lead.findByIdAndUpdate(leadId, {
        $push: {
          activities: {
            type: 'assignment',
            description: newAssignedToId
              ? `Lead assigned to ${assigneeLabel} by ${actorName}`
              : `Lead unassigned by ${actorName}`,
            createdBy: req.user!.id,
            createdAt: new Date(),
            metadata: { from: oldAssignedToId, to: newAssignedToId }
          }
        }
      });
    }

    // Log stage_change activity when stage was changed via edit form
    if (stageChanged) {
      const newStageDoc = await LeadStage.findById(stageId).select('name');
      const oldStageDoc = oldStageId ? await LeadStage.findById(oldStageId).select('name') : null;
      const actorUser = await User.findById(req.user!.id).select('firstName lastName');
      const actorName = actorUser ? `${(actorUser as any).firstName} ${(actorUser as any).lastName}` : 'Someone';
      await Lead.findByIdAndUpdate(leadId, {
        $push: {
          activities: {
            type: 'status_change', // must match the LeadActivity enum — 'stage_change' is invalid and poisons later lead.save()
            description: `Stage changed from "${oldStageDoc?.name || 'Unknown'}" to "${newStageDoc?.name || 'Unknown'}" by ${actorName}`,
            createdBy: req.user!.id,
            createdAt: new Date(),
            metadata: { from: oldStageId, to: stageId }
          }
        }
      });
    }

    await auditLog(req, 'UPDATE', `Lead updated: ${lead.name}`, lead._id);
    emitLeadEvent(req, 'lead_updated', lead);

    res.json({ success: true, message: 'Lead updated', data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update lead', error: error.message });
  }
};

// Change lead stage (scope-enforced)
export const changeLeadStage = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { stageId, notInterestedReason, reason } = req.body;

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

    const scopeFilter = await buildLeadScopeFilter(req);
    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId, ...scopeFilter }).populate('stageId', 'name');
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Manager approval gate: non-admin users moving to a lost stage need approval
    const userRole = req.user!.role;
    const isAdminUser = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    if ((newStage as any).isLostStage && !isAdminUser) {
      (lead as any).pendingApproval = {
        stageId: newStage._id,
        stageName: newStage.name,
        requestedBy: req.user!.id,
        requestedAt: new Date(),
        reason: reason?.trim() || notInterestedReason?.trim() || '',
      };
      await lead.save();

      // Notify managers via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`tenant_${req.tenantId}`).emit('stage_approval_requested', {
          leadId: lead._id,
          leadName: lead.name,
          requestedStage: newStage.name,
          requestedBy: req.user!.id,
          reason: (lead as any).pendingApproval.reason,
        });
      }
      return res.status(202).json({
        success: true,
        message: `Stage change to "${newStage.name}" requires manager approval`,
        data: { pendingApproval: true },
      });
    }

    const oldStageId = (lead.stageId as any)?._id;
    const oldStageName = (lead.stageId as any)?.name || 'Unknown';
    lead.stageId = newStage._id;
    // Clear any pending approval when admin applies the stage change
    (lead as any).pendingApproval = undefined;
    
    if (newStage.name === 'Not Interested') {
      lead.notInterestedReason = (notInterestedReason || reason || '').trim();
    }

    lead.activities.push({
      type: 'status_change',
      description: `Stage changed from "${oldStageName}" to "${newStage.name}"`,
      createdBy: req.user!.id as any,
      createdAt: new Date(),
      metadata: { from: oldStageName, to: newStage.name }
    });
    await lead.save();

    // Record stage transition for time tracking
    await recordStageTransition(
      lead._id as mongoose.Types.ObjectId,
      oldStageId,
      newStage._id,
      newStage.name,
      req.user!.id as unknown as mongoose.Types.ObjectId,
      req.tenantId as unknown as mongoose.Types.ObjectId
    );

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    await auditLog(req, 'STAGE_CHANGE', `Lead "${lead.name}" moved from "${oldStageName}" to "${newStage.name}"`, lead._id, { from: oldStageName, to: newStage.name });
    emitLeadEvent(req, 'lead_stage_changed', populated);

    // Push stage change to Google Sheet if tenant has push-back configured
    pushLeadStageChange(req.tenantId!, { _id: lead._id, name: lead.name, phone: (lead as any).phone, email: (lead as any).email, assignedTo: (lead as any).assignedTo?.toString() }, oldStageName, newStage.name)
      .catch(err => console.error('[LEAD] pushLeadStageChange failed:', err));

    // P5: Schedule WhatsApp drip messages for new stage
    scheduleDripOnStageEntry(req.tenantId!, lead._id.toString(), newStage.name)
      .catch(err => console.error('[LEAD] scheduleDripOnStageEntry failed:', err));

    res.json({ success: true, message: 'Lead stage updated', data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to change stage', error: error.message });
  }
};

// Approve (or reject) a pending stage change requested by a non-admin user
export const approveStageChange = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { approved, rejectReason } = req.body;

    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId }).populate('stageId', 'name');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const pending = (lead as any).pendingApproval;
    if (!pending?.stageId) {
      return res.status(400).json({ success: false, message: 'No pending stage change for this lead' });
    }

    if (!approved) {
      (lead as any).pendingApproval = undefined;
      lead.activities.push({
        type: 'status_change',
        description: `Stage change to "${pending.stageName}" was rejected by manager${rejectReason ? `: ${rejectReason}` : ''}`,
        createdBy: req.user!.id as any,
        createdAt: new Date(),
      });
      await lead.save();
      emitLeadEvent(req, 'lead_stage_approval_rejected', { leadId: lead._id, leadName: lead.name, stageName: pending.stageName });
      return res.json({ success: true, message: 'Stage change rejected', data: {} });
    }

    // Apply the approved stage change
    const newStage = await LeadStage.findOne({ _id: pending.stageId, tenantId: req.tenantId });
    if (!newStage) return res.status(404).json({ success: false, message: 'Target stage no longer exists' });

    const oldStageId = (lead.stageId as any)?._id;
    const oldStageName = (lead.stageId as any)?.name || 'Unknown';
    lead.stageId = newStage._id;
    (lead as any).pendingApproval = undefined;

    lead.activities.push({
      type: 'status_change',
      description: `Stage changed from "${oldStageName}" to "${newStage.name}" (approved by manager)`,
      createdBy: req.user!.id as any,
      createdAt: new Date(),
      metadata: { from: oldStageName, to: newStage.name, approvedBy: req.user!.id },
    });
    await lead.save();

    await recordStageTransition(
      lead._id as mongoose.Types.ObjectId,
      oldStageId,
      newStage._id,
      newStage.name,
      req.user!.id as unknown as mongoose.Types.ObjectId,
      req.tenantId as unknown as mongoose.Types.ObjectId
    );

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    await auditLog(req, 'STAGE_CHANGE', `Lead "${lead.name}" moved to "${newStage.name}" (manager approved)`, lead._id, { from: oldStageName, to: newStage.name });
    emitLeadEvent(req, 'lead_stage_changed', populated);

    // Push stage change to Google Sheet if tenant has push-back configured
    pushLeadStageChange(req.tenantId!, { _id: lead._id, name: lead.name, phone: (lead as any).phone, email: (lead as any).email, assignedTo: (lead as any).assignedTo?.toString() }, oldStageName, newStage.name)
      .catch(err => console.error('[LEAD] pushLeadStageChange (approved) failed:', err));

    // P5: Schedule WhatsApp drip messages for approved stage
    scheduleDripOnStageEntry(req.tenantId!, lead._id.toString(), newStage.name)
      .catch(err => console.error('[LEAD] scheduleDripOnStageEntry (approved) failed:', err));

    res.json({ success: true, message: `Stage change to "${newStage.name}" approved`, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to approve stage change', error: error.message });
  }
};

// Add activity to a lead
export const addLeadActivity = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { type, description, callOutcome, callDuration, callStatus, disposition } = req.body;

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
    if (type === 'call') {
      if (callOutcome) activityData.callOutcome = callOutcome;
      if (callDuration !== undefined) activityData.callDuration = callDuration;
      if (callStatus) activityData.callStatus = callStatus;
    }
    if (disposition) activityData.disposition = disposition;
    // Attach uploaded recording URL if a file was provided
    if (req.file) {
      activityData.recordingUrl = `/uploads/recordings/${req.file.filename}`;
    }

    const now = new Date();
    const scopeFilter = await buildLeadScopeFilter(req);

    // Check if firstActionAt needs to be set
    const existing = await Lead.findOne({ _id: leadId, tenantId: req.tenantId, ...scopeFilter }).select('telecallerMetrics');
    const metricsUpdate: any = { 'telecallerMetrics.lastActionAt': now };
    if (!existing?.telecallerMetrics?.firstActionAt) {
      metricsUpdate['telecallerMetrics.firstActionAt'] = now;
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, tenantId: req.tenantId, ...scopeFilter },
      {
        $push: { activities: activityData },
        $set: metricsUpdate,
        $inc: { 'telecallerMetrics.totalActions': 1 },
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

// Delete a lead (scope-enforced)
export const deleteLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const scopeFilter = await buildLeadScopeFilter(req);
    const result = await Lead.findOneAndDelete({ _id: req.params.leadId, tenantId: req.tenantId, ...scopeFilter });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    const deletedLead = result as any;
    await auditLog(req, 'DELETE', `Lead deleted: ${deletedLead.name}`, deletedLead._id);
    emitLeadEvent(req, 'lead_deleted', { _id: deletedLead._id });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete lead', error: error.message });
  }
};

// Get lead analytics/summary (scope-filtered, supports optional UI filters)
export const getLeadAnalytics = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const scopeFilter = await buildLeadScopeFilter(req);
    const baseMatch: any = { tenantId: new mongoose.Types.ObjectId(String(req.tenantId)), ...scopeFilter };

    // Apply optional UI filters so stats reflect the same subset as the table
    const { stageId, source, assignedTo, priority, search, dateFrom, dateTo } = req.query as Record<string, string>;
    if (stageId) baseMatch.stageId = new (require('mongoose').Types.ObjectId)(stageId);
    if (source) baseMatch.source = source;
    if (assignedTo) baseMatch.assignedTo = new (require('mongoose').Types.ObjectId)(assignedTo);
    if (priority) baseMatch.priority = priority;
    if (search) baseMatch.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    if (dateFrom || dateTo) {
      baseMatch.createdAt = {};
      if (dateFrom) baseMatch.createdAt.$gte = new Date(dateFrom);
      if (dateTo) baseMatch.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      stageStats,
      sourceStats,
      priorityStats,
      totalLeads,
      todayFollowUps,
      newLeadsToday,
      newLeadsTodayBySource,
      callsTodayByAssigneeResult
    ] = await Promise.all([
      Lead.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$stageId', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Lead.countDocuments(baseMatch),
      Lead.countDocuments({
        ...baseMatch,
        nextFollowUp: {
          $gte: todayStart,
          $lte: todayEnd
        }
      }),
      Lead.countDocuments({
        ...baseMatch,
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd
        }
      }),
      Lead.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: baseMatch },
        { $unwind: '$activities' },
        { $match: {
          'activities.type': 'call',
          'activities.createdAt': { $gte: todayStart, $lte: todayEnd }
        } },
        { $group: { _id: { $ifNull: ['$assignedTo', 'unassigned'] }, count: { $sum: 1 } } }
      ])
    ]);

    const callsToday = (callsTodayByAssigneeResult || []).reduce((sum: number, c: any) => sum + (c.count || 0), 0);

    // Build stageData from ALL stages (not just those with leads) so every
    // configured stats card gets a count, even if currently 0.
    // stageId is always serialised as a plain string to guarantee lookup matches.
    const stages = await LeadStage.find({ tenantId: req.tenantId }).sort({ order: 1 });
    const stageCountMap: Record<string, number> = stageStats.reduce((acc: Record<string, number>, s: any) => {
      if (s._id) acc[s._id.toString()] = s.count;
      return acc;
    }, {});
    const stageData = stages.map((stage: any) => ({
      stageId: stage._id.toString(),
      name: stage.name,
      color: stage.color,
      count: stageCountMap[stage._id.toString()] || 0
    }));

    res.json({
      success: true,
      message: 'Analytics fetched',
      data: {
        totalLeads,
        todayFollowUps,
        callsToday,
        newLeadsToday,
        stageData,
        sourceStats: sourceStats.map((s: any) => ({ source: s._id || 'other', count: s.count })),
        priorityStats: priorityStats.map((p: any) => ({ priority: p._id || 'unknown', count: p.count })),
        newLeadsTodayBySource: newLeadsTodayBySource.map((s: any) => ({ source: s._id || 'other', count: s.count })),
        callsTodayByAssignee: (callsTodayByAssigneeResult || []).map((c: any) => ({ assignedTo: c._id ? String(c._id) : 'unassigned', count: c.count }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
};

// Manager Board — per-employee lead stats (scope-filtered)
export const getManagerBoard = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    // Get all stages
    const stages = await LeadStage.find({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 }).lean();

    const scope = await resolveLeadScope(req);

    // Get custom roles that have lead-related permissions
    const leadPermissions = ['view_leads', 'create_leads', 'edit_leads', 'manage_leads', 'assign_leads'];
    const rolesWithLeadPerms = await Role.find({
      tenantId: req.tenantId,
      permissions: { $in: leadPermissions }
    }).select('_id').lean();
    const roleIds = rolesWithLeadPerms.map(r => r._id);

    // Get staff who can have leads assigned — includes:
    // 1. Users with TENANT_ADMIN, INSTRUCTOR, or STAFF roles
    // 2. Users with custom roles that have lead permissions
    let staffFilter: any = {
      tenantId: req.tenantId,
      isActive: true,
      $or: [
        { role: { $in: ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'] } },
        { customRoleId: { $in: roleIds } }
      ]
    };
    if (scope === 'TEAM') {
      // Manager sees only their direct reports + themselves
      staffFilter = {
        ...staffFilter,
        $and: [
          { $or: staffFilter.$or },
          { $or: [{ managerId: req.user!.id }, { _id: req.user!.id }] }
        ]
      };
      delete staffFilter.$or;
    } else if (scope === 'OWN') {
      staffFilter._id = req.user!.id;
    }

    const staffUsers = await User.find(staffFilter).select('firstName lastName email role customRoleId').lean();

    const scopeFilter = await buildLeadScopeFilter(req);
    const baseMatch: any = { tenantId: new mongoose.Types.ObjectId(String(req.tenantId)), ...scopeFilter };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Aggregate leads per assignee per stage
    const leadsByAssignee = await Lead.aggregate([
      { $match: baseMatch },
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
          ...baseMatch,
          nextFollowUp: { $gte: today, $lte: todayEnd }
        }
      },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    // Count overdue follow-ups per assignee
    const overdueByAssignee = await Lead.aggregate([
      {
        $match: {
          ...baseMatch,
          nextFollowUp: { $lt: today, $ne: null }
        }
      },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);

    // Count completed follow-ups today per assignee
    const completedTodayByAssignee = await FollowUpReminder.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
          status: 'completed',
          completedAt: { $gte: today, $lte: todayEnd }
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

    const completedTodayMap: Record<string, number> = {};
    completedTodayByAssignee.forEach((c: any) => { if (c._id) completedTodayMap[String(c._id)] = c.count; });

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
        completedToday: completedTodayMap[uid] || 0,
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
        completedToday: 0,
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

    await auditLog(req, 'CONVERT', `Lead "${lead.name}" converted to student ${student.email}`, lead._id, { studentId: student._id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to convert lead', error: error.message });
  }
};

// ===================== AUDIT LOGS =====================

export const getLeadAuditLogs = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { page = '1', limit = '50', leadId } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = { tenantId: req.tenantId, module: 'LEAD' };
    if (leadId) filter.targetId = leadId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      message: 'Audit logs fetched',
      data: { logs, total, page: pageNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
  }
};

// ===================== TELECALLER PERFORMANCE =====================

export const getMyPerformance = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // This week (Monday start)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    if (today.getDay() === 0) weekStart.setDate(weekStart.getDate() - 7);

    // This month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Aggregation $match does NOT auto-cast strings to ObjectId (unlike Mongoose
    // queries) — cast explicitly or every activity match returns 0.
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const userOid = new mongoose.Types.ObjectId(userId);

    const [
      totalAssigned,
      todayFollowUps,
      overdueFollowUps,
      todayActivities,
      weekActivities,
      monthActivities,
      stageBreakdown,
      recentActivities
    ] = await Promise.all([
      Lead.countDocuments({ tenantId: req.tenantId, assignedTo: userId }),
      Lead.countDocuments({ tenantId: req.tenantId, assignedTo: userId, nextFollowUp: { $gte: today, $lte: todayEnd } }),
      Lead.countDocuments({ tenantId: req.tenantId, assignedTo: userId, nextFollowUp: { $lt: today, $ne: null } }),
      // Count ALL activities today by this user across all tenant leads
      Lead.aggregate([
        { $match: { tenantId: tenantOid } },
        { $unwind: '$activities' },
        { $match: { 'activities.createdBy': userOid, 'activities.createdAt': { $gte: today, $lte: todayEnd } } },
        { $count: 'count' }
      ]),
      Lead.aggregate([
        { $match: { tenantId: tenantOid } },
        { $unwind: '$activities' },
        { $match: { 'activities.createdBy': userOid, 'activities.createdAt': { $gte: weekStart } } },
        { $count: 'count' }
      ]),
      Lead.aggregate([
        { $match: { tenantId: tenantOid } },
        { $unwind: '$activities' },
        { $match: { 'activities.createdBy': userOid, 'activities.createdAt': { $gte: monthStart } } },
        { $count: 'count' }
      ]),
      Lead.aggregate([
        { $match: { tenantId: tenantOid, assignedTo: userOid } },
        { $group: { _id: '$stageId', count: { $sum: 1 } } }
      ]),
      // Last 10 activities by this user across all leads
      Lead.aggregate([
        { $match: { tenantId: tenantOid } },
        { $unwind: '$activities' },
        { $match: { 'activities.createdBy': userOid } },
        { $sort: { 'activities.createdAt': -1 } },
        { $limit: 10 },
        { $project: { leadName: '$name', leadId: '$_id', activity: '$activities' } }
      ])
    ]);

    // Map stage names
    const stages = await LeadStage.find({ tenantId: req.tenantId }).lean();
    const stageMap: Record<string, string> = {};
    stages.forEach((s: any) => { stageMap[s._id.toString()] = s.name; });

    // Today's breakdown by activity type
    const todayTypeBreakdown = await Lead.aggregate([
      { $match: { tenantId: tenantOid } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdBy': userOid, 'activities.createdAt': { $gte: today, $lte: todayEnd } } },
      { $group: { _id: '$activities.type', count: { $sum: 1 } } }
    ]);
    const todayByType: Record<string, number> = {};
    todayTypeBreakdown.forEach((t: any) => {
      const key = t._id || 'other';
      todayByType[key] = (todayByType[key] || 0) + t.count;
    });
    // Alias: widget reads "stage_change" but activities are logged as "status_change"
    if (todayByType.status_change) todayByType.stage_change = (todayByType.stage_change || 0) + todayByType.status_change;

    // Count unique leads touched today
    const uniqueleadsTouchedToday = await Lead.aggregate([
      { $match: { tenantId: tenantOid } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdBy': userOid, 'activities.createdAt': { $gte: today, $lte: todayEnd } } },
      { $group: { _id: '$_id' } },
      { $count: 'count' }
    ]);

    res.json({
      success: true,
      message: 'Performance data fetched',
      data: {
        totalAssigned,
        todayFollowUps,
        overdueFollowUps,
        todayActivities: todayActivities[0]?.count || 0,
        weekActivities: weekActivities[0]?.count || 0,
        monthActivities: monthActivities[0]?.count || 0,
        todayByType,
        uniqueleadsTouchedToday: uniqueleadsTouchedToday[0]?.count || 0,
        stageBreakdown: stageBreakdown.map((s: any) => ({
          stageId: s._id,
          name: stageMap[s._id?.toString()] || 'Unknown',
          count: s.count
        })),
        recentActivities
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch performance data', error: error.message });
  }
};

// ===================== TEAM ACTIVITY REPORT (per-person, daily) =====================

export const getTeamActivity = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const { date, from, to } = req.query as any;

    let start: Date, end: Date;
    if (from || to) {
      start = from ? new Date(from) : new Date(0);
      end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      const d = date ? new Date(date) : new Date();
      start = new Date(d); start.setHours(0, 0, 0, 0);
      end = new Date(d); end.setHours(23, 59, 59, 999);
    }

    const rows = await Lead.aggregate([
      { $match: { tenantId: tenantOid } },
      { $unwind: '$activities' },
      { $match: { 'activities.createdAt': { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$activities.createdBy',
          total: { $sum: 1 },
          call: { $sum: { $cond: [{ $eq: ['$activities.type', 'call'] }, 1, 0] } },
          whatsapp: { $sum: { $cond: [{ $eq: ['$activities.type', 'whatsapp'] }, 1, 0] } },
          note: { $sum: { $cond: [{ $eq: ['$activities.type', 'note'] }, 1, 0] } },
          email: { $sum: { $cond: [{ $eq: ['$activities.type', 'email'] }, 1, 0] } },
          stageMoves: { $sum: { $cond: [{ $in: ['$activities.type', ['status_change', 'stage_change']] }, 1, 0] } },
          leads: { $addToSet: '$_id' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const userIds = rows.map((r: any) => r._id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email role').lean();
    const userMap: Record<string, any> = {};
    users.forEach((u: any) => { userMap[String(u._id)] = u; });

    const data = rows.map((r: any) => {
      const u = userMap[String(r._id)];
      return {
        userId: r._id ? String(r._id) : null,
        name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email : 'Unknown / System',
        email: u?.email || '',
        role: u?.role || '',
        total: r.total,
        call: r.call,
        whatsapp: r.whatsapp,
        note: r.note,
        email_count: r.email,
        stageMoves: r.stageMoves,
        leadsTouched: (r.leads || []).length,
      };
    });

    const totals = data.reduce((acc: any, r: any) => ({
      total: acc.total + r.total, call: acc.call + r.call, whatsapp: acc.whatsapp + r.whatsapp,
      note: acc.note + r.note, stageMoves: acc.stageMoves + r.stageMoves,
    }), { total: 0, call: 0, whatsapp: 0, note: 0, stageMoves: 0 });

    res.json({ success: true, message: 'Team activity fetched', data: { rows: data, totals, range: { start, end } } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch team activity', error: error.message });
  }
};

// ===================== TEAM ACTIVITY DRILL-DOWN =====================
// Returns the individual activities (with lead details) behind a clicked metric
// on the Team Activity page — e.g. clicking a member's "Calls" count lists every
// call they logged in the period, with the lead it was on.

export const getTeamActivityDetails = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const { date, from, to, userId, type } = req.query as any;

    let start: Date, end: Date;
    if (from || to) {
      start = from ? new Date(from) : new Date(0);
      end = to ? new Date(to) : new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      const d = date ? new Date(date) : new Date();
      start = new Date(d); start.setHours(0, 0, 0, 0);
      end = new Date(d); end.setHours(23, 59, 59, 999);
    }

    // Map the clicked metric to the underlying activity type(s).
    // 'total' / 'leadsTouched' => no type filter (all activities).
    const typeFilter: Record<string, string[]> = {
      call: ['call'],
      whatsapp: ['whatsapp'],
      note: ['note'],
      email: ['email'],
      stageMoves: ['status_change', 'stage_change'],
    };
    const types = typeFilter[type as string];

    const activityMatch: any = { 'activities.createdAt': { $gte: start, $lte: end } };
    // userId may be the string "null" for the "Unknown / System" row.
    if (userId && userId !== 'null') {
      activityMatch['activities.createdBy'] = new mongoose.Types.ObjectId(userId);
    } else {
      activityMatch['activities.createdBy'] = null;
    }
    if (types) {
      activityMatch['activities.type'] = { $in: types };
    }

    // "Leads Touched" → one rich card per DISTINCT lead the member acted on:
    // when the lead entered the portal, its source, current stage & owner, what
    // the member did this period, and the lead's full activity/change timeline.
    if (type === 'leadsTouched') {
      const TYPE_LABEL: Record<string, string> = {
        call: 'Call', whatsapp: 'WhatsApp', note: 'Note', email: 'Email',
        status_change: 'Stage move', stage_change: 'Stage move', assignment: 'Assignment',
        created: 'Created', meeting: 'Meeting', content_shared: 'Content shared',
      };
      // 1) which leads this member touched in the period (+ their period summary)
      const grouped = await Lead.aggregate([
        { $match: { tenantId: tenantOid } },
        { $unwind: '$activities' },
        { $match: activityMatch },
        {
          $group: {
            _id: '$_id',
            count: { $sum: 1 },
            types: { $addToSet: '$activities.type' },
            lastAt: { $max: '$activities.createdAt' },
          },
        },
        { $sort: { lastAt: -1 } },
        { $limit: 200 },
      ]);
      const ids = grouped.map((g: any) => g._id);
      const summaryMap: Record<string, any> = {};
      grouped.forEach((g: any) => { summaryMap[String(g._id)] = g; });

      // 2) full details for those leads (stage, owner, source, entry date, timeline)
      const leads = await Lead.find({ _id: { $in: ids } })
        .select('name phone email source createdAt stageId assignedTo activities')
        .populate('stageId', 'name')
        .populate('assignedTo', 'firstName lastName')
        .populate('activities.createdBy', 'firstName lastName email')
        .lean();

      const items = leads.map((l: any) => {
        const g = summaryMap[String(l._id)] || {};
        const timeline = (l.activities || [])
          .slice()
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50)
          .map((a: any) => {
            const u = a.createdBy;
            return {
              type: a.type,
              typeLabel: TYPE_LABEL[a.type] || a.type,
              description: a.description,
              callOutcome: a.callOutcome,
              byName: u ? (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email) : 'System',
              at: a.createdAt,
            };
          });
        return {
          leadId: l._id,
          leadName: l.name,
          phone: l.phone,
          email: l.email,
          source: l.source || '',
          enteredAt: l.createdAt,
          stageName: l.stageId?.name || '',
          assignedToName: l.assignedTo ? `${l.assignedTo.firstName || ''} ${l.assignedTo.lastName || ''}`.trim() : '',
          touchedCount: g.count || 0,
          touchedTypes: Array.from(new Set((g.types || []).map((t: string) => TYPE_LABEL[t] || t))),
          lastAt: g.lastAt || l.createdAt,
          totalActivities: (l.activities || []).length,
          timeline,
        };
      });
      items.sort((a: any, b: any) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
      return res.json({ success: true, message: 'Leads touched fetched', data: { items, range: { start, end } } });
    }

    const items = await Lead.aggregate([
      { $match: { tenantId: tenantOid } },
      { $unwind: '$activities' },
      { $match: activityMatch },
      { $sort: { 'activities.createdAt': -1 } },
      { $limit: 500 },
      {
        $project: {
          _id: 0,
          leadId: '$_id',
          leadName: '$name',
          phone: '$phone',
          email: '$email',
          activityType: '$activities.type',
          description: '$activities.description',
          callOutcome: '$activities.callOutcome',
          metadata: '$activities.metadata',
          createdAt: '$activities.createdAt',
        },
      },
    ]);

    res.json({ success: true, message: 'Activity details fetched', data: { items, range: { start, end } } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch activity details', error: error.message });
  }
};

// GET /leads/sources — distinct source values actually present on leads, so the
// All-Leads "Source" filter always lists every real source (e.g. google_sheet)
export const getLeadSources = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const sources = await Lead.distinct('source', { tenantId: tenantOid });
    res.json({ success: true, message: 'Lead sources fetched', data: (sources || []).filter(Boolean).sort() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch lead sources', error: error.message });
  }
};

// ===================== QUICK STATUS UPDATE (Telecaller) =====================

export const quickUpdateLead = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const { stageId, nextFollowUp, activityType, activityDescription, callOutcome, notes } = req.body;

    const scopeFilter = await buildLeadScopeFilter(req);
    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId, ...scopeFilter });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Update stage if provided
    if (stageId && String(stageId) !== String(lead.stageId)) {
      const newStage = await LeadStage.findOne({ _id: stageId, tenantId: req.tenantId });
      if (newStage) {
        const oldStage = await LeadStage.findById(lead.stageId);
        lead.stageId = newStage._id;
        lead.activities.push({
          type: 'status_change',
          description: `Stage changed from "${oldStage?.name || 'Unknown'}" to "${newStage.name}"`,
          createdBy: req.user!.id as any,
          createdAt: new Date(),
          metadata: { from: oldStage?.name, to: newStage.name }
        });
      }
    }

    // Update follow-up
    if (nextFollowUp !== undefined) {
      lead.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : undefined;
    }

    // Update notes (telecaller-friendly)
    if (notes !== undefined) {
      (lead as any).notes = notes;
    }

    // Add activity if provided
    if (activityType && activityDescription) {
      const activityData: any = {
        type: activityType,
        description: activityDescription,
        createdBy: req.user!.id,
        createdAt: new Date()
      };
      if (activityType === 'call' && callOutcome) {
        activityData.callOutcome = callOutcome;
      }
      lead.activities.push(activityData);
    }

    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate('stageId', 'name color order')
      .populate('assignedTo', 'firstName lastName email');

    emitLeadEvent(req, 'lead_updated', populated);
    res.json({ success: true, message: 'Lead updated', data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update lead', error: error.message });
  }
};

// ===================== LEAD AGING REPORT =====================

export const getAgingLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { stageId, days = '7' } = req.query;
    const daysNum = Math.max(1, parseInt(days as string, 10) || 7);
    const cutoff = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const scopeFilter = await buildLeadScopeFilter(req);
    const match: any = {
      tenantId: req.tenantId as any,
      ...scopeFilter,
      updatedAt: { $lte: cutoff },
    };
    if (stageId) {
      match.stageId = new mongoose.Types.ObjectId(stageId as string);
    }

    const leads = await Lead.find(match)
      .select('name phone email priority stageId assignedTo updatedAt createdAt source')
      .populate('stageId', 'name color')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ updatedAt: 1 })
      .limit(200)
      .lean();

    const now = Date.now();
    const annotated = leads.map((l: any) => ({
      ...l,
      daysStuck: Math.floor((now - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    res.json({ success: true, message: 'Aging leads fetched', data: annotated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch aging leads', error: error.message });
  }
};

// ===================== DUPLICATE LEAD DETECTION =====================

export const getDuplicateLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const groups = await Lead.aggregate([
      { $match: { tenantId: req.tenantId as any } },
      {
        $addFields: {
          last10: { $substr: [{ $replaceAll: { input: '$phone', find: ' ', replacement: '' } }, -10, 10] },
        },
      },
      {
        $group: {
          _id: '$last10',
          leads: { $push: { _id: '$_id', name: '$name', phone: '$phone', email: '$email', stageId: '$stageId', createdAt: '$createdAt', source: '$source' } },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);

    res.json({ success: true, message: 'Duplicate groups fetched', data: groups });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to detect duplicates', error: error.message });
  }
};

// ===================== MERGE DUPLICATE LEADS =====================

export const mergeDuplicateLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { primaryLeadId, duplicateLeadIds } = req.body as { primaryLeadId: string; duplicateLeadIds: string[] };

    if (!primaryLeadId || !Array.isArray(duplicateLeadIds) || duplicateLeadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'primaryLeadId and duplicateLeadIds[] required' });
    }

    const primary = await Lead.findOne({ _id: primaryLeadId, tenantId: req.tenantId });
    if (!primary) return res.status(404).json({ success: false, message: 'Primary lead not found' });

    const duplicates = await Lead.find({ _id: { $in: duplicateLeadIds }, tenantId: req.tenantId });

    for (const dup of duplicates) {
      for (const act of dup.activities) {
        primary.activities.push(act);
      }
      if (dup.notes) {
        primary.notes = (primary.notes ? primary.notes + '\n' : '') + `[Merged from ${dup.name}] ${dup.notes}`;
      }
    }

    primary.activities.push({
      type: 'note',
      description: `Merged ${duplicates.length} duplicate lead(s): ${duplicates.map((d: any) => d.name).join(', ')}`,
      createdBy: req.user!.id as any,
      createdAt: new Date(),
    });

    await primary.save();
    await Lead.deleteMany({ _id: { $in: duplicateLeadIds }, tenantId: req.tenantId });
    await auditLog(req, 'MERGE', `Merged ${duplicates.length} duplicate leads into ${primary.name}`, primary._id as any, { duplicateLeadIds });

    res.json({ success: true, message: `Merged ${duplicates.length} lead(s) into primary`, data: { primaryLeadId } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to merge leads', error: error.message });
  }
};

// ===================== DEEP FUNNEL ANALYTICS =====================
// GET /api/v1/leads/funnel-analytics?dateFrom=&dateTo=&assignedTo=

export const getFunnelAnalytics = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const scopeFilter = await buildLeadScopeFilter(req);
    const { dateFrom, dateTo, assignedTo } = req.query;

    const baseMatch: any = { tenantId: new mongoose.Types.ObjectId(String(req.tenantId)), ...scopeFilter };
    if (dateFrom) baseMatch.createdAt = { ...baseMatch.createdAt, $gte: new Date(String(dateFrom)) };
    if (dateTo) {
      const end = new Date(String(dateTo)); end.setHours(23, 59, 59, 999);
      baseMatch.createdAt = { ...baseMatch.createdAt, $lte: end };
    }
    if (assignedTo) baseMatch.assignedTo = new mongoose.Types.ObjectId(String(assignedTo));

    const stages = await LeadStage.find({ tenantId: req.tenantId, isActive: true }).sort({ order: 1 }).lean();

    const [
      stageCountsRaw,
      sourceStatsRaw,
      priorityStats,
      conversionRate,
      avgDaysInStage,
      callOutcomesRaw,
      teamSLARaw,
    ] = await Promise.all([
      // Per-stage lead counts
      Lead.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$stageId', count: { $sum: 1 } } },
      ]),

      // Per-source conversion snapshot
      Lead.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$source',
            total: { $sum: 1 },
            converted: { $sum: { $cond: [{ $ifNull: ['$convertedStudentId', false] }, 1, 0] } },
            hot: { $sum: { $cond: [{ $eq: ['$priority', 'hot'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Priority distribution
      Lead.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      // Overall conversion count
      Lead.countDocuments({ ...baseMatch, convertedStudentId: { $exists: true, $ne: null } }),

      // Average age (createdAt → now) per stage in days
      Lead.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$stageId',
            avgAgeDays: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), '$createdAt'] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        },
      ]),

      // Call outcome distribution
      Lead.aggregate([
        { $match: baseMatch },
        { $unwind: '$activities' },
        { $match: { 'activities.type': 'call', 'activities.callOutcome': { $exists: true } } },
        { $group: { _id: '$activities.callOutcome', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Team SLA — avg hours from createdAt to first activity per assignee
      Lead.aggregate([
        { $match: { ...baseMatch, 'telecallerMetrics.firstActionAt': { $exists: true } } },
        {
          $addFields: {
            responseHours: {
              $divide: [
                { $subtract: ['$telecallerMetrics.firstActionAt', '$createdAt'] },
                1000 * 60 * 60,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$assignedTo',
            avgResponseHours: { $avg: '$responseHours' },
            total: { $sum: 1 },
          },
        },
        { $sort: { avgResponseHours: 1 } },
        { $limit: 20 },
      ]),
    ]);

    // Build stage funnel with drop-off
    const stageMap: Record<string, any> = {};
    stages.forEach((s: any) => { stageMap[s._id.toString()] = s; });

    const stageCounts: Record<string, number> = {};
    stageCountsRaw.forEach((s: any) => { stageCounts[s._id?.toString()] = s.count; });

    const totalLeads = Object.values(stageCounts).reduce((a, b) => a + b, 0);

    const funnelStages = stages.map((s: any, idx: number) => {
      const count = stageCounts[s._id.toString()] || 0;
      const prevCount = idx > 0 ? (stageCounts[stages[idx - 1]._id.toString()] || 0) : totalLeads;
      const dropOff = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
      return {
        stageId: s._id,
        name: s.name,
        color: s.color,
        category: s.category,
        count,
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
        dropOff: idx === 0 ? 0 : dropOff,
        isBottleneck: dropOff > 50 && idx > 0,
      };
    });

    // Avg age per stage
    const avgAgeMap: Record<string, number> = {};
    avgDaysInStage.forEach((s: any) => { avgAgeMap[s._id?.toString()] = Math.round(s.avgAgeDays || 0); });

    // Populate team SLA with names
    const teamUserIds = teamSLARaw.map((t: any) => t._id).filter(Boolean);
    const teamUsers = await User.find({ _id: { $in: teamUserIds } }).select('firstName lastName').lean();
    const userNameMap: Record<string, string> = {};
    teamUsers.forEach((u: any) => { userNameMap[u._id.toString()] = `${u.firstName} ${u.lastName}`; });

    const teamSLA = teamSLARaw.map((t: any) => ({
      userId: t._id,
      name: userNameMap[String(t._id)] || 'Unknown',
      avgResponseHours: Math.round((t.avgResponseHours || 0) * 10) / 10,
      totalLeads: t.total,
      slaStatus: t.avgResponseHours <= 2 ? 'good' : t.avgResponseHours <= 8 ? 'warning' : 'critical',
    }));

    res.json({
      success: true,
      message: 'Funnel analytics fetched',
      data: {
        summary: {
          totalLeads,
          converted: conversionRate,
          conversionRate: totalLeads > 0 ? Math.round((conversionRate / totalLeads) * 100) : 0,
        },
        funnelStages: funnelStages.map((s) => ({
          ...s,
          avgAgeDays: avgAgeMap[s.stageId?.toString()] || 0,
        })),
        sourcePerformance: sourceStatsRaw.map((s: any) => ({
          source: s._id || 'other',
          total: s.total,
          converted: s.converted,
          hot: s.hot,
          conversionRate: s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0,
          hotRate: s.total > 0 ? Math.round((s.hot / s.total) * 100) : 0,
        })),
        priorityDistribution: priorityStats.map((p: any) => ({
          priority: p._id || 'cold',
          count: p.count,
        })),
        callOutcomes: callOutcomesRaw.map((c: any) => ({
          outcome: c._id,
          count: c.count,
        })),
        teamSLA,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch funnel analytics', error: error.message });
  }
};

// ─── P5: Update fee & payment info ──────────────────────────────────────────
export const updateLeadFee = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const allowed = ['feeQuote', 'feeDiscount', 'feeDiscountApproved', 'paymentStatus', 'paymentNotes', 'depositAmount', 'depositPaidAt'];
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Track discount approvals
    if (update.feeDiscountApproved === true) {
      update.feeDiscountApprovedBy = req.user!.id;
    }

    Object.assign(lead, update);

    // Log payment status changes as activity
    if (update.paymentStatus) {
      lead.activities.push({
        type: 'status_change',
        description: `Payment status updated to: ${update.paymentStatus}`,
        createdBy: req.user!.id as any,
        createdAt: new Date(),
      });
    }

    await lead.save();
    await auditLog(req, 'UPDATE', `Lead fee/payment updated for "${lead.name}"`, lead._id, update);
    emitLeadEvent(req, 'lead_updated', { _id: lead._id, ...update });

    res.json({ success: true, message: 'Fee updated', data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update fee', error: error.message });
  }
};

// ─── STALE FOLLOWUP LEADS ────────────────────────────────────────────────────
// Returns leads in configured stages that have had no logged activity
// for more than `days` days (default 2). Grouped by assigned BDM.
export const getStaleFollowupLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const staleDays = parseInt((req.query.days as string) || '2', 10);
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    const rawStageIds = req.query.stageIds as string | undefined;

    let targetStages: any[];
    if (rawStageIds) {
      // Caller explicitly selected stages
      const ids = rawStageIds.split(',').map(id => id.trim()).filter(Boolean);
      targetStages = await LeadStage.find({ tenantId: req.tenantId, _id: { $in: ids } }).select('_id name color');
    } else {
      // Fallback: auto-detect "followup"-named stages
      targetStages = await LeadStage.find({
        tenantId: req.tenantId,
        name: { $regex: /followup|follow.up|follow up/i },
      }).select('_id name color');
    }

    if (targetStages.length === 0) {
      return res.json({ success: true, message: 'No matching stages found', data: { leads: [], byBDM: [], total: 0 } });
    }

    const stageIds = targetStages.map(s => s._id);

    // Leads in followup stages where lastActionAt is null or before cutoff
    const staleLeads = await Lead.find({
      tenantId: req.tenantId,
      stageId: { $in: stageIds },
      $or: [
        { 'telecallerMetrics.lastActionAt': { $exists: false } },
        { 'telecallerMetrics.lastActionAt': null },
        { 'telecallerMetrics.lastActionAt': { $lt: cutoff } },
      ],
    })
      .populate('stageId', 'name color')
      .populate('assignedTo', 'firstName lastName email')
      .select('name phone email stageId assignedTo telecallerMetrics createdAt updatedAt nextFollowUp')
      .sort({ 'telecallerMetrics.lastActionAt': 1 }) // most stale first
      .limit(200)
      .lean();

    // Compute days stale per lead
    const enriched = staleLeads.map((lead: any) => {
      const lastActivity = lead.telecallerMetrics?.lastActionAt;
      const refDate = lastActivity ? new Date(lastActivity) : new Date(lead.createdAt);
      const daysStale = Math.floor((Date.now() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      return { ...lead, daysStale, lastActivityAt: lastActivity || null };
    });

    // Group by BDM
    const bdmMap: Record<string, any> = {};
    for (const lead of enriched) {
      const bdm = lead.assignedTo as any;
      const key = bdm?._id?.toString() || 'unassigned';
      if (!bdmMap[key]) {
        bdmMap[key] = {
          bdmId: key,
          bdmName: bdm ? `${bdm.firstName} ${bdm.lastName}` : 'Unassigned',
          bdmEmail: bdm?.email || '',
          leads: [],
          maxDaysStale: 0,
        };
      }
      bdmMap[key].leads.push(lead);
      if (lead.daysStale > bdmMap[key].maxDaysStale) bdmMap[key].maxDaysStale = lead.daysStale;
    }

    const byBDM = Object.values(bdmMap).sort((a: any, b: any) => b.maxDaysStale - a.maxDaysStale);

    res.json({
      success: true,
      message: 'Stale followup leads fetched',
      data: { leads: enriched, byBDM, total: enriched.length, staleDays, followupStages: targetStages },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch stale leads', error: error.message });
  }
};
