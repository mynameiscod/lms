/**
 * The one place production code asks which curriculum engine serves a student.
 *
 * ── A LOADER AROUND THE POLICY, NOTHING MORE ──────────────────────────────────────────────
 *
 * The decision itself lives in data/curriculumEnginePolicy, pure and synchronous: which switch
 * wins, and which stages the unit engine can plan. This service only fetches what that decision
 * needs — the tenant's PassportConfig and the student's stage — so no controller or service ever
 * reads `megaCurriculumEnabled` and draws its own conclusion. Two places deciding the engine is
 * how a student ends up shown one plan while the system believes they are on another.
 *
 * ── THE ADMIN PATH FOR THE SWITCHES ───────────────────────────────────────────────────────
 *
 * The same module validates what the Admin config endpoint may store. The engine fields were on
 * PassportConfig from the start but the endpoint's allow-list never named them, so a save that
 * looked successful changed nothing. They are validated here rather than passed through, because
 * a stage the unit engine cannot plan or a student id from another tenant is not a preference —
 * it is a configuration that would leave somebody without a plan.
 */

import mongoose from 'mongoose';
import PassportConfig from '../models/PassportConfig';
import User from '../models/User';
import { CAREER_STAGES } from './careerStageService';
import {
  CurriculumEngine, CurriculumEngineConfig, EffectiveEngine,
  UNIT_ENGINE_STAGES, effectiveCurriculumEngine,
} from '../data/curriculumEnginePolicy';

/** The PassportConfig fields that select the engine. Their names are the policy's. */
export const ENGINE_CONFIG_FIELDS = ['megaCurriculumEnabled', 'megaCurriculumStages', 'megaCurriculumStudentIds'] as const;

/**
 * A pilot list, not a roster. Moving a whole cohort is what the stage switch is for; a list
 * long enough to need more than this is the stage switch spelled out one id at a time.
 */
export const MAX_ENGINE_STUDENT_IDS = 500;

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export interface EngineResolution extends EffectiveEngine {
  /** Whether the tenant has a PassportConfig at all. Absent means TOPIC, by default. */
  configured: boolean;
}

async function stageOfStudent(tenantId: string, studentId?: string | null): Promise<string | null> {
  if (!studentId || !mongoose.Types.ObjectId.isValid(String(studentId))) return null;
  const user = await User.findOne({ _id: studentId, tenantId }).select('passport.stage').lean() as any;
  const stage = String(user?.passport?.stage || '').trim().toLowerCase();
  return stage || null;
}

/**
 * Which engine plans this student, now.
 *
 * `stageKey` may be passed when the caller already knows it; otherwise it is read from the
 * student's passport, which is where every other planning path reads it from.
 */
export async function resolveCurriculumEngine(input: {
  tenantId: string;
  studentId?: string | null;
  stageKey?: string | null;
}): Promise<EngineResolution> {
  const [config, stageKey] = await Promise.all([
    PassportConfig.findOne({ tenantId: input.tenantId })
      .select('megaCurriculumEnabled megaCurriculumStages megaCurriculumStudentIds').lean() as any,
    input.stageKey !== undefined
      ? Promise.resolve(input.stageKey)
      : stageOfStudent(input.tenantId, input.studentId),
  ]);
  const effective = effectiveCurriculumEngine({ config, studentId: input.studentId, stageKey });
  return { ...effective, configured: !!config };
}

/* ------------------------------------------------------------------ *
 * Admin configuration
 * ------------------------------------------------------------------ */

export type EngineConfigValidation =
  | { ok: true; set: Record<string, any> }
  | { ok: false; errors: string[] };

/**
 * Validate the engine fields of an Admin config save.
 *
 * Only fields that are PRESENT are validated and returned; an absent field is left as stored.
 * Any invalid value rejects the whole save — a half-applied engine change is exactly the state
 * nobody can reason about afterwards.
 */
