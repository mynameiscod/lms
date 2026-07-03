/**
 * Profile completeness for a StudentProfile document (or null).
 * A single labelled checklist drives both the % and the "what's missing" list.
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
    { section: 'Personal Info', label: 'Email',                 ok: has(p.email) },
    { section: 'Personal Info', label: 'Mobile number',         ok: has(p.mobileNumber) },
    { section: 'Personal Info', label: 'Gender',                ok: has(p.gender) },
    { section: 'Personal Info', label: 'Date of birth',         ok: has(p.dateOfBirth) },
    { section: 'Personal Info', label: 'City / State',          ok: has(p.city) || has(p.state) },
    { section: 'Personal Info', label: 'Address',               ok: has(p.address) },
    { section: 'Personal Info', label: 'Profile photo',         ok: has(p.profilePhoto) },
    { section: 'Professional',  label: 'LinkedIn profile',      ok: has(pr.linkedInUrl) },
    { section: 'Professional',  label: 'GitHub profile',        ok: has(pr.githubUrl) },
    { section: 'Professional',  label: 'Resume',                ok: has(pr.resumeUrl) },
    { section: 'Education',     label: 'Highest qualification', ok: has(e.highestQualification) },
    { section: 'Education',     label: 'Degree college',        ok: has(e.degree?.college) },
    { section: 'Education',     label: '10th school details',   ok: has(e.tenthClass?.schoolName) },
    { section: 'Technical',     label: 'Programming languages', ok: hasArr(t.programmingLanguages) },
    { section: 'Technical',     label: 'Technologies',          ok: hasArr(t.technologies) },
    { section: 'Technical',     label: 'Experience level',      ok: has(t.experienceLevel) },
    { section: 'Course Interest', label: 'Interested course',   ok: has(c.interestedCourse) },
    { section: 'Course Interest', label: 'Preferred learning mode', ok: has(c.preferredLearningMode) },
    { section: 'Additional Info', label: 'Career goal',         ok: has(a.careerGoal) },
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
