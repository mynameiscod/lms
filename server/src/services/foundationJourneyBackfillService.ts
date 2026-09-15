/**
 * Give existing Foundation members the journey activation would have given them.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * The unit engine creates a journey when something happens — a skill check, a checkpoint, a
 * project, a direction change. A member who was assessed BEFORE the engine was switched on has
 * Skill DNA and no journey, and nothing will happen to them for a while: the re-check is locked
 * for fourteen days. Until then My Roadmap would tell them their journey "has not been created
 * yet", which is true and useless.
 *
 * ── NOTHING NEW IS DECIDED HERE ───────────────────────────────────────────────────────────
 *
 * Every decision is an existing one. The single production resolver says which engine plans the
 * member; a member it keeps on TOPIC is left exactly as they are. A member with a journey is left
 * alone. A member with nothing measured is not planned — the same NOT_READY the trigger returns.
 * The journey itself is written by applyFoundationTrigger, the path every live event takes, so a
 * backfilled journey is indistinguishable from one a skill check created.
 *
 * The trigger used is SIGNIFICANT_MASTERY_CHANGE: from the planner's side, mastery that exists but
 * has never been planned for is exactly that. With no journey it creates; it never re-creates.
 *
 * ── DRY RUN FIRST ─────────────────────────────────────────────────────────────────────────
 *
 * Without `apply` nothing is written: building a member's profile only reads Skill DNA, and the
 * decision reported is the one the trigger would reach.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import LearningCurriculum from '../models/LearningCurriculum';
import { resolveCurriculumEngine } from './curriculumEngineService';
import { buildFoundationProfile } from './foundationProfileService';
import { FOUNDATION_JOURNEY_KIND } from './foundationJourneyService';
import { applyFoundationTrigger, directionChoiceFor, FoundationTriggerAction } from './foundationJourneyTriggerService';

export type BackfillDecision =
  | 'TOPIC_ENGINE'   // the resolver keeps this member on TOPIC; untouched
  | 'HAS_JOURNEY'    // already has a Foundation journey; untouched
  | 'NOT_READY'      // UNIT, but nothing measured to plan from; untouched
  | 'WOULD_CREATE';  // UNIT, measured, no journey — the one case that is acted on

export interface BackfillRow {
  studentId: string;
  email: string;
  stage: string | null;
  decision: BackfillDecision;
  measuredSkills: number;
  /** With `apply`, for WOULD_CREATE rows: what the production trigger did. */
  action?: FoundationTriggerAction;
  reason?: string | null;
  curriculumId?: string;
}

export interface BackfillResult {
  rows: BackfillRow[];
  /** Journeys written by this run. */
  created: number;
  /** WOULD_CREATE rows the trigger did not create — refused or failed, with its reason on the row. */
  notCreated: number;
}

export async function backfillFoundationJourneys(input: {
  tenantId: string;
  apply: boolean;
  /**
   * Restrict to these members. The acceptance run passes its own fixtures, so running it against a
   * live tenant can never plan a real member as a side effect.
   */
  studentIds?: string[];
}): Promise<BackfillResult> {
  const { tenantId, apply } = input;
  const filter: any = {
    tenantId: { $in: [tenantId, new mongoose.Types.ObjectId(tenantId)] },
    role: 'STUDENT',
  };
  if (input.studentIds) filter._id = { $in: input.studentIds.map(id => new mongoose.Types.ObjectId(id)) };

  const users = await User.find(filter).select('email passport').sort({ _id: 1 }).lean() as any[];
  const rows: BackfillRow[] = [];
  let created = 0;
  let notCreated = 0;

  // One member at a time: each creation is ninety DayPlans, and a live server may be serving the
  // same tenant. A race with a live trigger converges on the one-journey index.
  for (const u of users) {
    const studentId = String(u._id);
    const row: BackfillRow = {
      studentId, email: String(u.email || ''), stage: u.passport?.stage || null,
      decision: 'TOPIC_ENGINE', measuredSkills: 0,
    };
    rows.push(row);

    const engine = await resolveCurriculumEngine({ tenantId, studentId });
    if (engine.engine !== 'UNIT') continue;
    const stageKey = engine.stageKey || 'foundation';

    const journey = await LearningCurriculum.exists({
      tenantId, personalizedFor: u._id, adaptiveStage: stageKey, journeyKind: FOUNDATION_JOURNEY_KIND,
    });
    if (journey) { row.decision = 'HAS_JOURNEY'; continue; }

    const { summary } = await buildFoundationProfile(tenantId, studentId, directionChoiceFor(u.passport));
    row.measuredSkills = summary.measured;
    if (!summary.measured) { row.decision = 'NOT_READY'; continue; }

    row.decision = 'WOULD_CREATE';
    if (!apply) continue;

    const out = await applyFoundationTrigger({ tenantId, studentId, trigger: 'SIGNIFICANT_MASTERY_CHANGE', stageKey });
    row.action = out.action;
    row.reason = out.reason;
    row.curriculumId = out.curriculumId;
    if (out.action === 'CREATED') created++;
    else notCreated++;
  }

  return { rows, created, notCreated };
}
