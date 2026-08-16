import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import CompanyRoleProfile from '../models/CompanyRoleProfile';
import { Company, CompanyMockConfig } from '../models/CompanyQuestionModels';
import { listCareerRoles } from './careerRoleService';
import { getRoleSkillBlueprint } from './roleSkillBlueprintService';
import { budgetSummary } from './rewardBudgetService';
import { daysSinceReview, REVIEW_DUE_DAYS } from './companyProfileService';
import { readiness } from './healthService';
import { ASSESSMENT_POLICIES } from '../data/assessmentPolicies';
import { XP_EVENTS } from '../data/gamificationPolicy';

/**
 * Is CareerPilot actually configured, or does it only look configured?
 *
 * A tenant can pass every unit test in this repository and still be unusable: a role with
 * no published blueprint produces no readiness, a blueprint pointing at a retired skill
 * produces a gap nobody can close, an empty question pool produces an assessment that
 * measures nothing. None of that is a bug in the code, and none of it is visible until a
 * student hits it.
 *
 * IT REPORTS, IT NEVER REPAIRS. Every check below reads. Silently creating a missing
 * blueprint or bumping a budget would be a change to what a tenant's admin decided, made by
 * a health screen they opened to find out what was wrong.
 *
 * IT REUSES THE MODULES' OWN VALIDATORS. `getRoleSkillBlueprint` already resolves each
 * requirement against the live skill catalogue and flags `missing` and `skillActive`;
 * `budgetSummary` already computes utilisation; `daysSinceReview` already owns staleness;
 * `readiness()` already knows about the database. Re-deriving any of that here would create
 * a second opinion that drifts from the screen it is supposed to describe.
 *
 * DETERMINISTIC. No AI, no sampling, no randomness. The same configuration produces the
 * same findings, so two admins looking at it can agree about what is wrong.
 */

export type Severity = 'ERROR' | 'WARNING' | 'INFO';

/** The areas a launch readiness report rolls up to. */
export type HealthArea =
  | 'core' | 'roles' | 'skills' | 'assessment' | 'roadmap'
  | 'gamification' | 'rewards' | 'interview' | 'companies'
  | 'security' | 'database';

export interface HealthFinding {
  area: HealthArea;
  severity: Severity;
  /** Stable identifier, so a finding can be referenced without quoting its prose. */
  code: string;
  message: string;
  /** What to do about it, in the admin's terms. */
  action: string;
  /** Safe metadata only — keys and counts, never values, never secrets. */
  meta?: Record<string, any>;
}

export interface ConfigHealthResult {
  checkedAt: string;
  findings: HealthFinding[];
  counts: { error: number; warning: number; info: number };
}

/** Reward budget utilisation past which an admin should be told. */
export const BUDGET_WARN_PERCENT = 80;

/**
 * Fewest mapped questions a tenant needs before a personalised assessment is worth
 * generating.
 *
 * Derived from Module 6's own policies rather than invented: the largest configured paper's
 * skill-slot count is the minimum a tenant must be able to fill at all. Below it, generation
 * either fails or produces a paper that quietly measures less than its peers.
 */
export const MIN_MAPPED_ITEMS = Math.max(...ASSESSMENT_POLICIES.map(p => p.skillSlots));

