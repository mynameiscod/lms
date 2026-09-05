import Quiz, { IQuiz } from '../models/Quiz';
import { reconcileQuizTotalMarks, computeQuizTotalMarks, percentageOf } from './quizMarksService';
import AssessmentSchedule from '../models/AssessmentSchedule';
import Question from '../models/Question';
import QuizAttempt from '../models/QuizAttempt';
import QuizSubmission from '../models/QuizSubmission';
import Batch from '../models/Batch';
import User from '../models/User';
import { resolveForStudent } from './assessmentDeliveryService';
import crypto from 'crypto';

/**
 * Resolve the correct option text(s) for an MCQ question, honoring BOTH ways a question
 * can store correctness:
 *   1. option-level `isCorrect: true` flags (how the builder / question bank stores it), and
 *   2. a `correctAnswers` array of option indices OR option text (legacy / CSV imports).
 * Grading previously used only (2), so questions that carried correctness ONLY as (1) were
 * marked wrong even when the student picked the right option. Returns trimmed, sorted texts.
 */
export function resolveCorrectAnswerTexts(question: any): string[] {
  const opts: any[] = Array.isArray(question?.options) ? question.options : [];

  // 1. Option-level isCorrect flags.
  let texts = opts
    .filter((o: any) => o && typeof o === 'object' && o.isCorrect)
    .map((o: any) => String(o.text || '').trim())
    .filter((t: string) => t !== '');

  // 2. Fall back to the correctAnswers array (index or text).
  if (texts.length === 0 && Array.isArray(question?.correctAnswers) && question.correctAnswers.length > 0) {
    texts = question.correctAnswers
      .map((ans: any) => {
        if (ans === null || ans === undefined || ans === '') return '';
        const ansStr = String(ans).trim();
        if (!isNaN(Number(ansStr))) {
          const index = parseInt(ansStr);
          if (index >= 0 && opts.length > index) {
            const option = opts[index];
            return String((typeof option === 'string' ? option : (option?.text || '')) || '').trim();
          }
          return '';
        }
        return ansStr; // already option text
      })
      .filter((a: string) => a !== '');
  }

  return texts.sort();
}

export class QuizService {
  // Create a new quiz
  async createQuiz(quizData: Partial<IQuiz>, tenantId: string): Promise<IQuiz> {
    const quiz = new Quiz({
      ...quizData,
      tenantId
    });
    return quiz.save();
  }

  // Get quizzes by chapter ID
  async getQuizzesByChapter(chapterId: string, tenantId: string): Promise<IQuiz[]> {
    return Quiz.find({ chapterId, tenantId, isActive: true, archivedAt: null }).sort({ createdAt: -1 });
  }

  // Get all quizzes for a tenant with filters
  async getQuizzes(tenantId: string, filters?: any) {
    const query: any = { tenantId };

    if (filters?.view === 'archived') {
      query.archivedAt = { $ne: null };
    } else {
      // Default: only non-archived quizzes
      query.archivedAt = null;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.createdBy) {
      query.createdBy = filters.createdBy;
    }
    if (filters?.access) {
      query.access = filters.access;
    }
    if (filters?.primaryTech) query.primaryTech = filters.primaryTech;
    if (filters?.chapterId) query.chapterId = filters.chapterId;
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return Quiz.find(query)
      .populate('chapterId', 'title')
      .populate('subjectId', 'title')
      .populate('topicId', 'name title')
      .sort({ createdAt: -1 });
  }

  // Get quiz by ID
  async getQuizById(quizId: string): Promise<IQuiz | null> {
    return Quiz.findById(quizId);
  }

  // Update quiz
  async updateQuiz(quizId: string, updateData: Partial<IQuiz>): Promise<IQuiz | null> {
    return Quiz.findByIdAndUpdate(quizId, updateData, { new: true });
  }

