/**
 * Publish the certified Foundation set for a tenant — as a service provisioning can call.
 *
 * ── THE SAME RULES AS THE ADMIN PUBLISH TOOL ─────────────────────────────────────────────
 *
 * publishCertifiedPublishSet.ts publishes through the HTTP admin route with an admin's login, and
 * checks the source tree against the certified commit with git. Neither travels: a deployment may
 * have no git checkout, and a fresh tenant may have no admin password anybody here knows. This is
 * the portable half of that tool.
 *
 * What it keeps is everything that protects the certification: the certified set and READY
 * inventory come from the committed fixtures; the tenant's READY inventory must be IDENTICAL to the
 * certified one, unit for unit; exactly the 338 are published, the withheld and PARTIAL units stay
 * draft, nothing outside the set may already be published, the set is prerequisite-closed. And each
 * unit is published by `publishUnit` — the handler the Admin route calls — so every publish gate the
 * product applies (own teaching, the readiness bar, the duration rule) applies here unchanged.
 *
 * ── RETRY-SAFE ────────────────────────────────────────────────────────────────────────────
 *
 * Only certified units still DRAFT are published; a unit already PUBLISHED is left alone, so a
 * second run publishes nothing. The run stops at the first refusal, and running it again resumes.
 */

import fs from 'fs';
import path from 'path';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import { loadCandidates } from './composerCandidateService';
import { ComposableUnit } from './curriculumComposerService';
import { typeRequiresTeaching } from '../data/unitReadinessPolicy';
import { teaches } from '../data/contentBundlePolicy';
import { publishUnit } from '../controllers/curriculumLearningUnitController';

/**
 * Re-certified after the nine T_VARIABLES concept units were authored.
 *
 * They existed as unit rows with no lesson, practice or checkpoint, which left them PARTIAL and
 * unpublishable — and PROGRAMMING_FUNDAMENTALS with no instructional unit the composer could
 * schedule at all. Authoring them moved READY 341 → 350 and PARTIAL 14 → 5; the audit's proposed
 * recommended set grew 338 → 347 and withholds the same three JS/DOM drafts as before.
 */
export const CERTIFIED_FOUNDATION = { total: 355, ready: 350, target: 347, withheld: 3, partial: 5 } as const;

/** Committed with the code, so every deployment certifies against the same set. */
const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'phase21');

export function loadCertifiedSet(): { target: string[]; withheld: string[]; readyCount: number; readyFixture: ComposableUnit[] } {
  const certified = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'publish-sets.json'), 'utf8'));
  const readyFixture = (JSON.parse(fs.readFileSync(path.join(FIXTURES, 'ready-inventory.json'), 'utf8')) as ComposableUnit[])
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  return {
    target: [...certified.recommended].sort(),
    withheld: [...certified.withheldFromRecommended].sort(),
    readyCount: Number(certified.readyCount),
    readyFixture,
  };
}

export interface CertifiedPublicationPlan {
  problems: string[];
  units: number;
  ready: number;
  partial: number;
  /** Certified units still DRAFT — what a publication would publish. */
  todo: string[];
  /** Certified units already PUBLISHED. */
  already: string[];
}

