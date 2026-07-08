import Question, { IQuestion } from '../models/Question';
import Quiz from '../models/Quiz';
import { normalizeQuestion } from './aiService';

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
              };
            }
            
            // Fallback
            return { text: String(opt), isCorrect: false, _id: String(opt) };
          });
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

    const qObj = question.toObject() as any;
    
    // Map backend fields to frontend field names
    qObj.questionText = qObj.question || qObj.questionText;
    qObj.difficulty = qObj.difficultyLevel || qObj.difficulty;
    
    if (!includeAnswers && (question.type === 'mcq_single' || question.type === 'mcq_multiple')) {
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
          };
        }
        
        // Fallback
        return { text: String(opt), isCorrect: false, _id: String(opt) };
      });
      delete qObj.correctAnswers;
      delete qObj.correctAnswerText;
    }

    if (!includeAnswers) {
      delete qObj.correctAnswers;
      delete qObj.correctAnswerText;
    }

    return qObj as IQuestion;
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

  // ========== QUESTION BANK OPERATIONS ==========

  // Create a question in the Question Bank (without quizId)
  async createQuestionBankQuestion(
    questionData: Partial<IQuestion>,
    tenantId: string,
    createdBy: string
  ): Promise<IQuestion> {
    const question = new Question({
      ...questionData,
      tenantId,
      createdBy,
      source: questionData.source || 'manual',
      usageCount: 0,
      usedInQuizzes: [],
      quizId: undefined, // No quiz association for Question Bank
      questionNo: undefined
    });

    return await question.save();
  }

  // Get all questions in the Question Bank for a tenant
  async getQuestionBank(
    tenantId: string,
    filters?: {
      tags?: string[];
      difficulty?: string;
      questionType?: string;
      source?: string;
      search?: string;
    }
  ): Promise<IQuestion[]> {
    const query: any = {
      tenantId,
      quizId: { $exists: false } // Only bank questions, not embedded quiz questions
    };

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.difficulty) {
      query.difficultyLevel = filters.difficulty;
    }

    if (filters?.questionType) {
      query.type = filters.questionType;
    }

    if (filters?.source) {
      query.source = filters.source;
    }

    if (filters?.search) {
      query.$text = { $search: filters.search };
    }

    return await Question.find(query).sort({ createdAt: -1 });
  }

  // Search questions in Question Bank
  async searchQuestions(tenantId: string, searchTerm: string): Promise<IQuestion[]> {
    return await Question.find(
      {
        tenantId,
        quizId: { $exists: false },
        $text: { $search: searchTerm }
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(50);
  }

  // Check for duplicate questions using semantic similarity
  async checkDuplicateQuestion(
    questionText: string,
    tenantId: string
  ): Promise<IQuestion | null> {
    // Simple approach: find questions with very similar text
    const normalizedText = questionText.toLowerCase().trim();

    const potentialDuplicate = await Question.findOne({
      tenantId,
      quizId: { $exists: false },
      question: { $regex: normalizedText, $options: 'i' }
    });

    return potentialDuplicate || null;
  }

  // Get questions by tags
  async getQuestionsByTags(tenantId: string, tags: string[]): Promise<IQuestion[]> {
    return await Question.find({
      tenantId,
      quizId: { $exists: false },
      tags: { $in: tags }
    });
  }

  // Get all unique tags for a tenant
  async getAllTags(tenantId: string): Promise<string[]> {
    const result = await Question.distinct('tags', {
      tenantId,
      quizId: { $exists: false }
    });
    return result.filter(tag => tag); // Remove empty/null values
  }

  // Update question usage when used in a quiz
  async updateQuestionUsage(
    questionId: string,
    quizId: string,
    isAdding: boolean = true
  ): Promise<void> {
    if (isAdding) {
      await Question.findByIdAndUpdate(
        questionId,
        {
          $inc: { usageCount: 1 },
          $addToSet: { usedInQuizzes: quizId }
        }
      );
    } else {
      await Question.findByIdAndUpdate(
        questionId,
        {
          $inc: { usageCount: -1 },
          $pull: { usedInQuizzes: quizId }
        }
      );
    }
  }

  // Mark question as duplicate
  async markAsDuplicate(questionId: string, duplicateOfId: string): Promise<IQuestion | null> {
    return await Question.findByIdAndUpdate(
      questionId,
      { duplicateOf: duplicateOfId },
      { new: true }
    );
  }

  // Delete from Question Bank (not from quiz)
  async deleteQuestionBankQuestion(questionId: string): Promise<boolean> {
    const result = await Question.findByIdAndDelete(questionId);
    return result !== null;
  }

  // Get statistics for Question Bank
  async getQuestionBankStats(tenantId: string): Promise<{
    totalQuestions: number;
    byDifficulty: { easy: number; medium: number; hard: number };
    byType: Record<string, number>;
    bySource: { manual: number; csv: number; ai: number };
    totalTags: number;
  }> {
    const [
      totalQuestions,
      byDifficulty,
      byType,
      bySource,
      allTags
    ] = await Promise.all([
      Question.countDocuments({ tenantId, quizId: { $exists: false } }),
      Question.aggregate([
        { $match: { tenantId, quizId: { $exists: false } } },
        { $group: { _id: '$difficultyLevel', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: { tenantId, quizId: { $exists: false } } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Question.aggregate([
        { $match: { tenantId, quizId: { $exists: false } } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]),
      this.getAllTags(tenantId)
    ]);

    const difficultyMap: any = { easy: 0, medium: 0, hard: 0 };
    byDifficulty.forEach((item: any) => {
      if (item._id) difficultyMap[item._id] = item.count;
    });

    const typeMap: any = {};
    byType.forEach((item: any) => {
      if (item._id) typeMap[item._id] = item.count;
    });

    const sourceMap: any = { manual: 0, csv: 0, ai: 0 };
    bySource.forEach((item: any) => {
      if (item._id) sourceMap[item._id] = item.count;
    });

    return {
      totalQuestions,
      byDifficulty: difficultyMap,
      byType: typeMap,
      bySource: sourceMap,
      totalTags: allTags.length
    };
  }

  /**
   * Find (and optionally remove) duplicate question-bank questions for a tenant.
   * Groups bank questions (not tied to a specific quiz) by normalized text, keeps the
   * earliest of each group as canonical, and — on execute — repoints any quiz that
   * referenced a duplicate to the canonical question before deleting the extras, so
   * no quiz is left with a broken reference. dryRun just reports the counts.
   */
  async dedupeBankQuestions(tenantId: string, dryRun = true): Promise<{ groups: number; duplicates: number; removed: number; samples: string[] }> {
    const all = await Question.find({ tenantId, quizId: { $exists: false } })
      .select('question createdAt')
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    const groups = new Map<string, any[]>();
    for (const q of all) {
      const key = normalizeQuestion((q as any).question || '');
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    }

    const dupToCanonical = new Map<string, string>();
    const samples: string[] = [];
    let groupCount = 0;
    for (const arr of groups.values()) {
      if (arr.length < 2) continue;
      groupCount++;
      if (samples.length < 20) samples.push(String(arr[0].question).slice(0, 100));
      const canonical = String(arr[0]._id);
      for (let i = 1; i < arr.length; i++) dupToCanonical.set(String(arr[i]._id), canonical);
    }
    const dupIds = [...dupToCanonical.keys()];

    if (dryRun || dupIds.length === 0) {
      return { groups: groupCount, duplicates: dupIds.length, removed: 0, samples };
    }

    // Repoint quizzes off the duplicates, then delete the duplicates.
    const quizzes = await Quiz.find({ tenantId, questionIds: { $in: dupIds } }).select('questionIds totalQuestions questionCount');
    for (const quiz of quizzes) {
      const mapped = ((quiz as any).questionIds || []).map((id: string) => dupToCanonical.get(String(id)) || String(id));
      const uniq = [...new Set(mapped)];
      (quiz as any).questionIds = uniq;
      if ((quiz as any).totalQuestions !== undefined) (quiz as any).totalQuestions = uniq.length;
      if ((quiz as any).questionCount !== undefined) (quiz as any).questionCount = uniq.length;
      await quiz.save();
    }
    await Question.deleteMany({ tenantId, _id: { $in: dupIds } });

    return { groups: groupCount, duplicates: dupIds.length, removed: dupIds.length, samples };
  }
}

export default new QuestionService();
