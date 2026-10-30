import { barWidth } from './barWidth';

describe('barWidth', () => {
  it('draws nothing for zero or no value', () => {
    expect(barWidth(0)).toBe(0);
    expect(barWidth(null)).toBe(0);
    expect(barWidth(undefined)).toBe(0);
    expect(barWidth(-5)).toBe(0);
    expect(barWidth(NaN)).toBe(0);
  });
  it('keeps a small value visible and caps at 100', () => {
    expect(barWidth(0.4)).toBe(2);
    expect(barWidth(28)).toBe(28);
    expect(barWidth(140)).toBe(100);
  });
});
