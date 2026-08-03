/**
 * Goal-specific CareerPilot assessment questions.
 *
 * Stage answers "how close is this student to the market". Goal answers "close to WHICH
 * market" — and the two are independent. A final-year student heading for data work and
 * a final-year student heading for development are both in 'placement', but asking the
 * analyst about time complexity and the developer about SQL grouping tells us nothing
 * useful about either.
 *
 * Every question here is tagged with BOTH axes, so it reaches only students at that
 * stage pursuing that goal. Members who answered "Not sure yet" are deliberately left
 * out of goal filtering — narrowing someone who has not chosen is the thing we are
 * trying to avoid — so they sit the untagged general paper.
 *
 * Two kinds of question, mixed on purpose:
 *
 *   - Knowledge checks (`correctIndex >= 0`). These catch the gap between what a student
 *     believes about themselves and what they can do. "AI-Ready" is a popular answer on
 *     a signup form; whether the student knows what overfitting is, is a different fact.
 *   - Readiness self-reports (`selfReport: true`, `correctIndex: -1`). For things with no
 *     right answer — is your dashboard shareable, can you explain your own code. Options
 *     run low readiness → high, and that ORDER is what carries the score.
 *
 * Knowledge checks are pitched at the stage, not at the goal's ceiling: the foundation
 * questions are answerable by someone who has been taught the concept once, because
 * their job is to locate a beginner, not to fail them.
 *
 * Run: npx ts-node src/scripts/seedGoalQuestions.ts <tenantId>
 * Idempotent on (tenantId, question text). Safe to re-run after editing any question.
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
  goals: string[];
}

// Must match the careerGoal options in PassportConfig exactly — a typo here produces a
// question that silently reaches nobody, which nothing else in the system would report.
const SD = ['Software Development'];
const DA = ['Data Analytics'];
const AI = ['AI-Ready'];

const FOUNDATION = ['foundation'];
const BUILD = ['build'];
// Placement content also serves job seekers: a graduate who has not landed a role yet
// faces the same interviews as a final-year student, so duplicating these per stage
// would mean maintaining two copies that drift apart.
const SEEKING = ['placement', 'job_seeker'];

export const QUESTIONS: Q[] = [
  /* ══ Software Development ═══════════════════════════════════════════════════ */

  /* Foundation — habits of thought, before any syntax is worth testing */
  {
    category: 'technical', stages: FOUNDATION, goals: SD, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'When you hit a programming error you do not understand, what do you usually do?',
    options: [
      'Give up, or ask someone to fix it for me',
      'Search the exact error message and try what comes up',
      'Read the error and trace it back to my own code',
      'Trace it, fix it, and work out which assumption of mine was wrong',
    ],
  },
  {
    // Debugging is the skill that separates students who progress from students who
    // stall, and it is testable long before they know a language properly.
    category: 'logical_reasoning', stages: FOUNDATION, goals: SD, correctIndex: 1, weight: 1.2,
    text: 'A loop you expect to run 10 times runs 11 instead. Where do you look first?',
    options: [
      'The names of the variables',
      'The start and end values of the loop counter',
      'The lines printed inside the loop',
      'The name of the function',
    ],
  },
  {
    category: 'logical_reasoning', stages: FOUNDATION, goals: SD, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Before writing code, how comfortable are you breaking the task into small steps on paper?',
    options: ['I start typing straight away', 'I think about it briefly', 'I list the main steps', 'I plan the steps and the edge cases'],
  },

  /* Build — producing something that survives contact with a second person */
  {
    category: 'technical', stages: BUILD, goals: SD, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'How do you keep track of changes to your code?',
    options: [
      'Copies of folders named final, final2',
      'One file I keep overwriting',
      'Git on my own machine',
      'Git with branches, and commits I could explain to someone',
    ],
  },
  {
    category: 'technical', stages: BUILD, goals: SD, correctIndex: 2, weight: 1.4,
    text: 'You need to check whether a username already exists among 100,000 users. Which approach is fastest?',
    options: [
      'Loop through a list and compare each one',
      'Sort the list first, then loop through it',
      'Look it up in a hash set or dictionary',
      'It makes no difference at this size',
    ],
  },
  {
    category: 'technical', stages: BUILD, goals: SD, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Have you built something that stores data and still has it after a restart?',
    options: ['Not yet', 'Data only lives while the program runs', 'Saved to a file', 'Stored in a real database'],
  },

  /* Placement & job seeking — the interview itself */
  {
    category: 'technical', stages: SEEKING, goals: SD, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Can you state the time complexity of code you have written, and justify it?',
    options: ['I have not learned complexity', 'I know the term only', 'I can for standard problems', 'I can for my own code, and improve it'],
  },
  {
    category: 'technical', stages: SEEKING, goals: SD, correctIndex: 1, weight: 1.4,
    text: 'An API is slow because it runs a database query inside a loop. What is the usual fix?',
    options: [
      'Add more servers',
      'Fetch all the rows in one query before the loop',
      'Increase the request timeout',
      'Cache the page in the browser',
    ],
  },
  {
    category: 'employability', stages: SEEKING, goals: SD, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Could you walk an interviewer through your project file by file, without notes?',
    options: ['No', 'Only the parts I wrote recently', 'Most of it', 'All of it, including why it is structured that way'],
  },

  /* ══ Data Analytics ═════════════════════════════════════════════════════════ */

  /* Foundation — numeracy and scepticism, which matter more here than tooling */
  {
    category: 'technical', stages: FOUNDATION, goals: DA, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How comfortable are you in a spreadsheet — formulas, sorting, filtering?',
    options: ['I have barely used one', 'I can enter and read data', 'I use formulas and filters', 'I build working sheets others use'],
  },
  {
    category: 'aptitude', stages: FOUNDATION, goals: DA, correctIndex: 2, weight: 1.3,
    text: 'A shop sold 40 units in January and 50 in February. What is the percentage increase?',
    options: ['10%', '20%', '25%', '40%'],
  },
  {
    category: 'career_clarity', stages: FOUNDATION, goals: DA, selfReport: true, correctIndex: -1, weight: 1,
    text: 'When you see a statistic quoted in the news, do you wonder how it was measured?',
    options: ['I take it as given', 'Sometimes', 'Usually', 'Always — and I look for what is missing'],
  },

  /* Build — the actual tools of the job */
  {
    category: 'technical', stages: BUILD, goals: DA, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'How comfortable are you writing SQL to answer a question from data?',
    options: ['I have not written SQL', 'Simple SELECTs', 'Joins and grouping', 'Nested queries against unfamiliar schemas'],
  },
  {
    category: 'technical', stages: BUILD, goals: DA, correctIndex: 1, weight: 1.3,
    text: 'Which SQL clause filters rows AFTER they have been grouped?',
    options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
  },
  {
    // The gap between coursework and the job: real data arrives broken, and students who
    // have only used clean teaching datasets do not know that yet.
    category: 'technical', stages: BUILD, goals: DA, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Have you cleaned a messy real dataset — missing values, duplicates, wrong types?',
    options: ['Only tidy datasets given to me', 'I have seen messy data but not fixed it', 'Once or twice', 'Regularly, and I document what I changed'],
  },

  /* Placement & job seeking — reading data, and being understood */
  {
    category: 'aptitude', stages: SEEKING, goals: DA, correctIndex: 1, weight: 1.4,
    text: 'A company’s average salary is far higher than its median salary. What does that suggest?',
    options: [
      'Almost everyone earns the same',
      'A few very high salaries are pulling the average up',
      'The data must be wrong',
      'The median is always the lower of the two',
    ],
  },
  {
    category: 'employability', stages: SEEKING, goals: DA, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Do you have an analysis or dashboard someone else could open and understand?',
    options: ['Nothing to show', 'Notebooks only I can follow', 'One tidy analysis', 'A shareable dashboard with the question it answers'],
  },
  {
    category: 'communication', stages: SEEKING, goals: DA, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Can you state what a chart means in one sentence a manager could act on?',
    options: ['I describe what the chart shows', 'I describe the trend', 'I state the implication', 'I state the implication and recommend the action'],
  },

  /* ══ AI-Ready ═══════════════════════════════════════════════════════════════ */

  /* Foundation — the prerequisites, plus the question that separates hype from intent */
  {
    category: 'technical', stages: FOUNDATION, goals: AI, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How comfortable are you with Python — variables, loops, functions?',
    options: ['I have not written Python', 'I can follow code others wrote', 'I can write small programs', 'I write and debug my own comfortably'],
  },
  {
    category: 'aptitude', stages: FOUNDATION, goals: AI, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How comfortable are you with school-level statistics — averages, percentages, probability?',
    options: ['Not at all', 'I remember some of it', 'Comfortable with the basics', 'Comfortable, and I use it'],
  },
  {
    // "AI-Ready" is the most-chosen goal on signup forms and the least examined. A
    // student who wants to USE AI tools needs a different plan from one who wants to
    // BUILD models, and most first-years have not separated the two yet.
    category: 'career_clarity', stages: FOUNDATION, goals: AI, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Do you know the difference between using AI tools and building AI systems?',
    options: ['Not really', 'Roughly', 'Yes, clearly', 'Yes, and I know which of the two I want to do'],
  },

  /* Build — past the tutorials */
  {
    category: 'technical', stages: BUILD, goals: AI, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Have you trained a model on data yourself, rather than only calling someone’s API?',
    options: ['Only used APIs or chat tools', 'Followed a tutorial end to end', 'Trained one on my own data', 'Trained several and tuned them'],
  },
  {
    category: 'technical', stages: BUILD, goals: AI, correctIndex: 1, weight: 1.4,
    text: 'A model scores 99% on its training data but 60% on new data. What is happening?',
    options: ['Underfitting', 'Overfitting', 'The learning rate is zero', 'The model is ready to ship'],
  },
  {
    category: 'technical', stages: BUILD, goals: AI, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How comfortable are you preparing data with pandas or NumPy?',
    options: ['Not used them', 'Can load a file', 'Can filter, group and reshape', 'Comfortable across messy real data'],
  },

  /* Placement & job seeking — depth, and honesty about limits */
  {
    category: 'technical', stages: SEEKING, goals: AI, correctIndex: 1, weight: 1.4,
    text: 'Why is data split into training and test sets?',
    options: [
      'To make training run faster',
      'To measure performance on data the model has not seen',
      'To reduce the size of the files',
      'Because the libraries require two files',
    ],
  },
  {
    category: 'employability', stages: SEEKING, goals: AI, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Do you have an AI or ML project where you can justify every design choice you made?',
    options: ['No project yet', 'A tutorial project I followed', 'My own project, some choices copied', 'My own project, every choice deliberate'],
  },
  {
    // Interviewers probe failure modes, and a candidate who claims none is a candidate
    // who has not deployed anything.
    category: 'communication', stages: SEEKING, goals: AI, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Can you explain to a non-technical person what your model does AND where it fails?',
    options: ['Neither', 'What it does, roughly', 'What it does, clearly', 'What it does, and honestly where it breaks'],
  },
];

