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
lockfile and `tsconfig.runtime.json` (test suites are excluded), prepares only
MCP indexes and the dedicated DB account, and verifies
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
them. This initial-production operator accepts only an active **SUPER_ADMIN with
no custom role**, belonging to an active tenant. A global account without a tenant
is not a supported substitute for a tenant-owned account. Student, staff,
instructor, tenant-admin and existing custom-role accounts are refused without
changing them. Broader rollout requires a separate review of native LMS role
behavior; copying permission keys alone does not preserve that behavior.

After reviewing the displayed account and scopes, grant exactly that access:

```sh
python3 scripts/mcp-production.py access-apply
```

This root-only operator alternative is useful while the old LMS permission UI
does not yet display the MCP catalog. It creates a separate role for just the
selected default Super Admin, copying its current native permission set from the
**running LMS** default map. It adds only the displayed
MCP keys and assigns that role atomically with an audit event. It does not edit a
shared role, change the base user role, add native business permissions, or bypass
tenant, module, batch or CRM restrictions. A changed account/role invalidates the
plan. The original assignment is retained for explicit revocation. Once the full
LMS branch is deployed, these keys are also available in Roles & Permissions.
The new role is an explicit permission snapshot; review it when future LMS
releases change the default Super Admin permission catalog.

The restriction is intentional: some legacy LMS routes treat any custom role
differently from a default student/staff role. Cloning an existing role also
changes role-ID-based lead distribution and severs later shared-role edits.
The initial operator refuses those transformations.

### Diagnose an account preview failure

If the endpoint verification passed but `access-plan` printed a generic operator
failure, update the host checkout and run the read-only diagnostic:

```sh
cd /root/lms-mcp-test
git pull --ff-only origin feature/mcp-role-permissions
python3 scripts/mcp-production.py diagnose-account --email YOUR_EXISTING_LMS_EMAIL
```

This works with the already deployed `554a02a5` gateway; no image rebuild, service
restart or preparation upgrade is needed. It uses that container's limited
runtime database account and projects only account role/activity/tenant fields.
It reports missing/inactive accounts or tenants, custom-role assignment, and
whether the running LMS permission map can be loaded. It reads no password
fields, prints no raw subprocess errors, and grants no access. `access-plan`
also performs the diagnostic before running its administrator-backed preview.
Retain the deployed image/state; the diagnostic checkout is not a service upgrade.

After a normal blue/green LMS deployment, the installer resolves the current
container from `/etc/nginx/active-slot.conf`. It checks that this container is
running on the expected localhost port and production network, that the saved
MongoDB container is still running, and that public LMS readiness passes. The
stopped slot recorded during initial gateway installation is not used for account
previews or routine verification. Installation history and the gateway image stay
unchanged.

If the diagnostic previously reported `liveLmsPermissionMap: unavailable` because
the saved blue container stopped after switching to green, pull the fix and create
a fresh preview:

```sh
cd /root/lms-mcp-test
git pull --ff-only origin feature/mcp-role-permissions
python3 scripts/mcp-production.py access-plan --email YOUR_EXISTING_LMS_EMAIL
```

The preview prints `liveLmsContainer`. Review the account, tenant and scopes, then
run `access-apply` as above. Each new plan records the live container ID/image and
its permission map. Apply rechecks both before the administrator-backed grant; a
slot/container or permission-map change requires a fresh plan. Plans from older
installer versions also require a fresh preview. No `prepare`, `enable`, image
rebuild, state-file editing or container restart is required for this host fix.

If `access-apply` was interrupted and the LMS then deployed, preserve the original
plan. If a new preview reports an existing custom role, the original grant may
already have committed. Use the explicit `access-revoke` command to roll it back
before starting a fresh preview. When the applied-result file is absent, revoke
uses the original saved plan and the deployed operator still checks the exact
current account, role ID, permission set and sole ownership before changing
anything. An uncommitted plan or a subsequently modified/shared role is refused;
the saved plan is retained on failure. This recovery never bypasses the new
deployment checks to grant stale permissions.

Resolve the reported cause through a reviewed account decision. Do not remove a
custom role, promote an account or invent tenant membership just to pass the
initial opt-in check. The account's actual role and tenant determine the next step.

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

### Connected app with no tools: repair OAuth scope discovery

The original gateway advertised only `mcp_connect` in both its anonymous
`WWW-Authenticate` challenge and resource metadata. A client following those
values could complete OAuth successfully but receive zero tools, because every
tool also requires a domain read scope. The original smoke test hardcoded all
read scopes and missed that real-client path. The corrected smoke test derives
its scopes from discovery before completing real login, consent and PKCE.

The fix advertises the existing configured resource scopes (students/batches by
default). `offline_access` remains in authorization-server metadata and requires
explicit consent. Existing tokens/grants are never broadened. If an older token
has only connect access while the account and client are eligible for tools,
`tools/list` returns a `403 insufficient_scope` challenge for those eligible
domains, allowing the client to request new consent. Accounts with no eligible
tools do not receive a misleading scope-upgrade prompt.

