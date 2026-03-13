import { InterviewQuestion, StudentQuestionProgress, IInterviewQuestion, IStudentQuestionProgress } from '../models/InterviewQuestion';
import mongoose from 'mongoose';

export class InterviewQuestionService {
  // ==================== ADMIN OPERATIONS ====================

  async createQuestion(data: Partial<IInterviewQuestion>): Promise<IInterviewQuestion> {
    const existingCount = await InterviewQuestion.countDocuments({ chapterId: data.chapterId });
    data.order = existingCount + 1;
    
    const question = new InterviewQuestion(data);
    await question.save();
    return question;
  }

  async bulkCreateQuestions(questions: Partial<IInterviewQuestion>[]): Promise<IInterviewQuestion[]> {
    // Get starting order for each chapter
    const chapterIds = [...new Set(questions.map(q => q.chapterId?.toString()))];
    const orderMap: Record<string, number> = {};
    
    for (const chapterId of chapterIds) {
      if (chapterId) {
        const count = await InterviewQuestion.countDocuments({ chapterId });
        orderMap[chapterId] = count;
      }
    }

    // Assign orders
    const questionsWithOrder = questions.map(q => {
      const chapterId = q.chapterId?.toString() || '';
      orderMap[chapterId] = (orderMap[chapterId] || 0) + 1;
      return { ...q, order: orderMap[chapterId] };
    });

    return InterviewQuestion.insertMany(questionsWithOrder) as unknown as IInterviewQuestion[];
  }

  async updateQuestion(questionId: string, data: Partial<IInterviewQuestion>): Promise<IInterviewQuestion | null> {
    return InterviewQuestion.findByIdAndUpdate(questionId, data, { new: true });
  }

  async deleteQuestion(questionId: string): Promise<IInterviewQuestion | null> {
    const question = await InterviewQuestion.findByIdAndDelete(questionId);
    
    if (question) {
      // Reorder remaining questions
      await InterviewQuestion.updateMany(
        { chapterId: question.chapterId, order: { $gt: question.order } },
        { $inc: { order: -1 } }
      );
      
      // Delete related progress records
      await StudentQuestionProgress.deleteMany({ questionId });
    }
    
    return question;
  }

  async reorderQuestions(chapterId: string, orders: { questionId: string; order: number }[]): Promise<void> {
    const bulkOps = orders.map(({ questionId, order }) => ({
      updateOne: {
        filter: { _id: questionId, chapterId },
        update: { $set: { order } }
      }
    }));
    
    await InterviewQuestion.bulkWrite(bulkOps);
  }

  // ==================== QUERY OPERATIONS ====================

  async getQuestionsByChapter(chapterId: string, tenantId: string): Promise<IInterviewQuestion[]> {
    return InterviewQuestion.find({ chapterId, tenantId, isActive: true })
      .sort({ order: 1 })
      .populate('createdBy', 'firstName lastName');
  }

  async getQuestionsBySubject(subjectId: string, tenantId: string): Promise<IInterviewQuestion[]> {
    return InterviewQuestion.find({ subjectId, tenantId, isActive: true })
      .sort({ chapterId: 1, order: 1 })
      .populate('chapterId', 'title order')
      .populate('createdBy', 'firstName lastName');
  }

  async getQuestionsByCourse(courseId: string, tenantId: string): Promise<IInterviewQuestion[]> {
    return InterviewQuestion.find({ courseId, tenantId, isActive: true })
      .sort({ subjectId: 1, chapterId: 1, order: 1 })
      .populate('subjectId', 'name order')
      .populate('chapterId', 'title order')
      .populate('createdBy', 'firstName lastName');
  }

  async getQuestionById(questionId: string): Promise<IInterviewQuestion | null> {
    return InterviewQuestion.findById(questionId)
      .populate('chapterId', 'title')
      .populate('subjectId', 'name')
      .populate('courseId', 'title')
      .populate('createdBy', 'firstName lastName');
  }

