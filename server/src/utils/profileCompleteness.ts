/**
 * Profile completeness % from a StudentProfile document (or null).
 * Weighted by section so a few key fields drive the bulk of the score.
 */
export function computeProfileCompleteness(profile: any): number {
  if (!profile) return 0;
  const checks: boolean[] = [];
  const has = (v: any) => v !== undefined && v !== null && String(v).trim() !== '';
  const hasArr = (v: any) => Array.isArray(v) && v.length > 0;

  const p = profile.personalInfo || {};
  checks.push(has(p.firstName), has(p.email), has(p.mobileNumber), has(p.gender),
    has(p.dateOfBirth), has(p.city) || has(p.state), has(p.address), has(p.profilePhoto));

  const pr = profile.professionalProfiles || {};
  checks.push(has(pr.linkedInUrl), has(pr.githubUrl), has(pr.resumeUrl));

  const e = profile.education || {};
  checks.push(has(e.highestQualification), has(e.degree?.college), has(e.tenthClass?.schoolName));

  const t = profile.technicalBackground || {};
  checks.push(hasArr(t.programmingLanguages), hasArr(t.technologies), has(t.experienceLevel));

  const c = profile.courseInterest || {};
  checks.push(has(c.interestedCourse), has(c.preferredLearningMode));

  const a = profile.additionalInfo || {};
  checks.push(has(a.careerGoal));

  const filled = checks.filter(Boolean).length;
  return checks.length ? Math.round((filled / checks.length) * 100) : 0;
}
