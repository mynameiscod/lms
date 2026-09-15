/**
 * Every tenant on this database, and whether it can serve the CareerPilot Foundation product.
 *
 * READ ONLY. The first thing to run on a machine you have not set up yourself: tenant ids are
 * generated when a tenant is created, so the id another machine used is never this one's.
 *
 *   npx ts-node src/scripts/listCareerPilotTenants.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { foundationReadiness } from '../services/foundationReadinessService';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenants = await db.collection('tenants').find({}).sort({ createdAt: 1 }).toArray();

  console.log(`\nCAREERPILOT TENANTS  ·  database ${db.databaseName}  ·  ${tenants.length} tenant(s)\n`);
  for (const t of tenants) {
    const id = String(t._id);
    const TID = { $in: [id, t._id] };
    const configs = await db.collection('passportconfigs').find({ tenantId: TID }).toArray();
    const [readiness, units, bank, students, journeys, lastRun] = await Promise.all([
      foundationReadiness(id),
      db.collection('curriculumlearningunits').countDocuments({ tenantId: TID }),
      db.collection('assessmentitems').countDocuments({ tenantId: TID }),
      db.collection('users').countDocuments({ tenantId: TID, role: 'STUDENT' }),
      db.collection('learningcurriculums').countDocuments({ tenantId: TID, journeyKind: { $exists: true, $ne: null } }),
      db.collection('careerpilotprovisioningruns').find({ tenantId: id }).sort({ startedAt: -1 }).limit(1).next(),
    ]);
    console.log(`  ${t.name || '(no name)'}  ·  slug ${t.slug || '-'}`);
    console.log(`    tenant id              ${id}`);
    console.log(`    CareerPilot sign-up    ${configs.some(c => c.enabled) ? 'on' : 'off'}`);
    console.log(`    Foundation product     ${readiness.configured ? 'CONFIGURED' : `NOT CONFIGURED — ${readiness.reason}`}`);
    console.log(`    curriculum units       ${units} (published ${readiness.publishedUnits}; certified: 355, published 338)`);
    console.log(`    skill-check questions  ${bank} (skill mappings ${readiness.skillCheckMappings})`);
    console.log(`    last provisioning      ${lastRun ? `${lastRun.result} at ${new Date(lastRun.finishedAt).toISOString()}` : 'never'}`);
    console.log(`    students               ${students}  ·  Foundation journeys ${journeys}\n`);
  }
  await mongoose.disconnect();
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch { /* closing */ } process.exit(1); });
