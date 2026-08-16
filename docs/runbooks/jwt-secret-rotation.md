# Setting and rotating JWT_SECRET

The server no longer falls back to a signing key published in this repository. It now
**refuses to start** without `JWT_SECRET`, which means this runbook is a prerequisite for the
next deploy, not an optional follow-up.

> **Read the encryption section first.** On a host that has never set `ENCRYPTION_KEY`,
> setting `JWT_SECRET` silently re-keys the encryption of every stored integration secret.
> Doing these steps out of order will leave provider API keys unreadable.

---

## Why the key changed

`process.env.JWT_SECRET || 'secret-key'` appeared in eight places. `tenantId` and `role` are
claims *inside* the token, and the verifier trusts them once the signature checks out — so a
known signing key is a token-forging vulnerability for every user in every tenant. There is
now one resolver (`server/src/config/secrets.ts`), no default, and a startup assertion.

**Rotating invalidates every active session.** Users log in again once. That is the accepted
cost.

---

## ⚠️ The encryption coupling

`settingsService` encrypts 22 admin-entered secrets — provider API keys, SMTP passwords,
OAuth client secrets — with AES-256-CBC under a key derived from:

```
ENCRYPTION_KEY || JWT_SECRET || 'fallback-key-32-chars-minimum!!'
```

`leadSourceConfigController` uses the same chain for lead-source credentials.

So the effective encryption key today depends on what is set:

| `ENCRYPTION_KEY` | `JWT_SECRET` | Ciphertext is bound to | Rotating JWT_SECRET |
|---|---|---|---|
| set | anything | `ENCRYPTION_KEY` | **safe** |
| unset | set | `JWT_SECRET` | **breaks decryption** |
| unset | unset | the published literal | **setting** `JWT_SECRET` breaks decryption |

The failure is **not data loss**. `decrypt()` returns `''`, logs which key failed, and leaves
the ciphertext in place; settings read as unset and callers fall back to `.env`. Integrations
stop working until the key is restored or the values are re-entered.

Those two files are deliberately **not** changed by this commit for exactly that reason.

---

## Step 1 — Pin the encryption key BEFORE touching JWT_SECRET

On the host, find what is currently effective:

```bash
ssh -i ~/.ssh/github-ci root@<HOST>
grep -E '^(ENCRYPTION_KEY|JWT_SECRET)=' /root/lms/server/.env
```

- **`ENCRYPTION_KEY` already set** → nothing to do, skip to step 2.
- **Only `JWT_SECRET` set** → copy its current value into `ENCRYPTION_KEY`.
- **Neither set** → set `ENCRYPTION_KEY=fallback-key-32-chars-minimum!!` — the literal the
  data was actually encrypted under. It is a weak key, and step 4 replaces it properly.

```bash
echo 'ENCRYPTION_KEY=<the value determined above>' >> /root/lms/server/.env
```

Restart, then **verify before going further**: open Platform Settings and confirm the stored
API keys still display their masked hint rather than appearing empty, and check the logs for
`Could not decrypt`.

## Step 2 — Generate and set a real JWT_SECRET

```bash
openssl rand -base64 48
echo 'JWT_SECRET=<the generated value>' >> /root/lms/server/.env   # or edit in place
```

The server refuses to start if it is missing, shorter than 16 characters in production, or
set to any of the published fallbacks.

## Step 3 — Deploy and verify

Deploy as usual. Then:

```bash
docker logs lms-server-$(cat /root/lms/.active-slot) | tail -40
```

- The process must be running. A refusal to start prints the variable name and no value.
- Log in from a browser. Existing sessions are invalid — that is expected.
- Re-check Platform Settings for `Could not decrypt`.

## Step 4 — Later, and separately: rotate ENCRYPTION_KEY properly

If step 1 pinned the published literal, the encryption key is still weak. Replacing it needs
a re-encryption pass over `SystemSetting` (read under the old key, write under the new), which
does not exist yet and should not be improvised — it rewrites stored credentials. Track it as
its own task.

---

## Rollback

Restore the previous `JWT_SECRET` value and restart; sessions issued under it become valid
again. **Do not roll back `ENCRYPTION_KEY`** once it has been pinned — it is what is keeping
the stored secrets readable.

If integration keys do come back empty: set `ENCRYPTION_KEY` back to the previous effective
value and restart. Nothing was overwritten, so this is recoverable. Failing that, an admin can
re-enter the affected keys in Platform Settings; the log names each one.
