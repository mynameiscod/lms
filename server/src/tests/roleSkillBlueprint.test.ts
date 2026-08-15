import { validateBlueprint, cleanRequirements } from '../services/roleSkillBlueprintService';
import { DEFAULT_ROLE_BLUEPRINTS, SUGGESTED_TAXONOMY_ADDITIONS } from '../data/roleSkillBlueprints';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';
import { SYSTEM_CAREER_ROLES } from '../models/CareerRole';
import { SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, DEFAULT_WEIGHT } from '../models/RoleSkillBlueprint';

/**
 * Module 4 — what a role expects, and what must never be storable.
 *
 * Pure validation over an in-memory skill list, so these run without a database and cover
 * the decisions rather than the plumbing.
 */

const SKILL = (key: string, over: any = {}) => ({
  key, name: key, domainKey: 'SOFTWARE_ENGINEERING',
  nodeType: 'SKILL', active: true, ...over,
} as any);

const REQ = (skillKey: string, over: any = {}) => ({
  skillKey, importance: 'ESSENTIAL', weight: 10, targetLevel: 'PROFICIENT',
  active: true, displayOrder: 10, ...over,
});

const DOMAIN = 'SOFTWARE_ENGINEERING';

describe('mapping a skill to a role', () => {
  it('accepts a valid requirement', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('JAVA_OOP')], skills: [SKILL('JAVA_OOP')],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a skill that does not exist', () => {
    const r = validateBlueprint({ domainKey: DOMAIN, requirements: [REQ('GHOST')], skills: [] });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/GHOST does not exist/i);
  });

  it('rejects the same skill twice rather than de-duplicating it', () => {
    // Silently collapsing them would hide whichever of the two was wrong.
    const r = validateBlueprint({
      domainKey: DOMAIN,
      requirements: [REQ('JAVA_OOP', { weight: 10 }), REQ('JAVA_OOP', { weight: 4 })],
      skills: [SKILL('JAVA_OOP')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/appears twice/i);
  });

  it('rejects a skill from another career domain', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('FOREIGN')],
      skills: [SKILL('FOREIGN', { domainKey: 'HEALTHCARE', name: 'Foreign Skill' })],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/different career domain/i);
  });

  it('rejects an organisational GROUP node', () => {
    // "Programming" is a shelf. A blueprint entry pointing at it could not be measured.
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('PROGRAMMING')],
      skills: [SKILL('PROGRAMMING', { nodeType: 'GROUP', name: 'Programming' })],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/grouping, not a measurable skill/i);
  });

  it('rejects a requirement with no skill at all', () => {
    const r = validateBlueprint({ domainKey: DOMAIN, requirements: [REQ('')], skills: [] });
    expect(r.ok).toBe(false);
  });
});

describe('weight', () => {
  it.each([1, 5, 10])('accepts %i', (weight) => {
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { weight })], skills: [SKILL('A')],
    }).ok).toBe(true);
  });

  it.each([0, 11, -1, 100])('rejects %i', (weight) => {
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { weight })], skills: [SKILL('A')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/between 1 and 10/i);
  });

  it('rejects a fractional weight', () => {
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { weight: 7.5 })], skills: [SKILL('A')],
    }).ok).toBe(false);
  });

  it('does not require weights to total anything', () => {
    // Forcing a sum of 100 would make every edit into arithmetic.
    const reqs = ['A', 'B', 'C'].map(k => REQ(k, { weight: 10 }));
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: reqs, skills: ['A', 'B', 'C'].map(k => SKILL(k)),
    }).ok).toBe(true);
  });
});

describe('importance and target level', () => {
  it.each(SKILL_IMPORTANCE)('accepts importance %s', (importance) => {
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { importance })], skills: [SKILL('A')],
    }).ok).toBe(true);
  });

  it('rejects an unknown importance', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { importance: 'CRITICAL' })], skills: [SKILL('A')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Importance must be one of/i);
  });

  it.each(SKILL_TARGET_LEVELS)('accepts target %s', (targetLevel) => {
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { targetLevel })], skills: [SKILL('A')],
    }).ok).toBe(true);
  });

  it('rejects an unknown target level', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { targetLevel: 'EXPERT' })], skills: [SKILL('A')],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Target level must be one of/i);
  });

  it('does not accept a percentage as a target', () => {
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('A', { targetLevel: '83%' })], skills: [SKILL('A')],
    }).ok).toBe(false);
  });
});

