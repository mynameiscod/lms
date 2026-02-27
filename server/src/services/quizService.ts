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
      return quiz.selectedBatches?.includes(student.batchId || '') || false;
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
          text: opt.text
          // Don't include isCorrect
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
        isCorrect = JSON.stringify(answer.selectedOptions.sort()) === 
                   JSON.stringify(question.correctAnswers?.sort());
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
        studentAnswer: answer.answer,
        selectedOptions: answer.selectedOptions,
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
}

export default new QuizService();
