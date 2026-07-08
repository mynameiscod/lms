import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import LearningContentLibrary from '../models/LearningContentLibrary';

// ─── LIST ──────────────────────────────────────────────────────────────────────
export const listContent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { type, topic, course, search, published, source } = req.query;

    const query: any = { tenantId };

    // CareerPilot funnel content (createdBy 'ai-day-gen') is kept out of the default
    // Content Library + Curriculum Builder view so it doesn't drown the offline-class
    // content. `source=generated` shows only it (the AI tab); `source=all` shows both.
    if (source === 'generated') query.createdBy = 'ai-day-gen';
    else if (source !== 'all') query.createdBy = { $ne: 'ai-day-gen' };

    if (type)   query.type = type;
    if (topic)  query.topicTags  = { $in: [topic] };
    if (course) query.courseTags = { $in: [course] };
    if (published === 'true')  query.isPublished = true;
    if (published === 'false') query.isPublished = false;
    if (search) {
      query.$or = [
        { title:       { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { topicTags:   { $regex: search, $options: 'i' } },
      ];
    }

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

    // Parse JSON fields if sent as strings (multipart form)
    const parseJson = (val: any) => {
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
      return val;
    };

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
    const parseJson = (val: any) => {
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
      return val;
    };

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
