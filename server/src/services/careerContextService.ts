import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import { resolveCareerProfile } from './careerStageService';
import {
  DEFAULT_DOMAIN, ROLE_NOT_SURE,
  normalizeDomain, normalizeRole, normalizeLanguages, normalizeMinutes, normalizeDaysPerWeek,
} from './careerDomainService';

/**
 * One normalized answer to "who is this student right now, academically and career-wise?"
 *
 * Every later CareerPilot engine reads this rather than assembling its own view, which is
 * the point: today the same question is answered from `user.passport` in one place and
 * `StudentProfile` in another, and the two disagree the moment a student edits a form.
 *
 * WHERE EACH FIELD LIVES — there is exactly one writer for each:
 *
 *   education, location   StudentProfile owns them. `user.passport` holds a cached copy
 *                         because the roadmap engine reads it on a hot path, kept in step
 *                         by passportProfileSyncService, which never clobbers a filled
 *                         value with a blank one. This service prefers the profile and
 *                         falls back to the cache, so a member who has one but not the
 *                         other still resolves.
 *
 *   career, availability  CareerPilot owns them, on `user.passport`. They have no home on
 *                         StudentProfile because they are statements about a plan rather
 *                         than facts about a student.
 *
 *   derived               Owned by nobody — computed here on every read, never trusted
 *                         from storage. `passport.stage` is a cache for queries, not the
 *                         answer; a student advances from foundation to placement with
 *                         nobody editing a record, and a stale cache would hide that.
 *
 * Deliberately contains no AI call. Stage and background are arithmetic over a course
 * length and a word list, and a model would make them non-reproducible for no gain.
 */

export const CONTEXT_VERSION = 1;

export interface StudentCareerContext {
  tenantId: string;
  studentId: string;
  education: {
    program: string | null;
    degree: string | null;
    branch: string | null;
    currentAcademicYear: string | null;
    graduationYear: number | null;
    graduationMonth: number | null;
    collegeName: string | null;
    university: string | null;
  };
  location: { country: string | null; state: string | null; city: string | null };
  career: {
    domain: string;
    primaryRole: string;
    secondaryRole: string | null;
    careerGoal: string | null;
    preferredProgrammingLanguages: string[];
    preferredTechnologies: string[];
    /** What they already know, from StudentProfile. Read-only here — see the note above. */
    knownProgrammingLanguages: string[];
  };
  availability: { minutesPerDay: number | null; daysPerWeek: number | null };
  derived: {
    stage: string | null;
    background: string | null;
    monthsToGraduation: number | null;
    computedAt: Date;
  };
  status: {
    onboardingCompleted: boolean;
    contextVersion: number;
    /** Which required answers are still missing, so a caller need not re-derive the rule. */
    missing: string[];
    completedAt: Date | null;
  };
}

const str = (v: any): string | null => {
  const s = String(v ?? '').trim();
  return s ? s : null;
};
const num = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * What CareerPilot needs before it can plan for someone.
 *
 * Not the same as StudentProfile.isProfileComplete, which asks about a longer form for a
 * different purpose — a member can be complete for one and not the other, and conflating
 * them would either block CareerPilot on a photo or call a plan ready with no course.
 *
 * NOT_SURE counts as an answer to the role question. Branch is not required: it is
 * meaningless for some programs, and a required field that cannot be answered is a wall.
 */
export function missingFor(ctx: Omit<StudentCareerContext, 'status'>): string[] {
  const missing: string[] = [];
  if (!ctx.education.degree && !ctx.education.program) missing.push('education.degree');
  if (!ctx.education.currentAcademicYear) missing.push('education.currentAcademicYear');
  if (!ctx.career.domain) missing.push('career.domain');
  if (!ctx.career.primaryRole) missing.push('career.primaryRole');
  if (!ctx.availability.minutesPerDay) missing.push('availability.minutesPerDay');
  return missing;
}

/**
 * Build the context for one member.
 *
 * `now` is injectable so the stage tests are not hostage to the date they run on — a
 * suite that passes in August and fails in June is worse than no suite.
 */
