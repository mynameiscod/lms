import { Response } from 'express';
import PassportAssessment from '../models/PassportAssessment';
import PassportContent from '../models/PassportContent';
import PassportConfig from '../models/PassportConfig';
import { AuthRequest } from '../types/express';
import { CAREER_STAGES, coverageByStage } from '../services/careerStageService';

/**
 * One screen for all career-stage tagging.
 *
 * Tagging lives here rather than being sprinkled through the assessment and mission
 * editors because the question an admin actually has is cross-cutting: "does the
 * foundation stage have enough to work with?" That cannot be answered from inside a
 * single question's edit form, and a stage holding four questions still produces a score
 * out of 100 with nothing to indicate it is meaningless.
 */

const tid = (req: AuthRequest) => String(req.user?.tenantId || '');
const fail = (res: Response, c: number, m: string) => res.status(c).json({ success: false, message: m });

/** Below this, a stage's paper or plan is too thin to produce a fair result. */
const THIN = 8;

export const getStaging = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tid(req);
    const [assessment, content, config] = await Promise.all([
      PassportAssessment.findOne({ tenantId }).lean(),
      PassportContent.findOne({ tenantId }).lean(),
      PassportConfig.findOne({ tenantId }).lean(),
    ]);

    // Goal names come from the signup form's own options rather than a list kept here.
    // A tag that does not match what students actually pick reaches nobody, and nothing
    // else in the system would report that — so there must be only one list.
    const goalField = ((config as any)?.onboardingFields || []).find((f: any) => f.key === 'careerGoal');
    const goalOptions: string[] = (goalField?.options || [])
      .filter((g: string) => !/not sure/i.test(g));   // the undecided are never narrowed

    const questions = ((assessment as any)?.questions || []).map((q: any) => ({
      id: String(q._id), text: q.text, category: q.category,
      stages: q.stages || [], background: q.background || 'any', goals: q.goals || [],
    }));

    const missions: any[] = [];
    for (const pool of ((content as any)?.missionPools || [])) {
      for (const it of (pool.items || [])) {
        missions.push({
          category: pool.category, title: it.title,
          stages: it.stages || [], background: it.background || 'any', goals: it.goals || [],
        });
      }
    }

    const qCov = coverageByStage(questions);
    const mCov = coverageByStage(missions);

    res.json({
      success: true,
      data: {
        stages: CAREER_STAGES,
        goalOptions,
        // What a real student is actually served, per stage AND goal. Counting the bank
        // per stage hides the case that matters: a stage can look healthy overall while
        // one goal inside it has almost nothing aimed at it.
        goalCoverage: goalOptions.map(g => ({
          goal: g,
          byStage: CAREER_STAGES.reduce((acc: any, st) => {
            acc[st.key] = questions.filter((q: any) => {
              if (q.stages.length && !q.stages.includes(st.key)) return false;
              if (q.goals.length && !q.goals.includes(g)) return false;
              return true;
            }).length;
            return acc;
          }, {}),
        })),
        questions, missions,
        coverage: {
          questions: qCov, missions: mCov,
          // Surfaced explicitly: a thin stage is invisible until a student is scored by it.
          thinQuestionStages: Object.entries(qCov).filter(([, n]) => (n as number) < THIN).map(([k]) => k),
          thinMissionStages: Object.entries(mCov).filter(([, n]) => (n as number) < THIN).map(([k]) => k),
          threshold: THIN,
        },
        pathwaysByStage: ((content as any)?.pathways || []).reduce((acc: any, p: any) => {
          const k = p.stage || 'generic';
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (e: any) { fail(res, 500, e.message); }
};

/** Bulk-set tags. Body: { questions?: [{id, stages, goals, background}], missions?: [{category,title,stages,goals,background}] } */
export const setStaging = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = tid(req);
    let touched = 0;

    const qs = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (qs.length) {
      const a: any = await PassportAssessment.findOne({ tenantId });
      if (!a) return fail(res, 404, 'No assessment for this tenant');
      for (const patch of qs) {
        const q = a.questions.id ? a.questions.id(patch.id) : a.questions.find((x: any) => String(x._id) === patch.id);
        if (!q) continue;
        if (Array.isArray(patch.stages)) q.stages = patch.stages;
        if (Array.isArray(patch.goals)) q.goals = patch.goals;
        if (patch.background) q.background = patch.background;
        touched++;
      }
      a.markModified('questions');
      await a.save();
    }

    const ms = Array.isArray(req.body?.missions) ? req.body.missions : [];
    if (ms.length) {
      const c: any = await PassportContent.findOne({ tenantId });
      if (!c) return fail(res, 404, 'No content for this tenant');
      for (const patch of ms) {
        const pool = (c.missionPools || []).find((p: any) => p.category === patch.category);
        if (!pool) continue;
        const it = (pool.items || []).find((x: any) => x.title === patch.title);
        if (!it) continue;
        if (Array.isArray(patch.stages)) it.stages = patch.stages;
        if (Array.isArray(patch.goals)) it.goals = patch.goals;
        if (patch.background) it.background = patch.background;
        touched++;
      }
      c.markModified('missionPools');
      await c.save();
    }

    res.json({ success: true, data: { touched } });
  } catch (e: any) { fail(res, 500, e.message); }
};
