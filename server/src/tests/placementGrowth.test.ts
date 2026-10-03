import crypto from 'crypto';
import { buildMetaEvent } from '../services/placementGrowthService';

const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

describe('buildMetaEvent', () => {
  const at = new Date('2026-10-05T05:00:00Z');
  const c: any = {
    _id: 'cand1', mobile: '9876543210', email: 'Ravi@Example.com',
    attribution: { last_touch: { fbclid: 'IwAR123', captured_at: '2026-10-01T10:00:00Z', landing_page: 'https://platform.codebegun.com/placement-program?utm_source=instagram' } },
  };

  it('hashes phone (with 91) and email, carries the ad click as fbc, and a stable event_id', () => {
    const e: any = buildMetaEvent(c, 'Purchase', at, 5000);
    expect(e.event_name).toBe('Purchase');
    expect(e.event_time).toBe(Math.floor(at.getTime() / 1000));
    expect(e.event_id).toBe('pp-cand1-Purchase');
    expect(e.action_source).toBe('website');
    expect(e.user_data.ph).toEqual([sha('919876543210')]);
    expect(e.user_data.em).toEqual([sha('ravi@example.com')]);
    expect(e.user_data.fbc).toBe(`fb.1.${new Date('2026-10-01T10:00:00Z').getTime()}.IwAR123`);
    expect(e.custom_data).toEqual({ currency: 'INR', value: 5000 });
    expect(e.event_source_url).toContain('/placement-program');
  });

  it('marks CRM outcomes as system_generated and omits what it does not have', () => {
    const e: any = buildMetaEvent({ _id: 'c2', mobile: '9000000000' } as any, 'InterviewAttended', at);
    expect(e.action_source).toBe('system_generated');
    expect(e.user_data.em).toBeUndefined();
    expect(e.user_data.fbc).toBeUndefined();
    expect(e.custom_data).toBeUndefined();
  });
});
