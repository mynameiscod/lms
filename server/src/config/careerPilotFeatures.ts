/**
 * CareerPilot, one feature at a time.
 *
 * Until now CareerPilot had ONE switch (`careerPilot`) and ONE permission (`manage_passport`), so an
 * institute that had it saw every admin screen, and every tenant admin could do everything in it. Now
 * the platform administrator switches each part on for an institute, and the institute's admin gives
 * each part to a role on its own.
 *
 * Every feature follows `careerPilot` until the platform administrator saves it (see MODULE_PARENT in
 * tenantModules.ts): an institute that has CareerPilot today keeps all of it; a NEW institute starts with
 * none. `manage_passport` stays as the "everything" permission, so no existing role loses access.
 *
 * `gate`  = API paths (under /passport and /careerpilot) that only this feature's screens use. A request
 *           to one is refused when the feature is off for the institute.
 * `also`  = more paths that belong to the feature for PERMISSIONS only. They are left out of `gate`
 *           because members' own screens read some of them (config, skills, curriculum…) and switching
 *           a feature off must not break the member app.
 */

export interface CpFeature {
  key: string;
  label: string;
  desc: string;
  /** Who it is for: the institute's admins, or the members themselves. */
  side: 'admin' | 'member';
  /** Permission a role needs for the write side of this feature (admin features only). */
  perm?: string;
  gate: string[];
  also?: string[];
}

export const CP_FEATURES: CpFeature[] = [
  { key: 'cpMembers', side: 'admin', perm: 'manage_passport_members', label: 'CareerPilot: Members & activity', desc: 'Member list, activity, analytics, drop-off funnel, granting membership',
    gate: ['/students', '/members', '/funnel', '/convert', '/admin', '/activity'] },
  { key: 'cpSetup', side: 'admin', perm: 'manage_passport_setup', label: 'CareerPilot: Setup, coins & news', desc: 'Configuration, coin rules, rewards and news',
    gate: ['/coins/admin', '/rewards/admin', '/gamification/admin', '/news/admin'], also: ['/config'] },
  { key: 'cpPathways', side: 'admin', perm: 'manage_passport_pathways', label: 'CareerPilot: Pathways & missions', desc: 'Pathways, pathway rules and daily missions',
    gate: ['/pathway-rules'], also: ['/missions', '/pathways'] },
  { key: 'cpCareerMap', side: 'admin', perm: 'manage_passport_career_map', label: 'CareerPilot: Roles & skills', desc: 'Career roles, skill graph, role blueprints, skill evidence, stage curriculum',
    gate: ['/career-roles', '/skill-evidence', '/role-blueprints', '/stage-skill-sets', '/stage-curriculum'], also: ['/skills', '/skill-resources', '/spine'] },
  { key: 'cpAssessment', side: 'admin', perm: 'manage_passport_assessment', label: 'CareerPilot: Assessment & question bank', desc: 'Assessment shape, coverage, preview, question drafting and bank',
    gate: ['/question-bank', '/question-drafts', '/assessment/admin', '/assessment/policies', '/assessments'], also: ['/assessment'] },
  { key: 'cpContent', side: 'admin', perm: 'manage_passport_content', label: 'CareerPilot: Learning content', desc: 'Content builder, mega curriculum, orientation, learning studio, concepts, company questions',
    gate: ['/curriculum-units', '/concept-learning-units', '/company-admin', '/staging', '/admin/topic-priorities', '/admin/topic-priorities-draft'],
    also: ['/curriculum', '/content', '/companies', '/orientation', '/interview-plans'] },
  { key: 'cpRoadmap', side: 'member', label: 'CareerPilot: Member roadmap', desc: 'The member\'s personal roadmap, plan and foundation journey',
    gate: ['/me/roadmap', '/me/plan', '/me/foundation-journey', '/roadmap'] },
  { key: 'cpPractice', side: 'member', label: 'CareerPilot: Member practice & interviews', desc: 'Practice problems, mock tests, mock interviews, company prep',
    gate: ['/practice', '/mock-test', '/interview', '/company-prep'] },
  { key: 'cpRewards', side: 'member', label: 'CareerPilot: Member coins & rewards', desc: 'Coins, rewards, gamification and the leaderboard',
    gate: ['/me/rewards', '/me/redemptions', '/me/gamification', '/leaderboard', '/coins'] },
];

export const CP_FEATURE_KEYS = CP_FEATURES.map((f) => f.key);
export const CP_ADMIN_PERMS = CP_FEATURES.filter((f) => f.perm).map((f) => f.perm as string);

/** Both mounts serve the same router, and the legacy one must keep answering. */
export const CP_API_BASES = ['/passport', '/careerpilot'];

/** API path prefix → feature module, for the module gate. */
export const CP_API_PREFIXES: [string, string][] = CP_API_BASES.flatMap((base) =>
  CP_FEATURES.flatMap((f) => f.gate.map((p): [string, string] => [`${base}${p}`, f.key])),
);

/** Which feature a path inside the passport router belongs to, for permissions (gate + also), longest prefix first. */
export function cpFeatureForRouterPath(path: string): CpFeature | null {
  let best: { f: CpFeature; len: number } | null = null;
  for (const f of CP_FEATURES) {
    for (const p of [...f.gate, ...(f.also || [])]) {
      if ((path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`)) && (!best || p.length > best.len)) best = { f, len: p.length };
    }
  }
  return best?.f || null;
}
