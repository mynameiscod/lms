import { Request, Response } from 'express';
import { Types } from 'mongoose';
import LearningRequest from '../models/LearningRequest';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

/**
 * POST /api/v1/learning-requests
 * Student: submit a help request for a topic
 */
export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const tenantId = req.tenantId;
    if (!studentId || !tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { topicId, chapterId, subjectId, courseId, batchId, type, message, topicTitle, subjectName } = req.body;

    if (!type || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'type and message are required' });
    }

    const doc = await LearningRequest.create({
      studentId: new Types.ObjectId(studentId),
      tenantId:  new Types.ObjectId(tenantId),
      topicId:   topicId   ? new Types.ObjectId(topicId)   : undefined,
      chapterId: chapterId ? new Types.ObjectId(chapterId) : undefined,
      subjectId: subjectId ? new Types.ObjectId(subjectId) : undefined,
      courseId:  courseId  ? new Types.ObjectId(courseId)  : undefined,
      batchId:   batchId   ? new Types.ObjectId(batchId)   : undefined,
      type,
      message: message.trim(),
      topicTitle,
      subjectName
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    console.error('[LearningRequest] create error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/learning-requests
 * Admin: list all requests with filters
 */
export const listRequests = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { status, type, studentId, topicId, page = '1', limit = '20' } = req.query as Record<string, string>;

    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (status)    query.status    = status;
    if (type)      query.type      = type;
    if (studentId) query.studentId = new Types.ObjectId(studentId);
    if (topicId)   query.topicId   = new Types.ObjectId(topicId);

    const pageN  = Math.max(1, parseInt(page, 10));
    const limitN = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip   = (pageN - 1) * limitN;

    const [docs, total] = await Promise.all([
      LearningRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitN)
        .populate({ path: 'studentId', select: 'firstName lastName email' })
        .populate({ path: 'topicId',   select: 'title' })
        .populate({ path: 'subjectId', select: 'name' })
        .lean(),
      LearningRequest.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: docs,
      pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) }
    });
  } catch (err: any) {
    console.error('[LearningRequest] list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/learning-requests/my
 * Student: get their own requests
 */
export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const tenantId  = req.tenantId;
    if (!studentId || !tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const docs = await LearningRequest.find({
      studentId: new Types.ObjectId(studentId),
      tenantId:  new Types.ObjectId(tenantId)
    }).sort({ createdAt: -1 }).populate({ path: 'topicId', select: 'title' }).lean();

    return res.json({ success: true, data: docs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/v1/learning-requests/:id
 * Admin: update status / add note
 */
export const updateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const adminId  = req.user?.id;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { status, adminNote, scheduledAt } = req.body;

    const update: any = {};
    if (status)      update.status    = status;
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (scheduledAt) update.scheduledAt = new Date(scheduledAt);
    if (status === 'fulfilled') {
      update.fulfilledAt = new Date();
      if (adminId) update.fulfilledBy = new Types.ObjectId(adminId);
    }

    const doc = await LearningRequest.findOneAndUpdate(
      { _id: req.params.id, tenantId: new Types.ObjectId(tenantId) },
      { $set: update },
      { new: true }
    ).populate({ path: 'studentId', select: 'firstName lastName email' });

    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });

    return res.json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/learning-requests/:id
 * Student: cancel a pending request
 */
export const deleteRequest = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const tenantId  = req.tenantId;
    if (!studentId || !tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const doc = await LearningRequest.findOneAndDelete({
      _id: req.params.id,
      studentId: new Types.ObjectId(studentId),
      tenantId:  new Types.ObjectId(tenantId),
      status: 'pending'
    });

    if (!doc) return res.status(404).json({ success: false, message: 'Request not found or not cancellable' });

    return res.json({ success: true, message: 'Request cancelled' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/learning-requests/stats
 * Admin: counts by status and type
 */
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [byStatus, byType] = await Promise.all([
      LearningRequest.aggregate([
        { $match: { tenantId: new Types.ObjectId(tenantId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      LearningRequest.aggregate([
        { $match: { tenantId: new Types.ObjectId(tenantId) } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const statusMap: Record<string, number> = { pending: 0, in_progress: 0, fulfilled: 0, scheduled: 0 };
    byStatus.forEach(d => { statusMap[d._id] = d.count; });

    return res.json({ success: true, data: { byStatus: statusMap, byType } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
