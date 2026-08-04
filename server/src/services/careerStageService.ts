/**
 * Career stage — how close a member is to the job market.
 *
 * The obvious field to capture is "year of study", and it does not work. A 3rd-year
 * B.Tech student is mid-course; a 3rd-year B.Sc student is in their FINAL year facing
 * placements now. Same number, opposite situations. Add MCA (2 years), diplomas,
 * backlogs and gap years and the number stops meaning anything consistent.
 *
 * What actually decides which questions and which missions apply is time remaining
 * before they enter the market. So we capture a graduation date and derive the stage —
 * a final-year B.Sc and a final-year B.Tech both land in 'placement', which is correct,
 * because they compete for the same jobs on the same timeline.
 *
 * Deriving rather than asking also means the stage advances on its own: a member who
 * joins in their second year moves to 'build' and later 'placement' with no record ever
 * being edited, and a student who pushes their graduation back moves with it.
 */

export type CareerStage = 'foundation' | 'build' | 'placement' | 'job_seeker';

/**
 * `who` spells out which degree-and-year answers land in each stage, because that is the
 * form the admin tagging a question is thinking in — they know they are writing for a
 * first-year, not for "foundation".
 */
export const CAREER_STAGES: { key: CareerStage; label: string; blurb: string; who: string }[] = [
  { key: 'foundation', label: 'Foundation', blurb: 'Fundamentals and study habits — no achievements to report yet.', who: '1st year of B.Tech, B.Sc, BCA, Diploma' },
  { key: 'build',      label: 'Build',      blurb: 'Projects, depth, the first real proof of ability.',              who: 'B.Tech 2nd–3rd · B.Sc 2nd · MCA 1st' },
  { key: 'placement',  label: 'Placement',  blurb: 'Resume, mock interviews, applications.',                        who: 'Final year of any course' },
  { key: 'job_seeker', label: 'Job Seeker', blurb: 'Active in the market now.',                                     who: 'Graduated' },
];

export const PROGRAMS = ['B.Tech', 'B.E', 'B.Sc', 'BCA', 'B.Com', 'MCA', 'M.Tech', 'MBA', 'Diploma', 'Other'];

/**
 * How long each course runs. This is what lets us skip asking for a graduation date:
 * the join form already collects degree and academic year, and those two together give
 * the same answer — a 1st-year B.Tech has 3 years left, a 3rd-year B.Sc has none.
 *
 * Asking for a graduation date as well would be asking a student to restate, in a
 * format they have to think about, something they have already told us.
 */
const COURSE_YEARS: Record<string, number> = {
  'b.tech': 4, 'btech': 4, 'b.e': 4, 'b.e.': 4, 'be': 4,
  'b.sc': 3, 'b.sc.': 3, 'bsc': 3, 'bca': 3, 'b.com': 3, 'bcom': 3, 'b.a': 3, 'ba': 3,
  'mca': 2, 'm.tech': 2, 'mtech': 2, 'mba': 2, 'm.sc': 2, 'msc': 2,
  'diploma': 3, 'polytechnic': 3,
};

/** '3rd Year' → 3. 'Graduated' → 0 with graduated=true. */
function parseYear(yearOfStudy?: string | null): { year: number | null; graduated: boolean } {
  const s = String(yearOfStudy || '').trim().toLowerCase();
  if (!s) return { year: null, graduated: false };
  if (s.includes('grad') || s.includes('pass') || s.includes('complet')) return { year: null, graduated: true };
  const m = s.match(/(\d)/);
  return { year: m ? Number(m[1]) : null, graduated: false };
}

/**
 * Months remaining, derived from degree + academic year instead of a graduation date.
 *
 * Returns null when either input is missing or the degree is unrecognised, so the
 * caller falls back to a real graduation date if one was collected, and to "serve
 * everything" if not. An unknown degree must not silently become a 4-year course:
 * guessing here mis-stages a student, and mis-staging is worse than not staging.
 */
export function monthsFromCourse(degree?: string | null, yearOfStudy?: string | null): number | null {
  const { year, graduated } = parseYear(yearOfStudy);
  if (graduated) return -1;
  if (!year) return null;

  const key = String(degree || '').trim().toLowerCase().replace(/\s+/g, '');
  const total = COURSE_YEARS[key];
  if (!total) return null;

  // Clamp: a "4th Year" answer against a 3-year course means the course is over, not
  // that they have negative time left.
  return Math.max(0, total - year) * 12;
}

/**
 * Stage from where someone sits in their course, which is not the same question as how
 * many months are left.
 *
 * Months alone gets 3-year courses wrong: a first-year B.Sc has two years remaining, and
 * a pure time rule calls that 'build' — so no one in a 3-year course is ever offered
 * foundations, however new to programming they are. Position fixes that. A first year is
 * a first year in any course: they have just arrived and need fundamentals. A final year
 * is facing placements regardless of whether the course ran three years or four.
 *
 * Postgraduates are the deliberate exception — a first-year MCA already holds a degree
 * and is a year from the market, so they start at 'build', not 'foundation'.
 */
