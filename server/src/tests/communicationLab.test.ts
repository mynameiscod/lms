import { computeSpeechMetrics, generateTemplate } from '../services/communicationEvalService';
import { achievementsEarned, ACHIEVEMENTS } from '../services/communicationGamificationService';

describe('communicationEvalService.computeSpeechMetrics', () => {
  it('computes words-per-minute from transcript length and duration', () => {
    const transcript = Array.from({ length: 150 }, () => 'word').join(' '); // 150 words
    const m = computeSpeechMetrics(transcript, 60); // 1 minute
    expect(m.wordCount).toBe(150);
    expect(m.wordsPerMinute).toBe(150);
    expect(m.speakingSpeed.status).toBe('GOOD');
  });

  it('flags too-fast and too-slow speaking speeds', () => {
    const fast = computeSpeechMetrics(Array.from({ length: 200 }, () => 'w').join(' '), 60);
    expect(fast.speakingSpeed.status).toBe('TOO_FAST');
    const slow = computeSpeechMetrics(Array.from({ length: 50 }, () => 'w').join(' '), 60);
    expect(slow.speakingSpeed.status).toBe('TOO_SLOW');
  });

  it('counts filler words case-insensitively without partial matches', () => {
    const m = computeSpeechMetrics('So um I actually basically like um think that umbrella is fine', 30);
    expect(m.fillerWords.total).toBeGreaterThanOrEqual(5); // so, um, actually, basically, like, um
    expect(m.fillerWords.words['um']).toBe(2);
    // "umbrella" must NOT be counted as the filler "um"
    expect(m.fillerWords.words['umbrella']).toBeUndefined();
  });

  it('handles an empty transcript safely (no divide-by-zero)', () => {
    const m = computeSpeechMetrics('', 0);
    expect(m.wordCount).toBe(0);
    expect(Number.isFinite(m.wordsPerMinute)).toBe(true);
    expect(m.fillerWords.total).toBe(0);
  });

  it('detects a repeated 3-word phrase', () => {
    const m = computeSpeechMetrics('my main project is my main project is great', 20);
    expect(m.repeatedPhrases.length).toBeGreaterThan(0);
  });
});

describe('communicationEvalService.generateTemplate', () => {
  it('uses profile facts when present', () => {
    const t = generateTemplate({ fullName: 'Asha', currentCity: 'Hyderabad', degree: 'B.Tech', primarySkills: ['Java', 'SQL'] } as any);
    expect(t).toContain('Asha');
    expect(t).toContain('Hyderabad');
    expect(t).toContain('Java, SQL');
  });
  it('falls back to placeholders when profile is empty', () => {
    const t = generateTemplate(null);
    expect(t).toContain('[Your Name]');
    expect(t).toContain('[Your Skills]');
  });
});

describe('communicationGamificationService.achievementsEarned', () => {
  const good = { total: 1 } as any;
  const paceGood = { wordsPerMinute: 130, status: 'GOOD', recommendedRange: '120-150' };

  it('awards first_step on the very first completed day', () => {
    const earned = achievementsEarned({ totalCompletedDays: 1, longestStreak: 1 }, { overallScore: 40, projectExplanationScore: 0, fillerWords: { total: 5 } as any, speakingSpeed: { ...paceGood, status: 'TOO_FAST' } });
    expect(earned).toContain('first_step');
    expect(earned).not.toContain('three_day');
    expect(earned).not.toContain('confident');
  });

  it('awards streak + score + skill badges when thresholds are met', () => {
    const earned = achievementsEarned(
      { totalCompletedDays: 30, longestStreak: 30 },
      { overallScore: 96, projectExplanationScore: 92, fillerWords: good, speakingSpeed: paceGood }
    );
    ['first_step', 'three_day', 'seven_day', 'thirty_day', 'confident', 'interview_ready', 'elite', 'filler_free', 'perfect_pace', 'project_expert']
      .forEach((code) => expect(earned).toContain(code));
  });

  it('never returns an unknown achievement code', () => {
    const codes = new Set(ACHIEVEMENTS.map((a) => a.code));
    const earned = achievementsEarned({ totalCompletedDays: 10, longestStreak: 8 }, { overallScore: 85, projectExplanationScore: 50, fillerWords: { total: 4 } as any, speakingSpeed: { ...paceGood, status: 'TOO_FAST' } });
    earned.forEach((c) => expect(codes.has(c)).toBe(true));
  });
});
