/**
 * Bank depth — batch 2: goal-neutral categories at PLACEMENT and JOB SEEKER.
 *
 * Same principle as batch 1: tagged by stage only, so each question serves all three
 * interest pools at that stage. The difference is what these stages are actually about —
 * a placement paper is measuring readiness for a process that starts in weeks, so the
 * questions are about evidence and preparation rather than habits and intentions.
 *
 * Aptitude and reasoning here are pitched at real placement-paper difficulty: the ones a
 * student meets in an aptitude round, not the campus-practice level of batch 1.
 *
 * Run: npx ts-node src/scripts/seedBankPlacement.ts <tenantId>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

interface Q {
  category: string; text: string; options: string[];
  correctIndex: number; weight: number; selfReport?: boolean; stages: string[];
}

const P = ['placement'];
const J = ['job_seeker'];
const PJ = ['placement', 'job_seeker'];

export const QUESTIONS: Q[] = [

  /* ══ CAREER CLARITY ═══════════════════════════════════════════════════════ */
  { category: 'career_clarity', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'If an interviewer asked "why this role?", how ready is your answer?',
    options: ['No answer', 'Something vague', 'A reasonable answer', 'A specific answer with evidence'] },
  { category: 'career_clarity', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Do you know which companies actually hire for your target role in your city?',
    options: ['No idea', 'A couple of names', 'A working list', 'A list I track and apply to'] },
  { category: 'career_clarity', stages: PJ, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you decided what you will NOT accept — role, location, pay?',
    options: ['Will take anything', 'Vague preferences', 'Rough limits', 'Clear limits I can state'] },
  { category: 'career_clarity', stages: P, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Do you know your campus placement calendar — who visits and when?',
    options: ['No', 'Heard some dates', 'Know the main ones', 'Know it and prepared per company'] },
  { category: 'career_clarity', stages: PJ, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How would you describe your strongest skill to a recruiter in one line?',
    options: ['Could not', 'Something generic', 'A skill, no proof', 'A skill with a concrete example'] },
  { category: 'career_clarity', stages: J, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Have you reconsidered your target role since you started looking?',
    options: ['Never thought about it', 'Doubting but stuck', 'Considered alternatives', 'Adjusted deliberately, for reasons'] },

  /* ══ COMMUNICATION ════════════════════════════════════════════════════════ */
  { category: 'communication', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How do you handle a question you cannot answer in an interview?',
    options: ['Freeze', 'Guess and hope', 'Admit it', 'Admit it, then reason aloud toward an approach'] },
  { category: 'communication', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'When solving a problem in front of an interviewer, do you talk through your thinking?',
    options: ['I go silent', 'Only when stuck', 'Mostly', 'Throughout, deliberately'] },
  { category: 'communication', stages: PJ, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you had someone critique how you answer interview questions?',
    options: ['Never', 'Informal comments', 'One proper review', 'Several, and I acted on them'] },
  { category: 'communication', stages: PJ, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How do you follow up after an interview?',
    options: ['I do not', 'Wait to be contacted', 'Send a thank-you note', 'Thank-you plus a specific point from the conversation'] },
  { category: 'communication', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Can you describe a technical decision you made and defend it under questioning?',
    options: ['No decisions to describe', 'Could describe, not defend', 'Could defend loosely', 'Could defend with trade-offs'] },
  { category: 'communication', stages: PJ, selfReport: true, correctIndex: -1, weight: 1,
    text: 'How clear is your written communication — emails, messages to recruiters?',
    options: ['I avoid writing', 'Often unclear', 'Usually fine', 'Short, clear and specific'] },

  /* ══ EMPLOYABILITY ════════════════════════════════════════════════════════ */
  { category: 'employability', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'Is your LinkedIn profile something a recruiter could act on?',
    options: ['No profile', 'Exists, empty', 'Filled in', 'Complete, with work and a clear headline'] },
  { category: 'employability', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'How do you track the roles you have applied for?',
    options: ['I do not', 'In my head', 'A rough list', 'A sheet with stage and next action'] },
  { category: 'employability', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'When an application is rejected, what do you do?',
    options: ['Move on, discouraged', 'Move on', 'Note what went wrong', 'Ask for feedback and change something'] },
  { category: 'employability', stages: P, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you prepared differently for different companies?',
    options: ['Same preparation for all', 'Slight tweaks', 'Researched each', 'Tailored prep per company'] },
  { category: 'employability', stages: PJ, selfReport: true, correctIndex: -1, weight: 1.2,
    text: 'How many hours a week do you put into placement preparation?',
    options: ['Under 2', '2–5', '6–12', 'More than 12'] },
  { category: 'employability', stages: J, selfReport: true, correctIndex: -1, weight: 1.1,
    text: 'Are you doing anything that will show on your CV for this period?',
    options: ['Nothing', 'Studying informally', 'A course or certification', 'Building or contributing to real work'] },
  { category: 'employability', stages: J, selfReport: true, correctIndex: -1, weight: 1,
    text: 'Have you considered roles adjacent to your target — support, QA, analyst?',
    options: ['Refuse to', 'Not thought about it', 'Considered', 'Applied to some deliberately'] },

  /* ══ APTITUDE — placement-paper difficulty ════════════════════════════════ */
  { category: 'aptitude', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'A mixture has milk and water in ratio 5:3. If 16 litres of water is added the ratio becomes 5:7. How much milk?',
    options: ['15 litres', '20 litres', '25 litres', '30 litres'] },
  { category: 'aptitude', stages: PJ, correctIndex: 2, weight: 1.1,
    text: 'A boat travels 30 km downstream in 2 hours and returns in 3 hours. Speed of the stream?',
    options: ['1.5 km/h', '2 km/h', '2.5 km/h', '3 km/h'] },
  { category: 'aptitude', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'The compound interest on ₹10,000 at 10% for 2 years, compounded annually, is?',
    options: ['₹2,000', '₹2,100', '₹2,200', '₹2,400'] },
  { category: 'aptitude', stages: PJ, correctIndex: 2, weight: 1,
    text: 'In how many ways can the letters of the word LEVEL be arranged?',
    options: ['20', '25', '30', '60'] },
  { category: 'aptitude', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'Two dice are rolled. What is the probability the sum is greater than 9?',
    options: ['1/9', '1/6', '1/4', '1/3'] },
  { category: 'aptitude', stages: PJ, correctIndex: 2, weight: 1,
    text: 'A shopkeeper marks up 40% then gives a 25% discount. What is the net profit percentage?',
    options: ['5%', '8%', '10%', '15%'] },
  { category: 'aptitude', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'A and B together earn ₹6,000. A saves 20% and B saves 25%, and their savings are equal. A earns?',
    options: ['₹2,667', '₹3,333', '₹3,600', '₹4,000'] },
  { category: 'aptitude', stages: PJ, correctIndex: 2, weight: 1,
    text: 'A pipe fills a tank in 6 hours, another empties it in 8 hours. Both open, how long to fill?',
    options: ['14 hours', '20 hours', '24 hours', '48 hours'] },
  { category: 'aptitude', stages: PJ, correctIndex: 0, weight: 1.1,
    text: 'The average age of 30 students is 15. Including the teacher it becomes 16. The teacher’s age?',
    options: ['46', '42', '38', '31'] },
  { category: 'aptitude', stages: PJ, correctIndex: 2, weight: 1,
    text: 'A sum of ₹1,200 becomes ₹1,440 in 4 years at simple interest. The rate is?',
    options: ['3%', '4%', '5%', '6%'] },

  /* ══ LOGICAL REASONING — placement-paper difficulty ═══════════════════════ */
  { category: 'logical_reasoning', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'Six people sit in a row. P is third from the left, Q is immediately right of P, R is at an end. Which CANNOT be true?',
    options: ['R is leftmost', 'Q is third from the left', 'R is rightmost', 'Q is fourth from the left'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 2, weight: 1.1,
    text: 'Complete the series: 1, 4, 9, 16, 25, ?',
    options: ['30', '32', '36', '49'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'If FRIEND is coded as HTKGPF, how is CANDLE coded?',
    options: ['EDPFNG', 'ECPFNG', 'ECQFNG', 'EDQFNG'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 2, weight: 1.1,
    text: 'All engineers are graduates. Some graduates are unemployed. Which conclusion follows?',
    options: ['Some engineers are unemployed', 'No engineer is unemployed', 'Neither conclusion follows', 'All graduates are engineers'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 1, weight: 1,
    text: 'A is B’s sister. C is B’s mother. D is C’s father. How is A related to D?',
    options: ['Daughter', 'Granddaughter', 'Great-granddaughter', 'Niece'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 2, weight: 1.1,
    text: 'Statement: "Sales rose after the ad campaign." Which weakens the claim that the ads caused it?',
    options: ['The ads were expensive', 'Sales rose 12%', 'A competitor shut down that month', 'The campaign lasted 4 weeks'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 1, weight: 1.1,
    text: 'Complete: AZ, BY, CX, ?',
    options: ['DV', 'DW', 'EW', 'DX'] },
  { category: 'logical_reasoning', stages: PJ, correctIndex: 2, weight: 1,
    text: 'Five boxes are stacked. A is above B, C is below B, D is at the top. Which is at the bottom?',
    options: ['A', 'B', 'C', 'D'] },
];

async function run() {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: seedBankPlacement.ts <tenantId>'); process.exit(1); }
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
  console.log(`Batch 2 — added ${added}, updated ${updated}. Bank now ${a.questions.length}.`);
  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
