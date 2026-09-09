/**
 * Load the V4 foundation bank — all 40,800 rows — with the fact signatures that keep it honest.
 *
 * WHY ALL THE ROWS THIS TIME. The earlier packages were deduplicated to 330 questions because
 * their variants were the same question in a different costume, and importing them would have
 * broken re-assessment while looking like abundance. V4's variants read as real questions: the
 * prose is clean, no stem is echoed back inside its own options, and every row is a different
 * scenario. As surface variety that is worth having — two students sitting the same diagnostic
 * see different papers, and a leaked screenshot is worth less.
 *
 * WHAT HAS NOT CHANGED, AND WHY THIS FILE IS MOSTLY ABOUT THAT. The bank is still built from
 * about ten facts per skill, roughly 340 in all. Forty thousand rows over 340 facts means about
 * a hundred and twenty rows per fact, so selecting by item id cannot tell that two questions are
 * the same question. Left alone that produces two silent failures: a skill's four slots can all
 * land on one fact and report a skill measured on a single piece of knowledge, and the
 * fourteen-day re-assessment can re-ask what the student already answered and read the
 * remembered answer as improvement.
 *
 * SO EVERY ITEM CARRIES THE FACTS IT TESTS. The catalogue is mined from the bank itself rather
 * than declared: within one authoring skill, the options are variations on a claim — "a for loop
 * is commonly used to iterate over items or a range" against "...to define a function only" —
 * so claims sharing a long prefix are the same fact with different endings. The generator then
 * excludes on facts instead of ids.
 *
 * IT DOES NOT USE THE BANK'S OWN questionFamilyId. That field is unique per row — 40,800 values
 * for 40,800 rows — so it groups nothing and would give a false sense of protection.
 *
 *   npx ts-node src/scripts/importFoundationBankV4.ts <tenantId> "<path.jsonl>"
 *   npx ts-node src/scripts/importFoundationBankV4.ts <tenantId> "<path.jsonl>" --apply
 *   npx ts-node src/scripts/importFoundationBankV4.ts <tenantId> "<path.jsonl>" --apply --per-skill=200
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

const CREATED_BY = 'foundation-bank-v4';
const BATCH = 1000;

/**
 * How much of two claims must agree before they count as the same fact.
 *
 * Ten characters. Tuned against the bank rather than guessed: the authored truth is ten facts
 * per skill, and at ten characters twenty-three of the thirty-four skills land exactly there.
 * The rest come out slightly low, which merges two facts into one — that makes selection more
 * cautious, never less, so the error that remains is the harmless one.
 */
const FACT_PREFIX_MIN = 10;

/** Scenario dressing, not a claim about anything. It varies per row by design. */
const SCENARIO_LINE = /^this statement is being evaluated for/i;
/** Wrappers the bank puts in front of a bundled option before the claims themselves. */
const OPTION_LEAD = /^(apply both rules:|apply these rules:)\s*/i;

