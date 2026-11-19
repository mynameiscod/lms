/**
 * LMS Refer & Earn (2026-11-19): a referred friend earns the referrer ₹1500 only after paying the FULL
 * fee and a 30-day hold; a refund during the hold stops it; payouts go to UPI or a bank account.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import Fee from '../../models/Fee';
import Lead from '../../models/Lead';
import { Referral, ReferralPayout } from '../../models/Referral';
import * as svc from '../../services/referralService';

jest.setTimeout(240_000);
const tid = new mongoose.Types.ObjectId();
const DAY = 24 * 60 * 60 * 1000;
const db = () => mongoose.connection.db!;

async function student(first: string, phone: string, extra: any = {}) {
  const _id = new mongoose.Types.ObjectId();
  await db().collection('users').insertOne({ _id, tenantId: tid, role: 'STUDENT', firstName: first, lastName: 'K', email: `${first.toLowerCase()}@x.in`, phone, isActive: true, ...extra });
  return db().collection('users').findOne({ _id });
}

describe('Refer & Earn', () => {
  beforeAll(async () => {
    await startMongo();
    await Referral.syncIndexes();
    await ReferralPayout.syncIndexes();
    await db().collection('leadstages').insertOne({ tenantId: tid, name: 'New', order: 1 });
    await db().collection('users').insertOne({ tenantId: tid, role: 'TENANT_ADMIN', firstName: 'Admin', email: 'a@x.in' });
  });
  afterAll(stopMongo);

  let referrer: any;
  let refId: any;

  it('only enrolled, non-demo students can refer', async () => {
    referrer = await student('Ravi', '9550100001', { batchId: new mongoose.Types.ObjectId() });
    expect((await svc.referrerEligibility(referrer)).ok).toBe(true);
    const loose = await student('Loose', '9550100002');
    expect((await svc.referrerEligibility(loose)).ok).toBe(false);
    const demo = await student('Demo', '9550100003', { batchId: new mongoose.Types.ObjectId(), lmsDemo: { at: new Date() } });
    expect((await svc.referrerEligibility(demo)).ok).toBe(false);
    const code = await svc.ensureCode(referrer);
    expect(code.code).toMatch(/^RAVI[2-9A-Z]{4}$/);
    expect((await svc.ensureCode(referrer)).code).toBe(code.code); // never changes
  });

  it('a referral makes a CRM lead tagged with the referrer', async () => {
    const ref: any = await svc.createReferral({ referrer, name: 'Sita', phone: '+91 98480 22222', course: 'Java Full Stack with AI', via: 'link' });
    refId = ref._id;
    expect(ref.friendPhone).toBe('9848022222');
    const lead: any = await Lead.findOne({ tenantId: tid, phone: '9848022222' }).lean();
    expect(lead.source).toBe('referral');
    expect(lead.referral.referrerName).toBe('Ravi K');
    expect(lead.courseInterest).toEqual(['Java Full Stack with AI']);
    expect(String((await Referral.findById(refId).lean())!.leadId)).toBe(String(lead._id));
  });

  it('refuses self, duplicates, existing leads and existing students', async () => {
    await expect(svc.createReferral({ referrer, name: 'Me', phone: '9550100001', via: 'app' })).rejects.toMatchObject({ code: 'SELF' });
    await expect(svc.createReferral({ referrer, name: 'Sita again', phone: '9848022222', via: 'app' })).rejects.toMatchObject({ code: 'ALREADY_REFERRED' });
    await db().collection('leads').insertOne({ tenantId: tid, name: 'Old lead', phone: '9000000011' });
    await expect(svc.createReferral({ referrer, name: 'Old', phone: '9000000011', via: 'app' })).rejects.toMatchObject({ code: 'ALREADY_LEAD' });
    await student('Existing', '9000000012');
    await expect(svc.createReferral({ referrer, name: 'Existing', phone: '9000000012', via: 'app' })).rejects.toMatchObject({ code: 'ALREADY_STUDENT' });
    await expect(svc.createReferral({ referrer, name: 'Bad', phone: '12345', via: 'app' })).rejects.toMatchObject({ code: 'PHONE' });
  });

  it('pending → joined → on hold only on FULL fee → earned after 30 days', async () => {
    const friend: any = await student('Sita', '9848022222');
    await Lead.updateOne({ phone: '9848022222' }, { $set: { convertedStudentId: friend._id } });
    expect(await svc.syncReferral(refId)).toBe('joined');

    const fee = await new Fee({ tenantId: tid, studentId: friend._id, totalAmount: 50000, discount: 5000, paidAmount: 20000, receivedBy: tid } as any).save();
    expect(await svc.syncReferral(refId)).toBe('joined'); // part paid: nothing yet

    fee.paidAmount = 45000; // full fee, net of discount
    await fee.save();
    const t0 = new Date();
    expect(await svc.syncReferral(refId, t0)).toBe('on_hold');
    let ref: any = await Referral.findById(refId).lean();
    expect(ref.rewardAmount).toBe(1500);
    expect(Math.round((new Date(ref.holdUntil).getTime() - t0.getTime()) / DAY)).toBe(30);

    expect(await svc.syncReferral(refId, new Date(t0.getTime() + 29 * DAY))).toBe('on_hold');
    expect(await svc.syncReferral(refId, new Date(t0.getTime() + 30 * DAY + 1000))).toBe('earned');
    ref = await Referral.findById(refId).lean();
    expect(ref.history.map((h: any) => h.status)).toEqual(['pending', 'joined', 'on_hold', 'earned']);
    const bal = await svc.balanceOf(referrer._id);
    expect(bal.earned).toBe(1500);
    expect(bal.available).toBe(1500);
  });

  it('a refund during the hold stops it', async () => {
    const ref: any = await svc.createReferral({ referrer, name: 'Gita', phone: '9848033333', via: 'app' });
    const friend: any = await student('Gita', '9848033333');
    const fee = await new Fee({ tenantId: tid, studentId: friend._id, totalAmount: 40000, paidAmount: 40000, receivedBy: tid } as any).save();
    expect(await svc.syncReferral(ref._id)).toBe('on_hold');
    fee.paidAmount = 10000; // refunded
    await fee.save();
    expect(await svc.syncReferral(ref._id, new Date(Date.now() + 31 * DAY))).toBe('joined');
    expect((await svc.balanceOf(referrer._id)).onHold).toBe(0);
  });

  it('payouts: UPI/bank checked, one open request, paid with a reference', async () => {
    await expect(svc.requestPayout(referrer, { amount: 1500, details: { method: 'upi', upiId: 'not-a-upi' } })).rejects.toMatchObject({ code: 'UPI' });
    await expect(svc.requestPayout(referrer, { amount: 1500, details: { method: 'bank', holderName: 'Ravi K', accountNumber: '12', ifsc: 'SBIN0001234' } })).rejects.toMatchObject({ code: 'ACCOUNT' });
    await expect(svc.requestPayout(referrer, { amount: 3000, details: { method: 'upi', upiId: 'ravi@okaxis' } })).rejects.toMatchObject({ code: 'AMOUNT' });

    const p: any = await svc.requestPayout(referrer, { amount: 1500, details: { method: 'bank', holderName: 'Ravi K', accountNumber: '123456789012', ifsc: 'sbin0001234' } });
    expect(p.details.ifsc).toBe('SBIN0001234');
    expect((await svc.balanceOf(referrer._id)).available).toBe(0);
    await expect(svc.requestPayout(referrer, { amount: 1, details: { method: 'upi', upiId: 'ravi@okaxis' } })).rejects.toMatchObject({ code: 'AMOUNT' });

    // An earned reward that is being withdrawn cannot be cancelled.
    await expect(svc.rejectReferral(String(tid), String(refId), 'Changed our mind', { id: '', name: 'Admin' })).rejects.toMatchObject({ code: 'ALREADY_WITHDRAWN' });

    await expect(svc.markPayoutPaid(String(tid), String(p._id), { reference: '' }, { id: '', name: 'Admin' })).rejects.toMatchObject({ code: 'REFERENCE' });
    const paid: any = await svc.markPayoutPaid(String(tid), String(p._id), { reference: 'UTR123456' }, { id: '', name: 'Admin' });
    expect(paid.status).toBe('paid');
    expect(paid.openKey).toBeUndefined();
    await expect(svc.markPayoutPaid(String(tid), String(p._id), { reference: 'UTR123456' }, { id: '', name: 'Admin' })).rejects.toMatchObject({ code: 'NOT_OPEN' });
    const bal = await svc.balanceOf(referrer._id);
    expect(bal.paidOut).toBe(1500);
    expect(bal.available).toBe(0);
  });

  it('a rejected withdrawal goes back to the balance; reject + restore a referral', async () => {
    // Earn a second reward.
    const ref: any = await svc.createReferral({ referrer, name: 'Lata', phone: '9848044444', via: 'app' });
    const friend: any = await student('Lata', '9848044444');
    await new Fee({ tenantId: tid, studentId: friend._id, totalAmount: 30000, paidAmount: 30000, receivedBy: tid } as any).save();
    await svc.syncReferral(ref._id);
    expect(await svc.syncReferral(ref._id, new Date(Date.now() + 31 * DAY))).toBe('earned');

    const p: any = await svc.requestPayout(referrer, { details: { method: 'upi', upiId: 'ravi@okaxis' } });
    expect(p.amount).toBe(1500);
    await svc.rejectPayout(String(tid), String(p._id), 'Wrong UPI ID', { id: '', name: 'Admin' });
    expect((await svc.balanceOf(referrer._id)).available).toBe(1500);

    const pending: any = await svc.createReferral({ referrer, name: 'Uma', phone: '9848055555', via: 'app' });
    await svc.rejectReferral(String(tid), String(pending._id), 'Duplicate enquiry', { id: '', name: 'Admin' });
    const r1: any = await Referral.findById(pending._id).lean();
    expect(r1.status).toBe('rejected');
    expect(r1.activeKey).toBeUndefined();
    // The number is free again for another referrer only while this one is rejected.
    const restored: any = await svc.restoreReferral(String(tid), String(pending._id), { id: '', name: 'Admin' });
    expect(restored.status).toBe('pending');
  });

  it('admin can add a referral for a number that is already a lead', async () => {
    const codeDoc: any = await svc.ensureCode(referrer);
    await db().collection('leads').insertOne({ tenantId: tid, name: 'Walk-in', phone: '9000000099' });
    const ref: any = await svc.adminAddReferral(String(tid), { code: codeDoc.code, name: 'Walk-in', phone: '9000000099' }, { id: '', name: 'Admin' });
    expect(ref.via).toBe('admin');
    const lead: any = await Lead.findOne({ phone: '9000000099' }).lean();
    expect(lead.referral.code).toBe(codeDoc.code);
  });

  it('the sweep is safe to run twice', async () => {
    await svc.sweepReferrals();
    expect(await svc.sweepReferrals()).toBe(0);
  });
});
