/**
 * Give the Year-1 curriculum something to actually teach with.
 *
 * WHY THIS EXISTS. The planner decides "Loops, foundation depth, difficulty 1-2" and then looks
 * for material — and finds none, because the content library is empty. A plan with correct
 * decisions and nothing behind them is a list of topics a student cannot open, which is worse
 * than no plan: it looks finished.
 *
 * THE PRACTICE IS REAL. Every practice question comes from the tenant's own question bank,
 * selected by the same skill mapping the assessment uses — so what a student practises is
 * genuinely about the skill the topic teaches, at the difficulty the planner asked for.
 *
 * THE NOTES ARE PLACEHOLDERS, AND SAY SO IN THE BODY. Writing real teaching material is authoring
 * work measured in weeks; this exists so the flow can be walked end to end today. A student
 * opening one sees clearly that it is scaffolding, rather than being quietly served empty pages
 * and concluding the product is broken.
 *
 * TWO DEPTHS PER SKILL, because one depth cannot demonstrate the thing the depth axis exists for:
 * a student meeting a skill gets the slow build, one revising gets the recap, and the planner
 * chooses between them from what it measured.
 *
 *   npx ts-node src/seeds/careerPilot/seedFoundationContent.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedFoundationContent.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../../models/LearningContentLibrary';
import LearningCurriculum from '../../models/LearningCurriculum';
import CareerSkill from '../../models/CareerSkill';
import SkillEvidence from '../../models/SkillEvidence';
import { FOUNDATION_TITLE } from './createFoundationCurriculum';

dotenv.config();

/** Marks rows this seed owns, so re-running updates rather than duplicating. */
const CREATED_BY = 'foundation-content-seed';

const DEPTHS: { depth: 'FOUNDATION' | 'STANDARD'; label: string; minutes: number; difficulty: [number, number] }[] = [
  { depth: 'FOUNDATION', label: 'from the start', minutes: 25, difficulty: [1, 2] },
  { depth: 'STANDARD', label: 'recap', minutes: 12, difficulty: [2, 3] },
];

export interface ContentSeedReport {
  skills: number;
  notesWritten: number;
  practiceWritten: number;
  skillsWithNoQuestions: string[];
  applied: boolean;
}

