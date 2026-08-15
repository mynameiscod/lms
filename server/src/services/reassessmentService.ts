import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import PassportProgress from '../models/PassportProgress';
import CareerRoadmap from '../models/CareerRoadmap';
import PersonalizedAssessment, { IAssessmentSnapshot } from '../models/PersonalizedAssessment';
import { calculateStudentRoleReadiness, RoleReadinessResult } from './roleReadinessService';
import { isEntitled } from './passportEntitlementService';
import {
  resolvePersonalizedAssessmentContext, buildPersonalizedAssessment,
} from './personalizedAssessmentService';
import {
  REASSESSMENT_VERSION, resolveReassessmentConfig, ReassessmentConfig,
  ReassessmentTrigger, ReassessmentBlocker, rankTargets, TargetCandidate,
  daysBetween,
} from '../data/reassessmentPolicy';

/**
 * Deciding when to look again, and at what.
 *
 * IT COORDINATES; IT DOES NOT COMPUTE. Every judgement it reads was made elsewhere: Module 7
 * scored the skills, Module 8 classified the gaps, Module 9 planned the roadmap, Module 10
 * recorded what was actually completed. Nothing here recalculates any of them — a second
 * opinion about a student's SQL would eventually disagree with the first, and neither screen
 * could then be trusted.
 *
 * A CHECK-IN IS NOT THE ORIGINAL PAPER AGAIN. It is the same generator aimed at fewer
 * skills: the ones we never measured, the ones we are unsure about, and the ones the student
 * has actually been working on. Re-testing a demonstrated strength spends their time to tell
 * us what we already knew.
 *
 * NOTHING HERE REPLANS. It captures what changed and says whether the plan looks stale. The
 * roadmap a student is following does not move until they say so.
 */

export interface ReassessmentStatus {
  eligible: boolean;
  blockers: ReassessmentBlocker[];
  triggers: ReassessmentTrigger[];
  lastCompletedAt: Date | null;
  nextEligibleAt: Date | null;
  cooldownDays: number;
  targetSkills: { skillKey: string; skillName: string }[];
  estimatedQuestions: number;
  /** Set when a check-in is already open — the client resumes rather than starting another. */
  activeAttemptId: string | null;
  message: string;
}

const tenantConfig = async (tenantId: string): Promise<ReassessmentConfig> => {
  const cfg: any = await PassportConfig.findOne({ tenantId }).lean();
  return resolveReassessmentConfig(cfg?.reassessment);
};

/**
 * Which skills the student has genuinely worked on.
 *
 * COMPLETED WORK ONLY. A skill appearing somewhere in the roadmap proves nothing — the plan
 * says what they were asked to do, not what they did. Module 10 writes a completion record
 * with the objective's skill on it, and that is the only signal used here.
 */
async function recentlyWorkedSkills(tenantId: string, studentId: string): Promise<Set<string>> {
  const progress: any = await PassportProgress.findOne({ tenantId, studentId })
    .select('completed').lean();

  return new Set(
    (progress?.completed || [])
      .filter((c: any) => c.careerpilot?.skillKey)
      .map((c: any) => c.careerpilot.skillKey),
  );
}

/** How much of the active roadmap's planned time has been completed. Plan progress only. */
async function roadmapProgressPercent(tenantId: string, studentId: string): Promise<number> {
  const [roadmap, progress]: any[] = await Promise.all([
    CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' }).select('capacity').lean(),
    PassportProgress.findOne({ tenantId, studentId }).select('completed').lean(),
  ]);

  const planned = roadmap?.capacity?.plannedMinutes || 0;
  if (!planned) return 0;

  const done = (progress?.completed || [])
    .filter((c: any) => c.careerpilot)
    .reduce((n: number, c: any) => n + (c.careerpilot.minutes || 0), 0);

  return Math.min(100, Math.round((done / planned) * 100));
}

/**
 * What a check-in should look at, ranked.
 *
 * Reads Module 8's classification of every required skill and weights it — unknowns and
 * uncertainties first, then what the student has just practised, then known gaps, with
 * settled strengths last. Module 8's verdict is used as given; no gap is recomputed here.
 */
