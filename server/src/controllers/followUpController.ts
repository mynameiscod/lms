import { Response } from 'express';
import mongoose from 'mongoose';
import FollowUpReminder from '../models/FollowUpReminder';
import Lead from '../models/Lead';
import { AuthenticatedRequest } from '../types';

// ===================== CREATE FOLLOW-UP =====================

export const createFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { 
      leadId, type, title, description, scheduledAt, reminderAt,
      meetingLink, meetingLocation, meetingDuration, priority, assignedTo 
    } = req.body;

    // Validate lead exists
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const followUp = new FollowUpReminder({
      tenantId,
      leadId,
      assignedTo: assignedTo || lead.assignedTo || userId,
      type,
      title,
      description,
      scheduledAt: new Date(scheduledAt),
      reminderAt: reminderAt ? new Date(reminderAt) : undefined,
      meetingLink,
      meetingLocation,
      meetingDuration,
      priority: priority || 'medium',
      createdBy: userId
    });

    await followUp.save();

    // Update lead's nextFollowUp
    if (!lead.nextFollowUp || new Date(scheduledAt) < lead.nextFollowUp) {
      lead.nextFollowUp = new Date(scheduledAt);
      await lead.save();
    }

    // Add activity to lead
    lead.activities.push({
      type: 'note',
      description: `Follow-up scheduled: ${title} for ${new Date(scheduledAt).toLocaleString()}`,
      createdBy: new mongoose.Types.ObjectId(userId as string),
      createdAt: new Date()
    });
    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Follow-up created',
      data: followUp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET MY FOLLOW-UPS =====================