export function stageFromCourse(degree?: string | null, yearOfStudy?: string | null): CareerStage | null {
  const { year, graduated } = parseYear(yearOfStudy);
  if (graduated) return 'job_seeker';
  if (!year) return null;

  const key = String(degree || '').trim().toLowerCase().replace(/\s+/g, '');
  const total = COURSE_YEARS[key];
  if (!total) return null;                       // unknown course — do not guess

  if (year >= total) return 'placement';         // final year (or beyond, on a mismatch)
  if (year === 1 && total >= 3) return 'foundation';
  return 'build';
}

/** Whole months from now until the graduation date. Negative once it has passed. */
export function monthsUntil(gradYear?: number | null, gradMonth?: number | null, now = new Date()): number | null {
  if (!gradYear || gradYear < 1990 || gradYear > 2100) return null;
  const m = gradMonth && gradMonth >= 1 && gradMonth <= 12 ? gradMonth : 6;   // mid-year if unstated
  return (gradYear - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
}

/**
 * The stage for a member. `graduated: true` short-circuits the date, because someone
 * who has already finished is in the market regardless of what their certificate says.
 */
export function deriveStage(opts: {
  graduated?: boolean;
  graduationYear?: number | null;
  graduationMonth?: number | null;
  now?: Date;
}): CareerStage | null {
  if (opts.graduated) return 'job_seeker';
  const months = monthsUntil(opts.graduationYear, opts.graduationMonth, opts.now);
  if (months === null) return null;          // unknown — callers treat as "serve everything"
  if (months < 0) return 'job_seeker';
  if (months <= 12) return 'placement';
  if (months <= 24) return 'build';
  return 'foundation';
}

/**
 * Technical background. A B.Sc Physics student targeting IT and a B.Tech CSE student can
 * be at the same stage with very different baselines, so a handful of questions and
 * missions need to know which. Most content is 'any' and never consults this.
 */
export type Background = 'cs' | 'non_cs' | 'any';

/** Matched anywhere in the text — long enough that a chance substring is not a risk. */
const CS_PHRASES = [
  'computer', 'information tech', 'software', 'data science',
  'artificial intelligence', 'machine learning',
];

/**
 * Matched as WHOLE WORDS only. As substrings these are landmines: 'ai' appears inside
 * Aeronautical and Maintenance, 'it' inside dozens of ordinary words. An admin adding
 * "Aeronautical Engineering" to the branch list would otherwise have it classified as a
 * computing background.
 */
const CS_WORDS = ['cse', 'it', 'ise', 'bca', 'mca', 'ai'];

/** Branch answers that carry no information — treated as unknown, not as non-CS. */
const UNINFORMATIVE = ['other', 'others', 'none', 'na', 'n/a'];

/**
 * Degrees that say nothing about the field on their own. "B.Tech" is CSE and Civil
 * alike; only the branch separates them. Treating a bare degree as evidence would tag
 * every B.Tech CSE student non_cs and ask them to justify switching into IT from a field
 * they are already in — so a degree with no branch resolves to 'any', not to a guess.
 */
const FIELD_AGNOSTIC = ['b.tech', 'btech', 'b.e', 'b.e.', 'be', 'm.tech', 'mtech', 'diploma', 'b.sc', 'b.sc.', 'bsc', 'm.sc', 'msc', 'other'];

const looksCS = (text: string): boolean => {
  if (CS_PHRASES.some(h => text.includes(h))) return true;
  const words = text.split(/[^a-z]+/).filter(Boolean);
  return words.some(w => CS_WORDS.includes(w));
};

export function deriveBackground(program?: string | null, branch?: string | null, degree?: string | null): Background {
  const hay = `${program || ''} ${branch || ''}`.toLowerCase().trim();
  if (hay) {
    if (looksCS(hay)) return 'cs';
    // "Other" means they answered without telling us anything. Reading that as non-CS
    // would put them in front of "why are you moving into IT from your own field?".
    const words = hay.split(/[^a-z]+/).filter(Boolean);
    if (words.every(w => UNINFORMATIVE.includes(w))) return 'any';
    return 'non_cs';
  }

  // Nothing but a degree to go on. BCA/MCA are unambiguous; the rest are not.
  const key = String(degree || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!key) return 'any';
  if (FIELD_AGNOSTIC.includes(key)) return 'any';
  return looksCS(key) ? 'cs' : 'any';
}

/** Everything derived, in one call, for storing on the member. */
export function resolveCareerProfile(input: {
  program?: string | null;
  branch?: string | null;
  /** From the join form. Preferred, because these are the fields we actually collect. */
  degree?: string | null;
  yearOfStudy?: string | null;
  graduationYear?: number | null;
  graduationMonth?: number | null;
  graduated?: boolean;
  now?: Date;
}) {
  // Degree + academic year first: it is the data the signup form collects, so it is the
  // path that fires for real members. A graduation date, when an admin has set one, is
  // more precise and wins — but for most members it simply is not there.
  const fromDate = monthsUntil(input.graduationYear, input.graduationMonth, input.now);
  const stage = input.graduated
    ? 'job_seeker'
    : (fromDate !== null ? deriveStage(input) : stageFromCourse(input.degree, input.yearOfStudy));

  return {
    stage,
    background: deriveBackground(input.program, input.branch, input.degree),
    monthsToGraduation: fromDate !== null ? fromDate : monthsFromCourse(input.degree, input.yearOfStudy),
    stageComputedAt: input.now || new Date(),
  };
}

/**
 * Trim a filtered bank down to a paper a person will actually finish.
 *
 * Thirty-four questions is not a more accurate assessment than fourteen — it is the same
 * assessment with a worse completion rate and answers that get careless near the end.
 * Selection is deliberate rather than random so two students at the same stage sit
 * comparable papers and their scores mean the same thing:
 *
 *   - every category stays represented (round-robin), so no dimension scores 0/0
 *   - within a category, stage- and goal-specific questions outrank generic ones, since
 *     a targeted question tells us more about this student than a catch-all
 *   - the bank's own order is restored at the end, so the paper still reads coherently
 */
export function selectPaper<T extends { _id?: any; category?: string; weight?: number; stages?: string[] | null; goals?: string[] | null; background?: string | null }>(
  questions: T[],
  max: number,
  opts: { preferSpecific?: boolean } = {},
): T[] {
  if (!max || max <= 0 || questions.length <= max) return questions;

  // Preferring targeted questions is only right when we know who the student is. For a
  // member with no stage — an unrecognised degree, a pre-staging account — nothing has
  // been filtered out, so the targeted questions in the pool are targeted at somebody
  // else. Ranking them first would hand the one student we know least about a paper
  // aimed entirely at strangers. So the preference inverts: they get the general paper.
  const preferSpecific = opts.preferSpecific !== false;
  const rank = (q: T) => {
    const s = (q.stages?.length ? 2 : 0) +
              (q.goals?.length ? 2 : 0) +
              (q.background && q.background !== 'any' ? 1 : 0);
    return preferSpecific ? s : -s;
  };
  const specificity = rank;

  const byCat = new Map<string, T[]>();
  for (const q of questions) {
    const c = q.category || 'general';
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(q);
  }
  for (const list of byCat.values()) {
    list.sort((a, b) => specificity(b) - specificity(a) || (b.weight || 1) - (a.weight || 1));
  }

  const cats = [...byCat.keys()];
  const picked = new Set<T>();
  for (let depth = 0; picked.size < max; depth++) {
    let progressed = false;
    for (const c of cats) {
      const list = byCat.get(c)!;
      if (depth >= list.length) continue;
      picked.add(list[depth]);
      progressed = true;
      if (picked.size >= max) break;
    }
    if (!progressed) break;
  }

  return questions.filter(q => picked.has(q));
}

/**
 * Make a paper's conditional questions coherent.
 *
 * Stage tagging decides WHO is asked something; it cannot decide whether two questions
 * make sense together. "How many companies have you applied to?" is a fair question for a
 * final-year — but not immediately after they answered "resume: not written". The pair
 * reads as a form that is not listening, and a member who sees it stops trusting the
 * score at the end of it.
 *
 * A question may declare `dependsOn: { questionId, minChosen }`. Three things follow:
 *
 *   1. If the parent is not on the paper, the child cannot be asked at all — its condition
 *      could never be evaluated. Pull the parent in if there is room, otherwise drop the
 *      child. Dropping is safe: it only ever removes a question that would have been
 *      incoherent.
 *   2. The parent must come BEFORE the child. Restoring bank order alone does not
 *      guarantee that, and a child asked first is worse than the problem being fixed.
 *   3. Chains resolve — a child may itself be someone's parent.
 */
export function applyDependencies<T extends { _id?: any; dependsOn?: { questionId?: string; minChosen?: number } | null }>(
  paper: T[],
  eligible: T[],
  max: number,
): T[] {
  const id = (q: T) => String((q as any)?._id ?? '');
  const depOf = (q: T) => (q.dependsOn?.questionId ? String(q.dependsOn.questionId) : null);

  let out = paper.slice();
  // Bounded rather than "until stable": a malformed cycle in the data must not hang a
  // request. Each pass either adds a parent or drops a child, so it converges quickly.
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const q of out.slice()) {
      const want = depOf(q);
      if (!want) continue;
      if (out.some(x => id(x) === want)) continue;

      const parent = eligible.find(x => id(x) === want);
      if (parent && out.length < max) out.push(parent);
      else out = out.filter(x => id(x) !== id(q));
      changed = true;
    }
    if (!changed) break;
  }

  // Dropping a child leaves the paper short of the cap, so refill from what is left.
  // Only questions with no unmet dependency of their own are eligible, and the bank's
  // order is preserved so the refill reads as part of the paper rather than appended.
  if (out.length < max) {
    const have = new Set(out.map(id));
    for (const q of eligible) {
      if (out.length >= max) break;
      if (have.has(id(q))) continue;
      const want = depOf(q);
      if (want && !have.has(want)) continue;
      out.push(q);
      have.add(id(q));
    }
    const order = new Map(eligible.map((q, i) => [id(q), i]));
    out.sort((x, y) => (order.get(id(x)) ?? 0) - (order.get(id(y)) ?? 0));
  }

  // Order: move any child that sits before its parent to just after it.
  for (let pass = 0; pass < 10; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      const want = depOf(out[i]);
      if (!want) continue;
      const p = out.findIndex(x => id(x) === want);
      if (p <= i) continue;
      const [child] = out.splice(i, 1);
      out.splice(p, 0, child);           // p is now the slot just after the parent
      moved = true;
      break;
    }
    if (!moved) break;
  }

  return out;
}

