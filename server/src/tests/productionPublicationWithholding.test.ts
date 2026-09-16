/**
 * Units withheld from production BY DECISION, and nothing withheld by accident.
 *
 * The recommended publish set is derived from what certification scenarios reach. Three JS/DOM lessons
 * are READY and deliberately unpublished; once STANDARD-known compression freed capacity, recomposition
 * scenarios reached them and the derivation proposed publishing them. The withholding is now a named
 * list the derivation honours. These tests hold both halves: the named units never enter the set, and
 * the list cannot become a way to ignore anything else.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import { ComposableUnit } from '../services/curriculumComposerService';
import {
  REALISTIC_PROFILES, compose, skillUniverse, stateBoundaryProfiles, diagnosticSkills,
} from '../services/composerCertificationService';
import {
  INTENTIONALLY_WITHHELD_READY, deriveRecommendedPublishSet, publicationDrift,
} from '../data/productionPublicationPolicy';

const READY = READY_JSON as unknown as ComposableUnit[];
const READY_CODES = READY.map(u => u.unitCode);
const NAMED = ['T_JS_DOM_ARRAYS_AND_OBJECTS', 'T_JS_DOM_FUNCTIONS', 'T_JS_DOM_VALUES_AND_VARIABLES'];
/** The certified set is what production publishes, so it stands in for PUBLISHED here. */
const PUBLISHED = [...SETS.recommended];
/** READY units no certification scenario reaches: left out of the set by derivation, not by decision. */
const NOT_RECOMMENDED = [...SETS.notRecommended].sort();

describe('the named withheld list', () => {
  it('is exactly the three decided units, by code', () => {
    expect([...INTENTIONALLY_WITHHELD_READY].sort()).toEqual(NAMED);
    expect([...SETS.intentionallyWithheld].sort()).toEqual(NAMED);
  });

  it('1. keeps exactly those three out of the recommended set, even when every READY unit is reached', () => {
    const d = deriveRecommendedPublishSet({ reached: READY_CODES, universe: READY });
    expect(READY_CODES.filter(c => !d.recommended.has(c)).sort()).toEqual(NAMED);
    // Reaching everything recommends the certified set plus exactly the units certification no longer reaches.
    expect([...d.recommended].sort()).toEqual([...SETS.recommended, ...NOT_RECOMMENDED].sort());
    expect(d.withheldReady).toEqual(NAMED);
    expect(d.notRecommended).toEqual([]);
    expect(d.withheldRequired).toEqual([]);
  });

  it('2. leaves them READY', () => {
    expect(NAMED.every(c => READY_CODES.includes(c))).toBe(true);
    expect(SETS.readyCount).toBe(READY.length);
  });

  it('3. leaves them unpublished — outside the certified set production publishes', () => {
    expect(NAMED.filter(c => PUBLISHED.includes(c))).toEqual([]);
    // Everything READY outside the set is the named three plus the derived not-recommended units, and nothing else.
    expect([...SETS.withheldFromRecommended].sort()).toEqual([...NAMED, ...NOT_RECOMMENDED].sort());
    expect(publicationDrift({ published: PUBLISHED, certified: SETS.recommended, ready: READY_CODES }).ok).toBe(true);
  });

  it('4. never makes them composer-eligible in production', () => {
    const production = READY.filter(u => PUBLISHED.includes(u.unitCode));
    expect(production.some(u => NAMED.includes(u.unitCode))).toBe(false);
    const { allSkills, universalSkills } = skillUniverse(READY);
    const d = diagnosticSkills();
    const learners = [
      ...REALISTIC_PROFILES.map(p => p.build(allSkills, universalSkills)),
      ...stateBoundaryProfiles(d, d).map(b => b.student),
    ];
    for (const s of learners) {
      expect(compose(production, s).units.filter(u => NAMED.includes(u.unitCode))).toEqual([]);
    }
  });
});

describe('READY units the certified set leaves out without a decision', () => {
  it('are derived as not recommended from the committed inventory, never named, never in the set', () => {
    const reached = SETS.recommended;
    const d = deriveRecommendedPublishSet({ reached, universe: READY });
    expect(d.notRecommended).toEqual(NOT_RECOMMENDED);
    expect(NOT_RECOMMENDED.filter(c => NAMED.includes(c))).toEqual([]);
    expect(NOT_RECOMMENDED.filter(c => PUBLISHED.includes(c))).toEqual([]);
    expect(NOT_RECOMMENDED.every(c => READY_CODES.includes(c))).toBe(true);
    // Publishing one of them is drift like any other extra publication.
    for (const code of NOT_RECOMMENDED) {
      const drift = publicationDrift({ published: [...PUBLISHED, code], certified: SETS.recommended, ready: READY_CODES });
      expect(drift.ok).toBe(false);
      expect(drift.extra).toEqual([code]);
    }
  });
});