export const getMyFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { status, type, date, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId, assignedTo: userId };

    if (status) query.status = status;
    if (type) query.type = type;
    
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      query.scheduledAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [followUps, total] = await Promise.all([
      FollowUpReminder.find(query)
        .populate('leadId', 'name phone email')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      FollowUpReminder.countDocuments(query)
    ]);

    res.json({
      success: true,
      message: 'Follow-ups retrieved',
      data: followUps,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET TODAY'S FOLLOW-UPS (DASHBOARD) =====================

export const getTodayFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { assignedTo } = req.query;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
      tenantId,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'pending'] }
    };

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const followUps = await FollowUpReminder.find(query)
      .populate('leadId', 'name phone email stageId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ scheduledAt: 1 });

    // Group by type
    const grouped = {
      calls: followUps.filter(f => f.type === 'call'),
      one_on_ones: followUps.filter(f => f.type === 'one_on_one'),
      whatsapp: followUps.filter(f => f.type === 'whatsapp'),
      other: followUps.filter(f => !['call', 'one_on_one', 'whatsapp'].includes(f.type))
    };

    res.json({
      success: true,
      message: 'Today\'s follow-ups retrieved',
      data: {
        all: followUps,
        grouped,
        counts: {
          total: followUps.length,
          calls: grouped.calls.length,
          one_on_ones: grouped.one_on_ones.length,
          whatsapp: grouped.whatsapp.length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET OVERDUE FOLLOW-UPS =====================

export const getOverdueFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { assignedTo } = req.query;

    const query: any = {
      tenantId,
      scheduledAt: { $lt: new Date() },
      status: { $in: ['scheduled', 'pending'] }
    };

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const followUps = await FollowUpReminder.find(query)
      .populate('leadId', 'name phone email')
      .populate('assignedTo', 'firstName lastName')
      .sort({ scheduledAt: 1 });

    res.json({
      success: true,
      message: 'Overdue follow-ups retrieved',
      data: followUps
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== COMPLETE FOLLOW-UP =====================

export const completeFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { outcome, notes, nextAction, callOutcome, callDuration, recordingUrl } = req.body;

    const followUp = await FollowUpReminder.findOne({ _id: id, tenantId });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    followUp.status = 'completed';
    followUp.completedAt = new Date();
    followUp.outcome = outcome;
    followUp.notes = notes;
    followUp.nextAction = nextAction;
    await followUp.save();

    // Add activity to lead
    const lead = await Lead.findById(followUp.leadId);
    if (lead) {
      const activityType = followUp.type === 'call' ? 'call' : 
                          followUp.type === 'whatsapp' ? 'whatsapp' : 
                          followUp.type === 'email' ? 'email' : 'note';

      lead.activities.push({
        type: activityType,
        description: `${followUp.type === 'one_on_one' ? '1-on-1 Meeting' : followUp.title} completed. Outcome: ${outcome || 'N/A'}. ${notes ? 'Notes: ' + notes : ''}`,
        createdBy: new mongoose.Types.ObjectId(userId as string),
        createdAt: new Date(),
        callOutcome: callOutcome,
        callDuration: callDuration,
        recordingUrl: recordingUrl
      });
      await lead.save();
    }

    res.json({
      success: true,
      message: 'Follow-up completed',
      data: followUp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== RESCHEDULE FOLLOW-UP =====================

export const rescheduleFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { scheduledAt, reason } = req.body;

    const followUp = await FollowUpReminder.findOne({ _id: id, tenantId });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    followUp.rescheduledFrom = followUp.scheduledAt;
    followUp.scheduledAt = new Date(scheduledAt);
    followUp.rescheduledReason = reason;
    followUp.rescheduleCount += 1;
    followUp.status = 'scheduled';
    followUp.reminderSent = false;
    await followUp.save();

    // Update lead activity
    const lead = await Lead.findById(followUp.leadId);
    if (lead) {
      lead.activities.push({
        type: 'note',
        description: `Follow-up rescheduled to ${new Date(scheduledAt).toLocaleString()}. Reason: ${reason || 'N/A'}`,
        createdBy: new mongoose.Types.ObjectId(userId as string),
        createdAt: new Date()
      });
      lead.nextFollowUp = new Date(scheduledAt);
      await lead.save();
    }

    res.json({
      success: true,
      message: 'Follow-up rescheduled',
      data: followUp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET LEAD FOLLOW-UPS =====================

export const getLeadFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { leadId } = req.params;

    const followUps = await FollowUpReminder.find({ tenantId, leadId })
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ scheduledAt: -1 });

    res.json({
      success: true,
      message: 'Lead follow-ups retrieved',
      data: followUps
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== DELETE FOLLOW-UP =====================

export const deleteFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const followUp = await FollowUpReminder.findOneAndDelete({ _id: id, tenantId });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    res.json({
      success: true,
      message: 'Follow-up deleted'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET FOLLOW-UP CALENDAR =====================

export const getFollowUpCalendar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { startDate, endDate, assignedTo } = req.query;

    const query: any = {
      tenantId,
      scheduledAt: {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      }
    };

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const followUps = await FollowUpReminder.find(query)
      .populate('leadId', 'name phone')
      .populate('assignedTo', 'firstName lastName')
      .sort({ scheduledAt: 1 });

    // Group by date for calendar view
    const calendar: Record<string, any[]> = {};
    followUps.forEach(f => {
      const dateKey = f.scheduledAt.toISOString().split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push(f);
    });

    res.json({
      success: true,
      message: 'Calendar data retrieved',
      data: { calendar, events: followUps }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== MARK AS MISSED =====================

export const markAsMissed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { reason } = req.body;

    const followUp = await FollowUpReminder.findOne({ _id: id, tenantId });
    if (!followUp) {
      return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    followUp.status = 'missed';
    followUp.notes = reason || 'No response/Not available';
    await followUp.save();

    // Add activity to lead
    const lead = await Lead.findById(followUp.leadId);
    if (lead) {
      lead.activities.push({
        type: 'note',
        description: `Follow-up missed: ${followUp.title}. Reason: ${reason || 'No response'}`,
        createdBy: new mongoose.Types.ObjectId(userId as string),
        createdAt: new Date()
      });
      await lead.save();
    }

    res.json({
      success: true,
      message: 'Follow-up marked as missed',
      data: followUp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== QUICK SCHEDULE (CALL AGAIN, FOLLOW UP TOMORROW, ETC) =====================

export const quickSchedule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { leadId, quickType } = req.body;

    // Validate lead
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    let scheduledAt: Date;
    let title: string;
    let type: string = 'call';

    switch (quickType) {
      case 'call_in_30_min':
        scheduledAt = new Date(Date.now() + 30 * 60 * 1000);
        title = 'Call back in 30 minutes';
        break;
      case 'call_in_1_hour':
        scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
        title = 'Call back in 1 hour';
        break;
      case 'call_tomorrow_morning':
        scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + 1);
        scheduledAt.setHours(10, 0, 0, 0);
        title = 'Call tomorrow morning';
        break;
      case 'call_tomorrow_afternoon':
        scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + 1);
        scheduledAt.setHours(14, 0, 0, 0);
        title = 'Call tomorrow afternoon';
        break;
      case 'whatsapp_later':
        scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        title = 'Send WhatsApp message';
        type = 'whatsapp';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid quick type' });
    }

    const followUp = new FollowUpReminder({
      tenantId,
      leadId,
      assignedTo: lead.assignedTo || userId,
      type,
      title,
      scheduledAt,
      priority: 'high',
      createdBy: userId
    });

    await followUp.save();

    // Update lead
    lead.nextFollowUp = scheduledAt;
    lead.activities.push({
      type: 'note',
      description: `Quick follow-up scheduled: ${title}`,
      createdBy: new mongoose.Types.ObjectId(userId as string),
      createdAt: new Date()
    });
    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Quick follow-up scheduled',
      data: followUp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
