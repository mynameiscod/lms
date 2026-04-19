import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import ClassRecording from '../models/ClassRecording';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import Assignment from '../models/Assignment';
import { processClassRecording } from '../services/classRecordingProcessor';

interface AuthRequest extends Request {
  user?: { id: string; role?: string; tenantId?: string };
  tenantId?: string;
}

class ClassRecordingController {

  /** Upload a new class recording video */
  async upload(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

      if (!req.file) return res.status(400).json({ message: 'No video file uploaded' });

      const { title, description, courseId, subjectId, chapterId, duration, tags } = req.body;
      if (!title || !courseId) {
        return res.status(400).json({ message: 'Title and courseId are required' });
      }

      const recording = await ClassRecording.create({
        tenantId,
        title,
        description: description || '',
        instructor: userId,
        courseId,
        subjectId: subjectId || undefined,
        chapterId: chapterId || undefined,
        videoUrl: req.file.path,
        duration: Number(duration) || 0,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        status: 'uploaded',
        processingProgress: 0,
        recordedAt: new Date(),
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : []
      });

      // Start background processing (don't await)
      processClassRecording(recording._id as string).catch(err => {
        console.error('[ClassRecording] Background processing error:', err);
      });

      res.status(201).json({
        success: true,
        data: recording,
        message: 'Recording uploaded. Processing started.'
      });
    } catch (error) {
      console.error('Upload recording error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload recording'
      });
    }
  }

  /** List recordings (instructor sees own, admin sees all) */
  async list(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

      const { courseId, status, page = '1', limit = '20' } = req.query;
      const filter: any = { tenantId };

      // Instructors see only their own recordings
      if (role === 'INSTRUCTOR') filter.instructor = userId;
      if (courseId) filter.courseId = courseId;
      if (status) filter.status = status;

      const skip = (Number(page) - 1) * Number(limit);
      const [recordings, total] = await Promise.all([
        ClassRecording.find(filter)
          .populate('instructor', 'firstName lastName email')
          .populate('courseId', 'title')
          .populate('subjectId', 'name')
          .populate('chapterId', 'title')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        ClassRecording.countDocuments(filter)
      ]);

      res.json({ success: true, data: recordings, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      console.error('List recordings error:', error);
      res.status(500).json({ success: false, message: 'Failed to list recordings' });
    }
  }

  /** List published recordings for students */
  async listForStudents(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const { courseId, page = '1', limit = '20' } = req.query;
      const filter: any = { tenantId, isPublished: true };
      if (courseId) filter.courseId = courseId;

      const skip = (Number(page) - 1) * Number(limit);
      const [recordings, total] = await Promise.all([
        ClassRecording.find(filter)
          .select('title description courseId subjectId chapterId duration recordedAt viewCount summary.overview tags thumbnailUrl status')
          .populate('instructor', 'firstName lastName')
          .populate('courseId', 'title')
          .populate('subjectId', 'name')
          .populate('chapterId', 'title')
          .sort({ recordedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        ClassRecording.countDocuments(filter)
      ]);

      res.json({ success: true, data: recordings, total, page: Number(page), limit: Number(limit) });
    } catch (error) {
      console.error('List student recordings error:', error);
      res.status(500).json({ success: false, message: 'Failed to list recordings' });
    }
  }

  /** Get single recording detail */
  async getById(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId })
        .populate('instructor', 'firstName lastName email')
        .populate('courseId', 'title')
        .populate('subjectId', 'name')
        .populate('chapterId', 'title')
        .lean();

      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

      // Increment view count for students
      if (req.user?.role === 'STUDENT') {
        await ClassRecording.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
      }

      res.json({ success: true, data: recording });
    } catch (error) {
      console.error('Get recording error:', error);
      res.status(500).json({ success: false, message: 'Failed to get recording' });
    }
  }

  /** Get processing status (for polling) */
  async getStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId })
        .select('status processingProgress processingError')
        .lean();

      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
      res.json({ success: true, data: recording });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get status' });
    }
  }

  /** Publish/unpublish a recording */
  async togglePublish(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId });
      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

      recording.isPublished = !recording.isPublished;
      await recording.save();

      res.json({ success: true, data: recording, message: recording.isPublished ? 'Published' : 'Unpublished' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update recording' });
    }
  }

  /** Update recording metadata */
  async update(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const { title, description, subjectId, chapterId, tags } = req.body;
      const recording = await ClassRecording.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        { title, description, subjectId, chapterId, tags },
        { new: true }
      );

      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
      res.json({ success: true, data: recording });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update recording' });
    }
  }

  /** Delete a recording */
  async delete(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId });
      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

      // Delete video file
      if (recording.videoUrl && fs.existsSync(recording.videoUrl)) {
        fs.unlinkSync(recording.videoUrl);
      }

      await ClassRecording.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Recording deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete recording' });
    }
  }

  /** Re-trigger processing for a failed recording */
  async reprocess(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId });
      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });

      await ClassRecording.findByIdAndUpdate(req.params.id, {
        status: 'uploaded',
        processingProgress: 0,
        processingError: undefined
      });

      processClassRecording(req.params.id).catch(err => {
        console.error('[ClassRecording] Reprocessing error:', err);
      });

      res.json({ success: true, message: 'Reprocessing started' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to reprocess' });
    }
  }

  /** Save generated quiz to the Quiz system */
  async saveQuiz(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId });
      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
      if (!recording.generatedQuiz?.questions?.length) {
        return res.status(400).json({ success: false, message: 'No generated quiz available' });
      }

      const { questions: editedQuestions, quizTitle, startDate, endDate } = req.body;
      const questionsToSave = editedQuestions || recording.generatedQuiz.questions;

      // Create questions in Question Bank
      const savedQuestions = await Promise.all(
        questionsToSave.map((q: any) =>
          Question.create({
            tenantId,
            createdBy: userId,
            type: 'mcq_single',
            question: q.question,
            options: q.options,
            marks: q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1,
            difficultyLevel: q.difficulty || 'medium',
            explanation: q.explanation,
            tags: recording.tags || [],
            source: 'ai'
          })
        )
      );

      // Create Quiz
      const totalMarks = savedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      const quiz = await Quiz.create({
        title: quizTitle || `${recording.title} - Quiz`,
        description: `Auto-generated quiz from class recording: ${recording.title}`,
        tenantId,
        createdBy: userId,
        courseId: recording.courseId,
        subjectId: recording.subjectId,
        chapterId: recording.chapterId,
        questionIds: savedQuestions.map(q => q._id.toString()),
        totalQuestions: savedQuestions.length,
        questionCount: savedQuestions.length,
        totalMarks,
        totalTime: Math.max(savedQuestions.length * 2, 10), // 2 min per question, min 10
        startDate: startDate || new Date(),
        endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        startTime: '00:00',
        endTime: '23:59',
        access: 'public',
        accessibleTo: 'everyone',
        showAnswersAfterSubmit: true,
        showScoreAfterSubmit: true,
        isActive: true
      });

      // Link back to recording
      await ClassRecording.findByIdAndUpdate(req.params.id, {
        'generatedQuiz.savedQuizId': quiz._id
      });

      res.json({ success: true, data: quiz, message: 'Quiz created from recording' });
    } catch (error) {
      console.error('Save quiz error:', error);
      res.status(500).json({ success: false, message: 'Failed to save quiz' });
    }
  }

  /** Save generated assignment to the Assignment system */
  async saveAssignment(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return res.status(401).json({ message: 'Unauthorized' });

      const recording = await ClassRecording.findOne({ _id: req.params.id, tenantId });
      if (!recording) return res.status(404).json({ success: false, message: 'Recording not found' });
      if (!recording.generatedAssignment) {
        return res.status(400).json({ success: false, message: 'No generated assignment available' });
      }

      const edited = req.body.assignment || recording.generatedAssignment;

      const assignment = await Assignment.create({
        tenant: tenantId,
        createdBy: userId,
        title: edited.title || recording.generatedAssignment.title,
        description: edited.description || recording.generatedAssignment.description,
        instructions: edited.instructions || recording.generatedAssignment.instructions,
        type: 'coding',
        difficulty: edited.difficulty || 'medium',
        course: recording.courseId,
        subject: recording.subjectId,
        chapter: recording.chapterId,
        allowedLanguages: ['java'],
        testCases: edited.testCases || recording.generatedAssignment.testCases || [],
        starterCode: [{ language: 'java', code: edited.starterCode || '', solutionCode: edited.solutionCode || '' }],
        totalPoints: 100,
        passingPoints: 60,
        status: 'draft',
        maxAttempts: 3,
        showTestCaseResults: true,
        tags: recording.tags || [],
        topics: recording.summary?.topics || []
      });

      await ClassRecording.findByIdAndUpdate(req.params.id, {
        'generatedAssignment.savedAssignmentId': assignment._id
      });

      res.json({ success: true, data: assignment, message: 'Assignment created from recording' });
    } catch (error) {
      console.error('Save assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to save assignment' });
    }
  }
}

export default new ClassRecordingController();
