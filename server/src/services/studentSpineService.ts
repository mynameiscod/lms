import mongoose from 'mongoose';
import CurriculumDayUnit from '../models/CurriculumDayUnit';
import StudentSkillProfile from '../models/StudentSkillProfile';
import User from '../models/User';
import { getCareerContext } from './careerContextService';
import { TARGET_SCORE } from '../data/roleReadinessPolicy';
import {
  SPINE_BANDS, SPINE_DAYS, bandByKey, SpineStudent,
} from '../data/ninetyDayPolicy';
import {
  selectNinetyDays, spineCoverage, SelectableDayUnit, SelectedDay, BandShortfall,
} from './ninetyDaySelectorService';

/**
 * One student's ninety days.
 *
 * Joins what the tenant has authored with what this student has been measured on, and hands both
 * to the selector. It reads and derives; it stores nothing — every input is already persisted and
 * the selector is deterministic, so a saved plan would only be a fourth thing to invalidate
 * whenever a score, a day-unit or a direction changed.
 *
 * IT IS ALLOWED TO SAY NO. Until every band can be filled there is no plan, and this returns the
 * shortfall instead of a plan with holes in it. That is the whole point of the model: the old
 * planner shipped a twenty-eight-day roadmap under a ninety-day promise and nobody found out
 * until a student did.
 */

export interface SpineUnavailable {
  available: false;
  reason: 'CURRICULUM_INCOMPLETE' | 'NO_CONTEXT';
  message: string;
  /** Which bands fall short, so an admin screen can say what to write next. */
  shortfalls: BandShortfall[];
  authored: number;
  total: number;
}

export interface SpineAvailable {
  available: true;
  totalDays: number;
  days: SelectedDay[];
  bands: { key: string; label: string; blurb: string; fromDay: number; toDay: number }[];
  /** Summed from the day-units, so a student can see the shape of the commitment. */
  estimatedMinutes: number;
}

export type SpineOutcome = SpineAvailable | SpineUnavailable;

/**
 * What a student's own evidence says about a skill, in the vocabulary the depth rule speaks.
 *
 * Derived from the score against the SAME target levels role readiness uses, rather than a new
 * set of thresholds invented here — two scales would eventually disagree, and a student shown a
 * skill as "on track" on one screen and "needs work" on another stops believing either.
 *
 * NO EVIDENCE RETURNS NOTHING, not a verdict. The depth rule turns an absent state into the
 * standard day, which is the correct treatment of somebody nobody has asked.
 */
function stateFromScore(score: number | null | undefined): string | null {
  if (typeof score !== 'number') return null;
  if (score >= TARGET_SCORE.WORKING) return 'VERIFIED';
  if (score >= TARGET_SCORE.FOUNDATION) return 'GUIDED';
  return 'FOUNDATION_REQUIRED';
}

const toSelectable = (u: any): SelectableDayUnit => ({
  dayUnitId: u.dayUnitId,
  band: u.band,
  displayOrder: u.displayOrder ?? 100,
  title: u.title,
  skillKey: u.skillKey,
  journeyTopic: u.journeyTopic || '',
  subtopics: u.subtopics || [],
  audience: u.audience,
  estimatedMinutes: u.estimatedMinutes ?? 0,
});

/** Everything published for this tenant. The pool the spine is drawn from. */
export async function publishedDayUnits(tenantId: string): Promise<SelectableDayUnit[]> {
  const rows = await CurriculumDayUnit
    .find({ tenantId, status: 'PUBLISHED' })
    .sort({ displayOrder: 1 })
    .lean() as any[];
  return rows.map(toSelectable);
}

/**
 * The four axes that choose WHICH days, read from the student's own record.
 *
 * Language comes from their preferred languages rather than from a course field: it is what they
 * said they want to learn in, and it is the one axis the programming band turns on.
 */
async function spineStudentFor(tenantId: string, studentId: string): Promise<SpineStudent | null> {
  const [user, context]: any[] = await Promise.all([
    User.findOne({ _id: studentId, tenantId }).select('passport').lean(),
    getCareerContext(tenantId, studentId).catch(() => null),
  ]);
  if (!user) return null;
  const p = user.passport || {};
  return {
    language: (p.preferredLanguages || [])[0]
      || (context?.career?.preferredProgrammingLanguages || [])[0]
      || null,
    direction: context?.derived?.direction || p.direction || null,
    year: p.yearOfStudy || context?.education?.currentAcademicYear || null,
    branch: p.branch || context?.education?.branch || null,
  };
}

export async function buildStudentSpine(tenantId: string, studentId: string): Promise<SpineOutcome> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return {
      available: false, reason: 'NO_CONTEXT', shortfalls: [], authored: 0, total: SPINE_DAYS,
      message: 'We could not read your profile.',
    };
  }

  const [units, student] = await Promise.all([
    publishedDayUnits(tenantId),
    spineStudentFor(tenantId, studentId),
  ]);

  if (!student) {
    return {
      available: false, reason: 'NO_CONTEXT', shortfalls: [], authored: 0, total: SPINE_DAYS,
      message: 'Finish your profile and we will build your ninety days.',
    };
  }

  const profiles = await StudentSkillProfile
    .find({ tenantId, studentId })
    .select('skillKey score').lean() as any[];

  const states = new Map<string, string>();
  for (const row of profiles) {
    const state = stateFromScore(row.score);
    if (state) states.set(String(row.skillKey).toUpperCase(), state);
  }

  // Weakest first, for the consolidation band. The same scores, ordered — not a second opinion
  // about who is weak at what.
  const weakestSkills = profiles
    .filter(r => typeof r.score === 'number')
    .sort((a, b) => a.score - b.score)
    .map(r => String(r.skillKey).toUpperCase());

  const result = selectNinetyDays({ units, student, states, weakestSkills });

  if (!result.ok) {
    const coverage = spineCoverage({ units, student });
    return {
      available: false,
      reason: 'CURRICULUM_INCOMPLETE',
      shortfalls: result.shortfalls,
      authored: coverage.filled,
      total: SPINE_DAYS,
      message: 'Your ninety-day plan is being written. We will not hand you one with gaps in it.',
    };
  }

  return {
    available: true,
    totalDays: SPINE_DAYS,
    days: result.days,
    bands: SPINE_BANDS.map(b => ({
      key: b.key, label: b.label, blurb: b.blurb, fromDay: b.fromDay, toDay: b.toDay,
    })),
    estimatedMinutes: result.days.reduce((n, d) => n + d.estimatedMinutes, 0),
  };
}

/**
 * How much of the spine a tenant can currently fill, for the people writing it.
 *
 * Reported for a named language and direction because coverage is not one number: a track with
 * no Python days is not "ninety authored" for a Python student, however much C material exists.
 */
export async function tenantSpineCoverage(tenantId: string, student: SpineStudent = {}) {
  const units = await publishedDayUnits(tenantId);
  const c = spineCoverage({ units, student });
  return {
    total: c.total,
    filled: c.filled,
    percent: Math.round((c.filled / c.total) * 100),
    rows: c.rows.map(r => ({
      ...r,
      label: bandByKey(r.band)?.label || r.band,
      short: Math.max(0, r.needed - r.available),
    })),
  };
}
