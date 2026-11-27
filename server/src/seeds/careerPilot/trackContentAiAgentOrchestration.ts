/**
 * Career-track content: Agent Orchestration and Multi-Agent Systems (AI_AGENT_ORCHESTRATION), the AI
 * tracks, batch AI3.
 *
 * Scope: agents designed as typed state graphs; the four agent patterns and what each costs in model
 * calls; supervisor-and-specialist systems with hand-offs and private state; parallel fan-out and
 * fan-in with Send; human approval, editing and rejection with interrupt / Command(resume=...); and
 * durable runs on a database checkpointer that survive a crash without repeating side effects. The
 * mini project is a research-and-report agent team.
 *
 * Builds on JT_AI_AGENTS (what an agent is, workflows, memory, MCP, guardrails) and JT_AI_AGENTS_PY
 * (tool calling, a first LangGraph agent with MessagesState, ToolNode, MemorySaver and an approval
 * interrupt), plus the shared AI core (AI_EVAL_SAFETY, AI_PRODUCTION's tracing and background jobs).
 * Those get one sentence of reference, not a re-teach.
 *
 * Every LangGraph snippet was run in the scratch venv (langgraph 1.2.17, langchain-core 1.7.0,
 * langgraph-checkpoint-sqlite 3.1.2) with scripted fake models, and the printed output in the notes is
 * the real output; crash-and-resume was tested with two separate processes on one SQLite file. The
 * Postgres checkpointer is written from its documented API and was not run. No prices, no model
 * version names.
 *
 * Skills: AGENT_ORCHESTRATION by default; AGENT_PATTERNS is AGENT_FUNDAMENTALS (trackSkillAttribution).
 * Checkpoint questions name their skill with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const ORC = 'AGENT_ORCHESTRATION';
const FUN = 'AGENT_FUNDAMENTALS';

export const TRACK_AI_AGENT_ORCHESTRATION_BUNDLES: PilotBundle[] = [
  /* ── STATE_GRAPHS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_STATE_GRAPHS',
    notes: `In Building Agents in Python you wrote one agent on \`MessagesState\`: a list of messages, an agent
node, a \`ToolNode\` and \`tools_condition\`. That shape is right for a chat assistant. It is wrong for
most systems you will be paid to build, because everything the program needs to decide — which
document this is, whether validation passed, who approved — is buried in prose inside messages.
This unit is about designing your **own** state and your own routing.

## Draw the graph before you write it

Take a real job: a Pune NBFC wants uploaded loan documents triaged. On paper, before any code:

- **Boxes** are steps that each do one job: classify the document, extract fields, validate them,
  auto-verify, or queue for the operations team.
- **Arrows** are labelled with the condition that chooses them: "type unknown → ops", "problems found
  → ops", "clean → auto-verify".
- **The state** is the list of facts the arrows read: \`doc_type\`, \`fields\`, \`problems\`,
  \`decision\`.

If an arrow's condition cannot be written as a short test on a state field, the design is not finished.
"Route to ops if the model seems unsure" becomes "route to ops if \`confidence < 0.7\`", and now
\`confidence\` is a field.

## Typed state, and nodes that return updates

    import operator
    from typing import Annotated, Literal, TypedDict

    class LoanState(TypedDict):
        application_id: str
        doc_text: str
        doc_type: str
        fields: dict
        problems: Annotated[list[str], operator.add]
        decision: str

    def classify(state: LoanState) -> dict:
        text = state["doc_text"].lower()
        kind = ("salary_slip" if "net pay" in text
                else "bank_statement" if "closing balance" in text else "unknown")
        return {"doc_type": kind}

A node reads the whole state and returns **only the keys it changes**. In production \`classify\` is a
model call with structured output (you did that in Building with LLMs); the graph does not care.

## Reducers: how an update is merged

Each key has a **reducer**. With none, the new value **replaces** the old one. \`Annotated[list[str],
operator.add]\` makes \`problems\` **append**, so \`validate\` and \`needs_human\` can each add a line
without erasing the other's. \`add_messages\` (what \`MessagesState\` uses) is just a smarter reducer
that appends and replaces by message id.

A reducer can be any function \`(old, new) -> merged\`:

    def merge_fields(old: dict, new: dict) -> dict:
        return {**(old or {}), **new}

    class U(TypedDict):
        fields: Annotated[dict, merge_fields]

Two nodes running in the same step, one returning \`{"pan": "ABCDE1234F"}\`, the other
\`{"net_pay": 84000}\`, starting from \`{"name": "Asha"}\`, give:

    {'fields': {'name': 'Asha', 'pan': 'ABCDE1234F', 'net_pay': 84000}}

Without a reducer, two writes to one key in one step is an error, not a silent overwrite:

    InvalidUpdateError : At key 'notes': Can receive only one value per step. Use an Annotated key to handle multiple values.

You will meet this again the first time you run branches in parallel.

## TypedDict is a hint, not a check

LangGraph does **not** validate a \`TypedDict\` state. A node that returns \`{"total": "oops", "colour":
"red"}\` for \`total: int\` gives \`{'log': [], 'total': 'oops'}\` — the wrong type goes straight in and
the unknown key is silently dropped. If bad model output must be caught at the boundary, make the
state a Pydantic \`BaseModel\`: the next node to read it then raises \`ValidationError\`. Most teams
use \`TypedDict\` for speed and validate model output with Pydantic **inside** the node that calls the
model, where the error can be handled.

## Conditional edges

    def route_after_validate(state: LoanState) -> Literal["auto_ok", "needs_human"]:
        return "needs_human" if state["problems"] else "auto_ok"

    g = StateGraph(LoanState)
    g.add_node("classify", classify)
    # ... extract, validate, auto_ok, needs_human
    g.add_edge(START, "classify")
    g.add_conditional_edges("classify", route_after_classify)
    g.add_edge("extract", "validate")
    g.add_conditional_edges("validate", route_after_validate)
    g.add_edge("auto_ok", END)
    g.add_edge("needs_human", END)

The router is plain Python on state fields: deterministic, unit-testable, free. The \`Literal\` return
type tells LangGraph the possible targets so it can draw the graph; without it, pass them as a list
(\`add_conditional_edges("validate", route, ["auto_ok", "needs_human"])\`) or a dict path map.

## Check the drawing against your sketch

\`app.get_graph().draw_mermaid()\` prints Mermaid you can paste into any Markdown viewer. For this
graph the edges are:

    __start__ --> classify;
    classify -.-> extract;
    classify -.-> needs_human;
    extract --> validate;
    validate -.-> auto_ok;
    validate -.-> needs_human;
    auto_ok --> __end__;
    needs_human --> __end__;

Dotted arrows are conditional. If an arrow on your paper is missing here, or one appears that you did
not draw, the code is wrong — find out now, not from a production trace.

## Checkpointers: a snapshot after every step

Compile with \`checkpointer=InMemorySaver()\` (\`MemorySaver\` is the same class under its older name)
and every step's state is saved under the \`thread_id\`. For a loan file that is the application id,
so each application has its own history:

    cfg = {"configurable": {"thread_id": "LN-2041"}}
    out = app.invoke({"application_id": "LN-2041", "doc_text": "... Net Pay 84,000", "problems": []}, cfg)
    snap = app.get_state(cfg)
    print(snap.next, snap.values["decision"], snap.metadata["step"])   # () AUTO_VERIFIED 4

\`app.get_state_history(cfg)\` walks the snapshots newest first, each with what was due to run next —
an audit trail of the run for free. Checkpoints are also what make pausing, resuming and surviving a
crash possible; the rest of this topic builds on them.

## Watch it run

\`app.stream(input, cfg, stream_mode="updates")\` yields one dict per node with exactly what it
returned — the fastest way to see which branch was taken and which node wrote a bad value. Use it in
tests and in the debugging unit.`,
    workedExample: `**Problem.** Run the NBFC triage graph on three uploads and explain each path: a clean salary slip,
an unreadable scan, and a salary slip with a low net pay (\`extract\` parses the number from the text).

**Upload 1 — LN-2041, "Infosys Ltd ... Net Pay 84,000".** Stream the updates:

    {'classify': {'doc_type': 'salary_slip'}}
    {'extract': {'fields': {'employer': 'Infosys', 'net_pay': 84000}}}
    {'validate': {'problems': []}}
    {'auto_ok': {'decision': 'AUTO_VERIFIED'}}

\`route_after_classify\` saw a known type and went to \`extract\`; \`validate\` returned an empty list,
so \`route_after_validate\` chose \`auto_ok\`.

**Upload 2 — LN-2042, "scanned image, unreadable".** \`classify\` returns \`unknown\`, the router goes
straight to \`needs_human\`, and the final state is:

    QUEUED_FOR_OPS ['sent to ops queue']

\`extract\` and \`validate\` never ran — no model call was spent on a document nobody could read.

**Upload 3 — net pay 12,000.** \`validate\` returns \`{"problems": ["net pay below 25,000"]}\`, the
router picks \`needs_human\`, and that node adds its own line. Because \`problems\` has the
\`operator.add\` reducer, the final list holds **both** lines: why it failed and where it went. With a
plain \`list[str]\` the second write would have replaced the first and the ops team would see only
"sent to ops queue".

**Step 4 — the audit trail.** For LN-2041, \`get_state_history\` prints (step, next):

    4 ()
    3 ('auto_ok',)
    2 ('validate',)
    1 ('extract',)
    0 ('classify',)
    -1 ('__start__',)

Six snapshots for four nodes: one for the input, one after each node. When the regulator asks why
LN-2041 was auto-verified, you load step 2 and show the exact fields \`validate\` saw.

**What the design bought.** Every decision is a field and every arrow a test on it, so the routing
has unit tests and costs nothing; only \`classify\` and \`extract\` would call a model.`,
    mcqs: [
      mcq('In the loan triage graph, `problems` is declared `Annotated[list[str], operator.add]`. `validate` returns `{"problems": ["employer missing"]}` and then `needs_human` returns `{"problems": ["sent to ops queue"]}`. What does the final state hold?', [
        ['Both lines, in the order the two nodes wrote them', true],
        ['Only "sent to ops queue", the most recent write', false],
        ['Only "employer missing", because lists cannot be updated twice', false],
      ], 'operator.add is the reducer, so each update is appended to the existing list. Overwriting is what happens to a key with no reducer, which would lose the reason for the referral.'),
      mcq('A node returns `{"net_pay": "eighty-four thousand"}` for a `TypedDict` state that declares `net_pay: int`. What does LangGraph do?', [
        ['Raises a TypeError as soon as the node returns', false],
        ['Stores the string unchanged; TypedDict is not validated', true],
        ['Converts it to the integer 84000 by reading the type hint', false],
      ], 'TypedDict annotations are type hints only, and LangGraph does not check them at run time. A Pydantic state model is validated when the next node reads it; with TypedDict, validate model output inside the node.'),
      mcq('Your router `def route(state): return "auto_ok" if ok else "needs_human"` has no return annotation, and `add_conditional_edges("validate", route)` is called with nothing else. What is the practical problem?', [
        ['The graph cannot run until a path map is added', false],
        ['The router is called twice per step without it', false],
        ['The drawn graph cannot show where validate can go', true],
      ], 'Without a Literal return type or a list/dict of destinations, LangGraph does not know the possible targets in advance, so the drawing (and your check against the sketch) is incomplete. The graph still runs, and the router runs once.'),
    ],
    checkpoint: [
      ck(ORC, 'Two nodes run in the same step of a claims graph and both return a value for `notes`, which is declared as a plain `list[str]`. What happens?', [
        ['The graph raises InvalidUpdateError for the key notes', true],
        ['The node that finishes last wins and the other write is lost', false],
        ['The two lists are concatenated as a default merge', false],
      ], 'A key without a reducer accepts one value per step. LangGraph refuses to guess which write wins and tells you to add an Annotated reducer such as operator.add.'),
      ck(ORC, 'You are designing a KYC graph and write the arrow "send to manual review if the model is not sure about the face match". What should change before you write code?', [
        ['Nothing; the router can ask the model whether it is sure', false],
        ['Add a confidence field and route on a threshold of it', true],
        ['Replace the arrow with a ToolNode that decides at run time', false],
      ], 'An edge condition should be a short deterministic test on state. Making confidence a field lets the router be plain code that can be unit-tested; asking the model again adds a call and makes routing unpredictable.'),
      ck(ORC, 'After a run on thread "LN-2041", `app.get_state(cfg).next` returns `()`. What does that tell you?', [
        ['The thread id was never used and has no state', false],
        ['The run is paused, waiting for an input to resume', false],
        ['The run reached END; nothing is scheduled to run', true],
      ], 'next lists the nodes due to run from that checkpoint. An empty tuple means the graph finished. A paused run shows the waiting node in next, and an unknown thread has no values at all.'),
    ],
  },

  /* ── AGENT_PATTERNS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_AGENT_PATTERNS',
    notes: `In Building AI Agents you met the workflow patterns — chaining, routing, parallelisation,
orchestrator–workers, evaluator–optimiser — and the rule "start with the simplest thing". This unit
takes the four patterns people actually mean when they say *agent* and puts a number on each: how many
model calls it makes, how its context grows, and how it fails. Those numbers are how you justify a
design in a review, and in an interview.

The running example is a personal-finance assistant for a Bengaluru fintech: "Compare 1-year FD rates at
SBI and HDFC". All four were built as LangGraph graphs with a scripted fake model that counts calls.

## 1. ReAct: think, act, observe, repeat

The model decides each next step from everything so far: call a tool, read the result, decide again,
until it answers. This is exactly the \`agent → tools → agent\` loop you built with \`tools_condition\`.

    def agent(s: MessagesState):
        return {"messages": [model.invoke(s["messages"])]}

    g.add_conditional_edges("agent", tools_condition)
    g.add_edge("tools", "agent")

Run with a model that fetches SBI, then HDFC, then answers:

    ReAct: HDFC pays 7.1% against SBI's 6.8% for 12 months. | model calls: 3 | messages: 6

**Cost:** tool rounds + 1 model calls. If the model asks for both rates in **one** message (parallel
tool calls), \`ToolNode\` runs both and it drops to 2 calls and 5 messages. **Context:** every call
resends the whole history, so input tokens grow with each round — a 12-round run pays for the first
tool result twelve times.
**Good at:** open-ended tasks where the next step depends on what the last one found.
**Fails by:** wandering, repeating a tool call, and getting slower and costlier as the history grows.
Needs the stop conditions from Building AI Agents: step limit, budget, no-progress detection.

## 2. Plan-and-execute

One call writes a plan; an executor works through the steps; a final call writes the answer.
Optionally a **replanner** looks at results and edits the remaining steps.

    class PlanState(TypedDict):
        task: str
        plan: list[str]
        results: Annotated[list[str], operator.add]
        answer: str

    def planner(s):  return {"plan": llm("PLAN " + s["task"]).splitlines()}
    def executor(s):
        step = s["plan"][len(s["results"])]
        return {"results": [llm("STEP " + step)]}
    def more_steps(s):
        return "executor" if len(s["results"]) < len(s["plan"]) else "synthesise"

With a three-step plan:

    Plan-and-execute: ['done: 1. get SBI 12-month rate', 'done: 2. get HDFC 12-month rate', 'done: 3. compare'] | model calls: 5

**Cost:** 1 plan + N steps + 1 answer (+ replans). More calls than ReAct here — but each executor call
sees **only its step**, not the whole history, so calls are short and the executor can be a smaller,
cheaper model. Independent steps can run in parallel (the fan-out unit).
**Good at:** long tasks with a predictable shape; plans a human or code can check before anything runs.
**Fails by:** a plan made before the facts are known. If step 1 finds HDFC has no 1-year FD, a plan
without a replanner carries on regardless.

## 3. Reflection (generate, critique, revise)

One call drafts, another critiques against criteria, and the loop repeats until the critique passes or
a round limit is hit — the evaluator–optimiser pattern, applied to the agent's own output.

    def again(s):
        if s["feedback"].startswith("PASS") or s["rounds"] >= 3:
            return END
        return "write"

The critic first failed the draft for not mentioning the 5-lakh DICGC deposit insurance cover, then
passed v2:

    Reflection: {'draft': 'v2', 'feedback': 'PASS', 'rounds': 2} | model calls: 4

**Cost:** 2 calls per round. **Good at:** output with checkable criteria — a compliance checklist, SQL
that must run, code that must pass tests. **Fails by:** a model grading itself with vague criteria
("is this good?") passes nearly everything or loops forever on taste. Make the critic **code** where
you can (run the SQL, run the tests, check every required clause), and a model only for what code
cannot check.

## 4. Routing

One call (or a rule) classifies the request and hands it to a specialised prompt or sub-graph.

    g.add_conditional_edges("classify", lambda s: s["route"], {"kyc": "kyc", "card": "card"})

    Routing: KYC answer | model calls: 2

**Cost:** 1 + whatever the chosen branch costs. A keyword rule or a small classifier makes the first
step nearly free. **Good at:** a support desk where most requests fall into known kinds, each with its
own tools and instructions. **Fails by:** misrouting — so log the route, evaluate the classifier on
its own (you know how from Evaluating and Securing LLM Features) and give an "other" branch.

## Choosing: the simplest one that works

| Pattern | Model calls | Context per call | Pick it when |
|---|---|---|---|
| Routing | 1 + branch | small | requests fall into known kinds |
| Reflection | 2 × rounds | the draft | quality is checkable |
| Plan-and-execute | 1 + N + 1 | one step | the shape is predictable |
| ReAct | rounds + 1 | grows | the next step depends on the last |

Patterns combine: a router whose "research" branch is a ReAct agent, whose final answer goes through a
code-based reflection check, is a normal production design. What is not normal is picking ReAct for
everything because it is the demo everyone has seen. Write down the expected call count for a typical
request, multiply by tokens per call and the provider's price per million tokens, and compare designs
on paper before you build. Then trace real runs (Running AI in Production) and check your estimate.`,
    workedExample: `**Problem.** A fintech's product manager wants "an agent" for three features. Pick a pattern for each,
estimate model calls for a typical request, and say what would make you change your mind.

**Feature A — support chat: "My video KYC failed twice", "Card blocked after wrong PIN", "Change
nominee".** About 90% of requests fall into eight known intents, each with its own policy text and
one or two tools.
*Choice:* **routing** to eight small branches, plus an "other" branch to a human.
*Calls:* 1 classify + 1 to 2 in the branch = **2 to 3**. A keyword pre-filter catches the obvious
ones ("KYC", "PIN") with zero calls.
*Change my mind if:* conversations regularly mix intents ("KYC failed so my card is blocked") — then
the branch must be able to hand back to the router, or one ReAct agent with all tools may be simpler.

**Feature B — "Find me the best 1-year FD across these 5 banks for a senior citizen".**
*Choice:* this looks like ReAct, but the shape is fixed: look up 5 rates, apply the senior bonus,
rank. **Plan-and-execute with a fixed plan** — actually a workflow — with the 5 look-ups in parallel.
*Calls:* the look-ups are tool calls, not model calls; **1** call writes the answer from a table.
A ReAct version would make about **6** calls with a growing history.
*Change my mind if:* users ask open questions ("is a corporate FD safer?") that need searching
whose next step depends on what was found — that part goes to a ReAct branch.

**Feature C — draft a loan-rejection letter that meets the lender's fair-practice checklist (reason
stated, grievance officer named, in the customer's language).**
*Choice:* **reflection**, with the critic mostly code: check the required clauses are present, the
reason matches the decision code, the language matches the profile; a model critic only for tone.
*Calls:* 1 draft + 1 tone check per round, 2 rounds typical, limit 3 = **4**, worst case 6.
*Change my mind if:* the first draft passes 98% of the time on the eval set — then drop the loop and
keep only the code check, which blocks the 2% for a human.

**The pattern in the answers.** None of the three is a free-roaming agent. Each choice names a call
count, a failure that would change it, and where code replaces a model.`,
    mcqs: [
      mcq('A ReAct agent answers "compare SBI and HDFC FD rates" with 3 model calls. The model is then prompted so it requests both rates in a single message. How many model calls does the run now make?', [
        ['2, because one round runs both tool calls', true],
        ['3, because each tool still needs its own model call', false],
        ['1, because the tool node writes the final answer', false],
      ], 'ToolNode runs every tool call in the last AI message, so one model call requests both, and a second writes the answer. Tools do not need model calls of their own, and the tool node does not compose answers.'),
      mcq('A reflection loop for marketing copy uses the same model as critic with the instruction "Is this copy good? Reply PASS or FAIL." What is the most likely problem?', [
        ['The loop can never terminate unless the critic returns a numeric score', false],
        ['The critic passes nearly everything, so nothing improves', true],
        ['Reflection requires two different model providers', false],
      ], 'With vague criteria a model grading output like its own tends to approve it. Reflection pays off when the critic checks specific, preferably code-checkable criteria; a round limit already handles termination.'),
      mcq('Why can the executor in a plan-and-execute agent often use a smaller, cheaper model than the planner?', [
        ['Executors never call tools, so they need far less reasoning ability', false],
        ['The planner caches its tokens for the executor to reuse', false],
        ['Each executor call sees one focused step, not the full history', true],
      ], 'The executor gets a narrow, well-specified step, which smaller models handle well. Executors usually do call tools, and there is no token sharing between planner and executor calls.'),
    ],
    checkpoint: [
      ck(FUN, 'A research agent must investigate why a merchant\'s UPI settlements are failing; each finding (logs, bank status page, config) decides what to look at next. Which pattern fits best?', [
        ['ReAct, because each next step depends on the previous result', true],
        ['Routing, because settlement failures are a known category', false],
        ['Reflection, because the diagnosis must be checked before use', false],
      ], 'When the next action depends on what the last one found, the model must decide step by step, which is ReAct. Routing only picks a branch once; reflection improves a finished output rather than investigating.'),
      ck(FUN, 'A plan-and-execute agent planned "1. fetch the account statement 2. compute EMI capacity 3. draft the offer". Step 1 returns "account closed". With no replanner, what happens?', [
        ['The executor skips to step 3 because step 1 failed', false],
        ['Steps 2 and 3 still run on a plan that no longer fits', true],
        ['The planner is called again automatically to revise it', false],
      ], 'A plan is fixed when it is made. Without a replanner node that looks at results, the executor carries on through the stale plan. LangGraph adds no automatic replanning or skipping.'),
      ck(FUN, 'A team estimates cost for a ReAct agent that averages 10 tool rounds. Why is "11 calls × the tokens of one call" an underestimate?', [
        ['Tool results are billed at a higher per-token rate than prompts', false],
        ['Each call resends the growing history, so later calls are longer', true],
        ['ReAct always makes one hidden planning call per tool round', false],
      ], 'Every ReAct call includes the full conversation so far, so input tokens per call grow with each round. Tool output is billed like other input tokens, and there is no hidden planning call.'),
    ],
  },

  /* ── MULTI_AGENT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_MULTI_AGENT',
    notes: `A **multi-agent system** is several agents — each with its own instructions, tools and often its own
model — coordinated by code or by another agent. It is the most over-used idea in agentic AI. Used
well, it keeps each agent small and testable. Used badly, it multiplies cost and loses information at
every hand-off. This unit builds the common design, a **supervisor with specialists**, and then gives
you the test for whether you need it at all.

The example: an employee helpdesk at a Hyderabad IT services company. "Why was my cab claim EX-881
rejected?" needs the travel policy (a RAG agent over HR documents) and the claim record (an agent with
the expense system's API), then a clear answer.

## The supervisor

The supervisor decides who works next. In LangGraph a node can return a **\`Command\`**, which updates
state **and** chooses the next node in one return — no separate router function:

    from langgraph.types import Command

    class TeamState(TypedDict):
        question: str
        findings: Annotated[list[str], operator.add]
        turns: int
        answer: str

    def supervisor(state: TeamState) -> Command[Literal["policy_agent", "expense_agent", "writer", "__end__"]]:
        turns = state.get("turns", 0) + 1
        if turns > 6:
            return Command(goto=END, update={"answer": "Stopped: too many hand-offs.", "turns": turns})
        nxt = decide_next(state)            # a structured-output model call in production
        return Command(goto=nxt, update={"turns": turns})

Each specialist does its job and returns control:

    def expense_agent(state: TeamState) -> Command[Literal["supervisor"]]:
        claim = expense_api.get_claim(...)  # its own tools, its own prompt
        return Command(goto="supervisor", update={"findings": [summarise(claim)]})

The \`Command[Literal[...]]\` annotation lists where the node may go, so the drawing is complete:

    __start__ --> supervisor;
    expense_agent -.-> supervisor;
    policy_agent -.-> supervisor;
    supervisor -.-> __end__;
    supervisor -.-> expense_agent;
    supervisor -.-> policy_agent;
    supervisor -.-> writer;
    writer --> __end__;

A scripted run:

    supervisor turn 1 -> policy_agent
    supervisor turn 2 -> expense_agent
    supervisor turn 3 -> writer
    Claim EX-881 will be rejected: it is 41 days old and the policy allows 30 (Sec 4.3).

Make \`decide_next\` a structured-output call that must return one of the allowed names (an \`enum\`
in the schema) and **validate it in code**; a supervisor that returns "the HR agent" instead of
\`policy_agent\` should fall back to a safe default, not crash. The \`turns\` cap is not optional: two
agents that keep handing work back to each other is the classic multi-agent failure, and the
recursion limit is a blunt last resort.

## Shared state versus private state

The team state is **shared**: every agent reads it, and the supervisor's prompt is built from it. Put
there only what other agents need — findings, decisions, the final answer. Keep each specialist's
working memory **private** by making it a separate graph with its own schema:

    class PolicyState(TypedDict):
        question: str
        chunks: list[str]       # private: retrieved chunks never reach the team state
        summary: str

    policy_graph = pg.compile()     # retrieve -> summarise

    def policy_agent(state: TeamState) -> Command[Literal["supervisor"]]:
        result = policy_graph.invoke({"question": state["question"]})
        return Command(goto="supervisor", update={"findings": [result["summary"]]})

After the run the team state has only \`['answer', 'findings', 'question', 'turns']\`. The three
retrieved chunks — including an irrelevant one about leave rules — never reached the supervisor's or
the writer's context. That is the main benefit of multi-agent design: **each model sees a small,
relevant context**. It also limits damage: a prompt injection in a retrieved document can only steer
the policy agent, whose output is a short summary the others treat as data (Evaluating and Securing
LLM Features covered why that boundary matters).

## Hand-offs without a supervisor

Sometimes a specialist knows the request belongs elsewhere. A node inside a sub-graph can jump to a
node in the **parent** graph:

    def triage(s):
        if "claim" in s["question"].lower():
            return Command(goto="expense_agent", graph=Command.PARENT,
                           update={"findings": ["handed off by policy triage"]})
        return {"findings": ["POLICY: answered directly"]}

Here the sub-graph was added directly as a node (\`g.add_node("policy_agent", sg.compile())\`), so it
shares the \`question\` and \`findings\` keys with the parent. The result:

    {'question': 'Where is my claim?', 'findings': ['handed off by policy triage', 'CLAIM checked'], ...}

Hand-offs lose context: the receiving agent knows only what is in shared state. Write a **hand-off
note** into state ("user asks about claim EX-881; policy section 4.3 applies") rather than relying on
the next agent to reread the conversation.

## When several agents are worse than one

Count before you split:

- **Cost and latency.** The supervisor adds a model call per turn. Three turns of supervisor plus two
  specialists plus a writer is six calls where one agent with four tools might make three.
- **Lost information.** Each hand-off summarises. Details the next agent needed get dropped.
- **Compounding errors.** If each agent is right 95% of the time, a chain of four is right about 81%.
- **Harder to evaluate.** A wrong answer now has five places it could have come from.

Prefer **one agent with good tools** until you hit a concrete limit: too many tools for one prompt to
choose between reliably (the Tools and Memory topic discusses where that starts), sub-tasks that need
**different permissions** (the expense agent may read claims; the policy agent must not), sub-tasks
that need different models, or contexts that will not fit together. Each of those is a reason you can
write in a design doc. "It is more agentic" is not.`,
    workedExample: `**Problem.** Design the helpdesk for: travel claims, leave balances, payslip questions and IT access
requests. Decide between one agent and a supervisor with specialists, and defend it.

**Step 1 — list tools and permissions.**

| Area | Tools | Data sensitivity |
|---|---|---|
| Policy questions | search HR policy documents | public inside the company |
| Travel claims | get_claim, list_claims | the employee's own claims |
| Leave | get_leave_balance, apply_leave | own record; apply_leave writes |
| Payslips | get_payslip | salary — most sensitive |
| IT access | create_access_ticket | writes to the ITSM tool |

Eight tools. One agent could hold that many — the count alone does not force a split.

**Step 2 — find the real reasons to split.**
- Payslip data is the most sensitive. Keeping \`get_payslip\` in its own agent, with its own short
  prompt and its own audit log, means a prompt injection in a policy PDF cannot reach it.
- Two tools write (\`apply_leave\`, \`create_access_ticket\`) and need approval (next-but-one unit).
- Policy answers need RAG with long retrieved chunks; the others need small structured records.
  Mixing them makes every call carry policy text it does not need.

**Step 3 — the design.** A supervisor with four specialists: policy (RAG, read-only), claims
(read-only), people (leave and payslip, with the payslip tool behind a check that the requester is the
employee) and IT (ticket writer with approval). The supervisor sees only the question and short
findings, never raw payslips. A \`turns\` cap of 6 and an "I'll pass this to HR" exit.

**Step 4 — what it costs.** Typical request: 2 supervisor calls + 1 specialist (1 to 3 calls) + no
separate writer, because the specialist's summary is the answer = **3 to 5 calls**. A single agent
would average about 3. The extra calls buy isolation of salary data and smaller contexts — a trade
worth writing down.

**Step 5 — the test that keeps you honest.** Build the single-agent version too, run both on the same
40-question eval set, and compare success, cost and latency. If one agent matches on quality and the
permission concern can be met with tool-level checks, ship the single agent.`,
    mcqs: [
      mcq('A specialist node returns `Command(goto="supervisor", update={"findings": [summary]})`. What does this do that a plain dict return cannot?', [
        ['It updates state and picks the next node in one return value', true],
        ['It runs the supervisor in parallel with the specialist node that returned it', false],
        ['It makes the update private so other agents cannot read it', false],
      ], 'Command combines a state update with routing, replacing a separate conditional edge. It does not create parallel branches, and the update goes into shared state like any other.'),
      mcq('In the helpdesk graph, the policy specialist is its own compiled graph with a `chunks` key, called from a wrapper node that returns only `findings`. What is the main benefit?', [
        ['The policy agent can now run without any checkpointer at all', false],
        ['Retrieved chunks stay out of the supervisor\'s and writer\'s context', true],
        ['The sub-graph automatically retries retrieval when it fails', false],
      ], 'A separate schema keeps working data private, so other agents see only the short summary: smaller contexts and a smaller blast radius for injected text. Checkpointing and retries are unrelated to the schema split.'),
      mcq('Four agents are chained, each correct about 95% of the time independently. Roughly how often is the end result right?', [
        ['About 95%, because the supervisor corrects every agent\'s mistakes', false],
        ['About 81%, because the errors compound along the chain', true],
        ['About 99%, because four agents vote on the answer', false],
      ], '0.95 to the power 4 is about 0.81. Errors compound in a chain unless something checks each step; a supervisor that only routes does not correct, and a chain is not a vote.'),
    ],
    checkpoint: [
      ck(ORC, 'A supervisor and a specialist keep handing a request back and forth, and the run only stops at `GraphRecursionError`. What is the right fix in the design?', [
        ['Raise recursion_limit so the two agents have enough time to agree', false],
        ['Count turns in state and end with a clear message past a cap', true],
        ['Remove the supervisor so the specialist must answer alone', false],
      ], 'A turn counter in state lets the supervisor stop deliberately with an honest message; the recursion limit is a last-resort crash. Raising the limit only spends more, and removing the supervisor changes the whole design.'),
      ck(ORC, 'A team splits one working agent into five specialists "to be more agentic". Quality is unchanged and cost has doubled. Which justification would actually support a split?', [
        ['The salary tool must be isolated from documents users can upload', true],
        ['Five agents look better in the architecture diagram for clients', false],
        ['Each specialist can then share one prompt to save maintenance', false],
      ], 'Different permissions are a concrete reason to separate agents: an injection in an uploaded document should not be able to reach salary data. Appearance is not a reason, and sharing one prompt removes the point of specialists.'),
      ck(ORC, 'The policy agent hands off to the claims agent with `Command(goto="expense_agent", graph=Command.PARENT)` but writes nothing else. The claims agent then asks the user which claim they mean. Why?', [
        ['Command.PARENT clears the shared state during the jump', false],
        ['The claims agent reads state, and no hand-off note was written', true],
        ['Hand-offs between sub-graphs always restart the conversation', false],
      ], 'The receiving agent knows only what is in shared state. Writing a hand-off note (claim id, relevant policy) in the Command update fixes it. The jump keeps state; it does not clear or restart anything.'),
    ],
  },

  /* ── PARALLEL_WORK ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_PARALLEL_WORK',
    notes: `Model calls are slow — seconds each — and most of that time your process is waiting on the network.
When sub-tasks do not depend on each other, run them at the same time: a research agent that searches
the web **and** queries a database, or a contract review that summarises forty PDFs. Four branches of
2 seconds each finish in about 2 seconds, not 8. This unit covers the two ways LangGraph runs work in
parallel, how results are joined, and what happens when one branch fails.

## Static fan-out and fan-in

When the branches are known when you write the graph, add two edges from the same place. To wait for
**both** before continuing, give \`add_edge\` a list:

    g.add_edge(START, "search")
    g.add_edge(START, "data")
    g.add_edge(["search", "data"], "write")     # write runs once, after both

    {'q': 'UPI growth', 'web': '3 sources', 'data': 'RBI table', 'report': '3 sources + RBI table'}

LangGraph runs in **super-steps**: every node scheduled for a step runs concurrently, their updates
are applied together, then the next step starts. \`search\` and \`data\` share a step. If both wrote
the **same** key it would need a reducer — the \`InvalidUpdateError\` from the state-graphs unit. Here
they write different keys, so none is needed.

## Dynamic fan-out with Send: map over a list

When the number of branches is known only at run time — one per uploaded contract — a conditional
edge returns a list of **\`Send\`** objects. Each \`Send(node, payload)\` starts one run of the node
with **that payload as its input**:

    from langgraph.types import Send

    class Review(TypedDict):
        contracts: list[str]
        summaries: Annotated[list[dict], operator.add]
        report: str

    def fan_out(state: Review):
        return [Send("summarise_one", {"contract": c}) for c in state["contracts"]]

    def summarise_one(item: dict) -> dict:
        risk = call_model(item["contract"])
        return {"summaries": [{"contract": item["contract"], "risk": risk}]}

    def join(state: Review) -> dict:
        names = sorted(s["contract"] for s in state["summaries"])
        return {"report": f"{len(names)} contracts reviewed: {', '.join(names)}"}

    g.add_conditional_edges(START, fan_out, ["summarise_one"])
    g.add_edge("summarise_one", "join")

Three rules:

- **The payload is all the branch sees.** \`summarise_one\` receives \`{"contract": ...}\`, not the
  graph state. If it needs the user's question, put the question in the payload.
- **The join key needs a reducer.** Every branch writes \`summaries\` in the same step;
  \`operator.add\` collects them.
- **Finishing order is not list order.** Branches finish in any order: with sleeps of 0.3, 0.1 and
  0.2 s for a, b and c, \`stream_mode="updates"\` yields b, then c, then a. The reducer still applied
  the writes in the order the Sends were made (\`['a', 'b', 'c']\` in the tested version), but that is
  an implementation detail, and a recorded error or a resumed branch changes what is in the list. Key
  results by id (\`{"contract": ...}\`) and sort in the join — never rely on position.

\`join\` runs once, after all branches of the step have finished. That is the **map-reduce** shape:
map a model call over many items, reduce in one place. For long documents it is also how you beat the
context window: summarise sections in parallel, then summarise the summaries.

## Speed, and not hitting the rate limit

With four 0.2-second branches (a sleep standing in for the model call):

    parallel: 0.2s
    max_concurrency=1: 0.8s

\`max_concurrency\` in the config caps how many branches run at once. Forty contracts sent at once will
hit the provider's requests-per-minute limit (Running AI in Production covered rate limits), so set it
to what your quota allows: \`app.invoke(inp, {"configurable": {...}, "max_concurrency": 8})\`.

## When one branch fails

Make \`vendor-C.pdf\` raise \`TimeoutError\`, with an \`InMemorySaver\` checkpointer on thread
\`review-17\`:

    run failed: model timed out on vendor-C.pdf after 0.2s
    ran: ['vendor-A.pdf', 'vendor-B.pdf', 'vendor-C.pdf', 'vendor-D.pdf']
    next: ('summarise_one',) | summaries in state: 3
    tasks: [('summarise_one', False), ('summarise_one', False), ('summarise_one', True), ('summarise_one', False)]

One exception fails the whole step and the invoke raises — \`join\` never runs. But with a
checkpointer, the three **successful** branches' writes were saved as pending writes. Fix the cause and
resume with \`app.invoke(None, cfg)\`:

    re-ran: ['vendor-C.pdf']
    4 contracts reviewed: vendor-A.pdf, vendor-B.pdf, vendor-C.pdf, vendor-D.pdf

Only the failed branch ran again — the other three model calls were not paid for twice. Without a
checkpointer, the whole fan-out starts over.

## Decide per error: retry, record, or fail

Not every failure should stop the report. Sort errors into three kinds:

- **Transient** (a 503, a dropped connection): retry with back-off. Attach a \`RetryPolicy\` to the
  node and name the exceptions:

        g.add_node("summarise_one", summarise_one,
                   retry_policy=RetryPolicy(max_attempts=3, initial_interval=0.1, retry_on=ConnectionError))

- **Permanent for this item** (a PDF with no text layer): catch it in the branch and **record** it, so
  the other branches' work is used and the report says what is missing:

        def summarise_one(item):
            try:
                return {"summaries": [{"contract": item["contract"], "risk": call_model(item["contract"])}]}
            except ValueError as e:
                return {"summaries": [{"contract": item["contract"], "error": str(e)}]}

- **Fatal for the run** (bad credentials, a bug): let it raise.

With B failing once with \`ConnectionError\` and C having no text layer:

    2 of 3 reviewed
    NOT REVIEWED vendor-C.pdf: PDF has no text layer
    {'vendor-A.pdf': 1, 'vendor-B.pdf': 2, 'vendor-C.pdf': 1}

B succeeded on its second attempt; C was tried once, because retrying a permanent error only wastes
time and money. A report that says "2 of 3 reviewed, C not reviewed because…" is honest. A report that
silently covers only two contracts is a production incident waiting for a client to notice.`,
    workedExample: `**Problem.** A legal-ops team at a Gurugram SaaS company uploads 40 vendor contracts each month and
wants each one's renewal, liability and termination risks, then a one-page summary. One model call per
contract takes about 6 seconds. The provider allows 10 concurrent requests on their plan. Design the
graph and the failure handling.

**Step 1 — sequential baseline.** 40 × 6 s = 240 s, four minutes for a user staring at a spinner.

**Step 2 — fan out with Send.** One \`Send("summarise_one", {"contract_id": c, "checklist": state["checklist"]})\`
per contract. The checklist goes in the payload because the branch cannot see graph state.
\`max_concurrency\` = 10 to match the quota: 4 waves × 6 s ≈ **24 s**. Run it as a background job
(Running AI in Production) and show progress from \`stream_mode="updates"\` as each branch finishes.

**Step 3 — the join.** \`summaries: Annotated[list[dict], operator.add]\`. \`join\` sorts by contract id
and writes one row per contract plus a model-written one-page summary — one more call, over the short
summaries rather than 40 contracts.

**Step 4 — failures.**
- 429 / 503 from the provider → \`RetryPolicy(max_attempts=3, retry_on=...)\` on the node, with the
  exception classes your client raises for those.
- Scanned PDF, no text → caught in the branch, recorded as \`{"error": "no text layer — needs OCR"}\`.
- The model returns JSON that fails the Pydantic schema → one re-ask inside the branch, then recorded.
- Anything else raises. A checkpointer on the thread means a resume re-runs only the failed contracts.

**Step 5 — the result the team sees.**

    38 of 40 reviewed
    NOT REVIEWED ACME-2291.pdf: no text layer — needs OCR
    NOT REVIEWED ZENITH-0417.pdf: model output failed schema twice

**Why this design.** Ten-way parallelism cut four minutes to under half a minute without breaking the
quota. Sorting errors by kind means transient ones heal themselves, permanent ones are visible, and one
bad PDF never costs the other 39 results.`,
    mcqs: [
      mcq('A `Send("score_resume", {"resume_id": r})` branch reads `state["job_description"]` and fails with `KeyError`. Why?', [
        ['The job description was removed by the reducer on fan-out', false],
        ['Send branches run before the graph state is first written', false],
        ['The branch receives only its payload, not the graph state', true],
      ], 'A node started by Send gets the payload it was sent as its input. Anything else it needs, such as the job description, must be included in the payload.'),
      mcq('Four Send branches run; one raises and the graph has a checkpointer. After fixing the cause you call `app.invoke(None, cfg)`. What runs?', [
        ['Only the failed branch, then the join node', true],
        ['All four branches, since the step never completed', false],
        ['Only the join, using the three results that succeeded', false],
      ], 'The successful branches\' writes were saved as pending writes, so resuming re-runs only the failed task and then continues. The join cannot run on partial results because the step did not complete.'),
      mcq('A branch fails because a PDF has no text layer. Which handling fits this kind of error?', [
        ['Retry it with exponential back-off up to five times', false],
        ['Catch it in the branch and record it in the result', true],
        ['Let it raise so the whole review stops for this run', false],
      ], 'The error is permanent for that item, so retrying is wasted and stopping the run throws away the other branches\' work. Recording it lets the report say honestly what was not reviewed.'),
    ],
    checkpoint: [
      ck(ORC, 'A graph has `add_edge(START, "web")`, `add_edge(START, "db")` and `add_edge(["web", "db"], "write")`. When does `write` run?', [
        ['Once, after both web and db have finished', true],
        ['Twice, once as each of web and db finishes', false],
        ['Once, as soon as the faster of the two finishes', false],
      ], 'Passing a list of start nodes to add_edge creates a join that waits for all of them. Two separate edges into write would instead trigger it from each.'),
      ck(ORC, 'Sixty Send branches each call the model, and the provider starts returning 429 errors. Which setting addresses this most directly?', [
        ['A larger recursion_limit set in the run configuration', false],
        ['A max_concurrency value matched to the quota', true],
        ['An operator.add reducer on the results key', false],
      ], 'max_concurrency caps how many branches run at once, keeping requests within the rate limit. The recursion limit counts steps, and a reducer only merges results.'),
      ck(ORC, 'A progress bar labels each streamed update from a contract fan-out as "contract 1", "contract 2" and so on, by arrival. Users see the wrong names against the results. What is the cause?', [
        ['operator.add reverses each list at the end of the super-step', false],
        ['Send payloads are always processed in alphabetical order', false],
        ['Branches finish in any order, so arrival order varies', true],
      ], 'Streamed updates arrive as branches complete, which depends on timing. Each result should carry its contract id and be labelled from that. The reducer does not reverse lists, and Send does not sort payloads.'),
    ],
  },

  /* ── HUMAN_IN_THE_LOOP ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_HUMAN_IN_THE_LOOP',
    notes: `In Building Agents in Python you paused a tool with \`interrupt()\` and resumed it with
\`Command(resume="approve")\`. Real approval flows need more than yes or no. An operations person wants
to **edit** the refund amount before approving, **reject** with a reason that goes in the audit log,
or **correct** a wrong field the agent extracted. Several branches may each need a decision. And the
person may answer an hour later, from a different server. This unit builds that.

The example: an e-commerce support agent in Chennai proposes refunds; anything it proposes needs a
person on the ops team before money moves.

## Design the pause: what does the reviewer see and send back?

The value you pass to \`interrupt()\` is what your UI shows; the value passed to \`Command(resume=...)\`
is what the reviewer sends back. Make both explicit structures:

    def review(s) -> Command[Literal["execute", "__end__"]]:
        decision = interrupt({"question": "Approve this refund?", "call": s["proposed"]})
        if decision["action"] == "approve":
            return Command(goto="execute", update={"audit": ["approved by " + decision["by"]]})
        if decision["action"] == "edit":
            call = {**s["proposed"], "args": {**s["proposed"]["args"], **decision["args"]}}
            return Command(goto="execute",
                           update={"proposed": call, "audit": [f"edited by {decision['by']}: {decision['args']}"]})
        return Command(goto=END, update={"result": "rejected: " + decision["reason"],
                                         "audit": ["rejected by " + decision["by"]]})

The approval is its **own node**, between the node that proposes and the node that executes. The
proposed tool call is data in state (\`{"tool": "issue_refund", "args": {...}}\`), not a call already in
flight — so it can be shown, edited or dropped. Validate the edited arguments with the same Pydantic
model the tool uses: an editor can mistype too.

## Running it

    out = app.invoke({"ticket": "Damaged mixer grinder", "audit": []}, cfg)
    print("paused with:", out["__interrupt__"][0].value)
    print("next:", app.get_state(cfg).next)

    paused with: {'question': 'Approve this refund?', 'call': {'tool': 'issue_refund', 'args': {'order_id': 'OD-5531', 'amount': 1499}}}
    next: ('review',)

Meera on the ops team reduces the amount:

    out = app.invoke(Command(resume={"action": "edit", "by": "meera@ops", "args": {"amount": 999}}), cfg)

    refunded Rs 999 on OD-5531 ["edited by meera@ops: {'amount': 999}"]

And a rejection on another thread ends the run without touching money:

    rejected: outside 7-day window ['rejected by meera@ops']

## The node runs again from the top

With a print at the start of each node, the edit run shows:

    first call
      propose ran
      review ran
    resume with edit
      review ran

\`review\` ran **twice**: once up to the \`interrupt\`, and again from its first line on resume, when
\`interrupt()\` returns the decision instead of pausing. \`propose\` did not run again — it finished
before the pause and its output is in the checkpoint. So:

- Nothing with a side effect goes **before** \`interrupt()\` in the same node. Keep the approval node
  free of side effects and do the work in the next node.
- Several \`interrupt()\` calls in one node are matched to resume values **by order**. Do not put them
  inside a loop or a branch whose path can change between runs.

## Correcting state: update_state

Sometimes the reviewer must fix the agent's work, not just its tool call — a wrong order id the agent
extracted. \`update_state\` writes into the paused thread as if a node had returned it:

    app.update_state(cfg3, {"proposed": {"tool": "issue_refund", "args": {"order_id": "OD-5532", "amount": 1499}}})
    print("after update_state, next:", app.get_state(cfg3).next)     # ('review',)
    out = app.invoke(Command(resume={"action": "approve", "by": "ravi@ops"}), cfg3)

    refunded Rs 1499 on OD-5532

Reducers apply to \`update_state\` too: updating an \`operator.add\` key appends rather than replaces.

## Several pauses at once

When parallel branches each call \`interrupt()\`, the result holds one \`Interrupt\` per branch, each with
an \`id\`. Resume all of them in one call with a dict from id to answer:

    out = m.invoke({"items": ["asha", "vikram"]}, c)
    print([i.value for i in out["__interrupt__"]])      # ['send email to asha?', 'send email to vikram?']
    answers = {i.id: ("yes" if "asha" in i.value else "no") for i in out["__interrupt__"]}
    out = m.invoke(Command(resume=answers), c)
    print(sorted(out["done"]))                            # ['asha:yes', 'vikram:no']

## Resume, do not re-send

A paused thread must be continued with \`Command(resume=...)\`. Calling \`invoke\` with **new input**
on it starts the graph again from \`START\`, which reaches the interrupt again and pauses again — the
classic "I clicked Approve and nothing happened" bug. Without a checkpointer there is nothing to resume
at all: \`Command(resume=...)\` raises \`RuntimeError: Cannot use Command(resume=...) without
checkpointer\`.

\`compile(interrupt_before=["execute"])\` is a quicker static breakpoint that pauses before a named
node; resume it with \`invoke(None, cfg)\`. It is handy while debugging; for product approval flows,
\`interrupt()\` with a designed payload is clearer.

## Around the graph: the approval service

- **Who may approve.** The resume endpoint checks that the logged-in user has the approver role for
  this thread's tenant, and records \`by\` from the session — never from the request body.
- **Expiry.** Store pending approvals in a table (thread id, payload, created at). A job rejects ones
  older than, say, 24 hours, by resuming them with \`{"action": "reject", "reason": "expired"}\`.
- **Audit.** The \`audit\` list in state plus \`get_state_history\` show who decided what, and when.
- **Approval fatigue.** If reviewers approve 99% of requests within seconds, they are not reviewing.
  Auto-approve the low-risk class (refunds under a threshold, say) and send people only what deserves a
  look.`,
    workedExample: `**Problem.** Add an approval step to an HR agent that drafts and sends offer letters. A recruiter must
approve, edit the CTC or joining date, or reject. Trace one request through the edit path and list the
traps.

**Step 1 — the state and nodes.**

    class Offer(TypedDict):
        candidate_id: str
        draft: dict          # {"ctc_lpa": 12.0, "joining": "2026-01-05", "letter": "..."}
        audit: Annotated[list[str], operator.add]
        result: str

\`draft_offer\` (model call) → \`recruiter_review\` (interrupt only) → \`send_offer\` (side effect:
email and ATS update) → END. Rejection goes straight to END.

**Step 2 — the pause.** \`recruiter_review\` calls
\`interrupt({"candidate": cid, "ctc_lpa": 12.0, "joining": "2026-01-05", "letter": "..."})\`.
The API returns that payload; the recruiter UI shows it with Approve / Edit / Reject.

**Step 3 — the edit.** Priya changes the CTC to 13.5 LPA. The UI posts
\`{"action": "edit", "changes": {"ctc_lpa": 13.5}}\`. The endpoint checks Priya is a recruiter on this
requisition and adds \`"by": "priya@hr"\` from her session, then calls
\`app.invoke(Command(resume=decision), {"configurable": {"thread_id": cid}})\`.
\`recruiter_review\` runs again from the top; \`interrupt\` returns the decision. It validates
\`ctc_lpa\` against the requisition's band (13.5 is inside 10–15), regenerates **only the numbers in
the letter template** — not a fresh model call that could change other wording — and returns
\`Command(goto="send_offer", update={...})\`.

**Step 4 — the side effect, once.** \`send_offer\` uses \`candidate_id + ":offer"\` as an idempotency
key for the email service and the ATS (the durable-execution unit explains why).

**Traps found in review.**
- The first version sent a "your offer is being prepared" email in \`recruiter_review\` before the
  \`interrupt\` — candidates got it twice, because the node re-runs on resume. Moved to \`draft_offer\`.
- The front end posted a new message "approved" instead of calling the resume endpoint; the graph
  restarted and drafted a second letter. Fixed by a dedicated resume endpoint.
- No expiry: a pending offer sat for three weeks and was approved at an outdated CTC. Pending approvals
  now expire after 48 hours.`,
    mcqs: [
      mcq('An approval node logs "approval requested" to Slack and then calls `interrupt()`. The manager approves. How many Slack messages are there?', [
        ['One, because the node continues after the interrupt', false],
        ['Two, because the node runs from its first line on resume', true],
        ['None, because side effects are skipped inside paused nodes', false],
      ], 'On resume LangGraph re-executes the interrupted node from the start, so the Slack call before interrupt() runs a second time. Side effects belong in another node or after the interrupt.'),
      mcq('Two parallel branches each called `interrupt()`, and the result lists two `Interrupt` objects. How do you answer both in one call?', [
        ['Resume with a dict that maps each interrupt id to its answer', true],
        ['Resume twice in a row, since only one pause can be answered per call', false],
        ['Call update_state with both answers, then invoke with new input', false],
      ], 'Command(resume=...) accepts a mapping from interrupt id to value, which answers several pending interrupts at once. update_state changes state but does not answer interrupts, and new input restarts the graph.'),
      mcq('The reviewer needs to correct the order id the agent extracted before approving. What is the cleanest way in LangGraph?', [
        ['Delete the thread and start a fresh run with the corrected input', false],
        ['Put the corrected id in a new HumanMessage on the same thread', false],
        ['Call update_state on the paused thread, then resume it', true],
      ], 'update_state writes the correction into the saved state as if a node had returned it, and the paused run continues from there. A fresh run repeats earlier work, and a new message does not resume the interrupt.'),
    ],
    checkpoint: [
      ck(ORC, 'A support agent pauses for approval. The front end, on "Approve", calls `app.invoke({"messages": [HumanMessage("approved")]}, cfg)` on the same thread. What happens?', [
        ['The graph restarts from START and pauses at the approval again', true],
        ['The interrupt returns "approved" and the refund goes ahead', false],
        ['LangGraph raises an error because the thread is currently paused', false],
      ], 'New input starts a new run from START rather than answering the pending interrupt, so the approval step is reached again. Only Command(resume=...) supplies the value interrupt() returns.'),
      ck(ORC, 'Where should the identity of the approver in the audit log come from?', [
        ['A "by" field the reviewer types into the approval form', false],
        ['The authenticated session on the resume endpoint', true],
        ['The model, which records who approved in its reply', false],
      ], 'The approver is whoever is authenticated on the endpoint, so take it from the session after checking their role. A form field can be forged, and the model has no knowledge of who clicked.'),
      ck(ORC, 'Reviewers on a refund agent approve 99% of requests in under five seconds. What does this suggest?', [
        ['The interrupt payload is too large and should be trimmed', false],
        ['Reviewers are rubber-stamping; auto-approve the low-risk class', true],
        ['The checkpointer is slow and approvals should skip it', false],
      ], 'Near-total, instant approval means the step adds delay without real review. Auto-approving a defined low-risk class lets people focus on the cases worth checking. Payload size and checkpointer speed do not explain the pattern.'),
    ],
  },

  /* ── DURABLE_EXECUTION ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_DURABLE_EXECUTION',
    notes: `A chat reply takes seconds. An agent that reconciles a month of vendor invoices, or waits two days for
a manager's approval, runs for minutes to days. In that time your container will be redeployed, a pod
will be evicted, the provider will return 503s. **Durable execution** means the run survives all of
that and, crucially, does not repeat what it already did — a payout made twice is a real loss. This
unit uses LangGraph's checkpoints for the "survive" half and idempotency for the "do not repeat" half.

## A checkpointer that outlives the process

\`InMemorySaver\` dies with the process. In production the checkpointer writes to a database:

    from langgraph.checkpoint.sqlite import SqliteSaver        # pip install langgraph-checkpoint-sqlite

    with SqliteSaver.from_conn_string("checkpoints.db") as saver:
        app = graph.compile(checkpointer=saver)

SQLite is right for one worker and for tests. With several workers use Postgres (\`pip install
langgraph-checkpoint-postgres\`); the documented API is the same shape, plus a one-time \`setup()\` that
creates the tables:

    from langgraph.checkpoint.postgres import PostgresSaver

    with PostgresSaver.from_conn_string(settings.checkpoint_db_url) as saver:
        saver.setup()                      # once, e.g. in a migration step
        app = graph.compile(checkpointer=saver)

(\`AsyncPostgresSaver\` is the async version for a FastAPI service.) The SQLite code below was run; the
Postgres lines follow the package's documentation.

## Crash and resume, for real

The test graph pays a vendor: \`check_invoice → pay → notify\`. A fake payment provider stores payouts in
its own SQLite table. An environment variable makes the process die with \`os._exit(1)\` inside a
chosen node — no exception handlers, no clean shutdown, like a killed pod. A **second** process then
opens the same checkpoint file and calls \`app.invoke(None, cfg)\`; \`None\` means "continue this thread".

**Crash in \`notify\`:**

    exit 1
      state before resume: next = ('notify',)
      notify
      result: {'payout': 'created', 'notified': True}
      payout rows: 1

The checkpoint after \`pay\` was saved, so the new process ran only \`notify\`. Payment: once.

**Crash in \`pay\`, after the provider accepted the payout but before the node returned:**

    exit 1
      state before resume: next = ('pay',)
      pay
      notify
      result: {'payout': 'duplicate ignored', 'notified': True}
      payout rows: 1

No checkpoint covers a node that never finished, so \`pay\` **ran again**. Only one payout exists
because of the next section.

## The rule: a node may run more than once

Checkpoints are saved **between** nodes. A crash, a retry policy or a resume after an interrupt can
each run a node again. So every node with a side effect must be **idempotent**: running it twice has
the same effect as once. The payout passes an **idempotency key** that is the same on every attempt
of this step:

    def pay(s, config):
        key = f"{config['configurable']['thread_id']}:pay"      # stable across retries and resumes
        status = provider_payout(key, s["vendor"], s["amount"])
        return {"payout": status}

Payment gateways and most serious APIs accept such a key and return the original result for a repeat.
When an API does not, keep your own **ledger**: before calling, look up the key in a table; after
success, write it. Never build the key from the time or a random UUID made inside the node — a re-run
makes a new one and the protection is gone.

## Durability modes

\`invoke(..., durability=...)\` chooses when checkpoints are written:

- \`"sync"\` — saved before the next step starts. Safest; a little slower.
- \`"async"\` (the default) — saved while the next step runs. Fast; a hard crash at the wrong moment can
  lose the latest checkpoint, so a step may repeat — which idempotency already handles.
- \`"exit"\` — saved only when the graph exits. With a crash in \`notify\` under \`"exit"\`:

      state before resume: next = ()
      langgraph.errors.EmptyInputError: Received no input for __start__

  Nothing was saved, so there is nothing to continue; the whole run must start again, including
  \`pay\`. Use \`"exit"\` only for short runs that are cheap to repeat.

## Retries without repeating side effects

\`RetryPolicy\` on a node retries it on chosen exceptions with exponential back-off. Read what it retries
by default: \`ConnectionError\` and 5xx HTTP errors yes — but \`TimeoutError\` is a subclass of
\`OSError\`, which the default treats as not retryable:

    attempts with default retry_on: 1
    attempts with retry_on=(TimeoutError, ConnectionError): 3

Name the exceptions you mean. And keep one side effect per node: if a node pays and then sends an
email, a retry of the email failure repeats the payment call too (harmless only because of the key).

## Time-outs

A hung provider call should not hold a run forever.

- Set a timeout on every HTTP client a tool or model call uses — the first and cheapest defence.
- Recent LangGraph versions accept \`add_node(..., timeout=...)\`; for an async node it raises
  \`NodeTimeoutError: Node 'search' exceeded its run timeout of 1.000s\`. It relies on asyncio
  cancellation, so blocking code such as \`time.sleep\` is not interrupted.
- Bound the whole run: \`await asyncio.wait_for(app.ainvoke(inp, cfg), timeout=...)\`. The checkpoint
  remains, so a later attempt can resume it.
- Long waits on humans are not time-outs; they are pauses with an expiry (previous unit).

## Running it as a service

Agent runs belong in a background worker, not in the web request (the background-jobs lesson in Running
AI in Production). The thread id is the job id. On worker start-up, find threads whose latest
checkpoint has a non-empty \`next\` and no pending interrupt, and resume them with \`invoke(None, cfg)\`
— those are the runs a crash orphaned. Record every resume in your tracing so a run that crashes
repeatedly at the same node is noticed instead of retried forever.`,
    workedExample: `**Problem.** A month-end agent at a Coimbatore manufacturer reads 300 vendor invoices, matches each to
a purchase order, pays the matched ones and emails each vendor. Last month the pod restarted halfway
and 41 vendors were paid twice. Make the run durable and prove it.

**Step 1 — find why it double-paid.** The old code was one node in a loop: for each invoice, match,
pay, email. The checkpointer saved only after the node finished — that is, after all 300. The restart
re-ran the node from invoice 1.

**Step 2 — one invoice per branch, one side effect per node.** Fan out with
\`Send("process_invoice", {"invoice_id": i})\`; inside, a small sub-graph \`match → pay → email\`, and
\`max_concurrency\` = 10. Branches that finished and had their writes saved are skipped on resume (the
parallel-work unit showed this after an exception). After a hard kill, though, do not count on it —
see step 5.

**Step 3 — idempotency keys.** \`pay\` sends \`f"{run_id}:{invoice_id}:pay"\` to the bank API;
\`email\` uses \`f"{run_id}:{invoice_id}:email"\` with the mail service's deduplication header. The
run id is the thread id, fixed when the month-end job is created — so a resume, a retry or a second
worker picking up the same job all produce the same keys.

**Step 4 — durability and retries.** \`durability="sync"\` — an extra checkpoint write costs nothing next
to a bank call. \`RetryPolicy(max_attempts=4, retry_on=(ConnectionError,
TimeoutError, BankUnavailable))\` on \`pay\`; never on \`InsufficientFunds\`, which is recorded and sent to
finance.

**Step 5 — prove it.** The crash test above, as a pytest that runs in CI: start the job in a
subprocess with \`CRASH_AT=pay\`, resume in a second process, assert the provider table has exactly one
row per invoice key and the state shows every invoice processed. The real output on a 300-invoice
fixture (a fake bank in SQLite, the process killed with \`os._exit\` at the 132nd payout):

    crashed after 132 payouts
    resumed; new payouts this process: 168, duplicates ignored: 129; 300 payout rows, 300 distinct keys, 300 invoices in state, 300 unique

Read the middle number. The kill landed before most finished branches' writes reached the checkpoint
database, so 129 already-paid invoices ran **again** on resume — and the bank ignored all 129 because
the keys matched.

**Why it now works.** Checkpoints shrink how much work is repeated; idempotency keys make whatever is
repeated harmless. The test shows you cannot skip the second: under a real crash, repeats happen.`,
    mcqs: [
      mcq('An agent run crashes inside the `pay` node after the bank accepted the transfer. On resume from the checkpoint, what does LangGraph do?', [
        ['Runs pay again, since no checkpoint covers the unfinished node', true],
        ['Skips pay, because the bank call was already sent successfully', false],
        ['Asks the user whether to repeat pay before continuing the run', false],
      ], 'Checkpoints are saved between nodes, so a node that did not finish is run again. LangGraph cannot know an external call succeeded; an idempotency key is what stops the second transfer.'),
      mcq('A `pay` node builds its idempotency key as `str(uuid.uuid4())` at the start of the node. Why does this not prevent duplicate payments?', [
        ['UUIDs are too long for most payment gateway key fields', false],
        ['A re-run of the node generates a different key each time', true],
        ['The checkpointer refuses to store keys made inside a node', false],
      ], 'An idempotency key works only if the same logical action always sends the same key. A key made fresh inside the node changes on every run; derive it from the thread id and the step instead.'),
      mcq('A node has `RetryPolicy(max_attempts=3)` with the default `retry_on`, and the model client raises `TimeoutError`. How many attempts happen?', [
        ['Three, because the policy retries every exception type', false],
        ['One, because TimeoutError is an OSError the default skips', true],
        ['Two, because time-outs get one retry regardless of policy', false],
      ], 'The default retry_on returns True for ConnectionError and 5xx HTTP errors but False for OSError subclasses, which include TimeoutError. Pass retry_on explicitly to retry time-outs.'),
    ],
    checkpoint: [
      ck(ORC, 'A run uses `durability="exit"` and the process is killed in its third node. A new process calls `app.invoke(None, cfg)`. What happens?', [
        ['It resumes at the third node, from the last step that was saved', false],
        ['It fails: nothing was saved, so there is nothing to resume', true],
        ['It resumes at the first node, reusing saved tool results', false],
      ], 'Under "exit" checkpoints are written only when the graph exits, so a hard kill leaves no state. Invoking with None then raises EmptyInputError and the run must start over.'),
      ck(ORC, 'A team has three API workers sharing agent runs and uses `SqliteSaver` on each pod\'s local disk. What goes wrong?', [
        ['A run started on one pod cannot be resumed from another', true],
        ['SQLite cannot store interrupt payloads, only plain values', false],
        ['Checkpoints are written but get_state always returns empty', false],
      ], 'Each pod has its own file, so state saved on one is invisible to the others. Several workers need a shared database checkpointer such as Postgres. SQLite stores interrupts and returns state correctly on its own machine.'),
      ck(ORC, 'A node pays a vendor and then sends a confirmation email. The email server times out and the node is retried. What is the design fix?', [
        ['Raise max_attempts so the email eventually goes through', false],
        ['Catch every exception in the node so it never retries', false],
        ['Split pay and email into two nodes, each with its own key', true],
      ], 'One side effect per node means a retry repeats only the step that failed, and stable keys make each repeat harmless. More attempts still repeat the payment call, and swallowing exceptions hides real failures.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_DEBUGGING',
    notes: `Orchestration bugs are rarely in the model. They are in state, edges, checkpoints and side effects,
and they repeat across teams. For each one below: the symptom you see, the cause, and the fix. Every
error text was produced by running the broken code against langgraph 1.2.

Your first tools, in this order: \`app.get_graph().draw_mermaid()\` (is the graph the one you meant?),
\`stream_mode="updates"\` (which node wrote what?), \`app.get_state(cfg)\` (\`next\`, \`tasks\`,
pending interrupts) and \`get_state_history(cfg)\` (how did it get here?).

## 1. Parallel branches crash on the first real run

**Symptom.** A research graph fans out to \`search\` and \`data\`; it fails immediately:

    InvalidUpdateError : At key 'notes': Can receive only one value per step. Use an Annotated key to handle multiple values.

**Cause.** Both branches return \`notes\`, declared as a plain \`list[str]\`. Two writes to a key with no
reducer in one super-step are refused.

**Fix.** \`notes: Annotated[list[str], operator.add]\` — or give each branch its own key
(\`web_notes\`, \`data_notes\`), which also makes the join clearer.

## 2. A Send branch cannot find the question

**Symptom.** \`KeyError: 'question'\` from inside \`per_doc\`, although \`question\` is plainly in the
graph state.

**Cause.** The fan-out was \`Send("per_doc", {"doc": d})\`. A Send branch receives **only its payload**.

**Fix.** \`Send("per_doc", {"doc": d, "question": state["question"]})\`. Put everything a branch
needs in the payload, and type the payload with its own \`TypedDict\` so the omission shows up in review.

## 3. "I clicked Approve and nothing happened"

**Symptom.** After Approve, the API returns another approval request for the same refund. The logs show
the agent's first node running again.

**Cause.** The front end called \`app.invoke({"messages": [HumanMessage("approved")]}, cfg)\`. New input
on a paused thread starts the graph again from \`START\`; it reaches the approval and pauses again.
Checking with \`get_state\` after that call shows \`next\` is still \`('ask',)\`.

**Fix.** A dedicated resume endpoint that calls \`app.invoke(Command(resume=decision), cfg)\`. A variant
of the same bug in a test: the graph was compiled **without** a checkpointer, and the resume fails with
\`RuntimeError: Cannot use Command(resume=...) without checkpointer\`.

## 4. Customers get two "we are reviewing your refund" emails

**Symptom.** Every approved refund produced two holding emails; rejected ones too.

**Cause.** The email was sent inside the approval node, **before** \`interrupt()\`. On resume the node
runs again from its first line, so the email went again. A print at the top of the node shows it:
\`review ran\` appears once before the pause and once after the resume.

**Fix.** Move the email into the node that proposes the refund (it ran once and is checkpointed), or
after the interrupt with an idempotency key. Keep approval nodes free of side effects.

## 5. The retry policy that never retries

**Symptom.** A node has \`RetryPolicy(max_attempts=3)\`, yet the trace shows a single attempt and a
failed run every time the model provider times out.

**Cause.** The default \`retry_on\` treats \`OSError\` and its subclasses as not retryable, and
\`TimeoutError\` is one. Run with the default and with an explicit list:

    attempts with default retry_on: 1
    attempts with retry_on=(TimeoutError, ConnectionError): 3

**Fix.** \`RetryPolicy(max_attempts=3, retry_on=(TimeoutError, ConnectionError))\` — or the exception
classes your HTTP client actually raises. Check the side effects in that node are idempotent first.

## 6. The supervisor that never finishes

**Symptom.** Some requests end in \`GraphRecursionError: Recursion limit of 25 reached without hitting a
stop condition.\` (25 because the team set it in the config). The trace shows supervisor → policy_agent
→ supervisor → policy_agent ...

**Cause.** The policy agent's summary said "this is a claims question", but the supervisor's prompt
never saw it — the agent wrote to a private key the supervisor did not read. The supervisor kept
picking policy_agent. There was no turn cap, so only the recursion limit stopped it.

**Fix.** Two parts. The real fix: specialists write their findings and hand-off notes to the shared key
the supervisor's prompt is built from. The safety net: a \`turns\` counter in state; past the cap the
supervisor ends with an honest "I could not resolve this; passing it to the HR team" instead of a crash.

## A method, not a list

When an orchestrated agent misbehaves: reproduce with a scripted fake model so the run is
deterministic; stream updates to find the first node whose output is wrong; check that node's
**input** (state or Send payload) before blaming its logic; then fix the one cause and add the scripted
run as a test.`,
    mcqs: [
      mcq('A contract-review graph fails with `InvalidUpdateError: At key \'summaries\'` as soon as two contracts are uploaded. One contract works. What is the cause?', [
        ['Two Send branches write summaries, which has no reducer', true],
        ['Send cannot be used when the list has more than one item', false],
        ['The join node runs before the branches have produced data', false],
      ], 'With one contract only one branch writes; with two, two writes land on a key without a reducer in the same step. Declaring summaries with operator.add fixes it. Send handles any number of items, and the join waits for the step.'),
      mcq('A graph pauses for approval. `get_state(cfg).next` is `("approve",)` both before and after the front end\'s "approve" request. What is the most likely bug?', [
        ['The checkpointer failed to save the interrupt payload to the database', false],
        ['The front end sent new input instead of Command(resume=...)', true],
        ['The approve node raised an exception during the resume', false],
      ], 'New input restarts the run, which reaches the same interrupt and pauses again, leaving next unchanged. A save failure would lose the pause entirely, and an exception would surface as an error.'),
      mcq('A node with `RetryPolicy(max_attempts=4)` fails once on a provider `TimeoutError` and the run stops. What explains the single attempt?', [
        ['max_attempts counts only attempts after the first time-out', false],
        ['Retries are disabled whenever a checkpointer is configured', false],
        ['TimeoutError is an OSError, which the default does not retry', true],
      ], 'The default retry_on returns False for OSError subclasses, and TimeoutError is one. Passing retry_on with TimeoutError makes the policy retry. Checkpointers and retry policies work together.'),
      mcq('Debugging a misrouted multi-agent run, you find the first node whose output is wrong. What should you check next?', [
        ['The model temperature used across all the agent nodes', false],
        ['The recursion limit set in the run configuration', false],
        ['The state or Send payload that node received as input', true],
      ], 'A node often produces bad output because its input was wrong or missing, as with a Send payload lacking a key or a finding written to a key nobody reads. Check the input before the logic; temperature and recursion limits come later, if at all.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_PRACTICE',
    notes: `Eight exercises, easiest first. Write each with a scripted fake model or plain functions as nodes so it
runs without an API key, then compare with the answer.

## Exercise 1 — a reducer (easy)

A state has \`tags: list[str]\`. Nodes \`detect_language\` and \`detect_intent\` run in parallel and each
add one tag. Write the declaration.

**Answer.** \`tags: Annotated[list[str], operator.add]\`. Without it the parallel writes raise
\`InvalidUpdateError\`.

## Exercise 2 — a router (easy)

After \`score_lead\` writes \`score: int\`, go to \`call_now\` if score ≥ 80, \`nurture\` if 40–79,
otherwise \`END\`. Write the router so the graph drawing shows all three.

**Answer.**

    def route(s) -> Literal["call_now", "nurture", "__end__"]:
        if s["score"] >= 80:
            return "call_now"
        return "nurture" if s["score"] >= 40 else END

    g.add_conditional_edges("score_lead", route)

## Exercise 3 — count the calls (easy)

Estimate model calls for: (a) ReAct needing 4 sequential tool results; (b) plan-and-execute with a
5-step plan and one replan; (c) reflection that passes in round 3.

**Answer.** (a) 5. (b) 1 plan + 5 steps + 1 replan + 1 answer = 8 (more if the replan adds steps).
(c) 2 × 3 = 6.

## Exercise 4 — map-reduce with Send (medium)

Given \`resumes: list[str]\` and \`job: str\`, score every resume in parallel and keep the top 3.

**Answer.**

    class Hiring(TypedDict):
        job: str
        resumes: list[str]
        scores: Annotated[list[dict], operator.add]
        shortlist: list[str]

    def fan(s):
        return [Send("score", {"resume": r, "job": s["job"]}) for r in s["resumes"]]

    def score(p):
        return {"scores": [{"resume": p["resume"], "score": model_score(p["resume"], p["job"])}]}

    def top3(s):
        best = sorted(s["scores"], key=lambda x: x["score"], reverse=True)[:3]
        return {"shortlist": [x["resume"] for x in best]}

The job goes in each payload; \`scores\` has a reducer; \`top3\` sorts rather than trusting list order.

## Exercise 5 — fail one, keep the rest (medium)

In exercise 4, a resume that is an image-only PDF raises \`ValueError\`. Change \`score\` so the
shortlist still comes out and the report lists the unreadable files.

**Answer.** Catch \`ValueError\` in \`score\` and return \`{"scores": [{"resume": r, "error": str(e)}]}\`;
in \`top3\`, rank only entries without \`"error"\` and add an \`unreadable\` key listing the rest.

## Exercise 6 — approve, edit or reject (medium)

Write the approval node for a "send bulk SMS" tool call stored at \`state["proposed"]\`, with
\`{"action": "approve" | "edit" | "reject", ...}\` as the resume value.

**Answer.** Same shape as the refund unit: \`decision = interrupt({"call": s["proposed"]})\`; approve →
\`Command(goto="send")\`; edit → merge \`decision["args"]\` into the proposed args, validate them with the
tool's Pydantic model, then \`Command(goto="send", update=...)\`; reject → \`Command(goto=END,
update={"result": "rejected: " + decision["reason"]})\`. Nothing before \`interrupt()\` has a side
effect.

## Exercise 7 — an idempotency key (medium)

A node creates a Jira ticket per escalated conversation. Runs can be retried and resumed. Write the key.

**Answer.** \`f"{thread_id}:create_ticket"\` from \`config["configurable"]["thread_id"]\`. Before calling
Jira, look the key up in a \`side_effects\` table; if present, return the stored ticket id; otherwise
create the ticket and store the key with its id. Never use a timestamp or a fresh UUID.

## Exercise 8 — design review (hard)

A colleague's design for "summarise a company's annual report": a supervisor, a reader agent, a
summariser agent, a critic agent and a formatter agent, all ReAct, \`MessagesState\` shared by all, no
checkpointer. List the problems and propose a simpler design.

**Answer.** The task's shape is fixed, so no agent needs to decide the next step: the supervisor is
pure overhead. Shared \`MessagesState\` sends every agent the full report text. No checkpointer means
a crash on page 180 starts over. Better: a workflow — split the report into sections, \`Send\` a
summarise call per section with \`max_concurrency\` set, join, one call to write the summary, one
code-plus-model check against a checklist (reflection, 2 rounds max), all on a database checkpointer.
About sections + 3 calls, each with a small context.`,
    mcqs: [
      mcq('In a lead-scoring graph, the router returns `"call_now"`, `"nurture"` or `END`, but its return annotation is just `-> str`. What should be added so the drawn graph shows all three edges?', [
        ['A Literal return annotation listing the three destinations', true],
        ['A reducer on the score key in the state class', false],
        ['A checkpointer passed to compile() for the graph', false],
      ], 'LangGraph reads the possible destinations from a Literal annotation (or a list or path map passed to add_conditional_edges). Reducers and checkpointers do not affect what the drawing knows.'),
      mcq('A plan-and-execute agent writes a 4-step plan, replans once without adding steps, and writes a final answer. How many model calls is that?', [
        ['5 calls: the plan, four steps, nothing else', false],
        ['7 calls: plan, four steps, one replan, the answer', true],
        ['6 calls: the plan, four steps and then the final answer', false],
      ], 'The planner makes 1 call, the executor 4, the replanner 1 and the final answer 1: seven. Forgetting the replan or the answer call is the usual mistake.'),
      mcq('Your resume-scoring fan-out passes `{"resume": r}` in each Send. The scoring prompt needs the job description. Where should it come from?', [
        ['From a module-level global set before invoke is called', false],
        ['From the graph state, which every branch can read', false],
        ['From the Send payload, alongside the resume itself', true],
      ], 'A Send branch sees only its payload, so the job description must travel in it. A global breaks as soon as two requests run at once, and branches cannot read the graph state.'),
      mcq('A node creating a Jira ticket per escalation is retried after a network error. Which idempotency key works?', [
        ['The current timestamp in milliseconds at the time of the call', false],
        ['The thread id plus the step name, such as "t-91:create_ticket"', true],
        ['A random UUID generated at the start of every node run', false],
      ], 'A retry must send the same key so the duplicate is recognised. The thread id plus step name is stable across retries and resumes; timestamps and fresh UUIDs change every run.'),
      mcq('A colleague proposes five ReAct agents under a supervisor to summarise an annual report. What is the strongest objection?', [
        ['The task has a fixed shape, so a parallel workflow does it cheaper', true],
        ['ReAct agents cannot read documents longer than a single page', false],
        ['Supervisors may only coordinate two specialists at the same time', false],
      ], 'When the steps are known in advance, no agent needs to choose the next one, and a section-by-section fan-out with a join is cheaper and easier to test. The other two statements are not real limits.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_INTERVIEW_QUESTION',
    notes: `Agentic AI interviews at product companies and GCCs in Bengaluru and Hyderabad have moved past "what
is an agent". Expect design questions with a follow-up that tests whether you have run one. Four
common ones, with a strong answer and the follow-up.

## Q1. "Design a multi-agent system for our customer support. How many agents?"

**Strong answer.** Start by refusing to pick a number. "I would start with one agent and good tools,
and split only for a concrete reason." Then name the reasons: tool sets too large for one prompt to
choose reliably; different permissions (a refunds agent may issue money, a FAQ agent must not); contexts
that do not fit together; different models for different steps. Sketch the likely result — a router or
supervisor in front of three or four specialists — and give its cost: supervisor calls per turn plus
specialist calls, versus a single agent. Say how you would decide: build both, run the same eval set,
compare success rate, cost and latency.

**Follow-up: "Two of your agents keep passing a ticket back and forth. What do you do?"**
Look at what the receiving agent saw — usually the hand-off note is missing or written to a key the
other never reads. Fix the state. Then a turn cap in state that ends with an honest hand-over to a
person, and an alert on how often it triggers. Raising the recursion limit is not a fix.

## Q2. "Your agent pays vendors. The pod restarts mid-run. What happens?"

**Strong answer.** Two halves. **Resume:** the graph runs on a database checkpointer (Postgres with
several workers), the thread id is the job id, and on start-up the worker resumes threads with a
non-empty \`next\`. **No repeats:** checkpoints are written between nodes, so the node that was running
will run again — so every side effect is idempotent, with a key built from the thread id and the step,
passed to the payment API. One side effect per node, so a retry repeats only that step.

**Follow-up: "The bank API has no idempotency support."** Keep your own ledger: a table keyed by the
idempotency key with a status. Write "pending" before calling, "done" with the bank reference after.
On a re-run, "done" returns the stored result; "pending" means the outcome is unknown — query the bank
by your reference or send it to a person. Never blindly retry money.

## Q3. "How does human approval work in your agent, technically?"

**Strong answer.** The tool call is proposed into state, not executed. An approval node calls
\`interrupt()\` with a payload the UI can show. The checkpointer saves the thread and the API returns
the payload. The reviewer's decision comes back to a resume endpoint that checks their role and calls
\`invoke(Command(resume=decision), cfg)\`. The node re-runs from its top, \`interrupt()\` now returns the
decision, and it routes to execute, to execute-with-edits, or to end. Mention the traps: nothing with a
side effect before the interrupt; resume, never re-send input; pending approvals expire.

**Follow-up: "Reviewers approve everything in two seconds."** That is approval fatigue — the control
has stopped working. Measure approval rate and time-to-decide; auto-approve a low-risk class with a
clear threshold and audit a sample; send only high-risk actions to people, with the information needed
to decide quickly.

## Q4. "Our research agent takes three minutes and costs too much. Where do you look?"

**Strong answer.** Trace first: calls per run, tokens per call, time per node. Typical finds: a ReAct
loop doing sequential look-ups that could be parallel tool calls or a \`Send\` fan-out; the full history
resent to every call when each step needs only its own input (plan-and-execute fixes that, and lets a
smaller model run the steps); a reflection loop that rarely changes the output. Then fan out
independent work with a \`max_concurrency\` that fits the rate limit, and measure again against the eval
set so quality has not dropped.

**Follow-up: "After fan-out, one branch failing kills the whole report."** Sort errors: retry transient
ones with a retry policy naming the exceptions, record per-item permanent ones and report them, let
fatal ones raise. With a checkpointer, a resume re-runs only failed branches.`,
    mcqs: [
      mcq('An interviewer asks how many agents your support system needs. Which opening shows the most judgement?', [
        ['Start with one agent and split only for a stated reason', true],
        ['Use one agent per intent so each prompt stays as short as possible', false],
        ['Use a supervisor and five specialists, the common design', false],
      ], 'Splitting has costs in calls, lost context and compounding errors, so a strong answer starts simple and names the conditions — permissions, tool count, context size, models — that justify a split.'),
      mcq('The bank API used by your payout agent has no idempotency keys. After a crash, your ledger shows a payout as "pending". What should the agent do?', [
        ['Retry the payout, since pending means it never reached the bank', false],
        ['Mark it done, since the crash happened after the call was sent', false],
        ['Check with the bank by reference, or send it to a person', true],
      ], 'Pending means the outcome is unknown: the call may or may not have succeeded. Retrying risks paying twice and marking it done risks not paying; only a status check or a person can settle it.'),
      mcq('Asked why a research agent is slow, which first step is strongest?', [
        ['Switch to a faster model and measure the result afterwards', false],
        ['Trace calls, tokens and time per node to find the cost', true],
        ['Add a reflection loop so fewer runs need to be repeated', false],
      ], 'Measurement shows whether the time is in sequential look-ups, a bloated context or an unnecessary loop, and each has a different fix. Changing models first is guessing, and reflection adds calls.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_MINI_PROJECT',
    notes: `## The scenario

A Mumbai research firm publishes weekly briefs on Indian digital payments for bank and fintech clients.
Analysts spend a day per brief: searching their article archive, pulling numbers from internal data
tables, writing, and getting an editor's sign-off. You will build an **agent team** that drafts a cited
brief in minutes and stops for the editor before anything is published.

The team:

- a **supervisor** that turns the research question into tasks;
- a **search agent** that finds relevant passages in the article archive;
- a **data agent** that answers numeric sub-questions from data tables;
- a **writer agent** that drafts the report, citing every claim;
- an **editor** — a person — who approves, sends back with notes, or rejects;
- all of it **durable**: kill the process at any point and it resumes without redoing finished work
  or publishing twice.

## The data

Build a small fixture set yourself, and label it as sample data (do not present invented figures as
real statistics):

- \`archive/\` — 40 to 60 short articles as JSON: \`{"id": "S17", "title": ..., "date": ..., "text": ...}\`,
  about UPI, cards, wallets, payment regulation and fraud. Mix in near-duplicates and two or three
  articles that contradict each other on a number.
- \`tables/\` — three CSV files, e.g. monthly transaction counts by payment method, failure rates by
  bank, merchant counts by city tier. Each table has an id (\`T1\`, \`T2\`, \`T3\`).
- \`questions.yaml\` — 10 research questions with, for each, the sources a good answer must cite and
  one fact it must get right. This is your evaluation set (Evaluating and Securing LLM Features showed
  how to build one).

Retrieval over the archive reuses what you built in RAG in Depth (BM25 plus embeddings in Chroma or
Qdrant). The data agent uses pandas over the CSVs through a small set of tools — \`list_tables\`,
\`describe_table\`, \`query_table(table_id, filters, group_by, metric)\` — not free-form code execution.

## The graph

A skeleton that runs (with plain functions in place of model calls) on langgraph 1.2:

    class Report(TypedDict):
        question: str
        sources: Annotated[list[Source], operator.add]
        figures: Annotated[list[dict], operator.add]
        draft: str
        status: str
        revisions: int

    def plan(s):
        return [Send("search_agent", {"query": s["question"]}),
                Send("data_agent", {"query": s["question"]})]

    g.add_conditional_edges(START, plan, ["search_agent", "data_agent"])
    g.add_edge(["search_agent", "data_agent"], "writer")
    g.add_conditional_edges("writer", check_citations, ["editor", "writer"])
    g.add_edge("publish", END)

    def editor(s) -> Command[Literal["publish", "writer"]]:
        decision = interrupt({"draft": s["draft"], "sources": [x["id"] for x in s["sources"]]})
        if decision["action"] == "approve":
            return Command(goto="publish")
        return Command(goto="writer", update={"status": "revise: " + decision["note"]})

Started in one process on a \`SqliteSaver\` and resumed in a **second** process, it prints:

    paused for editor: UPI monthly volume doubled from 8.0 to 16.0 billion [S1]. Policy continues to push digital payments [S2].
    after restart, next = ('editor',)
    published | sources: ['S1', 'S2']

(The numbers come from the fixture, not from the world.) Your version replaces the stubs with real
agents, makes the supervisor plan several sub-questions and send each to the right agent, and adds
everything below.

## Deliverables

1. **The graph**, with typed state and a Mermaid drawing in the README that matches your sketch.
2. **The supervisor**: a structured-output call that splits the question into 2–5 sub-questions, each
   tagged \`search\` or \`data\`, validated with Pydantic; a turn cap.
3. **Parallel agents** via \`Send\` with \`max_concurrency\`, a \`RetryPolicy\` naming the exceptions
   you retry, and per-item errors recorded rather than crashing the run.
4. **The writer and a citation check in code**: every sentence with a claim carries \`[S#]\` or
   \`[T#]\`; every cited id exists in state; every number in the draft appears in a cited source or
   figure. Failures go back to the writer at most twice, then to the editor with the problems listed.
5. **The editor step**: approve, revise with a note, or reject; a FastAPI endpoint for each that
   checks the user has the editor role; pending reviews expire after 48 hours.
6. **Durability**: a database checkpointer; \`publish\` writes the brief with an idempotency key
   (\`thread_id:publish\`) so it cannot be published twice; a start-up routine that resumes orphaned runs.
7. **Tests and evaluation**: pytest with a scripted fake model for routing, fan-out, citation-check
   failures, each editor decision and a two-process crash test; plus a results table on the 10
   questions (correct fact, required sources cited, model calls, seconds).

## Milestones

- **Day 1** — fixtures, the graph with stub nodes, the drawing, the two-process resume test passing.
- **Day 2** — search and data agents for real; fan-out with retries and error recording.
- **Day 3** — writer and citation check; editor endpoints; expiry.
- **Day 4** — idempotent publish, orphan recovery, evaluation run, README with results and costs
  (calls × tokens × the provider's price per million tokens).

## Acceptance checks

- Killing the process during the fan-out, at the editor pause and inside \`publish\` each resumes
  correctly; the publish table never has two rows for one thread.
- A draft that cites \`[S99]\` (not in state) or a number found in no source never reaches the editor
  without the problem flagged.
- An editor "revise" sends the note to the writer, and the second draft addresses it.
- A non-editor calling the approve endpoint gets 403.
- On the evaluation set, at least 8 of 10 briefs state the key fact correctly with its source cited.

## Common traps

- Sending the whole archive or whole tables to the writer. Pass short passages and computed figures
  with their ids.
- A citation check done by the model. It will say every citation is fine; do it in code.
- Contradicting sources: the writer must report the disagreement with both citations, not pick one.
- Side effects before \`interrupt()\` in the editor node, and a publish without a key.
- Forgetting the question in the Send payload.
- A supervisor allowed to loop. Cap it.`,
    assignment: {
      title: 'A Research-and-Report Agent Team',
      description: 'Build a supervisor-led agent team that researches a payments question with a search agent and a data agent in parallel, drafts a cited brief with a writer agent, pauses for an editor\'s approval, and survives a restart without redoing or double-publishing anything.',
      instructions: `1. Build the fixture archive (40–60 articles), three data tables and a 10-question evaluation set, labelled as sample data.
2. Implement the LangGraph graph with typed state and reducers; include its Mermaid drawing in the README.
3. Implement the supervisor (structured output, validated, turn cap) and fan out to the search and data agents with Send, max_concurrency and a RetryPolicy naming the exceptions it retries; record per-item failures.
4. Implement the writer and a code-based citation check (ids exist, every number traceable), with at most two automatic revisions.
5. Implement the editor interrupt with approve / revise / reject, FastAPI endpoints with a role check, and 48-hour expiry.
6. Run on a database checkpointer; make publish idempotent; add start-up recovery of orphaned runs.
7. Write pytest tests with a scripted fake model, including a two-process crash-and-resume test, and report evaluation results with model calls, time and estimated cost per brief.`,
      rubric: [
        { criterion: 'Graph design and state', description: 'Typed state with correct reducers, clear nodes and conditional edges, a drawing that matches the design, and a supervisor with validated output and a turn cap.', maxPoints: 20 },
        { criterion: 'Parallel agents and failure handling', description: 'Search and data agents fan out with Send and a sensible max_concurrency; transient errors are retried with named exceptions, permanent ones recorded and reported.', maxPoints: 20 },
        { criterion: 'Cited writing and checks in code', description: 'Every claim cites an existing source or table; numbers are traceable; contradictions are reported; failures loop back at most twice.', maxPoints: 15 },
        { criterion: 'Human review', description: 'Approve, revise and reject work end to end via role-checked endpoints; no side effects before the interrupt; pending reviews expire.', maxPoints: 15 },
        { criterion: 'Durability and idempotency', description: 'Database checkpointer, idempotent publish, orphan recovery, and a passing two-process crash test at each acceptance point.', maxPoints: 20 },
        { criterion: 'Tests, evaluation and write-up', description: 'Deterministic tests with a fake model, results on the 10-question set with calls, time and cost per brief, and an honest list of limitations.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the research team, why is the citation check written in code rather than asked of the writer model?', [
        ['Code can verify ids exist and numbers match; a model tends to approve itself', true],
        ['LangGraph does not allow a model node to follow the writer node directly', false],
        ['A model call to check citations would leak the private archive to the editor', false],
      ], 'Whether a cited id is in state and whether a number appears in a source are exact checks that code does reliably and for free. A model reviewing its own citations tends to pass them. The other two are not real constraints.'),
      mcq('The project is killed while `publish` is running, and resumed. What makes sure the brief is not published twice?', [
        ['The checkpointer skips any node that had already started before', false],
        ['The editor is asked to approve again before publish is retried', false],
        ['Publish uses a stable key such as thread_id:publish to dedupe', true],
      ], 'A node that did not finish runs again on resume, so the publish itself must be idempotent, keyed on the thread and step. The checkpointer does not skip started nodes, and the approval was already recorded before publish.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'AI_AGENT_ORCHESTRATION_CHECKPOINT',
    notes: `Ten questions across the whole topic: state graphs and reducers, choosing an agent pattern,
supervisors and hand-offs, fan-out and fan-in, human approval, and durable runs. Answer without notes;
each question describes a situation you could meet at work.`,
    checkpoint: [
      ck(ORC, 'A KYC graph has `documents: list[str]` and two parallel nodes that each append a document name. The first test with both nodes fails. What change fixes it with the least disruption?', [
        ['Declare documents as Annotated[list[str], operator.add]', true],
        ['Make the two nodes run one after the other instead of in parallel', false],
        ['Switch the state from a TypedDict to a Pydantic model', false],
      ], 'Two writes to a key without a reducer in one step raise InvalidUpdateError; an appending reducer lets both land. Serialising the nodes loses the parallelism, and Pydantic validates types but does not merge writes.'),
      ck(FUN, 'A travel bot must answer "Which of these three trains reaches Pune first?" by checking three schedules whose results do not affect each other. Which approach is cheapest in model calls?', [
        ['A ReAct loop that checks one train schedule per round', false],
        ['One model call requesting all three look-ups, then an answer', true],
        ['A reflection loop that drafts and critiques the comparison', false],
      ], 'Independent look-ups can be requested together as parallel tool calls, so two model calls suffice. Sequential ReAct needs four, and reflection adds critique calls without fetching anything.'),
      ck(FUN, 'A bank wants an assistant that drafts responses to RBI audit observations; each draft must address every point in the observation and cite the internal policy clause. Which pattern suits it?', [
        ['Routing to one of several fixed reply templates', false],
        ['Plan-and-execute with a fixed plan and no checks', false],
        ['Reflection with a mostly code-based checklist critic', true],
      ], 'The output has checkable criteria — every point addressed, a clause cited — which is what reflection is for, with code doing the checks it can. Templates cannot address varying observations, and a plan without checks never verifies coverage.'),
      ck(ORC, 'In a supervisor design, a specialist does its retrieval in a sub-graph with its own `chunks` key and returns only a summary. A colleague asks why not just put the chunks in the shared state. What is the best reason?', [
        ['Shared state is limited to a fixed number of string keys', false],
        ['Other agents would carry chunks they do not need, and any injected text', true],
        ['Sub-graphs run faster because they skip the checkpointer entirely', false],
      ], 'Keeping working data private keeps every other agent\'s context small and limits how far injected text can travel. Shared state has no key limit, and sub-graphs are checkpointed with their parent.'),
      ck(ORC, 'A Send fan-out over 25 invoices has a checkpointer. Invoice 14 raises an unexpected exception; the bug is fixed and the thread resumed with `invoke(None, cfg)`. What happens?', [
        ['Invoice 14 runs again and the run then continues to the join', true],
        ['All 25 invoices run again, because the step had failed', false],
        ['The join runs at once with the 24 results that were already saved', false],
      ], 'Successful branches\' writes were saved as pending writes when the exception was raised, so only the failed task re-runs before the graph moves on. The join waits for the whole step.'),
      ck(ORC, 'An agent drafts a refund, then an approval node calls `interrupt()`. The reviewer changes the amount from 1,499 to 999. What should the resume value and node do?', [
        ['Resume with the new amount as a HumanMessage for the model to read', false],
        ['Resume with an edit decision; the node validates and merges the change', true],
        ['Start a new thread with the corrected amount and discard the old one', false],
      ], 'A structured edit decision lets the node merge and validate the new arguments, then route to execution with an audit entry. A message relies on the model to apply it, and a new thread repeats earlier work.'),
      ck(ORC, 'Why must an approval node contain no side effects before its `interrupt()` call?', [
        ['interrupt() rolls back any database writes made earlier', false],
        ['The checkpointer cannot save state that includes side effects', false],
        ['On resume the node runs from its start, repeating them', true],
      ], 'LangGraph re-executes the interrupted node from its first line on resume, so earlier side effects happen twice. interrupt() does not roll anything back, and checkpoint contents are unaffected by side effects.'),
      ck(ORC, 'A month-end payout run on a Postgres checkpointer is killed mid-step. On resume, which statement is true?', [
        ['Every completed payout is guaranteed to be skipped', false],
        ['Some payouts may run again, so each needs a stable key', true],
        ['The run cannot resume and must start from the beginning', false],
      ], 'A node that was running, and branches whose writes had not reached the database, run again on resume, so side effects must be idempotent. Resuming is possible; skipping every finished payout is not guaranteed after a hard kill.'),
      ck(ORC, 'Three API pods share agent runs and approvals can arrive at any pod. Which checkpointer setup works?', [
        ['A Postgres checkpointer that all three pods connect to', true],
        ['InMemorySaver on each pod, with sticky sessions per user', false],
        ['SqliteSaver writing to each pod\'s own local disk', false],
      ], 'Any pod must be able to load any thread, so the checkpoints must live in a shared database. In-memory or per-pod files are lost on restart or invisible to the other pods.'),
      ck(ORC, 'A run should give up on a provider call that hangs, but the graph uses synchronous nodes with blocking HTTP calls. What is the most reliable first defence?', [
        ['A node timeout, which interrupts any blocking call', false],
        ['A timeout set on the HTTP client used for the call', true],
        ['A larger recursion limit so the run has more steps', false],
      ], 'A client-level timeout makes the blocking call itself give up. LangGraph node timeouts rely on asyncio cancellation and do not interrupt blocking synchronous code, and the recursion limit counts steps, not seconds.'),
    ],
  },
];
