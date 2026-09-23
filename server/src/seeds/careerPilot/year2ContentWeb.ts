/**
 * T2_WEB_HTTP and T2_APIS — seventeen units. Year 2.
 *
 * ── WHY BOTH, IN THIS ORDER ───────────────────────────────────────────────────────────────
 *
 * Almost every job a second-year will take involves something talking to something else over HTTP.
 * Year 1 treated the web as a place pages come from. Year 2 treats it as a protocol with rules you
 * can read, break and debug.
 *
 * HTTP comes first because an API is HTTP with conventions on top. A student who does not know what
 * a 404 means cannot design an endpoint that returns one honestly, and one who has never opened the
 * network tab cannot debug the call that failed.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const WEB_BUNDLES: PilotBundle[] = [
  /* ── T2_WEB_HTTP ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_WEB_HTTP_INTERNET',
    notes: `Typing an address and pressing enter starts a sequence that is worth knowing in order,
because every web bug you will ever debug happens at one of these steps.

**1. The name becomes an address.** \`shop.example.com\` means nothing to the network. A DNS lookup
turns it into an IP address such as \`93.184.216.34\`. Your machine checks its own cache first, then
the resolver your network gave it.

**2. A connection opens.** A TCP connection to that address, on port 443 for HTTPS. Three messages
back and forth establish it.

**3. HTTPS negotiates.** Certificates are exchanged and checked, and both sides agree on keys. From
here, everything is encrypted.

**4. The request goes.** A few lines of text: the method, the path, and headers saying who is asking
and what they will accept.

**5. The server answers.** Possibly after talking to a database, another service, or a cache. It
sends back a status code, headers and a body.

**6. The browser renders.** HTML is parsed, and it finds references to CSS, JavaScript and images —
each of which is another request, repeating this whole sequence.

**The last point explains a great deal.** A page is not one request; it is often sixty. A slow page
is usually not a slow server but a hundred round trips, each with its own latency.

**Client and server is a role, not a machine.** Your backend is a server to the browser and a client
to the database. The same code is both, depending on which conversation you are looking at.

**Where the time actually goes:** DNS (once, then cached), connection setup, the server thinking,
and the bytes travelling. On a call between Mumbai and a server in Virginia, the travelling alone
costs about 200ms per round trip, whatever your code does — which is why fewer requests beats faster
code for a slow page.

**Open the network tab and watch it.** Every idea in this topic is visible there, on any site, in
ten seconds.`,
    mcqs: [
      mcq('The first step after pressing enter on an address is:',
        [['Turning the name into an IP address via DNS', true],
          ['Opening a TCP connection to the server', false],
          ['Sending the HTTP request', false],
          ['Checking the browser cache for the page', false]],
        'The network routes to addresses, not to names.'),
      mcq('A single web page typically involves:',
        [['Many requests — HTML, then CSS, scripts and images', true],
          ['One request that returns everything', false],
          ['One request per visible element', false],
          ['Two requests: one for HTML and one for assets', false]],
        'A slow page is more often many round trips than a slow server.'),
      mcq('"Client" and "server" describe:',
        [['A role in a conversation, not a machine', true],
          ['The two kinds of computer on a network', false],
          ['Whether code runs in a browser', false],
          ['Which side owns the database', false]],
        'Your backend is a server to the browser and a client to the database.'),
      mcq('Between Mumbai and a server in Virginia, each round trip costs roughly:',
        [['200 milliseconds, whatever the code does', true],
          ['20 milliseconds on a good connection', false],
          ['2 milliseconds, since fibre is fast', false],
          ['A time that depends only on server load', false]],
        'Which is why fewer requests beats faster code for a slow page.'),
    ],
    checkpoint: [
      mcq('HTTPS negotiation happens:',
        [['After the connection opens, before the request', true],
          ['Before the DNS lookup starts', false],
          ['Once per request sent', false],
          ['Only when the server requires a login', false]],
        'Certificates are checked and keys agreed, then everything is encrypted.'),
      mcq('The fastest way to see this whole sequence is to:',
        [['Open the browser network tab on any site', true],
          ['Read the server access logs', false],
          ['Run a traceroute against the domain name', false],
          ['Inspect the page source', false]],
        'Every idea in this topic is visible there in ten seconds.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_DNS_URLS',
    notes: `A URL is not one string. It is several decisions, each made by a different part of the
system.

    https://shop.example.com:443/products/42?colour=blue&size=m#reviews
    └─┬─┘   └───────┬───────┘ └┬┘└────┬────┘ └───────┬───────┘ └──┬──┘
    scheme        host       port   path          query       fragment

| Part | Decides |
|---|---|
| **scheme** | The protocol, and whether it is encrypted |
| **host** | Which machine, via DNS |
| **port** | Which program on that machine — 443 for HTTPS, 80 for HTTP, implied if omitted |
| **path** | Which resource on that server |
| **query** | Parameters the server reads |
| **fragment** | A position in the page — **never sent to the server** |

**The fragment surprises people.** Everything after \`#\` stays in the browser. A server cannot see
it, log it, or route on it, which is why single-page applications historically used it.

**Query strings are key-value pairs**, joined with \`&\`, and anything unusual must be
percent-encoded: a space becomes \`%20\`, an ampersand in a value becomes \`%26\`. Building a URL by
joining strings yourself is how a value containing \`&\` silently becomes two parameters.

**DNS is a hierarchy, resolved right to left.** For \`shop.example.com\`: the root servers know
where \`.com\` is, \`.com\` knows where \`example.com\` is, and \`example.com\` knows where \`shop\`
is. Each answer is cached for a stated time — the TTL.

**Which is why a DNS change takes time to appear.** The old answer is cached at resolvers around the
world until its TTL expires. Nothing is broken; it is doing what it was told.

**The record types worth knowing:** \`A\` (name to IPv4 address), \`AAAA\` (IPv6), \`CNAME\` (this
name is an alias for that one), \`MX\` (mail).

**When a site will not load**, DNS is the first thing to rule out:

    nslookup shop.example.com
    dig shop.example.com

If that returns nothing, no amount of checking your application will help.`,
    mcqs: [
      mcq('The fragment — everything after `#` — is:',
        [['Never sent to the server', true],
          ['Sent as a header', false],
          ['Sent as part of the path', false],
          ['Sent only on the first request', false]],
        'It stays in the browser, which is why servers cannot log or route on it.'),
      mcq('A DNS change does not take effect immediately because:',
        [['Resolvers cached the old answer for its TTL', true],
          ['Changes propagate through a central registry slowly', false],
          ['Browsers refuse new addresses for a day', false],
          ['The old server must be shut down first', false]],
        'Nothing is broken; the system is doing what it was told.'),
      mcq('Building a query string by joining values yourself risks:',
        [['A value containing & becoming two parameters', true],
          ['The URL exceeding the maximum length', false],
          ['The server rejecting the request as malformed', false],
          ['Parameters arriving in the wrong order', false]],
        'Unusual characters must be percent-encoded, which a URL library does for you.'),
      mcq('A `CNAME` record says that:',
        [['This name is an alias for another name', true],
          ['This name maps to an IPv4 address', false],
          ['This name maps to an IPv6 address', false],
          ['This name handles mail for the domain', false]],
        'A is the address record; AAAA is its IPv6 equivalent.'),
    ],
    checkpoint: [
      mcq('When a site will not load, the first thing to rule out is:',
        [['Whether the name resolves at all', true],
          ['Whether the application is running', false],
          ['Whether the certificate has expired', false],
          ['Whether the database is reachable', false]],
        'If nslookup returns nothing, checking your application will not help.'),
      mcq('Omitting the port from an HTTPS URL means the browser uses:',
        [['443', true], ['80', false], ['8080', false], ['Whatever the server advertises', false]],
        '80 is the default for plain HTTP.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_REQUEST_RESPONSE',
    notes: `HTTP is text. Seeing it written out removes most of the mystery, and you will read it
often in logs and in the network tab.

**A request:**

    GET /products/42 HTTP/1.1
    Host: shop.example.com
    Accept: application/json
    Authorization: Bearer eyJhbGci...
    User-Agent: Mozilla/5.0

    (blank line, then a body if there is one)

The first line is the **method**, the **path** and the version. Then **headers**, one per line. Then
a blank line, then the **body** — empty for a GET, and holding the data for a POST.

**A response:**

    HTTP/1.1 200 OK
    Content-Type: application/json
    Content-Length: 87
    Cache-Control: max-age=300

    {"id": 42, "name": "Keyboard", "price": 1200}

First the **status line**, then headers, then a blank line, then the body.

**HTTP is stateless.** Each request is independent; the server remembers nothing between them. Every
request must therefore carry whatever identifies it — a cookie, a token — which is why the
\`Authorization\` header appears on every single call rather than once at the start.

**The headers you will meet constantly:**

| Header | Says |
|---|---|
| \`Content-Type\` | What format the body is in |
| \`Accept\` | What formats the caller can handle |
| \`Authorization\` | Who is calling |
| \`Cache-Control\` | How long this may be reused |
| \`Location\` | Where a redirect points |

**\`Content-Type\` mismatches cause a specific, common bug**: sending JSON while claiming
\`application/x-www-form-urlencoded\` produces an empty body on the server and a confusing error
about a missing field.

**Seeing the raw exchange:**

    curl -v https://api.example.com/products/42
    curl -i -X POST -H "Content-Type: application/json" \\
         -d '{"name":"Keyboard"}' https://api.example.com/products

\`-v\` shows the whole conversation; \`-i\` includes the response headers. When an API call behaves
differently from your code, reproducing it with curl is the fastest way to find out which side is
wrong.`,
    mcqs: [
      mcq('HTTP being stateless means:',
        [['The server remembers nothing between requests', true],
          ['Requests cannot carry a body', false],
          ['Connections are closed after each response', false],
          ['Cookies are forbidden by the protocol', false]],
        'Which is why the Authorization header is sent on every call, not once.'),
      mcq('In a raw request, the body is separated from the headers by:',
        [['A blank line', true],
          ['A Content-Length header', false],
          ['A semicolon', false],
          ['The end of the first line', false]],
        'Status or request line, headers, blank line, body — in both directions.'),
      mcq('Sending JSON while declaring a form content type typically produces:',
        [['An empty body on the server and a confusing error', true],
          ['A 415 rejection from every server', false],
          ['A body that is silently converted', false],
          ['A parse error in the client', false]],
        'The server parses according to what you claimed, not what you sent.'),
      mcq('`curl -v` is useful when an API call misbehaves because:',
        [['It shows the whole conversation, so you can see which side is wrong', true],
          ['It retries the request automatically', false],
          ['It bypasses authentication for testing', false],
          ['It formats the JSON response', false]],
        'Reproducing the call outside your code is the fastest way to isolate it.'),
    ],
    checkpoint: [
      mcq('`Accept: application/json` in a request says:',
        [['What format the caller can handle in the response', true],
          ['What format the request body is in', false],
          ['That only JSON endpoints may be called here', false],
          ['That the response must be exactly JSON', false]],
        'Content-Type describes the body being sent; Accept describes what is wanted back.'),
      mcq('The first line of a response contains:',
        [['The protocol version and the status code', true],
          ['The content type and the content length', false],
          ['The method and the path', false],
          ['The server name and date', false]],
        'HTTP/1.1 200 OK, then headers, then the body.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_METHODS',
    notes: `The method says what kind of thing a request is. Choosing it correctly is not politeness;
several parts of the system behave differently depending on which you used.

| Method | Means | Safe | Idempotent |
|---|---|---|---|
| \`GET\` | Fetch something | Yes | Yes |
| \`POST\` | Create, or do something | No | No |
| \`PUT\` | Replace entirely | No | Yes |
| \`PATCH\` | Change part of it | No | Usually not |
| \`DELETE\` | Remove it | No | Yes |

**Safe** means it changes nothing. **Idempotent** means doing it five times leaves the same result
as doing it once.

**Why those two words matter in practice:**

- Browsers, proxies and caches may **repeat** a GET freely, and may **prefetch** one you never
  clicked. A GET that deletes something will eventually delete it by accident — this is not
  hypothetical, it is a well-documented category of outage.
- A client that times out can safely **retry** a PUT or a DELETE. It cannot safely retry a POST,
  which is why "I was charged twice" exists as a class of bug.

**PUT versus PATCH:**

    PUT /products/42      {"name": "Keyboard", "price": 1200, "stock": 5}   -- the whole thing
    PATCH /products/42    {"price": 1100}                                    -- just this field

Sending a partial body to PUT means the omitted fields are being set to nothing. That is the
semantics, and a server implementing PUT properly will do exactly that.

**DELETE is idempotent, not repeatable-with-the-same-answer.** Deleting an existing thing gives 204;
deleting it again gives 404. Both are correct — the *state* is the same afterwards, which is what
idempotent means.

**Where beginners get it wrong:** \`GET /deleteUser?id=5\`. The verb belongs in the method, not in
the path. \`DELETE /users/5\` says the same thing in a way the rest of the internet understands.

**POST is the general one.** When an action is not really creating a resource — sending an email,
running a report, starting a job — POST is the honest choice rather than forcing it into a shape it
does not fit.`,
    mcqs: [
      mcq('"Idempotent" means that:',
        [['Doing it repeatedly leaves the same result as doing it once', true],
          ['It changes nothing on the server', false],
          ['It always returns the same response body', false],
          ['It may be cached by proxies', false]],
        'Safe is the one that means it changes nothing.'),
      mcq('`GET /deleteUser?id=5` is dangerous because:',
        [['Anything may repeat or prefetch a GET', true],
          ['Query strings cannot carry an id', false],
          ['GET requests cannot be authenticated', false],
          ['The path is too long for some proxies', false]],
        'A well-documented category of outage, not a hypothetical one.'),
      mcq('A client that times out can safely retry:',
        [['A PUT or a DELETE', true],
          ['A POST', false],
          ['Any request, since HTTP is stateless', false],
          ['Only a GET', false]],
        'Retrying a POST is why "I was charged twice" exists as a class of bug.'),
      mcq('Sending `{"price": 1100}` to a PUT endpoint should:',
        [['Set every omitted field to nothing', true],
          ['Update only the price, like PATCH', false],
          ['Be rejected as a malformed request', false],
          ['Create a new resource with that price', false]],
        'PUT replaces; PATCH is the one that changes part.'),
    ],
    checkpoint: [
      mcq('Deleting an already-deleted resource returning 404 is:',
        [['Correct — the state afterwards is the same either way', true],
          ['A violation of idempotency', false],
          ['A sign the first delete failed', false],
          ['Better returned as a 204 in every case', false]],
        'Idempotent is about the resulting state, not the response body.'),
      mcq('Sending an email through an API is best expressed as:',
        [['POST, since it is an action rather than a resource', true],
          ['PUT, since the message itself replaces nothing', false],
          ['GET, since nothing is stored', false],
          ['PATCH, since it changes a mailbox', false]],
        'Forcing an action into a resource shape is worse than using POST honestly.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_STATUS_CODES',
    notes: `A status code is the machine-readable answer to "what happened". Programs act on it, so
getting it wrong misleads everything downstream.

**The five families**, which are worth knowing as families before any individual code:

| Range | Means | Whose problem |
|---|---|---|
| 1xx | Informational | Rare |
| 2xx | It worked | Nobody's |
| 3xx | Go elsewhere | Nobody's |
| 4xx | The caller was wrong | The caller's |
| 5xx | The server was wrong | The server's |

**The ones you will actually use:**

- **200 OK** — it worked, here is the result
- **201 Created** — a new thing exists, with a \`Location\` header pointing at it
- **204 No Content** — it worked, there is nothing to send back
- **301 / 302** — moved permanently / temporarily
- **400 Bad Request** — the request itself is malformed or invalid
- **401 Unauthorized** — you have not proved who you are
- **403 Forbidden** — you have, and you still may not
- **404 Not Found** — no such resource
- **409 Conflict** — it clashes with the current state, like a duplicate email
- **422 Unprocessable** — well-formed but semantically wrong
- **429 Too Many Requests** — slow down
- **500 Internal Server Error** — the server broke
- **503 Service Unavailable** — temporarily down or overloaded

**401 versus 403 is the pair everybody confuses.** 401 is "who are you?" — the token is missing or
expired, and logging in again may help. 403 is "I know who you are, and no" — logging in again will
not help at all.

**200 with an error inside the body is a lie**, and it is everywhere:

    HTTP/1.1 200 OK
    {"success": false, "error": "User not found"}

Every caller, cache, proxy, retry policy and monitoring dashboard now believes this call succeeded.
Return 404 and let the protocol carry the meaning.

**The distinction that matters most operationally: 4xx is the caller's fault, 5xx is yours.** A
dashboard of 5xx rates tells you whether your service is healthy. Returning 500 for a bad input
makes that dashboard useless, and wakes somebody up at night for a mistyped email address.`,
    mcqs: [
      mcq('401 differs from 403 in that 401 means:',
        [['You have not proved who you are', true],
          ['You are known and still not permitted', false],
          ['The resource does not exist', false],
          ['The request body was invalid', false]],
        'Logging in again may fix a 401; it will never fix a 403.'),
      mcq('Returning `200 OK` with an error in the body is wrong because:',
        [['Every caller, cache and monitor believes it succeeded', true],
          ['The body cannot contain an error field', false],
          ['It breaks JSON parsing in most clients', false],
          ['200 must always have an empty body', false]],
        'Let the protocol carry the meaning the body is trying to smuggle.'),
      mcq('Returning 500 for a bad input makes:',
        [['The error dashboard useless for spotting real failures', true],
          ['The client retry the request forever', false],
          ['The response uncacheable', false],
          ['The request appear as a timeout', false]],
        'And wakes somebody at night for a mistyped email address.'),
      mcq('A successful creation should return:',
        [['201, with a Location header pointing at the new thing', true],
          ['200, with the new id in the body', false],
          ['204, since nothing needs returning', false],
          ['202, since creation is asynchronous', false]],
        'It tells the caller both that it worked and where the result lives.'),
    ],
    checkpoint: [
      mcq('429 tells the caller to:',
        [['Slow down, as they are sending too many requests', true],
          ['Authenticate before continuing', false],
          ['Retry immediately with a new connection', false],
          ['Use a different endpoint instead', false]],
        'Usually accompanied by a header saying how long to wait.'),
      mcq('The operational value of separating 4xx from 5xx is that:',
        [['A 5xx rate shows whether your service is healthy', true],
          ['4xx responses are cached and 5xx are not', false],
          ['Clients retry 4xx automatically', false],
          ['5xx responses are logged by default', false]],
        'Mixing them destroys the one signal that matters at three in the morning.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_HEADERS_HTTPS',
    notes: `Headers carry everything about a request that is not the body, and HTTPS decides who else
can read any of it.

**Cookies**, which are how a stateless protocol remembers you:

    Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=3600

The server sets it; the browser sends it back on every subsequent request to that site. The three
flags are the whole security of it:

- **\`HttpOnly\`** — JavaScript cannot read it, so a script injected into your page cannot steal the
  session
- **\`Secure\`** — sent only over HTTPS, so it cannot leak over plain HTTP
- **\`SameSite\`** — not sent on requests originating from other sites, which blocks most cross-site
  request forgery

A session cookie without those three flags is the most commonly exploited mistake in web
applications.

**\`Cache-Control\`** decides whether a response can be reused:

    Cache-Control: max-age=31536000, immutable     -- a versioned asset, cache forever
    Cache-Control: no-store                        -- anything personal or sensitive

Caching a personalised page publicly means one user seeing another's data — a real and recurring
class of incident.

**CORS**, which every developer meets as an error before they meet it as a concept. A browser
refuses to let a page at one origin read a response from another unless the server allows it:

    Access-Control-Allow-Origin: https://shop.example.com

The important part: **CORS is enforced by the browser, not the server**, and it protects the
*user*, not the API. It is not a security layer on your backend, and disabling it with \`*\` to make
an error go away is giving every website permission to read authenticated responses.

**What HTTPS actually protects:** the URL path, the headers, the cookies and the body are all
encrypted. What it does **not** hide is which host you connected to and roughly how much data moved.

**What it does not do at all:** it says nothing about whether the site is trustworthy. A padlock on a
phishing site means the connection to the criminal is encrypted. "Look for the padlock" was always
bad advice, and remains common.`,
    mcqs: [
      mcq('The `HttpOnly` flag on a cookie prevents:',
        [['JavaScript on the page from reading it', true],
          ['The cookie being sent over plain HTTP', false],
          ['The cookie being sent from other sites', false],
          ['The cookie persisting after the browser closes', false]],
        'Secure covers HTTP; SameSite covers cross-site requests.'),
      mcq('CORS is enforced by:',
        [['The browser, and it protects the user rather than the API', true],
          ['The server, as an access control layer', false],
          ['The network, at the proxy level', false],
          ['Both browser and server equally', false]],
        'Which is why setting it to * to silence an error is genuinely dangerous.'),
      mcq('A padlock icon on a site means:',
        [['The connection is encrypted, nothing about trustworthiness', true],
          ['The site has been verified as legitimate', false],
          ['The site does not collect personal data', false],
          ['The certificate was issued to a real company', false]],
        'A phishing site with HTTPS has an encrypted connection to the criminal.'),
      mcq('`Cache-Control: no-store` is required for:',
        [['Personalised or sensitive responses', true],
          ['Large static assets', false],
          ['Any response over HTTPS', false],
          ['Responses that change hourly', false]],
        'Caching a personalised page publicly means one user seeing another\'s data.'),
    ],
    checkpoint: [
      mcq('HTTPS does not hide:',
        [['Which host you connected to', true],
          ['The path being requested', false],
          ['The cookies being sent', false],
          ['The request body', false]],
        'The hostname and rough data volume remain visible; everything else is encrypted.'),
      mcq('`SameSite=Lax` on a session cookie blocks most:',
        [['Cross-site request forgery', true],
          ['Cross-site scripting', false],
          ['SQL injection attempts', false],
          ['Session fixation attacks', false]],
        'It stops the cookie riding along on requests started by another site.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_DEBUGGING',
    notes: `Web problems are usually visible. The trick is knowing where to look and what the symptom
narrows it to.

**The network tab tells you almost everything:** the status, the timing, the request headers you
actually sent, and the response body you actually received. Before theorising, look.

**The symptoms and what each means:**

**CORS error.** The request reached the server and came back; the *browser* refused to hand the
response to your code. Fix it on the server with the right \`Access-Control-Allow-Origin\`, not by
disabling it in the browser.

**401 when you are logged in.** The token is not being sent, or it expired. Look at the request
headers in the network tab — most often the header is missing entirely because of a typo in the
client, not wrong on the server.

**404 on an endpoint you know exists.** A trailing slash, a wrong base URL, a missing prefix, or the
wrong method — most frameworks return 404 for a path that exists under a different method.

**The request never appears in the network tab at all.** It was never sent: a JavaScript error
before the call, or a form submitting normally instead. The problem is in your code, not the network.

**It works in curl but not in the browser.** The browser is sending something extra — cookies, an
origin header — or not sending something curl was given. Compare the two raw requests.

**A 500 with no detail.** The detail is in the server logs, which is exactly what they are for. A
500 that appears nowhere in the logs usually means it came from a proxy before reaching you.

**Mixed content.** An HTTPS page requesting an HTTP resource, silently blocked by the browser.

**The tools:**

    curl -v https://api.example.com/thing      # the raw conversation
    curl -i -X POST ...                        # with response headers

**The method:** confirm the request was sent, confirm what was in it, confirm what came back, then
read the server logs for that request. Four checks, in order, and most web bugs are identified before
the fourth.`,
    mcqs: [
      mcq('A CORS error means the request:',
        [['Reached the server and the browser refused the response', true],
          ['Was blocked before it was sent', false],
          ['Was rejected by the server as unauthorised', false],
          ['Timed out before completing', false]],
        'Which is why the fix belongs on the server, not in the browser.'),
      mcq('If the request never appears in the network tab at all:',
        [['It was never sent, so the bug is in your code', true],
          ['The server rejected it before responding', false],
          ['The browser cached the previous response', false],
          ['A proxy intercepted it silently', false]],
        'A JavaScript error before the call, or a form submitting normally.'),
      mcq('A 404 on an endpoint you know exists is often:',
        [['The wrong method for that path', true],
          ['An expired authentication token', false],
          ['A CORS misconfiguration', false],
          ['A database connection failure', false]],
        'Also a trailing slash, a wrong base URL, or a missing prefix.'),
      mcq('"It works in curl but not in the browser" suggests:',
        [['The browser sends something extra, like cookies or an origin', true],
          ['The server is rejecting browser traffic deliberately', false],
          ['The curl request used a different endpoint', false],
          ['The browser cache is stale', false]],
        'Compare the two raw requests and find the difference.'),
    ],
    checkpoint: [
      mcq('The four checks, in order, are:',
        [['Was it sent, what was in it, what came back, what the logs say', true],
          ['Check the logs, the code, the network, then the database', false],
          ['Reproduce, isolate, fix, verify', false],
          ['Status, headers, body, timing', false]],
        'Most web bugs are identified before the fourth.'),
      mcq('A 500 that appears nowhere in your server logs usually came from:',
        [['A proxy in front of your application', true],
          ['A client-side error misreported', false],
          ['A database timeout', false],
          ['A cached earlier failure', false]],
        'Your code never ran, which is why it logged nothing.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_PRACTICE',
    notes: `No new ideas. Enough time inside real HTTP traffic that reading it stops being an effort.

**Do these against real sites and real APIs:**

1. **Watch a page load.** Open the network tab on a large site. Count the requests. Find the
   slowest, and say why it is slow: DNS, connection, waiting, or downloading.
2. **Read a real response.** Pick one request and write out its method, path, three interesting
   request headers, the status, and three response headers with what each does.
3. **Reproduce it in curl.** Take a request from the network tab and rebuild it with curl until you
   get the same response.
4. **Break it deliberately.** Remove the auth header — what status? Change the method — what status?
   Request a path that does not exist. Send malformed JSON. Record each.
5. **Follow a redirect chain.** Find a URL that redirects and trace every hop with
   \`curl -v -L\`, noting each status and \`Location\`.
6. **Inspect the cookies** on a site you are logged into. Which have HttpOnly, Secure, SameSite?
7. **Cause a CORS error** on purpose from a local page, read the exact message, and then fix it.
8. **Compare cached and uncached.** Load a page, reload it, and find which requests did not happen
   the second time and which header caused that.

**Record for each:** what you expected, what happened, and what the difference taught you.

**The habit this builds:** looking before theorising. The commonest waste of time in web debugging is
twenty minutes of speculation about something the network tab would have shown in five seconds.`,
    mcqs: [
      mcq('A request that is slow "waiting" rather than "downloading" indicates:',
        [['The server took time to produce the response', true],
          ['The response body is very large', false],
          ['DNS resolution was slow', false],
          ['The connection could not be reused', false]],
        'The timing breakdown separates these, which is why it is worth reading.'),
      mcq('Rebuilding a browser request in curl until it matches is valuable because:',
        [['It shows exactly which parts of the request matter', true],
          ['curl is faster than the browser', false],
          ['It bypasses CORS restrictions', false],
          ['It proves the server is reachable', false]],
        'The header you had to add is the one the endpoint actually depends on.'),
      mcq('Removing the auth header from a working request should produce:',
        [['401', true], ['403', false], ['404', false], ['400', false]],
        'You have not proved who you are; 403 would mean you had and were still refused.'),
      mcq('Requests missing on a second page load are explained by:',
        [['A caching header on the first response', true],
          ['The browser deduplicating identical requests', false],
          ['The server rejecting repeated calls', false],
          ['A service worker intercepting them', false]],
        'Find the header that caused it; that is the exercise.'),
      mcq('The habit this practice set builds is:',
        [['Looking before theorising', true],
          ['Memorising status codes', false],
          ['Writing requests without a browser', false],
          ['Reading server logs first', false]],
        'Twenty minutes of speculation about something visible in five seconds is the common waste.'),
    ],
    checkpoint: [
      mcq('`curl -v -L` is used to:',
        [['Follow and display every hop of a redirect chain', true],
          ['Retry the request until it finally succeeds', false],
          ['Log the response to a file', false],
          ['Send the request without headers', false]],
        '-L follows redirects; -v shows the conversation at each hop.'),
      mcq('Checking which cookies have HttpOnly and Secure tells you:',
        [['How exposed the session would be to a page script', true],
          ['How long the session will last', false],
          ['Whether the site uses HTTPS on every page', false],
          ['Whether the cookie is sent cross-site', false]],
        'SameSite is the one covering cross-site sending.'),
    ],
  },

  {
    unitCode: 'T2_WEB_HTTP_MINI_PROJECT',
    notes: `A written investigation of a real site's HTTP behaviour, evidenced from the network tab
and reproduced with curl.

**Why an investigation rather than something built.** This topic is about reading a protocol
accurately. A build would let you avoid the parts you find confusing; an investigation of somebody
else's site does not, because it contains whatever it contains.

**What is being assessed:** that you can read a real exchange precisely, reproduce it outside the
browser, explain the caching and security decisions the site made, and tell the difference between
what you observed and what you inferred.

**Build it in this order:**

1. **Choose a site** with a login and some real traffic — one of your own, or a public service you
   have an account on.
2. **Capture a full page load** and catalogue the requests.
3. **Pick five requests** to examine in detail, including at least one non-GET.
4. **Reproduce each in curl**, and note what was needed to make it work.
5. **Examine the security headers and cookies**, and say what each protects.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — An HTTP Investigation',
      description: 'Investigate a real site\'s HTTP behaviour: catalogue a page load, reproduce requests in curl, and explain its caching and security decisions from evidence.',
      instructions: `**The brief**

Choose a real website you have an account on — your own project, a college system, or a public
service. Investigate how it actually talks over HTTP and write up what you find.

**Requirements**

1. **A page-load catalogue**: total requests, total bytes, load time, and a breakdown by type
   (document, script, style, image, API). Which single request cost the most time, and why.
2. **Five requests examined in detail**, including at least one that is not a GET:
   - Method, full URL with each part labelled
   - Three notable request headers and what each does
   - Status code, and whether it is the honest one for what happened
   - Three response headers and what each decides
3. **Each of the five reproduced in curl**, with the exact command and what had to be added to make
   it work.
4. **A caching analysis**: which responses are cacheable, for how long, and one you believe is
   cached wrongly — too long, too short, or cached when it should not be.
5. **A security review**: every cookie with its flags, and what an attacker would gain from each
   missing flag; whether HTTPS is enforced; which security headers are present or absent.
6. **A failure catalogue**: deliberately break four requests (no auth, wrong method, bad path,
   malformed body) and record the status and body of each, with whether the response was honest.

**What to submit**

1. The **investigation document**, with the six sections above.
2. **Evidence**: network tab screenshots, and the raw curl commands with their output.
3. A **findings list**: three things the site does well and three you would change, each with a
   reason.
4. A **short write-up** (300–400 words): what surprised you; one thing you predicted wrongly and
   what corrected you; which of your own projects has a header or cookie flag you now want to fix.

**Constraints**

- **Observation only.** No attempt to bypass authentication, access other users' data, or send
  unusual load. Deliberate failures use your own account and normal request rates.
- Redact tokens, cookies and personal data from every screenshot and transcript.
- Conclusions must be evidenced; mark anything inferred as inferred.

**Where the marks are.** The precision. "The session cookie lacks HttpOnly, so any injected script
on the page could read it and impersonate the user" is worth more than a page of general commentary
about security being important.`,
      rubric: [
        {
          criterion: 'Accuracy of observation',
          description: 'Catalogue and the five requests read correctly, with each URL part, header and status described precisely rather than approximately.',
          maxPoints: 30,
        },
        {
          criterion: 'Reproduction',
          description: 'Each request rebuilt in curl with matching results, and a clear account of what was needed to make each work.',
          maxPoints: 20,
        },
        {
          criterion: 'Caching and security analysis',
          description: 'Cacheability judged with reasons, cookie flags assessed for real consequence, security headers present or absent noted.',
          maxPoints: 25,
        },
        {
          criterion: 'Failure catalogue',
          description: 'Four deliberate failures recorded with status and body, and an honest judgement of whether each response told the truth.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up and ethics',
          description: 'Observation stays within bounds, data redacted, inference separated from evidence, and a specific fix identified in your own work.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_APIS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_APIS_JSON_CONTRACTS',
    notes: `A response shape is a promise. Once somebody depends on it, changing it breaks their code
in production, and they find out before you do.

    {
      "id": 42,
      "name": "Keyboard",
      "price": 1200,
      "in_stock": true,
      "tags": ["peripheral", "usb"],
      "supplier": { "id": 7, "name": "Acme" },
      "discontinued_on": null
    }

**Decisions that look cosmetic and are not:**

**Consistent naming.** Pick \`snake_case\` or \`camelCase\` and never mix them. An API with
\`created_at\` beside \`updatedAt\` costs every consumer a bug.

**Consistent types.** \`price\` must be a number in every response, never \`1200\` sometimes and
\`"1200"\` others. A field that changes type breaks strongly typed clients immediately and weakly
typed ones subtly.

**Null versus missing versus empty.** Three different things, and each should mean one thing
consistently: \`null\` for "known to be absent", \`[]\` for "none yet", and omission for "this
endpoint does not provide it". Returning \`null\` where a client expects an array is a
crash in most languages.

**Money is not a float.** \`0.1 + 0.2\` is not \`0.3\`, and a rounding error in a total is a very
visible bug. Use integer paise, or a decimal string with the currency stated.

**Dates in ISO 8601, with a timezone:** \`"2026-03-15T14:30:00Z"\`. \`"15/03/2026"\` is ambiguous
across countries and unparseable without knowing which convention was used.

**Envelope or not** — either is fine, consistency is not optional:

    {"data": {...}, "meta": {...}}     or     {...}

**Breaking versus non-breaking.** Adding a field is safe; a well-written client ignores what it does
not know. Removing a field, renaming one, changing its type, or making an optional field required
all break callers. When you must break something, version it — \`/v2/products\` — and keep the old
one running while consumers move.

**Document the shape**, with an example of every field including the empty and null cases. The
example is what people actually read.`,
    mcqs: [
      mcq('Mixing `created_at` and `updatedAt` in one API:',
        [['Costs every consumer a bug', true],
          ['Is acceptable if documented', false],
          ['Only matters for typed languages', false],
          ['Is required when wrapping two systems', false]],
        'Pick one convention and never mix them.'),
      mcq('Returning `price` as a number sometimes and a string other times:',
        [['Breaks typed clients immediately and others subtly', true],
          ['Is handled automatically by JSON parsers', false],
          ['Only affects clients that do arithmetic', false],
          ['Is a documentation problem rather than a bug', false]],
        'A field must have one type in every response.'),
      mcq('Money should be represented as:',
        [['Integer paise, or a decimal string with the currency', true],
          ['A floating point number rounded to two places', false],
          ['A float, with rounding done by the client', false],
          ['Whatever the database column type is', false]],
        '0.1 + 0.2 is not 0.3, and a wrong total is a very visible bug.'),
      mcq('Which change is safe for existing callers?',
        [['Adding a new field to the response', true],
          ['Renaming an existing field', false],
          ['Changing a field from string to number', false],
          ['Making an optional request field required', false]],
        'A well-written client ignores fields it does not know.'),
    ],
    checkpoint: [
      mcq('`null`, `[]` and an absent key should:',
        [['Each mean one specific thing, consistently', true],
          ['Be treated as equivalent by the client', false],
          ['Never appear in a well-designed response', false],
          ['Be normalised to null by the server', false]],
        'Known to be absent, none yet, and not provided here are three different facts.'),
      mcq('Dates are sent in ISO 8601 with a timezone because:',
        [['Other formats are ambiguous across countries', true],
          ['ISO strings sort alphabetically', false],
          ['JSON cannot represent a date type', false],
          ['It is shorter than the alternatives', false]],
        '15/03/2026 cannot be parsed without knowing the convention used.'),
    ],
  },

  {
    unitCode: 'T2_APIS_REST',
    notes: `REST is not a specification you comply with. It is a set of habits that make an API
guessable, and guessable is the whole value: a developer who has used two of your endpoints should
be able to predict the third.

**Resources are nouns, plural, and the method is the verb:**

    GET    /products           list them
    POST   /products           create one
    GET    /products/42        fetch one
    PUT    /products/42        replace it
    PATCH  /products/42        change part of it
    DELETE /products/42        remove it

**Not** \`/getProducts\`, \`/createProduct\`, \`/product/delete/42\`. Those are function names wearing
a URL, and each one has to be learned separately.

**Nesting shows ownership**, one level deep:

    GET  /products/42/reviews          reviews of this product
    POST /products/42/reviews          add one

Three levels of nesting is a sign the design has gone wrong. \`/customers/1/orders/2/items/3\`
should be \`/order-items/3\` — the item has its own identity, so it can have its own path.

**List endpoints need four things**, and adding them later is painful:

    GET /products?page=2&per_page=20          paging
    GET /products?category=input&in_stock=true filtering
    GET /products?sort=-price                  sorting
    GET /products?fields=id,name,price         shaping

**Return what the caller needs**, so a list of orders includes the customer name rather than only an
id — otherwise every client makes N+1 calls to render a table. Judgement, not dogma: too much makes
responses enormous.

**Be consistent about errors** across every endpoint:

    {"error": {"code": "not_found", "message": "No product with id 42"}}

**Actions that are not resources** happen; force them politely:

    POST /orders/42/refund
    POST /reports/monthly-sales

That is a recognised pragmatic exception, and better than contorting the design.

**The test of a good API:** show a developer three endpoints and ask them to guess a fourth. If they
can, the design is doing its job.`,
    mcqs: [
      mcq('`/getProducts` is worse than `GET /products` because:',
        [['Each function-style path must be learned separately', true],
          ['It is longer to type', false],
          ['It cannot be cached by proxies', false],
          ['REST forbids verbs in any form', false]],
        'The value of REST is that a fourth endpoint can be guessed from three.'),
      mcq('`/customers/1/orders/2/items/3` should be:',
        [['/order-items/3, since the item has its own identity', true],
          ['/items/3?order=2&customer=1', false],
          ['Left as it is, since it shows the hierarchy', false],
          ['/customers/1/items/3, removing one level', false]],
        'One level of nesting shows ownership; three is a sign of a design problem.'),
      mcq('A list endpoint should support paging, filtering, sorting and shaping because:',
        [['Adding them after callers exist is painful', true],
          ['REST requires all four to be present', false],
          ['They are needed to cache responses', false],
          ['Clients cannot filter results themselves', false]],
        'Every one of them becomes a breaking change later.'),
      mcq('Including the customer name in a list of orders avoids:',
        [['The client making one extra call per row', true],
          ['A database join on the server', false],
          ['Paging the results', false],
          ['A second authentication step', false]],
        'Judgement, not dogma: too much makes responses enormous.'),
    ],
    checkpoint: [
      mcq('`POST /orders/42/refund` is acceptable because:',
        [['Some actions are not resources, and forcing them is worse', true],
          ['POST may be used for any path', false],
          ['Refunds create a new resource', false],
          ['REST has no opinion about actions at all', false]],
        'A recognised pragmatic exception, used sparingly.'),
      mcq('The practical test of a REST design is whether:',
        [['A developer shown three endpoints can guess a fourth', true],
          ['Every endpoint returns the same response envelope', false],
          ['All six HTTP methods are used', false],
          ['Resources are nested at least once', false]],
        'Guessable is the whole value.'),
    ],
  },

  {
    unitCode: 'T2_APIS_CONSUMING',
    notes: `Most of the API work in a junior role is calling somebody else's, and doing it in a way
that survives their bad days.

**Read the documentation first**, specifically for: the base URL, how authentication works, the rate
limit, the error format, and whether there is a sandbox. Ten minutes there saves an afternoon.

**The call, done properly:**

    import requests

    resp = requests.get(
        "https://api.example.com/v1/products",
        params={"category": "input", "page": 1},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,                        # never omit this
    )
    resp.raise_for_status()                # turn a 4xx/5xx into an exception
    data = resp.json()

**\`timeout\` is not optional.** Without it, a hanging server hangs your process — potentially
forever. Every HTTP call in production code has a timeout.

**Check the status before parsing.** A 500 returning an HTML error page will crash \`.json()\` with a
confusing message that sends you looking in entirely the wrong place.

**Never trust the shape.** A key you expect may be missing:

    name = item.get("name", "Unknown")           # not item["name"]

**Handle the failures that will happen:**

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
    except requests.Timeout:
        # they are slow — retry, or degrade
    except requests.HTTPError as e:
        # they answered with an error — the status says whose fault
    except requests.RequestException:
        # network, DNS, connection refused

**Paging.** Almost every list endpoint pages, and a loop that stops when a page comes back empty is
the usual shape. Always cap the iterations: a bug in their paging should not become an infinite loop
in yours.

**Cache what does not change.** A list of countries does not need fetching on every request, and
caching it for a day removes a dependency on somebody else's uptime.

**Keep their data at the edge.** Convert their response into your own objects at the boundary,
rather than passing their raw dictionaries through your codebase. When they change their shape —
and they will — you have one place to fix.`,
    mcqs: [
      mcq('Omitting `timeout` on an HTTP call risks:',
        [['Your process hanging while their server hangs', true],
          ['The request being retried automatically', false],
          ['The connection being refused', false],
          ['The response arriving unparsed', false]],
        'Every HTTP call in production code has a timeout.'),
      mcq('Calling `.json()` before checking the status can produce:',
        [['A confusing parse error from an HTML error page', true],
          ['A silent None result', false],
          ['A retry of the original request', false],
          ['An empty dictionary', false]],
        'And it sends you looking in entirely the wrong place.'),
      mcq('`item.get("name", "Unknown")` rather than `item["name"]` guards against:',
        [['A key that is missing from their response', true],
          ['A value of the wrong type', false],
          ['A response that failed to parse', false],
          ['An expired authentication token', false]],
        'Never trust the shape of somebody else\'s response.'),
      mcq('Converting a third-party response into your own objects at the boundary means:',
        [['One place to fix when they change their shape', true],
          ['Faster parsing of the response', false],
          ['Fewer API calls overall', false],
          ['Their errors become your exceptions', false]],
        'Their raw dictionaries spreading through your codebase is the problem it prevents.'),
    ],
    checkpoint: [
      mcq('A paging loop should always:',
        [['Cap the number of iterations', true],
          ['Fetch every page before processing', false],
          ['Use the total count from the first page', false],
          ['Run the pages in parallel', false]],
        'A bug in their paging should not become an infinite loop in yours.'),
      mcq('Caching a list of countries for a day:',
        [['Removes a dependency on somebody else\'s uptime', true],
          ['Violates their terms of service', false],
          ['Risks serving stale but critical data', false],
          ['Requires a database table', false]],
        'Cache what does not change; that is most reference data.'),
    ],
  },

  {
    unitCode: 'T2_APIS_AUTH',
    notes: `Authentication is proving who you are. Authorisation is what you are then allowed to do.
Confusing the two produces both security holes and wrong status codes.

**API keys** — a long secret string, sent as a header:

    Authorization: Bearer sk_live_a1b2c3...

Simple, and suitable for server-to-server calls. It identifies an *application*, rarely a user, and
it does not expire on its own, so a leaked key stays valid until somebody revokes it.

**Session cookies** — the browser pattern. The server stores the session, the browser holds an
opaque id, and the cookie rides along automatically. Easy to revoke, because the server owns the
session; requires the cookie flags from the HTTP topic.

**Tokens (JWT)** — the stateless pattern. The token itself contains the claims, signed by the server:

    header.payload.signature

Any server with the key can verify it without a database lookup, which is why it scales across
services. The cost is real: **a token cannot be revoked before it expires**, because nothing is
stored to revoke. Short expiry plus a refresh token is the usual answer.

**The JWT mistake that matters:** the payload is base64, not encrypted. Anybody holding the token
can read every claim in it. Never put anything secret in a JWT payload.

**OAuth** — "log in with Google". Your application never sees the password; it receives a token from
the provider after the user consents. This is what you use rather than storing passwords yourself,
and at second year you should understand the flow rather than implement it from scratch.

**Where secrets live:** in environment variables or a secret manager. Never in the code, never in
the repository, never in a client-side bundle. A key in frontend JavaScript is public, whatever the
build tool calls it.

**Always over HTTPS.** A token sent over plain HTTP is readable by anybody on the network path, and
a stolen token is as good as the password.

**And the status codes follow the distinction:** 401 for authentication failures, 403 for
authorisation ones.`,
    mcqs: [
      mcq('The cost of a stateless JWT is that:',
        [['It cannot be revoked before it expires', true],
          ['It must be sent over a cookie', false],
          ['It requires a database lookup per request', false],
          ['It cannot carry user claims', false]],
        'Short expiry plus a refresh token is the usual answer.'),
      mcq('The payload of a JWT is:',
        [['Base64, readable by anyone holding the token', true],
          ['Encrypted with the server key', false],
          ['Hashed and therefore unreadable', false],
          ['Visible only to the issuing server', false]],
        'Never put anything secret in it.'),
      mcq('An API key in a frontend JavaScript bundle is:',
        [['Public, whatever the build tool calls it', true],
          ['Protected by the bundler obfuscation', false],
          ['Safe if the site uses HTTPS', false],
          ['Safe if the key is scoped to one domain', false]],
        'Anything shipped to a browser can be read by whoever holds it.'),
      mcq('Session cookies are easier to revoke than JWTs because:',
        [['The server owns the session and can delete it', true],
          ['Cookies expire faster by default', false],
          ['Browsers honour revocation requests', false],
          ['Sessions are re-issued on every request', false]],
        'Nothing is stored for a stateless token, so there is nothing to delete.'),
    ],
    checkpoint: [
      mcq('Authentication and authorisation differ in that authorisation decides:',
        [['What you are allowed to do once identified', true],
          ['Whether your credentials are valid', false],
          ['Which token format is accepted', false],
          ['How long a session lasts', false]],
        '401 covers the first; 403 covers the second.'),
      mcq('OAuth is used rather than storing passwords yourself because:',
        [['Your application never handles the password at all', true],
          ['It is faster than writing a login form', false],
          ['It removes the need for tokens', false],
          ['It works without HTTPS', false]],
        'The provider authenticates; you receive a token after consent.'),
    ],
  },

  {
    unitCode: 'T2_APIS_ERRORS_AND_LIMITS',
    notes: `Every API you call will fail sometimes. The difference between a fragile integration and
a solid one is entirely in how it behaves on those days.

**Not every failure deserves a retry:**

| Status | Retry? |
|---|---|
| 400, 422 | **No** — the request is wrong, and it will be wrong again |
| 401 | No — refresh the token, then try once |
| 403, 404 | No |
| 429 | **Yes** — after the wait they tell you |
| 500, 502, 503, 504 | Yes — probably temporary |
| Timeout, connection error | Yes, carefully |

**Retrying a 400 in a loop is the classic mistake.** It cannot succeed, and you have turned a clear
failure into a slow one plus a wasted rate limit.

**Exponential backoff with jitter:**

    for attempt in range(5):
        resp = call()
        if resp.ok:
            return resp
        if resp.status_code < 500 and resp.status_code != 429:
            raise ApiError(resp)               # not retryable
        wait = (2 ** attempt) + random.uniform(0, 1)
        time.sleep(wait)

Waiting 1, 2, 4, 8, 16 seconds gives a struggling service room to recover. **The jitter matters**:
without it, every client that failed together retries together, and the service is hit by a
synchronised wave each time — a real cause of outages that will not end.

**Rate limits** are usually announced in headers:

    X-RateLimit-Limit: 1000
    X-RateLimit-Remaining: 12
    Retry-After: 30

Read \`Retry-After\` and honour it. Ignoring it gets your key suspended, and rightly.

**Retry only what is idempotent.** Retrying a GET is free. Retrying a POST that creates a payment
may charge twice — send an idempotency key if the API supports one, and if it does not, do not
retry it blindly.

**Fail usefully.** When the retries are exhausted, log the endpoint, the status, the body and the
correlation id, then either degrade gracefully — cached data, a queued job, a partial page — or
report honestly. "Something went wrong" tells the user nothing and you less.

**Do not let their outage become yours.** A circuit breaker — stop calling for a minute after
repeated failures — keeps a dead dependency from consuming all your workers.`,
    mcqs: [
      mcq('Which response should not be retried?',
        [['400 Bad Request', true],
          ['503 Service Unavailable', false],
          ['429 Too Many Requests', false],
          ['A connection timeout', false]],
        'The request is wrong, and it will be wrong again on every attempt.'),
      mcq('Jitter is added to exponential backoff because:',
        [['Otherwise every failed client retries in a synchronised wave', true],
          ['It makes the average wait shorter', false],
          ['Servers reject perfectly regular intervals', false],
          ['It spreads load across endpoints', false]],
        'A real cause of outages that will not end.'),
      mcq('Retrying a POST that creates a payment risks:',
        [['Charging the customer twice', true],
          ['Exceeding the rate limit', false],
          ['Corrupting the request body', false],
          ['Invalidating the auth token', false]],
        'Send an idempotency key if offered; otherwise do not retry blindly.'),
      mcq('A circuit breaker protects you by:',
        [['Stopping calls for a while after repeated failures', true],
          ['Retrying faster when a service recovers', false],
          ['Routing traffic to a backup provider', false],
          ['Caching the last successful response', false]],
        'It keeps a dead dependency from consuming all your workers.'),
    ],
    checkpoint: [
      mcq('`Retry-After: 30` should be:',
        [['Honoured, or your key gets suspended', true],
          ['Halved, to recover capacity sooner', false],
          ['Ignored for idempotent requests', false],
          ['Used only after three failed attempts', false]],
        'They are telling you exactly what they need.'),
      mcq('When retries are exhausted, the right behaviour is to:',
        [['Log the detail, then degrade or report honestly', true],
          ['Show a generic error and move on', false],
          ['Retry indefinitely in a background job', false],
          ['Return an empty successful response', false]],
        '"Something went wrong" tells the user nothing and you less.'),
    ],
  },

  {
    unitCode: 'T2_APIS_DEBUGGING',
    notes: `An API problem is always on one of three sides: your request, their service, or your
handling of the response. Find out which before changing anything.

**First: reproduce it outside your code.**

    curl -i -H "Authorization: Bearer $TOKEN" https://api.example.com/v1/products/42

If curl works and your code does not, the bug is in your request building. If curl fails the same
way, it is their side or your credentials, and you have halved the problem in one command.

**The symptoms:**

**401 with a token you believe is valid.** It expired, it is for the wrong environment (sandbox key
against production), or the header is malformed — \`Bearer\` missing, or an extra space. Print the
exact header you are sending, with the middle of the token masked.

**400 with a vague message.** Read their error body in full; it usually names the field. Compare
your request byte for byte against their documented example. Most often: a wrong content type, a
field name in the wrong case, or a number sent as a string.

**Works for one item, fails for another.** The data, not the call. Something in that record is
unusual — a null, a special character, a value out of range.

**Works sometimes.** Rate limiting, an expiring token, a load-balanced service where one instance is
broken, or a race in your own code. Log the status and any correlation id for every call and look at
the pattern rather than the single failure.

**Their docs and their behaviour disagree.** Believe the behaviour, write down the difference, and
tell them. Documentation drifts.

**Log every call at the boundary**: method, URL, status, duration and correlation id — never the
token, and never personal data. When something fails at two in the morning, that log is the entire
evidence base.

**Keep their raw response** when something unexpected happens. "It returned something strange" is
not a bug report; the actual body is.

**Before blaming them, check their status page.** It takes ten seconds and is occasionally the whole
answer.`,
    mcqs: [
      mcq('Reproducing a failing call with curl tells you:',
        [['Whether the bug is in your request building or their service', true],
          ['Whether the endpoint is rate limited', false],
          ['Whether your token has expired', false],
          ['Whether the response can be parsed', false]],
        'One command halves the problem.'),
      mcq('An API call that works for one record and fails for another points at:',
        [['Something unusual in that record\'s data', true],
          ['An intermittent network fault', false],
          ['A rate limit being reached', false],
          ['An expired authentication token', false]],
        'A null, a special character, or a value out of range.'),
      mcq('When an API\'s documentation and its behaviour disagree:',
        [['Believe the behaviour, record the difference, and tell them', true],
          ['Follow the documentation and open a support ticket', false],
          ['Assume your request is malformed', false],
          ['Wait for the documentation to be corrected', false]],
        'Documentation drifts; the running service is the truth.'),
      mcq('Boundary logging should include:',
        [['Method, URL, status, duration and correlation id', true],
          ['The full request and response bodies', false],
          ['The authorization header for reproducibility', false],
          ['Only the failures, to save space', false]],
        'Never the token, and never personal data.'),
    ],
    checkpoint: [
      mcq('A 401 with a token you believe is valid is often:',
        [['A sandbox key used against production', true],
          ['A rate limit misreported', false],
          ['A CORS restriction', false],
          ['A clock skew between the two servers', false]],
        'Also an expired token or a malformed Bearer header.'),
      mcq('"It returned something strange" is inadequate as a report because:',
        [['The actual response body is the evidence', true],
          ['Strange responses are usually cached', false],
          ['The status code is enough on its own', false],
          ['Support teams require a correlation id', false]],
        'Keep the raw response whenever something unexpected happens.'),
    ],
  },

  {
    unitCode: 'T2_APIS_PRACTICE',
    notes: `No new ideas. Enough real integrations that the shape of the work becomes routine.

**Use real public APIs** — weather, currency, a public dataset, a maps service. Sandbox keys where
they are offered.

**Do these:**

1. **A simple GET** with parameters, printing three fields from the response.
2. **An authenticated call**, with the key from an environment variable and never in the code.
3. **Paging** — fetch every page of a large list, with a cap, and count the total.
4. **Failure handling** — call with a bad key, a bad path, and a malformed body. Record the status
   and body of each, and handle each differently.
5. **Retry with backoff** — call a deliberately wrong endpoint and watch your backoff work; confirm
   a 400 is not retried.
6. **Two APIs combined** — take a result from one and use it in the other. Handle the case where the
   second has nothing matching.
7. **Cache a slow call** for an hour and measure the difference on a second run.
8. **Your own tiny API** — three endpoints over a local dataset, with correct status codes and a
   consistent error shape, then call it from a separate script.

**Record for each:** the call, what came back, what you got wrong first, and what the failure taught
you about their design.

**The mistake this set exists to expose:** writing the happy path and stopping. A client that works
only when the network, the service, the credentials and the data all cooperate is not finished — it
is untested.`,
    mcqs: [
      mcq('Keeping the API key in an environment variable rather than the code means:',
        [['It never reaches the repository', true],
          ['It cannot be read by other processes', false],
          ['It is encrypted at rest', false],
          ['It rotates automatically', false]],
        'A key committed once stays in the history until revoked.'),
      mcq('Combining two APIs requires handling:',
        [['The case where the second has nothing matching', true],
          ['Two authentication headers on one request', false],
          ['A shared rate limit across both', false],
          ['Identical response shapes from each', false]],
        'The join between two systems is where the real cases live.'),
      mcq('Confirming that a 400 is not retried verifies:',
        [['That the retry logic distinguishes fault from outage', true],
          ['That the backoff intervals are correct', false],
          ['That the rate limit is respected', false],
          ['That the timeout is short enough', false]],
        'Retrying a request that cannot succeed wastes the limit and hides the error.'),
      mcq('Building your own three-endpoint API teaches most about:',
        [['Why the conventions you have been consuming exist', true],
          ['How to deploy a service', false],
          ['How authentication is implemented', false],
          ['How to write faster database queries', false]],
        'Being on the other side of the contract changes how you read one.'),
      mcq('A client that works only when everything cooperates is:',
        [['Untested rather than finished', true],
          ['Adequate for a first version', false],
          ['Correct, if the happy path is covered', false],
          ['Acceptable when the API is reliable', false]],
        'The failure paths are the work.'),
    ],
    checkpoint: [
      mcq('Measuring a cached call against an uncached one shows:',
        [['What the dependency was actually costing you', true],
          ['Whether the cache key is correct', false],
          ['How often the data changes', false],
          ['Whether the API is rate limiting you', false]],
        'A number, rather than an assumption, about the value of caching it.'),
      mcq('The most valuable record from each exercise is:',
        [['What you got wrong first, and what it taught you', true],
          ['The response time of each call', false],
          ['The endpoint and all of its parameters', false],
          ['Which API was easiest to use', false]],
        'The same rule as every practice unit in this year.'),
    ],
  },

  {
    unitCode: 'T2_APIS_MINI_PROJECT',
    notes: `An integration that does something genuinely useful, and keeps working when the service
it depends on does not.

**Why an integration rather than an API.** Building one teaches design; consuming one teaches
reality — rate limits, outages, shapes that change, records that are unusual. The second is what a
first job will ask of you, and it is far less commonly practised.

**What is being assessed:** that the failures are handled deliberately and differently, that retries
distinguish "their fault" from "my fault", that secrets are outside the code, and that the thing
degrades rather than collapsing when the service is down.

**Build it in this order:**

1. **Choose a real API** and a real question you want it to answer.
2. **Make one call work** — manually, in curl, before any code.
3. **Wrap it** with timeouts, status checks and your own objects at the boundary.
4. **Add the failure handling**: retryable versus not, backoff, the exhausted case.
5. **Break it on purpose** — bad key, no network, malformed response, rate limit — and fix what each
   reveals.
6. **Add the cache**, then measure what it saved.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — An Integration That Survives a Bad Day',
      description: 'Build a useful integration with a real third-party API that handles failure deliberately, retries only what should be retried, and degrades rather than collapsing.',
      instructions: `**The brief**

Build something small and genuinely useful on top of **at least two real APIs**, or one API plus
your own stored data. Examples:

- **A travel planner** — weather plus a places API, for a chosen city and date range.
- **A price watcher** — a public product or currency API, storing history and reporting changes.
- **A repository dashboard** — the GitHub API, summarising activity across your own repositories.
- **A transport helper** — a public transit or maps API, answering one specific question well.

**Requirements**

1. **At least two external services**, with a result from one used in the other.
2. **Secrets outside the code**, loaded from the environment, with a committed \`.env.example\`.
3. **Every call** with a timeout, a status check, and conversion into your own objects at the
   boundary.
4. **Deliberate failure handling**: a documented table of which statuses you retry and which you do
   not, and why.
5. **Exponential backoff with jitter**, and a cap on attempts.
6. **Graceful degradation**: when a service is unavailable, the application still does something
   useful — cached data, a partial answer, an honest message — and never a stack trace to the user.
7. **A cache** for at least one call, with the saving measured.
8. **Boundary logging**: method, endpoint, status, duration, correlation id; no secrets, no personal
   data.
9. **Tests** for your handling, using recorded or stubbed responses: success, 400, 401, 429, 500,
   timeout, and a malformed body.

**What to submit**

1. The code, with a README covering setup, the environment variables and how to run it.
2. The **retry policy table**, with a justification per row.
3. A **failure log**: each failure you deliberately induced, what the application did, and whether
   that was right.
4. The **cache measurement**: calls and time, before and after.
5. Sample output including **one run with a service unavailable**.
6. A **short write-up** (300–400 words): the failure mode you did not anticipate; where their
   documentation and behaviour disagreed; what you would add before letting this run unattended.

**Constraints**

- Public or sandbox APIs only, within their terms and rate limits.
- No secrets in the repository or in the output.
- No retrying a non-idempotent request without an idempotency key.

**Where the marks are.** The failure log. Every submission will work when the network is fine; the
grade is decided by what happens when it is not.`,
      rubric: [
        {
          criterion: 'Integration works',
          description: 'Two services combined to answer a real question; results correct; the join between them handles empty and unmatched cases.',
          maxPoints: 25,
        },
        {
          criterion: 'Failure handling',
          description: 'Retry policy justified per status, backoff with jitter and a cap, exhausted case handled, graceful degradation demonstrated.',
          maxPoints: 30,
        },
        {
          criterion: 'Safe and observable',
          description: 'Secrets outside the code, timeouts everywhere, boundary logging without secrets or personal data, responses converted at the edge.',
          maxPoints: 20,
        },
        {
          criterion: 'Evidence',
          description: 'Failure log covering induced failures, cache measurement with numbers, tests for each failure shape, a run with a service down.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'An unanticipated failure mode, a documentation-versus-behaviour difference, and what unattended running would need.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
