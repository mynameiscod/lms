import { Request, Response } from 'express';
import mongoose from 'mongoose';
import InteractiveLesson from '../models/InteractiveLesson';
import LessonProgress from '../models/LessonProgress';
import LearningContentLibrary from '../models/LearningContentLibrary';
import codeRunner from '../services/codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { generateLesson } from '../services/lessonAIService';

// ─── LIST ──────────────────────────────────────────────────────────────────────
export const listLessons = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { language, concept, difficulty, search, published } = req.query;

    const query: any = { tenantId };
    if (language)   query.language   = language;
    if (concept)    query.concept    = { $regex: concept, $options: 'i' };
    if (difficulty) query.difficulty = difficulty;
    if (published === 'true')  query.isPublished = true;
    if (published === 'false') query.isPublished = false;
    if (search) {
      query.$or = [
        { title:    { $regex: search, $options: 'i' } },
        { concept:  { $regex: search, $options: 'i' } },
        { tags:     { $regex: search, $options: 'i' } },
      ];
    }

    const lessons = await InteractiveLesson.find(query)
      .sort({ createdAt: -1 })
      .select('-scenes'); // exclude heavy scenes array from list

    res.json({ lessons, total: lessons.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ONE ───────────────────────────────────────────────────────────────────
export const getLesson = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const lesson = await InteractiveLesson.findOne({ _id: req.params.id, tenantId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    InteractiveLesson.updateOne({ _id: lesson._id }, { $inc: { viewCount: 1 } }).catch(() => {});
    res.json(lesson);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── CREATE ────────────────────────────────────────────────────────────────────
export const createLesson = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId   = (req as any).user?.id;

    const { title, description, language, concept, difficulty, scenes, passingScore, tags, isPublished } = req.body;

    const totalXp = (scenes || []).reduce((sum: number, s: any) => sum + (s.xpReward || 0), 0);

    const lesson = await InteractiveLesson.create({
      tenantId,
      title,
      description,
      language,
      concept,
      difficulty: difficulty || 'beginner',
      scenes: scenes || [],
      totalXp,
      passingScore: passingScore ?? 60,
      tags: tags || [],
      isPublished: isPublished || false,
      createdBy: userId,
    });

    // If this lesson should also be a Content Library item, create/link it
    if (req.body.createLibraryEntry) {
      const libEntry = await LearningContentLibrary.create({
        tenantId,
        title,
        description,
        type: 'interactive_lesson',
        difficulty,
        estimatedDuration: Math.ceil((scenes || []).length * 2), // ~2 min per scene
        topicTags: [concept, ...(tags || [])],
        isPublished: isPublished || false,
        createdBy: userId,
      });
      await InteractiveLesson.updateOne({ _id: lesson._id }, { contentLibraryId: libEntry._id });
      await LearningContentLibrary.updateOne({ _id: libEntry._id }, { conceptLessonId: lesson._id });
    }

    res.status(201).json(lesson);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const lesson = await InteractiveLesson.findOne({ _id: req.params.id, tenantId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const { title, description, language, concept, difficulty, scenes, passingScore, tags, isPublished } = req.body;

    if (title !== undefined)        lesson.title = title;
    if (description !== undefined)  lesson.description = description;
    if (language !== undefined)     lesson.language = language;
    if (concept !== undefined)      lesson.concept = concept;
    if (difficulty !== undefined)   lesson.difficulty = difficulty;
    if (scenes !== undefined) {
      lesson.scenes = scenes;
      lesson.totalXp = scenes.reduce((sum: number, s: any) => sum + (s.xpReward || 0), 0);
    }
    if (passingScore !== undefined) lesson.passingScore = passingScore;
    if (tags !== undefined)         lesson.tags = tags;
    if (isPublished !== undefined)  lesson.isPublished = isPublished;

    await lesson.save();

    // Sync title/description to linked content library entry
    if (lesson.contentLibraryId) {
      await LearningContentLibrary.updateOne(
        { _id: lesson.contentLibraryId },
        { title: lesson.title, description: lesson.description, isPublished: lesson.isPublished }
      );
    }

    res.json(lesson);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE ────────────────────────────────────────────────────────────────────
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const lesson = await InteractiveLesson.findOne({ _id: req.params.id, tenantId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const contentLibraryId = lesson.contentLibraryId;
    await InteractiveLesson.deleteOne({ _id: req.params.id });

    // Clean up content library link
    if (contentLibraryId) {
      await LearningContentLibrary.findByIdAndDelete(contentLibraryId);
    }

    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PROGRESS: Get or create ──────────────────────────────────────────────────
export const getProgress = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const studentId = (req as any).user?.id;
    const { lessonId } = req.params;

    let progress = await LessonProgress.findOne({ tenantId, lessonId, studentId });
    if (!progress) {
      progress = await LessonProgress.create({
        tenantId,
        lessonId,
        studentId,
        status: 'not_started',
      });
    }
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PROGRESS: Save scene result ──────────────────────────────────────────────
export const saveSceneProgress = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const studentId = (req as any).user?.id;
    const { lessonId } = req.params;
    const { sceneId, sceneType, completed, passed, xpEarned, timeSpentSeconds, currentSceneIndex } = req.body;

    let progress = await LessonProgress.findOne({ tenantId, lessonId, studentId });
    if (!progress) {
      progress = new LessonProgress({
        tenantId,
        lessonId,
        studentId,
        status: 'in_progress',
        startedAt: new Date(),
      });
    }

    if (progress.status === 'not_started') {
      progress.status = 'in_progress';
      progress.startedAt = new Date();
    }

    // Upsert scene result
    const existingIdx = progress.sceneResults.findIndex((r: any) => r.sceneId === sceneId);
    const sceneResult = {
      sceneId,
      sceneType,
      completed: completed ?? true,
      passed,
      attemptsUsed: 1,
      xpEarned: xpEarned ?? 0,
      timeSpentSeconds: timeSpentSeconds ?? 0,
      completedAt: new Date(),
    };

    if (existingIdx >= 0) {
      sceneResult.attemptsUsed = (progress.sceneResults[existingIdx] as any).attemptsUsed + 1;
      progress.sceneResults[existingIdx] = sceneResult as any;
    } else {
      progress.sceneResults.push(sceneResult as any);
    }

    progress.currentSceneIndex = Math.max(progress.currentSceneIndex, currentSceneIndex ?? 0);
    progress.totalXpEarned = progress.sceneResults.reduce((s: number, r: any) => s + (r.xpEarned || 0), 0);
    progress.timeSpentSeconds += timeSpentSeconds ?? 0;

    await progress.save();
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PROGRESS: Complete lesson ─────────────────────────────────────────────────
export const completeLesson = async (req: Request, res: Response) => {
  try {
    const tenantId  = (req as any).user?.tenantId;
    const studentId = (req as any).user?.id;
    const { lessonId } = req.params;

    const lesson = await InteractiveLesson.findOne({ _id: lessonId, tenantId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const progress = await LessonProgress.findOne({ tenantId, lessonId, studentId });
    if (!progress) return res.status(404).json({ message: 'Progress not found' });

    // Calculate score from interactive scenes (quiz, fill_blank, drag_drop, code_run)
    const interactiveTypes = ['quiz', 'fill_blank', 'drag_drop', 'code_run'];
    const interactiveScenes = lesson.scenes.filter((s: any) => interactiveTypes.includes(s.type));
    const passedCount = progress.sceneResults.filter((r: any) =>
      interactiveTypes.includes(r.sceneType) && r.passed
    ).length;

    const score = interactiveScenes.length > 0
      ? Math.round((passedCount / interactiveScenes.length) * 100)
      : 100;

    const passed = score >= lesson.passingScore;
    progress.status = passed ? 'passed' : 'failed';
    progress.score = score;
    progress.completedAt = new Date();
    await progress.save();

    // Increment completion count on lesson
    if (passed) {
      await InteractiveLesson.updateOne({ _id: lessonId }, { $inc: { completionCount: 1 } });
    }

    res.json({ progress, score, passed });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ADMIN: All progress for a lesson ─────────────────────────────────────────
export const getLessonProgressAdmin = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { lessonId } = req.params;

    const records = await LessonProgress.find({ tenantId, lessonId })
      .populate('studentId', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    res.json({ records, total: records.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── TEMPLATE LIBRARY: pre-built lesson starters ──────────────────────────────
export const getTemplates = async (_req: Request, res: Response) => {
  res.json({ templates: LESSON_TEMPLATES });
};

// ─── AI GENERATE: Generate full lesson via Claude ─────────────────────────────
export const generateLessonAI = async (req: Request, res: Response) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: 'ANTHROPIC_API_KEY not configured on server. Add it to .env and restart.' });
    }
    const { concept, language, difficulty, additionalNotes, model } = req.body;
    if (!concept || !language) {
      return res.status(400).json({ message: 'concept and language are required' });
    }

    const lesson = await generateLesson({
      concept,
      language,
      difficulty: difficulty || 'beginner',
      additionalNotes,
      model,
    });

    res.json(lesson);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'AI generation failed' });
  }
};

// ─── CODE RUN: Execute code via codeRunnerService ─────────────────────────────
export const executeCode = async (req: Request, res: Response) => {
  try {
    const { language, code, stdin } = req.body;
    if (!language || !code) return res.status(400).json({ message: 'language and code required' });

    const result = await codeRunner.execute({
      language: language as ProgrammingLanguage,
      code,
      input: stdin || '',
      expectedOutput: '',
      timeLimit: language === 'java' ? 20000 : 10000,
      memoryLimit: 256,
    });
    res.json({
      stdout: result.output || '',
      stderr: result.error || '',
      exitCode: result.passed ? 0 : 1,
      executionTime: result.executionTime,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── Built-in Starter Templates ───────────────────────────────────────────────
const LESSON_TEMPLATES = [
  {
    id: 'java-variables',
    title: 'Java: Variables & Data Types',
    language: 'java',
    concept: 'Variables',
    difficulty: 'beginner',
    description: 'Learn how to declare, assign, and use variables in Java',
    sceneSummary: ['story', 'code_demo', 'quiz', 'fill_blank', 'code_run', 'summary'],
  },
  {
    id: 'python-variables',
    title: 'Python: Variables & Data Types',
    language: 'python',
    concept: 'Variables',
    difficulty: 'beginner',
    description: 'Understand Python\'s dynamic typing and variable assignment',
    sceneSummary: ['story', 'code_demo', 'quiz', 'drag_drop', 'code_run', 'summary'],
  },
  {
    id: 'java-loops',
    title: 'Java: Loops (for, while, do-while)',
    language: 'java',
    concept: 'Loops',
    difficulty: 'beginner',
    description: 'Master iteration with all loop types in Java',
    sceneSummary: ['story', 'code_demo', 'drag_drop', 'quiz', 'code_run', 'summary'],
  },
  {
    id: 'python-loops',
    title: 'Python: Loops (for, while)',
    language: 'python',
    concept: 'Loops',
    difficulty: 'beginner',
    description: 'Learn Python loops with list iteration and range()',
    sceneSummary: ['story', 'code_demo', 'quiz', 'fill_blank', 'code_run', 'summary'],
  },
  {
    id: 'java-oop',
    title: 'Java: OOP Fundamentals (Classes & Objects)',
    language: 'java',
    concept: 'OOP',
    difficulty: 'intermediate',
    description: 'Create classes, instantiate objects, use constructors and methods',
    sceneSummary: ['story', 'code_demo', 'drag_drop', 'quiz', 'fill_blank', 'code_run', 'summary'],
  },
  {
    id: 'sql-select',
    title: 'SQL: SELECT Queries',
    language: 'sql',
    concept: 'Queries',
    difficulty: 'beginner',
    description: 'Write SELECT statements with WHERE, ORDER BY, and LIMIT',
    sceneSummary: ['story', 'code_demo', 'quiz', 'fill_blank', 'summary'],
  },
];
