/**
 * Records every CareerPilot API call on its way out.
 *
 * WHY A MIDDLEWARE RATHER THAN CALLS IN EACH HANDLER. There are well over a hundred CareerPilot
 * endpoints. Instrumenting them by hand guarantees the trail is complete on the day it is
 * written and incomplete a month later, because the next endpoint somebody adds will not have
 * the line. Here it is structural: a route exists, therefore it is recorded.
 *
 * IT RUNS AFTER THE RESPONSE. Hooked to the response 'finish' event, so the status and the
 * duration are the real ones, and so nothing on the request path waits for a database write.
 *
 * WHAT IT DELIBERATELY DOES NOT RECORD. Bodies, headers and query strings. A CareerPilot
 * request body can hold an OTP, an answer to a question that is about to be scored, or a
 * payment reference; none of that belongs in a log an admin browses. The route, the verb, the
 * status and the timing answer "what happened and did it work", which is the question this
 * screen exists for.
 */
import { Request, Response, NextFunction } from 'express';
import { recordActivity } from '../services/careerPilotActivityService';

/**
 * Chatter that would drown the trail.
 *
 * The activity screen polls, the member shell polls its own status, and a timeline where every
 * third row is a poll is a timeline nobody reads to the end. These are excluded by prefix rather
 * than by exact path so a future sub-route does not silently reappear.
 */
const IGNORED = [
  '/activity',            // the ingest endpoint itself, and the admin screen reading it back
  '/admin/activity',
  '/me/notifications',
  '/health',
];

/** "/me/plan/today" -> "Daily plan"; falls back to the path, which is never wrong, only terse. */
function labelFor(method: string, route: string): string {
  const p = route.replace(/^\/+/, '');
  const known: Array<[RegExp, string]> = [
    // Routes CareerPilot members share with the LMS (recorded with their mount prefix).
    [/^enrollment-plans\/[^/]+\/day\//,        'Opened a roadmap day'],
    [/^enrollment-plans\/[^/]+\/complete-item/, 'Completed a lesson item'],
    [/^enrollment-plans/,                       'Roadmap'],
    [/^assignments\/[^/]+\/start/,              'Started an assignment'],
    [/^assignments\/submissions\/[^/]+\/submit/, 'Submitted an assignment'],
    [/^assignments\/submissions\/[^/]+\/save/,   'Saved assignment work'],
    [/^assignments\/submissions\/[^/]+\/run/,    'Ran assignment code'],
    [/^assignments/,                            'Assignment'],
    [/^quizzes\/.*(submit|attempt)/,            'Submitted a quiz'],
    [/^quizzes/,                                'Quiz'],
    [/^coding-practice\/.*\/submit/,             'Submitted a practice problem'],
    [/^coding-practice\/.*\/run/,                'Ran practice code'],
    [/^coding-practice/,                        'Coding practice'],
    [/^learning-library/,                       'Lesson content'],
    [/^me\/foundation-journey\/day/, 'Opened a roadmap day'],
    [/^me\/foundation-journey/,      'Viewed the roadmap'],
    [/^me\/orientation/,             'Orientation'],
    [/^me\/coins|^coins/,            'Coins'],
    [/^me\/plan\/complete/,        'Completed a mission'],
    [/^me\/plan/,                  'Opened the daily plan'],
    [/^me\/readiness/,             'Viewed role readiness'],
    [/^me\/gamification/,          'Viewed progress'],
    [/^assessment\/start/,         'Started the skill assessment'],
    [/^assessment\/submit/,        'Submitted the skill assessment'],
    [/^assessment/,                'Skill assessment'],
    [/^interview\/[^/]+\/finish/,  'Finished a mock interview'],
    [/^interview\/[^/]+\/answer/,  'Answered an interview question'],
    [/^interview\/start/,          'Started a mock interview'],
    [/^interview/,                 'Mock interview'],
    [/^signup/,                    'Signed up'],
    [/^verify/,                    'Verified an OTP'],
    [/^resend/,                    'Asked for another OTP'],
    [/^login/,                     'Signed in'],
    [/^payment|^order/,            'Payment'],
  ];
  for (const [re, label] of known) if (re.test(p)) return label;
  return `${method} /${p}`;
}

/**
 * Ids are noise in a route label and make grouping useless — every interview would be its own
 * row in "top pages". Replaced with :id so twenty sittings collapse into one line.
 */
const normaliseRoute = (route: string): string =>
  route
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:n')
    .slice(0, 200);

/**
 * The same recorder, for routes CareerPilot members SHARE with the LMS (their day plan, assignments,
 * quizzes, coding practice, lesson videos). Only a request signed with a CareerPilot login token
 * (product 'careerpilot') is recorded, so an LMS student's traffic never lands in this trail.
 */
export function careerPilotMemberActivity(req: Request, res: Response, next: NextFunction) {
  (req as any).__cpMembersOnly = true;
  return careerPilotActivity(req, res, next);
}

export function careerPilotActivity(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  // Captured now: by the time 'finish' fires the router has restored the original url.
  // On a shared (members-only) mount the path alone is ambiguous — "/:id/day/:n" — so the mount is kept.
  const base = (req as any).__cpMembersOnly ? String(req.baseUrl || '').replace(/^\/api\/v\d+/, '') : '';
  const route = normaliseRoute(base + String(req.path || ''));

  if (IGNORED.some(p => route.startsWith(p))) return next();
  // A video plays as dozens of Range requests; one row each would bury everything else. Viewing is
  // recorded by the player instead (play, milestones, seconds watched).
  if (/\/(stream|qualities)(\/|$)/.test(route)) return next();

  res.on('finish', () => {
    try {
      const user: any = (req as any).user;
      if ((req as any).__cpMembersOnly && user?.product !== 'careerpilot') return;
      const tenantId = user?.tenantId || (req as any).tenantId;
      // A visitor id is what ties the row to a trail. The browser sends one on every request;
      // without it there is nothing to group by, so the row would be an orphan.
      const visitorId = String(req.headers['x-cp-visitor'] || '') || (user?.id ? `u:${user.id}` : '');
      if (!tenantId || !visitorId) return;

      const status = res.statusCode;
      recordActivity({
        tenantId,
        visitorId,
        sessionId: String(req.headers['x-cp-session'] || '') || undefined,
        userId: user?.id,
        personName: [user?.firstName, user?.lastName].filter(v => v && String(v).trim() !== '-').join(' ') || undefined,
        personEmail: user?.email,
        kind: status >= 400 ? 'error' : 'api',
        name: labelFor(req.method, route),
        route,
        method: req.method,
        status,
        // 4xx is a failure the person experienced even when the server behaved correctly:
        // being refused is still being stopped, and this screen exists to find where people stop.
        outcome: status >= 400 ? 'failure' : 'success',
        durationMs: Date.now() - startedAt,
        ip: req.ip,
        userAgent: String(req.headers['user-agent'] || ''),
        referrer: String(req.headers.referer || req.headers.referrer || ''),
      });
    } catch {
      // Never let instrumentation surface on a response that has already been sent.
    }
  });

  next();
}
