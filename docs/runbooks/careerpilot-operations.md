# CareerPilot — operations runbook

For whoever is on when something goes wrong. Written to be followed at 2am by
somebody who did not build this.

Three rules apply to everything below.

**Read before you write.** Every diagnostic here is read-only and safe to run
during an incident. Anything that changes data is marked **WRITES** and says what
it changes.

**MongoDB here is standalone.** There are no transactions. Every multi-document
operation is a saga or an atomic claim, so a half-finished operation leaves a
record saying how far it got — that record is what you recover from, not a
rollback. Never "fix" one by editing documents directly; use the undo path.

**The database is the source of truth about itself.** The concurrency guarantees
in this product depend on partial unique indexes, and an index is a property of
the deployed database, not of the code. A database restored from a dump can run
this exact code with none of its guarantees. See [Index verification](#index-verification).

---

## First stop: the health screens

Before reading logs, open the two admin screens. Between them they answer most
questions faster than a log search will.

| Screen | Endpoint | Answers |
|---|---|---|
| Configuration health | `GET /passport/admin/health/configuration` | Is this tenant set up to work at all — roles, blueprints, question pools, budgets |
| Data integrity | `GET /passport/admin/health/data-integrity` | Have the records gone wrong — unpaid entitlements, stuck sagas, missing indexes, ledger drift |
| Launch readiness | `GET /passport/admin/health/launch-readiness` | The rollup of both, by area |

All three are MANAGE-only, tenant-scoped from the token, and read-only. The
integrity report returns ObjectIds and never contact details, so it is safe to
paste into a ticket.

---

## Symptom → what to check

### "A member paid and has no membership"

1. Open **data integrity**. Look for `PAID_WITHOUT_ENTITLEMENT`; the member's id
   will be in the sample.
2. Check the payment in the Razorpay dashboard. Three outcomes:
   - **Captured for the full amount** — the activation failed after the payment
     settled. Grant the membership manually. They have paid.
   - **Captured for less than the order** — the server refused it on purpose.
     Since `09dd212b` a partial capture never activates a membership, because a
     valid signature proves a payment belongs to an order and says nothing about
     how much was captured. Refund or ask them to pay the balance; do not grant.
   - **Not captured** — nothing was taken. Nothing to do.
3. Search the server log for `refusing to settle <orderId>`. The reason is one of
   `amount_mismatch`, `currency_mismatch`, `wrong_order`, `unverifiable`.
   `unverifiable` means Razorpay could not be reached at settlement time — the
   payment row is still `created`, so a webhook retry can still settle it.

A refused payment is left `created`, never `paid`. That is deliberate: the row is
not burned, and a later full capture or corrected webhook can still settle it.

### "A member cannot start an interview"

Almost always the one-live-interview lock, held by a session they abandoned.

1. Data integrity → `INTERVIEW_STUCK_LIVE`.
2. **WRITES** Mark the stuck session abandoned through the admin screen. That
   clears `live`, which releases the partial unique index entry.

Do not delete the session. The transcript is the record of what the member said.

### "A member's coins were taken and they got no reward"

1. Data integrity → `REDEMPTION_STUCK`. This is `PENDING` with at least one step
   `CLAIMED` — the saga acquired stock, budget or coins and then stopped.
2. **WRITES** Cancel it from the rewards admin queue. Cancelling runs the undo
   path, which releases each claimed step and returns the coins.

Never edit the redemption document by hand. The undo path is what makes the
release safe and idempotent; a manual status change leaves the claims held.

### "The coin balance looks wrong"

Data integrity → `COIN_BALANCE_DRIFT`. The ledger is the truth and the account
balance is a cached sum of it. A drift means a write credited one and not the
other — investigate before correcting, because the same failed write may have
gone wrong elsewhere.

### "The analytics numbers look wrong"

- `MEMBER_INVISIBLE_TO_ANALYTICS` — a user with an active roadmap and no
  enrolment marker. They work normally; they are missing from the denominator of
  every rate on the screen.
- A metric reading `coverage: unavailable` is not broken. Four readiness figures
  are derived on demand and not persisted at cohort scale, so they are reported
  as unavailable with a reason rather than substituted with something else
  wearing the same label. See `docs/careerpilot/ANALYTICS_METRICS.md`.
- `NOT_ASSESSED` skills are excluded from averages, never scored zero. An average
  of `null` means nobody is sufficiently assessed — it does not mean zero.

### "Everything is slow / AI spend has jumped"

1. Who: `AiUsage` now carries `studentId`. Group by it for today —
   `{ tenantId, studentId, date }` is indexed for exactly this query. One member
   at the top by an order of magnitude is abuse; a flat rise is adoption.
2. The rate limits are in `server/src/middleware/rateLimit.ts`, all policies in
   one `POLICIES` object. They are per-user for authenticated callers and per-IP
   only for unauthenticated ones, so one student cannot lock out a college behind
   one NAT.
3. Limits are in-memory and therefore **per process**. A deploy resets them. This
   is sound only while one server process is active at a time — if the product is
   ever scaled out horizontally, this needs a shared store.

### "A member says somebody else saw their work"

Member-owned records are scoped by `studentId` in the query, not by the guard.
`server/src/tests/integration/memberIdor.int.test.ts` covers every such handler
and fails the build if a new one is added without the scope.

---

## Index verification

Run this after **any** restore, migration, or database move — before taking
traffic.

```
GET /passport/admin/health/data-integrity
```

Look for `MISSING_UNIQUE_INDEX` and `INDEX_NOT_UNIQUE`. Both are ERROR. The
indexes checked, and what each stops:

| Guarantee | Without it |
|---|---|
| One live interview per member | Two simultaneous starts give one member two transcripts, one silently orphaned |
| One active roadmap per member | Two active plans; the member sees whichever a query returns first |
| One assessment in progress per member | Two papers; one of the two scores is discarded |
| One redemption per intent | A double-clicked redeem spends a member's coins twice |
| One ledger entry per award | A retried award credits coins twice and the ledger stops being a ledger |

If one is missing, also check the corresponding `DUPLICATE_*` finding first. A
unique index **cannot be built while duplicates exist** — the build fails
outright, so the duplicates must be resolved before the migration will apply.

---

## Backup and restore verification

> A backup you have never restored is a hypothesis. This section exists because
> `restore.sh` once printed `✅ Database restored` while restoring zero documents
> — `mongorestore` needs `--db`. Fixed in `7666a914`; backups taken before that
> are unverified.

**Counting documents does not verify a restore.** A restore that drops three rows
and duplicates three others counts equal. Use the per-document fingerprint.

### Verifying a backup (safe — no production writes)

Do this on a scratch host or a throwaway container, never against production.

```bash
# 1. Fingerprint the source
bash scripts/db-fingerprint.sh > before.txt

# 2. Restore the backup into a THROWAWAY container
CONTAINER=verify-mongo AUTH=none bash scripts/db-fingerprint.sh > after.txt

# 3. The diff is the whole verification
diff before.txt after.txt && echo "IDENTICAL"
```

The fingerprint emits, per collection, `docs=<n> idx=<n> ids=<md5 of every _id
in sorted order>`. The id hash moves if any single document is missing, added or
has a different `_id`. Field-level corruption with unchanged ids is **not**
caught by default — pass `--deep` to hash whole documents when that matters.

`idx=<n>` is not decoration. A restore that brings back every document and none
of the indexes is the exact failure described under [Index
verification](#index-verification): the code runs, the guarantees do not.

### Cadence

- Verify after every change to `backup.sh`, `restore.sh` or the Mongo version.
- Verify at least once per quarter otherwise.
- Record the date of the last successful verified restore. "We have backups" is
  not an answer to "when did a restore last work".

---

## Load validation

**Do not run load tests against production.** Everything here is for a staging
environment holding representative data volumes.

What to measure, and why these specifically — each is a place where cost grows
with the cohort rather than with the request:

| Target | Load | What failure looks like |
|---|---|---|
| Admin analytics (all domains) | One tenant with 50k members | Slow response, or a `BSONObjectTooLarge` error |
| Learning funnel | Same | Same |
| Data integrity report | Same | Slow; it scans history rather than a window |
| Interview start | 50 concurrent starts by the SAME member | More than one live session — the index has failed |
| Reward redemption | 50 concurrent redeems, same idempotency key | More than one redemption, or coins debited twice |
| Membership settle | Webhook and verify simultaneously | Membership activated twice, or double-charged time |

The four concurrency rows are correctness tests, not performance tests. They
have unit and integration coverage already; running them against a real cluster
is what proves the indexes are built there too.

Known before you start: `careerPilotAnalyticsService.memberIds()` reads every
member `_id` into the server and ships them back to MongoDB as an `$in` array on
eight aggregations. It is correct and it is the first thing that will hurt at
scale. Expect it to dominate the analytics numbers.

---

## What NOT to do

- **Do not delete users to remove CareerPilot members.** CareerPilot members are
  ordinary LMS users with an embedded `passport` — the same filter matches the
  tenant admin, the instructors and the staff accounts. To reset a member,
  `$unset` the `passport` subtree. Never delete the user document.
- **Do not edit a saga document to unstick it.** Use the cancel/undo path.
- **Do not repair anything from the health screens.** They report deliberately.
  Choosing which of a member's two roadmaps to destroy is a decision, not a
  cleanup.
- **Do not rotate `ENCRYPTION_KEY` without reading
  `docs/runbooks/jwt-secret-rotation.md` first.** Stored integration secrets are
  encrypted with a key derived through a fallback chain; changing it can make
  existing API keys unreadable.
- **Do not assume a green health screen on an empty tenant means anything.** The
  report says so itself: every check passed because there was nothing to find,
  which is not the same as being proven correct.

---

## Reference

| Thing | Where |
|---|---|
| Rate limit policies | `server/src/middleware/rateLimit.ts` |
| Payment capture verification | `server/src/controllers/paymentController.ts` (`checkCapture`) |
| Data integrity checks | `server/src/services/careerPilotDataIntegrityService.ts` |
| Member population definition | `server/src/services/careerPilotPopulation.ts` |
| Metric definitions | `docs/careerpilot/ANALYTICS_METRICS.md` |
| Production readiness | `docs/careerpilot/PRODUCTION_READINESS.md` |
| Interview live index migration | `docs/runbooks/passport-interview-live-index.md` |
| Secret rotation | `docs/runbooks/jwt-secret-rotation.md` |