For an already enabled production gateway, after the reviewed commit passes CI:

```sh
cd /root/lms-mcp-test &&
git pull --ff-only origin feature/mcp-role-permissions &&
python3 scripts/mcp-production.py upgrade &&
python3 scripts/mcp-production.py diagnose-tools --email YOUR_EXISTING_LMS_EMAIL
```

`upgrade` builds the committed archive and verifies the new image's limited
runtime DB privileges while the previous gateway remains running. It then
briefly replaces only the MCP container on localhost 5011. The LMS, MongoDB,
Nginx routes, credentials, account role and OAuth grants are retained. The old
container is kept with automatic restart disabled. Startup, public verification
or advertised-scope failures restore the old gateway. A journal written before
cutover supports recovery after interruption; host operator commands use an
exclusive lock. A runtime configuration change during the build aborts cutover.

To recover an interrupted upgrade or roll back the latest completed upgrade:

```sh
python3 scripts/mcp-production.py upgrade-rollback
```

Recovery identifies the exact old and replacement containers and does not depend
on public LMS health or the new discovery behavior. It never restores a database
snapshot. Keep `/root/lms-mcp-production/app` and retained rollback containers.
If runtime configuration changed after cutover or the retained container is
missing, recovery stops the identified replacement and preserves the journal;
restore the reviewed configuration/container before retrying recovery.

The read-only `diagnose-tools` command also works before the image update. It
streams a diagnostic into the existing gateway, uses its limited runtime account,
and reports eligible tools, valid OAuth grant scopes, and the active student count
from the same tenant-scoped query as the MCP tool. For tenant/super admins it also
reports the LMS Users card's all-status student count. It prints no tokens,
passwords or student records. Its output is **server diagnostic evidence**, not a
claim that ChatGPT has successfully invoked the production tool.
It checks up to ten recent valid grants. `hasStudentCountGrant` describes those
grants; it cannot identify the access token currently held by ChatGPT, which may
have narrower scopes. `currentClientTokenChecked` is therefore always false.

After upgrading, open the CodeBegun Production app and reconnect its connected
account using the existing production LMS login. Some saved clients still request
only `mcp_connect`, even after discovery advertises the read scopes. The consent
page now offers **Allow read access** for that case: review the student/batch reads
and stay-connected permission, then choose that button. **Connect without data
access** deliberately keeps the grant connect-only. A request that already asks
for reads retains its exact requested scopes and the normal **Allow access** button.

This is fresh user consent, not a token or database override. The offered scopes
are saved in the login session, limited by client registration and current usable
tools, and rechecked at consent. Existing grants and refresh tokens never acquire
additional permissions. OAuth token responses report the actual approved scopes.
The optional recovery includes `offline_access` only when registered and shown,
so approving it permits refresh instead of requiring login again after 15 minutes.

Run `diagnose-tools --email YOUR_EXISTING_LMS_EMAIL` after consent. Confirm
`hasStudentCountGrant: true` and a grant with both `mcp_students_read` and
`mcp_batches_read`; `gatewayImage` identifies the running release. Then refresh
the app's tools. A connected-account badge alone does not prove read permission.
Do not delete/regrant the LMS account's MCP role for this problem. The configured
server URL and client ID remain unchanged. Confirm the three default tools appear,
then invoke `codebegun_student_count` through **CodeBegun Production** with `{}`.
Compare its active count to `activeStudentsFromMcpQuery`; the Users card uses
`lmsStudentsAllStatuses`, so inactive students can produce a different total.
Actual ChatGPT import, query and refresh behavior remain deployment acceptance
checks; synthetic CI cannot certify the user's private ChatGPT connection.

The student count and listing also reuse `LMS_USERS_FILTER`, the same audience
filter as the LMS Users screen. Earlier MCP images counted active CareerPilot-only
members too, which could produce a larger count than that screen. Members who
also have an LMS batch remain included. Tenant, assigned-batch, student-self and
active-status restrictions still apply. After updating, compare the diagnostic's
`activeStudentsFromMcpQuery` with `lmsStudentsAllStatuses`: the latter may be larger
because it includes inactive LMS students. Do not assume their totals are equal.

## Verification, interruption and rollback

### Expanding the three-tool installation after enablement

Use the reviewed `scope-plan` / `scope-apply` / `scope-rollback` workflow. This is
separate from an image upgrade. It reuses the current image, runtime credential,
client ID, callback, tenant and individual custom role. The full LMS, MongoDB
roles, Nginx and native LMS permissions are not changed. Only the MCP gateway is
briefly replaced to load its updated client scope allowlist.

From the committed operator checkout, first preview the additional domains:

```sh
python3 scripts/mcp-production.py scope-plan --email codebegun@gmail.com --all-read-domains
# Or request only the domains you need:
python3 scripts/mcp-production.py scope-plan --email codebegun@gmail.com --domains attendance,exams
```

