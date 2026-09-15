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
          ['The selector does not match anything on the page', false],
          ['The script file itself failed to load from the server', false],
          ['A syntax error further up the script stopped it', false]],
        'Could also be a wrong selector, but with a head script this ordering is the first thing to check.'),
      mcq('Which attribute should application code use?',
        [['defer — runs after parsing and preserves script order', true],
          ['`async`, which starts the download immediately', false], ['Neither; a script at the end of the body needs no attribute', false], ['Both together, which gives the fastest possible load', false]],
        'async does not guarantee order, so failures depend on network timing and appear intermittently.'),
      mcq('A long loop freezes the page because:',
        [['JavaScript is single-threaded and shares that thread with the page', true],
          ['The browser throttles a script that runs too long', false],
          ['Memory runs out as the loop allocates each pass', false],
          ['It does not freeze; rendering happens on its own thread', false]],
        'One thread for your code and for rendering, which is the fact everything about async rests on.'),
      mcq('`async` is appropriate for:',
        [['Independent scripts such as analytics, where order does not matter', true],
          ['All application code, which rarely depends on order', false],
          ['Any script placed at the end of the document body', false],
          ['Nothing; `async` has been superseded by `defer`', false]],
        'Order independence is the whole criterion, and application code rarely has it.'),
    ],
    checkpoint: [
      mcq('Placing a script at the end of the body works because:',
        [['Everything above it has been parsed, so the elements exist', true],
          ['The script loads faster from the end of the document', false],
          ['The browser waits for the whole page before running any script', false],
          ['A script at the end of the body runs asynchronously by default', false]],
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
          ['Throws a TypeError, since `const` forbids changes', false],
          ['Silently fails, leaving the array as it was', false],
          ['Creates a new array with the item appended', false]],
        'The binding cannot point somewhere else; the thing it points at can still change.'),
      mcq('Why prefer `===` over `==`?',
        [['`==` converts types first, making comparisons true that should not be true', true],
          ['`===` is faster, since no conversion is attempted', false],
          ['`==` has been deprecated in recent versions of the language', false],
          ['There is no real difference outside of edge cases', false]],
        '"5" == 5 and 0 == false are both true. The rules exist and almost nobody recalls them correctly.'),
      mcq('`undefined` and `null` differ how?',
        [['undefined means nobody set it; null means somebody set it to nothing', true],
          ['They are identical and used interchangeably', false],
          ['`null` signals an error and `undefined` does not', false],
          ['`undefined` only ever appears as a return value', false]],
        'Both falsy, not equal under ===, and the distinction matters when deciding whether a value was omitted or cleared.'),
      mcq('`typeof null` returns "object" because:',
        [['It is a 1995 bug that cannot be fixed without breaking the web', true],
          ['`null` really is an object under the covers', false],
          ['It returns the string "null" in modern engines', false],
          ['Of the type coercion `typeof` performs first', false]],
        'Check with === null. Worth knowing so the output does not send you looking for a mistake of your own.'),
    ],
    checkpoint: [
      mcq('Which declaration should be the default?',
        [['const, with let only where reassignment is known to be needed', true],
          ['`let` everywhere, so nothing has to be changed when it is reassigned', false], ['`var`, which is the most widely supported of the three keywords', false], ['No declaration at all, letting the scope be inferred from first use', false]],
        'It tells the reader the value will not change underneath them, which is one fewer thing to track.'),
      mcq('`"" == 0` evaluates to:',
        [['true — both are coerced before comparison', true],
          ['false, since an empty string is not a number of any kind', false], ['an error, because the two sides have incompatible types', false], ['undefined, which is what an impossible comparison yields', false]],
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
          ['`n * 2`, since the last expression is returned', false], ['A function, because the body was never called', false], ['An error, since a block body must return a value', false]],
        'The implicit return applies only to the expression form. Adding braces silently changes the meaning.'),
      mcq('`addEventListener(\'click\', handleClick())` is wrong because:',
        [['It calls the function now and registers its return value as the listener', true],
          ['A handler has to be called with parentheses like that', false],
          ['It registers the same handler twice on the element', false],
          ['It is not wrong; the parentheses are conventional', false]],
        'The handler runs at page load and undefined becomes the listener, with no error at all.'),
      mcq('`map` differs from `forEach` how?',
        [['map returns a new array; forEach returns nothing and is for effects', true],
          ['`map` is faster because it preallocates the result', false],
          ['`forEach` can be stopped early and `map` cannot', false],
          ['They are identical, and the names are interchangeable', false]],
        'Using map and discarding the result is a reliable sign you meant forEach.'),
      mcq('An arrow function\'s `this` comes from:',
        [['The surrounding scope — it has none of its own', true],
          ['The object the function was called on at the time', false],
          ['The global object, whatever the surrounding code', false],
          ['Its first argument, as with `call` and `apply`', false]],
        'Usually what you want inside a callback, and the main practical reason arrows took over.'),
    ],
    checkpoint: [
      mcq('Which produces a new array of transformed values?',
        [['map', true], ['forEach', false], ['filter', false], ['reduce', false]],
        'filter selects without transforming; reduce collapses to one value; forEach returns nothing.'),
      mcq('Why can a `function` declaration be called before it appears?',
        [['Declarations are hoisted; const and let bindings are not', true],
          ['All functions are hoisted, however they happen to be defined', false],
          ['The browser reorders the code so definitions come first', false],
          ['It cannot be; calling before the definition always throws', false]],
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
          ['`data` itself, which never arrived from the server', false], ['`name`, which is missing from the teacher object', false], ['The whole expression, which evaluates to nothing', false]],
        'Reading the error precisely identifies which link is missing, which is what optional chaining then guards.'),
      mcq('`count ?? 10` differs from `count || 10` when count is:',
        [['0 — `??` keeps it, `||` replaces it with 10', true],
          ['`null`, which both operators treat the same way', false], ['undefined', false], ['They never differ; the two are exact synonyms', false]],
        '`||` falls back for any falsy value, which silently destroys legitimate zeros and empty strings.'),
      mcq('`const b = a` where a is an object, then `b.x = 2`. What is `a.x`?',
        [['2 — both names refer to one object', true],
          ['1, since `b` received a copy of the object', false], ['undefined', false], ['An error', false]],
        'Assignment binds a name; it does not copy. `{ ...a }` copies, and only shallowly.'),
      mcq('`{ ...a }` produces:',
        [['A shallow copy — nested objects are still shared', true],
          ['A deep copy, with every nested object duplicated', false],
          ['A reference to the original object, not a copy', false],
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
          ['Just the keys, as an array of strings', false], ['Just the values, in the order they were set', false], ['A string listing each key and its value', false]],
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
          ['An empty array, which is safe to loop over', false], ['`undefined`, the usual value for a missing thing', false], ['An error, which has to be caught by the caller', false]],
        'Which is why the guard, or certainty about the element existing, is required before using the result.'),
      mcq('`querySelectorAll(...).map(...)` fails because:',
        [['A NodeList is not an array and has no map', true],
          ['`map` was called without the function it needs', false],
          ['The selector is wrong and matched nothing at all', false],
          ['It does not fail; a NodeList supports every array method', false]],
        'It does have forEach, which is why the absence of map surprises people. Spread it into an array first.'),
      mcq('Why prefer `querySelectorAll` over `getElementsByClassName`?',
        [['It returns a static snapshot, not a collection that changes as you loop', true],
          ['It is faster for the browser to evaluate', false],
          ['It supports more selector syntax, and nothing else', false],
          ['No reason beyond the name being easier to remember', false]],
        'A live collection updating mid-loop produces genuinely confusing bugs, especially when adding elements.'),
      mcq('`card.querySelector("h2")` differs from `document.querySelector("h2")` how?',
        [['It searches only inside that card', true],
          ['It is faster, and otherwise behaves identically', false],
          ['It returns every match rather than just the first', false],
          ['There is no difference between the two calls', false]],
        'Reaching for document inside a component is the usual cause of "it always updates the first one".'),
    ],
    checkpoint: [
      mcq('A selector returns null and you are certain the element exists. Check:',
        [['Whether the script ran before the element was parsed', true],
          ['The CSS file, in case a rule is hiding the element entirely', false],
          ['The network tab, to see whether the markup actually arrived', false],
          ['The element size, since a zero-height element is not selectable', false]],
        'That plus spelling and the wrong parent cover nearly every case.'),
      mcq('Why cache a selector result outside a loop?',
        [['Selecting inside the loop searches the document on every pass', true],
          ['It avoids a null result if the element is removed mid-loop', false],
          ['It is required; a selector cannot legally appear inside a loop', false],
          ['To keep the result live, so it updates as the DOM changes', false]],
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
        [['The content is parsed as HTML, so a script tag in it executes', true],
          ['It is slower, because the whole node is reparsed', false],
          ['It removes the event listeners from the replaced nodes', false],
          ['It is not dangerous; the browser sanitises the input', false]],
        'One of the oldest and most exploited web vulnerabilities, and textContent avoids it entirely.'),
      mcq('Why prefer `classList.add` over setting `el.style` directly?',
        [['An inline style is the highest specificity and hardest to override later', true],
          ['`classList` is faster for the browser to apply', false],
          ['Setting `el.style` has no effect on a styled element', false],
          ['There is no practical difference between the two', false]],
        'The same argument the CSS topic made about inline styles, arriving from the JavaScript side.'),
      mcq('Inserting a hundred elements one at a time is slow because:',
        [['Each insertion can trigger layout work', true],
          ['`createElement` is slow compared with a template', false],
          ['The array being inserted is too large to handle', false],
          ['It is not slow; the browser batches the insertions', false]],
        'A document fragment collects them and inserts once. For a handful of items none of this matters.'),
      mcq('Reading application state back out of the DOM is:',
        [['Workable and quickly unmaintainable; keep data in variables', true],
          ['The standard approach, and what most code does', false],
          ['Impossible, since the DOM holds no readable state', false],
          ['Faster than keeping a second copy in variables', false]],
        'The DOM should be what is displayed, not where your data lives.'),
    ],
    checkpoint: [
      mcq('A comment from a user is displayed with `innerHTML`. What is the risk?',
        [['A script tag in the comment executes on your page', true],
          ['The layout breaks if the comment contains unclosed markup', false],
          ['It renders slowly, since the browser reparses the whole node', false],
          ['Nothing; the browser strips anything dangerous automatically', false]],
        'And it runs with your page\'s privileges, which is why it can steal session cookies.'),
      mcq('`el.value` versus `el.getAttribute("value")` on an input:',
        [['`el.value` is the current value; the attribute is the initial one from the HTML', true],
          ['They are identical, and the attribute form is just more explicit', false],
          ['The attribute holds the current value and the property the initial', false],
          ['There is no `value` property, so only the attribute can be read', false]],
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
          ['It is easier to type than attaching each listener', false],
          ['It prevents the event from bubbling any further up', false],
          ['It is more secure than attaching handlers directly', false]],
        'Individually attached listeners leave new rows dead, which is a very common bug with exactly this cause.'),
      mcq('`e.target` versus `e.currentTarget`:',
        [['target is what was actually clicked; currentTarget is where the listener is', true],
          ['They are the same property under two different names', false],
          ['`target` is the parent of the element that was clicked', false],
          ['`currentTarget` is always the document element itself', false]],
        'Clicking an icon inside a button makes the icon the target, which is why closest() is used to walk back up.'),
      mcq('Why can an inline arrow function listener not be removed?',
        [['removeEventListener needs the same reference, and a new arrow is different', true],
          ['An arrow function cannot be used as a listener at all', false],
          ['It can be removed by passing the same code again', false],
          ['Only a named function participates in event bubbling', false]],
        'Keep a named reference when you know you will need to detach it.'),
    ],
    checkpoint: [
      mcq('Rows added after page load do not respond to clicks. The likely cause:',
        [['Listeners were attached individually before those rows existed', true],
          ['The new rows have no ids, so the listener cannot find them', false],
          ['A CSS problem, with something invisible sitting over the rows', false],
          ['`preventDefault` was called, which suppressed the click entirely', false]],
        'Delegation on the container fixes it permanently, because the listener is on something that already exists.'),
      mcq('`input` versus `change` on a text field:',
        [['input fires as the user types; change fires when they finish', true],
          ['They are identical, and the two names are kept for compatibility', false],
          ['`change` fires on each keystroke and `input` once at the end', false],
          ['`input` fires only once, when the field first receives focus', false]],
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
        [['Trailing whitespace is invisible, compares unequal, and gets pasted in', true],
          ['To save memory, since the stored strings are shorter', false],
          ['It is required before a form value can be read at all', false],
          ['To prevent an injection attack from reaching the server', false]],
        'An invisible cause of "my password is correct and it says it is wrong".'),
      mcq('A number input gives you:',
        [['A string, which must be converted and checked', true],
          ['A number, already parsed and ready to use', false], ['`null` whenever the field has been left empty', false], ['`NaN` until something valid has been typed in', false]],
        'Number("abc") is NaN and NaN fails every comparison including with itself, so Number.isNaN is the check.'),
      mcq('What makes a validation error announced to a screen reader?',
        [['Text in an element referenced by aria-describedby on the input', true],
          ['A red border applied to the field that failed', false],
          ['An `alert()` naming the field that needs attention', false],
          ['The `required` attribute on the input element', false]],
        'Colour alone reaches only the people who perceive it, and forms are where that matters most.'),
      mcq('Client-side validation exists for:',
        [['Helpfulness — the server is what actually protects the data', true],
          ['Security, since the checks run before anything is sent', false],
          ['Both equally; the two layers do exactly the same job', false],
          ['Reducing server cost, by rejecting bad input early', false]],
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
        [['Required, format, range, business rules, stopping at the first', true],
          ['All at once, so the user sees every problem together', false],
          ['Business rules first, since they are the expensive checks', false],
          ['Format first, then whether the field was filled in at all', false]],
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
        [['After the current code finishes; it was queued, not run', true],
          ['Immediately, before the next statement is reached', false], ['Before the next line of the surrounding function', false], ['Never; a zero delay cancels the timer entirely', false]],
        'Zero is the minimum delay before queueing, not an instruction to run now.'),
      mcq('`fetch` receives a 404. What happens?',
        [['The promise FULFILS — check response.ok yourself', true],
          ['The promise rejects, so a catch block will run', false],
          ['It throws synchronously at the point of the call', false],
          ['It retries the request a few times before failing', false]],
        'A 404 is a successful HTTP exchange to fetch, and forgetting this is why apps show "undefined" instead of an error.'),
      mcq('`const data = fetch(url);` then `data.students` gives:',
        [['undefined — data is a Promise, not the response', true],
          ['The list of students parsed from the response', false], ['An error, because a Promise has no such property', false], ['`null`, until the request has finished loading', false]],
        'Nothing errors, and the undefined surfaces several lines away from the missing await.'),
      mcq('Two independent requests are awaited one after the other. The improvement is:',
        [['Promise.all, so both run at once', true],
          ['Adding an await to each of the two requests', false],
          ['Removing the awaits so neither one blocks', false],
          ['Nothing can be done; requests are always sequential', false]],
        'One of the easiest real performance wins available, and only valid when neither depends on the other.'),
    ],
    checkpoint: [
      mcq('Why does `await` not freeze the page?',
        [['It pauses that function only; other code continues on the same thread', true],
          ['It runs the waiting on a second thread while the first carries on', false],
          ['It does freeze the page, which is why it must be used sparingly', false],
          ['The browser optimises it away when nothing else is waiting to run', false]],
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
          ['The `name` property, which does not exist on it', false],
          ['A typo in the spelling of the `name` property', false],
          ['A missing import for the module that defines it', false]],
        'The message names both halves, and the undefined half is the one to investigate.'),
      mcq('`Unexpected token` on line 40 usually means:',
        [['A syntax problem somewhere ABOVE that line, often a missing bracket', true],
          ['Line 40 is wrong and needs to be rewritten', false],
          ['A semicolon is missing at the end of line 40', false],
          ['An encoding problem somewhere in the source file', false]],
        'The parser reports where it gave up, which is usually after the real mistake.'),
      mcq('Why log `{ x }` rather than `x`?',
        [['It prints the name with the value, so you know which log it is', true],
          ['It is faster for the console to format and display', false],
          ['It avoids an error when the value is undefined', false],
          ['No particular reason; the two forms are the same', false]],
        'A small habit that pays off the moment three logs are on screen at once.'),
      mcq('An empty `catch {}` is a problem because:',
        [['The error disappears with no record that anything failed', true],
          ['It is slow, since the error object is still built', false],
          ['It is invalid syntax; a catch needs a binding', false],
          ['It rethrows the error once the block has finished', false]],
        'If you catch, either handle it or log it — otherwise the bug becomes invisible.'),
    ],
    checkpoint: [
      mcq('When should you use a breakpoint rather than console.log?',
        [['Once there is more than a value or two, or you need to step through', true],
          ['Never; a log statement can show anything a breakpoint can', false], ['Only for asynchronous code, which a log statement cannot follow', false], ['Always, since stepping is strictly better than reading logs', false]],
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
          ['The event changes the DOM directly where it happened', false],
          ['Render the markup, then attach the listeners to it', false],
          ['Poll for changes and redraw whenever one is seen', false]],
        'It is what every framework automates, which is why doing it by hand once makes them comprehensible.'),
      mcq('Which three states are most often forgotten?',
        [['Loading, error and empty', true],
          ['Click, hover and focus', false],
          ['Mobile, tablet and desktop', false],
          ['Create, read and update', false]],
        'A page handling only the successful case with data in it is not finished, and those three are most of the work.'),
      mcq('After re-rendering a list, its buttons stop working. The cause is:',
        [['Listeners were attached to elements that have since been replaced', true],
          ['A CSS problem placing something invisible over them', false],
          ['The underlying data changed shape during the render', false],
          ['A missing `await`, so the render ran before the data', false]],
        'Delegation on the container survives re-rendering because the container is not replaced.'),
      mcq('A filter input should update the list as the user types. Which event?',
        [['input', true], ['change', false], ['keydown', false], ['submit', false]],
        'change waits until focus leaves; keydown fires before the value updates, so it reads one character behind.'),
      mcq('Before calling an interactive piece finished, test:',
        [['Keyboard only, empty input, and zero results', true],
          ['Only the happy path, which is what users mostly do', false],
          ['Load time, measured on a slow connection', false],
          ['Browser compatibility across the major engines', false]],
        'Three cheap checks that between them catch most of what reaches a reviewer.'),
    ],
    checkpoint: [
      mcq('Where should the state of an interactive component live?',
        [['In variables, with the DOM rendered from them', true],
          ['In the DOM itself, read back out whenever needed', false],
          ['In localStorage, so it survives a page reload', false],
          ['In data attributes on the relevant elements', false]],
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
