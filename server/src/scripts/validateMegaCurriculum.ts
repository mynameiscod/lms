/**
 * Validate the Year-1 mega curriculum dataset before any of it is written.
 *
 * READ ONLY. It never writes, and it is the gate the importer is meant to be run behind: a
 * dataset of three hundred units is exactly the size where a systematic mistake — a broken
 * prerequisite, a topic quietly left as one unit, a placeholder title — is invisible by
 * inspection and obvious by counting.
 *
 * WHAT IT REFUSES, AND WHY EACH ONE MATTERS
 *
 *   placeholder titles      "Python Basics" is the original bug one level down: it hides four
 *                           lessons behind one name and cannot be scheduled sensibly.
 *   unknown topic codes     a unit pointing at a topic the curriculum does not have is orphaned
 *                           the moment it is written.
 *   broken prerequisites    a unit waiting on a sibling that does not exist can never unlock.
 *   prerequisite cycles     two units each waiting for the other lock each other permanently,
 *                           and nothing downstream would report it.
 *   duplicate unit codes    the code is the identity a student's history hangs on.
 *
 * WHAT IT ONLY WARNS ABOUT. Thinness and breadth are judgements, not faults. A topic with three
 * units may be correctly small; one with sixteen may be correctly large. They are reported so a
 * human decides, rather than silently accepted or silently rejected.
 *
 *   npx ts-node src/scripts/validateMegaCurriculum.ts <tenantId>
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import { YEAR1 } from '../seeds/careerPilot/year1MegaCurriculum';

dotenv.config();

const STAGE = 'foundation';

/** Titles that hide several lessons behind one name. The exact failure this phase exists to end. */
const PLACEHOLDER = /\b(basics|fundamentals|introduction to programming|overview|misc|general|part \d)\b/i;

/** A title may legitimately contain these even though they match above. */
const ALLOWED_PLACEHOLDER = new Set([
  'Introduction to HTML',   // genuinely one lesson: what HTML is
  'C Fundamentals',         // the topic's own name, not a unit's
]);