export async function buildReassessmentTargetPlan(
  tenantId: string, studentId: string,
): Promise<{ targets: { skillKey: string; skillName: string }[]; readiness: RoleReadinessResult | null }> {
  const readiness = await calculateStudentRoleReadiness(tenantId, studentId);
  if (!readiness.available) return { targets: [], readiness: null };

  const ready = readiness as RoleReadinessResult;
  const worked = await recentlyWorkedSkills(tenantId, studentId);

  const candidates: TargetCandidate[] = ready.skills
    .filter(s => !s.skillInactive)
    .map(s => ({
      skillKey: s.skillKey,
      skillName: s.skillName,
      status: s.status,
      importance: s.importance,
      weight: s.weight,
      recentWork: worked.has(s.skillKey),
    }));

  return {
    targets: rankTargets(candidates).map(t => ({ skillKey: t.skillKey, skillName: t.skillName })),
    readiness: ready,
  };
}

/**
 * May this student check in, and why.
 *
 * Computed on read — no cron. "Fourteen days have passed" is a comparison against a stored
 * date, and a background job that woke up to notice it would be work for nothing.
 */
export async function evaluateReassessmentEligibility(
  tenantId: string, studentId: string, now: Date = new Date(),
): Promise<ReassessmentStatus> {
  const cfg = await tenantConfig(tenantId);

  const [user, passportCfg, open, lastInitial, lastReassessment] = await Promise.all([
    User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean() as any,
    PersonalizedAssessment.findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).select('_id purpose').lean() as any,
    PersonalizedAssessment.findOne({
      tenantId, studentId, status: 'SUBMITTED',
      $or: [{ purpose: 'INITIAL' }, { purpose: { $exists: false } }],
    }).sort({ submittedAt: -1 }).select('submittedAt').lean() as any,
    PersonalizedAssessment.findOne({
      tenantId, studentId, status: 'SUBMITTED', purpose: 'REASSESSMENT',
    }).sort({ submittedAt: -1 }).select('submittedAt').lean() as any,
  ]);

  const blockers: ReassessmentBlocker[] = [];
  const triggers: ReassessmentTrigger[] = [];

  if (!cfg.enabled) blockers.push('REASSESSMENT_DISABLED');

  // Reuses the entitlement rule the rest of CareerPilot applies. An expired member keeps
  // every historical result and simply cannot start a new one.
  if (!isEntitled(passportCfg?.entitlements, user?.passport, 'roadmap_full', now)) {
    blockers.push('MEMBERSHIP_REQUIRED');
  }

  // Nothing to re-measure against. A check-in compares two pictures, and there has to be a
  // first one.
  if (!lastInitial) blockers.push('INITIAL_ASSESSMENT_REQUIRED');

  if (open) blockers.push('ASSESSMENT_IN_PROGRESS');

  /**
   * Cooldown runs from the last COMPLETED sitting.
   *
   * Deliberately not from when one was started or abandoned: otherwise opening a check-in
   * and walking away would reset the clock, and a student could game their way to a fresh
   * paper whenever they liked.
   */
  const lastCompleted = [lastInitial?.submittedAt, lastReassessment?.submittedAt]
    .filter(Boolean)
    .map((d: any) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  let nextEligibleAt: Date | null = null;
  if (lastCompleted && cfg.cooldownDays > 0) {
    const elapsed = daysBetween(lastCompleted, now);
    if (elapsed < cfg.cooldownDays) {
      blockers.push('COOLDOWN_ACTIVE');
      nextEligibleAt = new Date(lastCompleted.getTime() + cfg.cooldownDays * 86400000);
    } else {
      triggers.push('TIME_ELAPSED');
    }
  }

  const { targets, readiness } = await buildReassessmentTargetPlan(tenantId, studentId);
  if (!readiness) blockers.push('ROLE_NOT_SELECTED');
  else if (!targets.length) blockers.push('NO_TARGET_SKILLS');

  if (readiness) {
    if (readiness.summary.notAssessed > 0) triggers.push('NOT_ASSESSED');
    if (readiness.summary.limitedEvidence > 0) triggers.push('LOW_CONFIDENCE');
    const progress = await roadmapProgressPercent(tenantId, studentId);
    if (progress >= 25) triggers.push('ROADMAP_PROGRESS');
  }

  if (cfg.studentRequestEnabled) triggers.push('STUDENT_REQUEST');

  const eligible = blockers.length === 0;

  return {
    eligible,
    blockers,
    triggers,
    lastCompletedAt: lastCompleted,
    nextEligibleAt,
    cooldownDays: cfg.cooldownDays,
    targetSkills: targets,
    estimatedQuestions: cfg.questionBudget,
    activeAttemptId: open ? String(open._id) : null,
    message: eligible
      ? 'Your skill check-in is ready.'
      : blockerMessage(blockers[0], nextEligibleAt),
  };
}

