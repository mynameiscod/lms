/**
 * Career-track content, batch 6: JavaScript, React, HTML and CSS at interview depth (JT_IV_FRONTEND).
 *
 * Shared by every full-stack track, so nothing here names a backend language: the server is "the
 * API". The track's own JS and React topics already teach the material; these units are the
 * questions an interviewer asks about it, the answer that gets the nod, the follow-up that comes
 * next and the answers that lose the round.
 *
 * Attribution: the topic is multi-skill (default REACT_COMPONENTS). Each question-set unit declares
 * its own skillKeys and its checkpoint questions name one of them; the topic checkpoint names any
 * of the topic's seven skills.
 *
 * Options are written correct-first for readability; `arrange` rotates the correct option through
 * every position so the source order is not a tell (the seed shuffles again anyway).
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

let slot = 0;
const arrange = (options: [string, boolean][]): [string, boolean][] => {
  const correct = options.filter(o => o[1]);
  const rest = options.filter(o => !o[1]);
  if (correct.length !== 1) return options;
  rest.splice(slot++ % options.length, 0, correct[0]);
  return rest;
};

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: arrange(options).map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_IV_FRONTEND_BUNDLES: PilotBundle[] = [
  /* ── IV_HTML_CSS ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_IV_HTML_CSS',
    notes: `HTML and CSS questions open most front-end rounds because they are quick to ask and
quick to fail. The interviewer is not checking that you know a tag exists; they are checking that
you know **why** it behaves the way it does. Each question below has the answer that works, the
follow-up that usually comes next, and the answers that lose the point.

## 1. "Why does semantic HTML matter? Isn't a div with a class enough?"

**Strong answer.** Semantic elements carry meaning that the browser, screen readers and search
engines act on. A \`<button>\` is focusable, fires on Enter and Space, and is announced as a button —
a \`<div onclick>\` gets none of that unless you add \`tabindex\`, \`role="button"\` and key handlers by
hand. \`<nav>\`, \`<main>\`, \`<header>\` and headings in order give screen-reader users landmarks they
can jump between.

**Follow-up.** "When is a div the right choice?" — when there is no meaning to convey: a pure
layout wrapper.

**Wrong answers.** "It is only for SEO." "It makes the page load faster."

## 2. "How do you make a form accessible?"

**Strong answer.** Every input has a \`<label>\` tied to it (\`for\`/\`id\`, or wrapping), errors are
connected with \`aria-describedby\` and announced, required fields are marked in text not colour
alone, focus order follows the visual order, and the whole form works with a keyboard. Images get
meaningful \`alt\`, decorative ones \`alt=""\`.

**Follow-up.** "What is the first rule of ARIA?" — do not use ARIA if a native element does the job.
"How do you test it?" — tab through it with no mouse, run axe or Lighthouse, try a screen reader.

**Wrong answer.** "Add aria-label to everything."

## 3. "Explain the box model. What is box-sizing?"

**Strong answer.** Every box is content, padding, border, margin. Under the default
\`box-sizing: content-box\`, \`width\` sets the **content** only:

    .card { width: 200px; padding: 20px; border: 5px solid; }
    /* content-box: 200 + 2*20 + 2*5 = 250px wide on screen  */
    /* border-box:  250 would shrink to 200 — padding and border fit inside */

