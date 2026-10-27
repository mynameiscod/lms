import { gapText, RE_ENQUIRY_QUIET_MS } from '../services/leadReEnquiryService';

describe('repeat enquiries', () => {
  it('says how long it has been since the last enquiry', () => {
    const now = new Date('2026-10-27T10:00:00Z');
    expect(gapText(new Date('2026-09-26T10:00:00Z'), now)).toMatch(/31 days after/);
    expect(gapText(new Date('2026-10-26T09:00:00Z'), now)).toMatch(/1 day after/);
    expect(gapText(new Date('2026-10-27T09:00:00Z'), now)).toBe('');
    expect(gapText(undefined, now)).toBe('');
  });
  it('treats two submissions minutes apart as one enquiry, not a returning person', () => {
    expect(RE_ENQUIRY_QUIET_MS).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });
});
