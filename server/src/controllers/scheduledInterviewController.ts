import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest, ApiResponse } from '../types';
import ScheduledInterview from '../models/ScheduledInterview';
import InterviewScheduleFeedback from '../models/InterviewScheduleFeedback';
import User from '../models/User';
import { EmailService } from '../services/emailService';

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildGoogleCalendarLink(opts: {
  title: string;
  date: Date;
  time: string;
  duration: number;
  description: string;
  location?: string;
}): string {
  const [h, m] = opts.time.split(':').map(Number);
  const start = new Date(opts.date);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + opts.duration * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: opts.description,
    ...(opts.location ? { location: opts.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ─── Create Interview ─────────────────────────────────────────────────────────

export const createInterview = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const {
      title, description, date, time, duration, interviewerName, interviewerEmail,
      venue, meetLink, criteria, studentIds, batchIds, emailSubject, emailBody,
    } = req.body;

    if (!title || !date || !time || !interviewerName) {
      return res.status(400).json({ success: false, message: 'title, date, time and interviewerName are required' });
    }

    // Resolve students: explicit list + all students in selected batches
    let allStudentIds: mongoose.Types.ObjectId[] = (studentIds || []).map(
      (id: string) => new mongoose.Types.ObjectId(id)
    );

    if (batchIds?.length) {
      const batchStudents = await User.find({
        tenantId: req.tenantId,
        batchId: { $in: batchIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
        role: 'STUDENT',
        isActive: true,
      }).select('_id').lean();
      const batchStudentIds = batchStudents.map(s => s._id as mongoose.Types.ObjectId);
      // Deduplicate
      const seen = new Set(allStudentIds.map(String));
      for (const id of batchStudentIds) {
        if (!seen.has(String(id))) { seen.add(String(id)); allStudentIds.push(id); }
      }
    }

    const interview = await ScheduledInterview.create({
      tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
      title, description, date: new Date(date), time, duration: duration || 30,
      interviewerName, interviewerEmail, venue, meetLink,
      criteria: criteria || [],
      students: allStudentIds,
      batchIds: (batchIds || []).map((id: string) => new mongoose.Types.ObjectId(id)),
      emailSubject, emailBody,
      createdBy: new mongoose.Types.ObjectId(String(req.user!.id)),
    });

    // Send invite emails in background
    sendBulkInvites(interview, allStudentIds).catch(err =>
      console.error('[InterviewInvite] bulk email error:', err.message)
    );

    if (allStudentIds.length > 0) {
      await ScheduledInterview.findByIdAndUpdate(interview._id, { emailSent: true });
    }

    res.status(201).json({ success: true, message: 'Interview scheduled', data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create interview', error: error.message });
  }
};

async function sendBulkInvites(
  interview: InstanceType<typeof ScheduledInterview>,
  studentIds: mongoose.Types.ObjectId[]
) {
  if (!studentIds.length) return;
  const emailSvc = new EmailService();
  const students = await User.find({ _id: { $in: studentIds } })
    .select('firstName lastName email').lean();

  const calendarLink = buildGoogleCalendarLink({
    title: interview.title,
    date: interview.date,
    time: interview.time,
    duration: interview.duration,
    description: interview.emailBody || interview.description,
    location: interview.venue || interview.meetLink,
  });

  for (const student of students) {
    if (!student.email) continue;
    await emailSvc.sendInterviewInviteEmail({
      email: student.email,
      studentName: `${student.firstName} ${student.lastName}`,
      title: interview.title,
      date: formatDate(interview.date),
      time: formatTime(interview.time),
      duration: interview.duration,
      interviewerName: interview.interviewerName,
      venue: interview.venue,
      meetLink: interview.meetLink,
      criteria: (interview.criteria || []).map((c: any) => c.label),
      emailSubject: interview.emailSubject,
      emailBody: interview.emailBody,
      calendarLink,
    });
  }
}

// ─── List Interviews ──────────────────────────────────────────────────────────

export const getInterviews = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter: any = { tenantId: new mongoose.Types.ObjectId(String(req.tenantId)) };
    if (status) filter.status = status;

    const total = await ScheduledInterview.countDocuments(filter);
    const interviews = await ScheduledInterview.find(filter)
      .sort({ date: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .populate('students', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .lean();

    // Attach feedback counts per interview
    const ids = interviews.map(i => i._id);
    const feedbackCounts = await InterviewScheduleFeedback.aggregate([
      { $match: { interviewId: { $in: ids } } },
      { $group: { _id: '$interviewId', total: { $sum: 1 }, submitted: { $sum: { $cond: [{ $ifNull: ['$submittedAt', false] }, 1, 0] } } } },
    ]);
    const fcMap = Object.fromEntries(feedbackCounts.map(f => [String(f._id), f]));

    const enriched = interviews.map(i => ({
      ...i,
      feedbackStats: fcMap[String(i._id)] || { total: 0, submitted: 0 },
    }));

    res.json({ success: true, message: 'Interviews fetched', data: { interviews: enriched, total, page: +page, totalPages: Math.ceil(total / +limit) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch interviews', error: error.message });
  }
};

// ─── Get Single Interview ─────────────────────────────────────────────────────

export const getInterviewById = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const interview = await ScheduledInterview.findOne({
      _id: req.params.id,
      tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
    })
      .populate('students', 'firstName lastName email phone batchId')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    // Get all feedbacks for this interview
    const feedbacks = await InterviewScheduleFeedback.find({ interviewId: interview._id })
      .populate('submittedBy', 'firstName lastName')
      .lean();
    const feedbackMap = Object.fromEntries(feedbacks.map(f => [String(f.studentId), f]));

    res.json({ success: true, message: 'Interview fetched', data: { ...interview, feedbackMap } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch interview', error: error.message });
  }
};

// ─── Update Interview ─────────────────────────────────────────────────────────

export const updateInterview = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const allowed = ['title','description','date','time','duration','interviewerName',
      'interviewerEmail','venue','meetLink','criteria','status','emailSubject','emailBody'];
    const update: any = {};
    for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }
    if (update.date) update.date = new Date(update.date);

    const interview = await ScheduledInterview.findOneAndUpdate(
      { _id: req.params.id, tenantId: new mongoose.Types.ObjectId(String(req.tenantId)) },
      { $set: update },
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, message: 'Interview updated', data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update interview', error: error.message });
  }
};

// ─── Resend invite emails ─────────────────────────────────────────────────────

export const resendInvites = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const interview = await ScheduledInterview.findOne({
      _id: req.params.id, tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
    });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    const ids = (interview.students || []) as any[];
    sendBulkInvites(interview, ids).catch(err => console.error('[ScheduledInterview] resend invite error:', err.message));
    interview.emailSent = true;
    await interview.save();
    res.json({ success: true, message: `Invites re-sent to ${ids.length} student(s)` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to resend invites', error: error.message });
  }
};

// ─── Admin: all mock interviews + feedback for one student (for the profile) ────

export const getStudentInterviewsAdmin = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tId = new mongoose.Types.ObjectId(String(req.tenantId));
    const sId = new mongoose.Types.ObjectId(req.params.studentId);
    const [interviews, feedback] = await Promise.all([
      ScheduledInterview.find({ tenantId: tId, students: sId }).sort({ date: -1 }).lean(),
      InterviewScheduleFeedback.find({ tenantId: tId, studentId: sId }).lean(),
    ]);
    res.json({ success: true, message: 'OK', data: { interviews, feedback } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load student interviews', error: error.message });
  }
};

// ─── Delete Interview ─────────────────────────────────────────────────────────

export const deleteInterview = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const interview = await ScheduledInterview.findOneAndDelete({
      _id: req.params.id,
      tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
    });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    await InterviewScheduleFeedback.deleteMany({ interviewId: req.params.id });
    res.json({ success: true, message: 'Interview deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete interview', error: error.message });
  }
};

// ─── Add / Remove Students ────────────────────────────────────────────────────

export const addStudents = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { studentIds } = req.body;
    if (!studentIds?.length) return res.status(400).json({ success: false, message: 'studentIds required' });
    const ids = studentIds.map((id: string) => new mongoose.Types.ObjectId(id));
    const interview = await ScheduledInterview.findOneAndUpdate(
      { _id: req.params.id, tenantId: new mongoose.Types.ObjectId(String(req.tenantId)) },
      { $addToSet: { students: { $each: ids } } },
      { new: true }
    );
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, message: 'Students added', data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add students', error: error.message });
  }
};

// ─── Submit / Update Feedback ─────────────────────────────────────────────────

export const submitFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { studentId } = req.params;
    const { attendanceStatus, criteriaRatings, overallComment } = req.body;

    const interview = await ScheduledInterview.findOne({
      _id: req.params.id,
      tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
    });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    // Auto-calculate overall score
    const scores: number[] = (criteriaRatings || []).map((c: any) => c.score).filter(Boolean);
    const overallScore = scores.length ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : undefined;

    const feedback = await InterviewScheduleFeedback.findOneAndUpdate(
      { interviewId: req.params.id, studentId: new mongoose.Types.ObjectId(studentId) },
      {
        $set: {
          tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
          interviewId: new mongoose.Types.ObjectId(req.params.id as string),
          studentId: new mongoose.Types.ObjectId(studentId),
          attendanceStatus: attendanceStatus || 'present',
          criteriaRatings: criteriaRatings || [],
          overallComment: overallComment || '',
          overallScore,
          submittedBy: new mongoose.Types.ObjectId(String(req.user!.id)),
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Feedback saved', data: feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to save feedback', error: error.message });
  }
};

// ─── Get Feedback for one student ────────────────────────────────────────────

export const getFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const feedback = await InterviewScheduleFeedback.findOne({
      interviewId: req.params.id,
      studentId: new mongoose.Types.ObjectId(req.params.studentId),
    })
      .populate('submittedBy', 'firstName lastName')
      .lean();
    res.json({ success: true, message: 'Feedback fetched', data: feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback', error: error.message });
  }
};

// ─── Release Feedback to Student ─────────────────────────────────────────────

export const releaseFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { studentId } = req.params;
    const { release } = req.body; // true = release, false = un-release

    const feedback = await InterviewScheduleFeedback.findOneAndUpdate(
      { interviewId: req.params.id, studentId: new mongoose.Types.ObjectId(studentId) },
      {
        $set: {
          releasedToStudent: release !== false,
          releasedAt: release !== false ? new Date() : undefined,
          releasedBy: release !== false ? new mongoose.Types.ObjectId(String(req.user!.id)) : undefined,
        },
      },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, message: `Feedback ${release !== false ? 'released' : 'hidden'}`, data: feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to release feedback', error: error.message });
  }
};

