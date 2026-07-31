import mongoose from 'mongoose';
import User from '../models/User';
import DailyChallenge from '../models/DailyChallenge';
import CommunicationAttempt from '../models/CommunicationAttempt';
import { LabTrackAssignment, LabKind } from '../models/LabTrack';
import { resolveLabDay, expectedDaysSoFar, ymdIn } from './labTrackService';

/**
 * Decides whether a student is held at the door until they finish today's lab work.
 *
 * Three rules shape everything here, and each exists because the obvious version of a
 * mandatory daily gate does real harm:
 *
 *  1. `neverBlock` areas are never gated. A student must not lose a scheduled exam, a
 *     live class, an assignment deadline, a fee payment or access to support because a
 *     microphone failed. Those losses are irreversible; a delayed lesson is not.
 *  2. An AI failure releases the gate. Communication Lab depends on Whisper and Claude.
 *     Without this, one API outage locks every student out of the entire platform at
 *     once, and the platform cannot tell them why.
 *  3. Finishing today's item releases the student for the rest of the day, no matter how
 *     many days they previously missed. Otherwise someone off sick for a week returns to
 *     a wall they cannot climb, which produces dropouts rather than practice.
 */

export type GateMode = 'off' | 'banner' | 'interstitial' | 'block';

export interface LabGateItem {
  lab: LabKind;
  dayIndex: number | null;
  contentId: mongoose.Types.ObjectId | null;
  completedToday: boolean;
  missedDays: number;
}

export interface LabGateResult {
  mode: GateMode;
  blockedAreas: string[];
  neverBlock: string[];
  pending: LabGateItem[];      // what still has to be done today
  bypassed?: 'admin' | 'ai_failure' | 'completed';
  reason?: string;
}

const OPEN: LabGateResult = { mode: 'off', blockedAreas: [], neverBlock: [], pending: [] };

/** Did the student finish this lab's work today? */
async function completedToday(
  lab: LabKind, tenantId: string, studentId: mongoose.Types.ObjectId, dayKey: string,
): Promise<boolean> {
  if (lab === 'thinking') {
    const row = await DailyChallenge.findOne({
      tenantId, studentId, date: dayKey, status: { $in: ['submitted', 'solved'] },
    }).select('_id').lean();
    return !!row;
  }
  const tOid = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
  if (!tOid) return false;
  const start = new Date(`${dayKey}T00:00:00.000Z`);
  const end = new Date(`${dayKey}T23:59:59.999Z`);
  const row = await CommunicationAttempt.findOne({
    tenantId: tOid, studentId, status: 'completed',
    $or: [{ practiceDate: dayKey }, { createdAt: { $gte: start, $lte: end } }],
  }).select('_id').lean();
  return !!row;
}

/** How many expected days this student has not completed. Drives escalation. */
async function missedCount(
  lab: LabKind, tenantId: string, studentId: mongoose.Types.ObjectId, assignment: any,
): Promise<number> {
  const expected = expectedDaysSoFar(assignment);
  let done = 0;
  if (lab === 'thinking') {
    done = await DailyChallenge.countDocuments({
      tenantId, studentId, status: { $in: ['submitted', 'solved'] },
    });
  } else {
    const tOid = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
    if (tOid) done = await CommunicationAttempt.countDocuments({ tenantId: tOid, studentId, status: 'completed' });
  }
  return Math.max(0, expected - done);
}

/** Escalation table → the mode for this many missed days. */
function modeForMissed(gate: any, missed: number): GateMode {
  if (gate?.mode === 'off') return 'off';
  const steps = [...(gate?.escalation || [])].sort((a: any, b: any) => a.missedDays - b.missedDays);
  let mode: GateMode = 'off';
  for (const s of steps) if (missed >= s.missedDays) mode = s.mode;
  // A configured ceiling is a ceiling: an admin who set 'banner' never gets 'block'.
  const rank: GateMode[] = ['off', 'banner', 'interstitial', 'block'];
  const cap = gate?.mode as GateMode;
  return rank.indexOf(mode) > rank.indexOf(cap) ? cap : mode;
}

/**
 * The gate for one student, across both labs. Returns the STRONGEST mode any lab
 * demands, and the union of areas to hold shut.
 */
export async function resolveLabGate(studentId: string, tenantId: string): Promise<LabGateResult> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return OPEN;
  const sOid = new mongoose.Types.ObjectId(studentId);

  const user: any = await User.findById(sOid).select('batchId').lean();
  if (!user?.batchId) return OPEN;

  const assignments: any[] = await LabTrackAssignment.find({
    tenantId, batchId: user.batchId, status: 'active',
  }).lean();
  if (!assignments.length) return OPEN;

  const rank: GateMode[] = ['off', 'banner', 'interstitial', 'block'];
  let strongest: GateMode = 'off';
  const pending: LabGateItem[] = [];
  const blocked = new Set<string>();
  const never = new Set<string>();
  let bypass: LabGateResult['bypassed'];

  for (const a of assignments) {
    (a.gate?.neverBlock || []).forEach((x: string) => never.add(x));

    // Admin release for this student — a broken mic must not cost them the platform.
    if ((a.gate?.bypassStudentIds || []).some((id: any) => String(id) === studentId)) {
      bypass = 'admin';
      continue;
    }
    if (a.gate?.mode === 'off') continue;

    const resolved: any = await resolveLabDay(tenantId, String(user.batchId), a.lab);
    // Nothing due today (rest day, plan not started, empty track) → nothing to hold.
    if (!resolved?.contentId) continue;

    const tz = a.window?.tz || 'Asia/Kolkata';
    const dayKey = ymdIn(new Date(), tz);
    const done = await completedToday(a.lab, tenantId, sOid, dayKey);
    if (done) { bypass = bypass || 'completed'; continue; }

    const missed = await missedCount(a.lab, tenantId, sOid, a);
    const mode = modeForMissed(a.gate, missed);

    pending.push({ lab: a.lab, dayIndex: resolved.dayIndex, contentId: resolved.contentId, completedToday: false, missedDays: missed });
    if (rank.indexOf(mode) > rank.indexOf(strongest)) strongest = mode;
    (a.gate?.blockedAreas || []).forEach((x: string) => blocked.add(x));
  }

  // Every lab satisfied → open, whatever the history.
  if (!pending.length) {
    return { ...OPEN, neverBlock: [...never], bypassed: bypass, reason: bypass === 'admin' ? 'admin_bypass' : 'all_done' };
  }

  return {
    mode: strongest,
    blockedAreas: strongest === 'block' ? [...blocked].filter(x => !never.has(x)) : [],
    neverBlock: [...never],
    pending,
  };
}

/**
 * Release the gate when evaluation itself is broken. Called by the AI paths on failure:
 * a student who recorded their answer has done their part, and the platform failing to
 * grade it is not their fault.
 */
export async function shouldBypassForAiFailure(tenantId: string, batchId: string): Promise<boolean> {
  const a: any = await LabTrackAssignment.findOne({
    tenantId, batchId: new mongoose.Types.ObjectId(batchId), lab: 'communication', status: 'active',
  }).select('gate.bypassOnAiFailure').lean();
  return a?.gate?.bypassOnAiFailure !== false;
}

/** Is this area held shut for this student right now? */
export function isAreaBlocked(gate: LabGateResult, area: string): boolean {
  if (gate.mode !== 'block') return false;
  if (gate.neverBlock.includes(area)) return false;
  return gate.blockedAreas.includes(area);
}
