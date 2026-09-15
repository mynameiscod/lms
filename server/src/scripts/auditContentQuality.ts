/**
 * Phase 20 — is the authored Year-1 content actually production quality?
 *
 * READ ONLY. It writes nothing and connects only to read.
 *
 * ── WHY A SEPARATE AUDIT FROM reportUnitReadiness ─────────────────────────────────────────
 *
 * Readiness answers "does this unit have the PIECES it needs" — a teaching row, a practice row,
 * a bound assessment. It counts. It cannot answer "is what is in those pieces any good", and it
 * deliberately does not try: the ladder is a structural gate and structural gates should stay
 * cheap and total.
 *
 * That leaves a real gap, and the gap is not theoretical. A quiz row with zero questions counts
 * as a bound assessment and lifts a unit to READY; a notes row of forty words counts as teaching.
 * Everything downstream then treats the unit as teachable. This audit is the check that the
 * pieces have something in them.
 *
 * ── IT AUDITS THE AUTHORED SOURCE AND THE DATABASE, AND COMPARES THEM ─────────────────────
 *
 * The bundles in seeds/careerPilot are the source of truth an author edits. The database is what
 * a student would receive. Auditing only one of them misses the entire class of defect where the
 * seed writes a shape the model does not store — which is exactly how the checkpoint quizzes
 * came to hold no questions. So both are read, and divergence is itself a finding.
 *
 * ── SEVERITY ──────────────────────────────────────────────────────────────────────────────
 *
 *   BLOCKER   a student would hit this: missing content, an empty assessment, broken markup
 *   DEFECT    genuinely wrong or misleading, but not an immediate break
 *   WARN      worth a human look; may be legitimate
 *
 * Units that are not READY are NOT audited for missing unit-specific content. They are allowed
 * to stand on inherited topic content. They ARE audited for anything that would break a unit
 * that is READY — a prerequisite edge into them, most of all.
 *
 *   npx ts-node src/scripts/auditContentQuality.ts <tenantId>
 *   npx ts-node src/scripts/auditContentQuality.ts <tenantId> --all      every finding, unelided
 *   npx ts-node src/scripts/auditContentQuality.ts <tenantId> --check=QUIZ_EMPTY
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import SkillEvidence from '../models/SkillEvidence';
import { evaluateReadiness, UnitReadiness, READINESS_ORDER } from '../data/unitReadinessPolicy';
import { compositionRoleOf } from '../data/compositionShapePolicy';
import { DIRECTION_KEYS, DIRECTION_ALL } from '../data/careerDirectionPolicy';
import { AUTHORABLE_SUITABLE_STATES } from '../data/adaptiveCurriculumPolicy';
import { findDuplication, identifyingWordsFor } from '../services/contentDuplicationService';
import { buildPrerequisiteGraph, findPrerequisiteCycles } from '../data/unitPrerequisiteGraph';
import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';

dotenv.config();

const STAGE = 'foundation';

type Severity = 'BLOCKER' | 'DEFECT' | 'WARN';

interface Finding {
  check: string;
  severity: Severity;
  unitCode: string;
  detail: string;
}

const findings: Finding[] = [];
const add = (check: string, severity: Severity, unitCode: string, detail: string) => {
  findings.push({ check, severity, unitCode, detail });
};

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * TEXT CHECKS
 *
 * Applied to every authored string a student can read. Each one exists because it describes
 * something a reader would actually notice, not because it is easy to detect.
 * ════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * Unfinished-work markers.
 *
 * `PLACEHOLDER` is matched only in caps or in brackets, never as the ordinary word. "A
 * placeholder is not a label" is the correct sentence in every forms and accessibility unit in
 * this curriculum, and the first version of this check reported fourteen of them as defects.
 *
 * A QUOTED marker is a subject, not a leftover: the grep unit teaches `grep -rl "TODO" src/`,
 * which is the single most natural example of the command there is.
 */
