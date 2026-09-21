/**
 * The member's side of the placement check: may I test out of the topic of this day, start it, submit it.
 *
 * Thin on purpose. Which skills are asked about, how many questions, and whether the student is
 * allowed to sit it at all are decided in placementCheckService from their own plan — a request
 * names a day of that plan and nothing else. Topic and skill codes are internal and are stripped
 * from every response, as they are from the roadmap overview.
 */
import { Request, Response } from 'express';
import {
  placementCheckAvailability, startPlacementCheck, submitPlacementCheck, topicCodeForDay,
} from '../services/placementCheckService';

const tenantOf = (req: Request): string => String((req as any).tenantId || (req as any).user?.tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** Everything a member may see, and no codes. */
const outward = (r: any) => {
  const { topicCode, skillKeys, ...rest } = r || {};
  return rest;
};

export const checkPlacementAvailability = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    const topicCode = await topicCodeForDay(tenantId, studentId, Number(req.params.day));
    if (!topicCode) return res.json({ available: false, refused: 'TOPIC_NOT_IN_PLAN', message: 'That day is not part of your plan.' });
    res.json(outward(await placementCheckAvailability(tenantId, studentId, topicCode)));
  } catch (e: any) {
    console.error('[placement-check] availability:', e?.message || e);
    res.status(500).json({ message: 'Could not check this topic just now.' });
  }
};

export const startPlacement = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    const topicCode = await topicCodeForDay(tenantId, studentId, Number(req.body?.day));
    if (!topicCode) return res.status(409).json({ ok: false, refused: 'TOPIC_NOT_IN_PLAN', message: 'That day is not part of your plan.' });

    const r = await startPlacementCheck({ tenantId, studentId, topicCode });
    // A refusal is an answer, not a fault: the member is told which rule stopped them.
    if (!r.ok) return res.status(409).json(outward(r));
    res.json(outward(r));
  } catch (e: any) {
    console.error('[placement-check] start:', e?.message || e);
    res.status(500).json({ message: 'Could not start the check just now.' });
  }
};

export const submitPlacement = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });
    const assessmentId = String(req.body?.assessmentId || '').trim();
    if (!assessmentId) return res.status(400).json({ message: 'Which check?' });

    const r = await submitPlacementCheck({
      tenantId, studentId, assessmentId,
      answers: Array.isArray(req.body?.answers) ? req.body.answers : [],
    });
    res.status(r.ok ? 200 : 400).json(outward(r));
  } catch (e: any) {
    console.error('[placement-check] submit:', e?.message || e);
    res.status(500).json({ message: 'Could not submit the check just now.' });
  }
};

export { outward as placementOutward };
