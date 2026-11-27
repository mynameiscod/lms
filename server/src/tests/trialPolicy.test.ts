import { trialActive, trialAllowsFeature, trialItem, cleanTrialItems } from '../data/trialPolicy';
import { isEntitled, entitlementMap, membershipActive, hasMemberAccess } from '../services/passportEntitlementService';

const DAY = 86400000;
const now = new Date('2026-11-02T10:00:00Z');
const trial = (over: any = {}) => ({
  trial: {
    startedAt: new Date(now.getTime() - DAY), endsAt: new Date(now.getTime() + 6 * DAY),
    items: { journey: { on: true, limit: 3 }, practice: { on: true, limit: 10 }, interview: { on: true, limit: 2 }, resume: { on: false, limit: null } },
    ...over,
  },
});
const ENT = [
  { featureKey: 'assessment', label: '', tier: 'free' as const },
  { featureKey: 'roadmap_full', label: '', tier: 'paid' as const },
  { featureKey: 'practice', label: '', tier: 'paid' as const },
  { featureKey: 'resume', label: '', tier: 'paid' as const },
  { featureKey: 'ai_mentor', label: '', tier: 'paid' as const },
];

describe('a running trial', () => {
  it('opens only what its plan switches on', () => {
    const p = trial();
    expect(trialActive(p, now)).toBe(true);
    expect(isEntitled(ENT, p, 'roadmap_full', now)).toBe(true);
    expect(isEntitled(ENT, p, 'practice', now)).toBe(true);
    expect(isEntitled(ENT, p, 'resume', now)).toBe(false);
    expect(isEntitled(ENT, p, 'ai_mentor', now)).toBe(false);
    expect(isEntitled(ENT, p, 'assessment', now)).toBe(true); // free stays free
  });

  it('is never a membership', () => {
    const p = trial();
    expect(membershipActive(p as any, now)).toBe(false);
    expect(hasMemberAccess(p as any, now)).toBe(true);
  });

  it('feeds the lock map the member screens draw from', () => {
    const m = entitlementMap(ENT, trial() as any, now);
    expect(m.practice).toBe(true);
    expect(m.resume).toBe(false);
    expect(m.ai_mentor).toBe(false);
  });

  it('carries its limits', () => {
    expect(trialItem(trial(), 'practice', now)).toEqual({ on: true, limit: 10 });
    expect(trialItem(trial(), 'mentor', now)).toEqual({ on: false, limit: null });
  });
});

describe('when a trial is over', () => {
  it('locks everything again once it ends', () => {
    const p = trial({ endsAt: new Date(now.getTime() - 1) });
    expect(trialActive(p, now)).toBe(false);
    expect(isEntitled(ENT, p, 'practice', now)).toBe(false);
    expect(hasMemberAccess(p as any, now)).toBe(false);
  });

  it('locks everything when an admin ends it', () => {
    expect(isEntitled(ENT, trial({ endedAt: now }), 'practice', now)).toBe(false);
  });

  it('gives way to a paid membership, which opens everything', () => {
    const p = { active: true, expiresAt: new Date(now.getTime() + 300 * DAY), ...trial() };
    expect(trialActive(p, now)).toBe(false);
    expect(isEntitled(ENT, p, 'resume', now)).toBe(true);
    expect(trialItem(p, 'practice', now)).toBeNull();
  });
});

describe('members and free sign-ups are unchanged', () => {
  it('a paying member gets everything, with no trial limits', () => {
    const p = { active: true, expiresAt: new Date(now.getTime() + DAY) };
    expect(isEntitled(ENT, p, 'ai_mentor', now)).toBe(true);
    expect(trialItem(p, 'practice', now)).toBeNull();
  });
  it('a free sign-up gets only the free features', () => {
    expect(isEntitled(ENT, {}, 'practice', now)).toBe(false);
    expect(isEntitled(ENT, {}, 'assessment', now)).toBe(true);
    expect(trialAllowsFeature({}, 'practice', now)).toBe(false);
  });
});

describe('the four kinds of CareerPilot student, side by side', () => {
  const PAID_KEYS = ['roadmap_full', 'practice', 'resume', 'ai_mentor'];
  const free = { active: false };
  const paid = { active: true, product: 'career_passport', expiresAt: new Date(now.getTime() + 300 * DAY) };
  const complimentary = { active: true, product: 'career_passport_grant', expiresAt: new Date(now.getTime() + 30 * DAY), grant: { reason: 'demo', days: 30 } };
  const onTrial = trial();

  it('free: only the free features', () => {
    expect(PAID_KEYS.map(k => isEntitled(ENT, free, k, now))).toEqual([false, false, false, false]);
    expect(hasMemberAccess(free as any, now)).toBe(false);
  });
  it('membership: everything', () => {
    expect(PAID_KEYS.map(k => isEntitled(ENT, paid, k, now))).toEqual([true, true, true, true]);
  });
  it('complimentary: everything, exactly like membership', () => {
    expect(PAID_KEYS.map(k => isEntitled(ENT, complimentary, k, now))).toEqual([true, true, true, true]);
    expect(trialItem(complimentary, 'practice', now)).toBeNull();
  });
  it('trial: only what the plan opens', () => {
    expect(PAID_KEYS.map(k => isEntitled(ENT, onTrial, k, now))).toEqual([true, true, false, false]);
  });
  it('an expired membership or complimentary access locks as before', () => {
    const lapsed = { active: true, expiresAt: new Date(now.getTime() - DAY) };
    expect(PAID_KEYS.map(k => isEntitled(ENT, lapsed, k, now))).toEqual([false, false, false, false]);
  });
  it('complimentary given to someone on a trial wins: everything opens', () => {
    const both = { ...complimentary, ...trial() };
    expect(PAID_KEYS.map(k => isEntitled(ENT, both, k, now))).toEqual([true, true, true, true]);
    expect(trialActive(both, now)).toBe(false);
  });
});

describe('plan items from the admin form', () => {
  it('keeps a limit only where one counts something', () => {
    const r = cleanTrialItems({ practice: { on: true, limit: '10' }, resume: { on: true, limit: 5 } });
    if ('error' in r) throw new Error(r.error);
    expect(r.items.practice).toEqual({ on: true, limit: 10 });
    expect(r.items.resume).toEqual({ on: true, limit: null });
    expect(r.items.mentor).toEqual({ on: false, limit: null });
  });
  it('refuses a bad limit', () => {
    expect('error' in cleanTrialItems({ practice: { on: true, limit: 0 } })).toBe(true);
  });
});
