/**
 * T_HTTP — How the Web Talks, the whole topic: six concepts, a DEBUG and a PRACTICE.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * UNIVERSAL web fundamentals. Every learner who writes a page, a form, a fetch call or an API
 * meets HTTP whether or not they were taught it, and most first-years meet it as a wall of
 * unexplained failures: a 404 they cannot place, a CORS error they try to fix in the wrong
 * program, a form that "does nothing". This topic gives them the model and the one tool — the
 * browser's Network tab — that turns those failures into readable evidence.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * HTTP is usually taught as a list of methods and codes to memorise. Every unit here is instead
 * organised around one question: WHICH SIDE OWNS THIS? A request is a client's claim, a response
 * is a server's answer, and a method, a status or a header is only worth knowing for what it
 * tells you about who asked for what and who failed to deliver it.
 *
 * What it deliberately does not re-teach:
 *   - DNS, IP addresses, ports, TCP and TLS belong to T_NETWORKING. Here they are one line —
 *     "get connected" — and the units point there for the detail.
 *   - fetch, promises and response.ok belong to T_JS_DOM_ASYNC_BASICS. The HTTP units say what
 *     the exchange looks like on the wire; the JavaScript unit says how code waits for it.
 *   - GET versus POST for an HTML form belongs to T_FORMS_SUBMISSION. T_HTTP_METHODS generalises
 *     it to the whole method set and to the properties (safe, idempotent) behind the choice.
 *
 * Skills: HTTP for the protocol itself; BROWSER_FUNDAMENTALS for what the browser does with it —
 * cookies, caching, redirects it follows, origins, and DevTools. Every checkpoint question names
 * the one of the two it measures.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

const H = 'HTTP';
const BR = 'BROWSER_FUNDAMENTALS';

export const HTTP_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_HTTP_CLIENT_SERVER',
    notes: `Every time a web page loads, two programs hold a conversation. One asks and one answers,
and within that conversation the roles never swap.

**The client asks.** Your browser is the client you use most, but it is far from the only one: a
phone app fetching your timetable, \`curl\` in a terminal, and a payment service calling a bank's
API are all clients. A client is simply whatever starts the exchange.

**The server answers.** A server is a program that waits, listening for requests, and sends back
a response to each one. "Server" names a role, not a special kind of computer. Start a
development server on your laptop and your laptop is a server; open \`http://localhost:3000\` in
the same laptop's browser and one machine is client and server at once.

**What happens when you type an address and press Enter:**

1. The browser reads the URL to find the scheme (\`https\`) and the host name.
2. It finds the host's IP address and connects to it. DNS, ports, TCP and encryption are the
   networking topic's subject; for this topic, that whole step is "get connected".
3. It sends an HTTP **request**: which resource it wants, plus a few lines about the request.
4. The server sends an HTTP **response**: a status, a few lines about the reply, and usually a
   body — HTML, an image, some JSON.
5. The browser reads the HTML and discovers it needs more: a stylesheet, three scripts, twelve
   images. **Each of those is a separate request.**

That last step surprises people. One page commonly takes dozens of requests, which is why a single
broken image or missing script can fail on its own while the rest of the page is fine.

**The server does not remember you.** HTTP is **stateless**: each request is complete in itself,
and nothing in the protocol links your second request to your first. Staying logged in works
because the server hands the browser a **cookie**, and the browser sends it back with every later
request to that site. The memory travels with the client, one request at a time.

**The common misconception** is that the server "sends the website" once and your browser then
has it. In plain HTTP the server sends exactly what was asked for, one resource per request, and
it never starts a conversation. When a page shows new data without reloading, the page's own
JavaScript sent another request.

**Why it matters.** Every web fault lives on one side or the other. "The button does nothing"
might be a client that never sent a request, or a server that answered with an error. Asking
which side owns the job is the first question of every diagnosis in this topic.`,
    mcqs: [
      mcq('Which of these is acting as an HTTP client?',
        [['A phone app requesting today\'s timetable from a college API', true],
          ['The program on a college machine waiting for timetable requests', false],
          ['The database table that stores the timetable rows for each class', false],
          ['The Wi-Fi router forwarding packets between the phone and internet', false]],
        'A client is whatever starts the exchange. The waiting program is the server, and the database and router are not HTTP participants at all.'),
      mcq('A page made of one HTML file, two stylesheets and five images loads with nothing cached. How many requests did the browser make?',
        [['8, one for each resource the page needed', true],
          ['1, since the server sends the whole page together', false],
          ['2, one for the HTML and one for all the rest', false],
          ['3, one for each type of file in the page', false]],
        'Each resource is requested separately. The HTML arrives first, and the browser then asks for everything it references.'),
      mcq('You run a development server on your laptop and open `localhost:3000` in its browser. Which program is the server?',
        [['The dev server program, while the browser on the laptop is the client', true],
          ['Nothing is, because a server has to be a separate data-centre machine', false],
          ['The browser, because it is the program displaying pages on this machine', false],
          ['The operating system, which owns the network connection for both of them', false]],
        'Client and server are roles taken by programs. One machine can run both, which is exactly what local development does.'),
      mcq('You log in, open another page on the same site and are still logged in. Given that HTTP is stateless, how?',
        [['The browser sends back a cookie the server set, with every request', true],
          ['The server holds the connection open and recognises it as yours', false],
          ['HTTP remembers the previous request made from the same address', false],
          ['The browser silently re-sends your password with each new page', false]],
        'The protocol keeps no memory between requests, so the client carries it: the cookie arrives with each request and identifies the session.'),
    ],
    checkpoint: [
      mcq('On a news site the headline text appears but every photo is broken. What does that tell you about the requests?',
        [['The HTML request succeeded; the separate image requests did not', true],
          ['The server sent the page incompletely, as it all comes in one piece', false],
          ['The browser abandoned the single response halfway through reading it', false],
          ['The HTML is at fault, since images are part of the same response', false]],
        'The text arrived in the HTML response, and each photo is its own request. Those requests failed independently, so they are what to investigate.', H),
      mcq('A weather page shows new figures after you click "Refresh forecast", with no page reload. Where did the new data come from?',
        [['A request the page\'s JavaScript sent when the button was clicked', true],
          ['The server, which noticed the click and sent new data on its own', false],
          ['The first page load, which downloaded every future forecast in advance', false],
          ['The browser cache, which refreshes itself from the server every minute', false]],
        'In plain HTTP a server only ever answers. New data without a reload means the page itself made another request.', BR),
      mcq('Which statement about a web server is accurate?',
        [['It is a role: a program that listens for requests and answers them', true],
          ['It is specialised hardware that cannot also run a web browser', false],
          ['It starts conversations with clients whenever it has news for them', false],
          ['It must sit in a data centre, and never on a personal laptop', false]],
        'Server describes what a program does, not what it runs on. A laptop running a dev server is a real server for as long as that program listens.', H),
    ],
  },
  {
    unitCode: 'T_HTTP_REQUEST_RESPONSE',
    notes: `A request and a response have the same shape: a first line, some headers, a blank line, and
an optional body. Once you can read that shape, every tool that shows HTTP becomes readable.

**A request:**

    GET /courses/web-basics HTTP/1.1
    Host: learn.example.in
    User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
    Accept: text/html
    Cookie: session=8f3a91c2

- The **request line** holds three things: the method (\`GET\`), the path (\`/courses/web-basics\`)
  and the protocol version.
- The path is not the whole URL. The domain goes in the **Host** header, because one server
  machine often hosts many sites on the same address and needs to know which one you mean.
- A GET usually has no body, so the request ends after the blank line that follows the headers.

**A response:**

    HTTP/1.1 200 OK
    Content-Type: text/html; charset=utf-8
    Content-Length: 5120
    Cache-Control: max-age=600
    Set-Cookie: theme=dark; Path=/

    <!doctype html>
    <html lang="en">
    ...

- The **status line** is the version, a status code and a short reason phrase.
- Then headers, then **one blank line**, then the body. The blank line is how the receiver knows
  the headers have ended.

**Headers are information about the message**, written as \`Name: value\`. Header names are
case-insensitive. The ones worth recognising:

| Header | Sent by | Says |
|---|---|---|
| Host | client | Which site on this server |
| User-Agent | client | Which browser or tool is asking |
| Accept | client | Which formats it can use |
| Cookie | client | Values the site stored earlier |
| Authorization | client | Credentials, such as a token |
| Content-Type | both | How to read the body |
| Content-Length | both | How many bytes the body is |
| Set-Cookie | server | Store this value and send it back |
| Cache-Control | server | Whether and how long to keep a copy |
| Location | server | Where to go instead |

**Content-Type is the one that bites.** A body is just bytes; the receiver reads it the way
Content-Type says. Send JSON without \`Content-Type: application/json\` and many servers will not
parse it, so every field looks missing. Serve a stylesheet as \`text/plain\` and the browser
refuses to apply it. The misconception is that the file extension decides the type. On the web,
the header does.

**Newer versions, same shape.** HTTP/2 and HTTP/3 send this information in a compact binary
form, but the meaning is identical, and browser tools display it in the same method, headers and
body layout — usually with lowercase header names.

**Why it matters.** Almost every "the server ignored my data" or "the browser ignored my file"
turns out to be a header: a missing Content-Type, a cookie that was never sent, a cache that kept
an old copy. You can only see that if you read the headers, not just the body.`,
    mcqs: [
      mcq('In the request line `GET /courses/web-basics HTTP/1.1`, where does the site\'s domain name appear?',
        [['In the Host header on a following line of the request', true],
          ['Nowhere, since the connection already reached the machine', false],
          ['Before the path, since the full URL is always written there', false],
          ['In the User-Agent header, which names the site being visited', false]],
        'The request line carries only the path. The Host header names the site, which is what lets one server address hold many sites.'),
      mcq('What separates the headers of an HTTP response from its body?',
        [['A single blank line', true],
          ['A line holding only the word BODY', false],
          ['The Content-Length header, placed last', false],
          ['A closing tag matching the first header', false]],
        'The receiver reads header lines until it meets an empty line, and everything after that is the body.'),
      mcq('A server returns a JSON file at `/data/marks.json` but labels it `Content-Type: text/html`. What does the browser go by?',
        [['The Content-Type header, so it treats the body as HTML', true],
          ['The .json at the end of the path, so it treats it as JSON', false],
          ['The format of the page that happened to request the file', false],
          ['The Accept header it sent, which the server had to obey', false]],
        'On the web the header decides how a body is read, not the extension in the URL. A wrong Content-Type is a server-side fault.'),
      mcq('Which header does a server use to ask the browser to store a value and send it back on later requests?',
        [['Set-Cookie', true], ['Cookie', false], ['Cache-Control', false], ['Authorization', false]],
        'The server sends Set-Cookie once; the browser then includes the value in a Cookie header on requests to that site.'),
    ],
    checkpoint: [
      mcq('A script sends a JSON body with no Content-Type header, and the server replies that every field is missing. What is the most likely reason?',
        [['The server did not know to parse the body as JSON, so it read nothing', true],
          ['A JSON body can only travel in a GET request and never in a POST one', false],
          ['The Host header was missing, so the body reached a different website', false],
          ['The body was too long, so the server discarded it without any error', false]],
        'The body arrived as bytes, but without a JSON Content-Type the server had no instruction to read them as JSON, so it found no fields.', H),
      mcq('Your page\'s script requests `/api/profile` from its own site without setting any headers, yet the server receives your session cookie. Why?',
        [['The browser attaches the site\'s stored cookies to requests to that site', true],
          ['The server fetched the cookie from the browser before it sent a reply', false],
          ['fetch copies every header of the previous response into new requests', false],
          ['Cookies travel inside the path of the URL, which the script included', false]],
        'Cookie handling is the browser\'s job. Same-site requests carry the stored cookies automatically, which is how a session survives from page to page.', BR),
      mcq('Two different websites run on one server with a single IP address. How does the server tell which site a request is for?',
        [['From the Host header in the request', true],
          ['From the User-Agent header in the request', false],
          ['From the Content-Type of the request body', false],
          ['From the IP address the browser connected to', false]],
        'Both sites share the address, so the address cannot distinguish them. The Host header names the site the client wants.', H),
    ],
  },
  {
    unitCode: 'T_HTTP_METHODS',
    notes: `The method is the first word of a request, and it says what the client wants done with the
resource the path names. The forms topic compared GET and POST for submitting a form; here is the
whole set, and the two properties that decide which one an action should use.

| Method | Asks the server to | Safe | Idempotent | Body |
|---|---|---|---|---|
| GET | Send a representation of the resource | Yes | Yes | No |
| HEAD | Send only the headers GET would send | Yes | Yes | No |
| POST | Process this data: create, submit, trigger | No | No | Yes |
| PUT | Replace the resource with this body | No | Yes | Yes |
| PATCH | Change part of the resource | No | Not guaranteed | Yes |
| DELETE | Remove the resource | No | Yes | Usually no |
| OPTIONS | Say which methods and headers are allowed | Yes | Yes | No |

**Safe** means the client is not asking for anything to change. **Idempotent** means sending the
same request twice leaves the server in the same state as sending it once. Deleting item 7 twice
still leaves item 7 gone; the second attempt may answer 404 instead of 204, but idempotence is
about the state, not the response.

**A typical API uses the methods like this:**

    GET    /api/courses       list the courses
    POST   /api/courses       create a new course
    GET    /api/courses/42    read course 42
    PUT    /api/courses/42    replace course 42 entirely
    PATCH  /api/courses/42    change some fields of course 42
    DELETE /api/courses/42    remove course 42

**Why the meaning matters more than the mechanism.** Nothing stops a server from deleting a user
when it receives \`GET /users/5/delete\`. But the rest of the web believes what GET promises.
Link-preview bots in chat apps, search crawlers, browser prefetching and caches all fetch GET URLs
freely because GET is safe — and teams have lost data when a crawler "clicked" every delete link
on an admin page. The mechanism allowed it; the meaning was broken.

**Idempotence is what makes retries safe.** When a connection drops before the response arrives,
the client cannot know whether the server acted. Repeating a PUT or DELETE is harmless. Repeating
a POST can place the order twice, which is why payment systems add their own protection.

**Two things browsers impose.** An HTML form can only send GET or POST; any other method comes
from JavaScript or from a non-browser client. And before some cross-site requests, the browser
itself sends an OPTIONS request to ask permission — you will recognise it in the Network tab.

**The misconception: "POST is secure and GET is not."** POST keeps data out of the URL, and so
out of history and server logs, which matters. It does not encrypt anything. Only HTTPS protects
data in transit, and it protects GET and POST equally.`,
    mcqs: [
      mcq('An API should let a student change only the phone number on their profile. Which method fits best?',
        [['PATCH, since only part of the resource changes', true],
          ['PUT, since the profile already exists on the server', false],
          ['POST, since any change to stored data must use POST', false],
          ['GET, with the new number placed in the query string', false]],
        'PATCH changes part of a resource. PUT means replacing the whole profile with the body sent, so a body holding only the phone number would wipe the rest.'),
      mcq('Sending `DELETE /api/cart/items/7` twice returns 204 and then 404. Is DELETE still idempotent here?',
        [['Yes: the state after two requests matches the state after one', true],
          ['No, because the second response differs from the first response', false],
          ['No, because only GET and HEAD are ever considered idempotent', false],
          ['Yes, because clients never actually repeat a DELETE request', false]],
        'Idempotence is about the effect on the server. Item 7 is gone either way; a different status on the repeat does not change that.'),
      mcq('An admin page has a plain link to `GET /users/5/delete`. A link-preview bot fetches every URL posted in a chat. What happens when the link is shared?',
        [['The bot deletes user 5, since it assumes a GET is safe to fetch', true],
          ['Nothing, because preview bots only send HEAD requests for titles', false],
          ['The server refuses, because a GET request cannot change any data', false],
          ['The bot is asked to confirm, as browsers do for dangerous links', false]],
        'The server acts on the request exactly as written. Tools that fetch URLs automatically trust GET to be safe, so a GET that deletes is a trap waiting for them.'),
      mcq('Which method does a browser send on its own before certain cross-origin requests, to ask what the server allows?',
        [['OPTIONS', true], ['HEAD', false], ['GET', false], ['CONNECT', false]],
        'This is the preflight request. It asks which methods and headers are permitted before the real request is sent.'),
    ],
    checkpoint: [
      mcq('A connection drops just after a request is sent, and the client retries automatically. For which request is the retry risky?',
        [['`POST /api/orders`, which may create a second order', true],
          ['`PUT /api/orders/9`, which may replace the order twice', false],
          ['`GET /api/orders/9`, which may read the same order twice', false],
          ['`DELETE /api/orders/9`, which may remove the order twice', false]],
        'POST is not idempotent, so a repeat can create a duplicate. Replacing, reading or deleting twice leaves the server in the same state as doing it once.', H),
      mcq('A plain HTML form is written with `method="delete"`. What does the browser send when it is submitted?',
        [['A GET request, since forms support only GET and POST', true],
          ['A DELETE request, exactly as the attribute asks for', false],
          ['A POST request with an extra header naming DELETE', false],
          ['Nothing, because the browser blocks the invalid form', false]],
        'An unrecognised form method falls back to the default, GET. Methods other than GET and POST have to come from JavaScript or another client.', BR),
      mcq('A classmate says a login form must use POST "because POST encrypts the password". What is actually true?',
        [['POST keeps it out of the URL; only HTTPS encrypts it in transit', true],
          ['POST encrypts the body, which is exactly why passwords use it', false],
          ['GET encrypts the query string, so both methods are equally safe', false],
          ['Neither matters, since browsers encrypt every form field anyway', false]],
        'POST is still the right choice, for a different reason: the password stays out of history and logs. Encryption comes only from HTTPS.', H),
    ],
  },
  {
    unitCode: 'T_HTTP_STATUS_CODES',
    notes: `Every response begins with a three-digit status code, and the first digit alone tells you
which side to look at.

| Family | Means | Look at |
|---|---|---|
| 1xx | Informational: still in progress | Rarely seen directly |
| 2xx | Success | Nothing is wrong at the HTTP level |
| 3xx | Redirection: the answer is elsewhere | The browser follows it for you |
| 4xx | Client error: the request was the problem | Whoever built the request |
| 5xx | Server error: the server failed to handle it | Whoever runs the server |

**The ones you will meet every week:**

| Code | Name | In practice |
|---|---|---|
| 200 | OK | It worked; the body holds the result |
| 201 | Created | A POST made something new, often named in Location |
| 204 | No Content | It worked and there is nothing to send back |
| 301 | Moved Permanently | Use the URL in Location from now on |
| 302 | Found | Temporarily elsewhere; follow Location this time |
| 304 | Not Modified | Your cached copy is still current; use it |
| 400 | Bad Request | The server could not accept what you sent |
| 401 | Unauthorized | Not authenticated: no login, or an expired token |
| 403 | Forbidden | The server refuses; logging in again will not help |
| 404 | Not Found | Nothing exists at this URL |
| 405 | Method Not Allowed | The URL exists, but not with this method |
| 429 | Too Many Requests | Slow down |
| 500 | Internal Server Error | The server's code failed |
| 502 | Bad Gateway | A proxy in front got no valid reply from the app behind it |
| 503 | Service Unavailable | Overloaded or down for maintenance |
| 504 | Gateway Timeout | A proxy gave up waiting for the app |

**401 versus 403.** Despite its name, 401 means "I do not know who you are" — log in and try
again. 403 means logging in will not help: the server knows enough and still says no.

**404 versus 500, which is the distinction worth the most.** A 404 means the server worked
perfectly and has nothing at that address, so check the URL: the spelling, a missing slash, an id
that does not exist. A 500 means your request reached code that crashed, so the fix is on the
server, and its response body or log usually says why. Both mean the network did its job; the
networking topic's tools unit starts from exactly that point.

**The browser acts on some codes itself.** A 3xx with a Location header is followed
automatically, which is why the address bar can end somewhere other than where you started. A 304
tells the browser to show the copy it already has.

**The misconception: "200 means it worked".** The status is what the server chose to send. Some
APIs answer 200 with a body like \`{"error": "student not found"}\`, and some sites show a designed
"page not found" with a 200 — a soft 404 that search engines and scripts treat as a real page.
Read the body as well as the code. The reverse trap is covered in the JavaScript topic: \`fetch\`
does not throw on a 404 or a 500, so code must check \`response.ok\`, which is true only for
200 to 299.

**Why it matters.** The status code is the fastest triage in web development. Before you read a
line of anybody's code, the first digit has told you which half of the system to open.`,
    mcqs: [
      mcq('A request returns 401. You log in, send the same request again, and now get 403. What changed?',
        [['The server now knows who you are, and that account is not allowed', true],
          ['The server has crashed since the first request was handled', false],
          ['The resource was deleted between the first and second requests', false],
          ['Logging in broke the request, so its syntax is no longer valid', false]],
        '401 asked for authentication. Once you were authenticated, the server could decide, and 403 is its refusal for that account.'),
      mcq('Which family does `304 Not Modified` belong to, and what does it tell the browser?',
        [['3xx: use the copy you already have cached', true],
          ['2xx: the new version was saved successfully', false],
          ['4xx: the file was not permitted to change', false],
          ['5xx: the server could not modify the file', false]],
        'It is a redirection to the browser\'s own cache. No body is sent, because the browser already holds the current version.'),
      mcq('Following a link gives 404; submitting a form on the same site gives 500. Where does each fault most likely lie?',
        [['404: the URL requested; 500: the server\'s own code', true],
          ['404: the server\'s own code; 500: the URL requested', false],
          ['Both are network faults between browser and server', false],
          ['Both mean the browser sent a malformed HTTP request', false]],
        'A 404 is a working server with nothing at that address. A 500 is a request that reached code which then failed.'),
      mcq('A server answers `POST /api/students` with status 201. What is it telling the client?',
        [['A new resource was created, often with its URL in Location', true],
          ['The request is still being processed and will finish later', false],
          ['The request succeeded but there is no body to be returned', false],
          ['The data was accepted but has only been stored temporarily', false]],
        '201 Created confirms the POST made something new. "Still processing" would be 202, and "no body" is 204.'),
    ],
    checkpoint: [
      mcq('An API returns status 200 with the body `{"error": "student not found"}`. Why is this a problem for client code?',
        [['Code that checks the status sees success and treats the error as data', true],
          ['A 200 response is not permitted to carry a body in JSON format', false],
          ['The browser converts the 200 into a 404 and discards the body', false],
          ['The status overrides the body, so the error text never arrives', false]],
        'Clients use the status to decide whether to read a result or handle a failure. A 404 would have let them tell; the 200 hides the error inside a success.', H),
      mcq('Your site runs behind a proxy, and users suddenly see `502 Bad Gateway`. Which is the best first suspect?',
        [['The app behind the proxy is down or sent back an invalid reply', true],
          ['The users typed a URL for a page that does not exist on the site', false],
          ['The users\' logins have expired and they need to sign in again', false],
          ['The browsers are holding a broken cached copy of the site\'s page', false]],
        'A 502 comes from the proxy: it could not get a valid answer from the application it forwards to. A missing page would be 404, an expired login 401.', H),
      mcq('You open `http://example.in/old-page` and the address bar ends up showing `/new-page`. What did the browser do?',
        [['Received a 3xx with a Location header and requested that URL', true],
          ['Guessed the newer page name from a list the site had published', false],
          ['Received a 404 and searched the site for a similarly named page', false],
          ['Rewrote the address on its own because the old page was cached', false]],
        'Browsers follow redirects automatically. The first response named the new URL in Location, and the browser made a second request to it.', BR),
    ],
  },
  {
    unitCode: 'T_HTTP_URLS',
    notes: `A URL looks like one long string, but it is several separate instructions joined together,
and each part is read by a different piece of the system.

    https://learn.example.in:8443/courses/search?topic=http&level=1#reviews

| Part | Here | Its job |
|---|---|---|
| Scheme | \`https\` | Which protocol to speak, and so the default port |
| Host | \`learn.example.in\` | Which machine to contact |
| Port | \`8443\` | Which service on it; usually left out |
| Path | \`/courses/search\` | Which resource on that server |
| Query | \`topic=http&level=1\` | Parameters for that resource |
| Fragment | \`reviews\` | A place within the page, for the browser only |

**Scheme and port.** \`https\` means port 443 unless another is written, and \`http\` means 80.
That is why you almost never see a port, and why \`localhost:3000\` has to spell one out.

**Host.** The name looked up to find the machine — the networking topic covers how. In
\`learn.example.in\`, \`learn\` is a subdomain of \`example.in\`, which is the registered domain.
Host names are case-insensitive.

**Path.** What the server should find. It looks like a folder and file, but the server decides
what it means: \`/courses/search\` may be no file at all, just a route in the application's code.
Paths can be case-sensitive, depending on the server.

**Query.** \`key=value\` pairs, joined with \`&\`, after a \`?\`. A search form using GET puts
its fields here, which is why a search URL can be bookmarked and shared.

**Fragment.** Everything after \`#\`. **The browser never sends it to the server.** It scrolls to
the matching element, or a page's JavaScript reads it.

**Characters with a job must be encoded.** A space becomes \`%20\` (in form queries also \`+\`).
If a value itself contains \`&\`, it must be written \`%26\`, or the server sees the start of a new
parameter: \`?q=rock&roll\` arrives as \`q=rock\` plus an empty parameter called \`roll\`.

**Relative URLs are resolved against the current page.** On the page \`/courses/web/intro\`:
\`/notes.html\` means the site root, giving \`/notes.html\`; \`notes.html\` means the same folder,
giving \`/courses/web/notes.html\`. The HTML links unit met this for links; the same rule applies
to every image, script and fetch call, and it causes real 404s.

**Reading the host is a safety skill.** In \`https://mybank.co.in.account-check.net/login\`, the
host ends in \`account-check.net\`, and that is who controls it; \`mybank.co.in\` is just a
subdomain somebody chose. And in \`https://mybank.co.in@account-check.net\`, everything before
\`@\` is treated as a user name, not a host, so the host is \`account-check.net\` again.

**Origin.** Scheme, host and port together form a page's **origin**. \`http://example.in\` and
\`https://example.in\` are different origins, and so are two ports on \`localhost\`. Browsers use
origins to decide what one site may read from another, which returns in the browser tools unit.

**Why it matters.** When a request goes to the wrong place, the URL is the first evidence. Taking
it apart part by part is faster than staring at it whole.`,
    mcqs: [
      mcq('In `https://shop.example.in/cart?coupon=FEST10#summary`, which part never reaches the server?',
        [['#summary, the fragment', true],
          ['?coupon=FEST10, the query', false],
          ['shop, the subdomain part', false],
          ['/cart, the path of the URL', false]],
        'The browser keeps the fragment for itself, to scroll or for scripts to read. The query and path are sent in the request, and the host is used to connect and sent in the Host header.'),
      mcq('A search box builds `/search?q=rock&roll` by pasting the typed text straight in, and the server sees q as "rock". Why?',
        [['The unencoded & started a second parameter named roll', true],
          ['Servers cut every query value off after four characters', false],
          ['The server reads only the first word of any query value', false],
          ['An ampersand is illegal in a URL, so the URL ends there', false]],
        'The & separates parameters, so a literal ampersand inside a value must be encoded as %26.'),
      mcq('Which port does `https://example.in/login` connect to?',
        [['443, the default for https', true],
          ['80, the default for every URL', false],
          ['8080, the usual web port', false],
          ['None; https uses no port', false]],
        'With no port written, the scheme decides it: 443 for https and 80 for http.'),
      mcq('The page `/courses/web/intro` has a link with `href="notes.html"`. Which path does the browser request?',
        [['/courses/web/notes.html', true],
          ['/notes.html', false],
          ['/courses/web/intro/notes.html', false],
          ['/courses/notes.html', false]],
        'A relative URL without a leading slash replaces the last segment of the current path. A leading slash would have meant the site root instead.'),
    ],
    checkpoint: [
      mcq('A message links to `https://mybank.co.in.secure-verify.net/login`. Who controls this host?',
        [['Whoever registered secure-verify.net', true],
          ['The bank, since mybank.co.in comes first', false],
          ['Nobody, since such a long host is invalid', false],
          ['The .in registry, since co.in appears in it', false]],
        'A host is read from its right-hand end. The registered domain is secure-verify.net, and everything to its left is a subdomain its owner chose.', BR),
      mcq('Which pair of addresses are different origins?',
        [['`http://example.in` and `https://example.in`', true],
          ['`https://example.in/a` and `https://example.in/b`', false],
          ['`https://example.in` and `https://example.in/?x=1`', false],
          ['`https://example.in` and `https://EXAMPLE.in/`', false]],
        'An origin is scheme, host and port. A different scheme changes it; paths and queries do not, and host names ignore case.', BR),
      mcq('Two links differ only in ending `#reviews` or `#faq`. What does the server receive when each is opened?',
        [['The same request both times, since fragments are not sent', true],
          ['Two different requests, one for each fragment\'s own page', false],
          ['The fragment as a header, which the server reads first', false],
          ['No request at all, as fragment URLs are always cached', false]],
        'The fragment stays in the browser. The server sees an identical path and query and sends the same page, and the browser scrolls to the named place.', H),
    ],
  },
  {
    unitCode: 'T_HTTP_BROWSER_TOOLS',
    notes: `When something on a page fails, the Network tab shows you the actual requests and responses
— not what your code intended, but what was sent and what came back. Most web faults are a
guess until you look there, and obvious once you do.

**Open it first, then make the fault happen.** Press F12 or Ctrl+Shift+I (Cmd+Option+I on a Mac),
choose **Network**, then reload the page or repeat the action. It records only while DevTools is
open. Two settings matter while debugging:

- **Preserve log** keeps the list when the page navigates away — essential for a form that submits
  and redirects, which otherwise wipes the evidence.
- **Disable cache** makes the browser fetch everything fresh while DevTools is open.

**Find the request.** Filter to **Fetch/XHR** to see only the requests your JavaScript made, or
type part of the URL into the filter box. Failed rows are shown in red.

**Read it in this order, and stop when you find the fault:**

1. **Is there a row at all?** If clicking the button adds nothing, no request was sent, and the
   fault is in the page's JavaScript. Go to the Console.
2. **Headers → Request URL and Method.** Is it the URL and method you meant, character by
   character?
3. **Status.** The family tells you which side to suspect.
4. **Payload.** What was actually sent: query parameters and the request body.
5. **Response or Preview.** What came back. Servers often explain a 400 or 500 in the body.

**Symptom to cause, for the faults you will actually meet:**

| You see | It means | Next |
|---|---|---|
| No row appears | The request was never sent | Console errors, the event handler |
| 404 on \`/dashboard/api/students\` | A relative URL resolved against the page path | Add the leading slash |
| 400 or 422; Payload shows \`name=Asha&year=1\` | A form-encoded body where JSON was expected | Body format and Content-Type |
| 401 | No valid credentials were sent | Cookie or Authorization in request headers |
| 500 | The server's code failed | Response body, then the server's log |
| \`(failed)\` with \`net::ERR_CONNECTION_REFUSED\` | No HTTP response at all; nothing listening | Is the backend running, on that port? |
| \`(memory cache)\` or \`(disk cache)\` in Size | An old copy was used | Disable cache and reload |

**Recognising a CORS error.** Your page on \`http://localhost:5173\` calls
\`http://localhost:8000/api/students\`. A different port is a different origin, so the browser
applies its cross-origin rules. The Console says something like:

    Access to fetch at 'http://localhost:8000/api/students' from origin
    'http://localhost:5173' has been blocked by CORS policy: No
    'Access-Control-Allow-Origin' header is present on the requested resource.

The Network tab shows the row marked as a CORS error, and in JavaScript \`fetch\` rejects with a
\`TypeError\` — unlike a 404, which it does not reject. What is going on: the server did not say,
in an \`Access-Control-Allow-Origin\` header, that your origin may read its responses, so the
browser withholds the response from your script. Often the request reached the server and was
even processed; for some requests the browser first sends an OPTIONS preflight, and if that is
refused the real request is never sent.

Three facts make it recognisable. The same URL works in \`curl\`, or typed into the address bar,
because CORS is a rule browsers enforce on scripts. The fix belongs on the **server**, which must
allow your origin, or in a development proxy that puts both on one origin. And no header your
client code adds can grant itself permission — that would defeat the point.

**Reproduce outside the page.** Right-click a request and choose **Copy as cURL** to repeat it
exactly from a terminal. If it works there and fails in the page, the difference is the browser:
CORS, cookies or cache.`,
    mcqs: [
      mcq('Clicking "Save" does nothing, and with the Network tab open no new row appears. Where should you look next?',
        [['The Console, since the page never sent the request at all', true],
          ['The server logs, since the server silently ignored the save', false],
          ['The Response tab of the previous request, for its error text', false],
          ['The cache settings, since the save was answered from cache', false]],
        'No row means no HTTP happened. The fault is in the page\'s JavaScript before the request, so the Console is where the error will be.'),
      mcq('A dashboard at `/dashboard/` calls `fetch("api/students")`, and the Network tab shows a 404 for `/dashboard/api/students`. What is the cause?',
        [['The relative URL resolved against the page path; it needs a leading /', true],
          ['The API server is down, so every route on it is now returning 404', false],
          ['fetch adds the current folder to every URL, including absolute ones', false],
          ['The students table is empty, so the server has nothing it can send', false]],
        'The Request URL is the evidence: the path gained /dashboard/. Writing "/api/students" resolves from the site root instead.'),
      mcq('A POST returns 400. The Payload tab shows `name=Asha&year=1`, but the API expects JSON. What went wrong?',
        [['The body was sent form-encoded rather than as JSON with a JSON type', true],
          ['The server wants GET for this route, so it rejects every POST request', false],
          ['The values are too short, so the server treats them as being missing', false],
          ['The browser encoded the body wrongly because DevTools had been opened', false]],
        'The Payload tab shows what was really sent. The server could not read a form-encoded body as JSON, so it rejected the request as bad.'),
      mcq('You edited `style.css`, but the page looks unchanged and the stylesheet\'s Size column says `(memory cache)`. What is the fix?',
        [['Tick Disable cache and reload, so the browser fetches it again', true],
          ['Restart the web server, since it is still sending the old file', false],
          ['Rename every class in the stylesheet so the browser notices', false],
          ['Clear the Console, which is holding the old stylesheet version', false]],
        'The Size column shows the browser never asked the server; it reused its stored copy. Fetching fresh is the fix, not changing the server.'),
    ],
    checkpoint: [
      mcq('A request from your page fails with a CORS error, yet the same URL works in curl. What does that establish?',
        [['The server must allow your page\'s origin; the browser enforces it', true],
          ['The server is down for browsers only, and needs to be restarted', false],
          ['curl is showing a cached copy, so the URL does not really work', false],
          ['Your fetch call contains a syntax error that curl does not have', false]],
        'CORS is a browser rule applied to scripts, which is why curl is unaffected. The fix is a response header from the server permitting your origin.', BR),
      mcq('A request shows status `(failed)` with `net::ERR_CONNECTION_REFUSED`. What does that tell you?',
        [['No HTTP response arrived: nothing is listening at that address and port', true],
          ['The server answered with an error status that the browser is hiding', false],
          ['The server rejected the login details that were sent in the request', false],
          ['The response did arrive but was too large for the browser to display', false]],
        'There is no status code because there was no HTTP exchange. Check that the backend is running and on the port the URL names.', H),
      mcq('The Network tab shows `POST /api/enrol` with status 500, and the response body names a null field. Whose code needs fixing?',
        [['The server code handling that route, which failed on the request', true],
          ['The front end, since a 500 always means the browser sent bad data', false],
          ['The network settings, since a 500 means the request was lost', false],
          ['The browser cache, since a stale page sent the old field names', false]],
        'A 500 is the server failing. Even if the front end sent an unexpected value, a correct server would answer 400 with a message rather than crash.', H),
    ],
  },
  {
    unitCode: 'T_HTTP_PRACTICE',
    notes: `No new concepts. Inspect real traffic on sites you use and explain what you find, using
the model — client, server, request, response — and the Network tab.

**The method, for any request you look at:**

1. **Name both sides.** Which page or script started it (the Initiator column), and which host
   answered?
2. **Take the URL apart.** Scheme, host, path, query. Is anything relative, or unencoded?
3. **Check the method against the action.** Does a GET change something? Does a read use POST?
4. **Read the status.** First the family, then the specific code.
5. **Read the headers that matter.** Content-Type in both directions, Cookie and Set-Cookie,
   Location, Cache-Control.
6. **Read the payload and the response body**, especially for a 4xx or 5xx.
7. **Say which side owns it**, in one sentence, before proposing a fix.

**Exercises worth doing in your own browser:**

- Load a news site's home page with the Network tab open. Count the requests, find the largest,
  and find which ones went to hosts other than the site's own.
- Search on a site. Find the request that carried your query, change a parameter in the address
  bar, and watch the new request.
- Type the \`http://\` address of a site that uses HTTPS. Find the redirect: a 301 from the server,
  or a 307 Internal Redirect when the browser already knows the site is HTTPS-only.
- Request a page that does not exist. Is the status a genuine 404, or a 200 with a
  "not found" design?
- Find a page that updates without reloading, and the Fetch/XHR request that does it.
- Log in to a site and find the response whose Set-Cookie started your session.

**The checklist before you call a diagnosis finished:**

- Did I read the status, or assume it from how the page looked?
- Is the Request URL exactly the one I meant?
- Did I read the response body of the failing request?
- Does the Content-Type of what was sent match the body?
- If there is a CORS error, have I stopped trying to fix it in client code?
- Have I ruled out the cache?
- Can I say which side owns the fault, in one sentence?`,
    mcqs: [
      mcq('Loading a college home page, the Network tab lists 64 requests, 20 of them to other hosts. What is the most likely explanation?',
        [['The page loads fonts, scripts or images kept on other servers', true],
          ['The browser split one large response into 64 smaller requests', false],
          ['The college server redirected the page 20 times before loading', false],
          ['The extra requests are retries caused by a slow connection', false]],
        'Every resource the HTML references is its own request, and pages commonly pull fonts, analytics scripts and images from other hosts.'),
      mcq('After a search, the address bar shows `/results?city=Pune&page=2`. You change 2 to 3 and press Enter. What have you done?',
        [['Sent a new GET request with a different query parameter', true],
          ['Edited the page locally, with nothing sent to the server', false],
          ['Re-submitted the original search form with a POST body', false],
          ['Jumped to a fragment further down the same results page', false]],
        'The query string is part of the request. Changing it and pressing Enter asks the server for a different resource.'),
      mcq('You type the `http://` address of a well-known site, and the first row is `307 Internal Redirect` to `https://`. What happened?',
        [['The browser knew the site is HTTPS-only and upgraded it itself', true],
          ['The server sent an error because http is no longer supported', false],
          ['The page was loaded over http and then encrypted afterwards', false],
          ['The name lookup failed, so the browser retried with https', false]],
        '"Internal" means no request left the browser for that row. It rewrote the URL because it already had a record that the site must use HTTPS.'),
      mcq('A missing page on a site shows a friendly "Not found" design, but the Network tab reports status 200. What is the concern?',
        [['Search engines and scripts will treat the missing page as real', true],
          ['The browser will cache the message and never load the page', false],
          ['The server has crashed and is serving a default page instead', false],
          ['The page actually exists but is hidden from normal visitors', false]],
        'Automated clients go by the status code. A soft 404 tells them the page exists, so it gets indexed or processed as real content.'),
      mcq('You stay logged in to a site even after closing the browser. Which response header should you inspect to see why?',
        [['Set-Cookie on the login response, for its expiry', true],
          ['Content-Type on the login response, for its format', false],
          ['Cache-Control on the home page, for how long it is kept', false],
          ['Location on the login response, for where it sent you', false]],
        'A session cookie set with an Expires or Max-Age attribute survives closing the browser; one without them normally does not.'),
    ],
    checkpoint: [
      mcq('A "Mark all as read" link is `GET /notifications/read-all`. Notifications keep being marked read before users open them. What is the most likely cause?',
        [['Something such as a prefetcher fetched the link, trusting GET as safe', true],
          ['The server caches GET responses and replays them for all users', false],
          ['The Location header on the page redirects users through the link', false],
          ['GET requests are always sent twice in case the first one is lost', false]],
        'Tools that fetch links ahead of a click assume GET changes nothing. An action that changes state belongs in a method that is not safe, such as POST.', H),
      mcq('Your front end on `http://localhost:3000` reads `http://localhost:3000/api` without trouble, but `http://localhost:8000/api` gives a CORS error. Why the difference?',
        [['A different port is a different origin, so the second needs permission', true],
          ['Port 8000 is reserved, so the browser refuses to send requests to it', false],
          ['The second URL lacks https, which a cross-port request always requires', false],
          ['The first was answered from cache, so it never reached the network', false]],
        'Same scheme, same host, different port: a different origin. The server on 8000 must allow the origin on 3000, or a proxy must put both on one.', BR),
      mcq('You must report a failing request to a teammate in one sentence. Which report is most useful?',
        [['"POST /api/enrol returns 422, and the body says year must be a number"', true],
          ['"The enrol page is broken and nothing works when I press submit"', false],
          ['"There is a network error on the enrol page, probably the server"', false],
          ['"The enrol request fails, and I think the JavaScript has a problem"', false]],
        'It gives the method, the URL, the status and the server\'s own explanation, which together say which side owns the fault and where to start.', H),
    ],
  },
];
