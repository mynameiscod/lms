import { careerPilotPageName, LOGGED_OUT_KEY, loginRedirectFor, safeNext } from './loginPath';

describe('sending a signed-out visitor to the login', () => {
  beforeEach(() => sessionStorage.clear());

  it('carries the CareerPilot page along, query included', () => {
    expect(loginRedirectFor('/careerpilot/roadmap', '?tab=2')).toBe(`/careerpilot/login?next=${encodeURIComponent('/careerpilot/roadmap?tab=2')}`);
    // Old /passport bookmarks return to the CareerPilot address.
    expect(loginRedirectFor('/passport/practice')).toBe(`/careerpilot/login?next=${encodeURIComponent('/careerpilot/practice')}`);
  });

  it('does not for CareerPilot home, the LMS, or right after a deliberate log-out', () => {
    expect(loginRedirectFor('/careerpilot')).toBe('/careerpilot/login');
    expect(loginRedirectFor('/assignments')).toBe('/login');
    sessionStorage.setItem(LOGGED_OUT_KEY, String(Date.now()));
    expect(loginRedirectFor('/careerpilot/roadmap')).toBe('/careerpilot/login');
  });

  it('carries it again once the log-out is no longer fresh', () => {
    sessionStorage.setItem(LOGGED_OUT_KEY, String(Date.now() - 60_000));
    expect(loginRedirectFor('/careerpilot/roadmap')).toContain('?next=');
  });
});

describe('where signing in may return to', () => {
  it('accepts CareerPilot member pages only', () => {
    expect(safeNext('/careerpilot/practice/abc')).toBe('/careerpilot/practice/abc');
    for (const bad of ['https://evil.example', '//evil.example/x', '/careerpilot', '/careerpilot/login', '/careerpilot/join?x=1', '/admin', '/careerpilot/\\evil', '', null]) {
      expect([bad, safeNext(bad as any)]).toEqual([bad, null]);
    }
  });
});

describe('naming the page', () => {
  it('uses the sidebar names, nested pages included', () => {
    expect(careerPilotPageName('/careerpilot/roadmap')).toBe('My Roadmap');
    expect(careerPilotPageName('/careerpilot/coding/set1/p2?x=1')).toBe('Coding Sets');
    expect(careerPilotPageName('/careerpilot/interview-experiences/share')).toBe('Interview Experiences');
    expect(careerPilotPageName('/careerpilot/somewhere-new')).toBe('that page');
  });
});
