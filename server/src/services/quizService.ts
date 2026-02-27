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

    const startDateTime = new Date(quiz.startDate);
    startDateTime.setHours(startHour, startMin, 0);

    const endDateTime = new Date(quiz.endDate);
    endDateTime.setHours(endHour, endMin, 59);

    if (now < startDateTime) {
      return { available: false, reason: 'Quiz has not started yet' };
    }

    if (now > endDateTime) {
      return { available: false, reason: 'Quiz has ended' };
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

    // Check if student can attempt
    const canAccess = await this.canStudentAccessQuiz(quizId, studentId);
    if (!canAccess) throw new Error('You do not have access to this quiz');

    const { available } = await this.isQuizAvailable(quizId);
    if (!available) throw new Error('Quiz is not available at this time');

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
      const existingAttempt = await QuizAttempt.findOne({ quizId, studentId });
      if (existingAttempt) {
        throw new Error('You have already attempted this quiz');
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
      const qObj = q.toObject();
      if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
        qObj.options = qObj.options.map((opt: any) => ({
          _id: opt._id,
          text: opt.text,
          isCorrect: false
          // Don't include actual correct answer
        }));
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
        const correctAnswers = question.correctAnswers || [];
        isCorrect = JSON.stringify(selectedOptions.sort()) === 
                   JSON.stringify(correctAnswers.sort());
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

      // Save submission
      const submission = new QuizSubmission({
        quizAttemptId: attemptId,
        quizId: attempt.quizId,
        questionId: answer.questionId,
        studentId: attempt.studentId,
        tenantId: attempt.tenantId,
        questionNo: question.questionNo,
        questionType: question.type,
        studentAnswer: answer.answer || '',
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

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.obtainedMarks = obtainedMarks;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.questionsAnswered = answers.length;

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

    // Remove answers if not needed
    if (!includeAnswers) {
      return questions.map(q => {
        const qObj = q.toObject();
        if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
          qObj.options = qObj.options?.map((opt: any) => {
            // Handle both string options (from Question Bank) and embedded objects (from quizzes)
            if (typeof opt === 'string') return opt;
            return { ...opt, isCorrect: false };
          });
        }
        delete qObj.correctAnswers;
        delete qObj.correctAnswerText;
        return qObj;
      });
    }

    return questions;
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
