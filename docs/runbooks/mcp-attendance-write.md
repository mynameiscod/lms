# MCP attendance write rollout

This feature adds validation, create, bulk create (maximum 50), and explicit revision-checked updates. No deletion tool exists. Dates use Asia/Kolkata calendar days; persisted dates retain UTC midnight for compatibility with native LMS date filters. Legacy UTC and IST midnight records are checked together. Times are 24-hour HH:mm, OUT must follow IN on the same day, and absent/leave records cannot contain times. Future and impossible dates are rejected. MCP never sends attendance emails.

## Contract and import verification

`codebegun_validate_attendance` requires `mcp_attendance_read`, the attendance module and native attendance read/mark permission. It accepts `{batchId,date,records:[{studentId,status,inTime?,outTime?}]}` and never writes. Staff/instructors can access assigned active batches only; students cannot use the register validator. Existing rows include `recordId` and an opaque `revision` for corrections.

All three mutation tools require **all** of `mcp_connect`, `mcp_attendance_write`, an explicitly assigned tenant-owned custom role granting those keys, native `mark_attendance`, and the enabled attendance module. Students cannot write. Tenant and actor come from OAuth identity; caller `tenantId`, `markedBy`, remarks and unknown/nested fields are rejected. Tenant/Super Admins can use active batches in their tenant; other staff need an instructor assignment. Student records must be active STUDENT records in that tenant and batch, including for historical imports. Former/transferred students need separate membership review; this API does not guess historical enrollments.

`codebegun_mark_attendance` accepts `{studentId,batchId,date,status,inTime?,outTime?}`. `codebegun_bulk_mark_attendance` accepts the validator payload plus optional `dryRun:true`. Results are `created`, `already_exists`, `conflict`, `validation_failed`, or `permission_denied`; dry runs use `valid` for would-create entries. Invalid dates or malformed schemas reject the entire request; membership/time/duplicate/conflict failures are per entry. Valid entries in a bulk request commit together with their audit. An audit/transaction failure aborts all new entries. Identical create retries are safe; differing values never overwrite. Revalidate after any uncertain response. Bulk results preserve input order.

`codebegun_update_attendance` requires `{recordId,expectedRevision,status,inTime?,outTime?}` from a fresh validation result. It replaces status and times (omitted times are cleared), preserves identifiers/date/remarks, and changes `markedBy` to the authenticated actor. A stale revision fails. Updates are intentionally annotated non-idempotent: fetch a fresh revision and inspect the saved values before repeating a correction. Creates are idempotent; update has `destructiveHint:true`. Both writes and their record IDs/before/after status, times and revision metadata commit in the same majority-write MongoDB transaction. Audit update/delete is forbidden to the runtime account.

For the 8 October 2026 Alpha -06 register, validate only after matching students to batch `6a2fda2bcb4fea07199afca0`. Confirm ambiguous names and every proposed correction. Do not submit Pradeep while his batch differs. No real student data belongs in automated tests. After an approved import, run validation again: every submitted entry should return `already_exists` with the expected values. Save the per-entry execution summary, record IDs and revisions. Native LMS reads should show those dates too.

## Local and isolated test deployment

Use the reviewed feature commit, substituting its full SHA below. These commands never deploy production. On the VPS, preserve the existing separate worktree and uncommitted work; `git switch` deliberately refuses conflicting changes.

```sh
cd /root/lms-mcp-test
git fetch origin feature/mcp-attendance-write
git switch --detach REVIEWED_FULL_COMMIT_SHA
bash scripts/mcp-test.sh up
bash scripts/mcp-test.sh smoke
```

This rebuilds only the isolated test stack with synthetic tenants. The default test connector stays read-only and now exposes 16 read tools including register validation. Existing private client registrations remain untouched. To verify writes without using production records or widening that connector, run the automated replica-set and OAuth suites in this separate checkout (Node 22, npm and OpenSSL required):

```sh
npm ci
npx puppeteer browsers install chrome
npm run build --workspace=server
npm run test:mcp --workspace=server
```

Tests create disposable MongoDB replica sets and synthetic IDs. They exercise writes, concurrent retries, conflicts, batch/tenant denial, module/native/custom-role/token denial, audit rollback, timezone invariance, historical email suppression, migration refusal/backfill and explicit OAuth consent. Run the existing attendance regressions with:

```sh
npm test --workspace=server -- --runInBand --runTestsByPath src/tests/attendance.controller.test.ts src/tests/attendance.service.test.ts
```

The legacy attendance service and full-app integration files contain pre-existing skipped suites; the new MCP suite supplies real replica-set coverage. Avoid importing the skipped full-app suite just to run controller regressions, because it starts unrelated app background handles.

