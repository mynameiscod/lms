/**
 * A new lead handed to Outpero shows as "With Outpero" at once, also at night when calls cannot
 * start until 9 AM, and goes back to where it was if Outpero can never take it. Real database;
 * only the settings and the call to Outpero are stood in for.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

const values: Record<string, string> = {};
jest.mock('../../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => values[k] ?? fallback,
  getNum: (k: string, fallback: number) => (values[k] ? Number(values[k]) : fallback),
  setMany: jest.fn(),
}));
const fetchMock = jest.fn();
(global as any).fetch = (...a: any[]) => fetchMock(...a);

import Lead from '../../models/Lead';
import LeadStage from '../../models/LeadStage';
import * as svc from '../../services/outperoForwardService';

const T = new mongoose.Types.ObjectId();
const U = new mongoose.Types.ObjectId();
let fresh: any; let withOutpero: any;

beforeAll(async () => { await startMongo(); });
afterAll(async () => { jest.restoreAllMocks(); await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  for (const k of Object.keys(values)) delete values[k];
  fetchMock.mockReset();
  jest.restoreAllMocks();
  fresh = await LeadStage.create({ tenantId: T, name: 'New Lead', order: 1, color: '#000', isActive: true, createdBy: U } as any);
  withOutpero = await LeadStage.create({ tenantId: T, name: 'With Outpero', order: 2, color: '#000', isActive: true, createdBy: U } as any);
  Object.assign(values, {
    OUTPERO_MODE: 'auto', OUTPERO_ENDPOINT_URL: 'https://api.outpero.test/x', OUTPERO_LEAD_SECRET: 's'.repeat(24),
    OUTPERO_FEEDBACK_ENABLED: 'true', OUTPERO_SENT_STAGE: String(withOutpero._id),
  });
});

/** The server clock set to a time of day in India (IST = UTC+5:30). */
const atIst = (hh: number, mm: number) => jest.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 9, 14, hh, mm) - 330 * 60_000);
const answer = (status: number) => fetchMock.mockResolvedValue({ ok: status < 300, status, text: async () => '' });
const newLead = () => Lead.create({ tenantId: T, name: 'Ravi', phone: '9876543210', source: 'whatsapp', stageId: fresh._id, createdBy: U, courseInterest: [], activities: [{ type: 'whatsapp', description: 'Lead created from WhatsApp conversation.', createdBy: U }] } as any);
const reload = (id: any) => Lead.findById(id).lean() as Promise<any>;
/** Creating a lead already hands it to Outpero (a hook on the model does it in the background); wait for that to settle. */
const settled = async (id: any, done: (l: any) => boolean) => {
  for (let i = 0; i < 60; i++) { const l = await reload(id); if (done(l)) return l; await new Promise((r) => setTimeout(r, 50)); }
  return reload(id);
};

describe('a new lead handed to Outpero', () => {
  it('is With Outpero as soon as it is sent, during calling hours', async () => {
    atIst(11, 0); answer(202);
    const lead: any = await newLead();
    const l = await settled(lead._id, (x) => x.outpero?.status === 'sent');
    expect(String(l.stageId)).toBe(String(withOutpero._id));
    expect(l.outpero).toMatchObject({ status: 'sent', attempts: 1 });
    expect(String(l.outpero.stageAtSend)).toBe(String(withOutpero._id));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(l.activities.filter((a: any) => /Sent to Outpero/.test(a.description))).toHaveLength(1);
  });

  it('is With Outpero straight away at night too, with a note saying it will be called from 9 AM', async () => {
    atIst(20, 27); answer(202);
    const lead: any = await newLead();
    const night = await settled(lead._id, (x) => x.outpero?.status === 'pending' && String(x.stageId) === String(withOutpero._id));
    expect(String(night.stageId)).toBe(String(withOutpero._id));
    expect(night.outpero.status).toBe('pending');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(night.activities.some((a: any) => /from 9 AM/.test(a.description))).toBe(true);
    expect(night.assignedTo).toBeFalsy();
    // Morning: the one-minute job sends it, and it stays where it is.
    atIst(9, 5);
    await svc.sendLead(String(lead._id));
    const morning = await reload(lead._id);
    expect(morning.outpero.status).toBe('sent');
    expect(String(morning.stageId)).toBe(String(withOutpero._id));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('goes back to its earlier stage when Outpero can never take it', async () => {
    atIst(11, 0); answer(401);
    const lead: any = await newLead();
    const l = await settled(lead._id, (x) => x.outpero?.status === 'failed');
    expect(l.outpero.status).toBe('failed');
    expect(String(l.stageId)).toBe(String(fresh._id));
    expect(l.activities.some((a: any) => /Not sent to Outpero/.test(a.description))).toBe(true);
  });

  it('stays a plain new lead when holding for Outpero is switched off or no stage is chosen', async () => {
    atIst(11, 0); answer(202);
    values.OUTPERO_FEEDBACK_ENABLED = 'false';
    const a: any = await newLead();
    expect(String((await settled(a._id, (x) => x.outpero?.status === 'sent')).stageId)).toBe(String(fresh._id));
    values.OUTPERO_FEEDBACK_ENABLED = 'true'; values.OUTPERO_SENT_STAGE = '';
    const b: any = await newLead();
    expect(String((await settled(b._id, (x) => x.outpero?.status === 'sent')).stageId)).toBe(String(fresh._id));
  });

  it('is left alone when it is outside the source filters, so it is assigned as usual', async () => {
    atIst(11, 0); answer(202);
    values.OUTPERO_SOURCES = 'website';
    const l: any = await newLead();
    await new Promise((r) => setTimeout(r, 400));
    expect((await reload(l._id)).outpero?.status).toBeUndefined();
    expect(String((await reload(l._id)).stageId)).toBe(String(fresh._id));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
