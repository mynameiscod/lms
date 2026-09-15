/**
 * Write the pilot's unit-specific content into the library, and bind checkpoints as quizzes.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedPilotUnitContent.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedPilotUnitContent.ts <tenantId> --apply
 *
 * EVERY ROW IT CREATES CARRIES A unitCode. That is the whole point: the 368 rows already in the
 * library are topic-level and can only ever leave a unit at PARTIAL. These belong to one unit
 * each, which is what the readiness policy requires before a unit can be TEACHABLE.
 *
 * CHECKPOINTS REUSE THE EXISTING QUIZ ENGINE. A checkpoint is a Quiz row carrying the unit's code
 * in the `unitCode` field added in P3. Nothing here builds a second assessment mechanism, and
 * nothing duplicates Assignment.
 *
 * IT DOES NOT PUBLISH THE UNITS. Content is published — an unpublished row resolves for nothing —
 * but the units themselves stay DRAFT and the UNIT engine stays off. This changes what an author
 * sees, not what any student gets.
 *
 * IDEMPOTENT. Rows are upserted on (tenantId, unitCode, type), so a re-run rewrites the same rows
 * rather than adding a second copy of every lesson.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../../models/LearningContentLibrary';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import Quiz from '../../models/Quiz';
import Question from '../../models/Question';
import Assignment, { AssignmentType } from '../../models/Assignment';
import User from '../../models/User';
import { PILOT_TOPICS } from './pilotUnitContent';
import { ALL_BUNDLES } from './allBundles';
import { findDuplication, identifyingWordsFor } from '../../services/contentDuplicationService';

dotenv.config();

const CREATED_BY = 'pilot-unit-content';

/**
 * A deterministic ObjectId for a seeded row, from a key that describes it.
 *
 * Checkpoint questions have no natural unique key of their own, so a re-run would otherwise
 * insert a second copy of every question and leave the first set orphaned. Hashing the key
 * gives the row a stable identity across runs, which is what makes the seed idempotent and
 * what lets an existing quiz keep pointing at the same questions after an edit.
 */
const stableId = (key: string): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(crypto.createHash('md5').update(key).digest('hex').slice(0, 24));