// ─── Release all feedback for an interview ───────────────────────────────────

export const releaseAllFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    await InterviewScheduleFeedback.updateMany(
      { interviewId: new mongoose.Types.ObjectId(req.params.id) },
      {
        $set: {
          releasedToStudent: true,
          releasedAt: new Date(),
          releasedBy: new mongoose.Types.ObjectId(String(req.user!.id)),
        },
      }
    );
    res.json({ success: true, message: 'All feedback released' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to release feedback', error: error.message });
  }
};

// ─── Student: my interviews ───────────────────────────────────────────────────

export const getMyInterviews = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const studentId = new mongoose.Types.ObjectId(String(req.user!.id));
    const interviews = await ScheduledInterview.find({
      tenantId: new mongoose.Types.ObjectId(String(req.tenantId)),
      students: studentId,
      status: { $ne: 'cancelled' },
    })
      .sort({ date: -1 })
      .select('title date time duration interviewerName venue meetLink criteria status description')
      .lean();

    res.json({ success: true, message: 'My interviews fetched', data: interviews });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch interviews', error: error.message });
  }
};

// ─── Student: my feedback (only released) ────────────────────────────────────

export const getMyFeedback = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const studentId = new mongoose.Types.ObjectId(String(req.user!.id));
    const feedbacks = await InterviewScheduleFeedback.find({
      studentId,
      releasedToStudent: true,
    })
      .populate({
        path: 'interviewId',
        select: 'title date time interviewerName criteria status',
      })
      .sort({ submittedAt: -1 })
      .lean();

    res.json({ success: true, message: 'My feedback fetched', data: feedbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback', error: error.message });
  }
};

// ─── Student: feedback for specific interview ─────────────────────────────────

export const getMyFeedbackForInterview = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const feedback = await InterviewScheduleFeedback.findOne({
      interviewId: new mongoose.Types.ObjectId(req.params.id),
      studentId: new mongoose.Types.ObjectId(String(req.user!.id)),
      releasedToStudent: true,
    }).lean();
    res.json({ success: true, message: 'Feedback fetched', data: feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback', error: error.message });
  }
};
