import User from '../models/User';
import CollegeMembership from '../models/CollegeMembership';
import mongoose from 'mongoose';

/**
 * Whether a student meets a company's stated eligibility criteria.
 *
 * ELIGIBILITY IS NOT READINESS, and the two are never merged. A student can clear every
 * cutoff and be nowhere near ready, or be the strongest candidate we have measured and be
 * ruled out by a backlog. Collapsing them into one figure would hide whichever fact the
 * student actually needed.
 *
 * UNKNOWN IS A REAL ANSWER, and the most important one here. CareerPilot does not record a
 * member's CGPA or backlog count: those live on CollegeMembership for college-linked
 * students, and nowhere at all for a member who signed up directly. Treating an absent CGPA
 * as a failed cutoff would tell thousands of eligible students they cannot apply — so
 * missing data produces UNKNOWN for that criterion and POTENTIALLY_ELIGIBLE overall, with
 * the gap named so they know what to supply.
 *
 * NOTHING IS INFERRED. No criterion is guessed from a resume, a percentage is not converted
 * into a CGPA, and a blank branch does not become a mismatch. Every value compared here was
 * entered by somebody as a fact about themselves or configured by an admin as a fact about
 * the company.
 *
 * ONLY VERIFIED CRITERIA COUNT. Company.eligibility stays hidden until an admin ticks
 * `verified.eligibility`, because an AI-drafted cutoff nobody checked is a confident wrong
 * number, and a student will act on it.
 */

export type EligibilityVerdict =
  | 'ELIGIBLE'
  | 'POTENTIALLY_ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'UNKNOWN';

export type CriterionStatus = 'MET' | 'NOT_MET' | 'UNKNOWN';

export interface EligibilityCriterion {
  key: string;
  label: string;
  /** What the company asks for, as text a student can read. */
  required: string;
  /** What we hold about the student, or null when we hold nothing. */
  studentValue: string | null;
  status: CriterionStatus;
  /** Why this criterion landed where it did — shown, never hidden. */
  detail: string;
}

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  /** Set when the verdict is NOT_ELIGIBLE: the single criterion that decided it. */
  decidedBy: string | null;
  criteria: EligibilityCriterion[];
  /** True when the admin has signed off the criteria being compared against. */
  verified: boolean;
  message: string;
}

const NOT_CONFIGURED: EligibilityResult = {
  verdict: 'UNKNOWN',
  decidedBy: null,
  criteria: [],
  verified: false,
  message: 'Eligibility information for this company is not available yet.',
};

/**
 * What we know about the student's academic record.
 *
 * CollegeMembership is the only place CGPA and backlogs are recorded as facts rather than
 * as free text somebody typed into a resume. A member who is not linked to a college has
 * neither, and that is reported as not-known rather than filled in from somewhere weaker.
 */
async function academicRecord(tenantId: string, studentId: string): Promise<{
  branch: string | null;
  degree: string | null;
  graduationYear: number | null;
  cgpa: number | null;
  backlogs: number | null;
}> {
  const [user, membership] = await Promise.all([
    User.findById(studentId).select('passport').lean() as any,
    // Tenant is an ObjectId on this model, unlike the CareerPilot ones. A malformed id must
    // not throw and lose the whole eligibility panel — it just means no membership.
    mongoose.isValidObjectId(tenantId) && mongoose.isValidObjectId(studentId)
      ? CollegeMembership.findOne({ userId: studentId, tenantId, isActive: true })
        .select('cgpa backlogs').lean() as any
      : null,
  ]);

  const p = user?.passport || {};
  return {
    branch: p.branch ? String(p.branch) : null,
    degree: p.program || p.degree ? String(p.program || p.degree) : null,
    graduationYear: Number.isFinite(Number(p.graduationYear)) ? Number(p.graduationYear) : null,
    cgpa: Number.isFinite(Number(membership?.cgpa)) ? Number(membership.cgpa) : null,
    backlogs: Number.isFinite(Number(membership?.backlogs)) ? Number(membership.backlogs) : null,
  };
}

