/**
 * Where a CareerPilot member came from, kept from the first click to the paid order.
 *
 * ── WHY THIS IS NOT JUST "READ THE QUERY STRING" ──────────────────────────────────────────
 *
 * The marketing site sends somebody to /careerpilot/join with campaign parameters attached. By
 * the time they matter — an account exists, an order is created, a payment settles — the query
 * string is long gone: the join flow redirects, the router normalises, a login bounces them
 * through another screen. Attribution has to be captured at the door and carried.
 *
 * ── FIRST TOUCH IS WRITTEN ONCE AND NEVER AGAIN ───────────────────────────────────────────
 *
 * The campaign that first brought somebody in is the one that earned the introduction, and it
 * is the number a marketing team is actually spending against. It is written the first time a
 * tagged visit arrives and is never overwritten — not by a later campaign, not by a direct
 * visit, not by a retargeting click that would otherwise take credit for work the first ad did.
 *
 * `last_touch` moves, because "what were they looking at most recently" is a different and also
 * useful question.
 *
 * ── AN UNTAGGED VISIT ERASES NOTHING ──────────────────────────────────────────────────────
 *
 * Somebody types the address directly, or follows a bookmark, or comes back from an email with
 * no parameters at all. That is not new attribution, it is the absence of it — and the naive
 * implementation of this file writes an empty object over a real campaign and loses the sale's
 * provenance. Nothing is written unless at least one real parameter is present, and an empty
 * value never replaces a stored one.
 *
 * ── IT NEVER CARRIES ANYTHING SENSITIVE ───────────────────────────────────────────────────
 *
 * Only the nine fields below are read. A query string can contain a token, an OTP, an email —
 * anything somebody appended — and a utility that stored the whole of it would put secrets in
 * localStorage and then post them to the server. The allow-list is the point, not a formality.
 */

export const ATTRIBUTION_STORAGE_KEY = 'careerpilot_attribution_v1';

/**
 * The only parameters that are ever read.
 *
 * snake_case throughout, matching what the marketing site sends and what an analytics event
 * expects, so the same object travels from the URL to the database to a future
 * `payment_success` payload without anybody renaming fields in the middle and getting one wrong.
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

export type AttributionTouch = Partial<Record<AttributionField, string>> & {
  captured_at?: string;
};

export interface CareerPilotAttribution {
  first_touch?: AttributionTouch;
  last_touch?: AttributionTouch;
}

/**
 * One value's worth of defence.
 *
 * A parameter arrives from a URL anybody can edit, so it is trimmed, capped, and rejected if it
 * is empty. The cap is generous for a campaign name and far below anything that could be used
 * to smuggle a payload through a field the server will later store.
 */
const MAX_VALUE_LENGTH = 300;

function cleanValue(raw: string | null): string | undefined {
  if (raw == null) return undefined;
  const v = String(raw).trim();
  if (!v) return undefined;
  return v.slice(0, MAX_VALUE_LENGTH);
}

/** The tagged parameters present in a query string, or an empty object when there are none. */
export function readAttributionFromSearch(search: string): AttributionTouch {
  const out: AttributionTouch = {};
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    return out;
  }
  for (const field of ATTRIBUTION_FIELDS) {
    const value = cleanValue(params.get(field));
    if (value) out[field] = value;
  }
  return out;
}

const hasAnyValue = (touch: AttributionTouch): boolean =>
  ATTRIBUTION_FIELDS.some(f => !!touch[f]);

/**
 * Reading and writing both tolerate storage being unavailable.
 *
 * Private browsing, a browser configured to block site data, and an embedded webview all throw
 * on access rather than returning null. Attribution is worth having and never worth breaking a
 * signup for, so every failure here is silent and the flow continues without it.
 */
function readStore(): CareerPilotAttribution {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as CareerPilotAttribution : {};
  } catch {
    return {};
  }
}

function writeStore(value: CareerPilotAttribution): void {
  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable — see above */
  }
}

