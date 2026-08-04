/**
 * Bank depth — batch 4: TECHNICAL questions for Data Analytics, all four stages.
 *
 * Written against what the job actually rewards rather than what a syllabus covers:
 * comfort with numbers, suspicion of them, SQL that answers a question, and the ability
 * to say what a result means to someone who will act on it. A student can memorise the
 * syntax and still be useless at the last of those, so several items probe judgement
 * rather than recall.
 *
 * Run: npx ts-node src/scripts/seedBankTechDA.ts <tenantId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

interface Q {
  category: string; text: string; options: string[];
  correctIndex: number; weight: number; selfReport?: boolean; stages: string[]; goals: string[];
}

const DA = ['Data Analytics'];
const F = ['foundation'], B = ['build'], SEEK = ['placement', 'job_seeker'];

export const QUESTIONS: Q[] = [

  /* ══ FOUNDATION ═══════════════════════════════════════════════════════════ */
  { category: 'technical', stages: F, goals: DA, correctIndex: 1, weight: 1,
    text: 'Which spreadsheet function adds up a range of numbers?',
    options: ['COUNT', 'SUM', 'AVERAGE', 'MAX'] },
  { category: 'technical', stages: F, goals: DA, correctIndex: 2, weight: 1,
    text: 'In a table of sales, each ROW usually represents what?',
    options: ['A column heading', 'A total', 'One record, such as one sale', 'A chart'] },
  { category: 'technical', stages: F, goals: DA, correctIndex: 1, weight: 1,
    text: 'Which SQL keyword chooses WHICH ROWS you get back?',
    options: ['SELECT', 'WHERE', 'FROM', 'ORDER BY'] },
  { category: 'technical', stages: F, goals: DA, correctIndex: 2, weight: 1.1,
    text: 'Five salaries: 20k, 22k, 21k, 23k, 500k. Which better describes a typical salary?',
    options: ['The average', 'The maximum', 'The median', 'The total'] },
  { category: 'technical', stages: F, goals: DA, correctIndex: 1, weight: 1,
    text: 'A chart whose y-axis starts at 90 instead of 0 will usually make differences look?',
    options: ['Smaller', 'Bigger', 'Unchanged', 'Negative'] },
  { category: 'technical', stages: F, goals: DA, correctIndex: 2, weight: 1,
    text: 'What does "40% of customers churned" need in order to be meaningful?',
    options: ['A colour scheme', 'A chart', 'A time period and a total count', 'A percentage sign'] },
  { category: 'technical', stages: F, goals: DA, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'When you are given a number, how often do you ask how it was measured?',
    options: ['Never', 'Occasionally', 'Usually', 'Always, before using it'] },
  { category: 'technical', stages: F, goals: DA, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you ever worked with a dataset that was not given to you by a teacher?',
    options: ['Never', 'Looked at one', 'Explored one', 'Analysed one and wrote up findings'] },
  { category: 'technical', stages: F, goals: DA, correctIndex: 1, weight: 1,
    text: 'Sorting a table by one column changes what?',
    options: ['The values in the rows', 'The order the rows appear in', 'The number of rows', 'The column headings'] },
  { category: 'technical', stages: F, goals: DA, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How comfortable are you with percentages and ratios without a calculator?',
    options: ['Not at all', 'Slow but manage', 'Comfortable', 'Quick and confident'] },

  /* ══ BUILD ════════════════════════════════════════════════════════════════ */
  { category: 'technical', stages: B, goals: DA, correctIndex: 1, weight: 1.3,
    text: 'Which SQL clause filters rows AFTER grouping?',
    options: ['WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'] },
  { category: 'technical', stages: B, goals: DA, correctIndex: 2, weight: 1.3,
    text: 'An INNER JOIN returns fewer rows than expected. Most likely reason?',
    options: ['The tables are too big', 'A syntax error', 'Some keys have no match in the other table', 'Missing ORDER BY'] },
  { category: 'technical', stages: B, goals: DA, correctIndex: 1, weight: 1.2,
    text: 'You find duplicate rows in a dataset. What should you do FIRST?',
    options: ['Delete them all', 'Work out why they exist', 'Ignore them', 'Average them'] },
  { category: 'technical', stages: B, goals: DA, correctIndex: 2, weight: 1.2,
    text: 'A column of ages has some blanks. Replacing them with the average will?',
    options: ['Have no effect', 'Increase the spread', 'Shrink the apparent variation', 'Fix the data'] },
  { category: 'technical', stages: B, goals: DA, correctIndex: 1, weight: 1.2,
    text: 'COUNT(*) versus COUNT(column) — what is the difference?',
    options: ['None', 'COUNT(column) skips NULLs', 'COUNT(*) skips NULLs', 'COUNT(*) is always faster'] },
  { category: 'technical', stages: B, goals: DA, correctIndex: 2, weight: 1.2,
    text: 'In pandas, what does df.shape tell you?',
    options: ['The column types', 'The memory used', 'The number of rows and columns', 'The first five rows'] },
  { category: 'technical', stages: B, goals: DA, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'When you finish an analysis, could someone else reproduce it?',
    options: ['No, it was manual', 'Partly', 'Yes, with my notes', 'Yes, the code runs end to end'] },
  { category: 'technical', stages: B, goals: DA, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How do you decide which chart to use?',
    options: ['Whatever looks good', 'Whatever is default', 'Based on the data type', 'Based on the question being answered'] },
  { category: 'technical', stages: B, goals: DA, correctIndex: 1, weight: 1.2,
    text: 'Which is the better primary key for a customer table?',
    options: ['Full name', 'A generated customer ID', 'Email address', 'Phone number'] },
  { category: 'technical', stages: B, goals: DA, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Have you built anything someone else uses to make a decision?',
    options: ['No', 'A one-off chart', 'A report I shared', 'A dashboard people return to'] },

  /* ══ PLACEMENT + JOB SEEKER ═══════════════════════════════════════════════ */
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 2, weight: 1.4,
    text: 'Which gives each row a rank WITHIN its group without collapsing rows?',
    options: ['GROUP BY', 'HAVING', 'A window function', 'DISTINCT'] },
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 1, weight: 1.4,
    text: 'Ice cream sales and drowning both rise in summer. What is the correct conclusion?',
    options: ['Ice cream causes drowning', 'Both are driven by a third factor', 'The data is wrong', 'Drowning causes ice cream sales'] },
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 2, weight: 1.3,
    text: 'A LEFT JOIN produces NULLs in the right table’s columns. What does that mean?',
    options: ['The query is wrong', 'Those rows should be deleted', 'Those left rows had no match on the right', 'The join key is the wrong type'] },
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 1, weight: 1.3,
    text: 'An A/B test shows a 2% lift with a very small sample. What should you say?',
    options: ['Ship it', 'The result may not be reliable yet', 'The test failed', 'Increase the lift'] },
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 2, weight: 1.3,
    text: 'Which is usually the FASTEST fix for a slow query filtering on one column?',
    options: ['SELECT more columns', 'Remove the WHERE clause', 'Add an index on that column', 'Add an ORDER BY'] },
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 1, weight: 1.3,
    text: 'Revenue is up 10% but profit is down. Which question matters most?',
    options: ['Which chart to use', 'What happened to costs', 'Who wrote the report', 'What the currency is'] },
  { category: 'technical', stages: SEEK, goals: DA, selfReport: true, correctIndex: -1, weight: 1.4,
    text: 'Given a vague question like "are we doing well?", what do you do?',
    options: ['Ask for a clearer question', 'Pull every chart I can', 'Pick a metric and report it', 'Agree on the metric and time frame first'] },
  { category: 'technical', stages: SEEK, goals: DA, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'Could you write three non-trivial SQL queries against an unfamiliar schema in 30 minutes?',
    options: ['No', 'With documentation', 'Probably', 'Yes, comfortably'] },
  { category: 'technical', stages: SEEK, goals: DA, correctIndex: 2, weight: 1.3,
    text: 'What does a p-value of 0.03 conventionally suggest?',
    options: ['The effect is 3%', 'The result is definitely real', 'The result is unlikely under the null hypothesis', 'The sample was 3% of the population'] },
  { category: 'technical', stages: SEEK, goals: DA, selfReport: true, correctIndex: -1, weight: 1.3,
    text: 'When a stakeholder disagrees with your finding, what do you do?',
    options: ['Change the number', 'Defend it flatly', 'Re-check my method', 'Re-check, then show the working and the limits'] },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedBankTechDA.ts <tenantId>'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI as string);
  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) { console.error('No assessment for that tenant.'); process.exit(1); }
  let added = 0, updated = 0;
  for (const q of QUESTIONS) {
    const existing = a.questions.find((x: any) => x.text === q.text);
    if (existing) { Object.assign(existing, q); updated++; } else { a.questions.push(q as any); added++; }
  }
  a.markModified('questions'); await a.save();
  console.log(`Batch 4 (DA technical) — added ${added}, updated ${updated}. Bank now ${a.questions.length}.`);
  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
