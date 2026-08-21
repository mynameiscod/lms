/**
 * Mirror Bunny's encode status onto our content records, and name what failed.
 *
 * Run in production (inside the container, against the compiled build):
 *   docker exec lms-server-<slot> node dist/scripts/refreshBunnyVideoStatus.js <tenantId>
 *
 * Safe to run repeatedly: it only writes when a status has changed. Read-only against
 * Bunny — nothing is re-encoded, deleted or re-uploaded.
 *
 * Worth running on a schedule. Eight recordings had failed silently before anyone noticed,
 * and the only reason anyone did was a student asking why a video would not start.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { refreshBunnyVideoStatuses } from '../services/bunnyVideoStatusService';

dotenv.config();

async function main() {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: refreshBunnyVideoStatus.js <tenantId>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  try {
    const r = await refreshBunnyVideoStatuses(tenantId);

    console.log('');
    if (r.error) {
      console.error(`❌ ${r.error}`);
      process.exitCode = 1;
      return;
    }

    console.log(`=== Bunny status sweep (library ${r.libraryId}) ===`);
    console.log(`  videos in library : ${r.scanned}`);
    console.log(`  records updated   : ${r.updated}`);
    console.log(`  still processing  : ${r.pending}`);
    console.log(`  FAILED            : ${r.failed.length}`);

    if (r.failed.length) {
      console.log('');
      console.log('  These will never play and must be uploaded again:');
      for (const f of r.failed) {
        console.log(`    ${f.guid}  stalled at ${f.encodeProgress}%  ${f.title}`);
      }
    }
    console.log('');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
