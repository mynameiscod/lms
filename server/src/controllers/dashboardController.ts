import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Assignment from '../models/Assignment';
import Submission from '../models/Submission';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import Course from '../models/Course';
import Chapter from '../models/Chapter';
import Enrollment from '../models/Enrollment';
import StudentProgress from '../models/StudentProgress';
import User from '../models/User';
import Content from '../models/Content';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import Batch from '../models/Batch';
import Fee from '../models/Fee';
import Lead from '../models/Lead';
import Attendance from '../models/Attendance';
import PlacementDrive from '../models/PlacementDrive';
import ScheduledInterview from '../models/ScheduledInterview';
import AssessmentSubmission from '../models/AssessmentSubmission';

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

class DashboardController {
  // Get student dashboard data
  getStudentDashboard = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const tenantObjectId = new Types.ObjectId(tenantId);
      const userObjectId = new Types.ObjectId(userId);

      // Get student's enrollment (single course)
      const enrollment = await Enrollment.findOne({
        userId: userObjectId,
        tenantId: tenantObjectId,
        status: 'enrolled'
      }).populate('courseId', 'title description');

      let courseData = null;
      let courseProgress = { completed: 0, total: 0, percentage: 0 };

      if (enrollment?.courseId) {
        const course = enrollment.courseId as any;
        
        // Get total chapters in the course
        const totalChapters = await Chapter.countDocuments({ 
          course: course._id,
          isActive: true 
        });

        // Get progress from StudentProgress
        const progress = await StudentProgress.findOne({
          user: userObjectId,
          course: course._id,
          tenant: tenantObjectId
        });

        const completedChapters = progress?.chapterProgress?.filter(cp => cp.isCompleted)?.length || 0;

        courseData = {
          _id: course._id,
          title: course.title,
          description: course.description
        };

        courseProgress = {
          completed: completedChapters,
          total: totalChapters,
          percentage: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
        };
      }

      // Get upcoming assignments (due in the future, not yet submitted)
      const now = new Date();
      const upcomingAssignments = await Assignment.find({
        tenant: tenantObjectId,
        status: 'published',
        dueDate: { $gte: now }
      })
        .select('title type difficulty dueDate totalPoints')
        .sort({ dueDate: 1 })
        .limit(5)
        .lean();

      // Get student's submissions to check which assignments are completed
      const submittedAssignmentIds = await Submission.find({
        student: userObjectId,
        status: { $in: ['submitted', 'graded'] }
      }).distinct('assignment');

      const assignmentsWithStatus = upcomingAssignments.map(a => ({
        ...a,
        isSubmitted: submittedAssignmentIds.some(id => id.toString() === a._id.toString()),
        daysUntilDue: Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }));

      // Get upcoming quizzes
      const upcomingQuizzes = await Quiz.find({
        tenantId: tenantObjectId,
        isActive: true,
        $or: [
          { endDate: { $gte: now } },
          { endDate: { $exists: false } }
        ]
      })
        .select('title passingScore timeLimit endDate totalQuestions')
        .sort({ endDate: 1 })
        .limit(5)
        .lean();

      // Get student's quiz attempts
      const attemptedQuizIds = await QuizAttempt.find({
        studentId: userId,
        status: { $in: ['submitted', 'grading'] }
      }).distinct('quizId');

