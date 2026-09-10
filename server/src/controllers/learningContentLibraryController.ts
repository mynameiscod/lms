import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import LearningContentLibrary from '../models/LearningContentLibrary';
import CareerSkill from '../models/CareerSkill';
import { getAllSkills } from '../services/careerSkillService';
import { CAREER_DIRECTIONS, DIRECTION_ALL, isDirectionKey } from '../data/careerDirectionPolicy';

/* ------------------------------------------------------------------ *
 * Adaptive fields (ADAPTIVE_CURRICULUM_V1)
 * ------------------------------------------------------------------ */

/**
 * The fields that decide whether the adaptive planner can ever find this content.
 *
 * WHY THEY ARE HANDLED SEPARATELY FROM THE REST OF THE BODY. Everything else on a library row
 * is descriptive — a title, a duration, a tag somebody searches by. These six are the ONLY
 * thing that makes a row reachable from a measured skill gap, and they are the reason content
 * authored through this screen was invisible to the plan: the model has carried `skillKeys`
 * since the adaptive work shipped, and neither the create body nor the update allow-list ever
 * mentioned them. A video uploaded here was findable by keyword and by nothing else.
 *
 * THEY VALIDATE, THEY DO NOT COERCE. An unknown skill key is refused by name rather than
 * dropped, on exactly the terms the curriculum editor already uses: a silently ignored key
 * looks saved and teaches nothing, and the author has no way to discover the difference.
 */
const DEPTHS = ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'] as const;

const upper = (v: any) => String(v ?? '').trim().toUpperCase();

/** Multipart sends everything as a string, so a JSON field arrives as its own source text. */
const parseJson = (val: any) => {
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
  return val;
};

/** Anything the form can send for an array field, as an array. */
const asArray = (val: any): string[] | undefined => {
  if (val === undefined) return undefined;
  const parsed = parseJson(val);
  if (Array.isArray(parsed)) return parsed.map(v => String(v ?? '').trim()).filter(Boolean);
  // A single value from a plain form post, or '' meaning "clear this".
  const one = String(parsed ?? '').trim();
  return one ? [one] : [];
};

/**
 * Skill keys, checked against the canonical taxonomy.
 *
 * GROUPS ARE REFUSED, not merely discouraged. A group is a shelf — PROGRAMMING, PYTHON — and
 * nothing measures one, so content mapped to a group can never be selected by a plan built
 * from scores. The mapping would look correct in the database and behave as if it were absent.
 */
async function validateSkillKeys(input: any): Promise<string[] | undefined> {
  const wanted = asArray(input);
  if (wanted === undefined) return undefined;
  const keys = [...new Set(wanted.map(upper))].filter(Boolean);
  if (!keys.length) return [];

  const found = await CareerSkill.find({ key: { $in: keys } })
    .select('key nodeType active').lean() as any[];
  const byKey = new Map(found.map(s => [upper(s.key), s]));

  const missing = keys.filter(k => !byKey.has(k));
  if (missing.length) {
    throw new Error(`These skills do not exist: ${missing.join(', ')}`);
  }

  const groups = keys.filter(k => byKey.get(k)?.nodeType === 'GROUP');
  if (groups.length) {
    throw new Error(
      `${groups.join(', ')} ${groups.length === 1 ? 'is a group' : 'are groups'}, not a skill. `
      + 'Nothing measures a group, so a plan could never select this content. Map it to the skills inside instead.',
    );
  }

  return keys;
}

/** Direction keys, for both `applicableDirections` and `careerContexts`. */
function validateDirections(input: any, field: string): string[] | undefined {
  const list = asArray(input);
  if (list === undefined) return undefined;
  const keys = [...new Set(list.map(upper))].filter(Boolean);
  if (!keys.length) return [];

  const bad = keys.filter(k => k !== DIRECTION_ALL && !isDirectionKey(k));
  if (bad.length) throw new Error(`Unknown ${field}: ${bad.join(', ')}`);
  return keys;
}

