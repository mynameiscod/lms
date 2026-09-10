/**
 * Give every Year-1 topic the three items a lesson is made of.
 *
 * WHY THIS EXISTS. The planner decides "Loops, foundation depth, difficulty 1-2" and then looks
 * for material. A plan with correct decisions and nothing behind them is a list of topics a
 * student cannot open, which is worse than no plan: it looks finished.
 *
 * ── WHAT CHANGED, AND WHY ─────────────────────────────────────────────────────────────────
 *
 * This used to seed per SKILL and wrote two types. Three consequences, all of them invisible
 * from a screen:
 *
 *   No topicCode.  Six topics teaching OPERATING_SYSTEMS all resolved to the same one row, so a
 *                  student walking three of them met the same notes three times. The resolver has
 *                  always preferred material written for the topic; nothing was ever written for
 *                  one.
 *   No video.      Not one video row existed anywhere in the library. The delivery order opens
 *                  with video and always found nothing.
 *   Real questions from the legacy quiz bank.  That bank is retired from Foundation selection and
 *                  its quality is exactly why — one of its questions has three of four options
 *                  flagged correct. Copying those into practice put known-bad content in front of
 *                  students under a different name.
 *
 * So it now seeds THREE items per topic — video, notes, practice — at two depths, keyed by
 * topicCode, and the practice question is a placeholder rather than something dredged out of a
 * bank nobody trusts.
 *
 * ── WHAT A PLACEHOLDER IS FOR ─────────────────────────────────────────────────────────────
 *
 * It exists so the flow can be walked end to end today, and it says so in its own body. A student
 * opening one sees scaffolding rather than an empty page, and an author opening one is asked every
 * question the planner needs answered. It is NOT teaching material and does not pretend to be.
 *
 * Every row is tagged `placeholder`, which the Content Library screen already filters on — so
 * "what is still not written" is a view that exists rather than a spreadsheet somebody maintains.
 *
 * ── TWO DEPTHS, BECAUSE ONE CANNOT DEMONSTRATE THE AXIS ───────────────────────────────────
 *
 * A student meeting a skill gets the slow build, one revising gets the recap, and the planner
 * chooses between them from what it measured. A topic with one depth still serves everybody — the
 * resolver falls back — so content can grow to three depths later without this being rerun.
 *
 * ── IT NEVER OVERWRITES AN AUTHOR ─────────────────────────────────────────────────────────
 *
 * Insert-only. A row that already exists is left exactly as it is, whether it is still a
 * placeholder or somebody has since written the real lesson into it. The identity is derived from
 * (topic, depth, type), so a rerun after the curriculum grows fills only the new gaps.
 *
 *   npx ts-node src/seeds/careerPilot/seedFoundationContent.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedFoundationContent.ts <tenantId> --apply
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../../models/LearningContentLibrary';
import LearningCurriculum from '../../models/LearningCurriculum';

dotenv.config();

/**
 * The same author marker the per-skill generation used.
 *
 * Deliberately unchanged: it is what lets the supersede filter below find the rows this
 * seeder wrote before it understood topics. The two generations are told apart by whether a
 * row carries a topicCode, not by who wrote it — a new marker would have orphaned the old
 * rows and left them published alongside their replacements.
 */
const CREATED_BY = 'foundation-content-seed';
/** The tag the Content Library filters on to answer "what is still not written?". */
export const PLACEHOLDER_TAG = 'placeholder';

/**
 * Two depths, and the practice difficulty each one asks for.
 *
 * FOUNDATION is what NOT_EXPOSED and FOUNDATION_REQUIRED resolve at, and its practice window is
 * 1-2. STANDARD is what a partly-competent student gets, window 2-3. Seeding at the bottom of
 * each window means the row is inside it rather than on its edge.
 */
const DEPTHS = [
  { depth: 'FOUNDATION' as const, label: 'from scratch', difficulty: 1 as const },
  { depth: 'STANDARD' as const, label: 'standard', difficulty: 2 as const },
];