const MIN_UNITS = 4;
const MAX_UNITS = 15;

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: validateMegaCurriculum.ts <tenantId>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const curriculum = await LearningCurriculum
    .findOne({ tenantId, adaptiveStage: STAGE }).select('title topics modules').lean() as any;
  if (!curriculum) {
    console.error(`No '${STAGE}' curriculum for tenant ${tenantId}.`);
    process.exit(1);
  }

  const topics = ((curriculum.topics || []) as any[]).filter(t => t.topicCode);
  const topicByCode = new Map<string, any>(topics.map(t => [String(t.topicCode), t]));
  const moduleName = new Map<string, string>(
    ((curriculum.modules || []) as any[]).map(m => [String(m.moduleCode), String(m.moduleName)]),
  );

  const errors: string[] = [];
  const warnings: string[] = [];

  const allCodes = new Set<string>();
  const perTopic: { topicCode: string; title: string; moduleCode: string; units: number; minutes: number }[] = [];
  const categoryCount: Record<string, number> = {};
  const typeCount: Record<string, number> = {};
  let totalUnits = 0;
  let totalMinutes = 0;

  for (const [topicCode, seed] of Object.entries(YEAR1)) {
    const topic = topicByCode.get(topicCode);
    if (!topic) {
      errors.push(`${topicCode} is not a topic of "${curriculum.title}".`);
      continue;
    }

    const slugs = new Set(seed.units.map(u => u.slug));
    let minutes = 0;

    for (const unit of seed.units) {
      const unitCode = `${topicCode}_${unit.slug}`;

      if (allCodes.has(unitCode)) errors.push(`duplicate unit code ${unitCode}`);
      allCodes.add(unitCode);

      if (PLACEHOLDER.test(unit.title) && !ALLOWED_PLACEHOLDER.has(unit.title)) {
        errors.push(`${unitCode}: placeholder title "${unit.title}"`);
      }
      if (!unit.learningOutcomes.length) errors.push(`${unitCode}: no learning outcome`);
      if (!unit.estimatedMinutes || unit.estimatedMinutes < 15) {
        errors.push(`${unitCode}: implausible duration ${unit.estimatedMinutes}`);
      }
      if (unit.estimatedMinutes > 180) {
        warnings.push(`${unitCode}: ${unit.estimatedMinutes} min — longer than a sitting, consider splitting`);
      }

      for (const dep of unit.after || []) {
        if (!slugs.has(dep)) {
          errors.push(`${unitCode}: waits on "${dep}", which is not a unit of ${topicCode}`);
        }
      }

      minutes += unit.estimatedMinutes;
      typeCount[unit.unitType || 'CONCEPT'] = (typeCount[unit.unitType || 'CONCEPT'] || 0) + 1;
    }

    /**
     * Cycles, found per topic because prerequisites are sibling-scoped.
     *
     * Depth-first with a colour mark. A pair of units each waiting on the other would lock both
     * forever, and the composer has no way to notice — it would simply never schedule either.
     */
    const state = new Map<string, 0 | 1 | 2>();
    const bySlug = new Map(seed.units.map(u => [u.slug, u]));
    const walk = (slug: string, path: string[]): void => {
      if (state.get(slug) === 2) return;
      if (state.get(slug) === 1) {
        errors.push(`${topicCode}: prerequisite cycle ${[...path, slug].join(' -> ')}`);
        return;
      }
      state.set(slug, 1);
      for (const dep of bySlug.get(slug)?.after || []) {
        if (bySlug.has(dep)) walk(dep, [...path, slug]);
      }
      state.set(slug, 2);
    };
    for (const unit of seed.units) walk(unit.slug, []);

    if (seed.units.length < MIN_UNITS) {
      warnings.push(`${topicCode} "${topic.title}" has only ${seed.units.length} units — too thin?`);
    }
    if (seed.units.length > MAX_UNITS) {
      warnings.push(`${topicCode} "${topic.title}" has ${seed.units.length} units — should it be two topics?`);
    }

    categoryCount[seed.category] = (categoryCount[seed.category] || 0) + seed.units.length;
    totalUnits += seed.units.length;
    totalMinutes += minutes;
    perTopic.push({
      topicCode, title: topic.title, moduleCode: String(topic.moduleCode || ''),
      units: seed.units.length, minutes,
    });
  }

  /** Topics in the curriculum that the dataset does not cover at all. */
  const missing = topics.filter(t => !YEAR1[String(t.topicCode)]);

  /* ---------------------------------------------------------------- */

  const line = (n = 78) => console.log('-'.repeat(n));

  console.log(`\nYEAR-1 MEGA CURRICULUM — VALIDATION`);
  console.log(`${curriculum.title}  ·  tenant ${tenantId}`);
  line();

  console.log(`  modules                  ${moduleName.size}`);
  console.log(`  topics in curriculum     ${topics.length}`);
  console.log(`  topics decomposed        ${perTopic.length}${missing.length ? `   (${missing.length} NOT covered)` : ''}`);
  console.log(`  proposed learning units  ${totalUnits}`);
  console.log(`  total learning minutes   ${totalMinutes.toLocaleString()}  (${Math.round(totalMinutes / 60)} hours)`);
  console.log(`  average per topic        ${(totalUnits / Math.max(1, perTopic.length)).toFixed(1)} units`);
  console.log(`  average per unit         ${Math.round(totalMinutes / Math.max(1, totalUnits))} minutes`);
  console.log(`  at 45 min/day            ${Math.round(totalMinutes / 45)} days of material`);
  console.log(`  a 90-day plan draws from ${((90 / (totalMinutes / 45)) * 100).toFixed(0)}% of it`);

  line();
  console.log('  CATEGORY MIX');
  for (const [k, v] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(14)}${String(v).padStart(5)}  ${((v / totalUnits) * 100).toFixed(1)}%`);
  }

  console.log('\n  UNIT TYPE MIX');
  for (const [k, v] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(14)}${String(v).padStart(5)}  ${((v / totalUnits) * 100).toFixed(1)}%`);
  }

  line();
  console.log('  UNITS PER TOPIC');
  let lastModule = '';
  for (const t of perTopic) {
    if (t.moduleCode !== lastModule) {
      console.log(`\n    ${moduleName.get(t.moduleCode) || t.moduleCode}`);
      lastModule = t.moduleCode;
    }
    const flag = t.units < MIN_UNITS ? ' thin' : t.units > MAX_UNITS ? ' broad' : '';
    console.log(`      ${String(t.units).padStart(3)}  ${String(t.minutes).padStart(5)}m  ${t.topicCode.padEnd(24)}${t.title}${flag}`);
  }

  line();
  if (missing.length) {
    console.log(`  TOPICS NOT DECOMPOSED (${missing.length})`);
    for (const t of missing) console.log(`    ${String(t.topicCode).padEnd(24)}${t.title}`);
    line();
  }

  console.log(`  PREREQUISITE CHAIN       ${errors.some(e => /prerequisite|waits on/.test(e)) ? 'BROKEN' : 'valid'}`);
  console.log(`  DUPLICATE CODES          ${errors.some(e => /duplicate/.test(e)) ? 'FOUND' : 'none'}`);
  console.log(`  PLACEHOLDER TITLES       ${errors.some(e => /placeholder/.test(e)) ? 'FOUND' : 'none'}`);

  if (warnings.length) {
    console.log(`\n  WARNINGS (${warnings.length}) — judgement calls, not faults`);
    for (const w of warnings) console.log(`    · ${w}`);
  }

  if (errors.length) {
    console.log(`\n  ERRORS (${errors.length})`);
    for (const e of errors) console.log(`    ! ${e}`);
    line();
    console.log('  VALIDATION FAILED — nothing should be imported until these are fixed.\n');
    await mongoose.disconnect();
    process.exit(1);
  }

  line();
  console.log('  VALIDATION PASSED — safe to import.\n');
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
