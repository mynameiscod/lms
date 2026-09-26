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
import SkillEvidence from '../../models/SkillEvidence';
import CareerSkill from '../../models/CareerSkill';
import { DEFAULT_DOMAIN } from '../../services/careerDomainService';
import Assignment, { AssignmentType } from '../../models/Assignment';
import User from '../../models/User';
import { PILOT_TOPICS } from './pilotUnitContent';
import { ALL_BUNDLES } from './allBundles';
import { ALL_YEAR2_BUNDLES } from './year2Bundles';
import { primarySkillFor } from './year2SkillAttribution';
import { ALL_YEAR3_BUNDLES } from './year3Bundles';
import { primarySkillFor as primarySkillForYear3 } from './year3SkillAttribution';
import { findDuplication, identifyingWordsFor } from '../../services/contentDuplicationService';

dotenv.config();

const CREATED_BY = 'pilot-unit-content';

const upper = (s: string) => String(s || '').trim().toUpperCase();

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

/** Checkpoints do not close on a date: the learner's day gates them. */
const CHECKPOINT_OPEN_UNTIL = new Date('2099-12-31T00:00:00.000Z');

/** Minutes a reader needs, from the text itself rather than from a guess. */
const readingMinutes = (text: string): number =>
  Math.max(5, Math.round(text.split(/\s+/).length / 180) * 5 || 5);

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  /**
   * Which year's content to write. Year 1 is the default so every existing invocation, and every
   * runbook that quotes one, behaves exactly as it did.
   *
   * Year 2 differs in one respect only: twenty-one of its topics declare more than one skill, so
   * its checkpoint questions carry an attribution from year2SkillAttribution rather than relying
   * on the single-skill derivation below. Everything else — the rows, the quizzes, the stable
   * ids, the refusal to guess — is shared, because two copies of this logic would drift.
   */
  const year2 = process.argv.includes('--year2');
  /**
   * Year 3 differs from Year 2 only in degree: SEVENTY-SIX of its hundred topics declare more
   * than one skill, against Year 2's twenty-one of thirty-three, because a specialize topic
   * nearly always sits at the join of two things. So it needs its own attribution table for the
   * same reason and more urgently, and nothing else here changes, because a third copy of this
   * logic would drift from the other two.
   *
   * Its bundle list is also deliberately incomplete while the year is being authored. A unit
   * with no bundle is reported as unauthored and skipped, which is what lets the year be seeded
   * and inspected in batches rather than all at once.
   */
  const year3 = process.argv.includes('--year3');
  const bundles = year3 ? ALL_YEAR3_BUNDLES : year2 ? ALL_YEAR2_BUNDLES : ALL_BUNDLES;
  /** The attribution table for the year being seeded, or none for Year 1's single-skill topics. */
  const attributionFor = year3 ? primarySkillForYear3 : year2 ? primarySkillFor : null;
  /** Shown in the header, so a runbook transcript says which year was seeded. */
  const label = year3 ? 'YEAR-3' : year2 ? 'YEAR-2' : 'PILOT';
  if (!tenantId) {
    console.error('Usage: seedPilotUnitContent.ts <tenantId> [--apply] [--year2|--year3]');
    process.exit(1);
  }
  if (year2 && year3) {
    console.error('Pass one of --year2 or --year3, not both.');
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
   * The skills a checkpoint question may legitimately be mapped to.
   *
   * Exactly the set skillEvidenceService.validateEvidenceMapping would accept: in the default
   * career domain, an actual SKILL rather than a GROUP, assessable, and active. Loaded once —
   * CareerSkill is GLOBAL and carries no tenantId, so it is queried with no tenant filter.
   */
  const mappableSkills = new Set<string>(
    ((await CareerSkill.find({ domainKey: DEFAULT_DOMAIN, nodeType: 'SKILL', active: true })
      .select('key assessable').lean()) as any[])
      .filter(s => s.assessable !== false)
      .map(s => String(s.key).toUpperCase()),
  );

  const units = await CurriculumLearningUnit
    .find({ tenantId, unitCode: { $in: bundles.map(b => b.unitCode) } })
    .select('unitCode title unitType skillKeys topicCode defaultDepth').lean() as any[];
  const unitByCode = new Map<string, any>(units.map(u => [String(u.unitCode), u]));

  console.log(`\n${label} UNIT CONTENT  ·  tenant ${tenantId}`);
  console.log(attributionFor
    ? `  units: ${bundles.length} authored, attribution from ${year3 ? 'year3' : 'year2'}SkillAttribution`
    : `  topics: ${PILOT_TOPICS.join(', ')}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  let rows = 0;
  let quizzes = 0;
  let checkpointQuestions = 0;
  /** Questions whose `quizId` was (re)written from the persisted owning Quiz. */
  let questionsLinked = 0;
  let mapped = 0;
  let mappedByAuthor = 0;
  const unmappedMultiSkill = new Set<string>();
  const unmappableSkill = new Set<string>();
  /** An authored skillKey that is not one of the unit's own skills. Refused, never guessed at. */
  const misattributed = new Set<string>();
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

  for (const bundle of bundles) {
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
        practiceQuestions: bundle.mcqs.map((q, i) => ({
          // A stable id, so a re-run rewrites the same question rather than minting a new one.
          _id: stableId(`${tenantId}:${unit.unitCode}:practice_theory:${i}`),
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
        practiceQuestions: bundle.coding.map((c, i) => ({
          _id: stableId(`${tenantId}:${unit.unitCode}:practice_coding:${i}`),
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

          /*
           * The item → skill mapping, WITHOUT WHICH THE CHECKPOINT MEASURES NOTHING.
           *
           * quizSkillBridge projects a finished attempt into SkillEvidence only for questions
           * that carry a PRIMARY mapping, and returns "no skill mappings" otherwise — silently
           * and correctly, because an unclassified item says nothing about any named skill.
           * Every checkpoint question written by this seed was unmapped, so all 161 quizzes
           * were bound, gradeable, and invisible to Skill DNA.
           *
           * ONLY WHERE THERE IS NOTHING TO DECIDE. A unit declaring exactly one skill has one
           * possible answer, and writing it is derivation. A unit declaring several does not:
           * which of them a given question chiefly measures is a judgement, the admin screen
           * exists for making it, and guessing skillKeys[0] would be the invented attribution
           * the bridge is deliberately built to avoid. Those are left unmapped and reported.
           */
          /*
           * AN AUTHOR'S ATTRIBUTION FIRST, THEN DERIVATION, NEVER A GUESS.
           *
           * A question carrying `skillKey` was attributed by whoever wrote it, and that is the
           * only way a multi-skill checkpoint produces evidence. It must name one of the unit's
           * own skills — anything else is refused and reported rather than mapped somewhere
           * plausible. Without one, a single-skill unit derives as before.
           *
           * A mapping this seed wrote earlier that no longer matches is removed first, so
           * changing a question's attribution moves its evidence rather than adding a second
           * PRIMARY skill beside the first. Only this seed's own rows are touched: a mapping an
           * admin made on the Skill Evidence screen is theirs.
           */
          const declared = (unit.skillKeys || []).map(upper);
          /* An author's attribution: the question's own, else Year 2's table. */
          const attributed = q.skillKey || (attributionFor ? attributionFor(unit.unitCode, unit.topicCode) : '');
          const authored = attributed ? upper(attributed) : '';
          if (authored && !declared.includes(authored)) misattributed.add(`${unit.unitCode} (${authored})`);
          const only = authored
            ? (declared.includes(authored) ? authored : '')
            : (declared.length === 1 ? declared[0] : '');

          await SkillEvidence.deleteMany({
            tenantId, sourceType: 'question', sourceId: String(_id), createdBy: CREATED_BY,
            ...(only ? { skillKey: { $ne: only } } : {}),
          });

          if (authored && !only) {
            // refused above; nothing mapped
          } else if (only && mappableSkills.has(only)) {
            if (authored) mappedByAuthor++;
            await SkillEvidence.updateOne(
              { tenantId, sourceType: 'question', sourceId: String(_id), skillKey: only },
              {
                $set: { contribution: 'PRIMARY', active: true, updatedBy: CREATED_BY },
                $setOnInsert: {
                  tenantId, sourceType: 'question', sourceId: String(_id), skillKey: only,
                  audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [],
                  createdBy: CREATED_BY,
                },
              },
              { upsert: true },
            );
            mapped++;
          } else if (!only) {
            unmappedMultiSkill.add(unit.unitCode);
          } else {
            unmappableSkill.add(`${unit.unitCode} (${only})`);
          }
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
              /**
               * A curriculum checkpoint is gated by the learner's DAY, never by the calendar. The
               * window used to be "now until a year from now", restamped on every run — so a
               * re-run was never a no-op, and a tenant provisioned once would find every
               * checkpoint closed a year later, in the middle of a learner's ninety days. It is
               * open from the first provisioning and does not expire.
               */
              endDate: CHECKPOINT_OPEN_UNTIL,
              startTime: '00:00',
              endTime: '23:59',
            },
            $setOnInsert: { tenantId, createdBy: CREATED_BY, startDate: new Date() },
          },
          { upsert: true },
        );

        /**
         * THE OTHER HALF OF THE LINK — each Question names the Quiz that owns it.
         *
         * The Quiz held `questionIds`, but no Question carried `quizId`, and the student player
         * reads questions by `quizId` (GET /quizzes/:quizId/questions → Question.find({quizId})).
         * So every checkpoint opened empty for a student while every audit that read
         * `questionIds` called it complete. The link is written from the Quiz actually
         * persisted above — read back, never derived — and keyed on the questions'
         * deterministic ids, so a re-run updates the same rows. `questionNo` fixes the order the
         * player sorts by to the authored order.
         */
        const owner = await Quiz.findOne({ tenantId, unitCode: unit.unitCode }).select('_id').lean() as any;
        if (!owner) throw new Error(`Checkpoint quiz for ${unit.unitCode} was not persisted.`);
        const linked = await Question.bulkWrite(questionIds.map((qid, i) => ({
          updateOne: {
            filter: { _id: qid },
            update: { $set: { quizId: String(owner._id), questionNo: i + 1 } },
          },
        })), { ordered: true });
        questionsLinked += linked.matchedCount || 0;
      }
      parts.push(`checkpoint(${bundle.checkpoint.length})`);
    }

    /**
     * The unit's one Assignment: a PROJECT unit's brief, or a PRACTICE unit's coding assignment.
     *
     * Assignment already owns submissions, rubrics, grading and deadlines. A Quiz cannot stand in
     * — a checkpoint measures recall, and a project is judged on what was built. ProjectPlan
     * stays what it has always been: the student's own instance, created when they start.
     *
     * A coding assignment is the same row with its type set to CODING and the fields the engine
     * already reads for one: the language, a starter, and test cases it runs on submission. A
     * PROJECT brief is written exactly as before. The two never cross: certification requires a
     * PROJECT unit's assignment to be a project, and a runnable task belongs on the unit that
     * practises the skill, so a mismatch is refused rather than stored.
     *
     * NOTE the tenant field. Assignment scopes by `tenant` (ObjectId) while Quiz and every
     * CareerPilot model use a String `tenantId`; querying it with the String matches nothing and
     * reports no error.
     */
    if (bundle.assignment) {
      const coding = bundle.assignment.coding;
      const isProjectUnit = unit.unitType === 'PROJECT';
      if (!author) {
        skippedAssignments.push(`${bundle.unitCode} (no admin user to attribute it to)`);
      } else if (isProjectUnit === !!coding) {
        skippedAssignments.push(`${bundle.unitCode} (${coding ? 'a coding assignment on a PROJECT unit' : `a project brief on a ${unit.unitType} unit`})`);
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
                type: coding ? AssignmentType.CODING : AssignmentType.PROJECT,
                unitCode: unit.unitCode,
                totalPoints: bundle.assignment.totalPoints,
                rubric: bundle.assignment.rubric.map((r, i) => ({
                  criterion: r.criterion, description: r.description,
                  maxPoints: r.maxPoints, order: i,
                })),
                ...(coding ? {
                  difficulty: coding.difficulty,
                  primaryTech: coding.language,
                  tags: unit.skillKeys || [],
                  passingPoints: coding.passingPoints,
                  allowedLanguages: [coding.language],
                  starterCode: [{ language: coding.language, code: coding.starter }],
                  testCases: coding.tests.map(t => ({
                    input: t.input, expectedOutput: t.expectedOutput, isHidden: !!t.isHidden, weight: 1,
                  })),
                  comparisonMode: 'lenient',
                  showTestCaseResults: true,
                  showExpectedOutput: true,
                } : {}),
              },
              $setOnInsert: {
                tenant: new mongoose.Types.ObjectId(tenantId),
                createdBy: author._id,
              },
            },
            { upsert: true },
          );
        }
        parts.push(coding ? 'coding assignment' : 'assignment');
      }
    }

    console.log(`  ${bundle.unitCode.padEnd(34)}${parts.join(' · ')}`);
  }

  console.log('');
  if (skippedAssignments.length) {
    console.log(`  ${skippedAssignments.length} assignment(s) skipped:`);
    for (const m of skippedAssignments) console.log(`    ${m}`);
    console.log('');
  }
  if (missingUnits.length) {
    console.log(`  ${missingUnits.length} bundle(s) name a unit that does not exist:`);
    for (const m of missingUnits) console.log(`    ${m}`);
    console.log('');
  }

  if (!apply) {
    console.log(`${rows} library rows, ${quizzes} checkpoint quizzes and ${assignments} assignments would be written.`);
    console.log('Re-run with --apply.');
  } else {
    const bound = await LearningContentLibrary.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } });
    const boundQuiz = await Quiz.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } });
    console.log(`${rows} library rows written, ${quizzes} checkpoint quizzes (${checkpointQuestions} questions) and ${assignments} assignments bound.`);
    console.log(`  QUIZ LINKAGE: ${questionsLinked} of ${checkpointQuestions} checkpoint question(s) linked to their persisted quiz by quizId.`);

  console.log(`
  SKILL EVIDENCE MAPPING`);
  console.log(`    ${mapped} checkpoint question(s) mapped: ${mappedByAuthor} to the skill their author named, ${mapped - mappedByAuthor} to the one skill their unit declares.`);
    if (misattributed.size) {
      console.log(`    ${misattributed.size} authored attribution(s) REFUSED — not one of the unit's skills: `
        + [...misattributed].join(', '));
    }
  if (unmappedMultiSkill.size) {
    console.log(`    ${unmappedMultiSkill.size} unit(s) declare several skills, so which skill each`);
    console.log(`    question chiefly measures is a judgement. Map them in CareerPilot -> Skill`);
    console.log(`    Evidence; until then those checkpoints produce no evidence, by design.`);
  }
  if (unmappableSkill.size) {
    console.log(`    ${unmappableSkill.size} unit(s) name a skill that cannot carry evidence`);
    console.log(`    (a group, retired, or outside the career domain): ${[...unmappableSkill].slice(0, 6).join(', ')}`);
  }
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

  console.log(`\n  AUTHORING GAP: ${bundles.length} authored units have no video.`);
  console.log('  Video needs recording, and a row pointing at nothing is filler that reads as coverage.\n');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
