import { WRONG_DOOR_CAREERPILOT, NO_ACCOUNT_CODE } from '../services/accountProduct';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '../../../', p), 'utf-8');

describe('what a person with no CareerPilot account is told', () => {
  it('says what to do next, and still points a college student to the right login', () => {
    expect(WRONG_DOOR_CAREERPILOT).toMatch(/New here\?/);
    expect(WRONG_DOOR_CAREERPILOT).toMatch(/Create your free account/);
    expect(WRONG_DOOR_CAREERPILOT).toMatch(/LMS login/);
    expect(NO_ACCOUNT_CODE).toBe('NO_CAREERPILOT_ACCOUNT');
  });

  it('is sent with a code at every place that refuses a login', () => {
    const c = read('server/src/controllers/publicPassportController.ts');
    expect(c).not.toContain('message: WRONG_DOOR_CAREERPILOT })'.replace('message', 'success: false, message'));
    expect((c.match(/code: NO_ACCOUNT_CODE, message: WRONG_DOOR_CAREERPILOT/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('the login page offers to create the account when the message appears', () => {
    const l = read('client/src/pages/Passport/Login.tsx');
    expect(l).toContain('Create your free account');
    expect(l).toContain('/careerpilot/join');
  });

  it('an expired code is not "start over", and the pending sign-up lives for hours, not minutes', () => {
    const c = read('server/src/controllers/publicPassportController.ts');
    expect(c).toContain("code: 'OTP_EXPIRED'");
    expect(c).toContain('Tap "Resend code"');
    expect(c).toContain('2 * 60 * 60 * 1000');
    expect(c).not.toMatch(/not_found: 'Start over'/);
  });
});
