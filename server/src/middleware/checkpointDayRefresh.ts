import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import { refreshLessonsInBackground } from '../services/roadmapLessonRefreshService';

/**
 * A day's checkpoint changed — a question added or removed, the quiz switched off, archived or
 * deleted — so the days already planned with its unit must change too.
 *
 * Students' days are written when the roadmap is built. Without this, a checkpoint deleted here
 * stayed on every open day, and one given its questions never reached anybody. The unit is read
 * BEFORE the handler runs, because a delete leaves nothing to read afterwards; the refresh runs
 * only once the change has succeeded. Quizzes not bound to a day are untouched.
 */
export async function refreshCheckpointDays(req: Request, res: Response, next: NextFunction) {
  try {
    const quizId = String(req.params.quizId || '');
    if (mongoose.Types.ObjectId.isValid(quizId)) {
      const quiz: any = await Quiz.findById(quizId).select('unitCode tenantId').lean();
      if (quiz?.unitCode) {
        res.on('finish', () => {
          if (res.statusCode < 400) refreshLessonsInBackground(String(quiz.tenantId), [String(quiz.unitCode)]);
        });
      }
    }
  } catch {
    // Never block the change itself; the next save, or rv2Lessons, catches the days up.
  }
  next();
}
