import { Request, Response } from 'express';
import submissionService from '../services/submissionService';
import assignmentHintService from '../services/assignmentHintService';
import { SubmissionStatus } from '../models/Submission';
import { checkDeadlineGate } from '../services/assessmentDeliveryService';

// Extended Request interface with user and tenant
interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

class SubmissionController {
  // Start a new submission
  async start(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { assignmentId } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Per-batch deadline/late-policy gate (schedule row, else the assignment's baked dates).
      const gate = await checkDeadlineGate(tenantId, userId, 'assignment', assignmentId);
      if (!gate.allowed) {
        return res.status(403).json({ success: false, message: gate.reason || 'This assignment is closed.' });
      }

      const submission = await submissionService.startSubmission({
        tenant: tenantId as any,
        assignment: assignmentId as any,
        student: userId as any,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        data: submission,
        message: 'Submission started'
      });
    } catch (error) {
      console.error('Start submission error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start submission'
      });
    }
  }

  // Get student's current submission for an assignment
  async getMySubmission(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { assignmentId } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submission = await submissionService.getSubmissionForAssignment(
        assignmentId,
        userId as any,
        tenantId as any
      );

      res.json({ success: true, data: submission });
    } catch (error) {
      console.error('Get submission error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get submission'
      });
    }
  }

  // Save code (auto-save)
  async saveCode(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { code, language } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submission = await submissionService.saveCode(
        submissionId,
        userId as any,
        tenantId as any,
        { code, language }
      );

      res.json({ success: true, data: submission });
    } catch (error) {
      console.error('Save code error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save code'
      });
    }
  }

  // Run code against test cases
  async runCode(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { code, language } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const results = await submissionService.runCode(
        submissionId,
        userId as any,
        tenantId as any,
        code,
        language
      );

      res.json({ success: true, data: results });
    } catch (error) {
      console.error('Run code error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to run code'
      });
    }
  }

  // Request an AI hint for a failing test case (quota-limited by assignment.maxAiHints)
  async getHint(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { code, testCaseIndex, fail, hintLanguage } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!fail || typeof fail.expected !== 'string' || typeof fail.actual !== 'string') {
        return res.status(400).json({ success: false, message: 'Missing failing test case details' });
      }

      const result = await assignmentHintService.requestTestCaseHint({
        submissionId,
        studentId: userId as any,
        tenant: tenantId as any,
        code,
        testCaseIndex: Number(testCaseIndex) || 0,
        fail,
        hintLanguage: hintLanguage === 'te' ? 'te' : 'en',
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get AI hint error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get hint'
      });
    }
  }

  // Request an AI hint explaining the problem's key concept — available before
  // the student has run anything, from the Instructions view.
  async getConceptHint(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { hintLanguage } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await assignmentHintService.requestConceptHint({
        submissionId,
        studentId: userId as any,
        tenant: tenantId as any,
        hintLanguage: hintLanguage === 'te' ? 'te' : 'en',
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get AI concept hint error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get hint'
      });
    }
  }

  // Submit coding assignment
  async submitCoding(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submission = await submissionService.submitCoding(
        submissionId,
        userId as any,
        tenantId as any
      );

      res.json({
        success: true,
        data: submission,
        message: 'Assignment submitted successfully'
      });
    } catch (error) {
      console.error('Submit coding error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit'
      });
    }
  }

  // Submit MCQ answers
  async submitMCQ(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { answers } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submission = await submissionService.submitMCQ(
        submissionId,
        userId as any,
        tenantId as any,
        { answers }
      );

      res.json({
        success: true,
        data: submission,
        message: 'Quiz submitted successfully'
      });
    } catch (error) {
      console.error('Submit MCQ error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit'
      });
    }
  }

  // Submit theory answer
  async submitTheory(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { theoryAnswer } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submission = await submissionService.submitTheory(
        submissionId,
        userId as any,
        tenantId as any,
        theoryAnswer
      );

      res.json({
        success: true,
        data: submission,
        message: 'Answer submitted successfully'
      });
    } catch (error) {
      console.error('Submit theory error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit'
      });
    }
  }

  // Grade submission (instructor)
  async grade(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;
      const { rubricScores, manualScore, score, overallFeedback, feedback, privateFeedback } = req.body;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Accept both field name conventions (score/feedback or manualScore/overallFeedback)
      const resolvedManualScore = manualScore ?? score;
      const resolvedFeedback = overallFeedback ?? feedback;

      // Map rubric scores from client format {criterion, score} to server format {criterionIndex, pointsAwarded}
      let mappedRubricScores = rubricScores;
      if (rubricScores?.length && rubricScores[0].criterion !== undefined && rubricScores[0].criterionIndex === undefined) {
        mappedRubricScores = rubricScores.map((rs: any, index: number) => ({
          criterionIndex: index,
          pointsAwarded: rs.score ?? rs.pointsAwarded ?? 0,
          feedback: rs.feedback
        }));
      }

      const submission = await submissionService.grade(submissionId, tenantId as any, {
        gradedBy: userId as any,
        rubricScores: mappedRubricScores,
        manualScore: resolvedManualScore,
        overallFeedback: resolvedFeedback,
        privateFeedback
      });

      res.json({
        success: true,
        data: submission,
        message: 'Submission graded successfully'
      });
    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to grade submission'
      });
    }
  }

  // Get all submissions for an assignment (instructor)
  async getAssignmentSubmissions(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { assignmentId } = req.params;
      const { status, page = 1, limit = 50 } = req.query;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await submissionService.getAssignmentSubmissions(
        assignmentId,
        tenantId as any,
        {
          status: status as SubmissionStatus,
          page: Number(page),
          limit: Number(limit)
        }
      );

      res.json({
        success: true,
        data: result.submissions,
        pagination: {
          total: result.total,
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      console.error('Get assignment submissions error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get submissions'
      });
    }
  }

  // Get student's all submissions
  async getStudentSubmissions(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submissions = await submissionService.getStudentSubmissions(
        userId as any,
        tenantId as any
      );

      res.json({ success: true, data: submissions });
    } catch (error) {
      console.error('Get student submissions error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get submissions'
      });
    }
  }

  // Get submission by ID (for viewing)
  async getSubmission(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { submissionId } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Admin/instructor can view any submission, students only their own
      const submission = await submissionService.getStudentSubmission(
        submissionId,
        userRole === 'admin' || userRole === 'instructor' ? undefined as any : userId as any,
        tenantId as any
      );

      if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
      }

      res.json({ success: true, data: submission });
    } catch (error) {
      console.error('Get submission error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get submission'
      });
    }
  }

  // Get submission statistics
  async getStats(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { assignmentId } = req.params;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const stats = await submissionService.getSubmissionStats(assignmentId, tenantId as any);

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get statistics'
      });
    }
  }

  // Allow student to reattempt assignment (instructor)
  async allowReattempt(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { submissionId } = req.params;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const submission = await submissionService.allowReattempt(
        submissionId,
        tenantId as any,
        userId as any
      );

      if (!submission) {
        return res.status(404).json({ 
          success: false, 
          message: 'Submission not found' 
        });
      }

      res.json({
        success: true,
        data: submission,
        message: 'Student can now reattempt this assignment'
      });
    } catch (error) {
      console.error('Allow reattempt error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to allow reattempt'
      });
    }
  }
}

export default new SubmissionController();
