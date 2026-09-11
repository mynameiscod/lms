import {
  SECTION_FEATURE, SECTION_COPY, MEMBER_SECTIONS, lockedSections, MemberSection,
} from '../data/memberAccessPolicy';
import { DEFAULT_ENTITLEMENTS } from '../models/PassportConfig';
import { entitlementMap } from '../services/passportEntitlementService';

/**
 * What a student sees before they pay.
 *
 * The product had one coarse answer: no membership, no dashboard and no navigation rail —
 * a wall where the product should have been, shown at the exact moment somebody is deciding
 * whether to buy. The entitlement system to do better already existed; nothing joined its
 * eleven keys to the sections a student actually looks at.
 *
 * These tests pin the join, and the one line that makes it defensible: what a student has
 * ALREADY EARNED stays open, and what membership PROMISES is what gets locked.
 */

const DAY = 86400000;
const NOW = new Date('2026-09-11T10:00:00Z');
const mapFor = (passport: any) => entitlementMap(DEFAULT_ENTITLEMENTS as any, passport, NOW);

const paying = { active: true, expiresAt: new Date(NOW.getTime() + 200 * DAY) };
const lapsed = { active: true, expiresAt: new Date(NOW.getTime() - DAY) };
const neverPaid = { active: false };

describe('sections and the keys that pay for them', () => {
  it('gives every section a key that actually exists', () => {
    // A section pointing at a key nobody configured would fail closed forever, and the only
    // symptom would be a panel that never unlocks however much anybody pays.
    const known = new Set(DEFAULT_ENTITLEMENTS.map(e => e.featureKey));
    for (const s of MEMBER_SECTIONS) {
      expect(known.has(SECTION_FEATURE[s])).toBe(true);
    }
  });

  it('says something specific about every section it can lock', () => {
    // "Members only" on an empty page is a wall with different wording.
    for (const s of MEMBER_SECTIONS) {
      expect(SECTION_COPY[s]?.title).toBeTruthy();
      expect(SECTION_COPY[s]?.blurb.length).toBeGreaterThan(20);
    }
  });

  /**
   * XP, streaks and badges are earned by completing missions. A student who cannot open a
   * mission cannot move any of them, so showing those panels unlocked means four numbers
   * reading zero — which looks like a broken product rather than a locked one.
   */
  it('locks progress with the missions that earn it', () => {
    expect(SECTION_FEATURE.progress).toBe(SECTION_FEATURE.missions);
  });
});

describe('what a student who has not paid can still see', () => {
  const locked = lockedSections(mapFor(neverPaid));

  /**
   * THE LINE THIS WHOLE FEATURE RESTS ON. They sat the paper; the score and the skill profile
   * are the result of their own work. Putting that behind the wall reads as a bait-and-switch,
   * and it throws away the one honest argument for buying — here is where you are, and here is
   * what the plan would fix.
   */
  it('leaves what they earned open', () => {
    expect(locked).not.toContain('score');
  });

  it('locks what membership actually buys', () => {
    for (const s of ['roadmap', 'missions', 'progress', 'practice', 'interview', 'resume'] as MemberSection[]) {
      expect(locked).toContain(s);
    }
  });

  it('locks enough to be worth buying, and not everything', () => {
    // If this ever locks all nine, the dashboard has become the wall it replaced.
    expect(locked.length).toBeGreaterThan(3);
    expect(locked.length).toBeLessThan(MEMBER_SECTIONS.length);
  });
});

describe('what membership opens', () => {
  it('opens everything for a paying member at default settings', () => {
    expect(lockedSections(mapFor(paying))).toEqual([]);
  });

  /**
   * Expiry is applied at read time and `active` stays true on a lapsed record, so a check on
   * the flag alone would keep serving somebody whose year ran out.
   */
  it('closes again when the membership lapses', () => {
    expect(lockedSections(mapFor(lapsed))).toContain('roadmap');
    expect(lockedSections(mapFor(lapsed))).not.toContain('score');
  });
});

describe('the split belongs to the tenant', () => {
  /**
   * A college that wants the roadmap open to everybody flips one switch on the admin screen.
   * If this ever stops following the config, the switch has become decoration — which is
   * exactly the bug that `roadmap_preview` and `career_score` were in before this.
   */
  it('follows the tenant’s own free/paid settings', () => {
    const opened = DEFAULT_ENTITLEMENTS.map(e =>
      (e.featureKey === 'roadmap_full' ? { ...e, tier: 'free' as const } : e));
    const locked = lockedSections(entitlementMap(opened as any, neverPaid, NOW));
    expect(locked).not.toContain('roadmap');
    // And only that one moved.
    expect(locked).toContain('missions');
  });

  it('fails closed on a key nobody has configured', () => {
    // An unknown key is treated as paid, so a typo hides a section rather than opening it.
    expect(lockedSections(entitlementMap([] as any, neverPaid, NOW))).toEqual(MEMBER_SECTIONS);
  });
});
