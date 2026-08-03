/**
 * Stage-specific 90-day pathways — data_analytics and ai_ready.
 *
 * seedStagedPathways.ts staged software_dev and it_bridge across all four stages and
 * deliberately left these two for later. "Later" is now: a first-year who picks Data
 * Analytics currently opens their roadmap and sees the same thirteen week themes as
 * someone graduating in four months, which is the one place a paying member can see
 * plainly that nothing was personalised.
 *
 * Written to the same shape as the first script, so the two can be read side by side.
 * 13 week themes each — one per week of a 90-day plan.
 *
 * The distinction that drives the writing: data work and AI work SHARE a foundation
 * (numeracy, Python, honest handling of data) and diverge sharply after it. The
 * foundation plans here are therefore close cousins; the placement plans are not.
 *
 * Run: npx ts-node src/scripts/seedStagedPathways2.ts <tenantId>
 * Idempotent on (tenantId, key, stage).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportContent from '../models/PassportContent';

dotenv.config();

interface StagedPathway {
  key: string; label: string; stage: string; description: string; weekThemes: string[];
}

const PATHWAYS: StagedPathway[] = [

  /* ══ data_analytics ═══════════════════════════════════════════════════════ */
  {
    key: 'data_analytics', stage: 'foundation',
    label: 'Data Analytics — Foundation',
    description: 'Analytics rewards people who are comfortable with numbers and suspicious of them. Build both now, while you have the time to be slow about it.',
    weekThemes: [
      'Set a daily habit — 45 minutes, same time',
      'Spreadsheets properly: formulas, sorting, filtering',
      'Percentages, ratios and growth — by hand',
      'Your first SELECT: reading data instead of guessing',
      'Filtering with WHERE, and why order matters',
      'Averages, medians, and when each one lies',
      'Counting and grouping — the analyst’s daily verb',
      'Find a public dataset and ask it one question',
      'Charts that tell the truth: axes, labels, zero',
      'Read published statistics critically',
      'Explain a number to someone who was not there',
      'Aptitude and data interpretation groundwork',
      'Review: which of these do you actually enjoy?',
    ],
  },
  {
    key: 'data_analytics', stage: 'build',
    label: 'Data Analytics — Build',
    description: 'The basics are behind you. This is where you stop practising on clean teaching data and start handling the messy kind that real work is made of.',
    weekThemes: [
      'Audit your gaps honestly',
      'JOINs: combining tables without losing rows',
      'GROUP BY and HAVING until they are automatic',
      'Subqueries and CTEs for questions with two parts',
      'Python for data: pandas, loading and filtering',
      'Clean a genuinely messy dataset — and document it',
      'Missing values: decide, do not delete by reflex',
      'One analysis end to end, question to answer',
      'Visualisation that earns its space on the page',
      'Put your work somewhere someone else can open it',
      'Write up a finding in one page',
      'Second dataset — prove the first was not luck',
      'Review: can a stranger follow your analysis?',
    ],
  },
  {
    key: 'data_analytics', stage: 'placement',
    label: 'Data Analytics — Placement',
    description: 'Analytics interviews test SQL under time and judgement under questioning. Both are practised, not innate.',
    weekThemes: [
      'SQL under interview conditions — no syntax lookups',
      'Window functions and ranking',
      'Query optimisation: why yours is slow',
      'Case study: business question to recommendation',
      'Statistics they will actually ask about',
      'A/B testing and what significance really claims',
      'Your portfolio: two analyses, both shareable',
      'Defend a number — how it was calculated, how it could be wrong',
      'Resume: quantify every bullet',
      'Mock interview — the technical round',
      'Mock interview — the case round',
      'Apply: five tailored applications a week',
      'Review: which round loses you the most?',
    ],
  },
  {
    key: 'data_analytics', stage: 'job_seeker',
    label: 'Data Analytics — Job Seeker',
    description: 'You are competing against people with the same coursework. What separates you now is visible work and a search you run like a job.',
    weekThemes: [
      'Fix the gap in your story — what you have been doing',
      'One portfolio analysis worth showing a stranger',
      'SQL drills daily until they are reflex',
      'Rebuild your resume around outcomes, not tools',
      'Widen the search: smaller firms, other cities',
      'Ask three people for a referral',
      'Mock interview — record and rewatch',
      'Learn one tool the job posts keep naming',
      'Publish something — a write-up, a dashboard',
      'Track every application and follow up',
      'Rework your weakest interview answer',
      'Second portfolio piece, different domain',
      'Review: applications out, replies in, what changed?',
    ],
  },

  /* ══ ai_ready ═════════════════════════════════════════════════════════════ */
  {
    key: 'ai_ready', stage: 'foundation',
    label: 'AI-Ready — Foundation',
    description: 'Almost nobody who wants to build AI starts with the maths and the Python. Doing that now is what separates you from everyone who watched the same videos.',
    weekThemes: [
      'Set a daily habit — 45 minutes, same time',
      'Python properly: variables, loops, functions',
      'Lists and dictionaries until they are boring',
      'Decide honestly: using AI tools, or building them?',
      'Averages, medians and spread — by hand',
      'Probability you can reason about, not recite',
      'Read data from a file and summarise it',
      'What a model actually is, minus the mystique',
      'Try a pre-built model and inspect where it fails',
      'Debugging: read the error, do not guess',
      'Explain a technical idea in plain language',
      'Aptitude and reasoning groundwork',
      'Review: is this the work you thought it was?',
    ],
  },
  {
    key: 'ai_ready', stage: 'build',
    label: 'AI-Ready — Build',
    description: 'Following a tutorial is not the same as training a model. This is where you leave notebooks that only work on the data they came with.',
    weekThemes: [
      'Audit your gaps honestly',
      'pandas and NumPy for preparing real data',
      'Features: turning raw columns into inputs',
      'Train your first model and score it honestly',
      'Train and test splits — and why it matters',
      'Make a model overfit on purpose, then fix it',
      'Beyond accuracy: precision, recall, and imbalance',
      'Compare two models and justify the winner',
      'One project on data you chose yourself',
      'Version your work — code and data both',
      'Write up what you built and what it cannot do',
      'Serve a prediction from code, not a notebook',
      'Review: could you rebuild this from scratch?',
    ],
  },
  {
    key: 'ai_ready', stage: 'placement',
    label: 'AI-Ready — Placement',
    description: 'ML interviews open with a coding round and end with someone probing whether you understand your own project. Prepare for both.',
    weekThemes: [
      'DSA revision — ML interviews still start here',
      'Justify every choice in your best project',
      'Where your model fails, and why',
      'Data leakage: audit your projects for it',
      'Explain overfitting to a non-technical person',
      'The maths they ask about: gradients, loss, metrics',
      'Deploy one model behind an API',
      'Portfolio: one deep project beats three shallow',
      'Resume: outcomes and metrics, not library names',
      'Mock interview — coding round',
      'Mock interview — project deep dive',
      'Apply: five tailored applications a week',
      'Review: which question exposed you most?',
    ],
  },
  {
    key: 'ai_ready', stage: 'job_seeker',
    label: 'AI-Ready — Job Seeker',
    description: 'The field is crowded with people who finished the same course. Depth on one real project beats breadth across five tutorials.',
    weekThemes: [
      'Fix the gap in your story — what you have been doing',
      'Pick one project and take it to production quality',
      'DSA drills daily — the first round is still code',
      'Rebuild your resume around results, not tools',
      'Learn one framework the job posts keep naming',
      'Publish a write-up of your project',
      'Widen the search: data roles, not only ML roles',
      'Ask three people for a referral',
      'Mock interview — record and rewatch',
      'Rework your weakest answer',
      'Contribute to one open project',
      'Track every application and follow up',
      'Review: applications out, replies in, what changed?',
    ],
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedStagedPathways2.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const c: any = await PassportContent.findOne({ tenantId });
  if (!c) { console.error('No content for that tenant — open the CareerPilot admin screens once to seed it.'); process.exit(1); }

  let added = 0, updated = 0;
  for (const p of PATHWAYS) {
    const existing = (c.pathways || []).find((x: any) => x.key === p.key && x.stage === p.stage);
    if (existing) { Object.assign(existing, p); updated++; }
    else { c.pathways.push(p as any); added++; }
  }
  c.markModified('pathways');
  await c.save();

  console.log(`Staged pathways — added ${added}, updated ${updated}`);
  console.log(`Now ${c.pathways.length} pathways.\n`);

  // A missing cell means that member falls back to the generic plan — which is exactly
  // the "nothing was personalised" impression this is meant to remove.
  const keys: string[] = [...new Set<string>(c.pathways.map((p: any) => String(p.key)))];
  const stages = ['(generic)', 'foundation', 'build', 'placement', 'job_seeker'];
  console.log('pathway key'.padEnd(18) + stages.map(s => s.padEnd(12)).join(''));
  let gaps = 0;
  for (const k of keys) {
    const row = stages.map(s => {
      const want = s === '(generic)' ? undefined : s;
      const has = c.pathways.some((p: any) => p.key === k && (p.stage || undefined) === want);
      if (!has && want) gaps++;
      return (has ? 'yes' : '--').padEnd(12);
    });
    console.log(k.padEnd(18) + row.join(''));
  }
  console.log(gaps ? `\n${gaps} stage(s) fall back to the generic plan.` : '\nEvery track is staged.');

  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
