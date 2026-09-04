import { Request, Response } from 'express';
import mongoose from 'mongoose';
import SkillEvidence from '../models/SkillEvidence';
import Question from '../models/Question';
import {
  listBank, copyForCareerPilot, setTargeting, answerCounts, isOwned, normalizeDifficulty,
} from '../services/questionBankService';

/**
 * The CareerPilot assessment question bank.
 *
 * Every write here defends one of two facts established in questionBankService:
 *   - a recorded answer stores the option's ARRAY INDEX, so option structure is frozen once
 *     a question has been answered;
 *   - a borrowed question is shared with the LMS quiz bank, so it is copied before editing
 *     rather than edited in place.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string => String((req as any).user?.id || '');
const oid = (v: string) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

/** GET /passport/question-bank */
export const list = async (req: Request, res: Response) => {
  try {
    const q = req.query as any;
    res.json(await listBank(tenantOf(req), {
      skillKey: q.skillKey, difficulty: q.difficulty, provenance: q.provenance,
      status: q.status, targeting: q.targeting, year: q.year, course: q.course,
      branch: q.branch, role: q.role, search: q.search,
      page: Number(q.page) || 0, pageSize: Number(q.pageSize) || 25,
    }));
  } catch (e: any) {
    console.error('[question-bank] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the question bank.' });
  }
};

/**
 * PUT /passport/question-bank/:sourceType/:sourceId — edit one question.
 *
 * Refuses rather than silently doing something narrower than asked. An admin who sends new
 * options for an answered question is told why it cannot be done, not quietly given a
 * text-only save they did not ask for and would not notice.
 */
export const update = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { sourceType, sourceId } = req.params;
    const b = req.body || {};

    if (sourceType !== 'question') {
      return res.status(400).json({ message: 'Only questions from the CareerPilot bank can be edited here.' });
    }
    const id = oid(sourceId);
    if (!id) return res.status(400).json({ message: 'Unknown question.' });

    const q: any = await Question.findOne({ _id: id, tenantId });
    if (!q) return res.status(404).json({ message: 'Question not found.' });

    if (!isOwned(q)) {
      return res.status(409).json({
        code: 'BORROWED',
        message: 'This question is shared with the LMS quiz bank. Copy it into CareerPilot first, then edit the copy.',
      });
    }

    const wantsOptions = Array.isArray(b.options);
    if (wantsOptions) {
      const counts = await answerCounts([{ sourceType, sourceId }]);
      const answered = counts.get(`${sourceType}:${sourceId}`) || 0;
      const existing = (q.options || []).length;
      const structural = b.options.length !== existing;

      /**
       * A recorded answer names an option by its position, so changing how many options
       * there are — or their order — rewrites what every past answer meant. Text may still
       * be corrected in place: a typo fixed in option C leaves C as C.
       */
      if (answered > 0 && structural) {
        return res.status(409).json({
          code: 'ANSWERED',
          answerCount: answered,
          message: `${answered} recorded answer${answered === 1 ? '' : 's'} refer to this question by option position. `
            + 'Wording can be corrected, but options cannot be added, removed or reordered. Duplicate it as a new question instead.',
        });
      }

      const opts = b.options.map((o: any) => ({
        text: String(o?.text ?? '').trim(),
        isCorrect: o?.isCorrect === true,
      }));
      if (opts.some((o: any) => !o.text)) return res.status(400).json({ message: 'Every option needs text.' });
      if (!opts.some((o: any) => o.isCorrect)) return res.status(400).json({ message: 'Mark one option as correct.' });
      q.options = opts;
    }

    if (typeof b.question === 'string' && b.question.trim()) q.question = b.question.trim();
    if (typeof b.explanation === 'string') q.explanation = b.explanation.trim();
    if (typeof b.difficulty === 'string') {
      const d = normalizeDifficulty(b.difficulty);
      if (d) q.difficultyLevel = d.toLowerCase();
    }
    await q.save();

    if (b.audience) {
      await setTargeting({ tenantId, targets: [{ sourceType, sourceId }], audience: b.audience });
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error('[question-bank] update:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save the question.' });
  }
};

