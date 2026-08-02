/**
 * Stage-specific 90-day pathways.
 *
 * This is the step that makes staging visible to a paying member. Filtering questions
 * changes a score; filtering missions changes a task list. Neither is obviously worth
 * ₹499. A DIFFERENT PLAN is — a first-year opening their roadmap to "build your first
 * working program" while a final-year sees "get your resume past an ATS" is the moment
 * the product stops looking generic.
 *
 * Two tracks are written here, across all four stages:
 *   software_dev  — CS/IT students, the flagship
 *   it_bridge     — non-CS students moving into IT, the B.Sc / B.Com audience
 *
 * The other tracks (data_analytics, ai_ready) keep their existing untagged pathway and
 * therefore still work — pathwayOf falls back to the generic one. They can be staged
 * later using these as the template.
 *
 * Run: npx ts-node src/scripts/seedStagedPathways.ts <tenantId>
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
  /* ── software_dev ─────────────────────────────────────────────────────── */
  {
    key: 'software_dev', stage: 'foundation',
    label: 'Software Development — Foundation',
    description: 'You have time on your side. Spend it on fundamentals that never expire, and finish something small you can point at.',
    weekThemes: [
      'Set a daily habit — 45 minutes, same time',
      'One language, properly: syntax and control flow',
      'Functions, and why they exist',
      'Arrays and strings until they are boring',
      'Write your first program someone else could use',
      'Debugging: read the error, do not guess',
      'Loops and conditions under time pressure',
      'Basic problem-solving patterns',
      'Version control — commit like it matters',
      'Build a tiny project end to end',
      'Explain your code out loud to someone',
      'Aptitude and reasoning groundwork',
      'Review: what did you actually retain?',
    ],
  },
  {
    key: 'software_dev', stage: 'build',
    label: 'Software Development — Build',
    description: 'Fundamentals are behind you. This is the year you produce proof: real projects, real depth, a profile that shows work.',
    weekThemes: [
      'Audit your gaps honestly',
      'Data structures that appear in interviews',
      'Object-oriented design in practice',
      'Databases and querying with intent',
      'Build a project with a real user in mind',
      'APIs — consume one, then write one',
      'Testing: prove it works, do not hope',
      'Ship the project publicly',
      'Read someone else\'s codebase',
      'A second project, harder than the first',
      'Write about what you built',
      'Start a GitHub profile worth reading',
      'Consolidate: two projects, explained well',
    ],
  },
  {
    key: 'software_dev', stage: 'placement',
    label: 'Software Development — Placement',
    description: 'Placement season is the deadline. Every week here converts what you already know into offers.',
    weekThemes: [
      'Resume: one page, past an ATS',
      'Rehearse your projects until they are crisp',
      'Core CS revision — the asked topics only',
      'Problem solving under a timer',
      'Mock interview one: find out where you break',
      'Fix what the mock exposed',
      'System design basics for freshers',
      'HR and behavioural rounds',
      'Mock interview two: measure the delta',
      'Apply — volume, tracked, with follow-ups',
      'Referrals and warm introductions',
      'Offer conversations and negotiation',
      'Keep applying while you wait',
    ],
  },
  {
    key: 'software_dev', stage: 'job_seeker',
    label: 'Software Development — Job Seeker',
    description: 'You have graduated and the clock is loud. This plan prioritises applications and visible proof over new learning.',
    weekThemes: [
      'Reposition the resume for the gap',
      'One flagship project, finished and deployed',
      'Daily applications, tracked properly',
      'Interview readiness — technical',
      'Interview readiness — the gap question',
      'Mock interview and honest feedback',
      'Widen the search: roles adjacent to your target',
      'Referrals — ask specifically, not broadly',
      'Second flagship project or a real contribution',
      'Contract, freelance and internship routes',
      'Review what is not working and change it',
      'Interview loop practice at volume',
      'Sustain the pipeline — this is the job for now',
    ],
  },

  /* ── it_bridge ────────────────────────────────────────────────────────── */
  {
    key: 'it_bridge', stage: 'foundation',
    label: 'IT Career Bridge — Foundation',
    description: 'Your degree is not computer science and that is fine. Start early and the gap closes long before it matters.',
    weekThemes: [
      'Why IT, and which part of it',
      'Computers, files and the command line',
      'Your first language, from zero',
      'Logic before syntax',
      'Small programs, every single day',
      'Spreadsheets to code — a bridge you already have',
      'Web basics: what actually happens',
      'A first page you built yourself',
      'Version control from the start',
      'Join a community and ask questions',
      'Study English for technical communication',
      'Aptitude and reasoning',
      'Review: you can now write working code',
    ],
  },
  {
    key: 'it_bridge', stage: 'build',
    label: 'IT Career Bridge — Build',
    description: 'You can code a little. This year turns that into a portfolio that competes with CS graduates.',
    weekThemes: [
      'Pick one track and stop switching',
      'Depth in your chosen language',
      'Databases — the skill that pays fastest',
      'Build something that solves your own problem',
      'Learn to read documentation',
      'A project using real data',
      'Deploy it where people can see it',
      'Fill the CS gaps that get asked about',
      'Explain your non-CS background as a strength',
      'A second, more ambitious project',
      'GitHub and LinkedIn that look serious',
      'Speak about your work without apologising',
      'Consolidate: proof that outweighs the degree',
    ],
  },
  {
    key: 'it_bridge', stage: 'placement',
    label: 'IT Career Bridge — Placement',
    description: 'Final year, non-CS background. This plan is built around the two questions you will be asked repeatedly.',
    weekThemes: [
      'Resume that leads with proof, not degree',
      'Answer "why not your own field?" convincingly',
      'Core technical revision — targeted',
      'Practise problem solving daily',
      'Mock interview one: including the background question',
      'Close the gaps it exposed',
      'Projects rehearsed to three minutes each',
      'HR rounds and confidence',
      'Mock interview two',
      'Apply to roles that hire across degrees',
      'Referrals from anyone already inside',
      'Offers, negotiation, and knowing your floor',
      'Sustain applications through the season',
    ],
  },
  {
    key: 'it_bridge', stage: 'job_seeker',
    label: 'IT Career Bridge — Job Seeker',
    description: 'Graduated, from a different field, and switching now. Proof beats credentials — this plan builds proof fast.',
    weekThemes: [
      'Decide the target role precisely',
      'Resume rebuilt around transferable work',
      'One deployed project that proves capability',
      'Daily applications with a tracker',
      'Technical interview preparation',
      'Rehearse the switch story until it is natural',
      'Mock interview and blunt feedback',
      'Certifications only where they are actually asked for',
      'Second project or open-source contribution',
      'Referrals, meetups, and being visible',
      'Consider adjacent roles as an entry point',
      'Review and change what is not converting',
      'Keep the pipeline full — consistency wins this',
    ],
  },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedStagedPathways.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const doc: any = await PassportContent.findOne({ tenantId });
  if (!doc) { console.error('No CareerPilot content for that tenant — open the admin screen once to seed it.'); process.exit(1); }

  const list: any[] = doc.pathways || [];
  let added = 0, updated = 0;

  for (const p of PATHWAYS) {
    const i = list.findIndex((x: any) => x.key === p.key && x.stage === p.stage);
    if (i >= 0) { list[i] = { ...list[i], ...p }; updated++; }
    else { list.push(p); added++; }
  }

  doc.pathways = list;
  doc.markModified('pathways');
  await doc.save();

  // The generic pathways must survive — they are the fallback for every track and
  // stage not written here, and for members whose graduation date is unknown.
  const generic = list.filter((x: any) => !x.stage).map((x: any) => x.key);
  console.log(`Staged pathways — added ${added}, updated ${updated}`);
  console.log(`Generic fallbacks intact: ${generic.join(', ') || '(none!)'}`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