  // Delete quiz
  async deleteQuiz(quizId: string): Promise<boolean> {
    const result = await Quiz.findByIdAndDelete(quizId);
    if (result) {
      // Also delete associated questions and attempts
      await Question.deleteMany({ quizId });
      await QuizAttempt.deleteMany({ quizId });
      await QuizSubmission.deleteMany({ quizId });
      return true;
    }
    return false;
  }

  // Check if student can access quiz
  async canStudentAccessQuiz(quizId: string, studentId: string): Promise<boolean> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return false;

    const student = await User.findById(studentId).select('batchId').lean() as any;

    // Delivered to this student via an AssessmentSchedule (the reusable Assign-to-Batches
    // path — batch OR specific students)? That grants access regardless of accessibleTo.
    const or: any[] = [{ studentIds: studentId }];
    if (student?.batchId) or.push({ batchId: student.batchId });
    if (await AssessmentSchedule.exists({ contentType: 'quiz', contentId: quizId, status: 'active', $or: or })) {
      return true;
    }

    if (quiz.access === 'private') return false;

    if (quiz.accessibleTo === 'everyone') {
      return true;
    } else if (quiz.accessibleTo === 'batch_wise') {
      if (!student) return false;
      return quiz.selectedBatches?.includes(student.batchId?.toString() || '') || false;
    } else if (quiz.accessibleTo === 'individual') {
      return quiz.selectedStudents?.includes(studentId) || false;
    }