describe('a skill that has since been deactivated', () => {
  /**
   * The same correction Module 3 needed: the active rule is about a CHOICE. Re-checking a
   * standing requirement would lock the blueprint the moment any one of its skills was
   * retired — on the very screen where an admin would fix it.
   */
  it('may be kept, so the rest of the blueprint stays editable', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN,
      requirements: [REQ('JAVA_COLLECTIONS', { weight: 6 })],
      skills: [SKILL('JAVA_COLLECTIONS', { active: false, name: 'Java Collections' })],
      existingSkillKeys: ['JAVA_COLLECTIONS'],
    });
    expect(r.ok).toBe(true);
  });

  it('may be kept while an active skill is added alongside it', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN,
      requirements: [REQ('JAVA_COLLECTIONS'), REQ('SQL_JOINS')],
      skills: [SKILL('JAVA_COLLECTIONS', { active: false }), SKILL('SQL_JOINS')],
      existingSkillKeys: ['JAVA_COLLECTIONS'],
    });
    expect(r.ok).toBe(true);
  });

  it('is refused when NEWLY added', () => {
    const r = validateBlueprint({
      domainKey: DOMAIN,
      requirements: [REQ('RETIRED')],
      skills: [SKILL('RETIRED', { active: false, name: 'Retired Skill' })],
      existingSkillKeys: [],
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Retired Skill is inactive/i);
  });

  it('is refused when newly added to a DIFFERENT role that never had it', () => {
    // Scenario 6's second half: retained in one blueprint, still unavailable to another.
    const r = validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('JAVA_COLLECTIONS')],
      skills: [SKILL('JAVA_COLLECTIONS', { active: false, name: 'Java Collections' })],
      existingSkillKeys: ['SOMETHING_ELSE'],
    });
    expect(r.ok).toBe(false);
  });

  it('can be removed outright', () => {
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [], skills: [], existingSkillKeys: ['JAVA_COLLECTIONS'],
    }).ok).toBe(true);
  });

  it('does not let a retained key bypass the OTHER checks', () => {
    // Only the active rule relaxes. A group is still a group; a foreign domain still foreign.
    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('GRP')],
      skills: [SKILL('GRP', { nodeType: 'GROUP', active: false })], existingSkillKeys: ['GRP'],
    }).ok).toBe(false);

    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('FOREIGN')],
      skills: [SKILL('FOREIGN', { domainKey: 'FINANCE', active: false })], existingSkillKeys: ['FOREIGN'],
    }).ok).toBe(false);

    expect(validateBlueprint({
      domainKey: DOMAIN, requirements: [REQ('GONE')], skills: [], existingSkillKeys: ['GONE'],
    }).ok).toBe(false);
  });
});

describe('shaping a submitted list', () => {
  it('uppercases keys and orders by position', () => {
    const out = cleanRequirements([{ skillKey: 'java_oop' }, { skillKey: 'sql_joins' }]);
    expect(out.map(r => r.skillKey)).toEqual(['JAVA_OOP', 'SQL_JOINS']);
    expect(out[0].displayOrder).toBeLessThan(out[1].displayOrder);
  });

  it('falls back to the weight the chosen importance suggests', () => {
    // Not a fixed number: an omitted weight should at least agree with what was said.
    const out = cleanRequirements([{ skillKey: 'A', importance: 'SUPPORTING' }]);
    expect(out[0].weight).toBe(DEFAULT_WEIGHT.SUPPORTING);
  });

  it('drops entries with no skill key', () => {
    expect(cleanRequirements([{ skillKey: '' }, { skillKey: 'A' }])).toHaveLength(1);
  });

  it('survives rubbish input', () => {
    expect(cleanRequirements(null)).toEqual([]);
    expect(cleanRequirements('nope')).toEqual([]);
  });

  it('defaults active to true but honours an explicit false', () => {
    expect(cleanRequirements([{ skillKey: 'A' }])[0].active).toBe(true);
    expect(cleanRequirements([{ skillKey: 'A', active: false }])[0].active).toBe(false);
  });
});

