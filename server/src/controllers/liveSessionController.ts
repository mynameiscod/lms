import { Request, Response } from 'express';
import LiveSession from '../models/LiveSession';

const tenantOf = (req: Request) => (req as any).tenantId || (req as any).user?.tenantId;

// Instructor/admin starts a live class → returns the room to join.
export const startLive = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const user = (req as any).user || {};
    const title = String(req.body?.title || 'Live Class').trim().slice(0, 200);
    const room = `cb-${tenantId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const session = await LiveSession.create({
      tenantId,
      title,
      room,
      hostId: user.id || user._id || '',
      hostName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'Instructor',
      status: 'live',
      startedAt: new Date(),
    });
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// Anyone in the tenant sees currently-live classes.
export const listActive = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const items = await LiveSession.find({ tenantId, status: 'live' }).sort({ startedAt: -1 }).lean();
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// Host (or admin) ends a live class.
export const endLive = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const session = await LiveSession.findOne({ _id: req.params.id, tenantId });
    if (!session) return res.status(404).json({ message: 'Live class not found' });
    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();
    res.json({ message: 'Ended', session });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
