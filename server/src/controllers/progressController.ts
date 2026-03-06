import { Request, Response } from 'express';
import progressService from '../services/progressService';

/**
 * Get student's course progress
 */
export const getProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenantId;
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    const progress = await progressService.getOrCreateProgress({
      userId,
      courseId,
      tenantId
    });

    res.json({
      courseProgress: progress.courseProgress,
      subjectProgress: progress.subjectProgress,
      chapterProgress: progress.chapterProgress,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      totalTimeSpent: progress.totalTimeSpent
    });
  } catch (error: any) {
    console.error('Error getting progress:', error);
    res.status(500).json({ message: error.message || 'Failed to get progress' });
  }
};

/**
 * Get completed chapter IDs for a course
 */
export const getCompletedChapters = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenantId;
    const { courseId } = req.params;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    const completedChapterIds = await progressService.getCompletedChapters({
      userId,
      courseId,
      tenantId
    });

    res.json({ completedChapterIds });
  } catch (error: any) {
    console.error('Error getting completed chapters:', error);
    res.status(500).json({ message: error.message || 'Failed to get completed chapters' });
  }
};

/**
 * Mark chapter as completed
 */
export const markChapterComplete = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenantId;
    const { chapterId } = req.params;

    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required' });
    }

    const progress = await progressService.markChapterComplete({
      userId,
      chapterId,
      tenantId
    });

    res.json({
      message: 'Chapter marked as completed',
      courseProgress: progress.courseProgress,
      currentStreak: progress.currentStreak
    });
  } catch (error: any) {
    console.error('Error marking chapter complete:', error);
    res.status(500).json({ message: error.message || 'Failed to mark chapter complete' });
  }
};

/**
 * Check if a chapter is completed
 */
export const isChapterCompleted = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tenantId = (req as any).tenantId;
    const { chapterId } = req.params;

    if (!chapterId) {
      return res.status(400).json({ message: 'Chapter ID is required' });
    }

    const completed = await progressService.isChapterCompleted(userId, chapterId, tenantId);

    res.json({ completed });
  } catch (error: any) {
    console.error('Error checking chapter completion:', error);
    res.status(500).json({ message: error.message || 'Failed to check chapter completion' });
  }
};
