import ConceptLearningUnit from '../models/ConceptLearningUnit';

/**
 * A skill reads as a course, not as a list of fourteen steps.
 *
 * `topic` groups a skill's steps — LOOPS_BASICS into for loops, while loops, nested loops.
 * `subtopic` divides a topic again, because "for loops" is itself three or four steps: the
 * explanation, the worked example, the practice. With one level of grouping an author looking
 * at fourteen steps under "Loops" cannot see where for loops end and while loops begin.
 *
 * BOTH ARE PRESENTATIONAL AND NEITHER IS A SKILL. That is the line this file exists to hold.
 * Making "for loops" a CareerSkill would give it a blueprint entry, a target level, a question
 * pool and a share of the readiness figure; 112 skills would become several hundred. Grouping
 * belongs to the learning unit; measurement stays at the skill.
 */
describe('subtopic, the second level of grouping', () => {
  describe('the model accepts it without disturbing anything else', () => {
    it('keeps a subtopic on a step', () => {
      const unit = new ConceptLearningUnit({
        tenantId: 't1', skillKey: 'LOOPS_BASICS', title: 'Loops',
        steps: [{
          stepId: 's1', sequence: 1, phase: 'LEARN',
          topic: 'For loops', subtopic: 'Counting with range', estimatedMinutes: 15,
        }],
      });
      expect(unit.steps[0].topic).toBe('For loops');
      expect(unit.steps[0].subtopic).toBe('Counting with range');
    });

    /**
     * Every unit authored before this field existed has no subtopic on any step, and must
     * stay valid. A required field here would have invalidated the whole existing bank.
     */
    it('defaults to empty, so units authored before it existed stay valid', () => {
      const unit = new ConceptLearningUnit({
        tenantId: 't1', skillKey: 'LOOPS_BASICS', title: 'Loops',
        steps: [{ stepId: 's1', sequence: 1, phase: 'LEARN', estimatedMinutes: 15 }],
      });
      expect(unit.steps[0].subtopic).toBe('');
      expect(unit.validateSync()).toBeUndefined();
    });

    it('trims what an author typed, exactly as topic does', () => {
      const unit = new ConceptLearningUnit({
        tenantId: 't1', skillKey: 'X', title: 'X',
        steps: [{
          stepId: 's1', sequence: 1, phase: 'LEARN', estimatedMinutes: 15,
          topic: '  Loops  ', subtopic: '  While loops  ',
        }],
      });
      expect(unit.steps[0].topic).toBe('Loops');
      expect(unit.steps[0].subtopic).toBe('While loops');
    });
  });

  /**
   * The shape the product actually wants, asserted end to end:
   *
   *   Module → Skill → Topic → Subtopic → the steps that teach it
   */
  it('expresses a real syllabus for one skill', () => {
    const unit = new ConceptLearningUnit({
      tenantId: 't1', skillKey: 'LOOPS_BASICS', title: 'Loops',
      steps: [
        { stepId: 'a', sequence: 1, phase: 'UNDERSTAND', topic: 'For loops', subtopic: 'Counting with range', estimatedMinutes: 12 },
        { stepId: 'b', sequence: 2, phase: 'PRACTICE',   topic: 'For loops', subtopic: 'Counting with range', estimatedMinutes: 20 },
        { stepId: 'c', sequence: 3, phase: 'LEARN',      topic: 'For loops', subtopic: 'Looping over a list',  estimatedMinutes: 15 },
        { stepId: 'd', sequence: 4, phase: 'LEARN',      topic: 'While loops', subtopic: 'When the count is unknown', estimatedMinutes: 15 },
        { stepId: 'e', sequence: 5, phase: 'PRACTICE',   topic: 'While loops', subtopic: 'Avoiding a loop that never ends', estimatedMinutes: 20 },
      ],
    });

    const topics = [...new Set(unit.steps.map(s => s.topic))];
    expect(topics).toEqual(['For loops', 'While loops']);

    const forLoopSubtopics = [...new Set(
      unit.steps.filter(s => s.topic === 'For loops').map(s => s.subtopic),
    )];
    expect(forLoopSubtopics).toEqual(['Counting with range', 'Looping over a list']);

    // One skill, five steps, 82 minutes — which is several days of work rather than one
    // video, and is the whole point of the journey existing.
    expect(unit.steps.reduce((n, s) => n + s.estimatedMinutes, 0)).toBe(82);
  });

  /**
   * Grouping must not leak into anything that decides what a student is served or scored.
   * If it ever does, the labels have quietly become skills.
   */
  it('carries no scoring or sequencing meaning of its own', () => {
    const unit = new ConceptLearningUnit({
      tenantId: 't1', skillKey: 'LOOPS_BASICS', title: 'Loops',
      steps: [
        { stepId: 'a', sequence: 1, phase: 'LEARN', topic: 'While loops', subtopic: 'Z', estimatedMinutes: 10 },
        { stepId: 'b', sequence: 2, phase: 'LEARN', topic: 'For loops',   subtopic: 'A', estimatedMinutes: 10 },
      ],
    });
    // Order comes from `sequence`, never from the labels — so a journey may revisit a topic
    // later without the ordering fighting the author.
    expect(unit.steps.map(s => s.sequence)).toEqual([1, 2]);
    expect(unit.steps[0].topic).toBe('While loops');
  });
});
