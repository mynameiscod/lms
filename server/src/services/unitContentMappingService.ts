/**
 * Deciding which Learning Unit a piece of content belongs to.
 *
 * ── ONE CLASSIFIER, TWO CALLERS ───────────────────────────────────────────────────────────
 *
 * The audit reports what would be bound; the binder writes it. If each carried its own copy of
 * this logic they would eventually disagree, and the disagreement would surface as a binding
 * nobody predicted — the audit saying BROAD while the binder wrote a unitCode. So it lives here
 * and both import it.
 *
 * ── THE ONLY EVIDENCE IS THE TITLE ────────────────────────────────────────────────────────
 *
 * A content row's topicCode and skillKeys place it against a TOPIC, and every unit of that topic
 * shares both. Metadata therefore cannot distinguish "Inheritance" from "Polymorphism"; the title
 * is all there is.
 *
 * ── IT WAS WRONG THE FIRST TIME, WHICH IS THE REASON FOR BOTH GUARDS ──────────────────────
 *
 * The naive rule — "the row's title contains this unit's distinctive words" — produced twelve
 * EXACT matches against real data and every one was false. "Pseudocode & Flowcharts — from the
 * start" matched the unit "Flowcharts"; "Technical Communication" matched "Communication
 * Practice". Both are topic-level assets that the unit is only one part of, and binding either
 * would have removed it from every sibling unit currently served by it.
 *
 * Hence:
 *
 *   1. SKILL-REACHED ROWS ARE NEVER EXACT. A row found only through skillKeys was written against
 *      a capability, not a lesson. All twelve false positives arrived this way.
 *   2. CONTAINMENT IS NOT EQUALITY. The row's own distinctive words must match the unit's rather
 *      than merely include them, or a title naming two concepts binds to whichever one happens to
 *      be a unit and silently drops the other.
 *
 * With both, the count against the current library is zero — which is correct. None of it was
 * written against a single unit, and the topicCode fallback already serves it properly.
 */

export type MappingClass = 'EXACT' | 'SHARED' | 'BROAD' | 'UNMAPPED';

/** How the row reached its candidate units at all. */
export type MappingVia = 'topicCode' | 'skillKeys' | 'none';

export interface MappableUnit {
  unitCode: string;
  title: string;
  topicCode: string;
  skillKeys?: string[];
}

export interface MappableContent {
  _id: any;
  title: string;
  type?: string;
  topicCode?: string;
  skillKeys?: string[];
  isPublished?: boolean;
}

export interface MappingResult {
  classification: MappingClass;
  via: MappingVia;
  matchedUnitCodes: string[];
  /** Every unit the row could serve, matched or not. Used for coverage, not for binding. */
  candidateUnitCodes: string[];
}

/**
 * Depth variants the authoring tool appends, stripped before matching.
 *
 * "HTML — video (from scratch)" and "HTML — recap" are the same material at two depths, and the
 * suffix says nothing about which unit either serves.
 */
const DEPTH_SUFFIX = /\s*[—-]\s*(from the start|from scratch|recap|standard|practice|video|notes)\b.*$/i;

/**
 * Words that carry no distinguishing information.
 *
 * `basics`, `fundamentals` and `introduction` are here on purpose: they are exactly the words a
 * placeholder title uses, and treating them as evidence would let one back in through matching.
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'it', 'its',
  'what', 'why', 'how', 'that', 'this', 'as', 'at', 'by', 'from', 'into', 'about',
  'practice', 'notes', 'video', 'intro', 'introduction', 'basics', 'fundamentals',
  'your', 'you', 'are', 'be', 'does', 'do', 'when', 'where', 'which', 'not',
]);

export const contentWords = (s: string): string[] =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));

export const stripDepthSuffix = (s: string): string => String(s || '').replace(DEPTH_SUFFIX, '');

/** The words in a unit's title that its topic's title does not already say. */
export const distinctiveWords = (unitTitle: string, topicTitle: string): string[] => {
  const topic = new Set(contentWords(topicTitle));
  return contentWords(unitTitle).filter(w => !topic.has(w));
};

export function classifyContent(input: {
  content: MappableContent;
  unitsByTopic: Map<string, MappableUnit[]>;
  unitsBySkill: Map<string, MappableUnit[]>;
  topicTitleByCode: Map<string, string>;
}): MappingResult {
  const { content, unitsByTopic, unitsBySkill, topicTitleByCode } = input;

  const rowTopic = String(content.topicCode || '');
  const rowSkills = (content.skillKeys || []).map(k => String(k));

  let candidates: MappableUnit[] = [];
  let via: MappingVia = 'none';

  if (rowTopic && unitsByTopic.has(rowTopic)) {
    candidates = unitsByTopic.get(rowTopic)!;
    via = 'topicCode';
  } else if (rowSkills.length) {
    const seen = new Set<string>();
    for (const key of rowSkills) {
      for (const unit of unitsBySkill.get(key) || []) {
        if (seen.has(unit.unitCode)) continue;
        seen.add(unit.unitCode);
        candidates.push(unit);
      }
    }
    if (candidates.length) via = 'skillKeys';
  }

  const candidateUnitCodes = candidates.map(u => u.unitCode);
  if (!candidates.length) {
    return { classification: 'UNMAPPED', via, matchedUnitCodes: [], candidateUnitCodes };
  }

  // Guard 1: a skill-reached row is skill-level by construction and can never be EXACT.
  if (via !== 'topicCode') {
    return { classification: 'BROAD', via, matchedUnitCodes: [], candidateUnitCodes };
  }

  const titleWords = new Set(contentWords(stripDepthSuffix(content.title)));

  const matched = candidates.filter(unit => {
    const unitDistinctive = distinctiveWords(unit.title, topicTitleByCode.get(unit.topicCode) || '');
    if (!unitDistinctive.length) return false;

    // The unit's subject must appear in the row's title at all.
    if (!unitDistinctive.every(w => titleWords.has(w))) return false;

    /**
     * Guard 2: THE ROW MUST NOT SAY MORE THAN THE UNIT DOES.
     *
     * Compared against the UNIT's full title rather than against its distinctive words, and that
     * difference is the whole guard. An earlier version subtracted the topic's words from the
     * row's first, which silently erased the evidence: "Pseudocode & Flowcharts" under the topic
     * "Pseudocode and Dry Running" lost `pseudocode` to the topic, leaving `flowcharts` alone and
     * matching the Flowcharts unit exactly — binding a two-concept asset to one of them and
     * removing it from the other five units it serves.
     *
     * Every word the row says must be a word the unit says. "Forms" matches the Forms unit;
     * "Semantic HTML and Accessibility" matches neither, because each would drop the other.
     */
    const unitWords = new Set(contentWords(unit.title));
    return [...titleWords].every(w => unitWords.has(w));
  });

  const classification: MappingClass =
    matched.length === 1 ? 'EXACT'
      : matched.length > 1 ? 'SHARED'
        : 'BROAD';

  return { classification, via, matchedUnitCodes: matched.map(u => u.unitCode), candidateUnitCodes };
}

/**
 * Whether a mapping is safe to write without a human looking at it.
 *
 * EXACT is necessary and not sufficient: an unpublished row resolves for nothing, so binding it
 * would record a decision that has no effect and would then be forgotten. Publish first, bind
 * after.
 */
export const isAutoBindable = (r: MappingResult, content: MappableContent): boolean =>
  r.classification === 'EXACT' && content.isPublished !== false;
