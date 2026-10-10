import LearningCurriculum from '../models/LearningCurriculum';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import PassportConfig from '../models/PassportConfig';
import { programDaysFor } from './foundationProgramLengthService';
import { resolveRoadmapV2, budgetMinutes } from '../data/roadmapV2Policy';
import {
  TopicFacts, TopicPriority, draftPriorities, summarisePriorities, PrioritySummary,
} from '../data/topicPriorityPolicy';

/**
 * Topic priorities, read from and written to the stage curricula (see topicPriorityPolicy).
 *
 * The four college years are read together because a priority is not a property of one year:
 * a Year 2 topic is load-bearing BECAUSE Year 3 or Year 4 builds on it, and a year's MUST budget
 * is what is left after the bridge a fresh joiner needs from the years before it.
 */

export const PRIORITY_STAGES = ['foundation', 'build', 'specialize', 'placement'] as const;
export type PriorityStage = typeof PRIORITY_STAGES[number];

interface StageFacts {
  stage: PriorityStage;
  curriculumId: string | null;
  topics: TopicFacts[];
  /** Essentials of each topic for a bridge: its first concept unit and its checkpoints. */
  leanMinutes: Map<string, number>;
  /** Skills this year's backbone stands on (taught or required). */
  needs: Set<string>;
  programDays: number;
}

async function loadStage(tenantId: string, stage: PriorityStage): Promise<StageFacts> {
  const [cur, units, programDays] = await Promise.all([
    LearningCurriculum.findOne({ tenantId, adaptiveStage: stage, personalizedFor: null })
      .select('_id topics').lean() as any,
    CurriculumLearningUnit.find({ tenantId, stageKey: stage, status: 'PUBLISHED' })
      .select('topicCode unitType estimatedMinutes skillKeys prerequisiteSkillKeys displayOrder').lean() as any,
    programDaysFor(tenantId, stage),
  ]);
  const byTopic = new Map<string, any[]>();
  for (const u of units as any[]) {
    const k = String(u.topicCode || '');
    if (!k) continue;
    (byTopic.get(k) || byTopic.set(k, []).get(k)!).push(u);
  }
  const topics: TopicFacts[] = [];
  const leanMinutes = new Map<string, number>();
  const needs = new Set<string>();
  for (const t of ((cur?.topics || []) as any[])) {
    const code = String(t.topicCode || '');
    if (!code) continue;
    const us = (byTopic.get(code) || []).slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const minutes = us.reduce((m, u) => m + (Number(u.estimatedMinutes) || 0), 0);
    const checkpoints = us.filter(u => u.unitType === 'CHECKPOINT');
    const firstConcept = us.find(u => u.unitType === 'CONCEPT');
    leanMinutes.set(code, (Number(firstConcept?.estimatedMinutes) || 0)
      + checkpoints.reduce((m, u) => m + (Number(u.estimatedMinutes) || 0), 0));
    const skillKeys = [...new Set([...(t.skillKeys || []), ...us.flatMap(u => u.skillKeys || [])].map(String))];
    if (t.backbone) {
      for (const k of skillKeys) needs.add(k);
      for (const u of us) for (const k of (u.prerequisiteSkillKeys || [])) needs.add(String(k));
    }
    topics.push({
      topicCode: code,
      title: String(t.title || code),
      order: Number(t.order) || 0,
      backbone: t.backbone === true,
      mandatory: t.mandatory === true,
      minutes,
      hasCheckpoint: checkpoints.length > 0,
      skillKeys,
      priority: t.priority,
      prioritySource: t.prioritySource,
    });
  }
  return { stage, curriculumId: cur?._id ? String(cur._id) : null, topics, leanMinutes, needs, programDays };
}

export async function loadAllStages(tenantId: string): Promise<Record<PriorityStage, StageFacts>> {
  const all = await Promise.all(PRIORITY_STAGES.map(s => loadStage(tenantId, s)));
  return Object.fromEntries(all.map(f => [f.stage, f])) as Record<PriorityStage, StageFacts>;
}

/**
 * The bridge a fresh joiner of `target` needs, in minutes: Year 1's backbone essentials, plus the
 * essentials of each later earlier year's backbone topics that teach a skill `target` stands on.
 */
export function bridgeEstimateMinutes(all: Record<PriorityStage, StageFacts>, target: PriorityStage): number {
  const idx = PRIORITY_STAGES.indexOf(target);
  let total = 0;
  for (let i = 0; i < idx; i++) {
    const src = all[PRIORITY_STAGES[i]];
    for (const t of src.topics) {
      if (!t.backbone) continue;
      const counts = i === 0 || t.skillKeys.some(k => all[target].needs.has(k));
      if (counts) total += src.leanMinutes.get(t.topicCode) || 0;
    }
  }
  return total;
}

/** Skills any year after `stage` builds on. */
function neededByLater(all: Record<PriorityStage, StageFacts>, stage: PriorityStage): Set<string> {
  const out = new Set<string>();
  for (const s of PRIORITY_STAGES.slice(PRIORITY_STAGES.indexOf(stage) + 1)) for (const k of all[s].needs) out.add(k);
  return out;
}

export interface StageBudget {
  programDays: number;
  dailyMinutes: number;
  budgetMinutes: number;
  bridgeMinutes: number;
  mustCapMinutes: number;
}

