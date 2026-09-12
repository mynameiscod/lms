/**
 * The pilot decomposition: one topic, broken into the units it actually teaches.
 *
 * DRY RUN BY DEFAULT.
 *
 * WHY ONE TOPIC AND NOT ALL THIRTY-NINE. This exists to prove the authoring architecture end to
 * end — a topic with ordered units, units with real content behind them, and a bundle that comes
 * back in teaching order — before anybody spends weeks writing the other thirty-eight. A
 * bulk generator run against an unproven shape produces hundreds of rows somebody then has to
 * unpick.
 *
 * WHY HTML. It is the clearest case of the thing that was broken: "HTML" is one topic of the
 * Year-1 curriculum and could therefore only ever be one session, while it plainly contains a
 * dozen separate lessons. It also already has published content in the library, so the resolver
 * can be exercised against real rows rather than against fixtures.
 *
 * WHAT IT WRITES. CurriculumLearningUnit rows, as DRAFT. Nothing is published, no content is
 * retagged, no student is affected, and the UNIT engine stays off — a draft unit is invisible to
 * every planning path.
 *
 * IT IS IDEMPOTENT. Units are upserted on their code, so a second run updates rather than
 * duplicating, and an author's edits to title or order are NOT overwritten — only fields this
 * seed is authoritative for are set on an existing row.
 *
 *   npx ts-node src/seeds/careerPilot/seedPilotLearningUnits.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedPilotLearningUnits.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit, { LearningUnitType } from '../../models/CurriculumLearningUnit';
import LearningCurriculum from '../../models/LearningCurriculum';

dotenv.config();

const STAGE = 'foundation';
const TOPIC_CODE = 'T_HTML';

interface UnitSeed {
  slug: string;
  title: string;
  description: string;
  outcomes: string[];
  type?: LearningUnitType;
  minutes?: number;
  /** Units that must be taught first. Codes are resolved to full unit codes below. */
  after?: string[];
}

/**
 * Twelve units, in teaching order.
 *
 * The sequence is the point: structure before content, content before layout, layout before
 * input, and the two that judge the rest — semantics and accessibility — after there is something
 * to judge. A student who meets forms before document structure is being shown a reference
 * manual, not taught.
 */
const UNITS: UnitSeed[] = [
  {
    slug: 'INTRO', title: 'Introduction to HTML',
    description: 'What HTML is, what a browser does with it, and why it is not a programming language.',
    outcomes: ['Say what HTML describes', 'Open a page you wrote in a browser'],
    minutes: 35,
  },
  {
    slug: 'DOCUMENT_STRUCTURE', title: 'Document Structure',
    description: 'doctype, html, head and body — the skeleton every page shares.',
    outcomes: ['Write a valid empty page from memory', 'Explain what belongs in head rather than body'],
    minutes: 40, after: ['INTRO'],
  },
  {
    slug: 'TEXT_AND_HEADINGS', title: 'Text and Headings',
    description: 'Headings, paragraphs and inline emphasis, and why heading level is meaning rather than size.',
    outcomes: ['Mark up an article with a correct heading hierarchy'],
    minutes: 45, after: ['DOCUMENT_STRUCTURE'],
  },
  {
    slug: 'LINKS', title: 'Links',
    description: 'Anchors, relative and absolute paths, and linking within a page.',
    outcomes: ['Link between your own pages', 'Explain when a relative path breaks'],
    minutes: 40, after: ['TEXT_AND_HEADINGS'],
  },
  {
    slug: 'IMAGES', title: 'Images',
    description: 'Embedding images, sizing them, and writing alt text that is worth reading.',
    outcomes: ['Embed an image with meaningful alt text'],
    minutes: 40, after: ['LINKS'],
  },
  {
    slug: 'LISTS', title: 'Lists',
    description: 'Ordered, unordered and description lists, and nesting them without losing the thread.',
    outcomes: ['Choose the right list type for a set of items'],
    minutes: 35, after: ['TEXT_AND_HEADINGS'],
  },
  {
    slug: 'TABLES', title: 'Tables',
    description: 'Rows, cells and headers — for data, and not for layout.',
    outcomes: ['Mark up a data table with proper headers'],
    minutes: 45, after: ['LISTS'],
  },
  {
    slug: 'FORMS', title: 'Forms',
    description: 'Inputs, labels, and what actually happens when a form is submitted.',
    outcomes: ['Build a form where every input has a label', 'Explain what the browser sends'],
    minutes: 60, after: ['LINKS'],
  },
  {
    slug: 'SEMANTIC_HTML', title: 'Semantic HTML',
    description: 'header, nav, main, article, footer — describing what a thing IS rather than how it looks.',
    outcomes: ['Replace a page of divs with semantic elements', 'Justify each choice'],
    minutes: 50, after: ['FORMS', 'TABLES'],
  },
  {
    slug: 'ACCESSIBILITY', title: 'Accessibility',
    description: 'Reading a page the way a screen reader does, and the small habits that make it work.',
    outcomes: ['Navigate your own page by keyboard alone', 'Fix three common accessibility faults'],
    minutes: 50, after: ['SEMANTIC_HTML'],
  },
  {
    slug: 'PRACTICE', title: 'HTML Practice',
    description: 'Mark up real pages from a description, until structure is automatic.',
    outcomes: ['Produce correct markup without looking things up'],
    type: 'PRACTICE', minutes: 60, after: ['ACCESSIBILITY'],
  },
  {
    slug: 'MINI_PROJECT', title: 'Mini Project — a page of your own',
    description: 'One complete page, built from a brief and explained afterwards.',
    outcomes: ['Build and describe a complete semantic page'],
    type: 'PROJECT', minutes: 120, after: ['PRACTICE'],
  },
];

