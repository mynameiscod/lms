/**
 * One stage, everything about it: what it teaches, and what it can actually measure.
 *
 * WHY THIS EXISTS. The two halves of a stage lived on separate screens with nothing joining
 * them. The curriculum knew it teaches thirty-four skills across fourteen modules; the stage
 * skill set knew which fifteen could be measured; and the only way to see that Web Fundamentals
 * teaches six skills of which none can be assessed was to open both screens and diff them by
 * hand. That gap is not a reporting inconvenience — it is where the product silently stops
 * working, because a module whose skills carry no questions is taught and never measured, and
 * nothing anywhere says so.
 *
 * QUESTION COUNTS ARE PER DIFFICULTY, NOT A TOTAL. A skill with twelve easy questions and none
 * above cannot fill a paper that asks for a medium one, and a total of twelve hides that
 * completely. The bands are what the generator actually draws on, so the bands are what an
 * admin needs to see.
 *
 * COUNTED BY DISTINCT FACT WHERE THE BANK IS GENERATED. A generated bank reaches its size by
 * recombining a small set of claims, so a hundred rows can rest on one fact; counting rows would
 * report a skill as richly covered when a single question underlies all of it. Authored content
 * has no factKeys and counts one-per-item, which is correct — there, one question is one
 * question.
 */

import LearningCurriculum from '../models/LearningCurriculum';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import AssessmentItem from '../models/AssessmentItem';
import StageSkillSet from '../models/StageSkillSet';
import { policyForStage } from '../data/assessmentPolicies';
import { CAREER_STAGES } from './careerStageService';

export interface SkillNode {
  skillKey: string;
  skillName: string;
  /** Taxonomy band — FOUNDATION / INTERMEDIATE / ADVANCED. */
  difficulty: string | null;
  active: boolean;
  assessable: boolean;
  /** Distinct questions available, by the band the generator draws on. */
  questions: { easy: number; medium: number; hard: number; total: number };
  /** In this stage's skill set, so a paper may choose it. */
  inStageSet: boolean;
  /** Enough distinct questions for this stage's policy to measure it. */
  measurable: boolean;
}

export interface TopicNode {
  id: string;
  topicCode: string | null;
  title: string;
  description?: string;
  order: number;
  startDay: number;
  endDay: number;
  defaultDepth: string | null;
  mandatory: boolean;
  applicableDirections: string[];
  learningOutcomes: string[];
  prerequisiteSkillKeys: string[];
  skills: SkillNode[];
  /** Skill keys on the topic that no longer exist in the taxonomy. */
  unknownSkillKeys: string[];
}

export interface ModuleNode {
  moduleCode: string;
  moduleName: string;
  displayOrder: number;
  blurb?: string;
  topics: TopicNode[];
  /** Distinct skills across the module's topics, and how many can be measured. */
  skillCount: number;
  measurableCount: number;
}

export interface StageCurriculumView {
  stage: string;
  stageLabel: string;
  curriculum: { id: string; title: string; totalDays: number; isPublished: boolean } | null;
  policy: { skillSlots: number; maxSkills: number; itemsPerSkill: number };
  modules: ModuleNode[];
  totals: {
    modules: number; topics: number; skills: number;
    measurable: number; inStageSet: number; unmapped: number;
  };
  /** Skills the stage set measures that no topic teaches — measured, never taught. */
  measuredButNotTaught: string[];
}

/**
 * A human name for a module code, when nobody has recorded one.
 *
 * `M05_WEB_FUNDAMENTALS` becomes "Web Fundamentals". Every curriculum predates the module
 * metadata, so without this every screen would show raw codes until each was edited by hand.
 * A guess in the display layer only — the moment a real name is saved it wins.
 */
export const nameFromModuleCode = (code: string): string => {
  const raw = String(code || '').trim();
  const withoutIndex = raw.replace(/^M\d+[_-]?/i, '');
  const words = withoutIndex.replace(/[_-]+/g, ' ').trim().toLowerCase();
  // Falls back to the trimmed code, then to a generic label. Returning the code UNTRIMMED gave
  // a whitespace-only name for a whitespace-only code, which renders as a blank heading and
  // reads as a broken page rather than as a module nobody has named.
  if (!words) return raw || 'Module';
  return words.replace(/\b([a-z])/g, (_m, c) => c.toUpperCase())
    // Acronyms the title-caser would otherwise flatten.
    .replace(/\b(Cs|Dsa|Ai|Sql|Html|Css|Js|Os|Api|Http)\b/g, m => m.toUpperCase());
};

const BAND = (d: any): 'easy' | 'medium' | 'hard' | null => {
  const n = Number(d);
  if (!Number.isFinite(n)) return null;
  return n <= 2 ? 'easy' : n === 3 ? 'medium' : 'hard';
};