/**
 * Topics whose practice is code rather than recall.
 *
 * Decided by skill rather than by module, because a module is not uniformly one or the other —
 * Developer Tools holds both shell commands, which are typed, and IDE proficiency, which is not.
 * A topic touching any of these gets a coding practice row; everything else gets theory, which is
 * where an MCQ lives.
 */
const CODING_SKILLS = new Set([
  'PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'PYTHON_STRINGS',
  'CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS',
  'C_BASICS', 'C_CONTROL_FLOW', 'DSA_ARRAYS', 'DSA_STRINGS',
  'JS_BASICS', 'JS_DOM', 'HTML', 'CSS', 'HTML_FORMS',
  'SQL_BASICS', 'SHELL_COMMANDS', 'SHELL_PIPELINES', 'DEBUGGING',
]);

/** Deterministic identity, so a rerun updates nothing and duplicates nothing. */
const idFor = (tenantId: string, topicCode: string, depth: string, type: string) =>
  new mongoose.Types.ObjectId(
    crypto.createHash('sha1')
      .update(`FOUNDATION-CONTENT:${tenantId}:${topicCode}:${depth}:${type}`)
      .digest('hex').slice(0, 24),
  );

const PLACEHOLDER_NOTE = (title: string, depth: string) =>
  `**This is a placeholder, not a lesson.**\n\n`
  + `It exists so this topic can be opened and the flow walked end to end while the real material `
  + `is being written. Replace this body with the actual notes for "${title}" pitched at `
  + `${depth === 'FOUNDATION' ? 'somebody meeting the idea for the first time' : 'somebody who has met it before'}.\n\n`
  + `Edit it in Content Library, and remove the "placeholder" tag once it holds real teaching.`;

interface Report {
  topics: number;
  wouldInsert: number;
  alreadyPresent: number;
  supersededPerSkill: number;
  byType: Record<string, number>;
}

