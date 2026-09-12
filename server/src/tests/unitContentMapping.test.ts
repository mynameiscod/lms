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
  evaluateReadiness, meetsPublishBar, TYPE_RULES, READINESS_ORDER,
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
  const teach = { type: 'notes' };
  const worked = { type: 'worked_example' };
  const practice = { type: 'practice_coding' };

  const evalUnit = (over: any = {}) => evaluateReadiness({
    unitType: 'CONCEPT', ownContent: [], inheritedContent: [], boundAssessments: 0, ...over,
  });

  it('is EMPTY when nothing resolves at all', () => {
    expect(evalUnit().readiness).toBe('EMPTY');
  });

  /* ── The rule the whole phase turns on ────────────────────────────────── */

  it('caps an inheriting unit at PARTIAL however complete its topic is', () => {
    const r = evalUnit({ inheritedContent: [teach, worked, practice], boundAssessments: 0 });
    expect(r.readiness).toBe('PARTIAL');
    expect(r.inheritedOnly).toBe(true);
    expect(r.own.teachingCount).toBe(0);
  });

  it('caps EVERY unit type at PARTIAL on inheritance, with no exemptions', () => {
    // An earlier draft exempted PROJECT and REVIEW on the reasoning that a topic-level brief
    // serves the one project unit in its topic. Plausible, and still wrong to encode: an
    // exemption is a hole somebody fills later, and the rule's whole value is having none.
    for (const unitType of Object.keys(TYPE_RULES) as (keyof typeof TYPE_RULES)[]) {
      const r = evaluateReadiness({
        unitType, ownContent: [], inheritedContent: [teach, practice], boundAssessments: 0,
      });
      expect([unitType, r.readiness]).toEqual([unitType, 'PARTIAL']);
    }
  });

  it('lifts a unit off PARTIAL the moment it owns one asset', () => {
    const r = evalUnit({ ownContent: [teach], inheritedContent: [teach, practice] });
    expect(r.readiness).toBe('TEACHABLE');
    expect(r.inheritedOnly).toBe(false);
  });

  /* ── Per-type rules ──────────────────────────────────────────────────── */

  it('walks a CONCEPT unit up the ladder as content is written for it', () => {
    expect(evalUnit({ ownContent: [teach] }).readiness).toBe('TEACHABLE');
    expect(evalUnit({ ownContent: [teach], boundAssessments: 1 }).readiness).toBe('ASSESSABLE');
    expect(evalUnit({ ownContent: [teach, practice], boundAssessments: 1 }).readiness).toBe('READY');
  });

  it('does not let practice alone make a CONCEPT unit teachable', () => {
    // Exercises with no explanation behind them are homework, not a lesson.
    const r = evalUnit({ ownContent: [practice] });
    expect(r.readiness).toBe('PARTIAL');
  });

  it('does not require a PRACTICE unit to teach', () => {
    // Its sibling concept unit taught it; requiring each to re-teach duplicates a lesson into
    // every topic.
    const r = evaluateReadiness({
      unitType: 'PRACTICE', ownContent: [practice], inheritedContent: [], boundAssessments: 0,
    });
    expect(r.readiness).toBe('READY');
  });

  it('requires a DEBUG unit to own a broken-code exercise', () => {
    const without = evaluateReadiness({
      unitType: 'DEBUG', ownContent: [teach], inheritedContent: [], boundAssessments: 0,
    });
    expect(without.readiness).not.toBe('READY');

    const withIt = evaluateReadiness({
      unitType: 'DEBUG', ownContent: [practice], inheritedContent: [], boundAssessments: 0,
    });
    expect(withIt.readiness).toBe('READY');
  });

  it('requires a PROJECT unit to own a brief AND something to submit against', () => {
    const briefOnly = evaluateReadiness({
      unitType: 'PROJECT', ownContent: [teach], inheritedContent: [], boundAssessments: 0,
    });
    expect(briefOnly.readiness).toBe('TEACHABLE');

    // A quiz is not enough: it measures recall, and a project is judged on what was built.
    const quizOnly = evaluateReadiness({
      unitType: 'PROJECT', ownContent: [teach], inheritedContent: [], boundAssessments: 1,
    });
    expect(quizOnly.readiness).toBe('ASSESSABLE');
    expect(quizOnly.missing.join(' ')).toMatch(/assignment/);

    const withAssignment = evaluateReadiness({
      unitType: 'PROJECT', ownContent: [teach], inheritedContent: [],
      boundAssessments: 1, boundAssignments: 1,
    });
    // Submission and evaluation stay with the existing Assignment engine, bound by unitCode.
    expect(withAssignment.readiness).toBe('READY');
  });

  it('does not require a PROJECT to carry separate practice', () => {
    // The project IS the practice. Demanding an exercise beside it is a box authors tick with
    // something meaningless.
    // `submission` is an Assignment specifically: a checkpoint quiz measures recall, and a
    // project is judged on what was built.
    expect(TYPE_RULES.PROJECT.ready({
      teaching: true, practice: false, assessment: true, submission: true,
    })).toBe(true);
    expect(TYPE_RULES.PROJECT.ready({
      teaching: true, practice: false, assessment: true, submission: false,
    })).toBe(false);
  });

  it('requires a CHECKPOINT to own something that measures', () => {
    const without = evaluateReadiness({
      unitType: 'CHECKPOINT', ownContent: [teach], inheritedContent: [], boundAssessments: 0,
    });
    expect(without.readiness).not.toBe('READY');

    const withQuiz = evaluateReadiness({
      unitType: 'CHECKPOINT', ownContent: [], inheritedContent: [], boundAssessments: 1,
    });
    expect(withQuiz.readiness).toBe('READY');
  });

  it('says what is missing rather than only that something is', () => {
    const r = evalUnit({ ownContent: [teach] });
    expect(r.missing.join(' ')).toMatch(/checkpoint/);
  });

  it('counts only unit-specific content, never inherited, towards its capabilities', () => {
    const r = evalUnit({ ownContent: [teach], inheritedContent: [practice, practice] });
    expect(r.own.practiceCount).toBe(0);
    expect(r.inheritedCount).toBe(2);
    // Two inherited practice rows do not satisfy the practice requirement.
    expect(r.readiness).not.toBe('READY');
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
