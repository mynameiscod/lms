import { alreadyCelebrated, celebrate, celebrateMembership, onCelebrate } from './celebrate';

describe('celebrate', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify({ _id: 'm1', firstName: 'Arun' }));
  });

  it('plays a once-only celebration a single time per member', () => {
    const seen: string[] = [];
    const off = onCelebrate(c => seen.push(c.title));
    celebrate({ kind: 'day', title: 'Day 3 done!', once: 'day:e1:3' });
    celebrate({ kind: 'day', title: 'Day 3 done!', once: 'day:e1:3' });
    expect(seen).toEqual(['Day 3 done!']);
    expect(alreadyCelebrated('day:e1:3')).toBe(true);

    // Another member on the same browser still gets their own.
    localStorage.setItem('user', JSON.stringify({ _id: 'm2' }));
    celebrate({ kind: 'day', title: 'Day 3 done!', once: 'day:e1:3' });
    expect(seen).toHaveLength(2);
    off();
  });

  it('plays an unnamed celebration every time', () => {
    const seen: string[] = [];
    const off = onCelebrate(c => seen.push(c.kind));
    celebrate({ kind: 'assessment', title: 'Done' });
    celebrate({ kind: 'assessment', title: 'Done' });
    expect(seen).toEqual(['assessment', 'assessment']);
    off();
  });

  it('welcomes a new member by first name, once, with the way to the roadmap', () => {
    const seen: any[] = [];
    const off = onCelebrate(c => seen.push(c));
    celebrateMembership();
    celebrateMembership(); // the in-page handler and the dismiss re-check can both report success
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ kind: 'membership', title: 'Welcome to CareerPilot, Arun!', action: { to: '/careerpilot/roadmap' } });
    off();
  });
});