export async function buildConfigHealth(tenantId: string): Promise<ConfigHealthResult> {
  const findings: HealthFinding[] = [];
  const add = (f: HealthFinding) => findings.push(f);

  const tenantOid = mongoose.isValidObjectId(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;

  // ── roles and blueprints (Module 2 + Module 4) ────────────────────────────
  const roles = await listCareerRoles(tenantId);

  /**
   * Only the roles a student can actually pick.
   *
   * listCareerRoles seeds a standard catalogue, so every tenant has a dozen roles whether
   * it offers them or not. A role nobody can choose needs no blueprint; one that appears in
   * the picker and has none is a student who selects it and gets no readiness at all.
   */
  const selectable = roles.filter((r: any) => r.active !== false && r.studentSelectable !== false);

  if (!selectable.length) {
    add({
      area: 'roles', severity: 'ERROR', code: 'NO_SELECTABLE_ROLES',
      message: 'No career role is offered to students.',
      action: 'Make at least one role student-selectable in CareerPilot → Roles.',
    });
  }

  /**
   * Aggregated, not one finding per role.
   *
   * A fresh tenant has a dozen seeded roles and no blueprints; twelve identical errors is a
   * wall of text that hides everything else on the screen. One finding naming the roles is
   * the same information an admin can act on.
   */
  const noBlueprint: string[] = [];
  const unpublished: string[] = [];
  const emptyBlueprint: string[] = [];
  const unresolved: { roleKey: string; skillKeys: string[] }[] = [];

  for (const role of selectable) {
    // The module's own resolver: it joins each requirement to the live catalogue and flags
    // what is missing or retired. Re-checking that here would be a second opinion.
    const bp = await getRoleSkillBlueprint(tenantId, (role as any).key);

    if (!bp) { noBlueprint.push((role as any).key); continue; }
    if (!bp.published) unpublished.push(bp.roleKey);
    if (!bp.summary.active) emptyBlueprint.push(bp.roleKey);

    const broken = bp.requirements.filter(r => r.active && (r.missing || !r.skillActive));
    if (broken.length) unresolved.push({ roleKey: bp.roleKey, skillKeys: broken.map(r => r.skillKey) });
  }

  if (noBlueprint.length) {
    add({
      area: 'roles', severity: 'ERROR', code: 'ROLE_BLUEPRINT_MISSING',
      message: `${noBlueprint.length} student-selectable role(s) have no skill blueprint.`,
      action: 'Create and publish a blueprint for each, or stop offering the role. A student who picks one gets no readiness.',
      meta: { roleKeys: noBlueprint.slice(0, 30) },
    });
  }
  if (unpublished.length) {
    add({
      area: 'roles', severity: 'ERROR', code: 'ROLE_BLUEPRINT_UNPUBLISHED',
      message: `${unpublished.length} blueprint(s) are still drafts.`,
      action: 'Publish them. Readiness is not calculated against an unpublished standard.',
      meta: { roleKeys: unpublished.slice(0, 30) },
    });
  }
  if (emptyBlueprint.length) {
    add({
      area: 'roles', severity: 'ERROR', code: 'ROLE_BLUEPRINT_EMPTY',
      message: `${emptyBlueprint.length} blueprint(s) have no active skill requirements.`,
      action: 'Add the skills the role needs, or stop offering it.',
      meta: { roleKeys: emptyBlueprint.slice(0, 30) },
    });
  }
  if (unresolved.length) {
    add({
      area: 'skills', severity: 'ERROR', code: 'BLUEPRINT_SKILL_UNRESOLVED',
      message: `${unresolved.length} blueprint(s) require skills that no longer exist or have been retired.`,
      action: 'Replace or remove them — a requirement pointing at a missing skill is a gap no student can close.',
      meta: {
        roles: unresolved.slice(0, 30),
        skillKeys: [...new Set(unresolved.flatMap(u => u.skillKeys))].slice(0, 50),
      },
    });
  }

  // ── assessment (Module 5 + Module 6) ──────────────────────────────────────
  const [activeSkills, mappedItems] = await Promise.all([
    CareerSkill.countDocuments({ active: true, assessable: true }),
    SkillEvidence.countDocuments({ tenantId }),
  ]);

  if (!activeSkills) {
    add({
      area: 'skills', severity: 'ERROR', code: 'SKILL_GRAPH_EMPTY',
      message: 'The canonical skill catalogue has no assessable skills.',
      action: 'Seed the skill graph. Nothing downstream — blueprints, assessments, readiness — can work without it.',
    });
  }

  if (!mappedItems) {
    add({
      area: 'assessment', severity: 'ERROR', code: 'NO_MAPPED_QUESTIONS',
      message: 'No questions are mapped to canonical skills.',
      action: 'Map questions in CareerPilot → Skill Evidence. An assessment cannot be generated from an unmapped bank.',
    });
  } else if (mappedItems < MIN_MAPPED_ITEMS) {
    add({
      area: 'assessment', severity: 'WARNING', code: 'MAPPED_POOL_THIN',
      message: `Only ${mappedItems} mapped questions exist; the largest configured paper needs ${MIN_MAPPED_ITEMS}.`,
      action: 'Map more questions. A thin pool produces papers that repeat, or that quietly measure less.',
      meta: { mapped: mappedItems, needed: MIN_MAPPED_ITEMS },
    });
  }

  // ── gamification (Module 11) ──────────────────────────────────────────────
  // Rules fall back to the catalogue's defaults when a tenant has configured none, so a
  // missing rule is not an outage — it is worth knowing about, not worth blocking on.
  add({
    area: 'gamification', severity: 'INFO', code: 'XP_EVENTS_AVAILABLE',
    message: `${XP_EVENTS.length} XP events are available.`,
    action: 'No action needed. Amounts can be tuned per tenant in CareerPilot → Coins & XP.',
    meta: { events: XP_EVENTS.map(e => e.key) },
  });

  // ── rewards (Module 12) ───────────────────────────────────────────────────
  try {
    const budget = await budgetSummary(tenantId);
    if (!budget.enabled) {
      add({
        area: 'rewards', severity: 'INFO', code: 'REWARD_BUDGET_DISABLED',
        message: 'Reward budgeting is switched off.',
        action: 'No action needed unless you intend to offer rewards.',
      });
    } else {
      const committed = budget.reservedPaise + budget.redeemedPaise;
      const used = budget.effectiveBudgetPaise
        ? Math.round((committed / budget.effectiveBudgetPaise) * 100)
        : 0;
      if (!budget.effectiveBudgetPaise) {
        add({
          area: 'rewards', severity: 'WARNING', code: 'REWARD_BUDGET_ZERO',
          message: 'Reward budgeting is on but this period has no budget.',
          action: 'Set a budget, or switch budgeting off — redemptions will be refused until then.',
        });
      } else if (used >= 100) {
        add({
          area: 'rewards', severity: 'WARNING', code: 'REWARD_BUDGET_EXHAUSTED',
          message: `This period's reward budget is fully committed (${used}%).`,
          action: 'Raise the budget or expect redemptions to be refused for the rest of the period.',
          meta: { usedPercent: used },
        });
      } else if (used >= BUDGET_WARN_PERCENT) {
        add({
          area: 'rewards', severity: 'WARNING', code: 'REWARD_BUDGET_HIGH',
          message: `This period's reward budget is ${used}% committed.`,
          action: 'Keep an eye on it, or raise the cap before it runs out.',
          meta: { usedPercent: used },
        });
      }
    }
  } catch {
    add({
      area: 'rewards', severity: 'INFO', code: 'REWARD_BUDGET_UNREADABLE',
      message: 'Reward budget could not be read.',
      action: 'Check CareerPilot → Rewards configuration.',
    });
  }

  // ── companies and mock interviews (Modules 14 + 15) ───────────────────────
  const companies = await Company.find({ tenantId, active: true }).select('slug name').lean() as any[];

  if (companies.length) {
    const slugs = companies.map(c => c.slug);
    const [profiles, mockConfigs] = await Promise.all([
      CompanyRoleProfile.find({ tenantId, companySlug: { $in: slugs }, status: 'PUBLISHED' })
        .select('companySlug roleKey lastReviewedAt skillRequirements').lean() as any,
      CompanyMockConfig.find({ tenantId, companySlug: { $in: slugs } })
        .select('companySlug enabled interview').lean() as any,
    ]);

    const withProfile = new Set((profiles as any[]).map(p => p.companySlug));
    const missing = companies.filter(c => !withProfile.has(c.slug));
    if (missing.length) {
      add({
        area: 'companies', severity: 'WARNING', code: 'COMPANY_PROFILE_MISSING',
        message: `${missing.length} active compan${missing.length === 1 ? 'y has' : 'ies have'} no published preparation profile.`,
        action: 'Add skill requirements so company readiness can be calculated. Until then those pages report "not configured".',
        meta: { companySlugs: missing.map(c => c.slug).slice(0, 20) },
      });
    }

    const empty = (profiles as any[]).filter(p => !(p.skillRequirements || []).length);
    if (empty.length) {
      add({
        area: 'companies', severity: 'ERROR', code: 'COMPANY_PROFILE_EMPTY',
        message: `${empty.length} published company profile(s) have no skill requirements.`,
        action: 'Add requirements or archive the profile — it currently measures nothing.',
        meta: { companySlugs: empty.map(p => p.companySlug).slice(0, 20) },
      });
    }

    // Staleness is Module 15's own rule, read rather than restated.
    const stale = (profiles as any[]).filter(p => (daysSinceReview(p.lastReviewedAt) ?? 0) > REVIEW_DUE_DAYS);
    if (stale.length) {
      add({
        area: 'companies', severity: 'WARNING', code: 'COMPANY_PROFILE_STALE',
        message: `${stale.length} company profile(s) have not been reviewed for over ${REVIEW_DUE_DAYS} days.`,
        action: 'Re-check them. Hiring patterns change; an old profile is not necessarily wrong, but nobody has confirmed it.',
        meta: {
          companySlugs: stale.map(p => p.companySlug).slice(0, 20),
          reviewDueDays: REVIEW_DUE_DAYS,
        },
      });
    }

    const interviewReady = (mockConfigs as any[]).filter(c => c.enabled?.mockInterview);
    if (!interviewReady.length) {
      add({
        area: 'interview', severity: 'WARNING', code: 'COMPANY_MOCK_INTERVIEW_OFF',
        message: 'No company has company-flavoured mock interviews switched on.',
        action: 'Enable it per company if you want them, in the company\'s Mock configuration.',
      });
    }
  } else {
    add({
      area: 'companies', severity: 'INFO', code: 'NO_COMPANIES',
      message: 'No companies are configured.',
      action: 'Optional. Company preparation simply does not appear until one is added.',
    });
  }

  // ── deployment prerequisites (Pillar C) ───────────────────────────────────
  // PRESENCE ONLY. Never a value, never a length, never a hash — this is an admin screen,
  // and a secret that leaks through a health report has leaked.
  const hasJwt = !!process.env.JWT_SECRET;
  const hasEncryption = !!process.env.ENCRYPTION_KEY;

  if (!hasJwt) {
    add({
      area: 'security', severity: 'ERROR', code: 'JWT_SECRET_MISSING',
      message: 'JWT_SECRET is not configured.',
      action: 'Set it in the environment. The server refuses to start without one.',
    });
  }
  if (!hasEncryption) {
    add({
      area: 'security', severity: 'ERROR', code: 'ENCRYPTION_KEY_NOT_PINNED',
      message: 'ENCRYPTION_KEY is not set, so stored integration secrets are encrypted under a key that follows JWT_SECRET.',
      action: 'Pin ENCRYPTION_KEY to the value currently in effect and verify the stored keys still decrypt BEFORE rotating '
        + 'JWT_SECRET — see docs/runbooks/jwt-secret-rotation.md. Rotating first makes them unreadable.',
    });
  }

  // ── database (reuses the hardened readiness check) ────────────────────────
  const ready = readiness();
  const db = ready.dependencies.find(d => d.name === 'mongodb');
  if (db && db.state !== 'up') {
    add({
      area: 'database', severity: 'ERROR', code: 'DATABASE_UNAVAILABLE',
      message: `The database is ${db.detail}.`,
      action: 'This instance cannot serve traffic. Check the connection before deploying.',
    });
  }
  for (const dep of ready.dependencies.filter(d => !d.required && d.state === 'not_configured')) {
    add({
      area: 'core', severity: 'INFO', code: `DEPENDENCY_NOT_CONFIGURED_${dep.name.toUpperCase()}`,
      message: `${dep.name} is not configured.`,
      action: 'Optional. The features that use it report themselves unavailable; everything else serves normally.',
    });
  }

  if (!tenantOid) {
    add({
      area: 'core', severity: 'ERROR', code: 'TENANT_INVALID',
      message: 'The tenant identifier is not a valid id.',
      action: 'This is an internal problem rather than a configuration one — report it.',
    });
  }

  const counts = {
    error: findings.filter(f => f.severity === 'ERROR').length,
    warning: findings.filter(f => f.severity === 'WARNING').length,
    info: findings.filter(f => f.severity === 'INFO').length,
  };

  return { checkedAt: new Date().toISOString(), findings, counts };
}