/**
 * Read the adaptive fields off a request body.
 *
 * UNDEFINED AND EMPTY MEAN DIFFERENT THINGS, deliberately. A field the form did not send is
 * left exactly as it was — which is what keeps every screen that posts a partial body working
 * — while an empty array is an author deliberately clearing a mapping, and must be saved as
 * one. Collapsing the two would make a mapping impossible to remove through the UI.
 */
async function readAdaptiveFields(body: any): Promise<Record<string, any>> {
  const out: Record<string, any> = {};

  const skillKeys = await validateSkillKeys(body.skillKeys);
  if (skillKeys !== undefined) out.skillKeys = skillKeys;

  /**
   * Not validated against a curriculum, deliberately.
   *
   * Content is authored before the topic that will use it exists as often as after, and
   * rejecting a code because no curriculum carries it yet would block the normal order of
   * work. A code that matches nothing simply never wins a slot — it costs a wrong guess
   * nothing, where a hard check would cost every early author a blocked save.
   */
  if (body.topicCode !== undefined) {
    out.topicCode = String(body.topicCode ?? '').trim() || undefined;
  }

  if (body.learningDepth !== undefined) {
    const depth = upper(body.learningDepth);
    if (!depth) out.learningDepth = undefined;              // '' from a multipart form → unset
    else if (!(DEPTHS as readonly string[]).includes(depth)) {
      throw new Error(`Unknown learning depth "${body.learningDepth}". Use one of: ${DEPTHS.join(', ')}.`);
    } else out.learningDepth = depth;
  }

  if (body.difficultyLevel !== undefined) {
    const raw = String(body.difficultyLevel).trim();
    if (!raw) out.difficultyLevel = undefined;
    else {
      const n = Number(raw);
      // The planner assigns against 1-4. A 5 here would simply never match a request.
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        throw new Error('Practice difficulty must be a whole number from 1 to 4.');
      }
      out.difficultyLevel = n;
    }
  }

  if (body.canonical !== undefined) {
    out.canonical = body.canonical === true || body.canonical === 'true';
  }

  const directions = validateDirections(body.applicableDirections, 'direction');
  if (directions !== undefined) out.applicableDirections = directions;

  const contexts = validateDirections(body.careerContexts, 'career context');
  if (contexts !== undefined) out.careerContexts = contexts;

  const outcomes = asArray(body.learningOutcomeIds);
  if (outcomes !== undefined) out.learningOutcomeIds = outcomes;

  return out;
}