On a **disposable CI host only**, never the production VPS, run the exact image/least-privilege/recovery rehearsal:

```sh
bash ops/mcp-production/rehearse-app.sh
```

It refuses a host with `lms-mongodb`, builds the committed archive, prepares synthetic data, checks database privileges, explicitly activates attendance writes, obtains a fresh OAuth grant, creates/updates/retries a synthetic attendance record, then rolls the scope and privileges back. Retain its passing output with the reviewed commit.

## Native LMS prerequisite and duplicate migration

The new unique key is `(tenantId,batchId,studentId,attendanceDay)`. Its partial unique index is explicitly prepared, never auto-created at LMS startup. Native attendance document saves and leave-approval upserts now populate the same IST key. **Release the compatible Attendance model and MCP write-permission catalog addition through the normal reviewed native LMS release before activating writes.** Do not deploy this older MCP branch as the whole current LMS: port only `server/src/models/Attendance.ts` and the new `mcp_attendance_write` catalog entry in `server/src/middleware/roleGuard.ts` into the current release, review and run its normal release process. Scope preview refuses a running native LMS without the key support. All native attendance/leave writers and integrations must use this model; raw database importers must populate the same key. Never roll the native model back while MCP writes remain enabled.

To prepare the native prerequisite as a narrow patch in a separate current-master review branch (substitute the same reviewed feature SHA), use:

```sh
git -C /root/lms fetch origin master feature/mcp-attendance-write
git -C /root/lms worktree add -b release/mcp-attendance-day /root/lms-attendance-native origin/master
git -C /root/lms diff 8c19c72a0f8c646a04a39b151eec2837b1a417ba REVIEWED_FULL_COMMIT_SHA -- server/src/models/Attendance.ts server/src/middleware/roleGuard.ts > /tmp/mcp-attendance-native.patch
git -C /root/lms-attendance-native apply --check /tmp/mcp-attendance-native.patch
git -C /root/lms-attendance-native apply /tmp/mcp-attendance-native.patch
git -C /root/lms-attendance-native diff -- server/src/models/Attendance.ts server/src/middleware/roleGuard.ts
```

Review, test and release that narrow prerequisite through the current native LMS release process. These commands prepare a review branch; they do not run the full LMS deploy script or change the running service. If the worktree/branch already exists, inspect and reuse it rather than deleting it. A patch conflict needs a current-code review, not file replacement from the older MCP branch.

The duplicate scan is read-only and reports tenant/batch/student/day identifiers and counts (up to 101 groups), with no names, contact details or credentials. Preserve reports privately. Historical duplicates require owner review; this feature never deletes or merges them. An incorrect existing day key or invalid date also blocks migration. For legacy deployments that used timezones other than UTC/IST, review how dates were stored before approving IST backfill.

After backup and during an attendance maintenance window, pause all native attendance creation and leave approvals, integrations and MCP imports. The general LMS can stay running; pausing requires the site's existing operator controls and is explicitly attested by the migration flag. Keep writers paused until backfill and index creation finish. The migration changes only missing day keys, preserves dates and historical fields, and writes a transactional operator audit. Index creation follows that transaction; if interrupted, retain the journal and rerun while writers remain paused. Index creation itself rejects races/duplicates. Migration commands have a four-minute operator timeout; large histories need a separately reviewed maintenance window rather than bypassing a timeout/failure.

## Production deployment and scope activation

Do this only after owner approval for the exact commit, native-model prerequisite, backup, migration report and scope preview. No command here changes `/opt/codebegun-mcp` or the unrelated Python implementation. Keep `/root/lms-mcp-production/app`, its recovery records and retained rollback containers; never edit runtime.json by hand.

1. Release the compatible native model as described above through the current LMS release, then upgrade only the production MCP gateway:

```sh
cd /root/lms-mcp-test
git fetch origin feature/mcp-attendance-write
git switch --detach REVIEWED_FULL_COMMIT_SHA
python3 scripts/mcp-production.py upgrade
python3 scripts/mcp-production.py verify
python3 scripts/mcp-production.py attendance-check
```

2. Review duplicate output before mutation. After pausing writers, take and verify the normal backup, then backfill and create the index:

```sh
cd /root/lms
bash scripts/backup.sh
cd /root/lms-mcp-test
python3 scripts/mcp-production.py attendance-prepare --attendance-writers-paused
python3 scripts/mcp-production.py attendance-check
```

If duplicates/invalid data are reported, stop and review them; never automatically delete attendance. If interrupted, repeat `attendance-prepare` with the same protected journal after resolving the failure. It is repeatable and does not rewrite dates. Resume native attendance/leave writers only after successful preparation. The runtime cannot create/drop indexes or backfill historical data itself.

