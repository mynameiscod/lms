/**
 * How much of the ninety-day spine the Year-1 curriculum can currently fill.
 *
 * WHY THIS RUNS BEFORE ANY OF IT IS BUILT. Nobody could see the shortfall until a student
 * complained. A real first-year opened a roadmap sold as ninety days, found twenty-eight, and
 * that was the first anyone knew — the curriculum holds 1,560 minutes of work and ninety days of
 * their stated capacity is 3,900. A content programme that cannot see its own gap will discover
 * it the same way every time.
 *
 * So this is the number the authoring team works from: how many of the ninety days each band can
 * fill today, for a given language and direction, and which band is thinnest.
 *
 * IT COUNTS TOPICS, NOT WISHES. One topic of the seeded curriculum stands for one day-unit here.
 * That is generous — a real day is a topic with enough authored steps to fill it — so treat the
 * output as the CEILING of what is possible before anybody writes anything, not as progress.
 *
 *   npx ts-node src/scripts/spineCoverageReport.ts
 *   npx ts-node src/scripts/spineCoverageReport.ts --language=python --direction=WEB_DEVELOPMENT
 */

import { FOUNDATION_MODULES } from '../seeds/careerPilot/foundationSkillMap';
import { SPINE_BANDS, SPINE_DAYS, BandKey } from '../data/ninetyDayPolicy';
import { spineCoverage, SelectableDayUnit } from '../services/ninetyDaySelectorService';

/**
 * Which band each Year-1 module belongs to.
 *
 * A judgement, stated here rather than buried: the modules were written before the spine existed
 * and carry no band of their own. When day-units become real rows an admin edits, this mapping
 * retires — it exists to answer "where would we be if we started today".
 */
const BAND_OF_MODULE: Record<string, BandKey> = {
  M01_CS_FUNDAMENTALS:      'ORIENTATION',
  M02_COMPUTATIONAL_THINKING: 'ORIENTATION',
  M03_PROGRAMMING:          'PROGRAMMING',
  M06_C_PROGRAMMING:        'PROGRAMMING',
  M07_DSA:                  'PROGRAMMING',
  M10_MATHS:                'PROGRAMMING',
  M15_APTITUDE:             'PROGRAMMING',
  M04_DEVELOPER_TOOLS:      'DIRECTION',
  M05_WEB_FUNDAMENTALS:     'DIRECTION',
  M08_DATABASES:            'DIRECTION',
  M09_LINUX:                'DIRECTION',
  M11_AI_LITERACY:          'AI',
  M14_CAPSTONE:             'PROJECT',
  M12_COMMUNICATION:        'SHOW_YOUR_WORK',
  M13_CAREER:               'SHOW_YOUR_WORK',
};

function candidateDayUnits(): SelectableDayUnit[] {
  const out: SelectableDayUnit[] = [];
  let order = 0;
  for (const m of FOUNDATION_MODULES) {
    const band = BAND_OF_MODULE[m.moduleCode];
    if (!band) continue;
    for (const t of m.topics) {
      out.push({
        dayUnitId: `DU_${t.topicCode}`,
        band,
        displayOrder: order++,
        title: t.title,
        skillKey: (t.skillKeys || [])[0] || '',
        journeyTopic: t.title,
        subtopics: [],
        audience: { directions: t.applicableDirections as string[] },
        estimatedMinutes: 40,
      });
    }
  }
  return out;
}

const arg = (name: string) =>
  (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1] || '';

if (require.main === module) {
  const student = {
    language: arg('language') || null,
    direction: arg('direction') || null,
  };
  const units = candidateDayUnits();
  const c = spineCoverage({ units, student });

  const who = [student.language, student.direction].filter(Boolean).join(' · ') || 'no direction chosen';
  console.log(`\nNinety-day spine coverage — ${who}`);
  console.log(`Counting one seeded topic as one day-unit, which is the ceiling before authoring.\n`);

  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(`  ${pad('BAND', 32)}${pad('NEED', 7)}${pad('HAVE', 7)}`);
  for (const r of c.rows) {
    const band = SPINE_BANDS.find(b => b.key === r.band)!;
    const mark = r.complete ? 'full' : `${r.needed - r.available} short`;
    console.log(`  ${pad(band.label, 32)}${pad(String(r.needed), 7)}${pad(String(r.available), 7)}${mark}`);
  }

  const pct = Math.round((c.filled / c.total) * 100);
  console.log(`\n  ${pad('TOTAL', 32)}${pad(String(c.total), 7)}${pad(String(c.filled), 7)}${pct}% of the spine`);

  const thinnest = c.rows.filter(r => !r.complete)
    .sort((a, b) => (b.needed - b.available) - (a.needed - a.available))[0];
  if (thinnest) {
    const band = SPINE_BANDS.find(b => b.key === thinnest.band)!;
    console.log(`\n  Thinnest band: ${band.label} — ${thinnest.needed - thinnest.available} day-units to write.`);
  } else {
    console.log(`\n  Every band has a candidate for every day. Authoring decides whether they are real days.`);
  }
  console.log(`\n  ${SPINE_DAYS} days is the whole of a first year. Author one track completely before starting the next.\n`);
}

export { candidateDayUnits, BAND_OF_MODULE };
