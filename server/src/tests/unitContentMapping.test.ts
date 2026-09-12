/**
 * Deciding which unit a piece of content belongs to, and how ready a unit is.
 *
 * The first half exists because the classifier was WRONG on its first run against real data: it
 * produced twelve EXACT matches and hand-inspection showed all twelve were false. Each of these
 * cases is one of those false positives, frozen so the guards cannot be quietly relaxed.
 *
 * The second half is the readiness ladder. Its whole purpose is to stop PUBLISHED meaning "the
 * metadata validated" and start it meaning "a composer may schedule this" — and the state that
 * carries that distinction is PARTIAL, which is what every one of the 310 live units is in today.
 */

import {
  classifyContent, isAutoBindable, distinctiveWords, stripDepthSuffix, MappableUnit,
} from '../services/unitContentMappingService';
import {
  evaluateReadiness, meetsPublishBar, REQUIREMENTS, READINESS_ORDER,
} from '../data/unitReadinessPolicy';

/* ------------------------------------------------------------------ *
 * Classification
 * ------------------------------------------------------------------ */

const unit = (unitCode: string, title: string, topicCode = 'T_HTML', skillKeys = ['HTML']): MappableUnit =>
  ({ unitCode, title, topicCode, skillKeys });

const HTML_UNITS = [
  unit('T_HTML_INTRO', 'Introduction to HTML'),
  unit('T_HTML_FORMS', 'Forms'),
  unit('T_HTML_TABLES', 'Tables'),
  unit('T_HTML_SEMANTIC_HTML', 'Semantic HTML'),
];

const PSEUDO_UNITS = [
  unit('T_PSEUDOCODE_FLOWCHARTS', 'Flowcharts', 'T_PSEUDOCODE', ['PSEUDOCODE_FLOWCHARTS']),
  unit('T_PSEUDOCODE_DRY_RUNNING', 'Dry Running by Hand', 'T_PSEUDOCODE', ['PSEUDOCODE_FLOWCHARTS']),
];

const ctx = (units: MappableUnit[], topicTitles: [string, string][]) => {
  const unitsByTopic = new Map<string, MappableUnit[]>();
  const unitsBySkill = new Map<string, MappableUnit[]>();
  for (const u of units) {
    unitsByTopic.set(u.topicCode, [...(unitsByTopic.get(u.topicCode) || []), u]);
    for (const k of u.skillKeys || []) unitsBySkill.set(k, [...(unitsBySkill.get(k) || []), u]);
  }
  return { unitsByTopic, unitsBySkill, topicTitleByCode: new Map(topicTitles) };
};

const HTML_CTX = ctx(HTML_UNITS, [['T_HTML', 'HTML']]);
const PSEUDO_CTX = ctx(PSEUDO_UNITS, [['T_PSEUDOCODE', 'Pseudocode and Dry Running']]);

const classify = (content: any, context = HTML_CTX) =>
  classifyContent({ content, ...context });

describe('classifying content against units', () => {
  it('is EXACT when the title names exactly one unit and nothing else', () => {
    const r = classify({ _id: '1', title: 'Forms', topicCode: 'T_HTML', isPublished: true });
    expect(r.classification).toBe('EXACT');
    expect(r.matchedUnitCodes).toEqual(['T_HTML_FORMS']);
  });

  it('is BROAD when the title names the topic rather than a unit', () => {
    // The shape of all 368 live rows. Topic-level material genuinely serves every unit of the
    // topic, and the resolver's topicCode fallback already expresses that.
    const r = classify({ _id: '2', title: 'HTML — from the start', topicCode: 'T_HTML', isPublished: true });
    expect(r.classification).toBe('BROAD');
    expect(r.matchedUnitCodes).toEqual([]);
  });

  it('ignores the depth suffix the authoring tool appends', () => {
    const a = classify({ _id: '3', title: 'Forms — video (from scratch)', topicCode: 'T_HTML', isPublished: true });
    const b = classify({ _id: '4', title: 'Forms — recap', topicCode: 'T_HTML', isPublished: true });
    // Two depths of the same material, both about Forms.
    expect(a.classification).toBe('EXACT');
    expect(b.classification).toBe('EXACT');
  });
});

describe('the twelve false positives that forced the guards', () => {
  it('does not bind a two-concept title to whichever concept is a unit', () => {
    // "Pseudocode & Flowcharts" covers BOTH, and the topic has a Flowcharts unit. The naive rule
    // matched it and would have removed it from every sibling unit it serves.
    const r = classify(
      { _id: '5', title: 'Pseudocode & Flowcharts — from the start', topicCode: 'T_PSEUDOCODE', isPublished: true },
      PSEUDO_CTX,
    );
    expect(r.classification).toBe('BROAD');
  });

  it('never calls a skill-reached row EXACT, however well the title matches', () => {
    // Reached by skill, not topic: it was written against a capability, not a lesson. Every one
    // of the twelve false positives arrived this way.
    const r = classify({ _id: '6', title: 'Forms', skillKeys: ['HTML'], isPublished: true });
    expect(r.via).toBe('skillKeys');
    expect(r.classification).toBe('BROAD');
  });

  it('is UNMAPPED when no unit could serve it at all', () => {
    const r = classify({ _id: '7', title: 'Something else', topicCode: 'T_NOWHERE', skillKeys: ['QUANTUM'], isPublished: true });
    expect(r.classification).toBe('UNMAPPED');
  });
});