describe('the shipped default blueprints', () => {
  const skillKeys = new Set(CAREER_SKILL_TAXONOMY.map(s => s.key));
  const groupKeys = new Set(CAREER_SKILL_TAXONOMY.filter(s => s.nodeType === 'GROUP').map(s => s.key));
  const roleKeys = new Set(SYSTEM_CAREER_ROLES.map(r => r.key));

  it('covers every seeded career role', () => {
    expect(DEFAULT_ROLE_BLUEPRINTS.map(b => b.roleKey).sort()).toEqual([...roleKeys].sort());
  });

  it('has no blueprint for NOT_SURE — it is not a role', () => {
    expect(DEFAULT_ROLE_BLUEPRINTS.some(b => b.roleKey === 'NOT_SURE')).toBe(false);
  });

  it('references ONLY skills that exist in the Module 3 taxonomy', () => {
    // Module 4 must not invent skills; Module 3 owns that catalogue.
    const unknown: string[] = [];
    for (const bp of DEFAULT_ROLE_BLUEPRINTS) {
      for (const r of bp.requirements) if (!skillKeys.has(r.skillKey)) unknown.push(`${bp.roleKey} → ${r.skillKey}`);
    }
    expect(unknown).toEqual([]);
  });

  it('never requires a grouping node', () => {
    const groups: string[] = [];
    for (const bp of DEFAULT_ROLE_BLUEPRINTS) {
      for (const r of bp.requirements) if (groupKeys.has(r.skillKey)) groups.push(`${bp.roleKey} → ${r.skillKey}`);
    }
    expect(groups).toEqual([]);
  });

  it('uses valid weights, importance and targets throughout', () => {
    for (const bp of DEFAULT_ROLE_BLUEPRINTS) {
      const check = validateBlueprint({
        domainKey: DOMAIN,
        requirements: bp.requirements,
        skills: bp.requirements.map(r => SKILL(r.skillKey)),
      });
      expect({ role: bp.roleKey, ok: check.ok, why: check.message }).toEqual({ role: bp.roleKey, ok: true, why: undefined });
    }
  });

  it('lists no skill twice within a role', () => {
    for (const bp of DEFAULT_ROLE_BLUEPRINTS) {
      const keys = bp.requirements.map(r => r.skillKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('gives every role a genuinely different set, not one list repeated', () => {
    const sets = DEFAULT_ROLE_BLUEPRINTS.map(b => b.requirements.map(r => r.skillKey).sort().join(','));
    expect(new Set(sets).size).toBe(sets.length);
  });

  it('keeps the general-purpose roles language-neutral', () => {
    // A backend engineer needs a language, not a PARTICULAR one — requiring Java would
    // quietly turn the role into "Java Backend Engineer".
    for (const roleKey of ['BACKEND_ENGINEER', 'SOFTWARE_ENGINEER', 'QA_SDET', 'CLOUD_DEVOPS', 'MOBILE_ENGINEER']) {
      const bp = DEFAULT_ROLE_BLUEPRINTS.find(b => b.roleKey === roleKey)!;
      const langSpecific = bp.requirements.filter(r => /^(JAVA|PYTHON|JS)_/.test(r.skillKey));
      expect({ roleKey, langSpecific: langSpecific.map(r => r.skillKey) }).toEqual({ roleKey, langSpecific: [] });
    }
  });

  it('does allow JavaScript for the frontend role — the browser offers no alternative', () => {
    const fe = DEFAULT_ROLE_BLUEPRINTS.find(b => b.roleKey === 'FRONTEND_ENGINEER')!;
    expect(fe.requirements.some(r => r.skillKey.startsWith('JS_'))).toBe(true);
    expect(fe.requirements.some(r => r.skillKey === 'HTML')).toBe(true);
  });

  it('does not make full stack the union of backend and frontend', () => {
    const bp = (k: string) => DEFAULT_ROLE_BLUEPRINTS.find(b => b.roleKey === k)!.requirements.length;
    expect(bp('FULLSTACK_ENGINEER')).toBeLessThan(bp('BACKEND_ENGINEER') + bp('FRONTEND_ENGINEER'));
  });

  it('differentiates roles where it should — QA leads on testing, DevOps on systems', () => {
    const weightOf = (role: string, skill: string) =>
      DEFAULT_ROLE_BLUEPRINTS.find(b => b.roleKey === role)!.requirements.find(r => r.skillKey === skill)?.weight ?? 0;

    expect(weightOf('QA_SDET', 'TESTING_FUNDAMENTALS')).toBeGreaterThan(weightOf('BACKEND_ENGINEER', 'TESTING_FUNDAMENTALS'));
    expect(weightOf('CLOUD_DEVOPS', 'OPERATING_SYSTEMS')).toBeGreaterThan(weightOf('FRONTEND_ENGINEER', 'OPERATING_SYSTEMS'));
    expect(weightOf('BACKEND_ENGINEER', 'SQL_JOINS')).toBeGreaterThan(weightOf('FRONTEND_ENGINEER', 'SQL_JOINS'));
    expect(weightOf('FRONTEND_ENGINEER', 'CSS')).toBeGreaterThan(weightOf('BACKEND_ENGINEER', 'CSS'));
  });

  it('keeps each blueprint to a workable size', () => {
    for (const bp of DEFAULT_ROLE_BLUEPRINTS) {
      expect({ role: bp.roleKey, n: bp.requirements.length >= 14 && bp.requirements.length <= 26 })
        .toEqual({ role: bp.roleKey, n: true });
    }
  });

  it('explains itself — every role carries a rationale', () => {
    for (const bp of DEFAULT_ROLE_BLUEPRINTS) expect(bp.rationale.length).toBeGreaterThan(60);
  });

  it('records the taxonomy gaps it worked around rather than hiding them', () => {
    expect(SUGGESTED_TAXONOMY_ADDITIONS.length).toBeGreaterThan(0);
    expect(SUGGESTED_TAXONOMY_ADDITIONS.join(' ')).toMatch(/mobile/i);
  });
});
