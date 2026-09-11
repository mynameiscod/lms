/**
 * The Year-1 modules, expressed as the skill set a first-year is planned against.
 *
 * WHY THIS FILE EXISTS — TWO CURRICULA WERE NOT ONE.
 *
 * `FOUNDATION_MODULES` describes the first year: fifteen modules, thirty-nine topics, mapped to
 * canonical skills. Separately, the CareerPilot roadmap builds a student's ninety days from a
 * list of REQUIRED SKILLS — a role blueprint, or for somebody who has not chosen a role, a
 * StageSkillSet. Nothing joined the two. A tenant could seed the whole Year-1 curriculum and a
 * first-year student's roadmap would still be planned from something else entirely, so the
 * modules were a document rather than a syllabus anybody walked.
 *
 * THE JOIN IS DATA, NOT A CODE PATH. StageSkillSet already exists, is already resolved into
 * blueprint shape by `getStageBlueprint`, and is already consumed by readiness, the paper
 * builder and the planner without any of them knowing it is not a role. So the Year-1 modules
 * become the FOUNDATION stage's set, and every one of those consumers picks them up with no
 * second branch to maintain. A parallel "foundation planner" would have been a second opinion
 * about what a student needs, and two opinions eventually disagree in front of the student.
 *
 * ONLY UNIVERSAL IS TURNED ON. The map's own doctrine is that universal is not the same as
 * everything — web fundamentals are direction work, C is academic support a particular
 * university happens to require. Those are written into the set so an admin can see them and
 * switch them on, and left inactive so that seeding does not quietly commit every student to
 * every module. That is also the honest position technically: a stage set has no notion of
 * direction, so it cannot do the `applicableDirections` filtering the adaptive curriculum path
 * does, and turning those rows on would teach everyone everything while looking personalised.
 *
 * PURE. No database, no clock. The seed script writes what this returns; the tests read it
 * directly.
 */

import {
  SkillImportance, SkillTargetLevel, DEFAULT_WEIGHT,
} from '../../models/RoleSkillBlueprint';
import type { IStageSkillRequirement } from '../../models/StageSkillSet';
import type { LearningDepth } from '../../data/adaptiveCurriculumPolicy';
import {
  FOUNDATION_MODULES, FoundationCategory, isMandatoryCategory,
} from './foundationSkillMap';

/** The stage a first-year is already derived into. Not a role, and never a real role key. */
export const FOUNDATION_STAGE = 'foundation';

export const FOUNDATION_SET_LABEL = 'CareerPilot Year 1 — Foundation';

/**
 * Category to importance.
 *
 * Follows the five categories as the map defines them rather than inventing a sixth judgement:
 * universal is what every student is expected to have, direction work matters to the students
 * it applies to, academic support serves the degree, and the last two are extra by definition.
 */
export const IMPORTANCE_BY_CATEGORY: Record<FoundationCategory, SkillImportance> = {
  UNIVERSAL: 'ESSENTIAL',
  DIRECTION: 'IMPORTANT',
  ACADEMIC: 'SUPPORTING',
  EXPLORATION: 'SUPPORTING',
  ENRICHMENT: 'OPTIONAL',
};

/**
 * Authored depth to the level a student is measured against.
 *
 * A first year is a foundation year, so most of this lands on FOUNDATION (target 40) rather
 * than WORKING. Setting a working target on everything would report every first-year as far
 * from ready at a point where being early is the expected state, and would spend the ninety
 * days pushing past a bar nobody asked them to clear yet.
 */
export const TARGET_BY_DEPTH: Record<LearningDepth, SkillTargetLevel> = {
  FOUNDATION: 'FOUNDATION',
  GUIDED:     'FOUNDATION',
  REVISION:   'FOUNDATION',
  STANDARD:   'WORKING',
  CHALLENGE:  'PROFICIENT',
};

const IMPORTANCE_RANK: Record<SkillImportance, number> = {
  ESSENTIAL: 4, IMPORTANT: 3, SUPPORTING: 2, OPTIONAL: 1,
};
const TARGET_RANK: Record<SkillTargetLevel, number> = {
  FOUNDATION: 1, WORKING: 2, PROFICIENT: 3, ADVANCED: 4,
};

export interface FoundationRequirementOrigin {
  skillKey: string;
  moduleCode: string;
  moduleName: string;
  topicCode: string;
  topicTitle: string;
  category: FoundationCategory;
}

