/**
 * T_ACCESSIBILITY and T_FORMS — two complete topics, fourteen units. DIRECTION: WEB_DEVELOPMENT.
 *
 * ── WHY THESE TWO TOGETHER ────────────────────────────────────────────────────────────────
 *
 * They are the last direction inventory the two strong profiles need to reach ninety, and they
 * belong together pedagogically: a form is where accessibility is most often abandoned and
 * where abandoning it excludes people from doing the thing the page exists for.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * Accessibility is usually taught as a compliance checklist, which produces students who add
 * ARIA attributes to fix problems that correct HTML would not have had. So the ordering here is
 * deliberate: who it is for, then semantics, then keyboard, then screen readers, then testing —
 * and ARIA appears mainly as something to reach for last.
 *
 * Forms are taught as element reference almost everywhere. Here the emphasis is on the two
 * things that actually decide whether a form works: every input having a real label, and error
 * messages that say what to do rather than what failed.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ACCESSIBILITY_FORMS_BUNDLES: PilotBundle[] = [
  /* ── T_ACCESSIBILITY ──────────────────────────────────────────────────── */
  {
    unitCode: 'T_ACCESSIBILITY_WHO_IT_IS_FOR',
    notes: `Accessibility is usually introduced as being for disabled people, which is true and
leaves most students thinking it is a small audience they will deal with later. The more useful
framing is that impairment comes in three kinds.

**Permanent** — someone who is blind, deaf, has one arm, or has a motor condition.

**Temporary** — a broken wrist, an eye infection, a recent operation. The same person, for six
weeks.

**Situational** — bright sunlight on a screen, a noisy train, holding a baby, a slow connection,
a cracked phone screen, being tired. **This is everybody, regularly.**

So the honest description is: accessibility work makes a page usable for people with permanent
impairments, and it makes it usable for everybody else in the conditions they are frequently in.
Captions help deaf users and anybody in a quiet office. High contrast helps low-vision users and
anybody outdoors. Keyboard support helps motor-impaired users and every power user who does not
want to reach for the mouse.

**The scale.** Roughly one in six people has a significant disability. For a site with any real
traffic that is not an edge case; it is a larger group than most of the browser-compatibility
work teams do without question.

**There is also a legal dimension** in most jurisdictions, and it is worth knowing it exists.
But building for it because it is required produces minimum compliance, which is a different
and worse thing from a page that works.

**What it costs, honestly.** Almost nothing, if you do it as you go: correct elements, labels,
contrast, keyboard support. It is expensive only when retrofitted, because by then the markup is
wrong and the fix is structural. **That is the practical argument for learning it now rather
than later** — not the ethics, which students already accept, but the cost curve, which they
usually do not know about.

**The single most common misconception**, which the next unit addresses: that accessibility
means adding ARIA attributes. It mostly means using the right HTML element, and ARIA is what you
reach for when no correct element exists.`,
    mcqs: [
      mcq('Which best describes who accessibility work serves?',
        [['People with permanent, temporary and situational impairments — which is most people, sometimes', true],
          ['Blind users specifically', false],
          ['A small minority', false],
          ['Users of assistive technology only', false]],
        'Bright sunlight, a noisy train and a broken wrist all produce the same needs as permanent impairments.'),
      mcq('Why is accessibility cheap to build in and expensive to retrofit?',
        [['Retrofitting means the markup is already wrong, so the fix is structural', true],
          ['Tools are expensive', false],
          ['It requires specialists', false],
          ['It is not expensive to retrofit', false]],
        'The cost curve is the practical argument, and it is the part students usually do not know.'),
      mcq('The most common misconception about accessibility is:',
        [['That it means adding ARIA attributes', true],
          ['That it is only for blind users', false],
          ['That it is expensive', false],
          ['That it is legally required', false]],
        'It mostly means using the right HTML element; ARIA is for when no correct element exists.'),
      mcq('Building only to satisfy a legal requirement produces:',
        [['Minimum compliance, which is different from a page that works', true],
          ['Full accessibility', false],
          ['The cheapest outcome', false],
          ['The same result', false]],
        'Compliance is a floor measured against a checklist; usability is measured against a person trying to do something.'),
    ],
    checkpoint: [
      mcq('Captions on a video help which groups?',
        [['Deaf users, and anybody in a noisy or silent environment', true],
          ['Deaf users only', false],
          ['Nobody, if there is a transcript', false],
          ['Only non-native speakers', false]],
        'The pattern holds across almost every accessibility feature, which is why the situational framing is the useful one.'),
      mcq('Roughly what proportion of people have a significant disability?',
        [['About one in six', true], ['One in a hundred', false], ['One in fifty', false], ['One in two', false]],
        'A larger group than most of the browser-compatibility work teams do without question.'),
    ],
  },
  {
    unitCode: 'T_ACCESSIBILITY_SEMANTICS_FIRST',
    notes: `The cheapest accessibility there is: use the element that means what you mean. Most
accessibility problems are created by not doing this, and then partially patched with ARIA.

**What you get free from a \`<button>\`:**

- Focusable with Tab, with no \`tabindex\`
- Activates on Enter and Space
- Announced as "button" by a screen reader
- Carries a disabled state that assistive technology understands

**What you get from \`<div onclick>\`:** a click handler. Everything above has to be rebuilt by
hand — \`tabindex="0"\`, a keydown handler for both Enter and Space, \`role="button"\`, and manual
disabled handling. Four things to remember, each of which somebody will forget.

**The elements worth using correctly:**

| Instead of | Use | Because |
|---|---|---|
| \`<div class="btn">\` | \`<button>\` | Focus, keyboard, role |
| \`<div class="nav">\` | \`<nav>\` | Announced as navigation; skippable |
| \`<span>\` for a heading | \`<h1>\`-\`<h6>\` | Structure, and navigable by heading |
| \`<div>\` for a list | \`<ul>\`/\`<li>\` | Count announced: "list, 5 items" |
| \`<div>\` for a form field | \`<input>\` + \`<label>\` | Label association, keyboard, autofill |

**Headings are navigation, not sizes.** Screen reader users jump between headings to find
things, the way a sighted user scans. Heading levels must describe the document's structure —
one \`h1\`, then \`h2\` for sections, \`h3\` within them, without skipping levels. **Choosing a
heading because it renders at the right size is the mistake**; size is CSS.

**Landmarks let somebody skip.** \`<header>\`, \`<nav>\`, \`<main>\`, \`<aside>\`, \`<footer>\` let a
screen reader user jump straight to the main content instead of listening to your navigation on
every page.

**The first rule of ARIA is not to use ARIA.** It is a genuine principle, not a joke: if a
native element does the job, use it. ARIA is for cases the platform has no element for — a tab
panel, a combobox, a live region — and **bad ARIA is worse than none**, because it overrides
what the browser would have said correctly.

**The one-minute test.** Turn off CSS. If the page still reads as a sensible document with
headings, lists and controls in a logical order, the semantics are right.`,
    mcqs: [
      mcq('What does `<button>` give you that `<div onclick>` does not?',
        [['Focus, Enter and Space activation, an announced role, and disabled handling', true],
          ['Better styling', false],
          ['Faster clicks', false],
          ['Nothing', false]],
        'Four behaviours to rebuild by hand, each one something somebody eventually forgets.'),
      mcq('Heading levels should be chosen by:',
        [['The document structure — size is a CSS concern', true],
          ['How large the text should be', false],
          ['Their position on the page', false],
          ['Search engine advice', false]],
        'Screen reader users navigate by heading the way a sighted user scans, so the levels are a map.'),
      mcq('"The first rule of ARIA is not to use ARIA" means:',
        [['Use a native element wherever one exists; ARIA is for what the platform lacks', true],
          ['ARIA is deprecated', false],
          ['ARIA is only for experts', false],
          ['It is a joke with no real content', false]],
        'Bad ARIA is worse than none, because it overrides what the browser would have said correctly.'),
      mcq('The one-minute semantics test is:',
        [['Turn off CSS and check the page still reads as a sensible document', true],
          ['Run an automated checker', false],
          ['Tab through it', false],
          ['Zoom to 200%', false]],
        'It isolates structure from presentation, which is precisely what a screen reader consumes.'),
    ],
    checkpoint: [
      mcq('A `<div>` used as a list of five items loses what?',
        [['The announced count — "list, 5 items"', true],
          ['Styling options', false],
          ['Click handling', false],
          ['Nothing', false]],
        'Knowing how many items there are before listening to them is genuinely useful navigation information.'),
      mcq('Landmarks such as `<main>` and `<nav>` allow a user to:',
        [['Jump directly to a region instead of hearing the navigation on every page', true],
          ['Style each region more easily, without needing a class on every one', false],
          ['Improve load time, because the browser parses the regions in parallel', false],
          ['Nothing functional; they are documentation for the next developer', false]],
        'The same scanning a sighted user does with their eyes, made available to somebody who cannot.'),
    ],
  },
  {
    unitCode: 'T_ACCESSIBILITY_KEYBOARD',
    notes: `Some people cannot use a mouse. Others simply prefer not to. A page that only works
with a pointer excludes both, and keyboard support is the accessibility work with the fastest
test: press Tab.

**What must be reachable and operable:** every link, button, form field, and anything custom you
made interactive.

**Tab order follows the DOM**, not the visual layout. If CSS has moved something visually — with
grid ordering or absolute positioning — the tab order will not match what people see, and that
is disorienting. **Fix it by changing the markup order, not with \`tabindex\`.**

**\`tabindex\` values:**

- \`tabindex="0"\` — include in the natural order. Correct for a custom control.
- \`tabindex="-1"\` — focusable by script only. Useful for moving focus to a heading or a dialog.
- \`tabindex="1"\` or above — **never**. It jumps ahead of everything else and breaks the order of
  the whole page.

**Focus must be visible.** The browser draws an outline; \`outline: none\` removes it. Removing it
without a replacement makes the page unusable for keyboard users — they cannot see where they
are. If the default is ugly, replace it:

    :focus-visible {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }

\`:focus-visible\` applies for keyboard focus and not for mouse clicks, which is usually exactly
what the designer wanted when they asked to remove it.

**A skip link** is the first thing on the page and lets somebody jump past the navigation:

    <a href="#main" class="skip-link">Skip to main content</a>

Conventionally hidden until focused. Without it, a keyboard user tabs through every navigation
item on every page.

**Keyboard traps are the worst failure.** Focus enters something — a modal, an embedded widget —
and cannot leave. A mouse user closes it; a keyboard user is stuck and must reload the page. If
you build a modal: focus moves into it on open, Escape closes it, Tab cycles within it, and
focus returns to what opened it.

**The test takes thirty seconds.** Put the mouse down. Tab through the whole page. Can you reach
everything? Can you see where you are? Can you activate everything with Enter or Space? Can you
always get back out? That single test finds most keyboard problems.`,
    mcqs: [
      mcq('Tab order follows:',
        [['The DOM order, which CSS can make differ from the visual layout', true],
          ['The visual layout', false],
          ['tabindex values only', false],
          ['Alphabetical order', false]],
        'Fix a mismatch by changing the markup order; using tabindex to patch it makes the page more fragile.'),
      mcq('`tabindex="1"` should be used:',
        [['Never — it jumps ahead of everything and breaks the whole page order', true],
          ['For the first control', false],
          ['For custom widgets', false],
          ['For modals', false]],
        'Positive values create a separate, higher-priority tab sequence that almost nobody intends.'),
      mcq('`outline: none` without a replacement causes:',
        [['Keyboard users cannot see where they are on the page', true],
          ['Nothing', false],
          ['Slower rendering', false],
          ['Mouse users lose hover', false]],
        ':focus-visible gives the designer what they wanted — no outline on click — without removing it for keyboard users.'),
      mcq('A keyboard trap is:',
        [['Focus that enters something and cannot leave, forcing a page reload', true],
          ['A slow tab order', false],
          ['Too many focusable elements', false],
          ['A missing skip link', false]],
        'The worst keyboard failure, because a mouse user never encounters it and so it survives testing.'),
    ],
    checkpoint: [
      mcq('What must a well-built modal do for keyboard users?',
        [['Take focus on open, close on Escape, trap Tab, and give focus back on close', true],
          ['Close on Escape, which is the one behaviour keyboard users rely on', false],
          ['Nothing special, because the browser manages focus for dialogs itself', false],
          ['Set tabindex="1" on its controls so they come first in the tab order', false]],
        'All four, and the fourth is the one most often missed — focus left somewhere arbitrary after closing.'),
      mcq('The thirty-second keyboard test is:',
        [['Tab through it: reach everything, see focus, activate, get back out', true],
          ['Run an automated checker, which reports the keyboard failures', false],
          ['Test it with a screen reader, which exercises the same paths', false],
          ['Zoom the page to 200% and check nothing is cut off the screen', false]],
        'Cheap enough to do on every change, which is what makes it the highest-yield habit in this topic.'),
    ],
  },
  {
    unitCode: 'T_ACCESSIBILITY_SCREEN_READERS',
    notes: `A screen reader converts the page to speech. Hearing your own page once changes how you
build them permanently, which is why this unit asks you to actually do it.

**How somebody navigates with one.** Not by listening from the top — that would be unbearable.
They jump: by heading, by landmark, by link, by form field. A list of the page's headings is
their equivalent of scanning.

**Which is why heading structure matters so much.** A page whose headings are chosen by size
gives a nonsensical outline, and the primary navigation method stops working.

**What gets announced.** For each element: its **role** (button, link, heading level), its
**name** (the text, or the label, or the alt), and its **state** (pressed, expanded, disabled,
invalid).

**So an element with no accessible name is announced as just "button"**, which tells the user
nothing. An icon-only button needs one:

    <button aria-label="Close dialog"><svg …></svg></button>

**Images:**

    <img src="chart.png" alt="Sales rose 40% between January and June">
    <img src="divider.png" alt="">          <!-- decorative: deliberately empty -->

**An empty \`alt\` is correct and different from a missing one.** Empty says "skip this, it is
decoration". Missing makes the screen reader read the filename, which is noise.

**Alt text should convey what the image conveys**, not describe it. For a chart, the finding.
For a photo illustrating a paragraph, often nothing.

**Link text must make sense alone**, because users list links out of context. A page of eleven
links all called "click here" or "read more" is a page they cannot navigate.

**Things that read badly out loud and look fine:**

- \`"Click here"\` as link text
- A table used for layout, announced as a table with rows and columns
- Text in an image, invisible to everything
- An error shown only as a red border
- Content that appears with no announcement — a live region is needed for that

**Try it.** VoiceOver is built into macOS and iOS, NVDA is free on Windows, TalkBack on Android.
Turn it on, close your eyes, and try to complete one task on a page you built. **You will find
several problems in the first two minutes**, and they will be problems you would never have
found by looking.`,
    mcqs: [
      mcq('How does a screen reader user usually navigate a page?',
        [['By jumping between headings, landmarks, links and form fields', true],
          ['Listening from the top', false],
          ['Using search only', false],
          ['Tabbing through everything', false]],
        'Which is why a heading structure chosen by font size disables their primary navigation method.'),
      mcq('An icon-only button with no text is announced as:',
        [['Just "button" — it has no accessible name', true],
          ['The icon filename', false],
          ['Nothing', false],
          ['The CSS class', false]],
        'aria-label supplies the name that the visible text would otherwise provide.'),
      mcq('`alt=""` on an image means:',
        [['Decorative — skip it. Different from omitting alt entirely', true],
          ['The alt text is missing', false],
          ['The image failed to load', false],
          ['It is an error', false]],
        'A missing alt makes the reader announce the filename, which is noise rather than silence.'),
      mcq('A screen reader lists the links on a page and eleven of them read "read more". What has been lost?',
        [['The links-list navigation mode, which depends on each link describing its own destination', true],
          ['The tab order', false],
          ['The heading structure', false],
          ['Nothing — the surrounding text still explains them', false]],
        'The list is generated out of context, so surrounding text is exactly what is not available at that moment.'),
    ],
    checkpoint: [
      mcq('What three things are announced for an element?',
        [['Role, name and state', true],
          ['Tag, class and id', false],
          ['Position, size and colour', false],
          ['Text only', false]],
        'Missing any of the three is what makes a custom control confusing rather than merely unstyled.'),
      mcq('The most effective way to find screen-reader problems in your own page is:',
        [['Turn one on and try to complete a task with your eyes closed', true],
          ['Run an automated checker', false],
          ['Read the ARIA spec', false],
          ['Ask a colleague', false]],
        'You will find several problems in the first two minutes, and none of them by looking.'),
    ],
  },
  {
    unitCode: 'T_ACCESSIBILITY_CONTRAST_AND_TEXT',
    notes: `Text people can actually read, at the sizes they actually use. This is the most
measurable part of accessibility, and therefore the least excusable to get wrong.

**Contrast ratio** is measurable, from 1:1 (invisible) to 21:1 (black on white). WCAG AA
requires:

- **4.5:1** for normal text
- **3:1** for large text — 18pt and above, or 14pt bold
- **3:1** for interface components and meaningful graphics

**Check rather than judge by eye.** Your eyes adapt, your monitor is better than a phone in
sunlight, and you already know what the text says. Browser developer tools show the ratio in
the colour picker; the axe and WAVE extensions check the whole page.

**The failures that recur:**

- **Grey on white.** \`#777\` is 4.48:1 — it fails, by 0.02, and it is an extremely popular choice
  for "muted" text
- **Placeholder text as a label.** Usually low contrast AND it disappears when typing
- **Light text on a photo.** The ratio varies across the image, so it passes in one corner
- **Disabled controls** so faint nobody can read what they are

**Size and zoom.** 16px minimum for body text — below that, mobile browsers may zoom on focus,
which is jarring. The page must work at **200% zoom**, which is a stated requirement and also
simply what many people browse at.

**Use relative units for text.** \`rem\` respects a user who has changed their default font size;
\`px\` overrides that choice silently. Somebody who set their browser to 20px did so for a
reason.

**Never rely on colour alone.** Red borders for errors, green for success, a red/green status
dot — all invisible to somebody who does not distinguish those colours, which is about one man
in twelve. Add text, an icon, or a pattern. **The test: print the page in greyscale. Is any
information gone?**

**Line length and spacing** belong here too: 45-75 characters, line height 1.5 or more. Both
matter disproportionately for dyslexic readers and for anybody reading at length.`,
    mcqs: [
      mcq('`#777` grey text on white is 4.48:1. What does that mean?',
        [['It fails WCAG AA for normal text by 0.02', true],
          ['It passes comfortably', false],
          ['It passes for body text', false],
          ['Contrast does not apply to grey', false]],
        'Failing by two hundredths is exactly why judging by eye is unreliable and the number must be checked.'),
      mcq('Why use `rem` rather than `px` for text?',
        [['rem respects a user who has changed their default font size; px overrides it', true],
          ['rem is newer', false],
          ['px is deprecated', false],
          ['No difference', false]],
        'Somebody who set their browser to 20px did so for a reason, and px silently discards it.'),
      mcq('The greyscale test checks for:',
        [['Information carried by colour alone', true],
          ['Contrast ratio', false],
          ['Font size', false],
          ['Zoom behaviour', false]],
        'If anything disappears when colour does, that information was never available to everybody.'),
      mcq('Placeholder text used as a label fails because:',
        [['It is usually low contrast and disappears as soon as the user types', true],
          ['It is too short', false],
          ['Screen readers ignore it', false],
          ['It is fine', false]],
        'Both problems at once, and the second means the user forgets what the field was for mid-entry.'),
    ],
    checkpoint: [
      mcq('A page must remain usable at what zoom level?',
        [['200%', true], ['110%', false], ['150%', false], ['No requirement', false]],
        'A stated requirement, and also simply how many people browse — fixed-height containers are what break.'),
      mcq('Roughly how many men do not distinguish red and green reliably?',
        [['About one in twelve', true], ['One in a hundred', false], ['One in a thousand', false], ['One in two', false]],
        'Large enough that a red/green status indicator fails for a meaningful share of any real audience.'),
    ],
  },
  {
    unitCode: 'T_ACCESSIBILITY_TESTING',
    notes: `Automated checks find roughly a third of accessibility problems. That is genuinely
useful and it is the part most people stop at, which is why the other two thirds are so common.

**What automation catches well:** missing alt attributes, insufficient contrast, missing form
labels, empty buttons and links, duplicate ids, invalid ARIA.

Tools: the axe and WAVE browser extensions, Lighthouse in Chrome, eslint-plugin-jsx-a11y during
development.

**Run them. They are free and they catch real problems.** Then keep going.

**What automation cannot catch**, and it is the more important two thirds:

- **Whether the alt text is any good.** \`alt="image"\` passes every checker and conveys nothing.
- **Whether the heading structure makes sense.** Valid levels can still describe the page
  wrongly.
- **Whether the tab order is logical.** Everything is reachable and the sequence is nonsense.
- **Whether an error message helps.** "Invalid input" is announced correctly and is useless.
- **Whether a custom widget behaves as its role claims.** \`role="tablist"\` that does not respond
  to arrow keys is worse than no role.
- **Whether the page can actually be used to complete a task.**

**The four manual checks, in the order of value:**

1. **Keyboard.** Tab through everything. Reachable, visible, operable, escapable. Thirty seconds.
2. **Zoom to 200%.** Does anything overlap, disappear or need horizontal scrolling?
3. **Greyscale.** Is any information lost?
4. **Screen reader.** Complete one real task with your eyes closed.

**The fourth is the one people skip and the one that finds the most**, because it is the only
test that experiences the page the way the structure actually describes it.

**Test as you build.** An accessibility pass at the end finds problems whose fix is structural,
which is when they get deferred. The same problems cost minutes when the markup is being
written.

**The honest summary to carry:** a green automated score means you have not made the obvious
mistakes. It does not mean the page is usable, and the difference between those two statements
is most of the work.`,
    mcqs: [
      mcq('Automated accessibility checks find approximately:',
        [['A third of problems', true], ['All of them', false], ['Nearly all', false], ['Under 5%', false]],
        'Genuinely useful and the place most people stop, which is why the other two thirds are so common.'),
      mcq('Which can automation NOT determine?',
        [['Whether the alt text actually conveys what the image conveys', true],
          ['Whether alt is present', false],
          ['Contrast ratio', false],
          ['Missing form labels', false]],
        'alt="image" passes every checker and conveys nothing, which is the shape of the whole gap.'),
      mcq('Which manual test finds the most problems?',
        [['Completing a real task with a screen reader and your eyes closed', true],
          ['Keyboard tabbing', false],
          ['Zoom to 200%', false],
          ['Greyscale', false]],
        'The only test that experiences the page the way its structure actually describes it.'),
      mcq('A green Lighthouse accessibility score means:',
        [['The obvious mistakes are absent — not that the page is usable', true],
          ['The page is accessible', false],
          ['It meets WCAG AA', false],
          ['No manual testing is needed', false]],
        'The difference between those two statements is most of the work in this topic.'),
    ],
    checkpoint: [
      mcq('Why test accessibility as you build rather than at the end?',
        [['Late problems tend to be structural, which is when they get deferred', true],
          ['Automated tools work better early, before the page grows large', false],
          ['It is required, and an audit at the end would come too late to pass', false],
          ['There is no real difference; the same problems are found either way', false]],
        'The same problem costs minutes while the markup is being written and days afterwards.'),
      mcq('`role="tablist"` on something that ignores arrow keys is:',
        [['Worse than no role — it promises behaviour that is not there', true],
          ['Better than nothing', false],
          ['Neutral', false],
          ['Caught by automated tools', false]],
        'A user who trusts the announced role and finds it does not work is worse off than one who never trusted it.'),
    ],
  },
  {
    unitCode: 'T_ACCESSIBILITY_PRACTICE',
    notes: `No new concepts. Take pages that are broken in realistic ways and make them usable.

**Why fixing rather than building.** Building accessibly from scratch is easier, and it is not
what you will mostly do. You will inherit pages, and the skill is finding what is wrong and
deciding what to change — sometimes the markup, sometimes the CSS, occasionally the design.

**The order to work in**, which also tells you what to fix first:

1. **Semantics.** Turn off CSS. Does it read as a document? Fix elements before anything else —
   most other problems disappear with them.
2. **Keyboard.** Tab through. Reachable, visible, operable, escapable.
3. **Contrast and zoom.** Measure, do not judge. Then 200%.
4. **Screen reader.** One real task, eyes closed.
5. **Automated check.** Last, to catch anything mechanical you missed.

**Running the automated check last is deliberate.** Run first, it directs attention to whatever
it can measure, which is not the same as what matters most.

**Faults worth practising on:**

- A \`<div>\` navigation bar with click handlers
- A form whose labels are placeholders
- A modal that traps focus, or never receives it
- Status shown only by colour
- Headings chosen by size, producing a nonsensical outline
- An icon-only button toolbar with no accessible names
- \`outline: none\` with no replacement

**For each, the discipline is the same:** name the problem, say who it affects, make the
smallest correct fix, and re-test. **"Who does this affect" is the part to say out loud** —
"keyboard users cannot reach the menu" is a sentence that gets a fix prioritised in a way that
"accessibility issue" never does.

**Watch for over-correction.** Adding \`role="button"\` to a div is not the fix; using a button
is. ARIA that duplicates what a native element would have said is a common outcome of learning
ARIA before semantics.`,
    mcqs: [
      mcq('What should be fixed first on an inaccessible page?',
        [['Semantics — most other problems disappear with correct elements', true],
          ['Contrast', false],
          ['ARIA attributes', false],
          ['Whatever the automated tool reports', false]],
        'Correct elements bring focus, keyboard behaviour and roles with them, so later fixes become unnecessary.'),
      mcq('Why run the automated checker LAST?',
        [['Run first, it directs attention to what it can measure rather than what matters most', true],
          ['It is slow', false],
          ['It gives false positives', false],
          ['It should be run first', false]],
        'Mechanical problems are worth catching; letting them set the agenda is what produces compliant, unusable pages.'),
      mcq('The correct fix for a `<div>` with a click handler is:',
        [['Replace it with a `<button>`', true],
          ['Add role="button"', false],
          ['Add tabindex="0"', false],
          ['Add an aria-label', false]],
        'The other three are each one part of rebuilding by hand what a button already does.'),
      mcq('Why say who a problem affects?',
        [['"Keyboard users cannot reach the menu" gets prioritised where "accessibility issue" does not', true],
          ['It is required in reports', false],
          ['It sounds more serious', false],
          ['It is not useful', false]],
        'A named person unable to do a named thing is a bug; a category name is a backlog item.'),
      mcq('Adding ARIA that duplicates native behaviour is:',
        [['A common over-correction from learning ARIA before semantics', true],
          ['Best practice', false],
          ['Harmless and worth doing', false],
          ['Required for compliance', false]],
        'It adds maintenance and risk while the native element was already saying the same thing correctly.'),
    ],
    checkpoint: [
      mcq('A modal never receives focus when opened. Who is affected and how?',
        [['Keyboard and screen-reader users, with no sign it opened and no way to reach it', true],
          ['Nobody, because the modal is on screen and can simply be clicked', false],
          ['Mouse users, who must hunt for the modal among the page behind it', false],
          ['Only mobile users, where focus behaves differently from a desktop', false]],
        'Focus management is the whole of modal accessibility, and it is invisible to anybody testing with a mouse.'),
      mcq('After making a fix, the next step is:',
        [['Re-test that specific thing before moving on to anything else', true],
          ['Move to the next issue, and re-test everything once at the end', false],
          ['Run the whole automated suite again, which catches any regression', false],
          ['Commit, so the fix is recorded before anything else can disturb it', false]],
        'Accessibility fixes frequently half-work, and the fastest way to find that out is immediately.'),
    ],
  },

  /* ── T_FORMS ──────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_FORMS_FORM_ELEMENTS',
    notes: `A form collects input. Choosing the right element for each piece is most of what makes
one pleasant or painful to use.

    <input type="text">        <input type="email">       <input type="number">
    <input type="date">        <input type="password">    <input type="checkbox">
    <input type="radio">       <textarea>                 <select>

**The \`type\` attribute earns more than it looks.** \`type="email"\` gives a mobile keyboard with
\`@\` on it, browser validation, and autofill. \`type="tel"\` gives a numeric keypad. Using
\`type="text"\` for everything discards all of that for free.

**Choosing between them:**

| Need | Use | Not |
|---|---|---|
| One option from 2-4 | Radio buttons | A select |
| One option from many | \`<select>\` | Many radios |
| Several from a list | Checkboxes | A multi-select |
| Yes or no | One checkbox | Two radios |
| Long text | \`<textarea>\` | A wide text input |

**Radios versus select for small sets.** Radios show every option at once, need one click, and
make the choice visible. A select hides the options behind an interaction. For three options
radios are better; the cutoff is around five.

**A multi-select is genuinely hard to use** — most people do not know to hold Ctrl, and on
mobile it is worse. Checkboxes are almost always the better answer.

**\`type="number"\` has real traps.** It rejects non-numeric input in a way that can silently
discard what the user typed, and scroll-wheel changes over a focused field are a recurring
complaint. For things that are digit strings rather than quantities — phone numbers, card
numbers, postcodes — \`type="text"\` with \`inputmode="numeric"\` is better: it gives the numeric
keypad without the numeric semantics.

**Related fields belong in a \`<fieldset>\` with a \`<legend>\`**, which is how a screen reader
announces the group. A set of radios without one is announced as unrelated options with no
question attached.

**\`name\` is what the server receives.** No name, no data submitted — and there is no error, so
it looks like the field was simply empty.

**Do not use \`disabled\` to mean "not yet valid".** Disabled fields are skipped by the keyboard
and their values are not submitted, and a user has no way to find out what would enable them.`,
    mcqs: [
      mcq('`type="email"` gives you what beyond text input?',
        [['A mobile keyboard with @, browser validation, and autofill', true],
          ['Nothing practical', false],
          ['Server validation', false],
          ['Encryption', false]],
        'Three free behaviours that `type="text"` discards, and the mobile keyboard alone is worth it.'),
      mcq('Three mutually exclusive options are best presented as:',
        [['Radio buttons — all visible, one click', true],
          ['A select', false],
          ['Checkboxes', false],
          ['A text input', false]],
        'A select hides the options behind an interaction; the cutoff is around five.'),
      mcq('For a phone number, the better choice is:',
        [['`type="text"` with `inputmode="numeric"`', true],
          ['`type="number"`', false],
          ['`type="tel"` with validation disabled', false],
          ['`type="password"`', false]],
        'A phone number is a digit string, not a quantity, and type="number" can silently discard what was typed.'),
      mcq('An input with no `name` attribute:',
        [['Submits nothing, with no error — it looks as though the field was empty', true],
          ['Fails validation', false],
          ['Cannot be focused', false],
          ['Submits as "unnamed"', false]],
        'Silent data loss, and it presents as a user problem rather than a markup one.'),
    ],
    checkpoint: [
      mcq('A group of radio buttons needs a `<fieldset>` and `<legend>` so that:',
        [['A screen reader announces the question the options belong to', true],
          ['They are styled consistently', false],
          ['Only one can be selected', false],
          ['They submit together', false]],
        'Without it they are announced as unrelated options with no question attached.'),
      mcq('Why not disable the submit button until the form is valid?',
        [['Disabled controls are skipped by the keyboard and give no reason why', true],
          ['A disabled button cannot be styled, so the form looks inconsistent', false],
          ['Validation would then run on every keystroke instead of on submit', false],
          ['Browsers ignore the disabled attribute on submit buttons anyway', false]],
        'The user is left with a dead control and no path to discovering what is wrong.'),
    ],
  },
  {
    unitCode: 'T_FORMS_LABELS',
    notes: `Every input needs a label. Not a placeholder, not nearby text — an actual \`<label>\`
associated with it.

**Two ways to associate:**

    <label for="email">Email</label>
    <input type="email" id="email" name="email">

    <label>Email <input type="email" name="email"></label>

The first is the common one and requires the \`id\` and \`for\` to match exactly.

**What association buys:**

1. **Clicking the label focuses the input.** A noticeably larger click target, which matters
   most for checkboxes and on phones.
2. **A screen reader announces the field's purpose** when it receives focus. Without it, the
   user hears "edit text" and nothing else.
3. **Autofill works properly**, because the browser can tell what the field is for.

**A placeholder is not a label**, and using one as a label is the commonest form mistake there
is. Three problems, all real:

- **It disappears when the user types**, so anybody interrupted has no way to recall what the
  field was for
- **It is usually low contrast** by default styling
- **Screen reader support is inconsistent** — some announce it, some do not, and you cannot
  rely on either

Placeholders are for an **example** of the format — "07700 900123" under a label reading "Mobile
number". They supplement; they never replace.

**Nearby text is not a label either.** A \`<span>\` visually beside an input has no association.
It looks identical and conveys nothing programmatically.

**Hiding a label visually is fine when the design demands it** — a search field with only a
magnifying glass. Hide it accessibly rather than with \`display: none\`, which removes it from
the accessibility tree entirely:

    .visually-hidden {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }

An \`aria-label\` is an acceptable alternative, with one drawback: it is invisible, so it is
easily forgotten during translation and easily left stale when the visible design changes.

**Mark required fields in text**, not only with a red asterisk. And use the \`required\`
attribute, which the browser and assistive technology both understand.`,
    mcqs: [
      mcq('Why is a placeholder not a substitute for a label?',
        [['It disappears when typing, is low contrast, and screen reader support is inconsistent', true],
          ['It is too short', false],
          ['It cannot be styled', false],
          ['It is deprecated', false]],
        'Three separate problems, and the disappearing one alone defeats anybody who is interrupted mid-form.'),
      mcq('`<label for="x">` requires what to work?',
        [['An input whose id is exactly "x"', true],
          ['The label to be adjacent', false],
          ['A name attribute', false],
          ['Matching classes', false]],
        'A mismatched or missing id produces a label that looks correct and is associated with nothing.'),
      mcq('Hiding a label with `display: none` is wrong because:',
        [['It is removed from the accessibility tree, so nothing announces it', true],
          ['It breaks the layout', false],
          ['It is slow', false],
          ['It is fine', false]],
        'A visually-hidden utility class keeps it available to assistive technology while removing it from view.'),
      mcq('Clicking a label focuses its input. Why does that matter most for checkboxes?',
        [['The checkbox itself is a very small target, especially on a phone', true],
          ['Checkboxes cannot be focused otherwise', false],
          ['It is required', false],
          ['It does not matter', false]],
        'A label-sized target instead of a 13-pixel one is a substantial usability difference.'),
    ],
    checkpoint: [
      mcq('A search field shows only a magnifying glass. The correct approach is:',
        [['A real label, hidden with a visually-hidden class', true],
          ['A placeholder saying "Search"', false],
          ['No label', false],
          ['`display: none` on the label', false]],
        'An aria-label is acceptable too, with the drawback that it is invisible and easily left stale.'),
      mcq('Required fields should be marked:',
        [['In text as well as visually, and with the `required` attribute', true],
          ['With a red asterisk only', false],
          ['With a bold label', false],
          ['Not at all', false]],
        'An asterisk alone is colour-and-symbol convention that has to be learned and cannot be announced meaningfully.'),
    ],
  },
  {
    unitCode: 'T_FORMS_VALIDATION',
    notes: `The browser will validate a good deal for free, and using it gives behaviour that is
consistent, translated, and accessible without effort.

    <input type="email" required>
    <input type="number" min="1" max="100">
    <input type="text" minlength="8" maxlength="50">
    <input type="text" pattern="[0-9]{6}" title="Six digits">

**What each does:** \`required\` — must not be empty. \`type\` — checks the format for email and
url. \`min\`/\`max\` — numeric or date bounds. \`minlength\`/\`maxlength\` — text length. \`pattern\` —
a regular expression, with \`title\` supplying the message explaining it.

**Why use these rather than writing it in JavaScript:** the messages are in the user's language,
the behaviour matches every other site they use, it works before your script loads, and
assistive technology understands the states.

**Styling validity:**

    input:invalid { border-color: #b91c1c; }
    input:user-invalid { border-color: #b91c1c; }   /* only after interaction */

