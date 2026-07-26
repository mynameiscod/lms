// Deterministic daily-mission generator — no per-user AI. Given a student's assessment
// result + the day number (days since journey start), produce that day's 3 missions,
// biased toward their weakest categories and their recommended pathway. Keys are stable
// per (day, slot) so completion state matches across reloads.

interface Mission { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; }
interface AttemptLite {
  careerScore: number;
  categoryScores: { key: string; label: string; score: number }[];
  weaknesses: string[];
  pathway: string;
  pathwayLabel: string;
}

// Per-category mission pools (cycled by day). Deterministic, no external content needed.
const POOLS: Record<string, { title: string; detail: string; type: string; xp: number; link?: string }[]> = {
  technical: [
    { title: 'Programming basics drill', detail: 'Revise variables, loops & conditionals, then solve 2 MCQs.', type: 'learn', xp: 20 },
    { title: 'Solve 1 beginner problem', detail: 'Open the Playground and solve one easy coding problem.', type: 'practice', xp: 30, link: '/playground' },
    { title: 'Understand data structures', detail: 'Read about arrays vs objects; note 2 differences.', type: 'learn', xp: 20 },
    { title: 'Write a small function', detail: 'Write a function that returns the largest of 3 numbers.', type: 'practice', xp: 25, link: '/playground' },
    { title: 'SQL warm-up', detail: 'Write a SELECT query with a WHERE clause.', type: 'practice', xp: 20 },
  ],
  aptitude: [
    { title: 'Aptitude set', detail: 'Solve 10 timed quantitative questions.', type: 'aptitude', xp: 20 },
    { title: 'Percentages & ratios', detail: 'Practice 8 percentage/ratio problems.', type: 'aptitude', xp: 20 },
    { title: 'Speed–distance–time', detail: 'Solve 6 speed/time problems.', type: 'aptitude', xp: 20 },
  ],
  logical_reasoning: [
    { title: 'Reasoning puzzles', detail: 'Solve 10 series & pattern questions.', type: 'aptitude', xp: 20 },
    { title: 'Odd-one-out set', detail: 'Practice 8 classification questions.', type: 'aptitude', xp: 15 },
    { title: 'Blood relations', detail: 'Solve 5 relationship puzzles.', type: 'aptitude', xp: 20 },
  ],
  communication: [
    { title: 'Record a self-introduction', detail: 'Do a 2-minute self-intro in the Communication Lab.', type: 'communication', xp: 30, link: '/communication' },
    { title: 'Explain a concept', detail: 'Explain "what is a database" in 5 simple sentences aloud.', type: 'communication', xp: 25 },
    { title: 'Email practice', detail: 'Write a short professional email requesting an interview slot.', type: 'communication', xp: 20 },
  ],
  employability: [
    { title: 'Resume kickoff', detail: 'Fill your name, education & 3 skills in the resume builder.', type: 'resume', xp: 25, link: '/career-profile' },
    { title: 'Add a project', detail: 'Write 2 lines about one project you built.', type: 'resume', xp: 25 },
    { title: 'LinkedIn headline', detail: 'Write a 1-line LinkedIn headline for your target role.', type: 'resume', xp: 15 },
    { title: 'Mock interview prep', detail: 'List 3 questions you expect in an interview + your answers.', type: 'mock', xp: 30 },
  ],
  career_clarity: [
    { title: 'Define your target role', detail: 'Write 1 role you want + 3 skills it needs.', type: 'learn', xp: 15 },
    { title: 'Research a company', detail: 'Pick 1 company; note what role & skills they hire for.', type: 'learn', xp: 20 },
  ],
};

// Stable per-day hash (no Math.random — must be reproducible).
function hash(n: number): number { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; return x >>> 0; }

/** Ordered category focus: weakest categories first, then the rest, always ending with a clarity/resume touch. */
function focusOrder(attempt: AttemptLite): string[] {
  const sorted = [...attempt.categoryScores].sort((a, b) => a.score - b.score).map(c => c.key);
  return sorted; // weakest → strongest
}

export function missionsForDay(attempt: AttemptLite, day: number): Mission[] {
  const order = focusOrder(attempt);
  if (!order.length) return [];
  const h = hash(day);

  // 3 slots: two weakest categories + one rotating (keeps variety without AI).
  const cats = [
    order[0],
    order[1] || order[0],
    order[(day - 1) % order.length],
  ];

  return cats.map((cat, slot) => {
    const pool = POOLS[cat] || POOLS.career_clarity;
    const pick = pool[(h + slot * 7 + day) % pool.length];
    return {
      key: `d${day}-s${slot}`,
      title: pick.title,
      detail: pick.detail,
      category: cat,
      type: pick.type,
      xp: pick.xp,
      link: pick.link,
    };
  });
}

/** Whole-journey day number (1-based) from a start date. */
export function dayNumber(startDate: Date, now: Date): number {
  const ms = now.getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

/** UTC 'YYYY-MM-DD' for streak bookkeeping. */
export function ymd(d: Date): string { return new Date(d).toISOString().slice(0, 10); }
