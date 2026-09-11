/**
 * The Year-1 curriculum, expressed as day-units of the ninety-day spine.
 *
 * WHAT THIS IS AND IS NOT. It is a starting point, not a finished curriculum. One seeded topic
 * becomes one day-unit, which is generous — a real day is a topic with enough authored steps to
 * fill it — so what this produces is the CEILING of what is possible before anybody writes
 * anything. Today that is about a third of the spine, and the selector will say so rather than
 * handing a student a plan with holes in it.
 *
 * IT DOES NOT INVENT DAYS. Where the curriculum has four topics for a band that needs fifteen,
 * this seeds four. Padding the difference would manufacture the filler the whole model exists to
 * avoid, and a student spots filler inside a week.
 *
 * ONCE AUTHORED, THESE ARE ORDINARY ROWS. An admin edits them, adds the missing ones, and
 * retires this mapping. It exists to answer "where would we be if we started today".
 */

import { FOUNDATION_MODULES } from './foundationSkillMap';
import { BandKey } from '../../data/ninetyDayPolicy';

/**
 * Which band each Year-1 module belongs to.
 *
 * A judgement, stated here rather than buried in a script. The modules were written before the
 * spine existed and carry no band of their own.
 *
 * M10 (maths) and M15 (aptitude) sit in PROGRAMMING rather than in a band of their own: at
 * first-year level they are the reasoning a programmer uses, and giving them their own band
 * would take days from the foundations this plan deliberately spends half its length on.
 */
export const BAND_OF_MODULE: Record<string, BandKey> = {
  M01_CS_FUNDAMENTALS:        'ORIENTATION',
  M02_COMPUTATIONAL_THINKING: 'ORIENTATION',
  M03_PROGRAMMING:            'PROGRAMMING',
  M06_C_PROGRAMMING:          'PROGRAMMING',
  M07_DSA:                    'PROGRAMMING',
  M10_MATHS:                  'PROGRAMMING',
  M15_APTITUDE:               'PROGRAMMING',
  M04_DEVELOPER_TOOLS:        'DIRECTION',
  M05_WEB_FUNDAMENTALS:       'DIRECTION',
  M08_DATABASES:              'DIRECTION',
  M09_LINUX:                  'DIRECTION',
  M11_AI_LITERACY:            'AI',
  M14_CAPSTONE:               'PROJECT',
  M12_COMMUNICATION:          'SHOW_YOUR_WORK',
  M13_CAREER:                 'SHOW_YOUR_WORK',
};

export interface SeededDayUnit {
  dayUnitId: string;
  band: BandKey;
  displayOrder: number;
  title: string;
  blurb: string;
  moduleCode: string;
  topicCode: string;
  skillKey: string;
  journeyTopic: string;
  subtopics: string[];
  audience: { languages: string[]; directions: string[]; years: string[]; branches: string[] };
  estimatedMinutes: number;
}

/**
 * A placeholder estimate, and it says so.
 *
 * Forty minutes is what the old projection charged a topic with no authored journey behind it.
 * Once a day's journey exists, its real minutes come from the steps and this is overwritten —
 * which is the moment the number stops being a guess.
 */
const PLACEHOLDER_MINUTES = 40;

/** The Year-1 curriculum as day-units, in curriculum order. Pure; the script writes them. */
export function seededDayUnits(): SeededDayUnit[] {
  const out: SeededDayUnit[] = [];
  let order = 0;

  for (const m of FOUNDATION_MODULES) {
    const band = BAND_OF_MODULE[m.moduleCode];
    // A module with no band is not a first-year day. Skipped loudly by being absent from the
    // map above rather than silently by a filter nobody can see.
    if (!band) continue;

    for (const t of m.topics) {
      out.push({
        dayUnitId: `DU_${t.topicCode}`,
        band,
        displayOrder: order++,
        title: t.title,
        blurb: t.learningOutcomes?.[0] || '',
        moduleCode: m.moduleCode,
        topicCode: t.topicCode,
        skillKey: (t.skillKeys || [])[0] || '',
        // The topic's own title is the grouping label an author would have used in the Studio,
        // so a seeded day and a hand-authored one point at the same thing.
        journeyTopic: t.title,
        subtopics: [],
        audience: {
          languages: [],
          directions: (t.applicableDirections || []) as string[],
          years: [],
          branches: [],
        },
        estimatedMinutes: PLACEHOLDER_MINUTES,
      });
    }
  }

  return out;
}

/** Modules deliberately left out of the spine, so the omission is reportable rather than silent. */
export const unbandedModules = (): string[] =>
  FOUNDATION_MODULES.filter(m => !BAND_OF_MODULE[m.moduleCode]).map(m => m.moduleCode);
