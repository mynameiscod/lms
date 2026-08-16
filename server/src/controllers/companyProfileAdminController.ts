import { Request, Response } from 'express';
import AuditLog from '../models/AuditLog';
import CareerSkill from '../models/CareerSkill';
import CompanyRoleProfile, { DEFAULT_ROLE_KEY } from '../models/CompanyRoleProfile';
import { Company } from '../models/CompanyQuestionModels';
import {
  cleanRequirements, cleanRoundSkills, validateProfile, nextVersion, publishProfile,
  daysSinceReview, REVIEW_DUE_DAYS,
} from '../services/companyProfileService';
import { listCareerRoles } from '../services/careerRoleService';
import { getTaxonomy } from '../services/companyQuestionService';
import { SKILL_IMPORTANCE, SKILL_TARGET_LEVELS, DEFAULT_WEIGHT } from '../models/RoleSkillBlueprint';

/**
 * Configuring what a company expects, for the admin.
 *
 * DRAFT, THEN PUBLISH — never straight to live. A profile is what every student's company
 * readiness is measured against, so a half-finished set of weights must not be able to move
 * anybody's number. Students read PUBLISHED only; this screen is the only place a draft
 * exists.
 *
 * ONE DRAFT AT A TIME per company and role. Two admins editing the same company converge on
 * one document rather than producing two competing drafts, and the version they publish is
 * the version they were both looking at.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

/**
 * Record an admin change.
 *
 * Wrapped, and warned rather than thrown: an audit backend that is briefly unavailable must
 * not stop an admin publishing a profile. The write is best-effort and the operation is not.
 */
async function audit(req: Request, action: 'CREATE' | 'UPDATE' | 'DELETE', details: string, metadata: any = {}) {
  try {
    await AuditLog.create({
      tenantId: (req as any).user?.tenantId || (req as any).tenantId,
      userId: (req as any).user?.id || (req as any).user?._id,
      action, module: 'SYSTEM',
      targetType: 'CompanyRoleProfile',
      details,
      metadata,
    });
  } catch (e: any) {
    console.warn('[company-profile] audit write failed:', e?.message || e);
  }
}

const shape = (p: any) => ({
  id: String(p._id),
  companySlug: p.companySlug,
  roleKey: p.roleKey,
  version: p.version,
  status: p.status,
  skillRequirements: p.skillRequirements || [],
  roundSkills: p.roundSkills || [],
  careerStages: p.careerStages || [],
  sources: p.sources || [],
  preparationNotes: p.preparationNotes || '',
  effectiveFrom: p.effectiveFrom || null,
  lastReviewedAt: p.lastReviewedAt || null,
  publishedAt: p.publishedAt || null,
  daysSinceReview: daysSinceReview(p.lastReviewedAt),
  reviewDue: (daysSinceReview(p.lastReviewedAt) ?? 0) > REVIEW_DUE_DAYS,
});

/**
 * GET /passport/company-admin/:slug/profiles
 *
 * Everything the editor needs in one request: the profiles that exist, the roles they can
 * be written for, the canonical skills they may reference, and the rounds already defined
 * for this company. A picker that had to fetch its own options would let an admin type a
 * skill key that does not exist.
 */
export const listProfiles = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const slug = String(req.params.slug);

    const company = await Company.findOne({ tenantId, slug }).select('name slug').lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const [profiles, roles, skills, tax] = await Promise.all([
      CompanyRoleProfile.find({ tenantId, companySlug: slug })
        .sort({ roleKey: 1, version: -1 }).lean() as any,
      listCareerRoles(tenantId),
      CareerSkill.find({ active: true }).select('key name domainKey').sort({ key: 1 }).lean() as any,
      getTaxonomy(tenantId),
    ]);

    res.json({
      company: { slug: company.slug, name: company.name },
      profiles: (profiles as any[]).map(shape),
      roles: [
        { key: DEFAULT_ROLE_KEY, name: 'All roles (default)' },
        ...(roles as any[]).map(r => ({ key: r.key, name: r.name })),
      ],
      skills: (skills as any[]).map(s => ({ key: s.key, name: s.name })),
      rounds: tax.rounds.filter(r => r.enabled).map(r => ({ key: r.key, label: r.label })),
      importanceOptions: SKILL_IMPORTANCE,
      targetLevelOptions: SKILL_TARGET_LEVELS,
      defaultWeights: DEFAULT_WEIGHT,
    });
  } catch (e: any) {
    console.error('[company-profile] list:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load profiles' });
  }
};

