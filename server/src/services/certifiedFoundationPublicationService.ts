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
 * certified one, unit for unit; exactly the certified set is published, the withheld and PARTIAL units stay
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
import { INTENTIONALLY_WITHHELD_READY } from '../data/productionPublicationPolicy';
import { publishUnit, setUnitStatus } from '../controllers/curriculumLearningUnitController';

/**
 * Re-certified after the nine T_VARIABLES concept units were authored.
 *
 * They existed as unit rows with no lesson, practice or checkpoint, which left them PARTIAL and
 * unpublishable — and PROGRAMMING_FUNDAMENTALS with no instructional unit the composer could
 * schedule at all. Authoring them moved READY 341 → 350 and PARTIAL 14 → 5; the audit's proposed
 * recommended set grew 338 → 347 and withholds the same three JS/DOM drafts as before.
 *
 * Re-certified again after four first-pass PRACTICE units were authored — files, variables, functions
 * and arrays each gained a practice at an earlier natural boundary than their existing one, which
 * became the deeper practice — and the practice paths of the nine foundation progression topics were
 * re-authored. Total 355 → 359, READY 350 → 354, recommended 347 → 351: exactly the previous set plus
 * the four new units. Withheld is still the same three JS/DOM drafts and PARTIAL the same five.
 *
 * Re-certified again after the composer began teaching topics as bounded blocks along course strands, with
 * the programming spine keeping its place. The derivation now reaches 350 of the 354 READY units: the same
 * three JS/DOM lessons withheld by name, and T_FUNCTIONS_DOCSTRINGS, which no supported composition, sweep
 * or recomposition selects any more (it is off the path to both functions practices). That unit is not
 * withheld by decision: it is READY, not recommended, and so not published. `notRecommended` counts it.
 */
export const CERTIFIED_FOUNDATION = { total: 359, ready: 354, target: 350, withheld: 3, notRecommended: 1, partial: 5 } as const;

/** Committed with the code, so every deployment certifies against the same set. */
const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'phase21');

/**
 * The certified set and what it leaves out, as the audit derived them.
 *
 * `withheld` is every READY unit outside the set. It has exactly two derived parts, and they mean different
 * things: `named`, withheld by decision in productionPublicationPolicy, and `notRecommended`, READY units no
 * certification scenario selects. Neither is published; only the named ones are a standing decision.
 */
export function loadCertifiedSet(): {
  target: string[]; withheld: string[]; named: string[]; notRecommended: string[]; readyCount: number; readyFixture: ComposableUnit[];
} {
  const certified = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'publish-sets.json'), 'utf8'));
  const readyFixture = (JSON.parse(fs.readFileSync(path.join(FIXTURES, 'ready-inventory.json'), 'utf8')) as ComposableUnit[])
    .sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  return {
    target: [...certified.recommended].sort(),
    withheld: [...certified.withheldFromRecommended].sort(),
    named: [...(certified.intentionallyWithheld || [])].sort(),
    notRecommended: [...(certified.notRecommended || [])].sort(),
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
  /**
   * Units PUBLISHED that the certified derivation marks READY and not recommended: a publication the certified set
   * no longer includes. Reconciled to DRAFT through the product's status handler. Anything else published outside the
   * set is a problem, not something to reconcile.
   */
  toUnpublish: string[];
}

