/**
 * The orientation days, for the member who takes them and the admin who writes them.
 *
 * Thin on purpose: what a day contains, whether it blocks Day 1 and what it pays are decided in
 * orientationService. Nothing in a request may say a day is finished when its required parts are not.
 */
import { Request, Response } from 'express';
import fs from 'fs';
import * as bunny from '../services/bunnyStorageService';
import {
  orientationFor, orientationProgram, completeOrientationItem, completeOrientationDay,
  saveOrientationProgram, resetOrientationProgram, recordingKeyFor,
} from '../services/orientationService';
import { foundationAccess } from '../services/foundationAccessService';

/**
 * A member's own recording of themselves.
 *
 * Kept where every other CareerPilot recording is kept, and streamed back only to the member who
 * made it. Storage being unconfigured is not a failure the student should meet as an error: the
 * recordings are optional, so the item is still theirs to finish.
 */
async function storeRecording(req: Request, dayNumber: number, itemKey: string) {
  const file = (req as any).file;
  if (!file) return { ok: false as const, message: 'No recording was received.' };
  if (!bunny.isBunnyStorageConfigured()) {
    fs.unlink(file.path, () => {});
    return { ok: false as const, message: 'Recording storage is not set up on this server yet.' };
  }
  const key = `orientation/${tenantOf(req)}/${userIdOf(req)}/day-${dayNumber}/${itemKey}-${Date.now()}.webm`;
  await bunny.uploadStream(key, fs.createReadStream(file.path), file.mimetype || 'video/webm', file.size);
  fs.unlink(file.path, () => {});
  return { ok: true as const, key, mime: String(file.mimetype || 'video/webm') };
}

const tenantOf = (req: Request): string => String((req as any).tenantId || (req as any).user?.tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/**
 * THE WELCOME IS PART OF THE MEMBERSHIP.
 *
 * `MEMBER` on these routes is a ROLE guard — it asks whether somebody may use CareerPilot at
 * all, not whether they have paid for it. So every orientation endpoint was open to a
 * non-member, and the welcome days are real content: five days of video, notes and checklists
 * that a learner could work through, and finish, without ever buying anything.
 *
 * Membership is the same answer the journey uses, so the two can never disagree about who is a
 * member. A read that fails is treated as not a member: the welcome is behind the paywall, and
 * failing open on a paywall is the wrong direction to fail.
 */
async function membershipRefuses(req: Request, res: Response): Promise<boolean> {
  try {
    const access = await foundationAccess(tenantOf(req), userIdOf(req));
    if (access.level === 'FULL') return false;
  } catch (e: any) {
    console.error('[orientation] membership check failed, refusing:', e?.message || e);
  }
  res.status(403).json({
    reason: 'MEMBERSHIP_REQUIRED',
    message: 'Your welcome days open with membership.',
  });
  return true;
}

/** GET /passport/me/orientation — the welcome, and how far this member has come through it. */
export const getMyOrientation = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    if (await membershipRefuses(req, res)) return;
    res.json(await orientationFor(tenantId, studentId));
  } catch (e: any) {
    console.error('[orientation] read:', e?.message || e);
    res.status(500).json({ message: 'Could not load your orientation just now.' });
  }
};

/** POST /passport/me/orientation/item — one part of a day, finished. */
export const completeItem = async (req: Request, res: Response) => {
  try {
    if (await membershipRefuses(req, res)) return;
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const dayNumber = Number(req.body?.dayNumber);
    const itemKey = String(req.body?.itemKey || '').trim();
    if (!Number.isInteger(dayNumber) || !itemKey) return res.status(400).json({ message: 'Which item?' });

    const r = await completeOrientationItem({
      tenantId, studentId, dayNumber, itemKey,
      checked: Array.isArray(req.body?.checked) ? req.body.checked.map(Number).filter(Number.isInteger) : undefined,
      recordingKey: req.body?.recordingKey ?? undefined,
      recordingMime: req.body?.recordingMime ?? undefined,
      recordingDurationSec: req.body?.recordingDurationSec ?? undefined,
    });
    if (!r.ok) return res.status(400).json(r);
    res.json({ ...r, orientation: await orientationFor(tenantId, studentId) });
  } catch (e: any) {
    console.error('[orientation] item:', e?.message || e);
    res.status(500).json({ message: 'Could not save that just now.' });
  }
};

