/**
 * communicationSignalsService — what the TIMING of a recording says about hesitation.
 *
 * Whisper tells us when every word started and ended. The gaps between words, how long the
 * student took to begin, whether they stopped early, how often they restarted — these are
 * measured here, in plain code, never guessed by an AI. A "hesitation index" (0 calm … 100
 * frozen) summarises them.
 *
 * This is a proxy for nervousness, not a diagnosis: it says "long silences, restarts and a late
 * start", which is what an interviewer hears as nervous. Pure functions, no I/O.
 */

export interface TimedWord { word: string; start: number; end: number }

export interface HesitationSignals {
  hasTiming: boolean;            // false when the recording came back without word timings
  timeToFirstWordSec: number;
  pauseCount: number;            // silences of 1s or more between words
  longPauseCount: number;        // silences of 3s or more
  longestPauseSec: number;
  pausesPerMinute: number;
  silenceRatio: number;          // share of the recording that is silence between words (0–1)
  paceVariation: number;         // 0 steady … 1 rushes and stalls
  restarts: number;              // "I I", "the the", "sorry", "let me start again"
  fillerPer100Words: number;
  stoppedEarly: boolean;         // spoke for well under the time asked for
  hesitationIndex: number;       // 0 calm … 100 frozen
  label: 'calm' | 'some_hesitation' | 'high_hesitation' | 'freezing';
}

const PAUSE = 1;       // seconds of silence between two words that a listener notices
const LONG_PAUSE = 3;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

export function countRestarts(transcript: string): number {
  const t = ` ${(transcript || '').toLowerCase().replace(/[.,!?;:]/g, ' ')} `;
  const stutter = (t.match(/\s(\w+)\s\1\s/g) || []).filter((m) => !/\s(that|had|very|really)\s\1\s/.test(m)).length;
  const phrases = (t.match(/\s(sorry|let me start again|let me repeat|i mean|what i was saying)\s/g) || []).length;
  return stutter + phrases;
}

export function labelFor(index: number): HesitationSignals['label'] {
  if (index >= 75) return 'freezing';
  if (index >= 50) return 'high_hesitation';
  if (index >= 25) return 'some_hesitation';
  return 'calm';
}

export function computeSignals(opts: {
  words?: TimedWord[]; transcript: string; durationSec: number; targetSec?: number; fillerTotal?: number;
}): HesitationSignals {
  const { transcript, durationSec } = opts;
  const words = (opts.words || []).filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end >= w.start);
  const wordCount = (transcript || '').trim() ? transcript.trim().split(/\s+/).length : 0;
  const minutes = Math.max(durationSec / 60, 0.05);
  const fillerPer100Words = wordCount ? r1(((opts.fillerTotal || 0) / wordCount) * 100) : 0;
  const restarts = countRestarts(transcript);
  const stoppedEarly = !!opts.targetSec && durationSec > 0 && durationSec < opts.targetSec * 0.6;

  let timeToFirstWordSec = 0; let pauseCount = 0; let longPauseCount = 0; let longestPauseSec = 0; let silent = 0; let paceVariation = 0;
  const hasTiming = words.length >= 5;
  if (hasTiming) {
    timeToFirstWordSec = r1(words[0].start);
    const gaps: number[] = [];
    for (let i = 1; i < words.length; i++) gaps.push(Math.max(0, words[i].start - words[i - 1].end));
    for (const g of gaps) {
      if (g >= PAUSE) { pauseCount++; silent += g; }
      if (g >= LONG_PAUSE) longPauseCount++;
      if (g > longestPauseSec) longestPauseSec = g;
    }
    longestPauseSec = r1(longestPauseSec);
    // Pace per 5-word chunk: a steady speaker keeps it even; a nervous one rushes, then stalls.
    const rates: number[] = [];
    for (let i = 0; i + 5 <= words.length; i += 5) {
      const span = words[i + 4].end - words[i].start;
      if (span > 0.2) rates.push((5 / span) * 60);
    }
    if (rates.length >= 3) {
      const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
      const sd = Math.sqrt(rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length);
      paceVariation = r1(clamp01(sd / (mean || 1)));
    }
  }
  const silenceRatio = hasTiming && durationSec > 0 ? Math.round(clamp01(silent / durationSec) * 100) / 100 : 0;
  const pausesPerMinute = hasTiming ? r1(pauseCount / minutes) : 0;

  // Each part is capped, so one bad habit cannot hide the rest and one outlier cannot max the score.
  const parts = hasTiming
    ? 25 * clamp01(pausesPerMinute / 12) + 15 * clamp01(longestPauseSec / 6) + 20 * clamp01(silenceRatio / 0.4)
      + 10 * clamp01(timeToFirstWordSec / 6) + 10 * paceVariation
    : 0;
  const sum = parts + 10 * clamp01(fillerPer100Words / 12) + 5 * clamp01(restarts / 4) + (stoppedEarly ? 10 : 0);
  // Without word timings only the filler, restart and stopped-early parts are known (25 at most): scale them up.
  const index = Math.round(Math.min(100, hasTiming ? sum : (sum / 25) * 100));

  return {
    hasTiming, timeToFirstWordSec, pauseCount, longPauseCount, longestPauseSec, pausesPerMinute, silenceRatio, paceVariation,
    restarts, fillerPer100Words, stoppedEarly, hesitationIndex: index, label: labelFor(index),
  };
}