/**
 * The three filtering axes for a member, derived on read.
 *
 * Every member who joined before staging shipped has `stage` unset, and an unset stage
 * means "serve everything" — so a first-year was still being offered resume questions and
 * resume missions long after the tagging was correct. Backfilling the stored value fixes
 * today's members; this fixes the ones who signed up an hour before the backfill, and any
 * member whose stored value is stale because they moved up a year.
 *
 * It must be ONE function used by every surface. The assessment had this logic inline and
 * the mission, dashboard and roadmap paths did not, so the same member was staged for
 * their questions and unstaged for their missions.
 */
export function memberAxes(user: any): { stage: string | null; background: string | null; careerGoal: string | null } {
  const p = user?.passport || {};
  let stage: string | null = p.stage || null;
  let background: string | null = p.background || null;

  if (!stage || !background) {
    const d = resolveCareerProfile({
      degree: p.degree, yearOfStudy: p.yearOfStudy,
      program: p.program, branch: p.branch,
      graduationMonth: p.graduationMonth ?? null,
      graduationYear: p.graduationYear ?? null,
      graduated: p.graduated === true,
    });
    stage = stage || d.stage;
    background = background || d.background;
  }
  return { stage, background, careerGoal: p.careerGoal || null };
}

/**
 * Does a piece of content apply to this member?
 *
 * Written once and shared by the assessment filter and the mission generator, because
 * the failure mode otherwise is subtle: two near-identical predicates that drift, so a
 * student is asked a placement question but never given the matching placement mission.
 *
 * Both filters default to INCLUDE. Untagged content — which is every question and
 * mission that exists today — serves everyone, so tagging is opt-in and nothing
 * disappears the moment this ships. A member with no stage (unknown graduation date)
 * likewise sees everything rather than being guessed into a segment.
 */