describe('the list cannot hide anything it does not name', () => {
  const EXTRA: ComposableUnit = {
    ...READY[0], unitCode: 'T_SOMETHING_NEW_PRACTICE', topicCode: 'T_SOMETHING_NEW', prerequisiteUnitCodes: [],
  };

  it('5. recommends a fourth READY, unpublished, reachable unit that is not named', () => {
    const d = deriveRecommendedPublishSet({ reached: [...PUBLISHED, EXTRA.unitCode], universe: [...READY, EXTRA] });
    expect(d.recommended.has(EXTRA.unitCode)).toBe(true);
    // And the certified publication would then be missing it — normal drift, not silence.
    const drift = publicationDrift({ published: PUBLISHED, certified: [...d.recommended], ready: [...READY_CODES, EXTRA.unitCode] });
    expect(drift.ok).toBe(false);
    expect(drift.missing).toEqual([EXTRA.unitCode]);
  });

  it('reports a READY unit nobody reached and nobody named as not recommended, rather than as withheld', () => {
    const d = deriveRecommendedPublishSet({ reached: PUBLISHED, universe: [...READY, EXTRA] });
    // Alongside the committed inventory's own not-recommended units, and never as withheld.
    expect(d.notRecommended).toEqual([...NOT_RECOMMENDED, EXTRA.unitCode].sort());
    expect(d.withheldReady).toEqual(NAMED);
  });

  it('6. recommends a unit again the moment it is removed from the named list', () => {
    const shortened = NAMED.filter(c => c !== 'T_JS_DOM_VALUES_AND_VARIABLES');
    const d = deriveRecommendedPublishSet({ reached: READY_CODES, universe: READY, withheld: shortened });
    expect(d.recommended.has('T_JS_DOM_VALUES_AND_VARIABLES')).toBe(true);
    const drift = publicationDrift({ published: PUBLISHED, certified: [...d.recommended], ready: READY_CODES, withheld: shortened });
    // Reaching every READY unit also recommends the not-recommended ones; the removed name is missing among them.
    expect(drift.missing).toEqual([...NOT_RECOMMENDED, 'T_JS_DOM_VALUES_AND_VARIABLES'].sort());
    expect(drift.ok).toBe(false);
  });

  it('7. fails when an unexpected unit is published', () => {
    const drift = publicationDrift({ published: [...PUBLISHED, 'T_JS_DOM_FUNCTIONS'], certified: SETS.recommended, ready: READY_CODES });
    expect(drift.ok).toBe(false);
    expect(drift.extra).toEqual(['T_JS_DOM_FUNCTIONS']);
    expect(drift.withheldPublished).toEqual(['T_JS_DOM_FUNCTIONS']);

    const other = publicationDrift({ published: [...PUBLISHED, 'T_UNCERTIFIED_UNIT'], certified: SETS.recommended, ready: READY_CODES });
    expect(other.ok).toBe(false);
    expect(other.extra).toEqual(['T_UNCERTIFIED_UNIT']);
  });

  it('8. fails when an expected certified unit is not published', () => {
    const dropped = PUBLISHED[0];
    const drift = publicationDrift({ published: PUBLISHED.slice(1), certified: SETS.recommended, ready: READY_CODES });
    expect(drift.ok).toBe(false);
    expect(drift.missing).toEqual([dropped]);
  });

  it('fails when a named unit stops being READY, so a stale list gets a decision', () => {
    const drift = publicationDrift({
      published: PUBLISHED, certified: SETS.recommended, ready: READY_CODES.filter(c => c !== 'T_JS_DOM_FUNCTIONS'),
    });
    expect(drift.ok).toBe(false);
    expect(drift.withheldNotReady).toEqual(['T_JS_DOM_FUNCTIONS']);
  });

  it('reports a conflict, never silently publishing or dropping, when a recommended unit requires a withheld one', () => {
    const dependent: ComposableUnit = { ...EXTRA, unitCode: 'T_JS_DOM_NEEDS_FUNCTIONS', prerequisiteUnitCodes: ['T_JS_DOM_FUNCTIONS'] };
    const d = deriveRecommendedPublishSet({ reached: [dependent.unitCode], universe: [...READY, dependent] });
    expect(d.recommended.has('T_JS_DOM_FUNCTIONS')).toBe(false);
    expect(d.withheldRequired).toEqual([{ unitCode: 'T_JS_DOM_NEEDS_FUNCTIONS', requires: 'T_JS_DOM_FUNCTIONS' }]);
  });
});
