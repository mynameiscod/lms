/**
 * careerPilotActivityService — writing and reading the CareerPilot activity trail.
 *
 * TWO RULES GOVERN EVERYTHING HERE.
 *
 * Recording must never break the thing it is recording. Every write is best-effort and
 * swallowed: an activity row is a diagnostic, and a member who cannot start their assessment
 * because the audit trail had a bad day is a far worse outcome than a missing row. Nothing in
 * this file is awaited by a request that a person is waiting on.
 *
 * The trail is written by the browser, so none of it is trusted. Names, routes and device
 * fields are clamped to a length, the kind and outcome must be members of their enums, and the
 * device string is parsed here rather than accepted as given. A visitor can lie about their
 * browser; they cannot make the row unbounded or store markup in it.
 */
import mongoose from 'mongoose';
import CareerPilotActivity, {
  ActivityKind, ActivityOutcome, ACTIVITY_KINDS, ACTIVITY_OUTCOMES, IActivityDevice,
} from '../models/CareerPilotActivity';

/** Cheap, non-throwing clamp. Undefined stays undefined so absent fields are not stored as "". */
const clamp = (v: any, n: number): string | undefined => {
  const s = v === 0 ? '0' : (v ? String(v) : '');
  return s ? s.slice(0, n) : undefined;
};

const oneOf = <T extends string>(v: any, list: T[], fallback: T): T =>
  list.includes(String(v) as T) ? (String(v) as T) : fallback;

/**
 * Browser, OS and form factor from a user-agent string.
 *
 * Deliberately small rather than a dependency. A UA parser library carries a database of
 * thousands of devices and is updated constantly; what an admin needs here is "Chrome on
 * Android, phone" so they can tell a broken mobile layout from a broken laptop one. Order
 * matters in both lists: every Edge UA also contains "Chrome", and every Chrome UA on iOS also
 * contains "Safari", so the more specific test has to run first.
 *
 * Anything unrecognised is reported as unknown rather than guessed. A wrong device on an audit
 * screen is worse than an absent one, because somebody will act on it.
 */