export function appliesToMember(
  content: { stages?: string[] | null; background?: string | null; goals?: string[] | null },
  member: { stage?: string | null; background?: string | null; careerGoal?: string | null },
): boolean {
  const stages = content.stages || [];
  if (stages.length && member.stage && !stages.includes(member.stage)) return false;

  const want = content.background || 'any';
  if (want !== 'any' && member.background && want !== member.background) return false;

  // Goal is the third axis: two students can share a stage and a background and still
  // need different questions, because one is heading for data work and the other for
  // development. "Not sure yet" is not a goal to filter on — a member who has not chosen
  // should see the broad paper, since narrowing them now is what we are trying to avoid.
  const goals = content.goals || [];
  const mine = member.careerGoal || '';
  if (goals.length && mine && !/not sure/i.test(mine) && !goals.includes(mine)) return false;

  return true;
}

/**
 * Guard against a stage being served an empty or near-empty paper.
 *
 * A stage with three questions still produces a score out of 100, and that score is
 * meaningless — but nothing in the system would say so. Admin screens call this to warn
 * before a thin segment reaches a student.
 */
export function coverageByStage(
  items: { stages?: string[] | null }[],
): Record<CareerStage, number> {
  const out = { foundation: 0, build: 0, placement: 0, job_seeker: 0 } as Record<CareerStage, number>;
  for (const it of items) {
    const tags = it.stages || [];
    if (!tags.length) { for (const k of Object.keys(out) as CareerStage[]) out[k]++; continue; }
    for (const t of tags) if (t in out) out[t as CareerStage]++;
  }
  return out;
}
