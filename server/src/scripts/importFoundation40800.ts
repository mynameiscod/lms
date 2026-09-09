/**
 * Load the 40,800-question foundation bank, with the skill mappings that make it usable.
 *
 * WHY NOT THE IMPORTER THAT SHIPPED WITH THE BANK. That one writes AssessmentItem rows and stops.
 * The rows are correct, but nothing in this system finds a question by tag: the generator asks
 * SkillEvidence which items measure a skill, and an item no evidence row points at is invisible.
 * A bank imported that way looks fully loaded in the database and produces the same "still being
 * filled" refusal as an empty one — the failure is silent, which is why this exists.
 *
 * THE SKILL VOCABULARY IS TRANSLATED, NOT TRUSTED. The bank names its own skills (CP-PY-LOOP-01).
 * foundation40800SkillMap says what each measures in canonical terms, and an unmapped code stops
 * the import rather than being dropped — 1,200 silently missing questions would show up weeks
 * later as a thin paper for one skill, with nothing pointing at the cause.
 *
 * IDEMPOTENT. Item ids derive from the bank's own questionId, so re-running an edited bank
 * updates rows rather than duplicating them, and the mappings keep pointing at the right items.
 *
 *   npx ts-node src/scripts/importFoundation40800.ts <tenantId> "<path.jsonl>"
 *   npx ts-node src/scripts/importFoundation40800.ts <tenantId> "<path.jsonl>" --apply
 *   npx ts-node src/scripts/importFoundation40800.ts <tenantId> "<path.jsonl>" --apply --per-skill=400
 *
 * --per-skill caps how many questions of each bank skill are loaded. The full bank is 1,200 per
 * skill; a smaller load imports in a fraction of the time.
 *
 * DEDUPLICATION IS ON BY DEFAULT, AND IT IS THE POINT OF THIS SCRIPT. The bank's 40,800 rows are
 * 340 distinct questions — ten per skill — each reissued 120 times: five carrier sentences
 * ("During a foundation lab, Aarav reviews the statement: …"), several narrator names, and all
 * five difficulty levels applied to the identical stem and the identical options. Importing the
 * raw rows would do real damage, not merely waste space:
 *
 *   - Re-assessment would silently stop working. The fourteen-day re-measure exists to ask a
 *     student something they have not already been shown; with 120 copies in the pool it serves
 *     the same question in a new costume and reports improvement that is really recall.
 *   - Difficulty weighting would be measuring noise. Evidence is weighted 0.85/1.00/1.15 by band
 *     and the planner selects by difficulty, but a stem tagged 1 and 5 at once has no true band,
 *     so both the weight and the selection would act on a label with no information in it.
 *   - The shortfall check would stop protecting anything. A skill reporting 1,200 available
 *     questions looks comfortably covered when ten students have exhausted it.
 *
 * So one row survives per (skill, stem, option set) and the count in the database becomes the
 * number of questions that actually exist. Pass --raw to import every row as shipped.
 */

import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import AssessmentItem from '../models/AssessmentItem';
import { BANK_SKILL_MAP } from '../seeds/careerPilot/data/foundation40800SkillMap';

dotenv.config();

const CREATED_BY = 'foundation-40800-bank-v1';
const BATCH = 1000;

interface BankRow {
  questionId: string;
  skillCode: string;
  skillName: string;
  moduleCode?: string;
  variantGroup?: string;
  assessmentItem: {
    type: string;
    dimension: string;
    difficulty: number;
    prompt: string;
    options: Array<{ id: string; text: string }>;
    correctOptionIds: string[];
    points?: number;
    timeLimitSeconds?: number;
    tags?: string[];
  };
}

const band = (d: number) => (d <= 2 ? 'easy' : d === 3 ? 'medium' : 'hard');

/** One question chosen for import, with the mapping that says what it measures. */
interface Selected {
  item: BankRow['assessmentItem'];
  questionId: string;
  code: string;
  mapping: { primary: string; secondary?: string[]; promote?: Array<{ skillKey: string; match: RegExp }> };
}

/**
 * The question inside the carrier sentence.
 *
 * Every prompt is a wrapper around a quoted stem — "In a tutorial session, Diya must correct a
 * note that reads: “A while loop repeats while ____.”" — and the wrapper is what varies between
 * the 120 copies. Comparing whole prompts finds no duplicates at all, which is why the bank's own
 * validation reports 40,800 unique ones.
 */
