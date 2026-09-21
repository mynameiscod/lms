/**
 * Every role a student can actually pick must resolve to a direction.
 *
 * Two shipped roles (QA/SDET and Cloud/DevOps) named themselves one way in the picker and another
 * in the direction table, so choosing either left the student with no direction — and a plan with
 * no direction days at all. Nothing said so; they simply got the same 90 days as everybody else.
 */
import { SYSTEM_CAREER_ROLES } from '../models/CareerRole';
import { directionForRole } from '../data/careerDirectionPolicy';

describe('every career role maps to a direction', () => {
  const keys = SYSTEM_CAREER_ROLES.map(r => String(r.key));

  it('ships at least the roles the setup wizard offers', () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it.each(keys)('%s resolves to a direction', key => {
    expect(directionForRole(key)).toBeTruthy();
  });

  it('the two roles that used to fall through now resolve', () => {
    expect(directionForRole('CLOUD_DEVOPS')?.key).toBe('CLOUD_DEVOPS');
    expect(directionForRole('QA_SDET')?.key).toBe('SOFTWARE_BACKEND');
  });

  it('an unknown role still resolves to nothing, rather than guessing', () => {
    expect(directionForRole('NOT_A_ROLE')).toBeFalsy();
  });
});
