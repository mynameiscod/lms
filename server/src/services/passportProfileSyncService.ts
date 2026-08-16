import User from '../models/User';
import { resolveCareerProfile } from './careerStageService';
import { isCareerPilotMember } from './careerPilotPopulation';

/**
 * Keep a CareerPilot member's `passport.*` in step with their student profile.
 *
 * Education lives in StudentProfile — that is the rich record a student edits. But six of
 * those fields are also read by the roadmap engine off `user.passport`, where they decide
 * the member's stage, pathway and therefore which missions they get. `passport.stage` is
 * already a cached read of those inputs rather than a fact in its own right; this keeps
 * the inputs themselves cached the same way.
 *
 * Without it, a student who corrects their degree on the profile screen keeps the pathway
 * that matched their OLD degree, and nothing errors — the roadmap just quietly stops
 * fitting them.
 *
 * NEVER CLOBBERS. A profile that leaves a field blank leaves the passport value alone: the
 * profile form and the join form collect overlapping but different sets, and a blank box on
 * one is not a statement that the other was wrong.
 */

interface ProfileLike {
  education?: {
    degree?: { name?: string; branch?: string; graduationYear?: number };
    currentStatus?: string;
  };
  additionalInfo?: { careerGoal?: string };
}

const clean = (v: any): string | undefined => {
  const s = String(v ?? '').trim();
  return s ? s : undefined;
};

export async function syncPassportFromProfile(
  userId: string,
  profile: ProfileLike,
): Promise<{ synced: boolean; changed: string[] }> {
  const user: any = await User.findById(userId).select('passport').lean();
  /**
   * Members only. The old guard was `if (!user?.passport)`, which never fired — the nested
   * defaults give every LMS student a passport subdocument — so this quietly wrote
   * CareerPilot fields onto the records of students who have never opened the product.
   */
  if (!isCareerPilotMember(user?.passport)) return { synced: false, changed: [] };

  const p = user.passport;
  const deg = profile.education?.degree || {};

  const next: Record<string, any> = {};
  const take = (field: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    if (p[field] === value) return;
    next[`passport.${field}`] = value;
  };

  take('degree', clean(deg.name));
  take('branch', clean(deg.branch));
  take('careerGoal', clean(profile.additionalInfo?.careerGoal));

  const gy = Number(deg.graduationYear);
  if (Number.isFinite(gy) && gy > 1950 && gy < 2100) take('graduationYear', gy);

  // "Graduate" and "Working Professional" both mean they are out of college, which is what
  // staging actually turns on.
  const status = clean(profile.education?.currentStatus);
  if (status) take('graduated', status === 'Graduate' || status === 'Working Professional');

  if (!Object.keys(next).length) return { synced: false, changed: [] };

  // Recompute the derived stage from the merged picture, not from the patch alone —
  // yearOfStudy comes from the join form and is not on the profile at all.
  const merged = {
    degree: next['passport.degree'] ?? p.degree,
    branch: next['passport.branch'] ?? p.branch,
    program: p.program,
    yearOfStudy: p.yearOfStudy,
    graduationYear: next['passport.graduationYear'] ?? p.graduationYear ?? null,
    graduationMonth: p.graduationMonth ?? null,
    graduated: next['passport.graduated'] ?? p.graduated ?? false,
  };
  const derived = resolveCareerProfile(merged as any);
  Object.entries(derived).forEach(([k, v]) => {
    if (v !== undefined && v !== null) next[`passport.${k}`] = v;
  });

  await User.updateOne({ _id: userId }, { $set: next });
  return { synced: true, changed: Object.keys(next).map(k => k.replace('passport.', '')) };
}
