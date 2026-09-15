/**
 * Unit-specific content for the P5 pilot: HTML, Loops and Git.
 *
 * ── WHAT MAKES THIS DIFFERENT FROM THE 368 ROWS ALREADY IN THE LIBRARY ────────────────────
 *
 * Every existing row is topic-level: "HTML — from the start" serves all twelve HTML units
 * identically. These are written for ONE unit each and carry its unitCode, so a unit stops
 * inheriting and starts owning. That is the only thing that can lift a unit above PARTIAL.
 *
 * ── WHAT IS HERE AND WHAT IS NOT ──────────────────────────────────────────────────────────
 *
 * Notes, worked examples and practice are written out in full, because they are text and text can
 * be authored honestly. VIDEO IS NOT. A video asset needs a recording, and a row pointing at a
 * URL nobody has filmed would be exactly the filler this pilot is supposed to avoid — it would
 * raise a readiness number while teaching nobody. Video is reported as an authoring gap instead.
 *
 * Checkpoints are Quiz rows bound by unitCode, using the existing quiz engine. Nothing here
 * builds a second assessment mechanism.
 *
 * ── THE CONTENT IS TIED TO THE UNIT'S OWN OUTCOMES ────────────────────────────────────────
 *
 * Each bundle was written against the unit's title, learning outcomes and depth from the Year-1
 * dataset. "Repair an invalid document" is practice for Document Structure and would be filler
 * anywhere else; that specificity is the point of the exercise.
 */

