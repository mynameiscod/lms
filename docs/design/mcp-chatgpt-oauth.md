# CodeBegun ChatGPT OAuth connection plan

Status: design specification; not an operational OAuth authorization server.

## Security boundary

The existing POST /mcp endpoint accepts LMS session JWTs for internal tests only.
It MUST NOT be registered as a public ChatGPT connector. Production disables
the endpoint unless MCP_INTERNAL_ENABLED=true. Do not enable this flag for a
public deployment.

## Selected login method

Use existing CodeBegun LMS user accounts. The authorization endpoint must authenticate users through the existing LMS login service, establish a secure browser session, and display a consent screen. The OAuth provider must not expose LMS passwords or session JWTs to ChatGPT. Keep identity, tenant, and current permissions server-side and verify them on every MCP request.

## Recommended OAuth 2.1 architecture

Use a vetted OpenID Connect/OAuth authorization provider or a dedicated,
well-tested authorization-server library rather than implementing authorization
code and refresh-token flows manually in Express.

1. Register a confidential or public OAuth client as required by the ChatGPT
   connector integration, with exact callback URI allowlisting.
2. Use authorization code + PKCE (S256), HTTPS, and explicit user consent.
3. Expose authorization server metadata, OAuth protected-resource metadata,
   and a WWW-Authenticate resource challenge.
4. Issue audience-restricted, short-lived access tokens for the MCP resource.
   Refresh tokens must be rotated, revocable and stored hashed server-side.
5. Validate issuer, audience, signature, expiry, authorized client, and
   scopes on every MCP request. Never reuse normal LMS login JWTs.
6. Resolve the user and tenant from verified server-side identity; verify
   active status and current role permissions on every tool call.
7. Require both mcp_connect and the domain-specific MCP permission.
8. Implement per-user disconnect, token revocation, consent revocation,
   audit logs, rate limits and monitoring.
9. Run negative tests for PKCE bypass, replay, token substitution, cross-tenant
   access, expired tokens, permission revocation and wrong audience.

## Integration with existing LMS Roles

Reuse PERMISSION_GROUPS.mcp and existing custom role assignments. OAuth scopes
do not grant data access by themselves; MCP tools must check LMS permissions
and record-level constraints on every invocation.

## Deployment checklist

- Complete OAuth provider integration and test with staging identities.
- Verify ChatGPT's current connector requirements before registration.
- Use a dedicated HTTPS endpoint and no permissive cross-origin settings.
- Confirm durable audit writes and MongoDB isolation using staging data.
- Keep the production MCP route disabled until a security review is complete.
