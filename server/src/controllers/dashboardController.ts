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
  };}

export default new DashboardController();
