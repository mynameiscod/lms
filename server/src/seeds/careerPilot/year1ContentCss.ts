/**
 * T_CSS — the complete topic, twelve units.
 *
 * ── WHY THIS TOPIC ────────────────────────────────────────────────────────────────────────
 *
 * Three deficits at once. It is DIRECTION-category for WEB_DEVELOPMENT, so it supplies the
 * DIRECTION_LEARNING role that every strong profile was failing with zero units. It contains
 * T_CSS_PRACTICE, which the capacity audit named as a prerequisite never written — it blocks
 * the web checkpoint. And it adds an APPLICATION, a PRACTICE and an INTEGRATION unit.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * CSS is usually taught as a list of properties, which produces students who can style a page
 * by trial and error and cannot say why it broke. Every unit here is built around a MODEL —
 * the cascade is a specificity calculation, the box model is an arithmetic that explains an
 * element being wider than you set it, positioning is about whether an element is still in the
 * flow. A student should be able to predict what a change will do before making it, which is
 * the difference between authoring CSS and nudging it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CSS_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_CSS_WHAT_CSS_DOES',
    notes: `HTML says what things ARE. CSS says how they should LOOK. Keeping those separate is the
whole design, and it buys more than tidiness.

    <p class="warning">Check your email.</p>

    .warning { color: #b91c1c; font-weight: 600; }

**What the separation buys:**

- One stylesheet changes every page at once. The alternative is editing every file.
- The same HTML can be presented differently — on a phone, in print, read aloud by a screen
  reader. Each consumer uses the structure and applies its own presentation.
- The markup stays readable, because it describes content rather than appearance.

**Three ways to attach CSS**, and only one is right for real work:

    <p style="color: red">…</p>              <!-- inline: one element, hard to override -->
    <style> p { color: red } </style>        <!-- in the page: one page only -->
    <link rel="stylesheet" href="site.css">  <!-- external: every page, cached -->

Use the external stylesheet. Inline styles are the highest-specificity thing in CSS, which makes
them the hardest to override later, and they cannot be reused or cached.

**Anatomy of a rule:**

    selector {
      property: value;
    }

The selector chooses elements; the declarations say what to change. A missing semicolon breaks
the declarations after it and CSS will not tell you — it silently skips what it cannot parse.

**That silence is the thing to internalise about CSS.** There are no error messages. A misspelt
property, an invalid value, a selector matching nothing: all simply do nothing. Your feedback
loop is the browser's developer tools, not a console, which is why the debugging unit in this
topic is about *looking* rather than about reading errors.`,
    mcqs: [
      mcq('Why prefer an external stylesheet over inline styles?',
        [['It applies across pages, can be cached, and is not the hardest thing to override', true],
          ['Inline styles are invalid HTML', false],
          ['External files load faster always', false],
          ['Inline styles cannot use classes', false]],
        'Inline is the highest specificity short of !important, which makes it the most painful thing to override six months later.'),
      mcq('You misspell a property name. What does the browser report?',
        [['Nothing — the declaration is silently skipped', true],
          ['A console error', false],
          ['The page fails to render', false],
          ['A warning in the network tab', false]],
        'CSS has no error reporting. That silence is why developer tools, rather than a console, are the feedback loop for this whole topic.'),
      mcq('The point of separating structure from presentation is mainly that:',
        [['The same content can be presented differently by different consumers', true],
          ['CSS files are smaller', false],
          ['HTML loads faster', false],
          ['It is required by browsers', false]],
        'A phone, a printer and a screen reader all consume the same structure. That is only possible if appearance is not baked into it.'),
    ],
    checkpoint: [
      mcq('A rule appears correct and has no effect at all. Which is NOT a plausible cause?',
        [['The browser has reported a CSS syntax error you missed', true],
          ['The selector matches nothing', false],
          ['A more specific rule wins', false],
          ['A typo made the declaration invalid', false]],
        'There is no such report. The other three are the real candidates and are distinguished by inspecting the element.'),
      mcq('Which attachment method styles every page and can be cached?',
        [['A linked external stylesheet', true],
          ['A style attribute', false],
          ['A style element in the head', false],
          ['All three equally', false]],
        'The style element is per page; the attribute is per element. Only the linked file is shared.'),
    ],
  },
  {
    unitCode: 'T_CSS_SELECTORS',
    notes: `A selector decides which elements a rule applies to. Getting it wrong is the commonest
reason a rule "does nothing".

**The three you need constantly:**

    p          { }     /* every <p> */
    .warning   { }     /* every element with class="warning" */
    #main-nav  { }     /* the one element with id="main-nav" */

**Class is the workhorse.** Many elements can share a class and one element can have several:

    <p class="warning large">…</p>

**Id is for one element.** Ids must be unique in a document, and they carry high specificity,
which makes rules written against them hard to override. Prefer classes for styling and keep
ids for anchors and JavaScript hooks.

**Combining, and the important distinction:**

    .card p      { }   /* DESCENDANT: any p inside .card, at any depth */
    .card > p    { }   /* CHILD: only a p that is a direct child */
    .card.wide   { }   /* an element with BOTH classes — no space */
    .card, .box  { }   /* either one — the comma means "or" */

