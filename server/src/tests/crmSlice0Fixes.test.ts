/**
 * CRM Slice 0 regressions — the live bugs fixed before the lifecycle redesign.
 */
import mongoose from 'mongoose';
import Lead, { CALL_OUTCOMES } from '../models/Lead';
import leadRoutes from '../routes/leadRoutes';

describe('CRM slice 0 fixes', () => {
  it('accepts every call outcome the lead page offers', () => {
    // Values in client/src/pages/LeadDetail/LeadDetailV2.tsx call-outcome <select>.
    const offeredByLeadPage = ['connected', 'not_answered', 'not_connected', 'busy', 'switched_off', 'rejected', 'wrong_number', 'callback_requested'];
    for (const o of offeredByLeadPage) expect(CALL_OUTCOMES).toContain(o);
  });

  it('a call activity with callback_requested passes schema validation', () => {
    const lead = new Lead({
      tenantId: new mongoose.Types.ObjectId(),
      name: 'Test', phone: '9999999999',
      stageId: new mongoose.Types.ObjectId(),
      activities: [{ type: 'call', description: 'x', createdBy: new mongoose.Types.ObjectId(), callOutcome: 'callback_requested' }],
    });
    const err = lead.validateSync();
    expect(err?.errors?.['activities.0.callOutcome']).toBeUndefined();
  });

  it("accepts the lost-reason category 'contact' that LostReasonConfig uses", () => {
    const lead = new Lead({
      tenantId: new mongoose.Types.ObjectId(), name: 'T', phone: '1', stageId: new mongoose.Types.ObjectId(),
      lostReasonCategory: 'contact',
    });
    expect(lead.validateSync()?.errors?.lostReasonCategory).toBeUndefined();
  });

  it('registers /aging and /duplicates before /:leadId so they are reachable', () => {
    const paths: string[] = (leadRoutes as any).stack
      .filter((l: any) => l.route && l.route.methods.get)
      .map((l: any) => l.route.path);
    const leadIdx = paths.indexOf('/:leadId');
    expect(leadIdx).toBeGreaterThan(-1);
    expect(paths.indexOf('/aging')).toBeLessThan(leadIdx);
    expect(paths.indexOf('/duplicates')).toBeLessThan(leadIdx);
  });
});
