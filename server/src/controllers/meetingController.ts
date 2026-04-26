import { AuthenticatedRequest } from '../types';
import Meeting from '../models/Meeting';
import Lead from '../models/Lead';

// ── Create meeting ────────────────────────────────────────────────────────────
export const createMeeting = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const {
      leadId, type, title, scheduledAt, durationMinutes,
      attendees, meetingLink, location, notes, sendWhatsApp, sendEmail,
    } = req.body;

    if (!leadId || !type || !title || !scheduledAt) {
      res.status(400).json({ success: false, message: 'leadId, type, title, scheduledAt are required' });
      return;
    }

    // Verify lead belongs to tenant
    const lead = await Lead.findOne({ _id: leadId, tenantId });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const meeting = await Meeting.create({
      tenantId,
      leadId,
      type,
      title,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: durationMinutes || 60,
      attendees: attendees || [],
      meetingLink,
      location,
      notes,
      sendWhatsApp: !!sendWhatsApp,
      sendEmail: sendEmail !== false,
      createdBy: req.user!.id,
    });

    // Log activity on lead
    await Lead.findByIdAndUpdate(leadId, {
      $push: {
        activities: {
          type: 'meeting',
          note: `${type.replace(/_/g, ' ')} scheduled: ${title} on ${new Date(scheduledAt).toLocaleString()}`,
          performedBy: req.user!.id,
          createdAt: new Date(),
        },
      },
    });

    res.status(201).json({ success: true, data: meeting });
  } catch (err: any) {
    console.error('[Meeting] createMeeting:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── List meetings for tenant (with optional filters) ─────────────────────────
export const getMeetings = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const { leadId, status, type, from, to, assignedTo } = req.query as Record<string, string>;

    const filter: any = { tenantId };
    if (leadId) filter.leadId = leadId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (assignedTo) filter.attendees = assignedTo;
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }

    const meetings = await Meeting.find(filter)
      .sort({ scheduledAt: 1 })
      .populate('leadId', 'name phone email')
      .lean();

    res.json({ success: true, data: meetings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get single meeting ────────────────────────────────────────────────────────
export const getMeeting = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, tenantId: req.tenantId! })
      .populate('leadId', 'name phone email')
      .lean();
    if (!meeting) {
      res.status(404).json({ success: false, message: 'Meeting not found' });
      return;
    }
    res.json({ success: true, data: meeting });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Update meeting ────────────────────────────────────────────────────────────
export const updateMeeting = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const allowed = ['title', 'scheduledAt', 'durationMinutes', 'attendees',
      'meetingLink', 'location', 'notes', 'sendWhatsApp', 'sendEmail', 'status',
      'cancellationReason'];
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.status === 'completed') update.completedAt = new Date();
    if (update.status === 'cancelled') update.cancelledAt = new Date();

    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId! },
      { $set: update },
      { new: true }
    );
    if (!meeting) {
      res.status(404).json({ success: false, message: 'Meeting not found' });
      return;
    }
    res.json({ success: true, data: meeting });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete meeting ────────────────────────────────────────────────────────────
export const deleteMeeting = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId! });
    if (!meeting) {
      res.status(404).json({ success: false, message: 'Meeting not found' });
      return;
    }
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Upcoming meetings for current user ────────────────────────────────────────
export const getMyUpcomingMeetings = async (req: AuthenticatedRequest, res: any): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;

    const meetings = await Meeting.find({
      tenantId,
      status: 'scheduled',
      scheduledAt: { $gte: new Date() },
      $or: [{ attendees: userId }, { createdBy: userId }],
    })
      .sort({ scheduledAt: 1 })
      .limit(20)
      .populate('leadId', 'name phone email')
      .lean();

    res.json({ success: true, data: meetings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
