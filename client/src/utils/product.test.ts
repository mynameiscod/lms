import { homePathFor, isMember, productRedirect } from './product';

const member = { role: 'STUDENT', product: 'careerpilot' };
const lmsStudent = { role: 'STUDENT', product: 'lms' };
const admin = { role: 'TENANT_ADMIN', product: 'lms' };

describe('the two products stay apart', () => {
  it('sends a member home to CareerPilot, everyone else to the dashboard', () => {
    expect(homePathFor(member)).toBe('/careerpilot');
    expect(homePathFor(lmsStudent)).toBe('/dashboard');
    expect(homePathFor(admin)).toBe('/dashboard');
    expect(homePathFor(null)).toBe('/dashboard');
  });

  it('does not treat staff as members, whatever the product says', () => {
    expect(isMember({ role: 'TENANT_ADMIN', product: 'careerpilot' })).toBe(false);
  });

  it('never leaves a member on an LMS page: the dashboard, "/" and unknown pages go to CareerPilot', () => {
    expect(productRedirect(member, '/dashboard')).toBe('/careerpilot');
    expect(productRedirect(member, '/')).toBe('/careerpilot');
    expect(productRedirect(member, '/quizzes')).toBe('/careerpilot');
    expect(productRedirect(member, '/login')).toBe('/careerpilot');
  });

  it('takes a member to their own version of an LMS page a link pointed at', () => {
    expect(productRedirect(member, '/ai-communication-lab')).toBe('/careerpilot/communication');
    expect(productRedirect(member, '/thinking-lab')).toBe('/careerpilot/thinking-lab');
    expect(productRedirect(member, '/coding-practice/123')).toBe('/careerpilot/coding');
    expect(productRedirect(member, '/my-learning/abc/day/3')).toBe('/careerpilot/plan');
  });

  it('leaves a member alone in CareerPilot and on public pages', () => {
    for (const p of ['/careerpilot', '/careerpilot/practice/6ac4', '/careerpilot/communication', '/passport/card/x', '/live/abc', '/battles/x', '/verify/1']) {
      expect([p, productRedirect(member, p)]).toEqual([p, null]);
    }
  });

  it('keeps an LMS student out of the member app, but not off the public CareerPilot pages', () => {
    expect(productRedirect(lmsStudent, '/careerpilot')).toBe('/dashboard');
    expect(productRedirect(lmsStudent, '/careerpilot/practice')).toBe('/dashboard');
    expect(productRedirect(lmsStudent, '/careerpilot/join')).toBeNull();
    expect(productRedirect(lmsStudent, '/careerpilot/card/abc')).toBeNull();
    expect(productRedirect(lmsStudent, '/dashboard')).toBeNull();
  });

  it('never redirects staff or admins: they run both products from the admin screens', () => {
    expect(productRedirect(admin, '/careerpilot/practice')).toBeNull();
    expect(productRedirect(admin, '/admin/passport/students')).toBeNull();
  });
});
