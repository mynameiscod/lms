import mongoose from 'mongoose';
import StudentProgress, { IStudentProgress } from '../models/StudentProgress';
import Enrollment from '../models/Enrollment';
import Subject from '../models/Subject';
import Chapter from '../models/Chapter';

interface MarkChapterCompleteParams {
  userId: string;
  chapterId: string;
  tenantId: string;
}

interface GetProgressParams {
  userId: string;
  courseId: string;
  tenantId: string;
}

class ProgressService {
  /**
   * Get or create student progress for a course
   */
  async getOrCreateProgress(params: GetProgressParams): Promise<IStudentProgress> {
    const { userId, courseId, tenantId } = params;

    let progress = await StudentProgress.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      courseId: new mongoose.Types.ObjectId(courseId),
      tenantId: new mongoose.Types.ObjectId(tenantId)
    });

    if (!progress) {
      // Get enrollment to find batch
      const enrollment = await Enrollment.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        courseId: new mongoose.Types.ObjectId(courseId),
        tenantId: new mongoose.Types.ObjectId(tenantId)
      });

      if (!enrollment) {
        throw new Error('Student is not enrolled in this course');
      }

      // Get subjects and chapters for the course
      const subjects = await Subject.find({
        courseId: new mongoose.Types.ObjectId(courseId),
        tenantId: new mongoose.Types.ObjectId(tenantId)
      });

      // Initialize subject progress
      const subjectProgress = await Promise.all(
        subjects.map(async (subject) => {
          const chapters = await Chapter.find({
            subjectId: subject._id,
            tenantId: new mongoose.Types.ObjectId(tenantId)
          });

          return {
            subjectId: subject._id,
            completedChapters: 0,
            totalChapters: chapters.length,
            completionPercentage: 0,
            isCompleted: false
          };
        })
      );

      // Initialize chapter progress
      const chapterProgress: any[] = [];
      for (const subject of subjects) {
        const chapters = await Chapter.find({
          subjectId: subject._id,
          tenantId: new mongoose.Types.ObjectId(tenantId)
        });

        for (const chapter of chapters) {
          chapterProgress.push({
            chapterId: chapter._id,
            subjectId: subject._id,
            videosWatched: [],
            notesRead: [],
            quizAttempted: false,
            quizPassed: false,
            assignmentsSubmitted: [],
            completionPercentage: 0,
            isUnlocked: true, // First chapter unlocked by default
            isCompleted: false
          });
        }
      }

      // Create new progress record
      progress = await StudentProgress.create({
        userId: new mongoose.Types.ObjectId(userId),
        courseId: new mongoose.Types.ObjectId(courseId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        courseProgress: {
          completedSubjects: 0,
          totalSubjects: subjects.length,
          completionPercentage: 0,
          startedAt: new Date()
        },
        subjectProgress,
        chapterProgress,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
        totalTimeSpent: 0
      });
    }

    return progress;
  }

  /**
   * Mark a chapter as completed
   */
  async markChapterComplete(params: MarkChapterCompleteParams): Promise<IStudentProgress> {
    const { userId, chapterId, tenantId } = params;

    // Find the chapter to get courseId and subjectId
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    const subject = await Subject.findById(chapter.subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }

    // Get or create progress
    const progress = await this.getOrCreateProgress({
      userId,
      courseId: subject.courseId.toString(),
      tenantId
    });

    // Find or create chapter progress entry
    let chapterProgressIndex = progress.chapterProgress.findIndex(
      (cp) => cp.chapterId.toString() === chapterId
    );

    if (chapterProgressIndex === -1) {
      // Add new chapter progress
      progress.chapterProgress.push({
        chapterId: new mongoose.Types.ObjectId(chapterId),
        subjectId: chapter.subjectId,
        videosWatched: [],
        notesRead: [],
        quizAttempted: false,
        quizPassed: false,
        assignmentsSubmitted: [],
        completionPercentage: 100,
        isUnlocked: true,
        isCompleted: true,
        startedAt: new Date(),
        completedAt: new Date()
      });
      chapterProgressIndex = progress.chapterProgress.length - 1;
    } else {
      // Update existing
      progress.chapterProgress[chapterProgressIndex].isCompleted = true;
      progress.chapterProgress[chapterProgressIndex].completionPercentage = 100;
      progress.chapterProgress[chapterProgressIndex].completedAt = new Date();
      if (!progress.chapterProgress[chapterProgressIndex].startedAt) {
        progress.chapterProgress[chapterProgressIndex].startedAt = new Date();
      }
    }

    // Update subject progress
    const subjectProgressIndex = progress.subjectProgress.findIndex(
      (sp) => sp.subjectId.toString() === chapter.subjectId.toString()
    );

    if (subjectProgressIndex !== -1) {
      const chaptersInSubject = progress.chapterProgress.filter(
        (cp) => cp.subjectId.toString() === chapter.subjectId.toString()
      );
      const completedInSubject = chaptersInSubject.filter((cp) => cp.isCompleted).length;

      progress.subjectProgress[subjectProgressIndex].completedChapters = completedInSubject;
      progress.subjectProgress[subjectProgressIndex].completionPercentage =
        (completedInSubject / progress.subjectProgress[subjectProgressIndex].totalChapters) * 100;
      progress.subjectProgress[subjectProgressIndex].isCompleted =
        completedInSubject === progress.subjectProgress[subjectProgressIndex].totalChapters;

      if (progress.subjectProgress[subjectProgressIndex].isCompleted) {
        progress.subjectProgress[subjectProgressIndex].completedAt = new Date();
      }
    }

    // Update course progress
    const completedChapters = progress.chapterProgress.filter((cp) => cp.isCompleted).length;
    const totalChapters = progress.chapterProgress.length;
    const completedSubjects = progress.subjectProgress.filter((sp) => sp.isCompleted).length;

    progress.courseProgress.completedSubjects = completedSubjects;
    progress.courseProgress.completionPercentage = (completedChapters / totalChapters) * 100;

    if (completedChapters === totalChapters) {
      progress.courseProgress.completedAt = new Date();
    }

    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActivity = new Date(progress.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      progress.currentStreak += 1;
      if (progress.currentStreak > progress.longestStreak) {
        progress.longestStreak = progress.currentStreak;
      }
    } else if (diffDays > 1) {
      progress.currentStreak = 1;
    }
    // If same day, keep streak

    progress.lastActivityDate = new Date();

    await progress.save();

    return progress;
  }

  /**
   * Get student's progress for a course
   */
  async getProgress(params: GetProgressParams): Promise<IStudentProgress | null> {
    const { userId, courseId, tenantId } = params;

    return StudentProgress.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      courseId: new mongoose.Types.ObjectId(courseId),
      tenantId: new mongoose.Types.ObjectId(tenantId)
    });
  }

  /**
   * Get completed chapter IDs for a user's course
   */
  async getCompletedChapters(params: GetProgressParams): Promise<string[]> {
    const progress = await this.getProgress(params);
    
    if (!progress) {
      return [];
    }

    return progress.chapterProgress
      .filter((cp) => cp.isCompleted)
      .map((cp) => cp.chapterId.toString());
  }

  /**
   * Check if a specific chapter is completed
   */
  async isChapterCompleted(
    userId: string,
    chapterId: string,
    tenantId: string
  ): Promise<boolean> {
    const chapter = await Chapter.findById(chapterId);
    if (!chapter) {
      return false;
    }

    const subject = await Subject.findById(chapter.subjectId);
    if (!subject) {
      return false;
    }

    const progress = await this.getProgress({
      userId,
      courseId: subject.courseId.toString(),
      tenantId
    });

    if (!progress) {
      return false;
    }

    const chapterProgress = progress.chapterProgress.find(
      (cp) => cp.chapterId.toString() === chapterId
    );

    return chapterProgress?.isCompleted || false;
  }
}

export default new ProgressService();
