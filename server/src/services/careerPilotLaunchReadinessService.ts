import { buildConfigHealth, HealthArea, HealthFinding, Severity } from './careerPilotConfigHealthService';

/**
 * Is this tenant fit to launch CareerPilot?
 *
 * A roll-up of the configuration health findings, area by area, under one rule stated in
 * full below. It is OPERATIONAL GUIDANCE, not a guarantee: it says every check we know how
 * to run has passed, which is a different claim from "this will work".
 *
 * NO AI, AND NO JUDGEMENT. Asking a model whether a product is production-ready produces an
 * answer nobody can reproduce, defend or act on. This counts findings.
 */

export type LaunchStatus = 'NOT_READY' | 'READY_WITH_WARNINGS' | 'READY';
export type AreaStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface AreaReport {
  area: HealthArea;
  label: string;
  status: AreaStatus;
  errors: number;
  warnings: number;
  findings: HealthFinding[];
}

export interface LaunchReadinessResult {
  status: LaunchStatus;
  checkedAt: string;
  summary: { error: number; warning: number; info: number };
  areas: AreaReport[];
  /** Said plainly, so nobody reads a green light as a promise. */
  disclaimer: string;
}

const AREA_LABELS: Record<HealthArea, string> = {
  core: 'Core configuration',
  roles: 'Career roles',
  skills: 'Skill graph',
  assessment: 'Assessment',
  roadmap: 'Roadmap',
  gamification: 'Gamification',
  rewards: 'Rewards',
  interview: 'Resume & interview',
  companies: 'Companies',
  security: 'Security & secrets',
  database: 'Database',
};

const AREA_ORDER: HealthArea[] = [
  'core', 'roles', 'skills', 'assessment', 'roadmap',
  'gamification', 'rewards', 'interview', 'companies', 'security', 'database',
];

const statusFor = (errors: number, warnings: number): AreaStatus =>
  errors ? 'FAIL' : warnings ? 'WARNING' : 'PASS';

export async function buildLaunchReadiness(tenantId: string): Promise<LaunchReadinessResult> {
  const health = await buildConfigHealth(tenantId);

  const areas: AreaReport[] = AREA_ORDER.map(area => {
    const findings = health.findings.filter(f => f.area === area);
    const errors = findings.filter(f => f.severity === 'ERROR').length;
    const warnings = findings.filter(f => f.severity === 'WARNING').length;
    return { area, label: AREA_LABELS[area], status: statusFor(errors, warnings), errors, warnings, findings };
  });

  /**
   * The rule, in one place.
   *
   * ANY error blocks. Not a weighted score, not a threshold — an unpublished blueprint or an
   * unpinned encryption key is not something three passing areas can offset, and a readiness
   * signal that could be argued with is not a readiness signal.
   *
   * INFO never counts. It exists to tell an admin that something optional is switched off,
   * which is not a defect.
   */
  const status: LaunchStatus = health.counts.error > 0
    ? 'NOT_READY'
    : health.counts.warning > 0
      ? 'READY_WITH_WARNINGS'
      : 'READY';

  return {
    status,
    checkedAt: health.checkedAt,
    summary: health.counts,
    areas,
    disclaimer:
      'Operational guidance, not a guarantee. This reports that the checks we know how to run '
      + 'have passed — it does not measure load, data quality, or anything nobody thought to check.',
  };
}