export async function getCareerContext(
  tenantId: string,
  studentId: string,
  now: Date = new Date(),
): Promise<StudentCareerContext | null> {
  const user: any = await User.findOne({ _id: studentId, tenantId }).select('passport').lean();
  if (!user) return null;

  const p = user.passport || {};
  const profile: any = await StudentProfile.findOne({ userId: studentId }).lean();
  const deg = profile?.education?.degree || {};
  const personal = profile?.personalInfo || {};

  // Profile first, passport cache second. A member with only one of the two still
  // resolves, and neither being present is a member we simply have not asked yet.
  const education = {
    program: str(p.program) || str(deg.name),
    degree: str(deg.name) || str(p.degree),
    branch: str(deg.branch) || str(p.branch),
    currentAcademicYear: str(p.yearOfStudy),
    graduationYear: num(deg.graduationYear) ?? num(p.graduationYear),
    graduationMonth: num(p.graduationMonth),
    collegeName: str(deg.college),
    university: str(deg.university),
  };

  const location = {
    country: str(personal.country),
    state: str(personal.state),
    city: str(personal.city) || str(p.city),
  };

  const domain = normalizeDomain(p.careerDomain);

  const career = {
    domain,
    // An un-onboarded member reads as NOT_SURE rather than null: "we have not asked" and
    // "they do not know" lead to the same handling, and one shape spares every consumer
    // a null check that would otherwise be forgotten somewhere.
    primaryRole: normalizeRole(domain, p.primaryRole),
    secondaryRole: p.secondaryRole ? normalizeRole(domain, p.secondaryRole) : null,
    careerGoal: str(p.careerGoal) || str(profile?.additionalInfo?.careerGoal),
    preferredProgrammingLanguages: normalizeLanguages(domain, p.preferredLanguages),
    preferredTechnologies: Array.isArray(p.preferredTechnologies) ? p.preferredTechnologies.slice(0, 12) : [],
    knownProgrammingLanguages: Array.isArray(profile?.technicalBackground?.programmingLanguages)
      ? profile.technicalBackground.programmingLanguages.slice(0, 20)
      : [],
  };

  // Recomputed, never read from storage. See the header note.
  const graduated = p.graduated === true
    || String(profile?.education?.currentStatus || '') === 'Graduate'
    || /grad/i.test(String(education.currentAcademicYear || ''));

  const derivedRaw = resolveCareerProfile({
    program: education.program,
    branch: education.branch,
    degree: education.degree,
    yearOfStudy: education.currentAcademicYear,
    graduationYear: education.graduationYear,
    graduationMonth: education.graduationMonth,
    graduated,
    now,
  });

  const base = {
    tenantId, studentId,
    education, location, career,
    availability: {
      minutesPerDay: num(p.minutesPerDay),
      daysPerWeek: num(p.daysPerWeek),
    },
    derived: {
      stage: derivedRaw.stage,
      background: derivedRaw.background,
      monthsToGraduation: derivedRaw.monthsToGraduation,
      computedAt: derivedRaw.stageComputedAt,
    },
  };

  const missing = missingFor(base);

  return {
    ...base,
    status: {
      // Completion is the stored fact, not a re-derivation: a member who finished
      // onboarding under an earlier set of questions stays complete when the questions
      // change. `missing` reports the gap without retracting what they already did.
      onboardingCompleted: !!p.contextCompletedAt,
      contextVersion: num(p.contextVersion) ?? CONTEXT_VERSION,
      missing,
      completedAt: p.contextCompletedAt || null,
    },
  };
}

export interface ContextPatch {
  domain?: string;
  primaryRole?: string;
  secondaryRole?: string | null;
  preferredProgrammingLanguages?: string[];
  minutesPerDay?: number;
  daysPerWeek?: number;
  /** Education is accepted here so onboarding is one save; it is written through. */
  program?: string;
  degree?: string;
  branch?: string;
  currentAcademicYear?: string;
  graduationYear?: number | null;
  /** Only true completes onboarding — a partial save must never mark someone done. */
  complete?: boolean;
}

/**
 * Apply an onboarding answer set.
 *
 * Everything is normalized against the domain vocabulary first, so a stored role or
 * language is always one this build knows about. A field the caller omits is left alone:
 * onboarding saves step by step, and treating an absent key as a deletion would empty
 * step 1 when the member reaches step 2.
 *
 * Education written here is ALSO pushed to StudentProfile, because that is its owner.
 * Writing only the passport copy would leave the two disagreeing until the next sync,
 * which is the drift this whole design exists to avoid.
 */
export interface UpdateContextResult {
  context: StudentCareerContext | null;
  /**
   * Present ONLY when completion was asked for and refused, listing what is still needed.
   * Its absence means nothing was rejected — a caller that ignores it cannot mistake a
   * refusal for a success, because the stored context will simply not be complete.
   */
  missing?: string[];
}

