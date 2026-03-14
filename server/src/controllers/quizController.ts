import { Request, Response } from 'express';
import quizService from '../services/quizService';
import questionService from '../services/questionService';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import QuizSubmission from '../models/QuizSubmission';
import Question from '../models/Question';
import User from '../models/User';
import Content from '../models/Content';
import { EmailService } from '../services/emailService';

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, startTime, endTime, totalMarks, totalTime, courseId, subjectId, chapterId, ...rest } = req.body;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    if (!title || !totalMarks || !totalTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Clean up empty strings for optional ObjectId fields
    const cleanedData = {
      ...rest,
      courseId: courseId || undefined,
      subjectId: subjectId || undefined,
      chapterId: chapterId || undefined,
    };

    const quiz = await quizService.createQuiz(
      {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        totalMarks,
        totalTime,
        createdBy: userId,
        ...cleanedData
      },
      tenantId
    );

    // Create announcement for the new quiz
    try {
      const user = await User.findById(userId);
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Instructor';
      const announcement = new Content({
        type: 'announcement',
        title: `New Quiz: ${title}`,
        description: description || '',
        content: `A new quiz "${title}" has been created and is available for students.\n\nStart Date: ${new Date(startDate).toLocaleDateString()}\nEnd Date: ${new Date(endDate).toLocaleDateString()}`,
        author: {
          userId,
          name: userName,
          role: 'instructor'
        },
        tenant: tenantId,
        tags: ['quiz', title.toLowerCase()],
        visibility: 'all_students',
        isPublished: true,
        viewCount: 0
      });
      await announcement.save();
    } catch (annError) {
      // Log error but don't fail the quiz creation
      console.error('Failed to create announcement:', annError);
    }

    // Send email notifications to target students
    try {
      const emailService = new EmailService();
      let targetStudents: any[] = [];

      // Determine target students based on quiz accessibility
      const accessibleTo = rest.accessibleTo || 'everyone';
      
      if (accessibleTo === 'everyone') {
        // Get all students in the tenant
        targetStudents = await User.find({ 
          tenantId, 
          role: 'STUDENT',
          isActive: true 
        }).select('_id firstName lastName email').lean();
      } else if (accessibleTo === 'batch_wise' && rest.selectedBatches && rest.selectedBatches.length > 0) {
        // Get students in selected batches
        targetStudents = await User.find({ 
          tenantId, 
          role: 'STUDENT',
          isActive: true,
          batchId: { $in: rest.selectedBatches }
        }).select('_id firstName lastName email').lean();
      } else if (accessibleTo === 'individual' && rest.selectedStudents && rest.selectedStudents.length > 0) {
        // Get individual selected students
        targetStudents = await User.find({ 
          _id: { $in: rest.selectedStudents },
          tenantId,
          role: 'STUDENT',
          isActive: true
        }).select('_id firstName lastName email').lean();
      }

      console.log(`📧 Sending quiz notification emails to ${targetStudents.length} students...`);

      // Send emails to all target students (in parallel, limited batch)
      const emailPromises = targetStudents.map(async (student) => {
        try {
          await emailService.sendQuizNotificationEmail(
            student.email,
            `${student.firstName} ${student.lastName}`.trim(),
            title,
            description,
            new Date(startDate),
            new Date(endDate),
            totalTime,
            totalMarks
          );
        } catch (emailErr) {
          console.error(`Failed to send email to ${student.email}:`, emailErr);
        }
      });

      // Execute all email sends (don't await to not block response)
      Promise.all(emailPromises).then(() => {
        console.log(`✅ Quiz notification emails sent to ${targetStudents.length} students`);
      }).catch((err) => {
        console.error('Error sending quiz notification emails:', err);
      });

    } catch (emailError) {
      // Log error but don't fail the quiz creation
      console.error('Failed to send quiz notification emails:', emailError);
    }

    res.status(201).json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const quizzes = await quizService.getQuizzes(tenantId, req.query);
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getQuizzesByChapter = async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const tenantId = (req as any).tenantId;
    const quizzes = await quizService.getQuizzesByChapter(chapterId, tenantId);
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.updateQuiz(quizId, req.body);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const success = await quizService.deleteQuiz(quizId);

    if (!success) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const checkQuizAccess = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = (req as any).userId;

    const canAccess = await quizService.canStudentAccessQuiz(quizId, studentId);
    res.json({ canAccess });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const checkQuizAvailability = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const result = await quizService.isQuizAvailable(quizId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const startQuizAttempt = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = (req as any).userId;
    const tenantId = (req as any).tenantId;

    const attempt = await quizService.startQuizAttempt(quizId, studentId, tenantId);
    res.status(201).json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const questions = await quizService.getQuizQuestions(quizId, false);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitQuizAttempt = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers must be an array' });
    }

    const result = await quizService.submitQuizAttempt(attemptId, answers);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const results = await quizService.getQuizResults(attemptId);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentAttemptResults = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const studentId = (req as any).userId;

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Ensure student can only view their own attempts
    if (attempt.studentId !== studentId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const quiz = await Quiz.findById(attempt.quizId);
    const student = await User.findById(attempt.studentId);
    const submissions = await QuizSubmission.find({ quizAttemptId: attemptId }).sort({ questionNo: 1 });

    // Fetch questions for text and correct answers
    const questionIds = submissions.map(s => s.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    const attemptResult = {
      attemptId: attempt._id,
      quizTitle: quiz?.title || 'Quiz',
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Student',
      score: attempt.obtainedMarks || 0,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage || 0,
      passed: attempt.passed || false,
      timeSpent: attempt.timeSpent || 0,
      totalTime: (quiz?.totalTime || 0) * 60,
      questionsAnswered: attempt.questionsAnswered || 0,
      totalQuestions: quiz?.totalQuestions || 0,
      submittedAt: attempt.submittedAt || attempt.createdAt
    };

    // Build answer review (only if quiz allows it)
    const showAnswers = quiz?.showAnswersAfterSubmit !== false;
    const answers = submissions.map(sub => {
      const question = questionMap.get(sub.questionId);
      const correctOption = question?.options?.find(o => o.isCorrect);
      const correctAnswerText = correctOption?.text ||
        question?.correctAnswers?.join(', ') ||
        question?.correctAnswerText || '';

      return {
        questionId: sub.questionId,
        questionText: question?.question || '',
        isCorrect: sub.isCorrect || false,
        selectedAnswer: Array.isArray(sub.studentAnswer)
          ? sub.studentAnswer.join(', ')
          : (sub.studentAnswer?.toString() || 'Not answered'),
        correctAnswer: showAnswers ? correctAnswerText : '',
        marksAwarded: sub.marksAwarded || 0,
        maxMarks: question?.marks || 0,
        feedback: sub.feedback || question?.explanation || ''
      };
    });

    res.json({ attempt: attemptResult, answers });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLatestStudentAttempt = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = (req as any).userId;

    // First try submitted/abandoned attempts
    let attempt = await QuizAttempt.findOne({
      quizId,
      studentId,
      status: { $in: ['submitted', 'abandoned'] }
    }).sort({ createdAt: -1 });

    // If no submitted attempt, check for in_progress attempts (quiz may have been closed/abandoned)
    if (!attempt) {
      attempt = await QuizAttempt.findOne({
        quizId,
        studentId,
        status: 'in_progress'
      }).sort({ createdAt: -1 });

      // Auto-abandon in_progress attempt if quiz time has ended
      if (attempt) {
        const quiz = await Quiz.findById(quizId);
        if (quiz) {
          const endTime = new Date(`${quiz.endDate.toISOString().split('T')[0]}T${quiz.endTime}`);
          if (new Date() > endTime) {
            attempt.status = 'abandoned';
            attempt.abandonedAt = new Date();
            await attempt.save();
          }
        }
      }
    }

    if (!attempt) {
      return res.status(404).json({ message: 'No attempts found for this quiz' });
    }

    res.json(attempt);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentQuizzes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;

    // Get user to find their batch/enrollment
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all quizzes for the tenant
    const allQuizzes = await Quiz.find({ tenantId, isActive: true });

    // Filter quizzes based on access level and enrollment
    const availableQuizzes = await Promise.all(
      allQuizzes.map(async (quiz) => {
        // Public quizzes - everyone can see
        let hasAccess = false;
        
        if (quiz.access === 'public') {
          hasAccess = true;
        } else if (quiz.access === 'private') {
          // Private quizzes - check access based on accessibleTo
          if (quiz.accessibleTo === 'everyone') {
            hasAccess = true;
          } else if (quiz.accessibleTo === 'batch_wise' && quiz.selectedBatches) {
            // Check if user's batch is in the selected batches
            if (user.batchId && quiz.selectedBatches.includes(user.batchId.toString())) {
              hasAccess = true;
            }
          } else if (quiz.accessibleTo === 'individual' && quiz.selectedStudents) {
            // Check if user is in the selected students
            if (quiz.selectedStudents.includes(userId)) {
              hasAccess = true;
            }
          }
        }

        if (!hasAccess) {
          return null;
        }

        // Get attempt information for this student (include all statuses)
        const allAttempts = await QuizAttempt.find({
          quizId: quiz._id,
          studentId: userId
        }).sort({ createdAt: -1 });

        const completedAttempts = allAttempts.filter(a => a.status === 'submitted' || a.status === 'abandoned');
        const inProgressAttempts = allAttempts.filter(a => a.status === 'in_progress');

        // Auto-abandon in_progress attempts if quiz time has ended
        const now = new Date();
        const endTime = new Date(`${quiz.endDate.toISOString().split('T')[0]}T${quiz.endTime}`);
        if (now > endTime && inProgressAttempts.length > 0) {
          for (const ip of inProgressAttempts) {
            ip.status = 'abandoned';
            ip.abandonedAt = now;
            await ip.save();
            completedAttempts.push(ip);
          }
        }

        const latestAttempt = completedAttempts[0] || inProgressAttempts[0];
        const hasAttempted = completedAttempts.length > 0 || inProgressAttempts.length > 0;
        
        // Convert to plain object and add student-specific info
        const quizData = quiz.toObject() as any;
        quizData.isAttempted = hasAttempted;
        quizData.attemptCount = completedAttempts.length;
        quizData.lastAttemptMarks = latestAttempt?.obtainedMarks || 0;
        quizData.lastAttemptPassed = latestAttempt ? (latestAttempt.obtainedMarks || 0) >= quiz.passingMarks : false;
        quizData.hasInProgressAttempt = inProgressAttempts.length > 0 && now <= endTime;

        return quizData;
      })
    );

    // Filter out null values (quizzes student doesn't have access to)
    const filteredQuizzes = availableQuizzes.filter((q) => q !== null);

    res.json(filteredQuizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
// ========== QUESTION BANK LINKING ==========

// Link questions from Question Bank to a quiz
export const linkQuestionsToQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: 'questionIds must be a non-empty array' });
    }

    const quiz = await quizService.linkQuestionsToQuiz(quizId, questionIds);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Questions linked successfully', quiz });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Add a single question to a quiz
export const addQuestionToQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await quizService.addQuestionToQuiz(quizId, questionId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz or Question not found' });
    }

    res.json({ message: 'Question added to quiz', quiz });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a single question from a quiz
export const removeQuestionFromQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await quizService.removeQuestionFromQuiz(quizId, questionId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz or Question not found' });
    }

    res.json({ message: 'Question removed from quiz', quiz });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Remove all questions from a quiz
export const removeQuestionsFromQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    await quizService.removeQuestionsFromQuiz(quizId);
    res.json({ message: 'All questions removed from quiz' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get available questions for linking to a quiz (from Question Bank)
export const getAvailableQuestions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { difficulty, type, tags } = req.query;

    const filters: any = {};
    if (difficulty) filters.difficulty = difficulty;
    if (type) filters.type = type;
    if (tags) filters.tags = (tags as string).split(',');

    const questions = await quizService.getAvailableQuestingsForQuiz(tenantId, filters);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};