# Isolated MCP test environment on the existing VPS

This package is for `mcp-test.codebegun.com`, alongside the live LMS checkout at `/root/lms`. It does not merge or deploy the production application, convert `lms-mongodb`, replace `codebegun-mcp`, or use production credentials/data. Run it from `/root/lms-mcp-test`.

## What this verifies

The test image compiles the server with the committed root workspace lockfile and Node 22. It mounts the **same MCP router, LMS credential verifier, models and permission services** used by the production app. It starts no LMS background jobs, calling workers or mailers. It is an MCP verification harness, not a second complete LMS frontend. The full LMS application and real connector acceptance checks in [mcp-release-gate.md](mcp-release-gate.md) remain release requirements.

- Separate Compose project: `codebegun-mcp-test`; separate MongoDB volume and internal network.
- MongoDB 7.0.24 with authentication and a single-member test replica set; no published database port.
- A credential-free TCP bridge publishes only the test HTTP port: `127.0.0.1:5010`. Existing ports 5001/5002/8000 are not used.
- Runtime caps: 1 GiB RAM and one CPU each for the application and database, plus 128 MiB and 0.25 CPU for the TCP bridge. The image build needs additional temporary capacity; run outside busy exam periods.
- The non-root app has a read-only filesystem, no Linux capabilities and no outbound network route. It has no API keys for real integrations.
- The database app account can read only the fixture LMS collections and operate on MCP state. Audit insertion/reading is allowed; audit update/delete and LMS writes are denied. Migration credentials are mounted only in preparation/verification jobs.
- Two synthetic tenants, with explicit tenant-owned MCP roles, each contain an admin, instructor, staff member and two students. Synthetic attendance, exams, fees, placements, leads and call records contain no real personal data.
- Random secrets are generated once in `ops/mcp-test/private/`, excluded from Git and Docker build context. The directory is mode 0700. Individual files are readable by the non-root container user through selected read-only secret mounts. Never paste their contents into chat or logs.

A single-member test replica set provides transaction support, not high availability. This is not a production MongoDB topology or a conversion procedure.

## 1. Start and verify the private test stack

Prerequisites: Docker Engine, Docker Compose v2 with `up --wait` (v2.20+), Bash, curl and OpenSSL. Port 5010 must be free. DNS `mcp-test.codebegun.com` should point to the VPS IPv4 used by `platform.codebegun.com`.

From the separate checkout containing this package:

```bash
cd /root/lms-mcp-test
bash scripts/mcp-test.sh up
```

The command generates separate secrets, builds the image, starts the private MongoDB, initializes its replica set, seeds synthetic records, prepares MCP indexes, starts the app and its fixed TCP ingress bridge, and runs actual HTTP and database checks. It never sources an existing `.env` or uses the production Compose file. The setup refuses to run from the live LMS checkout and refuses to replace another service on port 5010.

Successful output includes `PASS` for discovery, LMS password login, explicit consent, PKCE, all 15 tools, student and tenant isolation, refresh rotation/replay, revocation, token hashing and database privileges. The checks revoke their grants and never print tokens or passwords. Repeat preparation preserves existing records and generated secrets. It refuses to seed an unmarked non-empty database.

The test service is private at this point; public HTTPS is not yet configured.

## 2. Add the separate HTTPS virtual host

This step adds only the `mcp-test.codebegun.com` site and gracefully reloads the shared Nginx process. It validates the existing and proposed configurations and restores this site's prior file on failure. It refuses to overwrite an unmanaged site configuration. No production application container or database is restarted.

Verify the new hostname resolves to the VPS, then install the ACME-only HTTP site:

```bash
getent ahostsv4 mcp-test.codebegun.com
bash scripts/mcp-test.sh nginx-http
```

Use the existing Certbot installation to request **only this hostname**. Certbot may ask for account details/terms; complete those yourself. Do not run Certbot standalone, which would need port 80 stopped, or replace the platform certificate.

```bash
certbot certonly --webroot -w /var/www/codebegun-mcp-test -d mcp-test.codebegun.com --deploy-hook 'nginx -t && nginx -s reload'
bash scripts/mcp-test.sh nginx-tls
bash scripts/mcp-test.sh public
```

If Certbot is not installed, finish installing/configuring the server's normal ACME tooling first. Confirm ports 80/443 are already reachable; do not expose 5010 or MongoDB publicly. Keep the server's existing certificate-renewal timer; verify it includes this webroot certificate and reloads Nginx after renewal.

The public smoke command validates the actual certificate, hostname, Nginx routing and OAuth flow over HTTPS. It is a short-lived verification container using the host network and only the synthetic account password. The application and database remain on their internal network. The ingress bridge has a separate external bridge network but accepts only fixed TCP forwarding to the test app; it has no credentials and does not modify HTTP headers. A passing local Docker check alone does not prove public DNS/TLS reachability.

Nginx overwrites forwarded headers, preserves the canonical Host, disables caching, and disables access/error request logging for this test vhost to keep OAuth queries and credentials out of logs. The application retains durable security audit records in its isolated database.

