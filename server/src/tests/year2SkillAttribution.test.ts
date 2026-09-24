/**
 * The Year-2 question attribution must name skills that exist, on topics that declare them.
 *
 * An attribution naming a skill its unit does not declare is refused by the content seeder and
 * reported — which means the questions are written and never mapped. That failure is quiet: the
 * quiz works, the unit reports ready, and Skill DNA never hears about any of it. These checks
 * turn a quiet failure into a loud one, here, before anything is seeded.
 */

import { ATTRIBUTION_TABLES, primarySkillFor } from '../seeds/careerPilot/year2SkillAttribution';
import { BUILD_MODULES } from '../seeds/careerPilot/year2StageMap';
import { YEAR2 } from '../seeds/careerPilot/year2MegaCurriculum';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';

const { TOPIC_DEFAULT, OVERRIDES } = ATTRIBUTION_TABLES;

/** topicCode → the skills that topic declares. */
const topicSkills = new Map<string, string[]>();
for (const mod of BUILD_MODULES) {
  for (const t of mod.topics) topicSkills.set(t.topicCode, t.skillKeys || []);
}

/** unitCode → its topic. */
const unitTopic = new Map<string, string>();
for (const [topicCode, topic] of Object.entries(YEAR2 as Record<string, any>)) {
  for (const u of topic.units) unitTopic.set(`${topicCode}_${u.slug}`, topicCode);
}

const taxonomyKeys = new Set(CAREER_SKILL_TAXONOMY.map((s: any) => String(s.key)));

describe('the Year-2 attribution names real skills', () => {
  it('every default is a skill its topic declares', () => {
    const wrong = Object.entries(TOPIC_DEFAULT)
      .filter(([topic, skill]) => !(topicSkills.get(topic) || []).includes(skill))
      .map(([topic, skill]) => `${topic} defaults to ${skill}, which it does not declare`);
    expect(wrong).toEqual([]);
  });

  it('every override is a skill its unit\'s topic declares', () => {
    const wrong = Object.entries(OVERRIDES)
      .map(([unit, skill]) => {
        const topic = unitTopic.get(unit);
        if (!topic) return `${unit} is not a unit in the curriculum`;
        return (topicSkills.get(topic) || []).includes(skill)
          ? '' : `${unit} → ${skill}, which ${topic} does not declare`;
      })
      .filter(Boolean);
    expect(wrong).toEqual([]);
  });

  it('every attributed skill exists in the taxonomy', () => {
    const all = [...Object.values(TOPIC_DEFAULT), ...Object.values(OVERRIDES)];
    expect([...new Set(all)].filter(k => !taxonomyKeys.has(k))).toEqual([]);
  });
});

describe('every unit that needs an attribution has one', () => {
  it('leaves no multi-skill unit unattributed', () => {
    const unattributed: string[] = [];
    for (const [unitCode, topicCode] of unitTopic) {
      const declared = topicSkills.get(topicCode) || [];
      if (declared.length <= 1) continue;          // the seeder derives these on its own
      if (!primarySkillFor(unitCode, topicCode)) unattributed.push(unitCode);
    }
    expect(unattributed).toEqual([]);
  });

  it('covers every topic that declares more than one skill', () => {
    const missing = [...topicSkills.entries()]
      .filter(([topic, skills]) => skills.length > 1 && !TOPIC_DEFAULT[topic])
      .map(([topic]) => topic);
    expect(missing).toEqual([]);
  });

  /**
   * A single-skill topic must NOT appear in the table: the seeder derives its mapping, and a
   * default here would be a second place to maintain the same fact.
   */
  it('does not attribute topics that declare exactly one skill', () => {
    const redundant = Object.keys(TOPIC_DEFAULT)
      .filter(t => (topicSkills.get(t) || []).length === 1);
    expect(redundant).toEqual([]);
  });
});
