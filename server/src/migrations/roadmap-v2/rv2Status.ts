/**
 * Roadmap V2 — where a tenant stands. READ-ONLY: run it before and after every step.
 *
 *   production:  node dist/migrations/roadmap-v2/rv2Status.js <tenantId>
 *   locally:     npx ts-node src/migrations/roadmap-v2/rv2Status.ts <tenantId>
 *
 * Prints the tenant's name (to confirm the id), the V2 setting, each year's topic priorities,
 * and how many student roadmaps are V1 and V2 per year.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const STAGES = ['foundation', 'build', 'specialize', 'placement'];

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error('Usage: rv2Status <tenantId>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  /* Some collections hold the tenant as a string, some as an ObjectId: match either. */
  const ids: any[] = [tenantId, new mongoose.Types.ObjectId(tenantId)];

  const tenant = await db.collection('tenants').findOne({ _id: new mongoose.Types.ObjectId(tenantId) }, { projection: { name: 1 } });
  console.log(`Tenant: ${tenant?.name || '(NOT FOUND — check the id)'}`);
  const cfg = await db.collection('passportconfigs').findOne({ tenantId: { $in: ids } }, { projection: { roadmapV2: 1 } });
  console.log(`Roadmap V2 setting: ${cfg?.roadmapV2 ? JSON.stringify(cfg.roadmapV2) : 'not set (OFF)'}`);

  let total = 0;
  console.log('\nTopic priorities:');
  for (const st of STAGES) {
    const c = await db.collection('learningcurriculums').findOne(
      { tenantId: { $in: ids }, adaptiveStage: st, personalizedFor: null }, { projection: { topics: 1 } });
    const topics = (c?.topics || []) as any[];
    total += topics.length;
    const n = (p: string) => topics.filter(t => t.priority === p).length;
    console.log(`  ${st.padEnd(11)} ${String(topics.length).padStart(3)} topics | MUST ${n('MUST')}  SHOULD ${n('SHOULD')}  OPTIONAL ${n('OPTIONAL')}  not set ${topics.filter(t => !t.priority).length}`);
  }
  console.log(`  all years   ${total} topics`);

  const rows = await db.collection('learningcurriculums').aggregate([
    { $match: { tenantId: { $in: ids }, journeyKind: 'FOUNDATION_UNIT_JOURNEY_V1', personalizedFor: { $ne: null } } },
    { $group: { _id: { stage: '$adaptiveStage', v: { $ifNull: ['$roadmapVersion', 'V1'] } }, n: { $sum: 1 } } },
  ]).toArray();
  console.log('\nStudent roadmaps:');
  for (const st of STAGES) {
    const v2 = rows.find(r => r._id.stage === st && r._id.v === 'ROADMAP_V2')?.n || 0;
    const v1 = rows.filter(r => r._id.stage === st && r._id.v !== 'ROADMAP_V2').reduce((s, r) => s + r.n, 0);
    console.log(`  ${st.padEnd(11)} V1 ${v1}  V2 ${v2}`);
  }
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('FAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
