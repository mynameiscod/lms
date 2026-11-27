/**
 * XP → coins, against a real database: whole coins only, leftovers carried, converted XP spent but the level kept,
 * the monthly cap respected, and two clicks at once paying once.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import { XpLedger } from '../../models/GamificationModels';
import { CoinConfig, CoinLedger, CoinAccount } from '../../models/CoinModels';
import { invalidateCoinCache } from '../../services/coinService';
import PassportProgress from '../../models/PassportProgress';
import { levelFromXp } from '../../services/passportGamificationService';
import { conversionStatus, convertXp, spendConvertedXp, XP_CONVERSION_EVENT, XP_SPENT_EVENT } from '../../services/xpConversionService';

const TENANT = 'tenant-convert';
const STUDENT = String(new mongoose.Types.ObjectId());
const START = new Date('2026-10-01T00:00:00Z');

let seq = 0;
// Earning XP moves the ledger and the balance together, as the gamification engine does.
const earn = async (amount: number, at = new Date(), sourceType = 'test') => {
  await XpLedger.create({
    tenantId: TENANT, studentId: new mongoose.Types.ObjectId(STUDENT), eventKey: 'TEST', sourceType,
    sourceId: String(++seq), idempotencyKey: `t:${seq}`, amount, at,
  });
  await PassportProgress.updateOne({ tenantId: TENANT, studentId: new mongoose.Types.ObjectId(STUDENT) }, { $inc: { xp: amount } }, { upsert: true });
};
const progress = () => PassportProgress.findOne({ tenantId: TENANT }).lean() as any;

const configure = async (patch: Record<string, any> = {}) => {
  await CoinConfig.findOneAndUpdate({ tenantId: TENANT }, {
    $set: { enabled: true, xpConversionEnabled: true, xpPerCoin: 100, xpConversionStartsAt: START, monthlyEarnCap: 0, expiryMonths: 0, ...patch },
  }, { upsert: true });
  invalidateCoinCache(TENANT);
};

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(async () => { await clearCollections(); invalidateCoinCache(TENANT); });

describe('converting XP into coins', () => {
  it('is refused while switched off', async () => {
    await configure({ xpConversionEnabled: false });
    await earn(500);
    const r = await convertXp(TENANT, STUDENT);
    expect(r.ok).toBe(false);
    expect(r.refused).toBe('disabled');
  });

  it('counts only XP earned since conversion started, and not a backfill', async () => {
    await configure();
    await earn(900, new Date('2026-09-15T00:00:00Z'));           // before the start
    await earn(300, new Date('2026-10-02T00:00:00Z'), 'backfill');
    await earn(250);
    const s = await conversionStatus(TENANT, STUDENT);
    expect(s.earnedXp).toBe(250);
    expect(s.coinsAvailable).toBe(2);
    expect(s.xpToNextCoin).toBe(50);
  });

  it('pays whole coins and carries the rest', async () => {
    await configure();
    await earn(250);
    const r = await convertXp(TENANT, STUDENT);
    expect(r).toMatchObject({ ok: true, coins: 2, xpUsed: 200, balance: 2 });
    expect(r.status.availableXp).toBe(50);

    // Nothing more to convert until another 50 XP arrives.
    expect((await convertXp(TENANT, STUDENT)).refused).toBe('nothing_to_convert');
    await earn(60);
    const again = await convertXp(TENANT, STUDENT);
    expect(again).toMatchObject({ ok: true, coins: 1, balance: 3 });
    expect(again.status.availableXp).toBe(10);

    const rows = await CoinLedger.find({ tenantId: TENANT, eventKey: XP_CONVERSION_EVENT }).lean();
    expect(rows.map(r => r.coins).sort()).toEqual([1, 2]);
    const acct: any = await CoinAccount.findOne({ tenantId: TENANT }).lean();
    expect(acct).toMatchObject({ balance: 3, lifetimeEarned: 3, xpConverted: 300 });
  });

  it('converts only what was asked for', async () => {
    await configure();
    await earn(1000);
    const r = await convertXp(TENANT, STUDENT, 3);
    expect(r).toMatchObject({ ok: true, coins: 3, xpUsed: 300 });
    expect(r.status.coinsAvailable).toBe(7);
  });

  it('stops at the monthly cap and keeps the XP for later', async () => {
    await configure({ monthlyEarnCap: 4 });
    await earn(1000);
    const r = await convertXp(TENANT, STUDENT);
    expect(r).toMatchObject({ ok: true, coins: 4, xpUsed: 400 });
    expect(r.status.availableXp).toBe(600);
    expect((await convertXp(TENANT, STUDENT)).refused).toBe('earn_cap');
  });

  it('pays once when two conversions arrive together', async () => {
    await configure();
    await earn(500);
    const [a, b] = await Promise.all([convertXp(TENANT, STUDENT), convertXp(TENANT, STUDENT)]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const acct: any = await CoinAccount.findOne({ tenantId: TENANT }).lean();
    expect(acct).toMatchObject({ balance: 5, xpConverted: 500 });
    expect(await CoinLedger.countDocuments({ tenantId: TENANT })).toBe(1);
  });

  it('uses the new rate for XP converted after a change', async () => {
    await configure();
    await earn(500);
    await convertXp(TENANT, STUDENT, 2);                     // 200 XP → 2 coins
    await configure({ xpPerCoin: 50 });
    const r = await convertXp(TENANT, STUDENT);              // 300 XP left → 6 coins
    expect(r).toMatchObject({ ok: true, coins: 6, xpUsed: 300, balance: 8 });
  });

  it('takes converted XP off the balance, keeps the level, and the ledger still adds up', async () => {
    await configure();
    await earn(1200);
    const before = levelFromXp(1200);
    await convertXp(TENANT, STUDENT, 5);                     // 500 XP → 5 coins
    const p = await progress();
    expect(p).toMatchObject({ xp: 700, xpSpent: 500 });
    const lv = levelFromXp(p.xp, undefined, p.xpSpent);
    expect(lv.xp).toBe(700);                                  // the XP shown drops
    expect(lv.level).toBe(before.level);                      // the level does not
    expect(lv.xpToNextLevel).toBe(before.xpToNextLevel);

    const spent: any = await XpLedger.findOne({ tenantId: TENANT, eventKey: XP_SPENT_EVENT }).lean();
    expect(spent.amount).toBe(-500);
    const [sum] = await XpLedger.aggregate([{ $match: { tenantId: TENANT } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
    expect(sum.t).toBe(700);

    // Spending only reduces what is left: the allowance still converts the other 700.
    expect((await conversionStatus(TENANT, STUDENT)).coinsAvailable).toBe(7);
  });

  it('records the XP of a conversion once, however often it is replayed (the backfill path)', async () => {
    await configure();
    await earn(500);
    expect(await spendConvertedXp(TENANT, STUDENT, 0, 300)).toBe(true);
    expect(await spendConvertedXp(TENANT, STUDENT, 0, 300)).toBe(false);
    expect(await progress()).toMatchObject({ xp: 200, xpSpent: 300 });
  });

  it('never takes the balance below zero', async () => {
    await configure();
    await earn(100);
    await spendConvertedXp(TENANT, STUDENT, 0, 300);
    expect(await progress()).toMatchObject({ xp: 0, xpSpent: 100 });
  });
});
