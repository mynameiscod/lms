/**
 * The Year-3 question attribution must name skills that exist, on topics that declare them.
 *
 * An attribution naming a skill its unit does not declare is refused by the content seeder and
 * reported — which means the questions are written and never mapped. That failure is quiet: the
 * quiz works, the unit reports ready, and Skill DNA never hears about any of it. These checks
 * turn a quiet failure into a loud one, here, before anything is seeded.
 *
 * Year 3 needs this more than Year 2 did. Seventy-six of its hundred topics declare two or more
 * skills, against Year 2's twenty-one of thirty-three, because a specialize topic nearly always
 * sits at the join of two things. A gap in the table is therefore the normal case rather than
 * the exception, and the coverage checks below are what stop one being shipped.
 */

import { ATTRIBUTION_TABLES, primarySkillFor } from '../seeds/careerPilot/year3SkillAttribution';
import { SPECIALIZE_MODULES } from '../seeds/careerPilot/year3StageMap';
import { YEAR3 } from '../seeds/careerPilot/year3MegaCurriculum';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';

const { TOPIC_DEFAULT, OVERRIDES } = ATTRIBUTION_TABLES;

/** topicCode → the skills that topic declares. */
const topicSkills = new Map<string, string[]>();
for (const mod of SPECIALIZE_MODULES as any[]) {
  for (const t of mod.topics) topicSkills.set(t.topicCode, t.skillKeys || []);
}

/** unitCode → its topic. */
const unitTopic = new Map<string, string>();
for (const [topicCode, topic] of Object.entries(YEAR3 as Record<string, any>)) {
  for (const u of topic.units) unitTopic.set(`${topicCode}_${u.slug}`, topicCode);
}

const taxonomyKeys = new Set(CAREER_SKILL_TAXONOMY.map((s: any) => String(s.key)));

describe('the Year-3 attribution names real skills', () => {
  it('every default is a skill its topic declares', () => {
    const bad = Object.entries(TOPIC_DEFAULT)
      .filter(([topic, skill]) => !(topicSkills.get(topic) || []).includes(skill))
      .map(([topic, skill]) => `${topic} -> ${skill}`);
    expect(bad).toEqual([]);
  });

  it('every default names a topic that exists', () => {
    expect(Object.keys(TOPIC_DEFAULT).filter(t => !topicSkills.has(t))).toEqual([]);
  });

  it("every override is a skill its unit's topic declares", () => {
    const bad = Object.entries(OVERRIDES)
      .filter(([unit, skill]) => {
        const topic = unitTopic.get(unit);
        return !topic || !(topicSkills.get(topic) || []).includes(skill);
      })
      .map(([unit, skill]) => `${unit} -> ${skill}`);
    expect(bad).toEqual([]);
  });

  it('every override names a unit that exists', () => {
    expect(Object.keys(OVERRIDES).filter(u => !unitTopic.has(u))).toEqual([]);
  });

  it('every attributed skill exists in the taxonomy', () => {
    const named = [...Object.values(TOPIC_DEFAULT), ...Object.values(OVERRIDES)];
    expect([...new Set(named)].filter(s => !taxonomyKeys.has(s))).toEqual([]);
  });
});

describe('every unit that needs an attribution has one', () => {
  it('covers every topic that declares more than one skill', () => {
    const missing = [...topicSkills.entries()]
      .filter(([topic, skills]) => skills.length > 1 && !TOPIC_DEFAULT[topic])
      .map(([topic]) => topic);
    expect(missing).toEqual([]);
  });

  /**
   * A single-skill topic is derived by the seeder. Listing one here would create a second place
   * for the same fact to live, and the two would drift the first time the stage map changed.
   */
  it('does not attribute topics that declare exactly one skill', () => {
    const needless = [...topicSkills.entries()]
      .filter(([topic, skills]) => skills.length === 1 && TOPIC_DEFAULT[topic])
      .map(([topic]) => topic);
    expect(needless).toEqual([]);
  });

  it('leaves no unit of a multi-skill topic unattributed', () => {
    const unattributed: string[] = [];
    for (const [unitCode, topic] of unitTopic) {
      if ((topicSkills.get(topic) || []).length < 2) continue;
      if (!primarySkillFor(unitCode, topic)) unattributed.push(unitCode);
    }
    expect(unattributed).toEqual([]);
  });
});
