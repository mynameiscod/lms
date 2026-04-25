import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as svc from './notificationService';

export const list = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await svc.getMyNotifications(req.user!.id, req.user!.tenantId);
    const unreadCount = await svc.getUnreadCount(req.user!.id, req.user!.tenantId);
    res.json({ success: true, data: notifications, unreadCount });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const markRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.markRead(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await svc.markAllRead(req.user!.id, req.user!.tenantId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};
