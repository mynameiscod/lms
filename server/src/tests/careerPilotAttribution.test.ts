/**
 * The attribution rules, as rules rather than as hopes.
 *
 * Every one of these is a way a campaign report goes quietly wrong rather than obviously
 * broken: a first touch overwritten by a retargeting ad, a direct visit erasing a paid click,
 * an empty parameter blanking a real one. None of them throws, none shows up on a screen, and
 * all of them are only discovered when somebody asks which ad produced the revenue and the
 * answer is "direct".
 */

import {
  sanitiseAttribution,
  mergeAttribution,
  ATTRIBUTION_FIELDS,
} from '../models/careerPilotAttribution';

const meta = {
  utm_source: 'meta',
  utm_medium: 'paid_social',
  utm_campaign: 'sep26_launch',
  utm_content: 'skillgap_reel_01',
  landing_page: 'skill-gap',
  entry_path: '/skill-gap/',
};

const google = {
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'oct26_search',
  gclid: 'Cj0KCQ_test',
};

describe('sanitising what a client sent', () => {
  it('keeps the known fields', () => {
    const out = sanitiseAttribution({ first_touch: meta })!;
    expect(out.first_touch!.utm_source).toBe('meta');
    expect(out.first_touch!.utm_campaign).toBe('sep26_launch');
    expect(out.first_touch!.entry_path).toBe('/skill-gap/');
  });

  it('drops anything that is not an attribution field', () => {
    const out = sanitiseAttribution({
      first_touch: { ...meta, password: 'hunter2', token: 'abc', otp: '123456' },
    })! as any;
    expect(out.first_touch.password).toBeUndefined();
    expect(out.first_touch.token).toBeUndefined();
    expect(out.first_touch.otp).toBeUndefined();
    expect(Object.keys(out.first_touch).every(
      k => k === 'captured_at' || (ATTRIBUTION_FIELDS as readonly string[]).includes(k),
    )).toBe(true);
  });

  it('returns undefined for an untagged visit, rather than an empty shell', () => {
    expect(sanitiseAttribution({})).toBeUndefined();
    expect(sanitiseAttribution({ first_touch: {}, last_touch: {} })).toBeUndefined();
    expect(sanitiseAttribution(null)).toBeUndefined();
    expect(sanitiseAttribution('meta')).toBeUndefined();
  });

  it('ignores empty and whitespace values instead of storing them', () => {
    const out = sanitiseAttribution({
      first_touch: { utm_source: 'meta', utm_campaign: '   ', utm_content: '' },
    })!;
    expect(out.first_touch!.utm_source).toBe('meta');
    expect(out.first_touch!.utm_campaign).toBeUndefined();
    expect(out.first_touch!.utm_content).toBeUndefined();
  });

  it('caps a value rather than storing whatever arrived', () => {
    const out = sanitiseAttribution({ first_touch: { utm_campaign: 'x'.repeat(5000) } })!;
    expect(out.first_touch!.utm_campaign!.length).toBe(300);
  });

  it('ignores a non-string value', () => {
    const out = sanitiseAttribution({
      first_touch: { utm_source: 'meta', utm_campaign: { $ne: null }, utm_content: ['a'] },
    })! as any;
    expect(out.first_touch.utm_source).toBe('meta');
    expect(out.first_touch.utm_campaign).toBeUndefined();
    expect(out.first_touch.utm_content).toBeUndefined();
  });

  it('does not trust a clock it cannot see', () => {
    const future = new Date(Date.now() + 40 * 86400000).toISOString();
    const out = sanitiseAttribution({ first_touch: { ...meta, captured_at: future } })!;
    expect(out.first_touch!.captured_at!.getTime()).toBeLessThan(Date.now() + 86400000);

    const nonsense = sanitiseAttribution({ first_touch: { ...meta, captured_at: 'not a date' } })!;
    expect(Number.isNaN(nonsense.first_touch!.captured_at!.getTime())).toBe(false);
  });
});

describe('merging onto what is already stored', () => {
  it('never overwrites a first touch that exists', () => {
    const stored = sanitiseAttribution({ first_touch: meta, last_touch: meta })!;
    const later = sanitiseAttribution({ first_touch: google, last_touch: google })!;

    const merged = mergeAttribution(stored, later)!;
    expect(merged.first_touch!.utm_source).toBe('meta');
    expect(merged.first_touch!.utm_campaign).toBe('sep26_launch');
  });

  it('moves the last touch to the newer campaign', () => {
    const stored = sanitiseAttribution({ first_touch: meta, last_touch: meta })!;
    const later = sanitiseAttribution({ last_touch: google })!;

    const merged = mergeAttribution(stored, later)!;
    expect(merged.last_touch!.utm_source).toBe('google');
    expect(merged.last_touch!.gclid).toBe('Cj0KCQ_test');
  });

  it('takes the incoming first touch when there is nothing stored', () => {
    const merged = mergeAttribution(undefined, sanitiseAttribution({ first_touch: meta })!)!;
    expect(merged.first_touch!.utm_source).toBe('meta');
  });

  it('leaves everything alone when nothing arrives — a direct visit erases nothing', () => {
    const stored = sanitiseAttribution({ first_touch: meta, last_touch: meta })!;
    const merged = mergeAttribution(stored, undefined)!;
    expect(merged.first_touch!.utm_source).toBe('meta');
    expect(merged.last_touch!.utm_source).toBe('meta');
  });

  it('keeps the stored last touch when the newer one carries none', () => {
    const stored = sanitiseAttribution({ first_touch: meta, last_touch: meta })!;
    const merged = mergeAttribution(stored, { first_touch: undefined, last_touch: undefined })!;
    expect(merged.last_touch!.utm_campaign).toBe('sep26_launch');
  });

  /**
   * The abandoned-signup case, which is the one that actually happens.
   *
   * Somebody clicks a Meta ad, starts signing up, gives up. Weeks later a Google ad brings them
   * back and they finish. The introduction belongs to Meta; the click that closed it belongs to
   * Google; a report that credits either alone is wrong.
   */
  it('credits the introduction to the first campaign and the return to the second', () => {
    const abandoned = sanitiseAttribution({ first_touch: meta, last_touch: meta })!;
    const returned = sanitiseAttribution({ first_touch: google, last_touch: google })!;

    const merged = mergeAttribution(abandoned, returned)!;
    expect(merged.first_touch!.utm_source).toBe('meta');
    expect(merged.last_touch!.utm_source).toBe('google');
  });
});