/**
 * Capture the campaign parameters on the current URL, if there are any.
 *
 * Safe to call as often as you like: it is idempotent for a given URL, writes nothing when the
 * visit is untagged, and never lowers the quality of what is already stored. Returns what is
 * stored afterwards, so a caller that wants to act on it does not need a second read.
 */
export function captureCareerPilotAttribution(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): CareerPilotAttribution {
  const incoming = readAttributionFromSearch(search);
  const stored = readStore();

  // An untagged visit is the absence of attribution, not new attribution. Leave everything.
  if (!hasAnyValue(incoming)) return stored;

  const touch: AttributionTouch = { ...incoming, captured_at: new Date().toISOString() };

  const next: CareerPilotAttribution = {
    // Written once. A later campaign, however recent, does not get to claim the introduction.
    first_touch: stored.first_touch && hasAnyValue(stored.first_touch) ? stored.first_touch : touch,
    /**
     * REPLACED WHOLE, never merged field by field.
     *
     * A touch is one arrival. Merging the new parameters over the old ones produces a record of
     * a visit that never happened: a Google link carrying no utm_content would keep the Meta ad
     * creative from a previous click, and a report would show "Google campaign oct26, creative
     * skillgap_reel_01" — an ad that does not exist.
     *
     * The cost is that a link naming fewer parameters records fewer parameters. That is a gap,
     * and a gap is always a better failure than a fabrication: one is visibly missing, the other
     * is confidently wrong and nothing downstream can tell.
     *
     * This also matches mergeAttribution on the server, which already replaced. Two rules for one
     * concept meant the answer depended on whether a visit reached the database before or after
     * the browser wrote it down.
     */
    last_touch: touch,
  };

  writeStore(next);
  return next;
}

/** What is stored now. Returns an empty object when nothing was ever captured. */
export function getCareerPilotAttribution(): CareerPilotAttribution {
  return readStore();
}

/**
 * The attribution to send with a request, or undefined when there is none.
 *
 * Returning undefined rather than an empty object matters: the server treats a present-but-empty
 * attribution as something to store, and a row full of empty objects is worse than a row with
 * nothing, because it looks like it was answered.
 */
export function attributionForSubmit(): CareerPilotAttribution | undefined {
  const stored = readStore();
  const hasFirst = stored.first_touch && hasAnyValue(stored.first_touch);
  const hasLast = stored.last_touch && hasAnyValue(stored.last_touch);
  if (!hasFirst && !hasLast) return undefined;
  return stored;
}

/**
 * Flatten to the shape an analytics event wants.
 *
 * ONE TOUCH, WHOLE. Not a field-by-field blend of the two.
 *
 * The obvious version of this takes `last_touch[field] || first_touch[field]`, which looks like
 * sensible defaulting and is the same fabrication the store itself was fixed to avoid: a Google
 * touch with no utm_content borrows the Meta creative from the first click, and the event says
 * campaign oct26 ran an ad that only ever ran on Meta. An analytics warehouse cannot tell that
 * happened, and nobody reading the funnel later has any reason to doubt it.
 *
 * So the most recent arrival is reported as it was. Where there is no last touch — the account
 * predates this, or storage was cleared — the first touch is reported whole instead, which is a
 * different event honestly labelled rather than two events averaged.
 *
 * The first touch is available separately under `first_*` for anyone who wants to attribute the
 * introduction and the conversion in the same event, which is the real reason people reach for
 * the blend.
 */
export function attributionForAnalytics(): Record<string, string> {
  const { first_touch = {}, last_touch = {} } = readStore();
  const source = hasAnyValue(last_touch) ? last_touch : first_touch;

  const out: Record<string, string> = {};
  for (const field of ATTRIBUTION_FIELDS) {
    const value = source[field];
    if (value) out[field] = value;
  }
  for (const field of ATTRIBUTION_FIELDS) {
    const value = first_touch[field];
    if (value) out[`first_${field}`] = value;
  }
  return out;
}

/** Test seam. Never called by the application. */
export function __clearCareerPilotAttribution(): void {
  try {
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
