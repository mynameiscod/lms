import { Request, Response } from 'express';
import PassportContent from '../models/PassportContent';
import PassportConfig from '../models/PassportConfig';
import PassportAssessment, { categoriesOf } from '../models/PassportAssessment';
import User from '../models/User';
import { memberAxes, CAREER_STAGES } from '../services/careerStageService';
import { matchPathway, validateRules, MatchMember } from '../services/pathwayMatchService';
import { draftPathwayRule } from '../services/pathwayRuleDraftService';

/**
 * Pathway routing rules — the admin side of who gets which pathway.
 *
 * The rules themselves live on PassportContent.pathways[].match and are saved through the
 * existing content endpoint. What lives here is everything that makes them safe to write:
 * the vocabulary an admin picks from, a preview against real members, and a re-evaluation
 * that shows its diff before it moves anybody.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');

/**
 * The members whose routing can actually be predicted, in the shape the matcher wants.
 *
 * Scoped to those with a career score — i.e. who have COMPLETED the assessment — for two
 * reasons. A member who has joined but not been assessed has no scores for a rule to test,
 * so counting them would report everyone as falling to the fallback and make the preview
 * read as broken. And the passport object alone is not proof of membership: staff accounts
 * that went near the member surfaces carry one too, and they must never be counted here or
 * touched by a re-route.
 */
async function loadMembers(tenantId: string): Promise<(MatchMember & {
  id: string; name: string; email: string; current: string | null;
})[]> {
  const users = await User.find({
    tenantId,
    'passport.careerScore': { $ne: null, $exists: true },
  }).select('firstName lastName email passport studentProfile').lean() as any[];

  return users.map(u => {
    const axes = memberAxes(u);
    return {
      id: String(u._id),
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
      email: u.email,
      current: u.passport?.pathway || null,
      careerGoal: u.passport?.careerGoal || axes.careerGoal,
      stage: axes.stage,
      background: axes.background,
      careerScore: typeof u.passport?.careerScore === 'number' ? u.passport.careerScore : null,
      // Per-category scores live on the attempt, not the user. Rules that need them are
      // resolved in preview by loading attempts; the common case (goal/stage/background
      // and overall score) is answered from the user document alone, which keeps a
      // preview over a few thousand members to one query.
      categoryScores: null,
    };
  });
}

/** Attach per-category scores, but only when some rule actually asks for one. */
async function withCategoryScores(tenantId: string, members: any[], needed: boolean) {
  if (!needed || !members.length) return members;
  const PassportAttempt = (await import('../models/PassportAttempt')).default;
  const attempts = await PassportAttempt.find({ tenantId })
    .select('studentId categoryScores createdAt')
    .sort({ createdAt: -1 })
    .lean() as any[];

  // Latest attempt per member — the sort above means the first one seen wins.
  const latest = new Map<string, any>();
  for (const a of attempts) {
    const k = String(a.studentId);
    if (!latest.has(k)) latest.set(k, a);
  }
  for (const m of members) {
    const a = latest.get(m.id);
    if (a) m.categoryScores = (a.categoryScores || []).map((c: any) => ({ key: c.key, score: c.score }));
  }
  return members;
}

const needsCategoryScores = (pathways: any[]): boolean =>
  (pathways || []).some(p => (p.match?.scores || []).some((s: any) => s.category && s.category !== 'overall'));

/**
 * GET /passport/pathway-rules/vocabulary
 *
 * What an admin is allowed to write a rule against. Goals come from the signup form's own
 * option list rather than a list kept here — a rule naming a goal students are never
 * offered matches nobody, and nothing else in the system would report that.
 */
export const getRuleVocabulary = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const [config, assessment] = await Promise.all([
      PassportConfig.findOne({ tenantId }).lean() as any,
      PassportAssessment.findOne({ tenantId }).lean() as any,
    ]);

    const goalField = ((config as any)?.onboardingFields || []).find((f: any) => f.key === 'careerGoal');

    res.json({
      goals: (goalField?.options || []).filter((g: string) => !/not sure/i.test(g)),
      stages: CAREER_STAGES.map(s => ({ key: s.key, label: s.label, who: s.who })),
      backgrounds: [
        { key: 'cs', label: 'Computing background' },
        { key: 'non_cs', label: 'Non-computing background' },
      ],
      categories: [
        { key: 'overall', label: 'Career Score (overall)' },
        ...(assessment ? categoriesOf(assessment).map((c: any) => ({ key: c.key, label: c.label })) : []),
      ],
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Could not load rule options' });
  }
};

/**
 * POST /passport/pathway-rules/preview — { pathways }
 *
 * Runs the SUBMITTED rules (not the saved ones) over every real member, so an admin sees
 * the effect before committing. Writing routing rules blind is how a pathway ends up
 * matching everybody or nobody, and neither failure announces itself.
 */
