/**
 * Topic priority — which topics a roadmap keeps when it has to fit the admin's days.
 *
 * WHY. A roadmap is the admin's days at the tenant's daily load (roadmapV2Policy). A Year 4
 * joiner's bridge (earlier years' important topics) plus Year 4 itself is more than 150 days
 * hold at 2.5 hours, so something must be left out. Leaving it to chance, or to a fixed share,
 * is how important topics went missing. Every topic therefore carries a priority:
 *
 *   MUST      never left out. A strong student proves it quickly instead of skipping it.
 *   SHOULD    goes in while there is room.
 *   OPTIONAL  the first to go.
 *
 * THE DRAFT. A first classification is computed from what the curriculum already says, for a
 * person to review and change. It is deterministic — no AI:
 *
 *   Year 1 (foundation): its backbone is MUST — every later year stands on it.
 *   Later years: a backbone topic is a MUST candidate when a later year builds on what it teaches,
 *     or it carries a checkpoint (the year measures it). Other backbone or mandatory topics are
 *     SHOULD; the rest OPTIONAL.
 *   The final year (Year 4): nothing comes after it to build on its topics, so that test would
 *     leave most of its backbone out. Every backbone topic is a MUST candidate instead.
 *   Then the MUST list must FIT: its hours may not exceed the year's MUST budget (the year's
 *     budget less the bridge a fresh joiner needs). While it does not, the least load-bearing MUST
 *     candidate is moved to SHOULD — fewest later-year dependants first, then no checkpoint, then
 *     the latest in the year.
 *
 * An admin's choice is final: a topic whose priority an admin set is never changed by the draft.
 *
 * Pure: the facts come in, the classification goes out.
 */

export type TopicPriority = 'MUST' | 'SHOULD' | 'OPTIONAL';
export const TOPIC_PRIORITIES: readonly TopicPriority[] = ['MUST', 'SHOULD', 'OPTIONAL'];

export interface TopicFacts {
  topicCode: string;
  title: string;
  order: number;
  backbone: boolean;
  mandatory: boolean;
  /** Minutes of all the topic's published units: what delivering it in full costs. */
  minutes: number;
  hasCheckpoint: boolean;
  /** Skills the topic's units teach. */
  skillKeys: string[];
  /** The priority already stored, and who set it. */
  priority?: TopicPriority;
  prioritySource?: 'DRAFT' | 'ADMIN';
}

export interface DraftOptions {
  /** True for Year 1, whose backbone is MUST outright. */
  isFoundation: boolean;
  /** True for the last year, whose whole backbone is a MUST candidate (nothing later depends on it). */
  isFinalYear?: boolean;
  /** Skills a later year builds on. A topic teaching one is load-bearing. */
  neededByLater: Set<string>;
  /** The most MUST minutes this year can hold, after the bridge a fresh joiner needs. */
  mustCapMinutes: number;
}

export interface DraftResult {
  /** The priority each topic should have. Admin-set topics keep theirs. */
  priorities: Map<string, TopicPriority>;
  /** MUST candidates moved to SHOULD to fit the cap, in the order they were moved. */
  demoted: string[];
  /** True when even after demotion the MUST list cannot fit (only admin-set MUSTs remain over). */
  overCap: boolean;
}

const dependants = (t: TopicFacts, needed: Set<string>) => t.skillKeys.filter(k => needed.has(k)).length;

export function draftPriorities(topics: TopicFacts[], opts: DraftOptions): DraftResult {
  const priorities = new Map<string, TopicPriority>();
  const adminSet = (t: TopicFacts) => t.prioritySource === 'ADMIN' && !!t.priority;

  for (const t of topics) {
    if (adminSet(t)) { priorities.set(t.topicCode, t.priority as TopicPriority); continue; }
    let p: TopicPriority;
    if (opts.isFoundation) {
      p = t.backbone ? 'MUST' : t.mandatory ? 'SHOULD' : 'OPTIONAL';
    } else if (t.backbone && (opts.isFinalYear || dependants(t, opts.neededByLater) > 0 || t.hasCheckpoint)) {
      p = 'MUST';
    } else {
      p = t.backbone || t.mandatory ? 'SHOULD' : 'OPTIONAL';
    }
    priorities.set(t.topicCode, p);
  }

  // Fit the MUST list into its budget by demoting the least load-bearing drafted MUSTs.
  const mustMinutes = () => topics.reduce((m, t) => m + (priorities.get(t.topicCode) === 'MUST' ? t.minutes : 0), 0);
  const demotable = topics
    .filter(t => !adminSet(t) && priorities.get(t.topicCode) === 'MUST')
    .sort((a, b) =>
      dependants(a, opts.neededByLater) - dependants(b, opts.neededByLater)
      || Number(a.hasCheckpoint) - Number(b.hasCheckpoint)
      || b.order - a.order
      || a.topicCode.localeCompare(b.topicCode));
  const demoted: string[] = [];
  // Year 1's backbone is the foundation every year stands on: it is never demoted to fit.
  if (!opts.isFoundation) {
    for (const t of demotable) {
      if (mustMinutes() <= opts.mustCapMinutes) break;
      priorities.set(t.topicCode, 'SHOULD');
      demoted.push(t.topicCode);
    }
  }
  return { priorities, demoted, overCap: mustMinutes() > opts.mustCapMinutes };
}

export interface PrioritySummary {
  MUST: { topics: number; minutes: number };
  SHOULD: { topics: number; minutes: number };
  OPTIONAL: { topics: number; minutes: number };
  UNSET: { topics: number; minutes: number };
}

export function summarisePriorities(topics: { minutes: number; priority?: TopicPriority | null }[]): PrioritySummary {
  const out: PrioritySummary = {
    MUST: { topics: 0, minutes: 0 }, SHOULD: { topics: 0, minutes: 0 },
    OPTIONAL: { topics: 0, minutes: 0 }, UNSET: { topics: 0, minutes: 0 },
  };
  for (const t of topics) {
    const k = t.priority && (TOPIC_PRIORITIES as readonly string[]).includes(t.priority) ? t.priority : 'UNSET';
    out[k].topics += 1;
    out[k].minutes += Math.max(0, t.minutes || 0);
  }
  return out;
}

export const isTopicPriority = (v: unknown): v is TopicPriority =>
  typeof v === 'string' && (TOPIC_PRIORITIES as readonly string[]).includes(v);
