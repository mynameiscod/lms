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

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../../models/LearningContentLibrary';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import Quiz from '../../models/Quiz';
import Assignment, { AssignmentType } from '../../models/Assignment';
import User from '../../models/User';
import { PILOT_TOPICS } from './pilotUnitContent';
import { YEAR1_BUNDLES } from './year1UnitContent';
import { PROGRAMMING_SPINE_BUNDLES } from './year1ContentProgramming';
import { findDuplication, identifyingWordsFor } from '../../services/contentDuplicationService';

dotenv.config();

const CREATED_BY = 'pilot-unit-content';

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

  /**
   * Every authored bundle, from whichever file it lives in.
   *
   * Split across files because one module of thirty thousand lines is unreviewable, not because
   * they are different kinds of thing — the seed treats them identically.
   */
  const ALL_BUNDLES = [...YEAR1_BUNDLES, ...PROGRAMMING_SPINE_BUNDLES];

  const units = await CurriculumLearningUnit
    .find({ tenantId, unitCode: { $in: ALL_BUNDLES.map(b => b.unitCode) } })
    .select('unitCode title skillKeys topicCode defaultDepth').lean() as any[];
  const unitByCode = new Map<string, any>(units.map(u => [String(u.unitCode), u]));

  console.log(`\nPILOT UNIT CONTENT  ·  tenant ${tenantId}`);
  console.log(`  topics: ${PILOT_TOPICS.join(', ')}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  let rows = 0;
  let quizzes = 0;
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
     */
    if (bundle.checkpoint?.length) {
      quizzes++;
      if (apply) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 365 * 86400000);
        await Quiz.updateOne(
          { tenantId, unitCode: unit.unitCode },
          {
            $set: {
              title: `${unit.title} — checkpoint`,
              description: `Checks the outcomes of ${unit.unitCode}.`,
              unitCode: unit.unitCode,
              questions: bundle.checkpoint.map((q, i) => ({
                questionText: q.question,
                options: q.options.map(o => o.text),
                correctAnswer: Math.max(0, q.options.findIndex(o => o.isCorrect)),
                explanation: q.explanation,
                marks: 1,
                order: i,
              })),
              totalMarks: bundle.checkpoint.length,
              passingMarks: Math.ceil(bundle.checkpoint.length * 0.6),
              duration: Math.max(5, bundle.checkpoint.length * 2),
              startDate: now,
              endDate,
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
    console.log(`${rows} library rows written, ${quizzes} checkpoint quizzes and ${assignments} project assignments bound.`);
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

  console.log(`\n  AUTHORING GAP: ${YEAR1_BUNDLES.length} authored units have no video.`);
  console.log('  Video needs recording, and a row pointing at nothing is filler that reads as coverage.\n');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