/** One sentence a student can act on. Never a scary error for an ordinary waiting state. */
function blockerMessage(blocker: ReassessmentBlocker | undefined, nextAt: Date | null): string {
  switch (blocker) {
    case 'INITIAL_ASSESSMENT_REQUIRED':
      return 'Complete your first skill assessment before checking in on your progress.';
    case 'COOLDOWN_ACTIVE': {
      const days = nextAt ? Math.max(1, daysBetween(new Date(), nextAt)) : 0;
      return `Your next skill check-in opens in ${days} day${days === 1 ? '' : 's'}. Keep working through your roadmap — we will use that progress to focus it.`;
    }
    case 'MEMBERSHIP_REQUIRED':
      return 'An active CareerPilot membership is needed for a new skill check-in.';
    case 'ASSESSMENT_IN_PROGRESS':
      return 'You already have an assessment open. Finish it first.';
    case 'REASSESSMENT_DISABLED':
      return 'Skill check-ins are not switched on for your institution.';
    case 'ROLE_NOT_SELECTED':
      return 'Choose a target role so we know what to measure you against.';
    case 'NO_TARGET_SKILLS':
      return 'There is nothing new to measure right now.';
    default:
      return 'Your skill check-in is not available right now.';
  }
}

/**
 * Freeze what the student's picture looks like right now.
 *
 * Called at START, before any answer has been graded — the only moment "before" is
 * unambiguous. Once evidence lands, Skill DNA has already moved and the old picture cannot
 * be recovered.
 */
export async function captureSnapshot(
  tenantId: string, studentId: string, now: Date = new Date(),
): Promise<IAssessmentSnapshot | null> {
  const readiness = await calculateStudentRoleReadiness(tenantId, studentId);
  if (!readiness.available) return null;

  const r = readiness as RoleReadinessResult;
  return {
    roleKey: r.role.key,
    readiness: r.readiness,
    coverage: r.coverage,
    // Only what a comparison needs. The full readiness result is large and most of it is
    // recomputable; a snapshot that copied everything would be a second source of truth.
    skills: r.skills.map(s => ({
      skillKey: s.skillKey,
      skillName: s.skillName,
      score: s.studentScore,
      status: s.status,
      confidence: s.skillConfidence,
      targetScore: s.targetScore,
    })),
    blueprintVersion: r.blueprintVersion,
    capturedAt: now,
  };
}

export interface StartReassessmentResult {
  ok: boolean;
  attemptId?: string;
  resumed?: boolean;
  blocker?: ReassessmentBlocker;
  message?: string;
  targetSkills?: { skillKey: string; skillName: string }[];
}

/**
 * Open a skill check-in.
 *
 * REUSES MODULE 6 ENTIRELY. The only difference from a first sitting is the scope handed to
 * the generator: a narrowed set of skill keys instead of the whole blueprint. Everything
 * else — slot shaping, difficulty, seeded variation, avoiding questions this student has
 * already seen — is the existing generator doing exactly what it already does.
 */
