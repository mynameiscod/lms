import { canUseCareerPilot, canUseLms, defaultProduct, hasCareerPilotProduct, isPureMember } from '../services/accountProduct';

const member = { role: 'STUDENT', passport: { product: 'career_passport', active: true } };
const lmsStudent = { role: 'STUDENT', batchId: 'b1', passport: { active: false, onboarded: false } }; // the nested defaults give EVERY user a passport
const bothHats = { role: 'STUDENT', batchId: 'b1', passport: { product: 'career_passport', active: true } };
const staff = { role: 'TENANT_ADMIN', passport: { active: false } };

describe('which product an account belongs to', () => {
  it('is decided by passport.product, never by the passport merely existing', () => {
    expect(hasCareerPilotProduct(lmsStudent.passport)).toBe(false);
    expect(hasCareerPilotProduct({ active: false })).toBe(false);
    expect(hasCareerPilotProduct({ product: '  ' })).toBe(false);
    expect(hasCareerPilotProduct(member.passport)).toBe(true);
  });

  it('keeps a CareerPilot member out of the LMS login', () => {
    expect(isPureMember(member)).toBe(true);
    expect(canUseLms(member)).toBe(false);
    expect(defaultProduct(member)).toBe('careerpilot');
  });

  it('keeps an LMS student, staff and admins out of the CareerPilot login', () => {
    expect(canUseCareerPilot(lmsStudent)).toBe(false);
    expect(canUseCareerPilot(staff)).toBe(false);
    expect(canUseCareerPilot(null)).toBe(false);
  });

  it('lets every LMS account sign in to the LMS', () => {
    expect(canUseLms(lmsStudent)).toBe(true);
    expect(canUseLms(staff)).toBe(true);
  });

  it('does not lock out a student who holds both (a batch and a CareerPilot enrolment): each door opens, the LMS is their default', () => {
    expect(isPureMember(bothHats)).toBe(false);
    expect(canUseLms(bothHats)).toBe(true);
    expect(canUseCareerPilot(bothHats)).toBe(true);
    expect(defaultProduct(bothHats)).toBe('lms');
  });
});
