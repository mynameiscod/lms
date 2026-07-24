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
import { checkDeadlineGate, schedulesMapForBatch, policyFromRow } from '../services/assessmentDeliveryService';
import { computeStatus, mergePolicy, DEFAULT_POLICY } from '../services/deadlinePolicyService';

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

    // Send email notifications to target students (skip for external quizzes — they use token links)
    if (!rest.isExternalQuiz) try {
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
            totalMarks,
            startTime,
            endTime
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

    // Per-batch deadline/late-policy gate (schedule row, else the quiz's baked window).
    const gate = await checkDeadlineGate(tenantId, studentId, 'quiz', quizId);
    if (!gate.allowed) return res.status(403).json({ message: gate.reason || 'This quiz is closed.' });

    const attempt = await quizService.startQuizAttempt(quizId, studentId, tenantId);
    res.status(201).json(attempt);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    const shuffle = quiz?.shuffleQuestions || false;
    const questions = await quizService.getQuizQuestions(quizId, shuffle);
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
    
    // Respect quiz settings
    const quiz = results.quiz;
    if (quiz) {
      // If showScoreAfterSubmit is false, hide score details
      if (quiz.showScoreAfterSubmit === false) {
        results.attempt.obtainedMarks = undefined;
        results.attempt.percentage = undefined;
        results.attempt.passed = undefined;
      }
      // If allowReview is false, hide submissions
      if (quiz.allowReview === false) {
        results.submissions = [];
      }
      // If showAnswersAfterSubmit is false, strip correct answers from submissions
      if (quiz.showAnswersAfterSubmit === false) {
        results.submissions = results.submissions.map((s: any) => {
          const sub = s.toObject ? s.toObject() : { ...s };
          delete sub.correctAnswer;
          delete sub.correctAnswers;
          return sub;
        });
      }
    }
    
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

      // Resolve correct answer text with index-fallback for legacy CSV questions
      let correctAnswerText = '';
      if (showAnswers && question) {
        const opts: any[] = question.options || [];
        // 1. Try isCorrect flag on option objects
        const correctOpt = opts.find((o: any) => typeof o === 'object' && o.isCorrect);
        if (correctOpt) {
          correctAnswerText = correctOpt.text || '';
        } else if (question.correctAnswers && question.correctAnswers.length > 0) {
          // 2. Try to resolve each correctAnswer entry as index or text
          const resolved = question.correctAnswers.map((ans: string) => {
            const idx = parseInt(ans);
            if (!isNaN(idx) && opts[idx] !== undefined) {
              const opt = opts[idx];
              return typeof opt === 'string' ? opt : (opt?.text || ans);
            }
            return ans; // already text
          }).filter(Boolean);
          correctAnswerText = resolved.join(', ');
        } else if (question.correctAnswerText) {
          correctAnswerText = question.correctAnswerText;
        }
      }

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

    // Get all quizzes for the tenant — exclude external/token-only and archived quizzes
    const allQuizzes = await Quiz.find({ tenantId, isActive: true, isExternalQuiz: { $ne: true }, archivedAt: null });

    // Quizzes delivered to this batch via an AssessmentSchedule (the reusable path).
    const batchIdStr = user.batchId ? user.batchId.toString() : null;
    const quizSchedMap = await schedulesMapForBatch(tenantId, batchIdStr, 'quiz');

    // Filter quizzes based on access level and enrollment
    const availableQuizzes = await Promise.all(
      allQuizzes.map(async (quiz) => {
        // Check access based on accessibleTo (always respected, regardless of public/private)
        let hasAccess = false;

        if (quiz.accessibleTo === 'batch_wise') {
          // Batch-wise: only students whose batchId is in selectedBatches
          if (user.batchId && quiz.selectedBatches && quiz.selectedBatches.includes(user.batchId.toString())) {
            hasAccess = true;
          }
        } else if (quiz.accessibleTo === 'individual') {
          // Individual: only selected students
          if (quiz.selectedStudents && quiz.selectedStudents.includes(userId)) {
            hasAccess = true;
          }
        } else {
          // Only explicit 'everyone' grants in-app access. `access: 'public'` is for
          // shareable links and must NOT surface a quiz to every student's list.
          hasAccess = quiz.accessibleTo === 'everyone';
        }

        // A schedule row for this batch also grants access (reusable delivery).
        if (!hasAccess && quizSchedMap.has(String(quiz._id))) hasAccess = true;

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

        // Resolve the deadline + status: schedule row for this batch wins, else the
        // quiz's baked end window (hard_lock, matching legacy behavior).
        const row = quizSchedMap.get(String(quiz._id));
        const dueAt = row?.dueAt ? new Date(row.dueAt) : endTime;
        const policy = row ? policyFromRow(row) : mergePolicy(DEFAULT_POLICY, { latePolicy: 'hard_lock' });
        const sub = hasAttempted ? { status: 'submitted', submittedAt: (latestAttempt as any)?.submittedAt || (latestAttempt as any)?.createdAt } : null;
        quizData.delivery = {
          dueAt,
          startAt: row?.startAt ? new Date(row.startAt) : null,
          source: row ? 'schedule' : 'baked',
          latePolicy: policy.latePolicy,
          status: computeStatus({ policy, dueAt, submission: sub }),
        };

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
    const { difficulty, type, tags, source, subject, topic, dateFrom, dateTo } = req.query;

    const filters: any = {};
    if (difficulty) filters.difficulty = difficulty;
    if (type) filters.type = type;
    if (tags) filters.tags = (tags as string).split(',');
    if (source) filters.source = source;
    if (subject) filters.subject = subject;
    if (topic) filters.topic = topic;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const questions = await quizService.getAvailableQuestingsForQuiz(tenantId, filters);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Save proctoring recording for a quiz attempt
export const uploadAttemptRecording = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No recording file provided' });
    }
    res.json({ success: true, message: 'Recording saved', path: file.path });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clone an existing quiz (with its linked questions) into a new quiz for a different batch
export const cloneQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const { title, startDate, endDate, startTime, endTime, selectedBatches, selectedStudents, accessibleTo } = req.body;

    const sourceQuiz = await Quiz.findById(quizId);
    if (!sourceQuiz) {
      return res.status(404).json({ message: 'Source quiz not found' });
    }

    if (!title || !startDate || !endDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'title, startDate, endDate, startTime, endTime are required' });
    }

    // Build new quiz from source, overriding date/access fields
    const clonedData: any = {
      title,
      description: sourceQuiz.description,
      instructions: sourceQuiz.instructions,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime,
      endTime,
      access: sourceQuiz.access,
      accessibleTo: accessibleTo || sourceQuiz.accessibleTo,
      selectedBatches: selectedBatches || [],
      selectedStudents: selectedStudents || [],
      questionIds: sourceQuiz.questionIds || [],
      totalQuestions: sourceQuiz.totalQuestions,
      totalMarks: sourceQuiz.totalMarks,
      totalTime: sourceQuiz.totalTime,
      questionCount: sourceQuiz.questionCount,
      passingMarks: sourceQuiz.passingMarks,
      passPercentage: sourceQuiz.passPercentage,
      negativeMarking: sourceQuiz.negativeMarking,
      negativeMarkingValue: sourceQuiz.negativeMarkingValue,
      shuffleQuestions: sourceQuiz.shuffleQuestions,
      showAnswersAfterSubmit: sourceQuiz.showAnswersAfterSubmit,
      showScoreAfterSubmit: sourceQuiz.showScoreAfterSubmit,
      allowReview: sourceQuiz.allowReview,
      multipleAttempts: sourceQuiz.multipleAttempts,
      maxAttempts: sourceQuiz.maxAttempts,
      canCopyPaste: sourceQuiz.canCopyPaste,
      requireFullScreen: sourceQuiz.requireFullScreen,
      tabSwitchWarnings: sourceQuiz.tabSwitchWarnings,
      enableCamera: sourceQuiz.enableCamera,
      enableMicrophone: sourceQuiz.enableMicrophone,
      warningCount: sourceQuiz.warningCount,
      courseId: sourceQuiz.courseId,
      subjectId: sourceQuiz.subjectId,
      chapterId: sourceQuiz.chapterId,
      createdBy: userId,
      isActive: true
    };

    const newQuiz = new Quiz({ ...clonedData, tenantId });
    await newQuiz.save();

    // Increment usageCount for each linked question
    if (sourceQuiz.questionIds && sourceQuiz.questionIds.length > 0) {
      await Question.updateMany(
        { _id: { $in: sourceQuiz.questionIds } },
        { $inc: { usageCount: 1 }, $addToSet: { usedInQuizzes: newQuiz._id.toString() } }
      );
    }

    res.status(201).json(newQuiz);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ========== ARCHIVING ==========

export const archiveQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    const quiz = await Quiz.findOneAndUpdate(
      { _id: quizId, tenantId, archivedAt: null },
      { archivedAt: new Date() },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or already archived' });
    }

    res.json({ message: 'Quiz archived', quiz });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const unarchiveQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    const quiz = await Quiz.findOneAndUpdate(
      { _id: quizId, tenantId, archivedAt: { $ne: null } },
      { archivedAt: null },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or not archived' });
    }

    res.json({ message: 'Quiz unarchived', quiz });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getArchivedQuizzes = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const quizzes = await quizService.getQuizzes(tenantId, { view: 'archived' });
    res.json(quizzes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Non-Attendees ────────────────────────────────────────────────────────────
// Returns students who were in the quiz's target audience but never submitted.
export const getNonAttendees = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;

    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Build the target audience
    let targetStudents: any[] = [];
    if (quiz.accessibleTo === 'individual') {
      targetStudents = await User.find({
        _id: { $in: quiz.selectedStudents },
        tenantId,
        role: 'STUDENT',
        isActive: true,
      }).select('_id firstName lastName email batchId').lean();
    } else if (quiz.accessibleTo === 'batch_wise') {
      targetStudents = await User.find({
        tenantId,
        role: 'STUDENT',
        isActive: true,
        batchId: { $in: quiz.selectedBatches },
      }).select('_id firstName lastName email batchId').lean();
    } else {
      // everyone
      targetStudents = await User.find({
        tenantId,
        role: 'STUDENT',
        isActive: true,
      }).select('_id firstName lastName email batchId').lean();
    }

    // Find students who have submitted
    const submitted = await QuizAttempt.find({
      quizId,
      status: { $in: ['submitted', 'grading'] },
    }).distinct('studentId');
    const submittedSet = new Set(submitted.map((id: any) => id.toString()));

    const nonAttendees = targetStudents.filter(
      (s: any) => !submittedSet.has(s._id.toString())
    );

    res.json({
      success: true,
      data: {
        total: targetStudents.length,
        submitted: submittedSet.size,
        notAttempted: nonAttendees.length,
        nonAttendees,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reassign a quiz to only the non-attendees (flip to individual mode + send reminder).
export const reassignNonAttendees = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const tenantId = (req as any).tenantId;
    const { extendDays = 0 } = req.body;

    const quiz = await Quiz.findOne({ _id: quizId, tenantId });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    // Build non-attendees (same logic as getNonAttendees)
    let targetStudents: any[] = [];
    if (quiz.accessibleTo === 'individual') {
      targetStudents = await User.find({ _id: { $in: quiz.selectedStudents }, tenantId, role: 'STUDENT', isActive: true }).select('_id firstName lastName email').lean();
    } else if (quiz.accessibleTo === 'batch_wise') {
      targetStudents = await User.find({ tenantId, role: 'STUDENT', isActive: true, batchId: { $in: quiz.selectedBatches } }).select('_id firstName lastName email').lean();
    } else {
      targetStudents = await User.find({ tenantId, role: 'STUDENT', isActive: true }).select('_id firstName lastName email').lean();
    }
    const submitted = await QuizAttempt.find({ quizId, status: { $in: ['submitted', 'grading'] } }).distinct('studentId');
    const submittedSet = new Set(submitted.map((id: any) => id.toString()));
    const nonAttendees = targetStudents.filter((s: any) => !submittedSet.has(s._id.toString()));

    if (nonAttendees.length === 0) {
      return res.json({ success: true, message: 'All students have already submitted', data: { reassigned: 0 } });
    }

    const nonAttendeeIds = nonAttendees.map((s: any) => s._id.toString());
    const newEndDate = extendDays > 0
      ? new Date(new Date(quiz.endDate).getTime() + extendDays * 24 * 60 * 60 * 1000)
      : quiz.endDate;

    await Quiz.findByIdAndUpdate(quizId, {
      accessibleTo: 'individual',
      selectedStudents: nonAttendeeIds,
      selectedBatches: [],
      endDate: newEndDate,
      isActive: true,
      archivedAt: null,
    });

    // Send reminder emails
    const emailService = new EmailService();
    const emailPromises = nonAttendees.map((student: any) =>
      emailService.sendQuizNotificationEmail(
        student.email,
        `${student.firstName} ${student.lastName}`,
        `[Reminder] ${quiz.title}`,
        quiz.description,
        new Date(quiz.startDate),
        new Date(newEndDate),
        quiz.totalTime,
        quiz.totalMarks,
        quiz.startTime,
        quiz.endTime
      ).catch(() => {})
    );
    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Quiz reassigned to ${nonAttendees.length} non-attendees${extendDays > 0 ? `, deadline extended by ${extendDays} day(s)` : ''}`,
      data: { reassigned: nonAttendees.length },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};