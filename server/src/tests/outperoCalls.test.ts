jest.mock('../controllers/leadStageHistoryController', () => ({ recordStageTransition: jest.fn(async () => {}) }));
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
const settingValues: Record<string, string> = {};
const assigned = jest.fn(async () => '65a0000000000000000000cc');
jest.mock('../services/leadDistributionService', () => ({ autoAssignLead: (...a: any[]) => (assigned as any)(...a) }));
jest.mock('../models/LeadStage', () => ({ __esModule: true, default: { findOne: jest.fn((q: any) => ({ lean: async () => q._id ? { _id: q._id, category: 'new', isActive: true } : null })) } }));
const LEAD: any = { _id: '65a0000000000000000000aa', name: 'Ravi', phone: '9876543210', customFields: {}, createdBy: '65a0000000000000000000bb', aiCallAttempts: 0 };
const leadUpdates: any[] = [];
jest.mock('../models/Lead', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn((q: any) => {
      const hit = (q._id && String(q._id) === LEAD._id) || (q.phone instanceof RegExp && q.phone.test(LEAD.phone)) ? LEAD : null;
      const chain: any = { select: () => chain, sort: () => chain, lean: async () => hit };
      return chain;
    }),
    findOneAndUpdate: jest.fn(async () => LEAD),
    updateOne: jest.fn(async (_q: any, u: any) => {
      leadUpdates.push(u);
      if (u.$set) for (const [path, value] of Object.entries(u.$set)) {
        const parts = path.split('.'); let target = LEAD;
        while (parts.length > 1) { const key = parts.shift()!; target[key] ||= {}; target = target[key]; }
        target[parts[0]] = value;
      }
      if (u.$push?.aiCallLogs) { LEAD.aiCallLogs ||= []; LEAD.aiCallLogs.push(u.$push.aiCallLogs); }
      return { modifiedCount: 1 };
    }),
  },
}));
const followUps: any[] = [];
jest.mock('../models/FollowUpReminder', () => ({ __esModule: true, default: { updateOne: jest.fn(async (q: any, u: any) => { if (!followUps.some(f => f.automationKey === q.automationKey)) followUps.push(u.$setOnInsert); return {}; }) } }));
jest.mock('../services/settingsService', () => ({ getStr: (k: string, f = '') => settingValues[k] ?? f, tenantWithValue: (_k: string, v: string) => (v === 'x'.repeat(32) ? '69c7723868202a8e4616ef3d' : null) }));

import { nextCallWindow, parseCall, readIstDateTime, receiveCall, tenantForToken } from '../services/outperoCallService';

const T = '69c7723868202a8e4616ef3d';
beforeEach(() => { calls.clear(); leadUpdates.length = 0; followUps.length = 0; LEAD.aiCallLogs = []; LEAD.aiFeedback = undefined; LEAD.assignedTo = undefined; LEAD.stageId = '65a0000000000000000000dd'; LEAD.activities = []; LEAD.archivedAt = null; LEAD.outpero = undefined; LEAD.aiSummary = undefined; assigned.mockReset().mockResolvedValue('65a0000000000000000000cc'); for (const k of Object.keys(settingValues)) delete settingValues[k]; });

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