export async function stageBudgets(tenantId: string, all?: Record<PriorityStage, StageFacts>) {
  const facts = all || await loadAllStages(tenantId);
  const cfg = await PassportConfig.findOne({ tenantId }).select('roadmapV2').lean() as any;
  const dailyMinutes = resolveRoadmapV2(cfg?.roadmapV2).dailyMinutes;
  const out = {} as Record<PriorityStage, StageBudget>;
  for (const s of PRIORITY_STAGES) {
    const budget = budgetMinutes(facts[s].programDays, dailyMinutes);
    const bridge = bridgeEstimateMinutes(facts, s);
    out[s] = { programDays: facts[s].programDays, dailyMinutes, budgetMinutes: budget, bridgeMinutes: bridge, mustCapMinutes: Math.max(0, budget - bridge) };
  }
  return out;
}

export interface StageDraft {
  stage: PriorityStage;
  curriculumId: string | null;
  budget: StageBudget;
  rows: { topicCode: string; title: string; minutes: number; current?: TopicPriority; source?: string; draft: TopicPriority }[];
  demoted: string[];
  overCap: boolean;
  before: PrioritySummary;
  after: PrioritySummary;
}

/** What the draft would set, per year, without writing anything. */
export async function computeDraft(tenantId: string): Promise<StageDraft[]> {
  const all = await loadAllStages(tenantId);
  const budgets = await stageBudgets(tenantId, all);
  return PRIORITY_STAGES.map(stage => {
    const f = all[stage];
    const r = draftPriorities(f.topics, {
      isFoundation: stage === 'foundation',
      isFinalYear: stage === PRIORITY_STAGES[PRIORITY_STAGES.length - 1],
      neededByLater: neededByLater(all, stage),
      mustCapMinutes: budgets[stage].mustCapMinutes,
    });
    const rows = f.topics.map(t => ({
      topicCode: t.topicCode, title: t.title, minutes: t.minutes,
      current: t.priority, source: t.prioritySource, draft: r.priorities.get(t.topicCode) as TopicPriority,
    }));
    return {
      stage, curriculumId: f.curriculumId, budget: budgets[stage], rows, demoted: r.demoted, overCap: r.overCap,
      before: summarisePriorities(f.topics.map(t => ({ minutes: t.minutes, priority: t.priority }))),
      after: summarisePriorities(rows.map(x => ({ minutes: x.minutes, priority: x.draft }))),
    };
  });
}

/**
 * Write the draft: only topics whose priority changes, and never one an admin set. Returns the
 * prior values of every topic written, so the change can be undone exactly.
 */
export async function applyDraft(tenantId: string, drafts: StageDraft[], by: string) {
  const prior: { curriculumId: string; topicCode: string; priority?: string; prioritySource?: string }[] = [];
  let written = 0;
  for (const d of drafts) {
    if (!d.curriculumId) continue;
    for (const row of d.rows) {
      if (row.source === 'ADMIN' || row.current === row.draft && row.source === 'DRAFT') continue;
      prior.push({ curriculumId: d.curriculumId, topicCode: row.topicCode, priority: row.current, prioritySource: row.source });
      await LearningCurriculum.updateOne(
        { _id: d.curriculumId, 'topics.topicCode': row.topicCode },
        { $set: { 'topics.$.priority': row.draft, 'topics.$.prioritySource': 'DRAFT', 'topics.$.priorityUpdatedAt': new Date(), 'topics.$.priorityUpdatedBy': by } },
      );
      written++;
    }
  }
  return { written, prior };
}

/** Put topics back exactly as `prior` recorded them (used by the migration's rollback). */
export async function restorePrior(prior: { curriculumId: string; topicCode: string; priority?: string; prioritySource?: string }[]) {
  for (const p of prior) {
    const set: any = {}; const unset: any = {};
    if (p.priority) set['topics.$.priority'] = p.priority; else unset['topics.$.priority'] = '';
    if (p.prioritySource) set['topics.$.prioritySource'] = p.prioritySource; else unset['topics.$.prioritySource'] = '';
    unset['topics.$.priorityUpdatedAt'] = ''; unset['topics.$.priorityUpdatedBy'] = '';
    await LearningCurriculum.updateOne({ _id: p.curriculumId, 'topics.topicCode': p.topicCode },
      { ...(Object.keys(set).length ? { $set: set } : {}), $unset: unset });
  }
}

/** One year's topics for the admin screen, with the budget they are measured against. */
export async function listStagePriorities(tenantId: string, stage: PriorityStage) {
  const all = await loadAllStages(tenantId);
  const budgets = await stageBudgets(tenantId, all);
  const f = all[stage];
  return {
    stage,
    available: !!f.curriculumId,
    budget: budgets[stage],
    summary: summarisePriorities(f.topics.map(t => ({ minutes: t.minutes, priority: t.priority }))),
    topics: f.topics
      .slice().sort((a, b) => a.order - b.order || a.topicCode.localeCompare(b.topicCode))
      .map(t => ({
        topicCode: t.topicCode, title: t.title, minutes: t.minutes, backbone: t.backbone, mandatory: t.mandatory,
        hasCheckpoint: t.hasCheckpoint, priority: t.priority || null, prioritySource: t.prioritySource || null,
      })),
  };
}

/** An admin's choice for one topic. It is final: the draft never changes it again. */
export async function setTopicPriority(tenantId: string, stage: PriorityStage, topicCode: string, priority: TopicPriority, by: string) {
  const r = await LearningCurriculum.updateOne(
    { tenantId, adaptiveStage: stage, personalizedFor: null, 'topics.topicCode': topicCode },
    { $set: { 'topics.$.priority': priority, 'topics.$.prioritySource': 'ADMIN', 'topics.$.priorityUpdatedAt': new Date(), 'topics.$.priorityUpdatedBy': by } },
  );
  return r.matchedCount > 0;
}