const WORD_BAND = (d: any): 'easy' | 'medium' | 'hard' | null => {
  const v = String(d ?? '').toLowerCase();
  if (v === 'easy') return 'easy';
  if (v === 'medium') return 'medium';
  if (v === 'hard' || v === 'expert' || v === 'interview') return 'hard';
  return null;
};

/**
 * Distinct questions per skill per band, for every skill the caller names.
 *
 * One pass over the mappings and two over the content, rather than a query per skill: a
 * fourteen-module curriculum asks about thirty-four skills, and a screen that issues thirty-four
 * round trips is a screen nobody leaves open.
 */
async function questionsBySkill(
  tenantId: string,
  skillKeys: string[],
): Promise<Map<string, { easy: number; medium: number; hard: number; total: number }>> {
  const out = new Map<string, { easy: number; medium: number; hard: number; total: number }>();
  for (const k of skillKeys) out.set(k, { easy: 0, medium: 0, hard: 0, total: 0 });
  if (!skillKeys.length) return out;

  const rows = await SkillEvidence.find({
    tenantId, skillKey: { $in: skillKeys }, contribution: 'PRIMARY', active: true,
  }).select('skillKey sourceType sourceId').lean() as any[];
  if (!rows.length) return out;

  const itemIds = [...new Set(rows.filter(r => r.sourceType === 'assessment_item').map(r => String(r.sourceId)))];
  const questionIds = [...new Set(rows.filter(r => r.sourceType === 'question').map(r => String(r.sourceId)))];

  const itemMeta = new Map<string, { band: 'easy' | 'medium' | 'hard' | null; facts: string[] }>();
  if (itemIds.length) {
    const items = await AssessmentItem.find({ _id: { $in: itemIds } })
      .select('difficulty factKeys').lean() as any[];
    for (const i of items) itemMeta.set(String(i._id), { band: BAND(i.difficulty), facts: i.factKeys || [] });
  }

  const questionBand = new Map<string, 'easy' | 'medium' | 'hard' | null>();
  if (questionIds.length) {
    const db = SkillEvidence.db;
    const qs = await db.collection('questions')
      .find({ _id: { $in: questionIds.map(id => new (require('mongoose').Types.ObjectId)(id)) } })
      .project({ difficultyLevel: 1 }).toArray();
    for (const q of qs) questionBand.set(String(q._id), WORD_BAND(q.difficultyLevel));
  }

  /**
   * Counted as distinct (skill, band, fact) triples.
   *
   * The fact is the identity where one exists, so a hundred reworded copies of one claim count
   * once. Where none exists the item's own id is its identity, which is the right answer for
   * anything hand-authored.
   */
  const seen = new Map<string, Set<string>>();
  for (const r of rows) {
    const key = String(r.skillKey).toUpperCase();
    const bucket = out.get(key);
    if (!bucket) continue;

    let band: 'easy' | 'medium' | 'hard' | null = null;
    let identities: string[] = [];

    if (r.sourceType === 'assessment_item') {
      const meta = itemMeta.get(String(r.sourceId));
      if (!meta) continue;                       // mapping points at deleted content
      band = meta.band;
      identities = meta.facts.length ? meta.facts : [`item:${r.sourceId}`];
    } else {
      band = questionBand.get(String(r.sourceId)) ?? null;
      if (!questionBand.has(String(r.sourceId)) && r.sourceType === 'question') continue;
      identities = [`${r.sourceType}:${r.sourceId}`];
    }

    // An item with no difficulty of its own can serve any band; counted as medium so it is
    // neither hidden nor triple-counted.
    const b = band || 'medium';
    for (const id of identities) {
      const dedupeKey = `${key}|${b}`;
      let set = seen.get(dedupeKey);
      if (!set) { set = new Set(); seen.set(dedupeKey, set); }
      if (set.has(id)) continue;
      set.add(id);
      bucket[b]++;
      bucket.total++;
    }
  }

  return out;
}