describe('post-call assignment and stages', () => {
  const enable = () => { settingValues.OUTPERO_FEEDBACK_ENABLED = 'true'; settingValues.OUTPERO_STAGE_MAPPING = JSON.stringify({ interested: '65a0000000000000000000ee' }); };
  it('assigns an interested lead, maps its stage, and creates one owner task across duplicate deliveries', async () => {
    enable();
    const body = { call_id: 'qualified', lms_lead_id: LEAD._id, outcome: 'interested', summary: 'Wants Java', duration: 80 };
    await receiveCall(T, body); await receiveCall(T, body);
    expect(assigned).toHaveBeenCalledTimes(1);
    expect(LEAD.stageId).toBe('65a0000000000000000000ee');
    expect(followUps).toHaveLength(1);
    expect(followUps[0].assignedTo).toBe('65a0000000000000000000cc');
  });
  it('keeps leads visible when no owner is available and creates no task for the creator', async () => {
    enable(); assigned.mockResolvedValue(null as any);
    await receiveCall(T, { call_id: 'waiting', lms_lead_id: LEAD._id, outcome: 'callback' });
    expect(LEAD.aiFeedback.state).toBe('awaiting_assignment'); expect(followUps).toHaveLength(0);
  });
  it('stops further calls on opt-out and does not assign', async () => {
    enable(); await receiveCall(T, { call_id: 'stop', lms_lead_id: LEAD._id, outcome: 'do not call' });
    expect(LEAD.aiFeedback.doNotContact).toBe(true); expect(assigned).not.toHaveBeenCalled(); expect(followUps).toHaveLength(0);
  });
  it('does not change a newer human stage or assign from late feedback', async () => {
    enable(); LEAD.activities = [{ type: 'status_change', createdAt: new Date('2026-10-12T10:00:00Z') }];
    await receiveCall(T, { call_id: 'late', lms_lead_id: LEAD._id, outcome: 'interested', started_at: '2026-10-12T09:00:00Z' });
    expect(LEAD.stageId).toBe('65a0000000000000000000dd'); expect(assigned).not.toHaveBeenCalled(); expect(followUps).toHaveLength(0);
  });
  it('routes unrecognized results to review without assigning', async () => {
    enable(); await receiveCall(T, { call_id: 'unknown', lms_lead_id: LEAD._id, outcome: 'some new provider result' });
    expect(LEAD.aiFeedback.state).toBe('needs_review'); expect(assigned).not.toHaveBeenCalled();
  });
});

describe('no-answer retries', () => {
  it('queues a retry only once for a call', async () => {
    settingValues.OUTPERO_FEEDBACK_ENABLED = 'true';
    LEAD.outpero = { status: 'sent' };
    const body = { call_id: 'retry', lms_lead_id: LEAD._id, outcome: 'no_answer' };
    await receiveCall(T, body); const first = LEAD.outpero.nextAttemptAt;
    await receiveCall(T, body);
    expect(LEAD.aiFeedback.state).toBe('retry_scheduled');
    expect(LEAD.outpero.nextAttemptAt).toEqual(first); expect(assigned).not.toHaveBeenCalled();
  });
  it('hands off to a person after the attempt limit', async () => {
    settingValues.OUTPERO_FEEDBACK_ENABLED = 'true'; settingValues.OUTPERO_MAX_CALL_ATTEMPTS = '1'; LEAD.outpero = { status: 'sent' };
    await receiveCall(T, { call_id: 'exhausted', lms_lead_id: LEAD._id, outcome: 'busy' });
    expect(assigned).toHaveBeenCalledTimes(1); expect(followUps).toHaveLength(1);
    expect(followUps[0].title).toContain('attempts exhausted');
  });
  it('shifts calls into the IST calling window', () => {
    expect(nextCallWindow(new Date('2026-10-12T16:00:00Z')).toISOString()).toBe('2026-10-13T03:30:00.000Z');
    expect(nextCallWindow(new Date('2026-10-12T00:00:00Z')).toISOString()).toBe('2026-10-12T03:30:00.000Z');
    expect(nextCallWindow(new Date('2026-10-12T06:00:00Z')).toISOString()).toBe('2026-10-12T06:00:00.000Z');
  });
});

describe('late call details', () => {
  it('fills a summary and recording that arrive after the initial outcome', async () => {
    await receiveCall(T, { call_id: 'details', lms_lead_id: LEAD._id, outcome: 'interested' });
    await receiveCall(T, { call_id: 'details', lms_lead_id: LEAD._id, summary: 'Interested in Java', recording_url: 'https://example.test/call.mp3' });
    expect(LEAD.aiSummary.summary).toBe('Interested in Java');
    expect(leadUpdates.some(u => u.$set?.['aiCallLogs.$.recordingUrl'] === 'https://example.test/call.mp3')).toBe(true);
  });
});