3. Preview the new write scope for the already opted-in account, retaining existing read scopes. Supply the real opted-in email privately to the shell prompt:

```sh
read -r -p 'Existing opted-in LMS email: ' MCP_ACCOUNT_EMAIL
python3 scripts/mcp-production.py scope-plan --email "$MCP_ACCOUNT_EMAIL" --domains attendance_write --authorize-attendance-write
```

If attendance read access is not already installed, use `--domains attendance,attendance_write` instead. `--all-read-domains` never includes attendance writes. Review the account, tenant, tools, proposed scopes and explicit attendance database actions. The flag permits the preview; it is not a substitute for reviewing its result. Native `mark_attendance` must already be present and is never added by this operator.

4. Apply the exact printed plan ID within one hour:

```sh
python3 scripts/mcp-production.py scope-apply --plan-id PRINTED_PLAN_ID
python3 scripts/mcp-production.py verify
python3 scripts/mcp-production.py diagnose-tools --email "$MCP_ACCOUNT_EMAIL"
unset MCP_ACCOUNT_EMAIL
```

The existing recovery journal precedes database/account/config changes. Apply changes the individual custom role and client allowlist, grants only attendance `find,insert,update,listIndexes` to the managed database role (audit remains insert/find/listIndexes), and recreates only the gateway with its read-only runtime mount. No attendance `remove`, unrelated LMS writes or unrestricted database roles are granted. MongoDB role commands cannot join transactions: exact old/new role privileges are checked and recovery accepts either state, then restores the old privilege set. Unrecognized role/user drift stops recovery and retains the journal. Existing access/refresh grants are never expanded.

## Connector reconnection and acceptance

Reconnect using a **fresh authorization request explicitly containing** `mcp_connect mcp_attendance_read mcp_attendance_write` (plus other approved read scopes and optional `offline_access`). The consent page must list **Create and explicitly update permitted attendance** for the intended account and tenant before approval. The existing “Allow listed read access” flow intentionally cannot grant writes. A cached partial read request, refreshing a token, or a Connected status alone does not enable writes. If the client keeps requesting old scopes, update/recreate its authorization request through its connector configuration; do not alter tokens, grants or runtime files to compensate.

Inspect the actual new connection's `tools/list`: it must include `codebegun_validate_attendance`, `codebegun_mark_attendance`, `codebegun_bulk_mark_attendance`, and `codebegun_update_attendance` with the documented annotations. Run read-only validation on the reviewed register and compare IDs/batches/times. Confirm unmatched names and conflicts before any production write. Verify a saved approved import with a second validation and the native LMS page. Do not run automated mutation probes on actual student records. A connection with a read-only token must still receive a scope challenge for a write call.

## Rollback and recovery

Revoke the newly added scopes and exact database privileges **before** rolling back the MCP image or native model:

```sh
cd /root/lms-mcp-test
python3 scripts/mcp-production.py scope-rollback
python3 scripts/mcp-production.py verify
python3 scripts/mcp-production.py upgrade-rollback
```

`scope-rollback` also recovers an interrupted `scope-apply` using its pending journal. It restores prior runtime/access recovery files, custom role and MongoDB privileges and revokes grants containing newly added scopes. Prior limited grants survive. `upgrade-rollback` restores the retained gateway, preserving scope state; image rollback alone does not revoke consent. If the service needs immediate isolation, use `python3 scripts/mcp-production.py disable`, retain all journals and resolve scope recovery before enabling again. Disabling does not itself revoke grants or database privileges.

Keep committed attendance records, audit events, day keys and the unique index. Rolling back software is not a reason to delete imported attendance or historical data. Correct an approved erroneous entry through an explicitly authorized revision-checked update, never a rollback data purge. Do not restore an entire database snapshot to undo this feature.

## Verification evidence

Local verification passed with synthetic data:

- `npm run build --workspace=server` and the committed-archive production image build.
- Full `npm run test:mcp --workspace=server`: 257 passing tests; a subsequent focused attendance run passed 28 tests, including the added competing-update race.
- Native attendance controller regression: 15 passing tests. The pre-existing service suite remains skipped (19 tests); the new MCP attendance suite uses a real disposable replica set.
- Linux installer, upgrade, scope and recording operator tests: 47 passing tests.
- `ops/mcp-production/rehearse-app.sh` through a Linux Docker harness: MongoDB 8.2.7, 119 private checks, 119 HTTPS checks, exact database privileges, explicit attendance scope activation and fresh OAuth consent, runtime create/update/idempotent retry, denied deletion and scope/privilege recovery rollback.

Production services, student records and OAuth grants were not modified. The real historical duplicate report and private connector callback acceptance remain operator rollout checks; synthetic tests do not substitute for those checks.
