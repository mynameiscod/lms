/**
 * A student without a target role still has something to be measured against.
 *
 * Everything downstream — the assessment paper, Skill DNA, role readiness, the roadmap — is
 * built from a list of required skills, and the only source of that list was the Role
 * Blueprint. So a first-year who honestly answered "I'm not sure yet" got no list, and
 * therefore no assessment and no plan: the product turned away the cohort least able to name
 * a job title and most in need of being told where to start.
 *
 * Their stage was known all along. It is derived from degree and year, and the foundation
 * policy already restricted them to FOUNDATION-difficulty skills — it simply had no list of
 * its own to filter. These pin the rules of the list that now fills that gap.
 */

import { stageRoleKey, isStageRoleKey, stageFromRoleKey } from '../services/stageSkillSetService';

describe('a stage set names itself, and is never mistaken for a role', () => {
  /**
   * Readiness reports which list it measured against. If a stage set borrowed a real role
   * key, every screen downstream would claim the student is targeting a job they never
   * chose — which is the exact confusion this whole feature exists to remove.
   */
  it('marks its key as a stage, not a role', () => {
    expect(stageRoleKey('foundation')).toBe('STAGE:FOUNDATION');
    expect(isStageRoleKey('STAGE:FOUNDATION')).toBe(true);
  });

  it('does not claim a real role key is a stage', () => {
    expect(isStageRoleKey('SOFTWARE_ENGINEER')).toBe(false);
    expect(isStageRoleKey('')).toBe(false);
  });

  it('reads the stage back out of its own key', () => {
    expect(stageFromRoleKey(stageRoleKey('placement'))).toBe('placement');
  });
});

/**
 * The resolution order, reproduced. getStudentRoleReadiness opens Mongo on every path, and
 * this is a test about which list wins.
 */
type Ctx = { role: string | null; stage: string | null };
const NOT_SURE = 'NOT_SURE';

function listFor(ctx: Ctx, stageSets: Record<string, { enabled: boolean; count: number }>): string {
  const role = (ctx.role || '').toUpperCase();
  if (role && role !== NOT_SURE) return 'role';
  const set = ctx.stage ? stageSets[ctx.stage] : undefined;
  // Off, absent, or empty are three situations with one answer: there is no list here.
  if (!set || !set.enabled || set.count === 0) return 'none';
  return 'stage';
}

describe('which list a student is measured against', () => {
  const FOUNDATION_READY = { foundation: { enabled: true, count: 6 } };

  it('uses the stage set for a first-year who has not chosen', () => {
    expect(listFor({ role: null, stage: 'foundation' }, FOUNDATION_READY)).toBe('stage');
  });

  /** "I'm not sure yet" is an answer, not a missing value, and must behave the same. */
  it('treats an explicit "not sure" the same as no role', () => {
    expect(listFor({ role: NOT_SURE, stage: 'foundation' }, FOUNDATION_READY)).toBe('stage');
  });

  /** A CHOSEN ROLE ALWAYS WINS. This is a fallback, never an override. */
  it('never overrides a role the student did choose', () => {
    expect(listFor({ role: 'SOFTWARE_ENGINEER', stage: 'foundation' }, FOUNDATION_READY)).toBe('role');
  });

  it('falls back to nothing when the stage has no set, exactly as before', () => {
    expect(listFor({ role: null, stage: 'foundation' }, {})).toBe('none');
  });

  /**
   * Off by default matters: shipping this must not silently give every tenant a new source
   * of plans built from a list nobody wrote.
   */
  it('ignores a set that exists but is switched off', () => {
    expect(listFor({ role: null, stage: 'foundation' }, { foundation: { enabled: false, count: 6 } })).toBe('none');
  });

  it('ignores an enabled set with nothing in it', () => {
    expect(listFor({ role: null, stage: 'foundation' }, { foundation: { enabled: true, count: 0 } })).toBe('none');
  });

  it('applies per stage, so a placement student is unaffected by the foundation set', () => {
    expect(listFor({ role: null, stage: 'placement' }, FOUNDATION_READY)).toBe('none');
  });
});

describe('what an admin is allowed to save', () => {
  /** Exactly saveStageSkillSet's normalisation. */
  function normalise(rows: any[]): any[] {
    const seen = new Set<string>();
    return rows
      .map(r => ({ ...r, skillKey: String(r.skillKey || '').toUpperCase().trim() }))
      .filter(r => {
        if (!r.skillKey || seen.has(r.skillKey)) return false;
        seen.add(r.skillKey);
        return true;
      });
  }

  /**
   * The same skill twice would be weighted twice in readiness — a score quietly different
   * from the one the admin thought they configured.
   */
  it('keeps one row per skill', () => {
    const out = normalise([{ skillKey: 'DSA_ARRAYS' }, { skillKey: 'dsa_arrays' }, { skillKey: 'HTML' }]);
    expect(out.map(r => r.skillKey)).toEqual(['DSA_ARRAYS', 'HTML']);
  });

  it('drops rows with no skill at all rather than storing a blank requirement', () => {
    expect(normalise([{ skillKey: '' }, { skillKey: '   ' }, { skillKey: 'HTML' }])).toHaveLength(1);
  });

  it('is case-insensitive about keys, because admins type them both ways', () => {
    expect(normalise([{ skillKey: 'html' }])[0].skillKey).toBe('HTML');
  });
});
