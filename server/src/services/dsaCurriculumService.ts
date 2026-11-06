import mongoose from 'mongoose';
import DsaModule from '../models/DsaModule';
import VisualizerItem from '../models/VisualizerItem';
import CodingProblem, { availableTo } from '../models/CodingProblem';
import ProblemSet from '../models/ProblemSet';
import ProblemSubmission from '../models/ProblemSubmission';
import { globalPracticeClause } from './contentGrantService';
import { PbError, visibilityFilter } from './problemBankService';
import { Learner, inAudience, saveSet } from './problemDeliveryService';
import { DSA_CURRICULUM, DSA_SEED_VERSION } from '../data/dsaCurriculum';

/**
 * The DSA curriculum (Code Visualizer → Learn). Reads only: modules, their linked Visualizer items,
 * and the Problem Bank problems that carry each module's topics. Nothing is copied: a problem
 * appears in a module because of its topic tags, so the bank stays the single source of problems.
 */

const DIFFS = ['easy', 'medium', 'hard'] as const;
type Diff = typeof DIFFS[number];

/** Published problems this learner may see: their institute's own, plus the shared library as granted. */
async function problemScope(l: Learner) {
  const shared = await globalPracticeClause(l.tenantId);
  const and: any[] = [{ $or: [...(shared ? [shared] : []), { scope: 'tenant', tenantId: l.tenantId }] }];
  // Staff see everything their institute can use; learners only what is released to their product.
  if (!l.isStaff) and.push(availableTo(l.isCareerPilot && !l.isLms ? 'careerpilot' : 'lms'));
  return { status: 'published', $and: and };
}

/* Problem counts per module change rarely; they are the same for everyone in an institute and product. */
const cache = new Map<string, { at: number; data: any }>();
const TTL_MS = 10 * 60_000;
export const __clearDsaCache = () => cache.clear();