/** Everything that must be true before a single unit is published. Reads only. */
export async function planCertifiedPublication(tenantId: string): Promise<CertifiedPublicationPlan> {
  const E = CERTIFIED_FOUNDATION;
  const problems: string[] = [];
  const { target, withheld, readyCount, readyFixture } = loadCertifiedSet();
  const targetSet = new Set(target);

  if (target.length !== E.target || targetSet.size !== target.length) problems.push(`certified set has ${target.length} codes, expected ${E.target}`);
  if (withheld.length !== E.withheld) problems.push(`certified set withholds ${withheld.length}, expected ${E.withheld}`);
  if (readyCount !== E.ready || readyFixture.length !== E.ready) problems.push(`certified READY ${readyCount}/${readyFixture.length}, expected ${E.ready}`);

  const docs = await CurriculumLearningUnit.find({ tenantId, stageKey: 'foundation' }).sort({ unitCode: 1 }).lean() as any[];
  const byCode = new Map(docs.map(d => [String(d.unitCode), d]));
  const readyBefore = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');
  const readyUnits = [...readyBefore.units].sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  const readyCodes = new Set(readyUnits.map(u => u.unitCode));
  const partial = readyBefore.rejected.filter(r => r.readiness === 'PARTIAL').map(r => r.unitCode).sort();
  const otherRejected = readyBefore.rejected.filter(r => r.readiness !== 'PARTIAL');

  if (docs.length !== E.total) problems.push(`total units ${docs.length}, expected ${E.total}`);
  if (readyUnits.length !== E.ready) problems.push(`READY ${readyUnits.length}, expected ${E.ready}`);
  if (partial.length !== E.partial) problems.push(`PARTIAL ${partial.length}, expected ${E.partial}`);
  if (otherRejected.length) problems.push(`${otherRejected.length} unit(s) neither READY nor PARTIAL`);
  if (docs.some(d => d.status === 'ARCHIVED')) problems.push('archived units exist');
  if (JSON.stringify(readyUnits) !== JSON.stringify(readyFixture)) {
    const drifted = readyUnits
      .filter(u => JSON.stringify(u) !== JSON.stringify(readyFixture.find(f => f.unitCode === u.unitCode)))
      .map(u => u.unitCode);
    problems.push(`READY inventory differs from the certified inventory: ${drifted.slice(0, 10).join(', ') || 'membership'}`);
  }

  for (const code of target) {
    const d = byCode.get(code);
    if (!d) { problems.push(`${code}: does not exist`); continue; }
    if (!readyCodes.has(code)) problems.push(`${code}: not READY`);
    if (d.status !== 'DRAFT' && d.status !== 'PUBLISHED') problems.push(`${code}: status ${d.status}`);
    if (!(Number(d.estimatedMinutes) > 0)) problems.push(`${code}: no estimatedMinutes`);
  }
  const publishedOutside = docs.filter(d => d.status === 'PUBLISHED' && !targetSet.has(String(d.unitCode))).map(d => String(d.unitCode));
  if (publishedOutside.length) problems.push(`published outside the certified set: ${publishedOutside.join(', ')}`);
  const readyNotTarget = readyUnits.map(u => u.unitCode).filter(c => !targetSet.has(c)).sort();
  if (JSON.stringify(readyNotTarget) !== JSON.stringify(withheld)) problems.push(`READY outside the set is ${readyNotTarget.join(', ')}, certified withheld ${withheld.join(', ')}`);
  if (partial.some(c => targetSet.has(c))) problems.push('a PARTIAL unit is in the certified set');

  const unclosed = target.flatMap(c => ((byCode.get(c)?.prerequisiteUnitCodes || []) as string[])
    .filter(p => !targetSet.has(String(p))).map(p => `${c} -> ${p}`));
  if (unclosed.length) problems.push(`not prerequisite-closed: ${unclosed.slice(0, 5).join(', ')}`);

  const ownTeaching = await LearningContentLibrary.find({ tenantId, unitCode: { $in: target }, isPublished: true })
    .select('unitCode type').lean() as any[];
  const teachingCodes = new Set(ownTeaching.filter(r => teaches(String(r.type))).map(r => String(r.unitCode)));
  const noTeaching = target.filter(c => byCode.get(c) && typeRequiresTeaching(byCode.get(c)!.unitType) && !teachingCodes.has(c));
  if (noTeaching.length) problems.push(`the publish gate would refuse (no own teaching): ${noTeaching.join(', ')}`);

  return {
    problems,
    units: docs.length,
    ready: readyUnits.length,
    partial: partial.length,
    todo: target.filter(c => byCode.get(c)?.status === 'DRAFT'),
    already: target.filter(c => byCode.get(c)?.status === 'PUBLISHED'),
  };
}

export interface CertifiedPublicationResult {
  plan: CertifiedPublicationPlan;
  published: string[];
  /** The first refusal from the publish handler, if any; nothing after it was attempted. */
  refused: string | null;
}

/**
 * Publish the certified units still DRAFT, one at a time, through the product's publish handler.
 *
 * Nothing is published when the plan has problems. `actor` is recorded as `updatedBy` on every unit
 * this publishes, so a provisioned publication is distinguishable from an admin's forever.
 */
export async function publishCertifiedFoundation(tenantId: string, actor: string): Promise<CertifiedPublicationResult> {
  const plan = await planCertifiedPublication(tenantId);
  if (plan.problems.length) return { plan, published: [], refused: null };

  const published: string[] = [];
  for (const unitCode of plan.todo) {
    const out: any = { status: 200, body: null };
    const res: any = {
      status: (c: number) => { out.status = c; return res; },
      json: (b: any) => { out.body = b; return res; },
    };
    await publishUnit({ user: { tenantId, email: actor }, tenantId, params: { unitCode }, body: {}, query: {}, headers: {} } as any, res);
    if (out.status !== 200 || out.body?.published !== true) {
      return { plan, published, refused: `${unitCode}: ${out.status} ${JSON.stringify(out.body).slice(0, 240)}` };
    }
    published.push(unitCode);
  }
  return { plan, published, refused: null };
}