/**
 * Four questions in the original starter bank presume something a first-year has not had
 * the chance to do yet — a resume, projects to show, a mock interview attended. Untagged,
 * they reach everyone, which is how a first-year ends up being asked whether their resume
 * is recruiter-ready and scoring zero on it.
 *
 * Each also has a sharper counterpart among the staged questions, so the stage assigned
 * here is deliberately the band its counterpart does NOT cover. That keeps both questions
 * useful instead of putting two phrasings of the same thing on one paper.
 *
 * Matched on exact text, so an admin who has reworded one of these keeps their wording
 * and their tagging, and this quietly does nothing.
 */
const RETAG: { text: string; stages: string[] }[] = [
  { text: 'Do you have a resume ready?',                        stages: ['build'] },                    // placement has 'ready to send today'
  { text: 'Have you attempted a mock interview?',               stages: ['build'] },                    // placement has 'how many have you sat'
  { text: 'Can you explain a project you built in simple English?', stages: ['build'] },                // placement has the 3-minute version
  { text: 'How many projects can you show (GitHub/demo)?',      stages: ['placement', 'job_seeker'] },  // build has 'is your code visible anywhere'
  { text: 'Do you know what skills your target role needs?',    stages: ['foundation'] },               // later stages get the job-posts version
];

/**
 * Questions to remove outright.
 *
 * Editing a seed script does not edit a bank that has already been seeded from it, so a
 * question dropped from the source stays in the database forever unless something takes
 * it out. This one restated a starter question almost word for word, and both were
 * landing on the same paper.
 *
 * Matched on exact text and reported when not found, because silently deleting by a
 * loose match is how an admin's own question disappears.
 */
