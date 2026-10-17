# MCP deployment and release gate

Merging and production deployment require owner approval. This branch does not deploy, merge, register an external connector, initiate calls, or grant users permissions. MCP remains off unless `MCP_ENABLED=true` is explicitly set.

## Before enabling in staging

For a single VPS with a live LMS, use the [isolated synthetic MCP test package](mcp-single-server-test.md) to verify OAuth and connector behavior without starting LMS jobs or using production data. It is a focused MCP harness; the complete LMS and production infrastructure checks below still apply.

1. Use an isolated staging copy of LMS data with two synthetic tenants. Reuse the existing LMS MongoDB connection and account collection; never copy production credentials into Git or tests.
2. MongoDB must be a replica set or sharded cluster with transaction support, majority writes and backups. A standalone MongoDB is unsupported. Convert it through a separately reviewed infrastructure change; do not improvise a production conversion while deploying this feature.
3. Build from the repository root using the committed workspace lockfile:
   ```sh
   npm ci
   npm run build
   npm run test:unit --workspace=server
   npm run test:integration --workspace=server
   CI=true npm test --workspace=client -- --watchAll=false
   ```
   MongoDB integration tests need Node >=20.19 (the existing test dependency's requirement). CI runs them on Node 22 with disposable MongoDB 7.0.24. The original server build/unit job also checks compatibility with the repository's Node 18 build target. Prefer a maintained Node runtime for new infrastructure; a runtime upgrade is a separate rollout decision.
4. Set configuration using `server/.env.mcp.example`. The issuer is the canonical HTTPS origin, with no trailing slash/path; resource is exactly `<issuer>/mcp`. Set `MCP_OAUTH_CLIENTS` to real registered client IDs, exact callbacks and minimal scope allowlists. For a confidential client use `client_secret_basic` and the SHA-256 hash of a random secret of at least 32 bytes. Deliver the raw secret through a secret manager, never Git or logs.
   Preserve the existing `ENCRYPTION_KEY`: the regression fix removes a published personal-field encryption fallback but preserves configured keys. Before any signing-key rotation, follow `docs/runbooks/jwt-secret-rotation.md` and verify existing encrypted fields/integration secrets still decrypt. Do not combine an unplanned key rotation with this rollout.
5. Prepare MCP collections/indexes using the built artifact, with staging database credentials:
   ```sh
   npm run mcp:prepare --workspace=server
   ```
   The script creates only MCP indexes and removes the prototype code `expiresAt` TTL, replacing it with `purgeAt` so replay history survives. MCP schemas disable automatic collection/index creation; application startup checks are read-only. The script does not enable the service. Existing prototype tokens are unusable because they lack a live grant. Grant the application account the minimum collection privileges it needs; allow audit insert/read as operationally needed, but withhold audit update/delete from the application. Use separate migration credentials for index changes.
6. Configure the reverse proxy to forward `/mcp`, `/mcp-oauth/*`, `/.well-known/oauth-authorization-server` and both protected-resource metadata paths to Express. Preserve the canonical Host, overwrite forwarded-protocol/address headers, terminate TLS and restrict direct backend access. Set `TRUST_PROXY_HOPS` to the actual trusted hop count. Disable proxy caching and request/response body capture for these routes. Access logs must omit query strings for OAuth routes, and APM must redact Authorization, Cookie, Set-Cookie, passwords, codes, state and tokens. The application already isolates its own logging and CORS.
7. In existing **Roles & Permissions → ChatGPT / MCP Access**, explicitly grant `mcp_connect`, the necessary domain read keys and the native feature permissions documented in the tool catalog. No default role or Super Admin bypass is added. Give instructors/staff the appropriate batch assignments; verify CRM ALL/TEAM/OWN settings. OAuth scopes never grant an LMS role permission.
8. Set `MCP_ENABLED=true` in staging and restart the staging service. Enabled startup checks require valid metadata, transactional MongoDB and all MCP indexes. Missing configuration/storage fails closed.

## Staging acceptance

- Read both discovery documents and confirm external issuer/resource/endpoint URLs.
- Connect an actual MCP client using its registered callback and `resource` parameter. Use authorization code + S256, sign in with an existing LMS account and approve the explicit consent page. Verify state and issuer on return.
- Verify no-refresh without `offline_access`, refresh rotation, replay rejection, expiry, revocation and the user-facing `/mcp-oauth/connections` disconnect page.
- Test student self scope, assigned/unassigned instructor batches, tenant-admin data, all CRM ownership levels, Outpero joins, a second tenant, forged tenant headers and foreign record IDs. Compare fee totals and exam/attendance summaries with LMS source records.
- Disable a user/tenant, remove a role/permission/client and change a password. Verify access stops on the next request. Confirm that ordinary LMS session JWTs never authenticate at `/mcp`.
- Confirm allowed, denied and failed audit events contain no sensitive payloads. Simulate audit/storage outage and confirm no data or tokens are returned. Monitor 401/403/429/503, transaction aborts, query timeouts, latency and audit write failures.
- Run the release tests and obtain an independent security review plus actual client interoperability evidence. Automated tests do not replace these staging checks.

## Production approval and rollout

After the above evidence is reviewed, request approval for the specific commit, database preparation and production configuration. Only then merge/deploy through the existing release process. Do not grant broad MCP permissions just to make a connector work.

The fastest application rollback is `MCP_ENABLED=false` and a restart; all MCP/OAuth routes return 404 while ordinary LMS routes continue. To permanently invalidate existing connections, revoke grant records through the approved administration procedure before later re-enabling. Reverting the application commit alone does not remove grants. Do not drop the audit collection or restore a database snapshot merely to roll back the feature.

## Verification report

See [the implementation report](mcp-implementation-report.md) for the exact tested commit, commands, outcomes and remaining environment/staging gates. No production-readiness claim is made without that evidence.
