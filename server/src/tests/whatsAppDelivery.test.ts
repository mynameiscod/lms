const rows = new Map<string, any>();

jest.mock('../models/WhatsAppMessageLog', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(async (q: any) => rows.get(q.wamid) || null),
    create: jest.fn(async (doc: any) => { if (doc.wamid) rows.set(doc.wamid, { ...doc, save: jest.fn() }); return doc; }),
  },
}));

import { applyDeliveryStatuses, explainWaError, recordSend } from '../services/whatsAppDeliveryService';

const row = (wamid: string, status: string) => {
  const r: any = { wamid, status, save: jest.fn() };
  rows.set(wamid, r);
  return r;
};

beforeEach(() => rows.clear());

describe('applyDeliveryStatuses', () => {
  it('moves forward: accepted → sent → delivered → read', async () => {
    const r = row('w1', 'accepted');
    await applyDeliveryStatuses([{ id: 'w1', status: 'sent', timestamp: '1700000000' }]);
    await applyDeliveryStatuses([{ id: 'w1', status: 'delivered', timestamp: '1700000010' }]);
    await applyDeliveryStatuses([{ id: 'w1', status: 'read', timestamp: '1700000020' }]);
    expect(r.status).toBe('read');
    expect(r.statusAt).toEqual(new Date(1700000020 * 1000));
  });

  it('never moves backwards when reports arrive out of order', async () => {
    const r = row('w2', 'read');
    await applyDeliveryStatuses([{ id: 'w2', status: 'delivered' }, { id: 'w2', status: 'sent' }]);
    expect(r.status).toBe('read');
    expect(r.save).not.toHaveBeenCalled();
  });

  it('records a failure with Meta’s code and title', async () => {
    const r = row('w3', 'sent');
    await applyDeliveryStatuses([{ id: 'w3', status: 'failed', errors: [{ code: 131049, title: 'This message was not delivered to maintain healthy ecosystem engagement.' }] }]);
    expect(r).toMatchObject({ status: 'failed', errorCode: 131049 });
  });

  it('ignores a failure report after the message was delivered, and unknown message ids', async () => {
    const r = row('w4', 'delivered');
    const n = await applyDeliveryStatuses([{ id: 'w4', status: 'failed' }, { id: 'someone-else', status: 'read' }]);
    expect(r.status).toBe('delivered');
    expect(n).toBe(0);
  });
});

describe('explainWaError', () => {
  it('turns the marketing limit into something an admin can act on', () => {
    expect(explainWaError(131049)).toMatch(/marketing/i);
    expect(explainWaError(131026)).toMatch(/not on WhatsApp/);
    expect(explainWaError(999999, 'raw meta text')).toBe('raw meta text');
  });
});

describe('recordSend', () => {
  it('keeps the wamid of an accepted send so its delivery report can find it', async () => {
    await recordSend({ tenantId: '69c7723868202a8e4616ef3d', to: '919743545311', templateName: 't', source: 'test', result: { ok: true, messageId: 'wamid.X' } });
    expect(rows.get('wamid.X')).toMatchObject({ status: 'accepted', to: '919743545311' });
  });
});