const PRUNE: string[] = [
  'How settled are you on the kind of work you want after graduating?',   // dup of 'How clear are you about the career role you want?'
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedGoalQuestions.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant — open the admin screen once to seed it.'); process.exit(1); }

  let retagged = 0;
  for (const r of RETAG) {
    const q = a.questions.find((x: any) => x.text === r.text);
    if (q && !(q.stages?.length)) { q.stages = r.stages; retagged++; }
  }

  let pruned = 0;
  for (const text of PRUNE) {
    const before = a.questions.length;
    a.questions = a.questions.filter((q: any) => q.text !== text);
    if (a.questions.length < before) pruned++;
  }

  let added = 0, updated = 0;
  for (const q of QUESTIONS) {
    const existing = a.questions.find((x: any) => x.text === q.text);
    if (existing) { Object.assign(existing, q); updated++; }
    else { a.questions.push(q as any); added++; }
  }
  a.markModified('questions');
  await a.save();

  console.log(`Goal questions — added ${added}, updated ${updated}; retagged ${retagged}, pruned ${pruned}`);
  console.log(`Bank now ${a.questions.length} questions; each student is served ${a.maxQuestions || 14}.\n`);

  // What a real student actually sits, per goal and stage. A count of what is in the
  // bank is not the useful number — the useful number is how much of any one student's
  // paper is aimed at them, and whether any segment is left with nothing.
  const goals = ['Software Development', 'Data Analytics', 'AI-Ready', 'Not sure yet'];
  const stages = ['foundation', 'build', 'placement', 'job_seeker'];
  const untagged = a.questions.filter((q: any) => !q.stages?.length && !q.goals?.length).length;

  console.log(`${'goal'.padEnd(22)}${stages.map(s => s.padEnd(12)).join('')}`);
  for (const g of goals) {
    const row = stages.map(st => {
      const n = a.questions.filter((q: any) => {
        if (q.stages?.length && !q.stages.includes(st)) return false;
        if (q.goals?.length && !/not sure/i.test(g) && !q.goals.includes(g)) return false;
        if (q.goals?.length && /not sure/i.test(g)) return false;   // undecided skip goal-tagged
        return true;
      }).length;
      return String(n).padEnd(12);
    });
    console.log(`${g.padEnd(22)}${row.join('')}`);
  }
  console.log(`\n(${untagged} questions are untagged and reach every student.)`);

  await mongoose.disconnect();
}

// Only when invoked directly. Without this guard, importing QUESTIONS for a test or a
// coverage check would connect to the database and start writing to it.
if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
