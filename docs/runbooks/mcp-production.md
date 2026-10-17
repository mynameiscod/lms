# Production MCP on the existing LMS VPS

The production MongoDB conversion succeeded on 17 October 2026. Operator output
confirmed MongoDB 8.2.7, existing volume `lms_mongodb_data`, authenticated replica
set `lms-rs0`, majority transactions, localhost publication and LMS readiness.
The recovery directory is `/root/lms-mcp-production/20261017T153614Z`; its keyfile
is mounted by MongoDB and must be retained. Subsequent public `/api/health`
reported ready, with MongoDB/Redis available. The active LMS is blue, port 5001.
The only local `deploy-image.sh` change is its executable bit.

## Deployment choice

The full LMS currently uses an administrator database account. Enabling MCP in
that process would not provide the required database-enforced audit protection.
This package runs the **same compiled MCP router, LMS password verifier, tenant
checks and tool policies** in a separate Node 22 process with a dedicated MongoDB
account. It reads the existing production LMS; no fixtures or duplicate users
are created. The existing LMS application, encryption/signing keys, scheduled
jobs, legacy MCP and synthetic test environment are left in place.

This is an explicit production deployment alternative to updating the complete
LMS application. It does not require merging or replacing the live master
checkout. The application release/security review requirements in
`mcp-release-gate.md` still apply to the exact gateway commit and configuration;
automated rehearsal does not constitute independent security review. The actual
ChatGPT connection must be checked with the selected production account after
deployment. No claim of that check is made from synthetic CI evidence.

| Setting | Production value |
| --- | --- |
| MCP endpoint | `https://platform.codebegun.com/mcp` |
| Issuer | `https://platform.codebegun.com` |
| Client ID | `codebegun-production-chatgpt` |
| Authentication | OAuth authorization code + S256 PKCE; public client, no secret |
| Exact registered callback | `https://chatgpt.com/connector_platform_oauth_redirect` |
| Backend | `codebegun-mcp-production`, `127.0.0.1:5011` |
| Database | existing `lms-saas`, `mongodb:27017`, replica `lms-rs0` |
| Runtime DB user/role | `codebegun_mcp_runtime`, no inherited admin/readWrite roles |
| Local protected configuration | `/root/lms-mcp-production/app` |
| Default scopes | connect, students, batches, offline refresh |

The runtime account has `find` on the nine LMS collections used by MCP, read/write
on MCP OAuth/rate-limit collections, and only insert/read/index inspection on the
audit collection. No LMS insert/update/delete or audit update/delete privileges
are granted. Preparation uses an ephemeral container with existing administrator
credentials. Those credentials are never mounted in the running gateway.

Nginx receives an additional include inside the existing platform HTTPS server.
Only MCP/OAuth/discovery paths use the new backend. Forwarded headers are replaced,
MCP request access/error logging and caching are disabled, and the existing LMS
upstream, static files, certificates and other routes are preserved. A failed
configuration test or post-reload verification restores the previous site and
stops a newly started MCP service. The repository Nginx template retains the
optional include for future deployments.

## Operator sequence

Use a reviewed feature-branch commit whose **Production MCP deployment rehearsal
(synthetic)** and other CI jobs have passed. Run from `/root/lms-mcp-test`, never
point `scripts/mcp-test.sh` or its preparer at production.

```sh
cd /root/lms-mcp-test
git pull --ff-only origin feature/mcp-role-permissions
python3 scripts/mcp-production.py plan
python3 scripts/mcp-production.py prepare
python3 scripts/mcp-production.py enable
python3 scripts/mcp-production.py access-plan
```

`plan` is read-only. `prepare` builds committed source with the root workspace
lockfile, prepares only MCP indexes and the dedicated DB account, and verifies
its effective privileges plus real transaction support. It keeps credentials
under the root-only state directory. Individual files are readable by the
non-root container through read-only bind mounts; their parent remains 0700.
`enable` starts and checks the new process, installs routing, and checks public
HTTPS discovery and rejection of anonymous MCP calls. It does not grant a user
access. The LMS remains available during these steps.