## 3. Connect the intended MCP client

Test endpoint: `https://mcp-test.codebegun.com/mcp`.

The provided `codebegun-mcp-smoke` registration is reserved for the verifier. Add the intended MCP client's actual client ID, exact redirect URI, supported authentication method and minimum scopes to `ops/mcp-test/private/clients.json`; keep the verifier entry. Do not guess a callback or enable dynamic registration. See `server/.env.mcp.example` and the release runbook. A confidential client registration stores only the SHA-256 secret hash; deliver the raw secret through the client's credential settings.

```bash
nano ops/mcp-test/private/clients.json
bash scripts/mcp-test.sh restart
bash scripts/mcp-test.sh smoke
```

Use synthetic accounts only:

| Account | Purpose |
|---|---|
| `admin-a@mcp-test.invalid` | Tenant A admin, all explicitly granted test tools |
| `admin-b@mcp-test.invalid` | Independent tenant isolation check |
| `student-a@mcp-test.invalid` | Student self scope |
| `instructor-a@mcp-test.invalid` | Assigned batch only |
| `staff-a@mcp-test.invalid` | Assigned batch and OWN CRM scope |

Read the generated shared test-account password locally from `ops/mcp-test/private/test-password`; do not send it here. Existing production passwords deliberately do not authenticate against this isolated database. The authentication implementation and role model are the existing LMS ones.

Follow the full staging acceptance checklist, including actual client interoperability, permission changes, revocation, audit failures and results compared with fixture source records. Do not call the production Outpero API; call tools read synthetic stored metadata only.

### ChatGPT authorization returns `invalid_request` before login

The original test image rejected ChatGPT's optional `ui_locales=en-US` parameter. The authorization endpoint now accepts and discards this bounded scalar hint; login remains in English. Callback matching, scopes, PKCE and other request validation still apply. Both private and public smoke flows now send the locale hint so this case cannot pass unnoticed.

Update the separate test checkout and rebuild the image (a restart alone keeps the old code):

```bash
cd /root/lms-mcp-test &&
git pull --ff-only origin feature/mcp-role-permissions &&
bash scripts/mcp-test.sh up &&
bash scripts/mcp-test.sh public
```

The setup preserves `private/clients.json`, generated secrets and existing synthetic records. After the checks pass, start a fresh Connect attempt in ChatGPT so its OAuth state and PKCE verifier are current.

### Browser sign-in returns `invalid_origin`

The original HTML responses inherited `Referrer-Policy: no-referrer`. Browsers apply that policy to native form POSTs and send `Origin: null`, which the MCP transport correctly rejects before checking credentials. OAuth HTML pages now use `same-origin`; JSON and callback redirects retain `no-referrer`. The origin allowlist, CSRF checks and session protections remain enforced. Never add `null` to the origin allowlist.

Chrome also enforces CSP `form-action` on redirects after form submission. The consent page permits its validated registered callback origin so the 303 can return to ChatGPT. Password and connection-management forms remain restricted to `'self'`; the exact registered callback is still checked by the server.

Rebuild using the update command above, then start a fresh ChatGPT Connect attempt. The Docker/private and public HTTPS verifiers now check login/consent headers, reject null/foreign form origins, and exercise protocol metadata (101 checks). CI also runs Chrome over local HTTPS through login, consent to a different callback origin, token exchange, a student-count tool call, connection management, revocation and logout. The generated test password and registered ChatGPT client are preserved by the rebuild.

### Connected app returns `invalid_params` when calling tools

The original strict parameter allowlist rejected the standard MCP `params._meta` envelope on `tools/call` and `tools/list`. The server now accepts an object with an optional string/number `progressToken` and opaque client metadata, while keeping it separate from tool arguments, identity, permissions and audits. Invalid metadata and unknown tool arguments still fail closed. Private/public smoke checks and the real OAuth integration suite exercise metadata-bearing tool requests, including tenant isolation and revocation. Calls without metadata remain supported.

Rebuild using the update command above and retry a tool in the connected ChatGPT app. The existing connection and test password are preserved.

## Status, recovery and stop

```bash
bash scripts/mcp-test.sh status
bash scripts/mcp-test.sh smoke
bash scripts/mcp-test.sh stop
```

`stop` stops only the three test services and preserves test data/secrets. A failed setup can be rerun after fixing the reported cause. Do not delete secrets while keeping the database volume: database credentials must continue to match. Never use a production Compose file, run a broad Docker prune, or copy production `.env`/uploads/database backups into this test stack.

For diagnostics use the test application logs only: `docker compose --env-file /dev/null -p codebegun-mcp-test -f ops/mcp-test/compose.yaml logs --tail=80 app`. Do not post full Docker inspections, database records or secret files.

Production MongoDB is still standalone in the supplied server evidence. A reviewed backup/restore rehearsal and separately approved database conversion are required before enabling MCP in the live LMS. Production merge and deployment remain approval gates.
