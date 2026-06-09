import { Response } from 'express';
import AssessmentItem from '../models/AssessmentItem';
import { AuthenticatedRequest } from '../types';
import { ASSESSMENT_DIMENSIONS, ASSESSMENT_ITEM_TYPES } from '../constants/assessment';
import { generateItems } from '../services/assessmentQuestionGeneratorService';

/**
 * Admin CRUD for the skill-assessment question bank (AssessmentItem).
 * Auth + tenant scoping handled by route middleware.
 */

const esc = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listAssessmentItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const { dimension, type, difficulty, active, search } = req.query as any;
    const filter: any = { tenantId };
    if (dimension) filter.dimension = dimension;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = Number(difficulty);
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;
    if (search) filter.prompt = { $regex: esc(search), $options: 'i' };

    const items = await AssessmentItem.find(filter).sort({ updatedAt: -1 }).limit(1000).lean();
    res.json({ success: true, message: 'Items fetched', data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch items', error: e.message });
  }
};

/** Coverage matrix (active items by dimension × type) so admins see gaps. */
export const getAssessmentCoverage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = String(req.tenantId);
    const [byCell, byDifficulty, total, activeTotal] = await Promise.all([
      AssessmentItem.aggregate([
        { $match: { tenantId, active: true } },
        { $group: { _id: { dimension: '$dimension', type: '$type' }, count: { $sum: 1 } } },
      ]),
      AssessmentItem.aggregate([
        { $match: { tenantId, active: true } },
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      AssessmentItem.countDocuments({ tenantId }),
      AssessmentItem.countDocuments({ tenantId, active: true }),
    ]);
    res.json({ success: true, message: 'Coverage', data: { total, activeTotal, byCell, byDifficulty } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch coverage', error: e.message });
  }
};

function validate(body: any): string | null {
  if (!ASSESSMENT_ITEM_TYPES.includes(body.type)) return 'Invalid item type';
  if (!ASSESSMENT_DIMENSIONS.includes(body.dimension)) return 'Invalid dimension';
  if (!body.prompt || !String(body.prompt).trim()) return 'Prompt is required';
  if (!body.difficulty || body.difficulty < 1 || body.difficulty > 5) return 'Difficulty must be 1–5';
  if (body.type === 'mcq' && (!Array.isArray(body.options) || !body.options.length)) return 'MCQ needs options';
  if (body.type === 'mcq' && (!Array.isArray(body.correctOptionIds) || !body.correctOptionIds.length)) return 'MCQ needs a correct answer';
  if (body.type === 'predict_output' && !body.expectedOutput) return 'Predict-output needs an expected output';
  if ((body.type === 'live_code' || body.type === 'sql') && (!Array.isArray(body.testCases) || !body.testCases.length)) return 'Code tasks need at least one test case';
  return null;
}

// Whitelisted fields an admin may set (prevents tenantId/createdBy tampering).
const FIELDS = [
  'type', 'dimension', 'difficulty', 'language', 'prompt', 'codeSnippet', 'options', 'correctOptionIds',
  'expectedOutput', 'buggyLineNumber', 'bugExplanation', 'blanks', 'starterCode', 'functionSignature',
  'testCases', 'points', 'timeLimitSeconds', 'tags', 'active',
];
const pick = (body: any) => FIELDS.reduce((o: any, k) => { if (body[k] !== undefined) o[k] = body[k]; return o; }, {});

export const createAssessmentItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const err = validate(req.body || {});
    if (err) return res.status(400).json({ success: false, message: err });
    const item = await AssessmentItem.create({
      ...pick(req.body),
      tenantId: String(req.tenantId),
      createdBy: String(req.user?.id || 'admin'),
    });
    res.json({ success: true, message: 'Item created', data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to create item', error: e.message });
  }
};

export const updateAssessmentItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const err = validate({ ...req.body });
    if (err) return res.status(400).json({ success: false, message: err });
    const item = await AssessmentItem.findOneAndUpdate(
      { _id: req.params.id, tenantId: String(req.tenantId) },
      { $set: pick(req.body) },
      { new: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Item updated', data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to update item', error: e.message });
  }
};

export const deleteAssessmentItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const r = await AssessmentItem.deleteOne({ _id: req.params.id, tenantId: String(req.tenantId) });
    res.json({ success: true, message: 'Item deleted', data: { deleted: r.deletedCount } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to delete item', error: e.message });
  }
};

/** AI-generate + validate items into the bank (reviewable). */
export const generateAssessmentItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return res.status(400).json({ success: false, message: 'AI generation is not configured (no API key).' });
    const tenantId = String(req.tenantId);
    const { type, dimension, difficulty, language, count, context } = req.body || {};
    if (!ASSESSMENT_ITEM_TYPES.includes(type)) return res.status(400).json({ success: false, message: 'Invalid item type' });
    if (!ASSESSMENT_DIMENSIONS.includes(dimension)) return res.status(400).json({ success: false, message: 'Invalid dimension' });
    const n = Math.max(1, Math.min(10, Number(count) || 3));

    const items = await generateItems(
      tenantId,
      { type, dimension, difficulty: Math.max(1, Math.min(5, Number(difficulty) || 3)), language, count: n, context },
      { persist: true }
    );
    res.json({ success: true, message: `Generated ${items.length} item(s)`, data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Generation failed', error: e.message });
  }
};

export const toggleAssessmentItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await AssessmentItem.findOne({ _id: req.params.id, tenantId: String(req.tenantId) });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.active = !item.active;
    await item.save();
    res.json({ success: true, message: 'Item toggled', data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Failed to toggle item', error: e.message });
  }
};