export interface PilotMcq {
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface PilotCoding {
  title: string;
  description: string;
  starter: string;
  language: string;
  tests: { input: string; expectedOutput: string; isHidden?: boolean }[];
}

/**
 * A project brief, submitted against the existing Assignment engine.
 *
 * A PROJECT unit reaches READY only with something to submit to, and that is Assignment's job
 * — it already has submissions, grading, rubrics and deadlines. A Quiz cannot stand in: a
 * checkpoint measures recall, and a project is judged on what was built.
 */
export interface PilotAssignment {
  title: string;
  description: string;
  instructions: string;
  /** What "done" means, checked by a human or a rubric. */
  rubric: { criterion: string; description: string; maxPoints: number }[];
  totalPoints: number;
}

export interface PilotBundle {
  unitCode: string;
  /** Substance, not a summary. Rendered as the unit's notes. */
  notes: string;
  /** One problem solved in full, with the reasoning shown. */
  workedExample?: string;
  /** Theory practice. Real options and real explanations. */
  mcqs?: PilotMcq[];
  /** Code practice, where the unit is about writing code. */
  coding?: PilotCoding[];
  /** Questions for the bound checkpoint quiz. */
  checkpoint?: PilotMcq[];
  /** For PROJECT units: the brief, bound as an Assignment. */
  assignment?: PilotAssignment;
}

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * T_HTML — web learning
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export const HTML_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_HTML_INTRO',
    notes: `HTML is a **markup** language, not a programming language. It has no variables, no
conditions and no loops. Its entire job is to describe what the pieces of a document ARE: this is
a heading, this is a paragraph, this is a link.

A browser reads that description and decides how to present it. That split matters more than it
first appears — the same HTML is read aloud by a screen reader, rendered on a phone, and indexed
by a search engine, and each of them relies on you having said what things are rather than how
they should look.

An element is written as an opening tag, some content, and a closing tag:

    <p>This is a paragraph.</p>

A few elements have no content and therefore no closing tag — \`<img>\` and \`<br>\` among them.

Save a file as \`index.html\`, open it in a browser, and you are running HTML. There is no compiler
and no build step.`,
    workedExample: `**Goal: a page that says hello, written from nothing.**

Create \`index.html\` and type:

    <p>Hello.</p>

Open it in a browser. It works — browsers are forgiving and will render this. But it is not a
document yet; it is a fragment the browser has repaired on your behalf.

Now ask what is missing. The browser had to guess the character encoding, guess the language, and
invent the surrounding structure. Those guesses are usually right and occasionally wrong, and when
they are wrong the symptoms are strange: accented characters turn into question marks, or a screen
reader announces the page in the wrong language.

That is what Document Structure is for, and why it is the next unit rather than an optional extra.`,
    mcqs: [
      mcq('Why is HTML not a programming language?',
        [['It has no way to express logic — no conditions, loops or variables', true],
          ['It is too old a language to count as a programming one', false],
          ['It runs in a browser rather than on a server', false],
          ['It is not compiled, and a real language has to be compiled', false]],
        'Markup describes structure. Logic is what makes a language programmable, and HTML has none — which is why JavaScript exists alongside it.'),
      mcq('Which of these needs no closing tag?',
        [['<img>', true], ['<p>', false], ['<div>', false], ['<h1>', false]],
        '<img> is a void element: it has no content to wrap, so there is nothing for a closing tag to close.'),
      mcq('You describe a heading as a heading rather than as large bold text. Who benefits that you cannot see?',
        [['Screen-reader users, search engines and anything reading structure', true],
          ['Nobody at all, because the two render exactly the same way', false],
          ['Only mobile users, where the default sizes are different', false],
          ['The browser vendor, whose parser has less work to do', false]],
        'This is the whole argument for markup over styling. The visual result may be identical; the meaning is not, and several audiences consume only the meaning.'),
    ],
    checkpoint: [
      mcq('What does a browser do with HTML?',
        [['Reads a description of what the content is, and decides how to present it', true],
          ['Executes it line by line, the way an interpreter runs a program', false],
          ['Compiles it to machine code before the page can be displayed', false],
          ['Sends it back to the server, which returns the rendered page', false]],
        'The browser is the renderer. HTML supplies structure and meaning; presentation is the browser\'s decision, guided by CSS.'),
    ],
  },
  {
    unitCode: 'T_HTML_DOCUMENT_STRUCTURE',
    notes: `Every HTML document has the same skeleton, and it is short enough to memorise:

    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Page title</title>
      </head>
      <body>
        <!-- what the reader sees -->
      </body>
    </html>

**\`<!DOCTYPE html>\`** is not a tag. It tells the browser to use standards mode. Omit it and the
browser falls back to a compatibility mode that mimics browsers from the 1990s, and your layout
will be subtly wrong in ways that are very hard to diagnose.

**\`lang="en"\`** tells a screen reader which language to pronounce, and a translation tool what it
is translating from.

**\`<head>\`** holds information ABOUT the page. Nothing in it is rendered. **\`<body>\`** holds what
the reader sees. Confusing the two is the most common beginner error: content placed in \`<head>\`
simply does not appear, with no error message.

**\`<meta charset="utf-8">\`** must come early. Without it the browser guesses the encoding, and the
guess is what turns an apostrophe into \`â€™\`.`,
    workedExample: `**Goal: write the skeleton from memory, then justify every line.**

Start with nothing and add one line at a time, asking what breaks without it.

1. \`<!DOCTYPE html>\` — remove it, and the browser enters quirks mode. Box sizing changes. Your
   CSS stops behaving the way every tutorial says it should.
2. \`<html lang="en">\` — remove it, and a screen reader guesses. A French screen reader reading
   English is close to unintelligible.
3. \`<meta charset="utf-8">\` — remove it, then put a curly apostrophe in your text. Reload.
   Watch it become three characters of nonsense.
4. \`<title>\` — remove it, and the browser tab shows the file path. Every bookmark is unreadable
   and every search result has no headline.

None of these produces an error. That is exactly why they have to be learned rather than
discovered.`,
    mcqs: [
      mcq('Where does <title> belong?',
        [['In <head>', true], ['In <body>', false], ['Before <!DOCTYPE html>', false], ['Anywhere', false]],
        '<head> holds information about the document. The title is not page content — it names the document to the tab, the bookmark and the search result.'),
      mcq('You put a <p> inside <head>. What happens?',
        [['Browsers generally move it into <body>, and nothing warns you', true],
          ['The page fails to load, and the browser reports an error', false],
          ['A console error appears naming the misplaced element', false],
          ['It renders inside the browser tab beside the page title', false]],
        'HTML parsing is error-tolerant by design. The recovery is silent, which is why a structure error can survive a long time.'),
      mcq('What is the symptom of a missing charset declaration?',
        [['Accented characters and curly quotes render as nonsense', true],
          ['The page renders blank until the encoding is guessed right', false],
          ['The CSS fails to apply, because the file cannot be decoded', false],
          ['Links stop working, since the URLs cannot be decoded', false]],
        'Without a declaration the browser guesses. Guessing Latin-1 for a UTF-8 document is where "â€™" comes from.'),
    ],
    checkpoint: [
      mcq('Which line puts the browser into standards mode?',
        [['<!DOCTYPE html>', true], ['<html lang="en">', false], ['<meta charset="utf-8">', false], ['<head>', false]],
        'The doctype is the switch. Without it the browser emulates 1990s behaviour and your layout subtly misbehaves.'),
      mcq('What is <head> for?',
        [['Information about the document that the reader does not see', true],
          ['The top section of the page, above the main content', false],
          ['The navigation bar and anything else that appears first', false],
          ['The first heading of the page and the text beneath it', false]],
        '<head> is metadata. The visible top of a page is usually a <header>, which is a different element inside <body>.'),
    ],
  },
  {
    unitCode: 'T_HTML_TEXT_AND_HEADINGS',
    notes: `Headings run \`<h1>\` to \`<h6>\`, and the number is a **level**, not a size.

That distinction is the whole unit. \`<h3>\` does not mean "smaller than h2"; it means "a
subsection of the h2 above it". A screen reader user navigates a page by jumping between
headings, and a hierarchy that skips from \`<h1>\` to \`<h4>\` because h4 looked the right size
reads as a missing section.

Rules worth keeping:

- One \`<h1>\` per page: what this page is about.
- Never skip a level going down. h2 then h4 is a hole.
- Choose the level for meaning; choose the size in CSS.

\`<p>\` wraps a paragraph. Whitespace and line breaks in your source are collapsed — two blank
lines look identical to one space. Paragraphs are made by \`<p>\`, not by pressing Enter.

For emphasis, \`<strong>\` means important and \`<em>\` means stressed. \`<b>\` and \`<i>\` exist and
carry no meaning at all, which is why they are the wrong default.`,
    workedExample: `**Goal: mark up an article so its outline is correct.**

Given this text:

    Learning to Code
    Why start now
    Choosing a language
    Python
    JavaScript
    Staying motivated

Ask what is a subsection of what. "Python" and "JavaScript" are not siblings of "Choosing a
language" — they are examples inside it.

    <h1>Learning to Code</h1>
      <h2>Why start now</h2>
      <h2>Choosing a language</h2>
        <h3>Python</h3>
        <h3>JavaScript</h3>
      <h2>Staying motivated</h2>

Read only the headings back. It should sound like a table of contents. If it does not, the
hierarchy is wrong regardless of how the page looks.`,
    mcqs: [
      mcq('Why should a page have exactly one <h1>?',
        [['It names what the whole page is about; two would mean two subjects', true],
          ['Browsers render only the first one and ignore any others', false],
          ['The HTML specification requires exactly one per document', false],
          ['Search engines read the first and ignore all the others', false]],
        'The h1 is the document\'s title in its own outline. Two h1s describe a page with two topics, which is usually two pages.'),
      mcq('You want a small heading, so you use <h4> under an <h1>. What is wrong?',
        [['You chose a level for its size, leaving a hole in the outline', true],
          ['Nothing is wrong, provided the page looks the way you want', false],
          ['An `<h4>` may not follow an `<h1>` anywhere in a document', false],
          ['It breaks the CSS, which is written against heading levels', false]],
        'Level is meaning. Pick h2 and make it small in CSS — the visual result is identical and the outline stays intact.'),
      mcq('What is the difference between <strong> and <b>?',
        [['<strong> carries importance; <b> carries none', true],
          ['There is none; the two produce identical bold text', false],
          ['`<b>` is deprecated and kept only for older documents', false],
          ['`<strong>` renders in a heavier weight than `<b>` does', false]],
        'Both usually render bold. Only one tells a screen reader that the words matter.'),
    ],
    checkpoint: [
      mcq('An outline reads h1, h2, h4. What is the fault?',
        [['A level was skipped, so the h4 has no parent section', true],
          ['There are too many heading levels for one short document', false],
          ['The `<h4>` renders too small to be read as a section heading', false],
          ['Nothing; heading levels may be chosen for the size they render', false]],
        'Skipping a level leaves a gap in the structure that anybody navigating by headings will hear as a missing section.'),
    ],
  },
  {
    unitCode: 'T_HTML_PRACTICE',
    notes: `Practice for HTML is not "write more tags". It is reading a description and producing
markup whose STRUCTURE is right, then checking it the way a machine would.

Three habits worth building:

1. **Outline first.** Before typing, write the heading hierarchy. If it does not read like a
   table of contents, the markup will not be right however clean it looks.
2. **Validate.** The W3C validator catches unclosed tags and misnesting in seconds. A browser
   will silently repair both.
3. **Read it without CSS.** Disable styles. A well-structured page is still perfectly usable —
   headings, lists and links all still do their jobs. If it becomes an unreadable wall, the
   structure was doing nothing and the styling was doing everything.

**The exercises worth doing, in order.** Each takes ten minutes and each tests one habit.

- **Mark up a recipe.** Ingredients are a list; method steps are an ordered list; the title is
  the \`<h1>\`. The interesting decision is what the cooking time and serving count are — they
  are a small data table, not a paragraph, and noticing that is the whole exercise.
- **Mark up a news article you did not write.** You will want a \`<div>\` several times. Each
  time, ask what the thing IS before reaching for one: a byline, a pull quote, a caption, a
  section. Three of the four have an element already.
- **Take a page you built and delete every closing tag.** Load it. It probably still renders.
  Then validate it, and read the error list — that gap between "renders" and "valid" is the
  reason the validator exists.
- **Rewrite a page's headings without touching anything else** so the outline reads as a table
  of contents. If you cannot, the page has a structure problem the styling was hiding.

**How to tell you are finished.** Not "it looks right" — it looks right almost immediately.
Finished is: the validator is silent, the outline reads as a contents page, and with CSS off
it is plain and still completely usable.`,
    mcqs: [
      mcq('You disable CSS and the page becomes an unreadable wall of text. What does that tell you?',
        [['The structure was carrying no meaning — styling was doing all the work', true],
          ['The CSS has specificity conflicts that a rewrite would resolve', false],
          ['Nothing useful, because no real page is ever read without its CSS', false],
          ['The browser failed to apply the default user-agent stylesheet', false]],
        'This is the fastest structural test there is. Good markup degrades to a plain but usable document.'),
      mcq('A browser renders your page correctly despite an unclosed `<div>`. Is the markup fine?',
        [['No — the browser repaired it, and another tool may repair it differently', true],
          ['Yes, because rendering correctly is what the markup is judged on', false],
          ['Yes, because every browser implements the same recovery rules', false],
          ['Only if the page also renders identically with scripting off', false]],
        'Error recovery is per-implementation. Relying on it means relying on every consumer guessing the same way.'),
      mcq('Marking up a recipe, where do the cooking time and serving count belong?',
        [['A small table, because each is a labelled value rather than prose', true],
          ['A paragraph, because two facts are too few to justify a table', false],
          ['A definition list, because the labels are being defined by the values', false],
          ['A heading each, so that they stand out at the top of the page', false]],
        'Labelled values in rows are tabular data, and a table with a caption says so to a screen reader. Two rows is still a table; size is not the test.'),
      mcq('You reach for a `<div>` while marking up an article. What is the useful question?',
        [['What is this thing — a byline, a caption and a section each have an element', true],
          ['Whether the div needs a class name that describes what it contains', false],
          ['Whether a `<span>` would be the more appropriate wrapper to use here', false],
          ['Whether the surrounding element is already providing enough structure', false]],
        'A div says "no meaning here". That is occasionally true and usually means you have not yet asked what the thing is.'),
    ],
    checkpoint: [
      mcq('What is the first thing to produce when marking up an article?',
        [['The heading outline', true], ['The stylesheet', false], ['The images', false], ['The doctype', false]],
        'Structure first. Everything else hangs off a correct outline.'),
      mcq('The validator reports zero errors. What has that established?',
        [['That the syntax is well formed, and nothing at all about the meaning', true],
          ['That the page is accessible to a screen reader and to a keyboard', false],
          ['That every element on the page has been used for its intended purpose', false],
          ['That the page will render identically in every current browser', false]],
        'A perfectly valid page can have unlabelled inputs, empty alt on a meaningful image and headings chosen by size. Validity is syntax.'),
      mcq('Why practise on a page somebody else wrote rather than your own?',
        [['You have to read the content before you can decide what each part is', true],
          ['Other people write cleaner markup, which is easier to learn from', false],
          ['Your own pages are already familiar, so they take much less time', false],
          ['It avoids the temptation to fix the styling instead of the markup', false]],
        'On your own page you remember your intent and mark up the memory. On somebody else’s you have to work out what the thing IS, which is the actual skill.'),
    ],
  },

  /* ════════════════════════════════════════════════════════════════════════════════════════
   * T_LOOPS — coding and problem solving
   * ══════════════════════════════════════════════════════════════════════════════════════ */
];

