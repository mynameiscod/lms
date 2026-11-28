# Production gateway review — 17 October 2026

The owner authorized a second reviewer. A separate AI reviewer inspected the
gateway at production branch commit
`9bb18a3f12c02ee181a4e8cc00744d03571f644c` (tree
`6a878671ed6a57f9c74e5a82f415c981d8f50937`) and then independently re-read the
corrections recorded with this report. The reviewer made no edits. This is a
scoped code review, not a formal third-party audit or a production penetration
test. Git history identifies the corrected source accompanying this report;
later changes require their own review.

## Findings and corrections

| Finding | Correction |
| --- | --- |
| Adding `customRoleId` to a default student/staff can change ordinary LMS authorization even when native permission keys are copied exactly. Cloning an existing custom role also changes role-ID-based lead distribution and detaches later shared-role edits. | The initial production operator now accepts only an active, tenant-bound, default `SUPER_ADMIN` with no custom role. Other account types are refused. This restriction applies to both preview and apply. |
| An Nginx validation/reload error could prevent emergency disable or failed-enable cleanup from stopping the gateway. | Container stopping is independent of Nginx recovery. Disable retains the deny snippet and reports any routing repair needed; failed enablement stops a newly started gateway in `finally`. |
| Normal LMS container replacement or a public LMS outage prevented saved account revocation. | Revocation no longer requires the previous LMS container ID or public readiness. Database authentication and exact user/tenant/role validation still apply. |
| The VPS archive build compiled a Puppeteer integration test without its root development dependency; CI's directory context had hidden that test. | Both MCP images use a runtime TypeScript configuration excluding test suites. Production CI uses `git archive HEAD` through stdin, matching the installer, and checks that the runtime imports while the browser test is absent. |

The owner reported the original build failure before the database operator ran.
The reviewed `prepare --upgrade-prepared` path supports this state and other
never-enabled preparations: it retains installation identity, credentials and
scopes, preserves the previous state, and refuses an existing gateway, route
snippet or saved account operation. It cannot upgrade a running installation.

The reviewer found no additional blocking token, tenant, PKCE, CSRF or runtime
administrator-credential exposure issue within the inspected code. That finding
is limited to this review's scope; it does not establish the absence of defects.

## Verification and remaining rollout evidence

Local verification passed the runtime TypeScript check, eight focused installer
tests, CJS and shell syntax checks, and patch whitespace validation. The synthetic
production rehearsal now also checks rejected student/staff/custom-role opt-in,
default-admin grant recovery, restricted-scope OAuth and revocation. The complete
CI run for the containing commit must pass before the VPS retry.

At review time the new production endpoint and account access were not enabled.
The VPS still needs successful preparation, public enablement verification, a
reviewed eligible account plan, and an actual ChatGPT connection checked against
that tenant's LMS records. Synthetic test-client success does not replace that
production evidence.

Operational follow-ups: add outer admission rate limits and monitor audit
collection/database capacity. Over-quota anonymous requests still generate
counter/audit writes; this review did not demonstrate an authentication bypass
through that path. Before extending opt-in beyond the restricted first account,
review native role semantics and role-ID-based workflows across the running LMS.

Follow [the production operator sequence](mcp-production.md). Retain the MongoDB
recovery/keyfile directory and the gateway state directory.
