/**
 * Load a starter project into Project Studio as a DRAFT (not released to any batch, so no
 * student sees it until an admin reviews, releases and publishes it).
 *
 *   node dist/scripts/seedProjectTemplate.js <tenantId>            # dry run: prints what it would create
 *   node dist/scripts/seedProjectTemplate.js <tenantId> --apply    # writes
 *
 * Skips if the tenant already has a project with the same title, so it is safe to re-run.
 */
import mongoose from 'mongoose';
import { ProjectTemplate } from '../models/ProjectStudio';
import { flattenTasks } from '../services/projectStudioService';
import { clinicAppointmentSystem } from '../seeds/projectStudio/clinicAppointmentSystem';

// Same starters an admin can add from Project Studio → "Add starter project".
const STARTERS = [clinicAppointmentSystem];

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || !mongoose.isValidObjectId(tenantId)) {
    console.error('Usage: seedProjectTemplate <tenantId> [--apply]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  for (const p of STARTERS) {
    const tasks = flattenTasks(p as any);
    const size = `${p.sprints.length} sprints · ${p.sprints.reduce((n, s) => n + s.days.length, 0)} days · ${tasks.length} tasks · weight ${tasks.reduce((n, t) => n + t.weight, 0)}`;
    const exists = await ProjectTemplate.exists({ tenantId, title: p.title });
    if (exists) { console.log(`skip  "${p.title}" — already exists`); continue; }
    if (!apply) { console.log(`would create DRAFT "${p.title}" (${size})`); continue; }
    const t = await ProjectTemplate.create({ ...p, tenantId, status: 'draft', releasedBatchIds: [], createdBy: 'seed', updatedBy: 'seed' });
    console.log(`created DRAFT "${p.title}" (${size}) id=${t._id}`);
  }
  if (!apply) console.log('Dry run — add --apply to write.');
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