Most codebases set \`*, *::before, *::after { box-sizing: border-box; }\` so the number you write is
the number you see.

**Follow-up.** "What is margin collapse?" — vertical margins of adjacent block siblings (and of a
parent with its first/last child, when nothing separates them) combine into the larger of the two,
not their sum. It does not happen in flex or grid containers.

## 4. "How is specificity calculated?"

**Strong answer.** As a tuple compared left to right: (IDs, classes + attributes + pseudo-classes,
elements + pseudo-elements). Inline styles beat all of them; \`!important\` beats inline.

    #nav .item a:hover    → (1, 2, 1)   one ID; .item and :hover; a
    .menu .item .link     → (0, 3, 0)
    body div ul li a      → (0, 0, 5)

(1, 2, 1) wins — one ID outranks any number of classes; there is no carrying over. Equal
specificity → the rule that appears later wins.

**Follow-up.** "What about \`:is()\` and \`:where()\`?" — \`:is()\` takes the specificity of its most
specific argument; \`:where()\` always counts zero, which is why libraries use it for overridable
defaults.

**Wrong answers.** "Inline styles can't be overridden." "Specificity is a single number like 111."

## 5. "Flexbox or Grid — how do you choose?"

**Strong answer.** Flexbox lays things out in **one** dimension and lets content size drive the
layout — a toolbar, a row of tags, centring one thing. Grid lays out in **two** dimensions with the
layout defined first — a page shell, a card gallery whose rows and columns both align. They nest
happily: a grid of cards, each card a flex column.

    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }

**Follow-up.** "A flex child with a long URL overflows even with \`flex: 1\`. Why?" — flex items
default to \`min-width: auto\`, so they will not shrink below their content. Set \`min-width: 0\`
(and \`overflow: hidden\` for ellipsis). \`flex: 1\` is shorthand for \`1 1 0%\`.

**Wrong answer.** "Grid replaced flexbox."

## 6. "My modal has z-index 9999 and still sits under the header. Why?"

**Strong answer.** z-index only competes **within a stacking context**. An ancestor that creates
one — \`position\` with a z-index, \`opacity < 1\`, \`transform\`, \`filter\`, \`isolation: isolate\`,
\`will-change\` — caps everything inside it at that ancestor's level. If the modal lives in a
sidebar with \`transform\` and \`z-index: 1\`, its 9999 only ranks it among the sidebar's children.

**Follow-up.** "How do you fix it in React?" — render the modal outside the tree with a portal
(\`createPortal(modal, document.body)\`), or remove the property creating the context.

**Wrong answer.** "Use a bigger z-index."

## 7. "Explain position: relative, absolute, fixed and sticky."

**Strong answer.** Relative offsets an element from its normal place and becomes the containing
block for absolute children. Absolute leaves the flow and positions against the nearest positioned
ancestor. Fixed positions against the viewport — unless an ancestor has a \`transform\`, which
quietly becomes its containing block. Sticky behaves as relative until a threshold (\`top: 0\`) is
crossed, then sticks within its parent; it silently fails if no threshold is set or an ancestor has
\`overflow: hidden\`.

## 8. "How do you build a responsive layout?"

**Strong answer.** The viewport meta tag, mobile-first CSS with \`min-width\` media queries, fluid
units (\`%\`, \`fr\`, \`rem\`, \`clamp()\`), images with \`max-width: 100%\` and \`srcset\`. \`rem\` scales with
the root font size (respects user settings); \`em\` compounds with the parent, which surprises people
in nested lists.

**Follow-up.** "Container queries?" — \`@container\` sizes a component by its container, not the
viewport, so the same card works in a sidebar and a main column.

## 9. "display: none, visibility: hidden, opacity: 0 — what is the difference?"

| | Takes space | Clickable | Read by screen readers |
|---|---|---|---|
| \`display: none\` | no | no | no |
| \`visibility: hidden\` | yes | no | no |
| \`opacity: 0\` | yes | **yes** | yes |

**Follow-up.** "How do you hide text visually but keep it for screen readers?" — the
\`.sr-only\` clip pattern, never \`display: none\`.

## 10. "What makes an animation janky?"

**Strong answer.** Animating properties that trigger **layout** (\`width\`, \`top\`, \`margin\`) forces
reflow every frame. \`transform\` and \`opacity\` can be handled by the compositor and stay smooth.
Reading layout (\`offsetHeight\`) right after writing styles inside a loop causes layout thrashing —
batch reads, then writes.`,
    mcqs: [
      mcq('Inside `<nav id="main"><ul class="menu"><li class="item"><a class="link">`, the rules `#main a { color: red }` and `.menu .item .link { color: blue }` both match the link. What colour is it?',
        [['Red, because one ID outranks any number of classes', true],
          ['Blue, because three classes outweigh one ID and one element', false],
          ['Whichever of the two rules appears later in the stylesheet', false],
          ['Purple, because the browser blends two matching colours', false]],
        '#main a is (1,0,1) and .menu .item .link is (0,3,0). The tuple is compared column by column from the left, so the single ID wins outright; source order only decides ties.'),
      mcq('`.card { width: 300px; padding: 16px; border: 2px solid; }` with no box-sizing set anywhere. How wide is the card on screen?',
        [['336px', true], ['300px', false], ['332px', false], ['316px', false]],
        'The default is content-box, so width is the content alone: 300 + 16×2 padding + 2×2 border = 336px. With border-box it would be exactly 300px.'),
      mcq('A modal with `z-index: 1000` lives inside `.sidebar { transform: translateX(0); z-index: 1 }`. The header beside the sidebar has `z-index: 10`. Why does the header cover the modal?',
        [['The sidebar is a stacking context, so 1000 only ranks inside it', true],
          ['transform resets every z-index inside it back to auto', false],
          ['A header element always paints above body content', false],
          ['z-index above 999 is ignored by most browsers', false]],
        'transform with z-index makes .sidebar its own stacking context at level 1. Everything inside is painted as part of that level, so the header at 10 beats the whole sidebar, modal included.'),
    ],
    checkpoint: [
      ck('HTML', 'A teammate writes `<div class="btn" onclick="save()">Save</div>`. What does swapping it for `<button type="button" onclick="save()">` give you with no extra code?',
        [['Keyboard focus, and activation with Enter and Space', true],
          ['An automatic submit of the nearest form to the API', false],
          ['A larger tap target on touch screens by default', false],
          ['Faster rendering, since buttons are drawn natively by the OS', false]],
        'A native button is in the tab order, activates on Enter and Space and is announced as a button. type="button" specifically stops it submitting a form.'),
      ck('CSS', 'In `.row { display: flex }`, the child `.title { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis }` holds a long URL and still pushes the row wider than the screen. What fixes it?',
        [['min-width: 0 on .title, so it may shrink below its content', true],
          ['flex: 2 on .title, so it is given a larger share of space', false],
          ['flex-wrap: nowrap on .row, so the row stops overflowing', false],
          ['width: 100% on .title, so it matches the row exactly', false]],
        'Flex items default to min-width: auto, which means "never narrower than my content". Overriding it with 0 lets the item shrink so overflow and ellipsis can take effect.'),
      ck('CSS', 'A form shows its error line by switching it between `visibility: hidden` and `visibility: visible`. Users say the form has an odd blank gap when there is no error. Why?',
        [['visibility: hidden keeps the box in layout; display: none removes it', true],
          ['visibility: hidden still renders the text in the background colour', false],
          ['The browser reserves space for any element that has an error class on it', false]],
        'visibility: hidden only stops painting; the element still takes its space. display: none removes it from layout, so no gap appears until the error is shown.'),
    ],
  },

  /* ── IV_JS_CORE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_IV_JS_CORE',
    notes: `JavaScript core questions are almost always a snippet and "what happens?". Say the output
first, then the rule that produces it — an interviewer cares much more about the rule.

## 1. "What does this print, and how do you fix it?"

    for (var i = 0; i < 3; i++) {
      setTimeout(() => console.log(i), 0);
    }
    // 3 3 3

**Strong answer.** \`var\` is function-scoped, so all three callbacks close over the **same** \`i\`,
which is 3 by the time they run. Changing to \`let\` prints 0 1 2 because \`let\` creates a fresh
binding for every iteration. The pre-ES6 fix was an IIFE that captured \`i\` as a parameter.

**Follow-up.** "Why does a closure see 3 rather than the value at the time?" — closures capture
variables, not values.

**Wrong answer.** "setTimeout with 0 runs after the loop, so it has the last value" — true but not
the reason; with \`let\` it also runs after the loop.

## 2. "What is hoisting? What is the temporal dead zone?"

**Strong answer.** Declarations are registered before code runs. \`var\` is initialised to
\`undefined\`; function declarations are fully available; \`let\`, \`const\` and \`class\` exist but are
uninitialised until their line runs — touching them earlier throws a ReferenceError (the TDZ). Even
\`typeof\` throws in the TDZ, although it is safe on an undeclared name.

    console.log(a); // undefined
    console.log(b); // ReferenceError
    var a = 1; let b = 2;

**Wrong answer.** "let and const are not hoisted."

## 3. "What is a closure? Give a real use."

**Strong answer.** A function together with the variables of the scope it was created in, which it
keeps alive after that scope returns. Uses: private state, \`once\`, memoisation, a debounced handler,
every React hook callback.

    function once(fn) {
      let done = false, result;
      return (...args) => done ? result : (done = true, result = fn(...args));
    }

**Follow-up.** "Can closures leak memory?" — yes, a long-lived closure (an event listener never
removed) keeps everything it references alive.

## 4. "How is \`this\` decided?"

**Strong answer.** By how a regular function is **called**: \`obj.m()\` → obj; \`fn()\` → undefined in
strict mode (the global object in sloppy scripts); \`new\` → the new object; \`call/apply/bind\` → what
you pass. Arrow functions have no \`this\` of their own — they use the enclosing scope's.

    const user = {
      name: 'Asha',
      hi() { return this.name; },
      bye: () => this.name,          // NOT user — the module/global this
    };
    const hi = user.hi;
    hi();                             // TypeError in a module: this is undefined

Class bodies are strict, so a detached class method has \`this === undefined\`. Passing it to
\`addEventListener\` gives it the element instead. Fix with \`bind\` in the constructor or an arrow
class field (\`handle = () => {...}\`).

**Follow-up.** "Can you rebind a bound function?" — no; a second \`bind\` cannot change \`this\`.

## 5. "Explain the prototype chain."

**Strong answer.** Every object has an internal link (\`[[Prototype]]\`) to another object. A property
lookup that misses on the object walks that chain until it hits \`null\`. \`class\` is syntax over this:
methods live once on \`Class.prototype\` and every instance shares them, so changing the prototype
changes every instance immediately.

**Follow-up.** "Object.create(null)?" — an object with no prototype: no inherited \`toString\` or
\`hasOwnProperty\`, safe as a dictionary.

**Wrong answer.** "Instances copy their class's methods."

## 6. "== versus ===?"

**Strong answer.** \`===\` compares without conversion. \`==\` coerces using fixed rules:
\`null == undefined\` is true but neither equals anything else (so \`null == 0\` is false); booleans
become numbers; objects are converted to primitives (\`[] == false\` is true because \`[]\` → \`''\` → 0).
\`NaN\` equals nothing, including itself — use \`Number.isNaN\` or \`Object.is\`. The one idiomatic \`==\`
is \`x == null\`, which checks both null and undefined.

## 7. "If const means constant, why can I push to a const array?"

**Strong answer.** \`const\` fixes the **binding**, not the value. Use \`Object.freeze\` for the value —
and it is shallow: nested objects stay mutable.

## 8. "Shallow copy versus deep copy?"

**Strong answer.** Spread and \`Object.assign\` copy one level; nested objects are shared.
\`structuredClone\` deep-copies and handles Dates, Maps, Sets and cycles but throws on functions.
\`JSON.parse(JSON.stringify(x))\` turns Dates into strings and drops \`undefined\` and functions.

    const a = { user: { name: 'Asha' } };
    const b = { ...a };
    b.user.name = 'Ravi';
    a.user.name;   // 'Ravi' — same nested object

**Follow-up.** "Why does React care?" — state updates must produce new objects along the changed
path; mutating a nested object then spreading the top level still hands React the same nested
reference.

## 9. "What are arrow functions missing?"

**Strong answer.** Their own \`this\`, \`arguments\`, \`super\` and \`new.target\`; they cannot be
called with \`new\` and have no \`prototype\`. That is why they are perfect for callbacks and wrong for
object methods that need \`this\`.

## 10. "Event bubbling and delegation?"

**Strong answer.** Events fire on the target, then bubble through each ancestor. Delegation puts one
listener on a parent and checks \`event.target.closest('li')\`, which handles items added later and
saves a listener per row. \`event.target\` is what was clicked; \`event.currentTarget\` is the element
whose listener is running.`,
    mcqs: [
      mcq('In an ES module, `const counter = { count: 0, inc() { this.count++; } }; const inc = counter.inc; inc();` — what happens?',
        [['A TypeError: this is undefined in a detached call', true],
          ['counter.count becomes 1, since inc lives on counter', false],
          ['A global count is created and set to NaN', false],
          ['Nothing; the call is silently ignored', false]],
        'Modules are strict mode, and a plain call fn() passes this as undefined, so this.count throws. The NaN global is what a sloppy, non-module script would do instead.'),
      mcq('`const a = { user: { name: "Asha" } }; const b = { ...a }; b.user.name = "Ravi";` — what is `a.user.name` now?',
        [['"Ravi", because spread copies only the top level', true],
          ['"Asha", because spread copies every nested object', false],
          ['undefined, because spread skips nested objects', false],
          ['It throws, because a was declared with const', false]],
        'Spread is a shallow copy: b.user and a.user are the same object, so writing through either is seen by both. structuredClone would give b its own nested user.'),
      mcq('`function Dog(n) { this.name = n; } Dog.prototype.speak = function () { return this.name + " barks"; }; const d = new Dog("Rex"); Dog.prototype.speak = function () { return "woof"; };` — what does `d.speak()` return?',
        [['"woof"', true], ['"Rex barks"', false], ['TypeError: d.speak is not a function', false], ['undefined', false]],
        'd has no own speak; the lookup walks to Dog.prototype at call time and finds whatever is there now. Instances share the prototype rather than copying its methods at creation.'),
    ],
    checkpoint: [
      ck('JS_BASICS', '`var fns = []; for (var i = 0; i < 3; i++) fns.push(() => i); console.log(fns.map(f => f()));` — what is logged?',
        [['[3, 3, 3]', true], ['[0, 1, 2]', false], ['[2, 2, 2]', false], ['[undefined, undefined, undefined]', false]],
        'All three arrows close over the single function-scoped i, which ends at 3 when the loop condition fails. With let each iteration would get its own i and the result would be [0, 1, 2].'),
      ck('JS_BASICS', '`console.log(typeof a, typeof b); var a = 1; let b = 2;` — what happens?',
        [['A ReferenceError is thrown before anything is logged', true],
          ['Logs "undefined undefined", as typeof never throws', false],
          ['Logs "undefined" for a, then throws a ReferenceError', false],
          ['Logs "number number", because both are hoisted', false]],
        'b is in its temporal dead zone, and typeof does throw there. The arguments are evaluated before console.log runs, so nothing is printed; a alone would have been "undefined".'),
      ck('JS_ES6', 'In a browser: `const timer = { secs: 5, start() { setTimeout(function () { console.log(this.secs); }, 0); setTimeout(() => console.log(this.secs), 0); } }; timer.start();` — what is logged?',
        [['undefined, then 5', true], ['5, then 5', false], ['5, then undefined', false], ['undefined, then undefined', false]],
        'The regular function is called by the timer with this set to window, which has no secs. The arrow has no this of its own and uses start()\'s, which is timer.'),
    ],
  },

  /* ── IV_JS_ASYNC ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_IV_JS_ASYNC',
    notes: `Asynchronous JavaScript is where interviewers separate people who have memorised
"JavaScript is single-threaded" from people who can predict what code does. Expect an ordering
puzzle, an async/await bug and a "write debounce" task.

## 1. "Explain the event loop."

**Strong answer.** One call stack runs JavaScript. Timers, network and DOM events are handled by
the browser (or Node), which queues callbacks when they are ready. When the stack is empty the loop
takes **one task** (macrotask: a timer callback, an event, a message), runs it, then drains the
**entire microtask queue** (promise reactions, \`queueMicrotask\`, MutationObserver) — including
microtasks queued by microtasks — and only then may render and take the next task.

**Follow-up.** "So can a microtask starve the page?" — yes: a microtask that keeps queueing
microtasks blocks rendering forever; a task loop does not, because rendering gets a turn between
tasks.

## 2. "What is the output?"

    console.log('A');
    setTimeout(() => console.log('B'), 0);
    Promise.resolve().then(() => console.log('C'));
    queueMicrotask(() => console.log('D'));
    console.log('E');
    // A E C D B

**Strong answer.** A and E are synchronous. C and D are microtasks in the order queued. B is a
task, so it waits until the microtask queue is empty.

## 3. "And with async/await?"

    async function f() { console.log(1); await null; console.log(2); }
    f();
    console.log(3);
    // 1 3 2

**Strong answer.** An async function runs synchronously up to its first \`await\`; everything after
the await is a microtask continuation. Since ES2019, awaiting an already-resolved native promise
costs one microtask tick (older engines took three, which is why old blog posts give different
orders).

## 4. "Promise.all, allSettled, race, any?"

**Strong answer.** \`all\` — every result, or rejects as soon as **one** rejects (others keep
running; their results are ignored). \`allSettled\` — waits for all, never rejects, gives
\`{status, value|reason}\` each. \`race\` — settles like the first to settle, success or failure.
\`any\` — first success; rejects with an AggregateError only if all fail. Dashboard with optional
widgets → allSettled; timeout wrapper → race.

## 5. "Why does 'done' print first?"

    async function saveAll(items) {
      items.forEach(async (it) => { await api.save(it); });
      console.log('done');
    }

**Strong answer.** \`forEach\` ignores the promises its callback returns. Use \`for...of\` with
\`await\` for one-at-a-time, or \`await Promise.all(items.map(api.save))\` for all at once.

## 6. "These two calls are independent. What is wrong?"

    const user = await getUser();     // 300 ms
    const orders = await getOrders(); // 500 ms  → 800 ms total

**Strong answer.** Sequential awaits add up. Start both, then await:
\`const [user, orders] = await Promise.all([getUser(), getOrders()])\` → about 500 ms.

## 7. "Write debounce. How is throttle different?"

**Strong answer.** Debounce waits until calls **stop** for \`ms\`, then runs once with the last
arguments — search-as-you-type. Throttle runs at most once per \`ms\` while calls keep coming —
scroll and resize handlers. (Full walk-through in the worked example.)

**Wrong answer.** Declaring the timer variable inside the returned function — then every call has
its own timer and nothing is ever cancelled.

## 8. "Does fetch reject on a 404?"

**Strong answer.** No. \`fetch\` rejects only on a network failure (or abort). A 404 or 500 resolves
normally; check \`res.ok\` / \`res.status\` and throw yourself. Cancel with an \`AbortController\` — the
standard fix for out-of-order responses when a user types fast.

## 9. "Is setTimeout(fn, 0) zero milliseconds?"

**Strong answer.** No: it means "a task, not before 0 ms". Browsers clamp nested timers to at least
4 ms, and a long-running task delays every timer behind it. Timers are a minimum, never a promise.

## 10. "What happens to an unhandled rejection?"

**Strong answer.** The browser fires \`unhandledrejection\` and logs it; Node 15+ crashes the process
by default. Every promise chain needs a \`.catch\` or a \`try/catch\` around its \`await\` at the level that
can do something useful about the error.`,
    workedExample: `**"Implement debounce" — the whiteboard answer, built up the way you would say it.**

Start with the contract out loud: *"debounce(fn, ms) returns a function. Calling it repeatedly only
runs fn once the calls have stopped for ms milliseconds, with the latest arguments."*

    function debounce(fn, ms) {
      let timer;                          // shared by every call — the closure is the point
      return function (...args) {
        clearTimeout(timer);              // cancel the run scheduled by the previous call
        timer = setTimeout(() => {
          fn.apply(this, args);           // keep the caller's this and the latest args
        }, ms);
      };
    }

    const onInput = debounce((q) => searchApi(q), 300);
    // typing "react" fast: 5 calls, 4 cancelled, searchApi('react') runs once, 300 ms after the 't'

**Walk the timeline aloud.** t=0 'r' schedules run@300. t=80 'e' clears it, schedules run@380.
... t=320 't' schedules run@620. Nothing else arrives, so at 620 searchApi('react') runs once.

**The interviewer's follow-ups, and your answers.**

1. *"Why not declare timer inside the returned function?"* — each call would get a fresh, empty
   timer, \`clearTimeout\` would cancel nothing, and every keystroke would hit the API.
2. *"Why a regular function, not an arrow, for the returned one?"* — so \`this\` is whatever the
   caller used (useful when attached as a method); the inner arrow then inherits it.
3. *"Add a cancel."* — \`debounced.cancel = () => clearTimeout(timer);\` so a component can cancel on
   unmount.
4. *"Throttle?"* — remember the last run time; run immediately if \`Date.now() - last >= ms\`,
   otherwise ignore (or schedule a trailing call).
5. *"In React?"* — create it once (\`useMemo(() => debounce(search, 300), [])\` or a ref) and cancel it
   in an effect cleanup. Creating it inside the render body makes a new debouncer every render, so
   nothing is ever debounced.`,
    mcqs: [
      mcq('`setTimeout(() => console.log("t1"), 0); Promise.resolve().then(() => { console.log("p1"); setTimeout(() => console.log("t2"), 0); }).then(() => console.log("p2")); console.log("s");` — what is the order?',
        [['s p1 p2 t1 t2', true], ['s t1 p1 p2 t2', false], ['s p1 t1 p2 t2', false], ['p1 p2 s t1 t2', false]],
        'The sync log runs first. Both promise reactions are microtasks and drain before any timer. t1 was queued before t2 (which was only scheduled inside p1), so t1 runs first.'),
      mcq('`async function saveAll(items) { items.forEach(async (it) => { await api.save(it); }); console.log("done"); }` — when is "done" logged?',
        [['Before any save has finished', true],
          ['After every save has finished', false],
          ['After the first save, while the rest continue', false],
          ['Never; async callbacks are invalid in forEach', false]],
        'forEach calls each async callback and throws away the promise it returns, so nothing waits. for...of with await, or await Promise.all(items.map(...)), makes saveAll actually wait.'),
      mcq('`try { const res = await fetch("/api/users/99"); const user = await res.json(); show(user); } catch { showError(); }` — the API answers 404 with `{"message":"Not found"}`. What runs?',
        [['show() is called with the error body', true],
          ['showError() runs, since fetch rejects on 404', false],
          ['res.json() throws, so showError() runs', false],
          ['Neither; the promise stays pending', false]],
        'fetch only rejects for network failure or abort. A 404 is a successful HTTP exchange, the JSON body parses fine, and show() receives the error object. Check res.ok and throw.'),
    ],
    checkpoint: [
      ck('JS_ASYNC', '`async function a() { console.log("a1"); await b(); console.log("a2"); } async function b() { console.log("b"); } a(); Promise.resolve().then(() => console.log("p")); console.log("end");` — what is the order in a current browser?',
        [['a1 b end a2 p', true], ['a1 b a2 end p', false], ['a1 end b a2 p', false], ['a1 b end p a2', false]],
        'a and b run synchronously up to the await. Awaiting b\'s resolved promise queues a\'s continuation first, then the .then queues p; end logs, then the microtasks run in order. Pre-2019 engines put p first.'),
      ck('JS_ASYNC', '`getUser()` takes 300 ms and `getOrders()` takes 500 ms; they are independent. How long do `const u = await getUser(); const o = await getOrders();` and `await Promise.all([getUser(), getOrders()])` take?',
        [['About 800 ms, and about 500 ms', true],
          ['About 500 ms both ways, both being async', false],
          ['About 800 ms both ways, JS being single-threaded', false],
          ['About 800 ms, and about 300 ms', false]],
        'Sequential awaits start the second request only after the first finishes. Promise.all starts both at once and waits for the slower one. Single-threaded JS is fine: the waiting happens in the network layer.'),
      ck('JS_ASYNC', 'A search box should call the API once the user has stopped typing for 300 ms; a scroll listener should update a progress bar at most every 100 ms while scrolling. Which pairing is right?',
        [['Debounce the search; throttle the scroll', true],
          ['Throttle the search; debounce the scroll', false],
          ['Debounce both, each with its own delay', false],
          ['Throttle both, each with its own delay', false]],
        'Debounce fires once after activity stops, which suits a search. Throttle fires regularly during activity; a debounced progress bar would freeze until scrolling stopped.'),
    ],
  },

  /* ── IV_REACT_CORE ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_IV_REACT_CORE',
    notes: `React fundamentals questions test whether you know **what React does with the tree you
return**, not whether you can write JSX. Answer with the mechanism.

## 1. "What is the virtual DOM? Is it faster than the real DOM?"

**Strong answer.** Rendering returns a tree of plain objects describing the UI. React compares it
with the previous tree (**reconciliation**) and applies the minimum DOM changes. It is not
inherently faster than hand-written DOM updates — it makes "describe the whole UI from state" cheap
enough to be the programming model.

**Follow-up.** "How does the diff stay O(n)?" — two heuristics: an element of a different **type**
replaces the whole subtree (state lost); children in a list are matched by **key**.

## 2. "Why not use the array index as a key?"

**Strong answer.** The key tells React which item is which between renders. With index keys,
deleting or inserting at the top shifts every index, so React reuses component instances — and
their state, and uncontrolled input DOM — for the wrong items. Use a stable id from the data. Never
\`Math.random()\`: a new key every render remounts every row.

**Follow-up.** "When is index fine?" — a static list that never reorders and whose items hold no
state.

## 3. "How do you reset a component's state when a prop changes?"

**Strong answer.** Give it a key: \`<ChatRoom key={roomId} roomId={roomId} />\`. A new key is a new
component instance — fresh state, no effect juggling.

## 4. "Props versus state? Can I copy props into state?"

**Strong answer.** Props are inputs owned by the parent; state is owned by this component and
changes over time. Copying a prop into state (\`useState(props.price)\`) only reads it on mount — later
prop changes are ignored. Compute derived values during render instead.

## 5. "Controlled versus uncontrolled inputs?"

**Strong answer.** Controlled: React state is the source of truth (\`value\` + \`onChange\`) — good for
validation, formatting, conditional UI. Uncontrolled: the DOM holds the value (\`defaultValue\`, read
via a ref or FormData on submit) — less code, fewer renders. \`value\` without \`onChange\` makes a
read-only field and a warning. Switching \`value\` from \`undefined\` to a string triggers the
"uncontrolled to controlled" warning — initialise with \`''\`. File inputs are always uncontrolled.

## 6. "Why didn't my count go up by three?"

    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);   // +1 total

**Strong answer.** \`count\` is the value from this render; all three ask for the same number. Use the
updater form \`setCount(c => c + 1)\`, which receives the latest queued value.

## 7. "What does React 18 change about batching?"

**Strong answer.** With \`createRoot\`, **automatic batching**: updates inside promises, timeouts and
native handlers are batched into one render, not only those in React event handlers. \`flushSync\`
opts out when you must read the DOM straight after an update.

## 8. "Why does my input lose focus on every keystroke?"

    function Form() {
      const [q, setQ] = useState('');
      function Field() { return <input value={q} onChange={e => setQ(e.target.value)} />; }
      return <Field />;
    }

**Strong answer.** \`Field\` is a new function — a new component **type** — on every render, so React
unmounts the old input and mounts a new one. Define components at module level.

## 9. "Lifting state up — when, and what if it gets painful?"

**Strong answer.** When two siblings need the same data, move it to their nearest common parent and
pass it down. If that means threading props through many layers, prefer composition (pass
\`children\` or elements) before reaching for context.

## 10. "What does StrictMode do?"

**Strong answer.** In development only: renders components twice and mounts, unmounts and remounts
them to flush out impure renders and effects with missing cleanup. Production is unaffected — so
"my API is called twice" in dev is a signal to add cleanup, not a bug in React.

## 11. "Why does my page show a stray 0?"

    {items.length && <List items={items} />}

**Strong answer.** \`&&\` returns the left side when it is falsy, and React renders the number 0.
Use \`items.length > 0 && ...\`.`,
    mcqs: [
      mcq('Todos render with `key={index}`; each row has an uncontrolled `<input>` for a note. A user types "buy milk" in the first row\'s input, then deletes the first todo. What do they see?',
        [['"buy milk" now sits next to the todo that was second', true],
          ['The first row disappears and every note stays aligned', false],
          ['Every note input is cleared because the list re-renders', false],
          ['A duplicate-key warning, and nothing on screen changes', false]],
        'Keys 0..n are reused after the delete, so React keeps the instance (and DOM input) at key 0 and hands it the second todo\'s props. The typed value stays in that DOM node; only the last row is removed.'),
      mcq('`const count = 0;` and the JSX contains `{count && <Badge count={count} />}`. What is rendered?',
        [['The text 0', true], ['Nothing at all', false], ['A Badge showing 0', false], ['The text false', false]],
        '0 && x evaluates to 0, and React renders numbers (only true, false, null and undefined render nothing). Write count > 0 && ... to render nothing.'),
      mcq('`function Form() { const [q, setQ] = useState(""); function Field() { return <input value={q} onChange={e => setQ(e.target.value)} />; } return <Field />; }` — after each keystroke the input loses focus. Why?',
        [['Field is a new component type each render, so React remounts the input', true],
          ['Controlled inputs always lose focus when their state updates', false],
          ['setQ is asynchronous, so the value arrives after focus is lost', false],
          ['The inner function closes over a stale q from the first render', false]],
        'React compares element types by reference. A function defined inside Form is a different function every render, so the old Field subtree is unmounted and a new input mounted, without focus.'),
    ],
    checkpoint: [
      ck('REACT_COMPONENTS', 'Starting from `count = 0`, a click runs `setCount(count + 1); setCount(count + 1); setCount(c => c + 1);`. What is count after the re-render?',
        [['2', true], ['3', false], ['1', false], ['0', false]],
        'The first two both queue "set to 0 + 1 = 1". The updater then receives the latest queued value, 1, and returns 2. Only updater functions see earlier queued updates.'),
      ck('REACT_COMPONENTS', '`<ChatRoom roomId={id} />` keeps an unsent draft in its own state. When the user switches rooms, the old draft appears in the new room. What is the cleanest fix?',
        [['Render <ChatRoom key={id} roomId={id} /> so each room is a new instance', true],
          ['Add a useEffect in ChatRoom that clears the draft whenever roomId changes', false],
          ['Lift the draft into the parent and reset it on every single re-render', false],
          ['Wrap ChatRoom in React.memo so it re-renders only when roomId changes', false]],
        'A changed key makes React unmount the old instance and mount a fresh one, so all of its state resets in one step. The effect works but renders the stale draft once first.'),
      ck('REACT_COMPONENTS', 'A component renders `<input value={name} />` with no onChange. What happens when the user types?',
        [['Nothing changes in the field, and React warns about a missing onChange', true],
          ['The field updates but name stays the same until the form is submitted', false],
          ['React automatically creates an onChange that writes to name for you', false],
          ['The input switches to uncontrolled mode and keeps whatever is typed', false]],
        'A value prop makes the input controlled: React resets it to name after every keystroke. Without onChange updating name, the field is effectively read-only.'),
    ],
  },

  /* ── IV_REACT_HOOKS ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_IV_REACT_HOOKS',
    notes: `Hooks questions are where React interviews get hard, because the bugs are about **time**:
which render's values a function sees, and when an effect and its cleanup run.

## 1. "Explain useEffect's dependency array."

**Strong answer.** No array — runs after every render. \`[]\` — after mount only (cleanup on
unmount). \`[a, b]\` — after mount and after any render where \`a\` or \`b\` changed by \`Object.is\`.
Effects run **after** the browser paints. The array is not an optimisation knob: it must list every
reactive value the effect reads, or the effect sees stale ones.

## 2. "Why does this counter stop at 1?"

    useEffect(() => {
      const id = setInterval(() => setSeconds(seconds + 1), 1000);
      return () => clearInterval(id);
    }, []);

**Strong answer.** A **stale closure**: the interval callback was created in the first render,
where \`seconds\` is 0, and the empty array means it is never recreated. It sets 1 forever. Fix with
the updater \`setSeconds(s => s + 1)\` (best — no dependency needed), or list \`seconds\` as a
dependency (the interval restarts every tick), or read from a ref.

**Wrong answer.** "Add \`// eslint-disable-next-line\`."

## 3. "When does the cleanup run? Why would you need it?"

**Strong answer.** Before the effect runs again (with the **old** values) and on unmount. With
\`[id]\` changing 1 → 2, you see \`clean 1\`, then \`run 2\`. Needed for subscriptions, timers, sockets —
and for **race conditions** in fetches:

    useEffect(() => {
      let ignore = false;
      fetch('/api/users/' + id).then(r => r.json()).then(u => { if (!ignore) setUser(u); });
      return () => { ignore = true; };   // or AbortController.abort()
    }, [id]);

Without it, a slow response for id 1 can arrive after the one for id 2 and overwrite it.

## 4. "Why is my effect running in an infinite loop?"

**Strong answer.** A dependency that is a new object or function every render:
\`const filters = { status: 'open' }\` in the body, \`useEffect(..., [filters])\`, and the effect sets
state → re-render → new \`filters\` → effect again. Move the constant outside the component, depend on
the primitive (\`filters.status\`), or \`useMemo\` it.

## 5. "useMemo, useCallback, React.memo — when are they worth it?"

**Strong answer.** \`React.memo\` skips re-rendering a component when its props are shallowly equal.
\`useCallback\`/\`useMemo\` keep a function/value's **identity** stable between renders, which only
matters if something compares it — a memoised child or an effect dependency. \`useMemo\` also caches
expensive computation (sorting 10,000 rows). Each costs memory and a comparison every render, so
memoising \`a + b\` is pure overhead. Measure with the React Profiler first.

**Follow-up.** "Does useCallback make a function faster?" — no; it creates the function every render
anyway and returns the old one when deps match.

## 6. "What causes a re-render?"

**Strong answer.** Its state changes, its parent re-renders, or a context it reads changes. A prop
change is not a separate cause — props only change because the parent rendered. Setting state to
the same value (\`Object.is\`) bails out.

## 7. "What does context cost? Context or Redux?"

**Strong answer.** Every consumer re-renders when the provider's \`value\` changes by identity.
\`value={{ user, logout }}\` is a new object on every provider render, so every consumer re-renders
even when \`user\` did not change. Memoise the value, split fast- and slow-changing contexts, keep
unrelated state out of the provider's component. Context is dependency injection, not a state
manager: Redux (or Zustand) lets a component subscribe to a **slice** via a selector and re-render
only when that slice changes — that is why large, frequently-changing shared state goes there.

## 8. "useRef versus useState?"

**Strong answer.** Both persist across renders; changing \`ref.current\` does not re-render. Refs hold
DOM nodes, timer ids, the previous value, the latest callback. Never read a ref during render to
decide what to show — the screen will lag behind it.

## 9. "The rules of hooks — why do they exist?"

**Strong answer.** React identifies hooks by **call order**. A hook inside an \`if\` or loop shifts the
order between renders and state gets handed to the wrong hook. Call hooks at the top level of
components or custom hooks only.

## 10. "useLayoutEffect versus useEffect?"

**Strong answer.** \`useLayoutEffect\` runs after DOM mutation but **before paint** — measure an element
and reposition a tooltip without a flicker. It blocks painting, so default to \`useEffect\`.

## 11. "My effect fetches twice in development."

**Strong answer.** StrictMode mounts, runs cleanup, and mounts again in dev to prove the cleanup is
right. The fix is a proper cleanup (abort or ignore), not a \`useRef\` flag that hides it. In
production it runs once.

## 12. "Do two components using the same custom hook share state?"

**Strong answer.** No. A custom hook shares **logic**; each call has its own state. Shared state needs
lifting, context or a store.`,
    workedExample: `**"Build a live clock component and talk me through it."** — a common pair-programming task
that is really a stale-closure and cleanup test.

**First attempt (what many candidates type):**

    function Clock() {
      const [now, setNow] = useState(new Date());
      useEffect(() => {
        setInterval(() => setNow(new Date()), 1000);
      }, []);
      return <p>{now.toLocaleTimeString()}</p>;
    }

It appears to work. The interviewer asks: *"What happens when Clock unmounts?"* — the interval keeps
running and calls \`setNow\` on an unmounted component; navigate away and back three times and four
intervals are running. In StrictMode dev you can already see two.

**Second attempt — add cleanup:**

    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);

**Interviewer:** *"Now show elapsed seconds since mount instead."* A candidate writes
\`setElapsed(elapsed + 1)\` inside the same effect and the display freezes at 1. Explain it: the
callback captured \`elapsed\` from the first render; \`[]\` means it is never recreated.

**Fix and say why:** \`setElapsed(e => e + 1)\` — the updater reads the latest value, so the effect
genuinely has no dependency and \`[]\` is honest.

**Last follow-up:** *"Make the interval configurable with a \`delay\` prop."* Add \`delay\` to the
dependency array: when it changes, React runs the cleanup (clears the old interval) and the effect
again with the new delay. Mentioning that ordering — cleanup with old values, then effect with new —
is what marks a strong answer.`,
    mcqs: [
      mcq('`useEffect(() => { const id = setInterval(() => setSeconds(seconds + 1), 1000); return () => clearInterval(id); }, []);` — what does the display show after five seconds?',
        [['1, and it stays there', true],
          ['5, counting up once a second', false],
          ['0, because the interval never fires', false],
          ['10 in development, from StrictMode', false]],
        'The callback closed over seconds from the first render (0), so it sets 1 on every tick. In StrictMode the first interval is cleared by the cleanup, so dev still shows 1.'),
      mcq('`const Row = React.memo(RowImpl)` still re-renders every time its parent List renders. List passes `<Row item={item} onSelect={(id) => setSelected(id)} />`. Why?',
        [['The inline arrow is a new function each render, failing the props check', true],
          ['React.memo only skips renders caused by context, not by a parent', false],
          ['item is reread from state each time, so it is a new object every render', false],
          ['setSelected changes identity every render, which breaks memoisation', false]],
        'memo compares props with Object.is one by one. A fresh arrow every render never equals the previous one. useCallback for onSelect (with item stable) lets memo skip the render; state setters are already stable.'),
      mcq('App holds `const [search, setSearch] = useState("")` for a header search box and renders `<AuthContext.Provider value={{ user, logout }}>`. Every auth consumer re-renders on each keystroke. Which change alone stops that?',
        [['Memoise the value with useMemo on [user, logout]', true],
          ['Wrap each consumer component in React.memo', false],
          ['Switch the consumers from useContext to Consumer', false],
          ['Pass user and logout as two separate props instead', false]],
        'Each keystroke re-renders App, building a new value object, and context consumers re-render on a new value whatever memo says. A memoised value keeps its identity until user or logout changes.'),
    ],
    checkpoint: [
      ck('REACT_HOOKS', '`useEffect(() => { fetch("/api/users/" + id).then(r => r.json()).then(setUser); }, [id]);` — the user clicks user 1 then quickly user 2, and user 1\'s slower response arrives last. What shows, and what fixes it?',
        [['User 1; a cleanup that ignores or aborts the old request', true],
          ['User 2; React drops responses from an old dependency', false],
          ['User 1; add user to the dependency array as well', false],
          ['User 2; fetch cancels the earlier request by itself', false]],
        'Nothing cancels the first request, so its late setUser overwrites user 2. Returning a cleanup that sets an ignore flag or aborts the request discards it when id changes.'),
      ck('REACT_HOOKS', 'Inside a component body: `const filters = { status: "open" }; useEffect(() => { load(filters).then(setRows); }, [filters]);` — what happens?',
        [['The effect loops: each render makes a new filters object', true],
          ['It runs once, since the object holds the same values', false],
          ['It runs once, then never again unless status changes', false],
          ['React throws because objects cannot be dependencies', false]],
        'Dependencies are compared with Object.is, and a literal in the body is a new object every render. setRows re-renders, filters changes identity, and the effect runs again — forever.'),
      ck('REACT_HOOKS', 'In development a useEffect that opens a WebSocket logs "connected" twice on mount; production logs it once. What is going on?',
        [['StrictMode mounts, cleans up and re-mounts to test the cleanup', true],
          ['The dependency array is missing, so it runs on every render', false],
          ['The dev server hot-reloads the module once after first load', false],
          ['React 18 batching runs every effect twice in development', false]],
        'StrictMode deliberately runs effect, cleanup, effect in development. If the cleanup closes the socket, only one stays open. Production does not double-invoke.'),
    ],
  },

  /* ── RAPID_FIRE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_RAPID_FIRE',
    notes: `A screening call: thirty questions, one-line answers. If an answer takes you more than a
sentence, you are explaining instead of answering — say the line, and stop.

1. **Is \`let\` hoisted?** Yes, but uninitialised until its line — the temporal dead zone.
2. **\`typeof null\`?** \`'object'\` — a historical bug kept for compatibility.
3. **\`[1, 2, 3].map(parseInt)\`?** \`[1, NaN, NaN]\` — map passes the index as parseInt's radix.
4. **\`NaN === NaN\`?** false; use \`Number.isNaN\` or \`Object.is\`.
5. **\`null == undefined\`?** true; neither is \`==\` to anything else.
6. **What does \`const\` freeze?** The binding, not the object.
7. **Is \`Object.freeze\` deep?** No, shallow.
8. **Deep copy in one call?** \`structuredClone(obj)\`.
9. **Arrow functions and \`this\`?** They use the enclosing scope's \`this\`.
10. **Can you \`new\` an arrow function?** No — TypeError.
11. **Where do class methods live?** On \`Class.prototype\`, shared by every instance.
12. **Microtask or task — \`.then\`?** Microtask.
13. **Microtask or task — \`setTimeout\`?** Task.
14. **Does fetch reject on 500?** No; check \`res.ok\`.
15. **\`Promise.all\` with one rejection?** Rejects immediately with that reason.
16. **Never-rejecting combinator?** \`Promise.allSettled\`.
17. **Debounce vs throttle in five words?** After silence vs at most every.
18. **Specificity of \`#a .b c\`?** (1, 1, 1).
19. **Specificity of \`:where(#a)\`?** Zero.
20. **\`flex: 1\` expands to?** \`1 1 0%\`.
21. **One dimension or two — Grid?** Two.
22. **\`opacity: 0\` element — still clickable?** Yes.
23. **Does \`transform\` create a stacking context?** Yes.
24. **\`rem\` is relative to?** The root element's font size.
25. **Why keys?** So React matches list items between renders.
26. **Effect with no dependency array runs?** After every render.
27. **Does changing \`ref.current\` re-render?** No.
28. **\`useState(expensive())\` problem?** It runs on every render; pass \`() => expensive()\`.
29. **Does a context change skip \`React.memo\`?** No — consumers re-render regardless.
30. **StrictMode double rendering — in production?** No, development only.`,
    mcqs: [
      mcq('`[typeof null, typeof NaN, typeof []]` evaluates to:',
        [['["object", "number", "object"]', true],
          ['["null", "NaN", "array"]', false],
          ['["object", "NaN", "array"]', false],
          ['["null", "number", "object"]', false]],
        'typeof null is "object" (a historical bug), NaN is a number value, and arrays are objects — use Array.isArray to detect them.'),
      mcq('`["1", "2", "3"].map(parseInt)` evaluates to:',
        [['[1, NaN, NaN]', true], ['[1, 2, 3]', false], ['[NaN, NaN, NaN]', false], ['[1, 2, NaN]', false]],
        'map calls parseInt(value, index). Radix 0 means "default" so "1" → 1; radix 1 is invalid → NaN; "3" is not a digit in base 2 → NaN.'),
      mcq('`:where(#hero) p { color: grey }` and `p.lead { color: black }` both match `<p class="lead">` inside `#hero`. Which wins?',
        [['p.lead — :where() adds zero specificity', true],
          [':where(#hero) p — the ID inside it counts', false],
          ['Whichever comes first in the stylesheet', false]],
        ':where(#hero) p is (0,0,1), because :where() always counts zero; p.lead is (0,1,1). That is why libraries use :where() for defaults that users can override easily.'),
      mcq('`Promise.all([p1, p2])` — p1 resolves after 500 ms; p2 rejects after 100 ms. What happens?',
        [['It rejects at about 100 ms with p2\'s reason', true],
          ['It rejects at about 500 ms, once both settle', false],
          ['It resolves at 500 ms with [p1\'s value, undefined]', false],
          ['It never settles because one of them failed', false]],
        'Promise.all rejects as soon as any input rejects. p1 still finishes later, but its result is ignored. Use allSettled to wait for both.'),
      mcq('`const [rows, setRows] = useState(buildIndex(data));` — buildIndex takes 200 ms. What is the problem?',
        [['buildIndex runs on every render, though only the first result is used', true],
          ['useState cannot accept the return value of a function call', false],
          ['The state is rebuilt from data each time data changes', false],
          ['buildIndex only runs after the first paint, causing a flash', false]],
        'The argument is evaluated every render even though useState ignores it after mount. useState(() => buildIndex(data)) is lazy initialisation: the function runs once.'),
      mcq('A button\'s handler runs only `renders.current++` (a useRef) and the JSX shows `{renders.current}`. What happens on screen after three clicks?',
        [['It stays the same until something else re-renders', true],
          ['It shows 3, updating on each click', false],
          ['It shows 6, because StrictMode counts twice', false],
          ['React throws: refs cannot be rendered', false]],
        'Mutating ref.current does not schedule a render. The stored number is 3, but the screen only catches up when state or props change elsewhere — a reason never to render from a ref.'),
    ],
  },

  /* ── MOCK ────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_MOCK',
    notes: `## The round: front-end technical, 35 minutes

Run this with a friend playing the interviewer, or record yourself answering. The interviewer reads
the script; the scoring notes are for the interviewer only.

### Opening (3 min)

*"Tell me about the front end of a project you built. What does the user see first, and where does
that data come from?"*

- **Strong:** names the components and where state lives, the API calls behind the first screen,
  one decision they would change.
- **OK:** describes screens accurately but not where state lives.
- **Weak:** lists technologies ("React, Redux, Bootstrap") with no structure.

### Q1 — CSS (3 min)

*"A dropdown inside a card is clipped and appears under the next card. Walk me through it."*

- **Strong:** checks \`overflow: hidden\` on the card (clipping) and stacking contexts from
  \`transform\`/\`z-index\` (layering); fixes with a portal or by removing the context.
- **Weak:** "z-index: 9999".

### Q2 — closures (4 min)

*"What does \`for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))\` print? Fix it two
ways."* Follow-up: *"Why does let fix it?"*

- **Strong:** 3 3 3; \`let\` or an IIFE; per-iteration binding.
- **OK:** right output and fix, vague on why.

### Q3 — this (4 min)

*"A class method passed as \`onClick\` to a plain DOM button logs the wrong \`this\`. Why, and what are
your options?"*

- **Strong:** detached call; \`addEventListener\` sets \`this\` to the element; fix with \`bind\` in the
  constructor, an arrow class field or an arrow wrapper — and names the trade-off (arrow fields are
  per instance, not on the prototype).

### Q4 — event loop (4 min)

Give them: \`console.log(1); setTimeout(() => console.log(2)); Promise.resolve().then(() =>
console.log(3)); console.log(4);\` — *"Order, and why?"*

- **Strong:** 1 4 3 2, explains task vs microtask and that microtasks drain fully first.
- **Weak:** "setTimeout 0 runs immediately".

### Q5 — React rendering (5 min)

*"A list of 500 rows is slow when typing in a filter box above it. What do you check first?"*

- **Strong:** profiles first; checks whether the rows re-render on every keystroke, whether the row
  is memoised and receives stable props, and whether the filtering itself is expensive
  (\`useMemo\`), then considers \`useDeferredValue\` or virtualisation.
- **OK:** "wrap it in React.memo" without checking props stability.
- **Weak:** "use Redux".

### Q6 — effects (4 min)

*"A profile page shows the wrong user when you click quickly between users. Why?"*

- **Strong:** out-of-order responses; cleanup with an ignore flag or AbortController.
- **Follow-up:** *"Why does it fetch twice in dev?"* — StrictMode re-mount.

### Q7 — state design (3 min)

*"Where would you keep: the logged-in user, a form's field values, the current filter in a list,
the server data for that list?"*

- **Strong:** user in context or a store; form fields local (or a form library); filter in the URL
  so it survives refresh and can be shared; server data in a query cache or a store slice, not
  copied into many components.

### Whiteboard task (8 min)

*"Write \`debounce(fn, ms)\`. Then use it for a search box in React."*

- **Strong:** timer in the closure, \`clearTimeout\` then \`setTimeout\`, preserves args; in React creates
  the debounced function once (\`useMemo\`/\`useRef\`) and cancels on unmount.
- **OK:** correct debounce, recreated every render in React.
- **Weak:** timer variable declared inside the returned function.

### Scoring

Hire signal = strong on at least five of the eight, with no weak on Q4, Q6 or the whiteboard —
those three are the ones that predict real bugs.`,
    mcqs: [
      mcq('In the whiteboard task a candidate writes `function debounce(fn, ms) { return (...args) => { let t; clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }`. Typing five letters quickly does what?',
        [['Calls fn five times, as no earlier timer is ever cleared', true],
          ['Calls fn once with the last letter, as debounce should', false],
          ['Calls fn once with the first letter, then ignores the rest', false],
          ['Throws, since clearTimeout is given an undefined timer id', false]],
        't is declared inside the returned function, so each call has its own empty t and clearTimeout(undefined) is a harmless no-op. Every call keeps its timer; the variable must live in the outer closure.'),
      mcq('A candidate says "`Object.freeze(config)` makes config immutable". With `const config = Object.freeze({ api: { url: "/v1" } })`, what does `config.api.url = "/v2"` do?',
        [['It succeeds; freeze is shallow, so the nested object stays writable', true],
          ['It fails silently in sloppy mode and throws in strict mode', false],
          ['It throws a TypeError in every mode, as config is frozen', false],
          ['It succeeds, but the change is reverted at the next read', false]],
        'Only config\'s own properties are frozen; config.api is a separate, unfrozen object. A deep freeze must walk the tree. Writing config.api = {} would be the one that fails.'),
      mcq('With React 18 and `createRoot`, a click handler runs `fetchData().then(d => { setLoading(false); setData(d); })`. How many renders do the two updates cause?',
        [['One, because React 18 batches updates inside promises too', true],
          ['Two, because updates are only batched in React event handlers', false],
          ['Two in development, because StrictMode splits the batch', false],
          ['None until flushSync is called to commit the updates', false]],
        'React 17 batched only inside its own event handlers, so this gave two renders. React 18 with createRoot batches automatically everywhere, including promises and timeouts.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_FRONTEND_CHECKPOINT',
    notes: `Ten questions across the front-end interview: CSS layout and specificity, accessible
HTML, \`this\`, coercion, the event loop, copying, keys and effects. Each is the kind of snippet an
interviewer puts on the screen. Work each one out before you look at the options, and if you get
one wrong, go back to the question set it came from — the follow-up in the interview will be
harder than this.`,
    checkpoint: [
      ck('CSS', 'A toolbar button matches `button.primary:hover { background: green }` and `#toolbar button { background: grey }`. Hovering it shows:',
        [['grey, because (1,0,1) beats (0,2,1)', true],
          ['green, because :hover always wins on hover', false],
          ['green, because it has more selectors in it', false],
          ['grey only if its rule comes later in the file', false]],
        '#toolbar button has one ID, so it outranks button.primary:hover with its class and pseudo-class (0,2,1). Pseudo-classes add specificity like a class; they get no special priority.'),
      ck('HTML', 'A form has `<label>Email</label><input id="email" type="email">`. Clicking "Email" does not focus the field and a screen reader announces the input as unlabelled. What fixes it?',
        [['Add for="email" to the label, or wrap the input in it', true],
          ['Add placeholder="Email" to the input as its label', false],
          ['Add aria-hidden="true" to the label to avoid repeats', false],
          ['Put the label and the input inside the same div element', false]],
        'A label is associated only by for/id or by containing the input. A placeholder disappears on typing and is not a reliable accessible name; being siblings in a div links nothing.'),
      ck('JS_ES6', '`class Counter { count = 0; inc() { this.count++; } } const c = new Counter(); button.addEventListener("click", c.inc);` — after one click:',
        [['c.count is 0; this is the button, so button.count is NaN', true],
          ['c.count is 1, because inc is a method of the Counter class', false],
          ['A TypeError, as this is undefined inside a strict class', false],
          ['c.count is 1, but only from the second click onwards', false]],
        'addEventListener calls the handler with this set to the element. undefined++ on the button gives NaN; c is never touched. An arrow class field or c.inc.bind(c) fixes it.'),
      ck('JS_BASICS', 'What do `[] == false`, `null == 0` and `null == undefined` evaluate to, in that order?',
        [['true, false, true', true], ['false, false, true', false], ['true, true, true', false], ['false, true, false', false]],
        '[] becomes "" then 0, and false becomes 0, so the first is true. null is == only to undefined (and itself), so null == 0 is false and null == undefined is true.'),
      ck('JS_ASYNC', '`setTimeout(() => { console.log(1); queueMicrotask(() => console.log(2)); }, 0); setTimeout(() => console.log(3), 0);` — the output is:',
        [['1 2 3', true], ['1 3 2', false], ['3 1 2', false], ['2 1 3', false]],
        'After each task the microtask queue is drained before the next task. The microtask queued in the first timer runs before the second timer, in browsers and in Node 11+.'),
      ck('JS_BASICS', '`JSON.parse(JSON.stringify({ when: new Date(0), cb: () => 1, n: undefined }))` returns:',
        [['{ when: "1970-01-01T00:00:00.000Z" }', true],
          ['{ when: Date(0), cb: () => 1, n: undefined }', false],
          ['{ when: 0, cb: null, n: null }', false],
          ['{ when: "1970-01-01T00:00:00.000Z", n: null }', false]],
        'JSON has no Date, so toJSON turns it into an ISO string that stays a string. Functions and undefined values are dropped from objects. structuredClone keeps the Date but throws on the function.'),
      ck('REACT_COMPONENTS', 'A table renders rows with `key={Math.random()}`. Each row has an input. What does the user notice?',
        [['Typing loses focus, as every render remounts each row', true],
          ['Nothing; random keys are unique, which is all React needs', false],
          ['Rows keep state but sorting puts them in a random order', false],
          ['React shows a duplicate-key warning on every render', false]],
        'A key must be stable as well as unique. A fresh random key every render tells React each row is new, so it unmounts the old rows, loses their state and DOM, and mounts new ones.'),
      ck('REACT_HOOKS', '`useEffect(() => { console.log("run", id); return () => console.log("clean", id); }, [id]);` — id changes from 1 to 2. What is logged?',
        [['clean 1, then run 2', true], ['run 2, then clean 1', false], ['clean 2, then run 2', false], ['run 2 only', false]],
        'Before re-running, React runs the previous effect\'s cleanup, which closed over id = 1. Then the new effect runs with id = 2. Cleanup always sees the values of the render that created it.'),
      ck('REACT_HOOKS', 'Which of these is the strongest case for useMemo?',
        [['Sorting 10,000 rows passed to a memoised table', true],
          ['Joining firstName and lastName for a heading', false],
          ['Doubling a count before showing it in a badge', false],
          ['Building a <span> element that wraps a static text label', false]],
        'useMemo pays off when the work is expensive or a stable identity is compared by a memoised child. The other three are cheaper than the memo bookkeeping itself.'),
      ck('CSS', 'A product gallery must fit as many 220px-minimum cards per row as the screen allows, with columns lining up across rows. Which is the right tool?',
        [['grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))', true],
          ['display: flex with flex-wrap: wrap and flex: 1 1 220px', false],
          ['display: inline-block cards at width: 220px each', false],
          ['float: left on each card with width: 220px set', false]],
        'Grid aligns rows and columns together. Wrapped flex items stretch per row, so a short last row has wider cards and columns do not line up; floats and inline-block do not fill the width.'),
    ],
  },
];
