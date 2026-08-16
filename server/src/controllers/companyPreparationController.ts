import { Request, Response } from 'express';
import User from '../models/User';
import PassportConfig from '../models/PassportConfig';
import { Company } from '../models/CompanyQuestionModels';
import { isEntitled } from '../services/passportEntitlementService';
import { readinessFor, readySlugs } from '../services/companyReadinessService';
import { calculateCompanyFit, summariseCompanyFits } from '../services/companyFitService';
import { evaluateEligibility } from '../services/companyEligibilityService';
import { getCareerContext } from '../services/careerContextService';
import { calculateStudentRoleReadiness, RoleReadinessResult } from '../services/roleReadinessService';
import { CompanyFitResult } from '../services/companyFitService';
import { MAX_TARGET_COMPANIES, FIT_LABEL } from '../data/companyFitPolicy';

/**
 * Company preparation, for the member.
 *
 * EVERYTHING HERE IS DERIVED ON READ. Company fit and eligibility are computed from Skill
 * DNA, the published company profile and the member's own record every time they are asked
 * for. Nothing is stored, so nothing can go stale behind a score that moved, and no AI is
 * called on any path in this file — a company page must not cost money to open.
 *
 * THE SERVER DECIDES EVERYTHING THAT MATTERS. A request carries a company slug and an
 * action. Skill weights, target scores, the eligibility verdict and the fit percentage are
 * all resolved here from stored configuration; a member who could post their own weights
 * could post themselves ready.
 *
 * IT IS A PREPARATION CATALOGUE, NOT A JOBS BOARD. Nothing in this module implies that a
 * company is hiring, that an opening exists, or that anybody will be selected. Those are
 * claims only real placement data could support, and this module has none.
 */

const tenantOf = (req: Request): string => String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || '');

async function gate(req: Request) {
  const tenantId = tenantOf(req);
  const studentId = userIdOf(req);
  const [user, cfg] = await Promise.all([
    User.findById(studentId).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean(),
  ]);
  return {
    tenantId, studentId, user, cfg,
    entitled: isEntitled(cfg?.entitlements as any, user?.passport, 'company_questions'),
  };
}

const targetsOf = (user: any): { slug: string; primary: boolean }[] =>
  (user?.passport?.targetCompanies || []).map((t: any) => ({ slug: t.slug, primary: !!t.primary }));

/**
 * GET /passport/companies/:slug/readiness
 *
 * Company fit, eligibility, and the Module 8 role figure beside them — SHOWN TOGETHER AND
 * NEVER COMBINED. A student who is eligible but not ready and one who is ready but not
 * eligible need completely different things, and an average of the two would tell neither
 * of them anything.
 */
export const companyReadiness = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const slug = String(req.params.slug);
    const company = await Company.findOne({ tenantId, slug, active: true }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // The same content bar the rest of the company surface applies, so a typed URL cannot
    // open a page built on a half-configured company.
    const content = await readinessFor(tenantId, slug);
    if (!content.ready) return res.status(404).json({ message: 'Company not found' });

    const [fit, eligibility, context] = await Promise.all([
      calculateCompanyFit(tenantId, studentId, slug),
      evaluateEligibility(tenantId, studentId, company),
      getCareerContext(tenantId, studentId),
    ]);

    // Module 8's own figure, read and reported unchanged. This module never recalculates it
    // and never writes it.
    const role = await calculateStudentRoleReadiness(tenantId, studentId);

    res.json({
      company: { slug, name: company.name, type: company.type, logoUrl: company.logoUrl || '' },
      stage: context?.derived?.stage || null,
      fit: fit.available
        ? { ...fit, classificationLabel: fit.classification ? FIT_LABEL[fit.classification] : null }
        : fit,
      eligibility,
      // Module 8's figure, passed through untouched — reported beside company fit for
      // comparison only. Cast at the boundary the way Module 14 does; the project builds
      // without strictNullChecks, so the discriminant does not narrow on its own.
      roleReadiness: role.available
        ? {
            available: true,
            role: (role as RoleReadinessResult).role,
            readiness: (role as RoleReadinessResult).readiness,
            coverage: (role as RoleReadinessResult).coverage,
            confidence: (role as RoleReadinessResult).confidence,
          }
        : { available: false, reason: (role as any).reason, message: (role as any).message },
    });
  } catch (e: any) {
    console.error('[company-prep] readiness:', e?.message || e);
    res.status(500).json({ message: 'Could not work out your readiness for this company.' });
  }
};

