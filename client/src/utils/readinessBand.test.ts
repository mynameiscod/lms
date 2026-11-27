import { readinessBand } from './readinessBand';

describe('readinessBand', () => {
  it('names each figure by the same cut-offs', () => {
    expect(readinessBand(100).label).toBe('Strong');
    expect(readinessBand(80).label).toBe('Strong');
    expect(readinessBand(79).label).toBe('Getting close');
    expect(readinessBand(60).label).toBe('Getting close');
    expect(readinessBand(59).tone).toBe('building');
    expect(readinessBand(40).tone).toBe('building');
    expect(readinessBand(39).tone).toBe('early');
    expect(readinessBand(0).tone).toBe('early');
  });
});
