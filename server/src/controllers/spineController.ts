import { Request, Response } from 'express';
import { buildStudentSpine, tenantSpineCoverage } from '../services/studentSpineService';
import { SPINE_BANDS, SPINE_DAYS } from '../data/ninetyDayPolicy';

/**
 * The ninety-day curriculum, read.
 *
 * NOTHING ABOUT THE PLAN COMES FROM THE REQUEST. Not the language, not the direction, not the
 * depth. The student is the authenticated one and everything else is read from what has already
 * been stored about them — a controller that took any of it from a body would let a student
 * choose their own plan, which is not personalisation, it is a menu.
 *
 * READING NEVER GENERATES. The spine is derived from published day-units and the student's own
 * evidence every time it is asked for, so there is nothing to create and nothing to go stale.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const studentOf = (req: Request): string => String((req as any).user?.id || '');

/** GET /me/spine — this student's ninety days, or why they do not have them yet. */
export const getMySpine = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = studentOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const outcome = await buildStudentSpine(tenantId, studentId);

    /**
     * An incomplete curriculum is 200, not an error.
     *
     * It is a true and expected state of a product whose content is still being written, and the
     * screen renders it as "your plan is being prepared" rather than as a fault. Returning 4xx
     * would put it in the error handler beside expired sessions and broken requests, which is
     * where honest states go to be mistaken for bugs.
     */
    res.json(outcome);
  } catch (e: any) {
    console.error('[spine] getMySpine:', e?.message || e);
    res.status(500).json({ message: 'Could not load your plan.' });
  }
};

/**
 * GET /spine/coverage — how much of the ninety days this tenant has actually authored.
 *
 * FOR THE PEOPLE WRITING IT. Nobody could see the shortfall until a student complained, which is
 * exactly how a twenty-eight-day plan reached production. Takes a language and direction because
 * coverage is not one number: a track with no Python days is not "ninety authored" for a Python
 * student, however much C material exists.
 */
export const getSpineCoverage = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    if (!tenantId) return res.status(400).json({ message: 'No tenant on this request.' });

    const coverage = await tenantSpineCoverage(tenantId, {
      language: String(req.query.language || '') || null,
      direction: String(req.query.direction || '') || null,
      year: String(req.query.year || '') || null,
      branch: String(req.query.branch || '') || null,
    });

    res.json({
      ...coverage,
      spineDays: SPINE_DAYS,
      bands: SPINE_BANDS.map(b => ({
        key: b.key, label: b.label, blurb: b.blurb,
        days: b.days, fromDay: b.fromDay, toDay: b.toDay, variance: b.variance,
      })),
    });
  } catch (e: any) {
    console.error('[spine] getSpineCoverage:', e?.message || e);
    res.status(500).json({ message: 'Could not read spine coverage.' });
  }
};
