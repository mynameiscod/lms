import mongoose, { Schema, Document } from 'mongoose';

/**
 * Every step a person takes through CareerPilot, from the first page view to the last click.
 *
 * WHY NOT StudentActivityLog. That model requires a userId and records 4xx/5xx failures plus a
 * whitelist of learning actions — it answers "what went wrong for this student". This answers a
 * different question: what does a person actually DO here, in order, including the part before
 * they have an account. A college evaluating the portal opens a URL, reads a page, starts a
 * signup, abandons it. None of that has a userId, so none of it can be written to a collection
 * that requires one, and the most interesting part of the funnel — where people leave — would
 * be exactly the part that is invisible.
 *
 * VISITOR FIRST, USER SECOND. visitorId is minted by the browser on first arrival and kept in
 * localStorage. It is what stitches "opened the landing page" to "verified an OTP" to "finished
 * an assessment" into one story, because the first two happen before there is a user to attribute
 * them to. userId is filled in from the moment it is known and never backfilled onto earlier rows:
 * a row records what was true when it was written, and rewriting history to look tidier would make
 * the timeline lie about when we learned who somebody was.
 *
 * NOT ANALYTICS, AND NOT A SESSION RECORDER. There is no cursor tracking, no keystrokes, no form
 * contents. What is stored is the route, the action, whether it worked, how long it took, and the
 * device — the things an admin needs to answer "where did this person get stuck".
 *
 * SELF-PRUNING. 90 days, matching StudentActivityLog, on a TTL index. This collection grows much
 * faster than that one because it records successes as well as failures, and an activity trail
 * nobody has looked at in three months is cost without a reader.
 */

/** What kind of thing happened. Kept small on purpose — a long enum becomes a taxonomy nobody honours. */
export type ActivityKind =
  | 'page'      // a screen was opened (client-side routing, so the server never sees these)
  | 'action'    // the person did something deliberate: started an assessment, submitted an answer
  | 'api'       // a request reached the server
  | 'error';    // something failed, whether the server said so or the browser did

export const ACTIVITY_KINDS: ActivityKind[] = ['page', 'action', 'api', 'error'];

/** Did it work? Separate from HTTP status, because a 200 that returns "not eligible" is not a success to a person. */
export type ActivityOutcome = 'success' | 'failure' | 'info';
export const ACTIVITY_OUTCOMES: ActivityOutcome[] = ['success', 'failure', 'info'];

export interface IActivityDevice {
  browser?: string;         // Chrome, Safari, Edge, Firefox, Samsung Internet…
  browserVersion?: string;
  os?: string;              // Windows, Android, iOS, macOS…
  deviceType?: string;      // desktop | mobile | tablet | bot | unknown
  screen?: string;          // "1920x1080", as the browser reports it
  language?: string;
  timezone?: string;
}

export interface ICareerPilotActivity extends Document {
  tenantId: mongoose.Types.ObjectId;
  visitorId: string;
  sessionId?: string;
  userId?: mongoose.Types.ObjectId;
  /** Denormalised so a timeline reads without a join, and still reads after the user is deleted. */
  personName?: string;
  personEmail?: string;
  kind: ActivityKind;
  name: string;
  route?: string;
  method?: string;
  status?: number;
  outcome: ActivityOutcome;
  errorMessage?: string;
  durationMs?: number;
  meta?: any;
  device?: IActivityDevice;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  createdAt: Date;
}

const DeviceSchema = new Schema<IActivityDevice>({
  browser:        { type: String },
  browserVersion: { type: String },
  os:             { type: String },
  deviceType:     { type: String },
  screen:         { type: String },
  language:       { type: String },
  timezone:       { type: String },
}, { _id: false });

const CareerPilotActivitySchema = new Schema<ICareerPilotActivity>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    // Required, unlike userId: something must identify the trail, and before signup this is all there is.
    visitorId:    { type: String, required: true, index: true },
    sessionId:    { type: String },
    userId:       { type: Schema.Types.ObjectId, ref: 'User', index: true },
    personName:   { type: String },
    personEmail:  { type: String },
    kind:         { type: String, enum: ACTIVITY_KINDS, required: true, index: true },
    name:         { type: String, required: true },
    route:        { type: String },
    method:       { type: String },
    status:       { type: Number },
    outcome:      { type: String, enum: ACTIVITY_OUTCOMES, default: 'info', index: true },
    errorMessage: { type: String },
    durationMs:   { type: Number },
    meta:         { type: Schema.Types.Mixed },
    device:       { type: DeviceSchema },
    ip:           { type: String },
    userAgent:    { type: String },
    referrer:     { type: String },
    createdAt:    { type: Date, default: Date.now },
  },
  { timestamps: false }
);

/** The two reads the screen makes: one visitor's story, and the newest activity across a tenant. */
CareerPilotActivitySchema.index({ tenantId: 1, visitorId: 1, createdAt: 1 });
CareerPilotActivitySchema.index({ tenantId: 1, createdAt: -1 });
/** Finding a known person's trail without knowing which browsers they used. */
CareerPilotActivitySchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
/** 90 days, then gone. */
CareerPilotActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<ICareerPilotActivity>('CareerPilotActivity', CareerPilotActivitySchema);
