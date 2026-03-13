import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import mockInterviewService from '../services/mockInterviewService';

export const mockInterviewController = {
  // Create a new interview
  async createInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const studentId = req.userId;
      const tenantId = req.tenantId;
      
      if (!studentId || !tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const {
        type,
        category,
        subCategory,
        targetCompany,
        difficulty,
        totalQuestions,
        timeLimit,
        courseId,
        subjectId,
        chapterId,
        batchId
      } = req.body;
      
      if (!category) {
        return res.status(400).json({ message: 'Category is required' });
      }
      
      const interview = await mockInterviewService.createInterview({
        studentId,
        tenantId,
        type,
        category,
        subCategory,
        targetCompany,
        difficulty,
        totalQuestions,
        timeLimit,
        courseId,
        subjectId,
        chapterId,
        batchId
      });
      
      res.status(201).json(interview);
    } catch (error: any) {
      console.error('Error creating interview:', error);
      res.status(500).json({ message: error.message || 'Failed to create interview' });
    }
  },
  
  // Start an interview
  async startInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const { interviewId } = req.params;
      const studentId = req.userId;
      
      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const interview = await mockInterviewService.startInterview(interviewId, studentId);
      res.json(interview);
    } catch (error: any) {
      console.error('Error starting interview:', error);
      res.status(400).json({ message: error.message || 'Failed to start interview' });
    }
  },
  
  // Submit answer for a question
  async submitAnswer(req: AuthenticatedRequest, res: Response) {
    try {
      const { interviewId } = req.params;
      const studentId = req.userId;
      const { questionIndex, answer, responseTime } = req.body;
      
      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      if (typeof questionIndex !== 'number' || !answer) {
        return res.status(400).json({ message: 'Question index and answer are required' });
      }
      
      const result = await mockInterviewService.submitAnswer(
        interviewId,
        studentId,
        questionIndex,
        answer,
        responseTime || 0
      );
      
      res.json(result);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      res.status(400).json({ message: error.message || 'Failed to submit answer' });
    }
  },
  
  // Complete an interview
  async completeInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const { interviewId } = req.params;
      const studentId = req.userId;
      
      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const interview = await mockInterviewService.completeInterview(interviewId, studentId);
      res.json(interview);
    } catch (error: any) {
      console.error('Error completing interview:', error);
      res.status(400).json({ message: error.message || 'Failed to complete interview' });
    }
  },
  
  // Get interview by ID
  async getInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const { interviewId } = req.params;
      const studentId = req.userId;
      
      const interview = await mockInterviewService.getInterviewById(interviewId, studentId);
      
      if (!interview) {
        return res.status(404).json({ message: 'Interview not found' });
      }
      
      res.json(interview);
    } catch (error: any) {
      console.error('Error fetching interview:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch interview' });
    }
  },
  
  // Get student's interview history
  async getMyInterviews(req: AuthenticatedRequest, res: Response) {
    try {
      const studentId = req.userId;
      const tenantId = req.tenantId;
      
      if (!studentId || !tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { category, status, limit, offset } = req.query;
      
      const result = await mockInterviewService.getStudentInterviews(studentId, tenantId, {
        category: category as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching interviews:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch interviews' });
    }
  },
  
  // Get student statistics
  async getMyStats(req: AuthenticatedRequest, res: Response) {
    try {
      const studentId = req.userId;
      const tenantId = req.tenantId;
      
      if (!studentId || !tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const stats = await mockInterviewService.getStudentStats(studentId, tenantId);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch statistics' });
    }
  },
  
  // Get batch leaderboard
  async getBatchLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      const { batchId } = req.params;
      const tenantId = req.tenantId;
      const { limit } = req.query;
      
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const leaderboard = await mockInterviewService.getBatchLeaderboard(
        batchId,
        tenantId,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json(leaderboard);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch leaderboard' });
    }
  },
  
  // Cancel an interview
  async cancelInterview(req: AuthenticatedRequest, res: Response) {
    try {
      const { interviewId } = req.params;
      const studentId = req.userId;
      
      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const interview = await mockInterviewService.cancelInterview(interviewId, studentId);
      res.json(interview);
    } catch (error: any) {
      console.error('Error cancelling interview:', error);
      res.status(400).json({ message: error.message || 'Failed to cancel interview' });
    }
  },
  
  // Get available interview categories
  async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const categories = [
        {
          id: 'technical',
          name: 'Technical Interview',
          icon: '💻',
          description: 'Data structures, algorithms, and programming concepts',
          subCategories: [
            { id: 'java', name: 'Java' },
            { id: 'python', name: 'Python' },
            { id: 'javascript', name: 'JavaScript' },
            { id: 'dsa', name: 'Data Structures & Algorithms' },
            { id: 'system-design', name: 'System Design' },
            { id: 'database', name: 'Database & SQL' }
          ]
        },
        {
          id: 'hr',
          name: 'HR Interview',
          icon: '👥',
          description: 'Behavioral and situational questions',
          subCategories: []
        },
        {
          id: 'company-specific',
          name: 'Company Specific',
          icon: '🏢',
          description: 'Prepare for specific company interviews',
          subCategories: [
            { id: 'tcs', name: 'TCS' },
            { id: 'infosys', name: 'Infosys' },
            { id: 'wipro', name: 'Wipro' },
            { id: 'cognizant', name: 'Cognizant' },
            { id: 'accenture', name: 'Accenture' }
          ]
        },
        {
          id: 'mixed',
          name: 'Full Interview',
          icon: '🎯',
          description: 'Mix of technical and HR questions',
          subCategories: []
        }
      ];
      
      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  },
  
  // ==================== ADMIN ASSIGNMENT ENDPOINTS ====================
  
  // Assign interview to a single student
  async assignToStudent(req: AuthenticatedRequest, res: Response) {
    try {
      const assignedBy = req.userId;
      const tenantId = req.tenantId;
      
      if (!assignedBy || !tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const {
        studentId,
        category,
        subCategory,
        targetCompany,
        difficulty,
        totalQuestions,
        timeLimit,
        dueDate,
        assignmentNote,
        assignmentPriority,
        recordingEnabled,
        courseId,
        subjectId,
        chapterId,
        batchId
      } = req.body;
      
      if (!studentId || !category) {
        return res.status(400).json({ message: 'Student ID and category are required' });
      }
      
      const interview = await mockInterviewService.assignInterviewToStudent({
        assignedBy,
        tenantId,
        studentId,
        category,
        subCategory,
        targetCompany,
        difficulty,
        totalQuestions,
        timeLimit,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignmentNote,
        assignmentPriority,
        recordingEnabled,
        courseId,
        subjectId,
        chapterId,
        batchId
      });
      
      res.status(201).json(interview);
    } catch (error: any) {
      console.error('Error assigning interview:', error);
      res.status(500).json({ message: error.message || 'Failed to assign interview' });
    }
  },
  
  // Assign interview to a batch of students
  async assignToBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const assignedBy = req.userId;
      const tenantId = req.tenantId;
      
      if (!assignedBy || !tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const {
        batchId,
        studentIds,
        category,
        subCategory,
        targetCompany,
        difficulty,
        totalQuestions,
        timeLimit,
        dueDate,
        assignmentNote,
        assignmentPriority,
        recordingEnabled,
        courseId,
        subjectId,
        chapterId
      } = req.body;
      
      if (!batchId || !studentIds?.length || !category) {
        return res.status(400).json({ message: 'Batch ID, student IDs, and category are required' });
      }
      
      const result = await mockInterviewService.assignInterviewToBatch({
        assignedBy,
        tenantId,
        batchId,
        studentIds,
        category,
        subCategory,
        targetCompany,
        difficulty,
        totalQuestions,
        timeLimit,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignmentNote,
        assignmentPriority,
        recordingEnabled,
        courseId,
        subjectId,
        chapterId
      });
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error assigning interview to batch:', error);
      res.status(500).json({ message: error.message || 'Failed to assign interviews' });
    }
  },
  
  // Get all assigned interviews (admin view)
  async getAssignedInterviews(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { assignedBy, batchId, status, category, limit, offset } = req.query;
      
      const result = await mockInterviewService.getAssignedInterviews(tenantId, {
        assignedBy: assignedBy as string,
        batchId: batchId as string,
        status: status as string,
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching assigned interviews:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch assigned interviews' });
    }
  },
  
  // Get student's assigned interviews
  async getMyAssignedInterviews(req: AuthenticatedRequest, res: Response) {
    try {
      const studentId = req.userId;
      const tenantId = req.tenantId;
      
      if (!studentId || !tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { status, limit, offset } = req.query;
      
      const result = await mockInterviewService.getStudentAssignedInterviews(studentId, tenantId, {
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching assigned interviews:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch assigned interviews' });
    }
  },
  
  // Get assignment statistics
  async getAssignmentStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.userId;
      
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { myAssignmentsOnly } = req.query;
      
      const stats = await mockInterviewService.getAssignmentStats(
        tenantId,
        myAssignmentsOnly === 'true' ? userId : undefined
      );
      
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching assignment stats:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch statistics' });
    }
  },
  
  // ==================== RECORDING ENDPOINTS ====================
  
  // Save recording for an interview
  async saveRecording(req: AuthenticatedRequest, res: Response) {
    try {
      const { interviewId } = req.params;
      const studentId = req.userId;
      
      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { recordingUrl, recordingDuration, recordingSize, recordingType } = req.body;
      
      if (!recordingUrl) {
        return res.status(400).json({ message: 'Recording URL is required' });
      }
      
      const interview = await mockInterviewService.saveRecording(interviewId, studentId, {
        recordingUrl,
        recordingDuration: recordingDuration || 0,
        recordingSize: recordingSize || 0,
        recordingType: recordingType || 'video'
      });
      
      res.json(interview);
    } catch (error: any) {
      console.error('Error saving recording:', error);
      res.status(500).json({ message: error.message || 'Failed to save recording' });
    }
  },
  
  // Get interviews with recordings (admin)
  async getInterviewsWithRecordings(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { batchId, studentId, limit, offset } = req.query;
      
      const result = await mockInterviewService.getInterviewsWithRecordings(tenantId, {
        batchId: batchId as string,
        studentId: studentId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching interviews with recordings:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch recordings' });
    }
  }
};

export default mockInterviewController;
