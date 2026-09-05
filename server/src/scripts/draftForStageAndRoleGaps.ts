/**
 * Draft questions for every skill anything asks for and the pool cannot serve.
 *
 *   npx ts-node src/scripts/draftForStageAndRoleGaps.ts <tenantId>                    # plan only
 *   npx ts-node src/scripts/draftForStageAndRoleGaps.ts <tenantId> --apply
 *   ... --apply --easy 8 --medium 5 --hard 2 --limit 6 --only FOUNDATION
 *
 * WHY THIS EXISTS ALONGSIDE draftQuestionsForEmptySkills. That script walks ROLE BLUEPRINTS.
 * Stage skill sets came later, and the first-year foundation layer — Conditionals, Loops,
 * Functions, Input & Output — is in a stage set and in no blueprint at all, so the older
 * script reports the bank as fine while the students who need it most cannot be assessed.
 * This one takes the union: every skill any blueprint OR any stage set asks for.
 *
 * IT BYPASSES THE HOURLY RATE LIMIT, which is the other reason to use it. The coverage
 * screen makes one HTTP call per empty slot and is capped per hour; filling a bank from
 * empty runs into three figures and stops halfway. This runs in-process against the same
 * service, so a sweep completes in one go.
 *
 * THESE ARE DRAFTS. THEY DO NOT REACH A STUDENT. Everything lands in SkillQuestionDraft with
 * status 'pending' — not a Question, no SkillEvidence row, invisible to the paper generator.
 * The pool grows only when a person approves them on /admin/passport/question-drafts.
 *
 * That separation is the point. These questions produce a score that gates a paid membership
 * and is shown to colleges. A large pool of unreviewed questions is a worse product than a
 * small reviewed one: a subtly wrong answer key marks students down for being right, and
 * nothing catches it except somebody reading it.
 *
 * IT COSTS MONEY. Every batch is one billed AI call. Plan-only by default; --apply is the
 * only thing that spends, and the plan prints the call count before you do.
 */
import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import { findEvidenceCandidates } from '../services/skillEvidenceService';
import SkillQuestionDraft from '../models/SkillQuestionDraft';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import StageSkillSet from '../models/StageSkillSet';
import { generateDrafts } from '../services/skillQuestionDraftService';

type Band = 'EASY' | 'MEDIUM' | 'HARD';
const BANDS: Band[] = ['EASY', 'MEDIUM', 'HARD'];

