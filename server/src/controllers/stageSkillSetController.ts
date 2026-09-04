import { Request, Response } from 'express';
import CareerSkill from '../models/CareerSkill';
import {
  listStageSkillSets, getStageSkillSet, getStageBlueprint, saveStageSkillSet,
} from '../services/stageSkillSetService';
import { CAREER_STAGES } from '../services/careerStageService';

/**
 * Admin: what a student without a target role is measured and taught against.
 *
 * The stage was always known — derived from degree and year — and the foundation policy
 * already restricted a first-year to FOUNDATION-difficulty skills. It had no list of its
 * own to filter, so a student who answered "I'm not sure yet" got nothing at all. This is
 * where that list is written.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string => String((req as any).user?.id || '');

/** GET /passport/stage-skill-sets — every stage, with whether it has a usable list. */
export const list = async (req: Request, res: Response) => {
  try {
    res.json({
      stages: await listStageSkillSets(tenantOf(req)),
      // Sent with the list so the screen never hardcodes a stage vocabulary that could
      // drift from the one the server derives students into.
      stageCatalogue: CAREER_STAGES.map(s => ({ key: s.key, label: s.label, blurb: s.blurb })),
    });
  } catch (e: any) {
    console.error('[stage-skills] list:', e?.message || e);
    res.status(500).json({ message: 'Could not load the stage skill sets.' });
  }
};

/** GET /passport/stage-skill-sets/:stage — one set, joined with its skills. */
export const get = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const stage = String(req.params.stage || '').toLowerCase();
    const doc = await getStageSkillSet(tenantId, stage);

    /**
     * Two different answers, deliberately kept apart: `resolved` is null when the set is
     * off or empty — the state that decides whether a role-less student gets a plan — while
     * `set` is what the admin is editing. A screen that only had one could not show a
     * half-written list without also claiming it was live.
     */
    res.json({
      stage,
      label: doc?.label || CAREER_STAGES.find(s => s.key === stage)?.label || stage,
      enabled: !!doc?.enabled,
      version: doc?.version || 0,
      requirements: doc?.requirements || [],
      resolved: await getStageBlueprint(tenantId, stage),
      // Only skills a student can actually be assessed or taught on. Groups are containers
      // and would produce a requirement nothing could ever measure.
      skills: await CareerSkill.find({ active: { $ne: false }, nodeType: { $ne: 'GROUP' } })
        .select('key name difficulty parentKey assessable learnable')
        .sort({ difficulty: 1, name: 1 }).lean(),
    });
  } catch (e: any) {
    console.error('[stage-skills] get:', e?.message || e);
    res.status(500).json({ message: 'Could not load that stage skill set.' });
  }
};

/** PUT /passport/stage-skill-sets/:stage — replace the list for one stage. */
export const save = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const doc = await saveStageSkillSet({
      tenantId: tenantOf(req),
      stage: String(req.params.stage || ''),
      label: b.label,
      enabled: b.enabled,
      requirements: Array.isArray(b.requirements) ? b.requirements : [],
      actor: actorOf(req),
    });
    res.json({ success: true, version: doc.version, enabled: doc.enabled });
  } catch (e: any) {
    console.error('[stage-skills] save:', e?.message || e);
    res.status(400).json({ message: e.message || 'Could not save that stage skill set.' });
  }
};