export const LOOPS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_LOOPS_FOR_LOOPS',
    notes: `A \`for\` loop repeats once per item in a sequence. You do not manage a counter; the
loop does.

    for name in ["Asha", "Ben", "Cara"]:
        print(name)

Three lines, three names. The variable \`name\` is reassigned on each pass and is whatever the
current item is.

When you need numbers rather than items, \`range\` produces them:

    for i in range(5):        # 0, 1, 2, 3, 4
        print(i)

\`range(5)\` starts at 0 and STOPS BEFORE 5. That is the single most common source of off-by-one
errors, and the reason is worth knowing: it makes \`range(len(items))\` line up exactly with the
valid indexes of \`items\`.

Two forms cover almost everything:

    for item in items:            # when you need the values
    for i in range(len(items)):   # when you need the positions

Reach for the first unless you genuinely need the index.`,
    workedExample: `**Goal: total a list of prices, two ways, and see why one is better.**

By index:

    prices = [120, 45, 300]
    total = 0
    for i in range(len(prices)):
        total = total + prices[i]
    print(total)                  # 465

By item:

    prices = [120, 45, 300]
    total = 0
    for price in prices:
        total = total + price
    print(total)                  # 465

Both give 465. The second is better for a reason that is not style: it cannot produce an index
error. There is no index to get wrong. The first form invites \`range(len(prices) + 1)\`, or
\`prices[i + 1]\`, and both crash only for some inputs.

Use the index form when you genuinely need the position — comparing neighbours, or writing back
into the list. Otherwise the values are what you wanted.`,
    coding: [{
      title: 'Total a list of numbers',
      description: `Read a line of space-separated integers and print their total.

Example: input \`4 8 15\` prints \`27\`.

Use a for loop and an accumulator. Do not use \`sum()\` — the point is the loop.`,
      starter: 'nums = [int(x) for x in input().split()]\n\ntotal = 0\n# your loop here\n\nprint(total)\n',
      language: 'python',
      tests: [
        { input: '4 8 15', expectedOutput: '27' },
        { input: '10', expectedOutput: '10' },
        { input: '-5 5', expectedOutput: '0' },
        { input: '1 2 3 4 5 6 7 8 9 10', expectedOutput: '55', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('What does range(5) produce?',
        [['0, 1, 2, 3, 4', true], ['1, 2, 3, 4, 5', false], ['0, 1, 2, 3, 4, 5', false], ['5', false]],
        'It starts at 0 and stops BEFORE 5 — five values. This is what makes range(len(items)) match the valid indexes exactly.'),
      mcq('When is the index form genuinely the right choice?',
        [['When you need the position: comparing neighbours, or writing back', true],
          ['Always, because naming the index makes the intent explicit', false],
          ['When the list is long enough that the position matters', false],
          ['Never; iterating over the items directly is always clearer', false]],
        'If you only need values, indexing adds a variable that can be wrong and buys nothing.'),
    ],
    checkpoint: [
      mcq('`for i in range(len(items))` — what is `i` on the last pass?',
        [['len(items) - 1, the last valid index', true],
          ['len(items), which is the number of items in the list', false],
          ['1, since range counts down to the last index', false],
          ['It depends on what the list holds and how long it is', false]],
        'range stops before its argument, which is exactly why it lines up with valid indexes.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_ACCUMULATORS',
    notes: `Most loops you will ever write are accumulators: a variable declared **before** the
loop, updated **inside** it, and read **after** it.

    total = 0
    for n in numbers:
        total = total + n

Three shapes cover nearly all of them:

**Summing** — start at 0, add each item.
**Counting** — start at 0, add 1 when a condition holds.
**Collecting** — start with an empty list, append what you want to keep.

    evens = []
    for n in numbers:
        if n % 2 == 0:
            evens.append(n)

The mistake that costs the most time is declaring the accumulator **inside** the loop. It is then
reset on every pass, and the result is always whatever the last item produced — which looks
plausible and is wrong.

Starting values matter too. A sum starts at 0; a product must start at 1, because starting at 0
gives 0 forever.`,
    workedExample: `**Goal: count how many words are longer than four letters.**

    words = ["a", "tree", "banana", "sky", "elephant"]

Ask the three accumulator questions before writing anything.

1. What am I building? A count — so a number.
2. What does it start as? Zero. Nothing counted yet.
3. When does it change? When a word is longer than four letters.

    count = 0
    for word in words:
        if len(word) > 4:
            count = count + 1
    print(count)                  # 2

Check by hand: "banana" (6) and "elephant" (8). Two. "tree" is exactly 4, and \`>\` excludes it —
which is the kind of boundary worth checking deliberately rather than assuming.`,
    coding: [{
      title: 'Count the long words',
      description: `Read a line of space-separated words and print how many are longer than four
letters.

Example: \`a tree banana sky elephant\` prints \`2\`.

Watch the boundary: a word of exactly four letters does NOT count.`,
      starter: 'words = input().split()\n\ncount = 0\n# your loop here\n\nprint(count)\n',
      language: 'python',
      tests: [
        { input: 'a tree banana sky elephant', expectedOutput: '2' },
        { input: 'four five', expectedOutput: '1' },
        { input: 'to be or not to be', expectedOutput: '0' },
        { input: 'antidisestablishmentarianism', expectedOutput: '1', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('You declare `total = 0` inside the loop. What is printed after it?',
        [['Whatever the last item produced', true],
          ['The correct total of every item in the list', false],
          ['Zero, since the variable is reset on every pass', false],
          ['An error, because the name is redefined each time', false]],
        'It is reset every pass, so only the final iteration survives. The output looks plausible, which is why this one costs so much time.'),
      mcq('Why must a product accumulator start at 1?',
        [['Starting at 0 makes every multiplication 0', true],
          ['1 is the first counting number, so it is the natural start', false],
          ['It does not matter, because the first item overwrites it', false],
          ['To avoid a division error later in the calculation', false]],
        'Zero is the identity for addition; one is the identity for multiplication. Using the wrong one silently produces 0.'),
    ],
    checkpoint: [
      mcq('Where does an accumulator have to be declared?',
        [['Before the loop', true], ['Inside the loop', false], ['After the loop', false], ['Either works', false]],
        'Declared inside, it resets on every pass and the result is always the last iteration\'s.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_INFINITE_LOOPS',
    notes: `A \`while\` loop ends only when you make it end. There are exactly three ways it fails
to, and recognising which one you have is most of the fix.

**1. The variable never changes.**

    i = 0
    while i < 5:
        print(i)          # i is never incremented

**2. It changes in the wrong direction.**

    i = 10
    while i > 0:
        i = i + 1         # moving away from the exit

**3. It changes but can never satisfy the condition.**

    x = 1.0
    while x != 0:
        x = x / 2         # approaches 0, never equals it

The third is the nastiest: the logic looks correct. Floating-point values converge without
arriving, so \`!=\` can never become false. \`while x > 0.0001\` terminates; \`while x != 0\` does not.

**Diagnosis:** before running, name the variable the condition depends on, then find every line
that changes it. If there are none, it is case 1. If they move the wrong way, case 2. If they
approach without reaching, case 3.`,
    workedExample: `**Goal: fix a loop that never ends.**

    total = 0
    count = 1
    while count <= 10:
        total = total + count
    print(total)

The condition depends on \`count\`. Search the body for lines that change \`count\`: there are none.
Case 1.

The fix is one line, and where it goes matters:

    total = 0
    count = 1
    while count <= 10:
        total = total + count
        count = count + 1
    print(total)              # 55

Put \`count = count + 1\` FIRST and you get 54 — the loop adds 2 through 11 instead of 1 through
10. The loop now terminates either way, so the bug changes from a hang into a wrong number, which
is harder to notice and easier to ship.`,
    coding: [{
      title: 'Make it terminate — and be correct',
      description: `This loop never ends. Fix it so it prints the sum of 1 to n.

Read n from input. For n = 10 the answer is 55.

Be careful where you put the increment: one placement terminates but gives the wrong total.`,
      starter: 'n = int(input())\n\ntotal = 0\ncount = 1\nwhile count <= n:\n    total = total + count\n    # something is missing\n\nprint(total)\n',
      language: 'python',
      tests: [
        { input: '10', expectedOutput: '55' },
        { input: '1', expectedOutput: '1' },
        { input: '100', expectedOutput: '5050' },
        { input: '0', expectedOutput: '0', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('`while x != 0: x = x / 2` — why does this never end?',
        [['Halving approaches zero without reaching it, so != is never false', true],
          ['Division is slow, so the loop has not actually finished yet', false],
          ['`x` is not an integer, and floats cannot be compared at all', false],
          ['It does end eventually, once the value underflows to zero', false]],
        'A condition that requires exact equality with a converging value never fires. Use a threshold instead.'),
      mcq('What is the first diagnostic step for a loop that hangs?',
        [['Name the variable the condition depends on, then find what changes it', true],
          ['Add print statements throughout the body and read the output', false],
          ['Rewrite it as a for loop, which cannot run forever by accident', false],
          ['Reduce the iteration count until the loop finishes quickly', false]],
        'Three failure modes, one question. Answering it tells you which of the three you have.'),
    ],
    checkpoint: [
      mcq('A while loop terminates but the total is off by one iteration. What is the likely cause?',
        [['The counter is incremented before the work rather than after', true],
          ['The condition uses `<=` where it should have used `<`', false],
          ['The accumulator starts at 1 rather than at 0', false],
          ['Nothing is wrong; an off-by-one here is expected', false]],
        'Terminating but wrong is more dangerous than hanging: a hang is noticed immediately and a wrong number ships.'),
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * T_GIT — developer tooling
 * ════════════════════════════════════════════════════════════════════════════════════════ */

export const GIT_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_GIT_REPO_AND_COMMIT',
    notes: `A repository is a folder Git is watching. \`git init\` starts the watching and creates a
hidden \`.git\` directory holding the entire history.

Getting a change into that history takes **two** steps, and the two-step design is the part
people find odd:

    git add index.html        # stage: choose what goes in the next commit
    git commit -m "Add the landing page"

The staging area exists so a commit can be smaller than your working changes. You have fixed a
bug and renamed a variable and half-written a feature; staging lets you commit the bug fix alone.
A single-step system forces all-or-nothing commits, and the history becomes unreadable.

Three states a file can be in:

- **modified** — changed, not staged
- **staged** — marked for the next commit
- **committed** — safely in history

\`git add .\` stages everything changed, which is convenient and is how half-finished work ends up
in commits. Prefer naming files until that habit is automatic.`,
    workedExample: `**Goal: one change, one commit, verified at each step.**

    mkdir demo && cd demo
    git init

Create \`index.html\` with anything in it, then:

    git status

It reports \`index.html\` as untracked — Git can see it and is not yet watching it.

    git add index.html
    git status

Now \`Changes to be committed\`. It is staged, not saved.

    git commit -m "Add the landing page"
    git status

\`nothing to commit, working tree clean\`. The change is in history.

    git log --oneline

One line, one commit. Run \`git status\` after every command until the three states stop needing
thought — it is the cheapest habit in Git and it prevents most of the confusion.`,
    mcqs: [
      mcq('Why does Git separate staging from committing?',
        [['So a commit can contain less than everything you have changed', true],
          ['To make committing slower, and therefore more deliberate', false],
          ['To allow a commit to be undone before it is written', false],
          ['It is a historical accident from the earliest versions', false]],
        'Staging is what lets you commit the bug fix without the half-written feature sitting beside it.'),
      mcq('You edit a file and run `git commit -m "fix"`. What happens?',
        [['Nothing is committed — the change was never staged', true],
          ['The change is committed with the message you supplied', false],
          ['Git stages the change automatically as part of committing', false],
          ['An error stops the command before anything is recorded', false]],
        'Commit records the staging area. An unstaged change is invisible to it, and the output says "no changes added to commit".'),
      mcq('What does `git add .` risk?',
        [['Sweeping in half-finished work you did not mean to commit', true],
          ['Deleting untracked files that are not in the index yet', false],
          ['Committing immediately, without a message being written', false],
          ['Nothing; `git add .` stages only what you have changed', false]],
        'It is convenient and indiscriminate. Naming files is a habit worth having before the shortcut.'),
    ],
    checkpoint: [
      mcq('Which command shows which of the three states each file is in?',
        [['git status', true], ['git log', false], ['git diff', false], ['git show', false]],
        'status is the orientation command. Running it after every other command is the fastest way to build the mental model.'),
    ],
  },
  {
    unitCode: 'T_GIT_COMMIT_MESSAGES',
    notes: `The diff already records **what** changed, line by line, forever. A commit message that
repeats it adds nothing.

    git commit -m "Changed line 42 of auth.js"        # the diff said this
    git commit -m "Fix login failing for emails with a plus sign"

The second tells somebody in six months why the file looks the way it does — and that somebody is
usually you.

A workable shape:

- **First line, under ~50 characters**, in the imperative: "Fix", "Add", "Remove". It completes
  the sentence "If applied, this commit will…".
- **Blank line.**
- **Body, when the change is not obvious**: why this approach, what was rejected, what it breaks.

Messages worth avoiding, all real: \`fix\`, \`update\`, \`changes\`, \`asdf\`, \`final\`,
\`final2\`. Each is a note saying "I will remember what this was", written by somebody who did not.

The test: could a colleague read your last ten messages and follow the story of the work? If not,
the history is a list of timestamps.`,
    mcqs: [
      mcq('Why should a message say why rather than what?',
        [['The diff already records what, exactly and forever', true],
          ['The why is shorter to write than a description of the change', false],
          ['What changed is hard to describe accurately in one line', false],
          ['It is a convention, and reviewers have come to expect it', false]],
        'Anything the diff can tell you is wasted words. The reasoning is the part no tool can recover.'),
      mcq('Why the imperative mood?',
        [['It completes "If applied, this commit will…", matching Git\'s own generated messages', true],
          ['It is shorter than the past tense, which saves room in the log', false],
          ['Git rejects any other mood when the message is validated', false],
          ['The log sorts better when every message opens with a verb', false]],
        'Git writes "Merge branch..." and "Revert ..." itself. Matching it keeps the log in one voice.'),
    ],
    checkpoint: [
      mcq('Which is the better message?',
        [['Fix timezone offset applied twice on daily reports', true],
          ['Fixed bug in the reporting code that a user had complained about', false],
          ['Updated report.js and the two helper files it depends on', false],
          ['changes from this afternoon, mostly around the daily report', false]],
        'It names the symptom and the cause, so somebody hitting a related problem later can find it by searching.'),
    ],
  },
  {
    unitCode: 'T_GIT_CONFLICTS',
    notes: `A conflict happens when two branches change the **same lines** of the same file and Git
cannot tell which version is right. It is not an error and not a failure of the tool — it is Git
declining to guess.

What you get:

    <<<<<<< HEAD
    const timeout = 3000;
    =======
    const timeout = 5000;
    >>>>>>> feature/slow-network

- Between \`<<<<<<<\` and \`=======\` is **your** version (the branch you are on).
- Between \`=======\` and \`>>>>>>>\` is **theirs**.

Resolving means editing the file until it is correct, then removing all three markers. There is no
rule that says pick one — the right answer is often neither. Here it might be 4000, or a value
read from configuration.

    # edit the file
    git add config.js
    git commit

**The mistake that hurts:** committing with markers still in the file. It compiles in some
languages, passes review because the diff looks noisy anyway, and breaks at runtime.

Before committing a resolution, search the file for \`<<<<<<<\`. Always.`,
    workedExample: `**Goal: cause a conflict on purpose, then resolve it deliberately.**

    git switch -c feature
    # change line 1 of README.md to "Feature version"
    git commit -am "Feature wording"

    git switch main
    # change line 1 of README.md to "Main version"
    git commit -am "Main wording"

    git merge feature

Git stops:

    CONFLICT (content): Merge conflict in README.md

Open it. Both versions are there with markers between them. Decide what the line should actually
say — perhaps neither, perhaps a merge of both. Delete the markers. Then:

    grep -n "<<<<<<<" README.md      # must find nothing
    git add README.md
    git commit

Doing this once on purpose, on a file you do not care about, is worth far more than reading about
it. The first conflict on real work should not be the first conflict you have seen.`,
    mcqs: [
      mcq('Which section is your version?',
        [['Between <<<<<<< HEAD and =======', true],
          ['Between ======= and >>>>>>>', false],
          ['Above <<<<<<<', false],
          ['Below >>>>>>>', false]],
        'HEAD is where you are standing. The section below the ======= belongs to the branch being merged in.'),
      mcq('Must you pick one side or the other?',
        [['No — the correct result is often neither', true],
          ['Yes, exactly one of the two sides has to be chosen', false],
          ['Yes, and the newer of the two changes always wins', false],
          ['Yes, and HEAD is the side that should always be kept', false]],
        'Git shows both because it cannot decide. Resolving means making the file correct, which may mean writing something new.'),
      mcq('What is the check to run before committing a resolution?',
        [['Search the file for leftover conflict markers', true],
          ['Run the test suite and check that it still passes', false],
          ['Run `git status` and check nothing is still unmerged', false],
          ['Run `git diff` and read what the resolution produced', false]],
        'Markers left in a file compile in some languages and break at runtime. Tests matter too — but this one is the specific trap.'),
    ],
    checkpoint: [
      mcq('What causes a merge conflict?',
        [['Two branches changed the same lines of the same file', true],
          ['Two branches changed the same file in different places', false],
          ['One of the branches is out of date with its remote', false],
          ['A file was deleted on one branch and kept on the other', false]],
        'Different regions of one file merge cleanly. It takes an overlap on the same lines for Git to stop.'),
    ],
  },
];

export const PILOT_BUNDLES: PilotBundle[] = [...HTML_BUNDLES, ...LOOPS_BUNDLES, ...GIT_BUNDLES];

/** The three pilot topics, for reporting. */
export const PILOT_TOPICS = ['T_HTML', 'T_LOOPS', 'T_GIT'];