// ─── LIST ──────────────────────────────────────────────────────────────────────
export const listContent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { type, topic, course, search, published, source, skill, mapped } = req.query;

    const query: any = { tenantId };
    /**
     * Composed with $and rather than by assigning $or twice.
     *
     * Both the text search and the "not mapped to any skill" filter need an $or, and the
     * second assignment would silently replace the first — searching inside the unmapped
     * list would quietly widen to the whole library and look like it had worked.
     */
    const and: any[] = [];

    // CareerPilot funnel content (createdBy 'ai-day-gen') is kept out of the default
    // Content Library + Curriculum Builder view so it doesn't drown the offline-class
    // content. `source=generated` shows only it (the AI tab); `source=all` shows both.
    if (source === 'generated') query.createdBy = 'ai-day-gen';
    else if (source !== 'all') query.createdBy = { $ne: 'ai-day-gen' };

    if (type)   query.type = type;
    if (topic)  query.topicTags  = { $in: [topic] };
    if (course) query.courseTags = { $in: [course] };

    /**
     * The authoring to-do list, askable from the library itself.
     *
     * `mapped=false` is the query that matters: a row with no skill keys is invisible to the
     * adaptive planner, and until now the only way to find those was to read the database.
     * Both spellings of "no keys" are matched because rows written before the field existed
     * have no array at all, while a cleared mapping leaves an empty one.
     */
    if (skill) query.skillKeys = { $in: [String(skill).toUpperCase()] };
    if (mapped === 'false') {
      and.push({ $or: [{ skillKeys: { $exists: false } }, { skillKeys: { $size: 0 } }] });
    }
    if (mapped === 'true') {
      and.push({ skillKeys: { $exists: true, $not: { $size: 0 } } });
    }

    if (published === 'true')  query.isPublished = true;
    if (published === 'false') query.isPublished = false;
    if (search) {
      and.push({
        $or: [
          { title:       { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { topicTags:   { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (and.length) query.$and = and;

    const items = await LearningContentLibrary.find(query)
      .sort({ createdAt: -1 })
      .select('-notesContent -qaItems -practiceQuestions'); // exclude heavy fields from list

    res.json({ items, total: items.length });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ONE ───────────────────────────────────────────────────────────────────
export const getContent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const item = await LearningContentLibrary.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ message: 'Content not found' });

    // Increment view count (non-blocking)
    LearningContentLibrary.updateOne({ _id: item._id }, { $inc: { viewCount: 1 } }).catch(() => {});

    res.json(item);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── CREATE ────────────────────────────────────────────────────────────────────
export const createContent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId   = (req as any).user?.id;

    const body = req.body;

    // Refused before anything is written, so a bad skill key cannot produce a half-saved row.
    const adaptive = await readAdaptiveFields(body);

    const item = new LearningContentLibrary({
      tenantId,
      createdBy:         userId,
      title:             body.title,
      description:       body.description,
      type:              body.type,
      topicTags:         parseJson(body.topicTags)  || [],
      courseTags:        parseJson(body.courseTags) || [],
      difficulty:        body.difficulty || undefined,
      estimatedDuration: Number(body.estimatedDuration) || 0,
      isPublished:       body.isPublished === 'true' || body.isPublished === true,

      // Video
      videoSource:         body.videoSource || undefined,
      videoUrl:            body.videoUrl,
      videoFilePath:       (req as any).videoFilePath,
      videoDuration:       Number(body.videoDuration) || undefined,
      videoThumbnail:      (req as any).thumbnailUrl || body.videoThumbnail,
      bunnyVideoId:        body.bunnyVideoId,
      bunnyLibraryId:      body.bunnyLibraryId !== undefined ? Number(body.bunnyLibraryId) : undefined,
      completionThreshold: Number(body.completionThreshold) || 0,

      // Notes
      notesSource:   body.notesSource || undefined,
      notesContent:  body.notesContent,
      notesFilePath: (req as any).notesFilePath,

      // Interactive activity
      htmlContent:   body.htmlContent,
      activitySteps: body.activitySteps !== undefined ? Number(body.activitySteps) : undefined,

      // Q&A
      qaItems: parseJson(body.qaItems) || [],

      // Practice
      practiceQuestions: parseJson(body.practiceQuestions) || [],

      // Adaptive curriculum — what makes this row reachable from a measured skill gap.
      ...adaptive,
    });

    await item.save();
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export const updateContent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const item = await LearningContentLibrary.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ message: 'Content not found' });

    const body = req.body;

    // Validated up front: an unknown skill key must not leave half the edit applied.
    const adaptive = await readAdaptiveFields(body);

    const allowed = [
      'title', 'description', 'topicTags', 'courseTags', 'difficulty',
      'estimatedDuration', 'isPublished',
      'videoSource', 'videoUrl', 'videoDuration', 'videoThumbnail', 'completionThreshold',
      'bunnyVideoId', 'bunnyLibraryId',
      'notesSource', 'notesContent',
      'htmlContent', 'activitySteps',
      'qaItems', 'practiceQuestions',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        const parsed = parseJson(body[key]);
        (item as any)[key] = parsed;
      }
    }

    // Adaptive fields, already validated. Assigned by their own path so an empty array clears
    // a mapping rather than being mistaken for "not sent".
    for (const [key, value] of Object.entries(adaptive)) {
      (item as any)[key] = value;
    }

    // Empty-string enum fields → unset (multipart sends '' which fails enum validation)
    for (const k of ['difficulty', 'videoSource', 'notesSource'] as const) {
      if ((item as any)[k] === '') (item as any)[k] = undefined;
    }

    // Handle boolean
    if (body.isPublished !== undefined) {
      item.isPublished = body.isPublished === 'true' || body.isPublished === true;
    }

    // New thumbnail uploaded → replace
    if ((req as any).thumbnailUrl) {
      item.videoThumbnail = (req as any).thumbnailUrl;
    }

    // Handle new file uploads
    if ((req as any).videoFilePath) {
      // Remove old file if it exists
      if (item.videoFilePath && fs.existsSync(item.videoFilePath)) {
        fs.unlink(item.videoFilePath, () => {});
      }
      item.videoFilePath = (req as any).videoFilePath;
    }
    if ((req as any).notesFilePath) {
      if (item.notesFilePath && fs.existsSync(item.notesFilePath)) {
        fs.unlink(item.notesFilePath, () => {});
      }
      item.notesFilePath = (req as any).notesFilePath;
    }

    await item.save();
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ─── DELETE ────────────────────────────────────────────────────────────────────
export const deleteContent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const item = await LearningContentLibrary.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ message: 'Content not found' });

    if (item.usageCount > 0) {
      return res.status(400).json({
        message: `Cannot delete — this content is used in ${item.usageCount} day plan(s). Remove it from all plans first.`,
      });
    }

    // Remove physical files
    if (item.videoFilePath && fs.existsSync(item.videoFilePath)) {
      fs.unlink(item.videoFilePath, () => {});
    }
    if (item.notesFilePath && fs.existsSync(item.notesFilePath)) {
      fs.unlink(item.notesFilePath, () => {});
    }

    await item.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── TOGGLE PUBLISH ────────────────────────────────────────────────────────────
export const togglePublish = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const item = await LearningContentLibrary.findOne({ _id: req.params.id, tenantId });
    if (!item) return res.status(404).json({ message: 'Content not found' });

    item.isPublished = !item.isPublished;
    await item.save();
    res.json({ isPublished: item.isPublished });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── STREAM VIDEO ─────────────────────────────────────────────────────────────
export const streamVideo = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId; // set by query-token middleware in route
    const item = await LearningContentLibrary.findOne({ _id: req.params.id, tenantId });
    if (!item || !item.videoFilePath) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const filePath = item.videoFilePath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Video file not found on disk' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp4': 'video/mp4', '.webm': 'video/webm',
      '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
    };
    const mimeType = mimeMap[ext] || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ALL TOPIC TAGS (for filter dropdowns) ─────────────────────────────────
