import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import CareerSkill from '../models/CareerSkill';
import CareerRole from '../models/CareerRole';
import { DEFAULT_ROLE_BLUEPRINTS } from '../data/roleSkillBlueprints';
import { DEFAULT_DOMAIN } from './careerDomainService';

/**
 * Installing the default role blueprints for a tenant.
 *
 * EXPLICIT, never on a read path — the same rule as the skill taxonomy, for the same
 * reason: this reads two collections and writes seven documents, which is not something to
 * do behind an ordinary page load.
 *
 * INSERT-ONLY, PER ROLE. A tenant that already has a Backend Engineer blueprint keeps it
 * exactly as it is, including edited weights, removed requirements and deactivated ones.
 * Running the seed twice changes nothing the second time. Without that, the button would
 * silently discard an admin's work every time somebody pressed it.
 *
 * IT CREATES NOTHING IT DOES NOT OWN. A default that names a role or skill this tenant
 * does not have is REPORTED, never fabricated. Module 2 owns roles and Module 3 owns
 * skills; a seed that quietly added to either would give those collections a second owner
 * and no way to tell which one was right.
 */

export interface BlueprintSeedReport {
  /** Roles whose blueprint was installed. */
  inserted: string[];
  /** Roles that already had one and were left untouched. */
  skipped: string[];
  /** Defaults naming a role this tenant does not have. */
  missingRoles: string[];
  /** skillKey → the roles that wanted it, where the skill does not exist or is inactive. */
  missingSkills: Record<string, string[]>;
  /** Requirements dropped because their skill could not be resolved. */
  droppedRequirements: number;
  total: number;
}

export async function seedRoleBlueprints(
  tenantId: string,
  opts: { dryRun?: boolean; updatedBy?: string } = {},
): Promise<BlueprintSeedReport> {
  const [existing, roles, skills] = await Promise.all([
    RoleSkillBlueprint.find({ tenantId }).select('roleKey').lean() as any,
    CareerRole.find({ tenantId }).select('key domainKey').lean() as any,
    CareerSkill.find({}).select('key active nodeType domainKey').lean() as any,
  ]);

  const haveBlueprint = new Set(existing.map((b: any) => b.roleKey));
  const roleByKey = new Map(roles.map((r: any) => [r.key, r]));
  const skillByKey = new Map(skills.map((s: any) => [s.key, s]));

  const report: BlueprintSeedReport = {
    inserted: [], skipped: [], missingRoles: [], missingSkills: {},
    droppedRequirements: 0, total: DEFAULT_ROLE_BLUEPRINTS.length,
  };

  const toInsert: any[] = [];

  for (const bp of DEFAULT_ROLE_BLUEPRINTS) {
    if (!roleByKey.has(bp.roleKey)) { report.missingRoles.push(bp.roleKey); continue; }
    if (haveBlueprint.has(bp.roleKey)) { report.skipped.push(bp.roleKey); continue; }

    const requirements: any[] = [];
    bp.requirements.forEach((r, i) => {
      const skill: any = skillByKey.get(r.skillKey);
      // Unresolvable or retired skills are dropped from the seeded blueprint and named in
      // the report. Installing a requirement pointing at nothing would look configured and
      // behave as though it were not.
      if (!skill || skill.active === false || skill.nodeType === 'GROUP') {
        (report.missingSkills[r.skillKey] ||= []).push(bp.roleKey);
        report.droppedRequirements++;
        return;
      }
      requirements.push({
        skillKey: r.skillKey, importance: r.importance, weight: r.weight,
        targetLevel: r.targetLevel, active: true, displayOrder: (i + 1) * 10,
        note: r.note,
      });
    });

    toInsert.push({
      tenantId, domainKey: DEFAULT_DOMAIN, roleKey: bp.roleKey,
      requirements,
      // Seeded as a DRAFT. These are a reasonable starting point rather than this
      // college's considered position, and publishing should be somebody's decision.
      published: false,
      version: 1,
      createdBy: opts.updatedBy, updatedBy: opts.updatedBy,
    });
    report.inserted.push(bp.roleKey);
  }

  if (opts.dryRun || !toInsert.length) return report;

  await RoleSkillBlueprint.insertMany(toInsert, { ordered: false }).catch((e: any) => {
    // A concurrent run may have won; a duplicate means the blueprint exists, which is the
    // state we wanted.
    if (e?.code !== 11000 && !/E11000/.test(String(e?.message))) throw e;
  });

  return report;
}
