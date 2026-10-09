const calls = new Map<string, any>();
jest.mock('../models/OutperoCall', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn((q: any) => ({ lean: async () => calls.get(q.callId) || null })),
    findOneAndUpdate: jest.fn((q: any, u: any) => ({
      lean: async () => {
        const c = calls.get(q.callId) || { _id: q.callId, callId: q.callId, actions: [], deliveries: 0, createdAt: new Date() };
        Object.assign(c, u.$set || {});
        c.deliveries += 1;
        calls.set(q.callId, c);
        return { ...c, actions: [...c.actions] };
      },
    })),
    updateOne: jest.fn(async (q: any, u: any) => {
      for (const c of calls.values()) if (c._id === q._id && u.$addToSet?.actions && !c.actions.includes(u.$addToSet.actions)) c.actions.push(u.$addToSet.actions);
      return {};
    }),
  },
}));
const LEAD = { _id: '65a0000000000000000000aa', name: 'Ravi', phone: '9876543210', customFields: {}, createdBy: '65a0000000000000000000bb', aiCallAttempts: 0 };
const leadUpdates: any[] = [];
jest.mock('../models/Lead', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn((q: any) => {
      const hit = (q._id && String(q._id) === LEAD._id) || (q.phone instanceof RegExp && q.phone.test(LEAD.phone)) ? LEAD : null;
      const chain: any = { select: () => chain, sort: () => chain, lean: async () => hit };
      return chain;
    }),
    updateOne: jest.fn(async (_q: any, u: any) => { leadUpdates.push(u); return {}; }),
  },
}));
const followUps: any[] = [];
jest.mock('../models/FollowUpReminder', () => ({ __esModule: true, default: { create: jest.fn(async (d: any) => { followUps.push(d); return d; }) } }));
jest.mock('../services/settingsService', () => ({ getStr: (_k: string, f = '') => f, tenantWithValue: (_k: string, v: string) => (v === 'x'.repeat(32) ? '69c7723868202a8e4616ef3d' : null) }));

import { parseCall, readIstDateTime, receiveCall, tenantForToken } from '../services/outperoCallService';

const T = '69c7723868202a8e4616ef3d';
beforeEach(() => { calls.clear(); leadUpdates.length = 0; followUps.length = 0; });

describe('parseCall — reads Outpero\'s body whatever it nests', () => {
  it('finds ids, phone, recording, transcript turns and variables', () => {
    const p = parseCall({
      event: 'call.ended',
      call: { id: 'c1', to: '+919876543210', duration: 192, recording_url: 'https://x/r.mp3', status: 'completed',
        transcript: [{ role: 'agent', text: 'Hello' }, { role: 'user', text: 'Hi' }] },
      lead_data: { lms_lead_id: LEAD._id },
      extracted_variables: { demo_date: 'tomorrow', demo_time: '5 PM' },
    });
    expect(p).toMatchObject({ callId: 'c1', phone: '+919876543210', durationSec: 192, recordingUrl: 'https://x/r.mp3', leadIdHint: LEAD._id });
    expect(p.transcript).toBe('agent: Hello\nuser: Hi');
    expect(p.variables).toMatchObject({ demo_date: 'tomorrow' });
  });
});

describe('readIstDateTime', () => {
  const now = new Date('2026-10-09T06:00:00Z'); // 11:30 IST
  it('reads what Jyothi hears, in IST', () => {
    expect(readIstDateTime('2026-10-12', '5 PM', now)?.toISOString()).toBe('2026-10-12T11:30:00.000Z');
    expect(readIstDateTime('tomorrow', '10:30 am', now)?.toISOString()).toBe('2026-10-10T05:00:00.000Z');
    expect(readIstDateTime('12/10/2026', '17:00', now)?.toISOString()).toBe('2026-10-12T11:30:00.000Z');
    expect(readIstDateTime('', '', now)).toBeNull();
    expect(readIstDateTime('someday', 'later', now)).toBeNull();
  });
});

describe('receiveCall', () => {
  it('matches by lms_lead_id, logs the call, books the demo — and a re-delivery does it once', async () => {
    const body = { call_id: 'c9', phone: '9876543210', duration: 60, lms_lead_id: LEAD._id, variables: { demo_date: '2026-10-12', demo_time: '5 PM', demo_mode: 'online' } };
    const r1 = await receiveCall(T, body);
    expect(r1).toMatchObject({ matched: true, leadId: LEAD._id });
    expect(r1.actions).toEqual(expect.arrayContaining(['logged', 'demo']));
    expect(followUps.filter((f) => f.type === 'demo')).toHaveLength(1);
    await receiveCall(T, { ...body, summary: 'Wants Java course demo', outcome: 'interested' });
    expect(followUps.filter((f) => f.type === 'demo')).toHaveLength(1);
    expect(leadUpdates.some((u) => JSON.stringify(u).includes('Wants Java course demo'))).toBe(true);
  });

  it('falls back to the phone number, and books a counsellor callback', async () => {
    const r = await receiveCall(T, { id: 'c10', to: '+91 98765 43210', variables: { counsellor_callback: 'yes', callback_date: 'tomorrow', callback_time: '11 am' } });
    expect(r.matched).toBe(true);
    expect(followUps.find((f) => f.type === 'call')).toMatchObject({ priority: 'high' });
  });

  it('keeps an unmatched call without touching any lead', async () => {
    const r = await receiveCall(T, { id: 'c11', to: '9000000000' });
    expect(r.matched).toBe(false);
    expect(leadUpdates).toHaveLength(0);
  });
});

describe('tenantForToken', () => {
  it('only a full-length, known token resolves', () => {
    expect(tenantForToken('x'.repeat(32))).toBe(T);
    expect(tenantForToken('short')).toBeNull();
    expect(tenantForToken('y'.repeat(32))).toBeNull();
  });
});
