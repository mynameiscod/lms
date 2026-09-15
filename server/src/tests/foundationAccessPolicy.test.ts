/**
 * The preview length is an admin setting, and whatever is stored is used within its bounds.
 */

import {
  clampPreviewDays, DEFAULT_ROADMAP_PREVIEW_DAYS, MIN_ROADMAP_PREVIEW_DAYS, MAX_ROADMAP_PREVIEW_DAYS,
} from '../data/foundationAccessPolicy';

describe('clampPreviewDays', () => {
  it('defaults to seven when nothing valid is stored', () => {
    expect(DEFAULT_ROADMAP_PREVIEW_DAYS).toBe(7);
    for (const v of [undefined, null, '', 'x', 0, -3, NaN]) expect(clampPreviewDays(v)).toBe(7);
  });

  it('uses what the admin set, rounded', () => {
    expect(clampPreviewDays(3)).toBe(3);
    expect(clampPreviewDays('14')).toBe(14);
    expect(clampPreviewDays(4.6)).toBe(5);
  });

  it('keeps a preview a preview', () => {
    expect(clampPreviewDays(90)).toBe(MAX_ROADMAP_PREVIEW_DAYS);
    expect(clampPreviewDays(0.4)).toBe(DEFAULT_ROADMAP_PREVIEW_DAYS);
    expect(clampPreviewDays(1)).toBe(MIN_ROADMAP_PREVIEW_DAYS);
  });
});
