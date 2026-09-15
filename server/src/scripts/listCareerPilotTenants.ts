/**
 * Every tenant on this database, and how far its CareerPilot Foundation setup has got.
 *
 * READ ONLY. The first thing to run on a machine you have not set up yourself: tenant ids are
 * generated when a tenant is created, so the id another machine used is never this one's.
 *
 *   npx ts-node src/scripts/listCareerPilotTenants.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { engineActivationState } from '../data/curriculumEnginePolicy';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenants = await db.collection('tenants').find({}).sort({ createdAt: 1 }).toArray();

  console.log(`\nCAREERPILOT TENANTS  ·  database ${db.databaseName}  ·  ${tenants.length} tenant(s)\n`);
  for (const t of tenants) {
    const id = String(t._id);
    const TID = { $in: [id, t._id] };
    const configs = await db.collection('passportconfigs').find({ tenantId: TID }).toArray();
    const [units, published, bank, students, journeys] = await Promise.all([
      db.collection('curriculumlearningunits').countDocuments({ tenantId: TID }),
      db.collection('curriculumlearningunits').countDocuments({ tenantId: TID, status: 'PUBLISHED' }),
      db.collection('assessmentitems').countDocuments({ tenantId: TID }),
      db.collection('users').countDocuments({ tenantId: TID, role: 'STUDENT' }),
      db.collection('learningcurriculums').countDocuments({ tenantId: TID, journeyKind: { $exists: true, $ne: null } }),
    ]);
    console.log(`  ${t.name || '(no name)'}  ·  slug ${t.slug || '-'}`);
    console.log(`    tenant id              ${id}`);
    console.log(`    CareerPilot sign-up    ${configs.some(c => c.enabled) ? 'on' : 'off'}`);
    console.log(`    unit engine            ${engineActivationState(configs as any[])}`);
    console.log(`    curriculum units       ${units} (published ${published}; certified setup: 355, published 338)`);
    console.log(`    skill-check questions  ${bank}`);
    console.log(`    students               ${students}  ·  Foundation journeys ${journeys}\n`);
  }
  await mongoose.disconnect();
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch { /* closing */ } process.exit(1); });
