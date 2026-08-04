/**
 * Bank depth — batch 1: goal-neutral categories at FOUNDATION and BUILD.
 *
 * The Paper Designer can draw randomly, but a slot taking 2 questions from a pool of 2
 * hands every student the same two. Foundation had 2 communication questions and 1
 * employability question, so those slots were fixed for everyone regardless of what the
 * draw did. This is the content that makes randomisation mean something.
 *
 * Goal-neutral on purpose. Aptitude, reasoning, clarity, communication and most
 * employability work is the same whether a student is heading for development, data or
 * AI — so these are tagged by STAGE ONLY and serve all three interests at that stage.
 * One question written here appears in three segments' pools.
 *
 * Difficulty is pitched at the stage, not at the category: the foundation aptitude
 * questions are the ones a first-year meets in a campus test, and the build ones are the
 * ones that start appearing in real placement papers.
 *
 * Self-report items (`selfReport: true`, `correctIndex: -1`) have options ordered low
 * readiness → high, and that ORDER carries the score — it is load-bearing, not cosmetic.
 *
 * Run: npx ts-node src/scripts/seedBankFoundation.ts <tenantId>
 * Idempotent on question text.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

interface Q {
  category: string; text: string; options: string[];
  correctIndex: number; weight: number; selfReport?: boolean; stages: string[];
}

const F = ['foundation'];
const B = ['build'];
const FB = ['foundation', 'build'];

export const QUESTIONS: Q[] = [

  /* ══ CAREER CLARITY — foundation ═══════════════════════════════════════════ */
  { category: 'career_clarity', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you looked at what people with your degree actually do at work?',
    options: ['Never looked', 'Heard from seniors', 'Read a few job descriptions', 'Spoken to someone doing it'] },
  { category: 'career_clarity', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Do you know which subjects in your course matter most for the work you want?',
    options: ['No idea', 'A rough guess', 'I know two or three', 'I know, and I treat them differently'] },
  { category: 'career_clarity', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'When you picture yourself three years from now, how clear is the picture?',
    options: ['Blank', 'A vague feeling', 'A field, not a role', 'A specific kind of work'] },
  { category: 'career_clarity', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Who decided what you would study?',
    options: ['Family, and I went along', 'Marks decided it', 'I chose from a shortlist', 'I chose it deliberately'] },
  { category: 'career_clarity', stages: F, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Do you know anyone doing the job you think you want?',
    options: ['Nobody', 'Know of someone', 'Have spoken once', 'Stay in touch with them'] },
  { category: 'career_clarity', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How do you decide what to learn next?',
    options: ['Whatever is in the syllabus', 'Whatever friends are doing', 'What looks useful', 'Against a plan I wrote'] },

  /* ══ CAREER CLARITY — build ════════════════════════════════════════════════ */
  { category: 'career_clarity', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Can you name three companies you would genuinely want to work at, and why?',
    options: ['None come to mind', 'Names but no reasons', 'Three with rough reasons', 'Three, with specific reasons'] },
  { category: 'career_clarity', stages: B, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Have you compared what you can do against what your target role asks for?',
    options: ['Never', 'Thought about it', 'Listed the gaps', 'Listed them and started closing them'] },
  { category: 'career_clarity', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'If someone asked what you specialise in, what would you say?',
    options: ['Nothing yet', 'A broad field', 'A stack or area', 'An area, with proof to point at'] },
  { category: 'career_clarity', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How often do you read about your field outside coursework?',
    options: ['Never', 'Occasionally', 'Weekly', 'Most days'] },
  { category: 'career_clarity', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Have you ruled anything OUT — decided a path is not for you?',
    options: ['Still open to everything', 'Leaning away from some', 'Ruled one out', 'Ruled several out, for reasons'] },
  { category: 'career_clarity', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Do you know what a typical first-year salary looks like in your target role?',
    options: ['No idea', 'Heard numbers', 'Roughly', 'Researched it for my city and role'] },

  /* ══ COMMUNICATION — foundation ════════════════════════════════════════════ */
  { category: 'communication', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How comfortable are you asking a question in front of a full class?',
    options: ['Never do it', 'Only if desperate', 'Sometimes', 'Whenever I need to'] },
  { category: 'communication', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'When you do not understand something, what do you do?',
    options: ['Stay quiet', 'Ask a friend later', 'Ask afterwards', 'Ask at the time'] },
  { category: 'communication', stages: F, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'How comfortable are you writing a few paragraphs in English?',
    options: ['Very uncomfortable', 'Slow and unsure', 'Manage fine', 'Comfortable and quick'] },
  { category: 'communication', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you presented anything to a group — a seminar, a class, a club?',
    options: ['Never', 'Once, badly', 'Once or twice, fine', 'Several times'] },
  { category: 'communication', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How well do you listen when someone explains something you disagree with?',
    options: ['I stop listening', 'I wait to reply', 'I hear them out', 'I hear them out and ask questions'] },
  { category: 'communication', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How comfortable are you speaking to someone senior — a teacher, a stranger at an event?',
    options: ['Avoid it', 'Very nervous', 'Manage', 'Comfortable'] },

  /* ══ COMMUNICATION — build ═════════════════════════════════════════════════ */
  { category: 'communication', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Can you explain something technical to someone from another branch?',
    options: ['They would not follow', 'With difficulty', 'Mostly', 'Clearly, without jargon'] },
  { category: 'communication', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'When you ask for help online or from a senior, how do you frame it?',
    options: ['"It is not working"', 'Describe the symptom', 'Symptom plus what I tried', 'What I expected, what happened, what I tried'] },
  { category: 'communication', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you written anything others read — notes, a blog, documentation?',
    options: ['Nothing', 'Notes for myself', 'Shared with classmates', 'Published publicly'] },
  { category: 'communication', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'In a group project, how do you handle disagreement about an approach?',
    options: ['Give in', 'Argue for mine', 'Look for a middle path', 'Ask what problem each solves'] },
  { category: 'communication', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'How comfortable are you saying "I do not know" in a technical discussion?',
    options: ['I bluff', 'Change the subject', 'Admit it', 'Admit it and say how I would find out'] },
  { category: 'communication', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Could you run a 10-minute session teaching a junior something you know?',
    options: ['No', 'With a lot of prep', 'With some prep', 'Comfortably'] },

  /* ══ EMPLOYABILITY — foundation (habits, not achievements) ═════════════════ */
  { category: 'employability', stages: F, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'When something you are learning gets hard, what usually happens?',
    options: ['I move to something else', 'I pause and come back rarely', 'I push through slowly', 'I break it down and keep going'] },
  { category: 'employability', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How do you keep track of what you have learned?',
    options: ['I do not', 'In my head', 'Scattered notes', 'Organised notes I revisit'] },
  { category: 'employability', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How often do you finish what you start?',
    options: ['Rarely', 'About half the time', 'Usually', 'Almost always'] },
  { category: 'employability', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Do you have a working laptop and internet you can rely on?',
    options: ['Neither', 'Shared or unreliable', 'Yes, mostly', 'Yes, always'] },
  { category: 'employability', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you joined anything outside class — a club, a community, an online group?',
    options: ['Nothing', 'Joined but inactive', 'Occasionally active', 'Regularly involved'] },
  { category: 'employability', stages: F, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How is your attendance and coursework going?',
    options: ['Falling behind', 'Scraping by', 'Steady', 'Comfortably ahead'] },

  /* ══ EMPLOYABILITY — build ═════════════════════════════════════════════════ */
  { category: 'employability', stages: B, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Have you worked with anyone else on something technical?',
    options: ['Always alone', 'Group project, split up', 'Group project, worked together', 'Real collaboration on shared code'] },
  { category: 'employability', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Have you applied for an internship, even unsuccessfully?',
    options: ['Not yet', 'Thought about it', 'Applied to a few', 'Applied seriously and followed up'] },
  { category: 'employability', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How do you spend a free weekend during term?',
    options: ['Rest only', 'Catch up on coursework', 'Some self-learning', 'Working on something of my own'] },
  { category: 'employability', stages: B, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Do you have a way of proving what you can do, other than marks?',
    options: ['Only marks', 'Some coursework', 'A project or two', 'A body of work I can show'] },
  { category: 'employability', stages: B, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you taught, mentored or helped a junior with something?',
    options: ['Never', 'Once informally', 'A few times', 'Regularly'] },

  /* ══ APTITUDE — foundation and build (campus-test level) ═══════════════════ */
  { category: 'aptitude', stages: FB, correctIndex: 1, weight: 1,
    text: 'A shirt marked ₹800 is sold at a 15% discount. What is the selling price?',
    options: ['₹660', '₹680', '₹700', '₹720'] },
  { category: 'aptitude', stages: FB, correctIndex: 2, weight: 1,
    text: 'The average of 5 numbers is 20. If one number is removed the average becomes 18. What was removed?',
    options: ['24', '26', '28', '30'] },
  { category: 'aptitude', stages: FB, correctIndex: 1, weight: 1,
    text: 'A can finish a job in 12 days, B in 6 days. Working together, how long?',
    options: ['3 days', '4 days', '5 days', '9 days'] },
  { category: 'aptitude', stages: FB, correctIndex: 2, weight: 1,
    text: 'A sum doubles in 8 years at simple interest. What is the annual rate?',
    options: ['8%', '10%', '12.5%', '15%'] },
  { category: 'aptitude', stages: FB, correctIndex: 1, weight: 1,
    text: 'The ratio of boys to girls is 3:2. If there are 40 students, how many girls?',
    options: ['14', '16', '18', '24'] },
  { category: 'aptitude', stages: FB, correctIndex: 2, weight: 1,
    text: 'A train 150 m long crosses a pole in 10 seconds. Its speed is?',
    options: ['36 km/h', '45 km/h', '54 km/h', '60 km/h'] },
  { category: 'aptitude', stages: FB, correctIndex: 0, weight: 1,
    text: 'What is 35% of 240?',
    options: ['84', '86', '92', '96'] },
  { category: 'aptitude', stages: FB, correctIndex: 2, weight: 1,
    text: 'A shopkeeper buys at ₹250 and sells at ₹300. What is the profit percentage?',
    options: ['15%', '18%', '20%', '25%'] },
  { category: 'aptitude', stages: FB, correctIndex: 1, weight: 1,
    text: 'If 3 workers build a wall in 12 hours, how long would 4 workers take at the same rate?',
    options: ['8 hours', '9 hours', '10 hours', '16 hours'] },
  { category: 'aptitude', stages: FB, correctIndex: 2, weight: 1,
    text: 'A number increased by 20% gives 96. What was the number?',
    options: ['72', '76', '80', '84'] },

  /* ══ LOGICAL REASONING — foundation and build ═════════════════════════════ */
  { category: 'logical_reasoning', stages: FB, correctIndex: 2, weight: 1,
    text: 'Complete the series: 3, 7, 15, 31, ?',
    options: ['47', '55', '63', '65'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 1, weight: 1,
    text: 'If CAT is coded as DBU, how is DOG coded?',
    options: ['EPG', 'EPH', 'EOH', 'FPH'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 2, weight: 1,
    text: 'Pointing to a man, a woman said "his mother is the only daughter of my mother". How is she related to him?',
    options: ['Sister', 'Aunt', 'Mother', 'Grandmother'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 1, weight: 1,
    text: 'A man walks 3 km north, turns right and walks 4 km. How far is he from the start?',
    options: ['3 km', '5 km', '7 km', '1 km'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 2, weight: 1,
    text: 'All roses are flowers. Some flowers fade quickly. Which must be true?',
    options: ['All roses fade quickly', 'No rose fades quickly', 'Some roses may fade quickly', 'Only roses fade quickly'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 0, weight: 1,
    text: 'Odd one out: Square, Rectangle, Rhombus, Triangle',
    options: ['Triangle', 'Square', 'Rhombus', 'Rectangle'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 1, weight: 1,
    text: 'Complete: 2, 3, 5, 7, 11, ?',
    options: ['12', '13', '14', '15'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 2, weight: 1,
    text: 'Five people sit in a row. A is left of B, C is right of B, D is at the far left. Who is in the middle of A, B and C?',
    options: ['A', 'C', 'B', 'D'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 1, weight: 1,
    text: 'If it rains, the match is cancelled. The match was NOT cancelled. What follows?',
    options: ['It rained', 'It did not rain', 'It may have rained', 'Nothing follows'] },
  { category: 'logical_reasoning', stages: FB, correctIndex: 2, weight: 1,
    text: 'Statement: "Most students who practise daily pass." Which is an assumption, not a fact?',
    options: ['Some students practise daily', 'Some students pass', 'Practice causes passing', 'Students exist'] },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedBankFoundation.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant.'); process.exit(1); }

  let added = 0, updated = 0;
  for (const q of QUESTIONS) {
    const existing = a.questions.find((x: any) => x.text === q.text);
    if (existing) { Object.assign(existing, q); updated++; }
    else { a.questions.push(q as any); added++; }
  }
  a.markModified('questions');
  await a.save();

  console.log(`Batch 1 — added ${added}, updated ${updated}. Bank now ${a.questions.length}.\n`);
  console.log('Pool depth per category (goal-neutral categories only):');
  const cats = ['career_clarity', 'aptitude', 'logical_reasoning', 'communication', 'employability'];
  console.log('stage'.padEnd(14) + cats.map(c => c.slice(0, 9).padEnd(11)).join(''));
  for (const st of ['foundation', 'build', 'placement', 'job_seeker']) {
    const row = cats.map(c => {
      const n = a.questions.filter((q: any) =>
        q.category === c && (!q.stages?.length || q.stages.includes(st)) && !(q.goals?.length)).length;
      return String(n).padEnd(11);
    });
    console.log(st.padEnd(14) + row.join(''));
  }

  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