export async function seedFoundationContent(opts: {
  tenantId: string; apply?: boolean;
}): Promise<Report> {
  const { tenantId } = opts;
  const report: Report = {
    topics: 0, wouldInsert: 0, alreadyPresent: 0, supersededPerSkill: 0,
    byType: { video: 0, notes: 0, practice_coding: 0, practice_theory: 0 },
  };

  const curriculum = await LearningCurriculum.findOne({
    tenantId, adaptiveStage: 'foundation',
  }).lean() as any;
  if (!curriculum) return report;

  const topics = ((curriculum.topics || []) as any[]).filter(t => t.topicCode);
  report.topics = topics.length;

  const wantedIds: mongoose.Types.ObjectId[] = [];
  const docs: any[] = [];

  for (const t of topics) {
    const skills = (t.skillKeys || []).map((k: string) => String(k).toUpperCase());
    const codingTopic = skills.some((k: string) => CODING_SKILLS.has(k));
    const practiceType = codingTopic ? 'practice_coding' : 'practice_theory';

    for (const d of DEPTHS) {
      const common = {
        tenantId,
        createdBy: CREATED_BY,
        skillKeys: skills,
        topicCode: t.topicCode,
        learningDepth: d.depth,
        // Named for the topic and tagged placeholder, so both views an author needs already work.
        topicTags: [t.title, PLACEHOLDER_TAG],
        courseTags: [] as string[],
        applicableDirections: t.applicableDirections || [],
        // NOT canonical. Canonical means "prefer me among equals", and a placeholder should lose
        // to anything real the moment somebody writes it.
        canonical: false,
        isPublished: true,
      };

      docs.push({
        _id: idFor(tenantId, t.topicCode, d.depth, 'video'),
        ...common,
        type: 'video',
        title: `${t.title} — video (${d.label})`,
        description: `Placeholder. Upload or link the ${d.label} video for this topic.`,
        estimatedDuration: 10,
        // videoSource is deliberately unset: upload, YouTube, Vimeo and Bunny are all accepted,
        // and which one this lesson uses is the author's decision, not the seeder's.
      });

      docs.push({
        _id: idFor(tenantId, t.topicCode, d.depth, 'notes'),
        ...common,
        type: 'notes',
        title: `${t.title} — notes (${d.label})`,
        description: `Placeholder notes for ${t.title}.`,
        estimatedDuration: 10,
        notesSource: 'richtext',
        notesContent: PLACEHOLDER_NOTE(t.title, d.depth),
      });

      docs.push({
        _id: idFor(tenantId, t.topicCode, d.depth, practiceType),
        ...common,
        type: practiceType,
        title: `${t.title} — practice (${d.label})`,
        description: `Placeholder practice for ${t.title}. Replace with real questions.`,
        estimatedDuration: 15,
        difficultyLevel: d.difficulty,
        practiceQuestions: [{
          type: codingTopic ? 'coding' : 'mcq',
          title: `${t.title} — placeholder question`,
          description: 'This is a placeholder question. Replace it with real practice for this '
            + 'topic. Practice must be written for this topic and must NOT be copied from the '
            + 'Golden Bank — those questions are the measurement instrument, and a student who '
            + 'practises on them sits their assessment from memory.',
          difficulty: d.depth === 'FOUNDATION' ? 'easy' : 'medium',
          ...(codingTopic
            ? { allowedLanguages: ['python'], testCases: [] }
            : {
              options: [
                { text: 'Replace this option', isCorrect: true },
                { text: 'Replace this option', isCorrect: false },
              ],
            }),
          marks: 1,
          gradingMode: 'self',
        }],
      });
    }
  }

  for (const d of docs) wantedIds.push(d._id);

  const existing = new Set((await LearningContentLibrary.find({
    _id: { $in: wantedIds },
  }).select('_id').lean() as any[]).map(r => String(r._id)));

  const missing = docs.filter(d => !existing.has(String(d._id)));
  report.alreadyPresent = docs.length - missing.length;
  report.wouldInsert = missing.length;
  for (const d of missing) report.byType[d.type] = (report.byType[d.type] || 0) + 1;

  /**
   * The per-skill rows this seeder wrote before it understood topics.
   *
   * Unpublished rather than deleted — the resolver only reads published rows, so they leave the
   * pool without leaving the database, and one update puts them back. They are superseded rather
   * than wrong: every skill they covered is taught by a topic that now has its own material.
   */
  const supersededFilter = {
    tenantId, createdBy: CREATED_BY, isPublished: true,
    $or: [{ topicCode: { $exists: false } }, { topicCode: '' }, { topicCode: null }],
  };
  report.supersededPerSkill = await LearningContentLibrary.countDocuments(supersededFilter as any);

  if (opts.apply) {
    if (missing.length) await LearningContentLibrary.insertMany(missing, { ordered: false });
    if (report.supersededPerSkill) {
      await LearningContentLibrary.updateMany(supersededFilter as any, { $set: { isPublished: false } });
    }
  }

  return report;
}

if (require.main === module) {
  (async () => {
    const tenantId = process.argv[2];
    const apply = process.argv.includes('--apply');
    if (!tenantId) {
      console.error('Usage: seedFoundationContent.ts <tenantId> [--apply]');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const r = await seedFoundationContent({ tenantId, apply });

    console.log(`\nFOUNDATION CONTENT — ${apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`  topics                       ${r.topics}`);
    console.log(`  rows wanted                  ${r.topics * DEPTHS.length * 3}`
      + `   (${r.topics} topics x ${DEPTHS.length} depths x 3 items)`);
    console.log(`  already present, left alone  ${r.alreadyPresent}`);
    console.log(`  ${apply ? 'inserted' : 'would insert'}                     ${r.wouldInsert}`);
    for (const [t, n] of Object.entries(r.byType)) {
      if (n) console.log(`      ${t.padEnd(24)} ${n}`);
    }
    console.log(`  per-skill rows superseded    ${r.supersededPerSkill}`
      + `   (unpublished, never deleted)`);
    if (!apply) console.log(`\nDry run. Nothing was written.`);

    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
}
