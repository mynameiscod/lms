import mongoose from 'mongoose';
import DayPlan from '../models/DayPlan';
import InteractiveLesson, { ProgrammingLanguage } from '../models/InteractiveLesson';
import LearningContentLibrary from '../models/LearningContentLibrary';
import { ILearningCurriculum } from '../models/LearningCurriculum';
import { generateLesson } from './lessonAIService';

/**
 * Phase 2 (Slice 1) — lazy AI content generation for a personalized-track day.
 *
 * When a student opens a day of an assessment-personalized curriculum that has no
 * content yet, generate ONE interactive lesson for that day's topic (reusing the
 * interactive-lesson AI generator), persist it (InteractiveLesson + linked
 * LearningContentLibrary entry), and attach it to the day's `items` so the
 * existing DayView renders it. Idempotent + concurrency-safe via an atomic claim
 * on `aiGenStatus`. Best-effort: never throws to the caller.
 */

function languageForCurriculum(c: ILearningCurriculum): ProgrammingLanguage {
  const hay = `${c.role || ''} ${c.targetCourse || ''} ${c.title || ''}`.toLowerCase();
  if (/\bjava\b|spring|fullstack/.test(hay) && !/javascript/.test(hay)) return 'java';
  if (/python|data|django|flask/.test(hay)) return 'python';
  if (/mern|react|node|javascript|\bjs\b|typescript/.test(hay)) return 'javascript';
  return 'javascript';
}

function difficultyForCurriculum(c: ILearningCurriculum): 'beginner' | 'intermediate' | 'advanced' {
  return c.audienceLevel === 'professional' ? 'intermediate' : 'beginner';
}

export async function ensureDayContentGenerated(
  curriculum: ILearningCurriculum,
  dayNumber: number,
  dayPlanId: mongoose.Types.ObjectId
): Promise<{ generated: boolean; status: string }> {
  // Atomically claim the day for generation — only if it has no items yet and
  // isn't already generating/done. Prevents duplicate work on concurrent opens.
  const staleBefore = new Date(Date.now() - 3 * 60 * 1000); // a 'generating' older than this crashed → retry
  const claimed = await DayPlan.findOneAndUpdate(
    {
      _id: dayPlanId,
      items: { $size: 0 },
      $or: [
        { aiGenStatus: { $exists: false } },
        { aiGenStatus: { $in: ['idle', 'error'] } },
        { aiGenStatus: 'generating', aiGenAt: { $lte: staleBefore } },
      ],
    },
    { $set: { aiGenStatus: 'generating', aiGenAt: new Date() } },
    { new: true }
  ).lean();
  if (!claimed) {
    const cur: any = await DayPlan.findById(dayPlanId).select('aiGenStatus items').lean();
    return { generated: false, status: cur?.aiGenStatus || (cur?.items?.length ? 'done' : 'idle') };
  }

  try {
    const tenantId = String(curriculum.tenantId);
    const topic = (curriculum.topics || []).find((t) => dayNumber >= t.startDay && dayNumber <= t.endDay);
    const base = topic?.title || `Day ${dayNumber}`;
    // Distinct concept per day within a multi-day topic so content differs day to day.
    const span = topic ? topic.endDay - topic.startDay + 1 : 1;
    const part = topic ? dayNumber - topic.startDay + 1 : dayNumber;
    const concept = span > 1 ? `${base} — part ${part} of ${span}` : base;
    const language = languageForCurriculum(curriculum);
    const difficulty = difficultyForCurriculum(curriculum);

    const gen = await generateLesson({ concept, language, difficulty });
    if (!gen || !Array.isArray(gen.scenes) || gen.scenes.length === 0) {
      await DayPlan.updateOne({ _id: dayPlanId }, { $set: { aiGenStatus: 'error', aiGenError: 'empty generation (AI key/limit?)' } });
      return { generated: false, status: 'error' };
    }

    const totalXp = gen.scenes.reduce((s: number, x: any) => s + (x?.xpReward || 0), 0);
    const estMin = Math.max(5, Math.ceil(gen.scenes.length * 2));
    const title = gen.title || concept;

    const lesson = await InteractiveLesson.create({
      tenantId, title, description: gen.description || '',
      language, concept, difficulty, scenes: gen.scenes, totalXp, passingScore: 60,
      tags: gen.tags || [], isPublished: true, createdBy: 'ai-day-gen',
    });
    const lib = await LearningContentLibrary.create({
      tenantId, title, description: gen.description || '',
      type: 'interactive_lesson', difficulty, estimatedDuration: estMin,
      topicTags: [concept, ...(gen.tags || [])], isPublished: true, createdBy: 'ai-day-gen',
    });
    // Cross-link (mirrors interactiveLessonController.createLesson).
    await InteractiveLesson.updateOne({ _id: lesson._id }, { contentLibraryId: lib._id });
    await LearningContentLibrary.updateOne({ _id: lib._id }, { conceptLessonId: lesson._id });

    const item = {
      kind: 'content',
      contentId: lib._id,
      contentTitle: title,
      contentType: 'interactive_lesson',
      slot: 'anytime',
      isGating: false,
      required: true,
      order: 0,
      estimatedDuration: estMin,
    };
    await DayPlan.updateOne({ _id: dayPlanId }, { $set: { items: [item], aiGenStatus: 'done' } });
    return { generated: true, status: 'done' };
  } catch (e: any) {
    await DayPlan.updateOne({ _id: dayPlanId }, { $set: { aiGenStatus: 'error', aiGenError: String(e?.message || e).slice(0, 300) } });
    console.error('[dayContentGen] failed:', e?.message || e);
    return { generated: false, status: 'error' };
  }
}
