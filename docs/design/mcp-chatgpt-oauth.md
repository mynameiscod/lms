# CodeBegun MCP OAuth architecture

The authorization server uses pinned `@node-oauth/oauth2-server` 5.3.1 for authorization-code issuance, S256 PKCE and OAuth token response validation. CodeBegun's adapter supplies identity, client policy, consent, durable storage, revocation and replay handling. OAuth 2.1 remains an IETF draft; this implements its authorization-code + mandatory PKCE profile, with no implicit/password/client-credentials grants.

## Public endpoints

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-authorization-server` | RFC 8414 issuer and endpoint metadata |
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728 resource metadata; also available without `/mcp` suffix |
| `GET /mcp-oauth/authorize` | Validate registered callback, resource, scopes and S256 challenge, then show first-party login |
| `POST /mcp-oauth/login` | Verify existing LMS credentials; rotate server-side browser session |
| `POST /mcp-oauth/consent` | Explicit allow/deny; one-time, CSRF-protected transaction |
| `POST /mcp-oauth/token` | URL-encoded authorization-code exchange or refresh |
| `POST /mcp-oauth/revoke` | RFC 7009 revocation; revokes the associated grant family |
| `GET /mcp-oauth/connections` | First-party login to inspect and disconnect own grants |
| `POST /mcp-oauth/disconnect` | CSRF-protected revoke-one or revoke-all for the signed-in user |
| `POST /mcp-oauth/logout` | End the connection-management browser session |
| `POST /mcp` | Protected stateless MCP JSON-RPC |

Use an origin-only HTTPS issuer, and exactly `issuer + /mcp` as resource. `resource` is required at authorization and token exchange. Authorization responses preserve state and include `iss` (RFC 9207). The metadata advertises that behavior. Access-token challenges include resource metadata; missing tool scopes produce HTTP 403 with an `insufficient_scope` challenge naming the required scope.

## Clients and browser sessions

Clients are explicitly pre-registered through `MCP_OAUTH_CLIENTS`. Registration is not public; DCR and remote client-metadata fetching are intentionally absent. Each record declares ID, name, application type, exact redirect URIs, allowed scopes and `none` or `client_secret_basic` authentication. Native clients may register exact HTTP loopback callbacks; web clients require HTTPS. No wildcard matching, URL prefix matching, fragments or embedded URL credentials. Confidential clients still authenticate when using PKCE. Plaintext client secrets are not stored; use the SHA-256 digest of a high-entropy secret.

Browser sessions last ten minutes and store only a hash of a random cookie and CSRF token. Cookies are HttpOnly, Secure on HTTPS, SameSite=Lax and scoped to `/mcp-oauth`; the cookie changes after login. Only server-stored authorization parameters may be approved. Consent is always shown, binds account/tenant/client/resource/scopes, and is consumed once. Forms enforce CSRF tokens and first-party Origin/Fetch Metadata. CSP forbids scripts, framing and nonlocal form submissions. The UI identifies the requesting client and institute and offers both allow and deny.

## Token lifecycle and atomicity

- Authorization codes: 256-bit opaque random values, hashed at rest, five-minute validity, exact client/redirect/resource binding, S256 only. The OAuth engine consumes codes before checking PKCE to prevent repeated guesses. Consumed codes remain until the grant expires; replay revokes the family.
- Access tokens: 256-bit opaque random values, SHA-256 digests in MongoDB, at most 15 minutes, with explicit issuer, audience, client, tenant, user, grant and scopes. They are not JWTs, so signature validation is not applicable; authoritative server-side lookup verifies their bindings and expiration.
- Refresh tokens: issued only for consented `offline_access`; hashed, one-time rotation, seven-day idle validity, capped by the grant's absolute 30-day lifetime. Scope can narrow but cannot expand. Reuse revokes the whole grant, including issued access tokens.
- Every exchange writes the grant version inside a MongoDB snapshot/majority transaction. Concurrent refresh and revocation serialize on that document. Token creation, consumption and successful audit either commit together or roll back. Expected OAuth failures commit deliberate consumption/replay revocation; unexpected persistence failures roll back. No response is sent before commit.
- Per-user disconnect and RFC 7009 revocation update the grant. Resource authorization checks grant revocation every request. Current identity and permissions are never cached across requests. A digest of the existing password hash invalidates grants when credentials change.

## Operational controls

Shared MongoDB fixed-window counters limit transport traffic, token exchange, user tool calls and login attempts by both IP and account. Rate-limit storage errors fail closed. HTTPS and canonical Host checks apply in production; trusted-proxy configuration must reflect the actual edge. Exact CORS origins are isolated from LMS CORS. Reverse proxies and APM must also suppress OAuth query/body/token logging: the application cannot control upstream logs.

Startup validates configuration, replica-set/sharded transaction support and required indexes when enabled. `mcp:prepare` explicitly creates MCP indexes and replaces only the prototype authorization-code TTL index. Old prototype tokens have no grant and are rejected. Audit events deliberately have no automatic TTL; choose retention and append-only database privileges operationally.

## Standards and upstream references

- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP Streamable HTTP, implemented protocol revision](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [OAuth security best current practice, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
- [OAuth engine PKCE guide](https://node-oauth.github.io/node-oauth2-server/guide/pkce.html)
- [OAuth engine integration responsibilities](https://node-oauth.github.io/node-oauth2-server/guide/compliance.html)

This is an application implementation, not an independent security certification. Staging interoperability and independent review remain release gates before production approval.