  async getQuestionsByTenant(tenantId: string, filters?: {
    difficulty?: string;
    category?: string;
    companyTag?: string;
    search?: string;
  }): Promise<IInterviewQuestion[]> {
    const query: any = { tenantId, isActive: true };
    
    if (filters?.difficulty) query.difficulty = filters.difficulty;
    if (filters?.category) query.category = filters.category;
    if (filters?.companyTag) query.companyTags = filters.companyTag;
    if (filters?.search) {
      query.$or = [
        { question: { $regex: filters.search, $options: 'i' } },
        { answer: { $regex: filters.search, $options: 'i' } },
        { tags: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    return InterviewQuestion.find(query)
      .sort({ courseId: 1, subjectId: 1, chapterId: 1, order: 1 })
      .populate('courseId', 'title')
      .populate('subjectId', 'name')
      .populate('chapterId', 'title');
  }

  async incrementViewCount(questionId: string): Promise<void> {
    await InterviewQuestion.findByIdAndUpdate(questionId, { $inc: { viewCount: 1 } });
  }

  async incrementHelpfulCount(questionId: string): Promise<void> {
    await InterviewQuestion.findByIdAndUpdate(questionId, { $inc: { helpfulCount: 1 } });
  }

  // ==================== STUDENT PROGRESS ====================

  async getStudentProgress(studentId: string, chapterId: string): Promise<IStudentQuestionProgress[]> {
    return StudentQuestionProgress.find({ studentId, chapterId })
      .populate('questionId');
  }

  async getStudentProgressForCourse(studentId: string, courseId: string, tenantId: string): Promise<{
    total: number;
    reviewed: number;
    understood: number;
    confident: number;
    byChapter: Record<string, { total: number; confident: number }>;
  }> {
    // Get all questions for the course
    const questions = await InterviewQuestion.find({ courseId, tenantId, isActive: true });
    const questionIds = questions.map(q => q._id);
    
    // Get student's progress
    const progress = await StudentQuestionProgress.find({
      studentId,
      questionId: { $in: questionIds }
    });
    
    const progressMap = new Map(progress.map(p => [p.questionId.toString(), p]));
    
    // Calculate stats
    const stats = {
      total: questions.length,
      reviewed: 0,
      understood: 0,
      confident: 0,
      byChapter: {} as Record<string, { total: number; confident: number }>
    };
    
    for (const q of questions) {
      const chapterId = q.chapterId.toString();
      if (!stats.byChapter[chapterId]) {
        stats.byChapter[chapterId] = { total: 0, confident: 0 };
      }
      stats.byChapter[chapterId].total++;
      
      const p = progressMap.get(q._id.toString());
      if (p) {
        if (p.status === 'reviewing' || p.status === 'understood' || p.status === 'confident') {
          stats.reviewed++;
        }
        if (p.status === 'understood' || p.status === 'confident') {
          stats.understood++;
        }
        if (p.status === 'confident') {
          stats.confident++;
          stats.byChapter[chapterId].confident++;
        }
      }
    }
    
    return stats;
  }

  async updateStudentProgress(
    studentId: string,
    questionId: string,
    chapterId: string,
    tenantId: string,
    status: 'not_reviewed' | 'reviewing' | 'understood' | 'confident',
    notes?: string
  ): Promise<IStudentQuestionProgress> {
    const updateData: any = {
      status,
      $inc: { reviewCount: 1 }
    };
    
    if (notes !== undefined) updateData.notes = notes;
    if (status !== 'not_reviewed') updateData.reviewedAt = new Date();
    if (status === 'confident') updateData.markedConfidentAt = new Date();
    
    const progress = await StudentQuestionProgress.findOneAndUpdate(
      { studentId, questionId },
      {
        $set: { status, notes, reviewedAt: new Date(), ...(status === 'confident' ? { markedConfidentAt: new Date() } : {}) },
        $inc: { reviewCount: 1 },
        $setOnInsert: { chapterId, tenantId }
      },
      { upsert: true, new: true }
    );
    
    return progress;
  }

  async getChapterConfidenceStats(chapterId: string, tenantId: string): Promise<{
    totalQuestions: number;
    avgConfidence: number;
    byDifficulty: Record<string, number>;
  }> {
    const questions = await InterviewQuestion.find({ chapterId, tenantId, isActive: true });
    
    const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    questions.forEach(q => {
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    });
    
    return {
      totalQuestions: questions.length,
      avgConfidence: 0, // Would need student context to calculate
      byDifficulty
    };
  }
}