/**
 * GET /passport/companies/:slug/preparation
 *
 * What to work on, in order, and what the process tests. Ranked by the same priority score
 * Module 8 uses, so the ordering a student sees here agrees with the ordering they see
 * against their role.
 *
 * IT RECOMMENDS, IT NEVER PLANS. Module 9 owns the roadmap and Module 13 owns replanning;
 * opening this page changes neither, whatever it says.
 */
export const companyPreparation = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const slug = String(req.params.slug);
    const company = await Company.findOne({ tenantId, slug, active: true }).lean() as any;
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const content = await readinessFor(tenantId, slug);
    if (!content.ready) return res.status(404).json({ message: 'Company not found' });

    const [fit, context] = await Promise.all([
      calculateCompanyFit(tenantId, studentId, slug),
      getCareerContext(tenantId, studentId),
    ]);

    if (!fit.available) {
      return res.json({
        company: { slug, name: company.name },
        available: false, reason: (fit as any).reason, message: (fit as any).message,
        focus: [], validate: [],
      });
    }
    const ready = fit as CompanyFitResult;

    /**
     * Stage decides the FRAMING, never the content.
     *
     * A first-year and a final-year student with the same gaps need the same skills; what
     * differs is whether this is a long-term target or the thing they are doing next month.
     * Rewriting the gap list by stage would be inventing a different measurement.
     */
    const stage = context?.derived?.stage || null;
    const horizon = stage === 'foundation' || stage === 'build' ? 'LONG_TERM' : 'ACTIVE';

    res.json({
      company: { slug, name: company.name },
      available: true,
      stage,
      horizon,
      profileVersion: ready.profileVersion,
      // Known deficits, most urgent first — the ranking is Module 8's priority score.
      focus: ready.gaps.map(g => ({
        skillKey: g.skillKey, skillName: g.skillName,
        current: g.studentScore, target: g.targetScore, gap: g.gapPoints,
        importance: g.importance, status: g.status,
      })),
      // Deliberately a separate list. These are not weaknesses — they are things nobody has
      // measured, and telling a student to "improve" one would be a guess.
      validate: ready.unknowns.map(u => ({
        skillKey: u.skillKey, skillName: u.skillName,
        importance: u.importance, status: u.status,
      })),
      strengths: ready.strengths.map(s => ({ skillKey: s.skillKey, skillName: s.skillName, current: s.studentScore })),
      roundSkills: ready.roundSkills,
      notes: ready.preparationNotes,
    });
  } catch (e: any) {
    console.error('[company-prep] preparation:', e?.message || e);
    res.status(500).json({ message: 'Could not load preparation for this company.' });
  }
};

/**
 * GET /passport/companies/overview — the listing, with a fit figure per card.
 *
 * ONE batched fit summary for the whole grid rather than a full calculation per company.
 * Twenty companies would otherwise be forty queries for a page nobody has scrolled yet.
 */