export async function seedFoundationContent(opts: {
  tenantId: string; apply?: boolean;
}): Promise<ContentSeedReport> {
  const { tenantId } = opts;
  const report: ContentSeedReport = {
    skills: 0, notesWritten: 0, practiceWritten: 0, skillsWithNoQuestions: [], applied: false,
  };

  const curriculum = await LearningCurriculum.findOne({ tenantId, title: FOUNDATION_TITLE }).lean() as any;
  if (!curriculum) throw new Error(`No "${FOUNDATION_TITLE}" for tenant ${tenantId}. Run createFoundationCurriculum first.`);

  const skillKeys = Array.from(new Set(
    (curriculum.topics || []).flatMap((t: any) => t.skillKeys || []),
  )) as string[];
  report.skills = skillKeys.length;

  const skills = await CareerSkill.find({ key: { $in: skillKeys } }).select('key name').lean() as any[];
  const nameOf = new Map(skills.map(s => [String(s.key), s.name || s.key]));

  // Questions already mapped to these skills — the practice comes from here, not from nowhere.
  const mappings = await SkillEvidence.find({
    tenantId, sourceType: 'question', skillKey: { $in: skillKeys }, contribution: 'PRIMARY', active: true,
  }).select('sourceId skillKey').lean() as any[];

  const questionIdsBySkill = new Map<string, string[]>();
  for (const mp of mappings) {
    const k = String(mp.skillKey).toUpperCase();
    if (!questionIdsBySkill.has(k)) questionIdsBySkill.set(k, []);
    questionIdsBySkill.get(k)!.push(String(mp.sourceId));
  }

  const db = mongoose.connection;
  const ops: any[] = [];

  for (const key of skillKeys) {
    const name = nameOf.get(key) || key;
    const qIds = (questionIdsBySkill.get(key) || [])
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (!qIds.length) report.skillsWithNoQuestions.push(key);

    const questions = qIds.length
      ? await db.collection('questions').find({ _id: { $in: qIds } })
          .project({ question: 1, options: 1, correctAnswers: 1, explanation: 1, marks: 1, difficultyLevel: 1 })
          .limit(12).toArray()
      : [];

    for (const d of DEPTHS) {
      /**
       * Notes. Deliberately honest about being scaffolding — a student who opens a placeholder
       * expecting a lesson and finds three sentences should be told why, not left guessing
       * whether the page failed to load.
       */
      ops.push({
        updateOne: {
          filter: { tenantId, createdBy: CREATED_BY, type: 'notes', skillKeys: [key], learningDepth: d.depth },
          update: {
            $set: {
              tenantId, type: 'notes', createdBy: CREATED_BY,
              title: `${name} — ${d.label}`,
              description: `${d.depth === 'FOUNDATION' ? 'A first pass at' : 'A quick refresher on'} ${name}.`,
              notesSource: 'richtext',
              notesContent: `<h2>${name}</h2>`
                + `<p><em>This is placeholder material, so the learning flow can be walked end to end. `
                + `The real ${name} lesson has not been written yet.</em></p>`
                + (d.depth === 'FOUNDATION'
                  ? `<p>A foundation lesson would build ${name} from nothing: what it is, why it exists, `
                    + `and a worked example before any exercise.</p>`
                  : `<p>A recap would assume ${name} is known and cover only what people forget.</p>`),
              topicTags: [name, key],
              skillKeys: [key],
              learningDepth: d.depth,
              estimatedDuration: d.minutes,
              difficulty: d.depth === 'FOUNDATION' ? 'beginner' : 'intermediate',
              canonical: true,
              isPublished: true,
            },
          },
          upsert: true,
        },
      });
      report.notesWritten++;

      /**
       * Practice, built from the real bank at the difficulty this depth asks for.
       *
       * The 1-5 scale on a question maps onto the 1-4 the planner assigns against, the same way
       * the assessment adapter does it — 1-2 easy, 3 medium, 4-5 hard.
       */
      const band = (q: any): number => {
        const n = Number(q.difficultyLevel);
        if (!Number.isFinite(n)) return 2;
        return n <= 2 ? 1 : n === 3 ? 2 : 4;
      };
      const picked = questions
        .filter(q => band(q) >= d.difficulty[0] && band(q) <= d.difficulty[1])
        .slice(0, 5);

      if (picked.length) {
        ops.push({
          updateOne: {
            filter: { tenantId, createdBy: CREATED_BY, type: 'practice_theory', skillKeys: [key], learningDepth: d.depth },
            update: {
              $set: {
                tenantId, type: 'practice_theory', createdBy: CREATED_BY,
                title: `${name} — practice (${d.label})`,
                description: `${picked.length} questions on ${name}, from your question bank.`,
                topicTags: [name, key],
                skillKeys: [key],
                learningDepth: d.depth,
                difficultyLevel: d.difficulty[0],
                estimatedDuration: Math.max(5, picked.length * 2),
                canonical: true,
                isPublished: true,
                practiceQuestions: picked.map((q: any) => ({
                  type: 'mcq',
                  title: String(q.question || '').slice(0, 90),
                  description: String(q.question || ''),
                  difficulty: d.depth === 'FOUNDATION' ? 'easy' : 'medium',
                  options: (q.options || []).map((o: any) => ({
                    text: typeof o === 'string' ? o : (o.text || ''),
                    isCorrect: typeof o === 'object'
                      ? !!o.isCorrect
                      : (q.correctAnswers || []).includes(o),
                  })),
                  explanation: q.explanation || '',
                  marks: q.marks || 1,
                  gradingMode: 'auto',
                })),
              },
            },
            upsert: true,
          },
        });
        report.practiceWritten++;
      }
    }
  }

  if (!opts.apply) return report;

  if (ops.length) await LearningContentLibrary.bulkWrite(ops, { ordered: false });
  report.applied = true;
  return report;
}

/* ------------------------------------------------------------------ */

if (require.main === module) {
  (async () => {
    const tenantId = process.argv[2];
    const apply = process.argv.includes('--apply');
    if (!tenantId) { console.error('Usage: seedFoundationContent.ts <tenantId> [--apply]'); process.exit(1); }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const r = await seedFoundationContent({ tenantId, apply });

    console.log(`\nskills in the curriculum : ${r.skills}`);
    console.log(`notes rows               : ${r.notesWritten}   (2 depths per skill)`);
    console.log(`practice rows            : ${r.practiceWritten}  (from your own question bank)`);
    if (r.skillsWithNoQuestions.length) {
      console.log(`\nno questions for ${r.skillsWithNoQuestions.length} skills — notes only:`);
      console.log('  ' + r.skillsWithNoQuestions.join(', '));
    }
    console.log(apply ? '\n✅ written' : '\n(dry run — pass --apply to write)');
    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