export async function startReassessment(input: {
  tenantId: string;
  studentId: string;
  now?: Date;
  /** Set when an admin deliberately opens one early. Audited by the caller. */
  adminOverride?: boolean;
}): Promise<StartReassessmentResult> {
  const now = input.now || new Date();
  const { tenantId, studentId } = input;

  const status = await evaluateReassessmentEligibility(tenantId, studentId, now);

  // An open attempt is RESUMED, never replaced: a refresh, a second tab or a retried request
  // must not cost somebody the answers they have already given.
  if (status.activeAttemptId) {
    return { ok: true, attemptId: status.activeAttemptId, resumed: true, targetSkills: status.targetSkills };
  }

  if (!status.eligible) {
    // An admin may open one early, but never past a missing first assessment or a lapsed
    // membership — those are not waiting periods, they are missing prerequisites.
    const overridable = status.blockers.every(b => b === 'COOLDOWN_ACTIVE');
    if (!(input.adminOverride && overridable)) {
      return { ok: false, blocker: status.blockers[0], message: status.message };
    }
  }

  const ctx = await resolvePersonalizedAssessmentContext(tenantId, studentId);
  if (!ctx.ok) return { ok: false, blocker: 'ROLE_NOT_SELECTED', message: ctx.message };

  const targetKeys = status.targetSkills.map(t => t.skillKey);
  if (!targetKeys.length) return { ok: false, blocker: 'NO_TARGET_SKILLS', message: 'There is nothing new to measure right now.' };

  const prior = await PersonalizedAssessment.find({ tenantId, studentId })
    .select('attemptNumber items').sort({ attemptNumber: -1 }).lean() as any[];
  const attemptNumber = (prior[0]?.attemptNumber || 0) + 1;

  // Built in full before anything is written, so a coverage failure cannot leave a
  // half-generated check-in behind.
  const built = await buildPersonalizedAssessment({
    tenantId, studentId,
    stage: ctx.stage!, roleKey: ctx.roleKey!,
    // The narrowing. Everything downstream is the untouched Module 6 pipeline.
    roleSkillKeys: targetKeys,
    blueprintVersion: ctx.blueprintVersion!,
    attemptNumber,
    // Avoid repeating questions this student has already been shown, where the bank allows.
    seenSourceIds: prior.flatMap((p: any) => (p.items || []).map((i: any) => i.sourceId)),
  });

  if (!built.ok) return { ok: false, blocker: 'NO_TARGET_SKILLS', message: built.message };

  const before = await captureSnapshot(tenantId, studentId, now);

  try {
    const created = await PersonalizedAssessment.create({
      tenantId, studentId, attemptNumber, status: 'IN_PROGRESS',
      purpose: 'REASSESSMENT',
      targetSkillKeys: targetKeys,
      triggerReasons: input.adminOverride ? ['ADMIN_OVERRIDE'] : status.triggers,
      beforeSnapshot: before || undefined,
      policyKey: built.specification!.policyKey,
      policyVersion: built.specification!.policyVersion,
      stage: ctx.stage, roleKey: ctx.roleKey,
      blueprintVersion: ctx.blueprintVersion, discovery: !!ctx.discovery,
      generationSeed: built.seed,
      specification: {
        slots: built.specification!.slots,
        skillCoverage: built.specification!.skillCoverage,
        difficultyCoverage: built.specification!.difficultyCoverage,
        totalPoints: built.specification!.totalPoints,
      },
      items: built.items,
      generationReport: built.report,
    });

    return {
      ok: true, attemptId: String(created._id), resumed: false,
      targetSkills: status.targetSkills,
    };
  } catch (e: any) {
    // Two starts raced and the one-open-attempt index refused the second. Return the winner's
    // paper rather than an error the student cannot act on.
    if (e?.code === 11000) {
      const existing: any = await PersonalizedAssessment
        .findOne({ tenantId, studentId, status: 'IN_PROGRESS' }).select('_id').lean();
      if (existing) return { ok: true, attemptId: String(existing._id), resumed: true, targetSkills: status.targetSkills };
    }
    throw e;
  }
}

/**
 * Freeze the AFTER picture, once grading and projection have settled.
 *
 * Written only if it is not already there: a retried submission must not overwrite the
 * comparison with a later reading, or a student's August progress would silently become a
 * restatement of September.
 */
export async function captureAfterSnapshot(
  tenantId: string, studentId: string, attemptId: string, now: Date = new Date(),
): Promise<IAssessmentSnapshot | null> {
  const attempt: any = await PersonalizedAssessment.findOne({ _id: attemptId, tenantId, studentId });
  if (!attempt || attempt.purpose !== 'REASSESSMENT' || attempt.afterSnapshot) return null;

  const after = await captureSnapshot(tenantId, studentId, now);
  if (!after) return null;

  // Guarded on absence, so of two concurrent completions exactly one writes the comparison.
  await PersonalizedAssessment.updateOne(
    { _id: attemptId, afterSnapshot: { $exists: false } },
    { $set: { afterSnapshot: after } },
  );

  return after;
}

export { REASSESSMENT_VERSION };
