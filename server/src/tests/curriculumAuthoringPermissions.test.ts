/**
 * One permission has to cover the whole hierarchy, or the workflow cannot be completed.
 *
 * ── THE BUG THIS FILE HOLDS SHUT ──────────────────────────────────────────────────────────
 *
 * Learning Unit authoring was `manage_passport`; module and topic authoring was SUPER_ADMIN.
 * So a curriculum author could write the units of a topic but could not create the topic to
 * put them in. Half a hierarchy behind one permission and half behind another is not a
 * security boundary — it is a workflow that has to be finished by somebody else, or by writing
 * to Mongo by hand, which is exactly what P8C.0 exists to stop.
 *
 * ── WHY MOVING THEM WAS NOT A WEAKENING ───────────────────────────────────────────────────
 *
 * Read the SUPER_ADMIN guard's own rationale: it exists because the SKILL CATALOGUE is global,
 * so one admin's edit is every tenant's edit, and no tenant-scoped permission can express
 * that. A stage curriculum is the opposite — a LearningCurriculum belonging to one tenant.
 * Applying the guard to it was an over-application, and the genuinely global routes keep it.
 *
 * The routes are read as TEXT on purpose. Importing the router would drag in the database,
 * every controller and the whole app; what is being asserted is a property of the routing
 * table itself, and the file is the routing table.
 */

import fs from 'fs';
import path from 'path';

const ROUTES = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'passportRoutes.ts'), 'utf8',
);

/** The guard protecting a route, or null when the path is not routed at all. */
const guardOf = (method: string, routePath: string): string | null => {
  const line = ROUTES.split('\n').find(l =>
    l.trim().startsWith(`router.${method}(`) && l.includes(`'${routePath}'`));
  if (!line) return null;
  if (line.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (line.includes('MANAGE_CATEGORIES')) return 'MANAGE_CATEGORIES';
  if (line.includes('MANAGE')) return 'MANAGE';
  if (line.includes('MEMBER')) return 'MEMBER';
  return 'OTHER';
};

// ─────────────────────────────────────────────────────────────────────────────
describe('one permission carries a curriculum author from module to composer', () => {
  /**
   * Every write the final acceptance walks through, in order:
   * Module -> Topic -> Unit -> skills -> content -> quiz/assignment -> publish.
   */
  const THE_WORKFLOW: [string, string][] = [
    ['put',    '/stage-curriculum/:stage/modules'],
    ['post',   '/stage-curriculum/:stage/modules/reorder'],
    ['delete', '/stage-curriculum/:stage/modules/:moduleCode'],
    ['post',   '/stage-curriculum/:stage/topics'],
    ['post',   '/stage-curriculum/:stage/topics/reorder'],
    ['put',    '/stage-curriculum/:stage/topics/:topicId'],
    ['delete', '/stage-curriculum/:stage/topics/:topicId'],
    ['put',    '/curriculum-units/:unitCode'],
    ['post',   '/curriculum-units/reorder'],
    ['post',   '/curriculum-units/:unitCode/publish'],
    ['post',   '/curriculum-units/:unitCode/status'],
    ['post',   '/curriculum-units/:unitCode/content/:contentId'],
    ['delete', '/curriculum-units/:unitCode/content/:contentId'],
    ['get',    '/curriculum-units/:unitCode/assessments'],
    ['post',   '/curriculum-units/:unitCode/assessments'],
    ['post',   '/curriculum-units/:unitCode/quiz/:quizId'],
    ['delete', '/curriculum-units/:unitCode/quiz/:quizId'],
    ['post',   '/curriculum-units/:unitCode/assignment/:assignmentId'],
    ['delete', '/curriculum-units/:unitCode/assignment/:assignmentId'],
    ['delete', '/curriculum-units/:unitCode'],
  ];

  it.each(THE_WORKFLOW)('%s %s is routed', (method, routePath) => {
    expect(guardOf(method, routePath)).not.toBeNull();
  });

  it.each(THE_WORKFLOW)('%s %s is reachable with manage_passport', (method, routePath) => {
    expect(guardOf(method, routePath)).toBe('MANAGE');
  });
});

describe('what stays SUPER_ADMIN, and why', () => {
  /**
   * The skill catalogue is GLOBAL and has no tenantId by design — if JAVA_OOP meant two things
   * at two colleges neither could be measured. A tenant-scoped permission cannot express
   * "this edit changes every tenant", so these keep the platform-wide guard.
   */
  it.each([
    ['post',   '/skills'],
    ['put',    '/skills/:id'],
    ['delete', '/skills/:id'],
    ['post',   '/skills/seed'],
  ])('%s %s still requires super admin', (method, routePath) => {
    expect(guardOf(method, routePath)).toBe('SUPER_ADMIN');
  });

  it('keeps the stage skill set above curriculum authoring', () => {
    // What a stage MEASURES is a different decision from what it TEACHES, and it was never
    // part of the authoring workflow this phase unblocked.
    expect(guardOf('put', '/stage-skill-sets/:stage')).toBe('SUPER_ADMIN');
  });
});

describe('reading stays where it was', () => {
  it.each([
    ['get', '/stage-curriculum'],
    ['get', '/stage-curriculum/:stage'],
    ['get', '/curriculum-units'],
    ['get', '/curriculum-units/options'],
    ['get', '/skills'],
  ])('%s %s is readable by a CareerPilot admin', (method, routePath) => {
    expect(guardOf(method, routePath)).toBe('MANAGE');
  });
});

describe('the permission itself is the existing one', () => {
  it('introduces no new permission key', async () => {
    const { PERMISSION_GROUPS, ALL_PERMISSIONS } = await import('../middleware/roleGuard');
    // Inventing a `manage_curriculum` would mean a second RBAC concept and a Roles screen that
    // does not know about it. manage_passport already means "manage CareerPilot content".
    expect(ALL_PERMISSIONS).toContain('manage_passport');
    expect(ALL_PERMISSIONS).not.toContain('manage_curriculum');
    expect(PERMISSION_GROUPS.careerPassport.permissions.map((p: any) => p.key))
      .toContain('manage_passport');
  });

  it('is held by a tenant admin and withheld from staff', async () => {
    const { ROLE_PERMISSIONS } = await import('../middleware/roleGuard');
    expect(ROLE_PERMISSIONS.TENANT_ADMIN).toContain('manage_passport');
    // STAFF is read-only over CareerPilot by design; authoring is not a support task.
    expect(ROLE_PERMISSIONS.STAFF).not.toContain('manage_passport');
    expect(ROLE_PERMISSIONS.STUDENT).not.toContain('manage_passport');
  });
});
