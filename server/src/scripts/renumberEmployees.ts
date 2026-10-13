/**
 * Renumber an institute's employees 0001, 0002, 0003 ... in the order they were added, and set
 * the next id to follow on. For tidying up after test entries or failed attempts used numbers.
 *
 * It changes only the employee id shown on each profile (and the counter). Nothing else about an
 * employee is touched, and no other record refers to the id, so it is safe to run on a live
 * system. Ids are changed in two passes so two employees never hold the same id, even briefly.
 *
 *   node dist/scripts/renumberEmployees.js <tenantId>            dry run: shows the old and new ids
 *   node dist/scripts/renumberEmployees.js <tenantId> --apply    renumber
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import EmployeeConfig from '../models/EmployeeConfig';

dotenv.config();

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || !mongoose.isValidObjectId(tenantId)) {
    console.error('Usage: renumberEmployees.js <tenantId> [--apply]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const tid = new mongoose.Types.ObjectId(tenantId);
  const cfg: any = await EmployeeConfig.findOne({ tenantId: tid }).lean();
  const prefix = cfg?.codePrefix || 'EMP';
  const people: any[] = await Employee.find({ tenantId: tid }).select('employeeCode firstName lastName createdAt').sort({ createdAt: 1, _id: 1 }).lean();

  console.log(`\nRENUMBER EMPLOYEES  ·  tenant ${tenantId}  ·  prefix ${prefix}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');
  const plan = people.map((p, i) => ({ id: p._id, name: [p.firstName, p.lastName].filter(Boolean).join(' '), from: p.employeeCode, to: `${prefix}-${String(i + 1).padStart(4, '0')}` }));
  for (const x of plan) console.log(`  ${x.from.padEnd(12)} → ${x.to.padEnd(12)} ${x.name}${x.from === x.to ? '  (unchanged)' : ''}`);
  console.log(`\n  next new employee will be ${prefix}-${String(plan.length + 1).padStart(4, '0')}`);

  if (apply) {
    // Pass 1: park every id on a temporary value, so pass 2 can never collide with an old id.
    for (const x of plan) await Employee.updateOne({ _id: x.id }, { $set: { employeeCode: `TMP-${String(x.id)}` } });
    for (const x of plan) await Employee.updateOne({ _id: x.id }, { $set: { employeeCode: x.to } });
    await EmployeeConfig.updateOne({ tenantId: tid }, { $set: { codeCounter: plan.length } }, { upsert: true });
    console.log('\nDone.');
  }
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('ERR', e?.message || e);
  try { await mongoose.disconnect(); } catch { /* closing */ }
  process.exit(1);
});
