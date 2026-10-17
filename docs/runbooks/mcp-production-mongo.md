# Existing production MongoDB: separately reviewed MCP prerequisite

This is the database-infrastructure step of the MCP production rollout. It does
not merge or deploy the MCP application, enable OAuth, seed users, change roles,
rotate passwords/JWT/encryption keys, or change the locally modified deployment
script. Application release gates in `mcp-release-gate.md` still apply.

## Confirmed target (operator output, 17 October 2026)

| Setting | Observed value |
| --- | --- |
| Application | `https://platform.codebegun.com`, `/root/lms`, master `84530751` |
| Active application | `lms-server-blue`, localhost port 5001 |
| Additional database client | `codebegun-mcp` |
| MongoDB | `lms-mongodb`, version 8.2.7, authenticated standalone |
| Running image | `sha256:d65a15bd109e970d7dab5496d0a4254705793b8a5c49e344aa6126d46b0e4630` |
| Data | existing Docker volume `lms_mongodb_data`, approximately 650 MB |
| Network | `lms_lms-network`, Compose project `lms` |
| Compose | `/root/lms/docker-compose.yml`, Docker Compose v5.1.1 |
| Disk | approximately 343 GB free |
| Drift | running MongoDB published on all host interfaces; checked-in Compose binds localhost |
| Local work | `deploy-image.sh` is modified; preserve it |

The script verifies credentials and the remaining configuration on the host. It
refuses a changed image/version/volume, another Compose configuration, different
credentials, previous replica-set metadata, insufficient disk space, or an
unhealthy LMS **before** starting maintenance. Do not weaken a failed guard to
force a deployment.

## Change and scope

The migration retains the running MongoDB image, existing data and configdb
volumes, authentication database, and application containers. It creates a
single-member replica set `lms-rs0`, advertising `mongodb:27017` on the existing
Docker network, with a generated private internal-authentication keyfile.
MongoDB is published only on `127.0.0.1:27017`. Remote database clients must use
the appropriate private network or SSH tunnel; confirm that no required client
depends on the public port before the window.

A single-member replica set enables transactions. It does **not** provide
redundancy or survive loss of this VPS. Multi-host replication and off-host
backup retention remain separate infrastructure work. The cold backup created
here is a migration recovery artifact on the same VPS, not disaster recovery.

During maintenance the script:

1. Stops the currently running LMS slots and legacy MCP client, then stops
   MongoDB cleanly. The website can return 502 while the app is paused.
2. Creates a compressed cold backup and SHA-256 checksum under a root-owned
   mode-700 directory outside the checkout. Saves configuration and runtime
   metadata privately, including the unchanged local deployment script.
3. Restores the backup into a disposable volume with **no network access**.
   Verifies LMS user/tenant/role/batch counts and collection/index definitions.
   Rehearses authenticated conversion and an actual read-only transaction with
   majority write concern using that restored copy.
4. Only after rehearsal passes, installs a local
   `/root/lms/docker-compose.override.yml` and recreates **only MongoDB**, using
   the original external volumes and pinned local image. No volume is deleted
   or restored in production. The override persists for subsequent ordinary
   Compose invocations (explicit `-f` deployments must include it).
5. Verifies primary election, internal authentication, majority transactions,
   retained data/indexes, the exact image/volume and localhost port binding.
   Restarts the same application containers and checks LMS readiness.

Reserve a maintenance window with no active exam, enrollment/payment processing
or other writers. Backup and rehearsal time depends on disk speed/data size;
there is no zero-downtime claim. Keep a second root terminal available for
recovery. The live website must be checked after the script succeeds.

## Operator commands

Run from the separate MCP checkout, leaving `/root/lms` and its deployment-script
change in place. Use the reviewed branch commit with the synthetic MongoDB 8.2.7
migration CI job passing.

```sh
cd /root/lms-mcp-test
git pull --ff-only origin feature/mcp-role-permissions
python3 scripts/mcp-production-mongo.py plan
```

`plan` is read-only. To carry out the reviewed database change during the
maintenance window:

```sh
cd /root/lms-mcp-test
python3 scripts/mcp-production-mongo.py migrate
```

Record the printed backup/rollback directory. Expect a final `PASS` for the
original volume/image, authenticated replica set, majority transactions,
localhost port and LMS readiness. Verify the live LMS login, a student list,
and a normal database-backed screen. This step leaves MCP disabled.

The generated override requires modern Docker Compose supporting `!override`
(2.24.4 or newer; the observed v5.1.1 qualifies). Before later deployments,
ensure the locally modified deploy script uses that Compose version and includes
the override. Never reintroduce the old public port or an unpinned `mongo:latest`
deployment by omitting the override. Keep the keyfile and state directory.

## Failure and rollback

Before the production conversion, a failed backup/rehearsal restarts the original
MongoDB and application containers. After conversion, an unsuccessful database
or application readiness check attempts a configuration rollback on the **same
live volume**, retaining localhost-only publication and the pinned image.
It never overwrites current records with an older backup.

For a deliberate configuration rollback before any subsequent application
deployment, use the exact state directory printed by the migration:

```sh
python3 /root/lms-mcp-test/scripts/mcp-production-mongo.py rollback \
  --state-dir /root/lms-mcp-production/TIMESTAMP_FROM_OUTPUT
```

The script rejects changed application container IDs or a newly running slot.
Once MCP has been deployed/enabled, disable MCP and review the current deployment
before changing database topology. Standalone mode leaves replica metadata in
the `local` database; a second conversion requires review rather than deleting
that metadata automatically. The script deliberately refuses a blind rerun.

If the terminal/host stops mid-migration, inspect the private `state.json` and
current containers from the recovery terminal. `applying` and `rolling-back`
states support the rollback command above. A state before `applying` has not
installed a production replica-set override: restart the original MongoDB and
the recorded dependent containers, then check readiness. Never use `down -v`,
delete the production volume, run the synthetic staging preparer against real
data, or restore a backup as a routine configuration rollback.

## Validation and next production step

`ops/mcp-production/rehearse.sh` runs only on a fresh disposable CI project with
synthetic data. It tests wrong-volume rejection, cold-backup restoration,
MongoDB 8.2.7 conversion, authentication, transactions, localhost-only binding,
preservation of local files, rollback retaining post-conversion writes, and
automatic rollback after failed application readiness. The fixture readiness
endpoint is not a substitute for testing the real LMS on the VPS.

After successful operator evidence, finish the separate MCP application release:
review/merge the exact tested application commit, prepare production MCP indexes
with migration credentials, use the required runtime database privileges,
configure OAuth/proxy routes with redacted logs, explicitly grant the intended
LMS role permissions, enable MCP and connect the actual production LMS account.
Do not point the synthetic test harness at the production database.

References: [MongoDB standalone conversion](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/),
[MongoDB filesystem backups](https://www.mongodb.com/docs/manual/tutorial/backup-with-filesystem-snapshots/),
[Docker Compose merge and override rules](https://docs.docker.com/reference/compose-file/merge/).
