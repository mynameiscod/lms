/**
 * T_JS_DOM — the complete topic, twelve units. DIRECTION: WEB_DEVELOPMENT.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * The largest remaining block of direction inventory, and the last piece of the web track
 * after HTML and CSS. Ten DIRECTION concepts, a DEBUG, a PRACTICE and a PROJECT.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * JavaScript for beginners usually becomes a framework tutorial, which produces students who
 * can assemble components and cannot say what happens when a value is undefined. This is the
 * language and the DOM, without a framework, because a framework is only learnable once you
 * know what it is doing for you.
 *
 * It also deliberately repeats nothing from T_CONDITIONS and T_FUNCTIONS. A student arrives
 * here already able to write a loop and a function; what is new is the values, the page, and
 * the fact that things happen later.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const JS_DOM_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_JS_DOM_JS_IN_A_PAGE',
    notes: `JavaScript runs in the browser, in the page. Where you put the script changes when it
runs, and that changes whether it works.

    <script src="app.js"></script>
    <script>console.log("inline");</script>

**The problem with a script in the \`<head>\`.** The browser parses HTML top to bottom. A script
in the head runs **before the body exists**, so anything looking for an element finds nothing:

    document.querySelector('.total')     // null — the element is not parsed yet

Then \`Cannot set properties of null\`, which is the single most common first JavaScript error.

**Three solutions:**

    <script src="app.js"></script>            <!-- at the END of body: elements exist -->
    <script src="app.js" defer></script>      <!-- in head: downloads early, runs after parsing -->
    <script src="app.js" async></script>      <!-- runs as soon as it downloads — order NOT guaranteed -->

**Use \`defer\`.** It downloads in parallel with parsing, runs after the document is ready, and
preserves the order of multiple scripts. \`async\` is for independent things like analytics,
where order does not matter; using it for application code produces failures that depend on
network timing and are therefore intermittent.

**JavaScript is single-threaded.** One thing at a time. A long loop freezes the page — clicks
do not register, nothing renders — because the same thread that runs your code also handles
the interface. That fact underlies everything in the async unit later.

**The console is where you work.** \`console.log()\` prints; the console shows errors with the
file and line. Open it before you start, not after something breaks.

**JavaScript is not Java.** The name was marketing. They are unrelated languages.`,
    mcqs: [
      mcq('A script in the head gives "Cannot set properties of null". Why?',
        [['It ran before the body was parsed, so the element did not exist yet', true],
          ['The selector is wrong', false],
          ['The file failed to load', false],
          ['A syntax error', false]],
        'Could also be a wrong selector, but with a head script this ordering is the first thing to check.'),
      mcq('Which attribute should application code use?',
        [['defer — runs after parsing and preserves script order', true],
          ['async', false], ['neither', false], ['both', false]],
        'async does not guarantee order, so failures depend on network timing and appear intermittently.'),
      mcq('A long loop freezes the page because:',
        [['JavaScript is single-threaded and shares that thread with the interface', true],
          ['The browser throttles it', false],
          ['Memory runs out', false],
          ['It does not freeze', false]],
        'One thread for your code and for rendering, which is the fact everything about async rests on.'),
      mcq('`async` is appropriate for:',
        [['Independent scripts such as analytics, where order does not matter', true],
          ['All application code', false],
          ['Scripts in the body', false],
          ['Nothing', false]],
        'Order independence is the whole criterion, and application code rarely has it.'),
    ],
    checkpoint: [
      mcq('Placing a script at the end of the body works because:',
        [['Everything above it has been parsed, so the elements exist', true],
          ['It loads faster', false],
          ['The browser waits for it', false],
          ['It runs asynchronously', false]],
        'The oldest fix and still correct; defer achieves the same without moving the tag.'),
      mcq('JavaScript and Java are related how?',
        [['Not at all — the name was marketing', true],
          ['JavaScript compiles to Java', false],
          ['They share a runtime', false],
          ['JavaScript is a subset', false]],
        'Worth stating plainly, because the assumption produces genuinely confused expectations about types and classes.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_VALUES_AND_VARIABLES',
    notes: `You can already write variables and conditions. What is new here is JavaScript's
particular set of values and its two ways of declaring things — plus one behaviour that causes
more bugs than anything else in the language.

**Declarations:**

    const total = 100;      // cannot be reassigned
    let count = 0;          // can be reassigned
    var old = 1;            // legacy — do not use

**Default to \`const\`.** Reach for \`let\` only when you know the value will change. This is not
style: a \`const\` tells the reader "this will not change underneath you", which is one fewer
thing to track.

**\`const\` prevents REASSIGNMENT, not mutation:**

    const list = [1, 2];
    list.push(3);       // fine — the array changed, the binding did not
    list = [4];         // TypeError

**The types:**

- \`number\` — one numeric type; no separate integer
- \`string\`
- \`boolean\`
- \`undefined\` — declared, never assigned
- \`null\` — deliberately empty
- \`object\` — including arrays and functions

**\`undefined\` versus \`null\`.** \`undefined\` is "nobody set this"; \`null\` is "somebody set this to
nothing". Both are falsy, and they are not equal under \`===\`.

**Now the behaviour to be careful of: \`==\` coerces types.**

    "5" == 5        // true
    0 == false      // true
    null == undefined   // true
    "" == 0         // true

These conversions follow rules almost nobody remembers correctly, and they produce comparisons
that are true when they should not be.

**Always use \`===\` and \`!==\`.** They compare without converting, so \`"5" === 5\` is false, which
is what you meant. There is no case in ordinary code where \`==\` is the better choice.

**Template literals** for building strings, rather than concatenation:

    \`Hello, \${name}. You have \${count} messages.\`

**\`typeof null\` returns \`"object"\`.** It is a bug from 1995 that cannot be fixed without
breaking the web. Check for null with \`=== null\`.`,
    mcqs: [
      mcq('`const list = [1,2]; list.push(3);` does what?',
        [['Works — const prevents reassignment, not mutation', true],
          ['Throws a TypeError', false],
          ['Silently fails', false],
          ['Creates a new array', false]],
        'The binding cannot point somewhere else; the thing it points at can still change.'),
      mcq('Why prefer `===` over `==`?',
        [['`==` converts types first, making comparisons true that should not be', true],
          ['`===` is faster', false],
          ['`==` is deprecated', false],
          ['No real difference', false]],
        '"5" == 5 and 0 == false are both true. The rules exist and almost nobody recalls them correctly.'),
      mcq('`undefined` and `null` differ how?',
        [['undefined means nobody set it; null means somebody set it to nothing', true],
          ['They are identical', false],
          ['null is an error', false],
          ['undefined is only for functions', false]],
        'Both falsy, not equal under ===, and the distinction matters when deciding whether a value was omitted or cleared.'),
      mcq('`typeof null` returns "object" because:',
        [['It is a 1995 bug that cannot be fixed without breaking the web', true],
          ['null is an object', false],
          ['It returns "null"', false],
          ['Of type coercion', false]],
        'Check with === null. Worth knowing so the output does not send you looking for a mistake of your own.'),
    ],
    checkpoint: [
      mcq('Which declaration should be the default?',
        [['const, with let only where reassignment is known to be needed', true],
          ['let everywhere', false], ['var', false], ['No declaration', false]],
        'It tells the reader the value will not change underneath them, which is one fewer thing to track.'),
      mcq('`"" == 0` evaluates to:',
        [['true — both are coerced before comparison', true],
          ['false', false], ['an error', false], ['undefined', false]],
        'Exactly the class of surprise that makes === the right default in all ordinary code.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_FUNCTIONS',
    notes: `You already know what a function is. JavaScript gives you three ways to write one, and
the differences are small but real.

    function add(a, b) { return a + b; }          // declaration
    const add = function (a, b) { return a + b; }; // expression
    const add = (a, b) => a + b;                   // arrow

**Arrow functions** are the modern default for short functions. With a single expression the
\`return\` is implicit. With a block, it is not:

    const double = n => n * 2;                     // returns n * 2
    const double = n => { n * 2; };                // returns undefined — a classic slip

**Hoisting.** A \`function\` declaration can be called before it appears in the file; the other
two cannot, because the variable does not exist yet. In practice: define before use, and the
distinction stops mattering.

**Functions are values.** They can be stored, passed and returned — which is what makes
callbacks work and is the basis of everything in the events unit:

    button.addEventListener('click', handleClick);   // passing the function
    button.addEventListener('click', handleClick()); // WRONG — calls it now, passes the result

That second line is an extremely common mistake: the handler runs immediately at page load and
\`undefined\` is registered as the listener. Nothing errors.

**Default parameters and rest:**

    function greet(name, greeting = 'Hello') { ... }
    function sum(...numbers) { ... }

**Array methods that take functions** are how most JavaScript data work is written:

    const doubled = nums.map(n => n * 2);
    const evens   = nums.filter(n => n % 2 === 0);
    const total   = nums.reduce((acc, n) => acc + n, 0);
    nums.forEach(n => console.log(n));

\`map\` returns a new array; \`forEach\` returns nothing and exists for side effects. **Using
\`map\` and discarding the result is a sign you meant \`forEach\`.**

**Arrows and \`this\`.** An arrow function does not have its own \`this\` — it uses the surrounding
scope's. That is usually what you want inside a callback, and it is the main practical reason
arrows took over.`,
    mcqs: [
      mcq('`const double = n => { n * 2; };` returns:',
        [['undefined — a block body needs an explicit return', true],
          ['n * 2', false], ['A function', false], ['An error', false]],
        'The implicit return applies only to the expression form. Adding braces silently changes the meaning.'),
      mcq('`addEventListener(\'click\', handleClick())` is wrong because:',
        [['It calls the function now and registers its return value as the listener', true],
          ['Handlers need parentheses', false],
          ['It registers twice', false],
          ['It is not wrong', false]],
        'The handler runs at page load and undefined becomes the listener, with no error at all.'),
      mcq('`map` differs from `forEach` how?',
        [['map returns a new array; forEach returns nothing and exists for side effects', true],
          ['map is faster', false],
          ['forEach can break early', false],
          ['They are identical', false]],
        'Using map and discarding the result is a reliable sign you meant forEach.'),
      mcq('An arrow function\'s `this` comes from:',
        [['The surrounding scope — it has none of its own', true],
          ['The calling object', false],
          ['The global object', false],
          ['Its first argument', false]],
        'Usually what you want inside a callback, and the main practical reason arrows took over.'),
    ],
    checkpoint: [
      mcq('Which produces a new array of transformed values?',
        [['map', true], ['forEach', false], ['filter', false], ['reduce', false]],
        'filter selects without transforming; reduce collapses to one value; forEach returns nothing.'),
      mcq('Why can a `function` declaration be called before it appears?',
        [['Declarations are hoisted; const and let bindings are not', true],
          ['All functions are hoisted', false],
          ['The browser reorders code', false],
          ['It cannot be', false]],
        'Defining before use makes the distinction stop mattering, which is the practical advice.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_ARRAYS_AND_OBJECTS',
    notes: `Almost all JavaScript data is arrays, objects, or both nested.

**Arrays** — ordered, indexed from zero, same as any array you have met:

    const marks = [82, 74, 91];
    marks.length;  marks.push(60);  marks[0];

**Objects** — named properties:

    const student = { name: 'Asha', year: 1, marks: [82, 74] };
    student.name;        // dot notation
    student['name'];     // bracket, for dynamic keys

**Nesting is the normal shape**, and it is what JSON from an API looks like:

    const data = {
      students: [
        { name: 'Asha', marks: [82, 74] },
        { name: 'Ravi', marks: [65] },
      ],
    };
    data.students[0].marks[1];    // 74

**The commonest runtime error in JavaScript** comes from reaching into something that is not
there:

    data.teacher.name     // TypeError: Cannot read properties of undefined

\`data.teacher\` is \`undefined\`, and reading \`.name\` of undefined throws. **Optional chaining**
handles it:

    data.teacher?.name           // undefined, no error
    data.teacher?.name ?? 'TBC'  // with a fallback

\`??\` is nullish coalescing — it falls back only for \`null\` and \`undefined\`, unlike \`||\` which
also falls back for \`0\` and \`""\`. That difference matters: \`count || 10\` turns a legitimate
zero into ten, and \`count ?? 10\` does not.

**Objects and arrays are copied by REFERENCE:**

    const a = { x: 1 };
    const b = a;
    b.x = 2;
    console.log(a.x);   // 2 — one object, two names

To copy: \`{ ...a }\` or \`[...arr]\`. Note this is **shallow** — nested objects are still shared.

**Destructuring** is used constantly:

    const { name, year } = student;
    const [first, second] = marks;
    function show({ name, year }) { ... }

**Iterating an object:**

    Object.keys(obj); Object.values(obj); Object.entries(obj);`,
    mcqs: [
      mcq('`data.teacher.name` throws "Cannot read properties of undefined". What is undefined?',
        [['`data.teacher` — reading `.name` of it is the error', true],
          ['`data`', false], ['`name`', false], ['The whole expression', false]],
        'Reading the error precisely identifies which link is missing, which is what optional chaining then guards.'),
      mcq('`count ?? 10` differs from `count || 10` when count is:',
        [['0 — `??` keeps it, `||` replaces it with 10', true],
          ['null', false], ['undefined', false], ['They never differ', false]],
        '`||` falls back for any falsy value, which silently destroys legitimate zeros and empty strings.'),
      mcq('`const b = a` where a is an object, then `b.x = 2`. What is `a.x`?',
        [['2 — both names refer to one object', true],
          ['1', false], ['undefined', false], ['An error', false]],
        'Assignment binds a name; it does not copy. `{ ...a }` copies, and only shallowly.'),
      mcq('`{ ...a }` produces:',
        [['A shallow copy — nested objects are still shared', true],
          ['A deep copy', false],
          ['A reference', false],
          ['An error', false]],
        'Sufficient for flat data and a source of surprise the moment the object has objects inside it.'),
    ],
    checkpoint: [
      mcq('Which safely reads a possibly-missing nested value with a fallback?',
        [['`data.teacher?.name ?? "TBC"`', true],
          ['`data.teacher.name || "TBC"`', false],
          ['`data["teacher"]["name"]`', false],
          ['`data.teacher.name ?? "TBC"`', false]],
        'The others all throw before any fallback is reached, because the property access happens first.'),
      mcq('`Object.entries(obj)` gives you:',
        [['An array of key/value pairs', true],
          ['Just the keys', false], ['Just the values', false], ['A string', false]],
        'Which is what makes an object iterable with the array methods you already know.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_SELECTING_ELEMENTS',
    notes: `The DOM is the browser's live object representation of the page. Selecting is how you
reach the part you want to work with.

    document.querySelector('.total');       // FIRST match, or null
    document.querySelectorAll('.item');     // ALL matches, possibly empty

**They take CSS selectors** — everything from the CSS topic works here, which is why that topic
comes first.

    document.querySelector('#main');
    document.querySelector('.card > p');
    document.querySelector('input[type="email"]');

**\`querySelector\` returns \`null\` when nothing matches**, and \`null.textContent\` throws. So
either guard, or be certain:

    const el = document.querySelector('.total');
    if (el) el.textContent = '42';

**\`querySelectorAll\` returns a NodeList, not an array.** It has \`forEach\` and a \`length\`, and
it does NOT have \`map\` or \`filter\`. Convert when you need them:

    [...document.querySelectorAll('.item')].map(el => el.textContent);

**A NodeList from \`querySelectorAll\` is static** — a snapshot. Elements added afterwards are not
in it. \`getElementsByClassName\` returns a *live* collection that does update, which sounds
useful and causes genuinely confusing bugs when you modify the page while looping over it.
Prefer \`querySelectorAll\`.

**Searching within an element** rather than the whole document:

    const card = document.querySelector('.card');
    const title = card.querySelector('h2');       // only inside this card

This matters as soon as there is more than one card, and reaching for \`document\` inside a
component is a common source of "it always updates the first one".

**Cache what you use repeatedly.** Selecting inside a loop searches the document every
iteration:

    const list = document.querySelector('.list');   // once
    items.forEach(item => list.appendChild(render(item)));

**When a selector returns null and you are sure it should not:** check the script ran after the
element existed, check the spelling, and check you are not looking inside the wrong parent.
Those three cover nearly every case.`,
    mcqs: [
      mcq('`querySelector` finds nothing. It returns:',
        [['null — and reading a property of it throws', true],
          ['An empty array', false], ['undefined', false], ['An error', false]],
        'Which is why the guard, or certainty about the element existing, is required before using the result.'),
      mcq('`querySelectorAll(...).map(...)` fails because:',
        [['A NodeList is not an array and has no map', true],
          ['map needs an argument', false],
          ['The selector is wrong', false],
          ['It does not fail', false]],
        'It does have forEach, which is why the absence of map surprises people. Spread it into an array first.'),
      mcq('Why prefer `querySelectorAll` over `getElementsByClassName`?',
        [['It returns a static snapshot rather than a live collection that changes while you loop', true],
          ['It is faster', false],
          ['It supports more selectors only', false],
          ['No reason', false]],
        'A live collection updating mid-loop produces genuinely confusing bugs, especially when adding elements.'),
      mcq('`card.querySelector("h2")` differs from `document.querySelector("h2")` how?',
        [['It searches only inside that card', true],
          ['It is faster only', false],
          ['It returns all matches', false],
          ['No difference', false]],
        'Reaching for document inside a component is the usual cause of "it always updates the first one".'),
    ],
    checkpoint: [
      mcq('A selector returns null and you are certain the element exists. Check:',
        [['Whether the script ran before the element was parsed', true],
          ['The CSS file', false],
          ['The network tab', false],
          ['The element size', false]],
        'That plus spelling and the wrong parent cover nearly every case.'),
      mcq('Why cache a selector result outside a loop?',
        [['Selecting inside the loop searches the whole document every iteration', true],
          ['It avoids null', false],
          ['It is required', false],
          ['To keep it live', false]],
        'Correctness is unaffected; on a large page the cost is real and it is free to avoid.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_CHANGING_THE_DOM',
    notes: `Once you have an element you can change what it shows, what it is, and what it
contains.

**Text:**

    el.textContent = 'Hello';     // plain text — safe
    el.innerHTML = '<b>Hi</b>';   // parsed as HTML — dangerous with untrusted input

**\`innerHTML\` with user input is an XSS vulnerability.** If a value came from a user, a URL or
an API, put it in with \`textContent\`. A comment containing \`<script>\` becomes executable code
on your page otherwise, and this is one of the oldest and most exploited web vulnerabilities.

**Use \`textContent\` by default and \`innerHTML\` only for markup you wrote yourself.**

**Attributes and properties:**

    el.setAttribute('data-id', '5');
    el.getAttribute('data-id');
    el.value          // form field value — a property, not an attribute
    el.disabled = true;

**Classes** — the right way to change appearance, because it keeps the styling in CSS:

    el.classList.add('active');
    el.classList.remove('hidden');
    el.classList.toggle('open');
    el.classList.contains('active');

**Prefer a class over setting styles directly.** \`el.style.color = 'red'\` writes an inline style,
which is the highest-specificity thing in CSS and therefore the hardest to override later — the
same argument as the CSS topic made, arriving from the JavaScript side.

**Creating and inserting:**

    const li = document.createElement('li');
    li.textContent = item.name;
    list.appendChild(li);

**Building a list in a loop touches the DOM repeatedly**, and each touch can cause layout work.
For a handful of items it does not matter. For hundreds, build the HTML or a fragment first and
insert once:

    const frag = document.createDocumentFragment();
    items.forEach(i => { const li = document.createElement('li'); li.textContent = i; frag.appendChild(li); });
    list.appendChild(frag);      // one insertion

**Removing:** \`el.remove()\`.

**The DOM is the source of truth for what is displayed, and it should not be the source of truth
for your data.** Keep your data in variables and re-render from it. Reading state back out of the
DOM — parsing a number out of \`textContent\` — works and becomes unmaintainable quickly.`,
    mcqs: [
      mcq('Why is `innerHTML` dangerous with user input?',
        [['The content is parsed as HTML, so a script tag in it executes — an XSS vulnerability', true],
          ['It is slower', false],
          ['It removes event listeners', false],
          ['It is not dangerous', false]],
        'One of the oldest and most exploited web vulnerabilities, and textContent avoids it entirely.'),
      mcq('Why prefer `classList.add` over setting `el.style` directly?',
        [['An inline style is the highest specificity and hardest to override later', true],
          ['classList is faster', false],
          ['style does not work', false],
          ['No difference', false]],
        'The same argument the CSS topic made about inline styles, arriving from the JavaScript side.'),
      mcq('Inserting a hundred elements one at a time is slow because:',
        [['Each insertion can trigger layout work', true],
          ['createElement is slow', false],
          ['The array is large', false],
          ['It is not slow', false]],
        'A document fragment collects them and inserts once. For a handful of items none of this matters.'),
      mcq('Reading application state back out of the DOM is:',
        [['Workable and quickly unmaintainable — keep data in variables and re-render', true],
          ['The standard approach', false],
          ['Impossible', false],
          ['Faster', false]],
        'The DOM should be what is displayed, not where your data lives.'),
    ],
    checkpoint: [
      mcq('A comment from a user is displayed with `innerHTML`. What is the risk?',
        [['A script tag in the comment executes on your page', true],
          ['The layout breaks', false],
          ['It renders slowly', false],
          ['Nothing', false]],
        'And it runs with your page\'s privileges, which is why it can steal session cookies.'),
      mcq('`el.value` versus `el.getAttribute("value")` on an input:',
        [['`el.value` is the current value; the attribute is the initial one from the HTML', true],
          ['They are identical', false],
          ['The attribute is current', false],
          ['value does not exist', false]],
        'A recurring confusion when reading a field the user has typed into.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_EVENTS',
    notes: `Events are how a page responds to what somebody does. This is the point at which a page
becomes interactive.

    button.addEventListener('click', (event) => {
      console.log('clicked');
    });

**The events you will use:** \`click\`, \`input\` (fires as the user types), \`change\` (fires when
they finish), \`submit\` on a form, \`keydown\`, \`focus\` and \`blur\`.

**The event object** is passed to your handler and carries:

- \`event.target\` — the element the event actually happened on
- \`event.preventDefault()\` — stop the browser's default behaviour
- \`event.stopPropagation()\` — stop it bubbling to ancestors

**\`preventDefault\` on a form submit** is the one you will need immediately. Without it the
browser reloads the page and your JavaScript never gets to run:

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // now handle it yourself
    });

**Bubbling.** An event fires on the target and then travels up through its ancestors. A click on
a button inside a card fires on the button, then the card, then the body. This sounds academic
and enables the most useful pattern in the topic.

**Event delegation.** Instead of a listener per item, put one on the container:

    list.addEventListener('click', (e) => {
      const item = e.target.closest('.item');
      if (!item) return;
      handle(item.dataset.id);
    });

**Why this is better**, and it is not only about performance:

- One listener instead of hundreds
- **It works for elements added later**, which listeners attached individually do not

That second point is the real reason. Attach a listener to each button, then add a new button
from code, and the new one is dead. Delegation has no such problem, and "the new rows do not
respond to clicks" is a very common bug with exactly this cause.

**\`e.target\` versus \`e.currentTarget\`.** \`target\` is what was actually clicked — possibly an
icon inside the button. \`currentTarget\` is the element the listener is on. Use \`closest()\` to
get from one to the other reliably.

**Removing a listener** needs the same function reference, which is why an inline arrow cannot
be removed. Keep a named reference if you will need to detach it.`,
    mcqs: [
      mcq('A form submit reloads the page and your handler seems not to run. What is missing?',
        [['`event.preventDefault()`', true],
          ['An event listener', false],
          ['A submit button', false],
          ['A form action', false]],
        'The handler usually did run — the reload then discarded everything it did.'),
      mcq('Why does event delegation matter beyond performance?',
        [['It works for elements added to the page later', true],
          ['It is easier to type', false],
          ['It prevents bubbling', false],
          ['It is more secure', false]],
        'Individually attached listeners leave new rows dead, which is a very common bug with exactly this cause.'),
      mcq('`e.target` versus `e.currentTarget`:',
        [['target is what was actually clicked; currentTarget is where the listener is', true],
          ['They are the same', false],
          ['target is the parent', false],
          ['currentTarget is the document', false]],
        'Clicking an icon inside a button makes the icon the target, which is why closest() is used to walk back up.'),
      mcq('Why can an inline arrow function listener not be removed?',
        [['removeEventListener needs the same function reference, and a new arrow is a different one', true],
          ['Arrows cannot be listeners', false],
          ['It can be removed', false],
          ['Only named functions bubble', false]],
        'Keep a named reference when you know you will need to detach it.'),
    ],
    checkpoint: [
      mcq('Rows added after page load do not respond to clicks. The likely cause:',
        [['Listeners were attached individually before those rows existed', true],
          ['The rows lack ids', false],
          ['A CSS problem', false],
          ['preventDefault was called', false]],
        'Delegation on the container fixes it permanently, because the listener is on something that already exists.'),
      mcq('`input` versus `change` on a text field:',
        [['input fires as the user types; change fires when they finish', true],
          ['They are identical', false],
          ['change fires per keystroke', false],
          ['input only fires once', false]],
        'Live validation wants input; an expensive lookup usually wants change.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_FORM_HANDLING',
    notes: `Forms are where a page takes input, and where most of the care in front-end work
actually goes.

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      ...
    });

**Always \`.trim()\`.** A trailing space is invisible and compares unequal, and users paste with
whitespace constantly.

**Every value from a form is a string**, including a number input. \`Number(x)\` or \`parseInt(x, 10)\`
to convert, and check the result — \`Number("abc")\` is \`NaN\`, and \`NaN\` fails every comparison
including \`NaN === NaN\`. Use \`Number.isNaN()\`.

**Validate in this order:**

1. **Required** — is it present at all?
2. **Format** — does it look right?
3. **Range** — is it within bounds?
4. **Business rules** — is it acceptable here?

Stopping at the first failure per field gives one clear message rather than four.

**Show the error where the user can perceive it**, which means text, not only colour:

    function showError(input, message) {
      const el = document.querySelector(\`#\${input.id}-error\`);
      el.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', \`\${input.id}-error\`);
    }

**\`aria-describedby\` is what makes the error announced** to a screen reader when the field
receives focus. A red border tells only the people who perceive red — the same rule the CSS and
accessibility topics made, and forms are where it matters most.

**HTML validation attributes do work for free:**

    <input type="email" required minlength="8">

Use them. They give browser-native messages and keyboard behaviour. Then add JavaScript for
anything they cannot express, and remember that **both can be bypassed** — anybody can edit the
page or send the request directly.

**So client validation is for helpfulness, and server validation is for correctness.** Never
trust the client. Client-side checks exist to save a round trip and give immediate feedback; the
server is what actually protects the data.

**Do not disable the submit button until valid.** It is a common pattern and it leaves a user
staring at a dead button with no explanation of what is wrong. Let them submit, then tell them.`,
    mcqs: [
      mcq('Why `.trim()` every form value?',
        [['Trailing whitespace is invisible and compares unequal, and users paste it constantly', true],
          ['To save memory', false],
          ['It is required', false],
          ['To prevent XSS', false]],
        'An invisible cause of "my password is correct and it says it is wrong".'),
      mcq('A number input gives you:',
        [['A string, which must be converted and checked', true],
          ['A number', false], ['null if empty', false], ['NaN', false]],
        'Number("abc") is NaN and NaN fails every comparison including with itself, so Number.isNaN is the check.'),
      mcq('What makes a validation error announced to a screen reader?',
        [['Text in an element referenced by aria-describedby on the input', true],
          ['A red border', false],
          ['An alert()', false],
          ['The required attribute', false]],
        'Colour alone reaches only the people who perceive it, and forms are where that matters most.'),
      mcq('Client-side validation exists for:',
        [['Helpfulness — the server is what actually protects the data', true],
          ['Security', false],
          ['Both equally', false],
          ['Reducing server cost only', false]],
        'Anybody can edit the page or send the request directly, so client checks can never be the protection.'),
    ],
    checkpoint: [
      mcq('A submit handler that reads the values but never calls `preventDefault()` will:',
        [['Let the browser navigate away, discarding whatever the handler did', true],
          ['Run twice, once from the handler and once from the browser itself', false],
          ['Throw an error, because a submit handler must return a value', false],
          ['Work correctly, since the handler runs before the navigation', false]],
        'The default action is navigation, and it happens whether or not a handler ran. Anything the handler wrote to the page is gone before the user can read it.'),
      mcq('The right order to validate one field is:',
        [['Required, format, range, business rules — stopping at the first failure', true],
          ['All at once', false],
          ['Business rules first', false],
          ['Format then required', false]],
        'One clear message beats four, and later checks are usually meaningless if an earlier one failed.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_ASYNC_BASICS',
    notes: `Some things take time — fetching data, reading a file, waiting for a timer. JavaScript
is single-threaded, so it cannot simply wait: waiting would freeze the page.

**Instead, it starts the work and carries on**, running your code later when the result arrives.
Everything about async follows from that one sentence.

    console.log('1');
    setTimeout(() => console.log('2'), 0);
    console.log('3');

    // 1, 3, 2

Even with a zero delay, the callback runs after the current code finishes. It was queued rather
than executed.

**A promise represents a value that is not here yet.** It is pending, then either fulfilled or
rejected.

    fetch('/api/students')
      .then(response => response.json())
      .then(data => console.log(data))
      .catch(error => console.error(error));

**\`async\`/\`await\` is the same thing, written to read like ordinary code:**

    async function load() {
      try {
        const response = await fetch('/api/students');
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(error);
      }
    }

**\`await\` pauses that function** until the promise settles. It does not block the page — other
code continues running.

**Two traps, both extremely common.**

**1. \`fetch\` does not reject on a 404 or a 500.** It rejects only on a network failure. A 404 is
a *successful* HTTP exchange as far as fetch is concerned, so you must check \`response.ok\`
yourself. Forgetting to is why an app shows "undefined" instead of an error message.

**2. Forgetting \`await\` gives you the promise, not the value:**

    const data = fetch('/api/x');       // a Promise object
    data.students                        // undefined

Nothing errors. You get \`undefined\` downstream and the cause is several lines away.

**An async function always returns a promise**, so the caller must await it too.

**Parallel versus sequential:**

    const a = await fetchA();      // waits
    const b = await fetchB();      // then waits again

    const [a, b] = await Promise.all([fetchA(), fetchB()]);   // both at once

If the two do not depend on each other, \`Promise.all\` halves the wait, and this is one of the
easiest real performance wins available.`,
    mcqs: [
      mcq('`setTimeout(fn, 0)` runs the function:',
        [['After the current code finishes — it was queued, not executed', true],
          ['Immediately', false], ['Before the next line', false], ['Never', false]],
        'Zero is the minimum delay before queueing, not an instruction to run now.'),
      mcq('`fetch` receives a 404. What happens?',
        [['The promise FULFILS — check response.ok yourself', true],
          ['It rejects', false],
          ['It throws', false],
          ['It retries', false]],
        'A 404 is a successful HTTP exchange to fetch, and forgetting this is why apps show "undefined" instead of an error.'),
      mcq('`const data = fetch(url);` then `data.students` gives:',
        [['undefined — data is a Promise, not the response', true],
          ['The students', false], ['An error', false], ['null', false]],
        'Nothing errors, and the undefined surfaces several lines away from the missing await.'),
      mcq('Two independent requests are awaited one after the other. The improvement is:',
        [['Promise.all, so both run at once', true],
          ['More awaits', false],
          ['Removing await', false],
          ['Nothing is possible', false]],
        'One of the easiest real performance wins available, and only valid when neither depends on the other.'),
    ],
    checkpoint: [
      mcq('Why does `await` not freeze the page?',
        [['It pauses that function only; other code continues on the same thread', true],
          ['It uses another thread', false],
          ['It does freeze the page', false],
          ['The browser optimises it', false]],
        'The function is suspended and resumed later, which is the whole point of the syntax.'),
      mcq('An async function returns:',
        [['A promise, always', true], ['The value directly', false], ['undefined', false], ['A callback', false]],
        'Which is why the caller must await it too, and forgetting produces a promise where a value was expected.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_DEBUGGING',
    notes: `JavaScript reports its errors, unlike CSS. The skill is reading them properly rather
than skimming.

**Read the whole message.** \`Cannot read properties of undefined (reading 'name')\` tells you two
things: something is undefined, and you tried to read \`name\` from it. The undefined thing is
what to look for — not \`name\`.

**The five you will meet constantly:**

| Error | Cause |
|---|---|
| \`Cannot read properties of null (reading 'x')\` | A selector returned null |
| \`Cannot read properties of undefined\` | A property in a chain is missing |
| \`x is not a function\` | Typo, or x is not what you think |
| \`x is not defined\` | Never declared, or out of scope, or a typo |
| \`Unexpected token\` | Syntax — usually a missing bracket above the reported line |

**The stack trace reads bottom to top.** The top line is where it threw; below it is who called
it. Your own file is usually more interesting than the library frames.

**Beyond \`console.log\`:**

    console.table(arrayOfObjects);    // renders as a table
    console.error(x);                 // with a stack trace
    console.log({ user, count });     // labelled, rather than bare values

That last one is a small habit worth having: \`console.log({ x })\` prints \`{ x: 5 }\` so you can
see which value you are looking at when three logs are on screen.

**Breakpoints beat logging** once you have more than a couple of values. Sources panel, click a
line number, reload. When it pauses you can inspect every variable in scope, step line by line,
and see the call stack. \`debugger;\` in the code does the same.

**The method, when the message is not enough:**

1. **Where does it actually break?** A breakpoint or a log immediately before the failing line.
2. **What are the values there?** Log the value AND its type — \`console.log(x, typeof x)\`.
   String-versus-number is behind a surprising share of bugs.
3. **Is it what you assumed?** Almost always the answer is no, and that is the bug.

**For async problems**, log before and after each await. A promise where you expected a value,
or an error swallowed by an empty catch, are the two usual causes.

**An empty \`catch {}\` is how a bug becomes invisible.** If you catch, either handle it or log
it.`,
    coding: [
      {
        title: 'Match the error to its cause',
        description: `For each error message, print the number of the matching cause, one per line, in order.

Errors:
1. \`Cannot read properties of null (reading 'textContent')\`
2. \`data.map is not a function\`
3. \`Cannot read properties of undefined (reading 'name')\`
4. The value logged is \`Promise { <pending> }\`

Causes:
1 = a property in the chain is missing
2 = querySelector returned null
3 = await was omitted
4 = the value is not an array

Print four lines: the cause number for error 1, then 2, then 3, then 4.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          // Hidden deliberately: the task takes no input, so a visible case would print the key.
          { input: '', expectedOutput: '2\n4\n1\n3', isHidden: true },
        ],
      },
    ],
    mcqs: [
      mcq('`Cannot read properties of undefined (reading \'name\')`. What should you look for?',
        [['The thing before `.name`, which is undefined', true],
          ['The name property', false],
          ['A typo in "name"', false],
          ['A missing import', false]],
        'The message names both halves, and the undefined half is the one to investigate.'),
      mcq('`Unexpected token` on line 40 usually means:',
        [['A syntax problem somewhere ABOVE that line, often a missing bracket', true],
          ['Line 40 is wrong', false],
          ['A missing semicolon on line 40', false],
          ['An encoding problem', false]],
        'The parser reports where it gave up, which is usually after the real mistake.'),
      mcq('Why log `{ x }` rather than `x`?',
        [['It prints the name with the value, so you can tell which log you are reading', true],
          ['It is faster', false],
          ['It avoids errors', false],
          ['No reason', false]],
        'A small habit that pays off the moment three logs are on screen at once.'),
      mcq('An empty `catch {}` is a problem because:',
        [['The error disappears with no record that anything failed', true],
          ['It is slow', false],
          ['It is invalid syntax', false],
          ['It rethrows', false]],
        'If you catch, either handle it or log it — otherwise the bug becomes invisible.'),
    ],
    checkpoint: [
      mcq('When should you use a breakpoint rather than console.log?',
        [['Once there is more than a couple of values, or you need to step through', true],
          ['Never', false], ['Only for async', false], ['Always', false]],
        'It shows every variable in scope at once, which logging can only approximate one value at a time.'),
      mcq('You log a value and see `Promise { <pending> }`. What is wrong?',
        [['A missing await', true],
          ['The request failed', false],
          ['The server is slow', false],
          ['A syntax error', false]],
        'The promise is the value you received, which means the await that would unwrap it is absent.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_PRACTICE',
    notes: `No new concepts. These are small interactive pieces built from a description — which
is deliberately how the work arrives in practice.

**Why "from a description".** An exercise saying "use addEventListener to..." has done the
design. Going from "the user should be able to filter the list as they type" to an
implementation is the actual skill, and it needs the whole topic at once.

**The method for any interactive piece:**

1. **What is the state?** The data that decides what is on screen. Keep it in variables.
2. **What events change it?** Each one is a listener.
3. **What does the screen look like for a given state?** That is a render function.
4. **Event → change state → re-render.** One direction, every time.

That loop is what every framework you meet later is automating. Doing it by hand once is why
the framework makes sense afterwards.

**The checklist before you call one finished:**

- Does it work with the keyboard alone, including Tab and Enter?
- What happens with empty input? With a very long value? With zero results?
- Are errors shown as text, not only colour?
- Does it still work when the list is re-rendered — or did individually attached listeners die?
- Is any user-supplied value going through \`innerHTML\`?

**Small pieces worth building:**

- A live filter over a list, updating as the user types
- A counter with increment, decrement and reset that cannot go negative
- A to-do list: add, mark done, delete, using delegation
- A form with three validated fields and accessible error messages
- A fetch from a public API with a loading state, an error state and an empty state

**The three states people forget** are loading, error and empty. A page that only handles the
successful case with data in it is not finished, and those three are where most of the real
work is.`,
    mcqs: [
      mcq('The loop every interactive piece follows is:',
        [['Event changes state, then re-render from state', true],
          ['Event changes the DOM directly', false],
          ['Render then attach listeners', false],
          ['Poll for changes', false]],
        'It is what every framework automates, which is why doing it by hand once makes them comprehensible.'),
      mcq('Which three states are most often forgotten?',
        [['Loading, error and empty', true],
          ['Click, hover and focus', false],
          ['Mobile, tablet and desktop', false],
          ['Create, read and update', false]],
        'A page handling only the successful case with data in it is not finished, and those three are most of the work.'),
      mcq('After re-rendering a list, its buttons stop working. The cause is:',
        [['Listeners were attached to elements that have been replaced', true],
          ['A CSS problem', false],
          ['The data changed', false],
          ['A missing await', false]],
        'Delegation on the container survives re-rendering because the container is not replaced.'),
      mcq('A filter input should update the list as the user types. Which event?',
        [['input', true], ['change', false], ['keydown', false], ['submit', false]],
        'change waits until focus leaves; keydown fires before the value updates, so it reads one character behind.'),
      mcq('Before calling an interactive piece finished, test:',
        [['Keyboard only, empty input, and zero results', true],
          ['Only the happy path', false],
          ['Load time', false],
          ['Browser compatibility only', false]],
        'Three cheap checks that between them catch most of what reaches a reviewer.'),
    ],
    checkpoint: [
      mcq('Where should the state of an interactive component live?',
        [['In variables, with the DOM rendered from them', true],
          ['In the DOM, read back when needed', false],
          ['In localStorage', false],
          ['In data attributes', false]],
        'Reading state back out of the DOM works and becomes unmaintainable quickly.'),
      mcq('A user-supplied comment is rendered into the page. Which method?',
        [['textContent', true], ['innerHTML', false], ['insertAdjacentHTML', false], ['outerHTML', false]],
        'Anything that parses HTML turns a script tag in the comment into executable code on your page.'),
    ],
  },
  {
    unitCode: 'T_JS_DOM_MINI_PROJECT',
    notes: `One page that genuinely reacts to what somebody does — built without a framework,
because a framework is only learnable once you know what it is doing for you.

**Why no framework.** React and its relatives solve real problems, and every one of those
problems is something you will meet in this project: keeping the screen in step with the data,
avoiding manual DOM updates scattered everywhere, handling elements that come and go. Meeting
the problems first is what makes the solutions make sense rather than being magic you copy.

**The architecture to use**, and it is the same one the practice unit introduced:

    let state = { items: [], filter: '' };    // the data

    function render() { ... }                  // state -> screen

    function update(changes) {                 // the only way state changes
      state = { ...state, ...changes };
      render();
    }

    input.addEventListener('input', e => update({ filter: e.target.value }));

**One direction only: event → update → render.** Never modify the DOM directly from a handler.
It is tempting for small changes and it is how a page ends up with two sources of truth that
disagree — the classic symptom being a value that is correct until you interact in a particular
order.

**The three states again.** Loading, error and empty are part of the brief, not extras. Most of
the difficulty in real interfaces is there rather than in the successful case.

**On accessibility.** This is where it is most often abandoned, and it is not difficult here:
use real buttons, label every input, put errors in text associated with the field, and check
that Tab reaches everything. Four things.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — An Interactive Page',
      description: `Build one page that reacts to user input, using a single state object and a render function, with no framework. Loading, error and empty states are part of the brief rather than extras.`,
      instructions: `**The brief**

Build ONE of these, or propose something of similar scope:

- **A task list** — add, mark complete, delete, filter by status, persist to localStorage
- **A searchable directory** — fetch a list from a public API, filter as the user types, show
  details on selection
- **A quiz** — present questions one at a time, track answers, show a score and a review at the
  end
- **An expense tracker** — add entries, show a running total, filter by category, delete

**Requirements**

1. **A single state object** and a \`render()\` function that draws the whole UI from it. No
   handler may modify the DOM directly.
2. **Event delegation** for anything in a list that can be added or removed.
3. **All three states handled**: loading (if fetching), error, and empty.
4. **At least one form with validation**, errors shown as text associated with the field.
5. **Fully keyboard operable.** Tab reaches everything; Enter activates. Visible focus.
6. **No \`innerHTML\` with any user-supplied or fetched value.**
7. **No framework and no jQuery.** Plain JavaScript.

**What to submit**

1. \`.html\`, \`.css\` and \`.js\` files.
2. **Three screenshots**: the empty state, the error state, and the populated state.
3. A **decisions document** (roughly 300-450 words):
   - What is in your state object, and why each piece is there rather than read from the DOM
   - Where you used delegation and what would have broken without it
   - How you handled the loading and error states
   - One thing you tried that did not work, and what you changed
4. An **accessibility note**: confirm you tabbed through it, and state what focus looks like and
   how errors are announced.

**Constraints**

- No fixed heights on anything containing text.
- Every fetch must check \`response.ok\`.
- No empty catch blocks.

**Where the marks are.** A simpler feature set done properly — all three states, working
keyboard support, clean state-to-render flow — scores well above an ambitious one where only
the happy path works. The three states and the keyboard are exactly what separates a demo from
something usable.`,
      rubric: [
        {
          criterion: 'Architecture',
          description: 'A single state object; render() draws the UI from it; no handler touches the DOM directly; event delegation used where elements are added or removed.',
          maxPoints: 30,
        },
        {
          criterion: 'All three states',
          description: 'Loading, error and empty each handled and each demonstrated by a screenshot. response.ok checked on every fetch.',
          maxPoints: 20,
        },
        {
          criterion: 'Forms and validation',
          description: 'At least one validated form with errors in text associated with the field via aria-describedby, and values trimmed and converted correctly.',
          maxPoints: 20,
        },
        {
          criterion: 'Accessibility and safety',
          description: 'Fully keyboard operable with visible focus; real buttons and labelled inputs; no user-supplied value passed through innerHTML.',
          maxPoints: 15,
        },
        {
          criterion: 'Decisions document',
          description: 'Explains what is in state and why, where delegation was needed and what would have broken, and one thing that did not work and what changed.',
          maxPoints: 15,
        },
      ],
      totalPoints: 100,
    },
  },
];
