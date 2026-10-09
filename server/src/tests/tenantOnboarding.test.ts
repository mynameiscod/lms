const stages: any[] = [];
jest.mock('../models/LeadStage', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(async () => stages.length),
    insertMany: jest.fn(async (docs: any[]) => { stages.push(...docs); return docs; }),
  },
}));
let tenantDoc: any = {};
jest.mock('../models/Tenant', () => ({ __esModule: true, default: { findById: () => ({ select: () => ({ lean: async () => tenantDoc }) }) } }));
jest.mock('../models/User', () => ({ __esModule: true, default: { countDocuments: jest.fn(async () => 0) } }));
jest.mock('../models/Batch', () => ({ __esModule: true, default: { countDocuments: jest.fn(async () => 0) } }));
jest.mock('../models/LeadSourceConfig', () => ({
  __esModule: true,
  default: { exists: jest.fn(async () => true), create: jest.fn(), findOne: () => ({ select: () => ({ lean: async () => null }) }) },
}));
jest.mock('../services/settingsService', () => ({
  getCredentialSet: () => ({ RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '' }),
  source: () => 'unset',
  isPlatformOwner: () => false,
}));

import { onboardTenant, onboardingChecklist, STARTER_STAGES } from '../services/tenantOnboardingService';

const T = '6ac8c2f377f023a80d249660';

describe('onboardTenant', () => {
  beforeEach(() => { stages.length = 0; });

  it('adds the starter pipeline once, including the "Converted" stage lead conversion needs', async () => {
    expect((await onboardTenant(T)).added).toContain('lead stages');
    expect(stages.map((s) => s.name)).toContain('Converted');
    expect(stages).toHaveLength(STARTER_STAGES.length);
    expect((await onboardTenant(T)).added).not.toContain('lead stages');
    expect(stages).toHaveLength(STARTER_STAGES.length);
  });
});

describe('onboardingChecklist', () => {
  it('asks for the institute\'s own Razorpay when fees are on, and marks it required', async () => {
    tenantDoc = { name: 'College', modules: { feeManagement: true, leads: false } };
    const { items } = await onboardingChecklist(T);
    const pay = items.find((i) => i.key === 'payments');
    expect(pay).toMatchObject({ required: true, done: false, link: '/admin/integrations' });
  });

  it('does not ask for payments or a lead pipeline when those modules are off', async () => {
    const off = Object.fromEntries(['courses', 'attendance', 'quizzes', 'assignments', 'classRecordings', 'codeAssessments', 'mockInterviews', 'placement', 'leads', 'marketing', 'feeManagement', 'thinkingLab', 'speakingPractice', 'resourceLibrary', 'careerPilot', 'aiCommunicationLab'].map((k) => [k, false]));
    tenantDoc = { name: 'College', modules: off };
    const { items } = await onboardingChecklist(T);
    expect(items.find((i) => i.key === 'payments')).toBeUndefined();
    expect(items.find((i) => i.key === 'stages')).toBeUndefined();
  });
});