/** POST /passport/question-bank/:sourceId/copy — take a borrowed question into CareerPilot. */
export const copy = async (req: Request, res: Response) => {
  try {
    const out = await copyForCareerPilot({
      tenantId: tenantOf(req), sourceId: req.params.sourceId, actor: actorOf(req),
    });
    res.json({ success: true, ...out });
  } catch (e: any) {
    console.error('[question-bank] copy:', e?.message || e);
    res.status(400).json({ message: e.message || 'Could not copy that question.' });
  }
};

/**
 * POST /passport/question-bank/targeting — apply one audience to many questions.
 *
 * The bulk path is the point of the screen, not a convenience on top of it: 638 of 640
 * questions carry no targeting, and tagging them one at a time is not a route anybody would
 * finish.
 */
export const bulkTargeting = async (req: Request, res: Response) => {
  try {
    const { targets, audience } = req.body || {};
    if (!Array.isArray(targets) || !targets.length) {
      return res.status(400).json({ message: 'Select at least one question.' });
    }
    if (targets.length > 500) {
      return res.status(400).json({ message: 'Apply to at most 500 questions at a time.' });
    }
    const touched = await setTargeting({ tenantId: tenantOf(req), targets, audience: audience || {} });
    res.json({ success: true, questions: targets.length, mappings: touched });
  } catch (e: any) {
    console.error('[question-bank] bulk targeting:', e?.message || e);
    res.status(500).json({ message: 'Could not apply targeting.' });
  }
};

/**
 * POST /passport/question-bank/active — activate or retire questions.
 *
 * Retiring is the normal way to remove one. It takes the question out of every future pool
 * while leaving past attempts that reference it intact and readable.
 */
export const setActive = async (req: Request, res: Response) => {
  try {
    const { targets, active } = req.body || {};
    if (!Array.isArray(targets) || !targets.length) {
      return res.status(400).json({ message: 'Select at least one question.' });
    }
    let touched = 0;
    for (const t of targets) {
      const r = await SkillEvidence.updateMany(
        { tenantId: tenantOf(req), sourceType: t.sourceType, sourceId: t.sourceId },
        { $set: { active: active !== false } },
      );
      touched += r.modifiedCount ?? 0;
    }
    res.json({ success: true, mappings: touched });
  } catch (e: any) {
    console.error('[question-bank] active:', e?.message || e);
    res.status(500).json({ message: 'Could not update those questions.' });
  }
};

/**
 * DELETE /passport/question-bank/:sourceType/:sourceId — only when nothing references it.
 *
 * A question somebody has answered is part of their recorded score. Deleting it would leave
 * attempts pointing at nothing and make those scores unexplainable, so the answer is no and
 * the screen offers Retire instead.
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { sourceType, sourceId } = req.params;

    const counts = await answerCounts([{ sourceType, sourceId }]);
    const answered = counts.get(`${sourceType}:${sourceId}`) || 0;
    if (answered > 0) {
      return res.status(409).json({
        code: 'ANSWERED',
        answerCount: answered,
        message: `${answered} recorded answer${answered === 1 ? '' : 's'} reference this question. `
          + 'Retire it instead — it leaves every past attempt readable and takes the question out of future assessments.',
      });
    }

    await SkillEvidence.deleteMany({ tenantId, sourceType, sourceId });
    // The source is removed only when CareerPilot authored it. A borrowed question belongs
    // to the LMS bank and deleting it here would take it out of quizzes nobody was editing.
    if (sourceType === 'question') {
      const id = oid(sourceId);
      const q: any = id ? await Question.findOne({ _id: id, tenantId }).lean() : null;
      if (q && isOwned(q)) await Question.deleteOne({ _id: id });
    }
    res.json({ success: true });
  } catch (e: any) {
    console.error('[question-bank] delete:', e?.message || e);
    res.status(500).json({ message: 'Could not delete that question.' });
  }
};
