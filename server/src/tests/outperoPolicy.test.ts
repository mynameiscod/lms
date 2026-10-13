const values: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({ getStr: (key: string, fallback = '') => values[key] ?? fallback, setMany: jest.fn(async (entries: any[]) => { entries.forEach(e => values[e.key] = e.value); }) }));
const stageExists = jest.fn(async () => true);
jest.mock('../models/LeadStage', () => ({ __esModule: true, default: { exists: (...args: any[]) => (stageExists as any)(...args) } }));
import { waitsForOutpero, classifyOutcome, savePolicy, getPolicy } from '../services/outperoPolicyService';
beforeEach(() => { for (const key of Object.keys(values)) delete values[key]; stageExists.mockResolvedValue(true); });
const tenant = '65a0000000000000000000aa';
describe('Outpero feedback policy', () => {
  it('defers matching automatic leads but not excluded sources', () => {
    Object.assign(values, { OUTPERO_FEEDBACK_ENABLED: 'true', OUTPERO_ASSIGNMENT_TIMING: 'after_call', OUTPERO_MODE: 'auto', OUTPERO_ENDPOINT_URL: 'https://example.test', OUTPERO_LEAD_SECRET: 'secret', OUTPERO_SOURCES: 'meta', OUTPERO_COURSES: 'java' });
    expect(waitsForOutpero({ source: 'meta', courseInterest: ['Java Full Stack'] }, tenant)).toBe(true);
    expect(waitsForOutpero({ source: 'website', courseInterest: ['Java Full Stack'] }, tenant)).toBe(false);
    values.OUTPERO_FEEDBACK_ENABLED = 'false'; expect(waitsForOutpero({ source: 'meta' }, tenant)).toBe(false);
  });
  it('does not treat completed as interested, and prioritizes opt-out over demo answers', () => {
    expect(classifyOutcome({ status: 'completed' })).toBeNull();
    expect(classifyOutcome({ outcome: 'do not call', variables: { demo_time: '5 PM' } })).toBe('opt_out');
    expect(classifyOutcome({ outcome: 'something unknown' })).toBe('needs_review');
  });
  it('holds assignment by default, and the admin can switch it off', () => {
    Object.assign(values, { OUTPERO_MODE: 'auto', OUTPERO_ENDPOINT_URL: 'https://example.test', OUTPERO_LEAD_SECRET: 'secret' });
    expect(waitsForOutpero({ source: 'meta' }, tenant)).toBe(true);
    expect(getPolicy(tenant).fallbackHours).toBe(24);
    values.OUTPERO_FEEDBACK_ENABLED = 'false'; expect(waitsForOutpero({ source: 'meta' }, tenant)).toBe(false);
  });
  it('reads the outcome names Outpero shows (No response, Call failed, Qualified, Voicemail)', () => {
    expect(classifyOutcome({ outcome: 'No response' })).toBe('no_answer');
    expect(classifyOutcome({ outcome: 'Call failed' })).toBe('no_answer');
    expect(classifyOutcome({ outcome: 'Voicemail' })).toBe('no_answer');
    expect(classifyOutcome({ outcome: 'Qualified' })).toBe('interested');
  });
  it('validates the holding stage and the fallback hours', async () => {
    const base = { enabled: true, assignmentTiming: 'after_call', maxCallAttempts: 3, retryGapMinutes: 120, stageMapping: {} };
    await savePolicy(tenant, tenant, { ...base, sentStageId: '65a0000000000000000000bb', fallbackHours: 12 });
    expect(getPolicy(tenant)).toMatchObject({ sentStageId: '65a0000000000000000000bb', fallbackHours: 12 });
    await expect(savePolicy(tenant, tenant, { ...base, fallbackHours: 0 })).rejects.toThrow('hours');
    stageExists.mockResolvedValue(false); await expect(savePolicy(tenant, tenant, { ...base, sentStageId: '65a0000000000000000000bb' })).rejects.toThrow('sent to Outpero');
  });
  it('validates active stages in the same tenant before saving', async () => {
    const policy = { enabled: true, assignmentTiming: 'after_call', maxCallAttempts: 3, retryGapMinutes: 120, stageMapping: { interested: '65a0000000000000000000bb' } };
    await savePolicy(tenant, tenant, policy);
    expect(stageExists).toHaveBeenCalledWith({ _id: policy.stageMapping.interested, tenantId: tenant, isActive: true });
    stageExists.mockResolvedValue(false); await expect(savePolicy(tenant, tenant, policy)).rejects.toThrow('active stage');
  });
});
