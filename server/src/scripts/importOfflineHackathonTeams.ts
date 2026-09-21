/**
 * Import offline-registered teams from a spreadsheet into their own hackathon.
 *
 *   npx ts-node src/scripts/importOfflineHackathonTeams.ts <tenantId> <file.xlsx|csv> \
 *     --title "HackZen 2026 — Offline Round" --start "2026-09-24T09:00" --end "2026-09-24T12:00"
 *   ... --apply          # write it
 *   ... --publish        # make the hackathon publicly visible (default: draft)
 *
 * ── WHY THESE TEAMS GET THEIR OWN HACKATHON ───────────────────────────────────────────────
 *
 * provisionAttempts takes EVERY confirmed registration on a hackathon. There is no field
 * distinguishing a team that registered online from one collected on paper, so an exam attached
 * to the live event would create attempts for the online registrants too — and invitations carry
 * a working exam link. Sixty people receiving a link to an exam they were never meant to sit is
 * not a problem you can take back.
 *
 * Putting the offline cohort in its own hackathon makes that mistake impossible rather than
 * unlikely: the two groups are in different containers, so no filter has to be correct. The
 * tidier fix — a cohort field on the registration, honoured by provisionAttempts — is the right
 * long-term answer and is deliberately not what this does, because it is one wrong query away
 * from the outcome above and this is days from an event.
 *
 * The hackathon is created as a DRAFT unless --publish is passed. A draft cannot be found or
 * self-registered into, which is what you want for a cohort you are importing by hand.
 *
 * ── THE SHEET ─────────────────────────────────────────────────────────────────────────────
 *
 * One row per MEMBER, grouped by team name — the same shape the registrations export already
 * produces, so an exported file can be edited and read back. Headers are matched case- and
 * space-insensitively, and these spellings are all understood:
 *
 *   Team          team, team name, teamname
 *   Member        member, name, member name, student, student name
 *   Mobile        mobile, phone, mobile number, contact
 *   Email         email, email id, mail
 *   College       college, institute, institution     (optional, falls back to --college)
 *
 * ── IT VALIDATES EVERYTHING FIRST ─────────────────────────────────────────────────────────
 *
 * A half-imported cohort is worse than none, because the missing half is invisible until
 * somebody counts. Every row is checked before anything is written, and one problem abandons
 * the run. Mobiles get the most attention: they are how a candidate signs in, the database
 * enforces one person per hackathon, and a duplicate inside the sheet would otherwise surface
 * as a confusing write error halfway through.
 */

import fs from 'fs';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import Hackathon from '../models/Hackathon';
import HackathonRegistration from '../models/HackathonRegistration';
import { newRegistrationCode, teamNameKeyOf, normalizeMobile } from '../services/hackathonRegistrationService';

const arg = (name: string, fallback = ''): string => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const has = (name: string) => process.argv.includes('--' + name);

/** Header aliases, so a sheet written by a human still reads. */
const COLUMN: Record<string, string[]> = {
  team:    ['team', 'teamname', 'team name', 'teamtitle'],
  member:  ['member', 'name', 'member name', 'membername', 'student', 'student name', 'fullname', 'full name'],
  mobile:  ['mobile', 'phone', 'mobile number', 'mobileno', 'mobile no', 'contact', 'contact number', 'whatsapp'],
  email:   ['email', 'email id', 'emailid', 'mail', 'e-mail'],
  college: ['college', 'institute', 'institution', 'school'],
};

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/** Map the sheet's own headers onto our field names, once, so every row reads the same way. */
function resolveHeaders(headers: string[]): { map: Record<string, string>; missing: string[] } {
  const map: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(COLUMN)) {
    const hit = headers.find(h => aliases.includes(norm(h)));
    if (hit) map[field] = hit;
  }
  const missing = ['team', 'member', 'mobile'].filter(f => !map[f]);
  return { map, missing };
}

interface Row { team: string; member: string; mobile: string; email: string; college: string; line: number }