The space-versus-no-space difference is genuinely easy to miss and changes the meaning
completely: \`.card .wide\` is "a .wide inside a .card"; \`.card.wide\` is "one element with both".

**Attribute and pseudo-class selectors, briefly:**

    input[type="email"] { }
    a:hover             { }
    li:first-child      { }

**How to write selectors you will not regret.** Target a class you put there on purpose, rather
than a structural path:

    .card > div > p:first-child { }     /* fragile: breaks if markup changes */
    .card-summary               { }     /* stable: says what it means */

The second survives somebody wrapping the content in another div. The first does not, and the
failure is silent.

**When a rule does nothing, check the selector first**, by inspecting the element in developer
tools and seeing which rules the browser thinks apply. That takes seconds and is right far more
often than re-reading the CSS.`,
    mcqs: [
      mcq('`.card.wide` selects:',
        [['One element carrying BOTH classes', true],
          ['A .wide inside a .card', false],
          ['Either class', false],
          ['Nothing — it is invalid', false]],
        'No space means one element. `.card .wide` with a space is the descendant version, and confusing the two is a frequent silent failure.'),
      mcq('Why prefer classes over ids for styling?',
        [['Ids carry high specificity, making the rules hard to override later', true],
          ['Ids are deprecated', false],
          ['Classes render faster', false],
          ['Ids cannot be styled', false]],
        'Ids remain right for anchors and JavaScript hooks. It is specifically styling that they make painful.'),
      mcq('`.card > p` differs from `.card p` how?',
        [['The first matches only direct children; the second matches any depth', true],
          ['They are identical', false],
          ['The first is faster', false],
          ['The second matches only the first p', false]],
        'Depth is the difference, and it matters the moment somebody wraps the content in another element.'),
      mcq('Which selector survives somebody wrapping the content in another div?',
        [['`.card-summary`', true],
          ['`.card > div > p:first-child`', false],
          ['`div div p`', false],
          ['`.card *`', false]],
        'A class you placed deliberately describes intent. A structural path describes the markup as it happens to be today.'),
    ],
    checkpoint: [
      mcq('A rule has no effect. What is the fastest first check?',
        [['Inspect the element and see which rules the browser says apply', true],
          ['Re-read the stylesheet', false],
          ['Add !important', false],
          ['Restart the browser', false]],
        'Seconds, and it distinguishes "selector matches nothing" from "something more specific wins" immediately.'),
      mcq('`.a, .b { color: red }` means:',
        [['Both .a and .b get red text', true],
          ['Only elements with both classes', false],
          ['.b inside .a', false],
          ['It is invalid', false]],
        'The comma is "or" and separates independent selectors sharing one declaration block.'),
    ],
  },
  {
    unitCode: 'T_CSS_CASCADE',
    notes: `When two rules set the same property on the same element, one wins. The answer is
rarely "the last one", and knowing the real rule is what turns CSS from guesswork into
prediction.

**The order of decision:**

1. **Origin and importance.** \`!important\` beats normal. Author styles beat browser defaults.
2. **Specificity.** A weighted count of what the selector matched on.
3. **Source order.** Only when specificity ties does the later rule win.

**Specificity is three numbers: (ids, classes, elements).**

| Selector | Specificity |
|---|---|
| \`p\` | 0,0,1 |
| \`.warning\` | 0,1,0 |
| \`p.warning\` | 0,1,1 |
| \`#main p\` | 1,0,1 |
| \`.card .title\` | 0,2,0 |

Compare left to right, like version numbers. **One id beats any number of classes** — (1,0,0)
beats (0,5,0) — because the comparison is not a sum.

Inline \`style=""\` behaves as higher than any selector. \`!important\` sits above that.

**The worked case that explains most confusion:**

    #sidebar p   { color: blue; }     /* 1,0,1 */
    .highlight   { color: red; }      /* 0,1,0 */

    <div id="sidebar"><p class="highlight">Which colour?</p></div>

Blue. The id-based selector is more specific, and being written first does not matter. Students
expect red because \`.highlight\` looks more targeted and is lower in the file — both are the
wrong instinct.

**Inheritance is a separate mechanism.** Some properties pass to descendants — \`color\`,
\`font-family\`, \`line-height\` — and most do not, including \`border\`, \`padding\` and \`margin\`.
An inherited value loses to ANY rule that sets the property directly, however unspecific.

**Why \`!important\` is a trap.** It works, and it removes your ability to override that
declaration later by normal means. The next person needs another \`!important\`, and the file
becomes a specificity arms race. **Fix the specificity instead**, usually by targeting a class
you add for the purpose.`,
    workedExample: `**Goal: work out why a heading is the wrong colour, by calculation rather than by trying things.**

    <div id="content">
      <article class="post featured">
        <h2 class="title">Hello</h2>
      </article>
    </div>

    h2                      { color: black; }
    .title                  { color: blue; }
    .featured .title        { color: green; }
    #content h2             { color: red; }
    article.featured h2     { color: purple; }

Score each selector that matches:

| Selector | ids | classes | elements | Specificity |
|---|---|---|---|---|
| \`h2\` | 0 | 0 | 1 | 0,0,1 |
| \`.title\` | 0 | 1 | 0 | 0,1,0 |
| \`.featured .title\` | 0 | 2 | 0 | 0,2,0 |
| \`#content h2\` | 1 | 0 | 1 | **1,0,1** |
| \`article.featured h2\` | 0 | 1 | 2 | 0,1,2 |

Compare the first numbers: only \`#content h2\` has an id, so it wins immediately at (1,0,1).
**Red.** Nothing else is examined, and source order never comes into it.

Now remove the id rule. The remaining highest is \`.featured .title\` at (0,2,0), beating
\`article.featured h2\` at (0,1,2) — because two classes beat one class, regardless of the
elements. **Green.**

**How to make the heading blue deliberately**, given the id rule exists. The wrong way:

    .title { color: blue !important; }

It works, and now nobody can override \`.title\` without another \`!important\`.

The right way — match the specificity honestly:

    #content .title { color: blue; }     /* 1,1,0 beats 1,0,1 */

Same mechanism, no escalation, and the next person can still override it.`,
    mcqs: [
      mcq('`#nav a` (1,0,1) versus `.menu .link .active` (0,3,0). Which wins?',
        [['`#nav a`, because one id beats any number of classes', true],
          ['`.menu .link .active`, three beats one', false],
          ['Whichever comes last', false],
          ['They tie', false]],
        'Specificity compares left to right like version numbers rather than summing. This is the single most misunderstood rule in CSS.'),
      mcq('When does source order actually decide the winner?',
        [['Only when specificity ties exactly', true],
          ['Always', false],
          ['When !important is used', false],
          ['Never', false]],
        '"The last one wins" is true only after specificity has failed to separate them, which is why it so often appears wrong.'),
      mcq('Why is `!important` a trap rather than a fix?',
        [['It removes the ability to override that declaration normally, escalating the next conflict', true],
          ['It does not work reliably', false],
          ['It is invalid CSS', false],
          ['It slows rendering', false]],
        'The next person needs another one, and the file becomes an arms race. Matching specificity honestly leaves the door open.'),
      mcq('An inherited `color` versus a rule setting `color` on the element directly:',
        [['The direct rule wins, however unspecific it is', true],
          ['The more specific of the two wins', false],
          ['The inherited value wins', false],
          ['They blend', false]],
        'Inheritance only supplies a value when nothing sets the property on the element itself.'),
    ],
    checkpoint: [
      mcq('Calculate the specificity of `nav ul li a.active`.',
        [['0,1,4', true], ['0,1,3', false], ['1,1,4', false], ['0,4,1', false]],
        'Four elements (nav, ul, li, a) and one class. Counting these accurately is what makes the cascade predictable.'),
      mcq('Your rule loses to an id-based rule. The best fix is:',
        [['Add specificity honestly, for example by including the id in your selector', true],
          ['Add !important', false],
          ['Move your rule to the bottom of the file', false],
          ['Use an inline style', false]],
        'Moving it does nothing, since source order only breaks exact ties. The other two escalate rather than resolve.'),
    ],
  },
  {
    unitCode: 'T_CSS_BOX_MODEL',
    notes: `Every element is a rectangle made of four layers, and knowing the arithmetic is what
explains the commonest surprise in CSS: **the width is not the width.**

From the inside out:

1. **Content** — the text or image
2. **Padding** — space inside the border
3. **Border** — the line itself
4. **Margin** — space outside, between this element and others

**The default arithmetic, which catches everybody:**

    .box {
      width: 300px;
      padding: 20px;
      border: 2px solid;
    }

The element occupies **344px**: 300 content + 20 padding each side + 2 border each side. You
asked for 300 and got 344, and in a layout expecting 300 it overflows.

**The fix, applied once at the top of every real stylesheet:**

    *, *::before, *::after { box-sizing: border-box; }

Now \`width: 300px\` means the whole box is 300px, and padding and border eat into the content
instead of adding to it. That is almost always what you meant. Margin still sits outside — it is
space between boxes, not part of one.

**Margin collapse**, the other surprise. Two vertical margins that meet do not add; the larger
wins:

    p { margin-bottom: 30px; }
    h2 { margin-top: 20px; }

The gap is 30px, not 50px. This applies only to vertical margins of block elements in normal
flow — not horizontal ones, and not inside flex or grid containers. It is the reason a gap is
sometimes smaller than the numbers suggest.

**Shorthand order is clockwise from the top:**

    padding: 10px;                 /* all four */
    padding: 10px 20px;            /* vertical, horizontal */
    padding: 10px 20px 30px 40px;  /* top right bottom left */

**Padding or margin?** Padding when the space should be inside the element — it is part of the
clickable area and takes the background colour. Margin when it is separation between elements.
A button's breathing room is padding; the gap to the next button is margin.`,
    workedExample: `**Goal: three cards that should fill a 900px row, and do not.**

    .row  { width: 900px; display: flex; }
    .card { width: 300px; padding: 16px; border: 1px solid; }

Three cards at 300px each should be exactly 900. They overflow.

Do the arithmetic per card: 300 content + 16 + 16 padding + 1 + 1 border = **334px**. Three cards
is 1002px against a 900px row.

Two ways to fix it, and they say different things.

**Fix 1 — change what width means:**

    *, *::before, *::after { box-sizing: border-box; }

Now each card is exactly 300px total, padding and border included, and 3 × 300 = 900 fits. This
is the one to use, and to apply globally at the top of the stylesheet rather than per component.

**Fix 2 — do the arithmetic by hand:**

    .card { width: 266px; }      /* 266 + 32 + 2 = 300 */

Correct, and it breaks the moment somebody changes the padding. The number 266 encodes an
assumption nothing records.

**Now add a gap** and watch margin collapse NOT happen:

    .card { margin: 0 10px; }

Horizontal margins never collapse, so this adds 20px per card — 60px total — and it overflows
again. Inside a flex container the right answer is \`gap: 20px\` on the row, which spaces children
without adding margins to them at all.

**The habit:** when an element is not the size you set, inspect it and read the computed box
before changing anything. Developer tools draw the four layers with their real numbers, and the
discrepancy is usually visible immediately.`,
    mcqs: [
      mcq('`width: 300px; padding: 20px; border: 2px` with default box-sizing occupies:',
        [['344px', true], ['300px', false], ['340px', false], ['304px', false]],
        '300 + 20 + 20 + 2 + 2. The default content-box means width refers to the content only, which is almost never what an author intends.'),
      mcq('`box-sizing: border-box` changes things how?',
        [['Width includes padding and border, so padding eats inward', true],
          ['Margins are included too', false],
          ['Padding is ignored', false],
          ['Borders are removed', false]],
        'Margin stays outside, because it is space between boxes rather than part of one.'),
      mcq('`margin-bottom: 30px` meets `margin-top: 20px`. The gap is:',
        [['30px — vertical margins collapse to the larger', true],
          ['50px', false], ['20px', false], ['25px', false]],
        'Collapse applies to vertical margins of block elements in normal flow only, which is why the rule seems inconsistent until you know the scope.'),
      mcq('A button needs breathing room around its text. Padding or margin?',
        [['Padding — it is inside the element, clickable and takes the background', true],
          ['Margin, so it does not affect size', false],
          ['Either; no difference', false],
          ['Border', false]],
        'Margin would put the space outside the button, leaving a cramped button with a gap around it.'),
    ],
    checkpoint: [
      mcq('Three 300px cards with 16px padding and 1px borders overflow a 900px row. Best fix?',
        [['Set box-sizing: border-box globally', true],
          ['Reduce width to 266px', false],
          ['Remove the padding', false],
          ['Widen the row', false]],
        'The hand-calculated 266 encodes an assumption that breaks the moment the padding changes.'),
      mcq('Horizontal margins between flex children:',
        [['Do not collapse — and `gap` is the better tool inside a flex container', true],
          ['Collapse like vertical ones', false],
          ['Are ignored', false],
          ['Double', false]],
        'Collapse is vertical and normal-flow only. `gap` spaces children without putting margins on them at all.'),
    ],
  },
  {
    unitCode: 'T_CSS_COLOUR_AND_TEXT',
    notes: `Most of a page is text, and most of the difference between a page that looks amateur and
one that does not is typography rather than colour.

**Line length and line height do the heavy lifting.**

- **Measure** — 45 to 75 characters per line. Longer and the eye loses its place returning to
  the left; set it with \`max-width: 65ch\`, where \`ch\` is the width of a zero.
- **Line height** — 1.5 to 1.6 for body text, unitless. Unitless matters: \`line-height: 1.5\`
  scales with each element's own font size, while \`24px\` does not and breaks on headings.
- **Size** — 16px minimum for body text. Below that, phone browsers may zoom on focus.

**A type scale, rather than arbitrary numbers.** Pick a ratio and stay on it:

    16px body, 20px h3, 25px h2, 31px h1      (ratio 1.25)

Three or four sizes is plenty. Twelve slightly different sizes is what makes a page look
unconsidered.

**Colour, and contrast as a hard requirement.** Contrast ratio is measurable, and WCAG AA asks
for:

- **4.5:1** for normal text
- **3:1** for large text (18pt+, or 14pt+ bold)

\`#777\` on white is 4.48:1 — it fails, narrowly, and it is an extremely common choice for
"muted" text. Check rather than judge by eye; browser developer tools show the ratio directly in
the colour picker.

**Never use colour alone to carry meaning.** A red border on an invalid field tells only the
people who perceive red. Add text, an icon, or both — this is the same rule as the accessibility
topic, arriving from the styling side.

**Keep the palette small.** One text colour, one muted variant, one accent, and a couple of
surface tones. Naming them as custom properties gives one place to change them:

    :root {
      --text: #0f172a;
      --muted: #64748b;
      --accent: #4f46e5;
    }

**System font stacks cost nothing and load instantly**, which is the right default until a
design genuinely requires a specific face — a web font is a real download and a real delay.`,
    mcqs: [
      mcq('Why is `line-height: 1.5` preferred over `line-height: 24px`?',
        [['Unitless scales with each element\'s own font size; a fixed value does not', true],
          ['It is shorter to type', false],
          ['Pixels are deprecated', false],
          ['They are identical', false]],
        'A fixed line height inherited by a 32px heading produces overlapping lines, which is exactly how this bug appears.'),
      mcq('What is the recommended measure for body text?',
        [['45 to 75 characters per line', true],
          ['As wide as the screen', false],
          ['Around 100 characters', false],
          ['Under 30 characters', false]],
        'Beyond about 75 the eye struggles to find the start of the next line, which is why full-width text on a monitor is tiring.'),
      mcq('`#777` text on white is 4.48:1. What does that mean?',
        [['It fails WCAG AA for normal text, which needs 4.5:1', true],
          ['It passes comfortably', false],
          ['Contrast does not apply to grey', false],
          ['It passes for large text only', false]],
        'It fails by 0.02, which is precisely why judging contrast by eye is unreliable and the number is worth checking.'),
      mcq('A form marks invalid fields with a red border only. What is missing?',
        [['Text or an icon — colour alone excludes anybody who does not perceive it', true],
          ['A thicker border', false],
          ['A brighter red', false],
          ['Nothing', false]],
        'The same rule as accessibility, arriving from the styling side: never let colour be the only channel.'),
    ],
    checkpoint: [
      mcq('How many distinct font sizes does a typical page need?',
        [['Three or four, from a consistent scale', true],
          ['One per element type', false],
          ['As many as the design requires', false],
          ['Two', false]],
        'Many slightly different sizes is what reads as unconsidered. A ratio-based scale makes the choices defensible.'),
      mcq('Why define colours as custom properties on `:root`?',
        [['One place to change them, and the names say what they are for', true],
          ['They render faster', false],
          ['Hex codes are deprecated', false],
          ['It is required for dark mode', false]],
        'It also makes a theme change a small edit rather than a search for every occurrence of a hex value.'),
    ],
  },
  {
    unitCode: 'T_CSS_FLEXBOX',
    notes: `Flexbox lays out children in **one direction** — a row or a column — and distributes
space between them. It replaced a decade of float and inline-block workarounds and it is the
right tool for most component-level layout.

    .row {
      display: flex;          /* children become flex items */
      gap: 16px;              /* space between, without margins */
      align-items: center;    /* cross-axis alignment */
      justify-content: space-between;   /* main-axis distribution */
    }

**The two axes, which is the concept to hold on to.** With \`flex-direction: row\` (the default)
the **main axis** is horizontal and the **cross axis** is vertical. Switch to \`column\` and they
swap — including what \`justify-content\` and \`align-items\` do.

- \`justify-content\` works along the MAIN axis
- \`align-items\` works along the CROSS axis

Confusing these is the commonest flex mistake, and it becomes obvious the moment you say out
loud which direction the main axis is pointing.

**Sizing children:**

    .item { flex: 1; }          /* share remaining space equally */
    .item { flex: 0 0 200px; }  /* do not grow, do not shrink, be 200px */

\`flex: 1\` is shorthand for grow 1, shrink 1, basis 0 — the items end up equal regardless of
content. \`flex: auto\` sizes them by content first and then shares what is left, which is a
different and often more useful behaviour.

**What flex solves that was genuinely painful before:**

- Vertical centring: \`align-items: center\` — previously a hack involving transforms
- Equal-height columns: automatic, because items stretch by default
- Pushing one item to the end: \`margin-left: auto\` on that item

**When flex is the wrong tool.** It is one-dimensional. If you need rows AND columns to line up
with each other — a page layout with a header, sidebar and content that align — that is a
two-dimensional problem and grid is the next unit. Nesting flex containers to fake a grid works
and produces something nobody can adjust later.

**\`gap\` rather than margins.** It spaces children without adding margin to them, which means no
stray margin on the first or last item and nothing to strip out when the layout changes.`,
    mcqs: [
      mcq('With `flex-direction: column`, `justify-content` controls:',
        [['Vertical distribution, because the main axis is now vertical', true],
          ['Horizontal distribution', false],
          ['Nothing', false],
          ['Wrapping', false]],
        'justify-content always follows the MAIN axis, which the direction determines. Saying the direction out loud resolves this every time.'),
      mcq('`flex: 1` on every child produces:',
        [['Equal widths regardless of content, because the basis is 0', true],
          ['Widths proportional to content', false],
          ['No change', false],
          ['Items that do not shrink', false]],
        '`flex: auto` is the content-first alternative, and choosing between them deliberately is most of using flex well.'),
      mcq('You need a header, a sidebar and content whose rows and columns line up. Use:',
        [['Grid — it is a two-dimensional problem', true],
          ['Nested flex containers', false],
          ['Flex with wrap', false],
          ['Absolute positioning', false]],
        'Nested flex works and produces something nobody can adjust later, because the alignment between rows is accidental rather than declared.'),
      mcq('Why use `gap` rather than margins between flex items?',
        [['It spaces children without leaving a stray margin on the first or last', true],
          ['Margins do not work in flex', false],
          ['gap is faster', false],
          ['Margins collapse in flex', false]],
        'The classic margin version needs a :last-child override, which is one more thing to forget when the layout changes.'),
    ],
    checkpoint: [
      mcq('Push one item to the far end of a flex row. The idiomatic way is:',
        [['`margin-left: auto` on that item', true],
          ['`justify-content: space-between` on the container', false],
          ['`float: right` on the item', false],
          ['`position: absolute`', false]],
        'space-between works only when there are exactly two groups; auto margin works with any number of items before it.'),
      mcq('`align-items: center` on a default flex row centres items:',
        [['Vertically, because the cross axis is vertical', true],
          ['Horizontally', false],
          ['Both ways', false],
          ['Only if heights are equal', false]],
        'Cross axis for align, main axis for justify. Naming the axis out loud is the reliable check.'),
    ],
  },
  {
    unitCode: 'T_CSS_GRID',
    notes: `Grid lays out in **two dimensions at once** — rows and columns that line up with each
other. Where flex distributes along one axis, grid defines a structure and places things into
it.

    .layout {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 24px;
    }

That is a sidebar of fixed width and a content column taking everything else. \`fr\` is a
fraction of the remaining space and it exists only in grid — it is what makes "the rest"
expressible without arithmetic.

**Common column patterns:**

    grid-template-columns: 1fr 1fr 1fr;                        /* three equal */
    grid-template-columns: repeat(3, 1fr);                     /* the same, shorter */
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));  /* responsive, no media query */

The third is worth understanding: fit as many columns of at least 250px as will fit, each
sharing the space equally. It reflows from four columns to one as the screen narrows, **without
a single media query**. For a card grid this is usually the entire responsive story.

**Named areas make a page layout readable:**

    .page {
      display: grid;
      grid-template-columns: 200px 1fr;
      grid-template-areas:
        "header header"
        "nav    main"
        "footer footer";
    }
    .site-header { grid-area: header; }
    .site-nav    { grid-area: nav; }

The CSS now contains a picture of the layout. Somebody changing it can see what they are
changing, which is not true of any other technique.

**Grid or flex?**

- **Grid** when you are defining a structure things go into, and rows must align with each other
- **Flex** when you are distributing items along one line and their sizes follow their content

They compose well: a grid for the page, flex inside a card for its header row. Choosing is not a
loyalty test — most real pages use both, and using grid for everything produces as much
awkwardness as using flex for everything.`,
    mcqs: [
      mcq('`repeat(auto-fit, minmax(250px, 1fr))` does what?',
        [['Fits as many columns of at least 250px as will fit, reflowing without media queries', true],
          ['Creates exactly 250px columns', false],
          ['Creates one column per item', false],
          ['Requires a media query to reflow', false]],
        'For a card grid this is usually the whole responsive story, and it adapts to content count as well as screen width.'),
      mcq('`1fr` means:',
        [['One fraction of the space remaining after fixed tracks', true],
          ['One pixel', false],
          ['One hundred per cent', false],
          ['One column', false]],
        'It is what lets "the rest" be expressed without calculating against the fixed columns yourself.'),
      mcq('The advantage of `grid-template-areas` is:',
        [['The CSS contains a readable picture of the layout', true],
          ['It is faster', false],
          ['It works in more browsers', false],
          ['It avoids classes', false]],
        'Somebody changing the layout can see what they are changing, which no other technique offers.'),
      mcq('When is flex the better choice over grid?',
        [['Distributing items along one line where sizes follow their content', true],
          ['Any layout with rows', false],
          ['Page-level layout', false],
          ['Whenever there are more than three items', false]],
        'Most real pages use both — grid for the page structure, flex inside components.'),
    ],
    checkpoint: [
      mcq('A card grid must show 4 columns on desktop and 1 on a phone. Minimum CSS?',
        [['One grid with repeat(auto-fit, minmax(...)) — no media query needed', true],
          ['Three media queries', false],
          ['Flex with wrap and fixed widths', false],
          ['A media query per breakpoint', false]],
        'auto-fit with minmax handles the whole range continuously rather than at chosen breakpoints.'),
      mcq('You need a page header, sidebar and main content to align across rows. Use:',
        [['Grid, because the alignment between rows is the requirement', true],
          ['Flex column containing flex rows', false],
          ['Floats', false],
          ['Absolute positioning', false]],
        'Cross-row alignment is exactly what one-dimensional layout cannot declare, only approximate.'),
    ],
  },
  {
    unitCode: 'T_CSS_POSITIONING',
    notes: `Positioning takes an element out of, or shifts it within, the normal flow. **Most
layouts need none of it**, and reaching for it early is how layouts become fragile.

**The five values:**

- **\`static\`** — the default. In the flow. \`top\`/\`left\` do nothing.
- **\`relative\`** — still in the flow and still occupying its original space, but drawn offset
  from it. Its main real use is establishing a positioning context for an absolute child.
- **\`absolute\`** — **removed from the flow**. Positioned against the nearest ancestor that is
  itself positioned, or the page if none is.
- **\`fixed\`** — removed from the flow, positioned against the viewport. Stays put while the page
  scrolls.
- **\`sticky\`** — in the flow until it reaches a threshold, then behaves as fixed. Needs a
  \`top\` (or similar) value to have any effect at all.

**"Removed from the flow" is the sentence that matters.** Other elements lay out as though an
absolutely positioned element does not exist, so it overlaps them and the container does not
grow to contain it. That is the cause of most "why is there a gap" and "why is it on top of
that" questions.

**The relative-parent pattern**, which is what you actually use this for:

    .card       { position: relative; }
    .card .badge { position: absolute; top: 8px; right: 8px; }

Without \`position: relative\` on the card, the badge positions against the page and ends up in
the corner of the window. This one pairing accounts for most legitimate uses of absolute
positioning.

**\`z-index\` only applies to positioned elements** — anything other than \`static\`. Setting it on
a static element does nothing, which is a frequent source of confusion. It also compares only
within a stacking context, so a high number does not guarantee being on top globally.

**What to use instead, almost always:** flex and grid. Centring, spacing, ordering and overlap
that used to require positioning are all better expressed as layout. Absolute positioning is
right for badges, tooltips, dropdowns and modal overlays — things genuinely layered above the
content — and wrong for arranging the content itself.`,
    mcqs: [
      mcq('`position: absolute` positions against:',
        [['The nearest positioned ancestor, or the page if there is none', true],
          ['Always the page', false],
          ['Always the immediate parent', false],
          ['The viewport', false]],
        'Forgetting `position: relative` on the intended parent is why a badge ends up in the corner of the window.'),
      mcq('"Removed from the flow" means:',
        [['Other elements lay out as though it is not there, so it overlaps and the parent does not grow', true],
          ['It is invisible', false],
          ['It cannot be styled', false],
          ['It renders last', false]],
        'This single property explains most unexplained overlaps and most unexpected container heights.'),
      mcq('`z-index: 999` on a `position: static` element does what?',
        [['Nothing — z-index applies only to positioned elements', true],
          ['Puts it on top', false],
          ['Causes an error', false],
          ['Works only in flex', false]],
        'And even on a positioned element it competes only within its stacking context, so a large number is not a guarantee.'),
      mcq('`position: sticky` with no `top` value does:',
        [['Nothing — it needs a threshold to stick at', true],
          ['Sticks to the top by default', false],
          ['Behaves as fixed', false],
          ['Throws an error', false]],
        'The most common reason sticky "does not work" is a missing offset, and there is no message to say so.'),
    ],
    checkpoint: [
      mcq('You need a badge in the top-right corner of a card. What is required?',
        [['`position: relative` on the card and `position: absolute` on the badge', true],
          ['Absolute on the badge alone', false],
          ['Fixed on the badge', false],
          ['Float right on the badge', false]],
        'Without the relative parent the badge positions against the page, which is the classic symptom.'),
      mcq('Most modern layouts need positioning for:',
        [['Badges, tooltips, dropdowns and overlays — things layered above content', true],
          ['All multi-column layouts', false],
          ['Centring elements', false],
          ['Equal-height columns', false]],
        'The other three are flex and grid problems, and solving them with positioning is what makes a layout fragile.'),
    ],
  },
  {
    unitCode: 'T_CSS_RESPONSIVE',
    notes: `Responsive design means one page that works from a 360px phone to a wide monitor. It is
mostly about **not fixing sizes** and only occasionally about media queries.

**Start with the viewport meta tag.** Without it a phone pretends to be about 980px wide and
scales the page down, so your careful layout arrives unreadable:

    <meta name="viewport" content="width=device-width, initial-scale=1">

Missing it is the single most common cause of "my responsive CSS does nothing on a phone".

**Relative units do most of the work:**

- \`%\` and \`fr\` — share of available space
- \`rem\` — relative to the root font size; good for spacing and type, and respects a user who
  has increased their default size
- \`ch\` — character width; ideal for \`max-width\` on text
- \`vw\`/\`vh\` — viewport-relative; use sparingly, since \`100vh\` and mobile browser chrome
  interact badly

**Mobile first.** Write the narrow layout as the base, then add complexity upward:

    .grid { display: grid; gap: 16px; }                 /* one column, the default */

    @media (min-width: 768px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }

\`min-width\` queries build up; \`max-width\` queries subtract. Building up is easier to reason
about because the base case is the constrained one, which is also the one most likely to be
wrong if left until last.

**Breakpoints follow the content, not devices.** Do not target "iPhone width". Widen the browser
slowly and add a breakpoint where the layout starts to look wrong. There will usually be two or
three.

**Often you need no query at all:**

    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    max-width: 65ch;
    width: min(100%, 1200px);

Each adapts continuously rather than at chosen thresholds, and continuous is better because it
handles the widths you did not test.

**Images and tables are the usual overflow culprits.** \`img { max-width: 100%; height: auto; }\`
once, globally. A wide table should go in a container with \`overflow-x: auto\` so it scrolls
itself rather than making the whole page scroll sideways.

**Test at 360px.** It is narrower than most phones and anything that survives it survives the
rest.`,
    mcqs: [
      mcq('Your media queries have no effect on a phone. The most likely cause is:',
        [['The viewport meta tag is missing, so the phone renders at ~980px and scales down', true],
          ['The queries use min-width', false],
          ['The CSS file is cached', false],
          ['Phones ignore media queries', false]],
        'The single most common cause of this exact symptom, and it is one line in the HTML rather than anything in the CSS.'),
      mcq('Why prefer mobile-first `min-width` queries?',
        [['The base case is the constrained one, which is the easiest to get wrong if left last', true],
          ['They are faster', false],
          ['max-width is deprecated', false],
          ['They need fewer rules always', false]],
        'Building up also means each query adds capability rather than undoing something, which is easier to follow.'),
      mcq('Breakpoints should be chosen by:',
        [['Widening the browser until the layout looks wrong', true],
          ['Common device widths', false],
          ['Round numbers', false],
          ['The design tool\'s artboards', false]],
        'Device widths change constantly and there are far too many. The content tells you where it breaks.'),
      mcq('Which needs no media query to adapt?',
        [['`repeat(auto-fit, minmax(250px, 1fr))`', true],
          ['`grid-template-columns: 1fr 1fr 1fr`', false],
          ['`width: 300px`', false],
          ['`float: left`', false]],
        'It adapts continuously, which handles the widths you never tested — the main argument for fewer breakpoints.'),
    ],
    checkpoint: [
      mcq('A wide table makes the whole page scroll sideways. The fix is:',
        [['Wrap it in a container with overflow-x: auto so the table scrolls itself', true],
          ['Reduce the font size', false],
          ['Hide columns on mobile', false],
          ['Set the table to 100% width', false]],
        'Setting 100% squashes the columns unreadably. Letting the table scroll within its own box keeps the page intact.'),
      mcq('What is a sensible narrow width to test at?',
        [['360px — narrower than most phones', true],
          ['768px', false], ['320px only', false], ['1024px', false]],
        'Anything that survives 360 survives the common devices, and it is one browser resize rather than a device lab.'),
    ],
  },
  {
    unitCode: 'T_CSS_DEBUGGING',
    notes: `CSS gives no error messages. A misspelt property, an invalid value and a selector
matching nothing all do exactly the same thing: nothing. So debugging CSS is **looking**, and
developer tools are the instrument.

**Open the inspector and select the element.** Three panels answer almost everything:

1. **Styles** — every rule matching this element, most specific first, with overridden
   declarations **struck through**. A struck-through line tells you instantly that your rule
   matched and lost, which is a completely different problem from not matching at all.
2. **Computed** — the final value of every property, and which rule produced it. Use this when
   you cannot find where a value came from; it is usually inherited or a browser default.
3. **Box model diagram** — content, padding, border and margin with real numbers. This answers
   "why is it this size" immediately.

**The four failures, and how each looks:**

| Symptom in the inspector | Cause |
|---|---|
| Your rule is not listed at all | The selector does not match. Check spelling and structure |
| Listed but struck through | Something more specific won. Read the winner above it |
| Listed, applied, no visible change | The property does not apply to this element's display type |
| The element is not where you expect | Positioning or flow — check position and the box model |

**The third row catches people.** \`width\` on an inline element does nothing. \`margin-top\` on a
table cell does nothing. \`justify-content\` on a non-flex container does nothing. The rule is
valid and simply not applicable, and nothing says so.

**Two techniques worth knowing:**

Outline everything to see the boxes:

    * { outline: 1px solid red; }

\`outline\` rather than \`border\` because outline does not affect layout — a border would change
the very sizes you are trying to diagnose.

And to find what is causing horizontal overflow, widen the inspector's element list and look for
the element extending past the body, or binary-search by hiding halves of the page.

**The habit that prevents most of this:** change one thing, look, change the next. Changing four
declarations and reloading means four candidates for whatever happened, and CSS gives you no
help attributing it.`,
    mcqs: [
      mcq('Your rule appears in the Styles panel with a line through it. That means:',
        [['It matched, and a more specific rule won', true],
          ['The syntax is invalid', false],
          ['The selector matches nothing', false],
          ['The property is unsupported', false]],
        'Struck through versus absent is the key distinction: one is a specificity problem, the other a selector problem, and they need opposite fixes.'),
      mcq('`width: 300px` on an inline element does nothing. Why?',
        [['Width does not apply to inline elements — the rule is valid but inapplicable', true],
          ['The value is wrong', false],
          ['It needs !important', false],
          ['Inline elements cannot be styled', false]],
        'Nothing reports this. The Computed panel showing a width you did not set is the clue.'),
      mcq('Why `* { outline: 1px solid red }` rather than a border for debugging?',
        [['Outline does not affect layout, so it does not change the sizes being diagnosed', true],
          ['Outline is more visible', false],
          ['Borders are slower', false],
          ['Outline works on more elements', false]],
        'A border would add to every box and shift the entire page, changing the thing you are measuring.'),
      mcq('Why change one declaration at a time?',
        [['CSS gives no attribution, so four changes leave four candidates for any effect', true],
          ['It is faster', false],
          ['Browsers cache otherwise', false],
          ['To avoid specificity conflicts', false]],
        'With no error messages and no stack trace, attribution has to come from your own discipline.'),
    ],
    coding: [
      {
        title: 'Diagnose four CSS faults from their symptoms',
        description: `Each scenario describes a symptom. Print the number of the correct diagnosis, one per line, in order.

1. A rule appears struck through in the Styles panel.
2. A rule does not appear in the Styles panel at all.
3. A \`.card\` with width 300px, padding 20px and a 2px border measures 344px.
4. A \`position: sticky\` header does not stick.

Diagnoses:
1 = selector does not match
2 = a more specific rule wins
3 = default box-sizing is content-box
4 = no offset value such as top was set

Print four lines: the diagnosis number for scenario 1, then 2, then 3, then 4.`,
        starter: `# Print four numbers, one per line.
`,
        language: 'python',
        tests: [
          // Hidden deliberately: the task takes no input, so a visible case would print the key.
          { input: '', expectedOutput: '2\n1\n3\n4', isHidden: true },
        ],
      },
    ],
    checkpoint: [
      mcq('Which panel tells you where an unexplained value came from?',
        [['Computed — it shows the final value and the rule that produced it', true],
          ['Styles', false], ['Network', false], ['Console', false]],
        'Values that appear from nowhere are usually inherited or a browser default, and Computed names the source.'),
      mcq('A page scrolls sideways and you cannot find the cause. A workable method is:',
        [['Hide halves of the page until the overflow disappears, narrowing to the element', true],
          ['Set overflow: hidden on the body', false],
          ['Reduce all widths by 10%', false],
          ['Remove all margins', false]],
        'Hiding overflow conceals the symptom and leaves content unreachable. Bisection finds the actual element.'),
    ],
  },
  {
    unitCode: 'T_CSS_PRACTICE',
    notes: `No new properties. Everything here uses selectors, the cascade, the box model, flex,
grid, positioning and responsive units — and the debugging method when something does not look
right.

**The task: rebuild layouts from a screenshot.** This is deliberately how the work arrives in
practice. Nobody hands you the CSS; they hand you a picture and expect the page to match.

**How to work from a screenshot:**

1. **Identify the structure before styling anything.** What are the boxes? Which are rows,
   which are columns, which contain which? Sketch it. Getting this wrong is unrecoverable later.
2. **Choose the layout tool per region.** Two-dimensional and aligned → grid. One line of items
   → flex. Neither → normal flow, which is already correct and needs nothing.
3. **Write the HTML first, unstyled.** It should be readable and correctly structured before a
   single rule exists. If the structure only makes sense with CSS applied, it is wrong.
4. **Global resets first:** \`box-sizing: border-box\`, \`img { max-width: 100% }\`, a sensible
   base font size and line height.
5. **Layout, then spacing, then colour and type.** In that order — colour decisions made before
   the layout settles get redone.
6. **Then narrow the browser to 360px** and fix what breaks.

**The checklist before you call one finished:**

- Does it work at 360px without horizontal scrolling?
- Does the text stay between 45 and 75 characters per line?
- Is every text/background pair at least 4.5:1?
- Can you Tab through every interactive element and see where focus is?
- Does it survive the content being twice as long? Real content is never the length in the
  mock-up, and a layout that only works with the placeholder text is not finished.`,
    mcqs: [
      mcq('Working from a screenshot, what comes before any CSS?',
        [['Identify the box structure and write correct unstyled HTML', true],
          ['Pick the colours', false],
          ['Set up the grid', false],
          ['Match the fonts', false]],
        'Structure chosen wrongly is unrecoverable later. If the markup only makes sense once styled, it is the wrong markup.'),
      mcq('In what order should you work?',
        [['Layout, then spacing, then colour and type', true],
          ['Colour first, so it looks right early', false],
          ['Fonts, then layout', false],
          ['Responsive rules first', false]],
        'Colour decisions made before the layout settles get redone, because what looks balanced depends on the arrangement.'),
      mcq('Your layout works with the mock-up text and breaks with real content. What was missed?',
        [['Testing with content twice as long', true],
          ['A media query', false],
          ['box-sizing', false],
          ['A font fallback', false]],
        'Real content is never the length in the mock-up, and fixed heights are usually the thing that breaks.'),
      mcq('Which global reset is worth applying on every project?',
        [['box-sizing: border-box and img { max-width: 100% }', true],
          ['Removing all margins everywhere', false],
          ['Setting every font size in px', false],
          ['position: relative on everything', false]],
        'Those two prevent the two most common structural surprises: unexpected widths and overflowing images.'),
      mcq('Before calling a layout finished, test at:',
        [['360px, with the Tab key, and with doubled content', true],
          ['1920px only', false],
          ['The design tool\'s width', false],
          ['Two breakpoints', false]],
        'Three cheap tests that between them catch most of what reaches a reviewer.'),
    ],
    checkpoint: [
      mcq('A region shows one line of items whose widths follow their content. Which tool?',
        [['Flex', true], ['Grid', false], ['Positioning', false], ['Floats', false]],
        'One-dimensional with content-driven sizes is exactly flex. Grid would impose a structure the content does not need.'),
      mcq('A page layout where a sidebar and main content must align across rows. Which tool?',
        [['Grid', true], ['Flex', false], ['Absolute positioning', false], ['Tables', false]],
        'Cross-row alignment is the two-dimensional requirement that one-dimensional layout can only approximate.'),
    ],
  },
  {
    unitCode: 'T_CSS_MINI_PROJECT',
    notes: `Take the HTML page you built earlier and make it something you would actually show
somebody.

**Why styling your own page rather than a fresh exercise.** You already know what the content
means, so every decision is about presentation rather than about understanding the brief. And
you will immediately meet the thing that makes real CSS work hard: **your markup was written
before you knew how it would look**, so some of it is wrong for the layout you now want. Fixing
that — adding a wrapper, changing a div to a section, giving something a class — is the actual
job, and it is invisible in any exercise that hands you the HTML.

**What "something you would show somebody" means concretely:**

- It works at 360px and at 1400px, and at the awkward widths between
- The text is comfortable to read for more than a paragraph
- Nothing overlaps, overflows or jumps when the content changes length
- The colours pass contrast, not by eye but by measurement
- Every interactive element is reachable and visible under keyboard focus

**Order of work**, which matters more here than in a smaller exercise:

1. Reset — box-sizing, image max-width, base type
2. Structure — grid or flex for the page regions
3. Components — cards, nav, form, in isolation
4. Type and colour
5. Responsive — narrow the window and fix what breaks
6. Accessibility pass — Tab through it, check contrast

**Expect to change the HTML.** If you find yourself writing a fragile selector like
\`.content > div > div:nth-child(2)\`, that is the markup telling you it needs a class.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Style a Page End to End',
      description: `Take an existing HTML page and produce a styled, responsive, accessible version you would be willing to show somebody. The written decisions are assessed alongside the result.`,
      instructions: `**The brief**

Start from an HTML page you have already written (or write a simple one: a personal profile page
with a header, a short bio, a list of three projects as cards, and a contact form).

Produce a single stylesheet that makes it presentable and responsive.

**Requirements**

1. **One external stylesheet.** No inline styles, no \`<style>\` block, no \`!important\` anywhere.
2. **A global reset** including \`box-sizing: border-box\` and \`img { max-width: 100% }\`.
3. **Page layout using grid**, with the regions named if you use areas.
4. **At least one flex component** — a nav bar or the card row.
5. **Responsive from 360px to 1400px.** At most two media queries; prefer \`auto-fit\`,
   \`minmax\`, \`min()\` and relative units to queries.
6. **Typography**: body text at a comfortable measure, a line height between 1.5 and 1.6, and no
   more than four distinct font sizes from a consistent scale.
7. **Contrast**: every text/background pair at 4.5:1 or better, checked with a tool.
8. **Visible keyboard focus** on every link, button and form field. Do not remove the outline
   without replacing it with something at least as visible.

**What to submit**

1. The \`.html\` and \`.css\` files.
2. **Three screenshots**: at 360px, at 768px and at 1400px.
3. A **decisions document** (roughly 300-450 words) covering:
   - Which regions use grid and which use flex, and why each
   - Every change you had to make to the HTML, and what prompted it
   - Your type scale and the ratio you used
   - Your contrast measurements for the two most marginal pairs, with the numbers
   - Where you avoided a media query by using a relative or intrinsic technique instead
4. An **evidence note** confirming you tabbed through the page, stating what focus looks like.

**Constraints**

- No CSS framework. No Bootstrap, no Tailwind. The point is that you can do this.
- No fixed heights on anything containing text.
- No selector deeper than three levels.

**Where the marks are.** A page that looks acceptable and breaks at 360px scores below a plainer
page that holds together everywhere. Robustness is the thing being assessed.`,
      rubric: [
        {
          criterion: 'Responsive behaviour',
          description: 'Holds together from 360px to 1400px with no horizontal scrolling, no overlap and no fixed heights on text. Two media queries at most, with intrinsic techniques preferred.',
          maxPoints: 25,
        },
        {
          criterion: 'Layout technique',
          description: 'Grid used for page structure and flex for at least one one-dimensional component, with the choice justified per region rather than by habit.',
          maxPoints: 20,
        },
        {
          criterion: 'Typography and colour',
          description: 'Comfortable measure, line height 1.5-1.6, at most four sizes from a stated scale, and all contrast at 4.5:1 or better with measurements given.',
          maxPoints: 20,
        },
        {
          criterion: 'Accessibility',
          description: 'Visible keyboard focus on every interactive element, colour never the sole carrier of meaning, and the tab-through evidence supplied.',
          maxPoints: 15,
        },
        {
          criterion: 'Decisions document',
          description: 'Explains the grid/flex choices, the HTML changes and what prompted them, and where a media query was avoided. Reasoning rather than description.',
          maxPoints: 20,
        },
      ],
      totalPoints: 100,
    },
  },
];
