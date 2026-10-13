/**
 * Roadmap V2 — the foundation gate between the bridge and the year.
 *
 * The day ladder already stops a learner skipping the bridge: each day waits for the one before
 * it. But a day counts as done once its checks are ATTEMPTED, pass or fail — so a learner could
 * fail every bridge check and walk into Year 2 regardless. The gate closes that: the year's first
 * day opens only when every bridge check has been PASSED.
 *
 * Nobody is stuck for ever. A check failed MAX_GATE_ATTEMPTS times stops holding the gate and is
 * flagged instead, so a mentor can help with that topic while the learner carries on. Revision
 * checks never hold the gate: they practise what the learner already proved.
 *
 * Pure: the attempts come in, the decision goes out.
 */
export const MAX_GATE_ATTEMPTS = 3;

export interface GateCheck {
  quizId: string;
  title: string;
  /** The bridge day it sits on, so the learner can be sent straight back to it. */
  dayNumber: number;
  attempts: number;
  passed: boolean;
}

export interface GateDecision {
  open: boolean;
  /** Not passed yet, and still holding the gate. */
  pending: GateCheck[];
  /** Failed MAX_GATE_ATTEMPTS times: no longer holding the gate, but a mentor should help. */
  flagged: GateCheck[];
  passed: number;
  total: number;
}

export function gateDecision(checks: GateCheck[], maxAttempts = MAX_GATE_ATTEMPTS): GateDecision {
  const notPassed = checks.filter(c => !c.passed);
  const flagged = notPassed.filter(c => c.attempts >= maxAttempts);
  const pending = notPassed.filter(c => c.attempts < maxAttempts).sort((a, b) => a.dayNumber - b.dayNumber);
  return { open: pending.length === 0, pending, flagged, passed: checks.length - notPassed.length, total: checks.length };
}