const PLACEHOLDER = /(?<!["'`])\b(TODO|TBD|FIXME)\b(?!["'`])|\b(lorem ipsum|coming soon|to be written)\b|\bPLACEHOLDER\b|[<[]\s*placeholder\s*[>\]]/;

/**
 * An authoring variable that survived into stored text.
 *
 * Not every interpolation is a bug — shell and JavaScript lessons demonstrate it on purpose, and
 * those were escaped deliberately. What is never legitimate is the NAME of a seed-script binding.
 */
const LEAKED_BINDING = /\$\{\s*(unit|bundle|b|c|q|t|i)\s*[.}[]/;

/** A fence count that does not pair leaves the rest of the page inside a code block. */
const fenceUnbalanced = (text: string): boolean =>
  ((text.match(/```/g) || []).length % 2) !== 0;

/**
 * An odd number of inline backticks in a paragraph, outside code.
 *
 * COUNTED PER PARAGRAPH, NOT PER LINE. Inline code spans a soft line break perfectly well and
 * this prose wraps at ninety-odd columns, so a `git status` split across two lines is correct
 * markdown — the per-line version of this check reported three of those as defects.
 *
 * Indented code blocks are skipped alongside fenced ones, because a shell transcript quotes
 * with a backtick on purpose: find's "unknown predicate" error is real output, not markup.
 */
const inlineTickUnbalanced = (text: string): string | null => {
  let inFence = false;
  let para: string[] = [];
  const paragraphs: string[][] = [];
  for (const raw of String(text).split('\n')) {
    if (raw.trim().startsWith('```')) { inFence = !inFence; continue; }
    if (inFence || /^ {4,}|^\t/.test(raw)) continue;
    if (!raw.trim()) { if (para.length) paragraphs.push(para); para = []; continue; }
    para.push(raw);
  }
  if (para.length) paragraphs.push(para);
  for (const p of paragraphs) {
    const joined = p.join(' ');
    if (((joined.match(/`/g) || []).length % 2) !== 0) return joined.trim().slice(0, 90);
  }
  return null;
};

/** Scripts this curriculum is not written in. Their presence is corruption, never content. */
const FOREIGN_SCRIPT = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

/**
 * Text that stops mid-thought.
 *
 * A body may legitimately end on a bullet, a code line or a closing bracket, so the last LINE
 * decides how to judge the ending rather than the last character alone. One body ends on
 * "- A loop with no exit condition drawn" and another on an indented SQL comment; both are
 * finished, and the first version of this check called both of them truncated.
 */
const truncated = (text: string): boolean => {
  const t = String(text).trimEnd();
  if (!t) return true;
  if (/(\.\.\.|…)$/.test(t)) return true;
  const last = t.split('\n').pop() || '';
  if (/^\s*([-*+]|\d+\.)\s/.test(last)) return false;   // a list item
  if (/^ {4,}|^\t/.test(last)) return false;            // an indented code line
  if (last.trim() === '```') return false;              // a closing fence
  return !/[.!?:;)\]`>|"']$/.test(t);
};

const URLS = /https?:\/\/[^\s)\]"'`]+/g;

/** Hosts that are real, stable and safe to send a student to. Anything else needs a human. */
const KNOWN_HOSTS = [
  'developer.mozilla.org', 'www.w3.org', 'w3.org', 'docs.python.org', 'git-scm.com',
  'nodejs.org', 'developer.chrome.com', 'www.iso.org', 'html.spec.whatwg.org',
  'www.rfc-editor.org', 'example.com', 'www.example.com', 'localhost',
];

const VIDEO_HOST = /youtube\.com|youtu\.be|vimeo\.com|b-cdn\.net|iframe\.mediadelivery\.net/i;

interface TextSite { unitCode: string; where: string; text: string }

function auditText(site: TextSite): void {
  const { unitCode, where } = site;
  const t = String(site.text || '');
  if (!t.trim()) { add('TEXT_EMPTY', 'BLOCKER', unitCode, `${where} is empty`); return; }

  const ph = t.match(PLACEHOLDER);
  if (ph) add('TEXT_PLACEHOLDER', 'BLOCKER', unitCode, `${where}: "${ph[0]}"`);

  const lb = t.match(LEAKED_BINDING);
  if (lb) add('TEXT_LEAKED_BINDING', 'BLOCKER', unitCode, `${where}: ${lb[0]}`);

  /*
   * `null`, `undefined` and `NaN` are ordinary subjects in programming prose — the DOM forms
   * unit teaches `Number("abc")` and `Number.isNaN` by name. Only a rendering artifact is
   * evidence of a bug rather than of a topic.
   */
  if (t.includes('[object Object]')) add('TEXT_BROKEN_VALUE', 'BLOCKER', unitCode, `${where}: [object Object]`);

  const foreign = t.match(FOREIGN_SCRIPT);
  if (foreign) {
    const at = t.indexOf(foreign[0]);
    add('TEXT_FOREIGN_SCRIPT', 'BLOCKER', unitCode,
      `${where}: "${foreign[0]}" in "${t.slice(Math.max(0, at - 30), at + 30).replace(/\n/g, ' ')}"`);
  }

  if (fenceUnbalanced(t)) add('TEXT_UNBALANCED_FENCE', 'BLOCKER', unitCode, `${where}: odd number of code fences`);

  const tick = inlineTickUnbalanced(t);
  if (tick) add('TEXT_UNBALANCED_TICK', 'DEFECT', unitCode, `${where}: "${tick}"`);

  if (t.includes('\\`')) add('TEXT_ESCAPE_ARTIFACT', 'DEFECT', unitCode, `${where}: literal backslash-backtick`);
  if (/\\n[a-zA-Z]/.test(t)) add('TEXT_ESCAPE_ARTIFACT', 'DEFECT', unitCode, `${where}: literal newline escape in prose`);

  if (truncated(t)) add('TEXT_TRUNCATED', 'DEFECT', unitCode, `${where}: ends "...${t.trimEnd().slice(-50)}"`);

  for (const url of t.match(URLS) || []) {
    let host = '?';
    try { host = new URL(url).hostname; } catch { host = '?'; }
    if (VIDEO_HOST.test(url)) add('TEXT_VIDEO_LINK', 'BLOCKER', unitCode, `${where}: video link ${url}`);
    else if (!KNOWN_HOSTS.includes(host)) add('TEXT_UNVERIFIED_URL', 'WARN', unitCode, `${where}: ${url}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * QUESTION CHECKS
 * ════════════════════════════════════════════════════════════════════════════════════════ */

/** For comparing PROSE, where punctuation carries no meaning. */
const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * For comparing OPTIONS, where punctuation is frequently the entire question.
 *
 * `if total > 500:` and `if total = 500:` differ by one character and that character is what
 * the question asks about; `[]` and `{}` are distinct Python falsy values; `index.html` and
 * `./index.html` are different paths. Stripping punctuation collapsed all three pairs, and the
 * prose normaliser reported sixteen duplicate options and six blank ones that were neither.
 */
const normOption = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

interface AuditableQuestion {
  stem: string;
  options: { text: string; isCorrect: boolean }[];
  explanation?: string;
}

/**
 * The defects that make a multiple-choice question unfit to measure anything.
 *
 * ANSWER-LENGTH CLUE is the one worth explaining. Authors elaborate the correct option and write
 * the distractors quickly, so the longest option is the answer far more often than chance — and
 * students learn that before they learn the material. Flagged when the correct option is more
 * than 1.6x the mean of the rest AND is the longest.
 */
function auditQuestion(unitCode: string, where: string, q: AuditableQuestion): void {
  const opts = q.options || [];
  const correct = opts.filter(o => o.isCorrect);
  const stem = String(q.stem || '');

  if (!stem.trim()) add('Q_NO_STEM', 'BLOCKER', unitCode, where);
  if (opts.length < 3) add('Q_TOO_FEW_OPTIONS', 'DEFECT', unitCode, `${where}: ${opts.length} options — "${stem.slice(0, 60)}"`);
  if (correct.length === 0) add('Q_NO_CORRECT', 'BLOCKER', unitCode, `${where}: no correct option — "${stem.slice(0, 60)}"`);
  if (correct.length > 1) add('Q_MULTI_CORRECT', 'BLOCKER', unitCode, `${where}: ${correct.length} correct in a single-answer question — "${stem.slice(0, 60)}"`);

  const seen = new Set<string>();
  for (const o of opts) {
    const k = normOption(o.text);
    if (!k) add('Q_EMPTY_OPTION', 'BLOCKER', unitCode, `${where}: blank option — "${stem.slice(0, 60)}"`);
    if (seen.has(k)) add('Q_DUPLICATE_OPTION', 'DEFECT', unitCode, `${where}: "${String(o.text).slice(0, 50)}" appears twice`);
    seen.add(k);
  }

  const exp = String(q.explanation || '').trim();
  if (!exp) add('Q_NO_EXPLANATION', 'DEFECT', unitCode, `${where}: "${stem.slice(0, 60)}"`);
  else if (exp.length < 25) add('Q_THIN_EXPLANATION', 'WARN', unitCode, `${where}: ${exp.length} chars — "${exp}"`);
  else if (norm(exp) === norm(stem)) add('Q_ECHO_EXPLANATION', 'DEFECT', unitCode, `${where}: explanation restates the question`);

  if (correct.length === 1 && opts.length >= 3) {
    const c = String(correct[0].text).length;
    const others = opts.filter(o => !o.isCorrect).map(o => String(o.text).length);
    const mean = others.reduce((a, b) => a + b, 0) / others.length;
    if (c > mean * 1.6 && c > Math.max(...others)) {
      add('Q_LENGTH_CLUE', 'WARN', unitCode, `${where}: correct option ${c} chars vs ${mean.toFixed(0)} mean — "${stem.slice(0, 55)}"`);
    }
    if (/\ball of the above\b|\bnone of the above\b/i.test(String(correct[0].text))) {
      add('Q_ALL_OF_THE_ABOVE', 'WARN', unitCode, `${where}: "${correct[0].text}" is the answer`);
    }
  }
}

/* ════════════════════════════════════════════════════════════════════════════════════════ */

(async () => {
  const tenantId = process.argv[2];
  const showAll = process.argv.includes('--all');
  const only = (process.argv.find(a => a.startsWith('--check=')) || '').replace('--check=', '');
  if (!tenantId) {
    console.error('Usage: auditContentQuality.ts <tenantId> [--all] [--check=CODE]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;

  const [units, curriculum, library, quizzes, assignments, mappings] = await Promise.all([
    CurriculumLearningUnit.find({ tenantId, stageKey: STAGE }).lean() as any,
    LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).select('title modules topics').lean() as any,
    LearningContentLibrary.find({ tenantId }).lean() as any,
    Quiz.find({ tenantId, unitCode: { $exists: true, $ne: '' } }).lean() as any,
    // Assignment scopes by `tenant` (ObjectId), not `tenantId`. See the model.
    tenantOid
      ? Assignment.find({ tenant: tenantOid, unitCode: { $exists: true, $ne: '' } }).lean() as any
      : Promise.resolve([] as any),
    SkillEvidence.find({ tenantId, sourceType: 'question', contribution: 'PRIMARY', active: true })
      .select('sourceId').lean() as any,
  ]);

  /** Questions that can carry evidence. Anything outside this set reaches no skill. */
  const mappedQuestionIds = new Set<string>((mappings as any[]).map(m => String(m.sourceId)));

  const published = (library as any[]).filter(r => r.isPublished);

  const byUnitCode = new Map<string, any[]>();
  const byTopicCode = new Map<string, any[]>();
  const bySkillKey = new Map<string, any[]>();
  for (const r of published) {
    if (r.unitCode) byUnitCode.set(String(r.unitCode), [...(byUnitCode.get(String(r.unitCode)) || []), r]);
    if (r.topicCode) byTopicCode.set(String(r.topicCode), [...(byTopicCode.get(String(r.topicCode)) || []), r]);
    for (const k of r.skillKeys || []) bySkillKey.set(String(k), [...(bySkillKey.get(String(k)) || []), r]);
  }

  const quizByUnit = new Map<string, any[]>();
  for (const q of quizzes as any[]) quizByUnit.set(String(q.unitCode), [...(quizByUnit.get(String(q.unitCode)) || []), q]);
  const assignByUnit = new Map<string, any[]>();
  for (const a of assignments as any[]) assignByUnit.set(String(a.unitCode), [...(assignByUnit.get(String(a.unitCode)) || []), a]);

  /* ---- readiness, by the same evaluator the product uses ---------------------------- */

  interface Row { unit: any; readiness: UnitReadiness; own: any[]; inherited: any[] }
  const rows: Row[] = (units as any[]).map(unit => {
    const own = byUnitCode.get(String(unit.unitCode)) || [];
    let inherited = own.length ? [] : (byTopicCode.get(String(unit.topicCode)) || []);
    if (!own.length && !inherited.length) {
      const seen = new Set<string>();
      inherited = (unit.skillKeys || []).flatMap((k: string) => bySkillKey.get(String(k)) || [])
        .filter((r: any) => { const id = String(r._id); if (seen.has(id)) return false; seen.add(id); return true; });
    }
    const boundQuizzes = (quizByUnit.get(String(unit.unitCode)) || []).length;
    const boundAssignments = (assignByUnit.get(String(unit.unitCode)) || []).length;
    const r = evaluateReadiness({
      unitType: unit.unitType,
      ownContent: own,
      inheritedContent: inherited,
      boundAssessments: boundQuizzes + boundAssignments,
      boundAssignments,
    });
    return { unit, readiness: r.readiness, own, inherited };
  });

  const byCode = new Map<string, Row>(rows.map(r => [String(r.unit.unitCode), r]));
  const ready = rows.filter(r => r.readiness === 'READY');
  const readyCodes = new Set(ready.map(r => String(r.unit.unitCode)));

  /* ══ CENSUS ═══════════════════════════════════════════════════════════════════════════ */

  const moduleName = new Map<string, string>(
    ((curriculum?.modules || []) as any[]).map(m => [String(m.moduleCode), String(m.moduleName)]),
  );

  const tallyBy = (keyOf: (r: Row) => string) => {
    const m = new Map<string, Record<UnitReadiness, number>>();
    for (const r of rows) {
      const k = keyOf(r);
      if (!m.has(k)) m.set(k, { EMPTY: 0, PARTIAL: 0, TEACHABLE: 0, ASSESSABLE: 0, READY: 0 });
      m.get(k)![r.readiness]++;
    }
    return [...m.entries()].sort((a, b) => b[1].READY - a[1].READY || a[0].localeCompare(b[0]));
  };

  const line = (n = 96) => console.log('-'.repeat(n));
  const cols = (t: Record<UnitReadiness, number>) =>
    READINESS_ORDER.map(k => String(t[k]).padStart(6)).join('');

  console.log(`\nPHASE 20 — CONTENT QA  ·  ${curriculum?.title}  ·  tenant ${tenantId}`);
  line();
  const total: Record<UnitReadiness, number> = { EMPTY: 0, PARTIAL: 0, TEACHABLE: 0, ASSESSABLE: 0, READY: 0 };
  for (const r of rows) total[r.readiness]++;
  console.log(`${'ALL UNITS'.padEnd(46)}${READINESS_ORDER.map(k => k.slice(0, 6).padStart(6)).join('')}`);
  console.log(`${String(rows.length).padEnd(46)}${cols(total)}`);

  const groupings: [string, (r: Row) => string][] = [
    ['BY MODULE', (r: Row) => `${r.unit.moduleCode} ${moduleName.get(String(r.unit.moduleCode)) || ''}`.trim()],
    ['BY UNIT TYPE', (r: Row) => String(r.unit.unitType)],
    ['BY COMPOSITION ROLE', (r: Row) => compositionRoleOf(r.unit as any)],
    ['BY CATEGORY', (r: Row) => String(r.unit.category)],
  ];
  for (const [label, keyOf] of groupings) {
    console.log(`\n${label}`);
    line();
    for (const [k, t] of tallyBy(keyOf)) console.log(`${k.slice(0, 46).padEnd(46)}${cols(t)}`);
  }

  /**
   * Intentionally unauthored vs authored-but-failing.
   *
   * A unit with NO unit-scoped content row was never authored against — Phase 19 stopped when
   * capacity was reached, by design, and those units stand on inherited topic content. A unit
   * WITH its own rows that still is not READY is a different thing: somebody wrote for it and
   * it did not land. Only the second is a Phase 20 problem.
   */
  const unauthored = rows.filter(r => r.readiness !== 'READY' && !r.own.length);
  const authoredNotReady = rows.filter(r => r.readiness !== 'READY' && r.own.length);
  console.log(`\nNON-READY UNITS`);
  line();
  console.log(`  never authored against (allowed, stands on inherited topic content):  ${unauthored.length}`);
  console.log(`  authored but did not reach READY (Phase 20 concern):                  ${authoredNotReady.length}`);
  for (const r of authoredNotReady) {
    add('AUTHORED_NOT_READY', 'DEFECT', String(r.unit.unitCode),
      `${r.unit.unitType} has ${r.own.length} own row(s) but is ${r.readiness}`);
  }

  /* ══ PER-READY-UNIT AUDIT ═════════════════════════════════════════════════════════════ */

  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'your', 'that', 'this', 'are', 'you']);

  for (const r of ready) {
    const u = r.unit;
    const code = String(u.unitCode);

    /* -- the unit's own metadata must be honest ------------------------------------- */
    for (const d of u.applicableDirections || []) {
      if (d !== DIRECTION_ALL && !DIRECTION_KEYS.includes(d as any)) {
        add('DIRECTION_UNKNOWN', 'BLOCKER', code, `applicableDirections contains "${d}"`);
      }
    }
    if (u.category === 'DIRECTION' && !(u.applicableDirections || []).length) {
      add('DIRECTION_MISSING', 'DEFECT', code, 'category DIRECTION but no applicableDirections');
    }
    for (const s of u.suitableStates || []) {
      if (!(AUTHORABLE_SUITABLE_STATES as readonly string[]).includes(s)) {
        add('STATE_NOT_AUTHORABLE', 'DEFECT', code, `suitableStates contains "${s}"`);
      }
    }
    if (!(u.skillKeys || []).length) add('UNIT_NO_SKILLS', 'DEFECT', code, 'no skillKeys');
    if (!(u.learningOutcomes || []).length) add('UNIT_NO_OUTCOMES', 'WARN', code, 'no learningOutcomes');

    /* -- every authored string ------------------------------------------------------- */
    const teaching = r.own.filter((c: any) => c.type === 'notes' || c.type === 'worked_example');
    const practice = r.own.filter((c: any) => String(c.type).startsWith('practice'));

    for (const c of r.own) {
      if (c.videoUrl) add('FAKE_VIDEO', 'BLOCKER', code, `${c.type} carries videoUrl ${c.videoUrl}`);
      if (c.notesContent) auditText({ unitCode: code, where: `${c.type}.notesContent`, text: c.notesContent });
      for (const [i, q] of ((c.practiceQuestions || []) as any[]).entries()) {
        const where = `${c.type}[${i}]`;
        auditText({ unitCode: code, where: `${where}.description`, text: q.description });
        if (q.explanation) auditText({ unitCode: code, where: `${where}.explanation`, text: q.explanation });
        if (q.type === 'mcq') {
          auditQuestion(code, where, { stem: q.title || q.description, options: q.options || [], explanation: q.explanation });
        }
        if (q.type === 'coding') {
          const langs = q.allowedLanguages || [];
          const starter = q.starterCode ? Object.values(q.starterCode as any) : [];
          const tests = (q.testCases || []) as any[];
          if (!langs.length) add('CODE_NO_LANGUAGE', 'BLOCKER', code, `${where}: no allowedLanguages`);
          if (!starter.length || !String(starter[0] || '').trim()) add('CODE_NO_STARTER', 'DEFECT', code, `${where}: no starter code`);
          /*
           * TEST-COUNT AND VISIBILITY RULES DEPEND ON WHETHER THE TASK TAKES INPUT.
           *
           * A task that reads stdin needs several cases and at least one visible, so the
           * student can see the format. A task that takes NO input — "print the number of the
           * matching diagnosis for each of these four symptoms" — has exactly one possible
           * case, and showing it publishes the answer. Eight diagnostic tasks did exactly that
           * until this check learnt the difference.
           */
          const takesInput = tests.some(t => String(t.input ?? '').trim().length > 0);
          if (takesInput) {
            if (tests.length < 2) add('CODE_TOO_FEW_TESTS', 'DEFECT', code, `${where}: ${tests.length} test case(s)`);
            if (tests.length && tests.every(t => t.isHidden)) add('CODE_ALL_HIDDEN', 'DEFECT', code, `${where}: every test hidden and the task reads input`);
          } else if (tests.some(t => !t.isHidden)) {
            add('CODE_ANSWER_KEY_VISIBLE', 'BLOCKER', code,
              `${where}: the task takes no input, so its visible test prints the answer`);
          }
          /*
           * An empty expected output is the CORRECT answer for an empty-input edge case, and
           * two tasks legitimately assert exactly that. Only a question where NO test expects
           * anything has lost its answer key.
           */
          if (tests.length && tests.every(t => !String(t.expectedOutput ?? '').length)) {
            add('CODE_NO_EXPECTED', 'BLOCKER', code, `${where}: no test expects any output`);
          }
        }
      }
    }

    /* -- the teaching must be about THIS unit ---------------------------------------- */
    const body = teaching.map((c: any) => String(c.notesContent || '')).join('\n');
    if (teaching.length && body.length < 800) {
      add('TEACHING_THIN', 'DEFECT', code, `${body.length} chars of teaching across ${teaching.length} row(s)`);
    }
    /*
     * Does the teaching talk about the unit its title claims?
     *
     * MATCHED ON STEMS, and WARN rather than DEFECT. "Links" is taught as "link", "Branches"
     * as "branch", "Searching" as "search" — an exact-word version of this check reported
     * eighteen units, and every one read on-topic. What survives stemming is a prompt to look,
     * not a verdict: "The Box Model" teaches the box model without ever writing "model".
     */
    const stem = (w: string) => w.replace(/(ings|ing|ies|es|ed|s)$/, '');
    const lowBody = body.toLowerCase();
    const distinctive = String(u.title).toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
    if (teaching.length && distinctive.length && !distinctive.some(w => lowBody.includes(stem(w)))) {
      add('TEACHING_OFF_TOPIC', 'WARN', code, `teaching never mentions any of: ${distinctive.join(', ')}`);
    }

    /* -- type conformance beyond the readiness ladder --------------------------------- */
    const pq = practice.flatMap((c: any) => (c.practiceQuestions || []) as any[]);
    if (['CONCEPT', 'PRACTICE', 'REVIEW'].includes(u.unitType) && pq.length < 3) {
      add('PRACTICE_TOO_FEW', 'DEFECT', code, `${u.unitType} has ${pq.length} practice question(s)`);
    }
    /*
     * WARN, not DEFECT. Most debugging is done by running code, but not all of it: resolving a
     * merge conflict is a genuine debugging exercise that no test harness can run.
     */
    if (u.unitType === 'DEBUG' && !pq.some(q => q.type === 'coding')) {
      add('DEBUG_NO_CODE', 'WARN', code, 'DEBUG unit has no coding practice to debug');
    }

    /* -- the bound assessments -------------------------------------------------------- */
    const qs = quizByUnit.get(code) || [];
    const as = assignByUnit.get(code) || [];

    if (u.unitType === 'PROJECT') {
      if (!as.length) {
        add('PROJECT_NO_ASSIGNMENT', 'BLOCKER', code, 'PROJECT has no bound Assignment to submit to');
        if (qs.length) add('PROJECT_QUIZ_ONLY', 'BLOCKER', code, 'PROJECT is backed by a Quiz — a quiz cannot receive submitted work');
      }
    }
    if (u.unitType === 'CHECKPOINT' && !qs.length) {
      add('CHECKPOINT_NO_QUIZ', 'BLOCKER', code, 'CHECKPOINT has no bound Quiz');
    }

    for (const q of qs) {
      const embedded: any[] = Array.isArray(q.questions) ? q.questions : [];
      const linked: string[] = (q.questionIds || []).map(String);
      const n = embedded.length || linked.length;
      if (!n) {
        add('QUIZ_EMPTY', 'BLOCKER', code, `quiz "${q.title}" has no questions (questionIds=${linked.length}, embedded=${embedded.length})`);
      } else if (n < 3) {
        add('QUIZ_TOO_FEW', 'DEFECT', code, `quiz "${q.title}" has ${n} question(s)`);
      }
      if (!q.totalTime) add('QUIZ_NO_DURATION', 'DEFECT', code, `quiz "${q.title}" has no totalTime`);

      /*
       * A bound, gradeable quiz that reaches no skill.
       *
       * quizSkillBridge projects an attempt into SkillEvidence only for questions carrying a
       * PRIMARY mapping, and records nothing at all otherwise. So an unmapped checkpoint is
       * not half-wired: the student takes it, sees a score, and Skill DNA never hears. All
       * 161 were in that state, which no existing check could see because every individual
       * piece — quiz, binding, readiness — was correct.
       */
      const unmapped = linked.filter(id => !mappedQuestionIds.has(id));
      if (linked.length && unmapped.length === linked.length) {
        add('QUIZ_UNMAPPED', 'DEFECT', code, `quiz "${q.title}": no question carries a PRIMARY skill mapping, so it produces no evidence`);
      } else if (unmapped.length) {
        add('QUIZ_PARTLY_UNMAPPED', 'WARN', code, `quiz "${q.title}": ${unmapped.length} of ${linked.length} questions are unmapped`);
      }
      if ((q.totalQuestions || 0) !== n) add('QUIZ_COUNT_MISMATCH', 'DEFECT', code, `quiz "${q.title}": totalQuestions=${q.totalQuestions} but ${n} question(s)`);
    }

    for (const a of as) {
      auditText({ unitCode: code, where: 'assignment.instructions', text: a.instructions });
      if (String(a.instructions || '').length < 400) {
        add('ASSIGNMENT_THIN', 'DEFECT', code, `instructions are ${String(a.instructions || '').length} chars`);
      }
      if (!((a.rubric || []) as any[]).length) add('ASSIGNMENT_NO_RUBRIC', 'DEFECT', code, 'no rubric — nothing to grade against');
      for (const [i, item] of ((a.rubric || []) as any[]).entries()) {
        if (!String(item.criterion || '').trim()) add('ASSIGNMENT_BLANK_CRITERION', 'DEFECT', code, `rubric[${i}]`);
        if (!(item.maxPoints > 0)) add('ASSIGNMENT_ZERO_POINTS', 'DEFECT', code, `rubric[${i}] "${item.criterion}" worth ${item.maxPoints}`);
      }
      // Assignment scores in `totalPoints`. Quiz uses `totalMarks`; they are different models.
      if (!(a.totalPoints > 0)) add('ASSIGNMENT_NO_POINTS', 'DEFECT', code, 'no totalPoints');
      const rubricPoints = ((a.rubric || []) as any[]).reduce((n, i) => n + (i.maxPoints || 0), 0);
      if (rubricPoints && a.totalPoints && rubricPoints !== a.totalPoints) {
        add('ASSIGNMENT_POINTS_MISMATCH', 'DEFECT', code, `rubric sums to ${rubricPoints}, totalPoints is ${a.totalPoints}`);
      }
    }

    /* -- prerequisites a READY unit depends on ---------------------------------------- */
    for (const p of u.prerequisiteUnitCodes || []) {
      const dep = byCode.get(String(p));
      if (!dep) { add('PREREQ_MISSING', 'BLOCKER', code, `prerequisite ${p} does not exist`); continue; }
      if (!readyCodes.has(String(p))) {
        add('PREREQ_NOT_READY', 'DEFECT', code,
          `READY unit depends on ${p}, which is ${dep.readiness}${dep.own.length ? '' : ' (never authored)'}`);
      }
    }
  }

  /* ══ SOURCE-vs-DATABASE DIVERGENCE ════════════════════════════════════════════════════ */

  /**
   * What the author wrote against what a student would receive.
   *
   * This is the check that catches a seed writing a shape the model does not store. It is the
   * only check here that can see that class of defect at all: both sides look internally fine.
   */
  for (const b of ALL_BUNDLES) {
    const code = String(b.unitCode);
    const r = byCode.get(code);
    if (!r) { add('BUNDLE_ORPHAN', 'DEFECT', code, 'authored bundle has no matching unit'); continue; }

    const own = r.own;
    if (b.notes && !own.some((c: any) => c.type === 'notes')) {
      add('SOURCE_NOT_STORED', 'BLOCKER', code, 'bundle has notes but no notes row exists');
    }
    if (b.workedExample && !own.some((c: any) => c.type === 'worked_example')) {
      add('SOURCE_NOT_STORED', 'BLOCKER', code, 'bundle has a worked example but no worked_example row exists');
    }

    const storedMcq = own.filter((c: any) => c.type === 'practice_theory')
      .flatMap((c: any) => (c.practiceQuestions || []) as any[]).length;
    if ((b.mcqs || []).length !== storedMcq) {
      add('SOURCE_COUNT_DRIFT', 'DEFECT', code, `bundle has ${(b.mcqs || []).length} mcqs, database has ${storedMcq}`);
    }
    const storedCoding = own.filter((c: any) => c.type === 'practice_coding')
      .flatMap((c: any) => (c.practiceQuestions || []) as any[]).length;
    if ((b.coding || []).length !== storedCoding) {
      add('SOURCE_COUNT_DRIFT', 'DEFECT', code, `bundle has ${(b.coding || []).length} coding tasks, database has ${storedCoding}`);
    }

    /* the authored checkpoint, audited as questions even where the database lost them */
    for (const [i, q] of (b.checkpoint || []).entries()) {
      auditQuestion(code, `source.checkpoint[${i}]`, { stem: q.question, options: q.options, explanation: q.explanation });
      auditText({ unitCode: code, where: `source.checkpoint[${i}].explanation`, text: q.explanation });
    }
    const quizRows = quizByUnit.get(code) || [];
    const storedQ = quizRows.reduce((n: number, q: any) =>
      n + Math.max((q.questionIds || []).length, Array.isArray(q.questions) ? q.questions.length : 0), 0);
    if ((b.checkpoint || []).length && storedQ !== (b.checkpoint || []).length) {
      add('CHECKPOINT_NOT_STORED', 'BLOCKER', code,
        `bundle has ${(b.checkpoint || []).length} checkpoint questions, quiz holds ${storedQ}`);
    }

    for (const [i, q] of (b.mcqs || []).entries()) {
      auditQuestion(code, `source.mcq[${i}]`, { stem: q.question, options: q.options, explanation: q.explanation });
    }
    if (b.assignment) {
      const a = (assignByUnit.get(code) || [])[0];
      if (!a) add('SOURCE_NOT_STORED', 'BLOCKER', code, 'bundle has an assignment brief but no Assignment row exists');
      else if (String(a.instructions || '').trim() !== String(b.assignment.instructions).trim()) {
        add('ASSIGNMENT_DRIFT', 'WARN', code, 'stored instructions differ from the authored brief');
      }
    }
  }

  /* ══ DUPLICATION ══════════════════════════════════════════════════════════════════════ */

  const identifying = identifyingWordsFor(
    (units as any[]).map(u => ({ unitCode: String(u.unitCode), title: String(u.title) })),
  );
  const dupRows = (library as any[]).filter(c => c.unitCode && readyCodes.has(String(c.unitCode)));
  for (const d of findDuplication({ rows: dupRows as any, identifyingWords: identifying })) {
    add(`DUP_${d.kind}`, d.kind === 'IDENTICAL_BODY' ? 'BLOCKER' : 'DEFECT',
      [...new Set(d.unitCodes)].join(','), `${(d.similarity * 100).toFixed(0)}% — "${d.sample}"`);
  }

  /* duplicate question stems across the whole READY set, read from the authored source */
  const stems = new Map<string, string[]>();
  for (const b of ALL_BUNDLES) {
    if (!readyCodes.has(String(b.unitCode))) continue;
    for (const q of [...(b.mcqs || []), ...(b.checkpoint || [])]) {
      const k = norm(q.question);
      if (k.length < 20) continue;
      stems.set(k, [...(stems.get(k) || []), String(b.unitCode)]);
    }
  }
  for (const [k, codes] of stems) {
    if (new Set(codes).size > 1) add('DUP_STEM_ACROSS_UNITS', 'DEFECT', [...new Set(codes)].join(','), `"${k.slice(0, 80)}"`);
    else if (codes.length > 1) add('DUP_STEM_WITHIN_UNIT', 'DEFECT', codes[0], `"${k.slice(0, 80)}" appears ${codes.length}x`);
  }

  /* ══ PREREQUISITE CYCLES ══════════════════════════════════════════════════════════════ */

  const graph = buildPrerequisiteGraph(units as any);
  for (const cycle of findPrerequisiteCycles(graph)) {
    add('PREREQ_CYCLE', 'BLOCKER', cycle, 'prerequisite cycle');
  }

  /* ══ REPORT ═══════════════════════════════════════════════════════════════════════════ */

  const shown = only ? findings.filter(f => f.check === only) : findings;
  const byCheck = new Map<string, Finding[]>();
  for (const f of shown) byCheck.set(f.check, [...(byCheck.get(f.check) || []), f]);

  const rank: Record<Severity, number> = { BLOCKER: 0, DEFECT: 1, WARN: 2 };
  const ordered = [...byCheck.entries()].sort(
    (a, b) => rank[a[1][0].severity] - rank[b[1][0].severity] || b[1].length - a[1].length,
  );

  console.log(`\n\nFINDINGS  ·  ${ready.length} READY units audited, ${rows.length} units scanned`);
  line();
  for (const [check, list] of ordered) {
    console.log(`\n[${list[0].severity}] ${check}  ·  ${list.length}`);
    const limit = showAll || only ? list.length : 8;
    for (const f of list.slice(0, limit)) console.log(`    ${f.unitCode.padEnd(34)} ${f.detail}`);
    if (list.length > limit) console.log(`    … ${list.length - limit} more (--all)`);
  }

  /**
   * What a student scores by never reading the material and always picking the longest option.
   *
   * The per-question Q_LENGTH_CLUE warning says a single question has a tell. This says whether
   * the BANK does, and it is the number that matters: these questions feed SkillEvidence and
   * therefore adaptive state, so a bank that can be passed on option length does not merely
   * measure badly — it tells the composer a guesser is strong.
   */
  let judged = 0;
  let longestWins = 0;
  let visibleTell = 0;
  for (const c of dupRows) {
    for (const q of ((c.practiceQuestions || []) as any[])) {
      const opts = (q.options || []) as any[];
      if (opts.length < 3) continue;
      const correct = opts.find(o => o.isCorrect);
      if (!correct) continue;
      judged++;
      const lens = opts.map(o => String(o.text).length);
      const max = Math.max(...lens);
      const correctLen = String(correct.text).length;
      if (correctLen === max) longestWins += 1 / lens.filter(l => l === max).length;
      /*
       * A margin a reader can actually see, matching reportQuestionQuality.ts. Longest by one
       * character is not a tell anybody can use; ten characters AND a sixth of the option's
       * own length is the point at which one answer starts to look like the essay.
       */
      const gap = correctLen - Math.max(...opts.filter(o => !o.isCorrect).map(o => String(o.text).length));
      if (gap >= 10 && gap >= correctLen / 6) visibleTell++;
    }
  }
  if (judged) {
    console.log('\n');
    line();
    console.log(`  ANSWER-LENGTH TELL over ${judged} stored practice MCQs (chance is about 25%)`);
    console.log(`    correct option is the longest           ${((longestWins / judged) * 100).toFixed(1).padStart(5)}%`);
    console.log(`    correct option is VISIBLY the longest   ${((visibleTell / judged) * 100).toFixed(1).padStart(5)}%   <- the exploitable one`);
    console.log(`    reportQuestionQuality.ts breaks this down per unit and also covers the`);
    console.log(`    checkpoint bank, which lives in Question rows rather than in the library.`);
  }

  const count = (s: Severity) => findings.filter(f => f.severity === s).length;
  console.log('\n');
  line();
  console.log(`  BLOCKER ${count('BLOCKER')}   DEFECT ${count('DEFECT')}   WARN ${count('WARN')}   ·  ${findings.length} total`);
  const blockedUnits = new Set(findings.filter(f => f.severity === 'BLOCKER').flatMap(f => f.unitCode.split(',')));
  console.log(`  units carrying at least one BLOCKER: ${blockedUnits.size}`);
  line();

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