/** Minutes a reader needs, from the text itself rather than from a guess. */
const readingMinutes = (text: string): number =>
  Math.max(5, Math.round(text.split(/\s+/).length / 180) * 5 || 5);

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: seedPilotUnitContent.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /**
   * Assignment requires a createdBy user, so seeded briefs are attributed to a real admin.
   *
   * Not invented: an ObjectId pointing at no user would leave every seeded assignment unable to
   * populate its author, and the admin screens that show "created by" would render blank rows
   * with no explanation.
   */
  const author = await User.findOne({ tenantId, role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] } })
    .select('_id').lean() as any;


  const units = await CurriculumLearningUnit
    .find({ tenantId, unitCode: { $in: ALL_BUNDLES.map(b => b.unitCode) } })
    .select('unitCode title skillKeys topicCode defaultDepth').lean() as any[];
  const unitByCode = new Map<string, any>(units.map(u => [String(u.unitCode), u]));

  console.log(`\nPILOT UNIT CONTENT  ·  tenant ${tenantId}`);
  console.log(`  topics: ${PILOT_TOPICS.join(', ')}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  let rows = 0;
  let quizzes = 0;
  let checkpointQuestions = 0;
  let assignments = 0;
  const missingUnits: string[] = [];
  const skippedAssignments: string[] = [];

  /** One library row per (unit, type). The compound key is what makes a re-run safe. */
  const upsert = async (unit: any, type: string, title: string, fields: Record<string, any>) => {
    rows++;
    if (!apply) return;
    await LearningContentLibrary.updateOne(
      { tenantId, unitCode: unit.unitCode, type },
      {
        $set: {
          title,
          type,
          unitCode: unit.unitCode,
          // topicCode and skillKeys are kept so the row ALSO still serves as topic-level
          // fallback if its unit is ever archived. Binding narrows; it does not orphan.
          topicCode: unit.topicCode,
          skillKeys: unit.skillKeys || [],
          learningDepth: unit.defaultDepth || 'FOUNDATION',
          isPublished: true,
          ...fields,
        },
        $setOnInsert: { tenantId, createdBy: CREATED_BY },
      },
      { upsert: true },
    );
  };

  for (const bundle of ALL_BUNDLES) {
    const unit = unitByCode.get(bundle.unitCode);
    if (!unit) { missingUnits.push(bundle.unitCode); continue; }

    const parts: string[] = [];

    await upsert(unit, 'notes', `${unit.title} — notes`, {
      notesSource: 'richtext',
      notesContent: bundle.notes,
      estimatedDuration: readingMinutes(bundle.notes),
      description: `Written for ${unit.unitCode}.`,
    });
    parts.push('notes');

    if (bundle.workedExample) {
      await upsert(unit, 'worked_example', `${unit.title} — worked example`, {
        notesSource: 'richtext',
        notesContent: bundle.workedExample,
        estimatedDuration: readingMinutes(bundle.workedExample),
        description: `One problem solved in full, for ${unit.unitCode}.`,
      });
      parts.push('worked_example');
    }

    if (bundle.mcqs?.length) {
      await upsert(unit, 'practice_theory', `${unit.title} — practice`, {
        estimatedDuration: bundle.mcqs.length * 3,
        practiceQuestions: bundle.mcqs.map(q => ({
          type: 'mcq',
          title: q.question,
          description: q.question,
          difficulty: 'medium',
          options: q.options,
          explanation: q.explanation,
          marks: 1,
          gradingMode: 'auto',
        })),
      });
      parts.push(`practice_theory(${bundle.mcqs.length})`);
    }

    if (bundle.coding?.length) {
      await upsert(unit, 'practice_coding', `${unit.title} — coding practice`, {
        estimatedDuration: bundle.coding.length * 20,
        practiceQuestions: bundle.coding.map(c => ({
          type: 'coding',
          title: c.title,
          description: c.description,
          difficulty: 'medium',
          starterCode: { [c.language]: c.starter },
          allowedLanguages: [c.language],
          testCases: c.tests.map(t => ({
            input: t.input, expectedOutput: t.expectedOutput, isHidden: !!t.isHidden,
          })),
          marks: 5,
          gradingMode: 'auto',
        })),
      });
      parts.push(`practice_coding(${bundle.coding.length})`);
    }

    /**
     * The checkpoint is a Quiz, not a tenth content type.
     *
     * Quiz already has attempts, scoring, timing and a results screen. A "checkpoint" content
     * type would reimplement all of it, and the two would drift.
     *
     * ── THE QUESTIONS ARE Question ROWS, NOT AN EMBEDDED ARRAY ───────────────────────────
     *
     * An earlier version of this seed wrote `questions: [...]` inside the Quiz. Quiz has no
     * such path — it holds `questionIds` into the Question collection — so Mongoose dropped
     * the array silently on every write. A hundred and sixty-one checkpoints were created,
     * bound, counted as assessments by the readiness ladder, and held nothing. Nothing failed,
     * nothing warned, and each affected unit reported READY.
     *
     * Two things follow, and both are deliberate here. Write the shape the platform reads —
     * Question rows plus `questionIds`, which is what the quiz builder, the delivery service
     * and the grader all use. And derive each question's _id from (tenant, unit, index) so a
     * re-run UPDATES the same row instead of appending a duplicate set: the ids are the only
     * natural key these questions have, and without one, idempotence is impossible.
     */
    if (bundle.checkpoint?.length) {
      quizzes++;
      if (apply) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 365 * 86400000);
        const questionIds: string[] = [];

        for (const [i, q] of bundle.checkpoint.entries()) {
          const _id = stableId(`${tenantId}:${unit.unitCode}:checkpoint:${i}`);
          const correct = q.options.filter(o => o.isCorrect).map(o => o.text);
          await Question.updateOne(
            { _id },
            {
              $set: {
                tenantId,
                type: 'mcq_single',
                question: q.question,
                options: q.options.map(o => ({ text: o.text, isCorrect: !!o.isCorrect })),
                // Written alongside the flags because the grader falls back to it for imports.
                correctAnswers: correct,
                explanation: q.explanation,
                marks: 1,
                difficultyLevel: 'medium',
                source: 'manual',
                subject: unit.topicCode,
                topic: unit.unitCode,
                tags: ['careerpilot', 'checkpoint', unit.unitCode],
              },
              $setOnInsert: { createdBy: CREATED_BY, usageCount: 1 },
            },
            { upsert: true },
          );
          questionIds.push(String(_id));
          checkpointQuestions++;
        }

        await Quiz.updateOne(
          { tenantId, unitCode: unit.unitCode },
          {
            $set: {
              title: `${unit.title} — checkpoint`,
              description: `Checks the outcomes of ${unit.unitCode}.`,
              unitCode: unit.unitCode,
              questionIds,
              totalQuestions: questionIds.length,
              questionCount: questionIds.length,
              totalMarks: questionIds.length,
              passingMarks: Math.ceil(questionIds.length * 0.6),
              // `totalTime`, in minutes. The field is not called `duration`; an earlier version
              // wrote that name and it was dropped in the same silence as the questions.
              totalTime: Math.max(5, questionIds.length * 2),
              startDate: now,
              endDate,
              startTime: '00:00',
              endTime: '23:59',
            },
            $setOnInsert: { tenantId, createdBy: CREATED_BY },
          },
          { upsert: true },
        );
      }
      parts.push(`checkpoint(${bundle.checkpoint.length})`);
    }

    /**
     * A PROJECT unit's brief, bound as an Assignment.
     *
     * Assignment already owns submissions, rubrics, grading and deadlines. A Quiz cannot stand in
     * — a checkpoint measures recall, and a project is judged on what was built. ProjectPlan
     * stays what it has always been: the student's own instance, created when they start.
     *
     * NOTE the tenant field. Assignment scopes by `tenant` (ObjectId) while Quiz and every
     * CareerPilot model use a String `tenantId`; querying it with the String matches nothing and
     * reports no error.
     */
    if (bundle.assignment) {
      if (!author) {
        skippedAssignments.push(`${bundle.unitCode} (no admin user to attribute it to)`);
      } else {
        assignments++;
        if (apply) {
          await Assignment.updateOne(
            { tenant: new mongoose.Types.ObjectId(tenantId), unitCode: unit.unitCode },
            {
              $set: {
                title: bundle.assignment.title,
                description: bundle.assignment.description,
                instructions: bundle.assignment.instructions,
                type: AssignmentType.PROJECT,
                unitCode: unit.unitCode,
                totalPoints: bundle.assignment.totalPoints,
                rubric: bundle.assignment.rubric.map((r, i) => ({
                  criterion: r.criterion, description: r.description,
                  maxPoints: r.maxPoints, order: i,
                })),
              },
              $setOnInsert: {
                tenant: new mongoose.Types.ObjectId(tenantId),
                createdBy: author._id,
              },
            },
            { upsert: true },
          );
        }
        parts.push('assignment');
      }
    }

    console.log(`  ${bundle.unitCode.padEnd(34)}${parts.join(' · ')}`);
  }

  console.log('');
  if (skippedAssignments.length) {
    console.log(`  ${skippedAssignments.length} project assignment(s) skipped:`);
    for (const m of skippedAssignments) console.log(`    ${m}`);
    console.log('');
  }
  if (missingUnits.length) {
    console.log(`  ${missingUnits.length} bundle(s) name a unit that does not exist:`);
    for (const m of missingUnits) console.log(`    ${m}`);
    console.log('');
  }

  if (!apply) {
    console.log(`${rows} library rows, ${quizzes} checkpoint quizzes and ${assignments} project assignments would be written.`);
    console.log('Re-run with --apply.');
  } else {
    const bound = await LearningContentLibrary.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } });
    const boundQuiz = await Quiz.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } });
    console.log(`${rows} library rows written, ${quizzes} checkpoint quizzes (${checkpointQuestions} questions) and ${assignments} project assignments bound.`);
    console.log(`Library rows carrying a unitCode: ${bound}.  Quizzes: ${boundQuiz}.`);
    console.log('Units remain DRAFT; the UNIT engine is untouched.');
  }

  /**
   * VIDEO IS NOT PRODUCED HERE, and saying so is part of the deliverable.
   *
   * A video row pointing at a URL nobody has filmed would raise a readiness number while
   * teaching nobody — precisely the filler this pilot exists to avoid.
   */
  /**
   * The guard that stops READY meaning "somebody ran a template".
   *
   * Run here rather than as an occasional audit, because the incentive it defends against is
   * created by this very script: copy one lesson across twelve siblings with the name swapped
   * and every one of them reports READY while the student meets one page twelve times.
   */
  if (apply) {
    const authored = await LearningContentLibrary
      .find({ tenantId, createdBy: CREATED_BY })
      .select('_id unitCode title type notesContent practiceQuestions').lean() as any;

    const findings = findDuplication({
      rows: authored as any,
      identifyingWords: identifyingWordsFor(
        units.map(u => ({ unitCode: String(u.unitCode), title: String(u.title) })),
      ),
    });

    console.log(`\n  DUPLICATION GUARD over ${(authored as any[]).length} authored rows`);
    if (!findings.length) {
      console.log('    no duplicate or near-duplicate assets found.');
    } else {
      console.log(`    ${findings.length} finding(s) \u2014 each needs a human decision:`);
      for (const f of findings.slice(0, 12)) {
        console.log(`      ${f.kind.padEnd(30)}${String(f.similarity).padStart(5)}  ${f.unitCodes.join(' / ')}`);
        console.log(`        ${f.sample}`);
      }
    }
  }

  console.log(`\n  AUTHORING GAP: ${ALL_BUNDLES.length} authored units have no video.`);
  console.log('  Video needs recording, and a row pointing at nothing is filler that reads as coverage.\n');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