export const companyOverview = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, cfg, entitled } = await gate(req);
    if (!entitled) return res.json({ locked: true, priceInr: (cfg as any)?.priceInr ?? 1599 });

    const [companies, ready, context] = await Promise.all([
      Company.find({ tenantId, active: true }).sort({ questionCount: -1, name: 1 })
        .select('name slug type logoUrl questionCount').lean() as any,
      readySlugs(tenantId),
      getCareerContext(tenantId, studentId),
    ]);

    const readySet = new Set(ready);
    const visible = (companies as any[]).filter(c => readySet.has(c.slug));
    const roleKey = context?.career?.primaryRole || '';

    const fits = await summariseCompanyFits(tenantId, studentId, visible.map(c => c.slug), roleKey);
    const targets = targetsOf(user);
    const targetBySlug = new Map(targets.map(t => [t.slug, t]));

    res.json({
      locked: false,
      role: roleKey ? { key: roleKey } : null,
      stage: context?.derived?.stage || null,
      maxTargets: MAX_TARGET_COMPANIES,
      companies: visible.map(c => {
        const f = fits.get(c.slug);
        const t = targetBySlug.get(c.slug);
        return {
          slug: c.slug, name: c.name, type: c.type, logoUrl: c.logoUrl || '',
          questionCount: c.questionCount || 0,
          // Null when this company has no profile for the member's role, or nothing of theirs
          // has been measured against it. The card says so rather than showing 0%.
          readiness: f?.readiness ?? null,
          classification: f?.classification ?? null,
          classificationLabel: f?.classification ? FIT_LABEL[f.classification] : null,
          gaps: f?.gaps ?? null,
          isTarget: !!t,
          isPrimaryTarget: !!t?.primary,
        };
      }),
    });
  } catch (e: any) {
    console.error('[company-prep] overview:', e?.message || e);
    res.status(500).json({ message: 'Could not load companies.' });
  }
};

/**
 * PUT /passport/companies/targets — replace the member's target list.
 *
 * A whole-list write rather than add/remove endpoints: the screen edits a short list and
 * saves it, and two concurrent edits then resolve to one of the two lists rather than to a
 * merge neither member asked for.
 */
export const setTargets = async (req: Request, res: Response) => {
  try {
    const { tenantId, studentId, user, entitled } = await gate(req);
    if (!entitled) return res.status(403).json({ message: 'Membership required.' });

    const raw = Array.isArray(req.body?.slugs) ? req.body.slugs : [];
    const primary = String(req.body?.primary || '').trim();

    const wanted = [...new Set(raw.map((s: any) => String(s || '').trim()).filter(Boolean))]
      .slice(0, MAX_TARGET_COMPANIES);

    // Only companies that exist, are active, and are complete enough to be shown. A slug
    // typed into the request must not add a company the member could not otherwise open.
    const [rows, ready] = await Promise.all([
      Company.find({ tenantId, slug: { $in: wanted }, active: true }).select('slug').lean() as any,
      readySlugs(tenantId),
    ]);
    const readySet = new Set(ready);
    const valid = (rows as any[]).map(r => r.slug).filter(s => readySet.has(s));

    /**
     * When they started targeting each company — PRESERVED ACROSS EDITS.
     *
     * This is a whole-list write, so the naive version stamps `now` on every entry and a
     * member who merely reordered their list, or switched which company is primary, has
     * silently restarted the clock on all of them. Analytics that later asks "when did
     * students start preparing for Amazon" would then be reading the date of their last
     * unrelated edit.
     *
     * Only a company that was not already targeted gets a new stamp.
     */
    const existingAddedAt = new Map<string, Date>(
      (user?.passport?.targetCompanies || []).map((t: any) => [t.slug, t.addedAt]),
    );
    const now = new Date();
    const targetCompanies = valid.map(slug => ({
      slug,
      // Exactly one primary, and only if the member named one that survived validation.
      primary: slug === primary,
      addedAt: existingAddedAt.get(slug) || now,
    }));

    await User.updateOne(
      { _id: studentId },
      { $set: { 'passport.targetCompanies': targetCompanies } },
    );

    const rejected = wanted.filter((s: string) => !valid.includes(s));
    res.json({
      targets: targetCompanies.map(t => ({ slug: t.slug, primary: t.primary })),
      maxTargets: MAX_TARGET_COMPANIES,
      // Said out loud rather than dropped silently, so a member is not left wondering why
      // the company they picked did not stick.
      ...(rejected.length ? { rejected, message: 'Some companies are not available yet and were not added.' } : {}),
    });
  } catch (e: any) {
    console.error('[company-prep] setTargets:', e?.message || e);
    res.status(500).json({ message: 'Could not save your target companies.' });
  }
};
