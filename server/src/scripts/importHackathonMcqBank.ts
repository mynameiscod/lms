/**
 * Import an authored MCQ bank JSON into AssessmentItem.
 *
 *   npx ts-node src/scripts/importHackathonMcqBank.ts <tenantId> <file.json>            # plan only
 *   npx ts-node src/scripts/importHackathonMcqBank.ts <tenantId> <file.json> --apply
 *
 * ── WHY A SCRIPT AND NOT THE ADMIN SCREEN ─────────────────────────────────────────────────
 *
 * The screen creates one item at a time, which is right for writing a question and wrong for a
 * hundred of them: a hundred hand-entries is a hundred chances to paste the wrong answer key,
 * and no chance to check the set as a whole.
 *
 * ── IT VALIDATES BEFORE IT WRITES, AND REFUSES ON THE FIRST PROBLEM ───────────────────────
 *
 * A malformed item is not a small error. `correctOptionIds` pointing at an option that does not
 * exist makes a question unanswerable — every candidate is marked wrong, and nothing in the exam
 * reports it. So every row is checked first and a single failure abandons the whole import: a
 * bank that is half in is worse than one that is not in, because the half is invisible.
 *
 * ── RE-RUNNABLE ───────────────────────────────────────────────────────────────────────────
 *
 * Idempotent on (tenantId, tags, prompt). The obvious failure mode of a bulk import is someone
 * re-running it after a timeout and silently doubling the bank, so a second run must update in
 * place.
 *
 * The file's own `id` would be the natural key and is deliberately NOT used: AssessmentItem has
 * no such field, and Mongoose in strict mode DISCARDS unknown paths without error — the key
 * would vanish on write and every re-run would duplicate everything, with nothing to show for
 * it. Prompt text is stored, is the real identity of a question, and was checked unique across
 * this file before being relied on.
 */

import fs from 'fs';
import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import { ASSESSMENT_DIMENSIONS } from '../constants/assessment';

/** The file's display labels, mapped to the enum the bank actually stores. */
const DIMENSION_MAP: Record<string, string> = {
  'Problem Solving': 'problem_solving',
  'Fundamentals': 'fundamentals',
  'DSA': 'dsa',
  'Aptitude': 'aptitude',
  'System Design': 'system_design',
  'Core Stack': 'core_stack',
};

const OPTION_ID = ['a', 'b', 'c', 'd', 'e', 'f'];

interface SourceQuestion {
  id: number;
  type: string;
  dimension: string;
  difficulty: number;
  question: string;
  codeSnippet?: string;
  options: { key: string; text: string }[];
  correctAnswers: string[];
  active?: boolean;
  tags?: string[];
}

async function main() {
  const tenantId = process.argv[2];
  const file = process.argv[3];
  const apply = process.argv.includes('--apply');
  if (!tenantId || !file || tenantId.startsWith('--')) {
    console.error('Usage: importHackathonMcqBank.ts <tenantId> <file.json> [--apply]');
    process.exit(1);
  }

  const raw: SourceQuestion[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  const say = (s = '') => console.log(s);
  say('─'.repeat(88));
  say(`MCQ BANK IMPORT  ·  tenant ${tenantId}  ·  ${raw.length} questions  ·  ${apply ? 'APPLY' : 'PLAN ONLY'}`);
  say('─'.repeat(88));

  /* ── validate everything first ───────────────────────────────────────────────────────── */
  const problems: string[] = [];
  const seenIds = new Set<number>();

  const docs = raw.map((q) => {
    const where = `#${q.id}`;
    if (seenIds.has(q.id)) problems.push(`${where}: duplicate id`);
    seenIds.add(q.id);

    const dimension = DIMENSION_MAP[q.dimension];
    if (!dimension) problems.push(`${where}: unknown dimension "${q.dimension}"`);
    else if (!(ASSESSMENT_DIMENSIONS as readonly string[]).includes(dimension)) {
      problems.push(`${where}: dimension "${dimension}" is not in the bank's enum`);
    }
    if (!/multiple choice/i.test(q.type)) problems.push(`${where}: type "${q.type}" is not multiple choice`);
    if (!(q.difficulty >= 1 && q.difficulty <= 5)) problems.push(`${where}: difficulty ${q.difficulty} outside 1-5`);
    if (!q.question?.trim()) problems.push(`${where}: empty question`);
    if (!Array.isArray(q.options) || q.options.length < 2) problems.push(`${where}: fewer than two options`);

    const options = (q.options || []).map((o, i) => ({ id: OPTION_ID[i], text: String(o.text ?? '').trim() }));
    options.forEach((o, i) => { if (!o.text) problems.push(`${where}: option ${q.options[i]?.key} has no text`); });

    /* The key letter is positional in the file (A is the first option), so it is resolved by
       position rather than by trusting the letters to be in order. */
    const keyIndex = new Map((q.options || []).map((o, i) => [String(o.key).toUpperCase(), i]));
    const correctOptionIds = (q.correctAnswers || []).map((a) => {
      const i = keyIndex.get(String(a).toUpperCase());
      if (i === undefined) { problems.push(`${where}: correct answer "${a}" is not one of its options`); return ''; }
      return OPTION_ID[i];
    }).filter(Boolean);
    if (!correctOptionIds.length) problems.push(`${where}: no usable correct answer`);

    return {
      doc: {
        tenantId,
        type: 'mcq',
        dimension,
        difficulty: q.difficulty,
        prompt: q.question.trim(),
        ...(q.codeSnippet?.trim() ? { codeSnippet: q.codeSnippet.trim() } : {}),
        options,
        correctOptionIds,
        points: 1,
        tags: q.tags?.length ? q.tags : [],
        active: q.active !== false,
      },
    };
  });

  const tags = [...new Set(raw.flatMap((q) => q.tags || []))];
  say(`\n  tags in this file : ${tags.join(', ') || '(none)'}`);
  const byDim: Record<string, number> = {};
  const byDiff: Record<string, number> = {};
  for (const d of docs) {
    byDim[d.doc.dimension] = (byDim[d.doc.dimension] || 0) + 1;
    byDiff[d.doc.difficulty] = (byDiff[d.doc.difficulty] || 0) + 1;
  }
  say(`  by dimension      : ${Object.entries(byDim).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  say(`  by difficulty     : ${Object.entries(byDiff).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  const existing = tags.length
    ? await AssessmentItem.countDocuments({ tenantId, tags: { $in: tags } })
    : 0;
  say(`  already in the bank with these tags: ${existing}`);

  if (problems.length) {
    say(`\n  REFUSED — ${problems.length} problem(s), nothing written:`);
    for (const p of problems.slice(0, 30)) say(`    ${p}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  say(`\n  every question is well formed and its answer resolves to a real option.`);

  if (!apply) {
    say(`\n  PLAN ONLY — nothing written. Re-run with --apply.`);
    await mongoose.disconnect();
    return;
  }

  let created = 0;
  let updated = 0;
  for (const { doc } of docs) {
    const res = await AssessmentItem.updateOne(
      { tenantId, prompt: doc.prompt },
      { $set: doc, $setOnInsert: { createdBy: 'mcq-bank-import' } },
      { upsert: true },
    );
    if ((res as any).upsertedCount) created++; else updated++;
  }
  say(`\n  created ${created}, updated in place ${updated}`);
  say(`  total with these tags now: ${await AssessmentItem.countDocuments({ tenantId, tags: { $in: tags } })}`);
  await mongoose.disconnect();
}

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lms-saas')
  .then(main)
  .catch((e) => { console.error('FAILED:', e?.message || e); process.exit(1); });
