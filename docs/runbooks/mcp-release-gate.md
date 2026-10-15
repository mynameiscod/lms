# MCP release gate

This feature branch is NOT production-ready.

## Implemented
- Read-only MCP tools for limited LMS aggregates
- Existing role catalogue integration
- Tenant/batch filters on supported tools
- Hashed access-token model and OAuth resource-token validator
- Development-only authorization-code token exchange with PKCE and client allowlist
- Successful tool-call audit persistence

## Blocking before production
1. Replace prototype with a vetted OAuth 2.1 authorization server that uses the existing LMS user identity, HTTPS login and explicit consent.
2. Implement authorization-code issuance, registered redirect URIs, client lifecycle, refresh-token rotation, revocation and discovery metadata.
3. Ensure OAuth is the ONLY accepted transport in production; remove any production switch that enables ordinary LMS JWT access.
4. Audit denied and failed requests, not only successful tool calls. Validate audit database availability.
5. Verify per-record authorization and privacy controls for every domain. Add full student data only after scoped queries are validated.
6. Test against staging MongoDB with multiple tenants, revoked users, missing custom roles, disabled accounts and role changes.
7. Run TypeScript build, all MCP tests, full regression tests, and a third-party security review.
8. Configure the ChatGPT connector only after staging OAuth interoperability succeeds.
9. No secrets, student records, call recordings or transcripts should be stored in source control or logs.

## Local verification
From repository root:
npm run build:server
npm run test --workspace=server -- mcp --runInBand

Production must keep MCP_INTERNAL_ENABLED unset.
