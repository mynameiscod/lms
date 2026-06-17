import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import WeekendPlan from '../models/WeekendPlan';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';
import InterviewTemplate from '../models/InterviewTemplate';
import LearningContentLibrary from '../models/LearningContentLibrary';

const tenantId = (req: Request): string => (req as any).user?.tenantId || '';
const userId   = (req: Request): string => (req as any).user?.id || '';

// ─── Curriculum CRUD ─────────────────────────────────────────────────────────

export const listCurricula = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { search, published } = req.query;
    const filter: any = { tenantId: tId };
    if (published === 'true')  filter.isPublished = true;
    if (published === 'false') filter.isPublished = false;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const curricula = await LearningCurriculum.find(filter)
      .select('-topics') // skip heavy topics array in list view
      .sort({ createdAt: -1 })
      .lean();

    // Attach day plan counts
    const ids = curricula.map(c => c._id);
    const dayCounts = await DayPlan.aggregate([
      { $match: { curriculumId: { $in: ids }, tenantId: tId } },
      { $group: { _id: '$curriculumId', plannedDays: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    dayCounts.forEach(d => { countMap[d._id.toString()] = d.plannedDays; });

    const result = curricula.map(c => ({
      ...c,
      plannedDays: countMap[c._id.toString()] || 0,
    }));

    res.json({ curricula: result, total: result.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list curricula', error: err });
  }
};

export const getCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const curriculum = await LearningCurriculum.findOne({ _id: req.params.id, tenantId: tId }).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    res.json(curriculum);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get curriculum', error: err });
  }
};

export const createCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { title, description, targetCourse, totalDays, topics } = req.body;
    const curriculum = await LearningCurriculum.create({
      tenantId: tId,
      title,
      description,
      targetCourse,
      totalDays: totalDays || 145,
      topics: topics || [],
      createdBy: userId(req),
    });
    res.status(201).json(curriculum);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create curriculum', error: err });
  }
};

export const updateCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { title, description, targetCourse, totalDays, topics } = req.body;
    const curriculum = await LearningCurriculum.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId },
      { $set: { title, description, targetCourse, totalDays, ...(topics !== undefined && { topics }) } },
      { new: true, runValidators: true }
    );
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    res.json(curriculum);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update curriculum', error: err });
  }
};

export const deleteCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const curriculum = await LearningCurriculum.findOne({ _id: req.params.id, tenantId: tId });
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    if (curriculum.enrollmentCount > 0) {
      return res.status(400).json({ message: 'Cannot delete a curriculum with active enrollments' });
    }
    await Promise.all([
      LearningCurriculum.deleteOne({ _id: curriculum._id }),
      DayPlan.deleteMany({ curriculumId: curriculum._id }),
      WeekendPlan.deleteMany({ curriculumId: curriculum._id }),
    ]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete curriculum', error: err });
  }
};

export const togglePublish = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const curriculum = await LearningCurriculum.findOne({ _id: req.params.id, tenantId: tId });
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    curriculum.isPublished = !curriculum.isPublished;
    await curriculum.save();
    res.json({ isPublished: curriculum.isPublished });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle publish', error: err });
  }
};

