import { Company, CompanyQuestion, InterviewPattern } from '../models/CompanyQuestionModels';

/**
 * Whether a company is fit to be shown to a paying member.
 *
 * The agreed bar: an overview, an interview pattern, at least 20 questions, and eligibility
 * that a human has verified. Below it, the company is invisible — not greyed out, not
 * "coming soon", absent. A member who paid ₹1599, clicked Infosys and found three empty
 * tabs is a worse outcome than Infosys not being listed, and it is the kind of impression
 * that does not wash off.
 *
 * Computed rather than stored, so it can never drift from the data it describes: delete
 * questions and the company drops out of the listing on the next request.
 */

export const MIN_QUESTIONS = 20;

export interface ReadinessCheck {
  key: string;
  label: string;
  done: boolean;
  detail: string;
  /** False for the extras — they improve the page but do not gate it. */
  required: boolean;
}

export interface Readiness {
  ready: boolean;
  score: number;          // 0-100 across ALL checks, so progress is visible past the bar
  checks: ReadinessCheck[];
  missing: string[];
}

export async function readinessFor(tenantId: string, slug: string): Promise<Readiness> {
  const [company, questions, pattern] = await Promise.all([
    Company.findOne({ tenantId, slug }).lean() as any,
    CompanyQuestion.countDocuments({ tenantId, companySlug: slug, status: 'published' }),
    InterviewPattern.findOne({ tenantId, companySlug: slug }).lean() as any,
  ]);
  if (!company) {
    return { ready: false, score: 0, checks: [], missing: ['Company not found'] };
  }

  const bands = company.salaryBands?.length || 0;
  const rounds = pattern?.rounds?.length || 0;

  const checks: ReadinessCheck[] = [
    {
      key: 'overview', label: 'Overview written', required: true,
      done: !!(company.about || '').trim(),
      detail: (company.about || '').trim() ? 'Written' : 'No overview yet',
    },
    {
      key: 'pattern', label: 'Interview pattern', required: true,
      // One round is not a pattern — it tells a student nothing about the shape.
      done: rounds >= 2,
      detail: rounds ? `${rounds} round${rounds === 1 ? '' : 's'}` : 'Not defined',
    },
    {
      key: 'questions', label: `At least ${MIN_QUESTIONS} questions`, required: true,
      done: questions >= MIN_QUESTIONS,
      detail: `${questions} published`,
    },
    {
      key: 'eligibility', label: 'Eligibility verified by a human', required: true,
      // Present is not enough. The tick is the point: an AI draft that nobody checked is
      // exactly the failure this gate exists to prevent.
      done: !!company.verified?.eligibility,
      detail: company.verified?.eligibility
        ? 'Verified'
        : company.eligibility?.cgpaMin || company.eligibility?.branches?.length
          ? 'Drafted, needs a human tick'
          : 'Not filled',
    },
    {
      key: 'salary', label: 'Salary ranges verified', required: false,
      done: bands > 0 && !!company.verified?.salary,
      detail: !bands ? 'None' : company.verified?.salary ? `${bands} verified` : `${bands}, needs a tick`,
    },
    {
      key: 'tips', label: 'Tips', required: false,
      done: (company.tips?.length || 0) > 0,
      detail: `${company.tips?.length || 0}`,
    },
  ];

  const required = checks.filter(c => c.required);
  return {
    ready: required.every(c => c.done),
    score: Math.round((checks.filter(c => c.done).length / checks.length) * 100),
    checks,
    missing: required.filter(c => !c.done).map(c => c.label),
  };
}

/**
 * Readiness for many companies at once.
 *
 * The admin list needs this for every row, and doing it one at a time would be three
 * queries per company — 180 round trips for a 60-company roster.
 */
export async function readinessForAll(tenantId: string): Promise<Map<string, Readiness>> {
  const [companies, counts, patterns] = await Promise.all([
    Company.find({ tenantId }).lean() as any,
    CompanyQuestion.aggregate([
      { $match: { tenantId, status: 'published' } },
      { $group: { _id: '$companySlug', n: { $sum: 1 } } },
    ]),
    InterviewPattern.find({ tenantId }).select('companySlug rounds').lean() as any,
  ]);

  const qBySlug = new Map(counts.map((c: any) => [c._id, c.n]));
  const rBySlug = new Map(patterns.map((p: any) => [p.companySlug, p.rounds?.length || 0]));
  const out = new Map<string, Readiness>();

  for (const c of companies) {
    const questions = Number(qBySlug.get(c.slug) || 0);
    const rounds = Number(rBySlug.get(c.slug) || 0);
    const bands = c.salaryBands?.length || 0;

    const checks: ReadinessCheck[] = [
      { key: 'overview', label: 'Overview written', required: true, done: !!(c.about || '').trim(), detail: (c.about || '').trim() ? 'Written' : 'Missing' },
      { key: 'pattern', label: 'Interview pattern', required: true, done: rounds >= 2, detail: rounds ? `${rounds} rounds` : 'Not defined' },
      { key: 'questions', label: `At least ${MIN_QUESTIONS} questions`, required: true, done: questions >= MIN_QUESTIONS, detail: `${questions} published` },
      { key: 'eligibility', label: 'Eligibility verified by a human', required: true, done: !!c.verified?.eligibility, detail: c.verified?.eligibility ? 'Verified' : 'Needs a tick' },
      { key: 'salary', label: 'Salary ranges verified', required: false, done: bands > 0 && !!c.verified?.salary, detail: bands ? `${bands}` : 'None' },
      { key: 'tips', label: 'Tips', required: false, done: (c.tips?.length || 0) > 0, detail: `${c.tips?.length || 0}` },
    ];
    const required = checks.filter(x => x.required);
    out.set(c.slug, {
      ready: required.every(x => x.done),
      score: Math.round((checks.filter(x => x.done).length / checks.length) * 100),
      checks,
      missing: required.filter(x => !x.done).map(x => x.label),
    });
  }
  return out;
}

/**
 * Slugs a student is allowed to see.
 *
 * The listing and every company endpoint filter through this, so a member cannot reach an
 * unready company by typing its URL either.
 */
export async function readySlugs(tenantId: string): Promise<string[]> {
  const all = await readinessForAll(tenantId);
  return Array.from(all.entries()).filter(([, r]) => r.ready).map(([slug]) => slug);
}