const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const has = (name: string) => process.argv.includes('--' + name);

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: draftForStageAndRoleGaps.ts <tenantId> [--apply] [--easy N] [--medium N] [--hard N] [--limit N] [--only DIFFICULTY] [--empty]');
    process.exit(1);
  }

  const apply = has('apply');
  const target: Record<Band, number> = {
    EASY: Number(arg('easy', '8')),
    MEDIUM: Number(arg('medium', '5')),
    HARD: Number(arg('hard', '2')),
  };
  const limit = Number(arg('limit', '0'));           // 0 = no cap on skills
  const only = arg('only', '').toUpperCase();        // restrict to one band
  const emptyOnly = has('empty');                    // skills with nothing at all, first

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log((apply ? '' : '[PLAN ONLY] ') + 'tenant ' + tenantId);

  // ── who asks for what ──────────────────────────────────────────────────────
  const wanted = new Map<string, Set<string>>();   // skillKey -> who wants it
  const want = (key: string, who: string) => {
    const k = String(key || '').toUpperCase();
    if (!k) return;
    if (!wanted.has(k)) wanted.set(k, new Set());
    wanted.get(k)!.add(who);
  };

  for (const bp of await RoleSkillBlueprint.find({ tenantId }).lean() as any[]) {
    for (const r of bp.requirements || []) if (r.active !== false) want(r.skillKey, 'role:' + bp.roleKey);
  }
  // Stage sets count whether or not they are switched on: a set is usually written first and
  // enabled once its questions exist, which is exactly the gap this script is meant to close.
  for (const set of await StageSkillSet.find({ tenantId }).lean() as any[]) {
    for (const r of set.requirements || []) if (r.active !== false) want(r.skillKey, 'stage:' + set.stage);
  }

  const skills = await CareerSkill.find({ key: { $in: [...wanted.keys()] } }).lean() as any[];
  const byKey = new Map(skills.map(s => [s.key, s]));

  // ── what the pool already holds ────────────────────────────────────────────
  const eligible: { key: string; name: string; who: Set<string> }[] = [];
  for (const [key, who] of wanted) {
    const s = byKey.get(key);
    // A key nothing can measure would produce drafts that can never be approved into a slot.
    if (!s) { console.log('  skip ' + key.padEnd(28) + 'not in the skill graph'); continue; }
    if (s.active === false) { console.log('  skip ' + key.padEnd(28) + 'retired'); continue; }
    if (s.assessable === false) { console.log('  skip ' + key.padEnd(28) + 'not assessable'); continue; }
    eligible.push({ key, name: s.name, who });
  }

  const bands = BANDS.filter(b => !only || b === only);
  const keys = eligible.map(e => e.key);

  /**
   * ASK THE EVIDENCE SERVICE, NOT THE MAPPING COLLECTION.
   *
   * SkillEvidence has no `difficulty` field and never did — deliberately. The four content
   * families grade difficulty differently (items 1-5, questions easy/medium/hard, thinking
   * problems five bands of their own, CareerPilot's embedded questions none at all), so it
   * lives on the source document and the registry normalises it onto the item as it loads.
   *
   * This script originally counted `SkillEvidence.countDocuments({ difficulty: band })`,
   * which can only ever match zero. Every skill therefore reported an empty pool no matter
   * how many approved questions it had, and a second sweep bought a second set of questions
   * for skills that were already full — real money, silently, with the plan showing
   * "have 0" to justify it. API_FUNDAMENTALS reached 16 approved questions against a
   * target of 8 that way.
   *
   * findEvidenceCandidates resolves difficulty through the source exactly as the paper
   * generator does, so "have" now means what the student would actually be served. It also
   * batches: one query per band for every skill, rather than one per skill per band.
   */
  const pool = new Map<string, number>();          // `${skillKey}:${band}` -> approved questions
  for (const band of bands) {
    for (const p of await findEvidenceCandidates(tenantId, { skillKeys: keys, difficulty: band })) {
      pool.set(p.skillKey + ':' + band, p.items.length);
    }
  }

  const rows: { key: string; name: string; band: Band; have: number; pend: number; need: number;
                consumers: number; who: string }[] = [];
  for (const e of eligible) {
    for (const band of bands) {
      const have = pool.get(e.key + ':' + band) || 0;
      // Pending drafts count too: drafting on top of a full review queue spends money to
      // make the queue longer. Kept separate from `have` in the report, because one is a
      // question a student can be asked and the other is work waiting for a reviewer.
      const pend = await SkillQuestionDraft.countDocuments({
        tenantId, skillKey: e.key, difficulty: band.toLowerCase(), status: 'pending',
      });
      const need = Math.max(0, target[band] - (have + pend));
      // A skill nothing can measure at all cannot be assessed; one that is a question or two
      // short still works. --empty keeps only the former.
      if (emptyOnly && have + pend > 0) continue;
      if (need > 0) {
        rows.push({ key: e.key, name: e.name, band, have, pend, need,
                    consumers: e.who.size, who: [...e.who].join(', ') });
      }
    }
  }

  /**
   * WORST FIRST, NOT ALPHABETICAL.
   *
   * --limit exists so a sweep can be run in affordable batches, and with an alphabetical
   * order it spent them on whatever sorted early. In practice that meant topping a skill up
   * from 7 to 8 while C_POINTERS, CONDITIONALS_BASICS and the rest of the first-year
   * foundation sat at zero — skills that cannot be assessed at all, because a band with no
   * questions produces no paper.
   *
   * Emptiest first, then by how many roles and stages the skill unblocks, so the first batch
   * is always the one that makes the most students assessable. The key is the last tiebreak
   * only, to keep the order stable between runs.
   */
  rows.sort((a, b) =>
    (a.have + a.pend) - (b.have + b.pend)
    || b.consumers - a.consumers
    || a.key.localeCompare(b.key)
    || BANDS.indexOf(a.band) - BANDS.indexOf(b.band));
  const planned = limit > 0 ? rows.slice(0, limit) : rows;

  console.log('\n=== gaps ===');
  if (!planned.length) { console.log('  none — every skill meets the target'); await mongoose.disconnect(); return; }
  for (const r of planned) {
    console.log('  ' + r.key.padEnd(28) + r.band.padEnd(8)
      + 'pool ' + String(r.have).padStart(2)
      + '  pending ' + String(r.pend).padStart(2)
      + '  draft ' + String(r.need).padStart(2) + '   ' + r.who.slice(0, 40));
  }
  const calls = planned.length;
  const questions = planned.reduce((n, r) => n + r.need, 0);
  console.log('\n  ' + calls + ' AI calls, ' + questions + ' questions, roughly Rs '
    + Math.round(questions * 0.5) + ' of usage');
  if (limit > 0 && rows.length > planned.length) {
    // Said out loud: a silent truncation reads as "that was everything".
    console.log('  (--limit ' + limit + ' is holding back ' + (rows.length - planned.length) + ' more gaps)');
  }

  if (!apply) { console.log('\n[PLAN ONLY] nothing was drafted. Add --apply to run it.'); await mongoose.disconnect(); return; }

  console.log('\n=== drafting ===');
  let stored = 0, failed = 0;
  for (const r of planned) {
    try {
      const report = await generateDrafts({
        tenantId, skillKey: r.key,
        // LOWERCASE. The two collections disagree and always have: SkillEvidence stores
        // EASY/MEDIUM/HARD, SkillQuestionDraft stores easy/medium/hard with an enum that
        // rejects anything else. Passing the band straight through would have failed every
        // call — and the same mismatch once made a coverage report read zero for all 43
        // skills, so it is worth being explicit rather than tidy here.
        difficulty: r.band.toLowerCase() as any,
        count: r.need, generatedBy: 'script:draftForStageAndRoleGaps',
      } as any);
      stored += report.stored;
      console.log('  ' + r.key.padEnd(28) + r.band.padEnd(8)
        + 'asked ' + String(r.need).padStart(2)
        // `returned` is what the parser got out of the reply. Printed because a short reply
        // is otherwise invisible: stored 1 of 8 with nothing dropped looks like a filter
        // being strict, when it actually means the model returned one question — usually a
        // reply that hit the token ceiling mid-question and was salvaged down to what was
        // complete. Only the gap between asked and returned tells them apart.
        + '  returned ' + String(report.returned).padStart(2)
        + '  stored ' + String(report.stored).padStart(2)
        + (report.dropped.length ? '  dropped ' + report.dropped.length : '')
        + (report.flagged ? '  flagged ' + report.flagged : ''));
    } catch (e: any) {
      // One skill failing must not end the sweep — the rest are independent.
      failed += 1;
      console.log('  ' + r.key.padEnd(28) + r.band.padEnd(8) + 'FAILED: ' + String(e.message).slice(0, 90));
    }
  }

  console.log('\n=== done ===');
  console.log('  drafts stored : ' + stored);
  console.log('  calls failed  : ' + failed);
  console.log('  pending queue : ' + await SkillQuestionDraft.countDocuments({ tenantId, status: 'pending' }));
  console.log('\n  Nothing reaches a student until these are approved on');
  console.log('  /admin/passport/question-drafts.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