export const cloneCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const source = await LearningCurriculum.findOne({ _id: req.params.id, tenantId: tId }).lean();
    if (!source) return res.status(404).json({ message: 'Curriculum not found' });

    const { title } = req.body;
    const newCurriculum = await LearningCurriculum.create({
      tenantId: tId,
      title: title || `${source.title} (Copy)`,
      description: source.description,
      targetCourse: source.targetCourse,
      totalDays: source.totalDays,
      topics: source.topics,
      isPublished: false,
      clonedFrom: source._id,
      createdBy: userId(req),
    });

    // Clone day plans
    const srcDayPlans = await DayPlan.find({ curriculumId: source._id, tenantId: tId }).lean();
    if (srcDayPlans.length > 0) {
      const newDayPlans = srcDayPlans.map(dp => ({
        ...dp,
        _id: new mongoose.Types.ObjectId(),
        curriculumId: newCurriculum._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await DayPlan.insertMany(newDayPlans);
    }

    // Clone weekend plans
    const srcWeekendPlans = await WeekendPlan.find({ curriculumId: source._id, tenantId: tId }).lean();
    if (srcWeekendPlans.length > 0) {
      const newWeekendPlans = srcWeekendPlans.map(wp => ({
        ...wp,
        _id: new mongoose.Types.ObjectId(),
        curriculumId: newCurriculum._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await WeekendPlan.insertMany(newWeekendPlans);
    }

    res.status(201).json(newCurriculum);
  } catch (err) {
    res.status(500).json({ message: 'Failed to clone curriculum', error: err });
  }
};

// ─── Day Plans ───────────────────────────────────────────────────────────────

// ─── Cross-tenant template library ─────────────────────────────────────────────

// Toggle/set whether a curriculum is published to the shared template library.
export const shareCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const curriculum = await LearningCurriculum.findOne({ _id: req.params.id, tenantId: tId });
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    curriculum.shared = typeof req.body.shared === 'boolean' ? req.body.shared : !curriculum.shared;
    await curriculum.save();
    res.json({ shared: curriculum.shared });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update sharing', error: String(err) });
  }
};

// List shared templates from ALL tenants (the marketplace). isOwn flags the
// caller's own shared curricula.
export const listTemplates = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const filter: any = { shared: true };
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };
    const rows = await LearningCurriculum.find(filter)
      .select('title description targetCourse totalDays topics tenantId enrollmentCount updatedAt')
      .sort({ updatedAt: -1 }).limit(100).lean();
    res.json(rows.map((r: any) => ({
      _id: r._id, title: r.title, description: r.description, targetCourse: r.targetCourse,
      totalDays: r.totalDays, topicCount: (r.topics || []).length,
      enrollmentCount: r.enrollmentCount, updatedAt: r.updatedAt,
      isOwn: r.tenantId === tId,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Failed to list templates', error: String(err) });
  }
};

/**
 * Import a shared template (from any tenant) INTO the caller's tenant.
 * Copies curriculum + topics + day/weekend structure; deep-copies referenced
 * library content into this tenant (remapping ids). Module activities
 * (quiz/assignment/code/interview) are tenant-owned and cannot be carried —
 * they're skipped; the admin re-adds their own in the builder.
 */
export const cloneTemplate = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const uId = userId(req);
    const source = await LearningCurriculum.findOne({ _id: req.params.id, shared: true }).lean();
    if (!source) return res.status(404).json({ message: 'Shared template not found' });

    const newCurriculum = await LearningCurriculum.create({
      tenantId: tId,
      title: req.body.title || `${source.title} (Imported)`,
      description: source.description,
      targetCourse: source.targetCourse,
      totalDays: source.totalDays,
      topics: source.topics,
      isPublished: false,
      shared: false,
      clonedFrom: source._id,
      createdBy: uId,
    });

    const srcDays = await DayPlan.find({ curriculumId: source._id }).lean();
    const srcWeekends = await WeekendPlan.find({ curriculumId: source._id }).lean();

    // Collect referenced content ids
    const contentIds = new Set<string>();
    const collect = (items: any[]) => (items || []).forEach((it: any) => {
      if ((!it.kind || it.kind === 'content') && it.contentId) contentIds.add(it.contentId.toString());
    });
    srcDays.forEach(d => collect(d.items));
    srcWeekends.forEach(w => collect(w.items));

    // Deep-copy content into this tenant
    const map: Record<string, mongoose.Types.ObjectId> = {};
    if (contentIds.size > 0) {
      const srcContents = await LearningContentLibrary.find({ _id: { $in: [...contentIds] } }).lean();
      for (const c of srcContents) {
        const { _id, createdAt, updatedAt, viewCount, usageCount, ...rest } = c as any;
        const copy = await LearningContentLibrary.create({ ...rest, tenantId: tId, createdBy: uId, viewCount: 0, usageCount: 0 });
        map[String(_id)] = copy._id as mongoose.Types.ObjectId;
      }
    }

    let skippedModules = 0;
    const remap = (items: any[]): any[] => {
      const out: any[] = [];
      for (const it of (items || [])) {
        const kind = it.kind || 'content';
        if (kind === 'content') {
          const nid = it.contentId ? map[it.contentId.toString()] : null;
          if (!nid) continue; // content missing → skip
          out.push({ ...it, _id: new mongoose.Types.ObjectId(), contentId: nid });
        } else {
          skippedModules++; // module refs are tenant-owned
        }
      }
      return out;
    };

    if (srcDays.length > 0) {
      await DayPlan.insertMany(srcDays.map(d => ({
        ...d, _id: new mongoose.Types.ObjectId(), tenantId: tId, curriculumId: newCurriculum._id,
        items: remap(d.items), createdAt: new Date(), updatedAt: new Date(),
      })));
    }
    if (srcWeekends.length > 0) {
      await WeekendPlan.insertMany(srcWeekends.map(w => ({
        ...w, _id: new mongoose.Types.ObjectId(), tenantId: tId, curriculumId: newCurriculum._id,
        items: remap(w.items), createdAt: new Date(), updatedAt: new Date(),
      })));
    }

    res.status(201).json({ curriculum: newCurriculum, copiedContent: Object.keys(map).length, skippedModules });
  } catch (err) {
    res.status(500).json({ message: 'Failed to import template', error: String(err) });
  }
};

// ─── Activity bank ───────────────────────────────────────────────────────────
// Normalized list of standalone-module items (Quiz / Assignment / Code Snippet /
// Mock Interview) so the day builder can drop them onto a day. Content library
// has its own picker (learningContentLibraryApi). Tenant fields differ per model
// (some String, some ObjectId) so we handle both.
export const getActivityBank = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const kind = String(req.query.kind || '');
    const search = String(req.query.search || '').trim();
    const rx = search ? { $regex: search, $options: 'i' } : undefined;
    const oid = mongoose.Types.ObjectId.isValid(tId) ? new mongoose.Types.ObjectId(tId) : null;

    let items: Array<{ id: any; title: string; sourceModel: string; kind: string; meta?: string }> = [];

    if (kind === 'quiz') {
      const q: any = { tenantId: tId };
      if (rx) q.title = rx;
      const rows = await Quiz.find(q).select('title').sort({ createdAt: -1 }).limit(100).lean();
      items = rows.map((r: any) => ({ id: r._id, title: r.title, sourceModel: 'Quiz', kind }));
    } else if (kind === 'assignment') {
      const q: any = {};
      if (oid) q.tenant = oid;
      if (rx) q.title = rx;
      const rows = await Assignment.find(q).select('title type difficulty').sort({ createdAt: -1 }).limit(100).lean();
      items = rows.map((r: any) => ({ id: r._id, title: r.title, sourceModel: 'Assignment', kind, meta: r.type || r.difficulty }));
    } else if (kind === 'codeSnippet') {
      const q: any = {};
      if (oid) q.tenantId = oid;
      if (rx) q.title = rx;
      const rows = await CodeSnippetAssessment.find(q).select('title status').sort({ createdAt: -1 }).limit(100).lean();
      items = rows.map((r: any) => ({ id: r._id, title: r.title, sourceModel: 'CodeSnippetAssessment', kind, meta: r.status }));
    } else if (kind === 'mockInterview') {
      const q: any = {};
      if (oid) q.tenantId = oid;
      if (rx) q.title = rx;
      const rows = await InterviewTemplate.find(q).select('title status').sort({ createdAt: -1 }).limit(100).lean();
      items = rows.map((r: any) => ({ id: r._id, title: r.title, sourceModel: 'InterviewTemplate', kind, meta: r.status }));
      // Always offer a physical / in-person mock (the real session is scheduled
      // separately by the admin; this just places it on the day).
      if (!search) items.unshift({ id: 'physical', title: 'Physical / In-person Mock Interview', sourceModel: 'physical', kind, meta: 'in-person' });
    } else {
      return res.status(400).json({ message: 'Unknown activity kind' });
    }

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load activity bank', error: String(err) });
  }
};

