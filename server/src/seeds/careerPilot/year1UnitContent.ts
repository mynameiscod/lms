/**
 * Unit-specific content for the Year-1 mega curriculum, beyond the P5 pilot.
 *
 * ── THE RULE THIS FILE IS WRITTEN AGAINST ─────────────────────────────────────────────────
 *
 * Every bundle here teaches its own unit's objective and would be wrong on any sibling. That is
 * not a style preference: the readiness ladder rewards a unit for owning content, and the cheap
 * way to satisfy it is one template copied twelve times with the name swapped. That produces
 * twelve READY units and one lesson, and the student meets it twelve times.
 *
 * `contentDuplicationService` exists to catch exactly that, and it runs over this file's output.
 * If a bundle below could be moved to a sibling unit without editing, it is wrong.
 *
 * ── WHAT IS DELIBERATELY ABSENT ───────────────────────────────────────────────────────────
 *
 * Video. It needs recording, and a row pointing at a URL nobody has filmed raises a readiness
 * number while teaching nobody. Foundation V1 does not require it for READY, and the gap is
 * reported rather than filled.
 */

import { PilotBundle, PilotMcq, PILOT_BUNDLES } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * T_HTML — the remaining eight
 * ════════════════════════════════════════════════════════════════════════════════════════ */

const HTML_REST: PilotBundle[] = [
  {
    unitCode: 'T_HTML_LINKS',
    notes: `A link is an anchor with an \`href\`:

    <a href="about.html">About us</a>

The text between the tags is what a reader clicks and what a screen reader announces. "Click
here" announced out of context tells somebody nothing; **the link text should describe the
destination**.

**Relative paths** are resolved from the current page:

    about.html          same folder
    pages/about.html    into a subfolder
    ../index.html       up one folder

**Absolute paths** start from the site root (\`/about.html\`) or name the whole address
(\`https://example.com\`).

The rule that saves the most time: a relative path breaks when the page MOVES, and an absolute
path breaks when the SITE moves. Use relative inside your own site, absolute for anywhere else.

Linking within a page needs an id on the target and a \`#\` in the href:

    <h2 id="pricing">Pricing</h2>
    <a href="#pricing">Jump to pricing</a>`,
    workedExample: `**Goal: link three pages that live in different folders, and get the paths right.**

    site/
      index.html
      pages/about.html
      pages/contact.html

From \`index.html\` to \`about.html\` — down one folder:

    <a href="pages/about.html">About</a>

From \`about.html\` back to \`index.html\` — up one folder:

    <a href="../index.html">Home</a>

From \`about.html\` to \`contact.html\` — same folder, so just the name:

    <a href="contact.html">Contact</a>

The mistake to expect is \`<a href="pages/contact.html">\` written from inside \`pages/\`. It
resolves to \`pages/pages/contact.html\`, the browser reports 404, and the path LOOKS right
because it matches what you see in the file tree. Relative means relative to the page you are
standing on, not to the root.`,
    mcqs: [
      mcq('From `pages/about.html`, which href reaches `index.html` at the site root?',
        [['../index.html', true], ['index.html', false], ['pages/index.html', false], ['./index.html', false]],
        '`..` goes up one folder. Without it the browser looks for pages/index.html, which does not exist.'),
      mcq('Why is "Click here" poor link text?',
        [['Announced out of context it says nothing about the destination', true],
          ['It is too short', false], ['Search engines ban it', false], ['It is not valid HTML', false]],
        'Screen-reader users often navigate by listing links alone. A list of twelve "click here" entries is unusable.'),
      mcq('When does a relative path break?',
        [['When the page containing it moves', true],
          ['When the site moves to a new domain', false],
          ['Never', false], ['When the target is renamed only', false]],
        'Relative resolves from the current page, so moving that page changes what it resolves to. Absolute breaks on the opposite event.'),
    ],
    checkpoint: [
      mcq('What does `<a href="#pricing">` require to work?',
        [['An element on the page with id="pricing"', true],
          ['A file called pricing.html', false],
          ['A pricing section anywhere on the site', false],
          ['Nothing else', false]],
        'The hash names an id within the current document. Without a matching id the browser has nowhere to jump to.'),
    ],
  },
  {
    unitCode: 'T_HTML_IMAGES',
    notes: `An image is a void element with two attributes that matter:

    <img src="logo.png" alt="CodeBegun logo">

\`src\` is where the file is. \`alt\` is what the image SAYS, for anybody who cannot see it — a
screen-reader user, somebody on a failed connection, a search engine.

**Writing alt text well** is the whole unit:

- Describe the information, not the picture. \`alt="Bar chart: sales doubled in Q3"\` beats
  \`alt="chart"\`.
- Do not start with "Image of" — the screen reader already said it is an image.
- A **decorative** image takes \`alt=""\` — empty, but present. That tells assistive tech to skip
  it. Omitting \`alt\` entirely makes it read the filename instead, which is worse than silence.

**Sizing.** Set \`width\` and \`height\` attributes even when CSS controls the display size. The
browser then reserves the right space before the file arrives, and the page stops jumping as
images load.`,
    workedExample: `**Goal: write alt text for three images that need three different answers.**

**1. A photo of a student at a laptop, next to an article about learning to code.**

    <img src="student.jpg" alt="">

Empty. The photo illustrates a mood; it carries no information the text does not. Announcing it
interrupts without adding.

**2. A screenshot of an error message the article is discussing.**

    <img src="error.png" alt="Terminal showing: ModuleNotFoundError: No module named 'requests'">

The error text IS the information. Anybody who cannot see the screenshot needs the words.

**3. A logo that links to the homepage.**

    <a href="/"><img src="logo.png" alt="CodeBegun home"></a>

The alt describes the LINK's destination, not the picture. "CodeBegun logo" would leave a
screen-reader user hearing a link whose purpose is unstated.

Same element, three different right answers, decided by what the image is doing.`,
    mcqs: [
      mcq('A purely decorative image should have:',
        [['alt="" — empty but present', true],
          ['no alt attribute', false],
          ['alt="decorative image"', false],
          ['alt describing the picture', false]],
        'Empty alt tells assistive tech to skip it. Omitting alt makes many readers announce the filename instead.'),
      mcq('Why set width and height even when CSS sizes the image?',
        [['The browser reserves the space before the file loads, so the page stops jumping', true],
          ['CSS cannot size images', false],
          ['It is required', false],
          ['It makes images load faster', false]],
        'Without dimensions the image occupies zero space until it arrives, and everything below it shifts when it does.'),
      mcq('An image is a logo inside a link to the homepage. What should alt say?',
        [['Where the link goes, e.g. "CodeBegun home"', true],
          ['"CodeBegun logo"', false], ['""', false], ['"Image of a logo"', false]],
        'When an image is the only content of a link, its alt becomes the link text. It must describe the destination.'),
    ],
    checkpoint: [
      mcq('What is alt text FOR?',
        [['Conveying what the image says to anybody who cannot see it', true],
          ['Search engine ranking', false],
          ['A caption under the image', false],
          ['A tooltip on hover', false]],
        'Its audience is people who are not seeing the image. Everything else it does is a side effect.'),
    ],
  },
  {
    unitCode: 'T_HTML_LISTS',
    notes: `Three list types, and the choice between them is meaning rather than appearance.

**\`<ul>\` — unordered.** The order does not matter. Ingredients, features, links.

    <ul>
      <li>Milk</li>
      <li>Eggs</li>
    </ul>

**\`<ol>\` — ordered.** The order IS the information. Steps, rankings, instructions. Reordering
the items changes what it means.

**\`<dl>\` — description list.** Term and definition, in pairs.

    <dl>
      <dt>HTML</dt>
      <dd>Describes structure</dd>
      <dt>CSS</dt>
      <dd>Describes presentation</dd>
    </dl>

Only \`<li>\` may be a direct child of \`<ul>\` or \`<ol>\`. Loose text between items is invalid and
browsers relocate it unpredictably.

**Nesting** goes INSIDE an \`<li>\`, not between two:

    <li>Fruit
      <ul><li>Apple</li></ul>
    </li>

Getting that wrong is the commonest list error, and it renders almost correctly, which is why it
survives.`,
    mcqs: [
      mcq('You are marking up a recipe method. Which list?',
        [['<ol> — the order is the information', true],
          ['<ul>', false], ['<dl>', false], ['Paragraphs', false]],
        'Reordering the steps changes the recipe. That is the definition of ordered.'),
      mcq('Where does a nested list belong?',
        [['Inside the <li> it belongs to', true],
          ['Between two <li> elements', false],
          ['After the closing </ul>', false],
          ['Anywhere inside the parent list', false]],
        'A nested list is part of its parent item. Placed between items it is invalid, and the near-correct rendering is why it goes unnoticed.'),
      mcq('What is <dl> for?',
        [['Pairs of terms and their descriptions', true],
          ['Any list with two columns', false],
          ['A list that should not be bulleted', false],
          ['Deprecated lists', false]],
        'It exists for term/definition pairs — glossaries, metadata, key-value content.'),
    ],
    checkpoint: [
      mcq('A navigation menu should be marked up as:',
        [['A <ul> of links — order carries no meaning', true],
          ['An <ol>', false], ['A series of <div>s', false], ['A <dl>', false]],
        'Menu items are a set, not a sequence. The list also tells a screen reader how many items there are before reading them.'),
    ],
  },
  {
    unitCode: 'T_HTML_TABLES',
    notes: `A table marks up **data with two dimensions** — rows that mean something and columns
that mean something. It is not a layout tool; CSS Grid does layout, and a table used for layout
reads as nonsense to a screen reader.

    <table>
      <caption>Q3 revenue by region</caption>
      <thead>
        <tr><th scope="col">Region</th><th scope="col">Revenue</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row">North</th><td>£42,000</td></tr>
      </tbody>
    </table>

The parts that carry the meaning:

- **\`<th>\` versus \`<td>\`** — a header versus a value. A screen reader reads the relevant
  headers before each cell, so a table of \`<td>\` alone is a grid of numbers with no labels.
- **\`scope="col"\` / \`scope="row"\`** — which direction a header governs. This is what lets
  "£42,000" be announced as "North, Revenue, £42,000".
- **\`<caption>\`** — what the table is. It stays with the table when read aloud, unlike a
  heading above it.

\`<thead>\` and \`<tbody>\` group the rows, which lets a long table keep its headers visible while
the body scrolls.`,
    workedExample: `**Goal: make a table readable without looking at it.**

Start with the version most people write:

    <table>
      <tr><td>Region</td><td>Revenue</td></tr>
      <tr><td>North</td><td>42000</td></tr>
    </table>

Visually fine. Read aloud it is: "Region, Revenue, North, 42000." Four values, no relationships.

Now mark up what each cell IS:

    <table>
      <caption>Q3 revenue by region</caption>
      <thead>
        <tr><th scope="col">Region</th><th scope="col">Revenue</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row">North</th><td>42000</td></tr>
      </tbody>
    </table>

Now it is: "Q3 revenue by region. North, Revenue, 42000." The same data, and this time it means
something.

Nothing about the visual result changed materially. That is the recurring lesson of markup.`,
    mcqs: [
      mcq('What does scope="row" do?',
        [['Marks a header as governing the cells across its row', true],
          ['Makes the row scrollable', false],
          ['Merges the row', false],
          ['Styles the row', false]],
        'Scope tells assistive tech which cells a header applies to. Without it, header association is guessed.'),
      mcq('Why should a table not be used for page layout?',
        [['It announces rows and columns that carry no meaning, making the page unreadable aloud', true],
          ['It is slower', false], ['Tables are deprecated', false], ['CSS forbids it', false]],
        'A screen reader announces table structure. A layout table describes relationships that do not exist.'),
      mcq('What does <caption> give you that a heading above the table does not?',
        [['It is part of the table, so it is read with it', true],
          ['Larger text', false], ['Centring', false], ['Nothing', false]],
        'A heading is a separate element that can be missed when a table is read on its own.'),
    ],
    checkpoint: [
      mcq('A table has only <td> cells and no <th>. What breaks?',
        [['Nothing visually; read aloud it becomes values with no labels', true],
          ['The table does not render', false],
          ['The browser adds headers', false],
          ['Only styling', false]],
        'Correct rendering with broken meaning is the characteristic HTML failure, and the reason markup is judged by what it says rather than how it looks.'),
    ],
  },
  {
    unitCode: 'T_HTML_FORMS',
    notes: `A form collects input and sends it somewhere.

    <form action="/signup" method="post">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
      <button type="submit">Sign up</button>
    </form>

Four things doing four jobs:

- **\`action\`** — where the data goes. **\`method\`** — how. \`get\` puts values in the URL
  (bookmarkable, visible, length-limited); \`post\` puts them in the request body. Anything
  private or large is \`post\`.
- **\`name\`** — the key the server receives. **No \`name\`, no data.** A field without one is
  simply not submitted, silently.
- **\`label\` + \`for\`/\`id\`** — the association. It enlarges the click target and, critically,
  is what a screen reader announces when the field is focused. A placeholder is not a label: it
  disappears the moment somebody types.
- **\`type\`** — \`email\`, \`number\`, \`date\`, \`tel\`. Choosing the right one gives you the
  correct mobile keyboard and free validation.

\`required\`, \`min\`, \`max\` and \`pattern\` are checked by the browser before submission. They
are a convenience, never a security measure — the server must check everything again.`,
    workedExample: `**Goal: find why a form submits nothing.**

    <form action="/signup" method="post">
      <input type="text" placeholder="Your email">
      <button>Sign up</button>
    </form>

It renders. It submits. The server receives an empty body.

Work through it:

1. Is there a \`name\`? No. **That is the bug** — without \`name\` the field is not included in the
   submission at all, and nothing warns you.
2. Is there a label? No, only a placeholder, which vanishes on typing and is not announced
   reliably.
3. Is the type right? \`text\` works, but \`email\` gives free validation and a better keyboard.

Fixed:

    <form action="/signup" method="post">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
      <button type="submit">Sign up</button>
    </form>

The original failure is worth remembering precisely because nothing was reported: no console
error, no visual difference, just an empty request.`,
    mcqs: [
      mcq('An input has no `name` attribute. What happens on submit?',
        [['It is not submitted at all, silently', true],
          ['It submits with an empty key', false],
          ['The browser blocks the form', false],
          ['It submits using its id', false]],
        'The name is the key. Without one the field is excluded, and nothing reports it — which is why an empty request body usually means a missing name.'),
      mcq('Why is a placeholder not a label?',
        [['It disappears as soon as the field is typed in', true],
          ['It cannot be styled', false],
          ['It is invalid HTML', false],
          ['It only works on text inputs', false]],
        'It also is not reliably announced by assistive tech. A label persists and is associated with the field.'),
      mcq('When must you use `method="post"`?',
        [['When the data is private or too large for a URL', true],
          ['Always', false], ['When there are more than five fields', false], ['Never for forms', false]],
        'GET puts values in the URL, where they are visible, logged and length-limited.'),
    ],
    checkpoint: [
      mcq('Browser validation with `required` means:',
        [['Convenience for the user — the server must still validate', true],
          ['The data is guaranteed valid', false],
          ['Server checks can be skipped', false],
          ['The field cannot be bypassed', false]],
        'Anything the browser enforces can be bypassed by not using a browser. Client validation is UX; server validation is correctness.'),
    ],
  },
  {
    unitCode: 'T_HTML_SEMANTIC_HTML',
    notes: `Semantic elements say what a region IS. \`<div>\` says nothing at all.

    <header>   the page or section's introductory area
    <nav>      a block of navigation links
    <main>     the page's primary content — exactly one, not repeated across pages
    <article>  a self-contained piece that would make sense extracted
    <section>  a thematic grouping, normally with a heading
    <aside>    related but tangential — a sidebar, a pull quote
    <footer>   closing information for its nearest section or the page

Why it is worth the effort: a screen reader can jump straight to \`<main>\`, list the \`<nav>\`
landmarks, and skip a repeated header. With \`<div class="main">\` none of that exists — the class
name means something to your CSS and nothing to anybody else.

**\`<article>\` versus \`<section>\`**, the distinction people find hardest: an article stands
alone (a blog post, a product card, a comment). A section is a part of something larger. If you
could syndicate it on its own, it is an article.

Not every \`<div>\` is wrong. A wrapper that exists purely to hang CSS on is exactly what a
\`<div>\` is for.`,
    workedExample: `**Goal: replace a page of divs, justifying each change.**

    <div class="top">
      <div class="logo">Site</div>
      <div class="menu">...</div>
    </div>
    <div class="content">
      <div class="post">...</div>
    </div>
    <div class="side">...</div>
    <div class="bottom">...</div>

Go through it asking what each region IS:

    <header>
      <div class="logo">Site</div>     <!-- a styling wrapper: div is correct -->
      <nav>...</nav>                   <!-- a block of navigation links -->
    </header>
    <main>
      <article>...</article>           <!-- stands alone: it is an article -->
    </main>
    <aside>...</aside>                 <!-- related but tangential -->
    <footer>...</footer>

Note what did NOT change. \`<div class="logo">\` stays a div, because it is a styling hook and
there is no element meaning "logo". Replacing every div is as wrong as replacing none — the goal
is naming regions that have a name.`,
    mcqs: [
      mcq('What distinguishes <article> from <section>?',
        [['An article makes sense extracted on its own; a section is part of something larger', true],
          ['Articles are longer', false],
          ['Sections may not have headings', false],
          ['Articles must contain text', false]],
        'The test is syndication: if it could stand alone elsewhere, it is an article.'),
      mcq('How many <main> elements should a page have?',
        [['Exactly one', true], ['One per section', false], ['As many as needed', false], ['None', false]],
        'Main is the landmark a screen-reader user jumps to in order to skip the repeated header. Two would defeat it.'),
      mcq('Is `<div class="card-wrapper">` a mistake?',
        [['No — a wrapper existing only for CSS is exactly what div is for', true],
          ['Yes, always use a semantic element', false],
          ['Yes, use <section>', false],
          ['Only in <main>', false]],
        'Semantic markup means naming regions that have a name. Inventing meaning for a styling hook is the opposite error.'),
    ],
    checkpoint: [
      mcq('What does a screen-reader user gain from <nav> over <div class="nav">?',
        [['It becomes a landmark they can list and jump to', true],
          ['Better styling', false], ['Faster loading', false], ['Nothing', false]],
        'Landmarks are the navigation layer for non-visual use. A class name is invisible to it.'),
    ],
  },
  {
    unitCode: 'T_HTML_ACCESSIBILITY',
    notes: `Accessibility is not a feature for a minority. It is permanent, temporary and
situational: a blind user, somebody with a broken arm, somebody holding a baby, somebody in
sunlight.

Most of it is markup you have already learned, done properly.

**The checks that catch the most, in order of return:**

1. **Every image has considered alt** — descriptive, or empty when decorative.
2. **Every input has a label** associated by \`for\`/\`id\`.
3. **Headings form a correct outline** with no skipped levels.
4. **Everything works by keyboard.** Tab through the page. Can you reach every control? Can you
   see where you are?
5. **Focus is visible.** \`outline: none\` with no replacement is the single most damaging line of
   CSS on the web.
6. **Contrast is sufficient** — 4.5:1 for normal text.

**ARIA comes last, not first.** \`<button>\` is better than \`<div role="button">\`, because the
button is already focusable, already announces itself, and already responds to Enter and Space.
The first rule of ARIA is not to use ARIA when a real element exists.`,
    workedExample: `**Goal: find the faults by keyboard alone, without a screen reader.**

Take any page and press Tab repeatedly. Three things to watch.

**1. Can you reach everything?** A \`<div onclick="...">\` is not focusable — Tab skips it
entirely, and a keyboard user simply cannot activate it. The fix is \`<button>\`, not
\`tabindex="0"\` plus a key handler.

**2. Can you see where you are?** If focus is invisible, somebody navigating by keyboard has no
idea what pressing Enter will do. Usually caused by:

    :focus { outline: none; }          /* removed and never replaced */

**3. Does the order make sense?** Tab order follows source order, not visual position. A sidebar
placed first in the HTML but shown on the right is tabbed through before the main content.

Three faults, no tools, five minutes. It is the highest-yield accessibility test there is.`,
    mcqs: [
      mcq('Why is `<button>` better than `<div role="button">`?',
        [['It is already focusable, announced, and responds to Enter and Space', true],
          ['It is shorter', false], ['Divs cannot take roles', false], ['It styles better', false]],
        'The role attribute renames the div for assistive tech but adds none of the behaviour. You then have to rebuild all of it.'),
      mcq('`outline: none` on :focus with no replacement causes:',
        [['Keyboard users cannot see what is focused', true],
          ['A validation error', false], ['Slower rendering', false], ['Nothing', false]],
        'Focus visibility is how a keyboard user knows what Enter will activate. Removing it without a replacement makes the page unusable without a mouse.'),
      mcq('What determines tab order by default?',
        [['The order elements appear in the HTML source', true],
          ['Their visual position', false],
          ['Alphabetical order', false],
          ['The order they were styled', false]],
        'Which is why a CSS reorder can leave the tab sequence jumping around the screen.'),
    ],
    checkpoint: [
      mcq('When should you reach for ARIA?',
        [['When no native element expresses what you need', true],
          ['On every interactive element', false],
          ['Whenever using a div', false],
          ['Before choosing an element', false]],
        'Native elements bring behaviour as well as meaning. ARIA only renames, so it is the last resort rather than the first.'),
    ],
  },
  {
    unitCode: 'T_HTML_MINI_PROJECT',
    notes: `**Brief — a page of your own**

Build one complete, semantic, accessible HTML page from this specification. No CSS framework,
no JavaScript. HTML only. That constraint is deliberate: with nothing to hide behind, the
structure is the work.

**Learning objective**

Produce a page whose structure alone conveys its meaning, and defend every element choice.

**Requirements**

1. A valid document: doctype, \`lang\`, \`charset\`, a \`<title>\` that names the page.
2. Semantic regions: \`<header>\`, \`<nav>\`, \`<main>\`, \`<footer>\`, used where they belong.
3. A correct heading outline — one \`<h1>\`, no skipped levels.
4. At least one list, chosen for the right reason.
5. At least one image with considered alt text.
6. At least one data table with \`<caption>\`, \`<th>\` and \`scope\`.
7. A form with at least three inputs, every one labelled, using appropriate \`type\`s.
8. Internal links between sections and at least one external link.

**Acceptance criteria**

- Passes the W3C validator with zero errors.
- Reads sensibly with CSS disabled.
- Every control reachable and visible by keyboard alone.
- You can justify each semantic element in one sentence.

**Deliverable**

One \`.html\` file, plus a short README stating what the page is for and three element choices you
made and why.`,
    assignment: {
      title: 'HTML Mini Project — a page of your own',
      description: 'One complete, semantic, accessible HTML page built from a specification.',
      instructions: `Build a single HTML page meeting every requirement in the unit brief.

No CSS framework and no JavaScript — HTML only. With nothing to hide behind, the structure is
the work.

Submit the .html file and a short README naming three element choices and why you made them.`,
      rubric: [
        { criterion: 'Valid document', description: 'Doctype, lang, charset and a title that names the page. Zero W3C errors.', maxPoints: 15 },
        { criterion: 'Semantic regions', description: 'header, nav, main and footer used where they belong; divs only as styling hooks.', maxPoints: 25 },
        { criterion: 'Heading outline', description: 'One h1, no skipped levels; the headings alone read as a table of contents.', maxPoints: 15 },
        { criterion: 'Data table', description: 'caption, th and scope used so the table reads sensibly aloud.', maxPoints: 15 },
        { criterion: 'Labelled form', description: 'Three or more inputs, each with an associated label and an appropriate type.', maxPoints: 15 },
        { criterion: 'Keyboard and alt text', description: 'Every control reachable with visible focus; every image has considered alt.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Which check proves the structure is carrying meaning?',
        [['Disabling CSS and reading the page', true],
          ['Looking at it in the browser', false],
          ['Counting the elements', false],
          ['Checking it on mobile', false]],
        'With styling gone, only markup remains. A well-structured page is still plain and usable; a div soup becomes a wall.'),
      mcq('The validator reports zero errors. Is the page accessible?',
        [['No — validity and accessibility are different things', true],
          ['Yes', false],
          ['Yes, if it also has alt text', false],
          ['Only if it uses ARIA', false]],
        'A perfectly valid page can have unlabelled inputs, meaningless alt and no keyboard access. The validator checks syntax, not meaning.'),
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * T_LOOPS — the remaining six
 * ════════════════════════════════════════════════════════════════════════════════════════ */

const LOOPS_REST: PilotBundle[] = [
  {
    unitCode: 'T_LOOPS_WHY_LOOPS',
    notes: `Before the syntax, the recognition: **when does a problem need repetition at all?**

Three signals, and spotting them is the skill:

1. **"For each…"** appears in the description. For each student, print their name.
2. **You would copy and paste** if you wrote it out longhand.
3. **The count is unknown when you write the code.** Ten names today, four hundred tomorrow —
   the code must not care.

That third one is the real argument. Copy-paste handles three items and fails at three hundred,
and it fails by requiring you to edit the program rather than the data.

    print(names[0])
    print(names[1])
    print(names[2])      # what happens when a fourth name arrives?

A loop separates the *instruction* from the *number of times*. That separation is the whole idea,
and everything about \`for\` and \`while\` is mechanism for it.`,
    mcqs: [
      mcq('Which is the strongest signal that a problem needs a loop?',
        [['The number of items is not known when the code is written', true],
          ['The problem involves a list', false],
          ['There are more than ten items', false],
          ['The code is long', false]],
        'Copy-paste works until the count changes. A loop makes the program independent of it, which is why the unknown count is the decisive signal.'),
      mcq('What does a loop separate?',
        [['The instruction from the number of times it runs', true],
          ['Input from output', false],
          ['Data from functions', false],
          ['Logic from syntax', false]],
        'That separation is why adding a fourth name changes the data and not the program.'),
    ],
    checkpoint: [
      mcq('You write the same print three times for three names. What breaks first?',
        [['A fourth name arrives and the program must be edited', true],
          ['It runs too slowly', false],
          ['It uses too much memory', false],
          ['Nothing breaks', false]],
        'Needing to edit the code when the data changes is the failure a loop exists to prevent.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_WHILE_LOOPS',
    notes: `A \`while\` loop repeats as long as a condition is true. Unlike \`for\`, it does not know
in advance how many times that will be — and **you** are responsible for making it eventually
false.

    count = 0
    while count < 3:
        print(count)
        count = count + 1

Three moving parts, and forgetting any one is a bug:

1. **Initialise** the variable before the loop.
2. **Test** it in the condition.
3. **Change** it inside the body, towards the exit.

**When to prefer \`while\` over \`for\`:** when the end is a *condition*, not a count. Reading until
input is empty. Retrying until it succeeds. Halving until small enough. If you can say "repeat n
times", \`for\` is clearer and cannot forget step 3.

    while True:
        line = input()
        if not line:
            break

\`while True\` with a \`break\` is the honest way to write "loop until something happens", and it
is clearer than inventing a flag variable to carry the same meaning.`,
    workedExample: `**Goal: read numbers until the user enters a blank line, and total them.**

The count is unknown, so \`for\` cannot express it.

    total = 0
    while True:
        line = input()
        if not line:
            break
        total = total + int(line)
    print(total)

Walk the three parts. There is no counter to initialise, because the condition is not about a
count — it is about what arrives. The test is \`if not line\`, inside the body, because the value
must be read before it can be judged. The change is the next \`input()\` call.

Compare against the version people try first:

    line = input()
    while line:
        total = total + int(line)
        line = input()     # easy to forget, and then it never ends

Both work. The first has one \`input()\` call and cannot forget to advance; the second has two and
can. Prefer the shape that makes the bug impossible rather than the shape that avoids it.`,
    mcqs: [
      mcq('Which situation genuinely needs `while` rather than `for`?',
        [['Reading input until a blank line arrives', true],
          ['Printing every item of a list', false],
          ['Counting from 1 to 100', false],
          ['Looping over a string', false]],
        'The end is a condition on what arrives, not a count known in advance. Everything else is clearer as a for.'),
      mcq('What makes `while True` with a `break` a reasonable choice?',
        [['It states "loop until something happens" directly, without a flag variable', true],
          ['It is faster', false],
          ['It cannot loop forever', false],
          ['break is required in Python', false]],
        'The alternative is a flag that exists only to encode the same meaning less clearly.'),
    ],
    checkpoint: [
      mcq('Which of the three parts of a while loop is most often forgotten?',
        [['Changing the variable inside the body', true],
          ['Initialising it', false],
          ['Testing it', false],
          ['Printing it', false]],
        'Omitting it produces a hang rather than an error, so nothing tells you what happened.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_LOOP_CONTROL',
    notes: `Two statements change a loop's normal flow.

**\`break\`** leaves the loop entirely. Nothing after it in the body runs, and the loop does not
continue.

    for n in numbers:
        if n < 0:
            print("Negative found")
            break

**\`continue\`** skips the rest of THIS iteration and starts the next one.

    for n in numbers:
        if n % 2 != 0:
            continue
        print(n)          # only even numbers reach here

**Both should be rare, and here is the test.** A \`continue\` guarding a long body is often clearer
than deeply nesting the body inside an \`if\`. A \`continue\` scattered through a loop with three
other conditions is usually a sign the loop is doing two jobs.

The trap worth naming: \`break\` in a NESTED loop leaves only the inner one. Escaping both needs a
flag, or — better — extracting the search into a function and using \`return\`.`,
    mcqs: [
      mcq('`continue` inside a for loop does what?',
        [['Skips the rest of this iteration and starts the next', true],
          ['Leaves the loop', false],
          ['Restarts the loop from the beginning', false],
          ['Repeats the current item', false]],
        'It advances to the next item. break is the one that leaves.'),
      mcq('`break` inside a nested loop exits:',
        [['Only the inner loop', true], ['Both loops', false], ['The function', false], ['The program', false]],
        'This is the trap: the outer loop continues, usually producing partly-correct output rather than an error.'),
      mcq('When is `continue` an improvement?',
        [['As a guard at the top, so the main body is not deeply nested', true],
          ['Whenever there is an if', false],
          ['To make loops shorter', false],
          ['Never', false]],
        'Guard-then-body reads top to bottom. Scattered continues through several conditions usually mean the loop is doing two jobs.'),
    ],
    checkpoint: [
      mcq('A loop must stop at the first match and you need the value afterwards. What is cleanest?',
        [['Extract it into a function and return the match', true],
          ['break with a flag variable', false],
          ['continue', false],
          ['Nest a second loop', false]],
        'return leaves everything at once and hands back the value, which is exactly what break plus a flag is simulating.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_NESTED_LOOPS',
    notes: `A loop inside a loop. The inner loop runs **completely** for every single pass of the
outer one.

    for row in range(3):
        for col in range(4):
            print(row, col)

Twelve lines, not seven. That multiplication is the thing to internalise: outer × inner.

**Where they are the natural fit:** grids, tables, comparing every item against every other item,
anything two-dimensional.

**The cost.** A nested loop over a list of n items does n × n work. At n = 100 that is 10,000
steps and instant; at n = 100,000 it is ten billion and your program appears to hang. Nesting is
the most common reason working code becomes unusably slow on real data.

**Reading them.** Trace the inner loop to completion once before moving the outer variable. Most
nested-loop bugs come from reading them as if both advanced together.`,
    workedExample: `**Goal: print a multiplication table, then predict the work.**

    for i in range(1, 4):
        for j in range(1, 4):
            print(i * j, end=" ")
        print()

Trace it. i = 1, and j runs 1, 2, 3 — printing 1 2 3, then a newline. Only THEN does i become 2.

    1 2 3
    2 4 6
    3 6 9

Nine values from two loops of three. Now change \`range(1, 4)\` to \`range(1, 1001)\` on both: a
million values. The code is identical and the runtime is not.

The habit worth building is to multiply the ranges before running anything. Two loops over a
thousand items is a million steps — fine. Three nested loops over a thousand is a billion, and
that is a program that never finishes while looking perfectly reasonable.`,
    coding: [{
      title: 'Print a triangle',
      description: `Read n and print a left-aligned triangle of stars, n rows tall.

For n = 4:

    *
    **
    ***
    ****

Use nested loops. The inner loop's range depends on the outer loop's variable — that dependency
is the point of the exercise.`,
      starter: 'n = int(input())\n\n# your nested loops here\n',
      language: 'python',
      tests: [
        { input: '4', expectedOutput: '*\n**\n***\n****' },
        { input: '1', expectedOutput: '*' },
        { input: '3', expectedOutput: '*\n**\n***' },
        { input: '6', expectedOutput: '*\n**\n***\n****\n*****\n******', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('`for i in range(3): for j in range(4):` — how many times does the inner body run?',
        [['12', true], ['7', false], ['4', false], ['3', false]],
        'The inner loop runs fully for every pass of the outer: 3 × 4.'),
      mcq('Why do nested loops make code slow on real data?',
        [['The work grows as n × n, so ten times the data is a hundred times the work', true],
          ['Loops are slow in Python', false],
          ['They use more memory', false],
          ['They cannot be optimised', false]],
        'At small n the difference is invisible, which is why this is usually discovered in production rather than in testing.'),
    ],
    checkpoint: [
      mcq('When reading a nested loop by hand, what should you do?',
        [['Run the inner loop to completion once before advancing the outer variable', true],
          ['Advance both together', false],
          ['Read the outer loop only', false],
          ['Start from the inner loop', false]],
        'Reading them as if both advanced together is the source of most nested-loop misunderstandings.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_PRACTICE',
    notes: `Loop practice is not "write more loops". It is recognising which of the four shapes a
problem needs, before typing anything.

**The four shapes, and the question each answers:**

1. **Visit every item** — "do something to each". A plain \`for\`.
2. **Build a result** — "total / count / collect". An accumulator declared before the loop.
3. **Search** — "find the first that…". A \`for\` with \`break\`, or better, a function with
   \`return\`.
4. **Repeat until** — "keep going while…". A \`while\`.

**The method, every time:**

- Say which shape it is, out loud.
- Name the accumulator and its starting value, if there is one.
- Write the loop.
- **Trace it by hand on three items** before running it. Most loop bugs are visible in three
  iterations and invisible in three hundred.

The last step is the one people skip and the one that pays.`,
    coding: [{
      title: 'Find the longest word',
      description: `Read a line of space-separated words and print the longest one.

If two words tie, print the first.

Example: \`to be or not to be\` prints \`not\`.

This is the search shape with an accumulator: you are tracking the best seen so far.`,
      starter: 'words = input().split()\n\nbest = ""\n# your loop here\n\nprint(best)\n',
      language: 'python',
      tests: [
        { input: 'to be or not to be', expectedOutput: 'not' },
        { input: 'a bb ccc', expectedOutput: 'ccc' },
        { input: 'tie four also', expectedOutput: 'also' },
        { input: 'single', expectedOutput: 'single', isHidden: true },
      ],
    }],
    mcqs: [
      mcq('"Find the first number greater than 100" is which shape?',
        [['Search — a loop that stops early', true],
          ['Accumulator', false], ['Visit every item', false], ['Repeat until', false]],
        'It stops as soon as it succeeds, which is what distinguishes a search from a full traversal.'),
      mcq('Why trace a loop by hand on three items?',
        [['Most loop bugs are visible in three iterations and invisible in three hundred', true],
          ['It is faster than running it', false],
          ['Tracing is required', false],
          ['To check the syntax', false]],
        'Off-by-one, wrong starting value and misplaced increment all show up immediately at small n.'),
    ],
    checkpoint: [
      mcq('Before writing a loop, what should you decide first?',
        [['Which of the four shapes the problem is', true],
          ['Whether to use for or while', false],
          ['The variable names', false],
          ['How to print the result', false]],
        'The shape decides the mechanism. Choosing for-versus-while first is answering the second question before the first.'),
    ],
  },
  {
    unitCode: 'T_LOOPS_MINI_PROJECT',
    notes: `**Brief — a program driven by repetition**

Build a small command-line program whose core work is a loop. Not a loop bolted on; a loop that
IS the program.

**Learning objective**

Choose the right loop shape for a real problem, and produce code whose correctness you can argue
for rather than guess at.

**Requirements**

Pick one:

- **Text statistics** — read lines until blank, then report line count, word count, longest word
  and average word length.
- **Number analyser** — read numbers until blank, then report count, total, mean, min, max and
  how many were above the mean.
- **Simple menu** — loop showing options until the user quits, performing a small task per option.

Whichever you choose it must have:

1. At least one accumulator, initialised before its loop.
2. At least one loop whose ending is a condition, not a count.
3. Correct handling of **empty input** — zero items must not crash or divide by zero.
4. No repeated code that a loop should have covered.

**Acceptance criteria**

- Runs without crashing on: normal input, exactly one item, and no items at all.
- Every accumulator's starting value is defensible in one sentence.
- You can name the shape of each loop you wrote.

**Deliverable**

One \`.py\` file, plus three example runs pasted as comments — including the empty-input case.`,
    assignment: {
      title: 'Loops Mini Project — a program driven by repetition',
      description: 'A small command-line program whose core work is a loop, not a loop bolted on.',
      instructions: `Build one of the three programs in the unit brief.

Whichever you pick it must have at least one accumulator initialised before its loop, at least
one loop whose ending is a condition rather than a count, and correct behaviour on empty input.

Submit the .py file with three example runs pasted as comments — including the empty-input case,
which is the one that is never tested and the one that divides by zero.`,
      rubric: [
        { criterion: 'Correct loop shape', description: 'The loop chosen matches the problem: traverse, accumulate, search or repeat-until.', maxPoints: 25 },
        { criterion: 'Accumulator handling', description: 'Declared before the loop with a defensible starting value; not reset each pass.', maxPoints: 20 },
        { criterion: 'Condition-driven loop', description: 'At least one loop that ends on a condition, and that provably terminates.', maxPoints: 20 },
        { criterion: 'Empty input', description: 'Zero items produces sensible output rather than a crash or a division by zero.', maxPoints: 20 },
        { criterion: 'No copy-paste repetition', description: 'Nothing repeated that a loop should have covered.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does the brief insist on handling empty input?',
        [['An average over zero items divides by zero, and the empty case is the one never tested', true],
          ['Empty input is common', false],
          ['It makes the program longer', false],
          ['Python requires it', false]],
        'Zero, one and many is the standard trio, and zero is the one that reaches production untested.'),
      mcq('"No repeated code that a loop should have covered" is checking for what?',
        [['Copy-pasted blocks that differ only in a value', true],
          ['Long functions', false],
          ['Too many comments', false],
          ['Unused variables', false]],
        'It is the exact failure the topic exists to remove, and it reappears in project work more than anywhere else.'),
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════════════════════════════
 * T_GIT — the remaining seven
 * ════════════════════════════════════════════════════════════════════════════════════════ */

const GIT_REST: PilotBundle[] = [
  {
    unitCode: 'T_GIT_WHY_VERSION_CONTROL',
    notes: `Everybody invents version control before they learn it, and everybody invents the same
broken version:

    report.docx
    report_v2.docx
    report_final.docx
    report_final_REAL.docx
    report_final_REAL_use_this_one.docx

It fails in four specific ways, and Git is the answer to each:

1. **You cannot see what changed** between two files without opening both and comparing by eye.
2. **You cannot say why** anything changed. The filename records an opinion, not a reason.
3. **You cannot work with somebody else.** Two people editing means two chains of copies and a
   manual merge.
4. **You cannot go back safely.** Deleting the wrong copy is permanent.

Git gives you: a full history with a diff for every change, a message attached to each, a
mechanism for combining independent work, and the fact that **nothing committed is lost**.

That last point is worth stating plainly: once a change is committed, essentially every Git
"disaster" is recoverable. Uncommitted work is the fragile kind.`,
    mcqs: [
      mcq('Which problem does a folder of numbered copies NOT solve?',
        [['Seeing exactly what changed between two versions', true],
          ['Keeping old versions', false],
          ['Having a backup', false],
          ['Working alone', false]],
        'Copies preserve states but record nothing about the transitions, which is where the information actually is.'),
      mcq('What is true of committed work that is not true of uncommitted work?',
        [['It is essentially always recoverable', true],
          ['It is on a server', false],
          ['It cannot be edited', false],
          ['It is published', false]],
        'Almost every Git "I lost everything" story is about changes that were never committed.'),
    ],
    checkpoint: [
      mcq('What does Git record that a copy of a file cannot?',
        [['Why the change was made', true], ['The file contents', false], ['The date', false], ['The file size', false]],
        'The diff records what; only a human-written message records why, and that is the part no tool can reconstruct.'),
    ],
  },
  {
    unitCode: 'T_GIT_STATUS_AND_DIFF',
    notes: `Three commands answer "what is going on", and running them constantly is the habit that
separates confidence from guessing.

**\`git status\`** — the state of your working tree. Which files are modified, which are staged,
which are untracked, and which branch you are on. Run it after every other command until the
three states stop needing thought.

**\`git diff\`** — what changed but is **not yet staged**.

**\`git diff --staged\`** — what IS staged, and therefore what the next commit will contain.

That pair is the one people confuse, and the consequence is committing something you have not
read. \`git diff\` showing nothing does not mean nothing changed; it can mean everything is already
staged.

**\`git log --oneline\`** — the history, one commit per line. Add \`--graph\` once branches exist.

The discipline: **read \`git diff --staged\` before every commit.** It is the last moment a debug
print or a commented-out block can be caught, and it costs five seconds.`,
    workedExample: `**Goal: see why "git diff shows nothing" is not the same as "nothing changed".**

    echo "one" >> notes.txt
    git diff

You see the added line — modified, not staged.

    git add notes.txt
    git diff

**Nothing.** The change has not vanished; it has moved.

    git diff --staged

There it is. Two views of the same working tree, split by the staging area.

Now the case that matters:

    echo "two" >> notes.txt
    git diff              # shows "two"     — unstaged
    git diff --staged     # shows "one"     — staged

Both are true simultaneously. Committing now records "one" and leaves "two" behind, and \`git
status\` says so plainly — which is why it is the command to run when anything is unclear.`,
    mcqs: [
      mcq('`git diff` shows nothing. What can you conclude?',
        [['Nothing is unstaged — changes may still be staged', true],
          ['Nothing changed', false],
          ['Everything is committed', false],
          ['The file is untracked', false]],
        'git diff compares the working tree to the staging area. Staged changes are invisible to it.'),
      mcq('Which command shows what the next commit will contain?',
        [['git diff --staged', true], ['git diff', false], ['git log', false], ['git status', false]],
        'status names the files; --staged shows the actual content going in.'),
      mcq('Why read the staged diff before committing?',
        [['It is the last chance to catch a debug print or commented-out block', true],
          ['It is required', false],
          ['It stages the changes', false],
          ['It speeds up the commit', false]],
        'Five seconds against a commit that has to be amended, or worse, reviewed by somebody else.'),
    ],
    checkpoint: [
      mcq('What is the single most useful Git command to run after any other?',
        [['git status', true], ['git log', false], ['git diff', false], ['git branch', false]],
        'It orients you: branch, states, and what to do next. Running it habitually is how the model becomes automatic.'),
    ],
  },
  {
    unitCode: 'T_GIT_UNDOING',
    notes: `Four kinds of undo, in increasing order of danger. Knowing which one you need is most of
the skill.

**1. Unstage** — keep the change, take it out of the next commit. Safe.

    git restore --staged file.txt

**2. Discard an unstaged change** — throw the edit away. **Destructive and irreversible.**

    git restore file.txt

Nothing recovers this. The change was never committed, so Git has no copy.

**3. Amend the last commit** — fix a message, or add a forgotten file.

    git commit --amend

Rewrites the last commit. Safe locally; **never amend a commit you have pushed** and others may
have pulled.

**4. Revert a commit** — undo its changes with a NEW commit.

    git revert <hash>

The safe way to undo published history, because it adds rather than rewrites.

**The rule that keeps you out of trouble:** if the change is committed, you can almost certainly
get it back. If it is not committed, undo means gone. Commit early — a messy history is fixable,
lost work is not.`,
    workedExample: `**Goal: choose the right undo for three situations.**

**A. You staged a file you did not mean to include.**

    git restore --staged debug.log

The file is still there and still modified; it is simply out of the next commit. Nothing lost.

**B. You edited a file, made it worse, and want the last committed version.**

    git restore config.js

Gone, permanently. Before running it ask: is there anything here I want? Git cannot answer that
afterwards.

**C. You pushed a commit that broke the build.**

    git revert a1b2c3d

NOT \`--amend\`, and not a reset. Others have that commit; rewriting it means their history and
yours disagree, and the next pull produces a conflict nobody caused. \`revert\` adds a new commit
that undoes the old one, and everybody's history stays consistent.

A, B and C look like one question — "undo it" — and have three different answers.`,
    mcqs: [
      mcq('Which of these is irreversible?',
        [['git restore file.txt on an uncommitted change', true],
          ['git restore --staged file.txt', false],
          ['git revert <hash>', false],
          ['git commit --amend locally', false]],
        'The change was never committed, so there is no copy to recover. This is the argument for committing early.'),
      mcq('Why use `revert` rather than `amend` on a pushed commit?',
        [['Amending rewrites history others already have; revert adds to it', true],
          ['Amend does not work remotely', false],
          ['Revert is faster', false],
          ['Amend deletes the file', false]],
        'Rewriting shared history makes everybody else\'s next pull a conflict they did not cause.'),
      mcq('`git restore --staged file.txt` does what to your edits?',
        [['Keeps them — it only unstages', true],
          ['Discards them', false],
          ['Commits them', false],
          ['Deletes the file', false]],
        'Unstaging moves a change between states. Discarding removes it.'),
    ],
    checkpoint: [
      mcq('What makes committing early a safety measure?',
        [['Committed work is almost always recoverable; uncommitted work is not', true],
          ['It makes the history cleaner', false],
          ['It is faster', false],
          ['It prevents conflicts', false]],
        'A messy history can be tidied later. Lost work cannot be un-lost.'),
    ],
  },
  {
    unitCode: 'T_GIT_BRANCHES',
    notes: `A branch is a movable pointer to a commit. That is genuinely all it is, and the
cheapness follows from it: creating one copies nothing.

    git switch -c feature/login      # create and move onto it
    git switch main                  # go back

**What a branch buys you:** somewhere to work without disturbing what already works. \`main\`
stays in a state you could ship; your half-finished work lives beside it.

**HEAD** is where you are standing. \`git status\` says so on its first line, and most confusion
about "where did my changes go" is answered by reading it.

**Naming.** \`feature/login\`, \`fix/timezone-offset\` — the prefix groups them and the rest says
what it is for. \`test\`, \`test2\` and \`new\` are the branch equivalent of \`final_REAL.docx\`.

**Switching with uncommitted changes** carries them with you if they do not conflict, and refuses
if they do. That refusal is a feature; it is Git declining to silently mix two pieces of work.
Commit first, or \`git stash\`.`,
    mcqs: [
      mcq('What is a branch, mechanically?',
        [['A movable pointer to a commit', true],
          ['A copy of the project folder', false],
          ['A separate repository', false],
          ['A snapshot of every file', false]],
        'This is why creating one is instant no matter how large the project — nothing is copied.'),
      mcq('Git refuses to switch branches because of uncommitted changes. Why is that good?',
        [['It is declining to silently mix two pieces of work', true],
          ['Switching would be slow', false],
          ['The branch is locked', false],
          ['It is a bug', false]],
        'The alternative is your half-finished feature appearing on a branch it does not belong to.'),
    ],
    checkpoint: [
      mcq('What does HEAD refer to?',
        [['Where you currently are — the commit or branch you have checked out', true],
          ['The newest commit in the repository', false],
          ['The first commit', false],
          ['The remote branch', false]],
        'Reading HEAD answers most "where did my changes go" confusion, and git status prints it first for that reason.'),
    ],
  },
  {
    unitCode: 'T_GIT_MERGING',
    notes: `Merging brings one branch's work into another.

    git switch main
    git merge feature/login

Note the direction: you stand on the destination and pull the source in. Merging on the wrong
branch is a common and confusing mistake.

**Two kinds of merge.**

**Fast-forward** — \`main\` has not moved since the branch was created, so Git simply slides the
pointer forward. No merge commit, and history stays linear.

**Three-way** — both branches have new commits. Git compares both against their common ancestor
and creates a **merge commit** with two parents.

    A---B---C  main
         \\
          D---E  feature

Merging produces F, whose parents are C and E.

**After merging**, delete the branch: \`git branch -d feature/login\`. The commits are in \`main\`;
the pointer has done its job. Old branches accumulate and every one of them is a question
somebody has to answer later.

A merge that touches different lines of the same file still merges cleanly. It takes an overlap
on the **same lines** to produce a conflict.`,
    workedExample: `**Goal: produce both kinds of merge deliberately, and see the difference.**

**Fast-forward:**

    git switch -c quick-fix
    # edit, commit
    git switch main
    git merge quick-fix

Git says \`Fast-forward\`. \`main\` had not moved, so there was nothing to reconcile — the pointer
simply advanced. \`git log --graph\` shows a straight line.

**Three-way:**

    git switch -c feature
    # edit file-a.txt, commit
    git switch main
    # edit file-b.txt, commit          <- main has now moved too
    git merge feature

Git opens an editor for a merge commit message. Two branches both advanced, so a commit with two
parents is needed to join them. \`git log --graph\` now shows the fork and the join.

No conflict in either case, because the two branches touched different files. Conflict is about
overlapping lines, not about branching — a distinction worth having before the first conflict
arrives.`,
    mcqs: [
      mcq('You want feature merged into main. Where do you stand?',
        [['On main, then run git merge feature', true],
          ['On feature, then git merge main', false],
          ['Either', false],
          ['On a third branch', false]],
        'You stand on the destination and pull the source in. Reversing it merges main into feature, which is a different thing.'),
      mcq('When does Git fast-forward instead of creating a merge commit?',
        [['When the destination has not moved since the branch was created', true],
          ['When there are no conflicts', false],
          ['When the branch has one commit', false],
          ['When both branches changed', false]],
        'With nothing to reconcile, advancing the pointer is the whole merge.'),
      mcq('Both branches changed the same FILE but different lines. What happens?',
        [['It merges cleanly', true],
          ['A conflict', false],
          ['The merge is refused', false],
          ['One version is chosen', false]],
        'Conflict requires an overlap on the same lines. Git merges per region, not per file.'),
    ],
    checkpoint: [
      mcq('Why delete a branch after merging it?',
        [['Its commits are already in main; the pointer has done its job', true],
          ['It frees disk space', false],
          ['Git requires it', false],
          ['To remove the commits', false]],
        'Deleting the pointer removes nothing. Keeping it leaves a question somebody has to answer months later.'),
    ],
  },
  {
    unitCode: 'T_GIT_REMOTES',
    notes: `A remote is another copy of the repository, usually on GitHub. \`origin\` is the
conventional name for the one you cloned from.

    git remote -v                    # what remotes exist
    git push origin main             # send your commits up
    git pull origin main             # bring theirs down

**The idea that unlocks everything:** your clone is a **complete, independent repository**. It has
the whole history. Nothing about committing, branching or merging needs a network. Only \`push\`
and \`pull\` do.

**\`push\` is refused when the remote has commits you do not.** That rejection is protection, not an
obstacle: pushing anyway would discard somebody's work. Pull first, resolve anything that
conflicts, push again.

**\`pull\` is \`fetch\` + \`merge\`.** Fetch downloads without changing your files; merge combines.
When you want to look before integrating, \`git fetch\` then \`git log origin/main\` shows what is
coming.

**Never \`push --force\` to a shared branch.** It overwrites the remote's history with yours, and
anybody who had the old version gets an unexplainable conflict on their next pull.`,
    workedExample: `**Goal: understand a rejected push instead of forcing past it.**

    git push origin main
    ! [rejected]  main -> main (fetch first)

The message is exact: the remote has commits you do not have. Pushing would replace its history
with yours, losing them.

The correct sequence:

    git pull origin main

Git merges their work into yours. If a conflict appears, resolve it — that is the moment the two
lines of work actually meet.

    git push origin main

Now yours contains theirs, and the push is a fast-forward.

The tempting wrong answer is \`git push --force\`. It succeeds instantly and silently deletes the
commits you had not pulled. The person who wrote them discovers it later, with no explanation, and
the reflog is the only way back.

**Rejected is Git protecting somebody else's work.** Read the message rather than reaching for the
flag that makes it stop.`,
    mcqs: [
      mcq('Your push is rejected. What has happened?',
        [['The remote has commits you have not pulled', true],
          ['Your credentials failed', false],
          ['The branch is protected', false],
          ['There is a conflict in your files', false]],
        'Pushing anyway would overwrite them, which is precisely what the rejection prevents.'),
      mcq('`git pull` is equivalent to:',
        [['git fetch followed by git merge', true],
          ['git clone', false],
          ['git push in reverse', false],
          ['git checkout', false]],
        'Splitting them lets you inspect what is coming before integrating it.'),
      mcq('Why is `push --force` dangerous on a shared branch?',
        [['It replaces the remote history, discarding commits others already have', true],
          ['It is slow', false],
          ['It requires admin rights', false],
          ['It deletes the branch', false]],
        'Their next pull produces a conflict they did not cause and cannot explain.'),
    ],
    checkpoint: [
      mcq('Which Git operations need a network?',
        [['push and pull only', true],
          ['commit and push', false],
          ['all of them', false],
          ['branch and merge', false]],
        'Your clone is a complete repository. That is why you can work entirely offline and synchronise later.'),
    ],
  },
  {
    unitCode: 'T_GIT_PRACTICE',
    notes: `Git practice means running the full cycle until the commands stop needing thought —
**including the parts that go wrong.**

**The cycle, start to finish:**

1. \`git switch -c fix/something\`
2. Make a change. \`git status\`.
3. \`git add\` the files you mean. \`git diff --staged\` to read what you are about to commit.
4. \`git commit -m "…"\` — why, not what.
5. \`git switch main\`, \`git merge fix/something\`, \`git branch -d fix/something\`.
6. \`git push origin main\`.

**Practise the failures deliberately, on a repository you do not care about:**

- Cause a conflict and resolve it.
- Stage the wrong file and unstage it.
- Commit with a bad message and amend it.
- Push something broken and revert it.

Each takes two minutes when it is on purpose and a stressful hour when it is not. The first
conflict on real work should not be the first conflict you have ever seen.

**The habit that underpins all of it:** \`git status\` after every command, until you stop needing
to.`,
    mcqs: [
      mcq('Why practise causing a merge conflict on purpose?',
        [['So the first one on real work is not the first one you have seen', true],
          ['Conflicts are common', false],
          ['It is required practice', false],
          ['To test the repository', false]],
        'Two minutes deliberately, against a stressful hour unexpectedly.'),
      mcq('Which step is easiest to skip and most worth keeping?',
        [['Reading git diff --staged before committing', true],
          ['Creating a branch', false],
          ['Deleting the branch afterwards', false],
          ['Pushing', false]],
        'It is the last moment to catch a debug print, and it costs five seconds.'),
    ],
    checkpoint: [
      mcq('What is the correct order?',
        [['branch → change → add → commit → merge → push', true],
          ['change → commit → add → push', false],
          ['add → branch → commit → push', false],
          ['commit → add → merge → push', false]],
        'Staging precedes committing, and merging precedes pushing. Getting the order automatic is what practice is for.'),
    ],
  },
];

export const YEAR1_BUNDLES: PilotBundle[] = [
  ...PILOT_BUNDLES, ...HTML_REST, ...LOOPS_REST, ...GIT_REST,
];
