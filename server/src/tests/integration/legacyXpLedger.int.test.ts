/**
 * XP from missions, practice, resume and problem delivery reaches the ledger, against a real
 * database — so the history, the weekly and monthly boards and rebuildXpBalance all add up to
 * the balance.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import PassportProgress, { legacyXpLedgerRows, insertLegacyXpRows } from '../../models/PassportProgress';
import { XpLedger } from '../../models/GamificationModels';
import { getOrCreateProgress, addXp, completeMissionOnce } from '../../services/passportXpService';
import { rebuildXpBalance } from '../../services/gamificationEngine';

const TENANT = 'tenant-xp';
const STUDENT = String(new mongoose.Types.ObjectId());
const ledger = () => XpLedger.find({ tenantId: TENANT }).sort({ at: 1, eventKey: 1 }).lean() as Promise<any[]>;

beforeAll(startMongo);
afterAll(stopMongo);
afterEach(clearCollections);

describe('legacy XP in the ledger', () => {
  it('writes one ledger row per award when the progress is saved, and none again on the next save', async () => {
    const p = await getOrCreateProgress(TENANT, STUDENT);
    const now = new Date('2026-10-30T06:00:00Z');
    completeMissionOnce(p, 1, 'read', 10, now);
    completeMissionOnce(p, 1, 'quiz', 10, now);       // same time, same amount: still two rows
    addXp(p, 25, true, now, 'practice');
    addXp(p, 40, true, now, 'resume');
    await p.save();
    await p.save();

    const rows = await ledger();
    expect(rows.map(r => r.eventKey).sort()).toEqual([
      'PASSPORT_MISSION_COMPLETED', 'PASSPORT_MISSION_COMPLETED', 'PRACTICE_PROBLEM_SOLVED', 'RESUME_SCORED',
    ]);
    expect(rows.reduce((t, r) => t + r.amount, 0)).toBe(p.xp);
    expect(await rebuildXpBalance(TENANT, STUDENT)).toBe(85);
  });

  it('gives the same keys every time, so the backfill skips rows the save already wrote', async () => {
    const p = await getOrCreateProgress(TENANT, STUDENT);
    addXp(p, 10, true, new Date('2026-10-29T06:00:00Z'), 'mission');
    await p.save();
    const fresh: any = await PassportProgress.findById(p._id).lean();
    // An engine award in xpLog is not a legacy one and is left to the engine.
    fresh.xpLog.push({ at: new Date(), amount: 50, source: 'CAREER_MISSION_COMPLETED' });
    const rows = legacyXpLedgerRows(fresh);
    expect(rows).toHaveLength(1);
    await insertLegacyXpRows(rows);
    expect(await XpLedger.countDocuments({ tenantId: TENANT })).toBe(1);
  });
});
