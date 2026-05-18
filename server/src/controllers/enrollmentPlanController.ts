import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import User from '../models/User';

const tenantId = (req: Request): string => (req as any).user?.tenantId || '';
const userId   = (req: Request): string => (req as any).user?.id || '';

// ─── Weekday calculator ──────────────────────────────────────────────────────
// Returns the calendar date for a given plan day number starting from startDate.
// weekdays only (Mon-Fri), startDate is day 1.
function weekdayForDay(startDate: Date, dayNumber: number): Date {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  let remaining = dayNumber - 1;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--; // skip sat(6) and sun(0)
  }
  return d;
}

// Returns which plan day number corresponds to today, or null if before start
function currentPlanDay(startDate: Date, totalDays: number): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  if (today < start) return null;

  let weekdayCount = 0;
  const cursor = new Date(start);
  while (cursor <= today) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) weekdayCount++;
    if (cursor.getTime() === today.getTime()) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.min(weekdayCount, totalDays);
}

// ─── Admin: List all enrollments for a curriculum ────────────────────────────

export const listEnrollmentsByCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId } = req.params;
    const { status, batchId, search } = req.query;

    const filter: any = { tenantId: tId, curriculumId };
    if (status)  filter.status  = status;
    if (batchId) filter.batchId = batchId;
    if (search)  filter.studentName = { $regex: search, $options: 'i' };

    const enrollments = await CurriculumEnrollment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Attach computed currentDay from today's date
    const curriculum = await LearningCurriculum.findById(curriculumId).select('totalDays').lean();
    const totalDays = curriculum?.totalDays || 145;

    const enriched = enrollments.map(e => ({
      ...e,
      todayPlanDay: e.status === 'active' ? currentPlanDay(e.startDate, totalDays) : null,
      progressPct: Math.round(((e.completedDays?.length || 0) / totalDays) * 100),
    }));

    res.json({ enrollments: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list enrollments', error: err });
  }
};

// ─── Admin: List all enrollments (across curricula) ──────────────────────────

export const listAllEnrollments = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { status, curriculumId, batchId, search } = req.query;

    const filter: any = { tenantId: tId };
    if (status)       filter.status       = status;
    if (curriculumId) filter.curriculumId = curriculumId;
    if (batchId)      filter.batchId      = batchId;
    if (search)       filter.studentName  = { $regex: search, $options: 'i' };

    const enrollments = await CurriculumEnrollment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ enrollments, total: enrollments.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list enrollments', error: err });
  }
};

// ─── Enroll a single student ──────────────────────────────────────────────────

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const {
      curriculumId, studentId, startDate, batchId, batchName,
      settings,
    } = req.body;

    // Validate curriculum
    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId }).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    if (!curriculum.isPublished) return res.status(400).json({ message: 'Curriculum is not published' });

    // Get student info
    const student = await User.findById(studentId).select('name email').lean() as any;
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const enrollment = await CurriculumEnrollment.create({
      tenantId: tId,
      curriculumId,
      curriculumTitle: curriculum.title,
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      batchId: batchId || undefined,
      batchName: batchName || undefined,
      startDate: new Date(startDate),
      settings: settings || {},
      enrolledBy: userId(req),
    });

    // Increment enrollment count on curriculum
    await LearningCurriculum.updateOne({ _id: curriculumId }, { $inc: { enrollmentCount: 1 } });

    res.status(201).json(enrollment);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Student is already enrolled in this curriculum' });
    }
    res.status(500).json({ message: 'Failed to enroll student', error: err });
  }
};

// ─── Enroll an entire batch ───────────────────────────────────────────────────

export const enrollBatch = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId, batchId, startDate, settings } = req.body;

    // Validate curriculum
    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId }).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    if (!curriculum.isPublished) return res.status(400).json({ message: 'Curriculum is not published' });

    // Get batch info and its students
    const Batch = mongoose.model('Batch');
    const batch = await Batch.findOne({ _id: batchId, tenantId: tId }).lean() as any;
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // Get all active students in the batch
    const Enrollment = mongoose.model('Enrollment');
    const batchEnrollments = await Enrollment.find({ batchId, tenantId: tId, status: 'active' })
      .populate('userId', 'name email')
      .lean() as any[];

    if (batchEnrollments.length === 0) {
      return res.status(400).json({ message: 'No active students found in batch' });
    }

    const start = new Date(startDate);
    const docs = batchEnrollments.map((be: any) => ({
      tenantId: tId,
      curriculumId,
      curriculumTitle: curriculum.title,
      studentId: be.userId._id,
      studentName: be.userId.name,
      studentEmail: be.userId.email,
      batchId,
      batchName: batch.name,
      startDate: start,
      settings: settings || {},
      enrolledBy: userId(req),
    }));

    const result = await CurriculumEnrollment.insertMany(docs, { ordered: false });
    await LearningCurriculum.updateOne({ _id: curriculumId }, { $inc: { enrollmentCount: result.length } });

    res.status(201).json({
      enrolled: result.length,
      skipped: docs.length - result.length,
      message: `Enrolled ${result.length} students`,
    });
  } catch (err: any) {
    if (err.writeErrors) {
      const ok = (err.result?.nInserted || 0);
      await LearningCurriculum.updateOne({ _id: req.body.curriculumId }, { $inc: { enrollmentCount: ok } });
      return res.status(207).json({
        enrolled: ok,
        skipped: err.writeErrors.length,
        message: `Enrolled ${ok} students (${err.writeErrors.length} already enrolled)`,
      });
    }
    res.status(500).json({ message: 'Failed to enroll batch', error: err });
  }
};

