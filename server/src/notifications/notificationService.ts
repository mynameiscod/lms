import Notification from '../models/Notification';
import mongoose from 'mongoose';
import { eventBus } from '../utils/eventBus';
import CollegeMembership from '../models/CollegeMembership';
import User from '../models/User';
import { EmailService } from '../services/emailService';

const emailService = new EmailService();

export const createNotifications = async (
  tenantId: string,
  userIds: string[],
  type: 'placement_drive_new' | 'placement_deadline' | 'placement_status' | 'general',
  title: string,
  body: string,
  link?: string
) => {
  if (!userIds.length) return;
  const docs = userIds.map(userId => ({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    userId:   new mongoose.Types.ObjectId(userId),
    type,
    title,
    body,
    link
  }));
  return Notification.insertMany(docs, { ordered: false });
};

export const getMyNotifications = (userId: string, tenantId: string) =>
  Notification.find({ userId, tenantId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

export const getUnreadCount = (userId: string, tenantId: string) =>
  Notification.countDocuments({ userId, tenantId, read: false });

export const markRead = (id: string, userId: string) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });

export const markAllRead = (userId: string, tenantId: string) =>
  Notification.updateMany({ userId, tenantId, read: false }, { read: true });

// ─── Event bus listeners ─────────────────────────────────────────────────────

eventBus.on('placement.drive.created', async (payload: { tenantId: string; driveId: string; companyName: string; role: string; applyDeadline?: string; allowedBranches?: string[]; allowedYears?: number[]; minCgpa?: number }) => {
  try {
    const { tenantId, driveId, companyName, role, applyDeadline, allowedBranches, allowedYears, minCgpa } = payload;

    // Find students in this tenant who match eligibility
    const query: Record<string, any> = { tenantId, isActive: true };
    const memberships = await CollegeMembership.find(query)
      .populate<{ departmentId: { code: string } }>('departmentId', 'code')
      .lean();

    const eligibleUserIds = memberships
      .filter(m => {
        if (allowedBranches?.length && m.departmentId) {
          const code = (m.departmentId as any).code;
          if (!allowedBranches.includes(code)) return false;
        }
        if (allowedYears?.length && m.yearOfStudy) {
          if (!allowedYears.includes(m.yearOfStudy)) return false;
        }
        if (minCgpa != null) {
          const cgpa = (m as any).cgpa;
          if (cgpa == null || cgpa < minCgpa) return false;
        }
        return true;
      })
      .map(m => String(m.userId));

    if (!eligibleUserIds.length) return;

    await createNotifications(
      tenantId,
      eligibleUserIds,
      'placement_drive_new',
      `New Drive: ${companyName}`,
      `${companyName} is hiring for ${role}. Check the placement portal to apply.`,
      '/student/college'
    );

    // Send emails to eligible students
    const users = await User.find({ _id: { $in: eligibleUserIds } }).select('email firstName').lean() as any[];
    const deadlineLabel = applyDeadline ? new Date(applyDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Soon';
    const link = `${process.env.CLIENT_URL || 'http://localhost:3000'}/student/college`;
    for (const u of users) {
      if (u.email) {
        emailService.sendNewDriveEmail(u.email, u.firstName || 'Student', companyName, role, deadlineLabel, link)
          .catch(() => {/* non-fatal */});
      }
    }
  } catch (err) {
    console.error('[NOTIFICATIONS] Failed to create placement notifications:', err);
  }
});
