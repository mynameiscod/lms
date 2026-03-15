import Quiz, { IQuiz } from '../models/Quiz';
import Question from '../models/Question';
import QuizAttempt from '../models/QuizAttempt';
import QuizSubmission from '../models/QuizSubmission';
import Batch from '../models/Batch';
import User from '../models/User';

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
    return Quiz.find({ chapterId, tenantId, isActive: true }).sort({ createdAt: -1 });
  }

  // Get all quizzes for a tenant with filters
  async getQuizzes(tenantId: string, filters?: any) {
    const query: any = { tenantId };
    
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.createdBy) {
      query.createdBy = filters.createdBy;
    }
    if (filters?.access) {
      query.access = filters.access;
    }

    return Quiz.find(query).sort({ createdAt: -1 });
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
    if (!quiz || quiz.access === 'private') return false;

    if (quiz.accessibleTo === 'everyone') {
      return true;
    } else if (quiz.accessibleTo === 'batch_wise') {
      const student = await User.findById(studentId);
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

      const availabilityCheck = await this.isQuizAvailable(quizId);
      if (!availabilityCheck.available) {
        throw new Error(availabilityCheck.reason || 'Quiz is not available at this time');
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
    const attempt = new QuizAttempt({
      quizId,
      studentId,
      tenantId,
      attemptNo: attemptCount,
      totalMarks: quiz.totalMarks,
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
      return qObj;
    });
  }

  // Submit quiz attempt
  async submitQuizAttempt(attemptId: string, answers: any[]): Promise<any> {
    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) throw new Error('Quiz not found');

    // Save submissions and calculate marks
    let obtainedMarks = 0;
    let correctAnswers = 0;

    for (const answer of answers) {
      const question = await Question.findById(answer.questionId);
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
        
        // Convert correctAnswers indices/text to actual option text
        let correctAnswerTexts: string[] = [];
        if (question.correctAnswers && question.correctAnswers.length > 0) {
          correctAnswerTexts = question.correctAnswers
            .map(ans => {
              if (!ans) return '';
              
              // If it's a number or numeric string (index), convert to option text
              const ansStr = String(ans).trim();
              if (!isNaN(Number(ansStr))) {
                const index = parseInt(ansStr);
                // Access the option directly from the array
                if (Array.isArray(question.options) && question.options.length > index && index >= 0) {
                  const option = question.options[index];
                  // Option could be a string or an object with text property
                  const optionText = typeof option === 'string' ? option : (option?.text || '');
                  return String(optionText || '').trim();
                }
                return '';
              }
              // Otherwise it's already the option text
              return ansStr;
            })
            .filter(a => a !== '')
            .sort();
        }
        
        // Only mark as correct if both have values and they match
        // Empty arrays should NOT match (student didn't select anything or system couldn't resolve correct answer)
        isCorrect = normalizedSelected.length > 0 && 
                   correctAnswerTexts.length > 0 && 
                   JSON.stringify(normalizedSelected) === JSON.stringify(correctAnswerTexts);
        marksAwarded = isCorrect ? question.marks : 0;
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

      // Save submission
      const submission = new QuizSubmission({
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

      await submission.save();
    }

    // Update attempt
    const percentage = (obtainedMarks / quiz.totalMarks) * 100;
    const passed = quiz.passingMarks ? obtainedMarks >= quiz.passingMarks : 
                  (quiz.passPercentage ? percentage >= quiz.passPercentage : false);

    // Calculate time spent
    const timeSpent = attempt.startedAt 
      ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.obtainedMarks = obtainedMarks;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.questionsAnswered = answers.length;
    attempt.timeSpent = timeSpent;

    return attempt.save();
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

    return Question.find(query).select('_id question type marks difficultyLevel tags usageCount');
  }
}

export default new QuizService();
