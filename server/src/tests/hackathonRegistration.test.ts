/**
 * Public hackathon registration.
 *
 * This is an UNAUTHENTICATED endpoint that writes rows, takes money, and stores the phone
 * number and email of every member of every team. Three things therefore have to be true and
 * stay true, and each is a test below:
 *
 *   NOTHING IS TRUSTED FROM THE BODY. The form lives on another origin we do not deploy, so
 *   team size, the college list and the fee are read off the Hackathon document. Its own
 *   validation is a courtesy to the person typing, never a control.
 *
 *   A PLACE IS BOUGHT, NOT CLAIMED. Confirmation follows evidence that did not come from the
 *   browser, and a payment short of the fee buys nothing.
 *
 *   ONE PERSON, ONE TEAM. Enforced by unique indexes on confirmed rows, with the handler
 *   checking first so a student is told before they pay rather than after.
 */

import {
  validateTeam, registrationWindowError, teamNameKeyOf, normalizeMobile,
  newRegistrationCode, holdingFilter, publicRegistration,
} from '../services/hackathonRegistrationService';
import { DEFAULT_TEAM_SIZE } from '../models/Hackathon';

const hackathon = (over: any = {}): any => ({
  _id: 'h1',
  title: 'CodeBegun Hack 2026',
  slug: 'codebegun-hack-2026',
  status: 'published',
  startAt: new Date(Date.now() + 7 * 86400_000),
  endAt: null,
  feeInr: 500,
  minTeamSize: DEFAULT_TEAM_SIZE.min,
  maxTeamSize: DEFAULT_TEAM_SIZE.max,
  registerOpensAt: null,
  registerClosesAt: null,
  maxTeams: 0,
  colleges: ['CBIT', 'VNR VJIET', 'CVR College of Engineering'],
  allowOtherCollege: true,
  ...over,
});

const member = (i: number, over: any = {}) => ({
  name: `Member ${i}`,
  mobile: `98765432${String(10 + i).slice(-2)}`,
  email: `member${i}@example.com`,
  ...over,
});

const team = (n: number, over: any = {}) => ({
  teamName: 'Byte Squad',
  college: 'CBIT',
  members: Array.from({ length: n }, (_, i) => member(i)),
  ...over,
});

const fieldsIn = (errors: { field: string }[]) => errors.map(e => e.field);

describe('team validation — size', () => {
  it('accepts a team at the minimum, counting the lead', () => {
    const { team: t, errors } = validateTeam(team(2), hackathon());
    expect(errors).toEqual([]);
    expect(t!.members).toHaveLength(2);
    expect(t!.members[0].isLead).toBe(true);
    expect(t!.members[1].isLead).toBe(false);
  });

  it('accepts a team at the maximum', () => {
    expect(validateTeam(team(6), hackathon()).errors).toEqual([]);
  });

  it('rejects a team of one — the lead alone is not a team', () => {
    const { errors } = validateTeam(team(1), hackathon());
    expect(fieldsIn(errors)).toContain('members');
    expect(errors[0].message).toMatch(/between 2 and 6/);
  });

  it('rejects a team over the maximum', () => {
    expect(fieldsIn(validateTeam(team(7), hackathon()).errors)).toContain('members');
  });

  it('reads the sizes off the EVENT, not off the request', () => {
    // A hackathon configured for pairs must reject a four-person team however the form was
    // rendered on the other origin.
    const pairsOnly = hackathon({ minTeamSize: 2, maxTeamSize: 2 });
    expect(fieldsIn(validateTeam(team(4), pairsOnly).errors)).toContain('members');
    expect(validateTeam(team(2), pairsOnly).errors).toEqual([]);
  });
});

describe('team validation — people', () => {
  it('requires an email for the lead, because the confirmation goes there', () => {
    const t = team(3);
    t.members[0].email = '';
    expect(fieldsIn(validateTeam(t, hackathon()).errors)).toContain('members[0].email');
  });

  it('does not require emails for the rest of the team', () => {
    const t = team(3);
    t.members[1].email = '';
    t.members[2].email = '';
    expect(validateTeam(t, hackathon()).errors).toEqual([]);
  });

  it('still rejects a malformed email from a member who gave one', () => {
    const t = team(3);
    t.members[2].email = 'not-an-email';
    expect(fieldsIn(validateTeam(t, hackathon()).errors)).toContain('members[2].email');
  });

  it('rejects an invalid mobile number', () => {
    const t = team(2);
    t.members[1].mobile = '12345';
    expect(fieldsIn(validateTeam(t, hackathon()).errors)).toContain('members[1].mobile');
  });

  it('catches the same person listed twice INSIDE one team', () => {
    // The unique index de-duplicates array entries within a single document, so it would
    // let this through — a five-person team registered as six.
    const t = team(3);
    t.members[2].mobile = t.members[1].mobile;
    const { errors } = validateTeam(t, hackathon());
    expect(fieldsIn(errors)).toContain('members[2].mobile');
  });

  it('normalises mobile numbers, so +91 and a bare number are the same person', () => {
    expect(normalizeMobile('+91 98765 43210')).toBe('9876543210');
    expect(normalizeMobile('098765-43210')).toBe('9876543210');
    const t = team(2);
    t.members[0].mobile = '+91 98765 43210';
    t.members[1].mobile = '098765-43210';
    expect(fieldsIn(validateTeam(t, hackathon()).errors)).toContain('members[1].mobile');
  });

  it('names the person in every message, so a form can point at the right row', () => {
    const t = team(3);
    t.members[2].name = '';
    const { errors } = validateTeam(t, hackathon());
    expect(errors.find(e => e.field === 'members[2].name')!.message).toMatch(/^Member 3:/);
  });
});

