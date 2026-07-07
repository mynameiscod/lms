/**
 * Profile completeness for a StudentProfile document (or null).
 * This utility must match the stored StudentProfile pre-save calculation.
 */
export interface ProfileCheck { section: string; label: string; ok: boolean }

const has = (v: any) => v !== undefined && v !== null && String(v).trim() !== '';
const hasArr = (v: any) => Array.isArray(v) && v.length > 0;

export function profileChecks(profile: any): ProfileCheck[] {
  const p  = profile?.personalInfo || {};
  const pr = profile?.professionalProfiles || {};
  const e  = profile?.education || {};
  const t  = profile?.technicalBackground || {};
  const c  = profile?.courseInterest || {};
  const a  = profile?.additionalInfo || {};

  return [
    { section: 'Personal Info', label: 'First name',            ok: has(p.firstName) },
    { section: 'Personal Info', label: 'Surname',               ok: has(p.surname) },
    { section: 'Personal Info', label: 'Email',                 ok: has(p.email) },
    { section: 'Personal Info', label: 'Mobile number',         ok: has(p.mobileNumber) },
    { section: 'Personal Info', label: 'Country',               ok: has(p.country) },
    { section: 'Personal Info', label: 'State',                 ok: has(p.state) },
    { section: 'Personal Info', label: 'City',                  ok: has(p.city) },
    { section: 'Personal Info', label: 'Gender',                ok: has(p.gender) },
    { section: 'Personal Info', label: 'Date of birth',         ok: has(p.dateOfBirth) },
    { section: 'Professional',  label: 'Any professional profile', ok: has(pr.linkedInUrl) || has(pr.githubUrl) || has(pr.portfolioUrl) || has(pr.resumeUrl) },
    { section: 'Education',     label: 'Highest qualification',  ok: has(e.highestQualification) },
    { section: 'Education',     label: 'Current status',          ok: has(e.currentStatus) },
    { section: 'Education',     label: '10th school details',    ok: has(e.tenthClass?.schoolName) },
    { section: 'Technical',     label: 'Programming languages',  ok: hasArr(t.programmingLanguages) },
    { section: 'Technical',     label: 'Technologies',           ok: hasArr(t.technologies) },
    { section: 'Technical',     label: 'Experience level',       ok: has(t.experienceLevel) },
    { section: 'Course Interest', label: 'Interested course',    ok: has(c.interestedCourse) },
    { section: 'Course Interest', label: 'Preferred learning mode', ok: has(c.preferredLearningMode) },
    { section: 'Course Interest', label: 'Preferred batch time',  ok: has(c.preferredBatchTime) },
    { section: 'Additional Info', label: 'Career goal / referral source', ok: has(a.howDidYouHear) || has(a.careerGoal) },
  ];
}

export function computeProfileCompleteness(profile: any): number {
  if (!profile) return 0;
  const checks = profileChecks(profile);
  const filled = checks.filter(c => c.ok).length;
  return checks.length ? Math.round((filled / checks.length) * 100) : 0;
}

// The incomplete items, grouped by section — powers the admin breakdown + the email.
export function computeProfileMissing(profile: any): { section: string; fields: string[] }[] {
  const missing = profileChecks(profile).filter(c => !c.ok);
  const bySection: Record<string, string[]> = {};
  for (const m of missing) { (bySection[m.section] ||= []).push(m.label); }
  return Object.entries(bySection).map(([section, fields]) => ({ section, fields }));
}
