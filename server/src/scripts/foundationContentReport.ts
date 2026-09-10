/**
 * How much of Year 1 is actually written, module by module.
 *
 * READ-ONLY. Nothing is written but the CSV.
 *
 * WHY THIS EXISTS. Seeding placeholders makes the flow walkable and makes the gap invisible at the
 * same time: once every topic has three items, no screen in the product distinguishes a finished
 * lesson from scaffolding, and "Year 1 is done" becomes something somebody can say without anybody
 * being able to check. This is the check.
 *
 * WHAT COUNTS AS WRITTEN. A row that is no longer tagged `placeholder`. That is the tag the seeder
 * applies and the instruction in every placeholder body is to remove it once real teaching is in —
 * so an author marks their own work done, and the report follows the library rather than guessing
 * from word counts.
 *
 * IT ALSO REPORTS WHAT IS UNREACHABLE. A row with no skillKeys is invisible to the adaptive plan
 * however good it is, which is a worse failure than an empty topic because it looks like content
 * exists. The Content Library screen already has a filter for it; this counts it.
 *
 *   npx ts-node src/scripts/foundationContentReport.ts <tenantId>
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';

dotenv.config();

const PLACEHOLDER_TAG = 'placeholder';
const WANTED_TYPES = ['video', 'notes', 'practice'] as const;
const CSV_OUT = path.join(__dirname, '../../../docs/audit/foundation-content-progress.csv');

const isPractice = (t: string) => t === 'practice_coding' || t === 'practice_theory';
const bucketOf = (t: string) => (isPractice(t) ? 'practice' : t);

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) { console.error('Usage: foundationContentReport.ts <tenantId>'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const curriculum = await LearningCurriculum.findOne({
    tenantId, adaptiveStage: 'foundation',
  }).lean() as any;
  if (!curriculum) { console.error('No foundation curriculum in this tenant.'); process.exit(1); }

  const moduleName = new Map<string, string>(
    ((curriculum.modules || []) as any[]).map(m => [String(m.moduleCode), String(m.moduleName)]),
  );
  const topics = ((curriculum.topics || []) as any[]).filter(t => t.topicCode);

  const rows = await LearningContentLibrary.find({ tenantId, isPublished: true })
    .select('type topicCode learningDepth topicTags skillKeys').lean() as any[];

  const byTopic = new Map<string, any[]>();
  for (const r of rows) {
    const code = String(r.topicCode || '');
    if (!code) continue;
    byTopic.set(code, [...(byTopic.get(code) || []), r]);
  }

  const unreachable = rows.filter(r => !(r.skillKeys || []).length);

  interface Line {
    moduleCode: string; moduleName: string; topics: number;
    items: number; real: number; placeholder: number;
    missingVideo: number; missingNotes: number; missingPractice: number;
  }
  const byModule = new Map<string, Line>();
  const topicDetail: { topicCode: string; moduleCode: string; real: number; items: number; missing: string[] }[] = [];

  for (const t of topics) {
    const code = String(t.moduleCode);
    if (!byModule.has(code)) {
      byModule.set(code, {
        moduleCode: code, moduleName: moduleName.get(code) || code, topics: 0,
        items: 0, real: 0, placeholder: 0,
        missingVideo: 0, missingNotes: 0, missingPractice: 0,
      });
    }
    const line = byModule.get(code)!;
    line.topics++;

    const mine = byTopic.get(String(t.topicCode)) || [];
    const real = mine.filter(r => !(r.topicTags || []).includes(PLACEHOLDER_TAG));
    line.items += mine.length;
    line.real += real.length;
    line.placeholder += mine.length - real.length;

    const missing: string[] = [];
    for (const want of WANTED_TYPES) {
      if (!mine.some(r => bucketOf(r.type) === want)) {
        missing.push(want);
        if (want === 'video') line.missingVideo++;
        if (want === 'notes') line.missingNotes++;
        if (want === 'practice') line.missingPractice++;
      }
    }
    topicDetail.push({
      topicCode: String(t.topicCode), moduleCode: code,
      real: real.length, items: mine.length, missing,
    });
  }

  const lines = [...byModule.values()];
  const total = lines.reduce((a, l) => ({
    topics: a.topics + l.topics, items: a.items + l.items,
    real: a.real + l.real, placeholder: a.placeholder + l.placeholder,
  }), { topics: 0, items: 0, real: 0, placeholder: 0 });

  /* ---- terminal ------------------------------------------------------------------------- */

  console.log(`\nYEAR-1 CONTENT PROGRESS — tenant ${tenantId}`);
  console.log(`"real" means the row no longer carries the "${PLACEHOLDER_TAG}" tag\n`);
  const head = `${'module'.padEnd(30)}${'topics'.padEnd(8)}${'items'.padEnd(8)}`
    + `${'real'.padEnd(7)}${'placeholder'.padEnd(13)}missing`;
  console.log(head);
  console.log('-'.repeat(head.length + 6));
  for (const l of lines) {
    const miss = [
      l.missingVideo ? `${l.missingVideo} video` : '',
      l.missingNotes ? `${l.missingNotes} notes` : '',
      l.missingPractice ? `${l.missingPractice} practice` : '',
    ].filter(Boolean).join(', ') || '-';
    console.log(`${l.moduleName.slice(0, 29).padEnd(30)}${String(l.topics).padEnd(8)}`
      + `${String(l.items).padEnd(8)}${String(l.real).padEnd(7)}${String(l.placeholder).padEnd(13)}${miss}`);
  }
  console.log('-'.repeat(head.length + 6));
  console.log(`${'TOTAL'.padEnd(30)}${String(total.topics).padEnd(8)}${String(total.items).padEnd(8)}`
    + `${String(total.real).padEnd(7)}${String(total.placeholder).padEnd(13)}`);

  const pct = total.items ? Math.round((total.real / total.items) * 100) : 0;
  console.log(`\n${total.real} of ${total.items} items are real content — ${pct}%`);
  if (unreachable.length) {
    console.log(`\n⚠ ${unreachable.length} published row(s) carry no skillKeys and are invisible to `
      + `the adaptive plan, whatever they contain.`);
  }
  const bare = topicDetail.filter(t => t.missing.length);
  if (bare.length) {
    console.log(`\nTOPICS MISSING ONE OF THE THREE ITEMS (${bare.length})`);
    for (const t of bare.slice(0, 20)) {
      console.log(`  ${t.topicCode.padEnd(20)} missing ${t.missing.join(', ')}`);
    }
    if (bare.length > 20) console.log(`  ... ${bare.length - 20} more`);
  }

  /* ---- CSV ------------------------------------------------------------------------------ */

  const header = ['moduleCode', 'moduleName', 'topics', 'items', 'real', 'placeholder',
    'missingVideo', 'missingNotes', 'missingPractice'];
  const csv = [
    header.join(','),
    ...lines.map(l => header.map(h => {
      const v = String((l as any)[h]);
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')),
  ].join('\n') + '\n';
  fs.mkdirSync(path.dirname(CSV_OUT), { recursive: true });
  fs.writeFileSync(CSV_OUT, csv, 'utf8');
  console.log(`\nwritten: docs/audit/foundation-content-progress.csv`);

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
