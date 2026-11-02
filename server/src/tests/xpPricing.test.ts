import { xpForTask, typeXpFor, cleanXp, itemOverrideKey, DEFAULT_PRICING, XpPricing } from '../services/xpPricingService';

const priced = (p: Partial<XpPricing>): XpPricing => ({ ...DEFAULT_PRICING, byType: { ...DEFAULT_PRICING.byType }, overrides: new Map(), ...p });

describe('task XP pricing', () => {
  const video = { kind: 'content', contentType: 'video', contentId: 'a'.repeat(24) };
  const quiz = { kind: 'quiz', contentType: 'quiz', sourceId: 'b'.repeat(24) };

  it('pays the shipped default for a type nobody changed', () => {
    expect(xpForTask(video, DEFAULT_PRICING)).toBe(5);
    expect(xpForTask(quiz, DEFAULT_PRICING)).toBe(20);
  });

  it('pays the admin price for the type', () => {
    expect(xpForTask(video, priced({ byType: { ...DEFAULT_PRICING.byType, video: 12 } }))).toBe(12);
  });

  it('a price on the task itself beats its type, and 0 is a real price', () => {
    const p = priced({ overrides: new Map([[`content:${'a'.repeat(24)}`, 40], [`module:${'b'.repeat(24)}`, 0]]) });
    expect(xpForTask(video, p)).toBe(40);
    expect(xpForTask(quiz, p)).toBe(0);
  });

  it('pays nothing when task XP is switched off, and never pays a mock interview', () => {
    expect(xpForTask(video, priced({ tasksEnabled: false }))).toBe(0);
    expect(xpForTask({ kind: 'mockInterview', contentType: 'mockInterview', sourceId: 'c'.repeat(24) }, DEFAULT_PRICING)).toBe(0);
  });

  it('prices a code task as coding practice, and an unknown type at the fallback', () => {
    expect(typeXpFor({ kind: 'codeSnippet', contentType: 'codeSnippet' }, DEFAULT_PRICING)).toBe(15);
    expect(typeXpFor({ kind: 'content', contentType: 'something_new' }, DEFAULT_PRICING)).toBe(5);
  });

  it('keys an override on the source, not the day', () => {
    expect(itemOverrideKey(video)).toBe(`content:${'a'.repeat(24)}`);
    expect(itemOverrideKey(quiz)).toBe(`module:${'b'.repeat(24)}`);
    expect(itemOverrideKey({ kind: 'content' })).toBeNull();
  });

  it('accepts whole non-negative amounts up to the ceiling', () => {
    expect(cleanXp('12')).toBe(12);
    expect(cleanXp(7.6)).toBe(8);
    expect(cleanXp(99999)).toBe(1000);
    expect(cleanXp(-1)).toBeNull();
    expect(cleanXp('')).toBeNull();
    expect(cleanXp('abc')).toBeNull();
  });
});