/** The whole stage — curriculum tree, skills, and what each skill can be measured with. */
export async function getStageCurriculum(tenantId: string, stage: string): Promise<StageCurriculumView> {
  const stageLabel = CAREER_STAGES.find(s => s.key === stage)?.label || stage;
  const policy = policyForStage(stage);

  const curriculum = await LearningCurriculum.findOne({
    tenantId, adaptiveStage: stage, personalizedFor: null,
  }).lean() as any;

  const stageSet = await StageSkillSet.findOne({ tenantId, stage }).lean() as any;
  const inSet = new Set<string>(
    ((stageSet?.requirements || []) as any[])
      .filter(r => r.active !== false)
      .map(r => String(r.skillKey).toUpperCase()),
  );

  if (!curriculum) {
    return {
      stage, stageLabel, curriculum: null,
      policy: { skillSlots: policy.skillSlots, maxSkills: policy.maxSkills, itemsPerSkill: policy.minItemsPerSkill },
      modules: [], totals: { modules: 0, topics: 0, skills: 0, measurable: 0, inStageSet: inSet.size, unmapped: 0 },
      measuredButNotTaught: [...inSet],
    };
  }

  const topics: any[] = curriculum.topics || [];
  const taughtKeys = [...new Set(topics.flatMap(t => (t.skillKeys || []).map((k: string) => String(k).toUpperCase())))];

  const [skillDocs, counts] = await Promise.all([
    CareerSkill.find({ key: { $in: taughtKeys } }).select('key name difficulty active assessable').lean() as any,
    questionsBySkill(tenantId, taughtKeys),
  ]);
  const skillByKey = new Map<string, any>((skillDocs as any[]).map(s => [String(s.key).toUpperCase(), s]));

  const floor = policy.minItemsPerSkill;
  const buildSkill = (key: string): SkillNode | null => {
    const doc = skillByKey.get(key);
    if (!doc) return null;
    const q = counts.get(key) || { easy: 0, medium: 0, hard: 0, total: 0 };
    return {
      skillKey: key,
      skillName: doc.name || key,
      difficulty: doc.difficulty || null,
      active: doc.active !== false,
      assessable: !!doc.assessable,
      questions: q,
      inStageSet: inSet.has(key),
      measurable: doc.active !== false && !!doc.assessable && q.total >= floor,
    };
  };

  // Module metadata where an admin has saved it, falling back to the code.
  const savedModules = new Map<string, any>(
    ((curriculum.modules || []) as any[]).map(m => [String(m.moduleCode), m]),
  );

  const byModule = new Map<string, TopicNode[]>();
  for (const t of topics.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const code = t.moduleCode || 'UNGROUPED';
    const keys = (t.skillKeys || []).map((k: string) => String(k).toUpperCase());
    const skills = keys.map(buildSkill).filter(Boolean) as SkillNode[];

    const node: TopicNode = {
      id: String(t._id),
      topicCode: t.topicCode || null,
      title: t.title,
      description: t.description,
      order: t.order ?? 0,
      startDay: t.startDay ?? 0,
      endDay: t.endDay ?? 0,
      defaultDepth: t.defaultDepth || null,
      mandatory: t.mandatory !== false,
      applicableDirections: t.applicableDirections || [],
      learningOutcomes: t.learningOutcomes || [],
      prerequisiteSkillKeys: t.prerequisiteSkillKeys || [],
      skills,
      // Named but absent from the taxonomy: a rename or a retirement nothing updated here.
      unknownSkillKeys: keys.filter((k: string) => !skillByKey.has(k)),
    };
    if (!byModule.has(code)) byModule.set(code, []);
    byModule.get(code)!.push(node);
  }

  const modules: ModuleNode[] = [...byModule.entries()].map(([code, list]) => {
    const saved = savedModules.get(code);
    const distinct = new Set(list.flatMap(t => t.skills.map(s => s.skillKey)));
    const measurable = new Set(list.flatMap(t => t.skills.filter(s => s.measurable).map(s => s.skillKey)));
    return {
      moduleCode: code,
      moduleName: saved?.moduleName || nameFromModuleCode(code),
      displayOrder: saved?.displayOrder ?? (list[0]?.order ?? 0),
      blurb: saved?.blurb,
      topics: list,
      skillCount: distinct.size,
      measurableCount: measurable.size,
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder || a.moduleCode.localeCompare(b.moduleCode));

  const allSkills = new Set(modules.flatMap(m => m.topics.flatMap(t => t.skills.map(s => s.skillKey))));
  const measurable = new Set(modules.flatMap(m => m.topics.flatMap(t => t.skills.filter(s => s.measurable).map(s => s.skillKey))));

  return {
    stage, stageLabel,
    curriculum: {
      id: String(curriculum._id), title: curriculum.title,
      totalDays: curriculum.totalDays, isPublished: !!curriculum.isPublished,
    },
    policy: { skillSlots: policy.skillSlots, maxSkills: policy.maxSkills, itemsPerSkill: policy.minItemsPerSkill },
    modules,
    totals: {
      modules: modules.length,
      topics: topics.length,
      skills: allSkills.size,
      measurable: measurable.size,
      inStageSet: inSet.size,
      // Topics teaching nothing: the plan can schedule them but no measurement can steer them.
      unmapped: topics.filter(t => !(t.skillKeys || []).length).length,
    },
    // Measured but never taught — the mirror of the gap above, and just as invisible.
    measuredButNotTaught: [...inSet].filter(k => !allSkills.has(k)).sort(),
  };
}