const stemOf = (prompt: string): string => {
  const quoted = prompt.match(/[“"]([^”"]{8,})[”"]/);
  return (quoted ? quoted[1] : prompt).toLowerCase().replace(/\s+/g, ' ').trim();
};

/** Options identify a question as surely as its stem, and are not reworded between copies. */
const optionSignature = (options: Array<{ text: string }>): string =>
  options.map(o => String(o.text).toLowerCase().trim()).sort().join('|');

(async () => {
  const tenantId = process.argv[2];
  const file = process.argv[3];
  const apply = process.argv.includes('--apply');
  const capArg = process.argv.find(a => a.startsWith('--per-skill='));
  const perSkillCap = capArg ? Number(capArg.split('=')[1]) : Infinity;
  const dedupe = !process.argv.includes('--raw');

  if (!tenantId || !file) {
    console.error('Usage: importFoundation40800.ts <tenantId> "<path.jsonl>" [--apply] [--per-skill=N]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /**
   * Only skills that exist and can be measured here.
   *
   * A mapping to a switched-off skill is dead weight: it is never selected for a paper and never
   * contributes to readiness, so importing questions for it just inflates the bank.
   */
  const live = await CareerSkill.find({ active: true, assessable: true, nodeType: { $ne: 'GROUP' } })
    .select('key').lean() as any[];
  const liveKeys = new Set(live.map(s => String(s.key).toUpperCase()));

  const itemOps: any[] = [];
  const mapOps: any[] = [];
  const seenBankSkills = new Set<string>();
  const unmapped = new Set<string>();
  const perBankSkill = new Map<string, number>();
  const promoted = new Map<string, number>();
  const skipped = { overCap: 0, inactivePrimary: 0, malformed: 0, duplicate: 0 };
  /** Survivors of deduplication, keyed by skill + stem + options. */
  const selected = new Map<string, Selected>();
  /** primary/secondary counts per canonical skill, split by difficulty band. */
  const coverage = new Map<string, { p: number; s: number; easy: number; medium: number; hard: number }>();

  const bump = (key: string, kind: 'p' | 's', b: string) => {
    const c = coverage.get(key) || { p: 0, s: 0, easy: 0, medium: 0, hard: 0 };
    c[kind]++;
    if (kind === 'p') (c as any)[b]++;
    coverage.set(key, c);
  };

  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    if (!line.trim()) continue;

    let row: BankRow;
    try { row = JSON.parse(line); } catch { skipped.malformed++; continue; }

    const code = String(row.skillCode || '').trim();
    seenBankSkills.add(code);

    const mapping = BANK_SKILL_MAP[code];
    if (!mapping) { unmapped.add(`${code}  (${row.skillName || '?'})`); continue; }

    const ai = row.assessmentItem;
    if (!ai?.prompt || !ai.options?.length || !ai.correctOptionIds?.length) { skipped.malformed++; continue; }

    const primary = mapping.primary.toUpperCase();
    // No live primary means nothing here can act on the result — the whole row is pointless.
    if (!liveKeys.has(primary)) { skipped.inactivePrimary++; continue; }

    if (dedupe) {
      const key = `${code}::${stemOf(ai.prompt)}::${optionSignature(ai.options)}`;
      const held = selected.get(key);
      if (held) {
        skipped.duplicate++;
        /**
         * Prefer the copy tagged difficulty 2.
         *
         * Every copy of a stem carries a different difficulty, so one must be chosen and the
         * choice cannot come from the bank. These questions are recall — "a for loop is commonly
         * used to ____" with three implausible distractors — so the EASY band is the truthful
         * label, and picking it deliberately beats keeping whichever copy the file listed first.
         */
        if (Number(ai.difficulty) === 2 && Number(held.item.difficulty) !== 2) {
          selected.set(key, { item: ai, questionId: row.questionId, code, mapping });
        }
        continue;
      }
      selected.set(key, { item: ai, questionId: row.questionId, code, mapping });
      continue;
    }

    keep({ item: ai, questionId: row.questionId, code, mapping });
  }

  // Deduplicated rows are only known to be survivors once the whole file has been read.
  if (dedupe) for (const s of selected.values()) keep(s);

  function keep(sel: Selected) {
    const { item: ai, code, mapping } = sel;
    const used = perBankSkill.get(code) || 0;
    if (used >= perSkillCap) { skipped.overCap++; return; }
    perBankSkill.set(code, used + 1);

    const primary = mapping.primary.toUpperCase();
    const _id = deterministicId(`${tenantId}:${sel.questionId}`);
    const b = band(Number(ai.difficulty));

    itemOps.push({
      updateOne: {
        filter: { _id },
        update: {
          $set: {
            _id, tenantId, createdBy: CREATED_BY,
            type: ai.type || 'mcq',
            dimension: ai.dimension,
            difficulty: Number(ai.difficulty),
            prompt: ai.prompt,
            options: ai.options,
            correctOptionIds: ai.correctOptionIds,
            points: ai.points ?? 1,
            timeLimitSeconds: ai.timeLimitSeconds,
            tags: ai.tags || [],
            active: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    });

    /**
     * One evidence row per skill this question speaks to.
     *
     * Deduplicated by key because a promotion can name a skill already listed as secondary — and
     * when it does, PRIMARY must win: the promotion fired precisely because the question turned
     * out to be asking about that skill directly.
     */
    const contributions = new Map<string, 'PRIMARY' | 'SECONDARY'>();
    contributions.set(primary, 'PRIMARY');
    for (const s of mapping.secondary || []) {
      const k = s.toUpperCase();
      if (liveKeys.has(k) && !contributions.has(k)) contributions.set(k, 'SECONDARY');
    }
    for (const p of mapping.promote || []) {
      const k = p.skillKey.toUpperCase();
      if (!liveKeys.has(k)) continue;
      if (p.match.test(ai.prompt)) {
        contributions.set(k, 'PRIMARY');
        promoted.set(k, (promoted.get(k) || 0) + 1);
      }
    }

    for (const [skillKey, contribution] of contributions) {
      bump(skillKey, contribution === 'PRIMARY' ? 'p' : 's', b);
      mapOps.push({
        updateOne: {
          filter: { sourceType: 'assessment_item', sourceId: String(_id), skillKey },
          update: {
            $set: {
              tenantId, sourceType: 'assessment_item', sourceId: String(_id),
              skillKey, contribution, active: true,
              // Written for the foundation stage as a whole; narrowing by year or branch here
              // would exclude the very students the bank exists for.
              audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [],
              updatedBy: CREATED_BY, updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      });
    }
  }

  if (unmapped.size) {
    console.error(`\nREFUSED — ${unmapped.size} bank skill codes are not mapped:`);
    for (const u of unmapped) console.error(`  ${u}`);
    console.error('\nAdd them to src/seeds/careerPilot/data/foundation40800SkillMap.ts and run again.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nread ${lineNo} lines from the bank, ${seenBankSkills.size} bank skills`);
  console.log(`will import : ${itemOps.length} questions, ${mapOps.length} skill mappings`);
  console.log(`skipped     : reworded duplicates ${skipped.duplicate}, over --per-skill cap `
    + `${skipped.overCap}, primary skill inactive ${skipped.inactivePrimary}, malformed ${skipped.malformed}`);
  if (dedupe && skipped.duplicate) {
    const distinct = itemOps.length + skipped.overCap;
    console.log(`\nthe bank ships ${lineNo} rows and contains ${distinct} distinct questions — `
      + `each reissued ~${Math.round(lineNo / Math.max(1, distinct))}x with a different carrier `
      + `sentence and difficulty tag. Only the distinct ones are imported (--raw overrides).`);
  }

  if (promoted.size) {
    console.log('\npromoted to PRIMARY by prompt text (a count far off expectation means the rule is wrong):');
    for (const [k, n] of [...promoted.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(30)} ${n}`);
    }
  }

  console.log('\ncoverage per canonical skill — PRIMARY (easy/med/hard) + secondary:');
  const rows = [...coverage.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [k, c] of rows) {
    const thin = c.p < 4 ? '   <-- under 4 primary: cannot reach MEDIUM confidence' : '';
    console.log(`  ${k.padEnd(30)} ${String(c.p).padStart(5)} (${c.easy}/${c.medium}/${c.hard})`
      + `  +${c.s} secondary${thin}`);
  }

  const uncovered = [...liveKeys].filter(k => !coverage.has(k));
  if (uncovered.length) {
    console.log(`\nactive skills this bank does not touch at all (${uncovered.length}):`);
    console.log('  ' + uncovered.join(', '));
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Pass --apply to import.');
    await mongoose.disconnect();
    return;
  }

  /**
   * Questions first, then mappings.
   *
   * If this dies halfway, questions nothing maps to are invisible and harmless; mappings pointing
   * at questions that do not exist are counted as available and produce a paper that cannot be
   * filled. This order makes the failure mode the survivable one.
   */
  let wroteItems = 0;
  for (let i = 0; i < itemOps.length; i += BATCH) {
    const r = await AssessmentItem.bulkWrite(itemOps.slice(i, i + BATCH), { ordered: false });
    wroteItems += (r.upsertedCount || 0) + (r.modifiedCount || 0);
    process.stdout.write(`\r  questions ${Math.min(i + BATCH, itemOps.length)}/${itemOps.length}`);
  }
  console.log('');

  let wroteMaps = 0;
  for (let i = 0; i < mapOps.length; i += BATCH) {
    const r = await SkillEvidence.bulkWrite(mapOps.slice(i, i + BATCH), { ordered: false });
    wroteMaps += (r.upsertedCount || 0) + (r.modifiedCount || 0);
    process.stdout.write(`\r  mappings  ${Math.min(i + BATCH, mapOps.length)}/${mapOps.length}`);
  }
  console.log('');

  console.log(`\n✅ ${wroteItems} questions and ${wroteMaps} skill mappings written.`);
  console.log('\nNext — re-align the stage set so the paper draws on what now exists:');
  console.log(`  npx ts-node src/seeds/careerPilot/alignStageSetToCurriculum.ts ${tenantId} --apply`);

  await mongoose.disconnect();
})().catch(e => { console.error('\nERR', e.message); process.exit(1); });

/** A stable ObjectId for the bank's own identifier, so re-imports land on the same row. */
function deterministicId(ref: string): mongoose.Types.ObjectId {
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
    h3 = Math.imul(h3 ^ (c + i), 40503) >>> 0;
  }
  return new mongoose.Types.ObjectId(
    [h1, h2, h3].map(n => n.toString(16).padStart(8, '0')).join('').slice(0, 24),
  );
}
