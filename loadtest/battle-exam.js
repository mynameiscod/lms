/**
 * k6 load test for the Tech Battle exam path.
 *
 *   k6 run -e BASE=https://staging.example.com -e TOKENS=./tokens.json battle-exam.js
 *
 * NEVER point this at production. It submits exams, which writes real results and
 * would corrupt a live leaderboard. Use a staging stack with a seeded battle.
 *
 * What it models, and why it matters more than an average-rate test: a battle is a
 * THUNDERING HERD. 100,000 people do not trickle in — they all press "start" the second
 * the exam opens, and a large share submit in the final minute. A smooth ramp will
 * happily report success against a system that collapses on the real spike, so the
 * default profile below is a near-vertical arrival followed by a synchronised finish.
 *
 * tokens.json is a JSON array of examToken strings for candidates seeded on staging:
 *   ["tok_aaa", "tok_bbb", ...]
 * Each virtual user claims one, because the exam is single-device-locked per token and
 * sharing tokens would measure the lock rather than the exam.
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE = __ENV.BASE;
const VUS = Number(__ENV.VUS || 1000);
const EXAM_SECONDS = Number(__ENV.EXAM_SECONDS || 120);

if (!BASE) fail('Set BASE, e.g. -e BASE=https://staging.example.com');
if (BASE.includes('platform.codebegun.com')) {
  fail('Refusing to run against production — this submits real exams.');
}

const tokens = new SharedArray('tokens', () => JSON.parse(open(__ENV.TOKENS || './tokens.json')));

const fetchTime = new Trend('exam_fetch_ms');
const submitTime = new Trend('exam_submit_ms');
const heartbeatTime = new Trend('heartbeat_ms');
const submitFail = new Rate('submit_failed');
const rateLimited = new Counter('rate_limited_429');

export const options = {
  scenarios: {
    // Everyone arrives at once — the real opening-bell behaviour.
    thundering_herd: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: `${EXAM_SECONDS + 120}s`,
      gracefulStop: '60s',
    },
  },
  thresholds: {
    // Submit is the expensive call and the one that used to degrade with entrant count.
    // A flat p95 as VUs rise is the signal the O(n^2) is really gone.
    'exam_submit_ms': ['p(95)<3000'],
    'exam_fetch_ms': ['p(95)<2000'],
    'submit_failed': ['rate<0.01'],
    'http_req_failed': ['rate<0.02'],
  },
};

export default function () {
  const token = tokens[__VU % tokens.length];
  const sessionId = `k6-${__VU}`;
  const headers = { 'Content-Type': 'application/json', 'x-session-id': sessionId };

  // 1. Fetch the paper.
  let r = http.get(`${BASE}/api/v1/public/battles/exam/${token}`, { headers });
  fetchTime.add(r.timings.duration);
  if (r.status === 429) rateLimited.add(1);
  const ok = check(r, { 'exam fetched': (x) => x.status === 200 });
  if (!ok) return;

  // `questions` sits at the top level of the payload, NOT under `quiz` (which carries
  // only the settings). Reading the wrong path silently yields an empty answer array,
  // so submissions grade nothing and the test quietly stops measuring the work it exists
  // to measure.
  let questions = [];
  try { questions = (r.json('questions') || []); } catch (e) { /* gated response shape */ }

  // 2. Start.
  r = http.post(`${BASE}/api/v1/public/battles/exam/${token}/start`, JSON.stringify({ sessionId }), { headers });
  if (r.status === 429) rateLimited.add(1);
  check(r, { 'exam started': (x) => x.status === 200 || x.status === 403 });

  // 3. Sit the exam, heartbeating every 30s like the real client.
  const beats = Math.max(1, Math.floor(EXAM_SECONDS / 30));
  for (let i = 0; i < beats; i++) {
    sleep(30);
    const h = http.post(`${BASE}/api/v1/public/battles/exam/${token}/heartbeat`,
      JSON.stringify({ sessionId }), { headers });
    heartbeatTime.add(h.timings.duration);
    if (h.status === 429) rateLimited.add(1);
  }

  // 4. Submit — answering every question, so grading does real work.
  const answers = questions.map((q) => ({
    questionId: q._id,
    selectedOptions: q.options && q.options.length ? [q.options[0].text] : [],
  }));

  r = http.post(`${BASE}/api/v1/public/battles/exam/${token}/submit`,
    JSON.stringify({ answers }), { headers, timeout: '120s' });
  submitTime.add(r.timings.duration);
  if (r.status === 429) rateLimited.add(1);

  const submitted = check(r, {
    'submit accepted': (x) => x.status === 200,
    'rank returned': (x) => { try { return x.json('rank') > 0; } catch (e) { return false; } },
  });
  submitFail.add(!submitted);
}

export function handleSummary(data) {
  const p95 = (m) => (data.metrics[m] ? Math.round(data.metrics[m].values['p(95)']) : 0);
  return {
    stdout: `
─────────────────────────────────────────────
 Battle load test — ${VUS} concurrent candidates
─────────────────────────────────────────────
  exam fetch   p95 : ${p95('exam_fetch_ms')} ms
  heartbeat    p95 : ${p95('heartbeat_ms')} ms
  submit       p95 : ${p95('exam_submit_ms')} ms
  submit failures  : ${((data.metrics.submit_failed?.values.rate || 0) * 100).toFixed(2)}%
  429s (rate limit): ${data.metrics.rate_limited_429?.values.count || 0}

  Run again at 2x the VUs. If submit p95 stays flat, ranking is O(1) as intended.
  If it climbs with entrant count, something is still doing per-entrant work.
─────────────────────────────────────────────
`,
  };
}