export const getTopicTags = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const tags = await LearningContentLibrary.distinct('topicTags', { tenantId });
    res.json(tags.filter(Boolean).sort());
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getCourseTags = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const tags = await LearningContentLibrary.distinct('courseTags', { tenantId });
    res.json(tags.filter(Boolean).sort());
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ADAPTIVE PICKER OPTIONS ──────────────────────────────────────────────────
/**
 * GET /learning-library/skill-options — everything the adaptive section of the form offers.
 *
 * WHY IT LIVES HERE RATHER THAN BEING FETCHED FROM /passport/skills. That route is behind
 * `manage_passport`, which a content author has no reason to hold — the Content Library
 * itself asks only for a valid session. Pointing the form at a route its own users cannot
 * call would produce an empty picker and no error, which is precisely the failure this whole
 * change exists to remove. (The Skill Mapping screen already fetches a path that does not
 * exist and swallows the 404 into an empty list; that is worth fixing separately.)
 *
 * GROUPS AND INACTIVE SKILLS ARE EXCLUDED. A group cannot be measured, so offering one would
 * let an author build a mapping that can never be selected by a plan.
 */
export const getSkillOptions = async (_req: Request, res: Response) => {
  try {
    const skills = await getAllSkills(undefined, false);

    res.json({
      skills: skills
        .filter((s: any) => s.nodeType !== 'GROUP')
        .map((s: any) => ({
          key: s.key,
          name: s.name,
          parentKey: s.parentKey || null,
          difficulty: s.difficulty,
          assessable: !!s.assessable,
        })),
      depths: DEPTHS,
      directions: CAREER_DIRECTIONS.map(d => ({ key: d.key, name: d.name })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