export function parseUserAgent(ua?: string): IActivityDevice {
  const s = String(ua || '');
  if (!s) return { browser: 'unknown', os: 'unknown', deviceType: 'unknown' };

  const version = (re: RegExp): string | undefined => {
    const m = s.match(re);
    return m && m[1] ? m[1].split('.').slice(0, 2).join('.') : undefined;
  };

  // Specific before general — Edge and Opera both advertise Chrome, Chrome on iOS advertises Safari.
  let browser = 'unknown', browserVersion: string | undefined;
  if (/Edg[A-Z]?\//.test(s))          { browser = 'Edge';             browserVersion = version(/Edg[A-Z]?\/([\d.]+)/); }
  else if (/OPR\/|Opera/.test(s))     { browser = 'Opera';            browserVersion = version(/(?:OPR|Opera)\/([\d.]+)/); }
  else if (/SamsungBrowser/.test(s))  { browser = 'Samsung Internet'; browserVersion = version(/SamsungBrowser\/([\d.]+)/); }
  else if (/CriOS/.test(s))           { browser = 'Chrome (iOS)';     browserVersion = version(/CriOS\/([\d.]+)/); }
  else if (/FxiOS/.test(s))           { browser = 'Firefox (iOS)';    browserVersion = version(/FxiOS\/([\d.]+)/); }
  else if (/Firefox\//.test(s))       { browser = 'Firefox';          browserVersion = version(/Firefox\/([\d.]+)/); }
  else if (/Chrome\//.test(s))        { browser = 'Chrome';           browserVersion = version(/Chrome\/([\d.]+)/); }
  else if (/Safari\//.test(s))        { browser = 'Safari';           browserVersion = version(/Version\/([\d.]+)/); }

  let os = 'unknown';
  if (/Windows NT/.test(s))                    os = 'Windows';
  else if (/Android/.test(s))                  os = 'Android';
  else if (/iPhone|iPad|iPod/.test(s))         os = 'iOS';
  else if (/Mac OS X/.test(s))                 os = 'macOS';
  else if (/CrOS/.test(s))                     os = 'ChromeOS';
  else if (/Linux/.test(s))                    os = 'Linux';

  // A crawler is not a person and should never be counted as one on a funnel screen.
  let deviceType = 'desktop';
  if (/bot|crawler|spider|crawling|HeadlessChrome/i.test(s))  deviceType = 'bot';
  else if (/iPad|Tablet/.test(s))                             deviceType = 'tablet';
  else if (/Android/.test(s) && !/Mobile/.test(s))            deviceType = 'tablet';   // Android tablets omit "Mobile"
  else if (/Mobi|iPhone|iPod|Android/.test(s))                deviceType = 'mobile';
  else if (os === 'unknown')                                  deviceType = 'unknown';

  return { browser, browserVersion, os, deviceType };
}

/**
 * meta, kept to a size, without ever producing something that cannot be stored.
 *
 * A size cap is what stops a stray payload becoming a storage problem, but truncating JSON text
 * and re-parsing it is how you turn a large row into a LOST row: the cut lands mid-string, the
 * parse throws, and the catch in recordActivity swallows the whole event — so the noisiest
 * moments, which are the ones worth reading, would be the ones missing. Oversized meta is
 * replaced by a labelled preview instead, which is honest about being partial.
 */
function boundedMeta(meta: any): any {
  if (!meta || typeof meta !== 'object') return undefined;
  try {
    const s = JSON.stringify(meta);
    if (s.length <= 2000) return meta;
    return { truncated: true, originalLength: s.length, preview: s.slice(0, 1800) };
  } catch {
    // Circular, or something with a throwing toJSON. Neither is worth losing the row over.
    return { unserialisable: true };
  }
}

export interface RecordInput {
  tenantId: any;
  visitorId: string;
  sessionId?: string;
  userId?: any;
  personName?: string;
  personEmail?: string;
  kind: ActivityKind | string;
  name: string;
  route?: string;
  method?: string;
  status?: number;
  outcome?: ActivityOutcome | string;
  errorMessage?: string;
  durationMs?: number;
  meta?: any;
  device?: Partial<IActivityDevice>;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

/**
 * Write one row. Never throws, never rejects, never blocks.
 *
 * Callers are expected to fire this without awaiting. It still returns a promise so a test can
 * wait for it, but a request handler that awaits this has misunderstood what it is for.
 */
export function recordActivity(input: RecordInput): Promise<void> {
  return (async () => {
    try {
      if (!input?.tenantId || !input?.visitorId || !input?.name) return;

      const parsed = parseUserAgent(input.userAgent);
      const device: IActivityDevice = {
        // What the browser told us wins for browser and OS only if we could not work it out
        // ourselves; screen, language and timezone are only ever knowable from the client.
        browser:        parsed.browser !== 'unknown' ? parsed.browser : clamp(input.device?.browser, 40),
        browserVersion: parsed.browserVersion || clamp(input.device?.browserVersion, 20),
        os:             parsed.os !== 'unknown' ? parsed.os : clamp(input.device?.os, 40),
        deviceType:     parsed.deviceType !== 'unknown' ? parsed.deviceType : clamp(input.device?.deviceType, 20),
        screen:         clamp(input.device?.screen, 20),
        language:       clamp(input.device?.language, 20),
        timezone:       clamp(input.device?.timezone, 60),
      };

      await CareerPilotActivity.create({
        tenantId: input.tenantId,
        visitorId: clamp(input.visitorId, 80),
        sessionId: clamp(input.sessionId, 80),
        userId: input.userId && mongoose.isValidObjectId(input.userId) ? input.userId : undefined,
        personName: clamp(input.personName, 120),
        personEmail: clamp(input.personEmail, 160),
        kind: oneOf(input.kind, ACTIVITY_KINDS, 'action'),
        name: clamp(input.name, 160),
        route: clamp(input.route, 200),
        method: clamp(input.method, 10),
        status: typeof input.status === 'number' ? input.status : undefined,
        outcome: oneOf(input.outcome, ACTIVITY_OUTCOMES, 'info'),
        errorMessage: clamp(input.errorMessage, 400),
        durationMs: typeof input.durationMs === 'number' && input.durationMs >= 0
          ? Math.min(input.durationMs, 3_600_000) : undefined,
        meta: boundedMeta(input.meta),
        device,
        ip: clamp(input.ip, 60),
        userAgent: clamp(input.userAgent, 300),
        referrer: clamp(input.referrer, 300),
        createdAt: new Date(),
      });
    } catch {
      // Swallowed on purpose. See the file header: the trail must not break the product.
    }
  })();
}

// ── Reading ──────────────────────────────────────────────────────────────────

export interface SessionFilter {
  tenantId: string;
  from?: Date;
  to?: Date;
  search?: string;
  deviceType?: string;
  outcome?: string;
  onlyFailures?: boolean;
  limit?: number;
  skip?: number;
}

const baseMatch = (f: SessionFilter): any => {
  const m: any = { tenantId: new mongoose.Types.ObjectId(f.tenantId) };
  if (f.from || f.to) {
    m.createdAt = {};
    if (f.from) m.createdAt.$gte = f.from;
    if (f.to) m.createdAt.$lte = f.to;
  }
  if (f.deviceType) m['device.deviceType'] = f.deviceType;
  if (f.outcome) m.outcome = f.outcome;
  return m;
};

/**
 * One row per visitor: who they turned out to be, when they arrived, what they did, where it broke.
 *
 * Grouped by visitorId rather than by user, because the whole point is that most of the
 * interesting trails have no user for part of their length. A visitor who later signs in gets
 * their name attached from the rows written after that moment — $last, not $first, since the
 * earliest rows are the anonymous ones.
 */
export async function listSessions(f: SessionFilter) {
  const limit = Math.min(Math.max(Number(f.limit) || 40, 1), 200);
  const skip = Math.max(Number(f.skip) || 0, 0);

  const pipeline: any[] = [
    { $match: baseMatch(f) },
    { $sort: { createdAt: 1 } },
    { $group: {
      _id: '$visitorId',
      firstSeen: { $first: '$createdAt' },
      lastSeen: { $last: '$createdAt' },
      events: { $sum: 1 },
      pages: { $sum: { $cond: [{ $eq: ['$kind', 'page'] }, 1, 0] } },
      actions: { $sum: { $cond: [{ $eq: ['$kind', 'action'] }, 1, 0] } },
      failures: { $sum: { $cond: [{ $eq: ['$outcome', 'failure'] }, 1, 0] } },
      // $last so a visitor who signed in half way through is named, not left anonymous.
      userId: { $last: '$userId' },
      personName: { $last: '$personName' },
      personEmail: { $last: '$personEmail' },
      device: { $last: '$device' },
      ip: { $last: '$ip' },
      lastRoute: { $last: '$route' },
      lastName: { $last: '$name' },
    } },
  ];

  if (f.onlyFailures) pipeline.push({ $match: { failures: { $gt: 0 } } });
  if (f.search) {
    const rx = new RegExp(String(f.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    pipeline.push({ $match: { $or: [
      { personName: rx }, { personEmail: rx }, { _id: rx }, { ip: rx },
    ] } });
  }

  const [rows, totalRows] = await Promise.all([
    CareerPilotActivity.aggregate([...pipeline, { $sort: { lastSeen: -1 } }, { $skip: skip }, { $limit: limit }]),
    CareerPilotActivity.aggregate([...pipeline, { $count: 'n' }]),
  ]);

  return {
    sessions: rows.map((r: any) => ({
      visitorId: r._id,
      firstSeen: r.firstSeen, lastSeen: r.lastSeen,
      events: r.events, pages: r.pages, actions: r.actions, failures: r.failures,
      userId: r.userId ? String(r.userId) : null,
      personName: r.personName || null, personEmail: r.personEmail || null,
      device: r.device || null, ip: r.ip || null,
      lastRoute: r.lastRoute || null, lastName: r.lastName || null,
      durationMs: r.firstSeen && r.lastSeen
        ? new Date(r.lastSeen).getTime() - new Date(r.firstSeen).getTime() : 0,
    })),
    total: totalRows[0]?.n || 0,
    limit, skip,
  };
}

/** The whole story for one visitor, oldest first, because that is the order it happened in. */
export async function getTimeline(tenantId: string, visitorId: string, limit = 500) {
  return CareerPilotActivity.find({
    tenantId: new mongoose.Types.ObjectId(tenantId), visitorId,
  }).sort({ createdAt: 1 }).limit(Math.min(Math.max(limit, 1), 2000)).lean();
}

/**
 * Headline numbers for the period on screen.
 *
 * Bots are counted separately rather than excluded silently: a page-view figure that quietly
 * drops traffic is a figure nobody can reconcile against anything else.
 */
export async function getSummary(f: SessionFilter) {
  const match = baseMatch(f);
  const [totals, byDevice, byBrowser, topPages, topFailures] = await Promise.all([
    CareerPilotActivity.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        events: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
        known: { $addToSet: '$userId' },
        failures: { $sum: { $cond: [{ $eq: ['$outcome', 'failure'] }, 1, 0] } },
        bots: { $sum: { $cond: [{ $eq: ['$device.deviceType', 'bot'] }, 1, 0] } },
      } },
    ]),
    CareerPilotActivity.aggregate([
      { $match: match },
      { $group: { _id: { d: '$device.deviceType', v: '$visitorId' } } },
      { $group: { _id: '$_id.d', n: { $sum: 1 } } }, { $sort: { n: -1 } },
    ]),
    CareerPilotActivity.aggregate([
      { $match: match },
      { $group: { _id: { b: '$device.browser', v: '$visitorId' } } },
      { $group: { _id: '$_id.b', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 },
    ]),
    CareerPilotActivity.aggregate([
      { $match: { ...match, kind: 'page' } },
      { $group: { _id: '$name', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 },
    ]),
    CareerPilotActivity.aggregate([
      { $match: { ...match, outcome: 'failure' } },
      { $group: { _id: { name: '$name', msg: '$errorMessage' }, n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 10 },
    ]),
  ]);

  const t = totals[0] || {};
  return {
    events: t.events || 0,
    visitors: (t.visitors || []).length,
    identified: (t.known || []).filter(Boolean).length,
    failures: t.failures || 0,
    bots: t.bots || 0,
    byDevice: byDevice.map((r: any) => ({ key: r._id || 'unknown', visitors: r.n })),
    byBrowser: byBrowser.map((r: any) => ({ key: r._id || 'unknown', visitors: r.n })),
    topPages: topPages.map((r: any) => ({ name: r._id || '(unnamed)', views: r.n })),
    topFailures: topFailures.map((r: any) => ({
      name: r._id?.name || '(unnamed)', message: r._id?.msg || '', count: r.n,
    })),
  };
}
