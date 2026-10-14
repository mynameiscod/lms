/**
 * Create the shipped career tracks and skill packs (careerTrackDefinitions.ts) on a tenant.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedCareerTracks.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedCareerTracks.ts <tenantId> --apply
 *   npx ts-node src/seeds/careerPilot/seedCareerTracks.ts <tenantId> --apply --overwrite
 *   production: node dist/seeds/careerPilot/seedCareerTracks.js <tenantId> --apply
 *
 * A pack or track that does not exist is created. One that exists is LEFT AS IT IS — an admin may
 * have edited it on the Career Tracks screen — and reported; --overwrite replaces it with the
 * definition. A track's pack lists are extended with packs it does not yet name, even without
 * --overwrite, so a new batch's packs reach the track without undoing the admin's order.
 *
 * Tracks are created DRAFT. A topic a pack names that no curriculum holds is reported: it teaches
 * nothing until its content is imported.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CareerTrack from '../../models/CareerTrack';
import SkillPack from '../../models/SkillPack';
import LearningCurriculum from '../../models/LearningCurriculum';
import { PACKS, TRACKS } from './careerTrackDefinitions';
dotenv.config();

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');
  if (!tenantId) { console.error('Usage: seedCareerTracks <tenantId> [--apply] [--overwrite]'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const curricula = await LearningCurriculum.find({ tenantId, personalizedFor: null }).select('topics.topicCode topics.title').lean() as any[];
  const titleOf = new Map<string, string>();
  for (const c of curricula) for (const t of c.topics || []) if (t.topicCode && !titleOf.has(t.topicCode)) titleOf.set(t.topicCode, t.title);

  console.log(`\nCAREER TRACKS — tenant ${tenantId} — ${apply ? (overwrite ? 'APPLY, OVERWRITE' : 'APPLY') : 'DRY RUN'}\n`);
  for (const p of PACKS) {
    const missing = p.topics.filter(([code]) => !titleOf.has(code)).map(([code]) => code);
    const exists = await SkillPack.exists({ tenantId, key: p.key });
    const action = !exists ? 'create' : overwrite ? 'overwrite' : 'keep (exists)';
    console.log(`  pack  ${p.key.padEnd(16)} ${String(p.topics.length).padStart(2)} topics  ${action}${missing.length ? `  — not imported yet: ${missing.join(', ')}` : ''}`);
    if (apply && (!exists || overwrite)) {
      await SkillPack.updateOne({ tenantId, key: p.key }, {
        $set: { title: p.title, kind: p.kind, description: p.description,
          topics: p.topics.map(([topicCode, priority]) => ({ topicCode, priority, title: titleOf.get(topicCode) })), updatedBy: 'career-track-seed' },
        $setOnInsert: { tenantId, key: p.key, createdBy: 'career-track-seed' },
      }, { upsert: true });
    }
  }
  for (const t of TRACKS) {
    const current = await CareerTrack.findOne({ tenantId, key: t.key }).lean() as any;
    if (!current || overwrite) {
      console.log(`  track ${t.key.padEnd(16)} ${current ? 'overwrite' : 'create (DRAFT)'}  Year 3: ${t.specializePacks.join(', ')}  Year 4: ${t.placementPacks.join(', ') || '—'}`);
      if (apply) {
        await CareerTrack.updateOne({ tenantId, key: t.key }, {
          $set: { name: t.name, language: t.language, description: t.description, order: t.order,
            specializePacks: t.specializePacks, placementPacks: t.placementPacks, updatedBy: 'career-track-seed' },
          $setOnInsert: { tenantId, key: t.key, status: 'DRAFT', createdBy: 'career-track-seed' },
        }, { upsert: true });
      }
    } else {
      const addS = t.specializePacks.filter(k => !(current.specializePacks || []).includes(k));
      const addP = t.placementPacks.filter(k => !(current.placementPacks || []).includes(k));
      console.log(`  track ${t.key.padEnd(16)} exists (${current.status})${addS.length || addP.length ? `  — adding packs: ${[...addS, ...addP].join(', ')}` : '  — nothing to add'}`);
      if (apply && (addS.length || addP.length)) {
        await CareerTrack.updateOne({ _id: current._id }, { $push: { specializePacks: { $each: addS }, placementPacks: { $each: addP } } });
      }
    }
  }
  console.log(apply ? '\nWritten.' : '\nDry run — re-run with --apply to write.');
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('FAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