/** Everything that must be true before a single unit is published. Reads only. */
export async function planCertifiedPublication(tenantId: string): Promise<CertifiedPublicationPlan> {
  const E = CERTIFIED_FOUNDATION;
  const problems: string[] = [];
  const { target, withheld, named: namedFixture, notRecommended, readyCount, readyFixture } = loadCertifiedSet();
  const targetSet = new Set(target);

  if (target.length !== E.target || targetSet.size !== target.length) problems.push(`certified set has ${target.length} codes, expected ${E.target}`);
  if (namedFixture.length !== E.withheld) problems.push(`certified set withholds ${namedFixture.length} by decision, expected ${E.withheld}`);
  if (notRecommended.length !== E.notRecommended) problems.push(`certified set leaves ${notRecommended.length} READY unit(s) not recommended, expected ${E.notRecommended}`);
  // The two derived parts, and nothing else, are what the set leaves out.
  if (JSON.stringify([...namedFixture, ...notRecommended].sort()) !== JSON.stringify(withheld)) {
    problems.push(`certified withheld ${withheld.join(', ')} is not the named withheld plus the not-recommended units`);
  }
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
  const notRecommendedSet = new Set(notRecommended);
  const publishedOutside = docs.filter(d => d.status === 'PUBLISHED' && !targetSet.has(String(d.unitCode))).map(d => String(d.unitCode));
  const toUnpublish = publishedOutside.filter(c => notRecommendedSet.has(c) && readyCodes.has(c));
  const unexplained = publishedOutside.filter(c => !toUnpublish.includes(c));
  if (unexplained.length) problems.push(`published outside the certified set: ${unexplained.join(', ')}`);
  const readyNotTarget = readyUnits.map(u => u.unitCode).filter(c => !targetSet.has(c)).sort();
  if (JSON.stringify(readyNotTarget) !== JSON.stringify(withheld)) problems.push(`READY outside the set is ${readyNotTarget.join(', ')}, certified withheld ${withheld.join(', ')}`);
  /**
   * The certified withholding must be the DECISION, not an accident of reachability: every READY unit left
   * out of the set is named in productionPublicationPolicy, every named unit is still READY, and none of
   * them is in the set or published. Anything else is a certified set nobody decided on.
   */
  const named = [...INTENTIONALLY_WITHHELD_READY].sort();
  if (JSON.stringify(namedFixture) !== JSON.stringify(named)) {
    problems.push(`certified withheld-by-decision ${namedFixture.join(', ') || '(none)'} is not the named withheld list ${named.join(', ')}`);
  }
  for (const code of notRecommended) {
    if (named.includes(code)) problems.push(`${code}: both named withheld and not recommended`);
    if (!readyCodes.has(code)) problems.push(`${code}: certified as READY and not recommended, but not READY`);
  }
  for (const code of named) {
    if (targetSet.has(code)) problems.push(`${code}: withheld by decision but in the certified set`);
    if (!readyCodes.has(code)) problems.push(`${code}: withheld by decision but no longer READY — the list needs a decision`);
    if (byCode.get(code)?.status === 'PUBLISHED') problems.push(`${code}: withheld by decision but PUBLISHED`);
  }
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
    toUnpublish,
  };
}

export interface CertifiedPublicationResult {
  plan: CertifiedPublicationPlan;
  published: string[];
  /** Units moved back to DRAFT because the certified set no longer recommends them. */
  unpublished: string[];
  /** The first refusal from the status or publish handler, if any; nothing after it was attempted. */
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
  if (plan.problems.length) return { plan, published: [], unpublished: [], refused: null };

  /**
   * RECONCILE FIRST: a unit the certified set no longer recommends goes back to DRAFT, through the handler the Admin
   * status route calls. Its gate applies unchanged: a unit on students' live journeys is refused unless somebody
   * confirmed that, and provisioning never confirms on anyone's behalf. The unit stays READY and editable.
   */
  const unpublished: string[] = [];
  for (const unitCode of plan.toUnpublish) {
    const out: any = { status: 200, body: null };
    const res: any = {
      status: (c: number) => { out.status = c; return res; },
      json: (b: any) => { out.body = b; return res; },
    };
    await setUnitStatus({ user: { tenantId, email: actor }, tenantId, params: { unitCode }, body: { status: 'DRAFT' }, query: {}, headers: {} } as any, res);
    if (out.status !== 200 || out.body?.unit?.status !== 'DRAFT') {
      return { plan, published: [], unpublished, refused: `${unitCode}: ${out.status} ${JSON.stringify(out.body).slice(0, 240)}` };
    }
    unpublished.push(unitCode);
  }

  const published: string[] = [];
  for (const unitCode of plan.todo) {
    const out: any = { status: 200, body: null };
    const res: any = {
      status: (c: number) => { out.status = c; return res; },
      json: (b: any) => { out.body = b; return res; },
    };
    await publishUnit({ user: { tenantId, email: actor }, tenantId, params: { unitCode }, body: {}, query: {}, headers: {} } as any, res);
    if (out.status !== 200 || out.body?.published !== true) {
      return { plan, published, unpublished, refused: `${unitCode}: ${out.status} ${JSON.stringify(out.body).slice(0, 240)}` };
    }
    published.push(unitCode);
  }
  return { plan, published, unpublished, refused: null };
}
