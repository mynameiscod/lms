import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Topic from '../models/Topic';
import Subject from '../models/Subject';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import Enrollment from '../models/Enrollment';
import Attendance from '../models/Attendance';
import User from '../models/User';
import { InterviewQuestion, StudentQuestionProgress } from '../models/InterviewQuestion';

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

type MasteryLevel = 'not_started' | 'weak' | 'developing' | 'strong';

function computeLevel(score: number): MasteryLevel {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'developing';
  if (score >= 10) return 'weak';
  return 'not_started';
}

function computeMastery(quizBest: number, interviewPct: number): number {
  if (quizBest > 0 && interviewPct > 0) {
    return Math.round(quizBest * 0.6 + interviewPct * 0.4);
  }
  if (quizBest > 0) return Math.round(quizBest);
  if (interviewPct > 0) return Math.round(interviewPct);
  return 0;
}

/**
 * GET /api/v1/topic-mastery/heatmap
 * Query: subjectId (required), batchId (optional)
 * Returns a matrix: students × topics with mastery data
 */
export const getHeatmap = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { subjectId, batchId } = req.query as { subjectId?: string; batchId?: string };

    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId is required' });

    const tenantOid = new Types.ObjectId(tenantId);
    const subjectOid = new Types.ObjectId(subjectId);

    // 1. Get all active topics for this subject
    const topics = await Topic.find({ subjectId: subjectOid, tenantId: tenantOid, isActive: true })
      .sort({ order: 1 })
      .select('_id title chapterId order')
      .lean();

    if (!topics.length) {
      return res.json({ success: true, data: { topics: [], students: [], data: {} } });
    }

    const chapterIds = [...new Set(topics.map(t => t.chapterId?.toString()))]
      .filter(Boolean)
      .map(id => new Types.ObjectId(id!));
    const topicIds = topics.map(t => (t._id as Types.ObjectId));

    // Get subject name
    const subject = await Subject.findById(subjectOid).select('name').lean();

    // 2. Get enrolled students (filtered by batch if provided)
    const enrollmentQuery: any = { tenantId: tenantOid, status: 'enrolled' };
    if (batchId) {
      const batchStudentIds = await Attendance.distinct('studentId', {
        tenantId: tenantOid,
        batchId: new Types.ObjectId(batchId)
      });
      enrollmentQuery.userId = { $in: batchStudentIds };
    }

    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate({ path: 'userId', select: 'firstName lastName email' })
      .lean();

    const students = enrollments
      .filter(e => e.userId && (e.userId as any)._id)
      .map(e => {
        const u = e.userId as any;
        return {
          _id: u._id.toString(),
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
        };
      });

    if (!students.length) {
      return res.json({
        success: true,
        data: {
          topics: topics.map(t => ({ _id: t._id, title: t.title, order: t.order, subjectName: subject?.name || '' })),
          students: [],
          data: {}
        }
      });
    }

    const studentIds = students.map(s => s._id);

    // 3. Get interview Q counts per chapter (total available)
    const iqCountDocs = await InterviewQuestion.aggregate([
      { $match: { chapterId: { $in: chapterIds }, tenantId: tenantOid, isActive: true } },
      { $group: { _id: '$chapterId', total: { $sum: 1 } } }
    ]);
    const iqCountMap: Record<string, number> = {};
    iqCountDocs.forEach(d => { iqCountMap[d._id.toString()] = d.total; });

    // 4. Get student question progress per chapter
    const progressDocs = await StudentQuestionProgress.find({
      chapterId: { $in: chapterIds },
      studentId: { $in: studentIds.map(id => new Types.ObjectId(id)) },
      tenantId: tenantOid,
      status: { $in: ['understood', 'confident'] }
    }).select('studentId chapterId').lean();

    // Group: { studentId → { chapterId → confidentCount } }
    const progressMap: Record<string, Record<string, number>> = {};
    progressDocs.forEach(p => {
      const sid = p.studentId.toString();
      const cid = p.chapterId.toString();
      if (!progressMap[sid]) progressMap[sid] = {};
      progressMap[sid][cid] = (progressMap[sid][cid] || 0) + 1;
    });

    // 5. Get quiz attempts for quizzes tagged with these topicIds
    const taggedQuizzes = await Quiz.find({ topicId: { $in: topicIds }, tenantId: tenantId! })
      .select('_id topicId').lean();
    const taggedQuizMap: Record<string, string> = {}; // quizId → topicId
    taggedQuizzes.forEach(q => {
      if (q.topicId) taggedQuizMap[q._id.toString()] = (q.topicId as Types.ObjectId).toString();
    });
    const taggedQuizIds = Object.keys(taggedQuizMap);

    // Best quiz per-student per-topic
    const quizAttemptDocs = taggedQuizIds.length
      ? await QuizAttempt.find({
          quizId: { $in: taggedQuizIds },
          studentId: { $in: studentIds },
          status: 'submitted'
        }).select('studentId quizId percentage').lean()
      : [];

    // Build: { studentId → { topicId → bestPct } }
    const quizBestMap: Record<string, Record<string, number>> = {};
    quizAttemptDocs.forEach((a: any) => {
      const sid = a.studentId.toString();
      const tid = taggedQuizMap[a.quizId.toString()];
      if (!tid) return;
      if (!quizBestMap[sid]) quizBestMap[sid] = {};
      const cur = quizBestMap[sid][tid] || 0;
      quizBestMap[sid][tid] = Math.max(cur, a.percentage || 0);
    });

    // 6. Build the result matrix
    const heatmapData: Record<string, Record<string, { masteryScore: number; masteryLevel: MasteryLevel; quizBestScore: number; interviewScore: number }>> = {};

    for (const student of students) {
      heatmapData[student._id] = {};
      for (const topic of topics) {
        const tid = (topic._id as Types.ObjectId).toString();
        const cid = topic.chapterId?.toString() || '';

        const totalIQ = iqCountMap[cid] || 0;
        const confidentIQ = progressMap[student._id]?.[cid] || 0;
        const interviewScore = totalIQ > 0 ? Math.round((confidentIQ / totalIQ) * 100) : 0;

        const quizBest = quizBestMap[student._id]?.[tid] || 0;
        const masteryScore = computeMastery(quizBest, interviewScore);

        heatmapData[student._id][tid] = {
          masteryScore,
          masteryLevel: computeLevel(masteryScore),
          quizBestScore: Math.round(quizBest),
          interviewScore
        };
      }
    }

    return res.json({
      success: true,
      data: {
        subject: { _id: subjectOid, name: subject?.name || '' },
        topics: topics.map(t => ({
          _id: t._id,
          title: t.title,
          order: t.order,
          chapterId: t.chapterId,
          subjectName: subject?.name || '',
          hasTaggedQuizzes: taggedQuizzes.some(q => q.topicId?.toString() === (t._id as Types.ObjectId).toString()),
          interviewQCount: iqCountMap[t.chapterId?.toString() || ''] || 0
        })),
        students,
        data: heatmapData
      }
    });
  } catch (err: any) {
    console.error('[TopicMastery] getHeatmap error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/topic-mastery/student/:studentId
 * Admin: get all topic mastery for a specific student
 */
export const getStudentMastery = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { studentId } = req.params;
    const { courseId } = req.query as { courseId?: string };

    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const tenantOid = new Types.ObjectId(tenantId);
    const studentOid = new Types.ObjectId(studentId);

    // Get student's topics through their enrollment
    const enrollmentQuery: any = { userId: studentOid, tenantId: tenantOid, status: 'enrolled' };
    if (courseId) enrollmentQuery.courseId = new Types.ObjectId(courseId);

    const enrollment = await Enrollment.findOne(enrollmentQuery).lean();
    if (!enrollment) {
      return res.json({ success: true, data: { topics: [], summary: null } });
    }

    // Get subjects for the course
    const subjects = await Subject.find({
      courseId: enrollment.courseId,
      tenantId: tenantOid,
      isActive: true
    }).select('_id name').lean();

    const subjectIds = subjects.map(s => s._id);

    // Get all topics
    const topics = await Topic.find({
      subjectId: { $in: subjectIds },
      tenantId: tenantOid,
      isActive: true
    }).sort({ order: 1 }).select('_id title chapterId subjectId order').lean();

    const chapterIds = [...new Set(topics.map(t => t.chapterId?.toString()).filter(Boolean))]
      .map(id => new Types.ObjectId(id!));
    const topicIds = topics.map(t => t._id as Types.ObjectId);

    // Interview Q counts per chapter
    const iqCountDocs = await InterviewQuestion.aggregate([
      { $match: { chapterId: { $in: chapterIds }, tenantId: tenantOid, isActive: true } },
      { $group: { _id: '$chapterId', total: { $sum: 1 } } }
    ]);
    const iqCountMap: Record<string, number> = {};
    iqCountDocs.forEach(d => { iqCountMap[d._id.toString()] = d.total; });

    // Student Q progress
    const progressDocs = await StudentQuestionProgress.find({
      studentId: studentOid,
      chapterId: { $in: chapterIds },
      tenantId: tenantOid,
      status: { $in: ['understood', 'confident'] }
    }).select('chapterId').lean();

    const progressMap: Record<string, number> = {};
    progressDocs.forEach(p => {
      const cid = p.chapterId.toString();
      progressMap[cid] = (progressMap[cid] || 0) + 1;
    });

    // Tagged quiz attempts
    const taggedQuizzes = await Quiz.find({ topicId: { $in: topicIds }, tenantId: tenantId! })
      .select('_id topicId').lean();
    const taggedQuizMap: Record<string, string> = {};
    taggedQuizzes.forEach(q => {
      if (q.topicId) taggedQuizMap[q._id.toString()] = (q.topicId as Types.ObjectId).toString();
    });

    const quizAttempts = taggedQuizzes.length
      ? await QuizAttempt.find({
          quizId: { $in: Object.keys(taggedQuizMap) },
          studentId: studentId,
          status: 'submitted'
        }).select('quizId percentage').lean()
      : [];

    const quizBestByTopic: Record<string, number> = {};
    quizAttempts.forEach((a: any) => {
      const tid = taggedQuizMap[a.quizId];
      if (tid) quizBestByTopic[tid] = Math.max(quizBestByTopic[tid] || 0, a.percentage || 0);
    });

    // Build per-topic mastery
    const subjectMap: Record<string, string> = {};
    subjects.forEach(s => { subjectMap[(s._id as Types.ObjectId).toString()] = s.name; });

    const topicsWithMastery = topics.map(t => {
      const tid = (t._id as Types.ObjectId).toString();
      const cid = t.chapterId?.toString() || '';
      const totalIQ = iqCountMap[cid] || 0;
      const confidentIQ = progressMap[cid] || 0;
      const interviewScore = totalIQ > 0 ? Math.round((confidentIQ / totalIQ) * 100) : 0;
      const quizBest = quizBestByTopic[tid] || 0;
      const masteryScore = computeMastery(quizBest, interviewScore);

      return {
        _id: t._id,
        title: t.title,
        order: t.order,
        subjectId: t.subjectId,
        subjectName: subjectMap[t.subjectId?.toString() || ''] || '',
        chapterId: t.chapterId,
        masteryScore,
        masteryLevel: computeLevel(masteryScore),
        quizBestScore: Math.round(quizBest),
        interviewScore,
        interviewQTotal: totalIQ,
        interviewQConfident: confidentIQ
      };
    });

    const strongCount = topicsWithMastery.filter(t => t.masteryLevel === 'strong').length;
    const weakCount = topicsWithMastery.filter(t => ['not_started', 'weak'].includes(t.masteryLevel)).length;
    const avgScore = topicsWithMastery.length
      ? Math.round(topicsWithMastery.reduce((s, t) => s + t.masteryScore, 0) / topicsWithMastery.length)
      : 0;

    return res.json({
      success: true,
      data: {
        studentId,
        enrollment: { courseId: enrollment.courseId },
        topics: topicsWithMastery,
        summary: {
          totalTopics: topicsWithMastery.length,
          strongCount,
          weakCount,
          avgScore
        }
      }
    });
  } catch (err: any) {
    console.error('[TopicMastery] getStudentMastery error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/topic-mastery/my
 * Student: get their own mastery per topic
 */
export const getMyMastery = async (req: AuthRequest, res: Response) => {
  const studentId = req.user?.id;
  if (!studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  req.params.studentId = studentId;
  return getStudentMastery(req, res);
};

/**
 * GET /api/v1/topic-mastery/topic/:topicId
 * Admin: get all students' mastery for a specific topic
 */
export const getTopicMastery = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { topicId } = req.params;
    const { batchId } = req.query as { batchId?: string };

    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const tenantOid = new Types.ObjectId(tenantId);
    const topicOid = new Types.ObjectId(topicId);

    const topic = await Topic.findOne({ _id: topicOid, tenantId: tenantOid }).select('title chapterId subjectId').lean();
    if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });

    const chapterId = topic.chapterId as Types.ObjectId;

    // Get students
    const enrollmentQuery: any = { tenantId: tenantOid, status: 'enrolled' };
    if (batchId) enrollmentQuery.batchId = new Types.ObjectId(batchId);
    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate({ path: 'userId', select: 'firstName lastName email' }).lean();

    const students = enrollments
      .filter(e => e.userId && (e.userId as any)._id)
      .map(e => {
        const u = e.userId as any;
        return { _id: u._id.toString(), name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email };
      });

    const studentIds = students.map(s => s._id);

    // IQ count
    const totalIQ = await InterviewQuestion.countDocuments({ chapterId, tenantId: tenantOid, isActive: true });

    // Progress per student
    const progressDocs = await StudentQuestionProgress.find({
      studentId: { $in: studentIds.map(id => new Types.ObjectId(id)) },
      chapterId,
      tenantId: tenantOid,
      status: { $in: ['understood', 'confident'] }
    }).select('studentId').lean();

    const progressByStu: Record<string, number> = {};
    progressDocs.forEach(p => {
      const sid = p.studentId.toString();
      progressByStu[sid] = (progressByStu[sid] || 0) + 1;
    });

    // Quiz attempts
    const taggedQuizzes = await Quiz.find({ topicId: topicOid, tenantId: tenantId! }).select('_id').lean();
    const quizIds = taggedQuizzes.map(q => q._id.toString());

    const quizAttempts = quizIds.length
      ? await QuizAttempt.find({ quizId: { $in: quizIds }, studentId: { $in: studentIds }, status: 'submitted' })
          .select('studentId percentage').lean()
      : [];

    const quizBestByStu: Record<string, number> = {};
    quizAttempts.forEach((a: any) => {
      const sid = a.studentId;
      quizBestByStu[sid] = Math.max(quizBestByStu[sid] || 0, a.percentage || 0);
    });

    const studentsWithMastery = students.map(s => {
      const confidentIQ = progressByStu[s._id] || 0;
      const interviewScore = totalIQ > 0 ? Math.round((confidentIQ / totalIQ) * 100) : 0;
      const quizBest = quizBestByStu[s._id] || 0;
      const masteryScore = computeMastery(quizBest, interviewScore);
      return {
        ...s,
        masteryScore,
        masteryLevel: computeLevel(masteryScore),
        quizBestScore: Math.round(quizBest),
        interviewScore
      };
    }).sort((a, b) => a.masteryScore - b.masteryScore);

    const dist = { not_started: 0, weak: 0, developing: 0, strong: 0 };
    studentsWithMastery.forEach(s => { dist[s.masteryLevel]++; });

    return res.json({
      success: true,
      data: {
        topic: { _id: topicOid, title: topic.title },
        students: studentsWithMastery,
        distribution: dist,
        avgMastery: studentsWithMastery.length
          ? Math.round(studentsWithMastery.reduce((s, t) => s + t.masteryScore, 0) / studentsWithMastery.length)
          : 0
      }
    });
  } catch (err: any) {
    console.error('[TopicMastery] getTopicMastery error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/topic-mastery/subjects
 * Utility: get subjects list for admin filters
 */
export const getSubjectsForFilter = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const subjects = await Subject.find({ tenantId: new Types.ObjectId(tenantId), isActive: true })
      .sort({ name: 1 })
      .select('_id name courseId')
      .populate({ path: 'courseId', select: 'title' })
      .lean();
    return res.json({ success: true, data: subjects });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
