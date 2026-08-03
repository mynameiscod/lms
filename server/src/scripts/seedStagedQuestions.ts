/**
 * Stage-specific CareerPilot assessment questions.
 *
 * Your existing 18 questions stay untagged and continue to reach everyone — they ask
 * about clarity, aptitude and reasoning, which apply at any stage. These are the ones
 * that do NOT: asking a first-year how many companies they have applied to scores them
 * zero on something that does not exist yet, and that score then drives a roadmap
 * targeting gaps they do not have.
 *
 * Most are self-report (`selfReport: true`, `correctIndex: -1`), because a question like
 * "is your resume ready?" has no right answer — it measures readiness, and the option
 * INDEX carries the score. Options are therefore ordered low readiness → high, and that
 * order is load-bearing rather than cosmetic.
 *
 * Run: npx ts-node src/scripts/seedStagedQuestions.ts <tenantId>
 * Idempotent on (tenantId, question text). Existing untagged questions are untouched.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

interface Q {
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
  weight: number;
  selfReport?: boolean;
  stages: string[];
  background?: string;
}

const FOUNDATION = ['foundation'];
const BUILD = ['build'];
const PLACEMENT = ['placement'];
const SEEKING = ['placement', 'job_seeker'];
const LATER = ['build', 'placement', 'job_seeker'];

const QUESTIONS: Q[] = [
  /* ── Foundation: habits and starting points, not achievements ──────────── */
  // NOTE: no "how clear are you about your career direction" question here — the base
  // bank already asks that of everyone, and two phrasings of the same question in one
  // paper reads as carelessness and scores the same trait twice.
  {
    category: 'employability', stages: FOUNDATION, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Do you have a regular study routine outside your college timetable?',
    options: ['Not yet', 'Occasionally, before exams', 'A few days a week', 'Most days'],
  },
  {
    category: 'technical', stages: FOUNDATION, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Have you written a program on your own, outside class assignments?',
    options: ['Not yet', 'Copied and modified one', 'A small program from scratch', 'Several, regularly'],
  },
  {
    category: 'communication', stages: FOUNDATION, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How comfortable are you explaining an idea to a group in English?',
    options: ['Very uncomfortable', 'Nervous but manage', 'Reasonably comfortable', 'Confident'],
  },

  /* ── Build: producing proof ────────────────────────────────────────────── */
  {
    category: 'technical', stages: BUILD, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'How many projects have you built that someone other than you could use?',
    options: ['None yet', 'One, still unfinished', 'One finished', 'Two or more'],
  },
  {
    category: 'technical', stages: BUILD, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Is your code visible anywhere — GitHub, a deployed link, a portfolio?',
    options: ['Nowhere', 'On my machine only', 'On GitHub', 'Deployed and shareable'],
  },
  {
    category: 'employability', stages: BUILD, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you chosen one primary track and stayed with it for a few months?',
    options: ['Still switching', 'Chosen recently', 'Steady a few months', 'Steady over a year'],
  },
  {
    category: 'career_clarity', stages: LATER, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Do you know the specific skills listed in job posts for your target role?',
    options: ['Never looked', 'Skimmed a few', 'Know most of them', 'Tracking them deliberately'],
  },

  /* ── Placement: the season itself ──────────────────────────────────────── */
  {
    category: 'employability', stages: PLACEMENT, selfReport: true, correctIndex: -1, weight: 1.5,
    text: 'Is your resume ready to send to a recruiter today?',
    options: ['Not written', 'Rough draft', 'Written, not reviewed', 'Reviewed and ready'],
  },
  {
    category: 'employability', stages: SEEKING, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'How many companies have you applied to in the last month?',
    options: ['None', '1–5', '6–20', 'More than 20'],
  },
  {
    category: 'communication', stages: SEEKING, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Can you explain your best project clearly in about three minutes?',
    options: ['Not attempted', 'Struggle to structure it', 'Can, with notes', 'Can, confidently'],
  },
  {
    category: 'employability', stages: SEEKING, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'How many interviews or mock interviews have you actually sat?',
    options: ['None', 'One', 'Two to four', 'Five or more'],
  },
  {
    category: 'technical', stages: SEEKING, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'How do you handle a coding problem you have not seen before, under time pressure?',
    options: ['Freeze', 'Need hints', 'Work through most', 'Usually solve it'],
  },
  {
    category: 'employability', stages: PLACEMENT, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Do you have anyone who could refer you into a company?',
    options: ['Nobody', 'Someone, not asked', 'Asked once', 'Active referrals'],
  },

  /* ── Job seeker: graduated, in the market ──────────────────────────────── */
  {
    category: 'employability', stages: ['job_seeker'], selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'How long is it since you graduated?',
    options: ['Under 3 months', '3–6 months', '6–12 months', 'Over a year'],
  },
  {
    category: 'career_clarity', stages: ['job_seeker'], selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Are you prepared to answer what you have been doing since graduating?',
    options: ['Dreading it', 'Have an excuse', 'Have an honest answer', 'Have work to show for it'],
  },

  /* ── Non-CS: the question that decides those interviews ────────────────── */
  {
    category: 'career_clarity', stages: LATER, background: 'non_cs', selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Can you explain convincingly why you are moving into IT from your own field?',
    options: ['No answer ready', 'A vague one', 'A reasonable answer', 'A confident, specific answer'],
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedStagedQuestions.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant — open the admin screen once to seed it.'); process.exit(1); }

  let added = 0, updated = 0;
  for (const q of QUESTIONS) {
    const existing = a.questions.find((x: any) => x.text === q.text);
    if (existing) {
      Object.assign(existing, q);
      updated++;
    } else {
      a.questions.push(q as any);
      added++;
    }
  }
  a.markModified('questions');
  await a.save();

  const untagged = a.questions.filter((q: any) => !q.stages || !q.stages.length).length;
  const byStage: Record<string, number> = { foundation: 0, build: 0, placement: 0, job_seeker: 0 };
  for (const q of a.questions) {
    const tags = q.stages && q.stages.length ? q.stages : Object.keys(byStage);
    for (const t of tags) if (t in byStage) byStage[t]++;
  }

  console.log(`Staged questions — added ${added}, updated ${updated}`);
  console.log(`Bank now ${a.questions.length} questions (${untagged} untagged, reaching every stage)`);
  console.log('Per-stage paper size:');
  for (const [k, v] of Object.entries(byStage)) console.log(`   ${k.padEnd(12)} ${v}`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