export async function validateEngineConfigPatch(
  tenantId: string,
  body: Record<string, any> = {},
): Promise<EngineConfigValidation> {
  const errors: string[] = [];
  const set: Record<string, any> = {};

  if (body.megaCurriculumEnabled !== undefined) {
    if (typeof body.megaCurriculumEnabled !== 'boolean') {
      errors.push('megaCurriculumEnabled must be true or false.');
    } else {
      set.megaCurriculumEnabled = body.megaCurriculumEnabled;
    }
  }

  if (body.megaCurriculumStages !== undefined) {
    if (!Array.isArray(body.megaCurriculumStages)) {
      errors.push('megaCurriculumStages must be a list of stage keys.');
    } else {
      const known = new Set<string>(CAREER_STAGES.map(s => s.key));
      const stages: string[] = [];
      for (const raw of body.megaCurriculumStages) {
        if (typeof raw !== 'string' || !raw.trim()) {
          errors.push('megaCurriculumStages may only contain stage keys.');
          continue;
        }
        const key = raw.trim().toLowerCase();
        if (!known.has(key)) {
          errors.push(`"${raw.slice(0, 40)}" is not a stage.`);
          continue;
        }
        if (!UNIT_ENGINE_STAGES.includes(key)) {
          errors.push(`The ${key} stage has no Learning Unit curriculum, so it cannot use the unit engine.`);
          continue;
        }
        if (!stages.includes(key)) stages.push(key);
      }
      set.megaCurriculumStages = stages;
    }
  }

  if (body.megaCurriculumStudentIds !== undefined) {
    if (!Array.isArray(body.megaCurriculumStudentIds)) {
      errors.push('megaCurriculumStudentIds must be a list of student ids.');
    } else {
      const ids: string[] = [];
      for (const raw of body.megaCurriculumStudentIds) {
        if (typeof raw !== 'string' || !OBJECT_ID.test(raw.trim())) {
          errors.push(`"${String(raw).slice(0, 40)}" is not a student id.`);
          continue;
        }
        const id = raw.trim().toLowerCase();
        if (!ids.includes(id)) ids.push(id);
      }
      if (ids.length > MAX_ENGINE_STUDENT_IDS) {
        errors.push(`At most ${MAX_ENGINE_STUDENT_IDS} pilot students can be listed; use the stage switch for a cohort.`);
      } else if (ids.length && !errors.length) {
        // Tenant isolation: an id is accepted only if it names a student of THIS tenant.
        const found = await User.find({ _id: { $in: ids }, tenantId, role: 'STUDENT' }).select('_id').lean() as any[];
        const present = new Set(found.map(u => String(u._id).toLowerCase()));
        const unknown = ids.filter(id => !present.has(id));
        if (unknown.length) {
          errors.push(`Not students of this tenant: ${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? ', …' : ''}.`);
        }
      }
      set.megaCurriculumStudentIds = ids;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, set };
}

export interface CurriculumEngineSummary {
  /** The engine a Foundation student is on, from the stage and tenant switches. */
  foundationMode: CurriculumEngine;
  megaCurriculumEnabled: boolean;
  megaCurriculumStages: string[];
  megaCurriculumStudentIds: string[];
  /** Stages the unit engine can plan at all. */
  unitCapableStages: string[];
  stages: { stage: string; label: string; mode: CurriculumEngine }[];
}

/**
 * The effective engine, as an admin needs to see it.
 *
 * Per stage rather than per student: a pilot student is listed, and their mode is UNIT by
 * definition. Nothing about the composer or the inventory is exposed here.
 */
export function describeEngineConfig(config?: CurriculumEngineConfig | null): CurriculumEngineSummary {
  return {
    foundationMode: effectiveCurriculumEngine({ config, stageKey: 'foundation' }).engine,
    megaCurriculumEnabled: !!config?.megaCurriculumEnabled,
    megaCurriculumStages: [...(config?.megaCurriculumStages || [])].map(String),
    megaCurriculumStudentIds: [...(config?.megaCurriculumStudentIds || [])].map(String),
    unitCapableStages: [...UNIT_ENGINE_STAGES],
    stages: CAREER_STAGES.map(s => ({
      stage: s.key,
      label: s.label,
      mode: effectiveCurriculumEngine({ config, stageKey: s.key }).engine,
    })),
  };
}
