import { Request, Response } from 'express';
import { getCareerContext, updateCareerContext } from '../services/careerContextService';
import { CAREER_DOMAINS, AVAILABILITY_OPTIONS, SUPPORTED_PROGRAMS, domainOf, normalizeDomain, DAYS_PER_WEEK_OPTIONS } from '../services/careerDomainService';
import { CAREER_STAGES } from '../services/careerStageService';
import { getSelectableCareerRoles } from '../services/careerRoleService';
import PassportConfig from '../models/PassportConfig';

/**
 * A member's own career context.
 *
 * Both routes work only on the CALLER. The student id comes from the verified token and
 * the tenant from the authenticated context — neither is ever read from the body or the
 * path, so there is no parameter to tamper with and no id to enumerate. Every query is
 * additionally scoped by tenantId, so a token from one tenant cannot reach a document in
 * another even if an id were guessed.
 *
 * No admin route is added here. Module 1 needs none, and an endpoint that reads any
 * member's record is a thing to add deliberately with a permission, not incidentally.
 */

const tenantOf = (req: Request): string =>
  String((req as any).user?.tenantId || (req as any).tenantId || '');
const userIdOf = (req: Request): string => String((req as any).user?.id || (req as any).user?._id || '');

/** GET /passport/me/context */
export const getMyCareerContext = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const context = await getCareerContext(tenantId, studentId);
    if (!context) return res.status(404).json({ message: 'Account not found' });

    res.json({ context, options: await optionsFor(tenantId, context.career.domain) });
  } catch (e: any) {
    console.error('[career-context] get:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not load your career context' });
  }
};

/** PUT /passport/me/context */
export const updateMyCareerContext = async (req: Request, res: Response) => {
  try {
    const tenantId = tenantOf(req);
    const studentId = userIdOf(req);
    if (!tenantId || !studentId) return res.status(401).json({ message: 'Not authenticated' });

    const b = req.body || {};
    const { context, missing, invalid } = await updateCareerContext(tenantId, studentId, {
      domain: b.domain,
      primaryRole: b.primaryRole,
      secondaryRole: b.secondaryRole,
      preferredProgrammingLanguages: b.preferredProgrammingLanguages,
      minutesPerDay: b.minutesPerDay,
      daysPerWeek: b.daysPerWeek,
      program: b.program,
      degree: b.degree,
      branch: b.branch,
      currentAcademicYear: b.currentAcademicYear,
      graduationYear: b.graduationYear,
      complete: b.complete === true,
    });
    if (!context) return res.status(404).json({ message: 'Account not found' });

    // A role the configuration does not offer. Refused by the service before anything was
    // written, which is why frontend validation alone was never sufficient.
    if (invalid) return res.status(400).json({ message: invalid, context });

    // The refusal is the service's, not this endpoint's — completion was already declined
    // and never written. Reported here only so the member sees what is still needed.
    if (missing) {
      return res.status(400).json({
        message: 'Some answers are still needed before this can be marked complete.',
        missing,
        context,
      });
    }

    res.json({ context, options: await optionsFor(tenantId, context.career.domain) });
  } catch (e: any) {
    console.error('[career-context] update:', e?.message || e);
    res.status(500).json({ message: e.message || 'Could not save your career context' });
  }
};

/**
 * The vocabulary the UI renders. Served with the context so the onboarding screen never
 * hardcodes a role list that could drift from the one the server will accept.
 */
async function optionsFor(tenantId: string, domainKey: string) {
  const d = domainOf(normalizeDomain(domainKey));

  const cfg = await PassportConfig.findOne({ tenantId }).select('onboardingFields').lean() as any;
  /** An admin's list for a field, or the built-in one when they have not set it. */
  const fieldOptions = (key: string, fallback: string[]): string[] => {
    const field = (cfg?.onboardingFields || []).find((f: any) => f.key === key);
    const chosen = (field?.options || []).map((v: any) => String(v).trim()).filter(Boolean);
    return chosen.length ? chosen : fallback;
  };

  return {
    domains: CAREER_DOMAINS.filter(x => x.active).map(x => ({ key: x.key, label: x.label })),
    // From admin configuration now, not a constant. Same {key,label,blurb} shape the
    // frontend already renders, so Module 1's contract is unchanged — a role added in the
    // admin screen appears here on the next request, with no deploy.
    roles: await getSelectableCareerRoles(tenantId, domainKey),
    languages: d.languages,
    availability: AVAILABILITY_OPTIONS,
    daysPerWeek: DAYS_PER_WEEK_OPTIONS,
    // ADMIN-CONFIGURED, not constants. These were a code constant and a literal array, so
    // the programme list an admin curated in Platform Settings — where they had already
    // narrowed Degree to B.Tech and written the real branch taxonomy — was ignored by the
    // one screen that asks a student for it. The onboarding form and this setup screen
    // asked the same question and offered different answers.
    //
    // Falling back to the constants keeps a tenant that has configured nothing working
    // exactly as before; an empty list would leave a student with no chips to press.
    programs: fieldOptions('degree', SUPPORTED_PROGRAMS),
    academicYears: fieldOptions('yearOfStudy', ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated']),
    // Branch has no constant to fall back to — it was a free-text box here while the admin
    // maintained a curated list. Empty means the client keeps the text input, so a tenant
    // that has not configured branches is no worse off.
    branches: fieldOptions('branch', []),
    // Sent for display only. The stage a member is in is decided by the server and is
    // not among the things they can pick.
    stages: CAREER_STAGES.map(s => ({ key: s.key, label: s.label, blurb: s.blurb })),
  };
}