    return false;
  }

  // Check if quiz is currently active/available
  async isQuizAvailable(quizId: string): Promise<{ available: boolean; reason?: string }> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return { available: false, reason: 'Quiz not found' };
    }

    if (!quiz.isActive) {
      return { available: false, reason: 'Quiz is inactive' };
    }

    const now = new Date();
    const [startHour, startMin] = quiz.startTime.split(':').map(Number);
    const [endHour, endMin] = quiz.endTime.split(':').map(Number);

    // Extract date parts as UTC
    const startDate = new Date(quiz.startDate);
    const endDate = new Date(quiz.endDate);

    // Convert IST times to UTC (IST = UTC + 5:30, so UTC = IST - 5:30)
    // For start time
    let startUTCHour = startHour - 5;
    let startUTCMin = startMin - 30;
    if (startUTCMin < 0) {
      startUTCHour -= 1;
      startUTCMin += 60;
    }
    if (startUTCHour < 0) {
      // Previous day in UTC
      startUTCHour += 24;
      startDate.setUTCDate(startDate.getUTCDate() - 1);
    }

    const startDateTimeUTC = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        startUTCHour,
        startUTCMin,
        0,
        0
      )
    );

    // For end time
    let endUTCHour = endHour - 5;
    let endUTCMin = endMin - 30;
    if (endUTCMin < 0) {
      endUTCHour -= 1;
      endUTCMin += 60;
    }
    if (endUTCHour < 0) {
      // Previous day in UTC
      endUTCHour += 24;
      endDate.setUTCDate(endDate.getUTCDate() - 1);
    }

    const endDateTimeUTC = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        endUTCHour,
        endUTCMin,
        59,
        999
      )
    );

    // Allow quiz access if current time is within the start and end window
    if (now < startDateTimeUTC) {
      const startFormatted = startDate.toLocaleDateString('en-IN') + ' ' + quiz.startTime + ' IST';
      return { available: false, reason: `Quiz will be available on ${startFormatted}` };
    }

    if (now > endDateTimeUTC) {
      const endFormatted = endDate.toLocaleDateString('en-IN') + ' ' + quiz.endTime + ' IST';
      return { available: false, reason: `Quiz ended on ${endFormatted}` };
    }

    return { available: true };
  }

  // Get remaining time for quiz
  getRemainingTime(quizId: string): number {
    // Implementation for calculating remaining time based on start time and duration
    return 0;
  }

  // Start quiz attempt
  async startQuizAttempt(quizId: string, studentId: string, tenantId: string): Promise<any> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new Error('Quiz not found');

    // Check if user is admin/instructor (allow preview without access checks)
    const user = await User.findById(studentId);
    const isAdminOrInstructor = user && ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(user.role);

    if (!isAdminOrInstructor) {
      // Check if student can attempt
      const canAccess = await this.canStudentAccessQuiz(quizId, studentId);
      if (!canAccess) throw new Error('You do not have access to this quiz');

      // Availability window: when the quiz is delivered via a schedule (per-batch or
      // individual) or a curriculum day, that window governs — and the controller's
      // checkDeadlineGate already enforced it. Only fall back to the quiz's OWN baked
      // start/end window for un-scheduled (legacy/standalone) quizzes; otherwise a
      // stale baked endDate would wrongly block an assigned, still-open quiz.
      const delivery = await resolveForStudent(tenantId, studentId, 'quiz', quizId);
      if (delivery.source !== 'schedule' && delivery.source !== 'curriculum') {
        const availabilityCheck = await this.isQuizAvailable(quizId);
        if (!availabilityCheck.available) {
          throw new Error(availabilityCheck.reason || 'Quiz is not available at this time');
        }
      }

      // Check attempt count
      if (quiz.multipleAttempts && quiz.maxAttempts) {
        const previousAttempts = await QuizAttempt.countDocuments({
          quizId,
          studentId,
          status: { $in: ['submitted', 'abandoned'] }
        });

        if (previousAttempts >= quiz.maxAttempts) {
          throw new Error(`Maximum attempts (${quiz.maxAttempts}) reached`);
        }
      } else if (!quiz.multipleAttempts) {
        // For single attempt quizzes, check only completed/submitted attempts
        const existingAttempt = await QuizAttempt.findOne({ 
          quizId, 
          studentId,
          status: { $in: ['submitted', 'abandoned'] }
        });
        if (existingAttempt) {
          throw new Error('You have already attempted this quiz');
        }
      }
    }

    // Create new attempt
    const attemptCount = await QuizAttempt.countDocuments({ quizId, studentId }) + 1;
    /**
     * The paper's real total, taken at the moment the attempt begins.
     *
     * quiz.totalMarks is typed by an author and never reconciled with the questions actually
     * attached, so it drifts: a quiz of eighteen questions worth twenty marks declared itself
     * out of eighteen, and a student earning nineteen was shown 106%. Reconciled here as well
     * as on save, because a quiz created before this existed still carries a stale figure and
     * the attempt would otherwise inherit it permanently.
     */
    const reconciled = await reconcileQuizTotalMarks(quiz);
    if (reconciled.changed) {
      await Quiz.updateOne({ _id: quiz._id }, { $set: { totalMarks: reconciled.to } }).catch(() => {});
      console.log('[quiz-marks] corrected total on attempt start', JSON.stringify({
        quizId: String(quiz._id), from: reconciled.from, to: reconciled.to,
      }));
    }

    const attempt = new QuizAttempt({
      quizId,
      studentId,
      tenantId,
      attemptNo: attemptCount,
      totalMarks: reconciled.to || quiz.totalMarks,
      status: 'in_progress',
      startedAt: new Date()
    });

    return attempt.save();
  }

  // Get questions for quiz
  async getQuizQuestions(quizId: string, shuffle: boolean = false): Promise<any[]> {
    let questions = await Question.find({ quizId }).sort({ questionNo: 1 });

    if (shuffle) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Remove correct answers from response (don't send to student)
    return questions.map(q => {
      const qObj = q.toObject() as any;
      
      // Map backend fields to frontend field names
      qObj.questionText = qObj.question || qObj.questionText;
      qObj.difficulty = qObj.difficultyLevel || qObj.difficulty;
      
      if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
        qObj.options = (qObj.options || []).map((opt: any) => {
          // Null/undefined safety
          if (!opt) {
            return { text: '', isCorrect: false, _id: '' };
          }
          
          // Handle string options
          if (typeof opt === 'string') {
            return { _id: opt, text: String(opt), isCorrect: false };
          }
          
          // Handle object options
          if (typeof opt === 'object') {
            const optText = opt.text || opt.option || opt.label || '';
            return {
              _id: opt._id || opt.text || opt.id || '',
              text: String(optText),
              isCorrect: false
              // Don't include actual correct answer
            };
          }
          
          // Fallback
          return { text: String(opt), isCorrect: false, _id: String(opt) };
        });
      }
      delete qObj.correctAnswers;
      delete qObj.correctAnswerText;
      delete qObj.explanation; // Don't expose explanation to students during quiz
      return qObj;
    });
  }

  // Submit quiz attempt
  async submitQuizAttempt(attemptId: string, answers: any[]): Promise<any> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    // Idempotency: if this attempt was already submitted (e.g. the student's first
    // request completed but their flaky network dropped the response and they retried),
    // just return the existing result instead of re-grading / duplicating submissions.
    if (attempt.status === 'submitted') return attempt;

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) throw new Error('Quiz not found');

    // Batch-load every question in one query (was one findById per answer → slow, and a
    // slow submit widens the window for the client connection to drop = "Failed to fetch").
    const qIds = [...new Set(answers.map((a: any) => a.questionId).filter(Boolean))];
    const questionDocs = await Question.find({ _id: { $in: qIds } });
    const qById = new Map<string, any>(questionDocs.map((q: any) => [String(q._id), q]));

    // Save submissions and calculate marks
    let obtainedMarks = 0;
    let correctAnswers = 0;
    const submissionDocs: any[] = [];

    for (const answer of answers) {
      const question = qById.get(String(answer.questionId));
      if (!question) continue;

      let isCorrect = false;
      let marksAwarded = 0;

      if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
        const selectedOptions = answer.selectedOptions || [];
        
        // Ensure selectedOptions is an array
        const normalizedSelected = (Array.isArray(selectedOptions) ? selectedOptions : [])
          .map(o => String(o || '').trim())
          .filter(o => o !== '')
          .sort();
        
        // Resolve the correct option text(s) — honoring BOTH representations a question
        // may use (option-level isCorrect flags OR a correctAnswers array of indices/text).
        const correctAnswerTexts = resolveCorrectAnswerTexts(question);

        // Only mark as correct if both have values and they match
        // Empty arrays should NOT match (student didn't select anything or system couldn't resolve correct answer)
        isCorrect = normalizedSelected.length > 0 && 
                   correctAnswerTexts.length > 0 && 
                   JSON.stringify(normalizedSelected) === JSON.stringify(correctAnswerTexts);
        if (isCorrect) {
          marksAwarded = question.marks;
        } else if (normalizedSelected.length > 0 && quiz.negativeMarking && quiz.negativeMarkingValue) {
          // Apply negative marking for wrong answers (only if student selected something)
          marksAwarded = -(quiz.negativeMarkingValue);
        } else {
          marksAwarded = 0;
        }
      } else if (question.type === 'short_answer') {
        // For short answers, mark as pending for manual review
        marksAwarded = 0; // Will be graded manually
      } else if (question.type === 'coding') {
        // For coding, validate against test cases
        marksAwarded = 0; // Will be graded by system
      }

      if (isCorrect) correctAnswers++;
      obtainedMarks += marksAwarded;

      // Properly store student answer based on question type
      let studentAnswerValue = '';
      if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
        // For MCQ, always use selectedOptions (convert to comma-separated string)
        const selectedOpts = answer.selectedOptions || [];
        studentAnswerValue = Array.isArray(selectedOpts) 
          ? selectedOpts.join(', ') 
          : String(selectedOpts || '');
      } else if (question.type === 'short_answer') {
        // For short answer, use the answer field
        studentAnswerValue = answer.answer || '';
      } else if (question.type === 'coding') {
        // For coding, use the answer field
        studentAnswerValue = answer.answer || '';
      }

      // Collect submission (inserted in one batch after the loop)
      submissionDocs.push({
        quizAttemptId: attemptId,
        quizId: attempt.quizId,
        questionId: answer.questionId,
        studentId: attempt.studentId,
        tenantId: attempt.tenantId,
        questionNo: answer.questionNo || 1, // Use questionNo from submission (now sent by frontend)
        questionType: question.type,
        studentAnswer: studentAnswerValue, // NOW PROPERLY SET FOR ALL QUESTION TYPES
        selectedOptions: answer.selectedOptions || [],
        isCorrect,
        marksAwarded
      });
    }

    // One batched insert instead of N sequential saves (keeps the submit fast).
    if (submissionDocs.length) await QuizSubmission.insertMany(submissionDocs, { ordered: false });

    // Update attempt
    // Against the paper's REAL total, and clamped. A quiz edited between a student starting
    // and submitting can still put obtained above the stored total, and 106% on a result page
    // destroys a member's trust in every other number on it.
    const submitTotal = await computeQuizTotalMarks(quiz) || quiz.totalMarks;
    const percentage = percentageOf(obtainedMarks, submitTotal);
    const passed = quiz.passingMarks ? obtainedMarks >= quiz.passingMarks : 
                  (quiz.passPercentage ? percentage >= quiz.passPercentage : false);

    // Calculate time spent
    const timeSpent = attempt.startedAt 
      ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.obtainedMarks = obtainedMarks;
    // The denominator the result page shows. Without this the card reads "19/18" even though
    // the percentage beside it was worked out against the real twenty.
    attempt.totalMarks = submitTotal;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.questionsAnswered = answers.length;
    attempt.timeSpent = timeSpent;
    attempt.shareToken = crypto.randomUUID();

    return attempt.save();
  }

  /**
   * Re-grade every submitted attempt of a quiz using the current (fixed) MCQ grading —
   * repairs attempts that were stored wrong when a question's correctness was only on
   * option-level isCorrect flags. Recomputes each MCQ submission's isCorrect/marksAwarded
   * and the attempt's obtainedMarks / correct count / percentage / passed. Safe & idempotent.
   */
  async regradeQuiz(quizId: string): Promise<{ attempts: number; submissionsUpdated: number; attemptsChanged: number }> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new Error('Quiz not found');

    const attempts = await QuizAttempt.find({ quizId, status: 'submitted' });
    let submissionsUpdated = 0;
    let attemptsChanged = 0;

    for (const attempt of attempts) {
      const subs = await QuizSubmission.find({ quizAttemptId: String(attempt._id) });
      if (!subs.length) continue;

      const qDocs = await Question.find({ _id: { $in: subs.map(s => s.questionId) } });
      const qById = new Map<string, any>(qDocs.map((q: any) => [String(q._id), q]));

      let obtainedMarks = 0;
      let correctCount = 0;
      let changed = false;

      for (const sub of subs) {
        const question = qById.get(String(sub.questionId));
        if (!question) { obtainedMarks += sub.marksAwarded || 0; continue; }

        if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
          const selected = (Array.isArray(sub.selectedOptions) ? sub.selectedOptions : [])
            .map((o: any) => String(o || '').trim()).filter((o: string) => o !== '').sort();
          const correctTexts = resolveCorrectAnswerTexts(question);
          const isCorrect = selected.length > 0 && correctTexts.length > 0 &&
            JSON.stringify(selected) === JSON.stringify(correctTexts);
          let marks = 0;
          if (isCorrect) marks = question.marks;
          else if (selected.length > 0 && quiz.negativeMarking && quiz.negativeMarkingValue) marks = -(quiz.negativeMarkingValue);

          if (sub.isCorrect !== isCorrect || sub.marksAwarded !== marks) {
            sub.isCorrect = isCorrect;
            sub.marksAwarded = marks;
            await sub.save();
            submissionsUpdated++;
            changed = true;
          }
          if (isCorrect) correctCount++;
          obtainedMarks += marks;
        } else {
          // Non-MCQ (short answer / coding) grades are left untouched.
          obtainedMarks += sub.marksAwarded || 0;
          if (sub.isCorrect) correctCount++;
        }
      }

      const regradeTotal = await computeQuizTotalMarks(quiz) || quiz.totalMarks;
      const percentage = percentageOf(obtainedMarks, regradeTotal);
      const passed = quiz.passingMarks ? obtainedMarks >= quiz.passingMarks
        : (quiz.passPercentage ? percentage >= quiz.passPercentage : false);

      if (attempt.obtainedMarks !== obtainedMarks || attempt.percentage !== percentage || attempt.passed !== passed) {
        attempt.obtainedMarks = obtainedMarks;
        attempt.percentage = percentage;
        attempt.passed = passed;
        await attempt.save();
        changed = true;
      }
      if (changed) attemptsChanged++;
    }

    return { attempts: attempts.length, submissionsUpdated, attemptsChanged };
  }

  // Get quiz results
  async getQuizResults(attemptId: string): Promise<any> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    const quiz = await Quiz.findById(attempt.quizId);
    const submissions = await QuizSubmission.find({ quizAttemptId: attemptId });

    return {
      attempt: attempt.toObject(),
      quiz: quiz?.toObject(),
      submissions
    };
  }

  // ========== QUESTION BANK LINKING ==========

  // Link questions from Question Bank to a quiz
  async linkQuestionsToQuiz(quizId: string, questionIds: string[]): Promise<IQuiz | null> {
    // Get all questions to calculate total marks
    const questions = await Question.find({ _id: { $in: questionIds } });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    // Update quiz with question references
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      {
        questionIds,
        totalQuestions: questionIds.length,
        totalMarks,
        questionCount: questionIds.length
      },
      { new: true }
    );

    // Update usage count for each question
    for (const questionId of questionIds) {
      await Question.findByIdAndUpdate(
        questionId,
        {
          $inc: { usageCount: 1 },
          $addToSet: { usedInQuizzes: quizId }
        }
      );
    }

    return quiz;
  }

  // Get questions for a quiz (handles both embedded and referenced questions)
  async getQuestionsForQuiz(quizId: string, includeAnswers: boolean = false): Promise<any[]> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return [];

    let questions: any[] = [];

    // If quiz has referenced questions (from Question Bank)
    if (quiz.questionIds && quiz.questionIds.length > 0) {
      questions = await Question.find({ _id: { $in: quiz.questionIds } });
    } else {
      // Fallback to embedded questions (backward compatibility)
      questions = await Question.find({ quizId }).sort({ questionNo: 1 });
    }

    // Process questions and map fields
    return questions.map(q => {
      const qObj = q.toObject() as any;
      
      // Map backend fields to frontend field names
      qObj.questionText = qObj.question || qObj.questionText;
      qObj.difficulty = qObj.difficultyLevel || qObj.difficulty;
      
      // Ensure options are always objects with text property
      if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
        qObj.options = (qObj.options || []).map((opt: any, optIndex: number) => {
          // Null/undefined safety
          if (!opt) {
            return { text: '', isCorrect: false, _id: '' };
          }
          
          // Handle string options (from Question Bank)
          if (typeof opt === 'string') {
            // Check if correctAnswers contains index or text
            const isCorrect = includeAnswers && qObj.correctAnswers && (
              qObj.correctAnswers.includes(opt) || // Text match
              qObj.correctAnswers.includes(String(optIndex)) // Index match
            );
            return { _id: opt, text: String(opt), isCorrect };
          }
          
          // Handle object options
          if (typeof opt === 'object') {
            const optText = opt.text || opt.option || opt.label || '';
            // Check both isCorrect property and correctAnswers array (for indices and text)
            const isCorrect = includeAnswers ? (
              opt.isCorrect || 
              (qObj.correctAnswers && (
                qObj.correctAnswers.includes(optText) || 
                qObj.correctAnswers.includes(String(optIndex))
              ))
            ) : false;
            return {
              _id: opt._id || opt.text || opt.id || '',
              text: String(optText),
              isCorrect
            };
          }
          
          // Fallback for any other type
          const optStr = String(opt);
          const isCorrect = includeAnswers && qObj.correctAnswers && (
            qObj.correctAnswers.includes(optStr) ||
            qObj.correctAnswers.includes(String(optIndex))
          );
          return { text: optStr, isCorrect, _id: optStr };
        }) || [];
      }
      
      // Remove answers if not needed
      if (!includeAnswers) {
        delete qObj.correctAnswers;
        delete qObj.correctAnswerText;
      }
      
      return qObj;
    });
  }

  // Remove questions from quiz
  async removeQuestionsFromQuiz(quizId: string, questionIds?: string[]): Promise<void> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return;

    const idsToRemove = questionIds || quiz.questionIds || [];

    for (const questionId of idsToRemove) {
      await Question.findByIdAndUpdate(
        questionId,
        {
          $inc: { usageCount: -1 },
          $pull: { usedInQuizzes: quizId }
        }
      );
    }

    if (!questionIds) {
      // Remove all questions
      await Quiz.findByIdAndUpdate(quizId, {
        questionIds: [],
        totalQuestions: 0,
        totalMarks: 0
      });
    }
  }

  // Add single question to quiz
  async addQuestionToQuiz(quizId: string, questionId: string): Promise<IQuiz | null> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return null;

    const question = await Question.findById(questionId);
    if (!question) return null;

    const questionIds = quiz.questionIds || [];
    if (questionIds.includes(questionId)) {
      return quiz; // Already added
    }

    questionIds.push(questionId);
    const totalMarks = (quiz.totalMarks || 0) + (question.marks || 0);

    const updated = await Quiz.findByIdAndUpdate(
      quizId,
      {
        questionIds,
        totalQuestions: questionIds.length,
        totalMarks,
        questionCount: questionIds.length
      },
      { new: true }
    );

    // Update question usage
    await Question.findByIdAndUpdate(
      questionId,
      {
        $inc: { usageCount: 1 },
        $addToSet: { usedInQuizzes: quizId }
      }
    );

    return updated;
  }

  // Remove single question from quiz
  async removeQuestionFromQuiz(quizId: string, questionId: string): Promise<IQuiz | null> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return null;

    const question = await Question.findById(questionId);
    if (!question) return null;

    const questionIds = (quiz.questionIds || []).filter(id => id !== questionId);
    const totalMarks = Math.max((quiz.totalMarks || 0) - (question.marks || 0), 0);

    const updated = await Quiz.findByIdAndUpdate(
      quizId,
      {
        questionIds,
        totalQuestions: questionIds.length,
        totalMarks,
        questionCount: questionIds.length
      },
      { new: true }
    );

    // Update question usage
    await Question.findByIdAndUpdate(
      questionId,
      {
        $inc: { usageCount: -1 },
        $pull: { usedInQuizzes: quizId }
      }
    );

    return updated;
  }

  // Get all available questions for linking to a quiz
  async getAvailableQuestingsForQuiz(tenantId: string, filters?: any): Promise<any[]> {
    const query: any = { tenantId, quizId: { $exists: false } };

    if (filters?.difficulty) query.difficultyLevel = filters.difficulty;
    if (filters?.type) query.type = filters.type;
    if (filters?.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    if (filters?.source) query.source = filters.source;
    if (filters?.subject) query.subject = { $regex: filters.subject, $options: 'i' };
    if (filters?.topic) query.topic = { $regex: filters.topic, $options: 'i' };
    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom as string);
      if (filters.dateTo) {
        const to = new Date(filters.dateTo as string);
        to.setDate(to.getDate() + 1);
        query.createdAt.$lte = to;
      }
    }

    return Question.find(query).select('_id question type marks difficultyLevel tags subject topic source usageCount createdAt');
  }
}

export default new QuizService();
