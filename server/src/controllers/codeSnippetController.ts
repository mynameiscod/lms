import { Request, Response } from 'express';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

class CodeSnippetController {
  // ────────────────────────────── Admin CRUD ──────────────────────────────

  async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { questions = [], ...rest } = req.body;
      const totalMarks = questions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0);

      const assessment = await CodeSnippetAssessment.create({
        ...rest,
        questions,
        totalMarks,
        tenantId,
        createdBy: userId,
      });

      res.status(201).json({ success: true, data: assessment, message: 'Assessment created successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create assessment' });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { status, courseId, subjectId, chapterId, topicId } = req.query;
      const filter: any = { tenantId };
      if (status) filter.status = status;
      if (courseId) filter.courseId = courseId;
      if (subjectId) filter.subjectId = subjectId;
      if (chapterId) filter.chapterId = chapterId;
      if (topicId) filter.topicId = topicId;

      const assessments = await CodeSnippetAssessment.find(filter)
        .sort({ createdAt: -1 })
        .select('-codeSnippet');

      res.json({ success: true, data: assessments });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch assessments' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const assessment = await CodeSnippetAssessment.findOne({ _id: id, tenantId });
      if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

      res.json({ success: true, data: assessment });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch assessment' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { questions, ...rest } = req.body;
      const updateData: any = { ...rest, updatedBy: userId };
      if (questions !== undefined) {
        updateData.questions = questions;
        updateData.totalMarks = questions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0);
      }

      const assessment = await CodeSnippetAssessment.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true, runValidators: true }
      );
      if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

      res.json({ success: true, data: assessment, message: 'Assessment updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to update assessment' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const assessment = await CodeSnippetAssessment.findOneAndDelete({ _id: id, tenantId });
      if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

      await CodeSnippetSubmission.deleteMany({ assessmentId: id });

      res.json({ success: true, message: 'Assessment deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to delete assessment' });
    }
  }

  async publish(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const assessment = await CodeSnippetAssessment.findOneAndUpdate(
        { _id: id, tenantId },
        { status: 'published' },
        { new: true }
      );
      if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

      res.json({ success: true, data: assessment, message: 'Assessment published successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to publish assessment' });
    }
  }

  // ────────────────────────────── Student routes ──────────────────────────────

  async getStudentAssessments(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const studentId = req.user?.id;
      if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const user = await User.findById(studentId).select('batchId');
      const batchId = user?.batchId?.toString();

      const orConditions: any[] = [{ batchIds: { $size: 0 } }];
      if (batchId) orConditions.push({ batchIds: batchId });

      const assessments = await CodeSnippetAssessment.find({
        tenantId,
        status: 'published',
        $or: orConditions,
      }).sort({ createdAt: -1 });

      const assessmentIds = assessments.map((a) => a._id);
      const submissions = await CodeSnippetSubmission.find({
        assessmentId: { $in: assessmentIds },
        studentId,
      }).select('assessmentId status totalMarksAwarded');

      const submissionMap = new Map(submissions.map((s) => [s.assessmentId.toString(), s]));

      const data = assessments.map((a) => {
        const aObj = a.toObject();
        return {
          ...aObj,
          // hide correct answer flags from students
          questions: aObj.questions.map((q: any) => ({
            _id: q._id,
            question: q.question,
            type: q.type,
            marks: q.marks,
            options: (q.options || []).map(({ text }: { text: string }) => ({ text })),
          })),
          submission: submissionMap.get(a._id.toString()) || null,
        };
      });

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch assessments' });
    }
  }

  async submit(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const studentId = req.user?.id;
      if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const assessment = await CodeSnippetAssessment.findOne({ _id: id, tenantId, status: 'published' });
      if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found or not published' });

      const existing = await CodeSnippetSubmission.findOne({ assessmentId: id, studentId });
      if (existing) return res.status(400).json({ success: false, message: 'You have already submitted this assessment' });

      const { answers } = req.body;
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: 'Answers array is required' });
      }

      const submission = await CodeSnippetSubmission.create({
        assessmentId: id,
        studentId,
        tenantId,
        answers,
        status: 'submitted',
        submittedAt: new Date(),
      });

      res.status(201).json({ success: true, data: submission, message: 'Assessment submitted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to submit assessment' });
    }
  }

  async getMySubmission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const studentId = req.user?.id;
      if (!tenantId || !studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const submission = await CodeSnippetSubmission.findOne({ assessmentId: id, studentId });
      res.json({ success: true, data: submission || null });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch submission' });
    }
  }

  // ────────────────────────────── Instructor routes ──────────────────────────────

  async getSubmissions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const assessment = await CodeSnippetAssessment.findOne({ _id: id, tenantId });
      if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

      const submissions = await CodeSnippetSubmission.find({ assessmentId: id, tenantId })
        .populate('studentId', 'firstName lastName email')
        .sort({ submittedAt: -1 });

      res.json({ success: true, data: submissions, assessment });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to fetch submissions' });
    }
  }

  async grade(req: AuthRequest, res: Response) {
    try {
      const { submissionId } = req.params;
      const tenantId = req.tenantId;
      const instructorId = req.user?.id;
      if (!tenantId || !instructorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { grades, overallFeedback } = req.body;
      if (!grades || !Array.isArray(grades)) {
        return res.status(400).json({ success: false, message: 'Grades array is required' });
      }

      const totalMarksAwarded = grades.reduce((sum: number, g: any) => sum + (Number(g.marksAwarded) || 0), 0);

      const submission = await CodeSnippetSubmission.findOneAndUpdate(
        { _id: submissionId, tenantId },
        {
          grades,
          overallFeedback: overallFeedback || '',
          totalMarksAwarded,
          status: 'graded',
          gradedBy: instructorId,
          gradedAt: new Date(),
        },
        { new: true }
      );
      if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

      res.json({ success: true, data: submission, message: 'Submission graded successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to grade submission' });
    }
  }
}

export default new CodeSnippetController();
