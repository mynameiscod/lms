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
import SkillEvidence from '../models/SkillEvidence';
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
    console.error('Usage: draftForStageAndRoleGaps.ts <tenantId> [--apply] [--easy N] [--medium N] [--hard N] [--limit N] [--only DIFFICULTY]');
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
  const rows: { key: string; name: string; band: Band; have: number; need: number; who: string }[] = [];
  for (const [key, who] of wanted) {
    const s = byKey.get(key);
    // A key nothing can measure would produce drafts that can never be approved into a slot.
    if (!s) { console.log('  skip ' + key.padEnd(28) + 'not in the skill graph'); continue; }
    if (s.active === false) { console.log('  skip ' + key.padEnd(28) + 'retired'); continue; }
    if (s.assessable === false) { console.log('  skip ' + key.padEnd(28) + 'not assessable'); continue; }

    for (const band of BANDS) {
      if (only && band !== only) continue;
      // Approved questions AND pending drafts both count: drafting more on top of a full
      // review queue spends money to make the queue longer.
      const [have, pending] = await Promise.all([
        SkillEvidence.countDocuments({ tenantId, skillKey: key, difficulty: band }),
        SkillQuestionDraft.countDocuments({ tenantId, skillKey: key, difficulty: band.toLowerCase(), status: 'pending' }),
      ]);
      const total = have + pending;
      const need = Math.max(0, target[band] - total);
      if (need > 0) rows.push({ key, name: s.name, band, have: total, need, who: [...who].join(', ') });
    }
  }

  rows.sort((a, b) => a.key.localeCompare(b.key) || BANDS.indexOf(a.band) - BANDS.indexOf(b.band));
  const planned = limit > 0 ? rows.slice(0, limit) : rows;

  console.log('\n=== gaps ===');
  if (!planned.length) { console.log('  none — every skill meets the target'); await mongoose.disconnect(); return; }
  for (const r of planned) {
    console.log('  ' + r.key.padEnd(28) + r.band.padEnd(8) + 'have ' + String(r.have).padStart(2)
      + '  draft ' + String(r.need).padStart(2) + '   ' + r.who.slice(0, 44));
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
        + 'asked ' + String(r.need).padStart(2) + '  stored ' + String(report.stored).padStart(2)
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
