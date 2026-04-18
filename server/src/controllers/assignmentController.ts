import { Request, Response } from 'express';
import { Types } from 'mongoose';
import assignmentService from '../services/assignmentService';
import { AssignmentType, AssignmentStatus, DifficultyLevel } from '../models/Assignment';
import { generateCodingAssignmentWithAI } from '../services/aiService';

// Extended Request interface with user and tenant
interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

class AssignmentController {
  // Create assignment
  async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignment = await assignmentService.create({
        tenant: tenantId as any,
        createdBy: userId as any,
        ...req.body
      });

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Assignment created successfully'
      });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create assignment'
      });
    }
  }

  // Get assignment by ID
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignment = await assignmentService.getById(id, tenantId as any);

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      res.json({ success: true, data: assignment });
    } catch (error) {
      console.error('Get assignment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get assignment'
      });
    }
  }

  // Update assignment
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignment = await assignmentService.update(id, tenantId as any, {
        ...req.body,
        updatedBy: userId as any
      });

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      res.json({
        success: true,
        data: assignment,
        message: 'Assignment updated successfully'
      });
    } catch (error) {
      console.error('Update assignment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update assignment'
      });
    }
  }

  // Delete assignment
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const deleted = await assignmentService.delete(id, tenantId as any);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
      console.error('Delete assignment error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete assignment'
      });
    }
  }

  // List assignments
  async list(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        type,
        difficulty,
        course,
        batch,
        search,
        isInBank,
        topics
      } = req.query;

      const result = await assignmentService.list(
        {
          tenant: tenantId as any,
          status: status ? (status as AssignmentStatus) : undefined,
          type: type ? (type as AssignmentType) : undefined,
          difficulty: difficulty ? (difficulty as DifficultyLevel) : undefined,
          course: course as any,
          batch: batch as any,
          search: search as string,
          isInBank: isInBank === 'true' ? true : isInBank === 'false' ? false : undefined,
          topics: topics ? (Array.isArray(topics) ? topics as string[] : [topics as string]) : undefined
        },
        {
          page: Number(page),
          limit: Number(limit),
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc'
        }
      );

      res.json({
        success: true,
        data: result.assignments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error) {
      console.error('List assignments error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to list assignments'
      });
    }
  }

  // Publish assignment
  async publish(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignment = await assignmentService.publish(id, tenantId as any, userId as any);

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      res.json({
        success: true,
        data: assignment,
        message: 'Assignment published successfully'
      });
    } catch (error) {
      console.error('Publish assignment error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to publish assignment'
      });
    }
  }

  // Archive assignment
  async archive(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignment = await assignmentService.archive(id, tenantId as any, userId as any);

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      res.json({
        success: true,
        data: assignment,
        message: 'Assignment archived successfully'
      });
    } catch (error) {
      console.error('Archive assignment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to archive assignment'
      });
    }
  }

  // Clone assignment
  async clone(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignment = await assignmentService.clone(id, tenantId as any, userId as any);

      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      res.json({
        success: true,
        data: assignment,
        message: 'Assignment cloned successfully'
      });
    } catch (error) {
      console.error('Clone assignment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clone assignment'
      });
    }
  }

  // Get student assignments
  async getStudentAssignments(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const { batch } = req.query;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignments = await assignmentService.getStudentAssignments(
        tenantId as any,
        userId as any,
        batch as any
      );

      res.json({ success: true, data: assignments });
    } catch (error) {
      console.error('Get student assignments error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get assignments'
      });
    }
  }

  // Get bank assignments
  async getBankAssignments(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { category } = req.query;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const assignments = await assignmentService.getBankAssignments(
        tenantId as any,
        category as string
      );

      res.json({ success: true, data: assignments });
    } catch (error) {
      console.error('Get bank assignments error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get bank assignments'
      });
    }
  }

  // Get topics for autocomplete
  async getTopics(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const topics = await assignmentService.getTopics(tenantId as any);
      res.json({ success: true, data: topics });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get topics' });
    }
  }

  // Get tags for autocomplete
  async getTags(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const tags = await assignmentService.getTags(tenantId as any);
      res.json({ success: true, data: tags });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get tags' });
    }
  }

  // Download assignment template (CSV)
  async downloadTemplate(req: AuthRequest, res: Response) {
    try {
      const { type } = req.query;
      
      let csvContent = '';
      
      if (type === 'coding') {
        // Coding assignment template with test cases
        csvContent = `title,description,instructions,type,difficulty,totalPoints,topics,allowedLanguages,dueDate,timeLimitMinutes,maxAttempts,showSyntaxErrors,showTestCaseResults,showExpectedOutput,enablePlagiarismCheck,tc1_input,tc1_expected,tc1_hidden,tc1_weight,tc2_input,tc2_expected,tc2_hidden,tc2_weight,tc3_input,tc3_expected,tc3_hidden,tc3_weight
"Prime Number Checker","Write a function to check if a number is prime","Return true if the number is prime, false otherwise",coding,medium,100,"arrays,algorithms","javascript,python,java",2026-03-20T23:59:00,60,3,true,true,true,false,"7","true",false,25,"4","false",false,25,"13","true",true,50
"Fibonacci Sequence","Generate fibonacci numbers","Return the nth fibonacci number",coding,easy,50,"recursion,math","python,java",2026-03-25T23:59:00,30,5,true,true,false,false,"5","5",false,30,"10","55",false,30,"20","6765",true,40`;
      } else if (type === 'mcq') {
        // MCQ assignment template
        csvContent = `title,description,type,difficulty,totalPoints,topics,dueDate,timeLimitMinutes,shuffleQuestions,shuffleOptions,showCorrectAnswers,question1,q1_optionA,q1_optionB,q1_optionC,q1_optionD,q1_correct,q1_points,question2,q2_optionA,q2_optionB,q2_optionC,q2_optionD,q2_correct,q2_points
"JavaScript Basics Quiz","Test your JavaScript knowledge",mcq,easy,100,"javascript,basics",2026-03-20T23:59:00,30,true,true,false,"What is JavaScript?","A programming language","A markup language","A database","An operating system",A,10,"Which keyword declares a variable?","var","let","const","All of the above",D,10`;
      } else {
        // General assignment template (all types)
        csvContent = `title,description,instructions,type,difficulty,totalPoints,topics,dueDate,timeLimitMinutes,maxAttempts
"Sample Assignment","Description of the assignment","Instructions for students",coding,medium,100,"topic1,topic2",2026-03-20T23:59:00,60,3
"Another Assignment","Another description","More instructions",theory,easy,50,"topic3",2026-03-25T23:59:00,45,unlimited`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=assignment_template_${type || 'general'}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error('Download template error:', error);
      res.status(500).json({ success: false, message: 'Failed to download template' });
    }
  }

  // Import assignments from CSV
  async importFromCSV(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { assignments } = req.body;

      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No assignments data provided' 
        });
      }

      const results = {
        success: [] as any[],
        failed: [] as any[]
      };

      for (const assignmentData of assignments) {
        try {
          // Normalize type — default to 'coding' if missing or not a valid enum value
          const validAssignmentTypes = ['coding', 'project', 'mcq', 'theory', 'sql', 'file_upload', 'web'];
          const rawType = (assignmentData.type || '').toString().toLowerCase().trim();
          const normalizedType = validAssignmentTypes.includes(rawType) ? rawType : 'coding';

          const normalizedDifficulty = (assignmentData.difficulty || 'medium').toString().toLowerCase().trim();

          // Parse totalPoints safely
          const totalPoints = assignmentData.totalPoints ? parseInt(assignmentData.totalPoints) || undefined : undefined;

          // Parse maxAttempts safely ('unlimited' → undefined so schema default applies)
          const rawMaxAttempts = assignmentData.maxAttempts;
          const maxAttempts = rawMaxAttempts && rawMaxAttempts !== 'unlimited'
            ? parseInt(rawMaxAttempts) || undefined
            : undefined;

          // Map timeLimitMinutes CSV column → timeLimit schema field
          const timeLimit = assignmentData.timeLimitMinutes ? parseInt(assignmentData.timeLimitMinutes) || undefined : undefined;

          // Parse topics and allowedLanguages if they're strings
          const processedData: any = {
            ...assignmentData,
            tenant: tenantId,
            createdBy: userId,
            type: normalizedType,
            difficulty: normalizedDifficulty,
            ...(totalPoints !== undefined && { totalPoints }),
            ...(maxAttempts !== undefined && { maxAttempts }),
            ...(timeLimit !== undefined && { timeLimit }),
            topics: typeof assignmentData.topics === 'string'
              ? assignmentData.topics.split(',').map((t: string) => t.trim()).filter(Boolean)
              : assignmentData.topics || [],
            allowedLanguages: typeof assignmentData.allowedLanguages === 'string'
              ? assignmentData.allowedLanguages.split(',').map((l: string) => l.trim().toLowerCase()).filter(Boolean)
              : assignmentData.allowedLanguages || ['javascript', 'python', 'java'],
            status: 'draft',
            showSyntaxErrors: assignmentData.showSyntaxErrors === 'true' || assignmentData.showSyntaxErrors === true,
            showTestCaseResults: assignmentData.showTestCaseResults === 'true' || assignmentData.showTestCaseResults === true,
            showExpectedOutput: assignmentData.showExpectedOutput === 'true' || assignmentData.showExpectedOutput === true,
            enablePlagiarismCheck: assignmentData.enablePlagiarismCheck === 'true' || assignmentData.enablePlagiarismCheck === true,
          };

          // Handle test cases for coding/sql assignments
          if (normalizedType === 'coding' || normalizedType === 'sql') {
            const testCases: any[] = [];
            for (let i = 1; i <= 10; i++) {
              const expected = assignmentData[`tc${i}_expected`];
              // Only add test case when expectedOutput is a non-empty string
              if (expected !== undefined && String(expected).trim() !== '') {
                const input = assignmentData[`tc${i}_input`];
                testCases.push({
                  input: input !== undefined ? String(input) : '',
                  expectedOutput: String(expected).trim(),
                  isHidden: assignmentData[`tc${i}_hidden`] === 'true' || assignmentData[`tc${i}_hidden`] === true,
                  weight: parseInt(assignmentData[`tc${i}_weight`]) || 10,
                  description: `Test case ${i}`
                });
              }
            }
            if (testCases.length > 0) {
              processedData.testCases = testCases;
            }
          }

          // Handle MCQ specific data
          if (normalizedType === 'mcq' && assignmentData.questions) {
            processedData.mcqQuestions = assignmentData.questions;
            processedData.shuffleQuestions = assignmentData.shuffleQuestions === 'true' || assignmentData.shuffleQuestions === true;
            processedData.shuffleOptions = assignmentData.shuffleOptions === 'true' || assignmentData.shuffleOptions === true;
          }

          const assignment = await assignmentService.create(processedData);
          results.success.push({
            title: assignmentData.title,
            id: assignment._id
          });
        } catch (err) {
          results.failed.push({
            title: assignmentData.title,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        message: `Imported ${results.success.length} assignments, ${results.failed.length} failed`,
        data: results
      });
    } catch (error) {
      console.error('Import assignments error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import assignments'
      });
    }
  }

  // Get overall reports
  getOverallReports = async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { type } = req.query;
      
      let tenantObjectId;
      try {
        tenantObjectId = new Types.ObjectId(tenantId);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
      }

      const Assignment = require('../models/Assignment').default;
      const Submission = require('../models/Submission').default;

      // Get assignment stats
      const assignmentMatch: any = { tenant: tenantObjectId };
      if (type && type !== 'all') {
        assignmentMatch.type = type;
      }

      const totalAssignments = await Assignment.countDocuments(assignmentMatch);
      const publishedAssignments = await Assignment.countDocuments({ ...assignmentMatch, status: 'published' });
      const draftAssignments = await Assignment.countDocuments({ ...assignmentMatch, status: 'draft' });

      // Get submission stats - simpler approach
      let totalSubmissions = 0;
      let averageScore = 0;
      
      try {
        totalSubmissions = await Submission.countDocuments({ tenant: tenantObjectId, status: 'submitted' });
        
        const scoreAgg = await Submission.aggregate([
          { $match: { tenant: tenantObjectId, status: 'submitted', 'grading.score': { $exists: true, $ne: null } } },
          { $group: { _id: null, avgScore: { $avg: '$grading.score' } } }
        ]);
        averageScore = scoreAgg[0]?.avgScore || 0;
      } catch (subErr) {
        console.error('Submission query error:', subErr);
      }

      // Get by type
      const byType = await Assignment.aggregate([
        { $match: { tenant: tenantObjectId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      // Get by difficulty
      const byDifficulty = await Assignment.aggregate([
        { $match: { tenant: tenantObjectId } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } }
      ]);

      res.json({
        success: true,
        data: {
          totalAssignments,
          publishedAssignments,
          draftAssignments,
          totalSubmissions,
          averageScore,
          averageCompletionRate: totalAssignments > 0 ? (totalSubmissions / totalAssignments) * 10 : 0,
          byType,
          byDifficulty
        }
      });
    } catch (error) {
      console.error('Get overall reports error:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get reports' });
    }
  }

  // Get reports by assignment
  getReportsByAssignment = async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { type } = req.query;
      
      let tenantObjectId;
      try {
        tenantObjectId = new Types.ObjectId(tenantId);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
      }
      
      const Assignment = require('../models/Assignment').default;
      const Submission = require('../models/Submission').default;

      const assignmentMatch: any = { tenant: tenantObjectId };
      if (type && type !== 'all') {
        assignmentMatch.type = type;
      }

      const assignments = await Assignment.find(assignmentMatch)
        .select('title type difficulty status totalPoints dueDate')
        .lean();

      const assignmentStats = await Promise.all(assignments.map(async (assignment: any) => {
        try {
          const submissions = await Submission.find({ 
            assignment: assignment._id,
            status: 'submitted'
          }).lean();

          const scores = submissions
            .filter((s: any) => s.grading?.score !== undefined)
            .map((s: any) => s.grading.score);

          const now = new Date();
          const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : new Date();
          
          const onTimeSubmissions = submissions.filter((s: any) => 
            new Date(s.submittedAt || s.createdAt) <= dueDate
          ).length;

          return {
            ...assignment,
            stats: {
              totalSubmissions: submissions.length,
              completedSubmissions: submissions.length,
              averageScore: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
              highestScore: scores.length > 0 ? Math.max(...scores) : 0,
              lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
              passRate: submissions.length > 0 ? (scores.filter((s: number) => s >= 60).length / submissions.length) * 100 : 0,
              onTimeSubmissions,
              lateSubmissions: submissions.length - onTimeSubmissions
            }
          };
        } catch (err) {
          console.error('Error processing assignment:', assignment._id, err);
          return {
            ...assignment,
            stats: {
              totalSubmissions: 0,
              completedSubmissions: 0,
              averageScore: 0,
              highestScore: 0,
              lowestScore: 0,
              passRate: 0,
              onTimeSubmissions: 0,
              lateSubmissions: 0
            }
          };
        }
      }));

      res.json({ success: true, data: assignmentStats });
    } catch (error) {
      console.error('Get reports by assignment error:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get reports' });
    }
  }

  // Get reports by student
  getReportsByStudent = async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      let tenantObjectId;
      try {
        tenantObjectId = new Types.ObjectId(tenantId);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid tenant ID' });
      }

      const User = require('../models/User').default;
      const Assignment = require('../models/Assignment').default;
      const Submission = require('../models/Submission').default;

      // Get all students
      const students = await User.find({ 
        tenantId: tenantObjectId, 
        role: 'STUDENT',
        isActive: true 
      }).select('firstName lastName email').lean();

      // Get published assignments count
      const totalAssignments = await Assignment.countDocuments({ 
        tenant: tenantObjectId, 
        status: 'published' 
      });

      const studentStats = await Promise.all(students.map(async (student: any) => {
        try {
          const submissions = await Submission.find({
            student: student._id,
            status: 'submitted'
          }).populate('assignment', 'dueDate').lean();

          const scores = submissions
            .filter((s: any) => s.grading?.score !== undefined)
            .map((s: any) => s.grading.score);

          const onTime = submissions.filter((s: any) => {
            const dueDate = (s.assignment as any)?.dueDate ? new Date((s.assignment as any).dueDate) : new Date();
            const submittedAt = new Date(s.submittedAt || s.createdAt);
            return submittedAt <= dueDate;
          }).length;

          return {
            _id: student._id,
            name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
            email: student.email,
            totalAssignments,
            completed: submissions.length,
            averageScore: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
            onTime,
            late: submissions.length - onTime
          };
        } catch (err) {
          console.error('Error processing student:', student._id, err);
          return {
            _id: student._id,
            name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
            email: student.email,
            totalAssignments,
            completed: 0,
            averageScore: 0,
            onTime: 0,
            late: 0
          };
        }
      }));

      // Sort by completion
      studentStats.sort((a, b) => b.completed - a.completed);

      res.json({ success: true, data: studentStats });
    } catch (error) {
      console.error('Get reports by student error:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to get reports' });
    }
  }

  // Helper to get date filter
  private getDateFilter(dateRange: string): any {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      case 'month':
        return { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      case 'quarter':
        return { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      default:
        return null;
    }
  }

  // AI Generate Coding Assignment
  async generateWithAI(req: AuthRequest, res: Response) {
    try {
      const { title, concept, language, difficulty, testCaseCount } = req.body;

      if (!title || !concept || !language) {
        return res.status(400).json({ message: 'title, concept, and language are required' });
      }

      const validDifficulties = ['beginner', 'easy', 'medium', 'hard', 'expert'];
      if (difficulty && !validDifficulties.includes(difficulty)) {
        return res.status(400).json({ message: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` });
      }

      const count = Math.min(Math.max(parseInt(testCaseCount) || 5, 2), 15);

      const result = await generateCodingAssignmentWithAI({
        title,
        concept,
        language,
        difficulty: difficulty || 'medium',
        testCaseCount: count
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('AI coding assignment generation error:', error);
      if (error.message?.includes('OPENAI_API_KEY')) {
        return res.status(503).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || 'Failed to generate assignment with AI' });
    }
  }
}

export default new AssignmentController();