export async function updateCareerContext(
  tenantId: string,
  studentId: string,
  patch: ContextPatch,
  now: Date = new Date(),
): Promise<UpdateContextResult> {
  const user: any = await User.findOne({ _id: studentId, tenantId });
  if (!user) return { context: null };

  user.passport = user.passport || {};
  const p = user.passport;

  const domain = normalizeDomain(patch.domain ?? p.careerDomain);
  p.careerDomain = domain;

  if (patch.primaryRole !== undefined) p.primaryRole = normalizeRole(domain, patch.primaryRole);
  if (patch.secondaryRole !== undefined) {
    p.secondaryRole = patch.secondaryRole ? normalizeRole(domain, patch.secondaryRole) : undefined;
  }
  if (patch.preferredProgrammingLanguages !== undefined) {
    p.preferredLanguages = normalizeLanguages(domain, patch.preferredProgrammingLanguages);
  }
  if (patch.minutesPerDay !== undefined) {
    const m = normalizeMinutes(patch.minutesPerDay);
    if (m !== null) p.minutesPerDay = m;
  }
  if (patch.daysPerWeek !== undefined) {
    const d = normalizeDaysPerWeek(patch.daysPerWeek);
    if (d !== null) p.daysPerWeek = d;
  }

  // Education: cache on the passport and write through to its owner.
  const eduPatch: Record<string, string | number> = {};
  const takeEdu = (key: 'program' | 'degree' | 'branch' | 'currentAcademicYear', target: string) => {
    const v = str(patch[key]);
    if (v === null) return;
    p[target === 'currentAcademicYear' ? 'yearOfStudy' : target] = v.slice(0, 120);
    eduPatch[target] = v.slice(0, 120);
  };
  takeEdu('program', 'program');
  takeEdu('degree', 'degree');
  takeEdu('branch', 'branch');
  takeEdu('currentAcademicYear', 'currentAcademicYear');

  if (patch.graduationYear !== undefined) {
    const gy = num(patch.graduationYear);
    if (gy && gy > 1950 && gy < 2100) { p.graduationYear = gy; eduPatch.graduationYear = gy; }
  }

  // Derived values are refreshed on every write so the cached copy other engines read
  // agrees with what this service would compute a moment later.
  const graduated = /grad/i.test(String(p.yearOfStudy || '')) || p.graduated === true;
  const derived = resolveCareerProfile({
    program: p.program, branch: p.branch, degree: p.degree,
    yearOfStudy: p.yearOfStudy,
    graduationYear: p.graduationYear, graduationMonth: p.graduationMonth,
    graduated, now,
  });
  p.stage = derived.stage || undefined;
  p.background = derived.background;
  p.stageComputedAt = derived.stageComputedAt;
  if (graduated) p.graduated = true;

  user.markModified('passport');
  await user.save();

  // StudentProfile is the owner of education, so it is updated too — but only for a
  // member who already has one. Creating a profile as a side effect of a CareerPilot step
  // would manufacture a half-empty record the student never filled in.
  if (Object.keys(eduPatch).length) {
    const set: Record<string, any> = {};
    if (eduPatch.degree) set['education.degree.name'] = eduPatch.degree;
    if (eduPatch.branch) set['education.degree.branch'] = eduPatch.branch;
    if (eduPatch.graduationYear) set['education.degree.graduationYear'] = eduPatch.graduationYear;
    if (Object.keys(set).length) {
      await StudentProfile.updateOne({ userId: studentId, tenantId }, { $set: set }).catch(() => {
        /* a member with no profile keeps the passport copy; nothing is lost */
      });
    }
  }

  let context = await getCareerContext(tenantId, studentId, now);

  /**
   * Completion is decided HERE, and only after the answers are stored and re-assembled.
   *
   * It has to be this way round for two reasons. Whether the context is complete depends
   * on the MERGED view of passport and StudentProfile — a member whose degree lives only
   * on their profile is complete without ever sending one — so the question cannot be
   * answered from the patch alone.
   *
   * And it must be the service that refuses, not a caller. Setting the flag before saving
   * and letting the controller return an error afterwards is what this replaces: the
   * rejection reached the client while the completion was already committed, so a member
   * who was told they were not finished was recorded as finished. Any future caller —
   * an admin tool, a migration, a second endpoint — inherits the guarantee now rather
   * than having to remember the check.
   */
  if (patch.complete === true && context) {
    if (context.status.missing.length) {
      // Nothing about completion has been written. The answers just supplied are still
      // saved, which is correct — a partial step is a partial step, not a failure.
      return { context, missing: context.status.missing };
    }
    p.contextCompletedAt = p.contextCompletedAt || now;   // first completion is the one recorded
    p.contextVersion = CONTEXT_VERSION;
    user.markModified('passport');
    await user.save();
    context = await getCareerContext(tenantId, studentId, now);
  }

  return { context };
}