/** POST /passport/me/orientation/day — a whole day, finished. */
export const completeDay = async (req: Request, res: Response) => {
  try {
    if (await membershipRefuses(req, res)) return;
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const dayNumber = Number(req.body?.dayNumber);
    if (!Number.isInteger(dayNumber)) return res.status(400).json({ message: 'Which day?' });

    const r = await completeOrientationDay(tenantId, studentId, dayNumber);
    // Outstanding required parts are an answer, not a fault: the member is told which.
    if (!r.ok) return res.status(409).json(r);
    res.json({ ...r, orientation: await orientationFor(tenantId, studentId) });
  } catch (e: any) {
    console.error('[orientation] day:', e?.message || e);
    res.status(500).json({ message: 'Could not finish that day just now.' });
  }
};

/** POST /passport/me/orientation/recording — the member's own answer to a recording prompt. */
export const uploadRecording = async (req: Request, res: Response) => {
  try {
    if (await membershipRefuses(req, res)) return;
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const dayNumber = Number(req.body?.dayNumber);
    const itemKey = String(req.body?.itemKey || '').trim();
    if (!Number.isInteger(dayNumber) || !itemKey) return res.status(400).json({ message: 'Which item?' });

    const stored = await storeRecording(req, dayNumber, itemKey);
    if (!stored.ok) return res.status(400).json(stored);

    const r = await completeOrientationItem({
      tenantId, studentId, dayNumber, itemKey,
      recordingKey: stored.key,
      recordingMime: stored.mime,
      recordingDurationSec: Number(req.body?.durationSec) || null,
    });
    if (!r.ok) return res.status(400).json(r);
    res.json({ ok: true, orientation: await orientationFor(tenantId, studentId) });
  } catch (e: any) {
    console.error('[orientation] recording:', e?.message || e);
    res.status(500).json({ message: 'Could not save your recording just now.' });
  }
};

/** GET /passport/me/orientation/recording/:day/:itemKey — played back to the member who made it. */
export const streamRecording = async (req: Request, res: Response) => {
  try {
    if (await membershipRefuses(req, res)) return;
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const view = await orientationFor(tenantId, studentId);
    const item = view.days.find(d => d.dayNumber === Number(req.params.day))
      ?.items.find(i => i.key === String(req.params.itemKey));
    if (!item?.done) return res.status(404).json({ message: 'No recording yet.' });

    const key = await recordingKeyFor(tenantId, studentId, Number(req.params.day), String(req.params.itemKey));
    if (!key) return res.status(404).json({ message: 'No recording yet.' });

    const { stream } = await bunny.getFileStream(key);
    res.setHeader('Content-Type', 'video/webm');
    stream.pipe(res);
  } catch (e: any) {
    console.error('[orientation] playback:', e?.message || e);
    res.status(500).json({ message: 'Could not play that recording just now.' });
  }
};

/** GET /passport/orientation — admin: the tenant's welcome as it stands. */
export const getProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    res.json(await orientationProgram(tenantId));
  } catch (e: any) {
    console.error('[orientation] program:', e?.message || e);
    res.status(500).json({ message: 'Could not load orientation just now.' });
  }
};

/** PUT /passport/orientation — admin: replace it. */
export const saveProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });

    const r = await saveOrientationProgram(
      tenantId,
      Array.isArray(req.body?.days) ? req.body.days : [],
      req.body?.enabled !== false,
      userIdOf(req),
    );
    if (!r.ok) return res.status(400).json(r);
    res.json({ ...r, ...(await orientationProgram(tenantId)) });
  } catch (e: any) {
    console.error('[orientation] save:', e?.message || e);
    res.status(500).json({ message: 'Could not save orientation just now.' });
  }
};

/** POST /passport/orientation/reset — admin: back to the shipped welcome. */
export const resetProgram = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(401).json({ message: 'Not authenticated' });
    await resetOrientationProgram(tenantId, userIdOf(req));
    res.json({ ok: true, ...(await orientationProgram(tenantId)) });
  } catch (e: any) {
    console.error('[orientation] reset:', e?.message || e);
    res.status(500).json({ message: 'Could not reset orientation just now.' });
  }
};
