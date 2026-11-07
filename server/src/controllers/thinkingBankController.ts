import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ThinkingQuestion from '../models/ThinkingQuestion';
import {
  QUESTION_TYPES, QUESTION_TYPE_LABEL, SUBCATEGORY_SUGGESTIONS, QUESTION_DIFFICULTIES, QUESTION_YEARS,
  ANSWER_FORMATS, QUESTION_STATUSES, KEY_STEPS_MIN, KEY_STEPS_MAX, HINTS_MAX, AI_BATCH_MAX, publishProblems,
} from '../data/thinkingBankPolicy';
import { cleanQuestion, createQuestion, adminRow, adminDetail, bankQuery, bankStats, generateDrafts } from '../services/thinkingBankService';

/**
 * Problem Bank → Thinking Lab: the shared question bank for CareerPilot's Thinking Lab.
 * Every route needs `manage_thinking_bank`, which only a super admin can give a role.
 */

const tenantOf = (req: Request) => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userOf = (req: Request) => String((req as any).user?.id || '');

/** GET /careerpilot/thinking-bank/meta — the choices the editor offers, and the counts. */
export const meta = async (_req: Request, res: Response) => {
  try {
    res.json({
      types: QUESTION_TYPES.map((t) => ({ key: t, label: QUESTION_TYPE_LABEL[t], suggestions: SUBCATEGORY_SUGGESTIONS[t] })),
      difficulties: QUESTION_DIFFICULTIES, years: QUESTION_YEARS, answerFormats: ANSWER_FORMATS, statuses: QUESTION_STATUSES,
      limits: { keyStepsMin: KEY_STEPS_MIN, keyStepsMax: KEY_STEPS_MAX, hintsMax: HINTS_MAX, aiBatchMax: AI_BATCH_MAX },
      stats: await bankStats(),
    });
  } catch (e: any) {
    console.error('[thinking-bank] meta:', e?.message || e);
    res.status(500).json({ message: 'Could not load the question bank.' });
  }
};

/** GET /careerpilot/thinking-bank?type&difficulty&year&status&q&page */
export const list = async (req: Request, res: Response) => {
  try {
    const filter = bankQuery(req.query as any);
    const page = Math.max(1, Number(req.query.page) || 1);
    const per = 25;
    const [rows, total] = await Promise.all([
      ThinkingQuestion.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * per).limit(per).lean(),
      ThinkingQuestion.countDocuments(filter),
    ]);
    res.json({ questions: rows.map(adminRow), total, page, pages: Math.max(1, Math.ceil(total / per)) });
  } catch (e: any) {
    console.error('[thinking-bank] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the questions.' });
  }
};

/** GET /careerpilot/thinking-bank/:id */
export const detail = async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Question not found.' });
  const q = await ThinkingQuestion.findById(req.params.id).lean();
  if (!q) return res.status(404).json({ message: 'Question not found.' });
  res.json({ question: adminDetail(q) });
};

/**
 * POST /careerpilot/thinking-bank · PUT /careerpilot/thinking-bank/:id
 *
 * `status` PUBLISHED is refused, with the reasons, until the question is complete. Publishing records
 * who approved it; editing a published question keeps it published only if it is still complete.
 */
export const save = async (req: Request, res: Response) => {
  try {
    const data = cleanQuestion(req.body || {});
    if (!data.type) return res.status(400).json({ message: 'Choose the type of question.' });
    if (!data.title) return res.status(400).json({ message: 'Give it a title.' });
    const status = QUESTION_STATUSES.includes(req.body?.status) ? req.body.status : 'DRAFT';
    if (status === 'PUBLISHED') {
      const problems = publishProblems(data);
      if (problems.length) return res.status(400).json({ message: 'Finish the question before publishing it.', problems });
    }
    const user = userOf(req);
    const approval = status === 'PUBLISHED' ? { approvedBy: user, approvedAt: new Date() } : {};
    let doc: any;
    if (req.params.id) {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Question not found.' });
      doc = await ThinkingQuestion.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Question not found.' });
      const wasPublished = doc.status === 'PUBLISHED';
      doc.set({ ...data, status, updatedBy: user, ...(status === 'PUBLISHED' && !wasPublished ? approval : {}) });
      for (const k of ['answer', 'explanation', 'imageUrl', 'estimatedMinutes', 'order', 'referenceSolution', 'answerFormat'] as const) {
        if ((data as any)[k] === undefined) doc.set(k, undefined);
      }
      await doc.save();
    } else {
      doc = await createQuestion({ ...data, status, source: 'manual', createdBy: user, updatedBy: user, ...approval });
    }
    res.json({ question: adminDetail(doc.toObject ? doc.toObject() : doc) });
  } catch (e: any) {
    console.error('[thinking-bank] save:', e?.message || e);
    res.status(500).json({ message: 'Could not save the question.' });
  }
};

/** DELETE /careerpilot/thinking-bank/:id — only a question no member has been given; others are retired. */
export const remove = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Question not found.' });
    const q: any = await ThinkingQuestion.findById(req.params.id).select('timesServed').lean();
    if (!q) return res.status(404).json({ message: 'Question not found.' });
    if ((q.timesServed || 0) > 0) return res.status(409).json({ message: 'Members have already been given this question, so it stays on record. Retire it instead.' });
    await ThinkingQuestion.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[thinking-bank] delete:', e?.message || e);
    res.status(500).json({ message: 'Could not delete the question.' });
  }
};

/** POST /careerpilot/thinking-bank/generate { type, subCategory, difficulty, year, count, brief } — AI drafts. */
export const generate = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    if (!QUESTION_TYPES.includes(b.type)) return res.status(400).json({ message: 'Choose the type of question.' });
    if (!QUESTION_DIFFICULTIES.includes(b.difficulty)) return res.status(400).json({ message: 'Choose a difficulty.' });
    const out = await generateDrafts({
      tenantId: tenantOf(req), userId: userOf(req), type: b.type, difficulty: b.difficulty,
      subCategory: String(b.subCategory || '').trim().slice(0, 60) || undefined,
      year: b.year ? String(b.year) : undefined, count: Number(b.count) || 1,
      brief: b.brief ? String(b.brief).slice(0, 400) : undefined,
    });
    if (!out.created.length) return res.status(502).json({ message: 'The AI did not return any usable questions. Try again, or change the note.' });
    res.json({ questions: out.created.map((q: any) => adminRow(q.toObject ? q.toObject() : q)), failed: out.failed });
  } catch (e: any) {
    console.error('[thinking-bank] generate:', e?.message || e);
    res.status(502).json({ message: e?.message || 'Could not generate questions.' });
  }
};
