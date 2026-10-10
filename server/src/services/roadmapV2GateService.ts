import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import QuizAttempt from '../models/QuizAttempt';
import { gateDecision, GateCheck, GateDecision } from '../data/roadmapV2GatePolicy';

/**
 * The foundation gate for one learner's Roadmap V2 journey (see roadmapV2GatePolicy).
 *
 * `applies` is false for a V1 journey and for a V2 journey with no bridge, and everything else is
 * then irrelevant: the gate only ever stands in front of the year's first day.
 */
export interface FoundationGate extends GateDecision {
  applies: boolean;
  /** The year's first day — the only day the gate stands in front of. */
  firstYearDay: number | null;
}

const NO_GATE: FoundationGate = { applies: false, firstYearDay: null, open: true, pending: [], flagged: [], passed: 0, total: 0 };

export async function foundationGateFor(curriculumId: string | mongoose.Types.ObjectId, studentId: string): Promise<FoundationGate> {
  const cur = await LearningCurriculum.findById(curriculumId).select('roadmapVersion').lean() as any;
  if (cur?.roadmapVersion !== 'ROADMAP_V2') return NO_GATE;

  const days = await DayPlan.find({ curriculumId, phase: { $in: ['BRIDGE', 'YEAR'] } })
    .select('dayNumber phase items.kind items.sourceId items.contentTitle').lean() as any[];
  const bridge = days.filter(d => d.phase === 'BRIDGE');
  const yearDays = days.filter(d => d.phase === 'YEAR').map(d => Number(d.dayNumber));
  if (!bridge.length || !yearDays.length) return { ...NO_GATE, firstYearDay: yearDays.length ? Math.min(...yearDays) : null };

  const checks = new Map<string, GateCheck>();
  for (const d of bridge) {
    for (const it of (d.items || []) as any[]) {
      if (it.kind !== 'quiz' || !it.sourceId) continue;
      const id = String(it.sourceId);
      if (!checks.has(id)) checks.set(id, { quizId: id, title: String(it.contentTitle || 'Checkpoint'), dayNumber: Number(d.dayNumber), attempts: 0, passed: false });
    }
  }
  if (checks.size) {
    const attempts = await QuizAttempt.find({ studentId: String(studentId), quizId: { $in: [...checks.keys()] }, status: { $in: ['submitted', 'grading'] } })
      .select('quizId passed').lean() as any[];
    for (const a of attempts) {
      const c = checks.get(String(a.quizId));
      if (!c) continue;
      c.attempts += 1;
      if (a.passed) c.passed = true;
    }
  }
  const decision = gateDecision([...checks.values()]);
  if (decision.flagged.length) {
    console.warn(`[roadmap-v2 gate] ${studentId}: ${decision.flagged.length} bridge check(s) failed ${decision.flagged[0].attempts}+ times — mentor follow-up: ${decision.flagged.map(f => f.title).join('; ')}`);
  }
  return { ...decision, applies: true, firstYearDay: Math.min(...yearDays) };
}

/** The refusal a day endpoint sends while the gate is closed. */
export const gateRefusal = (gate: FoundationGate) => ({
  reason: 'FOUNDATION_NOT_VALIDATED',
  message: `Pass your foundation checks to open your year. ${gate.pending.length} still to pass.`,
  gate: { passed: gate.passed, total: gate.total, pending: gate.pending, flagged: gate.flagged },
});
