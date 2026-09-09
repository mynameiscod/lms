/**
 * The stage curriculum screen's endpoints.
 *
 * READ IS ONE CALL. The screen shows modules, topics, skills and per-skill question counts
 * together because the useful question — "what does this stage teach that it cannot measure?" —
 * needs all four at once. Splitting them would put the join in the browser, where every client
 * would have to repeat it and get it right.
 */

import { Request, Response } from 'express';
import { getStageCurriculum } from '../services/stageCurriculumService';
import {
  saveModule, deleteModule, createTopic, updateTopic, deleteTopic,
} from '../services/stageCurriculumEditService';
import { CAREER_STAGES } from '../services/careerStageService';

const tenantOf = (req: Request): string =>
  String((req as any).tenantId || (req as any).user?.tenantId || '');

/** A stage nobody can be derived into would be a screen editing something no student reaches. */
const knownStage = (stage: string): boolean => CAREER_STAGES.some(s => s.key === stage);

const fail = (res: Response, e: any, fallback: string) => {
  const msg = e?.message || fallback;
  // Author errors — a missing skill, a module that still has topics — are the admin's to fix and
  // must reach them verbatim. Anything else is ours and is logged rather than shown.
  const isAuthor = /does not exist|still has|needs a|No such|already used|marked as the/.test(msg);
  if (!isAuthor) console.error('[stage-curriculum]', msg);
  res.status(isAuthor ? 400 : 500).json({ message: isAuthor ? msg : fallback });
};

/** GET /passport/stage-curriculum — which stages exist, for the tabs. */
export const listStages = async (_req: Request, res: Response) => {
  res.json({ stages: CAREER_STAGES });
};

/** GET /passport/stage-curriculum/:stage */
export const getStage = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    if (!knownStage(stage)) return res.status(404).json({ message: `Unknown stage "${stage}".` });
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not load the stage curriculum.');
  }
};

/** PUT /passport/stage-curriculum/:stage/modules — create or rename one module. */
export const putModule = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    if (!knownStage(stage)) return res.status(404).json({ message: `Unknown stage "${stage}".` });
    await saveModule(tenantOf(req), stage, req.body || {});
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not save the module.');
  }
};

/** DELETE /passport/stage-curriculum/:stage/modules/:moduleCode */
export const removeModule = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    await deleteModule(tenantOf(req), stage, String(req.params.moduleCode));
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not delete the module.');
  }
};

/** POST /passport/stage-curriculum/:stage/topics */
export const postTopic = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    if (!knownStage(stage)) return res.status(404).json({ message: `Unknown stage "${stage}".` });
    await createTopic(tenantOf(req), stage, req.body || {});
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not create the topic.');
  }
};

/** PUT /passport/stage-curriculum/:stage/topics/:topicId */
export const putTopic = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    await updateTopic(tenantOf(req), stage, String(req.params.topicId), req.body || {});
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not save the topic.');
  }
};

/** DELETE /passport/stage-curriculum/:stage/topics/:topicId */
export const removeTopic = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    await deleteTopic(tenantOf(req), stage, String(req.params.topicId));
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not delete the topic.');
  }
};