Choose one preview command. The preview uses the existing limited runtime DB
account and makes no database or service changes. It saves a root-only local
plan and prints the operator commit, account, tenant, exact scopes, expected tool
list and a plan ID. All domains means students, batches, attendance, exams, fees,
placements, leads and calls. It is an explicit owner decision, not a repair for
a failed connection. The original `access-applied.json` and `access-plan.json`
must be retained and match the account. The workflow refuses a shared/modified
role, a different account, disabled modules or missing native permissions. It
never adds `manage_leads` or any other native business permission to satisfy MCP.

After reviewing and approving that exact preview, run the `scope-apply` command
printed by it, including its exact `--plan-id`. The plan expires after one hour;
source, container, files or account-policy changes require a fresh preview.
Apply uses a short-lived administrator-backed operator for the existing role's
MCP keys and an audit transaction. Administrator credentials are never mounted
in the gateway. Existing grants, access tokens and refresh tokens are not
broadened. Saved access-revocation records are updated together with the runtime
and installation state, retaining the original role/native-permission snapshot.

Then reconnect the CodeBegun Production account and explicitly approve the new
domains. A client that requests only students/batches will still receive those
scopes: request the expanded domains, or use the connect-only flow's displayed
**Allow read access** offer. Confirm the consent page lists every intended read
domain. Run `diagnose-tools --email codebegun@gmail.com`, refresh the app tools,
and check `tools/list` using the actual connected account. Fifteen tools are
expected only when all eight domains pass the role/module checks and fresh
consent includes them. `currentClientTokenChecked: false` remains an intentional
diagnostic limitation; an actual client invocation is still required.

An interrupted/failed cutover retains `scope-pending.json` and attempts automatic
rollback. To recover or roll back the latest completed scope change:

```sh
python3 scripts/mcp-production.py scope-rollback
```

Rollback restores the original role scopes, client configuration, saved access
records and original gateway. It revokes grants for this client that include
the removed domains, so they cannot revive during a future expansion; old
limited grants are retained. It requires no public LMS health. It refuses later
role/file/container changes rather than overwrite them, stops an identified
replacement when recovery cannot safely finish, and preserves the recovery
journal. Keep the root-only state directory, the exact reviewed operator source
and retained gateway containers. An intervening image/role/configuration change
can make an earlier scope rollback inapplicable and requires operator review.
Emergency `disable` remains available; recovery does not override a subsequent
disabled installation state. Pending scope recovery blocks other mutating
operator commands. Do not use `prepare --all-read-domains`, `upgrade`, direct
database edits or an LMS key rotation as substitutes for this workflow.

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
later administration. Revocation does not require the old LMS container or public
LMS readiness; it authenticates to the configured database and validates the
saved user/tenant/role. Disabling independently stops the gateway even if Nginx
validation/reload fails; in that case the command reports the routing repair
needed and keeps the deny configuration on disk. No database snapshot is restored
and no database volume is touched by these commands.

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

### Updating a preparation before first enablement

For the reviewed security correction after `9bb18a3f`, a preparation may be
updated **only if no gateway container, route snippet or saved account operation
exists** and its phase is still `preparing` or `prepared`:

```sh
cd /root/lms-mcp-test
git pull --ff-only origin feature/mcp-role-permissions
python3 scripts/mcp-production.py prepare --upgrade-prepared
```

This rebuilds the new committed source, retains the existing runtime password,
installation identity and scopes, saves the previous preparation state, and
rechecks indexes/privileges. It does not enable a service or grant access. It also
works as the initial preparation if none exists. An enabled or previously
disabled installation needs a separately reviewed service upgrade; this command
will refuse to replace it. Keep the same `--all-read-domains` choice if that was
explicitly selected originally; the update flag does not broaden scopes.

The original `9bb18a3f` archive build could compile the Puppeteer integration
test despite not installing the root browser-test dependency. That failure
occurs before the operator or database preparation runs. The correction excludes
test suites through the runtime TypeScript configuration, and CI builds the same
committed tar archive used on the VPS, so directory-context filtering cannot hide
the discrepancy again.

## Rehearsal

`ops/mcp-production/rehearse-app.sh` refuses a host containing `lms-mongodb`.
In disposable CI it uses MongoDB 8.2.7 and synthetic tenants to test the production
image, repeat index/user preparation, exact runtime privileges, database-denied
LMS/audit modifications, private and real HTTPS OAuth/PKCE/tool flows, preserved
LMS records, rejection of student/staff/custom-role opt-in, default-admin access
preview/grant/recovery/revoke, stale-plan rejection and restricted-scope
discovery/login. Focused installer tests verify live Nginx preservation, stopping
the gateway when rollback/disable encounters a Nginx error, revocation without
the old live app, and credential-preserving updates of never-enabled preparation.

References: [MongoDB collection privileges](https://www.mongodb.com/docs/manual/core/authorization/),
[Nginx locations](https://nginx.org/en/docs/http/ngx_http_core_module.html#location).