The default grants access to students and batches only. If the owner explicitly
needs every read domain, replace the **first** prepare command with
`python3 scripts/mcp-production.py prepare --all-read-domains`. This includes
attendance, assessments, finance, placements, CRM leads and call summaries. Do
not choose it merely to fix a connection error. Installed scopes cannot be
silently expanded by rerunning preparation; review an upgrade instead.

`access-plan` prompts for an **existing production LMS email**, never a password.
It prints the account, tenant and exact proposed MCP permissions without changing
them. The account must be active and belong to an active tenant. A global account
without a tenant is not a supported substitute for a tenant-owned account.

After reviewing the displayed account and scopes, grant exactly that access:

```sh
python3 scripts/mcp-production.py access-apply
```

This root-only operator alternative is useful while the old LMS permission UI
does not yet display the MCP catalog. It creates a separate role for just the
selected account, copying its current native permission set from its existing
tenant-owned role or the **running LMS** default map. It adds only the displayed
MCP keys and assigns that role atomically with an audit event. It does not edit a
shared role, change the base user role, add native business permissions, or bypass
tenant, module, batch or CRM restrictions. A changed account/role invalidates the
plan. The original assignment is retained for explicit revocation. Once the full
LMS branch is deployed, these keys are also available in Roles & Permissions.

## Connect the production app

Create a separate OAuth MCP connection with the endpoint/client ID above; leave
the client secret empty. Use the actual LMS email/password in the CodeBegun login
page and approve consent. Do not use the synthetic `@mcp-test.invalid` account or
its password. Check that the callback shown by the client exactly matches the
registered value before proceeding.

The default account exposes three tools: student count, student list and batches.
Compare the count with the same tenant in the LMS, and verify the correct tenant
and record restrictions. The existing test connection still returns synthetic
data; select the production connection for this verification. Disconnect at
`https://platform.codebegun.com/mcp-oauth/connections`.

## Verification, interruption and rollback

```sh
python3 scripts/mcp-production.py verify
# Disable only the new gateway and its external routes:
python3 scripts/mcp-production.py disable
# Revoke the saved individual grant, restore its original role and revoke tokens:
python3 scripts/mcp-production.py access-revoke
```

Disabling the service retains audit history and does not remove OAuth grants.
Re-enabling can revive unexpired grants unless they are explicitly revoked. The
operator revoke refuses a subsequently changed/shared role rather than overwrite
later administration. No database snapshot is restored and no database volume
is touched by these commands.

Keep both the MongoDB recovery directory/keyfile and the gateway state directory.
If preparation is interrupted, rerun the same command/commit; stored credentials
are retained. If enablement is interrupted, `disable` stops the gateway and
blocks its routes; rerun `enable` after reviewing the state. The Nginx original is
saved as `nginx-before.conf`. Never overwrite a later edited site with that file
without inspecting the difference. Do not run the earlier standalone-MongoDB
rollback after enabling MCP.

Keep the new include when installing other Nginx configuration, and the migrated
`docker-compose.override.yml` during future LMS deployments. The gateway build
does not run the live `deploy-image.sh` or change its executable bit. Full LMS
upgrades and gateway commit/scope upgrades remain separately reviewed changes.

## Rehearsal

`ops/mcp-production/rehearse-app.sh` refuses a host containing `lms-mongodb`.
In disposable CI it uses MongoDB 8.2.7 and synthetic tenants to test the production
image, repeat index/user preparation, exact runtime privileges, database-denied
LMS/audit modifications, private and real HTTPS OAuth/PKCE/tool flows, preserved
LMS records, individual access preview/grant/revoke, shared-role preservation,
stale-plan rejection and restricted-scope discovery/login. Focused installer
tests verify live Nginx preservation and recovery after public verification fails.

References: [MongoDB collection privileges](https://www.mongodb.com/docs/manual/core/authorization/),
[Nginx locations](https://nginx.org/en/docs/http/ngx_http_core_module.html#location).
