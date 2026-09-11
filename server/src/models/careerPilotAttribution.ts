import { Schema } from 'mongoose';

/**
 * Where a CareerPilot member came from, as it is stored.
 *
 * ── ONE SHAPE, THREE PLACES ───────────────────────────────────────────────────────────────
 *
 * The same sub-schema is embedded on the pending signup, on the member's passport and on the
 * order. That is deliberate and it is not duplication of the kind worth avoiding: each is a
 * SNAPSHOT taken at a different moment, and the questions they answer are different.
 *
 *   pending signup   which campaign produced this lead, before there is an account to hang it on
 *   passport         which campaign produced this member, for the life of the account
 *   order            which campaign produced THIS payment
 *
 * Storing it only on the user would answer the last question wrongly the moment somebody
 * arrives from one campaign, does not buy, returns months later through another, and then pays:
 * the order has to carry what was true when the order was made, not what the account says today.
 *
 * ── snake_case, ON PURPOSE ────────────────────────────────────────────────────────────────
 *
 * These are the names the marketing site sends and the names an analytics event expects. Keeping
 * them identical from the URL to the database means nobody renames a field in the middle and
 * gets one of them wrong — which is the failure that makes a campaign report quietly incomplete
 * rather than obviously broken.
 *
 * ── IT IS AN ALLOW-LIST, NOT A BAG ────────────────────────────────────────────────────────
 *
 * A query string carries whatever anybody appended, including tokens and email addresses. A
 * schema that accepted Mixed here would store them and then hand them to whatever reads
 * attribution later. Only these nine fields exist, and `sanitiseAttribution` below is what the
 * controllers use so nothing else can arrive from a client.
 */

export const ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
  'landing_page',
  'entry_path',
] as const;

export type AttributionField = typeof ATTRIBUTION_FIELDS[number];

export interface IAttributionTouch {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  landing_page?: string;
  entry_path?: string;
  captured_at?: Date;
}

export interface ICareerPilotAttribution {
  /** The campaign that earned the introduction. Written once, never revised. */
  first_touch?: IAttributionTouch;
  /** The most recent campaign seen. Moves. */
  last_touch?: IAttributionTouch;
}

const AttributionTouchSchema = new Schema<IAttributionTouch>(
  {
    utm_source:   { type: String, trim: true },
    utm_medium:   { type: String, trim: true },
    utm_campaign: { type: String, trim: true },
    utm_content:  { type: String, trim: true },
    utm_term:     { type: String, trim: true },
    gclid:        { type: String, trim: true },
    fbclid:       { type: String, trim: true },
    landing_page: { type: String, trim: true },
    entry_path:   { type: String, trim: true },
    captured_at:  { type: Date },
  },
  { _id: false },
);

export const CareerPilotAttributionSchema = new Schema<ICareerPilotAttribution>(
  {
    first_touch: { type: AttributionTouchSchema, default: undefined },
    last_touch:  { type: AttributionTouchSchema, default: undefined },
  },
  { _id: false },
);

/** Generous for a campaign name, far too small to smuggle anything through. */
const MAX_VALUE_LENGTH = 300;

function sanitiseTouch(raw: any): IAttributionTouch | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: IAttributionTouch = {};
  let any = false;

  for (const field of ATTRIBUTION_FIELDS) {
    const value = raw[field];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim().slice(0, MAX_VALUE_LENGTH);
    if (!trimmed) continue;
    (out as any)[field] = trimmed;
    any = true;
  }
  if (!any) return undefined;

  /**
   * The client's timestamp is read but never trusted as authoritative.
   *
   * It is useful — it says when the browser first saw the campaign, which can be long before
   * the account exists — but it comes from a machine whose clock anybody can set. An
   * unparseable or absurd value falls back to now rather than being stored as given.
   */
  const at = raw.captured_at ? new Date(raw.captured_at) : null;
  out.captured_at = at && !Number.isNaN(at.getTime()) && at.getTime() < Date.now() + 86400000
    ? at
    : new Date();

  return out;
}

/**
 * Turn whatever a client sent into something safe to store, or undefined.
 *
 * Undefined rather than an empty object, because a row holding `{ first_touch: {}, last_touch:
 * {} }` looks answered and is not — and a later report counting "members with attribution"
 * would count it.
 */
export function sanitiseAttribution(raw: any): ICareerPilotAttribution | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const first = sanitiseTouch(raw.first_touch);
  const last = sanitiseTouch(raw.last_touch);
  if (!first && !last) return undefined;
  return {
    ...(first ? { first_touch: first } : {}),
    ...(last ? { last_touch: last } : {}),
  };
}

/**
 * Merge an incoming attribution onto what is already stored.
 *
 * The same rule the browser applies, enforced again here because the server cannot assume the
 * browser did it: first touch survives, last touch moves. A member who cleared their storage and
 * arrived again through a new ad must not overwrite the first touch the account already holds.
 */
export function mergeAttribution(
  stored: ICareerPilotAttribution | undefined | null,
  incoming: ICareerPilotAttribution | undefined,
): ICareerPilotAttribution | undefined {
  if (!incoming) return stored || undefined;
  if (!stored) return incoming;

  const firstAlready = stored.first_touch
    && ATTRIBUTION_FIELDS.some(f => !!(stored.first_touch as any)[f]);

  return {
    first_touch: firstAlready ? stored.first_touch : (incoming.first_touch || stored.first_touch),
    last_touch: incoming.last_touch || stored.last_touch,
  };
}
