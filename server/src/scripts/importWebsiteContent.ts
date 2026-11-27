/**
 * Load what www.codebegun.com shows today for the Tech Battle page, events, course cards, video
 * testimonials, mentors, home counters and the top bar into Website Content (data/websiteContentSeed.ts).
 * Placements are loaded by importWebsitePlacements.ts — run that first, so testimonials find their companies.
 *
 * Never overwrites what the team typed: the Tech Battle page and top bar only when not set yet,
 * numbers only for a section that has none, events/testimonials/trainers skipped by title or name,
 * a course card only when that course has no website card yet. Pictures are downloaded from the
 * website and re-encoded like uploads. Testimonials are published with consent marked, because these
 * videos are already on the public website — each history line says so. Safe to run again.
 *
 * DRY RUN unless --apply.
 *
 *   npx ts-node src/scripts/importWebsiteContent.ts <tenantSlug> [--apply] [--no-photos]
 *   node dist/scripts/importWebsiteContent.js <tenantSlug> [--apply] [--no-photos]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import {
  WebsiteBattleSettings, WebsiteStat, WebsiteEvent, WebsiteTestimonial, WebsiteTrainer, WebsiteSettings, WebsiteCompany,
} from '../models/WebsiteContent';
import { WebsiteCourse } from '../models/WebsiteBatch';
import { initSettings } from '../services/settingsService';
import { saveImage } from '../services/websiteMediaService';
import { listCourses } from '../services/websiteBatchService';
import {
  SITE_BASE, SEED_BATTLE, SEED_BATTLE_STATS, SEED_HOME_STATS, SEED_TOP_BAR, SEED_EVENTS, SEED_COURSES, SEED_TESTIMONIALS, SEED_TRAINERS,
} from '../data/websiteContentSeed';

const NOTE = 'Imported from www.codebegun.com (as shown on 27 Nov 2026)';
const CONSENT_NOTE = `${NOTE} — already on the public website, consent marked on that basis`;
const hist = (change = NOTE) => [{ at: new Date(), byName: 'Import script', change }];

async function picture(path: string, kind: 'photo' | 'thumb', tenantId: string, on: boolean) {
  if (!on) return undefined;
  try {
    const r = await fetch(`${SITE_BASE}${path}`, { headers: { 'User-Agent': 'Mozilla/5.0 (LMS website-content import)' } });
    if (!r.ok) return undefined;
    return String((await saveImage(tenantId, kind, Buffer.from(await r.arrayBuffer())) as any)._id);
  } catch { return undefined; }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const photos = !args.includes('--no-photos');
  const slug = (args.find((a) => !a.startsWith('--')) || '').toLowerCase();
  if (!slug) { console.error('Usage: importWebsiteContent <tenantSlug> [--apply] [--no-photos]'); process.exit(1); }
  await mongoose.connect(uri);
  await initSettings();
  const tenant: any = await Tenant.findOne({ slug }).select('_id name').lean();
  if (!tenant) { console.error(`No institute with slug "${slug}"`); process.exit(1); }
  const tenantId = String(tenant._id);
  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} for ${tenant.name} (${slug})`);
  const report: string[] = [];

  // Tech Battle page
  if (await WebsiteBattleSettings.exists({ tenantId })) report.push('Tech Battle page: already set, left alone');
  else {
    report.push(`Tech Battle page: ${apply ? 'added' : 'to add'} (eligibility, ${SEED_BATTLE.topics.length} topics, ${SEED_BATTLE.prizes.length} prizes)`);
    if (apply) await WebsiteBattleSettings.create({ tenantId, ...SEED_BATTLE, history: hist() });
  }

  // Numbers (Tech Battle page, home page)
  for (const [section, rows] of [['tech_battle', SEED_BATTLE_STATS], ['home', SEED_HOME_STATS]] as const) {
    if (await WebsiteStat.exists({ tenantId, section })) { report.push(`${section} numbers: already there, left alone`); continue; }
    report.push(`${section} numbers: ${rows.length} ${apply ? 'added' : 'to add'}`);
    if (apply) await WebsiteStat.insertMany(rows.map((r, i) => ({ tenantId, section, ...r, published: true, order: i, history: hist() })));
  }

  // Top bar
  const settings: any = await WebsiteSettings.findOne({ tenantId }).lean();
  if (settings?.topBar?.text) report.push('Top bar: already set, left alone');
  else {
    report.push(`Top bar: ${apply ? 'added' : 'to add'}`);
    if (apply) await WebsiteSettings.updateOne({ tenantId }, { $set: { topBar: SEED_TOP_BAR }, $push: { history: { $each: hist(), $position: 0 } } }, { upsert: true });
  }

  // Events
  let ev = 0;
  for (const [i, e] of SEED_EVENTS.entries()) {
    if (await WebsiteEvent.exists({ tenantId, title: e.title })) continue;
    ev++;
    if (apply) await WebsiteEvent.create({ tenantId, ...e, published: true, order: 1000 + i, history: hist() });
  }
  report.push(`Events: ${ev} ${apply ? 'added' : 'to add'}, ${SEED_EVENTS.length - ev} already there`);

  // Course cards
  await listCourses(tenantId);   // the default course list, the first time
  let cAdded = 0; let cNew = 0;
  for (const [i, c] of SEED_COURSES.entries()) {
    const { key, name, ...site } = c;
    const row: any = await WebsiteCourse.findOne({ tenantId, key }).lean();
    if (row?.site) continue;
    cAdded++;
    if (!row) cNew++;
    if (!apply) continue;
    const doc = { ...site, published: true, tools: [], modules: [], projects: [], timeline: [], faqs: [], history: hist() };
    // The website's card order (only for courses getting their first card, so a team's order is kept).
    if (row) await WebsiteCourse.updateOne({ _id: row._id }, { $set: { site: doc, order: i } });
    else await WebsiteCourse.create({ tenantId, key, name, active: true, order: i, site: doc });
  }
  report.push(`Course cards: ${cAdded} ${apply ? 'added' : 'to add'} (${cNew} new course${cNew === 1 ? '' : 's'} in the list), ${SEED_COURSES.length - cAdded} already had one`);

  // Testimonials
  const companies = new Map((await WebsiteCompany.find({ tenantId }).select('name nameKey').lean() as any[]).map((c) => [c.nameKey, String(c._id)]));
  let tAdded = 0; let tNoCompany = 0;
  for (const [i, t] of SEED_TESTIMONIALS.entries()) {
    if (await WebsiteTestimonial.exists({ tenantId, name: t.name, videoUrl: t.videoUrl })) continue;
    tAdded++;
    const companyId = t.company ? companies.get(t.company.toLowerCase()) : undefined;
    if (t.company && !companyId) tNoCompany++;
    if (!apply) continue;
    await WebsiteTestimonial.create({
      tenantId, name: t.name, thumbId: await picture(t.thumb, 'thumb', tenantId, photos), videoUrl: t.videoUrl, companyId,
      packageLpa: t.packageLpa ?? undefined, label: t.label, consent: true, published: true, order: i, history: hist(CONSENT_NOTE),
    });
  }
  report.push(`Testimonials: ${tAdded} ${apply ? 'added' : 'to add'}${tNoCompany ? ` (${tNoCompany} without a company — run importWebsitePlacements first)` : ''}`);

  // Trainers
  let trAdded = 0;
  for (const [i, t] of SEED_TRAINERS.entries()) {
    if (await WebsiteTrainer.exists({ tenantId, name: t.name })) continue;
    trAdded++;
    if (!apply) continue;
    const { photo, ...rest } = t;
    await WebsiteTrainer.create({ tenantId, ...rest, photoId: await picture(photo, 'photo', tenantId, photos), skills: [], published: true, order: i, history: hist() });
  }
  report.push(`Trainers: ${trAdded} ${apply ? 'added' : 'to add'}`);

  report.forEach((r) => console.log(`  ${r}`));
  if (!apply) console.log('Nothing written. Run again with --apply.');
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
