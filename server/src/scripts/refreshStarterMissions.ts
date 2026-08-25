/**
 * Push the starter-mission copy and links in DEFAULT_MISSION_POOLS out to tenants that
 * already have a PassportContent row.
 *
 * Why this exists: `ensureContent()` seeds the defaults ONLY when a tenant has no content
 * document. Every tenant that has ever loaded CareerPilot already has one, so editing
 * DEFAULT_MISSION_POOLS in the source reaches new tenants and nobody else. Without this the
 * whole point of the change — missions that deep-link to the sitting they describe, and
 * copy that says what the member is actually meant to do — lands only in git.
 *
 * What it fixes, per mission:
 *   - "Record a self-introduction" pointed at a bare /careerpilot/interview, which opened
 *     the landing page whose only button ran a generic six-question role interview. It now
 *     carries ?mode=intro, which auto-starts a short round pinned to the self-intro.
 *   - The resume missions all pointed at the top of a seven-section page. They now carry
 *     ?focus=, which both scrolls the member to the right section AND tells the server
 *     which section to check when the mission is ticked.
 *   - Copy rewritten to name what to do and what counts as done.
 *
 * Idempotent, matched on (pool category, mission title). Only the fields listed in UPDATES
 * are touched, so an admin's own edits to anything else survive. A tenant that has renamed
 * or deleted one of these missions is skipped for that mission rather than having it
 * re-added — the admin's decision wins.
 *
 * Run:  npx ts-node src/scripts/refreshStarterMissions.ts          (all tenants)
 *       npx ts-node src/scripts/refreshStarterMissions.ts <id>     (one tenant)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportContent from '../models/PassportContent';

dotenv.config();

interface Update { category: string; title: string; detail: string; link?: string }

const UPDATES: Update[] = [
  {
    category: 'communication', title: 'Record a self-introduction',
    detail: 'Opens a short 2-question intro round. Say who you are, what you are studying, and the role you want — out loud, in full sentences. You get scored feedback at the end.',
    link: '/careerpilot/interview?mode=intro',
  },
  {
    category: 'communication', title: 'Explain a concept',
    detail: 'Opens a short round. Explain "what is a database" in about 5 plain sentences, as if to someone non-technical.',
    link: '/careerpilot/interview?mode=intro',
  },
  {
    category: 'employability', title: 'Resume kickoff',
    detail: 'In the Resume Center fill three things: contact details (name, email, phone), one education entry, and 3 skills. That is the minimum for your ATS score to run.',
    link: '/careerpilot/resume',
  },
  {
    category: 'employability', title: 'Add a project',
    detail: 'In the Resume Center, add one project: its name, the tech you used, and 2 lines on what it does and what you built yourself.',
    link: '/careerpilot/resume?focus=projects',
  },
  {
    category: 'employability', title: 'LinkedIn headline',
    detail: 'Write a 1-line headline for your target role and save it as your title in the Resume Center, then copy it onto LinkedIn.',
    link: '/careerpilot/resume?focus=title',
  },
  {
    category: 'employability', title: 'Mock interview round',
    detail: 'Opens a full 6-question round for your target role. Answer as if it were real, then read the scored feedback at the end.',
    link: '/careerpilot/interview?mode=role',
  },
];

async function run() {
  const only = process.argv[2];
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI as string);

  const docs = await PassportContent.find(only ? { tenantId: only } : {});
  if (!docs.length) {
    console.log(only ? `No CareerPilot content for tenant ${only}.` : 'No CareerPilot content rows found.');
    await mongoose.disconnect();
    return;
  }

  let tenantsChanged = 0;
  let missionsChanged = 0;
  const notFound = new Map<string, number>();

  for (const doc of docs as any[]) {
    let touched = 0;
    for (const u of UPDATES) {
      const pool = (doc.missionPools || []).find((p: any) => p.category === u.category);
      const item = pool && (pool.items || []).find((i: any) => i.title === u.title);
      if (!item) {
        notFound.set(u.title, (notFound.get(u.title) || 0) + 1);
        continue;
      }
      if (item.detail === u.detail && item.link === u.link) continue;
      item.detail = u.detail;
      item.link = u.link;
      touched += 1;
    }
    if (touched) {
      doc.markModified('missionPools');
      await doc.save();
      tenantsChanged += 1;
      missionsChanged += touched;
      console.log(`  ${doc.tenantId} — ${touched} mission${touched === 1 ? '' : 's'} updated`);
    }
  }

  console.log(`\nDone. ${missionsChanged} missions updated across ${tenantsChanged} of ${docs.length} tenant(s).`);
  // Reported rather than swallowed: a mission missing everywhere means it was renamed and
  // this script is now a no-op for it, which is worth knowing before assuming it shipped.
  for (const [title, n] of notFound) {
    console.log(`  note: "${title}" not present in ${n} tenant(s) — renamed or removed, left alone.`);
  }

  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
