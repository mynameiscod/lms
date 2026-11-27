/**
 * Load the placed students and companies www.codebegun.com shows today into Website Content, so the
 * team starts from what the website already has instead of typing 30 cards again.
 *
 * WHAT IT DOES. Adds each company (skipped when one of that name exists) and each student card
 * (skipped when a card with that name at that company exists), in the website's order. Each photo is
 * downloaded from the website and re-encoded like an upload; a photo that cannot be fetched leaves
 * the card without one (the team can upload it). Cards are published with consent marked, because
 * these students are already on the public website — the history line says so, so the team can
 * review. Placement numbers are NOT added: the team types those. Safe to run again.
 *
 * DRY RUN unless --apply.
 *
 *   npx ts-node src/scripts/importWebsitePlacements.ts <tenantSlug> [--apply] [--no-photos]
 *   node dist/scripts/importWebsitePlacements.js <tenantSlug> [--apply] [--no-photos]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import { WebsiteCompany, WebsitePlacement } from '../models/WebsiteContent';
import { initSettings } from '../services/settingsService';
import { saveImage } from '../services/websiteMediaService';
import { SEED_COMPANIES, SEED_STUDENTS, WEBSITE_PHOTO_BASE } from '../data/websitePlacementsSeed';

const NOTE = 'Imported from www.codebegun.com (already shown on the public website, 27 Nov 2026) — consent marked on that basis';
const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

async function fetchPhoto(path: string): Promise<Buffer | null> {
  try {
    const r = await fetch(`${WEBSITE_PHOTO_BASE}${path}`, { headers: { 'User-Agent': 'Mozilla/5.0 (LMS website-content import)' } });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const photos = !args.includes('--no-photos');
  const slug = (args.find((a) => !a.startsWith('--')) || '').toLowerCase();
  if (!slug) { console.error('Usage: importWebsitePlacements <tenantSlug> [--apply] [--no-photos]'); process.exit(1); }

  await mongoose.connect(uri);
  await initSettings();   // Bunny storage settings, so photos land where uploads do
  const tenant: any = await Tenant.findOne({ slug }).select('_id name').lean();
  if (!tenant) { console.error(`No institute with slug "${slug}"`); process.exit(1); }
  const tenantId = String(tenant._id);
  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} for ${tenant.name} (${slug})${photos ? '' : ', without photos'}`);

  const actor = { at: new Date(), byName: 'Import script', change: NOTE };
  const existingCo = new Map((await WebsiteCompany.find({ tenantId }).select('nameKey order').lean() as any[]).map((c) => [c.nameKey, c]));
  let coOrder = Math.max(-1, ...[...existingCo.values()].map((c: any) => c.order ?? 0)) + 1;
  let coAdded = 0;
  const companyId = new Map<string, string>();
  for (const [k, c] of existingCo) companyId.set(k, String((c as any)._id));
  for (const c of SEED_COMPANIES) {
    const k = keyOf(c.name);
    if (existingCo.has(k)) continue;
    coAdded++;
    if (!apply) continue;
    const doc: any = await WebsiteCompany.create({
      tenantId, name: c.name, nameKey: k, type: c.type, domain: c.domain, showInStrip: true, published: true, order: coOrder++, history: [actor],
    });
    companyId.set(k, String(doc._id));
  }

  const lastCard: any = await WebsitePlacement.findOne({ tenantId }).sort({ order: -1 }).select('order').lean();
  let order = (lastCard?.order ?? -1) + 1;
  let added = 0; let skipped = 0; let noPhoto = 0;
  for (const s of SEED_STUDENTS) {
    const cid = companyId.get(keyOf(s.company));
    if (apply && cid && await WebsitePlacement.exists({ tenantId, name: s.name, companyId: cid })) { skipped++; continue; }
    if (!apply) {
      if (cid && await WebsitePlacement.exists({ tenantId, name: s.name, companyId: cid })) skipped++; else added++;
      continue;
    }
    let photoId: string | undefined;
    if (photos) {
      const buf = await fetchPhoto(s.image);
      if (buf) {
        try { photoId = String((await saveImage(tenantId, 'photo', buf) as any)._id); }
        catch (e: any) { console.warn(`  photo for ${s.name} could not be used: ${e.message}`); }
      }
      if (!photoId) noPhoto++;
    }
    await WebsitePlacement.create({
      tenantId, name: s.name, photoId, role: s.role, companyId: cid, packageLpa: s.packageLpa, quote: s.quote,
      consent: true, published: true, order: order++, history: [actor],
    });
    added++;
  }

  console.log(`Companies: ${coAdded} ${apply ? 'added' : 'to add'}, ${SEED_COMPANIES.length - coAdded} already there.`);
  console.log(`Students:  ${added} ${apply ? 'added' : 'to add'}, ${skipped} already there${apply && photos ? `, ${noPhoto} without a photo` : ''}.`);
  if (!apply) console.log('Nothing written. Run again with --apply.');
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
