import { Request, Response } from 'express';
import PassportConfig from '../models/PassportConfig';
import { resolveRoadmapV2 } from '../data/roadmapV2Policy';
import { isTopicPriority } from '../data/topicPriorityPolicy';
import {
  PRIORITY_STAGES, PriorityStage, listStagePriorities, setTopicPriority, stageBudgets, loadAllStages,
  computeDraft, applyDraft, StageDraft,
} from '../services/topicPriorityService';
import { getApplied, recordApplied } from '../migrations/roadmap-v2/_ledger';

/** The ledger id migration RV2_M001 records under; the screen's draft shares it. */
const DRAFT_MIGRATION = 'RV2_M001_topicPriorityDraft';
import { summarisePriorities } from '../data/topicPriorityPolicy';

/**
 * Admin: Roadmap V2 settings and topic priorities.
 *
 * Settings are saved through the ordinary CareerPilot config endpoint (PUT /passport/config with
 * `roadmapV2`), so they share its validation and its audit. This controller reads them back with
 * the numbers an admin needs to set them well, and edits topic priorities.
 */
const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const actorOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || 'admin');
const stageOf = (raw: unknown): PriorityStage | null => {
  const s = String(raw || '').toLowerCase().trim();
  return (PRIORITY_STAGES as readonly string[]).includes(s) ? s as PriorityStage : null;
};

/** GET /passport/admin/roadmap-v2 — the switch, the two numbers, and every year's budget at them. */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [cfg, all] = await Promise.all([
      PassportConfig.findOne({ tenantId }).select('roadmapV2').lean() as any,
      loadAllStages(tenantId),
    ]);
    const budgets = await stageBudgets(tenantId, all);
    res.json({
      settings: resolveRoadmapV2(cfg?.roadmapV2),
      stages: PRIORITY_STAGES.map(stage => ({
        stage,
        available: !!all[stage].curriculumId,
        topics: all[stage].topics.length,
        budget: budgets[stage],
        summary: summarisePriorities(all[stage].topics.map(t => ({ minutes: t.minutes, priority: t.priority }))),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load Roadmap V2.' });
  }
};

/** GET /passport/admin/topic-priorities/:stage — one year's topics with their priority. */
export const listTopics = async (req: Request, res: Response) => {
  try {
    const stage = stageOf(req.params.stage);
    if (!stage) return res.status(400).json({ message: 'Unknown year.' });
    res.json(await listStagePriorities(tenantOf(req), stage));
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load the topics.' });
  }
};

/**
 * PUT /passport/admin/topic-priorities/:stage/:topicCode  { priority }
 *
 * An admin's choice is final — the draft never changes it again. It governs roadmaps built from
 * now on; a roadmap already being followed is not re-cut by it.
 */
export const updateTopic = async (req: Request, res: Response) => {
  try {
    const stage = stageOf(req.params.stage);
    if (!stage) return res.status(400).json({ message: 'Unknown year.' });
    const priority = (req.body || {}).priority;
    if (!isTopicPriority(priority)) return res.status(400).json({ message: 'Priority must be MUST, SHOULD or OPTIONAL.' });
    const ok = await setTopicPriority(tenantOf(req), stage, String(req.params.topicCode), priority, actorOf(req));
    if (!ok) return res.status(404).json({ message: 'That topic is not in this year’s curriculum.' });
    res.json(await listStagePriorities(tenantOf(req), stage));
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not save the priority.' });
  }
};

/**
 * The draft priorities, from the admin screen — so production needs no shell to get them.
 *
 * GET previews what the draft would set (nothing written); POST writes it. Both go through the
 * same code as migration RV2_M001, and an admin-set priority is never changed. The first write
 * is recorded in the same ledger the migration uses, so the migration's --rollback can still
 * return the curricula to exactly how they were before V2.
 */
export const previewDraft = async (req: Request, res: Response) => {
  try {
    const drafts = await computeDraft(tenantOf(req));
    res.json({ stages: drafts.map(draftView) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not compute the draft.' });
  }
};

export const applyDraftNow = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const drafts = await computeDraft(tenantId);
    const { written, prior } = await applyDraft(tenantId, drafts, actorOf(req));
    if (written && !(await getApplied(DRAFT_MIGRATION, tenantId))) {
      await recordApplied({
        migration: DRAFT_MIGRATION, tenantId, appliedBy: actorOf(req),
        gitCommit: process.env.GIT_COMMIT || 'admin-screen', counts: { written }, prior,
      });
    }
    res.json({ written, stages: drafts.map(draftView) });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not apply the draft.' });
  }
};

/** What the screen needs from a draft: the counts, and how many topics it would change. */
const draftView = (d: StageDraft) => ({
  stage: d.stage,
  available: !!d.curriculumId,
  budget: d.budget,
  after: d.after,
  changes: d.rows.filter(r => r.source !== 'ADMIN' && r.current !== r.draft).length,
  adminSet: d.rows.filter(r => r.source === 'ADMIN').length,
  overCap: d.overCap,
});
