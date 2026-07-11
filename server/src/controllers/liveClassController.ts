import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import LiveClass from '../models/LiveClass';
import User from '../models/User';
import * as hms from '../services/hmsService';
import { recordJoin, recordLeave, finalizeAttendance } from '../services/liveClassAttendanceService';
import { importRecording, generateNotesFromTranscript, fetchTranscriptText } from '../services/liveClassRecordingService';

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'];

const isAdminish = (req: AuthenticatedRequest) => ADMIN_ROLES.includes(req.user?.role || '');

// ── Create (schedule) a live class ────────────────────────────────────────────
export const createLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { title, description, mode, scheduledAt, durationMin, batchId, courseId, instructorName } = req.body;
    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Title and scheduledAt are required', error: 'validation' });
    }
    const lc = await LiveClass.create({
      tenantId,
      title,
      description,
      mode: mode || 'online',
      instructorId: req.user?.id,
      instructorName: instructorName || req.user?.email,
      batchId: batchId || undefined,
      courseId: courseId || undefined,
      scheduledAt: new Date(scheduledAt),
      durationMin: durationMin || 60,
      status: 'scheduled',
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, message: 'Live class scheduled', data: lc });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── List live classes (tenant-scoped) ─────────────────────────────────────────
export const listLiveClasses = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const q: any = { tenantId };
    if (req.query.status) q.status = req.query.status;

    // Students only see live classes assigned to THEIR batch (hosts/admins see all)
    if (!isAdminish(req)) {
      const me = await User.findById(req.user?.id).select('batchId').lean();
      const myBatch = (me as any)?.batchId;
      if (!myBatch) return res.status(200).json({ success: true, message: 'Live classes', data: [] });
      q.batchId = myBatch;
    }

    const items = await LiveClass.find(q).sort({ scheduledAt: -1 }).limit(200).lean();
    res.status(200).json({ success: true, message: 'Live classes', data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const getLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId }).lean();
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    res.status(200).json({ success: true, message: 'Live class', data: lc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const updateLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const allowed = ['title', 'description', 'mode', 'scheduledAt', 'durationMin', 'batchId', 'courseId', 'instructorName'];
    const update: any = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    const lc = await LiveClass.findOneAndUpdate({ _id: req.params.id, tenantId }, { $set: update }, { new: true });
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    res.status(200).json({ success: true, message: 'Updated', data: lc });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

export const deleteLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    if (lc.hmsRoomId && lc.status === 'live') await hms.endRoom(lc.hmsRoomId, 'Class deleted', tenantId);
    await lc.deleteOne();
    res.status(200).json({ success: true, message: 'Deleted', data: { _id: req.params.id } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── Instructor: start the class (creates room lazily, marks live) ──────────────
export const startLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!hms.isHmsConfigured(tenantId)) {
      return res.status(400).json({ success: false, message: '100ms is not configured in Platform Settings → Live Classes', error: 'not_configured' });
    }
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });

    if (!lc.hmsRoomId) {
      lc.hmsRoomId = await hms.createRoom(lc.title, lc.description || '', tenantId);
    }
    if (lc.status !== 'live') {
      lc.status = 'live';
      lc.startedAt = new Date();
    }
    await lc.save();

    const token = hms.authToken(lc.hmsRoomId!, String(req.user?.id), hms.HMS_ROLES.broadcaster, tenantId);
    res.status(200).json({
      success: true,
      message: 'Class started',
      data: { token, roomId: lc.hmsRoomId, role: hms.HMS_ROLES.broadcaster, liveClass: lc },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── Any member: get a join token in the right role ────────────────────────────
export const getJoinToken = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    if (lc.status !== 'live' || !lc.hmsRoomId) {
      return res.status(409).json({ success: false, message: 'Class is not live yet', error: 'not_live' });
    }
    // The instructor (or an admin) joins as broadcaster; everyone else as viewer (HLS audience)
    const isHost = isAdminish(req) || String(lc.instructorId) === String(req.user?.id);

    // A student may only join a class assigned to their batch
    if (!isHost && lc.batchId) {
      const me = await User.findById(req.user?.id).select('batchId').lean();
      if (String((me as any)?.batchId) !== String(lc.batchId)) {
        return res.status(403).json({ success: false, message: 'This live class is for a different batch', error: 'not_your_batch' });
      }
    }
    const role = isHost ? hms.HMS_ROLES.broadcaster : hms.HMS_ROLES.viewer;
    const token = hms.authToken(lc.hmsRoomId, String(req.user?.id), role, tenantId);
    res.status(200).json({
      success: true,
      message: 'Join token',
      data: { token, roomId: lc.hmsRoomId, role, hlsUrl: lc.hlsUrl, status: lc.status, title: lc.title },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── Instructor: bring a viewer on stage / send them back ──────────────────────
export const changePeerRole = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { peerId, toStage } = req.body;
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
    if (!lc || !lc.hmsRoomId) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    const role = toStage ? hms.HMS_ROLES.stage : hms.HMS_ROLES.viewer;
    await hms.changeRole(lc.hmsRoomId, peerId, role, tenantId);
    res.status(200).json({ success: true, message: toStage ? 'Brought on stage' : 'Sent to audience', data: { peerId, role } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── Instructor client reports the HLS URL once streaming starts ───────────────
export const setHlsUrl = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { hlsUrl } = req.body;
    const lc = await LiveClass.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: { hlsUrl: hlsUrl || undefined } },
      { new: true }
    );
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    res.status(200).json({ success: true, message: 'HLS url saved', data: { hlsUrl: lc.hlsUrl } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── Instructor: end the class ─────────────────────────────────────────────────
export const endLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    if (lc.hmsRoomId) await hms.endRoom(lc.hmsRoomId, 'Class ended by instructor', tenantId);
    lc.status = 'ended';
    lc.endedAt = new Date();
    lc.hlsUrl = undefined;
    await lc.save();
    // Turn the watch logs into attendance (best-effort; doesn't block the response)
    finalizeAttendance(String(lc._id)).catch(() => {});
    res.status(200).json({ success: true, message: 'Class ended', data: lc });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── 100ms webhook (public; recording ready etc.) ──────────────────────────────
export const hmsWebhook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const event = (req.body || {}) as any;
    const type = event.type;
    const data = event.data || {};
    const roomId = data.room_id || data.roomId;

    // Recording finished → stash the URL and import it into the Class Hub (Bunny + published video)
    if (type === 'recording.success' || type === 'beam.recording.success') {
      const url = data.recording_path || data.recording_presigned_url || data.path;
      if (roomId && url) {
        const lc = await LiveClass.findOneAndUpdate(
          { hmsRoomId: roomId },
          { $set: { recordingReady: true, recordingUrl: url } },
          { new: true }
        );
        if (lc) importRecording(String(lc._id), url).catch(() => {});
      }
    }

    // Transcription/summary add-on delivered → generate AI notes/quiz via Claude
    if (type === 'transcription.success' || type === 'summary.success' || type === 'transcript.success') {
      const lc = roomId ? await LiveClass.findOne({ hmsRoomId: roomId }).select('_id') : null;
      // find any URL-ish field pointing at the transcript/summary text
      const url: string | undefined = Object.values(data as Record<string, any>).find(
        (v) => typeof v === 'string' && /^https?:\/\//.test(v) && /(transcript|summary|\.txt|\.json|\.vtt|\.srt)/i.test(v)
      ) as string | undefined;
      if (lc && url) {
        (async () => {
          const text = await fetchTranscriptText(url);
          if (text) await generateNotesFromTranscript(String(lc._id), text);
        })().catch(() => {});
      }
    }

    // Attendance — accumulate watch time from peer lifecycle events
    if (type === 'peer.join.success') {
      await recordJoin(roomId, data.user_id || data.userId, data.role);
    } else if (type === 'peer.leave.success') {
      await recordLeave(roomId, data.user_id || data.userId, data.duration);
    } else if (type === 'session.close.success' || type === 'room.end.success') {
      // Session/room closed by 100ms — finalise attendance for that class
      const lc = roomId ? await LiveClass.findOne({ hmsRoomId: roomId }).select('_id') : null;
      if (lc) finalizeAttendance(String(lc._id)).catch(() => {});
    }

    // Always 200 so 100ms doesn't retry-storm us
    res.status(200).json({ ok: true });
  } catch {
    res.status(200).json({ ok: true });
  }
};
