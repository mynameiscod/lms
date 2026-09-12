/**
 * How much of the existing content can actually serve the 310 Learning Units.
 *
 * READ ONLY. It never writes, and it is the gate the binder is meant to run behind: binding is
 * the only irreversible-feeling part of this phase, and a mapping made on a bad heuristic is
 * worse than no mapping at all — it looks answered.
 *
 * ── HOW A MAPPING IS CLASSIFIED ───────────────────────────────────────────────────────────
 *
 * The only signal a content row carries about WHICH unit it serves is its title. Its topicCode
 * and skillKeys place it against a TOPIC, and every unit of that topic shares both — so metadata
 * alone can never distinguish "Inheritance" from "Polymorphism". The title is the evidence.
 *
 * A unit's DISTINCTIVE WORDS are the words in its title that are not in its topic's title and
 * are not stopwords. "Semantic HTML" under topic "HTML" is distinctive on `semantic`.
 *
 *   EXACT     the row's title carries the distinctive words of exactly ONE unit
 *   SHARED    it carries the distinctive words of several
 *   BROAD     candidates exist, but the title names the topic rather than any unit
 *   UNMAPPED  no candidate unit at all
 *
 * BROAD IS THE EXPECTED ANSWER, NOT A FAILURE. Content written against a topic genuinely serves
 * every unit of that topic, and the resolver's topicCode fallback already expresses that. Forcing
 * it onto one unit would be a false precision: it would silently remove the material from the
 * other eleven units it was serving.
 *
 * —— THE HEURISTIC WAS WRONG ON ITS FIRST RUN, AND THAT IS WHY THIS AUDITS BEFORE IT BINDS ————
 *
 * The first version classified twelve rows as EXACT. Inspected by hand, all twelve were false:
 * "Pseudocode & Flowcharts — from the start" matched the unit "Flowcharts", and "Technical
 * Communication" matched "Communication Practice". Each is topic-level material that the unit is
 * only one part of, and binding it would have removed it from every sibling unit it serves.
 *
 * Two guards were added and the count went to zero, which is the correct answer for this content:
 * none of it was written against a single unit. See the classifier below.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import { roleOf, teaches } from '../data/contentBundlePolicy';
import {
  classifyContent, distinctiveWords, contentWords, stripDepthSuffix,
  MappableUnit, MappingClass,
} from '../services/unitContentMappingService';

dotenv.config();

const STAGE = 'foundation';

/**
 * Classification lives in unitContentMappingService and is IMPORTED, not restated.
 *
 * The binder writes what this audit reports. Two copies of the rule would eventually disagree,
 * and the disagreement would surface as a binding nobody predicted — the audit saying BROAD while
 * the binder wrote a unitCode.
 */
const words = contentWords;
const normaliseTitle = stripDepthSuffix;
type Classification = MappingClass;