const codeFor = (slug: string) => `${TOPIC_CODE}_${slug}`;

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: seedPilotLearningUnits.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const curriculum = await LearningCurriculum
    .findOne({ tenantId, adaptiveStage: STAGE }).select('title topics').lean() as any;
  if (!curriculum) {
    console.error(`No '${STAGE}' curriculum for tenant ${tenantId}.`);
    process.exit(1);
  }

  const topic = ((curriculum.topics || []) as any[]).find(t => t.topicCode === TOPIC_CODE);
  if (!topic) {
    console.error(`${TOPIC_CODE} is not a topic of "${curriculum.title}".`);
    process.exit(1);
  }

  // Inherited rather than restated: a unit teaches its topic's skills unless somebody narrows it,
  // and a seed that retyped them would drift the moment the curriculum was edited.
  const skillKeys = (topic.skillKeys || []).map((k: string) => String(k).toUpperCase());
  const moduleCode = String(topic.moduleCode || '');

  console.log(`\n${curriculum.title}`);
  console.log(`  topic   ${TOPIC_CODE} — ${topic.title}`);
  console.log(`  module  ${moduleCode}`);
  console.log(`  skills  ${skillKeys.join(', ') || '(none)'}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  const existing = new Set<string>(
    ((await CurriculumLearningUnit.find({ tenantId, topicCode: TOPIC_CODE })
      .select('unitCode').lean()) as any[]).map(u => String(u.unitCode)),
  );

  let created = 0;
  let updated = 0;

  for (let i = 0; i < UNITS.length; i++) {
    const u = UNITS[i];
    const unitCode = codeFor(u.slug);
    const isNew = !existing.has(unitCode);
    const order = (i + 1) * 10;

    console.log(
      `  ${String(order).padStart(3)}  ${unitCode.padEnd(34)}`
      + `${(u.type || 'CONCEPT').padEnd(9)}${String(u.minutes || 45).padStart(4)}m  `
      + `${isNew ? 'create' : 'update'}  ${u.title}`,
    );

    if (!apply) continue;

    await CurriculumLearningUnit.updateOne(
      { tenantId, unitCode },
      {
        $set: {
          stageKey: STAGE,
          moduleCode,
          topicCode: TOPIC_CODE,
          title: u.title,
          description: u.description,
          displayOrder: order,
          skillKeys,
          prerequisiteUnitCodes: (u.after || []).map(codeFor),
          learningOutcomes: u.outcomes,
          estimatedMinutes: u.minutes || 45,
          unitType: u.type || 'CONCEPT',
          updatedBy: 'pilot-seed',
        },
        /**
         * Set once, never re-set.
         *
         * Category, depth, directions, band and STATUS are an author's decisions. A seed that
         * re-applied them would quietly unpublish a unit somebody had published, or undo a
         * direction filter, every time it was re-run.
         */
        $setOnInsert: {
          tenantId,
          unitCode,
          category: 'UNIVERSAL',
          defaultDepth: 'FOUNDATION',
          applicableDirections: [],
          audience: { languages: [], years: [], branches: [] },
          mandatory: true,
          status: 'DRAFT',
          createdBy: 'pilot-seed',
        },
      },
      { upsert: true },
    );

    if (isNew) created++; else updated++;
  }

  console.log('');
  if (!apply) {
    console.log(`${UNITS.length} units would be written for ${TOPIC_CODE}.`);
    console.log('Re-run with --apply.');
  } else {
    console.log(`created ${created}  ·  updated ${updated}`);
    const total = await CurriculumLearningUnit.countDocuments({ tenantId, topicCode: TOPIC_CODE });
    console.log(`${TOPIC_CODE} now holds ${total} learning units, all DRAFT.`);
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
