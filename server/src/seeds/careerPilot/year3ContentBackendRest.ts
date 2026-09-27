/**
 * T3_BACKEND_AUTH, T3_BACKEND_SCALE, T3_BACKEND_OPS and T3_BACKEND_PROJECT — fifteen units.
 * Year 3, backend track. Finishes S12.
 *
 * ── THE OVERLAP IS HEAVIEST HERE ──────────────────────────────────────────────────────────
 *
 * Four topics in this file have a near-namesake in the universal core: T3_AUTH,
 * T3_CACHING_NOSQL, T3_RELIABILITY, T3_TEST_DESIGN and T3_DOCUMENTATION. This is the file
 * where restating the core would be easiest and least defensible.
 *
 * So each unit here is pinned to something the core could not say because it had no service
 * in front of it:
 *
 *   ISSUING_A_TOKEN      the core chose between sessions and tokens; this issues one, and
 *                        deals with the claims, the clock and the transport
 *   PERMISSION_CHECKS    the core said check at the point of access; this is why the check
 *                        belongs in the service and not the route, which is a layering
 *                        argument the core could not make yet
 *   OFF_THE_REQUEST      entirely new — queues, workers and what the caller is told meanwhile
 *   CACHING_A_RESPONSE   the core decided what is safe to cache; this caches an HTTP response,
 *                        where the cache key is the hard part
 *   LOGGING_A_SERVICE    the core said what to log; this is the request id travelling through
 *                        a service and out to its dependencies
 *   TESTING_AN_API       the core chose the level; this adds the contract test, which only
 *                        exists once somebody else calls you
 *   DOCUMENTING_IT       the shortest unit in the year, and it says so: the core unit covered
 *                        this and the track adds one thing
 *
 * T3_BACKEND_PROJECT is the track's assessment. Its three units are brief, build and defend,
 * and the defend unit is the one that matters — it is what an interview actually tests.
 *
 * Attribution: T3_BACKEND_AUTH defaults to AUTHENTICATION with PERMISSION_CHECKS on
 * AUTHORIZATION. T3_BACKEND_SCALE defaults to CACHING with the measurement unit on
 * MONITORING_OBSERVABILITY. T3_BACKEND_OPS is one skill per unit. T3_BACKEND_PROJECT is all
 * PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BACKEND_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_BACKEND_AUTH ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BACKEND_AUTH_ISSUING_A_TOKEN',
    notes: `The core topic chose between sessions and tokens. This one issues a token, which
turns out to involve five decisions the choice did not cover.

## What goes in it

    {
      "sub": "user_9f3a",          // who
      "iat": 1709301600,           // issued at
      "exp": 1709302500,           // expires — 15 minutes
      "jti": "tok_01HX...",        // a unique id for this token
      "scope": "orders:read orders:write"
    }

**\`sub\` is the subject**, and it should be an opaque internal id rather than an email. An
email changes; an id does not, and a token keyed on something mutable breaks when the user
edits their profile.

**\`jti\` is worth including** even though nothing uses it at first. It gives you a handle for
revocation later, and it makes a token identifiable in a log without logging the token itself.

**\`scope\` is optional and useful**, particularly for service-to-service tokens where a
narrow scope limits what a leak costs.

## What must not

**Anything secret.** The payload is base64, not encrypted. **Anybody holding the token can read
every claim** — this was said in the core unit and it is worth saying twice, because it is the
single most common misunderstanding about JWTs.

**Anything that changes often.** A role in the token is stale the moment it changes, and you
have no way to update it. The next unit is about exactly this.

**Anything large.** The token travels on every request.

## The clock

**\`exp\` is an absolute UTC timestamp**, and it is checked against the verifying server's
clock. Two servers disagreeing by two minutes produces tokens rejected as not-yet-valid and
tokens accepted after expiry, intermittently, in a way that looks like everything except a
clock problem.

**Run NTP. Allow about thirty seconds of leeway.** And when a token problem is intermittent and
correlates with which instance served it, check the clocks before the code.

## Signing

**Symmetric (HS256)** — one secret, used to sign and to verify. Fine when the same service does
both.

**Asymmetric (RS256)** — a private key signs, a public key verifies. **Use this when several
services verify tokens one service issues**, because then only the issuer holds anything
sensitive and a compromised verifier cannot mint tokens.

**Reject \`alg: none\`, and reject an algorithm you did not expect.** A verifier that trusts the
token's own header about how to verify it can be told "do not bother" — this is a real,
historic, catastrophic vulnerability and the fix is to pin the algorithm on the verifying side.

## How it travels

    Authorization: Bearer eyJhbGciOi...

**Not a query parameter.** URLs end up in access logs, in referrer headers, in browser history
and in the analytics of every third party on the page.

**Over TLS, always.** A bearer token is a password in transit: anybody who captures it can use
it, and that is what "bearer" means.

**And in a browser, prefer an \`HttpOnly\` cookie** to \`localStorage\`, which the core unit
argued. The \`Authorization\` header is right for service-to-service and for a mobile client
that has no XSS surface.

## Verifying, in order

1. **The signature**, with a pinned algorithm.
2. **\`exp\`**, with leeway.
3. **\`iss\` and \`aud\`** if you set them — a token for a different service should not work on
   yours.
4. **The claims you rely on** — and treat a missing claim as a failure rather than a default.

**Step four matters.** A verifier reading \`scope\` and treating absent as "all scopes" is a
privilege escalation waiting for a token issued before you added scopes.`,
    mcqs: [
      mcq('The subject claim should be:',
        [['An opaque internal id rather than an email', true],
          ['The user’s email, which is unique', false],
          ['A hash of the user’s credentials', false],
          ['The database primary key as an integer', false]],
        'A token keyed on something mutable breaks when the user edits their profile.'),
      mcq('Including `jti` from the start is worth it because:',
        [['It gives a revocation handle and a loggable identifier', true],
          ['It prevents the token being replayed', false],
          ['It is required by the specification', false],
          ['It makes the signature stronger', false]],
        'And it lets a token be identified in a log without logging the token.'),
      mcq('Asymmetric signing is the right choice when:',
        [['Several services verify tokens one service issues', true],
          ['The tokens are long-lived', false],
          ['The payload contains sensitive claims', false],
          ['Verification happens on every request', false]],
        'A compromised verifier then cannot mint tokens.'),
      mcq('A verifier that trusts the token’s own algorithm header:',
        [['Can be told not to verify at all', true],
          ['Falls back to the default algorithm safely', false],
          ['Rejects tokens signed with another algorithm', false],
          ['Is standard behaviour for most libraries', false]],
        'A real, historic, catastrophic vulnerability. Pin the algorithm on the verifying side.'),
    ],
    checkpoint: [
      mcq('Putting a token in a query parameter exposes it to:',
        [['Access logs, referrer headers and browser history', true],
          ['Interception over TLS', false],
          ['Modification by the client', false],
          ['Caching by the application server', false]],
        'And to the analytics of every third party on the page.'),
      mcq('A verifier treating an absent scope claim as "all scopes" is:',
        [['A privilege escalation waiting for an older token', true],
          ['A reasonable default for backward compatibility', false],
          ['Safe if the token is otherwise valid', false],
          ['Only a problem for service-to-service tokens', false]],
        'Treat a missing claim as a failure rather than a default.'),
      mcq('Intermittent token failures correlating with which instance served the request:',
        [['Point at the clocks before the code', true],
          ['Indicate a key rotation partially applied', false],
          ['Suggest a load balancer misconfiguration', false],
          ['Mean the token cache is inconsistent', false]],
        'A two-minute disagreement looks like everything except a clock problem.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_AUTH_EXPIRY_IN_A_SERVICE',
    notes: `The core topic established that everything must expire and be revocable. This one
builds the refresh endpoint, which is where the design decisions actually are.

## The two credentials, in a service

**The access token** lives fifteen minutes, is sent on every request, and is **verified without
touching the database**. That is the whole reason it exists.

**The refresh token** lives thirty days, is sent **only** to \`POST /auth/refresh\`, and **is
stored server-side** so it can be revoked.

**Notice what that means:** you have one database read per refresh — every fifteen minutes per
active user — rather than one per request. That is the trade, stated in numbers, and it is why
the split exists at all.

## The refresh endpoint

    POST /auth/refresh
    { "refresh_token": "..." }

    1. Look it up. Not found, revoked or expired → 401.
    2. Check the user still exists and is still active. → 401 if not.
    3. Issue a new access token.
    4. Issue a new refresh token, and invalidate the old one.
    5. Return both.

**Step two is the one people leave out**, and it is what makes deactivation work at all: a
disabled user with a valid refresh token keeps refreshing forever if nobody checks.

**Step four is rotation**, and the core unit explained what it detects. In the service, it
means the refresh token is single-use, which has a practical consequence worth designing for:
**two tabs refreshing simultaneously will race**, one will present an already-used token, and
a naive implementation logs the user out. A short grace period on the previous token — a few
seconds — resolves it without giving up the detection.

## Logging out

**"Log out"** — delete this refresh token. The access token remains valid for its few
remaining minutes.

**"Log out everywhere"** — delete every refresh token for the user.

**"Password changed"** — delete every refresh token, always. This is the one that must not be
forgotten, because a password change is very often a response to a suspected compromise, and
leaving the sessions alive defeats the point of it.

## Storing the refresh token

**Hash it.** It is a credential, and a database leak that exposes usable refresh tokens is as
bad as one exposing passwords. Store a hash, compare on presentation — exactly as you would a
password, though a fast hash is acceptable here because the token is high-entropy and not
guessable.

**Store the metadata**: user, issued at, expires at, last used, and the device or user agent.
That is what lets you show a user their active sessions and let them revoke one, which is a
feature users increasingly expect.

## The window you cannot close

**A revoked user keeps access until their access token expires.** Fifteen minutes, in this
design.

**Say the number.** In your security documentation, and to anybody who asks. "Immediately" is
false, and the people who need to know — support, security, whoever handles a compromised
account — are the people who will be misled by it.

**If fifteen minutes is genuinely unacceptable** for some operation, that operation checks the
database. Not every request — that one. **A high-value action rechecking the user's status is
a reasonable, targeted cost**, and it is a much better answer than making every request pay
for it.`,
    mcqs: [
      mcq('The access and refresh split costs you:',
        [['One database read per refresh instead of one per request', true],
          ['Two credentials to store on the client', false],
          ['An extra round trip on every request', false],
          ['A longer verification path on the hot route', false]],
        'The trade, stated in numbers, which is why the split exists.'),
      mcq('The refresh step people most often leave out is:',
        [['Checking the user still exists and is active', true],
          ['Invalidating the old refresh token', false],
          ['Verifying the token has not expired', false],
          ['Issuing a new access token', false]],
        'A disabled user keeps refreshing forever if nobody checks.'),
      mcq('Rotation plus two tabs refreshing at once causes:',
        [['A race where one presents an already-used token', true],
          ['Two valid refresh tokens to exist', false],
          ['The user to be logged out of one tab only', false],
          ['The rotation to be skipped for the second', false]],
        'A few seconds of grace on the previous token resolves it without losing the detection.'),
      mcq('A password change should:',
        [['Delete every refresh token for that user', true],
          ['Delete only the current session’s token', false],
          ['Shorten the remaining token lifetimes', false],
          ['Require re-authentication on the next request', false]],
        'It is very often a response to suspected compromise.'),
    ],
    checkpoint: [
      mcq('Refresh tokens should be stored:',
        [['Hashed, like a password', true],
          ['Encrypted with a reversible key', false],
          ['In plain text, since they expire', false],
          ['Only in the client, never server-side', false]],
        'A leak exposing usable refresh tokens is as bad as one exposing passwords.'),
      mcq('Saying "revocation is immediate" is:',
        [['False, and it misleads exactly the people who need the truth', true],
          ['A reasonable simplification for documentation', false],
          ['True once the refresh token is deleted', false],
          ['Accurate if the access token is short enough', false]],
        'Support and security are the ones who will act on it.'),
      mcq('If fifteen minutes of residual access is unacceptable for one operation:',
        [['That operation rechecks the database, not every request', true],
          ['The access token lifetime should be shortened globally', false],
          ['Sessions should be used instead of tokens', false],
          ['A revocation blocklist should be added', false]],
        'A targeted cost beats making every request pay for it.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_AUTH_PERMISSION_CHECKS',
    notes: `The core topic said: check authorization at the point the data is accessed, on every
request. **This unit is about which layer that is**, and the answer follows from the
architecture topic rather than from security.

## Not the route

    @app.delete('/orders/<id>')
    @require_role('admin')            # <-- the check lives on the route
    def cancel_order(id): ...

This works, and it has three problems:

**A second caller bypasses it.** A scheduled job calling \`order_service.cancel(id)\` directly
gets no check at all, because the check was attached to the HTTP route rather than to the
operation.

**It can only express role, not ownership.** "An admin may cancel any order; a customer may
cancel their own" is not a decorator. It depends on which order, and the route does not know
that yet.

**It is invisible from the service.** Reading \`cancel()\` tells you nothing about who may call
it, so the next person adding a caller has no reason to think about it.

## In the service

    def cancel(self, order_id, actor):
        order = self.orders.get(order_id)
        if not can_cancel(actor, order):
            raise NotFound()
        ...

**Every caller goes through it**, because the check is part of the operation rather than part
of the transport.

**And it takes an \`actor\`.** The service does not reach for a global "current user" — it is
passed one. That keeps the service testable and callable from a job, and it makes "who is this
acting as" an explicit parameter rather than ambient state.

## The rule itself, separate again

    def can_cancel(actor, order):
        if actor.is_staff:
            return True
        return order.customer_id == actor.id and order.status == 'pending'

**One function, callable from the service, from a test, and from the UI** to decide whether to
show the button. The UI call is a convenience; the service call is the control. **Both use the
same function, so they cannot disagree** — and a UI that shows a button the API then refuses is
a bug report you will otherwise receive regularly.

## Scoping the query, still the strongest

Where the operation is "read a thing that belongs to somebody", the query is better than the
check:

    self.orders.get_for(actor, order_id)     # scoped, never loads the wrong row

**The check and the scope are not alternatives.** Scope reads; check operations. A cancel needs
the order loaded and then a decision, because the decision depends on its status.

## Defaults and the endpoint added on Friday

**The risk is a missing check, not a wrong one.** So the structure should make absence loud:

- **A service method that takes an \`actor\` and never uses it** is visible in review and can
  be linted.
- **A base repository that requires a scope** makes an unscoped query the unusual thing.
- **A test per operation that a stranger is refused** — the two-account test from the core
  topic, applied per service method rather than per route, so it covers the job as well as the
  endpoint.

## Roles, and where they stop

**Role checks are cheap and they run out quickly.** Real systems need ownership, team
membership, delegation, and state-dependent rules — "an order may be cancelled by its owner
while it is pending, or by staff at any time, unless it has shipped".

**When the conditions multiply, put them in one function per operation** and test that function
directly. A permission system is a thing some teams build; **a function per operation is what
most teams need**, and reaching for a framework before the rules are complicated is a cost with
no return.`,
    mcqs: [
      mcq('A permission check on the route is bypassed by:',
        [['A scheduled job calling the service directly', true],
          ['A second endpoint with the same decorator', false],
          ['A request with a forged role claim', false],
          ['A middleware that runs earlier', false]],
        'The check was attached to the transport rather than to the operation.'),
      mcq('A role decorator cannot express ownership because:',
        [['It depends on which record, and the route does not know that yet', true],
          ['Decorators cannot access the database', false],
          ['Ownership is checked after authentication', false],
          ['Roles and ownership use different identifiers', false]],
        '"A customer may cancel their own" is not a decorator.'),
      mcq('The service should take an actor rather than read a global current user because:',
        [['It stays testable and callable from a job', true],
          ['Globals are slower to access', false],
          ['The actor may differ from the authenticated user', false],
          ['It allows the check to be cached', false]],
        'And it makes "acting as whom" explicit rather than ambient.'),
      mcq('The UI and the API using the same permission function prevents:',
        [['A button that is shown and then refused', true],
          ['The UI check being bypassed', false],
          ['Permissions drifting between environments', false],
          ['Duplicate database lookups', false]],
        'Otherwise that is a bug report you receive regularly.'),
    ],
    checkpoint: [
      mcq('Scoping the query and checking permission are:',
        [['Both needed — scope reads, check operations', true],
          ['Alternatives, and scoping is always better', false],
          ['Alternatives, and checking is more explicit', false],
          ['The same technique in two layers', false]],
        'A cancel needs the order loaded, because the decision depends on its status.'),
      mcq('A service method taking an actor and never using it:',
        [['Is visible in review and can be linted', true],
          ['Is harmless, since the parameter is optional', false],
          ['Indicates the check belongs on the route', false],
          ['Should be removed to simplify the signature', false]],
        'Making a missing check loud is the point of the structure.'),
      mcq('Reaching for a permission framework before the rules are complicated is:',
        [['A cost with no return', true],
          ['Sensible preparation for growth', false],
          ['Necessary once roles exist', false],
          ['The standard approach in most services', false]],
        'A function per operation is what most teams need.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_AUTH_DEBUGGING',
    notes: `Five auth failures as they present in a running service, with what to look at first.

## 1. "It works with curl and not from the app"

**Almost always the header.** Check, in order: the \`Bearer \` prefix and its single space; a
trailing newline from however the token was read; the header name; whether a proxy strips
\`Authorization\` — some do, on some paths, and it is invisible from both ends.

**Diagnosis:** log the received header's **length and first eight characters** at the edge.
Never the token. That distinguishes "absent" from "malformed" from "wrong token" in one line.

## 2. Works on one instance, fails on another

**Clock skew**, or **a key rotated on some instances and not others**.

**Diagnosis:** log the instance id with every auth failure. If failures cluster on one, you
have it. Then compare clocks and key versions.

**This is why \`kid\` — a key id in the token header — is worth using** as soon as you have more
than one key: the verifier can say "I do not have key 3" instead of "invalid signature", and
those are very different investigations.

## 3. Everything 401s after a deploy

**Causes:** the signing secret changed — a new environment variable, a regenerated value in the
deploy, or a secret store returning a different version. **Every existing token is now
invalid.**

**This is why key rotation needs an overlap**: accept the old key and the new one for a period,
then drop the old. Rotating instantly logs everybody out, and doing that during an incident
makes the incident worse.

## 4. A user has access they should not

**The hard one, because nothing is failing.**

Work through: is the check present on that operation at all; does the check use the record's
current state or a cached one; are permissions in the token and therefore stale; is a second
path reaching the same operation without the check.

**Diagnosis:** the two-account test against that specific operation. **If it passes, the check
exists and the rule is wrong; if it fails, the check is missing.** Those need completely
different fixes and this distinguishes them in a minute.

## 5. Intermittent logouts

**Causes:** refresh token rotation racing across tabs — the previous unit's problem; a load
balancer without sticky sessions where sessions are stored in process memory; a token lifetime
shorter than somebody's think time on a form.

**Diagnosis:** log every refresh with the token id, the user and the outcome. A rejected
refresh immediately after a successful one, for the same user, is the rotation race and it is
unmistakable once you can see it.

## What to log, and what never to

**Log:** the decision, the user id, the operation, the resource, the reason, the request id,
and the instance. \`auth_denied user=9f3a op=order.cancel resource=812 reason=not_owner\`.

**Never log:** the token, the session id, the password, the refresh token, or a full request
dump that contains any of them. **A debug log in production containing tokens is a breach with
a paper trail**, and it is one of the most common ways credentials actually escape.

**And alert on the denial rate.** A sudden rise is either a bug you just shipped or somebody
probing, and both are worth knowing within the hour.`,
    mcqs: [
      mcq('To diagnose a malformed credential without logging it, record:',
        [['Its length and first few characters', true],
          ['A hash of the whole token', false],
          ['The claims after decoding', false],
          ['Whether verification succeeded', false]],
        'That distinguishes absent from malformed from wrong, in one line.'),
      mcq('A key id in the token header is worth using because:',
        [['The verifier can say "I do not have that key" rather than "invalid signature"', true],
          ['It allows tokens to be revoked individually', false],
          ['It prevents algorithm confusion attacks', false],
          ['It identifies which service issued the token', false]],
        'Two very different investigations, distinguished for free.'),
      mcq('Everything returning 401 after a deploy usually means:',
        [['The signing secret changed', true],
          ['The clock drifted during deployment', false],
          ['The token lifetime was shortened', false],
          ['The authorization middleware was reordered', false]],
        'Which is why rotation needs an overlap period rather than an instant switch.'),
      mcq('The two-account test on a specific operation distinguishes:',
        [['A missing check from a wrong rule', true],
          ['A stale permission from a fresh one', false],
          ['A route check from a service check', false],
          ['An authentication failure from an authorization one', false]],
        'Those need completely different fixes.'),
    ],
    checkpoint: [
      mcq('A rejected refresh immediately after a successful one, same user, is:',
        [['The rotation race across tabs', true],
          ['A replayed token from an attacker', false],
          ['A clock skew between instances', false],
          ['A revoked session taking effect', false]],
        'Unmistakable once the refreshes are logged with their outcomes.'),
      mcq('Rotating a signing key instantly rather than with an overlap:',
        [['Logs everybody out, which during an incident makes it worse', true],
          ['Is the only way to guarantee old tokens fail', false],
          ['Requires all instances to restart together', false],
          ['Is safe if the tokens are short-lived', false]],
        'Accept both keys for a period, then drop the old one.'),
      mcq('A rise in the denial rate should be alerted on because:',
        [['It is either a bug you shipped or somebody probing', true],
          ['It indicates the permission model is too strict', false],
          ['It correlates with authentication outages', false],
          ['It predicts an increase in support volume', false]],
        'Both are worth knowing within the hour.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_AUTH_PRACTICE',
    notes: `Two exercises on the decisions rather than the cryptography. You should not
implement a signature algorithm, and the bugs are not there anyway.`,
    coding: [
      {
        title: 'Verify in the right order',
        description: `Read one token description per line as
\`<signature> <expired> <issuer> <scope>\` where signature is \`valid\` or \`bad\`, expired is
\`yes\` or \`no\`, issuer is \`ours\` or \`other\`, and scope is a word or \`missing\`.

Print the first failure, in this order, or \`accepted\`:

- signature \`bad\` → \`bad_signature\`
- expired \`yes\` → \`expired\`
- issuer \`other\` → \`wrong_issuer\`
- scope \`missing\` → \`missing_scope\`
- otherwise → \`accepted\`

A missing claim is a failure, not a default. The order matters: never report a claim problem
on a token whose signature does not verify, because the claims cannot be trusted at all.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Nothing in an unverified token means anything. Check the signature first.
`,
        language: 'python',
        tests: [
          { input: 'valid no ours read\n', expectedOutput: 'accepted' },
          { input: 'bad no ours read\n', expectedOutput: 'bad_signature' },
          { input: 'valid yes ours read\n', expectedOutput: 'expired' },
          { input: 'valid no other read\n', expectedOutput: 'wrong_issuer' },
          { input: 'valid no ours missing\n', expectedOutput: 'missing_scope' },
          { input: 'bad yes other missing\n', expectedOutput: 'bad_signature', isHidden: true },
          { input: '', expectedOutput: '', isHidden: true },
        ],
      },
      {
        title: 'Can this actor do this?',
        description: `Read records as \`<id> <owner> <status>\` lines, then a final line
\`<actor> <role> <operation> <record_id>\`.

Roles are \`customer\` or \`staff\`. Operations are \`view\` or \`cancel\`.

Print \`allowed\`, or \`404\` when the actor must not learn the record exists, or \`conflict\`
when the operation is refused for a reason the actor is entitled to know.

The rules:

- Unknown record → \`404\`
- \`staff\` viewing → \`allowed\`
- \`staff\` cancelling a \`pending\` record → \`allowed\`
- \`staff\` cancelling anything else → \`conflict\`
- \`customer\` and not the owner → \`404\`, for either operation
- \`customer\` owner viewing → \`allowed\`
- \`customer\` owner cancelling a \`pending\` record → \`allowed\`
- \`customer\` owner cancelling anything else → \`conflict\`

The distinction between \`404\` and \`conflict\` is the exercise: one hides existence, the
other explains a refusal to somebody already entitled to see it.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
records = {r[0]: (r[1], r[2]) for r in lines[:-1]}
actor, role, operation, record_id = lines[-1]

# Hide existence from a stranger. Explain the refusal to the owner.
`,
        language: 'python',
        tests: [
          { input: '1 asha pending\nasha customer cancel 1\n', expectedOutput: 'allowed' },
          { input: '1 asha shipped\nasha customer cancel 1\n', expectedOutput: 'conflict' },
          { input: '1 asha pending\nravi customer cancel 1\n', expectedOutput: '404' },
          { input: '1 asha shipped\nmina staff cancel 1\n', expectedOutput: 'conflict' },
          { input: '1 asha pending\nmina staff view 1\n', expectedOutput: 'allowed' },
          { input: '1 asha pending\nasha customer view 9\n', expectedOutput: '404', isHidden: true },
          { input: '1 asha shipped\nravi customer view 1\n', expectedOutput: '404', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Backend Auth Practice',
      description: 'Order the verification, separate 404 from conflict, then audit a real service.',
      instructions: `Complete both exercises, then:

1. For the first: say why a claim problem must never be reported on a token whose signature
   failed. Give the concrete thing an attacker learns if the order is reversed.
2. For the first: the scope claim is missing rather than empty. Say what a verifier treating
   that as "all scopes" would allow, and when such a token would exist.
3. For the second: explain the difference between \`404\` and \`conflict\` in terms of what the
   actor is entitled to know. Then say which one a *staff* member cancelling a shipped order
   gets, and why that differs from a stranger.
4. For the second: rewrite your solution so the permission decision is **one function** taking
   the actor and the record, separate from the lookup. Say which version you would ship.

**Then, on a real service.** Yours, or one you can run.

5. List every operation that changes something. For each, say where the permission check lives:
   route, service, or nowhere.
6. Find one check on a route. Move it into the service. Show that a direct call to the service
   is now also checked.
7. Write the two-account test for that operation — against the **service method**, not the
   endpoint, so a job would be covered too.
8. Check the auth logging: is the decision logged? Is any credential logged? Report both, and
   fix the second if you find it.
9. Find out how long a deactivated user keeps access in your system. Say the number. If it is
   "forever", that is the finding.`,
      rubric: [
        { criterion: 'Verification ordered', description: 'All cases, with the signature checked before any claim.', maxPoints: 15 },
        { criterion: '404 against conflict', description: 'All combinations of role, operation and status correct.', maxPoints: 20 },
        { criterion: 'What the order protects', description: 'Names what an attacker learns if claims are reported on a bad signature.', maxPoints: 15 },
        { criterion: 'The rule as one function', description: 'Extracted from the lookup, with a reasoned choice between the versions.', maxPoints: 15 },
        { criterion: 'A check moved into the service', description: 'Shown covering a direct call as well as the endpoint.', maxPoints: 20 },
        { criterion: 'The residual access window', description: 'A real number from a real system, or "forever" reported honestly.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
records = {r[0]: (r[1], r[2]) for r in lines[:-1]}
actor, role, operation, record_id = lines[-1]
`,
        tests: [
          { input: '1 asha pending\nasha customer cancel 1\n', expectedOutput: 'allowed' },
          { input: '1 asha shipped\nasha customer cancel 1\n', expectedOutput: 'conflict' },
          { input: '1 asha pending\nravi customer cancel 1\n', expectedOutput: '404' },
          { input: '1 asha shipped\nmina staff cancel 1\n', expectedOutput: 'conflict' },
          { input: '1 asha shipped\nravi customer view 1\n', expectedOutput: '404', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('Reporting `expired` on a token whose signature failed:',
        [['Tells an attacker their forged claims were parsed', true],
          ['Is a harmless convenience for debugging', false],
          ['Helps the client decide whether to refresh', false],
          ['Is required to distinguish the two failures', false]],
        'Nothing in an unverified token means anything.'),
      mcq('A staff member cancelling a shipped order gets `conflict` rather than `404` because:',
        [['They are entitled to know the record exists', true],
          ['Staff errors should be reported differently', false],
          ['The operation failed rather than being forbidden', false],
          ['404 is reserved for missing records', false]],
        'One hides existence; the other explains a refusal to somebody already entitled to see it.'),
      mcq('The two-account test should target:',
        [['The service method, so a job is covered too', true],
          ['The endpoint, since that is the attack surface', false],
          ['Both, with separate tests', false],
          ['The permission function in isolation', false]],
        'Testing the route leaves every other caller unchecked.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_AUTH_MINI_PROJECT',
    notes: `Build the auth for a real service, including the parts that are usually skipped:
refresh, revocation, and a permission model that survives a second caller.

The brief's distinguishing requirement is **the job**. Everything works when there is one
caller and it is HTTP. Adding a background worker that performs the same operations is what
exposes whether the checks were attached to the operation or to the route — and it is a
five-minute addition that invalidates a lot of comfortable designs.

Budget around two hours.`,
    assignment: {
      title: 'Mini Project — Auth That Survives a Second Caller',
      description: 'Build issuing, refresh, revocation and permissions, then add a background worker and see what breaks.',
      instructions: `**Build** auth for a service with at least four operations, two roles, and
records that belong to users.

**Part one — issuing**

1. Login issuing an access token and a refresh token. State both lifetimes and justify them.
2. The access token verified with no database read. **Prove it** — log or count the queries on
   an authenticated request.
3. The algorithm pinned on the verifying side. Show the code, and show what happens when a
   token arrives signed with a different one.
4. Nothing secret in the payload. List every claim and say why each is there.

**Part two — refresh and revocation**

5. A refresh endpoint doing all five steps, including **checking the user is still active**.
6. Rotation, with the old token invalidated. Show a replay of the old one being refused.
7. Handle the two-tab race. Show two simultaneous refreshes both succeeding, or explain your
   chosen behaviour and why.
8. Log out, log out everywhere, and password-change revocation. **Demonstrate all three.**
9. Refresh tokens stored hashed. Show the stored value is not usable.

**Part three — permissions**

10. A permission function per operation, taking actor and record. Not a decorator.
11. The check in the **service**, not the route.
12. Where the operation is a read, scope the query instead. Show one of each and say why each
    is which.

**Part four — the second caller**

13. **Add a background worker** that performs two of the same operations — a scheduled
    cancellation, a bulk update, whatever fits.
14. It must go through the same service methods with an explicit actor. **Show the permission
    check running for the worker.**
15. Report what you had to change to make this work. **If the answer is "nothing", say what in
    your design made that true.** If it was a lot, that is the finding and it is the one the
    brief is looking for.

**Part five — attack it**

16. The two-account test, against the **service methods**, for every operation.
17. A tampered token. A token signed with the wrong algorithm. An expired one. A refresh token
    replayed after use.
18. Check your logs: is any credential in them? Search for the actual token string.
19. State how long a deactivated user retains access, in seconds, and how you verified it.

**Submit** the implementation, the three revocation demonstrations, the worker with its
permission check, the attack results, and answers to 15 and 19.`,
      rubric: [
        { criterion: 'Issuing done properly', description: 'Both tokens, pinned algorithm, no database read on the hot path, proven.', maxPoints: 15 },
        { criterion: 'Refresh with all five steps', description: 'Including the active-user check and rotation, with a replay refused.', maxPoints: 20 },
        { criterion: 'Three revocations demonstrated', description: 'Log out, everywhere, and on password change.', maxPoints: 15 },
        { criterion: 'Permissions in the service', description: 'A function per operation, with scoped queries where reads allow it.', maxPoints: 15 },
        { criterion: 'The worker, checked', description: 'Same service methods, explicit actor, permission check shown running.', maxPoints: 20 },
        { criterion: 'Attacks and the honest number', description: 'All four attacks run, credentials absent from logs, the window stated in seconds.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Adding a background worker exposes:',
        [['Whether the checks were on the operation or the route', true],
          ['Whether the token verification is thread-safe', false],
          ['Whether the service handles concurrency', false],
          ['Whether the permission function is cached', false]],
        'A five-minute addition that invalidates a lot of comfortable designs.'),
      mcq('"Nothing had to change to support the worker" is:',
        [['A good answer, if you can say what made it true', true],
          ['A sign the worker was not properly integrated', false],
          ['Unlikely, and worth re-checking', false],
          ['Only possible with a permission framework', false]],
        'The brief asks for the reason either way.'),
      mcq('Proving the access token needs no database read is done by:',
        [['Counting the queries on an authenticated request', true],
          ['Inspecting the verification code', false],
          ['Timing the request against an unauthenticated one', false],
          ['Disabling the database and retrying', false]],
        'The same query-counting habit as the data topic.'),
    ],
  },

  /* ══ T3_BACKEND_SCALE ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BACKEND_SCALE_OFF_THE_REQUEST',
    notes: `Some work does not belong in a request. Generating a report, sending fifty emails,
resizing an image, calling a slow third party — **the user is waiting, the connection is held,
and a timeout loses the work entirely.**

## What moves

**Anything slow.** Above a second, ask whether it has to be synchronous.

**Anything that can fail independently.** An email failing should not fail the order.

**Anything bursty.** A thousand notifications at once should be smoothed, not attempted.

**Anything retryable.** A queue gives you retries for free; a request does not.

## The shape

    def place_order(self, data, actor):
        with self.uow:
            order = self.orders.create(...)
            self.outbox.add('order_placed', order_id=order.id)   # inside
        return order                                              # respond now

A worker reads the outbox and does the slow parts. **The write of the intent is atomic with the
order** — which is the outbox pattern the transactions unit introduced, and this is where it
earns its keep.

## What the caller is told

**This is the part that is designed badly most often**, and the failure is not technical.

**Do not lie.** Returning "Order confirmed and email sent" when the email is queued is a lie
that will eventually be visible.

**Return what is true now**, and say what is in progress:

    202 Accepted
    { "order_id": 812, "status": "confirming",
      "poll": "/orders/812" }

**Give them a way to find out.** Polling an endpoint, a webhook, a websocket, or simply an
email when it is done. **A background job the caller cannot observe is a job that will generate
support tickets**, because the user has no way to distinguish "still working" from "silently
failed".

**And design the intermediate state into the model.** \`status: confirming\` is a real state
the rest of the system must handle — the list endpoint shows it, the UI renders it, and a
cancel during it has to mean something. Pretending there are only two states is how a queue
introduces bugs elsewhere.

## Queues, briefly

**A database table** is a perfectly good queue for modest volumes, and it has a large
advantage: **it is transactional with your data**, which is exactly what the outbox needs. Poll
it, lock a row, do the work, mark it done.

**A dedicated broker** — Redis, SQS, RabbitMQ — gives you throughput, delivery guarantees and
fan-out, at the cost of another thing to run and the loss of transactionality with your
database.

**Start with the table.** Most services never need more, and moving later is straightforward
because the interface is yours.

## What a worker must handle

**Idempotency.** Messages get delivered twice. Almost every queue is at-least-once, and the
ones claiming exactly-once are doing it by making you idempotent anyway. **Design the job to be
safe to run twice** — the same argument as the retry discussion in the transactions topic.

**Failure and retry.** With backoff, and a limit.

**A dead letter queue.** Somewhere for messages that have failed enough times. **Without one
they either retry forever or vanish**, and both are worse than a queue somebody looks at.

**Poison messages.** One malformed message that crashes the worker on every attempt will block
everything behind it if the queue is ordered. The dead letter queue is what stops it.

**Observability.** Queue depth, age of the oldest message, failure rate. **Queue depth rising
is the earliest signal that a worker has died**, and it is often the only one — the API is
still healthy, the requests still succeed, and nothing is being processed.`,
    mcqs: [
      mcq('The outbox pattern earns its keep here because:',
        [['The intent is written atomically with the data', true],
          ['It avoids the need for a message broker', false],
          ['It guarantees the work happens exactly once', false],
          ['It lets the worker scale independently', false]],
        'Which is what the transactions unit introduced it for.'),
      mcq('Returning "email sent" when the email is queued is:',
        [['A lie that will eventually be visible', true],
          ['An acceptable simplification for the caller', false],
          ['Correct, since the send is guaranteed', false],
          ['Better than exposing internal states', false]],
        'Return what is true now, and say what is in progress.'),
      mcq('A background job the caller cannot observe:',
        [['Generates support tickets, because silence is ambiguous', true],
          ['Is simpler and therefore preferable', false],
          ['Should be made synchronous instead', false],
          ['Needs a longer retry window', false]],
        'The user cannot distinguish still-working from silently-failed.'),
      mcq('A database table as a queue has the advantage that:',
        [['It is transactional with your data', true],
          ['It scales further than a broker', false],
          ['It guarantees ordering across workers', false],
          ['It requires no polling', false]],
        'Exactly what the outbox needs, and most services never need more.'),
    ],
    checkpoint: [
      mcq('Workers must be idempotent because:',
        [['Almost every queue is at-least-once', true],
          ['Retries are configured by default', false],
          ['Messages can arrive out of order', false],
          ['The dead letter queue replays them', false]],
        'And the ones claiming exactly-once do it by making you idempotent anyway.'),
      mcq('Without a dead letter queue, failing messages:',
        [['Retry forever or vanish, and both are worse', true],
          ['Block the queue until manually removed', false],
          ['Are logged and discarded safely', false],
          ['Cause the worker to shut down cleanly', false]],
        'A queue somebody looks at is better than either.'),
      mcq('The earliest signal that a worker has died is usually:',
        [['Queue depth rising', true],
          ['An increase in API error rate', false],
          ['A drop in database write volume', false],
          ['Alerts from the worker’s health check', false]],
        'The API is still healthy and nothing is being processed.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_SCALE_CACHING_A_RESPONSE',
    notes: `The core caching topic decided **what** is safe to cache. This one caches an HTTP
response in a service, where **the key is the hard part** and almost every bug is in it.

## The key is the bug

A cached response is wrong if two different requests share a key.

**What must be in the key:**

- **The path and the query parameters** — all of them, including the ones you think do not
  matter.
- **The caller's identity, or their permissions**, if the response differs by who asked.
  **This is the one that causes breaches.** A cache keyed on the path alone, on an endpoint
  that returns the caller's own orders, serves one customer's data to another.
- **The content type or language**, if you negotiate them.
- **The version of the data shape**, if you version your API.

**What must not:**

- **The request id**, or anything unique per request. The cache will never hit.
- **The timestamp.** Same.

**The test:** *for two requests with this same key, is every acceptable response identical?* If
not, something is missing from the key.

## Where the cache sits

**In the application**, keyed by whatever you choose. Full control, full responsibility.

**In a shared store** — Redis. One copy across instances, so invalidation works.

**In HTTP** — \`Cache-Control\`, \`ETag\`, \`Last-Modified\`. **Underused, and it is free**: the
browser and any intermediate cache do the work, and a \`304 Not Modified\` costs you almost
nothing while saving the whole response body.

**\`ETag\` is worth the twenty minutes** it takes to add. Hash the response, return it, and on
the next request compare the client's \`If-None-Match\`. If it matches, return 304 with no
body. You still do the work of generating the response unless you are careful — **so it saves
bandwidth rather than computation**, which is worth knowing before you claim it as a
performance fix.

## Private and public

    Cache-Control: private, max-age=60      # this user's browser only
    Cache-Control: public, max-age=3600     # any cache, including a CDN

**Marking a personalised response \`public\` puts it in a shared cache**, which is the same
breach as the key mistake by another route. **When in doubt, \`private\`, or \`no-store\` for
anything sensitive.**

## Invalidation in a service

The core unit's advice applies: **prefer a short TTL to clever invalidation.**

What is specific here: **you often know exactly when the data changed**, because you are the
service that changed it. That makes key versioning particularly easy:

    key = f'orders:{customer_id}:v{customer.orders_updated_at.timestamp()}'

Bump the timestamp on write, and every cached response for that customer becomes unreachable at
once. No deletes, nothing to fail.

## What not to cache in a service

**A response that reflects a write the caller just made.** Read-your-own-writes matters:
somebody places an order, the list is cached, and their order is missing. **They will refresh,
see it still missing, and place it again.**

**Anything that decides.** The core unit's stock example — cache the display, never the
decision.

**Error responses**, generally. A cached 500 outlives the fault that caused it, and you get
reports of an outage that ended twenty minutes ago.

## Measuring it

**Hit rate.** Below about 80% for a read-heavy endpoint, ask why — usually the key is too
specific.

**The cost of a miss.** If a miss is 2 seconds and the hit rate is 90%, one request in ten is
still slow, and your p99 is unchanged. **Caching improves the average and often does nothing
for the tail**, which is the opposite of what people assume when they add it.`,
    mcqs: [
      mcq('The cache key mistake that causes breaches is:',
        [['Omitting the caller’s identity from the key', true],
          ['Including the request id in the key', false],
          ['Using the path without the query string', false],
          ['Keying on a stale version of the data', false]],
        'One customer’s orders served to another.'),
      mcq('The test for a cache key is:',
        [['Would every acceptable response for this key be identical', true],
          ['Is the key short enough to be efficient', false],
          ['Does the key change when the data changes', false],
          ['Is the key unique per request', false]],
        'If not, something is missing from it.'),
      mcq('An ETag primarily saves:',
        [['Bandwidth, rather than computation', true],
          ['Computation, since the response is not generated', false],
          ['Both equally', false],
          ['Database queries on the server', false]],
        'Worth knowing before claiming it as a performance fix.'),
      mcq('Caching improves the average and often does nothing for:',
        [['The tail, since a miss is still slow', true],
          ['The write path', false],
          ['The error rate', false],
          ['The throughput ceiling', false]],
        'Which is the opposite of what people assume when they add it.'),
    ],
    checkpoint: [
      mcq('Marking a personalised response `public`:',
        [['Puts it in a shared cache, which is the breach again', true],
          ['Allows the browser to cache it longer', false],
          ['Has no effect without a CDN', false],
          ['Is required for ETags to work', false]],
        'When in doubt, private, or no-store for anything sensitive.'),
      mcq('Failing to serve read-your-own-writes causes:',
        [['The user to place the order a second time', true],
          ['A stale count on the dashboard', false],
          ['An inconsistency the next refresh resolves', false],
          ['A cache miss on the following request', false]],
        'They refresh, still do not see it, and try again.'),
      mcq('A hit rate below about 80% on a read-heavy endpoint usually means:',
        [['The key is too specific', true],
          ['The TTL is too long', false],
          ['The cache is undersized', false],
          ['The data changes too often to cache', false]],
        'Something in the key is varying that need not.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_SCALE_MEASURE_BEFORE_AND_AFTER',
    notes: `Performance work without a measurement is decoration. You will feel that it is
faster, and roughly half the time you will be wrong.

This unit is short because the core topics said most of it. **What is specific to a service is
what to measure and what to report.**

## The four numbers

For any change, report:

**p50, p95 and p99** — before and after. The mean is not on this list.

**Throughput** — requests per second at a fixed concurrency. A change that improves latency and
halves throughput is usually not an improvement.

**Resource cost** — CPU and memory. Caching trades memory for time, and if nobody measured the
memory, the trade was not made, it was assumed.

**The write path** — if you touched indexes, queues or caches, writes may have got slower.

## Measuring a service, not a function

**Load, not a single request.** A single request measures a warm path with no contention.
Performance problems are contention problems, and they appear at concurrency.

**A realistic mix.** Ninety per cent of requests hitting one endpoint is not your traffic.

**Steady state.** Discard the first period. Caches are cold, connection pools are empty and the
runtime has not warmed up.

**The same conditions both times.** Same data volume, same machine, same concurrency. **A
"before" on an empty cache and an "after" on a warm one is not a comparison**, and it is the
easiest mistake to make because it happens by default.

## The specific traps in a service

**Measuring on your laptop.** No network, a local database, no contention. The numbers are not
wrong, they are about a different system.

**Measuring the wrong percentile at the wrong volume.** p99 over 100 requests is one request.
You need thousands for it to mean anything.

**Improving an endpoint nobody calls.** Weight by volume, as the data topic said: p95 times
calls per hour.

**Forgetting the thing you added.** A cache has a memory cost and an invalidation cost. A
queue has a worker, a lag and an operational surface. **Both are real and neither appears in a
latency graph**, so both have to be reported separately or they are invisible.

## What a report looks like

> \`GET /orders\` — added eager loading and a 60-second response cache.
>
> | | before | after |
> |---|---|---|
> | p50 | 340ms | 45ms |
> | p95 | 1,840ms | 180ms |
> | p99 | 3,200ms | 1,900ms |
> | throughput | 210 rps | 900 rps |
> | queries/request | 340 | 3 |
> | memory | — | +180MB cache |
>
> **p99 barely moved: a cache miss still costs 1.9s**, and one request in twenty is a miss.
> Next step is the miss path, not a longer TTL.

**That last line is the point of measuring.** Without the percentiles it reads as a
ten-times improvement; with them it says the tail is untouched and names what to do next.`,
    mcqs: [
      mcq('The mean is absent from the four numbers because:',
        [['It hides the tail, which is where the problem is', true],
          ['It is harder to measure under load', false],
          ['It varies too much between runs', false],
          ['Percentiles are easier to compare', false]],
        'p50, p95 and p99 tell you what the mean cannot.'),
      mcq('A change improving latency and halving throughput is:',
        [['Usually not an improvement', true],
          ['An improvement, since users see latency', false],
          ['Neutral, since the totals balance', false],
          ['An improvement if the p99 fell', false]],
        'Which is why throughput is one of the four.'),
      mcq('A "before" on a cold cache and an "after" on a warm one:',
        [['Is not a comparison, and it happens by default', true],
          ['Overstates the improvement slightly', false],
          ['Is acceptable if both used the same data', false],
          ['Understates the cache’s real benefit', false]],
        'Same conditions both times, or the numbers mean nothing.'),
      mcq('p99 measured over 100 requests is:',
        [['One request', true], ['A reliable tail estimate', false],
          ['The slowest of the hundred', false], ['Equivalent to the maximum', false]],
        'You need thousands for it to mean anything.'),
    ],
    checkpoint: [
      mcq('The memory cost of a cache must be reported separately because:',
        [['It never appears in a latency graph', true],
          ['It varies with the hit rate', false],
          ['It is hard to attribute to one change', false],
          ['It only matters at high volume', false]],
        'The same is true of a queue’s worker and operational surface.'),
      mcq('"p99 barely moved, a miss still costs 1.9s" is valuable because:',
        [['It names the next step instead of declaring victory', true],
          ['It shows the cache was configured wrongly', false],
          ['It proves the measurement was rigorous', false],
          ['It justifies a longer TTL', false]],
        'Without the percentiles it reads as a ten-times improvement.'),
      mcq('Measuring on a laptop produces numbers that are:',
        [['Not wrong, but about a different system', true],
          ['Consistently optimistic by a fixed factor', false],
          ['Useless for any purpose', false],
          ['Valid for relative comparisons only', false]],
        'No network, a local database, and no contention.'),
    ],
  },

  /* ══ T3_BACKEND_OPS ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BACKEND_OPS_LOGGING_A_SERVICE',
    notes: `The reliability topic said what is worth logging. This unit is about **one request
travelling through a service**, which is the thing a backend engineer actually needs at 3am.

## The request id, end to end

Generate one at the edge if the caller did not supply one, and **attach it to everything**:

    incoming request  →  X-Request-Id: req_01HX3...  (or generate)
      ↓ every log line in this request
      ↓ every outgoing call, as a header
      ↓ every queued job, as a field
      ↓ the response, as a header

**The three arrows after the first are what distinguishes this from the core unit.**

**Outgoing calls.** Pass the id to your dependencies. When their team asks which request, you
have it, and when you are debugging across three services the id is the only thing joining
them.

**Queued jobs.** Carry the id into the job. Otherwise the asynchronous half of the operation is
unlinkable to the request that caused it, and that is exactly the half that fails quietly.

**The response.** Return it in a header. Now a user reporting a problem can be asked for it,
and support can find the exact request rather than searching by timestamp and hoping.

## Carrying it without threading it through everything

Passing the id as a parameter to every function is correct and unbearable. The usual answer is
**a context local** — thread-local, async-context or equivalent — set at the edge and read by
the logger.

**Be careful with two things:** it must be cleared between requests, or you will attribute one
request's logs to another; and **it will not propagate into a thread or a task you spawn
yourself** unless you carry it explicitly, which is the commonest way an id goes missing
halfway through a trace.

## What a request should log

**One line at the start** is optional. **One line at the end is not:**

    request_completed method=POST path=/orders status=201
      duration_ms=142 queries=4 user=9f3a request_id=req_01HX3...

**Status, duration and query count on one line per request** is an enormous amount of the
observability a service needs, and it is about fifteen lines of middleware.

**Then:** every error with full context; every external call with its duration and outcome;
every significant state change.

**Not:** every function entry. Not the request body by default — it contains passwords,
tokens and personal data.

## Errors

    log.error('order_failed', request_id=..., user_id=..., order_id=...,
              stage='payment', error_code=e.code, exc_info=True)

**\`stage\` is the field worth adding** and it is the one nobody has. A service does five
things per request; knowing which one failed turns a stack trace into a location before you
read a line of it.

## Levels, in a service

**ERROR** — somebody may need to act. A failed payment is an error; **a user typing a bad
password is not**, and an ERROR channel full of validation failures is one nobody reads.

**WARN** — a retry succeeded, a deprecated endpoint was called, a dependency was slow.

**INFO** — the completion line, and state changes.

**DEBUG** — off in production, and available per request if you can manage it. **Enabling debug
for one request id** is the single most useful logging feature you can build, and it is not
difficult: check a header against an allowlist and raise the level for that request only.

## Sampling

At volume, logging every request costs real money.

**Sample the successes, keep all the errors.** One per cent of 200s and every 500 gives you the
shape and all the failures. **Never sample errors** — the one you dropped is the one you needed,
and this is a mistake teams make once.`,
    mcqs: [
      mcq('What distinguishes this from the core logging unit is carrying the id into:',
        [['Outgoing calls, queued jobs and the response', true],
          ['Every log line in the request', false],
          ['The structured fields of each entry', false],
          ['The error tracking system', false]],
        'The asynchronous half is exactly the half that fails quietly.'),
      mcq('Returning the request id in a response header lets:',
        [['Support find the exact request from a user report', true],
          ['The client correlate its own retries', false],
          ['A proxy cache key on it', false],
          ['The caller detect duplicate responses', false]],
        'Rather than searching by timestamp and hoping.'),
      mcq('A context local will not propagate into:',
        [['A thread or task you spawn yourself', true],
          ['A nested function call', false],
          ['A database query in the same request', false],
          ['An exception handler', false]],
        'The commonest way an id goes missing halfway through a trace.'),
      mcq('The error field nobody has and should is:',
        [['stage', true], ['user_id', false], ['request_id', false], ['error_code', false]],
        'Knowing which of five things failed locates it before you read the trace.'),
    ],
    checkpoint: [
      mcq('One completion line per request with status, duration and query count:',
        [['Is most of the observability a service needs', true],
          ['Duplicates what metrics already provide', false],
          ['Should be at debug level to control volume', false],
          ['Is only useful when errors occur', false]],
        'About fifteen lines of middleware.'),
      mcq('A user typing a bad password should be logged at:',
        [['Not error, since nobody needs to act', true],
          ['Error, since authentication failed', false],
          ['Error, for security monitoring', false],
          ['Warn, since it may indicate an attack', false]],
        'An ERROR channel full of validation failures is one nobody reads.'),
      mcq('Sampling logs at volume should:',
        [['Sample successes and keep every error', true],
          ['Sample both at the same rate', false],
          ['Sample errors more heavily, since they repeat', false],
          ['Sample by endpoint rather than by outcome', false]],
        'The error you dropped is the one you needed.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_OPS_TESTING_AN_API',
    notes: `The core testing topic chose the level. This unit applies it to an API and adds the
one kind that only exists once somebody else calls you.

## The levels, for an endpoint

**Unit** — the service method, with fakes. Fast, and where the branches are covered. **Nine
tests of a pricing rule belong here**, and if they are not here they do not exist.

**Integration** — the endpoint through the framework, against a real database. Fewer: the happy
path, the main failure, the authorization refusal. **This is the level that catches the wiring**
— the serialiser field that does not exist, the route that is not registered, the migration
that was not run.

**Contract** — that your response matches what callers expect. New here, and covered below.

**End to end** — through a deployed system. One or two.

## The distribution

For a typical endpoint: **six to ten unit tests, three integration, one contract, zero to one
end-to-end.**

**The failure mode is all integration.** Every test spins up the app and hits the endpoint,
each takes 200ms, the suite takes eleven minutes, and nobody runs it before pushing. **You
cannot get to nine cases per rule at 200ms each**, so the branches go untested and the suite is
simultaneously slow and thin.

## Contract tests

**Once somebody else calls your API, its shape is a promise.** A contract test asserts the
shape and fails when it changes:

    def test_order_response_shape():
        r = client.get('/orders/1')
        assert set(r.json()) >= {'id', 'status', 'total', 'customer'}
        assert isinstance(r.json()['total'], int)

**This catches the accidental breaking change** — a field renamed in a refactor, a type changed
by a library upgrade, a nullable field that is now null. The API versioning unit called those
the changes nobody meant to make; **this is the test that turns them into a decision.**

**Assert what you promised, not everything.** A test asserting the exact full response fails
every time you add a field, which is an additive change that breaks nobody — and a test that
fails on safe changes gets deleted.

## What to test at each level, concretely

**Authorization: at the service level, per operation.** The two-account test. If it is only at
the endpoint, a job bypasses both the check and the test.

**Validation: unit, exhaustively.** Every field, every boundary. Cheap and where the cases are.

**Status codes: integration.** That a validation failure is 422 and not 500 is wiring, and it
is wrong surprisingly often.

**Error shape: contract.** One shape everywhere, asserted once.

**Query count: integration.** The maximum-queries assertion from the data topic.

## What to fake and what not

**Fake the third party.** Always. And **have one test against the real thing**, run separately
— the core unit's point, and the only defence against a fake that has drifted.

**Do not fake your own database.** The repository's job is to talk to it.

**Do not fake time by waiting.** Freeze it.

## The test that is usually missing

**The one where the dependency fails.** The payment provider returns 500. The database
connection drops mid-transaction. The queue is unreachable.

**Every service handles these paths, and almost nobody tests them** — so the error handling,
which only runs when something is already wrong, is the least-tested code in the system. That
is exactly backwards, and it is why incidents so often have a second failure inside the
handling of the first.`,
    mcqs: [
      mcq('The failure mode of API testing is:',
        [['All integration, so the suite is slow and thin at once', true],
          ['Too many unit tests with mocks', false],
          ['Missing end-to-end coverage', false],
          ['Testing the framework rather than the code', false]],
        'You cannot get to nine cases per rule at 200ms each.'),
      mcq('A contract test catches:',
        [['The breaking change nobody meant to make', true],
          ['A caller sending an invalid request', false],
          ['A performance regression in the endpoint', false],
          ['An authorization check that is missing', false]],
        'A renamed field, a changed type, a nullable that is now null.'),
      mcq('A contract test asserting the exact full response:',
        [['Fails on additive changes and gets deleted', true],
          ['Provides the strongest guarantee available', false],
          ['Is the correct form for a versioned API', false],
          ['Catches field removals more reliably', false]],
        'Assert what you promised, not everything.'),
      mcq('The least-tested code in most services is:',
        [['The error handling, which only runs when something is wrong', true],
          ['The authorization checks', false],
          ['The serialisation layer', false],
          ['The database migrations', false]],
        'Which is why incidents so often have a second failure inside the first.'),
    ],
    checkpoint: [
      mcq('Authorization should be tested at:',
        [['The service level, per operation', true],
          ['The endpoint level, per route', false],
          ['Both, with the endpoint as primary', false],
          ['The permission function in isolation', false]],
        'Otherwise a job bypasses both the check and the test.'),
      mcq('That a validation failure returns 422 rather than 500 is:',
        [['Wiring, and tested at integration level', true],
          ['Logic, and tested at unit level', false],
          ['Contract, and asserted once', false],
          ['Framework behaviour, and not worth testing', false]],
        'And it is wrong surprisingly often.'),
      mcq('One test against the real third party, run separately, defends against:',
        [['A fake that has drifted from reality', true],
          ['The third party being unavailable', false],
          ['Rate limits during the test run', false],
          ['Changes to your own serialisation', false]],
        'The single biggest risk with mocks, from the core topic.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_OPS_DOCUMENTING_IT',
    notes: `**This is the shortest unit in the year, and deliberately.** The core documentation
topic covered API documentation properly: what every endpoint needs, generated against written,
and the test of handing it to somebody and watching them.

All of that applies. **It is not repeated here**, and if you skipped it, go back — that is a
better use of an hour than reading this twice.

**The track adds one thing.**

## The example that runs in CI

A documented example that no longer works is worse than none, because the reader debugs their
own code first. The core unit said so and said running the examples in CI is the only mechanism
that works.

**Here is what that looks like for a backend**, concretely, because "run the examples in CI" is
easy to agree with and rarely done.

**1. Write examples as executable requests**, in whatever your test client uses:

    # docs/examples/create_order.py
    response = client.post('/orders', json={
        'items': [{'sku': 'SKU-4421', 'quantity': 2}],
        'discount_code': 'SAVE10',
    })
    assert response.status_code == 201
    assert response.json()['total'] == 3598

**2. Run them as part of the test suite.** They are tests.

**3. Generate the documentation from them**, or at minimum include them by reference so the
documented text and the executed code are the same characters. A copy that is manually kept in
step will drift within a month.

**That is the whole addition.** The examples in your documentation are tests, they run, and
they fail when the API changes — which turns documentation from a thing that decays into a
thing that is maintained by the same mechanism as the code.

## Two backend-specific notes

**Document the errors your service actually returns**, generated from the error codes in the
code if you can. An error catalogue that drifts is the most annoying kind, because a caller
handling a code you removed has written dead code and does not know.

**Document the asynchronous parts.** If an endpoint returns 202 and the work happens later, the
documentation must say what "later" means, how to find out, and what happens if it fails.
**This is the thing integrators get wrong most often**, and it is nearly always because nobody
wrote it down.`,
    mcqs: [
      mcq('This unit is short because:',
        [['The core documentation topic covered it properly', true],
          ['Backend documentation needs less detail', false],
          ['Generated documentation removes most of the work', false],
          ['It is assessed in the project instead', false]],
        'Going back to that unit is a better use of an hour than reading this twice.'),
      mcq('The one thing the track adds is:',
        [['Examples written as executable requests that run in CI', true],
          ['A generated reference from the code', false],
          ['A changelog for the API', false],
          ['A getting-started guide for integrators', false]],
        'Which turns documentation into something maintained by the same mechanism as the code.'),
      mcq('An error catalogue that drifts is especially annoying because:',
        [['A caller handling a removed code has written dead code unknowingly', true],
          ['Errors are the most frequently read section', false],
          ['It cannot be generated automatically', false],
          ['Error codes change more often than endpoints', false]],
        'Generate it from the codes in the code where you can.'),
    ],
    checkpoint: [
      mcq('A documented example kept manually in step with the code:',
        [['Drifts within a month', true],
          ['Is acceptable if reviewed with each change', false],
          ['Works when the API is stable', false],
          ['Is preferable to generated examples', false]],
        'The documented text and the executed code should be the same characters.'),
      mcq('What integrators most often get wrong is:',
        [['The asynchronous parts, because nobody wrote them down', true],
          ['The authentication scheme', false],
          ['The pagination parameters', false],
          ['The error response shape', false]],
        'What "later" means, how to find out, and what happens if it fails.'),
      mcq('Examples that run in CI fail when:',
        [['The API changes', true],
          ['The documentation is edited', false],
          ['A dependency is upgraded', false],
          ['The test data changes', false]],
        'Which is exactly when you want to know.'),
    ],
  },

  /* ══ T3_BACKEND_PROJECT ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BACKEND_PROJECT_BRIEF',
    notes: `Before you write anything, write down what you are building and what done means.
**Most student projects fail on the second half**, not the first: they are ninety per cent
complete forever, because nobody ever wrote down what complete was.

## Choose something small and real

**Small.** A project you can finish beats one you can describe. A well-built URL shortener with
auth, rate limiting, tests and a deployment is more impressive than a half-finished social
network, and **it is more impressive to the people who matter** — an interviewer reads your
tests and your commits, not your ambition.

**Real.** Something with users, state and rules. Not a to-do list with no rules in it; not a
CRUD wrapper over one table.

**Reasonable scope:** three to five entities, a handful of rules worth enforcing, one or two
external interactions.

## What the brief contains

**1. What it does, in three sentences.** If you cannot, the scope is unclear.

**2. Who uses it, and what they can do.** Two roles at least, with different permissions.

**3. The entities and how they relate.** A diagram. This is also your data model, and getting
it wrong is the one-way door from the architecture topic.

**4. The rules.** Written as statements. *An order may be cancelled while pending. A user may
have one active subscription.* **These become your domain functions and your tests**, and
listing them now is the cheapest they will ever be.

**5. What it does not do.** Explicitly. **This is the most valuable section** — it is what
stops the project growing while you build it, and scope growth is what kills these.

## The definition of done

Not "it works". A list you can be held to:

- [ ] Auth: registration, login, refresh, logout, revocation on password change
- [ ] Two roles with genuinely different permissions, checked in the service
- [ ] Every state-changing operation has a permission check and a test that a stranger is
      refused
- [ ] A database with migrations, and constraints enforcing the invariants
- [ ] Every rule from section 4 has a unit test
- [ ] Integration tests for the happy path and the main failure of each endpoint
- [ ] A contract test per endpoint
- [ ] Structured logging with a request id carried through
- [ ] Errors: one shape, correct status codes, no internals leaked
- [ ] Pagination on every list endpoint
- [ ] Deployed somewhere, with a rollback you have performed
- [ ] A README somebody else followed successfully
- [ ] API documentation with examples that run

**Write your own version of this list before you start.** Then do not add to it — add to a
"later" list instead, and ship what you committed to.

## The two failures this prevents

**The project that is never finished.** No definition of done means no finish line, and there
is always one more feature.

**The demo that is not a system.** It works when you click the happy path. There is no auth, no
tests, no error handling, and it has never been deployed. **An interviewer finds this out in
four minutes** by asking what happens when two people do it at once.

## Time

Budget your hours and reserve a third for the unglamorous part — tests, deployment,
documentation, error handling. **That third is what makes it a production project rather than a
demo**, and it is the third that gets cut when the feature work runs long, which is why it is
reserved rather than left to the end.`,
    mcqs: [
      mcq('Most student projects fail on:',
        [['The definition of done, not the building', true],
          ['The difficulty of the chosen problem', false],
          ['The deployment step', false],
          ['The authentication requirements', false]],
        'Ninety per cent complete forever, because nobody wrote down what complete was.'),
      mcq('A finished URL shortener beats a half-finished social network because:',
        [['An interviewer reads your tests and commits, not your ambition', true],
          ['Simpler projects have fewer bugs', false],
          ['Scope is judged against the time available', false],
          ['Smaller projects are easier to explain', false]],
        'It is more impressive to the people who matter.'),
      mcq('The most valuable section of the brief is:',
        [['What it does not do', true],
          ['The list of rules', false],
          ['The entity diagram', false],
          ['The definition of done', false]],
        'Scope growth is what kills these projects.'),
      mcq('The rules written as statements become:',
        [['Your domain functions and your tests', true],
          ['The endpoints of your API', false],
          ['The database constraints', false],
          ['The permission checks', false]],
        'And listing them now is the cheapest they will ever be.'),
    ],
    checkpoint: [
      mcq('A third of the time should be reserved for:',
        [['Tests, deployment, documentation and error handling', true],
          ['Refactoring once the features are done', false],
          ['Handling unexpected technical problems', false],
          ['Polishing the interface', false]],
        'It is the third that gets cut, which is why it is reserved rather than left to the end.'),
      mcq('An interviewer identifies a demo rather than a system by:',
        [['Asking what happens when two people do it at once', true],
          ['Checking whether it is deployed', false],
          ['Reading the commit history', false],
          ['Looking at the test coverage figure', false]],
        'Four minutes, and the answer is usually silence.'),
      mcq('New ideas during the build should go:',
        [['On a "later" list, not into the scope', true],
          ['Into the brief, with the done list updated', false],
          ['Into the build if they are small', false],
          ['To the mentor for a scope decision', false]],
        'Ship what you committed to.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_PROJECT_BUILD',
    notes: `Build it. The whole thing — auth, data, tests, logging, a deployment — not a demo.

**The order below is deliberate.** It puts the things people skip at the start rather than the
end, because the end is where the time runs out. A project with tests from day one has tests; a
project that plans to add them has none.

Budget around three and a half hours of focused work, and expect it to take longer.`,
    assignment: {
      title: 'Production Backend Project — Build It',
      description: 'Build the service from your brief: auth, data, rules, tests, logging and a deployment.',
      instructions: `**Build the service described in your brief.** Work in this order.

**Part one — the spine, first**

1. Repository, README skeleton, and a test that runs. **Before any feature.**
2. A deployment pipeline that runs the tests. It will deploy nothing yet.
3. The data model, with migrations and constraints — not null, unique, foreign keys, checks.
   **The constraints enforce the invariants from your brief.**
4. Three layers: controller, service, repository. Even for the first endpoint.

**Part two — the rules, before the endpoints**

5. Write each rule from your brief as a domain function.
6. Write the unit tests for them. **All the cases, not the happy one** — boundaries, empty,
   invalid, duplicate.
7. These should run in under a second in total. Report the time.

**Part three — auth**

8. Registration and login, passwords hashed with a slow algorithm.
9. Access and refresh tokens, with the five refresh steps.
10. Revocation: logout, logout everywhere, and on password change.
11. A permission function per operation, checked **in the service**.
12. A two-account test per operation, against the service method.

**Part four — the endpoints**

13. Each endpoint: parse, delegate, format. Nothing else.
14. Validation at the boundary, returning every failure.
15. One error shape everywhere, including the framework's own 404 and 500.
16. Pagination, filtering and sorting on every list endpoint. Cursor-based if the data grows.
17. Integration tests: happy path, main failure, authorization refusal, and a maximum query
    count.

**Part five — operations**

18. Structured logging with a request id at the edge, carried into outgoing calls and jobs, and
    returned in the response header.
19. One completion line per request with status, duration and query count.
20. A health check that verifies the database.
21. Deploy it. **Then roll it back, and time it.**

**Part six — prove it is a system**

22. Run it under concurrent load — at least twenty simultaneous clients performing a
    state-changing operation. **Check your invariants afterwards with a query.** Report the
    result.
23. Break a dependency — stop the database — and show what a caller sees. It should be a 503,
    not a stack trace.
24. Show the request id joining a log line, an outgoing call and the response header.

**Submit** the repository, the test suite with its timings, the concurrent-load result, the
dependency-failure behaviour, and the rollback timing.`,
      rubric: [
        { criterion: 'The spine first', description: 'Tests and pipeline before features; three layers from the first endpoint.', maxPoints: 15 },
        { criterion: 'Rules as tested functions', description: 'Every rule from the brief, with all cases, running in about a second.', maxPoints: 20 },
        { criterion: 'Auth complete', description: 'Issuing, refresh with all five steps, three revocations, permissions in the service.', maxPoints: 20 },
        { criterion: 'Endpoints done properly', description: 'Thin controllers, validation, one error shape, pagination, query-count tests.', maxPoints: 15 },
        { criterion: 'Observable and deployed', description: 'Request id carried through, completion line, health check, rollback performed.', maxPoints: 15 },
        { criterion: 'Proven under load and failure', description: 'Invariants hold after concurrency; a stopped dependency gives 503, not a trace.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The build order puts tests and the pipeline first because:',
        [['The end is where the time runs out', true],
          ['They are quicker to set up early', false],
          ['The pipeline is needed for the first deploy', false],
          ['Tests are easier to write before the code exists', false]],
        'A project that plans to add tests has none.'),
      mcq('Checking invariants with a query after concurrent load:',
        [['Detects lost updates that produced no error', true],
          ['Measures the throughput achieved', false],
          ['Confirms the permission checks held', false],
          ['Verifies the transactions committed', false]],
        'Every request succeeded and the data is wrong.'),
      mcq('A stopped database should produce:',
        [['A 503, not a stack trace', true],
          ['A 500 with the error logged', false],
          ['A 504, since it is a dependency timeout', false],
          ['A retry until it returns', false]],
        'And a stack trace to a caller is an information disclosure as well as a bad experience.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_PROJECT_EXPLAIN',
    notes: `You built it. **Now defend every significant decision in it** — because that is what
an interview actually tests, and it is the part nobody practises.

## Why this is the part that counts

Two candidates present the same project. One describes what it does. The other says why the
data model is shaped that way, what they would change, what broke and how they found it, and
where it would fall over at ten times the scale.

**The second one gets the offer**, and the gap is not talent. It is that they prepared this and
the first assumed the code would speak.

**The code does not speak.** An interviewer has fifteen minutes and cannot read it.

## The decisions to be ready for

**The data model.** Why these entities? Why is that a separate table? What happens if that
relationship becomes many-to-many? **This is the one-way door**, and they know it.

**Sessions or tokens**, and why. Where the credential is kept, and what that costs.

**Where the permission checks live**, and what happens when a job calls the same operation.

**What is in a transaction and what is outside**, and what inconsistency that allows.

**What is cached**, for how long, and how it becomes wrong.

**What you did not build**, and why. **This is a strong answer, not a weak one** — "I did not
add a caching layer because the endpoint is 40ms and there are no users yet" is better
engineering than having added one.

## Answer in the same shape every time

**What I did. Why. What it cost. What I would change.**

> "Permission checks are in the service rather than the route. That means a background job
> calling the same method is checked too — I added a worker specifically to test that. It costs
> a little duplication, since the UI also needs to know, so both call the same
> \`can_cancel(actor, order)\` function. If I were doing it again I would scope the read
> queries as well, which I only did in two places."

**Four sentences.** It shows the decision, the reasoning, honesty about the cost, and
self-criticism. **The fourth sentence is the one that distinguishes people**, and it is the one
most candidates leave out because they think admitting a flaw loses marks. It does the
opposite: it demonstrates you can evaluate your own work, which is most of what seniority is.

## Be ready for the hard questions

**"What happens if two people do this at once?"** You built for it. Say what you did and show
the test.

**"How would this behave with a million rows?"** Which query degrades, and what you would do.
"I don't know" is worse than "the list endpoint uses offset pagination, which degrades past a
few thousand pages — I would move to a cursor."

**"What is the worst part of your code?"** Have an answer ready. Not false modesty — a real one,
with why you left it. Candidates who say "nothing really" are either not looking or not honest,
and neither reads well.

**"Why did you not use X?"** Often you have not heard of X. **"I don't know that one — what
would it have given me?"** is a perfectly good answer, and pretending is much worse.

**"Walk me through what happens on this request."** Edge to response and back. Practise this
out loud; it is much harder than it sounds.

## What to prepare

**A five-minute walkthrough.** Not a feature tour — the shape of the system, and two or three
decisions.

**Three decisions you are proud of**, in the four-sentence form.

**Three things you would change**, with reasons.

**One thing that broke**, and how you found it. **This is the best question you will be asked**
and most candidates have nothing. The debugging topic's method — hypothesis, test, evidence —
is exactly what they are listening for.

**The numbers.** How many endpoints, how many tests, what the p95 is, how long a deploy takes.
Having measured your own system is itself the signal.`,
    mcqs: [
      mcq('The candidate who gets the offer is the one who:',
        [['Explains why, what it cost and what they would change', true],
          ['Built the more ambitious project', false],
          ['Has the cleaner codebase', false],
          ['Describes the features most clearly', false]],
        'The gap is preparation, not talent — the code does not speak.'),
      mcq('"I did not build a caching layer because the endpoint is 40ms" is:',
        [['A strong answer showing judgement', true],
          ['A weakness to be acknowledged briefly', false],
          ['A gap that should have been filled', false],
          ['Acceptable only if the project is small', false]],
        'Better engineering than having added one.'),
      mcq('The fourth sentence — what you would change — matters because:',
        [['Evaluating your own work is most of what seniority is', true],
          ['It pre-empts the interviewer’s criticism', false],
          ['It shows the project is still evolving', false],
          ['It demonstrates knowledge of alternatives', false]],
        'Most candidates leave it out thinking a flaw loses marks. It does the opposite.'),
      mcq('Asked about a technology you have not heard of, the best answer is:',
        [['Say so, and ask what it would have given you', true],
          ['Describe something similar you do know', false],
          ['Explain why your choice was still reasonable', false],
          ['Say you evaluated it and chose otherwise', false]],
        'Pretending is much worse than not knowing.'),
    ],
    checkpoint: [
      mcq('"What is the worst part of your code?" answered with "nothing really" reads as:',
        [['Not looking, or not honest', true],
          ['Confidence in the work', false],
          ['A reasonable answer for a small project', false],
          ['A deflection the interviewer expects', false]],
        'Have a real one ready, with why you left it.'),
      mcq('The best question you will be asked is:',
        [['What broke, and how you found it', true],
          ['How the system would scale', false],
          ['Why you chose that architecture', false],
          ['What you would build next', false]],
        'Most candidates have nothing, and the debugging method is what they are listening for.'),
      mcq('Knowing your project’s p95 and deploy time is a signal because:',
        [['Having measured your own system is itself the point', true],
          ['Those numbers are commonly asked for', false],
          ['They demonstrate the project is deployed', false],
          ['They show familiarity with observability tools', false]],
        'Most candidates have never measured anything they built.'),
    ],
  },
];
