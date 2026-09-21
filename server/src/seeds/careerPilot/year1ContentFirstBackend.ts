/**
 * T_FIRST_BACKEND — nine units. DIRECTION: SOFTWARE_BACKEND.
 *
 * ── WHY THIS TOPIC EXISTS ─────────────────────────────────────────────────────────────────
 *
 * Software & Backend was a direction with no units of its own, so a student who chose it got the
 * universal curriculum and nothing else — the same plan as anybody who chose another empty
 * direction. This is the first thing that is theirs: a server they write themselves.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Frameworks are usually taught as decorators to memorise. Here the framework (Flask, because the
 * student already writes Python) is the smallest part. What is taught is what every backend in any
 * language has to get right: the client cannot be trusted, the response has a shape somebody else
 * depends on, the status code is part of the answer, and memory forgets on restart.
 *
 * Seeded as DRAFT. Nothing here reaches a student until an admin reviews and publishes it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FIRST_BACKEND_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_FIRST_BACKEND_WHAT_A_SERVER_DOES',
    notes: `A server is a program that waits. It sits on a machine, listens on a port, and when a
request arrives it runs some code and sends a response back. Then it waits again.

**The two sides of every web application:**

| Client (browser or app) | Server (your backend) |
|---|---|
| Runs on the user's device | Runs on a machine you control |
| Shows things and collects input | Decides, stores and enforces rules |
| Can be inspected and changed by the user | Cannot be seen by the user |
| Many copies, one per user | One program serving everybody |

**The rule that follows from that table:** anything running on the client can be changed by the
person holding the device. They can open developer tools, edit the page, and send any request
they like — with any values — straight to your server without using your page at all.

So the server must **never trust the client**:

- A price shown on the page is not the price. The server looks it up.
- "This user is an admin" sent from the browser means nothing. The server checks.
- A form's \`maxlength\` does not limit what arrives. The server checks the length again.

**What a server does with every request**, in order:

1. **Receive** — method, path, headers, maybe a body.
2. **Check** — is this request allowed, and is its input acceptable?
3. **Do the work** — read or change data.
4. **Respond** — a status code, headers, and usually a body.

Most backend bugs are a missing step 2. Most confusing backends are a careless step 4.

**Why not do everything in the browser?** Because data shared between users has to live
somewhere nobody can edit directly, and rules (who may see what, what an order costs) have to be
enforced somewhere the user cannot switch them off. That somewhere is the server.`,
    mcqs: [
      mcq('Where must a rule like "only the owner can delete this post" be enforced?',
        [['On the server, because the client can be changed by the user', true],
          ['In the browser, so the delete button can be hidden from others', false],
          ['In both places equally, since either one alone is enough', false],
          ['In the database driver, which checks ownership automatically', false]],
        'Hiding the button is a courtesy. Anyone can send the delete request without the button existing.'),
      mcq('A shop page shows a price of Rs 499. When the order arrives, the server should:',
        [['Look the price up itself and ignore any price the client sent', true],
          ['Use the price from the request, since the page displayed it', false],
          ['Compare the two prices and use whichever one is lower', false],
          ['Reject the order unless the client price is included in it', false]],
        'The request can be edited to say Rs 1. The server is the only place the real price can be trusted.'),
      mcq('Which of these runs on the client, not the server?',
        [['The code that shows an error beside a form field', true],
          ['The query that reads orders from the database', false],
          ['The check that a logged-in user owns a record', false],
          ['The code that sends a confirmation email', false]],
        'Display and input collection are client jobs; data, rules and anything secret stay on the server.'),
      mcq('The four steps a server takes for each request are:',
        [['Receive, check, do the work, respond', true],
          ['Connect, render, store, disconnect', false],
          ['Parse, compile, execute, return', false],
          ['Listen, cache, log, retry', false]],
        'Step two, checking, is the one most often missing — and the one attackers look for first.'),
    ],
    checkpoint: [
      mcq('A form limits a username to 20 characters with maxlength. What arrives at the server?',
        [['Possibly any length, so the server must check again', true],
          ['At most 20 characters, since the browser enforced it', false],
          ['Nothing, if the user tries to type a 21st character', false],
          ['An error code, which the browser sends in its place', false]],
        'maxlength only limits the page. A request built by hand, or by a script, ignores it entirely.'),
      mcq('Why does shared data have to live on a server rather than in each browser?',
        [['So one copy exists that no user can edit directly', true],
          ['Because browsers are not able to store any data', false],
          ['Because servers are faster than phones at reading', false],
          ['So the data can be read without a network at all', false]],
        'Browsers can store data, but only for that one user, and that user can change it freely.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_ROUTES',
    notes: `A **route** connects a method and a path to a function. When a request matches, that
function — the **handler** — runs and its return value becomes the response.

**A complete Flask server:**

    from flask import Flask

    app = Flask(__name__)

    @app.route("/hello")
    def hello():
        return "Hello from the server"

    if __name__ == "__main__":
        app.run(debug=True)

Install with \`pip install flask\`, save as \`app.py\`, run \`python app.py\`, then open
\`http://127.0.0.1:5000/hello\`. That URL is the route; the text in the browser is the handler's
return value.

**Methods matter.** By default a Flask route only answers GET. To accept a form or an API call
that creates something:

    @app.route("/notes", methods=["POST"])
    def create_note():
        ...

A POST to a GET-only route gets **405 Method Not Allowed** — Flask's way of saying the path
exists but not for that method.

**One path, several methods** is normal and is how APIs are usually shaped:

| Method | Path | Meaning |
|---|---|---|
| GET | /notes | List notes |
| POST | /notes | Create a note |
| GET | /notes/3 | Read note 3 |
| DELETE | /notes/3 | Delete note 3 |

**Path parameters** capture part of the URL:

    @app.route("/notes/<int:note_id>")
    def get_note(note_id):
        return f"You asked for note {note_id}"

\`<int:note_id>\` means Flask only matches if that part is a whole number, and hands it to the
function already converted. \`/notes/abc\` gets a 404 without your code running.

**\`debug=True\` is for your machine only.** It reloads on save and shows a detailed error page —
including your code — to anyone who triggers an error. Never leave it on a server other people
can reach.

**The mental model to keep:** a backend is a table of routes, and each handler is an ordinary
function that receives a request and returns a response.`,
    mcqs: [
      mcq('What does `@app.route("/notes", methods=["POST"])` do?',
        [['Makes the function below it answer POST requests to /notes', true],
          ['Sends a POST request to /notes when the server starts', false],
          ['Creates a notes table the first time it is called', false],
          ['Redirects every GET request on /notes to a POST', false]],
        'The decorator registers the function as the handler for that method and path; nothing runs until a request arrives.'),
      mcq('A client sends POST /hello, but the route only lists GET. The response is:',
        [['405 Method Not Allowed', true], ['404 Not Found', false],
          ['200 with an empty body', false], ['500 Internal Server Error', false]],
        'The path exists, so it is not 404; the method is what is refused, which is exactly what 405 means.'),
      mcq('With the route `/notes/<int:note_id>`, a request for /notes/abc:',
        [['Gets 404, and the handler never runs', true],
          ['Runs the handler with note_id set to "abc"', false],
          ['Runs the handler with note_id set to zero', false],
          ['Crashes the server with a conversion error', false]],
        'The int converter is part of matching. "abc" does not match, so no route matches, so 404.'),
      mcq('Why must `debug=True` never be used on a public server?',
        [['Its error page shows your code to whoever triggers an error', true],
          ['It makes the server noticeably slower for every request', false],
          ['It turns off every route except the first one defined', false],
          ['It stops the server from accepting POST requests', false]],
        'The interactive debugger can go further than showing code, which is why it is strictly for local development.'),
    ],
    checkpoint: [
      mcq('Which pair is the conventional way to list items and to create one?',
        [['GET /items and POST /items', true],
          ['GET /items/list and GET /items/create', false],
          ['POST /items/list and POST /items/new', false],
          ['GET /items and GET /items?create=true', false]],
        'Same path, different method. Using GET to create things means a crawler or a prefetch can create them.'),
      mcq('In Flask, what becomes the body of the response?',
        [['The value the handler function returns', true],
          ['Whatever the handler prints to the console', false],
          ['The name of the handler function itself', false],
          ['The path that the route decorator lists', false]],
        'print() goes to your terminal, not to the client — a common first confusion.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_JSON',
    notes: `A browser can show plain text or HTML to a person. But most backends today are called
by **other programs** — a mobile app, a JavaScript page, another server — and those need data in a
shape they can read reliably. That shape is almost always **JSON**.

    from flask import Flask, jsonify

    app = Flask(__name__)
    NOTES = [{"id": 1, "text": "Buy milk", "done": False}]

    @app.get("/notes")
    def list_notes():
        return jsonify(NOTES)

\`jsonify\` turns Python lists and dictionaries into JSON **and** sets the
\`Content-Type: application/json\` header, which tells the client how to read the body. In recent
Flask versions, returning a dict directly does the same.

**Python and JSON are close, but not identical:**

| Python | JSON |
|---|---|
| \`True\` / \`False\` | \`true\` / \`false\` |
| \`None\` | \`null\` |
| dict, list, str, int, float | object, array, string, number |
| datetime, set, custom objects | **not allowed** — convert them first |

Returning a \`datetime\` or a \`set\` raises an error, because JSON has no such types. Convert
dates to ISO strings (\`"2026-09-21"\`) and sets to lists.

**Keep the shape consistent.** The client is code, and code breaks on surprises:

- A field that is sometimes a number and sometimes a string.
- A list endpoint that returns an object when there is exactly one item.
- An error that comes back as HTML while successes are JSON.

Pick a shape and keep it. A common one for errors:

    {"error": "note_not_found", "message": "No note with id 42"}

A **code** for programs to switch on, and a **message** for people to read.

**Never put secrets in a response** just because the client "will not show them". Returning a
full user record, password hash included, and hiding it in the app is a leak: anyone can read the
raw response.`,
    mcqs: [
      mcq('Besides converting data, what does `jsonify` add to the response?',
        [['A Content-Type header saying the body is JSON', true],
          ['A signature proving the data came from your server', false],
          ['Compression so that the response is smaller', false],
          ['A cache header so browsers keep the response', false]],
        'The header is what tells the client to parse the body as JSON rather than treat it as text.'),
      mcq('A handler returns `{"created": datetime.now()}`. What happens?',
        [['It fails, because JSON has no datetime type', true],
          ['The date is sent as a JSON date object', false],
          ['The field is silently left out of the response', false],
          ['The date is sent as the number of seconds', false]],
        'Convert it yourself — usually to an ISO string — so the format is a decision you made.'),
      mcq('Python `None` appears in JSON as:',
        [['null', true], ['None', false], ['""', false], ['0', false]],
        'Likewise True and False become lowercase true and false.'),
      mcq('Why is returning a full user record and "hiding" the password hash in the app a problem?',
        [['Anyone can read the raw response, hash included', true],
          ['The app becomes slower when it hides fields', false],
          ['JSON cannot contain hashes, so it will fail', false],
          ['Browsers refuse responses with password fields', false]],
        'What the app displays is irrelevant; what the server sends is what leaks. Send only what is needed.'),
    ],
    checkpoint: [
      mcq('A list endpoint returns an object instead of an array when there is only one item. The client:',
        [['Breaks, because it expects the same shape every time', true],
          ['Adapts, since JSON clients detect the shape by default', false],
          ['Works, because one item and a list are the same in JSON', false],
          ['Shows a warning, then converts the object into a list', false]],
        'Consistency is part of the contract. A shape that changes with the data is a bug waiting for the one-item case.'),
      mcq('A good JSON error body contains:',
        [['A code for programs and a message for people', true],
          ['The full Python traceback, to help the client', false],
          ['Only an HTTP status code and nothing else', false],
          ['An HTML page, so a browser can display it', false]],
        'A traceback leaks your code; a lone status code gives the person no idea what to do next.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_READING_INPUT',
    notes: `A request can carry input in three places, and Flask reads each one differently.

**1. The path** — identifies *which* thing:

    @app.get("/notes/<int:note_id>")
    def get_note(note_id): ...

**2. The query string** — options for *how* to answer, after the \`?\`:

    # GET /notes?done=true&limit=10
    done = request.args.get("done")          # "true"  (a string!)
    limit = request.args.get("limit", "20")  # default when absent

**3. The body** — the data being sent, usually JSON on POST and PUT:

    @app.post("/notes")
    def create_note():
        data = request.get_json(silent=True)
        if data is None:
            return {"error": "invalid_json", "message": "Send a JSON body"}, 400
        ...

\`silent=True\` returns \`None\` for a missing or malformed body instead of raising, so your code
decides the response.

**Everything from the query string is a string.** \`limit\` above is \`"20"\`, not \`20\`. Compare it
with a number and you get a bug, not an error:

    int(request.args.get("limit", "20"))   # convert — and handle "abc"

**Validate every field before using it.** The client may send nothing, the wrong type, an empty
string, a huge value, or fields you never asked for.

    text = data.get("text")
    if not isinstance(text, str) or not text.strip():
        return {"error": "text_required", "message": "text must be a non-empty string"}, 400
    if len(text) > 500:
        return {"error": "text_too_long", "message": "text must be 500 characters or fewer"}, 400

**Only take the fields you expect.** Copying the whole body into your record lets a client set
fields you never meant them to — \`"is_admin": true\` is the classic example. Pick each field by
name.

**The order that keeps handlers readable:** read the input, reject anything wrong with a clear
error, and only then do the work. A handler whose happy path is buried inside five nested ifs
is harder to check than one that returns early on each problem.`,
    mcqs: [
      mcq('For GET /notes?limit=5, what is `request.args.get("limit")`?',
        [['The string "5"', true], ['The integer 5', false], ['A list containing 5', false], ['None, until converted', false]],
        'Query values are always strings. Convert them deliberately, and decide what happens when conversion fails.'),
      mcq('Which part of a request usually says *which* record is wanted?',
        [['The path, as in /notes/42', true],
          ['The query string, as in ?sort=new', false],
          ['A request header such as Accept', false],
          ['The response body from the last call', false]],
        'Path identifies the resource; query options shape how it is returned; the body carries data being sent.'),
      mcq('What does `request.get_json(silent=True)` return for a malformed body?',
        [['None, so your code chooses the response', true],
          ['An empty dict, as if nothing had been sent', false],
          ['The raw text of the body, left unparsed', false],
          ['It raises an error that stops the request', false]],
        'Getting None lets you send a clear 400 of your own rather than a generic framework error.'),
      mcq('Why pick fields by name instead of saving the whole request body?',
        [['So a client cannot set fields you never meant to accept', true],
          ['Because a whole body is too large for the database', false],
          ['Because JSON bodies cannot contain boolean values', false],
          ['So the response is faster when the record is read back', false]],
        'Mass assignment — a client quietly setting is_admin or price — comes from saving whatever arrived.'),
    ],
    checkpoint: [
      mcq('A request body is {"text": ""}. Your note handler should:',
        [['Reject it with 400, since the text is empty', true],
          ['Save it, because the text field is present', false],
          ['Replace the empty text with a default note', false],
          ['Return 500, since the input caused a problem', false]],
        'Present is not the same as valid. An empty string is exactly the kind of input validation exists for.'),
      mcq('Why is `if limit > 10:` a bug when limit came from the query string?',
        [['limit is a string, so comparing it to a number is wrong', true],
          ['Query parameters cannot be compared in a handler', false],
          ['The comparison should use >= rather than >', false],
          ['limit is always None until the body is parsed', false]],
        'Convert first with int(), inside a check that handles a value like "abc".'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_STATUS_CODES',
    notes: `The status code is the first thing a client reads, and programs make decisions on it
before they look at the body. A wrong code is a wrong answer, even if the body is right.

**The families:**

| Range | Meaning | Whose fault |
|---|---|---|
| 2xx | It worked | — |
| 4xx | The request was wrong | The client's |
| 5xx | The server failed | Yours |

**The ones you will actually use:**

| Code | When |
|---|---|
| 200 OK | A read or update succeeded |
| 201 Created | A POST created something — say where it is |
| 204 No Content | It worked and there is nothing to return (often DELETE) |
| 400 Bad Request | The input is invalid |
| 401 Unauthorized | Not logged in — "who are you?" |
| 403 Forbidden | Logged in, but not allowed — "I know who you are, and no" |
| 404 Not Found | That thing does not exist |
| 409 Conflict | It clashes with the current state (a username already taken) |
| 500 Internal Server Error | Your code failed |

In Flask, return a tuple: \`return {"id": 7}, 201\`.

**Never send 200 with an error inside.** \`200 {"error": "not found"}\` tells every client,
proxy, monitor and log that it worked. Retry logic will not retry; dashboards will show zero
errors; the mobile app will try to display a note that does not exist.

**400 versus 500 is about fault, not severity.** If the client sent a letter where a number
belongs, that is 400 — even though your code would have crashed without the check. A 500 means
your server has a bug or a dependency failed, and it should appear in *your* alerts.

**401 versus 403** trips everyone once. 401: no valid login at all. 403: a valid login that
lacks permission. Sending 401 to a logged-in user makes the app log them out, which is the wrong
fix.

**404 or 403 for someone else's record?** Often 404. Saying "forbidden" confirms the record
exists, which is itself information an attacker can use.`,
    mcqs: [
      mcq('A POST successfully creates a note. The best status code is:',
        [['201 Created', true], ['200 OK', false], ['204 No Content', false], ['202 Accepted', false]],
        '201 says something new now exists, which is more than "it worked".'),
      mcq('A logged-in student requests an admin-only page. The response should be:',
        [['403 Forbidden', true], ['401 Unauthorized', false], ['404 Not Found', false], ['400 Bad Request', false]],
        'They are identified — so not 401 — but not permitted. 401 would push the app to log them out.'),
      mcq('The client sends {"age": "twenty"} where a number is required. That is:',
        [['400, because the request is at fault', true],
          ['500, because the code would have crashed', false],
          ['200, with an error message in the body', false],
          ['404, because no such age can be found', false]],
        'Fault decides the family. Invalid input is the client\'s problem to fix, so it is a 4xx.'),
      mcq('Signing up with a username that already exists should return:',
        [['409 Conflict', true], ['400 Bad Request', false], ['500 Internal Server Error', false], ['201 Created', false]],
        'The input is well-formed; it clashes with existing state. 409 lets the app say exactly that.'),
    ],
    checkpoint: [
      mcq('What is wrong with returning `200 {"error": "not found"}`?',
        [['Every client and monitor is told the request worked', true],
          ['JSON bodies are not allowed on a 200 response', false],
          ['The error key must be in capital letters', false],
          ['Nothing, as long as the client reads the body', false]],
        'Retries, dashboards and apps all branch on the code first. A success code with an error inside misleads all of them.'),
      mcq('A database outage makes a handler fail. The client should receive:',
        [['A 5xx, because the fault is on the server side', true],
          ['A 4xx, because the request could not be completed', false],
          ['A 200, with an empty list in place of the data', false],
          ['A 404, because the data could not be found', false]],
        'An empty 200 would tell the client there is genuinely no data — a lie that looks like success.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_KEEPING_DATA',
    notes: `A Python list at the top of your file is the easiest place to keep data — and it forgets
everything the moment the server restarts. Every deploy, crash or \`Ctrl+C\` empties it.

**What memory is fine for:** a demo, a cache you can rebuild, a counter you do not care about.
**What it is not fine for:** anything a user created and expects to find tomorrow.

**SQLite: a real database in one file**, built into Python, nothing to install:

    import sqlite3

    def db():
        conn = sqlite3.connect("notes.db")
        conn.row_factory = sqlite3.Row
        return conn

    with db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0)""")

**Using it in routes:**

    @app.get("/notes")
    def list_notes():
        with db() as conn:
            rows = conn.execute("SELECT id, text, done FROM notes").fetchall()
        return [dict(r) for r in rows]

    @app.post("/notes")
    def create_note():
        data = request.get_json(silent=True) or {}
        text = data.get("text")
        if not isinstance(text, str) or not text.strip():
            return {"error": "text_required", "message": "text must not be empty"}, 400
        with db() as conn:
            cur = conn.execute("INSERT INTO notes (text) VALUES (?)", (text.strip(),))
        return {"id": cur.lastrowid, "text": text.strip(), "done": False}, 201

**The \`?\` is not optional.** It passes the value separately from the SQL, so text like
\`'); DROP TABLE notes; --\` is stored as text rather than run as a command. Building SQL with
an f-string is how SQL injection happens. (The Security topic covers why in depth.)

**\`with db() as conn\`** commits when the block succeeds and rolls back if it raises — so a
half-finished write does not stay behind.

**The database checks things too.** \`NOT NULL\` refuses a note with no text even if your
handler forgets to check. Validation in the handler gives a good error message; constraints in
the database are the last line of defence. Use both.

**What SQLite is not for:** many servers writing at once, or very heavy traffic. For a first
backend and plenty of real small apps, it is exactly right.`,
    mcqs: [
      mcq('Notes are kept in a Python list. What happens when the server restarts?',
        [['They are gone, because the list lived in memory', true],
          ['They are saved automatically to a temporary file', false],
          ['They are kept until the computer itself is turned off', false],
          ['Flask reloads them from its own internal cache', false]],
        'Memory belongs to the running process. A restart is a new process with a fresh, empty list.'),
      mcq('Why write `VALUES (?)` with the value passed separately?',
        [['So the value is stored as data and never run as SQL', true],
          ['Because SQLite cannot read values inside the SQL text', false],
          ['So the query runs faster on very large tables', false],
          ['Because the question mark marks the value as required', false]],
        'Parameters keep data and code apart. That separation is the whole defence against SQL injection.'),
      mcq('What does `with db() as conn:` do if the code inside raises an error?',
        [['Rolls the transaction back, so no half-finished write remains', true],
          ['Commits whatever had been written before the error happened', false],
          ['Deletes the database file so it can be created again', false],
          ['Retries the block once more before giving up on it', false]],
        'Committing only on success is what keeps a failed request from leaving partial data behind.'),
      mcq('Your handler validates text, and the column is also NOT NULL. Why both?',
        [['The handler gives a clear error; the constraint catches what it misses', true],
          ['The constraint is ignored unless the handler checks first', false],
          ['NOT NULL only applies to numbers, so text needs the handler', false],
          ['They are redundant, so one of them should be removed', false]],
        'Different jobs: one explains the problem to the client, the other guarantees the rule whatever code runs.'),
    ],
    checkpoint: [
      mcq('Which query is safe to run with text taken from the request?',
        [['conn.execute("INSERT INTO notes (text) VALUES (?)", (text,))', true],
          ['conn.execute(f"INSERT INTO notes (text) VALUES (\'{text}\')")', false],
          ['conn.execute("INSERT INTO notes (text) VALUES (\'" + text + "\')")', false],
          ['conn.execute("INSERT INTO notes (text) VALUES (%s)" % text)', false]],
        'Only the parameterised form keeps the value out of the SQL text. The other three paste it in.'),
      mcq('For which of these is keeping data only in memory acceptable?',
        [['A cache of results that can be rebuilt at any time', true],
          ['Orders that customers placed and paid for today', false],
          ['Accounts that students created to log in with', false],
          ['Messages that one user has sent to another', false]],
        'Anything a person created and expects to find again must survive a restart.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_DEBUGGING',
    notes: `When a request fails, the browser usually shows very little. The information is in two
places: **the server's terminal**, and **the response itself**. Look at both before changing any
code.

**Read the traceback from the bottom up.** The last line is the error; the lines above it are
where it happened, most recent last.

    File "app.py", line 21, in create_note
        text = data["text"]
    TypeError: 'NoneType' object is not subscriptable

Bottom line: something was \`None\` and was indexed. One line up: \`data\` in \`create_note\`.
So \`data\` was \`None\` — the body was missing or was not JSON. The fix is a check, not a
try/except around everything.

**Reproduce the failing request on purpose.** Clicking through the app to trigger it again is
slow and hides details. Send it directly and change one thing at a time:

    curl -X POST http://127.0.0.1:5000/notes \\
         -H "Content-Type: application/json" \\
         -d '{"text": "hello"}'

Tools like Postman or Thunder Client do the same with a form. Once you can trigger the bug in
one command, you can see instantly whether a change fixed it.

**The usual suspects, by symptom:**

| Symptom | Likely cause |
|---|---|
| 404 on a route you wrote | Typo in the path, or missing leading slash |
| 405 | The route does not list that method |
| 415 or get_json is None | Missing Content-Type: application/json |
| 500 with a traceback | Your code raised — read the last line |
| Works once, fails after restart | Data only in memory |
| Works for you, not for the app | The app sends a different shape than you assumed |

**Log what arrived** when you are unsure. \`print(request.method, request.path, request.get_json(silent=True))\`
at the top of a handler settles "what did the client actually send?" in seconds. Remove it
afterwards.

**Do not wrap everything in \`try: ... except: pass\`.** It turns a clear traceback into a
silent wrong answer, which is the hardest kind of bug to find.`,
    mcqs: [
      mcq('In a Python traceback, where is the actual error message?',
        [['On the last line', true], ['On the first line', false], ['In the middle', false], ['In the browser tab', false]],
        'Read bottom-up: the error last, then the line that raised it just above.'),
      mcq('`get_json()` returns None although you sent JSON with curl. Check first:',
        [['That the Content-Type header is application/json', true],
          ['That the server is running in debug mode', false],
          ['That the JSON keys are written in capitals', false],
          ['That the request used GET rather than POST', false]],
        'Without the header Flask does not treat the body as JSON, however valid the text is.'),
      mcq('Why reproduce a failing request with curl rather than through the app?',
        [['You can repeat it instantly and change one thing at a time', true],
          ['curl requests are allowed to skip validation', false],
          ['The app hides the status code from the server', false],
          ['Servers log curl requests in more detail than others', false]],
        'A one-command reproduction turns "try it again in the app" into a fast, exact experiment.'),
      mcq('Wrapping a handler in `try: ... except: pass` usually:',
        [['Hides the real error and returns a silent wrong answer', true],
          ['Fixes the error, as long as the server keeps running', false],
          ['Logs the error in more detail than a traceback does', false],
          ['Makes the request return 400 instead of 500', false]],
        'It removes the most useful clue you had. Catch only what you can handle, and log the rest.'),
    ],
    checkpoint: [
      mcq('Every note disappears after you restart the server. The most likely cause is:',
        [['The notes were only ever stored in memory', true],
          ['Flask deletes the database file on each start', false],
          ['The GET route is reading from the wrong port', false],
          ['The notes table has no primary key column', false]],
        'Data that survives until restart and no longer was never persisted in the first place.'),
      mcq('A route you wrote returns 404. The first thing to check is:',
        [['The exact path in the decorator against the request URL', true],
          ['Whether the database table exists and has rows', false],
          ['Whether the handler returns a dict or a tuple', false],
          ['Whether debug mode was switched on before starting', false]],
        '404 means no route matched. The handler never ran, so nothing inside it can be the cause.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_PRACTICE',
    notes: `No new ideas. Build small endpoints until each step — read, check, do, respond — is a
habit rather than something you remember to do.

**Build each of these as its own route, with SQLite where data must persist:**

1. **GET /health** — returns \`{"status": "ok"}\`. The simplest possible check that the server is up.
2. **GET /greet?name=Asha** — returns a greeting; 400 if \`name\` is missing or empty.
3. **POST /add** — body \`{"a": 2, "b": 3}\` returns \`{"sum": 5}\`; 400 if either is missing or not a number.
4. **CRUD for bookmarks** — \`{title, url}\`: list, create, read one, delete. 404 for an unknown id.
5. **GET /bookmarks?search=python** — filters by title, case-insensitively.
6. **PATCH /bookmarks/<id>** — updates only the fields sent; 400 if none are.

**For every endpoint, test these cases before calling it done:**

| Case | Expected |
|---|---|
| Valid input | 200 or 201 with the right shape |
| Field missing | 400 with a message saying which |
| Wrong type (text where a number goes) | 400 |
| Empty string | 400 |
| Unknown id | 404 |
| Body that is not JSON | 400, not 500 |
| Restart, then read again | Data still there |

**Keep a small file of curl commands** — one per case. Re-running them after every change is
the cheapest test suite there is, and the habit leads straight into automated testing later.

**Watch for the two slips that practice exposes:** converting query strings (they are always
strings) and returning the right status code on the error path, not just a message.`,
    mcqs: [
      mcq('POST /add receives {"a": 2}. The response should be:',
        [['400, explaining that b is missing', true],
          ['200 with a sum of 2, treating b as zero', false],
          ['500, because the addition cannot happen', false],
          ['201, since the request was received', false]],
        'Silently treating missing input as zero produces answers nobody asked for.'),
      mcq('PATCH /bookmarks/5 receives an empty JSON object. It should:',
        [['Return 400, since there is nothing to update', true],
          ['Return 200 and leave the bookmark unchanged', false],
          ['Clear every field of bookmark 5 to empty', false],
          ['Delete bookmark 5, as nothing was provided', false]],
        'An update with no fields is almost always a client mistake worth reporting.'),
      mcq('GET /bookmarks/999 for a bookmark that does not exist returns:',
        [['404 with an error body', true], ['200 with null', false], ['500 with a traceback', false], ['204 with no body', false]],
        'The request was well-formed; the thing does not exist. That is precisely 404.'),
      mcq('A body that is not valid JSON should produce:',
        [['400, because the client sent something unreadable', true],
          ['500, because parsing threw an exception', false],
          ['200, with the body treated as plain text', false],
          ['405, because the method cannot take text', false]],
        'Catching bad JSON with get_json(silent=True) is what turns an accidental 500 into a correct 400.'),
      mcq('Why keep a file of curl commands for your endpoints?',
        [['To re-run every case quickly after each change', true],
          ['Because Flask needs them to register routes', false],
          ['So the server can load its test data from them', false],
          ['Because browsers cannot send GET requests', false]],
        'It is a test suite in its simplest form — and it catches the change that broke an old case.'),
    ],
    checkpoint: [
      mcq('A search endpoint gets ?search=PYTHON but titles are stored as "Python tips". To match, it should:',
        [['Compare both in the same case, such as lower case', true],
          ['Require the client to send the exact title case', false],
          ['Store every title in capitals when it is saved', false],
          ['Return 400, since the case does not match', false]],
        'Case-insensitive matching belongs to the comparison, not to changing what users typed.'),
      mcq('Which test case most often turns into an accidental 500?',
        [['A body that is not valid JSON', true],
          ['A valid request for an existing record', false],
          ['A GET request with no query string', false],
          ['A health check sent twice in a row', false]],
        'Unhandled parsing errors surface as 500s. The fix is to detect bad input and answer 400.'),
    ],
  },
  {
    unitCode: 'T_FIRST_BACKEND_MINI_PROJECT',
    notes: `One small API for something real, built so that another program could depend on it.

**Why an API rather than a website.** A page can hide a sloppy backend behind a friendly
screen. An API cannot: every status code, every field name and every error is the product. It is
the most honest test of whether the ideas in this topic stuck.

**What "could depend on it" means:**

- Every response is JSON with a consistent shape
- Every error has the right status code and a message saying what to fix
- Invalid input is rejected, never stored
- Data survives a restart
- Another person could use it from your README alone

**Build it in this order:**

1. **Design first, on paper.** List every endpoint: method, path, input, success response,
   each error. This table becomes your README.
2. **Database table and one GET.** Prove data comes back out.
3. **POST with full validation.** The rejection paths are most of the work.
4. **The remaining endpoints.**
5. **Your curl file**, covering every row of your design table — including every error.

**Resist adding features.** A four-endpoint API where every case is right scores far higher than
a ten-endpoint one where errors return 500.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Small API',
      description: 'Build a small JSON API with Flask and SQLite for something real. Assessed on correctness of every response — including every error — not on the number of features.',
      instructions: `**The brief**

Build ONE of these, or something of comparable scope:

- **Study tracker** — subjects and study sessions (subject, minutes, date)
- **Library** — books and loans (who borrowed what, when it is due)
- **Event sign-up** — events with a capacity, and registrations that must not exceed it

**Requirements**

1. **Flask and SQLite.** Data must survive a restart.
2. **At least five endpoints**, covering list, create, read one, update and delete.
3. **Validation on every input**: missing fields, wrong types, empty strings, values out of range.
4. **Correct status codes**: 200, 201, 204, 400, 404 and 409 where each applies.
5. **One business rule enforced by the server**, e.g. capacity not exceeded, a book cannot be
   loaned twice, minutes must be positive.
6. **Consistent JSON**: the same shape for every success of a kind, and one error shape
   everywhere — \`{"error": "...", "message": "..."}\`.
7. **Parameterised queries only.** No SQL built from strings.
8. **debug mode off** in the version you submit.

**What to submit**

1. \`app.py\` and any other source files, plus \`requirements.txt\`.
2. A **README** with the endpoint table: method, path, input, success response, errors.
3. A **curl file** with a command for every row of the table, including every error case,
   and the response you observed for each.
4. A **short write-up** (250–350 words): the business rule and how you enforced it; one bug you
   found with your curl file and how you fixed it; one thing you chose not to validate and why.

**Constraints**

- No framework beyond Flask; no ORM.
- No endpoint may return 500 for any input in your curl file.
- No record may be saved from input that failed validation.

**Where the marks are.** The error cases. An API that handles every wrong request correctly is
worth far more than one with more features that returns 500 or 200-with-an-error.`,
      rubric: [
        {
          criterion: 'Endpoint design and README',
          description: 'Clear endpoint table; conventional methods and paths; another person could use the API from the README alone.',
          maxPoints: 15,
        },
        {
          criterion: 'Validation',
          description: 'Missing, wrong-type, empty and out-of-range input rejected on every endpoint; only expected fields accepted; nothing invalid is ever stored.',
          maxPoints: 25,
        },
        {
          criterion: 'Status codes and error shape',
          description: 'Correct code for every outcome, including 201, 204, 404 and 409; one consistent error body; no 200-with-an-error.',
          maxPoints: 20,
        },
        {
          criterion: 'Persistence and safety',
          description: 'SQLite used correctly with parameterised queries; data survives restart; business rule enforced on the server; debug off.',
          maxPoints: 20,
        },
        {
          criterion: 'Test evidence and write-up',
          description: 'curl file covers every row including errors, with observed responses; write-up explains the rule, a real bug found, and a deliberate choice.',
          maxPoints: 20,
        },
      ],
      totalPoints: 100,
    },
  },
];
