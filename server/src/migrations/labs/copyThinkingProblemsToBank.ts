/**
 * Copy the CareerPilot Thinking Lab problems into the shared question bank. Run once per environment.
 *
 *   node dist/migrations/labs/copyThinkingProblemsToBank.js            report, writes nothing
 *   node dist/migrations/labs/copyThinkingProblemsToBank.js --apply    copy
 *
 * Until now each institute kept its own ThinkingProblem rows, and the CareerPilot ones were all coding
 * problems. They become `coding` questions in the shared bank (models/ThinkingQuestion.ts), published as
 * they were, with their serving order. A problem is copied once (keyed by migratedFrom), so a second
 * run copies nothing; the same problem in two institutes is copied once, by title and statement.
 * The ThinkingProblem rows are left as they are: the LMS Thinking Lab still reads them.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ThinkingProblem from '../../models/ThinkingProblem';
import ThinkingQuestion from '../../models/ThinkingQuestion';
import { cleanQuestion, createQuestion } from '../../services/thinkingBankService';
import { publishProblems } from '../../data/thinkingBankPolicy';

dotenv.config();

const DIFFICULTY: Record<string, string> = { easy: 'easy', medium: 'medium', hard: 'hard', expert: 'hard', interview: 'hard' };
const key = (p: any) => `${String(p.title || '').trim().toLowerCase()}|${String(p.statement || '').trim().toLowerCase().slice(0, 300)}`;

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nCOPY THINKING LAB PROBLEMS INTO THE SHARED BANK\n${apply ? 'APPLYING' : 'DRY RUN — pass --apply to write'}\n`);

  const rows: any[] = await ThinkingProblem.find({ audiences: 'careerpilot' }).sort({ order: 1, createdAt: 1 }).lean();
  const done = new Set((await ThinkingQuestion.find({ migratedFrom: { $exists: true } }).select('migratedFrom').lean() as any[]).map((q) => String(q.migratedFrom)));
  const seen = new Set<string>();
  let copied = 0, already = 0, duplicate = 0, asDraft = 0;

  for (const p of rows) {
    if (done.has(String(p._id))) { already++; continue; }
    if (seen.has(key(p))) { duplicate++; continue; }
    seen.add(key(p));
    const data = cleanQuestion({
      type: 'coding', subCategory: p.category, difficulty: DIFFICULTY[p.difficulty] || 'medium',
      title: p.title, statement: [p.statement, p.constraints ? `\nConstraints:\n${p.constraints}` : ''].join(''),
      hints: p.hints, estimatedMinutes: p.estimatedMinutes, language: p.language || 'python', starterCode: p.starterCode,
      examples: p.examples, testCases: p.testCases, referenceSolution: p.referenceSolution, topics: p.tags, order: p.order,
      explanation: p.notes,
    });
    // Live problems stay live; one that is not complete enough to publish arrives as a draft to finish.
    const ready = p.active !== false && publishProblems(data).length === 0;
    if (!ready) asDraft++;
    copied++;
    if (!apply) continue;
    await createQuestion({
      ...data, status: ready ? 'PUBLISHED' : 'DRAFT', source: 'migrated', migratedFrom: String(p._id),
      timesServed: p.timesAssigned || 0, timesSolved: p.timesSolved || 0, ...(ready ? { approvedAt: new Date() } : {}),
    });
  }

  console.log(`  CareerPilot problems found:   ${rows.length}`);
  console.log(`  copied before:                ${already}`);
  console.log(`  same problem twice (skipped): ${duplicate}`);
  console.log(`\n${apply ? 'COPIED' : 'WOULD COPY'} ${copied} problem(s)${asDraft ? `, ${asDraft} as drafts to finish` : ''}.`);
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('ERR', e?.message || e);
  try { await mongoose.disconnect(); } catch { /* closing */ }
  process.exit(1);
});