      const quizzesWithStatus = upcomingQuizzes.map(q => ({
        ...q,
        isAttempted: attemptedQuizIds.some((id: any) => id.toString() === q._id.toString()),
        daysUntilEnd: q.endDate ? Math.ceil((new Date(q.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
      }));

      // Get recent submissions (last 5)
      const recentSubmissions = await Submission.find({
        student: userObjectId,
        status: { $in: ['submitted', 'graded'] }
      })
        .populate('assignment', 'title type')
        .select('submittedAt status grading')
        .sort({ submittedAt: -1 })
        .limit(5)
        .lean();

      // Get recent quiz attempts
      const recentQuizAttempts = await QuizAttempt.find({
        studentId: userId,
        status: { $in: ['submitted', 'grading'] }
      })
        .select('quizId submittedAt obtainedMarks status')
        .sort({ submittedAt: -1 })
        .limit(5)
        .lean();

      // Fetch quiz titles for recent attempts
      const quizIds = recentQuizAttempts.map(a => a.quizId);
      const quizTitles = await Quiz.find({ _id: { $in: quizIds } }).select('title').lean();
      const quizTitleMap = new Map(quizTitles.map(q => [q._id.toString(), q.title]));

      // Get recent snippet submissions
      const recentSnippetSubmissions = await CodeSnippetSubmission.find({
        studentId: userObjectId,
        tenantId: tenantObjectId,
        status: { $in: ['submitted', 'grading', 'graded'] }
      })
        .select('assessmentId submittedAt totalMarksAwarded status')
        .sort({ submittedAt: -1 })
        .limit(5)
        .lean();

      // Fetch snippet titles
      const snippetAssessmentIds = recentSnippetSubmissions.map(s => s.assessmentId);
      const snippetTitles = await CodeSnippetAssessment.find({ _id: { $in: snippetAssessmentIds } }).select('title').lean();
      const snippetTitleMap = new Map(snippetTitles.map(s => [s._id.toString(), s.title]));

      // Upcoming code snippets
      const upcomingSnippets = await CodeSnippetAssessment.find({
        tenantId: tenantObjectId,
        status: 'published',
        $or: [
          { dueDate: { $gte: now } },
          { dueDate: { $exists: false } }
        ]
      })
        .select('title language totalMarks dueDate')
        .sort({ dueDate: 1 })
        .limit(5)
        .lean();

      const attemptedSnippetIds = await CodeSnippetSubmission.find({
        studentId: userObjectId,
        tenantId: tenantObjectId
      }).distinct('assessmentId');

      const snippetsWithStatus = upcomingSnippets.map(s => ({
        ...s,
        isAttempted: attemptedSnippetIds.some((id: any) => id.toString() === s._id.toString()),
        daysUntilDue: s.dueDate ? Math.ceil((new Date(s.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
      }));

      // Combine and sort recent activity
      const recentActivity = [
        ...recentSubmissions.map((s: any) => ({
          type: 'assignment',
          title: s.assignment?.title || 'Assignment',
          timestamp: s.submittedAt,
          status: s.status,
          score: s.grading?.score,
          icon: '✏️'
        })),
        ...recentQuizAttempts.map((a: any) => ({
          type: 'quiz',
          title: quizTitleMap.get(a.quizId) || 'Quiz',
          timestamp: a.submittedAt,
          status: a.status,
          score: a.obtainedMarks,
          icon: '📝'
        })),
        ...recentSnippetSubmissions.map((s: any) => ({
          type: 'snippet',
          title: snippetTitleMap.get(s.assessmentId?.toString()) || 'Code Snippet',
          timestamp: s.submittedAt,
          status: s.status,
          score: s.totalMarksAwarded,
          icon: '💻'
        }))
      ].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 5);

      // Get quick stats
      const totalAssignments = await Assignment.countDocuments({
        tenant: tenantObjectId,
        status: 'published'
      });

      const completedAssignments = await Submission.countDocuments({
        student: userObjectId,
        tenant: tenantObjectId,
        status: { $in: ['submitted', 'graded'] }
      });

      const totalQuizzes = await Quiz.countDocuments({
        tenantId: tenantObjectId,
        isActive: true
      });

      const completedQuizzes = await QuizAttempt.countDocuments({
        studentId: userId,
        status: { $in: ['submitted', 'grading'] }
      });

      const totalSnippets = await CodeSnippetAssessment.countDocuments({
        tenantId: tenantObjectId,
        status: 'published'
      });

      const completedSnippets = await CodeSnippetSubmission.countDocuments({
        studentId: userObjectId,
        tenantId: tenantObjectId
      });

      // Get pending items count
      const pendingAssignments = assignmentsWithStatus.filter(a => !a.isSubmitted).length;
      const pendingQuizzes = quizzesWithStatus.filter(q => !q.isAttempted).length;
      const pendingSnippets = snippetsWithStatus.filter(s => !s.isAttempted).length;

      res.json({
        success: true,
        data: {
          course: courseData,
          courseProgress,
          upcomingDeadlines: {
            assignments: assignmentsWithStatus.filter(a => !a.isSubmitted),
            quizzes: quizzesWithStatus.filter(q => !q.isAttempted),
            snippets: snippetsWithStatus.filter(s => !s.isAttempted)
          },
          recentActivity,
          stats: {
            totalAssignments,
            completedAssignments,
            pendingAssignments,
            totalQuizzes,
            completedQuizzes,
            pendingQuizzes,
            totalSnippets,
            completedSnippets,
            pendingSnippets,
            courseProgress: courseProgress.percentage
          }
        }
      });
    } catch (error) {
      console.error('Get student dashboard error:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to load dashboard' 
      });
    }
  };
  // Get admin dashboard stats
  getAdminStats = async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const tenantObjectId = new Types.ObjectId(tenantId);

      const [totalStudents, activeCourses, totalContent] = await Promise.all([
        User.countDocuments({ tenantId: tenantObjectId, role: 'STUDENT', isActive: true }),
        Course.countDocuments({ tenantId: tenantObjectId, isActive: true }),
        Content.countDocuments({ tenant: tenantObjectId })
      ]);

      res.json({
        success: true,
        data: { totalStudents, activeCourses, totalContent }
      });
    } catch (error) {
      console.error('Get admin stats error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load admin stats'
      });
    }
  };

  // Rich admin overview — every widget on the main dashboard, from live data.
  getAdminOverview = async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const t = new Types.ObjectId(tenantId);

      const now = new Date();
      const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
      const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start30 = new Date(now); start30.setDate(now.getDate() - 29); start30.setHours(0, 0, 0, 0);
      const prev30 = new Date(now); prev30.setDate(now.getDate() - 59); prev30.setHours(0, 0, 0, 0);
      const in7 = new Date(now); in7.setDate(now.getDate() + 7);
      const in60 = new Date(now); in60.setDate(now.getDate() + 60);

      const pct = (cur: number, prev: number): number =>
        prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? 100 : 0);

      // Count total + this/last month new, return { value, deltaPct }
      const card = async (Model: any, query: any, field = 'createdAt') => {
        const [value, thisM, lastM] = await Promise.all([
          Model.countDocuments(query),
          Model.countDocuments({ ...query, [field]: { $gte: startThis } }),
          Model.countDocuments({ ...query, [field]: { $gte: startLast, $lt: startThis } }),
        ]);
        return { value, deltaPct: pct(thisM, lastM) };
      };

      const [students, courses, batchesCard, leadsMonth] = await Promise.all([
        card(User, { tenantId: t, role: 'STUDENT', isActive: true }),
        card(Course, { tenantId: t, isActive: true }),
        card(Batch, { tenantId: t, isActive: true }),
        Promise.all([
          Lead.countDocuments({ tenantId: t, createdAt: { $gte: startThis } }),
          Lead.countDocuments({ tenantId: t, createdAt: { $gte: startLast, $lt: startThis } }),
        ]),
      ]);

      // Revenue (sum of fee payments) — total + this/last month
      const revAgg = await Fee.aggregate([
        { $match: { tenantId: t } },
        { $unwind: '$payments' },
        { $group: {
          _id: null,
          total: { $sum: '$payments.amount' },
          thisM: { $sum: { $cond: [{ $gte: ['$payments.paymentDate', startThis] }, '$payments.amount', 0] } },
          lastM: { $sum: { $cond: [{ $and: [{ $gte: ['$payments.paymentDate', startLast] }, { $lt: ['$payments.paymentDate', startThis] }] }, '$payments.amount', 0] } },
        } },
      ]);
      const rev = revAgg[0] || { total: 0, thisM: 0, lastM: 0 };

      // Fee collection donut
      const feeAgg = await Fee.aggregate([
        { $match: { tenantId: t } },
        { $group: {
          _id: null,
          collected: { $sum: '$paidAmount' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 0, '$dueAmount'] } },
          overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$dueAmount', 0] } },
        } },
      ]);
      const fees = feeAgg[0] ? { collected: feeAgg[0].collected || 0, pending: feeAgg[0].pending || 0, overdue: feeAgg[0].overdue || 0 } : { collected: 0, pending: 0, overdue: 0 };

      // Placements — distinct users marked "placed" across drives
      const placedAgg = await PlacementDrive.aggregate([
        { $match: { tenantId: t } },
        { $project: { s: { $objectToArray: { $ifNull: ['$applicantStatuses', {} ] } } } },
        { $unwind: '$s' },
        { $match: { 's.v': 'placed' } },
        { $group: { _id: '$s.k' } },
        { $count: 'n' },
      ]);

      // Enrollments series — new students/day for last 30 days
      const enrollAgg = await User.aggregate([
        { $match: { tenantId: t, role: 'STUDENT', createdAt: { $gte: start30 } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
      ]);
      const enrollMap: Record<string, number> = {};
      enrollAgg.forEach((d: any) => { enrollMap[d._id] = d.n; });
      const enrollmentsSeries: { label: string; value: number }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(start30); d.setDate(start30.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        enrollmentsSeries.push({ label: key, value: enrollMap[key] || 0 });
      }

      // Top courses + batch status
      const [topCoursesRaw, batchRows] = await Promise.all([
        Course.find({ tenantId: t, isActive: true }).select('title enrollmentCount').sort({ enrollmentCount: -1 }).limit(5).lean(),
        Batch.find({ tenantId: t, isActive: true }).select('name mode enrolledCount capacity endDate').sort({ createdAt: -1 }).limit(6).lean(),
      ]);
      const topCourses = topCoursesRaw.map((c: any) => ({ title: c.title, enrolled: c.enrollmentCount || 0 }));
      const batchStatus = batchRows.map((b: any) => ({ name: b.name, mode: b.mode || 'offline', enrolled: b.enrolledCount || 0, capacity: b.capacity || 0 }));

      // Upcoming reminders
      const reminders: { kind: string; title: string; when: Date | null }[] = [];
      const feeDueCount = await Fee.countDocuments({ tenantId: t, dueAmount: { $gt: 0 }, dueDate: { $gte: now, $lte: in7 } });
      if (feeDueCount > 0) reminders.push({ kind: 'fee', title: `Fee Due Reminder · ${feeDueCount} student${feeDueCount === 1 ? '' : 's'}`, when: in7 });
      const endingBatches = await Batch.find({ tenantId: t, isActive: true, endDate: { $gte: now, $lte: in60 } }).select('name endDate').sort({ endDate: 1 }).limit(2).lean();
      endingBatches.forEach((b: any) => reminders.push({ kind: 'batch', title: `Batch Ending · ${b.name}`, when: b.endDate }));
      const drives = await PlacementDrive.find({ tenantId: t, isActive: true, driveDate: { $gte: now } }).select('companyName name driveDate').sort({ driveDate: 1 }).limit(2).lean();
      drives.forEach((d: any) => reminders.push({ kind: 'placement', title: `Placement Drive · ${d.companyName || d.name}`, when: d.driveDate }));
      const interviews = await ScheduledInterview.find({ tenantId: t, status: 'scheduled', date: { $gte: now } }).select('title date').sort({ date: 1 }).limit(2).lean();
      interviews.forEach((iv: any) => reminders.push({ kind: 'interview', title: `Interview · ${iv.title || 'Mock Interview'}`, when: iv.date }));
      reminders.sort((a, b) => (a.when ? a.when.getTime() : 0) - (b.when ? b.when.getTime() : 0));

      // Recent activity — merge a few recent docs from several sources
      const activity: { icon: string; text: string; when: Date }[] = [];
      const [recentStudents, recentLeads, recentBatches, recentPays, recentAssess] = await Promise.all([
        User.find({ tenantId: t, role: 'STUDENT' }).select('firstName lastName createdAt').sort({ createdAt: -1 }).limit(4).lean(),
        Lead.find({ tenantId: t }).select('name source createdAt').sort({ createdAt: -1 }).limit(4).lean(),
        Batch.find({ tenantId: t }).select('name createdAt').sort({ createdAt: -1 }).limit(3).lean(),
        Fee.aggregate([
          { $match: { tenantId: t, 'payments.0': { $exists: true } } },
          { $unwind: '$payments' }, { $sort: { 'payments.paymentDate': -1 } }, { $limit: 4 },
          { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'stu' } },
          { $project: { amount: '$payments.amount', when: '$payments.paymentDate', stu: { $arrayElemAt: ['$stu', 0] } } },
        ]),
        AssessmentSubmission.find({ tenantId: t, status: { $in: ['submitted', 'graded'] } }).select('createdAt submittedAt').sort({ createdAt: -1 }).limit(4).lean(),
      ]);
      recentStudents.forEach((s: any) => activity.push({ icon: '🎓', text: `New student ${`${s.firstName || ''} ${s.lastName || ''}`.trim()} enrolled`, when: s.createdAt }));
      recentLeads.forEach((l: any) => activity.push({ icon: '🎯', text: `New lead ${l.name || ''}${l.source ? ` from ${l.source}` : ''}`, when: l.createdAt }));
      recentBatches.forEach((b: any) => activity.push({ icon: '👥', text: `New batch "${b.name}" created`, when: b.createdAt }));
      recentPays.forEach((p: any) => activity.push({ icon: '💰', text: `Payment of ₹${(p.amount || 0).toLocaleString('en-IN')} received${p.stu ? ` from ${`${p.stu.firstName || ''} ${p.stu.lastName || ''}`.trim()}` : ''}`, when: p.when }));
      recentAssess.forEach((a: any) => activity.push({ icon: '📝', text: 'Assessment completed', when: a.submittedAt || a.createdAt }));
      activity.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
      const recentActivity = activity.slice(0, 6);

      // Bottom strip metrics
      const [assessThis, assessLast] = await Promise.all([
        AssessmentSubmission.countDocuments({ tenantId: t, createdAt: { $gte: startThis } }),
        AssessmentSubmission.countDocuments({ tenantId: t, createdAt: { $gte: startLast, $lt: startThis } }),
      ]);
      // Certificates proxy = passed quizzes + passing assignment submissions
      const [certTotalQ, certTotalA, certThisQ, certThisA, certLastQ, certLastA] = await Promise.all([
        QuizAttempt.countDocuments({ tenantId: t, passed: true }),
        Submission.countDocuments({ tenantId: t, isPassing: true }),
        QuizAttempt.countDocuments({ tenantId: t, passed: true, createdAt: { $gte: startThis } }),
        Submission.countDocuments({ tenantId: t, isPassing: true, createdAt: { $gte: startThis } }),
        QuizAttempt.countDocuments({ tenantId: t, passed: true, createdAt: { $gte: startLast, $lt: startThis } }),
        Submission.countDocuments({ tenantId: t, isPassing: true, createdAt: { $gte: startLast, $lt: startThis } }),
      ]);
      const attAgg = await Attendance.aggregate([
        { $match: { tenantId: t, date: { $gte: prev30 } } },
        { $group: {
          _id: null,
          curPresent: { $sum: { $cond: [{ $and: [{ $gte: ['$date', start30] }, { $eq: ['$status', 'present'] }] }, 1, 0] } },
          curTotal: { $sum: { $cond: [{ $gte: ['$date', start30] }, 1, 0] } },
          prevPresent: { $sum: { $cond: [{ $and: [{ $lt: ['$date', start30] }, { $eq: ['$status', 'present'] }] }, 1, 0] } },
          prevTotal: { $sum: { $cond: [{ $lt: ['$date', start30] }, 1, 0] } },
        } },
      ]);
      const att = attAgg[0] || { curPresent: 0, curTotal: 0, prevPresent: 0, prevTotal: 0 };
      const curAtt = att.curTotal ? Math.round((att.curPresent / att.curTotal) * 1000) / 10 : 0;
      const prevAtt = att.prevTotal ? Math.round((att.prevPresent / att.prevTotal) * 1000) / 10 : 0;

      res.json({
        success: true,
        data: {
          stats: {
            students,
            courses,
            batches: batchesCard,
            revenue: { value: rev.total, deltaPct: pct(rev.thisM, rev.lastM) },
            placements: { value: placedAgg[0]?.n || 0, deltaPct: null },
          },
          enrollmentsSeries,
          topCourses,
          fees,
          batchStatus,
          reminders: reminders.slice(0, 5),
          recentActivity,
          bottom: {
            newLeads: { value: leadsMonth[0], deltaPct: pct(leadsMonth[0], leadsMonth[1]) },
            assessments: { value: assessThis, deltaPct: pct(assessThis, assessLast) },
            certificates: { value: certTotalQ + certTotalA, deltaPct: pct(certThisQ + certThisA, certLastQ + certLastA) },
            avgAttendance: { value: curAtt, deltaPct: pct(curAtt, prevAtt) },
          },
        },
      });
    } catch (error) {
      console.error('Get admin overview error:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to load admin overview' });
    }
  };
}

export default new DashboardController();