/**
 * PUT /passport/company-admin/:slug/profiles/:roleKey — create or update the draft.
 *
 * Validated before it is stored, not on publish. An admin who typed AMAZON_DSA finds out
 * while they still remember typing it, rather than at the end of a long editing session.
 */
export const saveDraft = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const slug = String(req.params.slug);
    const roleKey = String(req.params.roleKey || DEFAULT_ROLE_KEY).toUpperCase();

    const company = await Company.findOne({ tenantId, slug }).select('slug').lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const skillRequirements = cleanRequirements(req.body?.skillRequirements);
    const roundSkills = cleanRoundSkills(req.body?.roundSkills);

    const check = await validateProfile(tenantId, { roleKey, skillRequirements, roundSkills });
    if (!check.ok) {
      return res.status(400).json({
        message: check.message,
        unknownSkills: check.unknownSkills, inactiveSkills: check.inactiveSkills,
      });
    }

    const patch = {
      skillRequirements, roundSkills,
      careerStages: Array.isArray(req.body?.careerStages)
        ? req.body.careerStages.map((s: any) => String(s)) : [],
      sources: Array.isArray(req.body?.sources)
        ? req.body.sources.slice(0, 20).map((s: any) => ({
            type: s?.type || 'ADMIN_RESEARCH',
            reference: String(s?.reference || '').slice(0, 500),
            note: String(s?.note || '').slice(0, 500),
            verifiedAt: s?.verifiedAt ? new Date(s.verifiedAt) : null,
          }))
        : [],
      preparationNotes: String(req.body?.preparationNotes || '').slice(0, 4000),
      effectiveFrom: req.body?.effectiveFrom ? new Date(req.body.effectiveFrom) : null,
      lastReviewedAt: new Date(),
    };

    const existing = await CompanyRoleProfile.findOne({ tenantId, companySlug: slug, roleKey, status: 'DRAFT' });
    if (existing) {
      Object.assign(existing, patch);
      await existing.save();
      await audit(req, 'UPDATE', `Company preparation draft updated: ${slug} / ${roleKey}`, {
        companySlug: slug, roleKey, version: existing.version, skills: skillRequirements.length,
      });
      return res.json({ profile: shape(existing) });
    }

    const created = await CompanyRoleProfile.create({
      tenantId, companySlug: slug, roleKey,
      version: await nextVersion(tenantId, slug, roleKey),
      status: 'DRAFT',
      ...patch,
    });
    await audit(req, 'CREATE', `Company preparation draft created: ${slug} / ${roleKey}`, {
      companySlug: slug, roleKey, version: created.version, skills: skillRequirements.length,
    });
    res.status(201).json({ profile: shape(created) });
  } catch (e: any) {
    // Two admins creating the first draft for the same role at the same instant. The unique
    // (company, role, version) index refuses the second; asking them to reload is honest.
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'Somebody else just created a draft for this role. Reload and try again.' });
    }
    console.error('[company-profile] saveDraft:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save the draft' });
  }
};

/** POST /passport/company-admin/:slug/profiles/:roleKey/publish */
export const publish = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const slug = String(req.params.slug);
    const roleKey = String(req.params.roleKey || DEFAULT_ROLE_KEY).toUpperCase();
    const draftId = String(req.body?.profileId || '');

    const result = await publishProfile(tenantId, slug, roleKey, draftId, userIdOf(req));
    if (!result.ok) return res.status(400).json({ message: result.message });

    await audit(req, 'UPDATE', `Company preparation profile published: ${slug} / ${roleKey} v${result.profile.version}`, {
      companySlug: slug, roleKey, version: result.profile.version,
    });
    res.json({ profile: shape(result.profile) });
  } catch (e: any) {
    console.error('[company-profile] publish:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not publish' });
  }
};

/**
 * DELETE /passport/company-admin/:slug/profiles/:id — discard a draft.
 *
 * Drafts only. A published or archived profile is what somebody's stored mock-test result
 * was measured against, and deleting it would leave that result pointing at nothing.
 */
export const discardDraft = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const slug = String(req.params.slug);

    const profile = await CompanyRoleProfile.findOne({ _id: req.params.id, tenantId, companySlug: slug });
    if (!profile) return res.status(404).json({ message: 'Not found' });
    if (profile.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only a draft can be discarded. Published versions are history.' });
    }

    await CompanyRoleProfile.deleteOne({ _id: profile._id, tenantId });
    await audit(req, 'DELETE', `Company preparation draft discarded: ${slug} / ${profile.roleKey}`, {
      companySlug: slug, roleKey: profile.roleKey, version: profile.version,
    });
    res.json({ success: true });
  } catch (e: any) {
    console.error('[company-profile] discard:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not discard' });
  }
};
