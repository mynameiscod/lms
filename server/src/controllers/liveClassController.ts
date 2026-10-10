import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { allowedByRoleOrPermission } from '../middleware/roleGuard';
import LiveClass from '../models/LiveClass';
import User from '../models/User';
import * as hms from '../services/hmsService';
import { recordJoin, recordLeave, finalizeAttendance } from '../services/liveClassAttendanceService';
import { importRecording, generateNotesFromTranscript, fetchTranscriptText } from '../services/liveClassRecordingService';
import * as invites from '../services/liveClassInviteService';
import { getStr } from '../services/settingsService';
import crypto from 'crypto';
import mongoose from 'mongoose';

/** Does any header carry the webhook secret? Timing-safe for each value compared. */
export function webhookCarriesSecret(headers: Record<string, unknown>, secret: string): boolean {
  const want = Buffer.from(secret);
  for (const v of Object.values(headers || {})) {
    for (const one of Array.isArray(v) ? v : [v]) {
      const got = Buffer.from(String(one ?? '').replace(/^Bearer\s+/i, ''));
      if (got.length === want.length && crypto.timingSafeEqual(got, want)) return true;
    }
  }
  return false;
}

/** Batch ids from a request body: the new list, plus the single legacy field if sent. */
const batchIdsFrom = (body: any): mongoose.Types.ObjectId[] | undefined => {
  if (!Array.isArray(body?.batchIds) && !body?.batchId) return undefined;
  const ids = [...(Array.isArray(body?.batchIds) ? body.batchIds : []), ...(body?.batchId ? [body.batchId] : [])]
    .map(String).filter((x) => mongoose.Types.ObjectId.isValid(x));
  return [...new Set(ids)].map((x) => new mongoose.Types.ObjectId(x));
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'];

// Custom roles decide by permission (Live Classes), others by role name.
const isAdminish = (req: AuthenticatedRequest) =>
  allowedByRoleOrPermission(req.user as any, ADMIN_ROLES, ['manage_live_classes', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

// ── Create (schedule) a live class ────────────────────────────────────────────
export const createLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { title, description, mode, scheduledAt, durationMin, courseId, instructorName, openToInstitute } = req.body;
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
      // New classes keep their audience in batchIds; batchId stays empty so there is one list.
      batchIds: batchIdsFrom(req.body) || [],
      openToInstitute: openToInstitute === true,
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

    // Everyone else sees what is for them: open classes, their batch's, and ones they were invited to.
    if (!(await isAdminish(req))) {
      Object.assign(q, await invites.visibleClassFilter(String(tenantId), String(req.user?.id)));
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
    const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
    if (!lc) return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    const host = (await isAdminish(req)) || String(lc.instructorId) === String(req.user?.id);
    if (!host && !(await invites.userMayJoin(lc, String(req.user?.id)))) {
      return res.status(404).json({ success: false, message: 'Not found', error: 'not_found' });
    }
    res.status(200).json({ success: true, message: 'Live class', data: lc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message, error: error.message });
  }
};

export const updateLiveClass = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const allowed = ['title', 'description', 'mode', 'scheduledAt', 'durationMin', 'courseId', 'instructorName'];
    const update: any = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    const batchIds = batchIdsFrom(req.body);
    if (batchIds) { update.batchIds = batchIds; update.batchId = undefined; }
    if (typeof req.body?.openToInstitute === 'boolean') update.openToInstitute = req.body.openToInstitute;
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
    const isHost = (await isAdminish(req)) || String(lc.instructorId) === String(req.user?.id);

    // Everyone else must be in the class's audience: open, their batch, or invited.
    if (!isHost && !(await invites.userMayJoin(lc, String(req.user?.id)))) {
      return res.status(403).json({ success: false, message: 'You are not invited to this live class', error: 'not_invited' });
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
    /*
     * The shared secret (Platform Settings → Live Classes) arrives as a custom header whose name
     * is whatever was typed in the 100ms dashboard, so any header carrying it counts. A call
     * without it is refused only once HMS_WEBHOOK_ENFORCE is "true": the secret was stored long
     * before it was checked, and refusing straight away could drop real recordings and attendance
     * if 100ms was never set up to send it.
     */
    const secret = getStr('HMS_WEBHOOK_SECRET', '');
    if (secret && !webhookCarriesSecret(req.headers, secret)) {
      if (getStr('HMS_WEBHOOK_ENFORCE', 'false').toLowerCase() === 'true') return res.status(401).json({ ok: false });
      console.warn('[hms-webhook] secret missing from a webhook call — accepted because HMS_WEBHOOK_ENFORCE is not "true"');
    }
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
    const peerUser = String(data.user_id || data.userId || '');
    if (type === 'peer.join.success') {
      if (peerUser.startsWith('invite_')) await invites.recordGuestJoin(peerUser);
      else await recordJoin(roomId, peerUser, data.role);
    } else if (type === 'peer.leave.success') {
      if (peerUser.startsWith('invite_')) await invites.recordGuestLeave(peerUser, data.duration);
      else await recordLeave(roomId, peerUser, data.duration);
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

/* ── Invites (hosts) ───────────────────────────────────────────────────────────────────── */

const inviteFail = (res: Response, e: any) =>
  res.status(e instanceof invites.InviteError ? e.status : 400).json({ success: false, message: e?.message || 'Something went wrong', error: 'invite' });

async function hostClass(req: AuthenticatedRequest) {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) throw new invites.InviteError('Not found', 404);
  const lc = await LiveClass.findOne({ _id: req.params.id, tenantId });
  if (!lc) throw new invites.InviteError('Not found', 404);
  return lc;
}

export const listInvites = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await invites.listInvites(await hostClass(req)) }); } catch (e) { inviteFail(res, e); }
};

