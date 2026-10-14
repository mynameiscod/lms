/**
 * Career-track content: JavaScript the language (JT_JS_CORE) and modern JavaScript (JT_JS_ES6).
 *
 * Every question here is about a specific piece of code and what it actually does when run, because
 * that is how JavaScript is examined in an interview: a short snippet and "what does this print?".
 * A student who can trace the snippet by hand has the skill; one who recognises the vocabulary does
 * not.
 *
 * Attribution: JT_JS_CORE is multi-skill (JS_BASICS, JS_FUNCTIONS, JS_ARRAYS_OBJECTS), so every
 * checkpoint question names the one skill it measures, taken from its own unit's skillKeys.
 * JT_JS_ES6 is single-skill (JS_ES6) and names none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_JAVASCRIPT_BUNDLES: PilotBundle[] = [
  /* ══ JT_JS_CORE — JavaScript Fundamentals ═══════════════════════════════════════════════ */
  {
    unitCode: 'JT_JS_CORE_VALUES_TYPES',
    notes: `Every value in JavaScript is either a **primitive** or an **object**. There are seven
primitives — number, string, boolean, undefined, null, bigint and symbol — and everything else
(arrays, functions, dates, plain objects) is an object.

## Declaring a variable

    const rate = 18;        // will never be reassigned
    let total = 0;          // will be reassigned
    var legacy = 'old';     // older style; avoid in new code

Use \`const\` by default and \`let\` when the value must change. \`var\` is covered later and is the
source of several classic bugs.

## What typeof tells you

    typeof 42            // 'number'
    typeof 3.5           // 'number'  (there is no separate integer type)
    typeof 'hi'          // 'string'
    typeof true          // 'boolean'
    typeof undefined     // 'undefined'
    typeof 10n           // 'bigint'
    typeof null          // 'object'   ← a bug from 1995, kept for compatibility
    typeof []            // 'object'
    typeof {}            // 'object'
    typeof function(){}  // 'function'
    typeof NaN           // 'number'   ← "not a number" is a number

Two of those lines catch everybody. \`typeof null\` is \`'object'\`, so to test for null you write
\`value === null\`. And \`typeof\` cannot tell an array from an object; use \`Array.isArray(value)\`.

## undefined and null

\`undefined\` means "nothing was ever put here": a declared but unassigned variable, a missing
property, a function with no \`return\`. \`null\` means "somebody deliberately put nothing here". An
API returning \`null\` for a missing middle name is making a statement; \`undefined\` usually means
you asked for something that does not exist.

## Numbers are floating point

    console.log(0.1 + 0.2);          // 0.30000000000000004
    console.log(0.1 + 0.2 === 0.3);  // false

All numbers are 64-bit binary floating point, which cannot represent 0.1 exactly. For money,
work in whole paise (integers) and divide only for display.

## Strings are immutable

    let name = 'asha';
    name[0] = 'A';
    console.log(name);   // 'asha' — unchanged
    name = name[0].toUpperCase() + name.slice(1);
    console.log(name);   // 'Asha'

String methods never change a string; they return a new one, and you keep it by assigning it.

## Common mistakes

- Testing \`typeof x === 'array'\` — that string is never returned.
- Testing for null with \`typeof\`.
- Comparing decimal results with \`===\` instead of rounding first.`,
    workedExample: `**Goal: say the type of each value an API response contains.**

    const res = { id: 7, name: 'Kit', tags: [], manager: null, nickname: undefined };

Go field by field. \`typeof res.id\` is \`'number'\`. \`typeof res.name\` is \`'string'\`.
\`typeof res.tags\` is \`'object'\` — so to know it is a list, ask \`Array.isArray(res.tags)\`,
which is \`true\`. \`typeof res.manager\` is \`'object'\`, which is misleading: the honest test is
\`res.manager === null\`, which is \`true\`. \`typeof res.nickname\` is \`'undefined'\`, and so is
\`typeof res.salary\`, a property that does not exist at all.

The lesson: \`typeof\` answers "which of seven buckets", not "what is this". For arrays and null you
need the specific checks.`,
    mcqs: [
      mcq('What does console.log(typeof NaN) print?',
        [['number', true], ['NaN', false], ['undefined', false], ['object', false]],
        'NaN is a special value of the number type — the result of a failed numeric operation — so typeof reports "number".'),
      mcq('After "let score;" with no assignment, what does console.log(score, typeof score) print?',
        [['undefined undefined', true], ['null object', false], ['0 number', false], ['ReferenceError', false]],
        'A declared but unassigned let variable holds undefined, and typeof undefined is the string "undefined".'),
      mcq('Which check correctly tells you that value is an array?',
        [['Array.isArray(value)', true], ["typeof value === 'array'", false], ['value instanceof Object', false], ["typeof value === 'object'", false]],
        'typeof never returns "array" — arrays report "object", as do plain objects and null. Array.isArray is the only one that separates them.'),
    ],
    checkpoint: [
      ck('JS_BASICS', 'Your code receives data = null from an API. What does typeof data evaluate to?',
        [["'object'", true], ["'null'", false], ["'undefined'", false], ["'none'", false]],
        'typeof null is "object" — a historical bug in the language that can never be fixed. Test for null with data === null.'),
      ck('JS_BASICS', 'What does console.log(0.1 + 0.2 === 0.3) print, and why?',
        [['false — binary floating point cannot store 0.1 exactly', true],
          ['true — JavaScript rounds the sum to 0.3 first', false],
          ['false — === compares types, and the sum is a string', false],
          ['true — both sides have the same type, number', false]],
        'The sum is 0.30000000000000004 because 0.1 and 0.2 have no exact binary representation. Compare decimals within a tolerance, or work in integers.'),
      ck('JS_BASICS', "const user = { name: 'Asha' }; user.name = 'Ravi'; What happens?",
        [["The name changes to 'Ravi'; const only blocks reassigning user", true],
          ['A TypeError is thrown, because the object itself is frozen by const', false],
          ["The assignment is silently ignored and the name stays 'Asha'", false],
          ['A SyntaxError is raised before any of the code runs at all', false]],
        'const fixes the binding — user cannot point at a different object — but the object it points at is still mutable.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_OPERATORS',
    notes: `Most JavaScript surprises come from three places: \`+\` with strings, \`==\`, and the
logical operators returning values rather than booleans.

## + concatenates, the other operators convert

    console.log('5' + 3);    // '53'  — one side is a string, so + joins text
    console.log('5' - 3);    // 2     — - only means subtraction, so '5' becomes 5
    console.log('5' * '2');  // 10
    console.log('abc' - 1);  // NaN

Input from a form field is always a string. \`Number(input.value)\` before arithmetic, every time.

## == converts, === does not

\`===\` (strict equality) is true only when the type and the value both match. \`==\` (loose
equality) first converts the two sides towards a common type, and the rules are long:

    console.log(1 == '1');            // true
    console.log(1 === '1');           // false
    console.log(0 == '');             // true
    console.log(null == undefined);   // true
    console.log(null === undefined);  // false
    console.log(NaN === NaN);         // false — NaN equals nothing, itself included

Use \`===\` and \`!==\` everywhere. The one idiom some teams allow is \`x == null\`, which is true for
both null and undefined. To test for NaN, use \`Number.isNaN(x)\`.

## Truthy and falsy

In an \`if\`, any value is converted to a boolean. Exactly these are **falsy**:

    false   0   -0   0n   ''   null   undefined   NaN

Everything else is truthy — including \`'0'\`, \`'false'\`, \`[]\` and \`{}\`. An empty array is truthy,
so \`if (items)\` does not test whether a list has entries; \`if (items.length)\` does.

## && and || return one of their operands

    console.log('a' || 'b');   // 'a'  — the first truthy value
    console.log('' || 'b');    // 'b'
    console.log('a' && 'b');   // 'b'  — the last value, if everything was truthy
    console.log(0 && 'b');     // 0    — the first falsy value

That is why \`name || 'Guest'\` works as a default. It is also a bug when 0 or '' are legitimate:

    const qty = 0;
    console.log(qty || 1);   // 1 — the user's 0 has been thrown away

The \`??\` operator (in Modern JavaScript) fixes exactly this.

## Common mistakes

- Adding numbers read from inputs and getting \`'1020'\`.
- Writing \`if (x == true)\`, which is false for \`2\`.
- Using \`||\` for a default when 0 is a valid value.`,
    mcqs: [
      mcq("What does console.log('5' + 3, '5' - 3) print?",
        [['53 2', true], ['8 2', false], ['53 NaN', false], ['8 8', false]],
        '+ with a string operand concatenates, giving "53". - has no string meaning, so "5" is converted to 5 and the result is 2.'),
      mcq("What does console.log(0 || 'none', 0 && 'none') print?",
        [['none 0', true], ['true false', false], ['0 none', false], ['none none', false]],
        '|| returns the first truthy operand ("none"); && returns the first falsy operand (0). Neither returns a boolean.'),
      mcq('Which of these values is truthy?',
        [["'0' (a string holding zero)", true], ['0', false], ["'' (an empty string)", false], ['NaN', false]],
        'Only the eight falsy values are falsy. A non-empty string is truthy whatever it contains, so "0" is truthy while 0, "" and NaN are falsy.'),
    ],
    checkpoint: [
      ck('JS_BASICS', 'const qty = 0; const shown = qty || 1; A user ordered zero items on purpose. What is shown, and why is it wrong?',
        [['1 — || treats 0 as falsy and replaces it', true],
          ['0 — || keeps any number it is given', false],
          ['true — || always produces a boolean', false],
          ['undefined — 0 is not a valid operand', false]],
        '0 is falsy, so || moves on to 1. The deliberate zero is lost; qty ?? 1 would keep it, because ?? only replaces null and undefined.'),
      ck('JS_BASICS', 'What does console.log(null == undefined, null === undefined) print?',
        [['true false', true], ['false false', false], ['true true', false], ['false true', false]],
        'Loose equality treats null and undefined as equal to each other (and to nothing else); strict equality sees two different types.'),
      ck('JS_BASICS', 'Which expression correctly tests whether x holds NaN?',
        [['Number.isNaN(x)', true], ['x === NaN', false], ['x == NaN', false], ["typeof x === 'NaN'", false]],
        'NaN is not equal to anything, itself included, so both comparisons are always false; typeof NaN is "number". Number.isNaN is the reliable test.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_CONTROL_FLOW',
    notes: `Control flow is choosing which code runs and how many times. JavaScript's statements look
like C or Java's, with a few traps of their own.

## if / else

    const marks = 72;
    if (marks >= 90) {
      console.log('A');
    } else if (marks >= 60) {
      console.log('B');     // prints B
    } else {
      console.log('C');
    }

Order matters: the first true condition wins, so test the narrowest range first.

## switch, and fall-through

\`switch\` compares with \`===\`, and without \`break\` execution **falls through** into the next case:

    const day = 2;
    switch (day) {
      case 1: console.log('Mon');
      case 2: console.log('Tue');
      case 3: console.log('Wed'); break;
      default: console.log('?');
    }
    // prints Tue, then Wed

Fall-through is occasionally deliberate (several cases sharing one body) and usually a forgotten
\`break\`. Because of \`===\`, \`switch ('1')\` will not match \`case 1\`.

## Loops

    for (let i = 0; i < 3; i++) console.log(i);     // 0 1 2

    let n = 100;
    while (n > 1) n = Math.floor(n / 10);           // runs until the condition fails

    let tries = 0;
    do { tries++; } while (tries < 0);              // body runs once even though the test is false

Pick by what you know: a count → \`for\`; a condition → \`while\`; at least one pass → \`do...while\`.

## for...of versus for...in

    const fruits = ['apple', 'mango'];
    for (const f of fruits) console.log(f);   // apple, mango   — the VALUES
    for (const k in fruits) console.log(k);   // '0', '1'       — the KEYS, as strings

\`for...of\` is for arrays, strings and other iterables. \`for...in\` walks an object's property
names; using it on an array gives you string indexes, which is almost never what you wanted.

## break and continue

\`break\` leaves the loop; \`continue\` skips to the next pass. Neither works inside a
\`forEach\` callback — a \`return\` there only ends that one callback, so when you need to stop
early use a \`for...of\` loop.

## Common mistakes

- \`i <= arr.length\` instead of \`i < arr.length\`: one pass too many, reading \`undefined\`.
- A \`while\` whose condition never changes inside the body: an infinite loop.
- A missing \`break\` in a switch.`,
    mcqs: [
      mcq('In the switch above with day = 2, where case 2 has no break, what is printed?',
        [['Tue, then Wed', true], ['Tue only', false], ['Tue, Wed, then ?', false], ['Mon, Tue, then Wed', false]],
        'Execution starts at the matching case and falls through until a break: case 2 prints Tue, case 3 prints Wed and breaks before default.'),
      mcq("What values does x take in for (const x in ['a', 'b'])?",
        [["The strings '0' and '1'", true], ["The strings 'a' and 'b'", false], ['The numbers 0 and 1', false], ['None; for...in skips arrays', false]],
        'for...in iterates property names, and array indexes are property names stored as strings. for...of would give the values.'),
      mcq('How many times does for (let i = 0; i <= 5; i++) run its body?',
        [['6', true], ['5', false], ['4', false], ['Forever', false]],
        'i takes 0, 1, 2, 3, 4 and 5 — six values — because <= includes 5. This is the classic off-by-one when looping over an array.'),
    ],
    checkpoint: [
      ck('JS_BASICS', "switch ('1') { case 1: console.log('number'); break; default: console.log('other'); } What prints?",
        [['other, because switch matches with ===', true],
          ["number, because '1' is coerced to 1", false],
          ['Both, since there is no break after default', false],
          ['Nothing; switch rejects a string value', false]],
        'switch uses strict equality, and the string "1" is not === the number 1, so control goes to default.'),
      ck('JS_BASICS', 'let n = 10, steps = 0; while (n > 1) { n = n / 2; steps++; } What is steps afterwards?',
        [['4', true], ['3', false], ['5', false], ['10', false]],
        'n goes 10 → 5 → 2.5 → 1.25 → 0.625. Four halvings, and only then is n > 1 false.'),
      ck('JS_BASICS', 'You must stop scanning a list at the first negative number. Inside a for...of loop, what do you use?',
        [['break, which leaves the loop at once', true],
          ['continue, which skips to the next item', false],
          ['a return inside an array.forEach callback', false],
          ['Setting the loop variable to the last index', false]],
        'break exits the enclosing loop immediately. continue only skips one pass, and return in a forEach callback ends that callback, not the iteration.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_FUNCTIONS_SCOPE',
    notes: `A function is a named, reusable piece of work. In JavaScript functions are also values: they
can be stored in variables, passed to other functions and returned from them.

## Three ways to write one

    function add(a, b) { return a + b; }            // declaration
    const sub = function (a, b) { return a - b; };  // expression
    const mul = (a, b) => a * b;                    // arrow (Modern JavaScript)

The difference that matters now is **hoisting**. A declaration is available before the line it is
written on; an expression stored in \`const\` or \`let\` is not:

    console.log(add(1, 2));   // 3 — declarations are hoisted whole
    console.log(sub(5, 1));   // ReferenceError: Cannot access 'sub' before initialization

## Parameters and defaults

Missing arguments are \`undefined\`, not an error:

    function greet(name, greeting = 'Hello') {
      return greeting + ', ' + name;
    }
    console.log(greet('Asha'));          // 'Hello, Asha'
    console.log(greet('Asha', null));    // 'null, Asha' — defaults apply only to undefined
    console.log(greet());                // 'Hello, undefined'

## return

A function with no \`return\` (or a bare \`return;\`) gives back \`undefined\`. A very common bug is
computing the right value and forgetting to return it.

## Scope: who can see a variable

\`let\` and \`const\` are visible inside the block \`{ }\` they are declared in, and in blocks nested
inside it. A function can see its own variables and everything in the scopes around it — but not
the other way round:

    const tax = 0.18;
    function price(base) {
      const total = base + base * tax;   // reads tax from the outer scope
      return total;
    }
    console.log(price(100));   // 118
    console.log(total);        // ReferenceError — total lives inside price

A variable declared inside a function with the same name as an outer one **shadows** it: the
inner one is used, and the outer one is untouched.

## Closures

A function remembers the scope it was created in, even after the outer function has returned:

    function makeCounter() {
      let n = 0;
      return () => ++n;
    }
    const next = makeCounter();
    console.log(next(), next());   // 1 2

Each call to \`makeCounter\` creates a fresh \`n\`. This is how JavaScript keeps private state.

## Common mistakes

- Forgetting \`return\`, then getting \`undefined\`.
- Expecting a default parameter to replace \`null\`.
- Assigning to an undeclared name inside a function, silently creating a global in sloppy mode.`,
    workedExample: `**Goal: predict what this prints, without running it.**

    let level = 'outer';
    function show() {
      console.log(level);
    }
    function run() {
      let level = 'inner';
      show();
    }
    run();

The tempting answer is \`'inner'\`, because \`show\` is called from inside \`run\`. The correct answer
is \`'outer'\`. JavaScript scope is **lexical**: what a function can see is decided by where it is
*written*, not where it is *called*. \`show\` is written at the top level, so the only \`level\` it
can see is the outer one. \`run\`'s \`level\` is local to \`run\` and invisible to \`show\`.`,
    mcqs: [
      mcq('function f(a, b = 2) { return a + b; } What does console.log(f(1, undefined), f(1, null)) print?',
        [['3 1', true], ['3 3', false], ['NaN 1', false], ['3 NaN', false]],
        'Passing undefined triggers the default, so 1 + 2 = 3. null does not: b is null, and 1 + null is 1 because null converts to 0.'),
      mcq('A function body computes x * 2 but has no return statement. What does a call to it evaluate to?',
        [['undefined', true], ['The computed value', false], ['null', false], ['0', false]],
        'Without return, a function always gives back undefined; the computed value is discarded when the function ends.'),
      mcq('Which of these can be called on a line that comes BEFORE its definition?',
        [['A function declaration: function add() {}', true],
          ['A const expression: const add = function () {}', false],
          ['An arrow function assigned with let', false],
          ['None; JavaScript never allows it', false]],
        'Function declarations are hoisted with their body. const and let bindings exist but are uninitialised until their line runs (the temporal dead zone).'),
    ],
    checkpoint: [
      ck('JS_FUNCTIONS', 'let count = 1; function bump() { let count = 5; count++; } bump(); console.log(count); What prints?',
        [['1', true], ['6', false], ['2', false], ['5', false]],
        'The let inside bump declares a new local count that shadows the outer one; incrementing it has no effect on the outer variable.'),
      ck('JS_FUNCTIONS', 'Two counters come from makeCounter() (let n = 0; return () => ++n). After a(); a(); what does console.log(a(), b()) print?',
        [['3 1', true], ['3 3', false], ['1 1', false], ['4 2', false]],
        'Every call to makeCounter creates its own n, captured by its own closure. a has been called three times by then; b only once.'),
      ck('JS_FUNCTIONS', 'if (true) { var x = 1; let y = 2; } console.log(typeof x, typeof y); What prints?',
        [['number undefined', true], ['number number', false], ['undefined undefined', false], ['ReferenceError', false]],
        'var ignores block scope, so x is visible outside. y is block-scoped and does not exist outside; typeof of an undeclared name returns "undefined" rather than throwing.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_ARRAYS',
    notes: `An array is an ordered list. The methods split into two groups, and knowing which group a
method is in prevents most array bugs: **some change the array in place, some return a new one**.

## Methods that change the array (mutating)

    const a = [1, 2, 3];
    a.push(4);          // returns 4 (the new length);   a is [1, 2, 3, 4]
    a.pop();            // returns 4 (the removed item);  a is [1, 2, 3]
    a.unshift(0);       // returns 4 (new length);        a is [0, 1, 2, 3]
    a.shift();          // returns 0;                     a is [1, 2, 3]
    a.splice(1, 1);     // returns [2] (removed items);   a is [1, 3]
    a.reverse();        // a is [3, 1]
    a.sort();           // a is [1, 3]

Note what they return. \`const b = a.push(4)\` makes \`b\` a number, not an array.

## sort sorts text by default

    console.log([10, 9, 1].sort());                  // [ 1, 10, 9 ]
    console.log([10, 9, 1].sort((x, y) => x - y));   // [ 1, 9, 10 ]

Without a comparator, items are compared as strings, and '10' comes before '9'.

## Methods that return something new (non-mutating)

    const prices = [100, 250, 40];
    prices.slice(0, 2)               // [100, 250] — a copy of part of the array
    prices.map(p => p * 2)           // [200, 500, 80]
    prices.filter(p => p > 50)       // [100, 250]
    prices.find(p => p > 200)        // 250  — the first match, or undefined
    prices.findIndex(p => p > 999)   // -1
    prices.includes(40)              // true
    prices.reduce((sum, p) => sum + p, 0)   // 390

**map** turns each item into a new item: same length out as in. **filter** keeps the items whose
callback returns truthy. **find** stops at the first match. **reduce** folds the whole array into
one value; the second argument is the starting value, and you should always pass it — on an empty
array with no start value, \`reduce\` throws a TypeError.

## forEach returns nothing

    const doubled = [1, 2, 3].forEach(n => n * 2);
    console.log(doubled);   // undefined

forEach is for side effects (logging, saving). If you want a result, you want map, filter or reduce.

## The callback must return

    [1, 2, 3].map(n => { n * 2 });         // [undefined, undefined, undefined]
    [1, 2, 3].map(n => { return n * 2; }); // [2, 4, 6]

Braces after \`=>\` start a function body, and a body needs an explicit \`return\`.

## Common mistakes

- Sorting numbers without a comparator.
- Using splice when you meant slice, and destroying the original.
- Expecting \`find\` to return -1 (that is \`findIndex\`).`,
    workedExample: `**Goal: the total value of in-stock items, from an array of products.**

    const products = [
      { name: 'Pen', price: 10, stock: 5 },
      { name: 'Ink', price: 40, stock: 0 },
      { name: 'Pad', price: 25, stock: 2 },
    ];

Break it into the questions each method answers. *Which items?* — the ones in stock:
\`filter(p => p.stock > 0)\` keeps Pen and Pad. *What value does each contribute?* —
\`map(p => p.price * p.stock)\` turns them into \`[50, 50]\`. *What is the total?* —
\`reduce((sum, v) => sum + v, 0)\` gives \`100\`.

    const total = products
      .filter(p => p.stock > 0)
      .map(p => p.price * p.stock)
      .reduce((sum, v) => sum + v, 0);   // 100

None of these steps changed \`products\`. Each returned a new array for the next one to work on.`,
    mcqs: [
      mcq('What does console.log([1, 2, 3].push(4)) print?',
        [['4', true], ['[ 1, 2, 3, 4 ]', false], ['undefined', false], ['3', false]],
        'push mutates the array and returns its new length, not the array. Logging the array itself afterwards would show four items.'),
      mcq('What does console.log([10, 9, 1].sort()) print?',
        [['[ 1, 10, 9 ]', true], ['[ 1, 9, 10 ]', false], ['[ 10, 9, 1 ]', false], ['[ 9, 10, 1 ]', false]],
        'With no comparator, sort converts items to strings and compares them as text, and "10" sorts before "9". Pass (a, b) => a - b for numbers.'),
      mcq('const nums = [3, 8, 12]; const r = nums.find(n => n > 20); What is r?',
        [['undefined', true], ['-1', false], ['null', false], ['[]', false]],
        'find returns the first matching element or undefined when nothing matches. -1 is what findIndex returns.'),
    ],
    checkpoint: [
      ck('JS_ARRAYS_OBJECTS', 'const a = [1, 2, 3, 4]; const b = a.splice(1, 2); What are a and b afterwards?',
        [['a is [1, 4] and b is [2, 3]', true],
          ['a is [1, 2, 3, 4] and b is [2, 3]', false],
          ['a is [1, 4] and b is [1, 2]', false],
          ['a is [3, 4] and b is [1, 2]', false]],
        'splice(start, count) removes count items starting at index start from the original array and returns the removed items.'),
      ck('JS_ARRAYS_OBJECTS', 'What does [1, 2, 3, 4].reduce((sum, n) => sum + n, 10) return?',
        [['20', true], ['10', false], ['4', false], ['NaN', false]],
        'The accumulator starts at 10, the second argument, and each element is added: 10 + 1 + 2 + 3 + 4 = 20.'),
      ck('JS_ARRAYS_OBJECTS', 'You want every price doubled in a new array, with prices left unchanged. Which line does it?',
        [['const out = prices.map(p => p * 2);', true],
          ['const out = prices.forEach(p => p * 2);', false],
          ['const out = prices.map(p => { p * 2; });', false],
          ['const out = prices.filter(p => p * 2);', false]],
        'map returns a new array of the callback results. forEach returns undefined, the braced callback returns nothing, and filter only keeps or drops originals.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_OBJECTS_JSON',
    notes: `An object is a collection of named values (properties). Almost every piece of data a web
application handles — a user, an order, an API response — is an object.

## Reading and writing properties

    const user = { name: 'Asha', city: 'Pune', address: { pin: '411001' } };
    user.name             // 'Asha'
    user['city']          // 'Pune' — bracket form takes any expression
    const field = 'city';
    user[field]           // 'Pune' — the variable's VALUE is the key
    user.field            // undefined — looks for a property literally named "field"
    user.address.pin      // '411001'
    user.email            // undefined — a missing property is not an error
    user.phone.number     // TypeError: Cannot read properties of undefined (reading 'number')

Reading a missing property gives \`undefined\`. Reading a property **of** that \`undefined\` throws.
That error is the most common one in JavaScript.

    user.age = 30;        // add
    user.city = 'Delhi';  // change
    delete user.age;      // remove

## Looping over an object

    const stock = { pen: 5, ink: 0 };
    Object.keys(stock)      // [ 'pen', 'ink' ]
    Object.values(stock)    // [ 5, 0 ]
    Object.entries(stock)   // [ [ 'pen', 5 ], [ 'ink', 0 ] ]
    for (const [item, qty] of Object.entries(stock)) console.log(item, qty);

## Objects are held by reference

    const a = { n: 1 };
    const b = a;      // b is the SAME object, not a copy
    b.n = 2;
    console.log(a.n); // 2

Assigning or passing an object never copies it. Two variables, one object.

## JSON

JSON is a **text format** for data, borrowed from object syntax. Servers send it; you convert it.

    const text = JSON.stringify({ id: 1, tags: ['new'] });   // '{"id":1,"tags":["new"]}'
    const obj = JSON.parse(text);                            // back to an object

JSON is stricter than JavaScript: keys and strings must use **double quotes**, and there are no
comments, no trailing commas, no functions and no \`undefined\`.

    JSON.stringify({ a: 1, b: undefined, f() {} })   // '{"a":1}' — both silently dropped
    JSON.stringify([1, undefined])                   // '[1,null]' — in arrays they become null
    JSON.stringify({ d: new Date(0) })               // '{"d":"1970-01-01T00:00:00.000Z"}'
    JSON.parse("{'a': 1}")                           // SyntaxError — single quotes

A Date goes out as a string and comes back as a string, not a Date. And \`JSON.parse\` on bad text
**throws**, so wrap it in try/catch when the text comes from outside.

## Common mistakes

- \`obj.key\` when you meant \`obj[key]\`.
- Thinking \`const copy = original\` made a copy.
- Expecting dates and functions to survive a trip through JSON.`,
    mcqs: [
      mcq('What does JSON.stringify({ a: 1, b: undefined, c: () => 2 }) return?',
        [['\'{"a":1}\'', true], ['\'{"a":1,"b":null}\'', false], ['\'{"a":1,"c":2}\'', false], ['\'{"a":1,"b":null,"c":null}\'', false]],
        'JSON has no representation for undefined or functions, so JSON.stringify leaves those properties out of an object entirely.'),
      mcq("const key = 'city'; const o = { city: 'Pune' }; Which expression reads 'Pune' through the variable key?",
        [['o[key]', true], ['o.key', false], ["o['key']", false], ['o.[key]', false]],
        'Brackets evaluate the expression inside, so o[key] means o["city"]. o.key and o["key"] both look for a property literally named "key".'),
      mcq('const a = { n: 1 }; const b = a; b.n = 2; What does console.log(a.n) print?',
        [['2', true], ['1', false], ['undefined', false], ['TypeError', false]],
        'b = a copies the reference, not the object. Both names point to one object, so a change through b is seen through a.'),
    ],
    checkpoint: [
      ck('JS_ARRAYS_OBJECTS', `JSON.parse("{'name': 'Asha'}") is called on text from a file. What happens?`,
        [['It throws a SyntaxError; JSON needs double quotes', true],
          ["It returns the object { name: 'Asha' }", false],
          ['It returns the original string unchanged', false],
          ['It returns null because the text is invalid', false]],
        'JSON requires double-quoted keys and strings. JSON.parse throws on any invalid input rather than returning a fallback.'),
      ck('JS_ARRAYS_OBJECTS', 'What does Object.entries({ x: 1, y: 2 }) return?',
        [["[['x', 1], ['y', 2]]", true], ["['x', 'y']", false], ['[1, 2]', false], ['{ x: [1], y: [2] }', false]],
        'Object.entries returns an array of [key, value] pairs. Object.keys gives just the keys, Object.values just the values.'),
      ck('JS_ARRAYS_OBJECTS', "const order = { item: 'pen' }; console.log(order.customer.name); What happens?",
        [['It throws a TypeError', true], ['It prints undefined', false], ['It prints null', false], ['It throws a ReferenceError', false]],
        'order.customer is undefined, and reading .name of undefined throws "Cannot read properties of undefined". order itself exists, so it is not a ReferenceError.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_DEBUGGING',
    notes: `Debugging is finding the **cause**, then changing only that. Each snippet below is a bug
that reaches production regularly. Read it, predict the output, then read the diagnosis.

## 1. The sum that is a string

    const a = document.querySelector('#a').value;   // '10'
    const b = document.querySelector('#b').value;   // '20'
    console.log(a + b);                             // '1020'

**Diagnosis:** input values are always strings, and \`+\` with strings joins them. Log
\`typeof a\` — it says \`'string'\`. **Fix:** \`Number(a) + Number(b)\`.

## 2. The comparison that matches too much

    if (userInput == 0) showError('Enter a number');

An empty field gives \`''\`, and \`'' == 0\` is \`true\` — so is \`'  ' == 0\`. The check fires for
the wrong reason and hides the real problem. **Fix:** convert first, then use \`===\`.

## 3. var inside a loop with a callback

    for (var i = 0; i < 3; i++) {
      setTimeout(() => console.log(i), 0);
    }
    // prints 3, 3, 3

**Diagnosis:** \`var\` is function-scoped, so there is ONE \`i\` shared by all three callbacks, and
by the time they run the loop has finished and \`i\` is 3. **Fix:** \`let i\` — \`let\` creates a
fresh binding for every pass, and each callback closes over its own.

## 4. The function that changes its argument

    function topThree(list) {
      return list.sort((x, y) => y - x).slice(0, 3);
    }
    const scores = [40, 90, 70, 10];
    topThree(scores);
    console.log(scores);   // [ 90, 70, 40, 10 ] — the caller's array was reordered

**Diagnosis:** \`sort\` works in place. **Fix:** copy first: \`[...list].sort(...)\` or
\`list.slice().sort(...)\`.

## 5. Cannot read properties of undefined

    console.log(user.adress.city);
    // TypeError: Cannot read properties of undefined (reading 'city')

The message names the property it was trying to read — \`'city'\` — so the thing **before**
\`.city\` was undefined. Here it is a typo: the data says \`address\`. **Diagnosis:** log the
object one level up (\`console.log(user)\`) and compare the real keys with the ones you typed.

## 6. map that returns nothing

    const names = users.map(u => { u.name });   // [undefined, undefined]

Braces made it a function body with no \`return\`.

## How to work

1. **Read the error message and line number.** It usually names the exact property or variable.
2. **Check the type, not just the value.** \`console.log(x, typeof x)\` — \`'5'\` and \`5\` look the
   same in many consoles.
3. **Set a breakpoint** (the \`debugger;\` statement, or click the line number in DevTools) and step
   through, watching each variable change.
4. **Change one thing, then re-run.** If the bug moves, you have learned something; if you changed
   five things, you have learned nothing.`,
    mcqs: [
      mcq('for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); } What is logged, and what is the minimal fix?',
        [['3, 3, 3 — change var to let', true],
          ['0, 1, 2 — nothing is wrong here', false],
          ["3, 3, 3 — change setTimeout's delay to 1", false],
          ['0, 1, 2 — but only by luck of timing', false]],
        'All three callbacks share the single function-scoped var i, which is 3 when they run. let gives each iteration its own i.'),
      mcq("A total shows '1020' instead of 30 after total = a + b, where a and b came from two input boxes. What is the cause?",
        [['Input values are strings, so + joins them', true],
          ['The numbers overflowed and wrapped around', false],
          ['The + operator misbehaves on large values', false],
          ['b was undefined and became the text 20', false]],
        'An input element\'s value is always a string. + concatenates strings, so "10" + "20" is "1020"; convert with Number() first.'),
      mcq("TypeError: Cannot read properties of undefined (reading 'length') on user.adress.length. What do you check first?",
        [['Whether the property name matches the data', true],
          ['Whether length is a method needing brackets', false],
          ['Whether user should be declared with var', false],
          ['Whether the string is too long to measure', false]],
        'The error says the value before .length was undefined, so user.adress does not exist — most often a misspelled key (address).'),
      mcq('function top3(list) { return list.sort((a, b) => b - a).slice(0, 3); } After top3(scores), the scores table is in a new order. Why?',
        [['sort works in place, so scores itself was reordered', true],
          ["slice copies, but it also reorders the source array", false],
          ['The comparator b - a reverses every array it touches', false],
          ['Returning from a function always resorts its input', false]],
        'sort mutates the array it is called on, and list is the same array as scores. Copying first ([...list].sort) leaves the caller\'s data alone.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_PRACTICE',
    notes: `Six exercises. Write each one in the browser console or a .js file **before** reading the
solution, then run it on the test inputs given.

## 1. Count the vowels

Write \`countVowels(text)\` returning how many of a, e, i, o, u (either case) a string contains.
\`countVowels('JavaScript')\` → 3.

    function countVowels(text) {
      let count = 0;
      for (const ch of text.toLowerCase()) {
        if ('aeiou'.includes(ch)) count++;
      }
      return count;
    }

## 2. Largest number

Write \`largest(nums)\` without \`Math.max\`. Test it on \`[-5, -2, -9]\` — the answer is \`-2\`.

    function largest(nums) {
      let max = nums[0];            // NOT 0 — that breaks on all-negative input
      for (const n of nums) if (n > max) max = n;
      return max;
    }

## 3. Word frequency

\`frequency(['a', 'b', 'a'])\` → \`{ a: 2, b: 1 }\`.

    const frequency = words => words.reduce((acc, w) => {
      acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {});

## 4. Reverse a string

\`reverse('hello')\` → \`'olleh'\`. Strings have no \`reverse\`, but arrays do:

    const reverse = s => s.split('').reverse().join('');

## 5. Names of adult users

From \`[{ name: 'A', age: 17 }, { name: 'B', age: 21 }]\` produce \`['B']\`.

    const adults = users.filter(u => u.age >= 18).map(u => u.name);

## 6. FizzBuzz, correctly ordered

Print 1 to 15; multiples of 3 print Fizz, of 5 Buzz, of both FizzBuzz.

    for (let i = 1; i <= 15; i++) {
      if (i % 15 === 0) console.log('FizzBuzz');   // test the narrowest case FIRST
      else if (i % 3 === 0) console.log('Fizz');
      else if (i % 5 === 0) console.log('Buzz');
      else console.log(i);
    }

Check yourself: if you reached for a \`for\` loop with an index in exercises 3 and 5, rewrite them
with \`reduce\`, \`filter\` and \`map\`. Both styles are acceptable in an interview; being able to
switch between them is what is being tested.`,
    mcqs: [
      mcq('Which expression counts how many entries of words are longer than 4 characters?',
        [['words.filter(w => w.length > 4).length', true],
          ['words.map(w => w.length > 4).length', false],
          ['words.find(w => w.length > 4).length', false],
          ['words.forEach(w => w.length > 4).length', false]],
        'filter keeps only the matching words, so its length is the count. map keeps every word (as booleans), find returns one word, forEach returns undefined.'),
      mcq("What does 'hello'.split('').reverse().join('') return?",
        [["'olleh'", true], ["'hello'", false], ["['o', 'l', 'l', 'e', 'h']", false], ['undefined', false]],
        'split("") makes an array of characters, reverse reorders that array, and join("") glues it back into a single string.'),
      mcq("['a', 'b', 'a', 'c', 'a'].reduce((acc, w) => { acc[w] = (acc[w] || 0) + 1; return acc; }, {}) gives what?",
        [['{ a: 3, b: 1, c: 1 }', true], ['{ a: 1, b: 1, c: 1 }', false], ['[3, 1, 1]', false], ['5', false]],
        'The accumulator starts as {} and each word increments its own key; (acc[w] || 0) starts a new key at 0. a appears three times.'),
      mcq('A find-the-largest loop is tested with [-5, -2, -9]. Which starting value for max is the bug?',
        [['let max = 0;', true], ['let max = nums[0];', false], ['let max = -Infinity;', false], ['let max = nums.at(0);', false]],
        'Every number in the list is below 0, so a max starting at 0 is never replaced and the function returns 0, which is not in the list.'),
      mcq('What does [1, 2, 3, 4, 5].filter(n => n % 2).map(n => n * n) return?',
        [['[1, 9, 25]', true], ['[4, 16]', false], ['[1, 4, 9, 16, 25]', false], ['[1, 0, 1, 0, 1]', false]],
        'n % 2 is 1 (truthy) for odd numbers and 0 (falsy) for even ones, so filter keeps 1, 3 and 5, and map squares them.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every fresher JavaScript round. Practise saying the answers
aloud — the interviewer is judging the explanation, not just whether you know the output.

## Q1. "What is hoisting?"

**Model answer.** Before running a scope, JavaScript registers every declaration in it. Function
declarations are registered with their body, so they can be called before the line they appear on.
\`var\` variables are registered and set to \`undefined\`. \`let\` and \`const\` are registered too
but left **uninitialised**, so touching them before their line throws — that window is the
*temporal dead zone*.

    console.log(a);  // undefined
    var a = 5;

    console.log(b);  // ReferenceError: Cannot access 'b' before initialization
    let b = 5;

**Follow-up:** "So is let hoisted?" — Yes. If it were not, an outer \`b\` would be visible in that
line instead of an error. It is hoisted but not initialised.

## Q2. "What is the difference between == and ===?"

**Model answer.** \`===\` compares type and value with no conversion. \`==\` converts the operands to
a common type first, which produces results like \`0 == ''\` and \`[] == false\` both being true. I use
\`===\` everywhere, because the conversion rules are hard to keep in your head and a reader
should not have to.

**Follow-up:** "Is there any case where you would use ==?" — \`x == null\` is a known idiom that is
true for exactly null and undefined. Some teams allow that one case. And mention NaN: neither
operator finds it, because \`NaN === NaN\` is false; \`Number.isNaN\` does.

## Q3. "What is a closure? Give a real use."

**Model answer.** A closure is a function together with the variables from the scope it was
created in. The function keeps access to those variables even after the outer function has
returned.

    function makeRateLimiter(max) {
      let used = 0;
      return () => (used < max ? ++used : 'limit reached');
    }
    const tryCall = makeRateLimiter(2);
    tryCall(); tryCall(); console.log(tryCall());   // 'limit reached'

\`used\` cannot be reached from outside; only the returned function can change it. That is private
state without a class. Event handlers, \`setTimeout\` callbacks and React hooks all rely on closures.

**Follow-up:** "What does this print?" — the var-in-a-loop \`setTimeout\` example (3, 3, 3) and why
\`let\` fixes it: each iteration gets its own binding, so each callback closes over a different one.

A strong candidate adds one more line to every answer: **map vs forEach** is a favourite quick
follow-up — map returns a new array of results, forEach returns undefined and is for side effects.`,
    mcqs: [
      mcq('console.log(a); var a = 5; — what does the first line print?',
        [['undefined', true], ['5', false], ['ReferenceError', false], ['null', false]],
        'The var declaration is hoisted and initialised to undefined; the assignment of 5 only happens when its own line runs.'),
      mcq('console.log(b); let b = 5; — what happens on the first line?',
        [['A ReferenceError is thrown', true], ['It prints undefined', false], ['It prints 5', false], ['It prints null', false]],
        'let is hoisted but uninitialised until its declaration runs. Accessing it in that temporal dead zone throws a ReferenceError.'),
      mcq('An interviewer asks why [1, 2, 3].forEach(n => n * 2) gives back nothing useful. Which is the best answer?',
        [['forEach always returns undefined; map returns a new array', true],
          ['forEach discards return values only for numbers', false],
          ['forEach only works on arrays that hold objects', false],
          ['forEach runs asynchronously, so results come later', false]],
        'forEach exists for side effects and its return value is always undefined. map collects each callback result into a new array.'),
    ],
  },
  {
    unitCode: 'JT_JS_CORE_CHECKPOINT',
    notes: `Ten questions across the whole topic: values and operators, control flow, functions and
scope, arrays, objects and JSON. Each one is a short piece of code; trace it by hand before you
choose. Where a question asks what prints, the answer is what Node or a browser console would show.`,
    checkpoint: [
      ck('JS_BASICS', "What does console.log([] == false, [] ? 'yes' : 'no') print?",
        [['true yes', true], ['false yes', false], ['true no', false], ['false no', false]],
        '== converts [] to "" and then to 0, and false to 0, so they are loosely equal. But [] is an object, and every object is truthy, so the ternary picks "yes".'),
      ck('JS_BASICS', 'What does console.log(typeof typeof 1) print?',
        [['string', true], ['number', false], ['undefined', false], ['object', false]],
        'typeof 1 is the string "number", and typeof of any string is "string".'),
      ck('JS_BASICS', 'let i = 0; do { i++; } while (i < 0); console.log(i); What prints?',
        [['1', true], ['0', false], ['-1', false], ['Nothing; the loop never ends', false]],
        'A do...while runs its body once before testing the condition. i becomes 1, then i < 0 is false and the loop stops.'),
      ck('JS_FUNCTIONS', "sayHi(); const sayHi = function () { console.log('hi'); }; What happens?",
        [['A ReferenceError is thrown', true], ['hi is printed', false], ['undefined is printed', false], ['A TypeError: sayHi is not a function', false]],
        'Only the const binding is hoisted, and it is uninitialised until its line runs. With var it would be undefined and the call would be a TypeError instead.'),
      ck('JS_FUNCTIONS', 'const add = (a, b) => a + b; What does console.log(add(2)) print?',
        [['NaN', true], ['2', false], ['undefined', false], ['TypeError', false]],
        'The missing argument b is undefined, and 2 + undefined is NaN. JavaScript does not check how many arguments a function receives.'),
      ck('JS_FUNCTIONS', 'function multiplier(factor) { return n => n * factor; } const triple = multiplier(3); What is triple(5)?',
        [['15', true], ['8', false], ['NaN', false], ['5', false]],
        'The returned arrow function closes over factor = 3, which is still available when triple is called later. 5 * 3 = 15.'),
      ck('JS_ARRAYS_OBJECTS', 'const r = [1, 2, 3].map(n => { n * 2 }); What is r?',
        [['[undefined, undefined, undefined]', true],
          ['[2, 4, 6]', false],
          ['[1, 2, 3], unchanged because nothing returned', false],
          ['An empty array, since no callback returned', false]],
        'The braces make a function body with no return statement, so every callback returns undefined. map still produces one result per element.'),
      ck('JS_ARRAYS_OBJECTS', 'const o = { b: 1 }; delete o.b; What does console.log(Object.keys(o).length, o.b) print?',
        [['0 undefined', true], ['1 undefined', false], ['0 null', false], ['1 1', false]],
        'delete removes the property entirely, so there are no keys left, and reading a missing property gives undefined.'),
      ck('JS_ARRAYS_OBJECTS', 'After JSON.parse(JSON.stringify({ d: new Date(0) })), what does the d property hold?',
        [["A string like '1970-01-01T00:00:00.000Z'", true],
          ['A Date object equal to the original', false],
          ["The number 0, the date's timestamp", false],
          ['An empty object, since Date has no fields', false]],
        'JSON.stringify turns a Date into an ISO string, and JSON.parse has no way to know that string was a date, so it stays a string.'),
      ck('JS_ARRAYS_OBJECTS', 'const a = [1, 2, 3]; const b = a.slice(); b.push(4); What does console.log(a.length, b.length) print?',
        [['3 4', true], ['4 4', false], ['3 3', false], ['4 3', false]],
        'slice() with no arguments returns a new array with the same items, so pushing onto b leaves a untouched.'),
    ],
  },

  /* ══ JT_JS_ES6 — Modern JavaScript ═══════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JS_ES6_LET_CONST_ARROW',
    notes: `ES6 (2015) changed how JavaScript is written day to day. The first two changes you will
meet in every codebase are block-scoped declarations and arrow functions.

## let and const are block-scoped; var is not

    if (true) {
      var a = 1;
      let b = 2;
      const c = 3;
    }
    console.log(a);   // 1 — var leaks out of the block
    console.log(b);   // ReferenceError: b is not defined

\`var\` is scoped to the whole function and can be redeclared silently. \`let\` and \`const\` live
only in their \`{ }\` block, cannot be redeclared in the same scope, and throw if used before their
declaration (the temporal dead zone).

The rule most teams follow: **const by default, let when you must reassign, var never.**

## const is not "constant data"

    const cart = [];
    cart.push('pen');   // fine — the array changes
    cart = [];          // TypeError: Assignment to constant variable.

\`const\` means the **variable** cannot be pointed somewhere else. The object or array it holds can
still change. (\`Object.freeze\` is what stops changes, and only one level deep.)

## let in a loop gives every pass its own variable

    for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));   // 0 1 2

With \`var\` this prints 3, 3, 3; with \`let\`, each iteration has a separate \`i\`.

## Arrow functions

    function square(n) { return n * n; }
    const square2 = (n) => { return n * n; };
    const square3 = n => n * n;                 // one expression: implicit return
    const point = (x, y) => ({ x, y });         // returning an object: wrap it in ( )

Without the parentheses, \`() => { x: 1 }\` is a function body containing a label, and returns
\`undefined\`.

## What arrows change about this

An arrow function has **no \`this\` of its own**; it uses the \`this\` of the code around it. That
is exactly what you want in a callback inside a method:

    class Timer {
      constructor() { this.seconds = 0; }
      start() {
        setInterval(() => { this.seconds++; }, 1000);   // this is the Timer
      }
    }

and exactly what you do not want as an object's own method:

    const user = {
      name: 'Kit',
      hello: () => 'Hi ' + this.name,      // this is NOT user
      hi() { return 'Hi ' + this.name; },  // method shorthand: this is user
    };

Arrows also have no \`arguments\` object and cannot be used with \`new\`.

## Common mistakes

- An arrow as an object method or event handler that needs \`this\`.
- Forgetting the parentheses around a returned object literal.
- Using \`let\` for everything "just in case" — \`const\` tells the reader the value never moves.`,
    mcqs: [
      mcq('const make = () => { id: 1 }; What does console.log(make()) print?',
        [['undefined', true], ['{ id: 1 }', false], ['1', false], ['SyntaxError', false]],
        'The braces are read as a function body in which "id:" is a label, and the body has no return. Write () => ({ id: 1 }) to return an object.'),
      mcq("Why does hi: () => this.name inside an object literal not return that object's name?",
        [['Arrows take this from the enclosing scope, not obj', true],
          ['Arrow functions may not read object properties', false],
          ['this inside an arrow is always the global object', false],
          ['Object literals reject arrows unless they are named', false]],
        'An arrow function has no this binding of its own; it uses the this of the surrounding code, which is not the object being defined.'),
      mcq('Which declaration fits a value assigned once and never reassigned, such as an API base URL?',
        [['const', true], ['let', false], ['var', false], ['static', false]],
        'const signals to the reader and the engine that the binding will never be reassigned; reassigning it throws a TypeError.'),
    ],
    checkpoint: [
      mcq('for (let i = 0; i < 3; i++) { setTimeout(() => console.log(i)); } What is printed?',
        [['0, 1, 2', true], ['3, 3, 3', false], ['0, 0, 0', false], ['undefined three times', false]],
        'let creates a fresh i for every iteration, so each callback closes over its own value. With var all three would share one i and print 3.'),
      mcq('const nums = [1]; nums.push(2); nums = [3]; Which statement throws?',
        [['The third: it reassigns a const binding', true],
          ['The second: push on a const array', false],
          ['The first: const needs a primitive', false],
          ['None of them; const is only advisory', false]],
        'Mutating the array through push is allowed; making nums point at a new array is not, and throws "Assignment to constant variable".'),
      mcq('Which arrow function correctly returns the object { ok: true }?',
        [['() => ({ ok: true })', true], ['() => { ok: true }', false], ['() => [ok: true]', false], ['() => return { ok: true }', false]],
        'Parentheses make the braces an object literal expression, which the arrow returns implicitly. Bare braces are a function body.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_DESTRUCTURING_SPREAD',
    notes: `Destructuring pulls values out of objects and arrays into variables. Spread copies values
into a new object or array. Rest gathers "everything else". All three use syntax you will see in
every React component.

## Object destructuring

    const user = { name: 'Asha', city: 'Pune', role: undefined };
    const { name, city } = user;              // name = 'Asha', city = 'Pune'
    const { name: fullName } = user;          // rename: fullName = 'Asha'
    const { role = 'viewer' } = user;         // default: role = 'viewer'
    const { phone } = user;                   // missing: phone = undefined

Defaults apply only when the value is \`undefined\` — a \`null\` stays \`null\`.

Nested, with a default so a missing level does not throw:

    const { address: { pin } = {} } = user;   // pin = undefined, no error

In a function signature this is how props and options are read:

    function card({ title, size = 'md' } = {}) { return title + ':' + size; }
    card({ title: 'A' });   // 'A:md'
    card();                 // 'undefined:md' — the "= {}" stops a TypeError

## Array destructuring

    const [first, second] = ['p', 'q', 'r'];   // 'p', 'q'
    const [, , third] = ['p', 'q', 'r'];       // skip with commas: 'r'
    let a = 1, b = 2;
    [a, b] = [b, a];                           // swap: a = 2, b = 1

## Rest: collect what is left

    const { password, ...safe } = { id: 1, name: 'Kit', password: 'x' };
    console.log(safe);                // { id: 1, name: 'Kit' }
    const [head, ...tail] = [1, 2, 3];  // head = 1, tail = [2, 3]
    function sum(...nums) { return nums.reduce((s, n) => s + n, 0); }
    sum(1, 2, 3);                     // 6

## Spread: copy and merge

    const nums = [1, 2];
    const more = [...nums, 3];                 // [1, 2, 3]; nums unchanged
    const base = { theme: 'light', size: 12 };
    const prefs = { ...base, theme: 'dark' };  // { theme: 'dark', size: 12 }

When two sources share a key, **the later one wins**. Put your overrides last.

## Spread is a shallow copy

    const a = { tags: ['x'] };
    const b = { ...a };
    b.tags.push('y');
    console.log(a.tags);   // [ 'x', 'y' ] — the inner array is shared

Spread copies the top level only. Nested objects and arrays are still the same ones. For a deep
copy use \`structuredClone(a)\`, or spread each level you intend to change:

    const c = { ...a, tags: [...a.tags, 'z'] };

## Common mistakes

- Destructuring a parameter with no \`= {}\` default and calling the function with nothing.
- Putting the overrides before the spread: \`{ theme: 'dark', ...base }\` keeps \`'light'\`.
- Believing \`{ ...state }\` protects nested data.`,
    mcqs: [
      mcq('const { a, ...rest } = { a: 1, b: 2, c: 3 }; What does console.log(rest) print?',
        [['{ b: 2, c: 3 }', true], ['{ a: 1, b: 2, c: 3 }', false], ['[2, 3]', false], ['{ rest: [2, 3] }', false]],
        'Rest in object destructuring collects every property not already named into a new object; a has been taken out.'),
      mcq('const merged = { ...{ x: 1, y: 2 }, ...{ y: 9 } }; What is merged?',
        [['{ x: 1, y: 9 }', true], ['{ x: 1, y: 2 }', false], ['{ y: 9 }', false], ['{ x: 1, y: [2, 9] }', false]],
        'Properties are copied in order, and a later key with the same name overwrites the earlier one, so y ends up 9.'),
      mcq("const [first, , third = 'z'] = ['p', 'q']; What are first and third?",
        [["'p' and 'z'", true], ["'p' and undefined", false], ["'p' and 'q'", false], ["'q' and 'z'", false]],
        'The empty slot skips "q". There is no third element, so third is undefined and its default "z" applies.'),
    ],
    checkpoint: [
      mcq("const a = { tags: ['x'] }; const b = { ...a }; b.tags.push('y'); What does console.log(a.tags) print?",
        [["[ 'x', 'y' ]", true], ["[ 'x' ]", false], ["[ 'y' ]", false], ['undefined', false]],
        'Spread makes a shallow copy: b is a new object, but b.tags is the same array as a.tags, so the push shows through both.'),
      mcq("const { size = 'M' } = { size: null }; What is size?",
        [['null', true], ["'M'", false], ['undefined', false], ['A TypeError is thrown', false]],
        'Destructuring defaults are used only when the value is undefined. null is a real value, so it is kept.'),
      mcq('function sum(...nums) { return nums.length; } What does sum(4, 5, 6) return?',
        [['3', true], ['15', false], ['1', false], ['[4, 5, 6]', false]],
        'A rest parameter gathers all the arguments into a real array, [4, 5, 6], and its length is 3.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_MODULES',
    notes: `A module is a file with its own scope. Nothing in it is visible to other files unless it is
**exported**, and nothing from another file is visible unless it is **imported**. That is what lets
a large application be split into small files without names colliding.

## Named exports

    // math.js
    export const PI = 3.14159;
    export function area(r) { return PI * r * r; }

    // app.js
    import { PI, area } from './math.js';
    import { area as circleArea } from './math.js';   // rename on import
    import * as math from './math.js';                // every named export on one object
    console.log(math.area(2));

Named imports must match the exported name exactly — including case.

## Default export

A module may have **one** default export, imported without braces under any name:

    // Button.js
    export default function Button() { /* ... */ }

    // App.js
    import Button from './Button.js';
    import MyButton from './Button.js';   // same thing, different local name

Mix both in one line:

    import Button, { SIZES } from './Button.js';

The most common module bug is braces on the wrong one: \`import { Button } from './Button.js'\`
when Button is the default export. Native ES modules refuse to load ("does not provide an export
named 'Button'"); some bundlers give you \`undefined\` instead, which fails later and more
confusingly.

## How modules behave

- A module's top-level code runs **once**, the first time anything imports it. Every importer then
  shares that same instance — which is why a module-level variable acts like a singleton.
- Modules are always in strict mode.
- Imports are hoisted: they are processed before the module body runs.

## In the browser and in Node

    <script type="module" src="app.js"></script>

Without \`type="module"\`, the browser throws "Cannot use import statement outside a module". Node
uses ES modules for \`.mjs\` files or when package.json says \`"type": "module"\`; older Node code
uses CommonJS (\`require\` and \`module.exports\`), which you will still meet.

## Bundlers

In a React project, tools such as Vite or webpack follow every \`import\` from your entry file,
build the dependency graph, and join the modules into a few files the browser can load quickly.
They also drop exports nothing imports (tree-shaking) — another reason to prefer named exports for
utility files.

## Common mistakes

- Braces around a default import, or none around a named one.
- A typo in case: \`import { Slug }\` when the export is \`slug\`.
- Two modules importing each other (a cycle), so one sees the other half-initialised.`,
    mcqs: [
      mcq('math.js has export default function add() {} and export const PI = 3.14. Which import is correct?',
        [["import add, { PI } from './math.js';", true],
          ["import { add, PI } from './math.js';", false],
          ["import add, PI from './math.js';", false],
          ["import { default, PI } from './math.js';", false]],
        'The default export is imported without braces, and named exports inside braces; both can share one statement.'),
      mcq("Two different files both import './config.js'. How many times does config.js's top-level code run?",
        [['Once; the module is cached', true],
          ['Twice, once per importer', false],
          ['Once per function that uses it', false],
          ['Never, until something calls it', false]],
        'A module is evaluated a single time and every importer receives the same instance, so module-level state is shared.'),
      mcq("What does import * as utils from './utils.js' give you?",
        [['An object holding every named export of utils.js', true],
          ['Only the default export of utils.js', false],
          ["A copy of utils.js's source as plain text", false],
          ['Every export, added into the global scope', false]],
        'A namespace import gathers the module\'s exports as properties of one object, so you call utils.slug() and so on; nothing becomes global.'),
    ],
    checkpoint: [
      mcq("A page's console shows 'Cannot use import statement outside a module'. What is missing?",
        [['type="module" on the script tag', true],
          ['A default export in the imported file', false],
          ['A semicolon after the import line', false],
          ['The .mjs extension on the HTML page', false]],
        'A classic script cannot use import. Marking the script tag with type="module" makes the browser load it as an ES module.'),
      mcq("a.js has export const name = 'x'; and b.js writes import name from './a.js'. What goes wrong?",
        [['It fails: a.js has no default export to import', true],
          ['It works, because a lone export is the default', false],
          ['name becomes the whole module object instead', false],
          ['It works, but name is read-only in b.js', false]],
        'An import without braces asks for the default export. a.js only has a named export, so it must be imported as { name }.'),
      mcq('Which statement about named and default exports is accurate?',
        [['A module may have many named exports but one default', true],
          ['A module may have one named export but many defaults', false],
          ["Named exports must be imported under the file's name", false],
          ['Default exports cannot be functions or classes', false]],
        'Named exports are unlimited and imported by their exact names; there is at most one default, which the importer names freely.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_CLASSES',
    notes: `A class is a template for making objects that share behaviour. JavaScript added the
\`class\` keyword in ES6, but underneath it still uses **prototypes** — the class is a cleaner way
to write what the language always did.

## A class

    class Account {
      balance = 0;                       // field: every instance gets its own

      constructor(owner) {
        this.owner = owner;              // runs once per "new Account(...)"
      }

      deposit(amount) {                  // method: shared by all instances
        this.balance += amount;
        return this.balance;
      }

      get summary() {                    // getter: read like a property
        return this.owner + ': ' + this.balance;
      }

      static fromJson(data) {            // static: called on the class itself
        const acc = new Account(data.owner);
        acc.balance = data.balance;
        return acc;
      }
    }

    const acc = new Account('Asha');
    acc.deposit(500);
    console.log(acc.summary);            // 'Asha: 500' — no brackets for a getter
    Account.fromJson({ owner: 'Kit', balance: 10 });

## extends and super

    class Savings extends Account {
      constructor(owner, rate) {
        super(owner);                    // MUST run before using this
        this.rate = rate;
      }
      deposit(amount) {
        return super.deposit(amount * (1 + this.rate));   // call the parent's version
      }
    }

In a subclass constructor, touching \`this\` before \`super()\` throws a ReferenceError — the parent
has not built the object yet.

## What a prototype is

Methods are not copied into each object. They live once on \`Account.prototype\`, and every instance
links to it. When you call \`acc.deposit\`, JavaScript looks on \`acc\`, does not find it, and follows
the link to the prototype. \`Savings.prototype\` links on to \`Account.prototype\` — that chain is
inheritance.

    console.log(typeof Account);                                    // 'function'
    console.log(Object.getPrototypeOf(acc) === Account.prototype);  // true

## Losing this

    const dep = acc.deposit;
    dep(100);   // TypeError: Cannot read properties of undefined (reading 'balance')

A method takes \`this\` from how it is **called**. Pulled off its object and called bare, \`this\` is
\`undefined\` (class bodies are strict mode). Bind it (\`acc.deposit.bind(acc)\`) or wrap it
(\`x => acc.deposit(x)\`) when passing a method as a callback.

## Common mistakes

- Forgetting \`new\` — calling a class without it throws a TypeError.
- Using \`this\` before \`super()\`.
- Passing \`obj.method\` as a callback and losing \`this\`.
- Using a class before its declaration — classes are not usable before their line, like \`let\`.`,
    mcqs: [
      mcq('class A {} — what does console.log(typeof A) print?',
        [['function', true], ['class', false], ['object', false], ['undefined', false]],
        'A class is a special kind of constructor function; typeof reports "function". There is no "class" type.'),
      mcq('In a subclass constructor, this.x = 1 runs before super(). What happens?',
        [['A ReferenceError is thrown', true],
          ['It works; super can come anywhere', false],
          ['x is set, then wiped out by super()', false],
          ['A warning, but the object is built', false]],
        'In a derived class the object is created by the parent constructor, so this does not exist until super() has run; using it earlier throws.'),
      mcq("class Dog { speak() { return 'woof'; } } — where does speak live?",
        [['On Dog.prototype, shared by every dog', true],
          ['On each dog object, as its own copy', false],
          ['On Dog itself, as a static method', false],
          ['In a hidden global table of methods', false]],
        'Methods declared in a class body are placed once on the prototype; instances reach them through the prototype chain.'),
    ],
    checkpoint: [
      mcq("Animal's speak() returns this.name + ' makes a sound', and Cat extends Animal with speak() { return super.speak() + ' (meow)'; }. What does new Cat('Tom').speak() return?",
        [["'Tom makes a sound (meow)'", true], ["'Tom (meow)'", false], ["'undefined makes a sound (meow)'", false], ["'Tom makes a sound'", false]],
        'Cat inherits Animal\'s constructor, which sets name. super.speak() runs the parent method with the same this, and Cat appends its suffix.'),
      mcq('const c = new Counter(); const inc = c.increment; inc(); — increment does this.count++. What happens?',
        [['A TypeError, because this is undefined', true],
          ['c.count goes up by one as normal', false],
          ['A new global count variable is made', false],
          ['It quietly does nothing at all', false]],
        'Called without an object, a class method gets this = undefined (classes are strict mode), and reading count of undefined throws.'),
      mcq('Class User declares static create() {}. How is it called?',
        [['User.create()', true], ['new User().create()', false], ['User.prototype.create()', false], ['create()', false]],
        'Static methods belong to the class itself, not to its instances or prototype, so they are called on the class name.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_MODERN_SYNTAX',
    notes: `Three small pieces of syntax remove most string-building noise and most "Cannot read
properties of undefined" crashes.

## Template literals

Backticks instead of quotes. Expressions go inside \`\${ }\`, and line breaks are kept:

    const name = 'Asha', items = 3;
    const msg = \`Hi \${name}, you have \${items * 2} points\`;
    // 'Hi Asha, you have 6 points'

    const html = \`
      <li class="\${items > 0 ? 'full' : 'empty'}">\${name}</li>
    \`;

Any expression works inside \`\${ }\`, including function calls and ternaries. Ordinary quotes do not
interpolate: \`'Hi \${name}'\` is printed exactly as typed.

## Optional chaining: ?.

\`?.\` stops and returns \`undefined\` if the value on its left is \`null\` or \`undefined\`, instead of
throwing:

    const order = { customer: null };
    order.customer.name          // TypeError
    order.customer?.name         // undefined
    order.items?.[0]             // undefined — for indexes and computed keys
    order.onPaid?.()             // undefined — calls only if the function exists

The whole rest of the chain is skipped once it short-circuits, so
\`order.customer?.address.city\` is \`undefined\` too, without a crash on \`.city\`.

Use it where a value is **legitimately** optional. Sprinkled everywhere, it hides real bugs: a typo
like \`user?.adress?.city\` silently gives \`undefined\` rather than telling you what is wrong.

## Nullish coalescing: ??

\`a ?? b\` gives \`b\` only when \`a\` is \`null\` or \`undefined\`. \`||\` gives \`b\` whenever \`a\` is
**falsy** — and 0, '' and false are falsy:

    const settings = { volume: 0, title: '' };
    settings.volume || 50      // 50 — the user's 0 is lost
    settings.volume ?? 50      // 0
    settings.title ?? 'Untitled'   // ''
    settings.theme ?? 'light'      // 'light'

Together they make a safe read with a default:

    const city = user?.address?.city ?? 'Unknown';

There is also \`??=\`, which assigns only if the variable is currently null or undefined:
\`config.retries ??= 3\`.

## A syntax rule

\`??\` cannot be mixed directly with \`||\` or \`&&\`:

    const v = a || b ?? 'x';     // SyntaxError
    const v = (a || b) ?? 'x';   // fine — brackets say what you meant

## Common mistakes

- Using \`||\` for defaults where 0 or '' is valid input.
- Writing \`\${ }\` inside ordinary quotes.
- Covering a bug with \`?.\` instead of finding out why the value is missing.`,
    mcqs: [
      mcq('const user = {}; What does console.log(user.profile?.email) print?',
        [['undefined', true], ['null', false], ['TypeError', false], ["''", false]],
        'user.profile is undefined, so ?. stops there and the whole expression evaluates to undefined instead of throwing.'),
      mcq('What does console.log(0 ?? 5, 0 || 5) print?',
        [['0 5', true], ['5 5', false], ['0 0', false], ['5 0', false]],
        '?? replaces only null and undefined, so 0 is kept. || replaces every falsy value, and 0 is falsy, so it gives 5.'),
      mcq('const n = 3; What does console.log(`Total: ${n * 2}`) print?',
        [['Total: 6', true], ['Total: ${n * 2}', false], ['Total: n * 2', false], ['Total: 32', false]],
        'Inside backticks, ${ } evaluates the expression and inserts its value into the string, so n * 2 becomes 6.'),
    ],
    checkpoint: [
      mcq("let settings; const theme = settings?.theme ?? 'light'; What is theme?",
        [["'light'", true], ['undefined', false], ['A TypeError is thrown', false], ['null', false]],
        'settings is undefined, so settings?.theme short-circuits to undefined, and ?? then supplies the default "light".'),
      mcq("const api = {}; api.onDone?.('ok'); What happens?",
        [['Nothing; the call is skipped', true],
          ['TypeError: onDone is not a function', false],
          ['A default no-op function is called', false],
          ["'ok' is stored as api.onDone", false]],
        'With ?.() the call happens only if onDone is not null or undefined; here it is undefined, so the expression is undefined and nothing runs.'),
      mcq("const a = null || undefined ?? 'x'; What is the result?",
        [['A SyntaxError, without brackets', true],
          ["a is 'x', because ?? runs after ||", false],
          ['a is undefined, from the || on the left', false],
          ['a is null, because || stops at the first', false]],
        'The language forbids mixing ?? with || or && unless brackets make the order explicit, so this does not even parse.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_DEBUGGING',
    notes: `Modern syntax removes some bugs and introduces its own. These are the ones that show up in
React and Node code review.

## 1. Destructuring something that is not there

    function show({ name }) { return name; }
    show();
    // TypeError: Cannot destructure property 'name' of 'undefined' as it is undefined.

**Diagnosis:** the parameter was undefined, and you cannot destructure undefined. **Fix:** a
default for the whole parameter — \`function show({ name } = {})\`.

## 2. this inside a regular function callback

    class Clock {
      count = 0;
      start() {
        setTimeout(function () { this.count++; }, 100);   // this is not the Clock
      }
    }

A regular \`function\` gets its own \`this\` from how it is called, and \`setTimeout\` does not call it
on your object. **Fix:** an arrow function, which uses \`start\`'s \`this\`:
\`setTimeout(() => { this.count++; }, 100)\`.

The reverse bug — an arrow function as an object method — gives the wrong \`this\` for the same reason.

## 3. A "copy" that is not one

    const next = state;
    next.items.push(item);
    setState(next);   // React sees the same object and may not re-render

\`next = state\` copies the reference. Even \`{ ...state }\` only copies one level, so
\`next.items.push\` would still change the old array. **Fix:** build new objects down the path you
change: \`{ ...state, items: [...state.items, item] }\`.

## 4. Default vs named import

    // Button.js
    export default function Button() {}
    // App.js
    import { Button } from './Button';   // undefined, or a load error

**Fix:** \`import Button from './Button'\`. The reverse — no braces for a named export — fails the
same way. When an import is \`undefined\`, open the exporting file and look at how it exports.

## 5. ?. hiding a typo

    const city = user?.adress?.city ?? 'Unknown';   // always 'Unknown'

Nothing crashes, and the page shows "Unknown" for everybody. **Diagnosis:** log \`user\` and compare
the keys. Optional chaining should mark data that is genuinely optional, not paper over a name you
are unsure of.

## 6. Reassigning a const

    const total = 0;
    for (const p of prices) total += p;   // TypeError: Assignment to constant variable.

**Fix:** \`let total = 0;\` — or better, \`const total = prices.reduce((s, p) => s + p, 0);\`.

## The method

Read the message: modern errors are specific ("Cannot destructure property 'name' of
'undefined'"). Find the line, log the value **before** the failing operation, and fix the
cause — the missing default, the wrong import, the shared reference — rather than adding \`?.\` until
the error goes away.`,
    mcqs: [
      mcq('function show({ name }) {} is called as show(). What happens, and what is the fix?',
        [['TypeError; give the parameter a default: ({ name } = {})', true],
          ['name is undefined, which is fine and needs no change', false],
          ['SyntaxError at the call site; pass an empty string', false],
          ['name defaults to an empty string automatically', false]],
        'Destructuring undefined throws "Cannot destructure property". A default of {} for the whole parameter gives it something to destructure.'),
      mcq('A class method calls setTimeout(function () { this.count++; }, 100) and count never changes. What is the fix?',
        [['Use an arrow function so this stays the instance', true],
          ['Make count a static field on the class instead', false],
          ['Raise the delay so that this has time to bind', false],
          ['Declare count with const rather than with let', false]],
        'A regular function gets its own this from how setTimeout calls it. An arrow function inherits this from the method, which is the instance.'),
      mcq('const next = state; next.items.push(item); was meant to produce a changed copy. What is the bug?',
        [['next is the same object as state, so state was mutated', true],
          ['push cannot be called on an array held in a const', false],
          ['next must be declared with let before it can change', false],
          ['items is copied, but state itself is never copied', false]],
        'Assignment copies the reference only. Both names point to one object, so the push changed the original state.'),
      mcq("import { Button } from './Button' is undefined, and Button.js ends with export default Button. What is the fix?",
        [["import Button from './Button' — no braces", true],
          ['Add .default after Button at each use', false],
          ['Rename the file to button.js in lower case', false],
          ['Wrap the import in a try/catch block', false]],
        'Braces request a named export called Button, which does not exist. A default export is imported without braces.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_PRACTICE',
    notes: `Five exercises. Each is the shape of something you will write weekly in a React or Node
codebase. Do them without looking anything up, then compare.

## 1. Swap two variables

    let a = 1, b = 2;
    [a, b] = [b, a];
    console.log(a, b);   // 2 1

## 2. Add to a list without mutating it

    const items = [{ id: 1 }, { id: 2 }];
    const added = [...items, { id: 3 }];
    const removed = items.filter(i => i.id !== 1);
    const renamed = items.map(i => (i.id === 2 ? { ...i, name: 'two' } : i));

\`items\` is unchanged after all three. That is the rule React state depends on.

## 3. Update an object, keeping the rest

    const user = { name: 'Kit', age: 29, city: 'Pune' };
    const older = { ...user, age: 30 };
    console.log(user.age, older.age);   // 29 30

The override comes **after** the spread.

## 4. Pick fields from a response

    const toCard = ({ id, title }) => ({ id, title });
    toCard({ id: 1, title: 'A', body: 'long text' });   // { id: 1, title: 'A' }

Destructuring in the parameter list, shorthand properties in the returned object, and parentheses
so the braces are an object.

## 5. A function that takes any number of arguments

    const total = (...nums) => nums.reduce((sum, n) => sum + n, 0);
    total(1, 2, 3);   // 6
    total();          // 0 — the start value makes the empty case safe

## 6. Safe reads with a default

    const label = (u) => \`\${u?.name ?? 'Guest'} (\${u?.roles?.length ?? 0} roles)\`;
    label({ name: 'Asha', roles: ['admin'] });   // 'Asha (1 roles)'
    label(null);                                  // 'Guest (0 roles)'

Write each solution as an arrow function where it reads well, and use \`const\` for every variable
that is not reassigned. If you used \`let\` anywhere except exercise 1, ask why.`,
    mcqs: [
      mcq('Which line swaps the values of a and b without a temporary variable?',
        [['[a, b] = [b, a];', true], ['a, b = b, a;', false], ['({ a, b } = { b, a });', false], ['[a, b] = [a, b];', false]],
        'Array destructuring builds [b, a] first, then assigns its elements back to a and b. The object version keeps each name\'s own value.'),
      mcq('Which line adds { id: 4 } to items and leaves the original array unchanged?',
        [['const next = [...items, { id: 4 }];', true],
          ['const next = items.push({ id: 4 });', false],
          ['const next = items; next.push({ id: 4 });', false],
          ['const next = [items, { id: 4 }];', false]],
        'Spread copies the elements into a new array. push mutates items (and returns a number), and [items, x] nests the whole array.'),
      mcq('Which expression gives a copy of user with age set to 30, and user unchanged?',
        [['{ ...user, age: 30 }', true], ['{ age: 30, ...user }', false], ['Object.assign(user, { age: 30 })', false], ['(user.age = 30, user)', false]],
        'Later properties win, so the override must follow the spread. Object.assign onto user and direct assignment both mutate the original.'),
      mcq("const pick = ({ id, title }) => ({ id, title }); What does pick({ id: 1, title: 'A', body: 'x' }) return?",
        [["{ id: 1, title: 'A' }", true], ["{ id: 1, title: 'A', body: 'x' }", false], ['undefined', false], ["[1, 'A']", false]],
        'The parameter destructures only id and title, and the parenthesised object literal returns just those two properties.'),
      mcq('const total = (...n) => n.reduce((s, x) => s + x, 0); What does total() return?',
        [['0', true], ['undefined', false], ['NaN', false], ['A TypeError', false]],
        'With no arguments n is an empty array. reduce on an empty array returns the start value, 0, rather than throwing.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_INTERVIEW_QUESTION',
    notes: `Three questions that come up in nearly every frontend or full-stack interview once the basics
are done.

## Q1. "What is the difference between var, let and const?"

**Model answer.** \`var\` is function-scoped, can be redeclared, and is hoisted with the value
\`undefined\`. \`let\` and \`const\` are block-scoped, cannot be redeclared in the same scope, and are
in a temporal dead zone until their line runs, so using them early throws. \`const\` additionally
cannot be reassigned — but the object it holds can still be changed. I use \`const\` by default,
\`let\` when a value genuinely changes, and never \`var\`.

**Follow-up:** "Show me a bug var causes." — the loop with \`setTimeout\` printing 3, 3, 3, and
explain that \`let\` creates a new binding per iteration.

## Q2. "How is an arrow function different from a regular function?"

**Model answer.** Shorter syntax, and an implicit return for a single expression. The important
difference is \`this\`: an arrow function does not have its own; it uses the \`this\` of the scope it
was written in. It also has no \`arguments\` object and cannot be called with \`new\`.

**Follow-up:** "When would you not use one?" — as an object method or a prototype method that
needs \`this\` to be the object, and as a constructor. Where they shine is callbacks inside methods —
\`setTimeout\`, \`map\`, event handlers in a class — because they keep the method's \`this\`.

## Q3. "How do you copy an object? Is spread a deep copy?"

**Model answer.** \`{ ...obj }\` or \`Object.assign({}, obj)\` make a **shallow** copy: a new top-level
object, but nested objects and arrays are shared with the original.

    const a = { user: { name: 'Kit' } };
    const b = { ...a };
    b.user.name = 'Asha';
    console.log(a.user.name);   // 'Asha'

For a deep copy, \`structuredClone(obj)\` copies nested data (including Dates, Maps and Sets).
\`JSON.parse(JSON.stringify(obj))\` is the old trick and loses functions, \`undefined\` and Dates.

**Follow-up:** "Why does this matter in React?" — state must be replaced, not mutated, and React
compares references. If you change nested data in place, the reference is unchanged and the
component may not re-render. So you spread every level you change:
\`{ ...state, user: { ...state.user, name } }\`.

When you answer, give the rule, a three-line example, and the consequence. That order is what
separates "I have read about it" from "I have hit this bug".`,
    mcqs: [
      mcq('Which of these copies obj deeply, so its nested arrays are not shared?',
        [['structuredClone(obj)', true], ['{ ...obj }', false], ['Object.assign({}, obj)', false], ['Object.create(obj)', false]],
        'Spread and Object.assign copy only the top level. structuredClone recursively copies nested objects and arrays.'),
      mcq('An interviewer asks when NOT to use an arrow function. Which is a sound answer?',
        [['As an object method that needs this to be the object', true],
          ['As a callback passed to map or filter on an array', false],
          ['For a short one-line function with an implicit return', false],
          ['Inside a class method, as the setTimeout callback', false]],
        'Arrows take this from the surrounding scope, so as an object\'s own method this is not the object. The other three are where arrows are a good fit.'),
      mcq('typeof x appears on the line before let x = 1; in the same block. What happens?',
        [['Throws a ReferenceError', true], ["Returns 'undefined'", false], ["Returns 'number'", false], ["Returns 'object'", false]],
        'x is in its temporal dead zone, and even typeof — which is safe for undeclared names — throws for a let binding accessed before initialisation.'),
    ],
  },
  {
    unitCode: 'JT_JS_ES6_CHECKPOINT',
    notes: `Ten questions across modern JavaScript: let and const, arrow functions, destructuring,
spread and rest, modules, classes, template literals, optional chaining and ??. Each is a short
piece of code; work out the result before you look at the options.`,
    checkpoint: [
      mcq('const { data: { items = [] } = {} } = {}; What is items?',
        [['[]', true], ['undefined', false], ['A TypeError is thrown', false], ['null', false]],
        'data is missing, so its default {} is used; items is missing from that, so its default [] applies. Neither level throws.'),
      mcq('const nums = [5, 1, 4]; const sorted = [...nums].sort((a, b) => a - b); What does console.log(nums) print?',
        [['[ 5, 1, 4 ]', true], ['[ 1, 4, 5 ]', false], ['[ 5, 4, 1 ]', false], ['undefined', false]],
        'Spreading into a new array means sort reorders the copy; nums itself is never touched.'),
      mcq('const f = (x, ...rest) => rest; What does f(1) return?',
        [['[]', true], ['undefined', false], ['[1]', false], ['null', false]],
        'A rest parameter is always an array. 1 is taken by x, so rest collects nothing and is an empty array.'),
      mcq('class Temp { constructor(c) { this.c = c; } get f() { return this.c * 9 / 5 + 32; } } What is new Temp(100).f?',
        [['212', true], ['undefined', false], ['[Function: f]', false], ['A TypeError', false]],
        'A getter runs when the property is read, without brackets. 100 * 9 / 5 + 32 = 212.'),
      mcq("utils.js has export function slug() {} and app.js writes import { Slug } from './utils.js'. What is the result?",
        [['It fails: export names are case-sensitive', true],
          ['It works; import names ignore case', false],
          ['Slug is quietly imported as null', false],
          ['Slug becomes the default export', false]],
        'A named import must match the exported name exactly. slug and Slug are different names, so the module fails to link.'),
      mcq('const user = null; const msg = `Hi ${user?.name ?? "guest"}`; What is msg?',
        [['Hi guest', true], ['Hi null', false], ['Hi undefined', false], ['A TypeError is thrown', false]],
        'user?.name short-circuits to undefined because user is null, ?? replaces undefined with "guest", and the template inserts it.'),
      mcq('let x = 1; { let x = 2; } What does console.log(x) print afterwards?',
        [['1', true], ['2', false], ['undefined', false], ['A SyntaxError', false]],
        'The inner let declares a separate x that exists only inside its block; the outer x is never changed.'),
      mcq('const timer = { s: 0, start() { [1, 2].forEach(() => this.s++); } }; timer.start(); What is timer.s?',
        [['2', true], ['0', false], ['NaN', false], ['A TypeError', false]],
        'start is a method, so this is timer. The arrow callbacks inherit that this, and the counter is incremented once per element.'),
      mcq('const a = [1, [2, 3]]; const b = [...a]; b[1][0] = 9; What does console.log(a[1][0]) print?',
        [['9', true], ['2', false], ['undefined', false], ['3', false]],
        'Spread is shallow: b[1] is the same inner array as a[1], so changing an element through b changes it for a too.'),
      mcq("const sq = n => n * n; What does console.log([1, 2, 3].map(sq).join('-')) print?",
        [['1-4-9', true], ['1-2-3', false], ['2-4-6', false], ['149', false]],
        'The arrow function returns n * n implicitly, map applies it to every element, and join puts "-" between the results.'),
    ],
  },
];
