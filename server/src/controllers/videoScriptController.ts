import { Request, Response } from 'express';
import VideoScript, { SCRIPT_STATUSES } from '../models/VideoScript';

/**
 * Content Builder → the shooting script for a day's video. Admin-only: every route is behind
 * MANAGE_FOR.cpContent and no student-facing code reads the VideoScript collection.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string =>
  String((req as any).user?.email || (req as any).user?.id || '');
const clean = (v: any, n: number): string => String(v ?? '').replace(/\r\n/g, '\n').slice(0, n);
const MAX_SCENES = 60;

/** GET /curriculum-units/:unitCode/script — the day's script, or null when none has been written. */
export async function getScript(req: Request, res: Response) {
  try {
    const tenantId = tenantOf(req);
    const unitCode = String(req.params.unitCode || '').toUpperCase();
    const script = await VideoScript.findOne({ tenantId, unitCode }).lean();
    res.json({ success: true, data: script || null });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Could not load the script.' });
  }
}

/** PUT /curriculum-units/:unitCode/script — create or replace the day's script. */
export async function saveScript(req: Request, res: Response) {
  try {
    const tenantId = tenantOf(req);
    const unitCode = String(req.params.unitCode || '').toUpperCase();
    if (!tenantId || !unitCode) return res.status(400).json({ success: false, message: 'Which day?' });
    const b = req.body || {};
    const scenes = (Array.isArray(b.scenes) ? b.scenes : []).slice(0, MAX_SCENES).map((s: any) => ({
      heading: clean(s?.heading, 200).trim(),
      visual: clean(s?.visual, 4000),
      narration: clean(s?.narration, 12000),
      notes: clean(s?.notes, 2000),
    })).filter((s: any) => s.heading || s.visual.trim() || s.narration.trim() || s.notes.trim());
    if (!scenes.length) return res.status(400).json({ success: false, message: 'Write at least one scene before saving.' });
    const status = SCRIPT_STATUSES.includes(b.status) ? b.status : 'DRAFT';
    const minutes = Number(b.targetMinutes);
    const actor = actorOf(req);
    const script = await VideoScript.findOneAndUpdate(
      { tenantId, unitCode },
      {
        $set: {
          title: clean(b.title, 200).trim(),
          objective: clean(b.objective, 1000).trim(),
          targetMinutes: Number.isFinite(minutes) ? Math.min(180, Math.max(0, Math.round(minutes))) : 10,
          presenter: clean(b.presenter, 120).trim(),
          scenes, status, updatedBy: actor,
        },
        $setOnInsert: { tenantId, unitCode, createdBy: actor },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json({ success: true, data: script });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Could not save the script.' });
  }
}

/** DELETE /curriculum-units/:unitCode/script */
export async function deleteScript(req: Request, res: Response) {
  try {
    const tenantId = tenantOf(req);
    const unitCode = String(req.params.unitCode || '').toUpperCase();
    await VideoScript.deleteOne({ tenantId, unitCode });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Could not delete the script.' });
  }
}
