import Question, { IQuestion } from '../models/Question';
import Quiz from '../models/Quiz';

export class QuestionService {
  // Create question
  async createQuestion(
    quizId: string,
    questionData: Partial<IQuestion>,
    tenantId: string
  ): Promise<IQuestion> {
    // Get next question number
    const lastQuestion = await Question.findOne({ quizId }).sort({ questionNo: -1 });
    const questionNo = (lastQuestion?.questionNo || 0) + 1;

    const question = new Question({
      ...questionData,
      quizId,
      tenantId,
      questionNo
    });

    const saved = await question.save();

    // Update quiz total questions and marks
    const totalQuestions = await Question.countDocuments({ quizId });
    const totalMarks = await Question.aggregate([
      { $match: { quizId } },
      { $group: { _id: null, total: { $sum: '$marks' } } }
    ]);

    await Quiz.findByIdAndUpdate(quizId, {
      totalQuestions,
      totalMarks: totalMarks[0]?.total || 0,
      questionCount: totalQuestions
    });

    return saved;
  }

  // Get all questions for a quiz
  async getQuestionsForQuiz(quizId: string, includeAnswers: boolean = false): Promise<IQuestion[]> {
    const questions = await Question.find({ quizId }).sort({ questionNo: 1 });

    if (!includeAnswers) {
      return questions.map(q => {
        const qObj = q.toObject();
        if (q.type === 'mcq_single' || q.type === 'mcq_multiple') {
          qObj.options = qObj.options?.map(opt => ({
            _id: opt._id,
            text: opt.text,
            isCorrect: false
          }));
        }
        delete qObj.correctAnswers;
        delete qObj.correctAnswerText;
        return qObj as IQuestion;
      });
    }

    return questions;
  }

  // Get single question
  async getQuestionById(questionId: string, includeAnswers: boolean = false): Promise<IQuestion | null> {
    const question = await Question.findById(questionId);
    if (!question) return null;

    if (!includeAnswers && (question.type === 'mcq_single' || question.type === 'mcq_multiple')) {
      const qObj = question.toObject();
      qObj.options = qObj.options?.map(opt => ({
        _id: opt._id,
        text: opt.text,
        isCorrect: false
      }));
      delete qObj.correctAnswers;
      delete qObj.correctAnswerText;
      return qObj as IQuestion;
    }

    if (!includeAnswers) {
      delete (question as any).correctAnswers;
      delete (question as any).correctAnswerText;
    }

    return question;
  }

  // Update question
  async updateQuestion(questionId: string, updateData: Partial<IQuestion>): Promise<IQuestion | null> {
    const question = await Question.findByIdAndUpdate(questionId, updateData, { new: true });
    
    if (question) {
      // Recalculate quiz totals
      const totalMarks = await Question.aggregate([
        { $match: { quizId: question.quizId } },
        { $group: { _id: null, total: { $sum: '$marks' } } }
      ]);

      await Quiz.findByIdAndUpdate(question.quizId, {
        totalMarks: totalMarks[0]?.total || 0
      });
    }

    return question;
  }

  // Delete question
  async deleteQuestion(questionId: string): Promise<boolean> {
    const question = await Question.findByIdAndDelete(questionId);
    
    if (question) {
      // Recalculate quiz totals
      const totalQuestions = await Question.countDocuments({ quizId: question.quizId });
      const totalMarks = await Question.aggregate([
        { $match: { quizId: question.quizId } },
        { $group: { _id: null, total: { $sum: '$marks' } } }
      ]);

      await Quiz.findByIdAndUpdate(question.quizId, {
        totalQuestions,
        totalMarks: totalMarks[0]?.total || 0,
        questionCount: totalQuestions
      });

      return true;
    }

    return false;
  }

  // Bulk upload questions
  async bulkCreateQuestions(quizId: string, questions: any[], tenantId: string): Promise<IQuestion[]> {
    const saved: IQuestion[] = [];

    for (const q of questions) {
      const question = await this.createQuestion(quizId, q, tenantId);
      saved.push(question);
    }

    return saved;
  }

  // Validate answer
  async validateAnswer(
    questionId: string,
    studentAnswer: string | string[]
  ): Promise<{ isCorrect: boolean; marks: number }> {
    const question = await Question.findById(questionId);
    if (!question) return { isCorrect: false, marks: 0 };

    let isCorrect = false;

    if (question.type === 'mcq_single' || question.type === 'mcq_multiple') {
      const studentAnswersArray = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
      const correctAnswersArray = question.correctAnswers || [];

      isCorrect = studentAnswersArray.length === correctAnswersArray.length &&
        studentAnswersArray.every(ans => correctAnswersArray.includes(ans));
    } else if (question.type === 'short_answer') {
      // Simple text comparison (can be enhanced with fuzzy matching)
      const studentText = (studentAnswer as string).toLowerCase().trim();
      const correctText = question.correctAnswerText?.toLowerCase().trim();
      isCorrect = studentText === correctText;
    }

    return {
      isCorrect,
      marks: isCorrect ? question.marks : 0
    };
  }
}

export default new QuestionService();