export interface FoundationStageSet {
  requirements: IStageSkillRequirement[];
  /** Every place a skill is taught, in module order — provenance for the admin screen. */
  origins: FoundationRequirementOrigin[];
  summary: {
    modules: number;
    topics: number;
    skills: number;
    active: number;
    inactive: number;
    byCategory: Record<FoundationCategory, number>;
    byImportance: Record<string, number>;
  };
}

const shorten = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);

/**
 * The Year-1 modules as stage requirements, in module order.
 *
 * ONE ROW PER SKILL, NOT PER TOPIC. A skill taught in two topics is still one thing a student
 * is measured on — SHELL_COMMANDS appears under both files and pipelines — and two rows for it
 * would double its weight in the readiness figure and buy it twice the roadmap time. So
 * repeats merge, keeping the strongest claim any topic makes: the highest importance, the
 * highest target, and the earliest position.
 */
export function foundationStageRequirements(): FoundationStageSet {
  const byKey = new Map<string, IStageSkillRequirement & { _category: FoundationCategory }>();
  const origins: FoundationRequirementOrigin[] = [];
  const seenIn = new Map<string, number>();

  let topics = 0;
  let order = 0;

  const modules = FOUNDATION_MODULES.slice().sort((a, b) => a.displayOrder - b.displayOrder);

  for (const m of modules) {
    for (const t of m.topics) {
      topics++;
      order++;
      const importance = IMPORTANCE_BY_CATEGORY[t.category];
      const targetLevel = TARGET_BY_DEPTH[t.defaultDepth] || 'FOUNDATION';
      // Only the universal spine is switched on. See the header: the rest is written down so an
      // admin can choose it, not switched on so a seed can choose it for them.
      const active = isMandatoryCategory(t.category);

      for (const raw of t.skillKeys) {
        const key = String(raw).toUpperCase();
        origins.push({
          skillKey: key,
          moduleCode: m.moduleCode, moduleName: m.moduleName,
          topicCode: t.topicCode, topicTitle: t.title,
          category: t.category,
        });
        seenIn.set(key, (seenIn.get(key) || 0) + 1);

        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, {
            skillKey: key,
            importance,
            weight: DEFAULT_WEIGHT[importance],
            targetLevel,
            active,
            // Module order, so the set reads as the curriculum does rather than alphabetically.
            displayOrder: order * 10,
            _category: t.category,
            note: shorten(`${m.moduleCode} · ${t.title} (${t.category})`, 200),
          });
          continue;
        }

        // Merge: the strongest claim wins on every axis, and an inactive row becomes active the
        // moment any mandatory topic teaches the same skill.
        if (IMPORTANCE_RANK[importance] > IMPORTANCE_RANK[prev.importance as SkillImportance]) {
          prev.importance = importance;
          prev.weight = DEFAULT_WEIGHT[importance];
          prev._category = t.category;
        }
        if (TARGET_RANK[targetLevel] > TARGET_RANK[prev.targetLevel as SkillTargetLevel]) {
          prev.targetLevel = targetLevel;
        }
        prev.active = prev.active || active;
      }
    }
  }

  const requirements = [...byKey.values()]
    .sort((a, b) => a.displayOrder - b.displayOrder || a.skillKey.localeCompare(b.skillKey))
    .map(r => {
      const times = seenIn.get(r.skillKey) || 1;
      const { _category, ...req } = r;
      return {
        ...req,
        note: times > 1
          ? shorten(`${req.note} +${times - 1} more topic${times === 2 ? '' : 's'}`, 240)
          : req.note,
      } as IStageSkillRequirement;
    });

  const byCategory = {
    UNIVERSAL: 0, DIRECTION: 0, ACADEMIC: 0, EXPLORATION: 0, ENRICHMENT: 0,
  } as Record<FoundationCategory, number>;
  for (const o of origins) byCategory[o.category]++;

  const byImportance: Record<string, number> = {};
  for (const r of requirements) byImportance[r.importance] = (byImportance[r.importance] || 0) + 1;

  return {
    requirements,
    origins,
    summary: {
      modules: modules.length,
      topics,
      skills: requirements.length,
      active: requirements.filter(r => r.active).length,
      inactive: requirements.filter(r => !r.active).length,
      byCategory,
      byImportance,
    },
  };
}