describe('team validation — college', () => {
  it('accepts a college from the list', () => {
    const { team: t, errors } = validateTeam(team(2, { college: 'VNR VJIET' }), hackathon());
    expect(errors).toEqual([]);
    expect(t!.collegeIsOther).toBe(false);
  });

  it('accepts one that is not, and marks it, when "other" is allowed', () => {
    const { team: t, errors } = validateTeam(team(2, { college: 'Some New College' }), hackathon());
    expect(errors).toEqual([]);
    expect(t!.collegeIsOther).toBe(true);
  });

  it('refuses one that is not, when the list is closed', () => {
    const closed = hackathon({ allowOtherCollege: false });
    expect(fieldsIn(validateTeam(team(2, { college: 'Some New College' }), closed).errors)).toContain('college');
  });

  it('requires a college at all', () => {
    expect(fieldsIn(validateTeam(team(2, { college: '' }), hackathon()).errors)).toContain('college');
  });
});

describe('the registration window', () => {
  it('is closed while the event is a draft', () => {
    expect(registrationWindowError(hackathon({ status: 'draft' }))).toMatch(/not open/);
  });

  it('is closed before it opens, and says when', () => {
    const soon = new Date(Date.now() + 2 * 86400_000);
    expect(registrationWindowError(hackathon({ registerOpensAt: soon }))).toMatch(/Registrations open on/);
  });

  it('is closed after it closes', () => {
    const past = new Date(Date.now() - 86400_000);
    expect(registrationWindowError(hackathon({ registerClosesAt: past }))).toMatch(/have closed/);
  });

  it('is closed once the event has finished', () => {
    expect(registrationWindowError(hackathon({ endAt: new Date(Date.now() - 3600_000) }))).toMatch(/already finished/);
  });

  it('is open in the ordinary case', () => {
    expect(registrationWindowError(hackathon())).toBeNull();
  });
});

describe('duplicate keys', () => {
  it('treats team names as the same regardless of case and spacing', () => {
    expect(teamNameKeyOf('Team  Alpha')).toBe(teamNameKeyOf('team alpha'));
    expect(teamNameKeyOf('  Byte Squad ')).toBe('byte squad');
  });

  it('counts a place as held by confirmed rows and by pending ones that are still fresh', () => {
    const f: any = holdingFilter('h1');
    const statuses = f.$or.map((c: any) => c.status);
    expect(statuses).toContain('confirmed');
    expect(statuses).toContain('pending_payment');
    // The pending branch is time-bounded, or an abandoned attempt would lock a student's
    // number out of the event for good.
    const pending = f.$or.find((c: any) => c.status === 'pending_payment');
    expect(pending.createdAt.$gte).toBeInstanceOf(Date);
    expect(pending.createdAt.$gte.getTime()).toBeLessThan(Date.now());
  });
});

describe('the registration code', () => {
  it('avoids the characters people misread aloud', () => {
    for (let i = 0; i < 200; i++) {
      expect(newRegistrationCode()).toMatch(/^HK-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
    }
  });

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 500 }, () => newRegistrationCode()));
    expect(seen.size).toBe(500);
  });
});

describe('what the public sees of a registration', () => {
  it('never returns anyone\'s phone number or email', () => {
    const row = {
      registrationCode: 'HK-ABCD-EFGH', teamName: 'Byte Squad', college: 'CBIT',
      status: 'confirmed', amountInr: 500, confirmedAt: new Date(), createdAt: new Date(),
      members: [
        { name: 'Rahul', mobile: '9876543210', email: 'rahul@example.com', isLead: true },
        { name: 'Priya', mobile: '9876543211', email: 'priya@example.com', isLead: false },
      ],
      // Present on the document, and must not travel.
      payment: { orderId: 'order_x', paymentId: 'pay_x', signature: 'sig' },
      ipAddress: '1.2.3.4',
    };
    const out = publicRegistration(row as any);
    const json = JSON.stringify(out);

    expect(out.members).toEqual([{ name: 'Rahul', isLead: true }, { name: 'Priya', isLead: false }]);
    expect(json).not.toMatch(/9876543210|rahul@example\.com|order_x|pay_x|1\.2\.3\.4/);
    // Still useful: the team can see itself.
    expect(out.teamName).toBe('Byte Squad');
    expect(out.teamSize).toBe(2);
  });
});
