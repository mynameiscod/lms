import { aiComplete } from './aiGateway';

/**
 * Draft a company's profile so 60 of them can be filled in an afternoon rather than a week.
 *
 * Everything produced here is a DRAFT. The overview and interview pattern publish on normal
 * approval; eligibility and salary do not publish until a human ticks them, because those
 * are the two fields a student acts on directly — apply or do not apply, negotiate or do
 * not. A model that is confidently wrong about a CGPA cutoff costs someone an application
 * they were entitled to make, and it cannot know this year's numbers at this company.
 *
 * The prompt therefore asks for typical, widely-reported figures and to say so, rather than
 * inventing precision it does not have.
 */

export interface CompanyDraft {
  about: string;
  hiringTimeline: string;
  eligibility: {
    cgpaMin?: number;
    tenthMin?: number;
    twelfthMin?: number;
    backlogsAllowed?: number;
    branches: string[];
    notes: string;
  };
  salaryBands: { role: string; minLpa: number; maxLpa: number; note: string }[];
  rounds: {
    key: string; name: string; order: number; durationMins?: number;
    tests: string[]; description: string; cutoff: string; tip: string;
  }[];
  tips: string[];
}

const SYSTEM = `You brief Indian engineering students on what to expect when interviewing at a company.

Return ONLY a JSON object:
{
 "about": "3-4 sentences: what the company does, what engineers there work on, why a fresher would want in",
 "hiringTimeline": "one line, e.g. 'Campus drives Aug-Oct, offers by Dec'",
 "eligibility": {"cgpaMin": 7.0, "tenthMin": 60, "twelfthMin": 60, "backlogsAllowed": 0,
                 "branches": ["CSE","IT","ECE"], "notes": "anything conditional"},
 "salaryBands": [{"role":"Software Engineer","minLpa":3.5,"maxLpa":7,"note":"fresher CTC"}],
 "rounds": [{"key":"online_test","name":"Online Assessment","order":1,"durationMins":90,
             "tests":["aptitude","logical reasoning","basic coding"],
             "description":"what happens in this round",
             "cutoff":"typical bar to clear","tip":"one specific thing to prepare"}],
 "tips": ["3-5 specific, actionable things a student should do before applying"]
}

RULES THAT MATTER:
- Give TYPICAL, widely-reported figures. If a company's cutoff varies by campus or year,
  say so in notes rather than inventing a single precise number.
- If you genuinely do not know a figure, omit the field. An absent number is fine; a
  confident wrong one is not — a student acts on these.
- rounds must reflect how this company ACTUALLY hires. A mass-recruiting service company
  and a product company have very different processes; do not give them the same shape.
- Write for a final-year student in India. Plain, concrete, no marketing language.`;

/** Round keys must line up with the tenant's taxonomy or the UI cannot label them. */
function normaliseRound(r: any, allowed: Set<string>, i: number) {
  const key = allowed.has(r.key) ? r.key : (
    /online|assess|test|apti/i.test(r.name || '') ? 'online_test'
      : /cod/i.test(r.name || '') ? 'coding'
      : /system|design/i.test(r.name || '') ? 'system_design'
      : /hr|culture/i.test(r.name || '') ? 'hr'
      : /manager|leader/i.test(r.name || '') ? 'managerial'
      : /gd|group/i.test(r.name || '') ? 'gd'
      : 'technical'
  );
  return {
    key,
    name: String(r.name || key).slice(0, 60),
    order: Number(r.order) || i + 1,
    durationMins: Number(r.durationMins) || undefined,
    tests: Array.isArray(r.tests) ? r.tests.map((t: any) => String(t).slice(0, 40)).slice(0, 6) : [],
    description: String(r.description || '').slice(0, 600),
    cutoff: String(r.cutoff || '').slice(0, 120),
    tip: String(r.tip || '').slice(0, 300),
  };
}

const num = (v: any, lo: number, hi: number): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
};

export async function draftCompany(opts: {
  tenantId: string;
  name: string;
  type: string;
  roundKeys: string[];
}): Promise<CompanyDraft> {
  const raw = await aiComplete({
    tenantId: opts.tenantId,
    module: 'company_profile_draft',
    product: 'careerpilot',
    system: SYSTEM,
    user: [
      `Company: ${opts.name}`,
      `Category: ${opts.type}`,
      `Use these round keys where they fit: ${opts.roundKeys.join(', ')}`,
      'Target role: entry-level software engineering in India.',
    ].join('\n'),
    maxTokens: 2200,
  });

  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(`Could not draft ${opts.name}.`);

  let j: any;
  try { j = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error(`The draft for ${opts.name} came back unreadable.`); }

  const allowed = new Set(opts.roundKeys);
  const el = j.eligibility || {};

  return {
    about: String(j.about || '').slice(0, 1000),
    hiringTimeline: String(j.hiringTimeline || '').slice(0, 200),
    eligibility: {
      // Ranges chosen to reject nonsense rather than to be clever: a CGPA of 45 is a
      // percentage the model put in the wrong field, and publishing it would be worse
      // than leaving it blank.
      cgpaMin: num(el.cgpaMin, 4, 10),
      tenthMin: num(el.tenthMin, 33, 100),
      twelfthMin: num(el.twelfthMin, 33, 100),
      backlogsAllowed: num(el.backlogsAllowed, 0, 10),
      branches: Array.isArray(el.branches) ? el.branches.map((b: any) => String(b).slice(0, 20)).slice(0, 12) : [],
      notes: String(el.notes || '').slice(0, 400),
    },
    salaryBands: Array.isArray(j.salaryBands)
      ? j.salaryBands
          .map((b: any) => ({
            role: String(b.role || '').slice(0, 80),
            minLpa: Number(b.minLpa) || 0,
            maxLpa: Number(b.maxLpa) || 0,
            note: String(b.note || '').slice(0, 200),
          }))
          .filter((b: any) => b.role && b.maxLpa >= b.minLpa && b.maxLpa > 0 && b.maxLpa < 200)
          .slice(0, 6)
      : [],
    rounds: Array.isArray(j.rounds)
      ? j.rounds.map((r: any, i: number) => normaliseRound(r, allowed, i)).slice(0, 8)
      : [],
    tips: Array.isArray(j.tips) ? j.tips.map((t: any) => String(t).slice(0, 300)).filter(Boolean).slice(0, 6) : [],
  };
}
