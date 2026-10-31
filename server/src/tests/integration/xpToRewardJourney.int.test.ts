/**
 * The whole loop, against a real database: a member earns XP, converts it into coins, redeems a
 * reward, and an admin fulfils it — then a second redemption is cancelled and the coins come back.
 * XP, level and rank never move along the way.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import User from '../../models/User';
import PassportProgress from '../../models/PassportProgress';
import { CoinConfig, CoinAccount } from '../../models/CoinModels';
import { GamificationConfig } from '../../models/GamificationModels';
import { RewardDefinition, RewardRedemption } from '../../models/RewardModels';
import { invalidateCoinCache } from '../../services/coinService';
import { processGamificationEvent } from '../../services/gamificationEngine';
import { convertXp } from '../../services/xpConversionService';
import { redeemReward, fulfillRedemption, cancelRedemption } from '../../services/rewardRedemptionService';

const TENANT = String(new mongoose.Types.ObjectId());
const ADMIN = String(new mongoose.Types.ObjectId());
const balance = async (studentId: string) => ((await CoinAccount.findOne({ tenantId: TENANT, studentId }).lean()) as any)?.balance;
const xp = async (studentId: string) => ((await PassportProgress.findOne({ tenantId: TENANT, studentId }).lean()) as any)?.xp;

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(async () => { await clearCollections(); invalidateCoinCache(TENANT); });

it('earn XP → convert → redeem → fulfil, and cancel refunds', async () => {
  const past = new Date(Date.now() - 86400000);
  const user = await User.create({
    email: `loop${Date.now()}@example.com`, firstName: 'Asha', lastName: 'R', password: 'x'.repeat(20),
    role: 'STUDENT', tenantId: TENANT, isActive: true, passport: { active: true, product: 'career_passport', onboarded: true },
  });
  const sid = String(user._id);

  await CoinConfig.create({
    tenantId: TENANT, enabled: true, minRedemption: 0, monthlyEarnCap: 0, expiryMonths: 0,
    annualRealCostBudgetInr: 1000, xpConversionEnabled: true, xpPerCoin: 10, xpConversionStartsAt: past,
  });
  await GamificationConfig.create({
    tenantId: TENANT, reward: { enabled: true, mode: 'MANUAL', manualBudgetPaise: 100000, effectiveFrom: past },
  });
  invalidateCoinCache(TENANT);

  // Earned through the real engine: an assessment (100) and a mock interview (60).
  await processGamificationEvent({ tenantId: TENANT, studentId: sid, eventKey: 'PERSONALIZED_ASSESSMENT_COMPLETED', sourceType: 'assessment', sourceId: 'a1' });
  await processGamificationEvent({ tenantId: TENANT, studentId: sid, eventKey: 'MOCK_INTERVIEW_COMPLETED', sourceType: 'interview', sourceId: 'i1' });
  expect(await xp(sid)).toBe(160);

  const conv = await convertXp(TENANT, sid);
  expect(conv).toMatchObject({ ok: true, coins: 16, xpUsed: 160, balance: 16 });
  expect(await xp(sid)).toBe(160);                         // XP untouched

  await RewardDefinition.create({
    tenantId: TENANT, key: 'CODEBEGUN_TSHIRT', name: 'CodeBegun T-shirt', type: 'PHYSICAL',
    coinCost: 5, budgetCostPaise: 5000, active: true, studentVisible: true, perStudentLimit: 2,
  });

  // Redeem and fulfil.
  const first = await redeemReward({ tenantId: TENANT, studentId: sid, rewardKey: 'CODEBEGUN_TSHIRT', intentToken: 'one' });
  expect(first.ok).toBe(true);
  expect(await balance(sid)).toBe(11);
  const firstId = String((first as any).redemption._id);
  const done = await fulfillRedemption({ tenantId: TENANT, redemptionId: firstId, adminId: ADMIN, fulfillmentReference: 'DTDC-123' });
  expect(done.ok).toBe(true);
  expect((await RewardRedemption.findById(firstId).lean() as any)).toMatchObject({ status: 'FULFILLED', fulfillmentReference: 'DTDC-123' });

  // A second fulfil of the same one is refused, not repeated.
  expect((await fulfillRedemption({ tenantId: TENANT, redemptionId: firstId, adminId: ADMIN })).ok).toBe(false);

  // Redeem again and cancel: the coins come back.
  const second = await redeemReward({ tenantId: TENANT, studentId: sid, rewardKey: 'CODEBEGUN_TSHIRT', intentToken: 'two' });
  expect(second.ok).toBe(true);
  expect(await balance(sid)).toBe(6);
  const cancelled = await cancelRedemption({ tenantId: TENANT, redemptionId: String((second as any).redemption._id), adminId: ADMIN, reason: 'Out of stock' });
  expect(cancelled.ok).toBe(true);
  expect(await balance(sid)).toBe(11);

  // The per-member limit counts the fulfilled one only, so a third is still allowed.
  const third = await redeemReward({ tenantId: TENANT, studentId: sid, rewardKey: 'CODEBEGUN_TSHIRT', intentToken: 'three' });
  expect(third.ok).toBe(true);
  expect(await xp(sid)).toBe(160);
});
