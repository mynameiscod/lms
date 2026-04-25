import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import CRTSession from '../models/CRTSession';

// GET /api/v1/college/crt?trainerId=&status=&departmentId=&year=
export const list = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const { trainerId, status, departmentId, year } = req.query as Record<string, string>;

    const query: Record<string, any> = { tenantId, isActive: true };
    if (trainerId)    query.trainerId    = trainerId;
    if (status)       query.status       = status;
    if (departmentId) query.departmentIds = departmentId;
    if (year)         query.targetYears  = Number(year);

    const sessions = await CRTSession.find(query)
      .populate('trainerId', 'firstName lastName email')
      .populate('departmentIds', 'name code')
      .sort({ scheduledAt: -1 });

    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('[CRTCtrl.list]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/v1/college/crt/:id
export const getOne = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const session = await CRTSession.findOne({ _id: id, tenantId })
      .populate('trainerId', 'firstName lastName email')
      .populate('departmentIds', 'name code')
      .populate('attendance.userId', 'firstName lastName email');

    if (!session) return res.status(404).json({ success: false, message: 'CRT session not found' });
    return res.json({ success: true, data: session });
  } catch (err) {
    console.error('[CRTCtrl.getOne]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/college/crt
export const create = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId   = req.user?.id;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing' });

    const {
      trainerId, title, description, topic,
      departmentIds, targetYears,
      scheduledAt, durationMins, venue, meetLink, materialUrl
    } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'title and scheduledAt are required' });
    }

    const session = await CRTSession.create({
      tenantId,
      trainerId: trainerId || userId,
      title,
      description,
      topic:        topic       || 'other',
      departmentIds: departmentIds || [],
      targetYears:  targetYears  || [],
      scheduledAt:  new Date(scheduledAt),
      durationMins: durationMins || 60,
      venue,
      meetLink,
      materialUrl,
      status:    'scheduled',
      attendance: [],
      createdBy: userId
    });

    return res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error('[CRTCtrl.create]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/v1/college/crt/:id
export const update = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    const allowedFields = [
      'title', 'description', 'topic', 'departmentIds', 'targetYears',
      'scheduledAt', 'durationMins', 'venue', 'meetLink', 'materialUrl',
      'status', 'feedback', 'isActive'
    ];

    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    const session = await CRTSession.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: update },
      { new: true }
    )
      .populate('trainerId', 'firstName lastName email')
      .populate('departmentIds', 'name code');

    if (!session) return res.status(404).json({ success: false, message: 'CRT session not found' });
    return res.json({ success: true, data: session });
  } catch (err) {
    console.error('[CRTCtrl.update]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/v1/college/crt/:id
export const remove = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const session = await CRTSession.findOneAndDelete({ _id: id, tenantId });
    if (!session) return res.status(404).json({ success: false, message: 'CRT session not found' });
    return res.json({ success: true, message: 'CRT session deleted' });
  } catch (err) {
    console.error('[CRTCtrl.remove]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/v1/college/crt/:id/attendance  — bulk mark attendance
export const markAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { attendance } = req.body;   // [{ userId, status }]

    if (!Array.isArray(attendance)) {
      return res.status(400).json({ success: false, message: 'attendance must be an array' });
    }

    const session = await CRTSession.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: { attendance } },
      { new: true }
    );

    if (!session) return res.status(404).json({ success: false, message: 'CRT session not found' });
    return res.json({ success: true, data: session });
  } catch (err) {
    console.error('[CRTCtrl.markAttendance]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