export const previewPathwayRules = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const saved = await PassportContent.findOne({ tenantId }).lean() as any;
    const pathways = Array.isArray(req.body?.pathways) && req.body.pathways.length
      ? req.body.pathways
      : (saved?.pathways || []);

    const { errors, warnings } = validateRules(pathways);

    let members = await loadMembers(tenantId);
    members = await withCategoryScores(tenantId, members, needsCategoryScores(pathways));

    const counts = new Map<string, number>();
    const samples = new Map<string, { name: string; email: string; why: string }[]>();
    let viaFallback = 0, unmatched = 0, moved = 0;

    for (const m of members) {
      const r = matchPathway(pathways, m);
      const key = r.pathway?.key || '—';
      counts.set(key, (counts.get(key) || 0) + 1);
      if (r.via === 'fallback') viaFallback++;
      if (r.via === 'none') unmatched++;
      if (m.current && key !== m.current) moved++;

      const arr = samples.get(key) || [];
      if (arr.length < 5) {
        arr.push({
          name: m.name, email: m.email,
          why: r.via === 'rule'
            ? `${m.careerGoal || 'no goal'} · ${m.stage || 'no stage'}`
            : 'no rule matched — fallback',
        });
        samples.set(key, arr);
      }
    }

    const tracks = (pathways || []).filter((p: any) => !p.stage && !String(p.key).includes(':'));

    res.json({
      total: members.length,
      errors, warnings,
      // Whether this is a description of what happens, or a simulation of what would.
      // The same numbers mean very different things either way.
      active: saved?.pathwayRulesActive === true,
      viaFallback, unmatched, moved,
      rows: tracks.map((p: any) => ({
        key: p.key,
        label: p.label,
        enabled: !!p.match?.enabled,
        fallback: !!p.match?.fallback,
        priority: p.match?.priority || 0,
        members: counts.get(p.key) || 0,
        samples: samples.get(p.key) || [],
      })),
    });
  } catch (e: any) {
    console.error('[pathway-rules] preview:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not preview' });
  }
};

/** Who the saved rules would move, and where. Shared by the diff and the apply. */
async function pendingMoves(tenantId: string) {
  const content = await PassportContent.findOne({ tenantId }).lean() as any;
  const pathways = content?.pathways || [];

  // Re-routing real members against rules that are not the ones deciding would move people
  // onto pathways that the next assessment would not have given them.
  if (content?.pathwayRulesActive !== true) {
    return { errors: ['Switch your rules on before re-routing members.'], total: 0, changes: [] as any[] };
  }

  const { errors } = validateRules(pathways);
  if (errors.length) return { errors, total: 0, changes: [] as any[] };

  let members = await loadMembers(tenantId);
  members = await withCategoryScores(tenantId, members, needsCategoryScores(pathways));

  const changes: { id: string; name: string; email: string; from: string | null; to: string; toLabel: string }[] = [];
  for (const m of members) {
    const r = matchPathway(pathways, m);
    const to = r.pathway?.key;
    if (!to || to === m.current) continue;
    changes.push({ id: m.id, name: m.name, email: m.email, from: m.current, to, toLabel: r.pathway?.label || to });
  }
  return { errors: [] as string[], total: members.length, changes };
}

/**
 * POST /passport/pathway-rules/reevaluate — the diff, and nothing else.
 *
 * A member's pathway is decided once, at assessment time, and then stays put. That is
 * deliberate: their roadmap, their authored curriculum days and their card all hang off
 * it, so re-routing someone on day 40 because an admin edited a rule would rewrite work
 * they are part-way through. This endpoint only ever reports; the apply is a separate
 * route behind a separate permission.
 */
export const reevaluatePathways = async (req: Request, res: Response) => {
  try {
    const { errors, total, changes } = await pendingMoves(tenantOf(req));
    if (errors.length) return res.status(400).json({ message: 'Fix the rule problems first.', errors });

    res.json({ applied: false, total, changes: changes.slice(0, 200), changeCount: changes.length });
  } catch (e: any) {
    console.error('[pathway-rules] reevaluate:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not re-evaluate' });
  }
};

/**
 * POST /passport/pathway-rules/reevaluate/apply — actually move them.
 *
 * Recomputed here rather than trusting a list posted by the client: the rules may have
 * been edited between showing the diff and confirming it, and moving members according to
 * a stale preview is precisely the surprise the diff exists to prevent.
 */
export const applyReevaluation = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const { errors, total, changes } = await pendingMoves(tenantId);
    if (errors.length) return res.status(400).json({ message: 'Fix the rule problems first.', errors });

    // Only the pathway is rewritten. Scores, level and streak are records of what the
    // member actually did, and are not the rules' to change.
    for (const c of changes) {
      await User.updateOne({ _id: c.id }, { $set: { 'passport.pathway': c.to } });
    }

    console.log(`[pathway-rules] ${(req as any).user?.email} re-routed ${changes.length} member(s) on ${tenantId}`);
    res.json({ applied: true, changeCount: changes.length, total });
  } catch (e: any) {
    console.error('[pathway-rules] apply:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not apply' });
  }
};

/**
 * POST /passport/pathway-rules/draft — { pathwayKey, audience }
 *
 * Plain English in, a rule block out, landing in the editor for review. The model never
 * decides a member's pathway at runtime — that has to stay deterministic — it only
 * proposes the rule an admin then reads, edits and saves.
 */
export const draftPathwayRules = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const pathwayKey = String(req.body?.pathwayKey || '');
    const audience = String(req.body?.audience || '').trim().slice(0, 500);
    if (!pathwayKey || !audience) {
      return res.status(400).json({ message: 'Pick a pathway and describe who it is for.' });
    }

    const [config, assessment, content] = await Promise.all([
      PassportConfig.findOne({ tenantId }).lean() as any,
      PassportAssessment.findOne({ tenantId }).lean() as any,
      PassportContent.findOne({ tenantId }).lean() as any,
    ]);

    const goalField = ((config as any)?.onboardingFields || []).find((f: any) => f.key === 'careerGoal');
    const pathway = (content?.pathways || []).find((p: any) => p.key === pathwayKey);

    const match = await draftPathwayRule({
      tenantId,
      pathwayLabel: pathway?.label || pathwayKey,
      audience,
      goals: (goalField?.options || []).filter((g: string) => !/not sure/i.test(g)),
      stages: CAREER_STAGES.map(s => s.key),
      categories: assessment ? categoriesOf(assessment).map((c: any) => c.key) : [],
    });

    res.json({ pathwayKey, match });
  } catch (e: any) {
    console.error('[pathway-rules] draft:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not draft a rule' });
  }
};
