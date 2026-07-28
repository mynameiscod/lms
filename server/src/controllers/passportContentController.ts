import { Request, Response } from 'express';
import PassportContent, { DEFAULT_PATHWAYS, DEFAULT_MISSION_POOLS } from '../models/PassportContent';
import PassportAttempt from '../models/PassportAttempt';
import { ensureContent, poolMapOf, missionsForDay } from '../services/passportMissionService';
import { buildRoadmap } from '../services/passportRoadmapService';
import { PASSPORT_CATEGORIES } from '../models/PassportAssessment';

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const role = (req: Request): string => String((req as any).user?.role || '');
const isAdmin = (req: Request) => ['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'].includes(role(req));

/** GET /passport/content — pathways + mission pools (seeds defaults on first open). */
export const getContent = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const content = await ensureContent(tenantOf(req));
    res.json({ content, categories: PASSPORT_CATEGORIES });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load content' });
  }
};

/** PUT /passport/content — save edited pathways / mission pools / journey length. */
export const saveContent = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    await ensureContent(tenantId);

    const $set: any = {};
    if (Array.isArray(req.body?.pathways)) $set.pathways = req.body.pathways;
    if (Array.isArray(req.body?.missionPools)) $set.missionPools = req.body.missionPools;
    if (req.body?.journeyDays !== undefined) {
      const n = Number(req.body.journeyDays);
      if (!Number.isFinite(n) || n < 7 || n > 365) return res.status(400).json({ message: 'Journey length must be between 7 and 365 days.' });
      $set.journeyDays = Math.round(n);
    }
    if (!Object.keys($set).length) return res.status(400).json({ message: 'Nothing to save.' });

    const content = await PassportContent.findOneAndUpdate({ tenantId }, { $set }, { new: true });
    res.json({ content });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to save content' });
  }
};

/** POST /passport/content/reset — restore the shipped defaults for one part or both. */
export const resetContent = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const what = String(req.body?.what || 'all');
    await ensureContent(tenantId);

    const $set: any = {};
    if (what === 'all' || what === 'pathways') $set.pathways = DEFAULT_PATHWAYS;
    if (what === 'all' || what === 'missions') $set.missionPools = DEFAULT_MISSION_POOLS;
    const content = await PassportContent.findOneAndUpdate({ tenantId }, { $set }, { new: true });
    res.json({ content });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to reset content' });
  }
};

/**
 * POST /passport/content/preview — show the admin what their edits actually generate.
 * Uses a real student attempt when one exists, otherwise a synthetic mid-range profile,
 * so "save then hope" is never the workflow.
 */
export const previewContent = async (req: Request, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Not allowed' });
    const tenantId = tenantOf(req);
    const content = await ensureContent(tenantId);

    const pools = poolMapOf(Array.isArray(req.body?.missionPools) ? req.body.missionPools : content.missionPools);
    const pathways = Array.isArray(req.body?.pathways) ? req.body.pathways : content.pathways;
    const pathwayKey = String(req.body?.pathway || 'software_dev');

    const real = await PassportAttempt.findOne({ tenantId }).sort({ createdAt: -1 }).lean() as any;
    const attempt = real || {
      careerScore: 52,
      categoryScores: PASSPORT_CATEGORIES.map((c: any, i: number) => ({ key: c.key, label: c.label, score: 40 + i * 7 })),
      weaknesses: [], pathway: pathwayKey, pathwayLabel: pathwayKey,
    };
    attempt.pathway = pathwayKey;

    const days = [1, 2, 3, 4, 5, 6, 7].map(d => ({ day: d, missions: missionsForDay(attempt, d, pools) }));
    const roadmap = buildRoadmap({
      attempt, pools, pathways,
      totalDays: Number(req.body?.journeyDays) || content.journeyDays || 90,
      currentDay: 1,
    });

    res.json({
      sampleFromRealStudent: !!real,
      days,
      weeks: roadmap.phases.flatMap(p => p.weeks.map(w => ({ week: w.week, theme: w.theme, goal: w.goal, focusLabels: w.focusLabels }))),
      totalXp: roadmap.totalXp,
      totalDaysGenerated: roadmap.totalDays,
    });
  } catch (e: any) {
    console.error('[passport] previewContent:', e);
    res.status(500).json({ message: e.message || 'Failed to build preview' });
  }
};
