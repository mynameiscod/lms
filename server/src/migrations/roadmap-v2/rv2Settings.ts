/**
 * Roadmap V2 — switch it, the same as Admin → CareerPilot Roadmap V2 → Settings.
 *
 *   node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> pilot <userId1,userId2>   V2 for these students only
 *   node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> on                         V2 for every student
 *   node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> v2only                     V2 only: V1 never used again
 *   node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> off                        back to V1 for new roadmaps
 *
 * Daily minutes and revision days are kept as they are (set them on the admin screen). Prints
 * the setting before and after. Takes effect at once: no restart needed.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolveRoadmapV2, RoadmapV2Config } from '../../data/roadmapV2Policy';
dotenv.config();

const MODES = ['pilot', 'on', 'v2only', 'off'];

async function run(): Promise<void> {
  const [tenantId, mode, list] = process.argv.slice(2);
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId) || !MODES.includes(mode)) {
    console.error('Usage: rv2Settings <tenantId> pilot <ids>|on|v2only|off');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const col = mongoose.connection.db!.collection('passportconfigs');
  const cfg = await col.findOne({ tenantId: { $in: [tenantId, new mongoose.Types.ObjectId(tenantId)] as any[] } });
  if (!cfg) throw new Error('This tenant has no CareerPilot config.');

  const before = resolveRoadmapV2(cfg.roadmapV2);
  const next: RoadmapV2Config = { ...before };
  if (mode === 'pilot') {
    next.studentIds = String(list || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!next.studentIds.length) throw new Error('Give the pilot students\' user ids, comma separated.');
    next.enabled = false; next.v2Only = false;
  }
  if (mode === 'on') { next.enabled = true; next.v2Only = false; }
  if (mode === 'v2only') { next.enabled = true; next.v2Only = true; }
  if (mode === 'off') { next.enabled = false; next.v2Only = false; next.stages = []; }

  await col.updateOne({ _id: cfg._id }, { $set: { roadmapV2: next } });
  console.log(`Before: ${JSON.stringify(before)}`);
  console.log(`After:  ${JSON.stringify(next)}`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('FAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
