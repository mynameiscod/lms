import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest';
import Attendance from '../models/Attendance';
import User from '../models/User';

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// ─── Student: apply for leave ────────────────────────────────────────────────
export const applyLeave = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { fromDate, toDate, reason } = req.body;
    if (!fromDate || !toDate || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'fromDate, toDate and reason are required' });
    }
    const from = dayStart(new Date(fromDate));
    const to = dayStart(new Date(toDate));
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return res.status(400).json({ success: false, message: 'Invalid dates' });
    if (to < from) return res.status(400).json({ success: false, message: 'End date cannot be before start date' });

    const user = await User.findById(userId).select('firstName lastName batchId').lean();
    const leave = await LeaveRequest.create({
      tenantId, studentId: userId,
      studentName: user ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
      batchId: (user as any)?.batchId,
      fromDate: from, toDate: to, reason: reason.trim(), status: 'pending',
    });
    res.status(201).json({ success: true, data: leave });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Student: my leave requests ──────────────────────────────────────────────
export const myLeaves = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const data = await LeaveRequest.find({ tenantId, studentId: userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: list leave requests ──────────────────────────────────────────────
export const listLeaves = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { status, page, limit } = req.query;
    const q: any = { tenantId };
    if (status) q.status = status;
    const p = page ? parseInt(page as string) : 1;
    const l = limit ? parseInt(limit as string) : 50;
    const [data, total] = await Promise.all([
      LeaveRequest.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
        .populate('studentId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName')
        .lean(),
      LeaveRequest.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: approve (mark weekday leave in attendance) ───────────────────────
export const approveLeave = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const adminId = (req as any).userId;
    const { reviewNote } = req.body;
    const leave = await LeaveRequest.findOne({ _id: req.params.id, tenantId, status: 'pending' });
    if (!leave) return res.status(404).json({ success: false, message: 'Pending leave request not found' });

    let daysMarked = 0;
    if (leave.batchId) {
      const cur = dayStart(leave.fromDate);
      const end = dayStart(leave.toDate);
      while (cur <= end) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {   // skip Sat & Sun
          const d = new Date(cur);
          const next = new Date(cur); next.setDate(next.getDate() + 1);
          await Attendance.findOneAndUpdate(
            { tenantId, studentId: leave.studentId, date: { $gte: d, $lt: next } },
            {
              $set: { status: 'leave', markedBy: adminId, remarks: `Approved leave: ${leave.reason}`.slice(0, 300) },
              $setOnInsert: { tenantId, studentId: leave.studentId, batchId: leave.batchId, date: d },
            },
            { upsert: true }
          );
          daysMarked++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    leave.status = 'approved';
    leave.reviewedBy = new mongoose.Types.ObjectId(adminId);
    leave.reviewedAt = new Date();
    leave.reviewNote = reviewNote;
    leave.daysMarked = daysMarked;
    await leave.save();
    res.json({ success: true, data: leave, message: leave.batchId ? `Approved — ${daysMarked} weekday(s) marked as leave.` : 'Approved (student has no batch, attendance not marked).' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Admin: reject ───────────────────────────────────────────────────────────
export const rejectLeave = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const adminId = (req as any).userId;
    const { reviewNote } = req.body;
    const leave = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, tenantId, status: 'pending' },
      { $set: { status: 'rejected', reviewedBy: adminId, reviewedAt: new Date(), reviewNote } },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Pending leave request not found' });
    res.json({ success: true, data: leave });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
