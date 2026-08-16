# CareerPilot V1 — Production Readiness

Everything needed to take CareerPilot from a green test suite to a running deployment, in
the order it has to happen. Commands are the ones this repository actually has.

> **The one ordering that must not be got wrong** is in [Step 2](#step-2--pin-encryption_key-before-touching-jwt_secret).
> Setting `JWT_SECRET` before pinning `ENCRYPTION_KEY` makes every stored integration
> secret unreadable.

---

## 1. Environment

The server **refuses to start** without `JWT_SECRET` (`server/src/config/secrets.ts`), and
in production it throws rather than continuing when MongoDB is unreachable
(`server/src/config/database.ts`). Both are deliberate: a process that boots insecure or
database-less used to look like a successful deploy.

| Variable | Tier | Missing behaviour |
|---|---|---|
| `JWT_SECRET` | **required core** | server refuses to start |
| `MONGODB_URI` / `MONGO_URL` | **required core** | production start throws |
| `ENCRYPTION_KEY` | **required core** — see step 2 | stored integration secrets silently re-key |
| `REDIS_HOST` / `REDIS_URL` | required for feature | AI call queue does not run; reads unaffected |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | required for feature | AI features report unavailable; the rest serves |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | required for feature | membership purchase unavailable |
| `CLIENT_URL`, SMTP/WhatsApp/Bunny keys | optional | that integration is off |

Optional dependencies are reported by `/api/health/ready` and never gate liveness — an
absent AI key must not stop a student's roadmap loading.

Secrets may also be set in Platform Settings, which stores them **encrypted** — hence step 2.

---

## Step 2 — Pin ENCRYPTION_KEY before touching JWT_SECRET

`settingsService` and `leadSourceConfigController` encrypt 22 admin-entered secrets
(provider API keys, SMTP passwords, OAuth client secrets) with AES-256-CBC under:

```
ENCRYPTION_KEY || JWT_SECRET || '<a literal published in this repository>'
```

So the effective key depends on what is set:

| `ENCRYPTION_KEY` | `JWT_SECRET` | Effect of setting/rotating `JWT_SECRET` |
|---|---|---|
| set | anything | **safe** |
| unset | set | **breaks decryption** |
| unset | unset | **merely setting `JWT_SECRET` breaks decryption** |

Failure is **not data loss** — `decrypt()` returns `''`, logs which key failed, and leaves
the ciphertext in place. Integrations stop working until the key is restored or the values
are re-entered.

Full procedure: **[docs/runbooks/jwt-secret-rotation.md](../runbooks/jwt-secret-rotation.md)**.
Summary:

1. `grep -E '^(ENCRYPTION_KEY|JWT_SECRET)=' /root/lms/server/.env`
2. Set `ENCRYPTION_KEY` to whichever value is *currently effective*.
3. Restart, then confirm Platform Settings still shows masked keys and the logs contain no
   `Could not decrypt`.
4. Only now generate and set `JWT_SECRET` (`openssl rand -base64 48`).
5. Deploy. **Every existing session is invalidated; users log in again.**

Until `ENCRYPTION_KEY` is pinned, Launch Readiness reports **NOT_READY** — by design.

---

## 3. Migrations and indexes

CareerPilot relies on Mongoose `autoIndex` for most index creation. Two things need a human.

| Requirement | Script | Dry run | Apply |
|---|---|---|---|
| Module 14 one-live-interview partial index + backfill | `server/src/scripts/migratePassportInterviewLiveIndex.ts` | `docker exec lms-server-$SLOT node dist/scripts/migratePassportInterviewLiveIndex.js` | same with `--apply` |
| XP ledger key widening (earlier module) | `server/src/scripts/migrateXpLedgerIndex.ts` | same pattern | `--apply` |

`SLOT=$(cat /root/lms/.active-slot)`.

**Run the live-interview migration AFTER the traffic switch** — the runbook explains why:
flipping first stops the set of old-rule sittings growing, so one run closes it.
See [docs/runbooks/passport-interview-live-index.md](../runbooks/passport-interview-live-index.md).

**Created automatically on boot, no action needed:** `CompanyRoleProfile`'s unique and
partial-unique indexes (new collection, built on empty data — cannot fail), and
`PassportProgress {tenantId, xp:-1}` (non-unique, verified by `explain` in
`queryPlans.int.test.ts`).

**No analytics indexes were added.** Every Module 16 aggregation lands on an index that
already exists.

---

## 4. Backups

`scripts/backup.sh` and `scripts/restore.sh` exist.

> ⚠️ **Existing backups are unverified.** `restore.sh` once printed "✅ Database restored"
> while restoring zero documents (it needed `--db`). Fixed in `7666a914`, but no backup
> taken before that fix has been proven restorable.

Before any migration:

1. `bash scripts/backup.sh`
2. **Verify it** — restore into a scratch database and count documents in `users`,
   `passportinterviews`, `careerroadmaps`, `coinledgers`. A backup nobody has restored is a
   hypothesis.
3. Record where it is and who confirmed it.

Never run `restore.sh` against production to test it.

---

## 5. Deployment

Blue/green over `docker-compose.yml` (services: `mongodb`, `redis`, `server-blue`,
`server-green`, `piston`). **Standalone MongoDB — no replica set, so no transactions.**

- [ ] Backup taken **and verified** (§4)
- [ ] `.env` reviewed against §1
- [ ] `ENCRYPTION_KEY` pinned and decryption confirmed (§2)
- [ ] `JWT_SECRET` set to a strong new value (§2)
- [ ] Build and start the idle slot
- [ ] `curl -f localhost:<port>/api/health/ready` returns 200
- [ ] Switch traffic
- [ ] Run migrations, dry run first (§3)
- [ ] Smoke checklist (§7)
- [ ] Admin → CareerPilot → Analytics → System health shows the expected status

---

## 6. Rollback

- **Application:** switch traffic back to the previous slot. Immediate.
- **`JWT_SECRET`:** restoring the previous value revalidates sessions issued under it.
- **`ENCRYPTION_KEY`: do NOT roll back** once pinned — it is what keeps stored secrets
  readable.
- **Indexes:** the live-interview index **must be dropped** if the application is rolled
  back past Module 14, because the old code never clears `live` and would lock every member
  out one completed interview at a time. Command is in that runbook.
- **Not reversible:** the `live` backfill and the `options`/`correctIndex` question fields
  are additive and harmless to leave. No CareerPilot migration deletes data.

---

## 7. Post-deploy smoke checklist

Read-only unless marked. Use a synthetic member account, never a real student's.

| # | Check | Expected |
|---|---|---|
| 1 | `GET /api/health/live` | 200 |
| 2 | `GET /api/health/ready` | 200, `mongodb: up` |
| 3 | Member login | token issued |
| 4 | CareerPilot dashboard | loads |
| 5 | Career context read | stored answers returned |
| 6 | Skill DNA read | scores or an honest empty state |
| 7 | Role readiness | figure or a stated reason |
| 8 | Roadmap read | active plan or "not generated" |
| 9 | Today's mission | list or empty state |
| 10 | XP / coins read | balances |
| 11 | Rewards catalogue | renders |
| 12 | Resume centre | renders, no 500 |
| 13 | Company list + detail | renders; Readiness tab honest when unconfigured |
| 14 | Mock interview list | history; **do not start one** (AI cost) |
| 15 | Admin → Analytics → Overview | funnel renders |
| 16 | Admin → System health | Config Health + Launch Readiness render |

Anything AI-billed (assessment generation, resume analysis, interview) is deliberately
excluded — verify those once, deliberately, not on every deploy.

---

## 8. Load-test plan — **not yet executed**

No load testing has been performed. Nothing in this repository supports a claim about
10,000 concurrent members, and none is made.

**Environment:** staging or local, never production. Synthetic members only — the fixtures
in `server/src/tests/integration/` show the shape (`product: 'career_passport'` is what
makes a user a member).

**Dataset:** 10,000 members across 2 tenants; ~60% with Skill DNA, ~50% with a roadmap,
~30% with XP activity in the last 30 days.

**Scenarios, measured separately:**

| Group | Endpoints | Provisional p95 target |
|---|---|---|
| Simple GET | health, config reads | < 500 ms |
| DB-backed GET | dashboard, roadmap, missions, company list | < 800 ms |
| Admin analytics | the six analytics endpoints, 30-day range | < 800 ms |
| Leaderboard | tenant leaderboard | < 800 ms |
| Non-AI write | mission complete, target companies | < 1 s |
| **AI operations** | assessment gen, resume analysis, interview turn | **measured separately, no shared target** |

Error rate < 1% on non-AI load. These are goals to measure against, not guarantees.

**Tooling:** the repo has a `loadtest/` directory — use it rather than adding a framework.
Stub the AI provider so cost is not incurred; AI latency is the vendor's, not ours.

**Report:** environment, dataset size, concurrency, p50/p95/p99, error rate, and the
bottleneck. Without those numbers CareerPilot cannot move past *ready for staging*.

---

## 9. Known limitations

- **Four analytics distributions are unavailable by design.** Current Role, Resume,
  Interview and Company Readiness are computed on demand and never persisted; a cohort
  distribution would require a per-student fan-out. The API returns
  `coverage: 'unavailable'` with a reason and the UI renders it as such. See
  [ANALYTICS_METRICS.md](./ANALYTICS_METRICS.md).
- **Two encryption fallbacks remain** (`settingsService`, `leadSourceConfigController`),
  pending the ordered rotation in §2.
- **The sales funnel counts what it counts.** Its population is now the shared enrolment
  predicate; historical screenshots taken before that fix will not reconcile.
- **No rate limiting exists** anywhere in the application. Entitlement gates, the
  one-live-interview lock, `maxAttempts` on mock tests and the one-open-assessment index
  are what currently bound AI spend.
- **Career stage and role distribution** are not exposed by the analytics API; the Students
  tab says so rather than inventing them.
- **No load testing has been run.**

---

## 10. Future work — explicitly out of CareerPilot V1

- **Readiness history snapshots** — an append-only record written at assessment submit,
  interview finalize and resume score would make the four unavailable distributions, and
  readiness *trends*, aggregatable. Only measures from the day it ships.
- **Authenticated LMS → CareerPilot upgrade.** Public signup now correctly refuses an
  existing non-CareerPilot account (it used to allow account takeover). An LMS student who
  wants CareerPilot therefore has no path. The fix is a logged-in "join CareerPilot" action
  that preserves identity and contact ownership — deliberately not built here.
- **Rate limiting** on the AI-expensive endpoints.
- **A global company catalogue** with tenant overrides, instead of per-tenant duplication.