**\`:invalid\` alone is a usability problem.** It matches on page load, so every required field is
red before the user has typed anything. \`:user-invalid\` applies only after they have interacted,
which is what you actually wanted.

**When JavaScript is still needed:** cross-field rules — password confirmation, a date range —
anything requiring a server check, and error messages more specific than the browser's.

**Do not disable browser validation and rebuild it.** Extend it:

    if (!input.checkValidity()) { /* show your own message */ }

\`checkValidity()\` uses the same rules and reports whether they passed.

**\`pattern\` is powerful and easy to get wrong.** An overly strict regex for email or phone
numbers rejects legitimate values — valid email addresses are far more varied than most patterns
allow, and postcode and phone formats differ by country. **Be permissive and verify by sending
something**, rather than rejecting on a guess about format.

**None of this is security.** Client validation is an assistance to an honest user. Anybody can
open developer tools and remove an attribute, or skip the page entirely. **The server must
validate everything again**, with no exceptions.`,
    mcqs: [
      mcq('Why prefer built-in validation over JavaScript?',
        [['Messages are translated, behaviour is familiar, and it works before your script loads', true],
          ['It is more secure', false],
          ['JavaScript cannot validate', false],
          ['It is faster to execute', false]],
        'Four free properties, none of which a hand-written implementation gets without effort.'),
      mcq('`input:invalid` styling is a problem because:',
        [['It matches on page load, so required fields are red before anyone types', true],
          ['It is not supported', false],
          ['It overrides other styles', false],
          ['It is not a problem', false]],
        ':user-invalid applies only after interaction, which is the behaviour that was actually wanted.'),
      mcq('An overly strict email `pattern` causes:',
        [['Legitimate addresses to be rejected', true],
          ['Slower validation', false],
          ['A security hole', false],
          ['Nothing', false]],
        'Valid addresses are far more varied than most patterns allow. Be permissive and verify by sending something.'),
      mcq('Client-side validation provides:',
        [['Helpfulness — the server must validate everything again', true],
          ['Security', false],
          ['Both', false],
          ['Protection against malformed data', false]],
        'Anybody can remove an attribute in developer tools or skip the page entirely.'),
    ],
    checkpoint: [
      mcq('You need a password-confirmation check. What should you do?',
        [['Extend the built-in validation with JavaScript, using checkValidity', true],
          ['Disable built-in validation and write your own', false],
          ['Use a pattern attribute', false],
          ['Validate on the server only', false]],
        'Cross-field rules are exactly what the built-in set cannot express, and extending keeps everything else.'),
      mcq('`pattern` needs `title` because:',
        [['The title supplies the message explaining what the pattern requires', true],
          ['It is required syntax, and the pattern is ignored without it', false],
          ['It sets the placeholder text shown inside the empty field', false],
          ['It enables the pattern, which is inert until a title is supplied', false]],
        'Without it the browser says the format is wrong and gives the user no idea what would be right.'),
    ],
  },
  {
    unitCode: 'T_FORMS_SUBMISSION',
    notes: `What happens when somebody presses submit, and where the data actually goes.

    <form action="/signup" method="post">
      <input name="email" type="email" required>
      <button type="submit">Sign up</button>
    </form>

**\`action\`** — the URL it goes to. Omitted means the current page.
**\`method\`** — \`get\` or \`post\`.
**\`name\`** — what each value is called when it arrives. No name, no data.

**GET versus POST, and the distinction is not stylistic:**

| | GET | POST |
|---|---|---|
| Data goes | In the URL query string | In the request body |
| Visible | In the address bar and history | No |
| Bookmarkable | Yes | No |
| Length limit | Yes, practical | No |
| Repeating it | Safe | May duplicate the action |

**Use GET for searches and filters.** The URL then describes the result, which means it can be
bookmarked, shared and reloaded — real usability wins that come free from the right method.

**Use POST for anything that changes something.** Creating an account, placing an order, sending
a message. Two reasons: the data is not written into browser history and server logs, and the
browser knows to warn before re-submitting.

**Never send a password over GET.** It would appear in the address bar, in history, in logs, and
in the Referer header sent to other sites.

**\`type="submit"\` versus \`type="button"\`.** Inside a form, a button with no type attribute
defaults to **submit**. A "Clear" button without \`type="button"\` therefore submits the form,
which is a genuinely confusing bug and an easy one to write.

**Enter submits a form** from a text field, which users expect and which is another argument for
using a real form element rather than a div with a click handler.

**The double-submission problem.** A slow response leads to a second click and two orders.
Handle it: disable the button on submit and show a pending state, and give the server an
idempotency key for anything that must not happen twice. **Client-side prevention alone is not
sufficient** — a refresh or a lost response can still repeat the request.

**Redirect after a successful POST.** Otherwise a refresh re-submits, with the browser's "resend
form data?" prompt. Post, then redirect to a GET.`,
    mcqs: [
      mcq('Which is the right method for a search form, and why?',
        [['GET — the URL then describes the results and can be bookmarked and shared', true],
          ['POST, to keep the query private', false],
          ['Either; no difference', false],
          ['POST, because it is more modern', false]],
        'Real usability wins that come free from the correct method rather than from any extra work.'),
      mcq('A "Clear" button inside a form unexpectedly submits it. Why?',
        [['A button with no type defaults to submit inside a form', true],
          ['Clear is a reserved word', false],
          ['The form lacks an action', false],
          ['Buttons always submit', false]],
        'One missing attribute, and the symptom looks like a JavaScript problem rather than a markup one.'),
      mcq('Why never send a password over GET?',
        [['It appears in the address bar, history, server logs and the Referer header', true],
          ['GET is slower', false],
          ['GET has a length limit', false],
          ['It cannot be encrypted', false]],
        'Four separate places it is recorded, all of them outside your control once it has been sent.'),
      mcq('After a successful POST you should:',
        [['Redirect to a GET, so a refresh does not re-submit', true],
          ['Render the result directly', false],
          ['Reload the form', false],
          ['Use the back button', false]],
        'Otherwise a refresh produces the "resend form data" prompt and, if confirmed, a duplicate action.'),
    ],
    checkpoint: [
      mcq('Disabling the submit button on click prevents duplicate orders:',
        [['Only partly: a refresh or a lost response can still repeat the request', true],
          ['Completely, because the second click can no longer reach the server', false],
          ['Not at all, because the browser re-enables the button at once', false],
          ['Only on mobile, where the double-tap is the usual cause of duplicates', false]],
        'Which is why anything that must not happen twice needs an idempotency key on the server.'),
      mcq('An input without a `name` attribute results in:',
        [['That value never reaching the server, and no error anywhere', true],
          ['A validation failure when the form is submitted to the server', false],
          ['A console warning, which the browser emits for unnamed inputs', false],
          ['The `id` being sent instead, which is the documented fallback', false]],
        'It presents as the user having left the field blank, which sends debugging in the wrong direction.'),
    ],
  },
  {
    unitCode: 'T_FORMS_ERRORS',
    notes: `An error message is the form talking to somebody who is already slightly frustrated.
Its job is to get them unstuck, which is a higher bar than being accurate.

**The three questions a message must answer:**

1. **What is wrong?**
2. **Which field?**
3. **What should I do about it?**

Most messages answer the first and stop.

| Poor | Better |
|---|---|
| "Invalid input" | "Email must include an @" |
| "Error" | "Password must be at least 8 characters" |
| "Field required" | "Enter your date of birth" |
| "Invalid date format" | "Use DD/MM/YYYY, for example 14/03/2006" |

**Show the example.** For anything with a format, an example does more than a description. "Use
DD/MM/YYYY" is fine; adding "for example 14/03/2006" removes the last doubt.

**Where to show it:** immediately below the field it concerns. A summary at the top is useful
*as well*, for a long form — and only if each entry links to its field.

**When to show it:**

- **Not while typing.** Telling somebody their email is invalid after two characters is noise.
- **On blur** — when they leave the field — is right for most fields.
- **On submit** for anything cross-field, and for the summary.
- **Once corrected, clear it immediately.** A stale error on a now-valid field is worse than no
  error, because it says the form is wrong when it is not.

**Making it accessible**, which is where most implementations stop short:

    <input id="email" aria-invalid="true" aria-describedby="email-error">
    <p id="email-error" class="error">Email must include an @</p>

\`aria-describedby\` is what causes the message to be announced when the field is focused.
Without it a screen reader user hears "Email, edit text, invalid" and never learns why.

**Colour is not enough** — the same rule as everywhere, and forms are where it does the most
damage. Add text and an icon.

**Move focus to the first error on submit.** Otherwise a keyboard user submits, nothing appears
to happen, and the error is somewhere above them on the page.

**Never clear the form on error.** It is rare now and still happens, and losing everything
somebody typed because one field was wrong is the worst thing a form can do to a person.`,
    mcqs: [
      mcq('The three questions an error message must answer are:',
        [['What is wrong, which field, and what to do about it', true],
          ['What, when and why', false],
          ['Field, code and severity', false],
          ['Error, cause and log id', false]],
        'Most messages answer the first and stop, which leaves the user accurately informed and still stuck.'),
      mcq('When should a field-level error usually appear?',
        [['On blur, when the user leaves the field', true],
          ['While typing', false],
          ['Only on submit', false],
          ['On page load', false]],
        'Telling somebody their email is invalid after two characters is noise they learn to ignore.'),
      mcq('What makes an error announced to a screen reader?',
        [['aria-describedby on the input pointing at the message element', true],
          ['A red border', false],
          ['The word "error" in the text', false],
          ['role="alert" alone', false]],
        'Without it the user hears "invalid" and never learns why, which is barely better than nothing.'),
      mcq('A stale error on a now-corrected field is:',
        [['Worse than no error — it says the form is wrong when it is not', true],
          ['Harmless', false],
          ['Useful as a reminder', false],
          ['Expected behaviour', false]],
        'It destroys trust in every other message on the page, because none of them can now be believed.'),
    ],
    checkpoint: [
      mcq('On submit with errors, focus should move to:',
        [['The first field with an error', true],
          ['The top of the page', false],
          ['The submit button', false],
          ['Nowhere', false]],
        'Otherwise a keyboard user submits, nothing seems to happen, and the error is somewhere above them.'),
      mcq('Which message is most useful?',
        [['"Use DD/MM/YYYY, for example 14/03/2006"', true],
          ['"Invalid date format"', false],
          ['"Error in date field"', false],
          ['"Please check your input"', false]],
        'The example removes the last doubt, which description alone leaves in place.'),
    ],
  },
  {
    unitCode: 'T_FORMS_PRACTICE',
    notes: `No new concepts. Build several real forms, including the awkward ones — because the
awkward cases are where the decisions are, and a login form teaches almost nothing.

**Forms worth building:**

- **Registration** — email, password with confirmation, date of birth, terms checkbox
- **Address** — with a country select that changes which fields are required
- **Payment** — card number, expiry, CVV, with the formatting that implies
- **Search with filters** — GET, bookmarkable, with the filters reflected in the URL
- **Multi-step** — with progress shown and back navigation that does not lose data

**The last two are where the real learning is.** A search form that produces a shareable URL,
and a multi-step form that survives the back button, both require you to think about where state
lives rather than only about markup.

**The checklist for any form, before you call it done:**

1. Does every input have a real \`<label>\`?
2. Is the right \`type\` used, so mobile keyboards and autofill work?
3. Does \`name\` exist on everything you expect to receive?
4. Are required fields marked in text as well as visually?
5. Do error messages say what to DO?
6. Is each error associated with its field via \`aria-describedby\`?
7. Can the whole form be completed with the keyboard alone?
8. Does Enter submit from a text field?
9. Are non-submit buttons marked \`type="button"\`?
10. Is it GET for reads and POST for writes?
11. Does a double-click produce one action or two?
12. Does anything survive a refresh that should not?

**Test with awkward input**, because real users produce it: an apostrophe in a name, a very long
email, a pasted value with trailing whitespace, a non-Latin name, an emoji, a date in the past
for a future-only field.

**And test the recovery path.** Fill it in wrongly, submit, read the errors, correct one, and
check the others are still there and the corrected one has gone. That sequence is the form's
real user experience and it is the part nobody tests.`,
    mcqs: [
      mcq('Why is a search form best submitted with GET?',
        [['The URL then describes the results and can be bookmarked and shared', true],
          ['It is faster', false],
          ['POST would fail', false],
          ['Searches are short', false]],
        'It also makes the back button behave as users expect, which POST does not.'),
      mcq('A non-submit button inside a form must have:',
        [['type="button"', true], ['a name', false], ['an id', false], ['onclick', false]],
        'Without it the default is submit, and the resulting bug looks like a JavaScript problem.'),
      mcq('Which awkward input is most likely to break a name field?',
        [['An apostrophe, as in O\'Brien', true],
          ['A long email', false],
          ['A past date', false],
          ['A number', false]],
        'Real and extremely common, and it also exposes any place the value is concatenated into a query or into HTML.'),
      mcq('The recovery path worth testing is:',
        [['Submit wrongly, correct one field, and check the other errors persist and that one clears', true],
          ['Submit correctly twice', false],
          ['Refresh the page', false],
          ['Clear the form', false]],
        'The form\'s real user experience, and the part almost nobody tests.'),
      mcq('A multi-step form must survive:',
        [['The back button, without losing what was entered', true],
          ['Only forward navigation', false],
          ['A page refresh only', false],
          ['Nothing in particular', false]],
        'It forces a decision about where state lives, which is why it teaches more than a single-page form.'),
    ],
    checkpoint: [
      mcq('Every value taken from a form should first be:',
        [['Trimmed, and converted if it needs to be a number', true],
          ['Uppercased', false],
          ['Escaped for HTML', false],
          ['Stored', false]],
        'Trailing whitespace from pasting is invisible and compares unequal, and every value arrives as a string.'),
      mcq('Which of these is a server responsibility rather than a client one?',
        [['Validating that the data is actually acceptable', true],
          ['Showing the error next to the field', false],
          ['Choosing the input type', false],
          ['Focus management', false]],
        'The client helps an honest user; the server is what protects the data from anybody else.'),
    ],
  },
  {
    unitCode: 'T_FORMS_MINI_PROJECT',
    notes: `One form that collects something real and handles every case — including all the ones
that are easy to skip.

**Why a form specifically.** It is the smallest piece of a web application that contains
everything: markup, semantics, validation, error handling, accessibility, submission and state.
A form done properly demonstrates more than a much larger page done loosely.

**What "handles every case" means here**, and it is the whole brief:

- Valid input works
- Each kind of invalid input produces a message that says what to do
- Errors clear when corrected, and only the corrected one clears
- The keyboard alone completes it
- A screen reader announces every field and every error
- A double submission does not produce two of anything
- Awkward real input — apostrophes, long values, pasted whitespace, non-Latin names — is
  accepted rather than rejected

**The order to build in:**

1. **Semantic HTML with labels.** No CSS, no JavaScript. Complete it with the keyboard.
2. **Built-in validation.** Get as far as the browser will take you for free.
3. **CSS**, including a visible focus style and error styling that is not only colour.
4. **JavaScript** for what remains — cross-field rules, better messages, focus management.
5. **Test the recovery path**, which is the part that finds the remaining bugs.

**Build it in that order specifically.** Starting from a design and adding semantics afterwards
is how forms end up with divs and placeholders, and it is the harder path even though it feels
faster at the start.

The brief, acceptance criteria and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Working Form',
      description: `Build one form that collects something real and handles every case: validation, errors, accessibility, submission and awkward input. Assessed on the cases most forms skip.`,
      instructions: `**The brief**

Build ONE of these, or something of comparable scope:

- **Event registration** — name, email, phone, number of tickets, dietary requirements, terms
- **Job application** — personal details, education (repeatable rows), a cover note with a
  character limit, availability date
- **Support request** — category select that changes which fields appear, priority, description,
  optional attachment

**Requirements**

1. **Semantic HTML.** A real \`<label>\` for every input, correct \`type\`, \`name\` on everything,
   related fields in a \`<fieldset>\` with a \`<legend>\`.
2. **Built-in validation used first**, extended with JavaScript only where it cannot express the
   rule.
3. **At least one cross-field rule** — a confirmation, a conditional requirement, or a date
   range.
4. **Error messages that say what to do**, shown below the field, associated with
   \`aria-describedby\`, and with \`aria-invalid\` set.
5. **Errors clear individually** when corrected.
6. **Focus moves to the first error** on failed submit.
7. **Fully keyboard operable**, with visible focus.
8. **Double submission produces one action.**
9. **Nothing is ever cleared on error.**

**What to submit**

1. \`.html\`, \`.css\` and \`.js\` files.
2. A **test table** covering at minimum:

   | Case | Expected | Actual |
   |---|---|---|
   | All valid | | |
   | Each field empty | | |
   | Each field invalid | | |
   | Cross-field rule violated | | |
   | Name with an apostrophe | | |
   | Pasted value with whitespace | | |
   | Non-Latin characters | | |
   | Double submit | | |
   | Correct one error, others remain | | |

3. An **accessibility note**: confirm you completed the form with the keyboard only and with a
   screen reader, and state what each error sounded like.
4. A **decisions document** (roughly 250-350 words): which validation is built-in and which is
   JavaScript and why; how you handled the cross-field rule; what you decided NOT to validate
   and why.

**Constraints**

- No form library or framework.
- No placeholder used as a label.
- No \`disabled\` submit button.
- Every error must be perceivable without colour.

**Where the marks are.** The test table and the accessibility note. A plain-looking form that
handles every row of that table scores well above an attractive one that only handles valid
input.`,
      rubric: [
        {
          criterion: 'Semantics and structure',
          description: 'Real labels on every input, correct types, names present, fieldset and legend for grouped fields, no placeholder-as-label.',
          maxPoints: 20,
        },
        {
          criterion: 'Validation',
          description: 'Built-in validation used where it applies and extended rather than replaced; at least one cross-field rule working; permissive patterns that do not reject legitimate values.',
          maxPoints: 20,
        },
        {
          criterion: 'Errors',
          description: 'Messages say what to do; associated via aria-describedby with aria-invalid set; clear individually when corrected; focus moves to the first error; nothing is cleared on error.',
          maxPoints: 25,
        },
        {
          criterion: 'Accessibility',
          description: 'Completable by keyboard alone with visible focus; errors perceivable without colour; screen-reader note describing what each error sounded like.',
          maxPoints: 20,
        },
        {
          criterion: 'Test evidence',
          description: 'Every row of the required table completed with real observed results, including the awkward input and the double submit.',
          maxPoints: 15,
        },
      ],
      totalPoints: 100,
    },
  },
];
