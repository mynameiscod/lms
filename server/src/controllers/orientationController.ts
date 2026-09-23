/**
 * The orientation days, for the member who takes them and the admin who writes them.
 *
 * Thin on purpose: what a day contains, whether it blocks Day 1 and what it pays are decided in
 * orientationService. Nothing in a request may say a day is finished when its required parts are not.
 */
import { Request, Response } from 'express';
import {
  orientationFor, orientationProgram, completeOrientationItem, completeOrientationDay,
  saveOrientationProgram, resetOrientationProgram,
} from '../services/orientationService';

const tenantOf = (req: Request): string => String((req as any).tenantId || (req as any).user?.tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** GET /passport/me/orientation — the welcome, and how far this member has come through it. */
export const getMyOrientation = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    res.json(await orientationFor(tenantId, studentId));
  } catch (e: any) {
    console.error('[orientation] read:', e?.message || e);
    res.status(500).json({ message: 'Could not load your orientation just now.' });
  }
};

/** POST /passport/me/orientation/item — one part of a day, finished. */
export const completeItem = async (req: Request, res: Response) => {
  try {
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
