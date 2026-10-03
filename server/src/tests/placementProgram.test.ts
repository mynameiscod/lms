const store: any[] = [];
const events: any[] = [];

jest.mock('../models/PlacementCandidate', () => {
  const actual = jest.requireActual('../models/PlacementCandidate');
  return {
    __esModule: true,
    ...actual,
    default: {
      findOne: jest.fn(async (q: any) => store.find((c) => c.tenantId === q.tenantId && c.mobile === q.mobile) || null),
      create: jest.fn(async (doc: any) => { const c = { _id: `c${store.length + 1}`, ...doc, save: jest.fn(async function (this: any) { return this; }) }; store.push(c); return c; }),
    },
  };
});
jest.mock('../models/PlacementEvent', () => ({ __esModule: true, default: { create: jest.fn(async (e: any) => { events.push(e); return e; }) } }));
jest.mock('../services/purposeMessaging', () => ({ sendByPurpose: jest.fn(async () => ({ ok: false, error: 'No WhatsApp template is assigned' })) }));

import { validateRegistration, register } from '../services/placementProgramService';
import { sendByPurpose } from '../services/purposeMessaging';

beforeEach(() => { store.length = 0; events.length = 0; (sendByPurpose as jest.Mock).mockClear(); });

describe('validateRegistration', () => {
  it('normalises the mobile to ten digits and trims fields', () => {
    const r = validateRegistration({ name: '  Ravi Kumar ', mobile: '+91 98765 43210', email: 'R@X.COM', graduationYear: '2025' });
    expect(r.errors).toEqual([]);
    expect(r.values).toMatchObject({ name: 'Ravi Kumar', mobile: '9876543210', email: 'r@x.com', graduationYear: 2025 });
  });
  it('refuses a missing name, a bad mobile, a bad email, a silly year and an unknown experience', () => {
    const r = validateRegistration({ mobile: '12345', email: 'nope', graduationYear: 1800, experience: '20 years' });
    expect(r.errors).toHaveLength(5);
  });
});

describe('register', () => {
  const T = 'tenant1';
  it('creates one record, records the submission and tries the WhatsApp confirmation', async () => {
    const r = await register(T, { name: 'Ravi Kumar', mobile: '9876543210' });
    expect(r.returning).toBe(false);
    expect(store).toHaveLength(1);
    expect(sendByPurpose).toHaveBeenCalledWith(T, '9876543210', 'PLACEMENT_PROGRAM_REGISTERED', ['Ravi']);
    expect(events.map((e) => e.kind)).toEqual(['submitted', 'whatsapp']);
    // No template assigned → the timeline says the message was NOT sent, rather than implying it was.
    expect(events[1].message).toMatch(/not sent/);
  });
  it('a second submission from the same number (+91 form) updates the record instead of duplicating', async () => {
    await register(T, { name: 'Ravi Kumar', mobile: '9876543210' });
    store[0].stage = 'paid';
    const r = await register(T, { name: 'Ravi K', mobile: '+919876543210', college: 'NEC' });
    expect(r.returning).toBe(true);
    expect(store).toHaveLength(1);
    expect(store[0]).toMatchObject({ college: 'NEC', submissions: 2, stage: 'paid' });
  });
});
