const cand: any = { _id: 'c1', tenantId: 't1', name: 'Ravi Kumar', stage: 'agreement_signed', cheque: { status: 'received' }, markModified: jest.fn(), save: jest.fn(async () => cand) };

jest.mock('../models/PlacementCandidate', () => ({ __esModule: true, default: { findOne: jest.fn(async () => cand) } }));
jest.mock('../models/PlacementEvent', () => ({ __esModule: true, default: { create: jest.fn(async () => ({})) } }));

import { renderAgreement, validateChequeFields, setChequeStatus } from '../services/placementAgreementService';

describe('renderAgreement', () => {
  it('fills known fields and leaves unknown ones visible so a typo shows in the preview', () => {
    expect(renderAgreement('I, {{name}}, agree to pay ₹{{ fee }}. {{nmae}}', { name: 'Ravi Kumar', fee: '5,000' }))
      .toBe('I, Ravi Kumar, agree to pay ₹5,000. {{nmae}}');
  });
});

describe('validateChequeFields', () => {
  it('accepts a 6-digit cheque number, bank, amount and date', () => {
    expect(validateChequeFields({ number: '123 456', bank: 'SBI', amountInr: '50000', date: '2026-10-10' }))
      .toMatchObject({ number: '123456', bank: 'SBI', amountInr: 50000 });
  });
  it('refuses a wrong cheque number, a missing bank, a zero amount and a bad date', () => {
    expect(() => validateChequeFields({ number: '12345', bank: 'SBI', amountInr: 1, date: '2026-10-10' })).toThrow(/6 digits/);
    expect(() => validateChequeFields({ number: '123456', bank: '', amountInr: 1, date: '2026-10-10' })).toThrow(/bank/);
    expect(() => validateChequeFields({ number: '123456', bank: 'SBI', amountInr: 0, date: '2026-10-10' })).toThrow(/amount/);
    expect(() => validateChequeFields({ number: '123456', bank: 'SBI', amountInr: 1, date: 'soon' })).toThrow(/date/);
  });
});

describe('setChequeStatus', () => {
  beforeEach(() => { cand.cheque = { status: 'received' }; cand.stage = 'agreement_signed'; });

  it('verifying moves the candidate to cheque_verified', async () => {
    await setChequeStatus('t1', 'c1', 'verified', 'admin1');
    expect(cand.cheque.status).toBe('verified');
    expect(cand.stage).toBe('cheque_verified');
  });

  it('refuses moves that skip a step', async () => {
    await expect(setChequeStatus('t1', 'c1', 'deposited', 'admin1', 'breached clause 4 of the agreement')).rejects.toThrow(/cannot be marked/);
  });

  it('deposit needs a written reason', async () => {
    cand.cheque = { status: 'held' };
    await expect(setChequeStatus('t1', 'c1', 'deposited', 'admin1', 'no')).rejects.toThrow(/written reason/);
    await setChequeStatus('t1', 'c1', 'deposited', 'admin1', 'Left the program in month 2, clause 4');
    expect(cand.cheque).toMatchObject({ status: 'deposited', depositReason: 'Left the program in month 2, clause 4' });
  });
});
