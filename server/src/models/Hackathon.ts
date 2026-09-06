import mongoose, { Document, Schema } from 'mongoose';

/**
 * Hackathon — one event, and the rules a public team registration is judged against.
 *
 * DELIBERATELY SEPARATE FROM TechBattle. A battle is an exam: it owns a quizId, an exam
 * token per candidate, proctoring and a leaderboard, and it registers ONE person per row.
 * A hackathon registers a TEAM and takes a fee. Bending TechBattle to cover both would put
 * two products in one model and make every field mean "depending".
 *
 * EVERY LIMIT A PUBLIC FORM IS CHECKED AGAINST LIVES HERE, not in the controller. The form
 * is on another origin (codebegun.com) and can send anything at all, so team size, the
 * college list, the fee, the registration window and the capacity all have to be facts the
 * server holds rather than values the browser reports.
 */

export type HackathonStatus = 'draft' | 'published' | 'closed';

export interface IHackathonPrizes {
  first: string;
  second: string;
  third: string;
  /** Anything else worth naming — "Best UI ₹5,000", participation certificates. */
  others: string[];
}

export interface IHackathon extends Document {
  tenantId: string;
  title: string;
  /** Public URL segment, unique per tenant. */
  slug: string;
  description: string;
  /** How the event runs — rounds, judging, what to bring. Free HTML from the admin. */
  process: string;
  venue: string;
  bannerUrl: string;

  /**
   * When it runs. Both are full timestamps, so "date" and "time" are one fact rather than
   * two fields that can disagree — which is what happens the first time an admin edits one
   * of them.
   */
  startAt: Date;
  endAt?: Date | null;

  prizes: IHackathonPrizes;

  /**
   * What a TEAM pays, in rupees. Per team, not per head.
   *
   * Zero means free, and free is not "an order for ₹0" — the registration confirms on the
   * spot without ever touching the payment gateway. A gateway cannot charge nothing, and a
   * pending registration nobody can pay for would strand every team that made one.
   */
  feeInr: number;

  /** Both inclusive, and both counted INCLUDING the team lead. */
  minTeamSize: number;
  maxTeamSize: number;

  /** Null means no window — open whenever the hackathon is published. */
  registerOpensAt?: Date | null;
  registerClosesAt?: Date | null;
  /** 0 means unlimited. Counts CONFIRMED teams only. */
  maxTeams: number;

  /**
   * The college dropdown.
   *
   * `allowOtherCollege` is not a nicety. A student whose college is missing from the list
   * cannot register at all, and on a public funnel that is a silent, uncountable loss — so
   * the escape hatch is on by default and the free-text value is stored as given.
   */
  colleges: string[];
  allowOtherCollege: boolean;

  status: HackathonStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Team sizes the server will accept however the form was configured. */
export const TEAM_SIZE_BOUNDS = { min: 1, max: 10 };
/** Shipped defaults: two to six people, the lead included. */
export const DEFAULT_TEAM_SIZE = { min: 2, max: 6 };

const PrizeSchema = new Schema<IHackathonPrizes>({
  first:  { type: String, default: '' },
  second: { type: String, default: '' },
  third:  { type: String, default: '' },
  others: { type: [String], default: [] },
}, { _id: false });

const HackathonSchema = new Schema<IHackathon>({
  tenantId:    { type: String, required: true, index: true },
  title:       { type: String, required: true, trim: true },
  slug:        { type: String, required: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  process:     { type: String, default: '' },
  venue:       { type: String, default: '' },
  bannerUrl:   { type: String, default: '' },

  startAt: { type: Date, required: true },
  endAt:   { type: Date, default: null },

  prizes: { type: PrizeSchema, default: () => ({ first: '', second: '', third: '', others: [] }) },

  feeInr: { type: Number, default: 0, min: 0 },

  minTeamSize: { type: Number, default: DEFAULT_TEAM_SIZE.min },
  maxTeamSize: { type: Number, default: DEFAULT_TEAM_SIZE.max },

  registerOpensAt:  { type: Date, default: null },
  registerClosesAt: { type: Date, default: null },
  maxTeams:         { type: Number, default: 0, min: 0 },

  colleges:          { type: [String], default: [] },
  allowOtherCollege: { type: Boolean, default: true },

  status:    { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
  createdBy: { type: String },
}, { timestamps: true });

/** One slug per tenant — it is the public URL, so a duplicate is an ambiguous page. */
HackathonSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
/** The public listing: published events, soonest first. */
HackathonSchema.index({ tenantId: 1, status: 1, startAt: 1 });

export default mongoose.model<IHackathon>('Hackathon', HackathonSchema);
