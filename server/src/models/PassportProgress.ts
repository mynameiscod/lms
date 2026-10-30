import mongoose, { Document, Schema } from 'mongoose';
import { XpLedger } from './GamificationModels';
import { LEGACY_XP_EVENT_KEYS } from '../data/legacyXpPolicy';

export { LEGACY_XP_EVENT_KEYS };

/**
 * PassportProgress — a Passport member's journey state: daily-mission completions,
 * streak, and XP. Missions themselves are generated deterministically per day from
 * the student's assessment result (passportMissionService), so we only persist what
 * they've DONE, not the generated plan. One doc per student.
 */
export interface IPassportProgress extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  startDate: Date;                 // day 1 of the journey (membership activation)
  streak: number;
  longestStreak: number;
  lastCompletedDate?: string;      // 'YYYY-MM-DD' (tenant-local-ish, UTC date)
  xp: number;
  /** `answer` holds the member's written response for missions that have no surface
   *  to complete them on — the reflective ones. Absent for the rest. */
  completed: {
    day: number; key: string; at: Date;
    answer?: string;
    /** Coaching shown back to the member. */
    feedback?: string;
    /** Structured read of the answer — what makes these aggregatable at scale. */
    extract?: { targetRole?: string | null; skills?: string[]; gaps?: string[]; specificity?: number; flag?: string };
    /**
     * Present only on a mission that came from a CareerPilot roadmap (Module 10).
     *
     * WHY IT IS STORED RATHER THAN DERIVED. Roadmap progress has to be attributable to an
     * exact objective, and the only alternatives were matching on the mission's display
     * title — brittle, and explicitly ruled out — or re-deriving every past day's slate to
     * work out what a completion had been for. Recording the identity at the moment of
     * completion is cheaper and cannot drift.
     *
     * WHY IT CARRIES NO SCORE. `minutes` is the planned budget this slice consumed, which
     * is what roadmap progress counts. Nothing here feeds Skill DNA: finishing a task is
     * not evidence of a skill, and there is deliberately no field through which it could
     * become one.
     *
     * Absent on every legacy mission, which is what keeps the existing journey untouched.
     */
    careerpilot?: {
      roadmapId: string;
      objectiveSequence: number;
      skillKey: string;
      workType: string;
      minutes: number;
      /** Set when the mission came from an authored journey. Absent for legacy missions. */
      learningUnitId?: string;
      learningUnitVersion?: number;
      learningStepId?: string;
      resourceId?: string;
    };
  }[];
  /** Practice Lab attempts. `solvedProblems` makes the XP award idempotent per problem. */
  practice: { problemId: string; kind: string; passed: boolean; score: number; total: number; xp: number; at: Date }[];
  solvedProblems: string[];
  /** Every XP award, so the activity chart and daily goal are exact rather than inferred.
   *  Trimmed to the most recent 400 events — the dashboard only ever reads ~30 days. */
  xpLog: { at: Date; amount: number; source: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const PassportProgressSchema = new Schema<IPassportProgress>(
  {
    tenantId:  { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate: { type: Date, default: Date.now },
    streak:    { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String },
    xp:        { type: Number, default: 0 },
    completed: [{
      day: Number, key: String, at: { type: Date, default: Date.now },
      answer: String,
      feedback: String,
      extract: {
        targetRole: String,
        skills: [String],
        gaps: [String],
        specificity: Number,
        flag: String,
      },
      careerpilot: {
        roadmapId: String,
        objectiveSequence: Number,
        skillKey: String,
        workType: String,
        minutes: Number,
        // Journey provenance. Optional, so every completion written before the learning
        // layer existed stays valid exactly as it is.
        learningUnitId: String,
        learningUnitVersion: Number,
        learningStepId: String,
        resourceId: String,
      },
    }],
    practice: [{
      problemId: String, kind: String, passed: Boolean,
      score: Number, total: Number, xp: Number,
      at: { type: Date, default: Date.now },
    }],
    solvedProblems: [{ type: String }],
    xpLog: [{ at: { type: Date, default: Date.now }, amount: Number, source: String }],
  },
  { timestamps: true }
);

PassportProgressSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

/**
 * The leaderboard: this tenant's members, highest XP first.
 *
 * Without it the only usable index is the unique one above, which cannot serve the sort —
 * so every leaderboard read pulled the tenant's whole progress collection into memory and
 * sorted it there, against MongoDB's 32 MB in-memory sort limit. The read is already
 * capped at 500 rows; this makes the SCAN bounded too, so the work is proportional to the
 * page rather than to the membership.
 *
 * Non-unique, so building it over existing data cannot fail.
 */
PassportProgressSchema.index({ tenantId: 1, xp: -1 });

/**
 * XP added in memory by passportXpService.addXp (missions, practice, resume, problem delivery)
 * reaches the XP ledger here, when the progress doc is saved.
 *
 * Those awards only ever moved the balance and xpLog, so the ledger — which the weekly and
 * monthly leaderboards, the admin activity counts and rebuildXpBalance all read — missed them,
 * and the history never added up to the balance. The engine's own awards are not queued here;
 * they write the ledger themselves.
 */
type XpLogEntry = { at: Date; amount: number; source: string };

/**
 * Ledger rows for xpLog entries written by addXp. The key is the entry itself plus how many
 * identical entries came before it, so the same entry always gives the same key: the backfill
 * can be run again, and a row the hook already wrote is not written twice.
 */
export function legacyXpLedgerRows(progress: { _id: any; tenantId: string; studentId: any; xpLog?: XpLogEntry[] }) {
  const seen = new Map<string, number>();
  return (progress.xpLog || []).flatMap((e) => {
    const eventKey = LEGACY_XP_EVENT_KEYS[e.source];
    if (!eventKey || !(e.amount > 0)) return [];
    const at = new Date(e.at);
    const base = `${at.toISOString()}:${e.source}:${e.amount}`;
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return [{
      tenantId: progress.tenantId, studentId: progress.studentId, eventKey, sourceType: e.source,
      sourceId: String(progress._id), idempotencyKey: `xplog:${progress._id}:${base}:${n}`, amount: e.amount, at,
    }];
  });
}

/** Writes ledger rows, skipping any already there. A ledger failure never fails the save. */
export async function insertLegacyXpRows(rows: any[]): Promise<number> {
  if (!rows.length) return 0;
  try {
    const res = await XpLedger.insertMany(rows, { ordered: false });
    return res.length;
  } catch (e: any) {
    const inserted = e?.insertedDocs?.length ?? e?.result?.insertedCount ?? 0;
    const onlyDuplicates = (e?.writeErrors || []).every((w: any) => (w.code ?? w.err?.code) === 11000);
    if (!onlyDuplicates) console.error('[xp-ledger] legacy rows:', e?.message || e);
    return inserted;
  }
}

PassportProgressSchema.post('save', async function (doc: any) {
  const queued = Number(doc.$locals?.queuedLegacyXp) || 0;
  if (!queued) return;
  doc.$locals.queuedLegacyXp = 0;
  const rows = legacyXpLedgerRows(doc).slice(-queued);
  await insertLegacyXpRows(rows);
});

export default mongoose.model<IPassportProgress>('PassportProgress', PassportProgressSchema);