export const getDayPlans = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { id: curriculumId } = req.params;
    const plans = await DayPlan.find({ curriculumId, tenantId: tId })
      .sort({ dayNumber: 1 })
      .lean();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get day plans', error: err });
  }
};

export const upsertDayPlan = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { id: curriculumId, day } = req.params;
    const dayNumber = parseInt(day, 10);
    if (isNaN(dayNumber) || dayNumber < 1) {
      return res.status(400).json({ message: 'Invalid day number' });
    }

    // Verify curriculum belongs to tenant
    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId });
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });

    const { title, notes, items, topicId } = req.body;

    const plan = await DayPlan.findOneAndUpdate(
      { curriculumId, dayNumber, tenantId: tId },
      { $set: { title, notes, items: items || [], topicId: topicId || '' } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save day plan', error: err });
  }
};

export const clearDayPlan = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { id: curriculumId, day } = req.params;
    await DayPlan.deleteOne({ curriculumId, dayNumber: parseInt(day, 10), tenantId: tId });
    res.json({ message: 'Day plan cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear day plan', error: err });
  }
};

// ─── Weekend Plans ───────────────────────────────────────────────────────────

export const getWeekendPlans = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { id: curriculumId } = req.params;
    const plans = await WeekendPlan.find({ curriculumId, tenantId: tId })
      .sort({ weekNumber: 1, dayOfWeek: 1 })
      .lean();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get weekend plans', error: err });
  }
};

export const upsertWeekendPlan = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { id: curriculumId, week, dayOfWeek } = req.params;
    const weekNumber = parseInt(week, 10);
    if (isNaN(weekNumber) || weekNumber < 1) {
      return res.status(400).json({ message: 'Invalid week number' });
    }
    if (!['saturday', 'sunday'].includes(dayOfWeek)) {
      return res.status(400).json({ message: 'dayOfWeek must be saturday or sunday' });
    }

    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId });
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });

    const { type, title, description, items } = req.body;
    const plan = await WeekendPlan.findOneAndUpdate(
      { curriculumId, weekNumber, dayOfWeek, tenantId: tId },
      { $set: { type: type || 'rest', title, description, items: items || [] } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save weekend plan', error: err });
  }
};
