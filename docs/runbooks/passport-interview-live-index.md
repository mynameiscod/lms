# Deploying the one-live-interview index

CareerPilot mock interviews gained a database-level guarantee: **at most one live sitting per
(tenantId, studentId)**, enforced by a partial unique index instead of by a read in the
handler.

```js
// server/src/models/PassportInterview.ts
{ tenantId: 1, studentId: 1 }
{ unique: true, partialFilterExpression: { live: true }, name: 'tenantId_1_studentId_1_live_unique' }
```

`live` is a new boolean that mirrors the status: **true** for `in_progress` and `finalizing`,
**false** for `completed` and `abandoned`. It exists only because a partial filter has to be an
equality expression and "live" is two statuses.

---

## Why a deploy is not enough

Mongoose creates indexes it finds in a schema (`autoIndex` is on here) and does two things it
will never do for you:

1. **It never removes an index that is no longer in the schema.** Nothing is being replaced in
   this change, so there is nothing to drop — but the same rule is why the script below reports
   what it finds instead of assuming.
2. **It never touches the data underneath an index.** `live` is a field no existing document
   has, so a plain deploy protects only interviews started *after* it. Every sitting already
   open at that moment stays out of the index, and those members could still race two starts.

The backfill is the actual work, and it is what
`server/src/scripts/migratePassportInterviewLiveIndex.ts` does.

---

## Order

| Step | Where | What |
|---|---|---|
| 1 | new slot | Build and start it. Mongoose creates the index on boot. |
| 2 | new slot | Flip traffic as usual. |
| 3 | new slot | Dry-run the migration, read the report. |
| 4 | new slot | `--apply` — backfill the interviews that are open right now. |
| 5 | mongo | Verify the index is really there. |

**Traffic is flipped BEFORE the backfill, not after.** While the old code is still serving, it
keeps inserting sittings with no `live` field, so anything backfilled ahead of the flip is
immediately out of date. Flipping first means the set of open interviews stops growing under
the old rules, and the one run of the script closes it.

Nothing in steps 1–2 can fail on the index: at that point no document has `live: true`, so the
build is over an empty index and completes instantly.

---

## Step 1–2 — Deploy

The usual blue/green deploy. No special handling.

```bash
cat /root/lms/.active-slot          # which slot is live now; the deploy flips it
```

## Step 3 — Dry run

Read the report before changing anything.

```bash
SLOT=$(cat /root/lms/.active-slot)
docker exec lms-server-$SLOT node dist/scripts/migratePassportInterviewLiveIndex.js
```

Expected output:

```
index tenantId_1_studentId_1_live_unique: present
terminal sittings still flagged live: 0
members with an open sitting: 12 (12 to backfill)
```

- `index ... MISSING` means Mongoose's boot-time build did not happen or failed. That is fine —
  `--apply` creates it — but find out why before moving on.
- **`N member(s) already have MORE THAN ONE open sitting`** is the one line worth stopping on.
  Those are the duplicates the old read-then-insert allowed. The script marks the newest of each
  as the live one and **leaves the older sittings exactly as they are**: same status, still
  findable, still finishable, simply not in the index. It will not abandon somebody's transcript
  on its own authority. Decide what to do with them separately.

## Step 4 — Apply

```bash
docker exec lms-server-$SLOT node dist/scripts/migratePassportInterviewLiveIndex.js --apply
```

It is idempotent — safe to run twice, and safe to run again on the next deploy.

## Step 5 — Verify

```bash
docker exec -it lms-mongodb mongosh -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin lms-saas --eval '
    db.passportinterviews.getIndexes().filter(i => i.name.endsWith("live_unique"));
    db.passportinterviews.countDocuments({ status: { $in: ["in_progress","finalizing"] }, live: { $ne: true } });
    db.passportinterviews.countDocuments({ status: { $nin: ["in_progress","finalizing"] }, live: true });
  '
```

Expect the index with `unique: true` and `partialFilterExpression: { live: true }`, and **0**
for both counts. A non-zero first count is an open sitting outside the index (re-run the
script). A non-zero second count is a finished sitting still holding a lock — that member
cannot start a new interview, and the script's first step is what clears it.

---

## Rolling back

**Drop the index. Do not leave it in place with the old code running.**

```bash
docker exec -it lms-mongodb mongosh ... --eval '
  db.passportinterviews.dropIndex("tenantId_1_studentId_1_live_unique")
'
```

The reason is specific: the old code never sets `live: false` when it finishes an interview. If
the index survives a code rollback, the first sitting each member completes stays flagged
`live: true` forever and the index then refuses every future interview they try to start — a
permanent lockout, arriving hours after the rollback looked successful.

With the index dropped, the leftover `live` fields are inert; old code neither reads nor writes
them. Rolling forward again is safe because the script's first step clears exactly those stale
flags before rebuilding the index.
