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
  reorderModules, reorderTopics,
} from '../services/stageCurriculumEditService';
import { CAREER_STAGES } from '../services/careerStageService';

const tenantOf = (req: Request): string =>
  String((req as any).tenantId || (req as any).user?.tenantId || '');

/** A stage nobody can be derived into would be a screen editing something no student reaches. */
const knownStage = (stage: string): boolean => CAREER_STAGES.some(s => s.key === stage);

const fail = (res: Response, e: any, fallback: string) => {
  const msg = e?.message || fallback;

  /**
   * An author error is one the caller can fix, and it must reach them verbatim.
   *
   * Preferred signal is a TYPED status, which the skill registry service sets — the pattern
   * list below is the older mechanism and is kept for the errors this file's own services
   * throw as bare Errors. Growing that regex every time a message is reworded is how a
   * perfectly good validation error starts being reported as "something went wrong": the
   * refusal was correct, the status was 500, and the screen told the author to try again.
   */
  const isAuthor = e?.status === 400
    || /does not exist|still has|needs a|No such|already used|marked as the|no skill exists/
      .test(msg)
    || /Nothing to reorder|appears more than once|are not topics|is not a topic|no topics to reorder/
      .test(msg)
    || /is a group|are groups|retired|cannot be newly selected|Which module/.test(msg);

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

/**
 * POST /passport/stage-curriculum/:stage/modules/reorder — one intention, one request.
 *
 * The counterpart of the Learning Unit reorder route, and added for the same reason: without it
 * an author reorders by editing displayOrder numbers by hand, one module at a time, and a single
 * typo puts two modules in one position with nothing to report it.
 */
export const postModuleOrder = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    if (!knownStage(stage)) return res.status(404).json({ message: `Unknown stage "${stage}".` });
    const order = Array.isArray(req.body?.order) ? req.body.order.map(String) : [];
    await reorderModules(tenantOf(req), stage, order);
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not reorder the modules.');
  }
};

/** POST /passport/stage-curriculum/:stage/topics/reorder — topics within one module. */
export const postTopicOrder = async (req: Request, res: Response) => {
  try {
    const stage = String(req.params.stage);
    if (!knownStage(stage)) return res.status(404).json({ message: `Unknown stage "${stage}".` });
    const moduleCode = String(req.body?.moduleCode || '');
    if (!moduleCode) return res.status(400).json({ message: 'Which module are these topics in?' });
    const order = Array.isArray(req.body?.order) ? req.body.order.map(String) : [];
    await reorderTopics(tenantOf(req), stage, moduleCode, order);
    res.json(await getStageCurriculum(tenantOf(req), stage));
  } catch (e: any) {
    fail(res, e, 'Could not reorder the topics.');
  }
};