// ─── Get single enrollment ────────────────────────────────────────────────────

export const getEnrollment = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const enrollment = await CurriculumEnrollment.findOne({ _id: req.params.id, tenantId: tId }).lean();
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const curriculum = await LearningCurriculum.findById(enrollment.curriculumId).select('totalDays').lean();
    const totalDays = curriculum?.totalDays || 145;

    res.json({
      ...enrollment,
      todayPlanDay: enrollment.status === 'active' ? currentPlanDay(enrollment.startDate, totalDays) : null,
      progressPct: Math.round(((enrollment.completedDays?.length || 0) / totalDays) * 100),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get enrollment', error: err });
  }
};

// ─── Update enrollment status ─────────────────────────────────────────────────

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { status } = req.body;
    const allowed: string[] = ['active', 'paused', 'completed', 'dropped'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const update: any = { status };
    if (status === 'completed') update.completedAt = new Date();

    const enrollment = await CurriculumEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId },
      { $set: update },
      { new: true }
    );
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err });
  }
};

// ─── Update enrollment settings ───────────────────────────────────────────────

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { startDate, settings } = req.body;
    const patch: any = {};
    if (settings)  patch.settings  = settings;
    if (startDate) patch.startDate = new Date(startDate);

    const enrollment = await CurriculumEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId },
      { $set: patch },
      { new: true }
    );
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings', error: err });
  }
};

// ─── Student: get my enrollments ─────────────────────────────────────────────

export const getMyEnrollments = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);

    const enrollments = await CurriculumEnrollment.find({ tenantId: tId, studentId: sId, status: { $in: ['active', 'paused'] } })
      .sort({ createdAt: -1 })
      .lean();

    // For each enrollment, compute today's plan day and today's content
    const curricula = await LearningCurriculum.find({
      _id: { $in: enrollments.map(e => e.curriculumId) }
    }).select('totalDays').lean();
    const currMap: Record<string, number> = {};
    curricula.forEach(c => { currMap[c._id.toString()] = c.totalDays; });

    const enriched = await Promise.all(enrollments.map(async e => {
      const totalDays = currMap[e.curriculumId.toString()] || 145;
      const todayDay  = currentPlanDay(e.startDate, totalDays);

      let todayPlan = null;
      if (todayDay) {
        todayPlan = await DayPlan.findOne({ curriculumId: e.curriculumId, dayNumber: todayDay }).lean();
      }

      return {
        ...e,
        totalDays,
        todayPlanDay: todayDay,
        progressPct: Math.round(((e.completedDays?.length || 0) / totalDays) * 100),
        todayPlan,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get enrollments', error: err });
  }
};

// ─── Student: mark content as complete ──────────────────────────────────────

export const markContentComplete = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);
    const { contentId, dayNumber } = req.body;

    const enrollment = await CurriculumEnrollment.findOne({
      _id: req.params.id, tenantId: tId, studentId: sId,
    });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Add completed item if not already recorded
    const alreadyDone = enrollment.completedItems.some(
      i => i.contentId === contentId && i.dayNumber === dayNumber
    );
    if (!alreadyDone) {
      enrollment.completedItems.push({ contentId, dayNumber, completedAt: new Date() });
    }

    // Check if all items in this day are done
    const dayPlan = await DayPlan.findOne({ curriculumId: enrollment.curriculumId, dayNumber }).lean();
    if (dayPlan) {
      const allDone = dayPlan.items.every(item =>
        enrollment.completedItems.some(ci => ci.contentId === item.contentId.toString() && ci.dayNumber === dayNumber)
      );
      if (allDone && !enrollment.completedDays.includes(dayNumber)) {
        enrollment.completedDays.push(dayNumber);
        // Advance currentDay
        enrollment.currentDay = Math.max(enrollment.currentDay, dayNumber + 1);
      }
    }

    enrollment.lastActivityAt = new Date();
    await enrollment.save();

    res.json({
      completedItems: enrollment.completedItems.length,
      completedDays: enrollment.completedDays,
      currentDay: enrollment.currentDay,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark complete', error: err });
  }
};

// ─── Admin: stats for a curriculum's enrollments ─────────────────────────────

export const getCurriculumEnrollmentStats = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId } = req.params;

    const [total, active, paused, completed, dropped] = await Promise.all([
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'active' }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'paused' }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'completed' }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'dropped' }),
    ]);

    res.json({ total, active, paused, completed, dropped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get stats', error: err });
  }
};
