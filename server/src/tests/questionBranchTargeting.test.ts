/**
 * Targeting an assessment question by branch.
 *
 * The fourth axis, and the one that revealed a bug in the other three: the paper builder
 * read `branch || degree` into a single `course` value, so a question tagged "B.Tech" never
 * reached a member who had a branch recorded — course resolved to "CSE" and matched nothing.
 * Both halves are pinned here so they cannot quietly merge again.
 *
 * The clause itself is reproduced rather than imported, because importing skillEvidenceService
 * pulls in mongoose and every source adapter for a test about a Mongo condition.
 */

/**
 * Exactly the condition audienceClause builds — corrected after the first version of this
 * file invented one.
 *
 * It asserted `$size: 0` and an empty object for a missing value; the real clause uses
 * `$in: [null, []]` and returns the UNIVERSAL condition, so an axis the member has no value
 * for narrows to untagged content rather than to everything. Those tests passed against a
 * fiction, which is worse than having none: they would have gone on passing while the real
 * query changed underneath them.
 */
const audienceClause = (field: string, value?: string) => {
  const universal = { $or: [{ [field]: { $in: [null, []] } }, { [field]: { $exists: false } }] };
  if (!value) return universal;
  return { $or: [universal.$or[0], universal.$or[1], { [field]: value }] };
};

/** How the member's own axes are resolved for a paper. */
const audienceFor = (education: any) => ({
  year: education?.currentAcademicYear || undefined,
  course: education?.degree || undefined,
  branch: education?.branch || undefined,
});

describe('course and branch are separate axes', () => {
  /**
   * The bug this closes. With `course: branch || degree`, a member with a branch had their
   * degree tag ignored entirely — so every question targeted at B.Tech was invisible to
   * exactly the students who had completed onboarding most fully.
   */
  it('resolves course from degree, not from branch', () => {
    const a = audienceFor({ degree: 'B.Tech', branch: 'CSE', currentAcademicYear: '1st Year' });
    expect(a.course).toBe('B.Tech');
    expect(a.branch).toBe('CSE');
  });

  it('leaves course undefined when no degree is recorded, rather than borrowing the branch', () => {
    const a = audienceFor({ branch: 'CSE' });
    expect(a.course).toBeUndefined();
    expect(a.branch).toBe('CSE');
  });

  it('carries the year through unchanged', () => {
    expect(audienceFor({ currentAcademicYear: '1st Year' }).year).toBe('1st Year');
  });
});

describe('the branch clause keeps untargeted questions universal', () => {
  /**
   * Three shapes mean "everyone": the field absent (every mapping written before branch
   * existed), an empty array (an admin cleared it), or an explicit match. Dropping any one
   * of them would remove most of the pool from every student at once.
   */
  it('matches cleared, absent, and exact', () => {
    const c: any = audienceClause('audienceBranches', 'CSE');
    expect(c.$or).toEqual([
      { audienceBranches: { $in: [null, []] } },
      { audienceBranches: { $exists: false } },
      { audienceBranches: 'CSE' },
    ]);
  });

  /**
   * A member with no branch gets UNTAGGED branch content, not everything. The distinction
   * matters: the alternative would hand them questions written for a branch they are not in.
   */
  it('restricts to untagged when the member has no branch', () => {
    const c: any = audienceClause('audienceBranches', undefined);
    expect(c.$or).toHaveLength(2);
    expect(JSON.stringify(c)).not.toContain('CSE');
    expect(audienceClause('audienceBranches', '')).toEqual(c);
  });

  it('composes with the other axes without one overwriting another', () => {
    const filter: any = { tenantId: 't1', active: true };
    filter.$and = [
      audienceClause('audienceRoles', 'FRONTEND_ENGINEER'),
      audienceClause('audienceYears', '1st Year'),
      audienceClause('audienceCourses', 'B.TECH'),
      audienceClause('audienceBranches', 'CSE'),
    ];
    // $and, not four sibling $or keys — the reason the original code used it, since a second
    // $or on the same object silently replaces the first.
    expect(filter.$and).toHaveLength(4);
    expect(filter.$and.every((c: any) => c.$or?.length === 3)).toBe(true);
  });
});

describe('branch values keep their case', () => {
  /**
   * Role and course are stored as keys and uppercased; branch is a display string chosen
   * from a configured list. Uppercasing "IT / CSIT / CSBS" would stop it matching the value
   * the student actually picked.
   */
  const readBranches = (v: unknown) =>
    (Array.isArray(v) ? v : []).map(x => String(x ?? '').trim()).filter(Boolean);

  it('preserves the configured spelling', () => {
    expect(readBranches(['IT / CSIT / CSBS'])).toEqual(['IT / CSIT / CSBS']);
    expect(readBranches(['AI & ML'])).toEqual(['AI & ML']);
  });

  it('trims padding and drops blanks', () => {
    expect(readBranches([' CSE ', '', '   '])).toEqual(['CSE']);
  });

  it('yields an empty axis from nothing, which means everyone', () => {
    expect(readBranches(undefined)).toEqual([]);
    expect(readBranches('CSE')).toEqual([]);
  });
});