async function main() {
  const tenantId = process.argv[2];
  const file = process.argv[3];
  const apply = has('apply');
  if (!tenantId || !file || tenantId.startsWith('--')) {
    console.error('Usage: importOfflineHackathonTeams.ts <tenantId> <file.xlsx|csv> --title "..." --start ISO --end ISO [--college "..."] [--publish] [--apply]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) { console.error('No such file: ' + file); process.exit(1); }

  const title = arg('title', 'Offline Round');
  const slug = arg('slug', title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const startAt = new Date(arg('start') || Date.now());
  const endAt = new Date(arg('end') || Date.now() + 3 * 3600_000);
  const defaultCollege = arg('college', '');
  const publish = has('publish');

  const say = (s = '') => console.log(s);
  say('─'.repeat(92));
  say(`OFFLINE TEAM IMPORT  ·  tenant ${tenantId}  ·  ${apply ? 'APPLY' : 'PLAN ONLY'}`);
  say('─'.repeat(92));

  /* ── read the sheet ──────────────────────────────────────────────────────────────────── */
  const wb = XLSX.readFile(file);
  const sheetName = arg('sheet', wb.SheetNames[0]);
  const sheet = wb.Sheets[sheetName];
  if (!sheet) { console.error(`No sheet named "${sheetName}". Found: ${wb.SheetNames.join(', ')}`); process.exit(1); }
  const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  say(`\n  file   : ${file}`);
  say(`  sheet  : ${sheetName}  (${wb.SheetNames.length} sheet(s): ${wb.SheetNames.join(', ')})`);
  say(`  rows   : ${raw.length}`);

  if (!raw.length) { console.error('The sheet has no data rows.'); process.exit(1); }

  const { map, missing } = resolveHeaders(Object.keys(raw[0]));
  say(`  columns: ${Object.entries(map).map(([k, v]) => `${k}="${v}"`).join('  ') || '(none matched)'}`);
  if (missing.length) {
    console.error(`\n  REFUSED — the sheet has no column for: ${missing.join(', ')}`);
    console.error(`  Headers found: ${Object.keys(raw[0]).join(' | ')}`);
    process.exit(1);
  }

  const problems: string[] = [];
  const rows: Row[] = raw.map((r, i) => ({
    line: i + 2,                                   // +2: one for the header, one for 1-based
    team: String(r[map.team] ?? '').trim(),
    member: String(r[map.member] ?? '').trim(),
    mobile: normalizeMobile(r[map.mobile]),
    email: String(map.email ? r[map.email] ?? '' : '').trim().toLowerCase(),
    college: String(map.college ? r[map.college] ?? '' : '').trim() || defaultCollege,
  }));

  /* ── validate ────────────────────────────────────────────────────────────────────────── */
  const seenMobile = new Map<string, number>();
  for (const r of rows) {
    const at = `row ${r.line}`;
    if (!r.team) problems.push(`${at}: no team name`);
    if (!r.member) problems.push(`${at}: no member name`);
    if (!r.mobile) problems.push(`${at}: no usable mobile ("${r.member || '?'}")`);
    else if (r.mobile.length !== 10) problems.push(`${at}: mobile "${r.mobile}" is not 10 digits`);
    else if (seenMobile.has(r.mobile)) problems.push(`${at}: mobile ${r.mobile} also on row ${seenMobile.get(r.mobile)} — one person cannot be on two teams`);
    else seenMobile.set(r.mobile, r.line);
    if (!r.college) problems.push(`${at}: no college, and no --college given`);
  }

  const teams = new Map<string, Row[]>();
  for (const r of rows) {
    const key = teamNameKeyOf(r.team);
    if (!teams.has(key)) teams.set(key, []);
    teams.get(key)!.push(r);
  }

  say(`\n  hackathon : "${title}"  slug ${slug}  status ${publish ? 'PUBLISHED' : 'draft (not publicly listed)'}`);
  say(`  window    : ${startAt.toISOString()} → ${endAt.toISOString()}`);
  say(`  teams     : ${teams.size}   members: ${rows.length}`);
  const sizes = [...teams.values()].map(v => v.length);
  say(`  team size : min ${Math.min(...sizes)}  max ${Math.max(...sizes)}  average ${(rows.length / teams.size).toFixed(1)}`);

  /*
   * Mobiles already used in THIS hackathon would be rejected by the unique index at write
   * time, so they are found now — but only a mobile on a DIFFERENT team is a problem.
   *
   * A mobile already registered under the same team name is this sheet being imported again,
   * which is the normal way a cohort grows: import, notice a team is missing, add a row and
   * re-run. Treating that as a clash would refuse the whole file and make the obvious workflow
   * impossible, so it is reported as already imported and skipped at write time.
   */
  const existingHack = await Hackathon.findOne({ tenantId, slug }).lean() as any;
  let alreadyImported = 0;
  if (existingHack) {
    const clash = await HackathonRegistration.find({
      hackathonId: existingHack._id, memberMobiles: { $in: [...seenMobile.keys()] },
    }).select('teamName teamNameKey memberMobiles').lean() as any[];
    for (const c of clash) {
      const dupes = (c.memberMobiles || []).filter((m: string) => seenMobile.has(m));
      if (teams.has(String(c.teamNameKey))) { alreadyImported++; continue; }
      problems.push(`${dupes.join(', ')} already registered here under a DIFFERENT team, "${c.teamName}"`);
    }
    say(`
  NOTE: hackathon "${slug}" already exists — new teams are added to it.`);
    if (alreadyImported) say(`        ${alreadyImported} team(s) from this sheet are already imported and will be skipped.`);
  }

  say(`\n  teams to create:`);
  for (const [, members] of teams) {
    say(`    ${members[0].team.padEnd(28)} ${members.length} member(s)  ${members.map(m => m.mobile).join(', ')}`);
  }

  if (problems.length) {
    say(`\n  REFUSED — ${problems.length} problem(s), nothing written:`);
    for (const p of problems.slice(0, 30)) say(`    ${p}`);
    if (problems.length > 30) say(`    … and ${problems.length - 30} more`);
    await mongoose.disconnect();
    process.exit(1);
  }
  say(`\n  every row is usable and every mobile is unique.`);

  if (!apply) { say(`\n  PLAN ONLY — nothing written. Re-run with --apply.`); await mongoose.disconnect(); return; }

  /* ── write ───────────────────────────────────────────────────────────────────────────── */
  const h = await Hackathon.findOneAndUpdate(
    { tenantId, slug },
    {
      $set: { title, startAt, endAt, status: publish ? 'published' : 'draft' },
      $setOnInsert: { tenantId, slug, feeInr: 0, description: 'Offline-registered cohort. Imported from a spreadsheet.' },
    },
    { upsert: true, new: true },
  ) as any;
  say(`\n  hackathon ${existingHack ? 'updated' : 'created'}: ${h._id}`);

  let created = 0, skipped = 0;
  const codes: string[] = [];
  for (const [key, members] of teams) {
    const already = await HackathonRegistration.findOne({ hackathonId: h._id, teamNameKey: key }).lean() as any;
    if (already) { skipped++; codes.push(`${members[0].team} → ${already.registrationCode} (existing)`); continue; }

    const reg = await HackathonRegistration.create({
      tenantId, hackathonId: h._id,
      teamName: members[0].team, teamNameKey: key,
      college: members[0].college,
      members: members.map(m => ({ name: m.member, mobile: m.mobile, email: m.email })),
      memberMobiles: members.map(m => m.mobile),
      memberEmails: members.map(m => m.email).filter(Boolean),
      registrationCode: newRegistrationCode(),
      status: 'confirmed',
      amountInr: 0,
    });
    created++;
    codes.push(`${members[0].team} → ${reg.registrationCode}`);
  }

  say(`  registrations: ${created} created, ${skipped} already existed`);
  say(`\n  TEAM CODES`);
  codes.forEach(c => say(`    ${c}`));
  say(`\n  Next: create the exam against hackathon ${h._id}, then provision and invite.`);
  await mongoose.disconnect();
}

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lms-saas')
  .then(main)
  .catch((e) => { console.error('FAILED:', e?.message || e); process.exit(1); });