/* ------------------------------------------------------------------ */

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: auditUnitContentCoverage.ts <tenantId>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const [units, library, curriculum, quizzes, assignments] = await Promise.all([
    CurriculumLearningUnit.find({ tenantId, stageKey: STAGE }).lean() as any,
    LearningContentLibrary.find({ tenantId }).lean() as any,
    LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).select('title topics modules').lean() as any,
    Quiz.find({ tenantId }).select('title primaryTech unitCode').lean() as any,
    // See the controller: Assignment scopes by `tenant` (ObjectId), not `tenantId`.
    mongoose.Types.ObjectId.isValid(tenantId)
      ? Assignment.find({ tenant: new mongoose.Types.ObjectId(tenantId) })
        .select('title primaryTech unitCode').lean() as any
      : Promise.resolve([] as any),
  ]);

  const topics = ((curriculum?.topics || []) as any[]).filter(t => t.topicCode);
  const topicByCode = new Map<string, any>(topics.map(t => [String(t.topicCode), t]));
  const moduleName = new Map<string, string>(
    ((curriculum?.modules || []) as any[]).map(m => [String(m.moduleCode), String(m.moduleName)]),
  );
  const topicTitleByCode = new Map<string, string>(topics.map(t => [String(t.topicCode), String(t.title)]));

  /** Units grouped by topic, and each unit's distinctive words against its topic. */
  const unitsByTopic = new Map<string, any[]>();
  const unitsBySkill = new Map<string, any[]>();
  const distinctive = new Map<string, string[]>();

  for (const unit of units as any[]) {
    const tc = String(unit.topicCode);
    unitsByTopic.set(tc, [...(unitsByTopic.get(tc) || []), unit]);
    for (const k of unit.skillKeys || []) {
      unitsBySkill.set(String(k), [...(unitsBySkill.get(String(k)) || []), unit]);
    }
    const topicWords = new Set(words(topicByCode.get(tc)?.title || ''));
    distinctive.set(String(unit.unitCode), words(unit.title).filter(w => !topicWords.has(w)));
  }

  /* ---- classify every content row ---------------------------------------- */

  interface Mapping {
    contentId: string;
    title: string;
    type: string;
    isPublished: boolean;
    classification: Classification;
    matchedUnits: string[];
    via: 'topicCode' | 'skillKeys' | 'none';
  }

  const mappings: Mapping[] = [];

  for (const row of library as any[]) {
    const result = classifyContent({
      content: row,
      unitsByTopic: unitsByTopic as Map<string, MappableUnit[]>,
      unitsBySkill: unitsBySkill as Map<string, MappableUnit[]>,
      topicTitleByCode,
    });

    mappings.push({
      contentId: String(row._id),
      title: row.title,
      type: row.type,
      isPublished: row.isPublished !== false,
      classification: result.classification,
      matchedUnits: result.matchedUnitCodes,
      via: result.via,
    });
  }

  /* ---- per-unit coverage -------------------------------------------------- */

  const publishedLibrary = (library as any[]).filter(r => r.isPublished !== false);

  interface Coverage {
    unit: any;
    exact: any[];
    inherited: any[];
    types: Set<string>;
    hasTeaching: boolean;
    hasPractice: boolean;
    hasAssessment: boolean;
  }

  const exactByUnit = new Map<string, string[]>();
  for (const m of mappings) {
    if (m.classification !== 'EXACT') continue;
    const code = m.matchedUnits[0];
    exactByUnit.set(code, [...(exactByUnit.get(code) || []), m.contentId]);
  }

  const quizByUnit = new Map<string, number>();
  for (const q of [...(quizzes as any[]), ...(assignments as any[])]) {
    if (!q.unitCode) continue;
    quizByUnit.set(String(q.unitCode), (quizByUnit.get(String(q.unitCode)) || 0) + 1);
  }

  const coverage: Coverage[] = (units as any[]).map(unit => {
    const code = String(unit.unitCode);
    const exactIds = new Set(exactByUnit.get(code) || []);
    const exact = publishedLibrary.filter(r => exactIds.has(String(r._id)));

    // What the resolver would serve today: unitCode, then topicCode, then skills.
    let inherited = publishedLibrary.filter(r => String(r.unitCode || '') === code);
    if (!inherited.length) {
      inherited = publishedLibrary.filter(r => String(r.topicCode || '') === String(unit.topicCode));
    }
    if (!inherited.length) {
      const skills = new Set((unit.skillKeys || []).map((k: string) => String(k)));
      inherited = publishedLibrary.filter(r => (r.skillKeys || []).some((k: string) => skills.has(String(k))));
    }

    const pool = exact.length ? exact : inherited;
    const types = new Set<string>(pool.map(r => String(r.type)));

    return {
      unit,
      exact,
      inherited,
      types,
      hasTeaching: pool.some(r => teaches(r.type)),
      hasPractice: pool.some(r => roleOf(r.type) === 'PRACTISE'),
      hasAssessment: (quizByUnit.get(code) || 0) > 0,
    };
  });

  /* ---- report ------------------------------------------------------------- */

  const line = (n = 80) => console.log('-'.repeat(n));
  const pct = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(1)}%` : '0%';

  console.log(`\nYEAR-1 LEARNING UNIT CONTENT COVERAGE`);
  console.log(`${curriculum?.title}  ·  tenant ${tenantId}`);
  line();

  const counts: Record<Classification, number> = { EXACT: 0, SHARED: 0, BROAD: 0, UNMAPPED: 0 };
  for (const m of mappings) counts[m.classification]++;

  console.log('  CONTENT ROWS, CLASSIFIED');
  console.log(`    total                  ${library.length}`);
  for (const k of ['EXACT', 'SHARED', 'BROAD', 'UNMAPPED'] as Classification[]) {
    console.log(`    ${k.padEnd(22)}${String(counts[k]).padStart(4)}   ${pct(counts[k], library.length)}`);
  }
  console.log(`    published              ${publishedLibrary.length}   (${library.length - publishedLibrary.length} unpublished, invisible to the resolver)`);

  line();
  console.log('  UNIT COVERAGE');
  const withExact = coverage.filter(c => c.exact.length);
  const inheritedOnly = coverage.filter(c => !c.exact.length && c.inherited.length);
  const empty = coverage.filter(c => !c.exact.length && !c.inherited.length);
  const teachable = coverage.filter(c => c.hasTeaching);
  const withPractice = coverage.filter(c => c.hasPractice);
  const withAssessment = coverage.filter(c => c.hasAssessment);

  console.log(`    total units            ${coverage.length}`);
  console.log(`    with EXACT content     ${withExact.length}   ${pct(withExact.length, coverage.length)}`);
  console.log(`    inherited only         ${inheritedOnly.length}   ${pct(inheritedOnly.length, coverage.length)}`);
  console.log(`    no usable content      ${empty.length}   ${pct(empty.length, coverage.length)}`);
  console.log(`    something that teaches ${teachable.length}   ${pct(teachable.length, coverage.length)}`);
  console.log(`    something to practise  ${withPractice.length}   ${pct(withPractice.length, coverage.length)}`);
  console.log(`    assessment/checkpoint  ${withAssessment.length}   ${pct(withAssessment.length, coverage.length)}`);

  line();
  console.log('  COVERAGE BY CONTENT TYPE  (units for which this type resolves)');
  const ALL_TYPES = ['video', 'notes', 'worked_example', 'interactive_lesson', 'interactive_activity',
    'tech_qa', 'practice_theory', 'practice_coding', 'aptitude'];
  for (const t of ALL_TYPES) {
    const n = coverage.filter(c => c.types.has(t)).length;
    const bar = '#'.repeat(Math.round((n / Math.max(1, coverage.length)) * 30));
    console.log(`    ${t.padEnd(22)}${String(n).padStart(4)}  ${pct(n, coverage.length).padStart(6)}  ${bar}`);
  }
  console.log(`    quiz                  ${String((quizzes as any[]).length).padStart(4)}  in tenant`);
  console.log(`    assignment            ${String((assignments as any[]).length).padStart(4)}  in tenant`);

  line();
  console.log('  COVERAGE BY MODULE');
  const byModule = new Map<string, Coverage[]>();
  for (const c of coverage) {
    const m = String(c.unit.moduleCode || 'UNGROUPED');
    byModule.set(m, [...(byModule.get(m) || []), c]);
  }
  for (const [code, list] of [...byModule.entries()].sort()) {
    const t = list.filter(c => c.hasTeaching).length;
    const p = list.filter(c => c.hasPractice).length;
    console.log(`    ${String(moduleName.get(code) || code).slice(0, 34).padEnd(36)}`
      + `${String(list.length).padStart(4)} units   teach ${String(t).padStart(3)}   practise ${String(p).padStart(3)}   ${pct(t, list.length).padStart(6)}`);
  }

  line();
  console.log('  COVERAGE BY UNIT TYPE');
  const byType = new Map<string, Coverage[]>();
  for (const c of coverage) {
    const t = String(c.unit.unitType);
    byType.set(t, [...(byType.get(t) || []), c]);
  }
  for (const [t, list] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const teach = list.filter(c => c.hasTeaching).length;
    const prac = list.filter(c => c.hasPractice).length;
    console.log(`    ${t.padEnd(16)}${String(list.length).padStart(4)} units   teach ${String(teach).padStart(3)}   practise ${String(prac).padStart(3)}`);
  }

  /* ---- content-quality findings ------------------------------------------- */

  line();
  console.log('  CONTENT FINDINGS');

  // Duplicates: same normalised title and type.
  const byKey = new Map<string, any[]>();
  for (const r of library as any[]) {
    const k = `${r.type}::${normaliseTitle(r.title).toLowerCase().trim()}`;
    byKey.set(k, [...(byKey.get(k) || []), r]);
  }
  const dupes = [...byKey.entries()].filter(([, v]) => v.length > 1);
  console.log(`    duplicate/equivalent   ${dupes.length} groups covering ${dupes.reduce((n, [, v]) => n + v.length, 0)} rows`);
  for (const [k, v] of dupes.slice(0, 5)) {
    console.log(`      ${v.length}x  ${k.split('::')[1].slice(0, 56)}`);
  }

  const broadRows = mappings.filter(m => m.classification === 'BROAD');
  console.log(`    broad (topic-level)    ${broadRows.length} rows spanning whole topics`);

  // topicCode pointing at something the curriculum does not have.
  const knownTopics = new Set(topics.map(t => String(t.topicCode)));
  const badTopic = (library as any[]).filter(r => r.topicCode && !knownTopics.has(String(r.topicCode)));
  console.log(`    unknown topicCode      ${badTopic.length}`);
  for (const r of badTopic.slice(0, 5)) console.log(`      ${String(r.topicCode).padEnd(24)}${String(r.title).slice(0, 46)}`);

  // skillKeys that no unit teaches.
  const unitSkills = new Set<string>();
  for (const u of units as any[]) for (const k of u.skillKeys || []) unitSkills.add(String(k));
  const orphanSkill = (library as any[]).filter(r =>
    (r.skillKeys || []).length && !(r.skillKeys || []).some((k: string) => unitSkills.has(String(k))));
  console.log(`    skills no unit teaches ${orphanSkill.length} rows`);
  const orphanKeys = new Set<string>();
  for (const r of orphanSkill) for (const k of r.skillKeys || []) if (!unitSkills.has(String(k))) orphanKeys.add(String(k));
  if (orphanKeys.size) console.log(`      ${[...orphanKeys].slice(0, 12).join(', ')}`);

  const unpublishedBlocking = coverage.filter(c => {
    if (c.hasTeaching) return false;
    const unpub = (library as any[]).filter(r => r.isPublished === false
      && (String(r.topicCode || '') === String(c.unit.topicCode)
        || (r.skillKeys || []).some((k: string) => (c.unit.skillKeys || []).includes(String(k)))));
    return unpub.some(r => teaches(r.type));
  });
  console.log(`    units blocked only by unpublished content   ${unpublishedBlocking.length}`);

  /* ---- what would be bound ------------------------------------------------ */

  line();
  const bindable = mappings.filter(m => m.classification === 'EXACT' && m.isPublished);
  console.log('  BINDING PLAN');
  console.log(`    EXACT and published    ${bindable.length}  would be bound to a unitCode`);
  console.log(`    EXACT but unpublished  ${counts.EXACT - bindable.length}  left alone until published`);
  console.log(`    SHARED                 ${counts.SHARED}  NOT bound — fallback already serves them`);
  console.log(`    BROAD                  ${counts.BROAD}  NOT bound — binding would remove them from every other unit`);
  console.log(`    UNMAPPED               ${counts.UNMAPPED}  no defensible relationship`);
  for (const m of bindable.slice(0, 15)) {
    console.log(`      ${m.matchedUnits[0].padEnd(30)}${String(m.title).slice(0, 44)}`);
  }

  /* ---- distinctness: the number that matters most ------------------------- */

  line();
  console.log('  DISTINCTNESS \u2014 read this before believing any coverage figure above');

  /**
   * How many units resolve the SAME bundle as each other.
   *
   * Every coverage number above reads 100%, and it is true and useless. Content written against a
   * TOPIC is inherited by every unit of that topic, so all twelve HTML units "have a video" \u2014 the
   * same video. A composer trusting hasTeaching would schedule twelve days that each open the
   * identical asset, and the student would meet one lesson twelve times.
   *
   * The gap between the distinct-bundle count and the unit count is the authoring debt, stated
   * where nobody can mistake a fallback for a lesson.
   */
  const signature = (c: Coverage): string =>
    (c.exact.length ? c.exact : c.inherited).map(r => String(r._id)).sort().join(',');

  const bySignature = new Map<string, Coverage[]>();
  for (const c of coverage) {
    const sig = signature(c);
    bySignature.set(sig, [...(bySignature.get(sig) || []), c]);
  }

  const distinctBundles = bySignature.size;
  const sharedGroups = [...bySignature.values()].filter(g => g.length > 1);
  const unitsSharing = sharedGroups.reduce((n, g) => n + g.length, 0);

  const distinctTeaching = new Set<string>();
  for (const c of coverage) {
    for (const r of (c.exact.length ? c.exact : c.inherited)) {
      if (teaches(r.type)) distinctTeaching.add(String(r._id));
    }
  }

  console.log(`    units                          ${coverage.length}`);
  console.log(`    DISTINCT bundles behind them   ${distinctBundles}   ${pct(distinctBundles, coverage.length)}`);
  console.log(`    units sharing a bundle         ${unitsSharing}   ${pct(unitsSharing, coverage.length)}`);
  console.log(`    largest shared group           ${Math.max(0, ...sharedGroups.map(g => g.length))} units on one bundle`);
  console.log(`    distinct teaching assets       ${distinctTeaching.size}  serving ${coverage.length} units`);
  console.log(`    units per teaching asset       ${(coverage.length / Math.max(1, distinctTeaching.size)).toFixed(1)}x`);

  console.log('\n    largest shared bundles:');
  for (const g of sharedGroups.sort((a, b) => b.length - a.length).slice(0, 6)) {
    const items = (g[0].exact.length ? g[0].exact : g[0].inherited).length;
    console.log(`      ${String(g.length).padStart(3)} units share ${String(items).padStart(2)} asset(s)   `
      + `${String(g[0].unit.topicCode).padEnd(22)}e.g. ${String(g[0].unit.title).slice(0, 28)}`);
  }

  line();
  console.log('  WHAT THIS MEANS');
  console.log(`    "${teachable.length} of ${coverage.length} teachable" is inheritance, not authorship.`);
  console.log(`    ${distinctTeaching.size} distinct lessons are standing in for ${coverage.length} units \u2014 ${(coverage.length / Math.max(1, distinctTeaching.size)).toFixed(1)}x reuse.`);
  console.log(`    Units with content written FOR them: ${withExact.length} of ${coverage.length}.`);
  console.log('');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