interface V4Row {
  questionId: string;
  authoringSkillId: string;
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

/** The individual claims inside one option, with the bundling wrapper and scenario removed. */
const claimsIn = (optionText: string): string[] =>
  optionText.replace(OPTION_LEAD, '')
    .split(/(?<=[.])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim().replace(/\.$/, '').toLowerCase())
    .filter(s => s.length > 15 && !SCENARIO_LINE.test(s));

/**
 * Group a skill's claims into facts.
 *
 * Distractors are built by keeping a claim's opening and changing its ending, so a shared prefix
 * is a shared subject. Greedy and prefix-shortening: each claim joins the fact it agrees with
 * longest, and the fact's prefix contracts to what they still have in common, which is the point
 * where the four endings diverge.
 */
function mineFacts(claims: Set<string>): Map<string, string> {
  const facts: Array<{ prefix: string; members: string[] }> = [];
  for (const claim of [...claims].sort()) {
    let best: { prefix: string; members: string[] } | null = null;
    let bestLen = 0;
    for (const f of facts) {
      let n = 0;
      while (n < f.prefix.length && n < claim.length && f.prefix[n] === claim[n]) n++;
      if (n > bestLen) { bestLen = n; best = f; }
    }
    if (best && bestLen >= FACT_PREFIX_MIN) {
      best.prefix = best.prefix.slice(0, bestLen);
      best.members.push(claim);
    } else {
      facts.push({ prefix: claim, members: [claim] });
    }
  }
  // claim → the fact it belongs to, named by the prefix its variants share.
  const index = new Map<string, string>();
  for (const f of facts) for (const m of f.members) index.set(m, f.prefix);
  return index;
}

(async () => {
  const tenantId = process.argv[2];
  const file = process.argv[3];
  const apply = process.argv.includes('--apply');
  const capArg = process.argv.find(a => a.startsWith('--per-skill='));
  const perSkillCap = capArg ? Number(capArg.split('=')[1]) : Infinity;

  if (!tenantId || !file) {
    console.error('Usage: importFoundationBankV4.ts <tenantId> "<path.jsonl>" [--apply] [--per-skill=N]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) { console.error(`No such file: ${file}`); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const live = await CareerSkill.find({ active: true, assessable: true, nodeType: { $ne: 'GROUP' } })
    .select('key').lean() as any[];
  const liveKeys = new Set(live.map(s => String(s.key).toUpperCase()));

  const read = () => readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  /* ---- pass 1: what facts does this bank actually contain? ---------------------------- */

  const claimsBySkill = new Map<string, Set<string>>();
  const unmapped = new Set<string>();
  let rows = 0;

  for await (const line of read()) {
    if (!line.trim()) continue;
    let row: V4Row;
    try { row = JSON.parse(line); } catch { continue; }
    rows++;
    const code = String(row.authoringSkillId || '').trim();
    if (!BANK_SKILL_MAP[code]) { unmapped.add(code); continue; }
    let set = claimsBySkill.get(code);
    if (!set) { set = new Set(); claimsBySkill.set(code, set); }
    for (const o of row.assessmentItem?.options || []) for (const c of claimsIn(o.text)) set.add(c);
  }

  if (unmapped.size) {
    console.error(`\nREFUSED — ${unmapped.size} bank skill codes are not mapped:`);
    for (const u of unmapped) console.error(`  ${u}`);
    console.error('\nAdd them to src/seeds/careerPilot/data/foundation40800SkillMap.ts and run again.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const factIndex = new Map<string, Map<string, string>>();
  for (const [code, claims] of claimsBySkill) factIndex.set(code, mineFacts(claims));

  const factsPerSkill = [...factIndex.entries()]
    .map(([code, idx]) => ({ code, n: new Set(idx.values()).size }))
    .sort((a, b) => a.n - b.n);
  const totalFacts = factsPerSkill.reduce((s, f) => s + f.n, 0);

  console.log(`\nread ${rows} rows, ${claimsBySkill.size} authoring skills`);
  console.log(`facts mined : ${totalFacts} across ${factsPerSkill.length} skills `
    + `(${factsPerSkill[0].n}–${factsPerSkill[factsPerSkill.length - 1].n} per skill)`);
  console.log(`              ${rows} rows over ${totalFacts} facts = ~${Math.round(rows / totalFacts)} rows per fact`);

  /* ---- pass 2: build the writes ------------------------------------------------------- */

  const itemOps: any[] = [];
  const mapOps: any[] = [];
  const perBankSkill = new Map<string, number>();
  const promoted = new Map<string, number>();
  const skipped = { overCap: 0, inactivePrimary: 0, malformed: 0, noFacts: 0 };
  const coverage = new Map<string, { p: number; s: number; facts: Set<string> }>();

  for await (const line of read()) {
    if (!line.trim()) continue;
    let row: V4Row;
    try { row = JSON.parse(line); } catch { skipped.malformed++; continue; }

    const code = String(row.authoringSkillId || '').trim();
    const mapping = BANK_SKILL_MAP[code];
    const ai = row.assessmentItem;
    if (!ai?.prompt || !ai.options?.length || !ai.correctOptionIds?.length) { skipped.malformed++; continue; }

    const primary = mapping.primary.toUpperCase();
    if (!liveKeys.has(primary)) { skipped.inactivePrimary++; continue; }

    const used = perBankSkill.get(code) || 0;
    if (used >= perSkillCap) { skipped.overCap++; continue; }

    /**
     * The facts come from the CORRECT option only.
     *
     * That option is the set of claims a student must recognise as true to answer; the
     * distractors are what they must reject. Taking facts from all four would tie an item to
     * knowledge it never actually tests, and would make almost every item overlap every other.
     */
    const idx = factIndex.get(code)!;
    const correct = ai.options.filter(o => ai.correctOptionIds.includes(o.id));
    const factKeys = [...new Set(correct.flatMap(o => claimsIn(o.text).map(c => idx.get(c)).filter(Boolean) as string[]))];
    if (!factKeys.length) { skipped.noFacts++; continue; }

    perBankSkill.set(code, used + 1);
    const _id = deterministicId(`${tenantId}:${row.questionId}`);

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
            factKeys,
            active: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    });

    const contributions = new Map<string, 'PRIMARY' | 'SECONDARY'>();
    contributions.set(primary, 'PRIMARY');
    for (const s of mapping.secondary || []) {
      const k = s.toUpperCase();
      if (liveKeys.has(k) && !contributions.has(k)) contributions.set(k, 'SECONDARY');
    }
    /**
     * Promotions are matched against the CLAIMS, not the prompt.
     *
     * V4 names the authoring skill inside every prompt — "While studying Python Loops, …" — so
     * matching there promotes on the title rather than the content: every row of "JavaScript &
     * DOM Fundamentals" contains the word DOM and every row of "Technical Communication & Career
     * Readiness" contains the word career, which promoted 1,200 of 1,200 in both cases and would
     * have recorded a question about `let` as direct evidence of knowing the DOM. The claims are
     * what the student is actually asked to judge.
     */
    const claimText = correct.map(o => o.text).join(' ');
    for (const p of mapping.promote || []) {
      const k = p.skillKey.toUpperCase();
      if (liveKeys.has(k) && p.match.test(claimText)) {
        contributions.set(k, 'PRIMARY');
        promoted.set(k, (promoted.get(k) || 0) + 1);
      }
    }

    for (const [skillKey, contribution] of contributions) {
      const c = coverage.get(skillKey) || { p: 0, s: 0, facts: new Set<string>() };
      if (contribution === 'PRIMARY') { c.p++; factKeys.forEach(f => c.facts.add(f)); } else c.s++;
      coverage.set(skillKey, c);

      mapOps.push({
        updateOne: {
          filter: { sourceType: 'assessment_item', sourceId: String(_id), skillKey },
          update: {
            $set: {
              tenantId, sourceType: 'assessment_item', sourceId: String(_id),
              skillKey, contribution, active: true,
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

  console.log(`\nwill import : ${itemOps.length} questions, ${mapOps.length} skill mappings`);
  console.log(`skipped     : over --per-skill cap ${skipped.overCap}, primary skill inactive `
    + `${skipped.inactivePrimary}, no recognisable fact ${skipped.noFacts}, malformed ${skipped.malformed}`);

  if (promoted.size) {
    console.log('\npromoted to PRIMARY by the claims the item tests:');
    for (const [k, n] of [...promoted.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(30)} ${n}`);
    }
  }

  console.log('\ncoverage per skill — items, and the DISTINCT FACTS behind them:');
  console.log('  (facts is the number that limits a paper; items only spread them over scenarios)');
  for (const [k, c] of [...coverage.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const thin = c.facts.size < 4 ? '   <-- under 4 facts: cannot fill four honest slots' : '';
    console.log(`  ${k.padEnd(30)} ${String(c.p).padStart(6)} items  ${String(c.facts.size).padStart(3)} facts`
      + `  +${c.s} secondary${thin}`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Pass --apply to import.');
    await mongoose.disconnect();
    return;
  }

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
