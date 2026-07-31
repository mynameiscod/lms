# Battle load testing

## Before anything else

**Never run this against production.** The script submits exams, which writes real
results and corrupts a live leaderboard. It refuses to run against
`platform.codebegun.com`, but that guard is a seatbelt, not permission — point it at a
staging stack with its own database.

## What you need

1. **k6** — `winget install k6` on Windows, or `docker run --rm -i grafana/k6`.
2. **A staging battle** with a quiz, seeded registrations, and `startAt` already passed.
3. **`tokens.json`** — the `examToken` of each seeded registration:

```json
["tok_aaa", "tok_bbb", "tok_ccc"]
```

Generate it from the staging database:

```js
// mongosh, against STAGING
const toks = db.battleregistrations
  .find({ battleId: ObjectId("<battleId>"), reviewStatus: "approved" }, { examToken: 1 })
  .map(r => r.examToken);
print(JSON.stringify(toks));
```

One token per virtual user — the exam is single-device-locked, so sharing tokens
measures the lock instead of the exam.

## Running it

```bash
k6 run -e BASE=https://staging.example.com -e TOKENS=./tokens.json -e VUS=1000 battle-exam.js
```

Climb in stages and record the numbers each time:

| Stage | VUs | What you are looking for |
|---|---|---|
| 1 | 100 | Everything passes. Establishes the baseline. |
| 2 | 1,000 | Where the old code began to struggle. |
| 3 | 5,000 | Where the old code timed out on submit. |
| 4 | 20,000 | Needs several load generators — see below. |

## The one number that matters

**Submit p95, as VU count doubles.**

Ranking used to be O(n²): every submission re-ranked every prior entrant, so submit got
slower the further into a battle you were. If submit p95 stays roughly *flat* while VUs
double, ranking is genuinely O(1). If it climbs in step with entrant count, something is
still doing per-entrant work on the submit path and should be found before the event.

## Beyond ~10k VUs

One k6 process runs out of CPU and ports before the server does. Above roughly 10,000
VUs, split the load across several machines — each with its own slice of `tokens.json` —
and add the results. Otherwise you are measuring the load generator, not the LMS.

## Read the server side too

A green k6 run with a saturated database is a false pass. While the test runs:

```bash
docker stats                                    # CPU/memory per container
docker exec lms-mongodb mongosh --eval "db.currentOp({secs_running:{\$gt:1}})"
docker exec lms-server-<slot> sh -c "cat /proc/1/status | grep Threads"
```

If Mongo shows operations running longer than a second under load, that is the next
bottleneck regardless of what the HTTP numbers say.
