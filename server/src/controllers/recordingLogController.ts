import { Request, Response } from 'express';
import RecordingActivityLog from '../models/RecordingActivityLog';

// Map an event type to a coarse lifecycle status (shown in the admin list).
const STATUS_BY_TYPE: Record<string, string> = {
  session_start: 'started',
  permission_granted: 'permission_ok',
  permission_denied: 'failed',
  recording_started: 'recording',
  paused: 'recording',
  resumed: 'recording',
  track_ended: 'recording',
  recording_stopped: 'recorded',
  save_clicked: 'saving',
  bunny_create_ok: 'saving',
  bunny_create_error: 'failed',
  upload_started: 'uploading',
  upload_progress: 'uploading',
  upload_success: 'uploaded',
  upload_error: 'failed',
  content_save_ok: 'saved',
  content_save_error: 'failed',
  discard: 'discarded',
  page_unload: 'abandoned',
  error: 'failed',
};

const TERMINAL = new Set(['saved', 'discarded']);

// POST /recording-logs  — append one lifecycle event (auth: any logged-in user)
export const logRecordingEvent = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    if (!tenantId || !userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { sessionId, source, event, meta } = req.body || {};
    if (!sessionId || !event?.type) {
      return res.status(400).json({ success: false, message: 'sessionId and event.type are required' });
    }

    const now = new Date();
    const set: any = { lastEventAt: now, userId, tenantId };
    if (source) set.source = source;
    if (meta?.mode) set.mode = meta.mode;
    if (meta?.userName) set.userName = meta.userName;
    if (meta?.userAgent) set.userAgent = String(meta.userAgent).slice(0, 300);
    if (event.data?.durationSec != null) set.durationSec = event.data.durationSec;
    if (event.data?.sizeBytes != null) set.sizeBytes = event.data.sizeBytes;
    if (event.data?.bunnyVideoId) set.bunnyVideoId = String(event.data.bunnyVideoId);
    if (event.data?.contentId) set.contentId = String(event.data.contentId);
    if (event.data?.pct != null) set.uploadPct = event.data.pct;
    if (event.message && /error|denied|fail/i.test(event.type)) set.error = String(event.message).slice(0, 500);

    // Don't downgrade a terminal status (e.g. a late page_unload after 'saved').
    const existing = await RecordingActivityLog.findOne({ sessionId }).select('status').lean();
    const mapped = STATUS_BY_TYPE[event.type];
    if (mapped && !(existing && TERMINAL.has(existing.status))) set.status = mapped;

    await RecordingActivityLog.updateOne(
      { sessionId },
      {
        $setOnInsert: { sessionId, startedAt: now },
        $set: set,
        $push: { events: { ts: now, type: event.type, message: event.message, data: event.data } },
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error: any) {
    // Telemetry must never break the recording flow.
    res.status(200).json({ success: false, message: error.message });
  }
};

// GET /recording-logs  — admin list (most recent first)
export const listRecordingLogs = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { source, status, page, limit } = req.query;
    const query: any = { tenantId };
    if (source) query.source = source;
    if (status) query.status = status;

    const p = page ? parseInt(page as string) : 1;
    const l = limit ? parseInt(limit as string) : 50;

    const [logs, total] = await Promise.all([
      RecordingActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .select('-events')   // list view: omit the full timeline
        .populate('userId', 'firstName lastName email name')
        .lean(),
      RecordingActivityLog.countDocuments(query),
    ]);
    res.json({ success: true, data: logs, total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /recording-logs/:sessionId  — admin: full event timeline
export const getRecordingLog = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const log = await RecordingActivityLog.findOne({ tenantId, sessionId: req.params.sessionId })
      .populate('userId', 'firstName lastName email name')
      .lean();
    if (!log) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: log });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
