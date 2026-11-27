/**
 * Which product a Content Library row belongs to: the LMS, or CareerPilot.
 *
 * Library rows carry no audience field. They do not need one: every CareerPilot row is bound to a
 * CareerPilot learning unit (`unitCode`) or topic (`topicCode`), or was written by the old funnel
 * generator (createdBy 'ai-day-gen'). An LMS row has none of the three. The Content Library's
 * LMS / CareerPilot tabs read this; with no `product` asked for, the list is what it always was.
 *
 * Splitting a view is all this does. Nothing here limits reuse: an LMS curriculum may still pick a
 * CareerPilot video, because the Curriculum Builder's picker asks for no product.
 */
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';

export type ContentProduct = 'lms' | 'careerpilot';
export const isContentProduct = (v: any): v is ContentProduct => v === 'lms' || v === 'careerpilot';

/** The years and tracks, in teaching order, as an admin names them. Keys are CurriculumLearningUnit.stageKey. */
export const CP_STAGES: { key: string; label: string }[] = [
  { key: 'foundation', label: 'Year 1 · Foundation' },
  { key: 'build',      label: 'Year 2 · Build' },
  { key: 'specialize', label: 'Year 3 · Specialize' },
  { key: 'placement',  label: 'Year 4 · Placement' },
  { key: 'track',      label: 'Career tracks' },
];
const stageLabel = (k: string) => CP_STAGES.find(s => s.key === k)?.label || k;

const hasUnit = { unitCode: { $exists: true, $nin: [null, ''] } };
const hasTopic = { topicCode: { $exists: true, $nin: [null, ''] } };
const noUnit = { $or: [{ unitCode: { $exists: false } }, { unitCode: { $in: [null, ''] } }] };
const generated = { createdBy: 'ai-day-gen' };

/** The condition on a library row for one product. Push it into the query's $and. */
export function productCondition(product: ContentProduct): any {
  return product === 'lms'
    ? { $nor: [hasUnit, hasTopic, generated] }
    : { $or: [hasUnit, hasTopic, generated] };
}

/**
 * Rows of one year or track. A row bound to a unit follows the unit's stage; a row bound only to a
 * topic follows the stage that holds the topic. `null` when the stage is unknown (no filter).
 */
export async function stageCondition(tenantId: string, stage: string): Promise<any | null> {
  if (!CP_STAGES.some(s => s.key === stage)) return null;
  const units = await CurriculumLearningUnit.find({ tenantId: String(tenantId), stageKey: stage })
    .select('unitCode topicCode').lean() as any[];
  const unitCodes = [...new Set(units.map(u => u.unitCode).filter(Boolean))];
  const topicCodes = [...new Set(units.map(u => u.topicCode).filter(Boolean))];
  return { $or: [{ unitCode: { $in: unitCodes } }, { $and: [noUnit, { topicCode: { $in: topicCodes } }] }] };
}

/**
 * Each row with the CareerPilot unit it belongs to — `cpUnit: { unitCode, title, stageKey,
 * stageLabel }` — so a list of thousands of videos says where each one is taught. Rows with no
 * unit (topic-level or generated) get the stage of their topic when one is known, else nothing.
 */
export async function withCareerPilotPlace(tenantId: string, rows: any[]): Promise<any[]> {
  const unitCodes = [...new Set(rows.map(r => r.unitCode).filter(Boolean))];
  const topicCodes = [...new Set(rows.filter(r => !r.unitCode && r.topicCode).map(r => r.topicCode))];
  if (!unitCodes.length && !topicCodes.length) return rows;
  const units = await CurriculumLearningUnit.find({
    tenantId: String(tenantId),
    $or: [{ unitCode: { $in: unitCodes } }, { topicCode: { $in: topicCodes } }],
  }).select('unitCode topicCode title stageKey').lean() as any[];
  const byUnit = new Map(units.map(u => [u.unitCode, u]));
  const stageOfTopic = new Map<string, string>();
  for (const u of units) if (u.topicCode && !stageOfTopic.has(u.topicCode)) stageOfTopic.set(u.topicCode, u.stageKey);
  return rows.map(r => {
    const u = r.unitCode ? byUnit.get(r.unitCode) : null;
    if (u) return { ...r, cpUnit: { unitCode: u.unitCode, title: u.title, stageKey: u.stageKey, stageLabel: stageLabel(u.stageKey) } };
    const st = r.topicCode ? stageOfTopic.get(r.topicCode) : undefined;
    return st ? { ...r, cpUnit: { unitCode: '', title: '', stageKey: st, stageLabel: stageLabel(st) } } : r;
  });
}