async function moduleCounts(l: Learner, modules: { slug: string; problemTopics: string[] }[]) {
  const key = `${l.tenantId}:${l.isStaff ? 'staff' : l.isCareerPilot && !l.isLms ? 'cp' : 'lms'}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as Record<string, Record<Diff | 'total', number>>;
  const scope = await problemScope(l);
  const out: Record<string, Record<Diff | 'total', number>> = {};
  await Promise.all(modules.map(async (m) => {
    const rows: any[] = m.problemTopics.length
      ? await CodingProblem.aggregate([{ $match: { ...scope, topics: { $in: m.problemTopics } } }, { $group: { _id: '$difficulty', n: { $sum: 1 } } }])
      : [];
    const c: Record<Diff | 'total', number> = { easy: 0, medium: 0, hard: 0, total: 0 };
    for (const r of rows) if ((DIFFS as readonly string[]).includes(r._id)) { c[r._id as Diff] = r.n; c.total += r.n; }
    out[m.slug] = c;
  }));
  cache.set(key, { at: Date.now(), data: out });
  return out;
}

/** Problems this learner has an accepted (AC) submission for, with their topics. */
async function solvedTopics(userId: string) {
  const solvedIds: any[] = await ProblemSubmission.distinct('problemId', { userId, verdict: 'AC' });
  if (!solvedIds.length) return [] as { _id: any; topics: string[] }[];
  return CodingProblem.find({ _id: { $in: solvedIds } }).select('topics').lean() as any;
}

const LESSON_FIELDS = ['overview', 'objectives', 'concepts', 'internals', 'javaExamples', 'complexity', 'mistakes', 'edgeCases', 'assignments', 'interviewQuestions'] as const;
const hasLesson = (m: any) => !!(m.overview && String(m.overview).trim());

export async function listModules(l: Learner) {
  const modules: any[] = await DsaModule.find({ tenantId: l.tenantId, published: true }).sort({ order: 1 }).lean();
  if (!modules.length) return { modules: [], seeded: false };
  const [counts, solved] = await Promise.all([moduleCounts(l, modules), solvedTopics(l.userId)]);
  return {
    seeded: true,
    modules: modules.map((m) => {
      const topics = new Set<string>(m.problemTopics || []);
      return {
        slug: m.slug, order: m.order, title: m.title, summary: m.summary, stage: m.stage,
        prerequisites: m.prerequisites || [],
        hasLesson: hasLesson(m),
        visualizerCount: (m.visualizerSlugs || []).length,
        widgets: m.widgets || [],
        problems: counts[m.slug] || { easy: 0, medium: 0, hard: 0, total: 0 },
        solved: solved.filter((p: any) => (p.topics || []).some((t: string) => topics.has(t))).length,
      };
    }),
  };
}

export async function getModule(l: Learner, slug: string) {
  const m: any = await DsaModule.findOne({ tenantId: l.tenantId, slug: String(slug).toLowerCase(), published: true }).lean();
  if (!m) throw new PbError('This module was not found.', 404);

  const scope = await problemScope(l);
  const topicMatch = m.problemTopics?.length ? { topics: { $in: m.problemTopics } } : { _id: null };
  const PER_DIFF = 12;
  const [visualizers, byDiff, counts, solvedRows, prereqs, sets] = await Promise.all([
    VisualizerItem.find({ tenantId: l.tenantId, slug: { $in: m.visualizerSlugs || [] }, published: true })
      .select('kind title slug topic difficulty summary timeComplexity spaceComplexity conceptWidget').lean(),
    Promise.all(DIFFS.map((d) => CodingProblem.find({ ...scope, ...topicMatch, difficulty: d })
      .select('number slug title difficulty topics companies languages.language')
      .sort({ number: 1 }).limit(PER_DIFF).lean())),
    moduleCounts(l, [m]).then((c) => c[m.slug]),
    ProblemSubmission.aggregate([
      { $match: { userId: l.userId } },
      { $group: { _id: '$problemId', solved: { $max: { $cond: [{ $eq: ['$verdict', 'AC'] }, 1, 0] } } } },
    ]),
    DsaModule.find({ tenantId: l.tenantId, slug: { $in: m.prerequisites || [] } }).select('slug title order').lean(),
    (m.practiceSets || []).length
      ? ProblemSet.find({ tenantId: l.tenantId, _id: { $in: (m.practiceSets || []).map((s: any) => s.setId).filter((id: string) => mongoose.isValidObjectId(id)) } })
        .select('title status audience opensAt items').lean()
      : Promise.resolve([] as any[]),
  ]);

  const state = new Map<string, 'solved' | 'attempted'>();
  for (const r of solvedRows) state.set(String(r._id), r.solved ? 'solved' : 'attempted');
  const problems: Record<Diff, any[]> = { easy: [], medium: [], hard: [] };
  DIFFS.forEach((d, i) => {
    problems[d] = (byDiff[i] as any[]).map((p) => ({
      _id: p._id, number: p.number, slug: p.slug, title: p.title, difficulty: p.difficulty,
      topics: p.topics || [], companies: (p.companies || []).slice(0, 3),
      hasJava: (p.languages || []).some((x: any) => x.language === 'java'),
      status: state.get(String(p._id)) || 'todo',
    }));
  });

  // Practice sets the learner may open (staff see every set the module created, including drafts).
  const practiceSets = (sets as any[]).filter((s) => l.isStaff || (s.status !== 'draft' && inAudience(s, l)
    && (!s.opensAt || new Date(s.opensAt).getTime() <= Date.now())))
    .map((s) => {
      const link = (m.practiceSets || []).find((p: any) => String(p.setId) === String(s._id));
      return { setId: String(s._id), title: s.title, status: s.status, difficulty: link?.difficulty, problems: (s.items || []).length };
    });

  const lesson: Record<string, any> = {};
  for (const f of LESSON_FIELDS) lesson[f] = m[f];
  return {
    slug: m.slug, order: m.order, title: m.title, summary: m.summary, stage: m.stage,
    prerequisites: (m.prerequisites || []).map((s: string) => prereqs.find((p: any) => p.slug === s) || { slug: s, title: s }),
    hasLesson: hasLesson(m),
    ...lesson,
    widgets: m.widgets || [],
    problemTopics: m.problemTopics || [],
    visualizers: (m.visualizerSlugs || []).map((s: string) => visualizers.find((v: any) => v.slug === s)).filter(Boolean),
    problems, problemCounts: counts,
    practiceSets,
  };
}

/* ── Admin ────────────────────────────────────────────────────────────────────────────────── */

/**
 * Seed (or refresh) the 22 modules for an institute. New modules are created; a module that was
 * seeded from an older revision and never edited by an admin is refreshed. Edited modules and their
 * practice sets are never touched.
 */
export async function seedModules(tenantId: string, userId: string) {
  let created = 0; let refreshed = 0;
  for (const s of DSA_CURRICULUM) {
    const content = {
      order: s.order, title: s.title, summary: s.summary, stage: s.stage, prerequisites: s.prerequisites,
      problemTopics: s.problemTopics, visualizerSlugs: s.visualizerSlugs || [], widgets: s.widgets || [],
      overview: s.overview || '', objectives: s.objectives || [], concepts: s.concepts || [], internals: s.internals || [],
      javaExamples: s.javaExamples || [], complexity: s.complexity || [], mistakes: s.mistakes || [], edgeCases: s.edgeCases || [],
      assignments: s.assignments || [], interviewQuestions: s.interviewQuestions || [], seedVersion: DSA_SEED_VERSION,
    };
    const existing: any = await DsaModule.findOne({ tenantId, slug: s.slug }).select('seedVersion editedBy').lean();
    if (!existing) {
      await DsaModule.create({ tenantId, slug: s.slug, ...content, published: true, createdBy: userId });
      created++;
    } else if (!existing.editedBy && (existing.seedVersion || 0) < DSA_SEED_VERSION) {
      await DsaModule.updateOne({ _id: existing._id }, { $set: content });
      refreshed++;
    }
  }
  __clearDsaCache();
  return { created, refreshed, total: DSA_CURRICULUM.length, version: DSA_SEED_VERSION };
}

const SET_SIZES: Record<Diff, number> = { easy: 10, medium: 8, hard: 5 };

/**
 * Create one Easy, one Medium and one Hard practice set for a module from verified Java problems
 * with the module's topics. Sets are created as DRAFTS with no audience: an admin reviews them in
 * Problem Sets, chooses who gets them and publishes — exactly like any other set.
 */
export async function createPracticeSets(a: { tenantId: string; userId: string; role: string }, slug: string) {
  const m: any = await DsaModule.findOne({ tenantId: a.tenantId, slug: String(slug).toLowerCase() });
  if (!m) throw new PbError('This module was not found.', 404);
  if (!(m.problemTopics || []).length) throw new PbError('This module has no Problem Bank topics yet.');

  const existing = (m.practiceSets || []).filter((p: any) => mongoose.isValidObjectId(p.setId));
  if (existing.length) {
    const still = await ProblemSet.countDocuments({ tenantId: a.tenantId, _id: { $in: existing.map((p: any) => p.setId) } });
    if (still) throw new PbError('Practice sets already exist for this module. Edit them in Problem Sets.', 409);
  }

  const visible = await visibilityFilter(a);
  const created: { difficulty: Diff; setId: string; createdAt: Date }[] = [];
  const summary: { difficulty: Diff; setId: string; problems: number }[] = [];
  for (const d of DIFFS) {
    const picks: any[] = await CodingProblem.find({
      $and: [visible], status: 'published', difficulty: d, topics: { $in: m.problemTopics },
      'languages.language': 'java', 'verification.status': 'verified',
    }).select('_id').sort({ number: 1 }).limit(SET_SIZES[d]).lean();
    if (!picks.length) continue;
    const label = d.charAt(0).toUpperCase() + d.slice(1);
    const set = await saveSet(a, null, {
      title: `${m.title} — ${label} practice`,
      description: `Practice for the "${m.title}" module of the DSA curriculum (${label.toLowerCase()} problems, Java).`,
      kind: 'practice', status: 'draft',
      items: picks.map((p) => ({ problemId: String(p._id) })),
    });
    created.push({ difficulty: d, setId: String(set._id), createdAt: new Date() });
    summary.push({ difficulty: d, setId: String(set._id), problems: picks.length });
  }
  if (!created.length) throw new PbError('No verified Java problems were found for this module\'s topics.');
  m.practiceSets = created as any;
  await m.save();
  return { sets: summary };
}