/** Case- and punctuation-insensitive, so "CSE" matches "cse" and "C.S.E". */
const norm = (s: string): string => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function evaluateEligibility(
  tenantId: string,
  studentId: string,
  company: { eligibility?: any; verified?: { eligibility?: boolean } } | null,
): Promise<EligibilityResult> {
  // Unverified criteria are treated as absent rather than applied quietly. A student told
  // "not eligible" on a number nobody checked has been given a reason not to apply.
  if (!company?.verified?.eligibility || !company?.eligibility) return NOT_CONFIGURED;

  const e = company.eligibility;
  const record = await academicRecord(tenantId, studentId);
  const criteria: EligibilityCriterion[] = [];

  if (Number.isFinite(Number(e.cgpaMin))) {
    const min = Number(e.cgpaMin);
    criteria.push(record.cgpa === null
      ? {
          key: 'cgpa', label: 'CGPA', required: `${min} and above`,
          studentValue: null, status: 'UNKNOWN',
          detail: 'We do not have your CGPA on record.',
        }
      : {
          key: 'cgpa', label: 'CGPA', required: `${min} and above`,
          studentValue: String(record.cgpa),
          status: record.cgpa >= min ? 'MET' : 'NOT_MET',
          detail: record.cgpa >= min
            ? `Your ${record.cgpa} clears the ${min} cut-off.`
            : `This company asks for ${min}; our record shows ${record.cgpa}.`,
        });
  }

  if (Number.isFinite(Number(e.backlogsAllowed))) {
    const allowed = Number(e.backlogsAllowed);
    const requiredText = allowed === 0 ? 'No active backlogs' : `At most ${allowed} active backlog${allowed === 1 ? '' : 's'}`;
    criteria.push(record.backlogs === null
      ? {
          key: 'backlogs', label: 'Backlogs', required: requiredText,
          studentValue: null, status: 'UNKNOWN',
          detail: 'We do not have your backlog record.',
        }
      : {
          key: 'backlogs', label: 'Backlogs', required: requiredText,
          studentValue: String(record.backlogs),
          status: record.backlogs <= allowed ? 'MET' : 'NOT_MET',
          detail: record.backlogs <= allowed
            ? 'Within what this company allows.'
            : `This company allows ${allowed}; our record shows ${record.backlogs}.`,
        });
  }

  if (Array.isArray(e.branches) && e.branches.length) {
    const wanted = e.branches.map((b: string) => norm(b));
    criteria.push(!record.branch
      ? {
          key: 'branch', label: 'Branch', required: e.branches.join(', '),
          studentValue: null, status: 'UNKNOWN',
          detail: 'Your branch is not set on your profile.',
        }
      : {
          key: 'branch', label: 'Branch', required: e.branches.join(', '),
          studentValue: record.branch,
          status: wanted.includes(norm(record.branch)) ? 'MET' : 'NOT_MET',
          detail: wanted.includes(norm(record.branch))
            ? `${record.branch} is on this company's list.`
            : `This company hires from ${e.branches.join(', ')}.`,
        });
  }

  /**
   * Tenth and twelfth marks, and gap years, are configurable and we hold none of them.
   *
   * Reported as UNKNOWN rather than dropped: a student needs to know a cut-off exists and
   * that we cannot check it for them. Quietly omitting it would read as having passed.
   */
  if (Number.isFinite(Number(e.tenthMin))) {
    criteria.push({
      key: 'tenth', label: 'Class 10', required: `${Number(e.tenthMin)}% and above`,
      studentValue: null, status: 'UNKNOWN',
      detail: 'We do not hold your Class 10 marks.',
    });
  }
  if (Number.isFinite(Number(e.twelfthMin))) {
    criteria.push({
      key: 'twelfth', label: 'Class 12', required: `${Number(e.twelfthMin)}% and above`,
      studentValue: null, status: 'UNKNOWN',
      detail: 'We do not hold your Class 12 marks.',
    });
  }
  if (Number.isFinite(Number(e.gapYearsAllowed))) {
    criteria.push({
      key: 'gapYears', label: 'Education gap',
      required: `At most ${Number(e.gapYearsAllowed)} year${Number(e.gapYearsAllowed) === 1 ? '' : 's'}`,
      studentValue: null, status: 'UNKNOWN',
      detail: 'We do not hold your education gap history.',
    });
  }

  if (!criteria.length) return NOT_CONFIGURED;

  /**
   * One failed criterion decides it, and is named.
   *
   * A student ruled out by a CGPA cut-off is owed the cut-off, not a verdict. And a single
   * NOT_MET outranks any number of unknowns: the thing we DO know is disqualifying.
   */
  const failed = criteria.find(c => c.status === 'NOT_MET');
  if (failed) {
    return {
      verdict: 'NOT_ELIGIBLE',
      decidedBy: failed.key,
      criteria,
      verified: true,
      message: `${failed.label}: ${failed.detail}`,
    };
  }

  const unknowns = criteria.filter(c => c.status === 'UNKNOWN');
  if (unknowns.length) {
    return {
      verdict: 'POTENTIALLY_ELIGIBLE',
      decidedBy: null,
      criteria,
      verified: true,
      message: `You meet everything we can check. ${unknowns.map(u => u.label).join(', ')} we cannot confirm from your profile.`,
    };
  }

  return {
    verdict: 'ELIGIBLE',
    decidedBy: null,
    criteria,
    verified: true,
    message: 'You meet the criteria this company has published.',
  };
}
