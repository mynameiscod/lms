import Question from '../models/Question';
import SkillEvidence from '../models/SkillEvidence';
import AssessmentItem from '../models/AssessmentItem';
import { BACKEND_PILOT_QUESTIONS, EXISTING_REUSE, PilotQuestion } from '../data/backendPilotQuestionBank';

/**
 * Install the Backend Engineer pilot content and its evidence mappings.
 *
 * IDEMPOTENT BY NATURAL KEY. Each authored question carries `cpkey:<KEY>` in its tags, and
 * that tag is the identity. A second run finds the existing row and leaves it completely
 * alone — it does not update text, options or difficulty. That is deliberate: an admin who
 * corrects a question through the UI must not have their edit silently reverted by a
 * redeploy. Changing an item after release means giving it a new key.
 *
 * MAPPINGS ARE SEPARATE FROM CONTENT. Evidence rows are keyed on
 * (sourceType, sourceId, skillKey) and re-asserted every run, because a mapping is
 * configuration rather than authored work and re-establishing it is safe. Existing bank
 * items are mapped by the selectors in EXISTING_REUSE, which name the reason each row
 * qualifies rather than matching a keyword.
 */

export interface SeedReport {
  dryRun: boolean;
  questions: { created: string[]; skipped: string[] };
  evidence: { created: number; alreadyPresent: number; reusedExisting: number };
  bySkill: Record<string, { authored: number; reused: number }>;
}

const tagFor = (key: string) => `cpkey:${key}`;

/** The one place a pilot question becomes a Question document. */
function toQuestionDoc(q: PilotQuestion, tenantId: string, createdBy: string) {
  return {
    tenantId,
    createdBy,
    type: 'mcq_single' as const,
    question: q.question,
    options: q.options.map((text, i) => ({ text, isCorrect: i === q.correctIndex })),
    marks: 1,
    difficultyLevel: q.difficulty,
    explanation: q.explanation,
    subject: q.subject,
    topic: q.topic,
    // `cpkey:` is the idempotency key; the skill tag makes the set findable in the admin UI.
    tags: [tagFor(q.key), 'careerpilot-pilot', q.skillKey],
    // Authored by a person, not generated. The model records provenance and it should be true.
    source: 'manual' as const,
    usageCount: 0,
  };
}

export async function seedBackendPilotContent(opts: {
  tenantId: string;
  createdBy?: string;
  dryRun?: boolean;
}): Promise<SeedReport> {
  const { tenantId } = opts;
  const createdBy = opts.createdBy || 'system';
  const dryRun = opts.dryRun === true;

  const report: SeedReport = {
    dryRun,
    questions: { created: [], skipped: [] },
    evidence: { created: 0, alreadyPresent: 0, reusedExisting: 0 },
    bySkill: {},
  };
  const bump = (skill: string, field: 'authored' | 'reused') => {
    report.bySkill[skill] = report.bySkill[skill] || { authored: 0, reused: 0 };
    report.bySkill[skill][field] += 1;
  };

  // ── Authored questions ────────────────────────────────────────────────────
  const existing = await Question.find({ tenantId, tags: { $in: BACKEND_PILOT_QUESTIONS.map(q => tagFor(q.key)) } })
    .select('_id tags').lean() as any[];
  const idByKey = new Map<string, string>();
  for (const row of existing) {
    for (const t of row.tags || []) {
      if (String(t).startsWith('cpkey:')) idByKey.set(String(t).slice(6), String(row._id));
    }
  }

  for (const q of BACKEND_PILOT_QUESTIONS) {
    if (idByKey.has(q.key)) {
      report.questions.skipped.push(q.key);
      continue;
    }
    report.questions.created.push(q.key);
    if (dryRun) continue;
    const created = await Question.create(toQuestionDoc(q, tenantId, createdBy));
    idByKey.set(q.key, String(created._id));
  }

  // ── Evidence for the authored questions ───────────────────────────────────
  for (const q of BACKEND_PILOT_QUESTIONS) {
    bump(q.skillKey, 'authored');
    const sourceId = idByKey.get(q.key);
    if (!sourceId) continue;                    // dry run, or creation skipped
    const filter = { sourceType: 'question' as const, sourceId, skillKey: q.skillKey };
    const already = await SkillEvidence.findOne(filter).select('_id').lean();
    if (already) { report.evidence.alreadyPresent += 1; continue; }
    report.evidence.created += 1;
    if (dryRun) continue;
    await SkillEvidence.create({
      ...filter, tenantId, contribution: 'PRIMARY', active: true, createdBy,
    });
  }

  // ── Evidence for genuinely reusable existing items ────────────────────────
  for (const reuse of EXISTING_REUSE) {
    const ids: string[] = reuse.sourceType === 'assessment_item'
      ? (await AssessmentItem.find({ tenantId, [reuse.match.field]: reuse.match.value }).select('_id').lean() as any[]).map(r => String(r._id))
      : (await Question.find({ tenantId, [reuse.match.field]: reuse.match.value }).select('_id').lean() as any[]).map(r => String(r._id));

    for (const sourceId of ids) {
      bump(reuse.skillKey, 'reused');
      const filter = { sourceType: reuse.sourceType, sourceId, skillKey: reuse.skillKey };
      const already = await SkillEvidence.findOne(filter).select('_id').lean();
      if (already) { report.evidence.alreadyPresent += 1; continue; }
      report.evidence.created += 1;
      report.evidence.reusedExisting += 1;
      if (dryRun) continue;
      await SkillEvidence.create({
        ...filter, tenantId, contribution: 'PRIMARY', active: true, createdBy,
      });
    }
  }

  return report;
}
