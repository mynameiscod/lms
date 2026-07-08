import mongoose from 'mongoose';
import DayPlan from '../models/DayPlan';
import InteractiveLesson, { ProgrammingLanguage } from '../models/InteractiveLesson';
import LearningContentLibrary from '../models/LearningContentLibrary';
import { ILearningCurriculum } from '../models/LearningCurriculum';
import { generateLesson } from './lessonAIService';
import { getAnthropic } from './aiClients';
import * as settings from './settingsService';
import { generateItems } from './assessmentQuestionGeneratorService';
import InterviewTemplate from '../models/InterviewTemplate';
import { milestoneForDay } from '../utils/planMilestones';

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
const dsaDifficulty = (c: ILearningCurriculum): number => (c.audienceLevel === 'professional' ? 3 : 2); // 1–5
const diffWord = (n: number): 'easy' | 'medium' | 'hard' => (n <= 2 ? 'easy' : n === 3 ? 'medium' : 'hard');

/** Generate 3 interview Q&A for a topic (best-effort → null). */
async function generateQA(concept: string, role: string, language: string): Promise<any[] | null> {
  const client = getAnthropic();
  if (!client) return null;
  try {
    const resp = await client.messages.create({
      model: settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6'),
      max_tokens: 900,
      system: `You are a senior interview coach. Write concise, real technical interview Q&A for someone studying "${concept}" toward a ${role} role.`,
      messages: [{ role: 'user', content: `Return ONLY raw JSON: {"qa":[{"question":"...","answer":"...","tips":"..."}]} with exactly 3 items. Answers 2–4 sentences, accurate.${/sql|java|javascript|python|typescript/i.test(language) ? ` Use ${language} in examples where code helps.` : ''}` }],
    });
    const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
    const qa = Array.isArray(json.qa) ? json.qa : [];
    return qa.slice(0, 3)
      .map((q: any, i: number) => ({ question: String(q.question || ''), answer: String(q.answer || ''), tips: q.tips ? String(q.tips) : '', order: i }))
      .filter((q: any) => q.question && q.answer);
  } catch {
    return null;
  }
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

    // ── De-dup: reuse an already-generated content set for this exact concept ──────
    // Personalized plans clone the same master-track, so hundreds of candidates hit
    // identical concepts. Instead of generating (and storing) a fresh copy each time,
    // reuse the first canonical set — stops duplicate library entries + saves AI cost.
    const canonical: any = await InteractiveLesson.findOne({
      tenantId, concept, language, difficulty, createdBy: 'ai-day-gen', contentLibraryId: { $exists: true, $ne: null },
    }).select('contentLibraryId').sort({ createdAt: 1 }).lean();
    if (canonical?.contentLibraryId) {
      const byType = async (t: string) => LearningContentLibrary.findOne({ tenantId, createdBy: 'ai-day-gen', type: t, topicTags: concept }).select('_id title estimatedDuration').sort({ createdAt: 1 }).lean() as any;
      const lessonLib: any = await LearningContentLibrary.findById(canonical.contentLibraryId).select('_id title estimatedDuration').lean();
      const reuseItems: any[] = [];
      if (lessonLib) reuseItems.push({ kind: 'content', contentId: lessonLib._id, contentTitle: lessonLib.title, contentType: 'interactive_lesson', slot: 'anytime', isGating: false, required: true, order: 0, estimatedDuration: lessonLib.estimatedDuration || 10 });
      const qa2 = await byType('tech_qa'); if (qa2) reuseItems.push({ kind: 'content', contentId: qa2._id, contentTitle: qa2.title, contentType: 'tech_qa', slot: 'anytime', isGating: false, required: false, order: 1, estimatedDuration: qa2.estimatedDuration || 10 });
      const dsa2 = await byType('practice_coding'); if (dsa2) reuseItems.push({ kind: 'content', contentId: dsa2._id, contentTitle: dsa2.title, contentType: 'practice_coding', slot: 'anytime', isGating: false, required: false, order: 2, estimatedDuration: dsa2.estimatedDuration || 20 });
      const miR = milestoneForDay(curriculum.totalDays, dayNumber);
      if (miR && miR.kind === 'mock') {
        const tmplR: any = await InterviewTemplate.findOne({ tenantId, status: 'published' }).select('_id title').sort({ updatedAt: -1 }).lean();
        if (tmplR) reuseItems.push({ kind: 'mockInterview', sourceModel: 'InterviewTemplate', sourceId: tmplR._id, contentTitle: miR.title, contentType: 'mockInterview', slot: 'anytime', isGating: false, required: false, order: reuseItems.length, estimatedDuration: 30 });
      }
      if (reuseItems.length) {
        await DayPlan.updateOne({ _id: dayPlanId }, { $set: { items: reuseItems, aiGenStatus: 'done' } });
        return { generated: true, status: 'done' };
      }
    }

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

    const items: any[] = [{
      kind: 'content', contentId: lib._id, contentTitle: title, contentType: 'interactive_lesson',
      slot: 'anytime', isGating: false, required: true, order: 0, estimatedDuration: estMin,
    }];

    const role = String(curriculum.role || curriculum.targetCourse || 'developer').replace(/_/g, ' ');

    // Interview Q&A for the topic (inline tech_qa) — best-effort.
    try {
      const qa = await generateQA(concept, role, language);
      if (qa && qa.length) {
        const qaLib = await LearningContentLibrary.create({
          tenantId, title: `Interview Q&A — ${concept}`, type: 'tech_qa', difficulty,
          estimatedDuration: 10, topicTags: [concept], qaItems: qa, isPublished: true, createdBy: 'ai-day-gen',
        });
        items.push({ kind: 'content', contentId: qaLib._id, contentTitle: `Interview Q&A — ${concept}`, contentType: 'tech_qa', slot: 'anytime', isGating: false, required: false, order: 1, estimatedDuration: 10 });
      }
    } catch (e: any) { console.error('[dayContentGen] Q&A gen failed:', e?.message); }

    // DSA / coding practice (inline practice_coding) — Piston-verified test cases. Best-effort.
    try {
      const dnum = dsaDifficulty(curriculum);
      const dsa = await generateItems(tenantId, { type: 'live_code', dimension: 'dsa', difficulty: dnum, language, count: 1, context: `Topic context: ${concept}` } as any, { persist: false });
      const it: any = dsa && dsa[0];
      if (it) {
        const dsaLib = await LearningContentLibrary.create({
          tenantId, title: `Coding practice — ${concept}`, type: 'practice_coding', difficulty,
          estimatedDuration: 20, topicTags: [concept], isPublished: true, createdBy: 'ai-day-gen',
          practiceQuestions: [{
            type: 'coding', title: `Coding Problem — ${concept}`, description: String(it.prompt || ''),
            difficulty: diffWord(dnum), starterCode: { [it.language || language]: it.starterCode || '' },
            allowedLanguages: [it.language || language],
            testCases: (it.testCases || []).map((tc: any) => ({ input: tc.input || '', expectedOutput: tc.expectedOutput || '', isHidden: tc.hidden !== false })),
            marks: 2, gradingMode: 'auto',
          }],
        });
        items.push({ kind: 'content', contentId: dsaLib._id, contentTitle: `Coding practice — ${concept}`, contentType: 'practice_coding', slot: 'anytime', isGating: false, required: false, order: 2, estimatedDuration: 20 });
      }
    } catch (e: any) { console.error('[dayContentGen] DSA gen failed:', e?.message); }

    // Mock-interview milestone (Slice 4b): on a milestone "mock" day, link to a
    // PUBLISHED interview template if the tenant has one (never a broken link).
    const mi = milestoneForDay(curriculum.totalDays, dayNumber);
    if (mi && mi.kind === 'mock') {
      try {
        const tmpl: any = await InterviewTemplate.findOne({ tenantId, status: 'published' }).select('_id title').sort({ updatedAt: -1 }).lean();
        if (tmpl) {
          items.push({ kind: 'mockInterview', sourceModel: 'InterviewTemplate', sourceId: tmpl._id, contentTitle: mi.title, contentType: 'mockInterview', slot: 'anytime', isGating: false, required: false, order: items.length, estimatedDuration: 30 });
        }
      } catch (e: any) { console.error('[dayContentGen] mock wiring failed:', e?.message); }
    }

    await DayPlan.updateOne({ _id: dayPlanId }, { $set: { items, aiGenStatus: 'done' } });
    return { generated: true, status: 'done' };
  } catch (e: any) {
    await DayPlan.updateOne({ _id: dayPlanId }, { $set: { aiGenStatus: 'error', aiGenError: String(e?.message || e).slice(0, 300) } });
    console.error('[dayContentGen] failed:', e?.message || e);
    return { generated: false, status: 'error' };
  }
}
