# CodeBegun Universal MCP — verified implementation report

- Repository: `mynameiscod/lms`
- Branch: `feature/mcp-role-permissions`
- Pull request: [#52](https://github.com/mynameiscod/lms/pull/52)
- Implementation source revision: `9ff20ac634f843f60d18f989481b54006ef838ed`
- Task-start revision: `c0815e5d164e367ba0a733016bb0085a9cb876c6`
- Verification date: 2026-10-15

## Delivered

- **Existing LMS identity:** first-party sign-in shares the LMS password-verification service and existing account, tenant and role collections. No separate user directory, password export, or LMS-JWT bearer shortcut.
- **OAuth authorization-code + mandatory S256 PKCE:** pinned maintained OAuth engine, exact registered callbacks, explicit account/tenant/client/scoped consent, issuer/resource discovery and binding, public clients and confidential `client_secret_basic` clients. OAuth 2.1 is a draft; the supported profile and protocol revisions are documented.
- **Token lifecycle:** opaque 256-bit credentials hashed at rest; five-minute authorization codes; access tokens capped at 15 minutes; explicit offline access, one-time refresh rotation, seven-day idle expiry and a 30-day absolute grant lifetime. Code/refresh replay revokes the grant family. RFC 7009 revocation and user-facing disconnect-one/disconnect-all are included.
- **Atomic persistence:** snapshot/majority MongoDB transactions serialize code redemption, refresh and revocation on the grant document. Persistence/audit failure rolls back token issuance; deliberate replay revocation survives expected protocol errors.
- **Fifteen bounded read tools:** students, batches, attendance, exams, fees, canonical placement outcomes, CRM leads and Outpero history. Tools require consent plus current MCP/native LMS permissions. Student self scope, assigned instructor/staff batches, CRM ALL/TEAM/OWN, tenant module switches and student batch restrictions are enforced. Even Super Admin needs an explicitly assigned tenant-owned role for MCP access.
- **Tenant isolation and minimization:** server-derived tenant constraints, tenant-validated roles/batches, bounded pagination, query/response limits and explicit projections. No contact exports, hidden exam answers, payment instruments, recordings, transcripts or raw webhooks. Call summaries are bounded, untrusted source text and may contain personal information supplied by the source system.
- **Operational controls:** isolated HTTPS/Host/CORS boundary, browser CSRF/session rotation, security headers, distributed rate limits and allowed/denied/failed audit records without credentials or tool payloads. Data/token responses fail closed when audit persistence fails.
- **Deployment controls:** disabled by default, explicit collection/index preparation, no automatic MCP index creation, read-only startup checks, prototype TTL migration and rollback instructions.

## Verification

The final source CI run is [CI #113](https://github.com/mynameiscod/lms/actions/runs/38714582683). GitHub tests the PR merge result against `master`; local builds/tests also checked the feature branch. The report-only commit following the source revision does not change executable code.

| Check | Verified result |
|---|---|
| Shared TypeScript build | Passed |
| Server TypeScript build, including test source | Passed |
| Client production build | Passed; 115 eslint warnings in the PR merge result, matching the lowered ratchet |
| Full server unit regression suite | 4,360 passed; 42 previously skipped tests in two suites remain skipped |
| MCP-specific suite | 138 passed: 68 unit tests and 70 real replica-set integration tests |
| Existing MongoDB integration regressions | 440 passed across 26 suites |
| Client tests | 92 passed across eight suites |
| Repository safety | CRLF/NUL checks, execution-event schema synchronization, shell syntax and Compose validation passed |

MCP unit tests are included in the full unit count; do not add the two counts. No MCP tests are skipped. The two existing skipped attendance suites are `attendance.service.test.ts` and `attendance.integration.test.ts`. New MCP attendance coverage executes real database queries.

CI builds/shared/client/unit checks use the repository's Node 18 target. MongoDB integration uses Node 22 and disposable MongoDB 7.0.24, including a real replica set for OAuth transactions. Local MongoDB startup is blocked by the workspace (`open: Operation not permitted`), so real-database verification was performed in GitHub CI, not simulated locally. The local unit runner also reported an existing worker teardown warning while exiting successfully; this is not represented as a zero-warning test run.

Security regressions cover consent/CSRF, exact redirects/resource/issuer, invalid PKCE, public/confidential client authentication, cross-client exchange and revocation, expiry, narrowed refresh scope, code/refresh replay, simultaneous redemption, refresh/revocation races, transaction rollback, audit outages, immediate account/tenant/role/password/client changes, explicit Super Admin opt-in, batch restrictions, all tool domains and foreign tenant identifiers.

## Failures corrected during verification

- Prevented the existing Super Admin “all permissions” default from silently enabling MCP.
- Applied student batch feature restrictions and matched the native exam-read permission list.
- Corrected unique tenant fixture slugs and explicitly prepared test indexes; tested missing indexes and obsolete replay-breaking TTL detection.
- Updated two stale assignment-runner mocks to support the grader's batch API without weakening their evidence/hidden-test assertions.
- Quoted Jest file patterns so the `roleSkillBlueprint` unit suite runs in the unit group instead of being misclassified as integration.
- Removed a published personal-field encryption fallback while preserving configured encryption keys, with round-trip/tamper regressions.
- Fixed clean-checkout Compose validation with an empty CI-only environment file; removed unused frontend declarations/imports and lowered, rather than raised, the warning baseline.

## Essential deployment steps

1. Obtain approval for the reviewed commit and production rollout. No merge or deployment was performed by this task.
2. Use staging first with transactional replica-set/sharded MongoDB, backups, the existing LMS secret-managed connection and a supported Node runtime. Preserve configured encryption keys; handle any signing-key rotation through the existing rotation runbook.
3. Configure canonical HTTPS issuer/resource, exact preregistered clients/callbacks and minimal scopes from `server/.env.mcp.example`. Build with the root workspace lockfile, then run `npm run mcp:prepare --workspace=server` using migration credentials against staging.
4. Route `/mcp`, `/mcp-oauth/*` and discovery paths through the trusted TLS proxy; set the correct trusted hop count and redact upstream OAuth query/body/header logging. Apply minimum application database privileges and audit retention/append-only controls.
5. Explicitly grant `mcp_connect`, required domain read keys and native LMS permissions through existing Roles & Permissions; verify batch assignments and CRM ownership. Set `MCP_ENABLED=true` only in staging and run the complete acceptance checklist with an actual registered MCP client and two synthetic tenants.
6. Review staging interoperability/security evidence, then request production merge/deployment approval. Application rollback is `MCP_ENABLED=false` plus restart; revoke grants separately if all existing connections must stay invalid after re-enabling.

The complete procedure is [mcp-release-gate.md](mcp-release-gate.md); the [tool catalog](../design/mcp-integration.md) and [OAuth architecture](../design/mcp-chatgpt-oauth.md) describe supported behavior. Automated verification does not constitute independent security certification or a completed staging connector test. Dynamic client registration, later MCP protocol revisions, writes, bulk exports, call initiation, recordings and transcripts are outside this implementation.
