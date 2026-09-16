/**
 * How a Year-1 plan moves through the course: which strand opens a topic next, and where a topic's
 * teaching reaches something the learner does with it.
 *
 * Policy DATA over existing metadata, in the same sense as the allocation tables. It decides ORDER
 * only — never whether a unit is suitable, never whether a prerequisite is met, never how many of a
 * role a plan holds. Every one of those rules is enforced by the composer exactly as before, so a
 * wrong entry here yields a worse-sequenced plan, never an unsafe one.
 */
import { LearningUnitType } from '../models/CurriculumLearningUnit';

export type CourseStrand = 'COMPUTING' | 'THINKING' | 'PROGRAMMING' | 'TOOLS' | 'DATA' | 'BROADER';

/**
 * The strands, in the order they are introduced.
 *
 * `sequence` is authored only where the course has a genuine teaching order between topics that the
 * unit metadata cannot express — the nine foundation topics, whose cross-topic order is otherwise a
 * matter of alphabetical topic codes. Everything else belongs to a strand by module and is ordered by
 * module then topic code, which is the order the curriculum is authored in.
 */
export const COURSE_STRANDS: readonly {
  strand: CourseStrand;
  modules: readonly string[];
  sequence: readonly string[];
}[] = Object.freeze([
  { strand: 'COMPUTING', modules: ['M01_CS_FUNDAMENTALS'], sequence: ['T_HARDWARE', 'T_FILES'] },
  { strand: 'THINKING', modules: ['M02_COMPUTATIONAL_THINKING'], sequence: ['T_DECOMPOSITION', 'T_PSEUDOCODE'] },
  {
    strand: 'PROGRAMMING',
    modules: ['M03_PROGRAMMING', 'M07_DSA', 'M06_C_PROGRAMMING'],
    sequence: ['T_VARIABLES', 'T_CONDITIONS', 'T_LOOPS', 'T_FUNCTIONS', 'T_ARRAYS'],
  },
  { strand: 'TOOLS', modules: ['M04_DEVELOPER_TOOLS'], sequence: [] },
  { strand: 'DATA', modules: ['M08_DATABASES'], sequence: [] },
  // Web, AI and data literacy, systems and networking, maths, communication, career, aptitude, capstone.
  { strand: 'BROADER', modules: [], sequence: [] },
]);

/** The strand the whole course is built around. Other strands are introduced between its blocks. */
export const SPINE_STRAND: CourseStrand = 'PROGRAMMING';

export const strandOf = (topicCode: string, moduleCode: string): CourseStrand =>
  (COURSE_STRANDS.find(s => s.sequence.includes(topicCode))
    ?? COURSE_STRANDS.find(s => s.modules.includes(moduleCode))
    ?? COURSE_STRANDS[COURSE_STRANDS.length - 1]).strand;

export const strandIndex = (strand: CourseStrand): number => COURSE_STRANDS.findIndex(s => s.strand === strand);

/** Position in its strand's authored sequence, or null when the strand does not order that topic. */
export const sequenceIndexOf = (topicCode: string): number | null => {
  for (const s of COURSE_STRANDS) {
    const i = s.sequence.indexOf(topicCode);
    if (i >= 0) return i;
  }
  return null;
};

/** The topic taught immediately before this one in an authored sequence, if any. */
export const sequencePredecessorOf = (topicCode: string): string | null => {
  for (const s of COURSE_STRANDS) {
    const i = s.sequence.indexOf(topicCode);
    if (i > 0) return s.sequence[i - 1];
  }
  return null;
};

/* ------------------------------------------------------------------ *
 * Practical boundaries
 * ------------------------------------------------------------------ */

export interface BoundaryUnit {
  unitCode: string;
  topicCode: string;
  unitType: LearningUnitType;
  displayOrder: number;
  prerequisiteUnitCodes: string[];
}

const ANCHOR_FALLBACK: LearningUnitType[] = ['DEBUG', 'PROJECT'];

/**
 * A topic's practical boundaries, in the order a learner reaches them.
 *
 * A boundary is where teaching turns into doing. It is a PRACTICE unit where the topic has one, and
 * otherwise a debugging exercise or project — a topic with neither has no boundary, and a block is
 * never opened for it. They are ordered by how many other boundaries of the same topic sit in their
 * own same-topic prerequisite closure, so the FIRST practice is the one whose path contains no earlier
 * practice, and a deeper practice that builds on it comes after. Measured on the certified inventory,
 * every topic with more than one practice has exactly one such first practice.
 *
 * Closures are same-topic by construction: a cross-topic prerequisite is a milestone's concern, not a
 * topic's teaching path.
 */
export function practicalBoundaries<U extends BoundaryUnit>(topicUnits: U[]): U[] {
  const byCode = new Map(topicUnits.map(u => [u.unitCode, u]));
  const hasPractice = topicUnits.some(u => u.unitType === 'PRACTICE');
  const anchors = topicUnits.filter(u => (hasPractice ? u.unitType === 'PRACTICE' : ANCHOR_FALLBACK.includes(u.unitType)));

  const closure = (code: string, seen = new Set<string>()): Set<string> => {
    for (const p of byCode.get(code)?.prerequisiteUnitCodes || []) {
      if (seen.has(p) || !byCode.has(p)) continue;
      seen.add(p);
      closure(p, seen);
    }
    return seen;
  };
  const measured = anchors.map(a => {
    const c = closure(a.unitCode);
    return { a, earlier: anchors.filter(o => o !== a && c.has(o.unitCode)).length, size: c.size };
  });
  return measured
    .sort((x, y) => x.earlier - y.earlier || x.size - y.size
      || x.a.displayOrder - y.a.displayOrder || x.a.unitCode.localeCompare(y.a.unitCode))
    .map(m => m.a);
}