describe('what may be written without a human looking', () => {
  it('binds an EXACT published row', () => {
    const content = { _id: '8', title: 'Tables', topicCode: 'T_HTML', isPublished: true };
    expect(isAutoBindable(classify(content), content)).toBe(true);
  });

  it('refuses an EXACT row that is unpublished', () => {
    // An unpublished row resolves for nothing, so binding it records a decision with no effect
    // that is then forgotten. Publish first, bind after.
    const content = { _id: '9', title: 'Tables', topicCode: 'T_HTML', isPublished: false };
    expect(classify(content).classification).toBe('EXACT');
    expect(isAutoBindable(classify(content), content)).toBe(false);
  });

  it('refuses anything that is not EXACT', () => {
    const content = { _id: '10', title: 'HTML — recap', topicCode: 'T_HTML', isPublished: true };
    expect(isAutoBindable(classify(content), content)).toBe(false);
  });
});

describe('title analysis', () => {
  it('finds the words a unit adds to its topic', () => {
    expect(distinctiveWords('Semantic HTML', 'HTML')).toEqual(['semantic']);
    // "Introduction" is a stopword: it is exactly what a placeholder title uses.
    expect(distinctiveWords('Introduction to HTML', 'HTML')).toEqual([]);
  });

  it('strips the depth suffix and leaves the subject', () => {
    expect(stripDepthSuffix('HTML — video (from scratch)')).toBe('HTML');
    expect(stripDepthSuffix('Forms — practice (recap)')).toBe('Forms');
    expect(stripDepthSuffix('Semantic HTML')).toBe('Semantic HTML');
  });
});

/* ------------------------------------------------------------------ *
 * Readiness
 * ------------------------------------------------------------------ */

const teachRow = { type: 'video' };
const practiceRow = { type: 'practice_coding' };

describe('unit readiness', () => {
  it('is EMPTY when nothing resolves', () => {
    const r = evaluateReadiness({ unitType: 'CONCEPT', ownContent: [], inheritedContent: [], boundAssessments: 0 });
    expect(r.readiness).toBe('EMPTY');
  });

  /**
   * The state every one of the 310 live units is in, and the reason the ladder has five rungs.
   */
  it('caps a unit at PARTIAL when everything it has is its topic’s', () => {
    const r = evaluateReadiness({
      unitType: 'CONCEPT', ownContent: [], inheritedContent: [teachRow, practiceRow], boundAssessments: 0,
    });
    expect(r.readiness).toBe('PARTIAL');
    expect(r.inheritedOnly).toBe(true);
    expect(r.missing.join(' ')).toMatch(/only inherits/);
  });

  it('reaches READY on content written for the unit', () => {
    const r = evaluateReadiness({
      unitType: 'CONCEPT', ownContent: [teachRow, practiceRow], inheritedContent: [], boundAssessments: 0,
    });
    expect(r.readiness).toBe('READY');
    expect(r.missing).toEqual([]);
  });

  it('says what is missing rather than only that something is', () => {
    const r = evaluateReadiness({
      unitType: 'CONCEPT', ownContent: [teachRow], inheritedContent: [], boundAssessments: 0,
    });
    expect(r.readiness).toBe('TEACHABLE');
    expect(r.missing).toEqual(['nothing to practise']);
  });

  it('does not require a practice unit to teach', () => {
    // Its sibling concept unit taught it. Requiring each to re-teach would duplicate lessons
    // across every topic.
    const r = evaluateReadiness({
      unitType: 'PRACTICE', ownContent: [practiceRow], inheritedContent: [], boundAssessments: 0,
    });
    expect(r.readiness).toBe('READY');
  });

  it('does not require a project to carry separate practice', () => {
    // The project IS the practice; demanding an exercise beside it is a box authors tick with
    // something meaningless.
    expect(REQUIREMENTS.PROJECT.needsPractice).toBe(false);
    const r = evaluateReadiness({
      unitType: 'PROJECT', ownContent: [], inheritedContent: [teachRow], boundAssessments: 0,
    });
    // And a project brief written for the topic genuinely serves the one project unit in it.
    expect(r.readiness).not.toBe('PARTIAL');
  });

  it('requires a checkpoint to have something that measures', () => {
    const without = evaluateReadiness({
      unitType: 'CHECKPOINT', ownContent: [teachRow], inheritedContent: [], boundAssessments: 0,
    });
    expect(without.missing).toContain('no quiz or assignment bound to it');

    const withQuiz = evaluateReadiness({
      unitType: 'CHECKPOINT', ownContent: [teachRow], inheritedContent: [], boundAssessments: 1,
    });
    expect(withQuiz.readiness).toBe('READY');
  });

  it('counts a bound quiz as something to practise against', () => {
    const r = evaluateReadiness({
      unitType: 'CONCEPT', ownContent: [teachRow], inheritedContent: [], boundAssessments: 1,
    });
    expect(r.readiness).toBe('READY');
  });
});

describe('the publish bar', () => {
  it('is a ladder, in order', () => {
    expect(READINESS_ORDER).toEqual(['EMPTY', 'PARTIAL', 'TEACHABLE', 'ASSESSABLE', 'READY']);
  });

  it('would block everything that only inherits', () => {
    // Stated, not enforced: turning this on today would block all 310 units, which is the point
    // being made rather than a change being shipped.
    expect(meetsPublishBar('EMPTY')).toBe(false);
    expect(meetsPublishBar('PARTIAL')).toBe(false);
    expect(meetsPublishBar('TEACHABLE')).toBe(true);
    expect(meetsPublishBar('READY')).toBe(true);
  });
});
