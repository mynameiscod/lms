/**
 * Career-track content: FastAPI for the AI service (JT_FASTAPI), for Python Full Stack + AI.
 *
 * The architecture the whole Python AI half of the track uses: React → Django REST Framework (the
 * app, its users and data, on MySQL) → a separate FastAPI **AI service** that holds the model key
 * and does chat, structured output, streaming, RAG and the agent. Django calls the AI service
 * server-to-server with a service key. The React chat streams **directly from FastAPI**, authorised
 * by a short-lived token that Django issues to the logged-in user — Django is never in the middle
 * of a long stream.
 *
 * FastAPI 0.11x+ with Pydantic v2, pydantic-settings and httpx. Every FastAPI and Pydantic
 * behaviour claimed here — status codes, the 422 bodies, response filtering, dependency order,
 * lifespan, thread pool timing, CORS answers, the auth errors — was run with TestClient (FastAPI
 * 0.143, Pydantic 2.14, Starlette 1.8, httpx 0.28; PyJWT 2.15 for tokens), and the error texts are
 * copied from those runs. The Django side (the DRF views calling the service, the token view) was
 * run with APIRequestFactory on Django 5.2 / DRF 3.18 against an httpx MockTransport. No real model
 * is called anywhere; the model sits behind a dependency and is faked.
 *
 * Attribution: the topic declares the single skill FASTAPI, so no question names a skillKey.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_FASTAPI_BUNDLES: PilotBundle[] = [
  /* ── ROUTES_PYDANTIC ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_ROUTES_PYDANTIC',
    notes: `Your Django app already owns users, documents and permissions. The AI features — chat, summaries,
answers from documents, an agent — go into a **separate service**, and that service is written in
**FastAPI**. Why not just another Django app? Because the AI service spends almost all its time
*waiting* on a model provider, often streaming tokens for 10–30 seconds; FastAPI is async from the
ground up, validates every request and response with **Pydantic**, and streams naturally. Django stays
the app; FastAPI is the AI worker it calls.

    pip install "fastapi[standard]"      # FastAPI, Pydantic v2, uvicorn and the fastapi CLI
    fastapi dev main.py                  # dev server with reload on :8000
    uvicorn main:app --port 8001         # the same app, run the way production runs it

## Routes, path and query parameters

    from fastapi import FastAPI

    app = FastAPI(title="AI service")

    @app.get("/items/{item_id}")
    def read_item(item_id: int, q: str | None = None, limit: int = 10):
        return {"item_id": item_id, "q": q, "limit": limit}

The **type hints are the contract**. \`item_id\` appears in the path, so it is a path parameter;
\`q\` and \`limit\` are not in the path, so they are **query** parameters. A default makes a query
parameter optional; no default makes it required. FastAPI converts and validates each one:

    GET /items/5?q=hi      -> 200 {"item_id": 5, "q": "hi", "limit": 10}
    GET /items/5           -> 200 {"item_id": 5, "q": null, "limit": 10}
    GET /items/abc         -> 422
    GET /items/5?limit=ten -> 422

Constraints go in \`Annotated\` with \`Query\` (or \`Path\`):

    from typing import Annotated
    from fastapi import Query

    @app.get("/search")
    def search(q: Annotated[str, Query(min_length=2)],
               k: Annotated[int, Query(ge=1, le=20)] = 5):
        return {"q": q, "k": k}

## The 422 body — learn to read it

Every validation failure returns **422 Unprocessable Content** with the same shape: a \`detail\`
list, one entry per problem, all problems at once.

    GET /search?q=a&k=50
    422 {"detail": [
      {"type": "string_too_short", "loc": ["query", "q"],
       "msg": "String should have at least 2 characters", "input": "a", "ctx": {"min_length": 2}},
      {"type": "less_than_equal", "loc": ["query", "k"],
       "msg": "Input should be less than or equal to 20", "input": "50", "ctx": {"le": 20}}]}

    GET /items/abc
    422 {"detail": [{"type": "int_parsing", "loc": ["path", "item_id"],
         "msg": "Input should be a valid integer, unable to parse string as an integer", "input": "abc"}]}

\`loc\` tells you **where** (\`path\`, \`query\`, \`body\`, \`header\`) and **which field**; \`type\` is a
stable machine code (\`missing\`, \`int_parsing\`, \`string_too_short\`, \`json_invalid\`...) your Django
client can switch on; \`msg\` is for humans. A missing required field is
\`{"type": "missing", "loc": ["query", "q"], "msg": "Field required", "input": null}\`.

## Request bodies are Pydantic models

    from pydantic import BaseModel, Field

    class ChatRequest(BaseModel):
        message: str = Field(min_length=1, max_length=4000)
        temperature: float = Field(default=0.2, ge=0, le=1)
        max_tokens: int | None = Field(default=None, gt=0, le=2000)

    class ChatReply(BaseModel):
        reply: str
        model: str
        tokens_used: int

    @app.post("/chat", response_model=ChatReply, status_code=201)
    def chat(req: ChatRequest):
        return {"reply": f"echo: {req.message}", "model": "fake", "tokens_used": 3, "extra": "dropped"}

A parameter typed as a \`BaseModel\` is read from the **JSON body**. What happens to real requests:

    {"message": "hello"}                   -> 201 {"reply": "echo: hello", "model": "fake", "tokens_used": 3}
    {"message": "", "temperature": 2}      -> 422, two errors: loc ["body","message"] and ["body","temperature"]
    {}                                     -> 422 {"type": "missing", "loc": ["body", "message"], ...}
    {"message": "hi", "temperature": "0.5"} -> 201  (lax mode: a numeric string is converted)
    {"message": "hi", "junk": 1}           -> 201  (unknown keys are ignored by default)
    {"message":                            -> 422 {"type": "json_invalid", "msg": "JSON decode error", ...}
    no body at all                         -> 422 {"type": "missing", "loc": ["body"], ...}

To **reject** unknown keys — useful for an internal API where a typo should fail loudly — set
\`model_config = ConfigDict(extra="forbid")\`; the 422 then says
\`{"type": "extra_forbidden", "loc": ["body", "junk"], "msg": "Extra inputs are not permitted"}\`.

One model parameter means the body **is** that model. With two model parameters (\`def two(a: A, b: B)\`)
FastAPI expects them **embedded by name**: \`{"a": {...}, "b": {...}}\`; sending only the fields of one
gives two \`missing\` errors at \`["body", "a"]\` and \`["body", "b"]\`.

## Validators: field rules and cross-field rules

    from typing import Literal
    from pydantic import model_validator

    class SummariseRequest(BaseModel):
        text: str
        style: Literal["bullets", "paragraph"] = "bullets"
        max_words: int = 100
        min_words: int = 10

        @model_validator(mode="after")
        def check_range(self):
            if self.min_words > self.max_words:
                raise ValueError("min_words must not exceed max_words")
            return self

- \`Literal\` limits a string to fixed choices: \`"style": "poem"\` gives
  \`"msg": "Input should be 'bullets' or 'paragraph'"\` (\`type: literal_error\`).
- \`@field_validator("name")\` (a \`@classmethod\`) checks or cleans **one** field.
- \`@model_validator(mode="after")\` runs on the built model, so it sees **all** fields — the place for
  "min must not exceed max". Its \`ValueError\` becomes \`{"type": "value_error", "loc": ["body"],
  "msg": "Value error, min_words must not exceed max_words", ...}\` — note the \`loc\` is the whole body,
  and the message is prefixed with \`Value error, \`. Always \`return self\`.

## Responses: response_model, status codes, HTTPException

\`response_model\` is the **output contract**. FastAPI validates what you return against it and sends
**only its fields** — in the \`/chat\` example the \`"extra"\` key never leaves the service. That is how
you stop internal fields leaking:

    class DocOut(BaseModel):
        id: int
        title: str

    @app.get("/docs-db/{doc_id}", response_model=DocOut)
    def get_doc(doc_id: int):
        if doc_id not in DOCS:
            raise HTTPException(status_code=404, detail="Document not found")
        return DOCS[doc_id]      # a dict with owner_id, internal_notes, secret...

    GET /docs-db/1 -> 200 {"id": 1, "title": "Leave policy"}
    GET /docs-db/9 -> 404 {"detail": "Document not found"}

- \`response_model_exclude={"internal_notes"}\` drops fields from an existing model without writing a
  new one — handy, but a separate \`...Out\` model is clearer and documents itself.
- \`status_code=201\` on the decorator sets the success code; \`HTTPException(status_code, detail)\`
  ends the request with an error, and its body is \`{"detail": ...}\`.
- A return value that does **not** fit the \`response_model\` is a server bug and fails as a 500, not a
  422 — the client sent nothing wrong.

## model_dump and friends (Pydantic v2)

    m = ChatRequest(message="hi")
    m.model_dump()                    # {'message': 'hi', 'temperature': 0.2, 'max_tokens': None}
    m.model_dump(exclude_none=True)   # {'message': 'hi', 'temperature': 0.2}
    m.model_dump_json()               # '{"message":"hi","temperature":0.2,"max_tokens":null}'
    ChatRequest.model_validate({"message": "a"})                         # dict -> model
    ChatRequest.model_validate_json('{"message": "a", "temperature": 0.9}')  # JSON text -> model

\`model_dump(exclude_unset=True)\` keeps only the fields the client actually sent — exactly what a
PATCH needs. \`model_dump(mode="json")\` converts dates, decimals and enums to JSON-safe values. The
v1 names (\`.dict()\`, \`.json()\`, \`parse_obj\`) still run but emit \`PydanticDeprecatedSince20\`
warnings; write the v2 names.

## The automatic docs

FastAPI builds an **OpenAPI 3.1** document from your types: \`/openapi.json\` (the schema), \`/docs\`
(Swagger UI, try requests in the browser) and \`/redoc\`. Each POST is documented with its success code
and a **422** response automatically, and \`Field(min_length=1, max_length=4000)\` appears in the schema
as \`minLength\`/\`maxLength\`. The Django team reads this instead of asking you. For a service that is
not public, turn them off in production: \`FastAPI(docs_url=None, redoc_url=None, openapi_url=None)\`.`,
    workedExample: `**Problem:** Django needs \`POST /internal/ask\`: a question plus the ids of the documents to answer
from. Rules: the question is 3–500 characters and not just spaces, 1–10 document ids with no repeats,
\`top_k\` between 1 and 10 (default 4). The response is the answer and its sources — and the prompt the
service built must **never** be returned. An unknown document id is a 404.

**Solution:**

    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field, field_validator

    app = FastAPI(title="AI service")
    DOCS = {1: "Leave policy", 2: "Travel policy", 3: "Code of conduct"}

    class AskIn(BaseModel):
        question: str = Field(min_length=3, max_length=500)
        doc_ids: list[int] = Field(min_length=1, max_length=10)
        top_k: int = Field(default=4, ge=1, le=10)

        @field_validator("question")
        @classmethod
        def strip_question(cls, v: str) -> str:
            v = v.strip()
            if len(v) < 3:
                raise ValueError("question is blank")
            return v

        @field_validator("doc_ids")
        @classmethod
        def no_duplicates(cls, v: list[int]) -> list[int]:
            if len(set(v)) != len(v):
                raise ValueError("doc_ids must not repeat")
            return v

    class Source(BaseModel):
        doc_id: int
        title: str

    class AskOut(BaseModel):
        answer: str
        sources: list[Source]

    @app.post("/internal/ask", response_model=AskOut)
    def ask(body: AskIn):
        missing = [d for d in body.doc_ids if d not in DOCS]
        if missing:
            raise HTTPException(status_code=404, detail=f"Unknown documents: {missing}")
        prompt = f"Answer from {body.top_k} chunks: {body.question}"
        return {"answer": "Twenty days a year.",
                "sources": [{"doc_id": d, "title": DOCS[d], "score": 0.91} for d in body.doc_ids],
                "debug_prompt": prompt}

**Running it with TestClient:**

    {"question": "  How many leave days?  ", "doc_ids": [1, 2]}
      -> 200 {"answer": "Twenty days a year.",
              "sources": [{"doc_id": 1, "title": "Leave policy"}, {"doc_id": 2, "title": "Travel policy"}]}
    {"question": "How many?", "doc_ids": [1, 1]}
      -> 422 [{"type": "value_error", "loc": ["body", "doc_ids"], "msg": "Value error, doc_ids must not repeat", ...}]
    {"question": "     ", "doc_ids": [1]}
      -> 422 [{"type": "value_error", "loc": ["body", "question"], "msg": "Value error, question is blank", ...}]
    {"question": "How many?", "doc_ids": []}
      -> 422 [{"type": "too_short", "loc": ["body", "doc_ids"],
               "msg": "List should have at least 1 item after validation, not 0", ...}]
    {"question": "How many?", "doc_ids": [1, 9]}
      -> 404 {"detail": "Unknown documents: [9]"}

**Reasoning:**

- \`"     "\` is five characters, so \`min_length=3\` passes; the \`field_validator\` runs after it, strips
  and rejects. Field constraints first, then your validator — so a validator can rely on the type.
- \`debug_prompt\` and each source's \`score\` are in the returned dict but not in \`AskOut\`/\`Source\`, so
  \`response_model\` drops them. The prompt never reaches Django, and the OpenAPI schema for \`AskOut\`
  lists only \`answer\` and \`sources\`.
- The unknown id is a **404** raised by our code, not a 422: the body was well-formed; the thing it
  refers to does not exist. 422 means "your request does not match the schema".
- \`"doc_ids": ["2"]\` is accepted and converted to \`[2]\` (lax mode). If Django should be held to real
  integers, use \`list[StrictInt]\` or \`model_config = ConfigDict(strict=True)\`.`,
    mcqs: [
      mcq('An endpoint is declared as def read_item(item_id: int, q: str | None = None, limit: int = 10) on "/items/{item_id}". What does GET /items/5?limit=ten return?', [
        ['422 with loc ["query", "limit"] and type int_parsing', true],
        ['200 with "limit": 10, the bad value replaced by the default', false],
        ['400 with {"detail": "limit must be an integer"}', false],
        ['422 with loc ["path", "item_id"] because the path is checked first', false],
      ], 'limit is a query parameter typed int, so "ten" fails conversion and FastAPI answers 422 naming the location (query) and field (limit). Defaults are used only when a parameter is absent, never to replace a bad value.'),
      mcq('ChatRequest has message: str = Field(min_length=1, max_length=4000) and temperature: float = Field(default=0.2, ge=0, le=1). A POST sends {"message": "", "temperature": 2}. What comes back?', [
        ['One 422 whose detail list has two entries, one per field', true],
        ['A 422 for message only; temperature is checked after a fix', false],
        ['A 201, because temperature is clamped to 1 and message allowed', false],
        ['A 400 with the first error message as plain text', false],
      ], 'Pydantic validates every field and collects all failures, so the detail list holds string_too_short for message and less_than_equal for temperature in one response. Nothing is clamped.'),
      mcq('An endpoint has response_model=DocOut, where DocOut declares only id and title, and returns a dict that also holds owner_id and internal_notes. What does the client receive?', [
        ['Only id and title; the other keys are dropped', true],
        ['All four keys, since the dict is returned as-is', false],
        ['A 500, because the dict has fields DocOut lacks', false],
        ['A 422, because the response does not match the model', false],
      ], 'response_model filters the output down to the model\'s fields, which is how internal data is kept inside the service. Extra keys are not an error; a missing required field would be (a 500, since it is a server bug).'),
    ],
    checkpoint: [
      mcq('class SummariseRequest(BaseModel) has min_words and max_words and a @model_validator(mode="after") that raises ValueError("min_words must not exceed max_words"). A POST sends min_words 50 and max_words 20. What is the "loc" of the 422 error?', [
        ['["body"]', true],
        ['["body", "min_words"]', false],
        ['["body", "max_words"]', false],
        ['["body", "check_range"]', false],
      ], 'A model validator checks the model as a whole, so its error is located at the body itself, with msg "Value error, min_words must not exceed max_words". A field_validator would point at its field.'),
      mcq('def two(a: A, b: B) is a POST endpoint where A has x: int and B has y: int. Which JSON body is accepted?', [
        ['{"a": {"x": 1}, "b": {"y": 2}}', true],
        ['{"x": 1, "y": 2}', false],
        ['[{"x": 1}, {"y": 2}]', false],
        ['{"two": {"x": 1, "y": 2}}', false],
      ], 'With more than one body model, FastAPI embeds each under its parameter name. The flat body fails with missing errors at ["body", "a"] and ["body", "b"]; the keys are the parameter names, not the endpoint\'s name.'),
      mcq('A PATCH endpoint receives body: ProfilePatch, where every field has a default, and the client sent only {"display_name": "Asha"}. Which call gives exactly the fields to update?', [
        ['body.model_dump(exclude_unset=True)', true],
        ['body.model_dump(exclude_none=True)', false],
        ['body.model_dump(mode="json")', false],
        ['body.dict()', false],
      ], 'exclude_unset keeps only fields the client actually sent, so defaults are not written back over stored values. exclude_none would still include defaults that are not None, and dict() is the deprecated v1 name for a full dump.'),
    ],
  },

  /* ── ASYNC_DEPENDENCIES ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_ASYNC_DEPENDENCIES',
    notes: `The AI service mostly waits: on the model provider, on a vector store, on Django. Async is how one
process waits on hundreds of those at once. It is also the easiest place in FastAPI to make a mistake
that only shows up under load.

## async def vs def — what FastAPI actually does

- An \`async def\` endpoint runs **on the event loop**. While it \`await\`s, the loop serves other requests.
- A plain \`def\` endpoint runs in a **thread pool** (AnyIO's worker threads), so a blocking call in it
  blocks only that thread.

Four requests at once against three endpoints that each "wait" half a second, timed with
\`httpx.AsyncClient\` and \`asyncio.gather\`:

    @app.get("/async-block")
    async def async_block():
        time.sleep(0.5)            # blocking call inside async def
        ...
    @app.get("/async-ok")
    async def async_ok():
        await asyncio.sleep(0.5)   # non-blocking wait
        ...
    @app.get("/sync-block")
    def sync_block():
        time.sleep(0.5)            # blocking, but in a worker thread
        ...

    /async-block  2.0 s   ran on MainThread, one after another
    /async-ok     0.5 s   ran on MainThread, overlapped
    /sync-block   0.5 s   ran on "AnyIO worker" threads, overlapped

The first line is the bug to fear. A blocking call inside \`async def\` freezes the **whole** service
for every user. Blocking calls include \`time.sleep\`, \`requests.get\`, a sync \`httpx.Client\`, the sync
\`OpenAI()\` client, PyMySQL/Django ORM calls, and reading a big file. Calling a sync \`httpx.Client\`
inside \`async def\` measured exactly like \`time.sleep\`: 2.0 s for four requests.

The rule:

1. Inside \`async def\`, only **awaitable** I/O: \`httpx.AsyncClient\`, \`AsyncOpenAI\`, async DB drivers.
2. If a library is sync only, either make the endpoint plain \`def\`, or push the call to a thread:
   \`await asyncio.to_thread(blocking_lib)\` or \`await run_in_threadpool(blocking_lib)\`
   (\`from fastapi.concurrency import run_in_threadpool\`) — both measured 0.5 s for four requests.
3. **CPU-heavy** work (embedding thousands of chunks locally, parsing a 200-page PDF) is neither: it
   holds the GIL. Run it in a separate worker process or job queue, not in the request.

The thread pool is finite (AnyIO's default limit is 40 threads), so \`def\` is safe but not free.

## Depends: dependency injection

A **dependency** is a function FastAPI calls for you before the endpoint, passing its result in.
Dependencies can depend on other dependencies, and FastAPI also runs their parameters through
validation (a dependency can read headers, query parameters, the request).

    from typing import Annotated
    from fastapi import Depends

    def get_settings() -> Settings: ...
    SettingsDep = Annotated[Settings, Depends(get_settings)]   # reusable alias

    @app.get("/model")
    def which_model(settings: SettingsDep):
        return {"model": settings.llm_model}

Within **one request** a dependency used in several places is called **once** and its result shared
(a counter dependency used directly and through a sub-dependency returned 1 and 1, then 2 and 2 on
the next request). Dependencies are where settings, clients, the current caller and the database
session come from — and, in tests, where you swap them for fakes.

## Settings with pydantic-settings

    from functools import lru_cache
    from pydantic import SecretStr
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_file=".env", env_prefix="AI_")
        llm_api_key: SecretStr
        llm_model: str = "small-model"
        llm_timeout_s: float = 20.0
        service_api_key: SecretStr

    @lru_cache
    def get_settings() -> Settings:
        return Settings()

- Values come from environment variables (\`AI_LLM_API_KEY\`, \`AI_LLM_TIMEOUT_S\`...) or \`.env\`, and are
  **converted and validated**: \`AI_LLM_TIMEOUT_S=7.5\` arrives as the float \`7.5\`.
- A missing required value fails **at startup** with a \`ValidationError\` listing every missing name
  (here \`llm_api_key\` and \`service_api_key\`, type \`missing\`) — not at 2 a.m. on the first request.
- \`SecretStr\` prints as \`SecretStr('**********')\` in logs, reprs and \`model_dump()\`; call
  \`.get_secret_value()\` only where the real key is needed.
- \`@lru_cache\` builds \`Settings\` **once** (calling \`get_settings()\` twice constructed it once), and
  the function stays a normal dependency that tests can override.

## One shared HTTP client, opened in lifespan

Creating an \`httpx.AsyncClient\` per request throws away connection pooling (a new TCP and TLS
handshake to the provider every time). Create one at startup and close it at shutdown with
**lifespan**:

    from contextlib import asynccontextmanager
    import httpx
    from fastapi import FastAPI, Request

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=3.0))
        yield                                  # the app serves requests here
        await app.state.http.aclose()

    app = FastAPI(lifespan=lifespan)

    def get_http(request: Request) -> httpx.AsyncClient:
        return request.app.state.http

    HttpDep = Annotated[httpx.AsyncClient, Depends(get_http)]

(\`@app.on_event("startup")\` is the older, deprecated way.) Endpoints never touch \`app.state\`
directly; they ask for \`HttpDep\`, which tests can replace.

## yield dependencies: setup and guaranteed cleanup

    async def get_audit():
        log = open_audit_log()
        try:
            yield log          # the endpoint runs here
        finally:
            log.close()        # runs after the endpoint, even if it raised

Recorded order for a normal request and one that raised \`HTTPException(500)\`:
\`audit open, endpoint, audit closed\` both times. Use this shape for a DB session, a lock, a temporary
file. With a \`StreamingResponse\` the cleanup waited until the **stream finished**
(\`open, chunk0, chunk1, chunk2, close\`) — what you want for a session the stream uses; recent
FastAPI versions let you write \`Depends(dep, scope="function")\` to close it as soon as the endpoint
function returns instead.

## Timeouts on every outbound call

httpx's default is **5 seconds** for connect, read, write and pool (\`Timeout(timeout=5.0)\`). A model
answer often takes longer, so set it deliberately; \`httpx.Timeout(10.0, connect=2.0)\` means
\`Timeout(connect=2.0, read=10.0, write=10.0, pool=10.0)\`: fail fast if the host is unreachable, wait
longer for the answer. Then **translate** failures into honest status codes:

    @app.post("/chat")
    async def chat(msg: Msg, http: HttpDep):
        try:
            r = await http.post(f"{settings.llm_base_url}/chat/completions", json=...)
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="The model took too long to answer")
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="The model provider failed")

\`httpx.ReadTimeout\` → \`TimeoutException\` → \`TransportError\` → \`RequestError\` → \`HTTPError\`;
\`httpx.ConnectError\` is a \`NetworkError\`, **not** a timeout, so catch \`TimeoutException\` first and
\`HTTPError\` as the fallback. One more subtlety: httpx timeouts are per operation (the read timeout is
the gap between bytes), not a total budget. A slow trickle can exceed 20 s without tripping
\`read=20\`; for a hard total limit wrap the call in \`asyncio.timeout(30)\` (Python 3.11+) or
\`asyncio.wait_for\`.`,
    mcqs: [
      mcq('Four requests hit async def slow(): time.sleep(0.5); return {...} at the same moment, on one worker process. About how long until all four have answered?', [
        ['About 2 seconds; each sleep blocks the event loop in turn', true],
        ['About 0.5 seconds; FastAPI runs async endpoints in threads', false],
        ['About 0.5 seconds; time.sleep yields inside async def', false],
        ['About 1 second; the loop interleaves two at a time', false],
      ], 'An async def endpoint runs on the event loop thread, and time.sleep blocks that thread, so the four run one after another (measured 2.0 s). The same body in a plain def endpoint runs in the thread pool and finishes in about 0.5 s.'),
      mcq('get_settings is decorated with @lru_cache and returns Settings(), a pydantic-settings class with a required llm_api_key. Two endpoints depend on it across many requests. How many times is Settings constructed?', [
        ['Once, and every later call returns the cached object', true],
        ['Once per request, since dependencies are per request', false],
        ['Once per endpoint that declares the dependency', false],
        ['Every call; lru_cache ignores functions without arguments', false],
      ], 'lru_cache memoises the zero-argument call, so the environment is read and validated once per process. FastAPI\'s own per-request caching only avoids duplicate calls within one request.'),
      mcq('lifespan opens app.state.http = httpx.AsyncClient(...) before yield and closes it after. What is the main reason not to create a new AsyncClient inside every request instead?', [
        ['A shared client reuses pooled connections to the provider', true],
        ['httpx forbids more than one AsyncClient per process', false],
        ['A per-request client cannot send JSON bodies', false],
        ['Clients made in a request ignore the timeout setting', false],
      ], 'Each new client starts with an empty connection pool, paying a TCP and TLS handshake to the model provider on every request. One client per process keeps connections alive and is closed cleanly at shutdown.'),
    ],
    checkpoint: [
      mcq('An async def endpoint calls the provider through a sync httpx.Client, and the service slows to a crawl under load. Which change fixes it while keeping the endpoint async?', [
        ['Use httpx.AsyncClient and await the call', true],
        ['Add a larger timeout to the sync httpx.Client', false],
        ['Run uvicorn with --reload so requests restart faster', false],
        ['Wrap the endpoint body in try/except httpx.HTTPError', false],
      ], 'The sync client blocks the event loop exactly like time.sleep (measured 2.0 s for four concurrent requests). An awaited AsyncClient call lets the loop serve other requests while waiting; asyncio.to_thread is the fallback for libraries with no async API.'),
      mcq('client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=2.0)). The model host accepts the connection, then takes 15 seconds before sending a single byte of its answer. What happens?', [
        ['httpx.ReadTimeout after about 10 seconds', true],
        ['httpx.ConnectTimeout after about 2 seconds', false],
        ['The answer arrives; 10 s is the total budget', false],
        ['The call waits forever, as httpx has no read timeout', false],
      ], 'Timeout(10.0, connect=2.0) sets connect=2 and read, write and pool to 10. The connection succeeded, so the 15-second wait for data trips the 10-second read timeout and raises ReadTimeout, a TimeoutException.'),
      mcq('A yield dependency opens an audit log, yields it, and closes it in finally. The endpoint using it raises HTTPException(500). In what order do the events happen?', [
        ['open, endpoint, close — cleanup still runs', true],
        ['open, endpoint — close is skipped on an error', false],
        ['open, close, endpoint — cleanup runs before it', false],
        ['endpoint only — the dependency is not entered', false],
      ], 'The code after yield runs once the endpoint is finished, whether it returned or raised; the finally block makes that explicit. The recorded order was open, endpoint, closed for both a normal and a failing request.'),
    ],
  },

  /* ── SERVICE_AUTH ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_SERVICE_AUTH',
    notes: `The AI service holds the model key, and every call to it spends money. "It is on the internal network"
is not security: a misconfigured ingress, a leaked URL or a compromised neighbour container is enough.
So every endpoint answers only to callers it can identify. There are exactly two kinds:

1. **Django, server to server** — summarise this document, answer this question for user 42. It
   proves itself with a **service API key** in a header.
2. **The browser, for the streaming chat** — React streams tokens straight from FastAPI (Django is not
   in the middle of a long stream). The user proves themselves with a **short-lived token that Django
   issued** a moment earlier.

## A service API key with APIKeyHeader

    import secrets
    from typing import Annotated
    from fastapi import Depends, HTTPException, Security
    from fastapi.security import APIKeyHeader

    api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

    def require_service(key: Annotated[str | None, Security(api_key_header)],
                        settings: Annotated[Settings, Depends(get_settings)]) -> None:
        if key is None or not secrets.compare_digest(key, settings.service_api_key.get_secret_value()):
            raise HTTPException(status_code=401, detail="Invalid service key")

    internal = APIRouter(prefix="/internal", dependencies=[Depends(require_service)])

    @internal.post("/summarise")
    def summarise(...): ...

    app.include_router(internal)

- \`APIKeyHeader\` reads the header (names are case-insensitive: \`x-api-key\` works too) **and**
  documents the scheme in \`/docs\`, where an "Authorize" button appears.
- \`auto_error=False\` hands you \`None\` for a missing header so **you** decide the answer. With the
  default \`auto_error=True\`, current FastAPI answers \`401 {"detail": "Not authenticated"}\` with
  \`WWW-Authenticate: APIKey\` (older versions answered 403).
- \`secrets.compare_digest\` compares in constant time, so response timing does not reveal how many
  leading characters were right.
- \`dependencies=[...]\` on the router protects **every** route under \`/internal\` — run against it:
  no key 401, right key 200, while \`/health\` outside the router stays open.

The key lives in Django's environment and the AI service's environment, nowhere else — never in
React, never in git. Rotate it by accepting two keys for a short overlap.

## The user's short-lived token, issued by Django

Django already knows who the user is (Simple JWT, session). When the chat page opens, React asks
Django for a **stream token**:

    # Django: ai/views.py  (PyJWT is already installed — Simple JWT depends on it)
    import time, jwt
    from django.conf import settings
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.response import Response
    from rest_framework.views import APIView

    class StreamTokenView(APIView):
        permission_classes = [IsAuthenticated]

        def post(self, request):
            now = int(time.time())
            token = jwt.encode({"sub": str(request.user.id), "aud": "ai-service", "scope": "chat",
                                "iat": now, "exp": now + 90},
                               settings.AI_STREAM_TOKEN_SECRET, algorithm="HS256")
            return Response({"token": token, "expires_in": 90,
                             "stream_url": f"{settings.AI_PUBLIC_URL}/chat/stream"})

The AI service verifies it in a dependency:

    import jwt
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

    bearer = HTTPBearer(auto_error=False)

    class Caller(BaseModel):
        sub: str
        scope: str

    def current_user(creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
                     settings: SettingsDep) -> Caller:
        if creds is None:
            raise HTTPException(401, "Missing token", headers={"WWW-Authenticate": "Bearer"})
        try:
            payload = jwt.decode(creds.credentials, settings.stream_token_secret.get_secret_value(),
                                 algorithms=["HS256"], audience="ai-service")
        except jwt.ExpiredSignatureError:
            raise HTTPException(401, "Token expired", headers={"WWW-Authenticate": "Bearer"})
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"})
        return Caller(**payload)

What PyJWT does with each bad token (all run):

- expired → \`ExpiredSignatureError: Signature has expired\` (a subclass of \`InvalidTokenError\`, so it
  must be caught **first** to give its own message);
- signed with another secret → \`InvalidSignatureError\` → our "Invalid token";
- no \`aud\` claim → \`MissingRequiredClaimError: Token is missing the "aud" claim\`;
- \`aud\` is \`"django"\` → \`InvalidAudienceError: Audience doesn't match\`;
- \`decode()\` without \`algorithms=\` → \`DecodeError: It is required that you pass in a value for the
  "algorithms" argument\`. Always pin the algorithm list.

Why a **separate** token and not the user's normal Simple JWT access token? The \`aud\` and \`scope\`
claims make it useless anywhere except the AI service's chat; 90 seconds limits the damage if it leaks;
and Simple JWT signs with Django's \`SECRET_KEY\` by default — you must **never** copy Django's
\`SECRET_KEY\` into another service. The stream secret is a separate value both services share.

**Shared secret vs public key.** With HS256 anything that holds the secret can also **mint** tokens.
For a stricter split, Django signs with an RSA private key (\`algorithm="RS256"\`) and the AI service
holds only the **public** key (\`jwt.decode(..., public_key, algorithms=["RS256"], ...)\`; PyJWT needs
the \`cryptography\` package for RS256). Then the AI service can verify but never forge.

Also check **scope** in the endpoint: a token with \`"scope": "read"\` reaching \`/chat/stream\` should
be a **403** ("Token not valid for chat") — the caller is known (not 401) but not allowed.

## The model key stays in one place

The LLM provider key exists **only** in the AI service's environment, typed \`SecretStr\`. Django never
has it; React certainly never has it. \`Settings.model_dump()\` shows \`SecretStr('**********')\`, so an
accidental log line leaks nothing. If the key leaks, you rotate it in one place.

## CORS for the streaming endpoint

React on \`https://app.example.com\` calls \`https://ai.example.com/chat/stream\` — a different origin.
The browser's \`EventSource\` cannot send an \`Authorization\` header, so the chat uses \`fetch()\` and
reads \`response.body\` as a stream (putting the token in the query string would write it into every
access log). An \`Authorization\` header makes the browser send a **preflight** \`OPTIONS\` first:

    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(CORSMiddleware,
                       allow_origins=["https://app.example.com"],
                       allow_methods=["POST"],
                       allow_headers=["Authorization", "Content-Type"])

Measured with TestClient:

- preflight from \`https://app.example.com\` asking for \`authorization,content-type\` → 200 with
  \`access-control-allow-origin: https://app.example.com\`;
- preflight from \`https://evil.example\` → \`400 Disallowed CORS origin\`;
- preflight asking for an unlisted header \`x-custom\` → \`400 Disallowed CORS headers\`;
- the streamed response itself carried \`access-control-allow-origin\` and
  \`content-type: text/event-stream; charset=utf-8\`.

**CORS is not authentication.** A plain GET from \`https://evil.example\` still ran and returned 200 —
only without the allow-origin header, so a *browser* hides the response. curl and scripts ignore CORS
entirely. The token check is what protects the endpoint; CORS only decides which web pages may read
the answer. No cookies are involved, so \`allow_credentials\` stays off.`,
    mcqs: [
      mcq('require_service uses APIKeyHeader(name="X-API-Key", auto_error=False) and raises 401 when the key is wrong. Django sends the header as "x-api-key: <correct key>". What happens?', [
        ['200 — HTTP header names are case-insensitive', true],
        ['401 — the header name must match the declared case', false],
        ['422 — FastAPI reports a missing header parameter', false],
        ['403 — APIKeyHeader rejects lowercase names', false],
      ], 'HTTP header names are case-insensitive and Starlette looks them up that way, so x-api-key matches X-API-Key. The run returned 200 for the lowercase name.'),
      mcq('The AI service decodes stream tokens with jwt.decode(token, secret, algorithms=["HS256"], audience="ai-service"). Django mistakenly issues a token with "aud": "django". What does PyJWT raise?', [
        ['InvalidAudienceError', true],
        ['ExpiredSignatureError', false],
        ['InvalidSignatureError', false],
        ['MissingRequiredClaimError', false],
      ], 'The signature is fine but the aud claim does not contain the expected audience, so PyJWT raises InvalidAudienceError ("Audience doesn\'t match"). MissingRequiredClaimError is for a token with no aud at all.'),
      mcq('CORSMiddleware allows only https://app.example.com. A script on another server calls GET /me on the AI service with a valid token and Origin: https://evil.example. What happens?', [
        ['It runs and returns 200, without an allow-origin header', true],
        ['It is refused with 400 Disallowed CORS origin', false],
        ['It is refused with 403 Forbidden by the CORS middleware itself', false],
        ['It is held until a preflight request succeeds', false],
      ], 'CORS only tells browsers which pages may read a response; it does not stop the request. The run returned 200 with no access-control-allow-origin header, so authentication must come from the token, not from CORS.'),
    ],
    checkpoint: [
      mcq('current_user catches jwt.InvalidTokenError first and jwt.ExpiredSignatureError second, with a different message for each. A user sends an expired token. Which message do they get?', [
        ['The InvalidTokenError one — ExpiredSignatureError is its subclass', true],
        ['The ExpiredSignatureError one — PyJWT picks the most specific', false],
        ['Neither; PyJWT returns the expired payload with a warning', false],
        ['Both; each except block that matches will run', false],
      ], 'Python uses the first matching except clause, and ExpiredSignatureError inherits from InvalidTokenError, so the general handler catches it. Put the specific ExpiredSignatureError clause first.'),
      mcq('A team proposes copying Django\'s SECRET_KEY into the AI service so it can verify the users\' normal Simple JWT access tokens. What is the main problem?', [
        ['Whoever holds SECRET_KEY can forge any Django token', true],
        ['FastAPI cannot read tokens signed with HS256', false],
        ['Simple JWT tokens cannot carry a sub claim', false],
        ['SECRET_KEY is too short to sign JWT tokens', false],
      ], 'Simple JWT signs with SECRET_KEY by default, and SECRET_KEY also protects sessions and password reset links. A dedicated stream secret, or RS256 with only the public key in the AI service, keeps a breach of the AI service from becoming a breach of Django.'),
      mcq('The React chat needs to stream from https://ai.example.com/chat/stream with Authorization: Bearer <token>. Why does it use fetch() and read response.body instead of EventSource?', [
        ['EventSource cannot set an Authorization header', true],
        ['EventSource cannot read text/event-stream replies', false],
        ['fetch() skips the CORS preflight for streams', false],
        ['FastAPI streams only to fetch() callers', false],
      ], 'The browser EventSource API offers no way to add custom headers, and moving the token into the URL leaks it into logs. fetch() can send the header (which triggers a preflight) and read the event stream incrementally.'),
    ],
  },

  /* ── DJANGO_CALLS_FASTAPI ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_DJANGO_CALLS_FASTAPI',
    notes: `Now the other side of the wire: Django, a synchronous app with a fixed number of worker processes,
calling a service that is sometimes slow and sometimes down.

## Why the AI lives in its own service

- **Different work.** Django answers in tens of milliseconds; a model call takes seconds and streams.
  Mixing them lets slow AI calls starve fast page loads.
- **Different scaling and deploys.** Scale the AI service on its own, redeploy a prompt change without
  touching the app.
- **One key holder.** Only the AI service knows the model key.

The price: a network hop that can fail. This unit is about paying that price well.

## The worker arithmetic

A typical Django deploy runs, say, 4 gunicorn sync workers. Each handles **one** request at a time.
If each worker is waiting 60 seconds on a hung AI service, the whole app — login, lists, everything —
answers nobody for a minute. gunicorn's default worker timeout is 30 seconds, after which it kills the
worker. So:

- every outbound call has a **timeout**, and the total (with retries) stays well under the worker
  timeout;
- **long** work never runs inside a Django request: the chat stream goes browser → FastAPI with a
  stream token (previous unit), and a slow batch job goes to a background queue.

## A client module with timeouts

    # ai/client.py
    import httpx
    from django.conf import settings

    class AIServiceUnavailable(Exception):
        pass

    _http = httpx.Client(base_url=settings.AI_SERVICE_URL,
                         headers={"X-API-Key": settings.AI_SERVICE_KEY},
                         timeout=httpx.Timeout(15.0, connect=2.0))

One module-level client keeps connections alive between requests in a worker. With \`requests\`
instead, note that it has **no default timeout** (\`timeout=None\` — wait forever); always pass
\`timeout=(2, 15)\` (connect, read).

## Retry — only what is safe to repeat

A retry helps with a blip (a 503 during the AI service's deploy, a dropped connection). It hurts when
the call is not **idempotent**: retrying "start a chat and charge a model call" may run it twice.

- Retry: \`GET /health\`, "summarise document 17's current text" (same input, same effect).
- Retry on: 502, 503, 504, timeouts, connection errors.
- **Never** retry a 4xx: a 422 or 401 means *our* request is wrong; sending it again gives the same
  answer.
- Back off: wait 0.5 s, then 1 s (plus a little random jitter so many workers do not retry in lock
  step), and stop after 2 retries.

    RETRYABLE = {502, 503, 504}

    def _send(self, method, path, *, json=None, retries=0):
        if not self.breaker.allow():
            raise AIServiceUnavailable("circuit open")
        for attempt in range(retries + 1):
            try:
                r = self.http.request(method, path, json=json)
                if r.status_code in RETRYABLE and attempt < retries:
                    self.sleep(0.5 * 2 ** attempt + random.uniform(0, 0.1))
                    continue
                if r.status_code >= 500:
                    self.breaker.record_failure()
                    raise AIServiceUnavailable(f"AI service returned {r.status_code}")
                r.raise_for_status()            # 4xx: our bug, raised, never retried
                self.breaker.record_success()
                return r.json()
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempt < retries:
                    self.sleep(0.5 * 2 ** attempt + random.uniform(0, 0.1))
                    continue
                self.breaker.record_failure()
                raise AIServiceUnavailable(str(exc)) from exc

    def summarise(self, doc_id, text):        # idempotent: retried
        return self._send("POST", "/internal/summarise", json={"doc_id": doc_id, "text": text}, retries=2)

    def start_chat(self, user_id, message):  # costs a model call: not retried
        return self._send("POST", "/internal/chat", json={"user_id": user_id, "message": message})

Run against an httpx \`MockTransport\` with scripted answers: 503, 503, 200 → success after **3** calls,
sleeping about 0.5 s then 1.0 s; a 422 → \`HTTPStatusError\` after **1** call; three read timeouts →
\`AIServiceUnavailable\` after 3 calls; \`start_chat\` with a refused connection → 1 call, no retry.
(If a non-idempotent call must be retried, send an **idempotency key** the service uses to drop
duplicates.) Libraries such as \`tenacity\` package the retry loop; the rules stay the same.

## A circuit breaker — stop knocking on a closed door

If the AI service is down, every request still waits for its timeout and retries — wasting workers
on a call that will fail. A **circuit breaker** counts consecutive failures; past a threshold it
**opens** and fails immediately for a cool-down period, then lets one trial call through
(**half-open**); success closes it again.

    class CircuitBreaker:
        def __init__(self, failure_threshold=5, reset_after=30.0, clock=time.monotonic):
            self.failure_threshold, self.reset_after, self.clock = failure_threshold, reset_after, clock
            self.failures, self.opened_at = 0, None

        def allow(self):
            if self.opened_at is None:
                return True
            return self.clock() - self.opened_at >= self.reset_after   # half-open after cool-down

        def record_success(self):
            self.failures, self.opened_at = 0, None

        def record_failure(self):
            self.failures += 1
            if self.failures >= self.failure_threshold:
                self.opened_at = self.clock()

With a threshold of 3 against a service returning 503, five calls gave: 503, 503, 503, then
\`circuit open\`, \`circuit open\` — only **3** HTTP calls were made. After the 30 s cool-down one trial
call went out (the 4th HTTP call), failed, and the circuit opened again. The breaker lives per worker
process here; a shared one (in Redis) is a later refinement.

## Fail gracefully — the user sees a message, not a 500

    class SummariseView(APIView):
        permission_classes = [IsAuthenticated]

        def post(self, request, pk):
            doc = get_object_or_404(Document, pk=pk, owner=request.user)
            try:
                result = ai.summarise(doc.id, doc.text)
            except AIServiceUnavailable:
                return Response({"code": "ai_unavailable",
                                 "message": "Summaries are unavailable right now. Please try again in a minute."},
                                status=503)
            doc.summary = result["summary"]
            doc.save(update_fields=["summary"])
            return Response({"summary": doc.summary})

Run with \`APIRequestFactory\`: service up → 200 with the summary; service refusing connections → 503
with the \`ai_unavailable\` body; anonymous → DRF's 403 before the AI is ever called. The rest of the
app keeps working, React shows the message and a retry button, and nothing the user saved is lost. For
features that can wait, degrade instead of failing: save the document, mark \`summary_status =
"pending"\`, and fill it in later from a background job.`,
    workedExample: `**Problem:** document upload in Django must also produce a summary from the AI service. Last week
the AI service's deploy caused a 20-second outage and every upload during it failed with a 500. Make
uploads survive: retry a brief blip, give up quickly on a real outage, never lose the upload, and keep
a Django worker busy for at most about 20 seconds.

**Budget first.** Two retries after the first try = 3 attempts. A hung service (connection accepted,
no answer) costs the 5 s read timeout per attempt, plus backoff 0.5 + 1.0 s: about 3 × 5 + 1.5 ≈
16.5 s, under the 20 s target and gunicorn's 30 s. An unreachable host fails sooner, at the 2 s connect
timeout. (Per-operation timeouts are not a hard total; a byte-by-byte trickle could run longer, which
is one more reason the breaker matters.)

**Solution:**

    # ai/client.py
    ai = AIClient(settings.AI_SERVICE_URL, settings.AI_SERVICE_KEY)   # the client from the notes
    ai.http.timeout = httpx.Timeout(5.0, connect=2.0)

    # documents/views.py
    class DocumentUploadView(APIView):
        permission_classes = [IsAuthenticated]

        def post(self, request):
            s = DocumentSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            doc = s.save(owner=request.user, summary_status="pending")    # saved before any AI call
            try:
                doc.summary = ai.summarise(doc.id, doc.text)["summary"]
                doc.summary_status = "done"
            except AIServiceUnavailable:
                pass                                                      # stays "pending"
            doc.save(update_fields=["summary", "summary_status"])
            return Response(DocumentSerializer(doc).data, status=201)

and a management command (or scheduled job) that retries pending ones:

    for doc in Document.objects.filter(summary_status="pending")[:50]:
        try:
            doc.summary = ai.summarise(doc.id, doc.text)["summary"]
            doc.summary_status = "done"
            doc.save(update_fields=["summary", "summary_status"])
        except AIServiceUnavailable:
            break                                   # still down: stop, try next run

**What happens now:**

| AI service | Upload response | Worker busy |
|---|---|---|
| healthy | 201, summary filled | ~1–3 s |
| one 503 during a deploy | 201, summary filled after a retry | +0.5 s |
| down for minutes | 201, \`summary_status: "pending"\` | ≤ ~16.5 s, then ~0 s once the breaker opens |
| returns 422 (our bug) | 500 + an error in the logs | one call |

**Reasoning:**

- The document is saved **before** the AI call, so an AI failure can never lose user data.
- \`summarise\` is idempotent (same text in, same summary out), which is what makes the retries safe.
- After the threshold of failures the breaker opens and uploads stop waiting on the AI at all —
  without it, every upload during a long outage would pay the full timeout budget.
- The 422 is deliberately **not** swallowed: it is our bug, it should page someone, and retrying would
  only repeat it.
- React shows "Summary on its way" for \`pending\` and polls the document, rather than holding an HTTP
  request open.`,
    mcqs: [
      mcq('Django\'s AI client calls the service with requests.post(url, json=payload) and no timeout argument. The AI service accepts the connection and then hangs. What does the Django worker do?', [
        ['Waits indefinitely; requests has no default timeout', true],
        ['Gives up after requests\' default 5-second timeout', false],
        ['Gives up after 30 seconds, the HTTP standard limit', false],
        ['Retries three times by default, then raises', false],
      ], 'requests uses timeout=None unless you pass one, so a hung server holds the worker until something else (gunicorn\'s worker timeout) kills it. httpx defaults to 5 seconds; with requests always pass timeout=(connect, read).'),
      mcq('The Django client retries calls that get 502, 503 or 504. A call to /internal/summarise returns 422 Unprocessable Content. What should the client do?', [
        ['Raise at once; resending the same request gives the same 422', true],
        ['Retry with backoff, as 422 is often a temporary failure', false],
        ['Open the circuit breaker so the service can recover', false],
        ['Return the fallback "AI unavailable" message silently', false],
      ], 'A 4xx means the request itself is wrong, so a retry repeats the error and the breaker should not count it as the service being down. Surfacing it as an error makes the bug visible.'),
      mcq('A circuit breaker has failure_threshold=3 and reset_after=30 s. The AI service returns 503 to every call, and Django makes five calls in a row within a second. How many HTTP requests reach the AI service?', [
        ['3', true],
        ['5', false],
        ['1', false],
        ['15', false],
      ], 'The first three calls fail and the third failure opens the circuit; calls four and five are refused locally with "circuit open" without any HTTP request. After 30 seconds one trial call is allowed through.'),
    ],
    checkpoint: [
      mcq('Which Django-to-AI call is safe to retry automatically after a read timeout?', [
        ['POST /internal/summarise for a document\'s current text', true],
        ['POST /internal/chat that bills a model call per message', false],
        ['POST /internal/credits/deduct for the user\'s quota', false],
        ['POST /internal/agent/run that sends an email via a tool', false],
      ], 'A timeout does not tell you whether the server did the work. Summarising the same text again is harmless, so it is idempotent; the others would double-charge, double-deduct or send a second email unless the service deduplicates with an idempotency key.'),
      mcq('Django runs 4 gunicorn sync workers. The AI service hangs, and the summarise view calls it with a 120-second read timeout. Six users click "summarise" within a few seconds. What do other users see?', [
        ['Every page of the app stalls; all workers wait on the AI', true],
        ['Only summarise is slow; Django queues the rest elsewhere', false],
        ['Nothing changes; Django serves pages in background threads', false],
        ['They get the AI-unavailable message for every page', false],
      ], 'A sync worker serves one request at a time, so four hung summarise calls occupy every worker and the other requests queue behind them. Short timeouts, a breaker, and keeping long work out of Django requests prevent this.'),
      mcq('The summarise view catches AIServiceUnavailable and returns Response({"code": "ai_unavailable", "message": "..."}, status=503). What is the main benefit compared with letting the exception propagate?', [
        ['React gets a clear, expected answer to show instead of a 500', true],
        ['The AI service restarts on its own when it sees a 503', false],
        ['Django retries the request automatically after it sees a 503', false],
        ['The browser caches the summary until the service recovers', false],
      ], 'An unhandled exception becomes a generic 500 and an error page. A deliberate 503 with a code lets the frontend show a friendly message and a retry button while the rest of the app works normally.'),
    ],
  },

  /* ── TESTING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_TESTING',
    notes: `A test suite for the AI service must run in seconds, offline, with no model key and no bill. The
trick: the model, the settings and the HTTP client all arrive through **dependencies**, and FastAPI lets
a test swap any dependency.

## The service under test

    # ai_service.py (trimmed)
    class ModelClient(Protocol):
        async def complete(self, prompt: str) -> str: ...

    def get_model(request: Request, settings: SettingsDep) -> ModelClient:
        return HttpModelClient(request.app.state.http, settings)       # the real provider

    class SummariseIn(BaseModel):
        text: str = Field(min_length=20, max_length=20_000)
        max_words: int = Field(default=60, ge=10, le=300)

    class SummariseOut(BaseModel):
        summary: str
        words: int

    @app.post("/internal/summarise", response_model=SummariseOut, dependencies=[Depends(require_service)])
    async def summarise(body: SummariseIn, model: Annotated[ModelClient, Depends(get_model)]):
        try:
            text = await model.complete(f"Summarise in at most {body.max_words} words:\\n{body.text}")
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="The model took too long to answer")
        return SummariseOut(summary=text, words=len(text.split()))

## TestClient

\`from fastapi.testclient import TestClient\` gives an httpx-style client that calls the app in process
— no server, no port. \`client.post(url, json=..., headers=...)\` returns a response with
\`.status_code\` and \`.json()\`. Two behaviours to know:

- **Use it as a context manager.** \`with TestClient(app) as client:\` runs the **lifespan** (startup
  and shutdown). Without \`with\`, lifespan does not run: an endpoint reading \`app.state.http\` found no
  such attribute. (\`httpx.AsyncClient(transport=ASGITransport(app=app))\` for async tests does not run
  lifespan either.)
- **Server exceptions are re-raised** into the test by default, so a bug shows as a traceback, not a
  mysterious 500. \`TestClient(app, raise_server_exceptions=False)\` gives you the 500 response instead,
  when that is what you want to assert.

## dependency_overrides: fakes for the model and the settings

    # test_ai_service.py
    import httpx, pytest
    from fastapi.testclient import TestClient
    from ai_service import Settings, app, get_model, get_settings

    TEXT = "Employees get twenty days of paid leave each calendar year."

    class FakeModel:
        def __init__(self, reply="Twenty paid leave days a year.", error=None):
            self.reply, self.error, self.prompts = reply, error, []
        async def complete(self, prompt: str) -> str:
            self.prompts.append(prompt)
            if self.error:
                raise self.error
            return self.reply

    def fake_settings() -> Settings:
        return Settings(llm_api_key="unused", service_api_key="test-key")

    @pytest.fixture
    def fake_model():
        return FakeModel()

    @pytest.fixture
    def client(fake_model):
        app.dependency_overrides[get_settings] = fake_settings
        app.dependency_overrides[get_model] = lambda: fake_model
        with TestClient(app) as c:
            yield c
        app.dependency_overrides.clear()

    AUTH = {"X-API-Key": "test-key"}

- \`app.dependency_overrides\` maps the **original function object** to a replacement. Overriding a
  different function — say a wrapper that calls \`get_flag\` — changed nothing (\`{"v": "real"}\`);
  overriding \`get_flag\` itself did (\`{"v": "fake"}\`).
- Overriding \`get_settings\` means the tests never read the environment: they passed on a machine with
  **no** \`.env\` and no key. The \`lru_cache\` on the real function does not matter, because the real
  function is never called.
- \`clear()\` in the fixture's teardown, or one test's fakes leak into the next.
- The fake records the prompts it saw, so a test can assert on **what we asked the model**, the part
  of an AI feature we actually control.

## The tests that matter

    def test_summarise_uses_the_model(client, fake_model):
        r = client.post("/internal/summarise", json={"text": TEXT, "max_words": 20}, headers=AUTH)
        assert r.status_code == 200
        assert r.json() == {"summary": "Twenty paid leave days a year.", "words": 6}
        assert "at most 20 words" in fake_model.prompts[0]

    def test_missing_key_is_401(client, fake_model):
        r = client.post("/internal/summarise", json={"text": TEXT})
        assert r.status_code == 401
        assert r.json() == {"detail": "Invalid service key"}
        assert fake_model.prompts == []            # the model was never called

    @pytest.mark.parametrize("body, field", [
        ({"text": "too short"}, "text"),
        ({"text": TEXT, "max_words": 5}, "max_words"),
        ({}, "text"),
    ])
    def test_bad_input_is_422(client, body, field):
        r = client.post("/internal/summarise", json=body, headers=AUTH)
        assert r.status_code == 422
        assert r.json()["detail"][0]["loc"] == ["body", field]

    def test_model_timeout_is_504(client, fake_model):
        fake_model.error = httpx.ReadTimeout("slow")
        assert client.post("/internal/summarise", json={"text": TEXT}, headers=AUTH).status_code == 504

All of these pass (\`pytest -q\`: 9 passed, about 2.5 s including a wrong-key test and \`/health\`).
Two orderings worth knowing, both observed: a request with **no key and an invalid body** got **401**
— the auth dependency ran and failed before the body's field errors were reported; but a body that is
not even valid JSON got **422 json_invalid** before any dependency ran.

## Streaming, and the outbound client

Test a streaming endpoint by reading it as a stream:

    with client.stream("POST", "/chat/stream", headers={"Authorization": f"Bearer {token}"}) as r:
        assert r.headers["content-type"].startswith("text/event-stream")
        lines = [l for l in r.iter_lines() if l]
    assert lines[-1] == "data: [DONE]"

The code that talks to the provider (\`HttpModelClient\`, or Django's \`AIClient\`) is tested
separately with \`httpx.MockTransport(handler)\`, where \`handler(request)\` returns a scripted
\`httpx.Response\` or raises \`httpx.ReadTimeout\` — the same technique used for the retry and breaker
tests in the previous unit. Endpoint tests use a fake model; client tests use a fake transport; no
test anywhere calls the real provider.`,
    mcqs: [
      mcq('A test builds client = TestClient(app) (no with block). The app opens app.state.http in its lifespan, and the endpoint reads request.app.state.http. What happens?', [
        ['Lifespan never ran, so app.state.http does not exist', true],
        ['TestClient runs lifespan on the first request anyway', false],
        ['FastAPI creates a default httpx client in its place', false],
        ['The test hangs waiting for the startup event to finish', false],
      ], 'TestClient runs startup and shutdown only when used as a context manager. Without with, the attribute set in lifespan is missing (the run found it absent); with the with block it was there.'),
      mcq('The app depends on get_settings. A test sets app.dependency_overrides[Settings] = fake_settings and the endpoint still reads the real environment. Why?', [
        ['The key must be the dependency function get_settings', true],
        ['Overrides only work on async dependencies', false],
        ['lru_cache stops a cached function from being overridden', false],
        ['Overrides apply only after the app is restarted', false],
      ], 'FastAPI looks overrides up by the exact callable named in Depends(...). The endpoint depends on get_settings, so that function object must be the key; overriding anything else leaves the real dependency in place.'),
      mcq('test_missing_key_is_401 asserts the status code and also asserts fake_model.prompts == []. What does the second assertion add?', [
        ['Proof that a rejected request never reached the model', true],
        ['Proof that the fake model was reset between tests', false],
        ['Proof that 401 responses have an empty JSON body', false],
        ['Proof that the API key was compared in constant time', false],
      ], 'A 401 could in principle be returned after the expensive work was already done. Checking the fake recorded no prompt shows authentication ran before the model call, which is the property that saves money.'),
    ],
    checkpoint: [
      mcq('The fixture sets app.dependency_overrides but has no teardown that clears it. One test overrides get_model with a fake that raises ReadTimeout. What risk does this create?', [
        ['Later tests in the session may still get the failing fake', true],
        ['The override is ignored because it was set inside a fixture', false],
        ['pytest raises an error for an unrestored global override', false],
        ['The real model is called by every test that follows', false],
      ], 'dependency_overrides is a plain dict on the app object, which lives for the whole test session. Without clear() in teardown, overrides leak into tests that never asked for them, making results depend on test order.'),
      mcq('A POST to /internal/summarise has no X-API-Key header and the body {} (text missing). With require_service in the route\'s dependencies, what status did the request get?', [
        ['401 — the auth dependency failed first', true],
        ['422 — the missing text is reported first', false],
        ['422 listing both the key and the text field', false],
        ['400 — FastAPI combines auth and body errors', false],
      ], 'The dependency raised its HTTPException before the body\'s field errors were turned into a 422, so the caller got 401. A body that is not valid JSON at all is different: that failed with 422 json_invalid before any dependency ran.'),
      mcq('A bug makes an endpoint raise KeyError. The test uses a plain TestClient(app) and expects to assert status_code == 500. What actually happens?', [
        ['The KeyError is raised inside the test itself', true],
        ['The response has status 500 as expected', false],
        ['The response has status 422 with the error text', false],
        ['The test passes, since TestClient hides errors', false],
      ], 'TestClient re-raises unhandled server exceptions by default so bugs show with a traceback. Construct it with raise_server_exceptions=False to receive the 500 response instead.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_DEBUGGING',
    notes: `Most FastAPI faults announce themselves in a 422 \`loc\`, a status code, or a timing. Reproduce with
TestClient and print \`r.status_code, r.json()\` before changing code; for slowness, fire several
concurrent requests and time them.

## 1. 422 at ["query", "message"] for a JSON body

    @app.post("/chat")
    def chat(message: str): ...

Django posts \`{"message": "hi"}\` and gets \`{"type": "missing", "loc": ["query", "message"]}\`. A
bare \`str\` parameter is a **query** parameter. **Fix:** a body model, \`class ChatIn(BaseModel):
message: str\` and \`def chat(body: ChatIn)\` (or \`Annotated[str, Body(embed=True)]\`).

## 2. The whole service stalls under load

Each request is fast alone; ten at once take ten times as long. Cause: a **blocking** call inside
\`async def\` — \`time.sleep\`, \`requests\`, a sync \`httpx.Client\`, the sync \`OpenAI()\` client, a
PyMySQL query. Measured: four concurrent requests took 2.0 s instead of 0.5 s. **Fix:** the async
client and \`await\`; or make the endpoint \`def\`; or \`await asyncio.to_thread(...)\`.

## 3. "Cannot send a request, as the client has been closed" / no attribute "http"

The shared \`httpx.AsyncClient\` is closed (an \`async with httpx.AsyncClient() as http:\` block inside
lifespan that already exited, or a test client created without \`with\` so lifespan never ran).
**Fix:** create it before \`yield\` and \`aclose()\` after; use \`with TestClient(app) as c\`.

## 4. Internal fields leak into responses

An endpoint returns a dict or object holding \`internal_notes\` or the full prompt, and there is no
\`response_model\`. **Fix:** declare an \`...Out\` model; FastAPI then sends only its fields.

## 5. httpx.ReadTimeout after exactly 5 seconds

Nobody set a timeout, so httpx's default (5 s) applies to a model call that needs 15. **Fix:** an
explicit \`httpx.Timeout(20.0, connect=3.0)\` on the shared client, and map \`TimeoutException\` to 504.

## 6. Browser says "blocked by CORS policy"; curl works

Typical causes: \`allow_origins=["https://app.example.com/"]\` — the trailing slash never matches the
browser's \`Origin\` (the preflight got \`400 Disallowed CORS origin\`); or \`Authorization\` missing
from \`allow_headers\` (\`400 Disallowed CORS headers\`). curl works because curl does not do CORS.
**Fix:** exact origins, no slash; list the headers the browser sends.

## 7. Every stream token is rejected with 401

Check what \`jwt.decode\` raised. \`InvalidSignatureError\` — Django and FastAPI hold different secrets
(often Django signs with \`SECRET_KEY\` by accident). \`InvalidAudienceError: Invalid audience\` — the
token has \`aud\` but \`decode()\` was called without \`audience=\`. \`DecodeError: It is required that
you pass in a value for the "algorithms" argument\` — \`algorithms=\` is missing. Server clocks far
apart also expire tokens early; PyJWT's \`leeway=\` allows a few seconds of skew.

## 8. A test override "does nothing"

The test overrides a function the endpoint does not reference — a wrapper, the \`Settings\` class,
or a function imported under another name — so the real dependency (and the real key) is used.
**Fix:** override the exact callable inside \`Depends(...)\`, and clear overrides after each test.

## Method

422 → read \`loc\` and \`type\`. 401/403 → print the exception your auth dependency caught. Slow → time
concurrent requests and look for sync I/O in \`async def\`. Browser-only failures → look at the
preflight in the network tab. Then pin the bug with a test before fixing it.`,
    mcqs: [
      mcq('An endpoint is def chat(message: str) on POST /chat. Django sends the JSON body {"message": "hi"}. What does the 422 detail say?', [
        ['type "missing" at loc ["query", "message"]', true],
        ['type "json_invalid" at loc ["body", 0]', false],
        ['type "missing" at loc ["body", "message"]', false],
        ['type "string_type" at loc ["body"]', false],
      ], 'A plain str parameter that is not in the path is read from the query string, so FastAPI reports it missing there and ignores the body. Taking a Pydantic model parameter (or Body(embed=True)) reads it from JSON.'),
      mcq('CORSMiddleware has allow_origins=["https://app.example.com/"]. The browser\'s preflight carries Origin: https://app.example.com. What does the preflight get?', [
        ['400 Disallowed CORS origin', true],
        ['200 with the origin allowed after normalising', false],
        ['403 Forbidden from the endpoint', false],
        ['200 with access-control-allow-origin: *', false],
      ], 'Origins are compared as exact strings, and a browser Origin header never ends in a slash, so the configured value never matches. Remove the trailing slash.'),
      mcq('The AI service calls jwt.decode(token, secret, algorithms=["HS256"]) without audience=, and Django\'s tokens carry "aud": "ai-service". Every request gets 401. Which exception is behind it?', [
        ['InvalidAudienceError: Invalid audience', true],
        ['ExpiredSignatureError: Signature has expired', false],
        ['InvalidSignatureError from a secret mismatch', false],
        ['DecodeError about the algorithms argument', false],
      ], 'PyJWT rejects a token that names an audience when the verifier did not say which audience it is; the run raised InvalidAudienceError "Invalid audience". Pass audience="ai-service".'),
      mcq('The service fails with "RuntimeError: Cannot send a request, as the client has been closed." on the first request. lifespan does: async with httpx.AsyncClient() as http: app.state.http = http, followed by yield after the with block. What is wrong?', [
        ['The with block closed the client before any request', true],
        ['httpx clients cannot be stored on app.state between requests', false],
        ['lifespan must be a plain function, not async', false],
        ['The client needs base_url before it can send', false],
      ], 'Leaving the async with block closes the client, and yield comes after that, so every request uses a closed client. Put yield inside the with block, or create the client before yield and aclose() it after.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_PRACTICE',
    notes: `Build one FastAPI project, \`ai_service/\`, through these exercises. No model key is needed: the model
is a dependency, and in every exercise it is a fake that returns canned text. Check each exercise
with TestClient in pytest — status codes and JSON, not eyeballing.

## Exercise 1 — Typed endpoints

\`POST /internal/classify\` takes \`{"text": str (5–2000), "labels": list[str] (2–8, no duplicates)}\`
and returns \`{"label": str, "confidence": float}\` with \`confidence\` between 0 and 1. Return the
first label from your fake. Write tests for: a valid call (200), a duplicate label (422 at
\`["body", "labels"]\`), a single label (422 \`too_short\`), and \`extra="forbid"\` rejecting an unknown key.

## Exercise 2 — A cross-field rule and a hidden field

\`POST /internal/rewrite\` with \`tone: Literal["formal", "friendly"]\`, \`min_words\` and \`max_words\`.
A \`model_validator(mode="after")\` rejects \`min_words > max_words\`. The handler returns the rewritten
text **and** the prompt it built; the response must contain only the text. Open \`/docs\` and confirm
the schema shows the constraints and no prompt.

## Exercise 3 — Settings and the shared client

\`Settings\` with \`SecretStr\` keys, an \`AI_\` prefix and a \`.env\` file, cached with \`lru_cache\`.
Open one \`httpx.AsyncClient\` in lifespan with \`Timeout(20.0, connect=3.0)\` and expose it through a
dependency. Prove three things: missing keys fail at startup naming both; \`print(settings)\` shows no
key; the client is closed after the \`with TestClient(app)\` block.

## Exercise 4 — Async done right

Add \`GET /slow-sync\` (\`time.sleep(0.5)\` in \`async def\`), \`GET /slow-async\` (\`await
asyncio.sleep(0.5)\`), and \`GET /slow-thread\` (\`await asyncio.to_thread(time.sleep, 0.5)\`). Fire
four concurrent requests at each with \`httpx.AsyncClient(transport=httpx.ASGITransport(app=app))\` and
\`asyncio.gather\`; record the times (expect about 2.0, 0.5 and 0.5 s) and write one sentence on why.

## Exercise 5 — Two kinds of caller

Protect \`/internal/*\` with an \`X-API-Key\` router dependency (\`compare_digest\`, 401). Protect
\`POST /chat/stream\` (an SSE \`StreamingResponse\` of three tokens and \`data: [DONE]\`) with a stream
token: write the Django-side \`issue_stream_token(user_id)\` with PyJWT (aud \`ai-service\`, scope
\`chat\`, 90 s) and the FastAPI \`current_user\` dependency. Test: valid token streams; expired 401;
wrong audience 401; wrong scope 403; and the CORS preflight from your React origin passes while one
from another origin gets 400.

## Exercise 6 — Django calls it, and survives

In a Django app, write \`AIClient\` with \`httpx.Client\`, a timeout, 2 retries with backoff for
\`summarise\` only, and a circuit breaker (threshold 3, 30 s). With \`httpx.MockTransport\`, test: 503,
503, 200 → success in 3 calls; 422 → raised after 1 call; 5 calls against a dead service → 3 HTTP
requests. Finally a DRF view returning 503 \`{"code": "ai_unavailable", ...}\` when the client gives up.

**Self-check:** no test needs network access or a key; every outbound call has a timeout; every
endpoint has a request model and a response model.`,
    mcqs: [
      mcq('In Exercise 1, labels is list[str] = Field(min_length=2, max_length=8) and Django sends "labels": ["spam"]. What "type" does the 422 entry have?', [
        ['too_short', true],
        ['string_too_short', false],
        ['value_error', false],
        ['missing', false],
      ], 'min_length on a list constrains the number of items, and Pydantic reports a list that is too small as too_short ("List should have at least 2 items after validation, not 1"). string_too_short is for string length.'),
      mcq('In Exercise 2 the handler returns {"text": ..., "prompt": ...} and the route has response_model=RewriteOut with only text. What does /openapi.json show for the response?', [
        ['A RewriteOut schema with only the text property', true],
        ['A schema with both text and prompt properties', false],
        ['No response schema, since a dict is returned', false],
        ['A 422 schema only, as no 200 schema can be inferred', false],
      ], 'The documented response comes from response_model, not from whatever the function happens to return. The schema and the actual response both contain only the model\'s fields.'),
      mcq('In Exercise 3 the Settings class has llm_api_key: SecretStr. What does print(settings) show for that field?', [
        ['SecretStr(\'**********\')', true],
        ['The real key in plain text', false],
        ['None until get_secret_value() is called', false],
        ['An empty string', false],
      ], 'SecretStr masks its value in repr, str and model_dump, so logs and debug prints never contain the key. The real value is available only through get_secret_value().'),
      mcq('In Exercise 4 the /slow-thread endpoint is async def and awaits asyncio.to_thread(time.sleep, 0.5). Four concurrent requests take about how long?', [
        ['About 0.5 s; each sleep runs in a worker thread', true],
        ['About 2.0 s; time.sleep still blocks the event loop', false],
        ['About 1.0 s; to_thread allows two threads at once', false],
        ['It raises, since to_thread cannot take time.sleep', false],
      ], 'asyncio.to_thread moves the blocking call to a thread and awaits its result, so the event loop keeps serving the other requests. The measured time matched the async version, about 0.5 s.'),
      mcq('In Exercise 5 a token has "scope": "read", a valid signature, the right audience and has not expired. It is sent to POST /chat/stream. What should the endpoint return?', [
        ['403 — the caller is known but not allowed to chat', true],
        ['401 — any token problem is an authentication failure', false],
        ['422 — the scope claim fails body validation', false],
        ['200 — a valid signature is enough to stream', false],
      ], 'The token proves who the user is, so this is not a 401; the scope says they may not use chat, which is authorisation, a 403. The run returned 403 "Token not valid for chat".'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_INTERVIEW_QUESTION',
    notes: `Three questions an interviewer asks a Python full-stack candidate whose project has an AI service.
Answer each in under two minutes, and anchor it in your own project.

## Q1. "In FastAPI, when do you write async def and when def?"

**Model answer.** \`async def\` endpoints run on the event loop, so they must only do awaitable I/O —
\`httpx.AsyncClient\`, \`AsyncOpenAI\`, an async driver. While they await, the loop serves other
requests; that is why one process handles many slow model calls. A plain \`def\` endpoint runs in
FastAPI's thread pool, so blocking libraries are safe there. The dangerous mix is a blocking call
inside \`async def\`: it freezes the loop for everyone. I measured it — four concurrent requests with
\`time.sleep(0.5)\` inside \`async def\` took two seconds, not half a second. If a library is sync
only, I use \`def\` or \`asyncio.to_thread\`. CPU-heavy work goes to a separate worker, because neither
helps with the GIL.

**Follow-ups:** *"Is async faster?"* — Not per request; it handles more concurrent waiting with fewer
threads. *"How would you spot the bug in production?"* — Latency rising with concurrency while CPU
stays low; then look for sync I/O in async endpoints.

## Q2. "Your Django app depends on the AI service. What happens when it is slow or down?"

**Model answer.** Django calls it through one client module with explicit timeouts — 2 s to connect,
around 15 s to read — and keeps the total budget, with retries, under the gunicorn worker timeout,
because a sync worker waiting on the AI is a worker not serving anyone. I retry only idempotent calls
like summarising a document, only on 502/503/504, timeouts and connection errors, with backoff and
jitter, never on a 4xx. A circuit breaker stops calling after repeated failures, so during an outage
requests fail instantly instead of each paying the timeout. The view catches the failure and returns
a 503 with a clear code the React app turns into a message, and data is saved before the AI call so
nothing is lost; summaries are marked pending and filled in later. The chat stream does not go through
Django at all: Django issues a 90-second token and the browser streams from FastAPI.

**Follow-ups:** *"Why not retry everything?"* — A timeout does not tell you whether the work happened;
retrying a billed chat call or an agent action can do it twice. *"Where does the breaker state live?"*
— Per process to start with; shared in Redis if the fleet needs one view.

## Q3. "How do you secure the AI service, and how do you test it without calling the model?"

**Model answer.** Two callers, two mechanisms. Django sends a service key in \`X-API-Key\`, checked by
an \`APIKeyHeader\` dependency with \`secrets.compare_digest\` on the whole \`/internal\` router. The
browser sends a short-lived JWT Django issued with \`aud: ai-service\` and a \`chat\` scope, verified
with PyJWT pinning the algorithm and audience — expired or wrong-audience tokens are 401, a wrong scope
403. The model key exists only in the AI service as a \`SecretStr\`. CORS allows just our frontend
origin, but I don't treat CORS as security. For tests, the model, settings and HTTP client are all
dependencies, so \`app.dependency_overrides\` swaps in a fake model that records prompts and a settings
object with test keys; with \`TestClient\` I test the happy path, 401 without a key — asserting the
model was never called — 422 on bad input, and 504 when the fake raises a timeout. The provider client
itself is tested with \`httpx.MockTransport\`.

**Follow-ups:** *"Why not reuse the normal access token?"* — It would mean sharing Django's signing key;
a separate audience-bound, short-lived token limits what a leak can do. *"HS256 or RS256?"* — RS256 if
you want the AI service able to verify but never mint tokens.`,
    mcqs: [
      mcq('An interviewer asks why one FastAPI process can serve many users waiting on slow model responses. Which answer is accurate?', [
        ['Awaiting I/O frees the event loop to serve other requests', true],
        ['FastAPI starts a separate OS process for every async request', false],
        ['async def makes the model provider answer sooner', false],
        ['Uvicorn caches model responses between users', false],
      ], 'While an async endpoint awaits the provider, the event loop runs other requests, so waiting costs almost nothing. Async does not make any single call faster or create processes.'),
      mcq('An interviewer asks why a DRF view that calls the AI service should not use a 120-second timeout "to be safe". What is the strongest answer?', [
        ['A sync worker would be held for minutes, starving other users', true],
        ['httpx refuses timeouts longer than 60 seconds', false],
        ['FastAPI itself closes every incoming request after 30 seconds', false],
        ['A long timeout disables the circuit breaker', false],
      ], 'Each sync Django worker handles one request at a time, so long waits on a slow dependency quickly occupy all workers. Short timeouts, a breaker and moving long work out of the request keep the app responsive.'),
      mcq('An interviewer asks how you make sure a request rejected for a bad API key never cost a model call. What test shows it?', [
        ['Fake the model and assert it recorded no prompt', true],
        ['Assert the response time of the 401 is under 50 ms', false],
        ['Check the provider\'s usage dashboard after the test run', false],
        ['Assert the 401 response body is an empty JSON object', false],
      ], 'With the model replaced through dependency_overrides by a fake that records prompts, asserting the list is empty after a 401 proves the auth dependency stopped the request before the model was called.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_FASTAPI_CHECKPOINT',
    notes: `Ten questions on the AI service as an interview or code review examines it: a route and its models,
what the 422 says, async and dependencies, service authentication, Django calling the service, and the
tests. Answer from what FastAPI, Pydantic, httpx and PyJWT actually do — every case here was run.`,
    checkpoint: [
      mcq('@app.get("/search") def search(q: Annotated[str, Query(min_length=2)], k: Annotated[int, Query(ge=1, le=20)] = 5). What does GET /search return?', [
        ['422 with type "missing" at loc ["query", "q"]', true],
        ['200 with {"q": null, "k": 5}', false],
        ['200 with {"q": "", "k": 5}', false],
        ['404, because no route matches without q', false],
      ], 'q has no default, so it is a required query parameter, and its absence is reported as missing with msg "Field required". The route itself matches; only validation fails.'),
      mcq('A model has temperature: float = Field(default=0.2, ge=0, le=1) in default (lax) mode. A POST sends "temperature": "0.5" as a string. What happens?', [
        ['Accepted; the string is converted to 0.5', true],
        ['422 float_type, because a string was sent', false],
        ['Accepted, but temperature stays the string "0.5"', false],
        ['Accepted, but the default 0.2 is used instead', false],
      ], 'Pydantic\'s lax mode converts a numeric string to a float, so the request succeeded with 0.5. Strict mode (StrictFloat or strict=True) would reject it.'),
      mcq('@app.post("/chat", response_model=ChatReply, status_code=201) returns a dict with every ChatReply field plus "extra": "dropped". What does the client get?', [
        ['201 with only the ChatReply fields', true],
        ['200 with the ChatReply fields and extra', false],
        ['201 with the ChatReply fields and extra', false],
        ['500, as the response has an unknown key', false],
      ], 'status_code sets the success status, and response_model filters the body to its own fields, so extra is dropped. Unknown keys in a returned dict are not an error.'),
      mcq('Four concurrent requests hit a plain def endpoint whose body is time.sleep(0.5). Roughly how long until all four have answered?', [
        ['About 0.5 s; def endpoints run in a thread pool', true],
        ['About 2.0 s; the sleeps run one after another', false],
        ['About 1.0 s; two worker threads share them', false],
        ['They time out; def endpoints cannot sleep', false],
      ], 'FastAPI runs def endpoints in AnyIO worker threads, so the blocking sleeps overlap (measured 0.5 s). The same sleep inside async def blocks the event loop and took 2.0 s.'),
      mcq('An endpoint uses the same dependency twice — once directly and once through a sub-dependency — and the dependency increments a counter. What do the two parameters receive within one request?', [
        ['The same value; the dependency is called once per request', true],
        ['Two different values; each use calls it again', false],
        ['The same value, cached for the life of the process', false],
        ['An error; one dependency may be used only once', false],
      ], 'FastAPI caches a dependency\'s result within one request, so both uses got 1, and the next request got 2 for both. Use Depends(dep, use_cache=False) if you truly need separate calls.'),
      mcq('APIKeyHeader(name="X-API-Key") is used with its default auto_error=True, and a request arrives without the header. What does current FastAPI respond?', [
        ['401 {"detail": "Not authenticated"}', true],
        ['422 with a missing header error', false],
        ['200, with the key parameter set to None', false],
        ['500, because the header lookup raises', false],
      ], 'With auto_error=True the security class rejects the request itself; current FastAPI answers 401 Not authenticated with a WWW-Authenticate: APIKey header (older releases used 403). auto_error=False passes None so your own dependency decides.'),
      mcq('A token is created with jwt.encode({"sub": "42", "scope": "chat", "exp": ...}, secret, algorithm="HS256") — no aud — and verified with audience="ai-service". What does PyJWT raise?', [
        ['MissingRequiredClaimError', true],
        ['InvalidAudienceError', false],
        ['InvalidSignatureError', false],
        ['Nothing; aud is only checked when present', false],
      ], 'When an audience is expected, a token without an aud claim is rejected with MissingRequiredClaimError ("Token is missing the \\"aud\\" claim"). InvalidAudienceError is for an aud that does not match.'),
      mcq('The preflight for POST /chat/stream asks for Access-Control-Request-Headers: authorization,content-type, but allow_headers lists only Content-Type. What does CORSMiddleware answer?', [
        ['400 Disallowed CORS headers', true],
        ['200, and the browser drops Authorization', false],
        ['401, since no token reached the endpoint', false],
        ['200 with access-control-allow-headers: *', false],
      ], 'Every requested header must be allowed, so the middleware refuses the preflight with 400 "Disallowed CORS headers" and the browser never sends the real request. Add Authorization to allow_headers.'),
      mcq('Django\'s client retries on 502/503/504 and on timeouts, up to 2 retries. The AI service answers 503, then 503, then 200. How many HTTP calls are made and what does the caller get?', [
        ['3 calls, and the 200 result is returned', true],
        ['1 call, and AIServiceUnavailable is raised', false],
        ['2 calls, then the circuit breaker opens', false],
        ['3 calls, and the second 503 is returned', false],
      ], 'The first two 503s are retried with backoff (about 0.5 s and 1 s), and the third attempt succeeds, so the caller sees the summary. The run recorded exactly three calls.'),
      mcq('A test needs the AI service to behave as if the model timed out. Which approach fits the FastAPI testing pattern of this topic?', [
        ['Override get_model with a fake whose complete() raises httpx.ReadTimeout', true],
        ['Point LLM_BASE_URL at an unreachable host and simply wait for the timeout', false],
        ['Patch time.sleep so the real provider call appears slow', false],
        ['Set the httpx timeout to zero and call the real provider', false],
      ], 'The model is a dependency, so dependency_overrides can supply a fake that raises the same exception the real client would; the endpoint then returns 504 instantly, offline, with no key. The other options need the network or real credentials.'),
    ],
  },
];