export const addInvites = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lc = await hostClass(req);
    const out = await invites.addInvites(lc, req.body || {}, String(req.user?.id));
    if (typeof req.body?.openToInstitute === 'boolean') await LiveClass.updateOne({ _id: lc._id }, { $set: { openToInstitute: req.body.openToInstitute } });
    let sent: invites.SendResult | null = null;
    const ch = req.body?.send;
    if (ch && (ch.email || ch.whatsapp)) {
      const fresh = (await LiveClass.findById(lc._id))!;
      sent = await invites.sendInvites(fresh, { channels: { email: !!ch.email, whatsapp: !!ch.whatsapp }, onlyUnsent: true });
    }
    res.json({ success: true, data: { ...out, sent } });
  } catch (e) { inviteFail(res, e); }
};

export const sendInvites = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lc = await hostClass(req);
    const ids = Array.isArray(req.body?.inviteIds) ? req.body.inviteIds.map(String) : undefined;
    const data = await invites.sendInvites(lc, {
      inviteIds: ids,
      channels: { email: req.body?.email !== false, whatsapp: req.body?.whatsapp !== false },
      onlyUnsent: !ids?.length && req.body?.onlyUnsent !== false,
    });
    res.json({ success: true, data });
  } catch (e) { inviteFail(res, e); }
};

export const removeInvite = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await invites.removeInvite(await hostClass(req), String(req.params.inviteId)) }); } catch (e) { inviteFail(res, e); }
};

export const removeInviteBatch = async (req: AuthenticatedRequest, res: Response) => {
  try { res.json({ success: true, data: await invites.removeBatch(await hostClass(req), String(req.params.batchId)) }); } catch (e) { inviteFail(res, e); }
};

/** People in this institute, for the invite picker. Name, email or mobile; at most 20. */
export const searchPeople = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const q = String(req.query.q || '').trim().slice(0, 60);
    if (q.length < 2) return res.json({ success: true, data: [] });
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const digits = q.replace(/\D/g, '');
    const users = await User.find({
      tenantId, isActive: { $ne: false },
      $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, ...(digits.length >= 4 ? [{ phone: new RegExp(digits) }] : [])],
    }).select('firstName lastName email phone role').limit(20).lean();
    res.json({ success: true, data: users.map((u: any) => ({
      _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: u.email || '', phone: u.phone || '', role: u.role,
    })) });
  } catch (e) { inviteFail(res, e); }
};

/* ── Guests: the personal join link (no login) ─────────────────────────────────────────── */

const BAD_LINK = 'This invitation link is not valid. Ask the organiser for a new one.';

export const publicInviteInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const found = await invites.inviteByToken(String(req.params.token));
    if (!found) return res.status(404).json({ success: false, message: BAD_LINK });
    res.json({ success: true, data: invites.publicClassInfo(found.lc, found.inv) });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load the class. Please try again.' });
  }
};

export const publicJoin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const found = await invites.inviteByToken(String(req.params.token));
    if (!found) return res.status(404).json({ success: false, message: BAD_LINK });
    const { lc, inv } = found;
    if (lc.status !== 'live' || !lc.hmsRoomId) {
      return res.status(409).json({
        success: false, error: 'not_live',
        message: lc.status === 'ended' ? 'This class has ended.' : 'The class has not started yet. This page opens it when the host starts.',
      });
    }
    const typed = String(req.body?.name || '').trim().slice(0, 80);
    if (typed && !inv.name) { inv.name = typed; await inv.save(); }
    const name = inv.name || typed || 'Guest';
    const token = hms.authToken(lc.hmsRoomId, invites.guestPeerId(inv._id), hms.HMS_ROLES.viewer, String(lc.tenantId));
    res.json({ success: true, data: { token, roomId: lc.hmsRoomId, role: hms.HMS_ROLES.viewer, title: lc.title, status: lc.status, name } });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || 'Could not join' });
  }
};
