/**
 * Career-track content: JT_BOOTSTRAP (Bootstrap 5) — ten units.
 *
 * Bootstrap is taught as a set of decisions somebody else made: the grid, the components, the
 * utilities and the supported ways to change them. Every unit is written against Bootstrap 5
 * (no jQuery, data-bs-* attributes, flexbox grid, breakpoints sm 576 / md 768 / lg 992 /
 * xl 1200 / xxl 1400).
 *
 * Attribution: the topic declares BOOTSTRAP and RESPONSIVE_DESIGN; every checkpoint question names
 * the one it measures — layout that changes across screen sizes is RESPONSIVE_DESIGN, knowing the
 * framework's classes, components and customisation is BOOTSTRAP.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const cq = (skillKey: 'BOOTSTRAP' | 'RESPONSIVE_DESIGN', question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_BOOTSTRAP_BUNDLES: PilotBundle[] = [
  /* ── WHAT_IT_GIVES ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_WHAT_IT_GIVES',
    notes: `**Bootstrap is a CSS framework: a stylesheet and a small JavaScript file that somebody else
wrote, full of decisions you accept the moment you add them.** Knowing which decisions you are
accepting is the difference between using Bootstrap and fighting it.

## What you get

- **A reset and base typography** (Reboot), so buttons, headings and form fields look the same in
  every browser.
- **A 12-column responsive grid** built on flexbox, with five breakpoints: sm (576px), md (768px),
  lg (992px), xl (1200px) and xxl (1400px).
- **Components**: navbar, cards, buttons, alerts, modals, dropdowns, accordions, toasts.
- **Utility classes**: one class, one job — mt-3 (margin-top), d-flex (display: flex),
  text-center, bg-primary.
- **JavaScript for interactive components**, written in plain JavaScript. Bootstrap 5 dropped
  jQuery entirely.

## Adding it to a page

The quickest way is the CDN: one stylesheet in the head, one script before the closing body tag.

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
      <h1 class="text-center mt-5">Hello</h1>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>

Two lines matter more than they look. The **viewport meta tag** tells a phone not to pretend to be
a 980px-wide desktop; without it no breakpoint ever fires and the "responsive" page shrinks to
unreadable. **bootstrap.bundle.min.js** includes Popper, the positioning library that dropdowns,
tooltips and popovers need; the plain bootstrap.min.js does not.

In a real project you would usually install it with npm (npm install bootstrap) and import the Sass
source, which is what makes customisation possible.

## What it costs

- **Weight.** The full CSS is around 200KB unminified; most pages use a fraction of it.
- **Sameness.** A default Bootstrap site looks like a default Bootstrap site.
- **Class-heavy markup.** Layout lives in the HTML: class="col-12 col-md-6 mb-3 d-flex".
- **Its opinions.** Change the look by changing its variables, not by out-shouting it with CSS.

## When plain CSS is the better choice

A highly custom design, a tiny one-page site, or a team that already has a design system. Bootstrap
earns its place on admin panels, internal tools, prototypes and products that need to be consistent
and responsive quickly.

**Common mistake:** loading Bootstrap's CSS after your own stylesheet, so your rules are silently
overridden. Bootstrap first, your styles after.`,
    workedExample: `**Problem:** a new page uses a Bootstrap dropdown, but clicking the toggle does nothing.

**Reasoning:** dropdowns are interactive, so they need JavaScript. Check the bottom of the body:
the page loads bootstrap.min.js. That file does not contain Popper, and dropdowns need Popper to
position their menu. Bootstrap 5.3 reports this in the console as an error about Popper.

**Fix:** replace it with bootstrap.bundle.min.js, which includes Popper, and confirm the toggle has
data-bs-toggle="dropdown" (Bootstrap 4's data-toggle no longer works). One file changed, cause
found, nothing touched at random.`,
    mcqs: [
      mcq('A teammate adds Bootstrap 5 from the CDN and asks which script file to include so that dropdowns and tooltips work. What do you tell them?', [
        ['bootstrap.bundle.min.js, because it already contains Popper', true],
        ['bootstrap.min.js, because Popper is now built into the CSS file', false],
        ['jquery.min.js first, then bootstrap.min.js after it', false],
        ['No script at all, since Bootstrap 5 components are pure CSS', false],
      ], 'The bundle file ships Popper, which dropdowns, tooltips and popovers use to position themselves. Bootstrap 5 does not use jQuery, and its interactive components do need JavaScript.'),
      mcq('Which situation is the strongest argument for writing plain CSS instead of adopting Bootstrap?', [
        ['A one-off marketing page with a fully bespoke visual design', true],
        ['An internal admin panel that needs forms and tables quickly', false],
        ['A prototype that must look consistent on phones next week', false],
        ['A team with no designer building a CRUD dashboard for staff', false],
      ], 'Bootstrap saves time when its defaults are acceptable. A fully custom design would mean overriding most of those defaults, paying the weight of the framework while using little of it.'),
      mcq('A page includes Bootstrap but on a phone it renders like a tiny zoomed-out desktop site and no breakpoint ever applies. What is most likely missing?', [
        ['The viewport meta tag with width=device-width', true],
        ['The bootstrap.bundle.min.js script at the end', false],
        ['A container-fluid wrapper around the whole page', false],
        ['The lang attribute on the opening html element', false],
      ], 'Without the viewport meta tag, mobile browsers lay the page out at roughly 980px and scale it down, so media queries for small screens never match.'),
    ],
    checkpoint: [
      cq('BOOTSTRAP', 'Which statement about Bootstrap 5 and jQuery is accurate?', [
        ['Bootstrap 5 removed jQuery; its components use plain JavaScript', true],
        ['Bootstrap 5 still needs jQuery, but only for modals and carousels', false],
        ['Bootstrap 5 bundles jQuery inside bootstrap.bundle.min.js now', false],
        ['Bootstrap 5 needs jQuery unless you install it through npm', false],
      ], 'Dropping the jQuery dependency was one of the headline changes in Bootstrap 5; the interactive components are written in vanilla JavaScript.'),
      cq('BOOTSTRAP', 'A developer links their own styles.css before the Bootstrap stylesheet, and their button colours never show. Why?', [
        ['Bootstrap loads later, so equal-specificity rules from it win', true],
        ['Custom stylesheets are ignored whenever a CDN file is present', false],
        ['Bootstrap marks every one of its rules with !important by default', false],
        ['Button colours can only be changed through JavaScript options', false],
      ], 'When two rules have the same specificity, the one declared later wins. Load Bootstrap first and your own stylesheet after it.'),
      cq('RESPONSIVE_DESIGN', 'What are the minimum widths of Bootstrap 5\'s md and lg breakpoints?', [
        ['768px for md and 992px for lg', true],
        ['720px for md and 960px for lg', false],
        ['640px for md and 1024px for lg', false],
        ['800px for md and 1200px for lg', false],
      ], 'Bootstrap 5 breakpoints are sm 576px, md 768px, lg 992px, xl 1200px and xxl 1400px; each applies from that width upward.'),
    ],
  },

  /* ── GRID ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_GRID',
    notes: `**The grid is three layers, always in the same order: container, row, column.** Get the order
right and layouts rearrange themselves; skip a layer and the gutters and alignment fall apart.

    <div class="container">
      <div class="row">
        <div class="col-12 col-md-6 col-lg-4">Card one</div>
        <div class="col-12 col-md-6 col-lg-4">Card two</div>
        <div class="col-12 col-md-12 col-lg-4">Card three</div>
      </div>
    </div>

## The three layers

**Container** centres the content and sets a max-width per breakpoint. container is fixed-width at
each breakpoint; container-fluid is always 100% wide; container-md is 100% until md, then fixed.

**Row** is a flex container. It uses negative margins to cancel the column padding at the edges, and
it is what makes columns sit side by side. Columns must be direct children of a row.

**Columns** divide the row into twelve. col-6 is half, col-4 a third, col-3 a quarter. Plain col
shares the space equally with its siblings; col-auto takes the width of its content.

## Breakpoints are mobile-first

A class like col-md-6 means "from 768px and up, take 6 of 12 columns". Below md, the column falls
back to whatever smaller class applies, and with none it is full width. So the example above is
one column on a phone, two on a tablet and three on a laptop. You write the phone layout first and
add classes for wider screens; you never write col-sm-12 col-md-12 col-lg-12 to mean "full width".

## Gutters, offsets and order

- **Gutters** are the gaps between columns, set on the row: g-0 removes them, g-4 widens them,
  gx-* and gy-* control one axis.
- **Offsets** push a column right: offset-md-2 skips two columns from md up.
- **Order** reorders visually: order-first, order-md-2. Screen readers still read source order.
- **Nesting**: a column can contain a new row, which is again divided into twelve.
- **row-cols-*** sets the column count on the row: row-cols-1 row-cols-md-3.

## Why the twelve

Twelve divides by 2, 3, 4 and 6, so halves, thirds and quarters all land on whole columns.

**Common mistakes:** columns placed directly in a container with no row (the gutters break);
column classes adding up to more than 12 and expecting them to squeeze (they wrap onto a new line);
and reading col-md-6 as "only on medium screens" rather than "medium and up".`,
    workedExample: `**Problem:** a product listing must show one product per row on phones, two on tablets and four
on desktops wider than 1200px.

**Reasoning:** mobile-first means start with the phone: col-12. From md (768px) two per row is
6 of 12: col-md-6. From xl (1200px) four per row is 3 of 12: col-xl-3. lg inherits md's value,
so it stays at two, which is what was asked.

    <div class="container">
      <div class="row g-3">
        <div class="col-12 col-md-6 col-xl-3"><div class="card">...</div></div>
        <!-- repeat for each product -->
      </div>
    </div>

The same result with row-cols: class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3" and a plain
col on each item. g-3 puts an even gap between cards in both directions, so no margin hacks.`,
    mcqs: [
      mcq('On a 1024px-wide screen, how wide is a column with class="col-12 col-md-8 col-xl-6"?', [
        ['8 of 12 columns, because md applies and xl does not yet', true],
        ['6 of 12 columns, because xl overrides every smaller class', false],
        ['12 of 12 columns, because the first class always wins out', false],
        ['8 of 12 only on tablets, and 12 again from 992px upward', false],
      ], 'Breakpoint classes apply from their minimum width upward. 1024px is past md (768px) but below xl (1200px), so col-md-8 is the one in effect.'),
      mcq('A row holds three columns with classes col-md-5, col-md-5 and col-md-4. What happens at md and above?', [
        ['The third column wraps onto a new line below the first two', true],
        ['All three shrink proportionally to fit within one line', false],
        ['The third column overflows the container to the right side', false],
        ['Bootstrap reduces the gutters until all three columns fit', false],
      ], 'The total is 14 of 12. A row uses flex-wrap, so a column that does not fit wraps to the next line rather than being squeezed.'),
      mcq('Which class removes the horizontal and vertical gaps between all columns in a row?', [
        ['g-0 placed on the row element', true],
        ['p-0 placed on every column element', false],
        ['gx-5 placed on the container element', false],
        ['m-0 placed on the row element', false],
      ], 'Gutters are controlled on the row with g-*, gx-* or gy-*; g-0 sets both axes to zero.'),
    ],
    checkpoint: [
      cq('RESPONSIVE_DESIGN', 'You want a sidebar and main area side by side from 992px up, but stacked on smaller screens. Which classes fit?', [
        ['col-lg-3 for the sidebar and col-lg-9 for the main area', true],
        ['col-3 for the sidebar and col-9 for the main area always', false],
        ['col-sm-3 for the sidebar and col-sm-9 for the main area', false],
        ['col-xl-3 for the sidebar and col-xl-9 for the main area', false],
      ], 'lg starts at 992px. Below it the columns have no width class and fall back to full width, so they stack.'),
      cq('BOOTSTRAP', 'What is the job of the .row element in the Bootstrap 5 grid?', [
        ['It is the flex container that lines columns up and offsets their padding', true],
        ['It centres the page and sets the maximum width at each breakpoint', false],
        ['It adds a horizontal rule and spacing between stacked page sections', false],
        ['It forces every child onto one single line no matter how wide they all become', false],
      ], 'The row is display:flex with flex-wrap and negative margins that cancel the column padding; centring and max-width are the container\'s job.'),
      cq('RESPONSIVE_DESIGN', 'Which container is full width on phones and tablets but fixed-width from 768px upward?', [
        ['container-md', true],
        ['container-fluid', false],
        ['container-sm', false],
        ['container-lg', false],
      ], 'A responsive container like container-md is 100% wide until its breakpoint (md, 768px) and then takes the fixed max-widths of a normal container.'),
    ],
  },

  /* ── COMPONENTS ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_COMPONENTS',
    notes: `**A Bootstrap component is a contract: write the markup it expects, with the classes and
data-bs-* attributes it looks for, and it works.** Leave out one piece and it silently does not.

## Navbar

    <nav class="navbar navbar-expand-lg bg-body-tertiary">
      <div class="container">
        <a class="navbar-brand" href="#">Shop</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false"
                aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item"><a class="nav-link active" aria-current="page" href="#">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="#">Pricing</a></li>
          </ul>
        </div>
      </div>
    </nav>

navbar-expand-lg means "show the links in a row from lg up; below that, collapse them behind the
toggler". The toggler's data-bs-target must match the collapse element's id exactly — the most
common reason a hamburger button does nothing. ms-auto pushes the links to the right.

## Cards

    <div class="card h-100">
      <img src="shoe.jpg" class="card-img-top" alt="Running shoe">
      <div class="card-body">
        <h5 class="card-title">Runner X</h5>
        <p class="card-text">Light, and built for road miles.</p>
        <a href="#" class="btn btn-primary">Buy</a>
      </div>
    </div>

Cards have no width of their own — put them in grid columns. h-100 makes cards in one row equal
height.

## Buttons

btn plus a variant: btn-primary, btn-outline-secondary, btn-danger. Sizes: btn-sm, btn-lg. Use a
button element for actions and an a element for navigation; both can carry the classes.

## Modals

    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#signup">Sign up</button>
    <div class="modal fade" id="signup" tabindex="-1" aria-labelledby="signupTitle" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="signupTitle">Sign up</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">...</div>
        </div>
      </div>
    </div>

## Which components need JavaScript

CSS-only: cards, buttons, alerts (unless dismissible), badges, list groups. JavaScript: collapse
(so the navbar toggler), modal, dropdown, carousel, offcanvas, toast, tooltip and popover. Tooltips
and popovers are opt-in: you must initialise them yourself with new bootstrap.Tooltip(el).

**Common mistakes:** Bootstrap 4 attributes (data-toggle) in a Bootstrap 5 page; a modal nested
inside an element with position or overflow that clips it — keep modals near the end of body; and
forgetting the JavaScript file entirely.`,
    mcqs: [
      mcq('A navbar uses navbar-expand-md. On a 600px-wide phone, what does the user see?', [
        ['The brand and a toggler button, with links hidden until tapped', true],
        ['All the navigation links laid out in one horizontal row across the top', false],
        ['No navbar at all, because md hides it below 768px wide', false],
        ['The links stacked vertically and always visible below it', false],
      ], 'navbar-expand-md expands the navbar from 768px up. Below that, the navbar-collapse content is hidden behind the toggler.'),
      mcq('Which pair of attributes on a button opens the modal whose id is "confirm"?', [
        ['data-bs-toggle="modal" and data-bs-target="#confirm"', true],
        ['data-toggle="modal" and data-target="#confirm"', false],
        ['data-bs-open="modal" and data-bs-id="confirm"', false],
        ['data-bs-modal="show" and href="#confirm-modal" on the button', false],
      ], 'Bootstrap 5 namespaces its data attributes with bs. data-toggle and data-target are the Bootstrap 4 forms and are ignored in version 5.'),
      mcq('A page adds data-bs-toggle="tooltip" and a title to a button, but no tooltip ever appears. Why?', [
        ['Tooltips are opt-in and must be initialised with JavaScript', true],
        ['Tooltips only work on links, never on button elements', false],
        ['The title attribute must be renamed to data-bs-tooltip', false],
        ['Tooltips need the dark colour theme enabled on the root html element', false],
      ], 'For performance, Bootstrap does not auto-initialise tooltips or popovers; you create them with new bootstrap.Tooltip(element), typically for every matching element on load.'),
    ],
    checkpoint: [
      cq('BOOTSTRAP', 'Which of these Bootstrap components works with the CSS file alone, no JavaScript loaded?', [
        ['A card showing an image, a title and a button', true],
        ['A dropdown menu opened from a navbar link', false],
        ['A modal dialog opened by clicking a button', false],
        ['A carousel that slides automatically between three product images', false],
      ], 'Cards are pure markup and CSS. Dropdowns, modals and carousels all rely on Bootstrap\'s JavaScript to respond to clicks.'),
      cq('BOOTSTRAP', 'A navbar toggler has data-bs-target="#nav" but the collapse div has id="navbar". What happens when it is tapped?', [
        ['Nothing, because the target selector matches no element', true],
        ['The menu opens, since Bootstrap finds the nearest collapse', false],
        ['The whole navbar is hidden instead of the link list', false],
        ['The page scrolls to the element with the id "nav"', false],
      ], 'Collapse looks up exactly the selector in data-bs-target. With no element matching #nav, there is nothing to toggle.'),
      cq('RESPONSIVE_DESIGN', 'Three cards sit in col-md-4 columns, but their heights differ because the text lengths differ. Which class evens them out?', [
        ['h-100 on each card so it fills its column height', true],
        ['card-group on each column to make heights shared', false],
        ['align-items-start on the row that holds the cards', false],
        ['mh-100 on each card image to equalise the heights', false],
      ], 'Columns in a flex row stretch to the tallest column; h-100 makes each card fill its column, so the cards end up equal height.'),
    ],
  },

  /* ── FORMS_UTILITIES ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_FORMS_UTILITIES',
    notes: `**Forms and utilities are where Bootstrap saves the most custom CSS.** Most of a page's spacing,
alignment and colour can be written as classes, and form controls get a consistent look for free.

## Form controls

    <form class="needs-validation" novalidate>
      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input type="email" class="form-control" id="email" required>
        <div class="invalid-feedback">Enter a valid email address.</div>
      </div>
      <div class="mb-3">
        <label for="plan" class="form-label">Plan</label>
        <select class="form-select" id="plan"><option>Free</option><option>Pro</option></select>
      </div>
      <div class="form-check mb-3">
        <input class="form-check-input" type="checkbox" id="terms" required>
        <label class="form-check-label" for="terms">I accept the terms</label>
      </div>
      <button class="btn btn-primary" type="submit">Create account</button>
    </form>

form-control for inputs and textareas, form-select for selects, form-check for checkboxes and
radios. Every control keeps a real label with a matching for/id — Bootstrap styles it, it does not
replace it. input-group attaches text or buttons to an input; form-floating gives floating labels.

## Validation styles

Bootstrap shows red or green states in two ways. Add was-validated to the form after a submit
attempt, and the browser's own :invalid state drives the styling and reveals invalid-feedback. Or
set is-invalid / is-valid on a control yourself, for server-side errors. novalidate stops the
browser's default bubbles so Bootstrap's messages show instead:

    form.addEventListener('submit', e => {
      if (!form.checkValidity()) { e.preventDefault(); e.stopPropagation(); }
      form.classList.add('was-validated');
    });

## Utility classes

- **Spacing**: {m|p}{t|b|s|e|x|y}-{0..5|auto}. mt-3 is margin-top, px-2 horizontal padding,
  mx-auto centres a block. s and e mean start and end (left and right in LTR).
- **Display**: d-none, d-block, d-flex, and responsive forms like d-none d-md-block (hidden on
  phones, shown from md).
- **Flex**: justify-content-between, align-items-center, flex-column, gap-3.
- **Text and colour**: text-center, text-md-start, fw-bold, text-muted, bg-light, text-bg-dark.
- **Sizing and borders**: w-50, h-100, border, rounded, shadow-sm.

    <section class="d-flex flex-column flex-md-row justify-content-between align-items-center p-4 bg-light rounded">
      <h2 class="h4 mb-3 mb-md-0">Ready to start?</h2>
      <a href="#" class="btn btn-primary">Get started</a>
    </section>

That section needs no CSS file at all.

**Common mistakes:** using Bootstrap 4 names (ml-3, mr-3, pl-*) — Bootstrap 5 renamed them ms-*,
me-*, ps-*; expecting invalid-feedback to show without was-validated or is-invalid; and piling
twenty utilities onto one element when a small custom class would read better.`,
    mcqs: [
      mcq('Which class gives an element a left margin of spacer level 3 in a left-to-right Bootstrap 5 page?', [
        ['ms-3', true],
        ['ml-3', false],
        ['mx-3', false],
        ['ps-3', false],
      ], 'Bootstrap 5 replaced left/right with start/end: ms-3 is margin-start. ml-3 was the Bootstrap 4 name, mx-3 sets both sides, and ps-3 is padding.'),
      mcq('An invalid-feedback div sits under a required input, but it never appears even after submitting empty. What is missing?', [
        ['was-validated on the form or is-invalid on the input', true],
        ['form-label on the input element instead of form-control', false],
        ['A data-bs-validate attribute added to the submit button', false],
        ['The bootstrap.bundle.min.js script loaded in the head', false],
      ], 'invalid-feedback is hidden by default and shown only when the control matches :invalid inside a .was-validated form, or carries .is-invalid.'),
      mcq('You want a promo banner hidden on phones but shown as a block from the md breakpoint up. Which classes?', [
        ['d-none d-md-block', true],
        ['d-md-none d-block', false],
        ['d-block d-sm-none', false],
        ['invisible d-md-flex', false],
      ], 'Mobile-first: d-none hides it everywhere, then d-md-block overrides that from 768px up.'),
    ],
    checkpoint: [
      cq('BOOTSTRAP', 'What is the purpose of the novalidate attribute on a form that uses Bootstrap validation styles?', [
        ['It turns off the browser\'s default tooltips so Bootstrap\'s messages show', true],
        ['It switches off every validation check entirely so any value at all can be submitted', false],
        ['It tells Bootstrap to validate only after the server has responded', false],
        ['It hides the invalid-feedback text until the user starts typing', false],
      ], 'novalidate suppresses the native error bubbles; checkValidity() still works, and the was-validated class lets Bootstrap display its own styled feedback.'),
      cq('RESPONSIVE_DESIGN', 'A heading should be centred on phones and left-aligned from 992px up. Which classes do it?', [
        ['text-center text-lg-start', true],
        ['text-start text-lg-center', false],
        ['text-center text-sm-start', false],
        ['align-center align-lg-left', false],
      ], 'text-center applies at all widths, and text-lg-start overrides it from the lg breakpoint (992px) upward.'),
      cq('BOOTSTRAP', 'Which markup makes a checkbox look like a Bootstrap control with its label beside it?', [
        ['A form-check wrapper with form-check-input and form-check-label', true],
        ['A form-control class on the checkbox input with a form-label', false],
        ['A form-select wrapper holding the checkbox and a plain label', false],
        ['An input-group wrapper with btn-check on the checkbox input', false],
      ], 'Checkboxes and radios use the form-check family; form-control is for text-like inputs and form-select for selects.'),
    ],
  },

  /* ── CUSTOMISING ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_CUSTOMISING',
    notes: `**Bootstrap is built to be changed, through two supported doors: Sass variables before it compiles,
and CSS custom properties after.** Everything else — overriding its rules with heavier selectors or
!important — works today and breaks on the next upgrade.

## Door one: Sass variables (compile time)

Install Bootstrap with npm and import its Sass source. Set your variables before Bootstrap's own,
because Bootstrap declares its variables with !default, meaning "use this unless already set".

    // custom.scss
    $primary: #051d64;
    $border-radius: .5rem;
    $font-family-base: "Inter", system-ui, sans-serif;
    $spacer: 1.25rem;

    @import "bootstrap/scss/bootstrap";

Now every btn-primary, bg-primary, text-primary, link and focus ring uses the new colour, because
they are all generated from $primary. One line changes the whole theme. You can also add a colour
to the theme map so btn-brand and text-brand exist:

    $theme-colors: map-merge($theme-colors, ("brand": #359aad));

(The exact map-merge has to come after Bootstrap's functions and variables are imported; the
official docs show the full order of imports for this.)

## Door two: CSS custom properties (run time)

Bootstrap 5 exposes many values as --bs-* variables on :root and on components. You can change them
with plain CSS, no build step:

    :root {
      --bs-body-font-family: "Inter", system-ui, sans-serif;
      --bs-link-color-rgb: 5, 29, 100;
    }
    .btn-primary {
      --bs-btn-bg: #051d64;
      --bs-btn-border-color: #051d64;
      --bs-btn-hover-bg: #0a2b8a;
    }

Component variables are scoped, so this only affects primary buttons. This door is ideal for a CDN
setup or for switching themes at run time; data-bs-theme="dark" on the html element is built this
way.

## Your own styles, in the right order

Load Bootstrap first, then your stylesheet. Write your own classes for what Bootstrap does not
provide (.hero, .pricing-card) rather than redefining .btn or .card globally.

## Why !important is the wrong tool

Utilities already use !important (so mt-3 always wins). Adding your own creates an arms race: the
next override needs !important too, specificity stops meaning anything, and an upgrade that changes
a selector leaves your fixes either dead or fighting. If you need !important to beat Bootstrap, the
real fix is a variable, a custom property, or load order.

**Common mistakes:** setting Sass variables after the Bootstrap import (they have no effect);
editing files inside node_modules (lost on the next install); and copying compiled bootstrap.css
into the project to hand-edit it.`,
    workedExample: `**Problem:** the brand colour is navy #051D64 and every primary button, link and badge must use it.

**Wrong approach:** .btn-primary { background: #051D64 !important; } — it misses hover, focus,
active and disabled states, links, badges and bg-primary, and needs another !important each time.

**Right approach with Sass:** set $primary: #051D64; above @import "bootstrap/scss/bootstrap";.
All derived states are generated from it, including the hover shade and focus ring.

**Right approach without a build:** override --bs-btn-bg, --bs-btn-border-color and the hover
variables on .btn-primary, and --bs-primary-rgb / --bs-link-color-rgb on :root. Less complete than
Sass, but supported and upgrade-safe.`,
    mcqs: [
      mcq('A developer sets $primary after the line @import "bootstrap/scss/bootstrap" and nothing changes. Why?', [
        ['Bootstrap already compiled its classes using the default value', true],
        ['Sass variables can only be changed in a separate config file', false],
        ['$primary is a read-only variable that Bootstrap locks at build', false],
        ['The variable needs !important appended before it takes effect', false],
      ], 'Bootstrap\'s variables use !default and its classes are generated during the import; a value set afterwards is never read by that code.'),
      mcq('A site loads Bootstrap from a CDN with no build step. What is the supported way to recolour only primary buttons?', [
        ['Override --bs-btn-bg and related variables on .btn-primary', true],
        ['Edit the downloaded bootstrap.min.css file and re-upload it', false],
        ['Add style attributes with !important to every primary button', false],
        ['Set $primary in a script tag before the stylesheet is loaded', false],
      ], 'Bootstrap 5 components read CSS custom properties such as --bs-btn-bg, so overriding them in your stylesheet changes the component without touching Bootstrap\'s files.'),
      mcq('What does the !default flag on Bootstrap\'s Sass variables mean?', [
        ['Use this value only if the variable has not already been set', true],
        ['Always use this value, overriding anything set earlier in any file', false],
        ['Mark the value as deprecated so it is removed in version 6', false],
        ['Export the value to the browser as a CSS custom property', false],
      ], '!default assigns only when the variable is undefined or null, which is why your overrides must come before Bootstrap\'s variables are imported.'),
    ],
    checkpoint: [
      cq('BOOTSTRAP', 'A team keeps adding !important to beat Bootstrap\'s button styles. What is the better long-term fix?', [
        ['Change the theme through Sass variables or --bs-* properties', true],
        ['Raise specificity further by adding an id on each button', false],
        ['Inline every button style directly with a style attribute', false],
        ['Stop loading Bootstrap and copy only the button rules over', false],
      ], 'Variables and custom properties are the supported extension points; they change every derived state and survive upgrades, while !important escalates into an arms race.'),
      cq('BOOTSTRAP', 'Why should you never edit Bootstrap\'s Sass files inside node_modules to change a colour?', [
        ['The next npm install or upgrade replaces them and loses the change', true],
        ['Sass refuses to compile any file that lives under node_modules', false],
        ['Bootstrap checks file hashes at run time and blocks any edited files from loading', false],
        ['Editing them only changes the colour in development builds', false],
      ], 'node_modules is regenerated from the package registry; your customisation belongs in your own SCSS file that sets variables and then imports Bootstrap.'),
      cq('BOOTSTRAP', 'Which attribute switches a Bootstrap 5.3 page, or one section of it, to the built-in dark colour mode?', [
        ['data-bs-theme="dark"', true],
        ['data-bs-mode="night"', false],
        ['class="theme-dark-mode"', false],
        ['data-theme-color="dark"', false],
      ], 'Bootstrap 5.3 colour modes are driven by data-bs-theme, which swaps the --bs-* custom properties on the element it is set on and its descendants.'),
    ],
  },

  /* ── DEBUGGING ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_DEBUGGING',
    notes: `**Bootstrap rarely throws an error. It just quietly doesn't apply.** So debugging it means
reading the markup against the contract each feature expects, and using DevTools to see which
classes actually matched. Change one thing at a time.

## A method that works

1. Open DevTools, select the element, read the Styles panel: is the Bootstrap rule there, and is it
   crossed out by something else?
2. Check the Console for JavaScript errors — a missing Popper or an undefined bootstrap object.
3. Resize with the device toolbar and watch which breakpoint you are actually at.
4. Compare the markup with the documented structure, element by element.

## Fault 1: columns with no row

    <div class="container">
      <div class="col-md-6">Left</div>
      <div class="col-md-6">Right</div>
    </div>

The columns stack instead of sitting side by side. A container is not a flex container; the row is.
Fix: wrap both columns in a div with class="row".

## Fault 2: the phone shows a shrunken desktop

Every breakpoint class seems ignored on a real phone, though DevTools' resizing looks fine on a
laptop. The head is missing the viewport meta tag:

    <meta name="viewport" content="width=device-width, initial-scale=1">

Without it, the phone renders at about 980px and scales down, so col-md-* is always active.

## Fault 3: the modal button does nothing

    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#terms">Terms</button>
    ...
    <link href="bootstrap.min.css" rel="stylesheet">  <!-- no script tag anywhere -->

The modal is styled but never opens, and the Console is silent because nothing is listening for the
click. Modals need Bootstrap's JavaScript. Add bootstrap.bundle.min.js before the closing body tag.
If the script is present, check the attribute is data-bs-toggle, not Bootstrap 4's data-toggle, and
that the target id matches.

## Fault 4: "col-md-6 isn't working on my phone"

    <div class="row"><div class="col-md-6">A</div><div class="col-md-6">B</div></div>

The student expected two columns on a phone. col-md-6 applies from 768px up; on a 390px phone
there is no class in effect, so each column is full width. That is correct behaviour. For two
columns everywhere, use col-6.

## Fault 5: dropdown opens in the wrong place or not at all

The page loads bootstrap.min.js (no Popper). The Console reports that Bootstrap's dropdown requires
Popper. Use bootstrap.bundle.min.js, or load Popper separately before Bootstrap.

## Fault 6: my styles are ignored

DevTools shows your rule crossed out by a Bootstrap rule of equal specificity: your stylesheet is
loaded before Bootstrap. Swap the order. If it is crossed out by a utility like mt-0, that utility
uses !important — remove the utility class rather than escalating.`,
    mcqs: [
      mcq('Two col-lg-6 divs sit directly inside a .container and stack on a wide monitor. What is the cause?', [
        ['They are not inside a .row, so there is no flex parent', true],
        ['col-lg-6 only takes effect from 1400px wide and upward', false],
        ['The container needs the class container-fluid for columns', false],
        ['Each column needs d-inline-block to sit beside the other', false],
      ], 'Columns are flex items and must be direct children of .row, which is the flex container. A plain container does not lay its children out in a line.'),
      mcq('A modal is styled correctly in the page source but clicking its trigger does nothing and the Console shows no error. What should you check first?', [
        ['Whether any Bootstrap JavaScript file is loaded on the page', true],
        ['Whether the modal has a fade class on its outer element', false],
        ['Whether the trigger button carries the btn-primary class', false],
        ['Whether the modal content is wrapped in a card element', false],
      ], 'With no script loaded, nothing listens for data-bs-toggle clicks, so no error is raised either. The fade class only animates; button colour is irrelevant.'),
      mcq('After switching to bootstrap.min.js, dropdowns throw an error mentioning Popper. What is the smallest correct fix?', [
        ['Load bootstrap.bundle.min.js instead of bootstrap.min.js', true],
        ['Add jQuery before bootstrap.min.js in the page footer', false],
        ['Replace data-bs-toggle with data-toggle on each dropdown', false],
        ['Move the bootstrap.min.css link to the end of the body', false],
      ], 'The bundle includes Popper, which dropdowns use for positioning. jQuery is not used by Bootstrap 5, and data-toggle is the obsolete version-4 attribute.'),
      mcq('In DevTools your .card { border-radius: 0 } rule is crossed out by Bootstrap\'s .card rule. The selectors are identical. What is going on?', [
        ['Your stylesheet loads before Bootstrap, so Bootstrap\'s rule comes later', true],
        ['Bootstrap marks all of its component rules with !important flags', false],
        ['Border radius on cards can only be changed with a Sass variable', false],
        ['DevTools crosses out custom rules until the page has been hard-reloaded once', false],
      ], 'With equal specificity the later declaration wins. Load Bootstrap first and your stylesheet after it, or set --bs-card-border-radius.'),
    ],
  },

  /* ── PRACTICE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_PRACTICE',
    notes: `**Six exercises, each one sitting at a time, no documentation open.** Write the markup, then
check it in the browser at 375px, 800px and 1280px wide. Only open the docs after you have an
answer, to check it.

## Exercise 1: the three-tier layout

Build a page with a header, a main area and a sidebar. On phones the sidebar comes after the main
content; from lg up it sits on the left at a quarter width. Use order classes so the sidebar is
second in the source (for screen readers) but appears first visually on large screens.

## Exercise 2: a pricing table

Three pricing cards: one per row on phones, three in a row from md. All cards equal height, the
middle one highlighted with border-primary and a "Most popular" badge. Use row-cols and g-4, no
custom CSS.

## Exercise 3: a navbar that collapses

Brand on the left, four links on the right, collapsing behind a toggler below lg. Add a dropdown
for "Products" with three items. Confirm the dropdown works on desktop and inside the collapsed
menu on a phone.

## Exercise 4: a contact form with validation

Name, email, a subject select, a message textarea and a terms checkbox. Use form-floating for the
name and email. Show Bootstrap validation messages only after the first submit attempt, using
novalidate, checkValidity() and was-validated.

## Exercise 5: utilities only

Recreate a "call to action" strip: text and a button side by side on desktop, stacked and centred
on phones, light background, rounded corners, padding. Write zero lines of CSS — d-flex,
flex-column, flex-md-row, justify-content-between, align-items-center, gap-3, p-4, bg-light,
rounded.

## Exercise 6: re-theme it

Take exercise 2 and change the primary colour to #051D64 and the border radius to 1rem, twice:
once with Sass variables, once with --bs-* custom properties over the CDN build. Note which states
(hover, focus, badge) each method changed.

## How to check yourself

- Do any columns sit directly in a container? Wrap them in a row.
- Did you write a class for a size you did not need (col-sm-12)? Delete it; mobile-first already
  covers it.
- Did you reach for !important or a style attribute? Find the utility or variable instead.`,
    mcqs: [
      mcq('In exercise 1, the sidebar is second in the HTML but must appear on the left from lg up. Which class on the sidebar column does that?', [
        ['order-lg-first', true],
        ['offset-lg-first', false],
        ['float-lg-start', false],
        ['order-first-lg', false],
      ], 'order-lg-first sets order: -1 from the lg breakpoint, moving the flex item to the start visually while the source order stays the same.'),
      mcq('For the pricing table, which row classes give one card per row on phones and three from md, with even gaps?', [
        ['row row-cols-1 row-cols-md-3 g-4', true],
        ['row row-cols-3 row-cols-md-1 g-4', false],
        ['row cols-1 cols-md-3 gap-col-4', false],
        ['row row-cols-sm-1 row-cols-3 p-4', false],
      ], 'row-cols-* sets how many columns each child takes on the row; mobile-first means 1 is the base and md-3 applies from 768px. g-4 sets the gutter in both directions.'),
      mcq('In the call-to-action strip, which class pair stacks the items on phones and lays them side by side from md?', [
        ['flex-column flex-md-row', true],
        ['flex-row flex-md-column', false],
        ['d-block d-md-inline', false],
        ['flex-wrap flex-md-nowrap', false],
      ], 'flex-column sets the direction vertically for all widths and flex-md-row switches it to horizontal from 768px up.'),
      mcq('A floating-label input shows its label overlapping the typed text. Which markup detail is usually missing?', [
        ['A placeholder attribute on the input inside form-floating', true],
        ['A form-label class on the label inside form-floating', false],
        ['An input-group wrapper surrounding the form-floating div', false],
        ['A data-bs-float attribute on the input inside the group', false],
      ], 'Floating labels rely on the :placeholder-shown selector, so the input needs a placeholder (it can be any text) and the label must come after the input.'),
      mcq('In exercise 6, why does setting $primary in Sass change more states than overriding --bs-btn-bg on .btn-primary?', [
        ['Sass regenerates every class built from $primary, not just buttons', true],
        ['Custom properties cannot be used inside hover or focus rules', false],
        ['The CDN build ignores every --bs-* property on the button', false],
        ['Sass variables are applied at run time after the CSS loads', false],
      ], 'At compile time $primary feeds buttons, links, bg-primary, text-primary, badges and focus rings. --bs-btn-bg only touches the one component variable you set.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_INTERVIEW_QUESTION',
    notes: `**Three questions an interviewer actually asks about Bootstrap, with a strong answer and the
follow-up a good answer earns.** Say each one aloud, in under two minutes.

## Question 1: "How does the Bootstrap grid work?"

**Model answer:** "It's a flexbox grid with three layers. A container centres the content and sets a
max-width per breakpoint. A row is the flex container — it has negative margins to cancel the
column padding and lets columns wrap. Columns divide the row into twelve. Classes are mobile-first:
col-md-6 means half width from 768 pixels up, and below that it falls back to full width. So for a
card grid I'd write col-12 col-md-6 col-lg-4 — one, two, three per row — and set the gap with g-3
on the row."

**Likely follow-up:** "What happens if the columns add up to more than twelve?" — They wrap onto a
new line, because the row uses flex-wrap. "Why twelve?" — It divides by 2, 3, 4 and 6.

## Question 2: "How would you change Bootstrap's primary colour across the site?"

**Model answer:** "The supported way, not by overriding classes. If we build from Sass, I set
$primary before importing Bootstrap — its variables use !default, so mine wins, and every derived
class and state is regenerated: buttons, hover shades, links, focus rings. If we use the CDN, I
override the CSS custom properties, like --bs-primary-rgb on :root and --bs-btn-bg on .btn-primary.
I'd avoid !important, because utilities already use it and stacking more of it makes every later
change harder and an upgrade risky."

**Likely follow-up:** "What if the variable is set after the import?" — It has no effect, because
the classes were already generated with the default.

## Question 3: "When would you not use Bootstrap?"

**Model answer:** "When the design is heavily custom — I'd be overriding most of it and still
shipping its CSS. When the team already has a design system or uses a utility-first tool like
Tailwind. And on very small pages where a few lines of CSS do the job. Bootstrap is a strong
choice for admin panels, internal tools and fast prototypes, where consistent, responsive,
accessible components matter more than a unique look."

**Likely follow-up:** "How would you reduce Bootstrap's size if you did use it?" — Import only the
Sass partials you use (grid, utilities, buttons) rather than the whole bootstrap.scss, and let a
build tool purge unused CSS.

## What makes these answers strong

Each names the mechanism (flex row, !default, custom properties), gives a concrete class or
variable, and states a trade-off. An answer that only lists features sounds memorised; one that
explains why sounds like experience.`,
    mcqs: [
      mcq('An interviewer asks why Bootstrap chose a twelve-column grid. Which answer is right?', [
        ['Twelve divides evenly into halves, thirds, quarters and sixths', true],
        ['Twelve columns match the pixel width of most phone screens', false],
        ['Flexbox can only distribute space across twelve flex items', false],
        ['Twelve was required to support the five named breakpoints', false],
      ], 'Twelve has divisors 1, 2, 3, 4, 6 and 12, so the most common layouts land on whole columns. It has nothing to do with pixels or flexbox limits.'),
      mcq('Asked how to shrink Bootstrap\'s CSS in production, which answer shows real experience?', [
        ['Import only the Sass partials the project uses and purge unused CSS', true],
        ['Switch every link from bootstrap.css to the bootstrap.min.css file', false],
        ['Load Bootstrap asynchronously so it no longer counts toward size', false],
        ['Remove the JavaScript bundle, since it holds most of the CSS rules', false],
      ], 'Minification alone is already the default; real reduction comes from compiling only the parts you need and removing unused selectors at build time.'),
      mcq('The interviewer follows up: "Your col-md-4 cards are full width on my phone — is that a bug?" What is the best reply?', [
        ['No; md applies from 768px, so below it the column is full width', true],
        ['Yes; col-md-4 should apply at every width below the md point', false],
        ['Yes; the container needs container-fluid for columns on phones', false],
        ['No; Bootstrap disables the whole grid on screens under 576px', false],
      ], 'Breakpoint classes are mobile-first minimums. With no smaller class, a column is full width below 768px, which is usually exactly the stacking you want on a phone.'),
    ],
  },

  /* ── MINI_PROJECT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_MINI_PROJECT',
    notes: `**Build a product landing page with Bootstrap 5 that works from a 360px phone to a 1440px
monitor.** Pick any product — a study app, a coffee subscription, a fitness tracker.

## What to build

1. **Navbar** — brand on the left, four section links on the right, collapsing behind a toggler
   below lg. Links scroll to the sections on the page.
2. **Hero** — a headline, one sentence, a primary and a secondary button, and an image. Text and
   image side by side from lg, stacked (text first) below.
3. **Feature cards** — six features: one per row on phones, two from md, three from lg. Equal
   heights, an icon or emoji, a title and two lines of text.
4. **Sign-up form** — name, email, plan (select) and a terms checkbox, with Bootstrap validation
   messages shown only after a submit attempt. A successful submit opens a modal saying thanks.
5. **Footer** — three columns of links on desktop that stack on phones, and a copyright line.

## Requirements

- Bootstrap 5 via CDN or npm, using bootstrap.bundle.min.js.
- The viewport meta tag is present.
- Layout uses container, row and col only — no floats, no absolute positioning for layout.
- At most 30 lines of custom CSS. Spacing, alignment, colour and display come from utilities.
- The brand colour is changed through Sass variables or --bs-* custom properties, never !important.
- Every form control has a label; every image has alt text; the toggler has aria-label.

## Acceptance criteria

- At 375px, 768px, 1024px and 1440px nothing overflows horizontally and the layout matches the
  description above.
- The toggler opens and closes the menu on a phone.
- Submitting the empty form shows the invalid messages; a valid submit shows the modal.
- The page has no Console errors.
- You can explain, for any class on the page, why it is there.

## Submit

A link to the deployed page (GitHub Pages or Netlify) and the repository, plus a short README with
four screenshots at the widths above and a note of every customisation you made and how.`,
    mcqs: [
      mcq('The brief says the hero text and image sit side by side from lg and stack with text first below. Which column classes fit?', [
        ['col-12 col-lg-6 on both, with the text column first in the HTML', true],
        ['col-6 on both, with order-first applied to the image column', false],
        ['col-lg-12 col-6 on both, with the image column first in source', false],
        ['col-md-6 on both, with the text column placed second in HTML', false],
      ], 'col-12 stacks on smaller screens and col-lg-6 puts them side by side from 992px. Source order gives text first when stacked without any order classes.'),
      mcq('The successful submit must open a thank-you modal from your own validation script. Which Bootstrap 5 call does that?', [
        ['bootstrap.Modal.getOrCreateInstance(el).show()', true],
        ['$(el).modal("show") after loading jQuery first', false],
        ['el.classList.add("show") on the modal element', false],
        ['document.dispatch("bs.modal.show", el) on submit', false],
      ], 'Bootstrap 5 exposes a JavaScript API per component; getOrCreateInstance returns the Modal instance for the element and show() opens it with the backdrop and focus handling.'),
    ],
    assignment: {
      title: 'Responsive Product Landing Page with Bootstrap 5',
      description: 'A one-page product landing site built with Bootstrap 5 — navbar, hero, feature cards, a validated sign-up form with a confirmation modal, and a footer — that works from a phone to a wide monitor.',
      instructions: 'Build the page described in the unit brief. Use Bootstrap 5 with bootstrap.bundle.min.js and the viewport meta tag. Lay out with container, row and columns; use utilities for spacing and alignment and at most 30 lines of custom CSS. Re-theme the brand colour through Sass variables or --bs-* custom properties, not !important. Show validation messages only after a submit attempt and open a modal on a valid submit. Deploy it, and submit the live link, the repository link, and a README with screenshots at 375px, 768px, 1024px and 1440px plus a list of your customisations and how you made each.',
      rubric: [
        { criterion: 'Responsive layout', description: 'Grid used correctly (container, row, columns); hero, cards and footer rearrange as specified at all four widths with no horizontal overflow.', maxPoints: 30 },
        { criterion: 'Components work', description: 'Navbar collapses and toggles on phones, the modal opens on a valid submit, and there are no Console errors.', maxPoints: 20 },
        { criterion: 'Form and validation', description: 'Every control has a label; Bootstrap validation styles appear only after a submit attempt and clear when fixed.', maxPoints: 20 },
        { criterion: 'Customisation done the supported way', description: 'Brand colour and any theme changes made with Sass variables or --bs-* properties; no !important; custom CSS kept within the limit.', maxPoints: 15 },
        { criterion: 'Accessibility and explanation', description: 'Alt text, aria-label on the toggler, sensible heading order, and a README that explains the customisations and layout decisions.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_BOOTSTRAP_CHECKPOINT',
    notes: `**This checkpoint covers the whole Bootstrap topic:** what the framework provides and how it is
loaded, the grid and its breakpoints, components and the JavaScript they need, forms and utility
classes, customising through Sass variables and CSS custom properties, and diagnosing pages where
Bootstrap quietly does not apply. Every question is a situation: read what the page does, and pick
the cause or the fix. Questions are tagged to the skill they measure — Bootstrap itself, or
responsive design.`,
    checkpoint: [
      cq('RESPONSIVE_DESIGN', 'A gallery uses col-sm-6 col-lg-3 on each image. A visitor on an 800px-wide tablet sees how many images per row?', [
        ['Two, because sm applies and lg has not started yet', true],
        ['Four, because lg applies to everything over 768px', false],
        ['One, because sm only applies between 576 and 767px', false],
        ['Three, because the grid averages the two class values', false],
      ], '800px is past sm (576px) but below lg (992px), so col-sm-6 is in effect: 6 of 12 means two per row.'),
      cq('BOOTSTRAP', 'A page\'s navbar hamburger opens fine, but its "Account" dropdown inside never opens. The script tag loads bootstrap.min.js. What is the cause?', [
        ['That file has no Popper, which dropdowns need to work', true],
        ['Collapse and dropdown cannot be used in the same navbar', false],
        ['Dropdowns need jQuery, which the page has not loaded', false],
        ['The dropdown must be initialised before the collapse is', false],
      ], 'Collapse does not use Popper, so the toggler works; dropdowns do, and bootstrap.min.js excludes it. bootstrap.bundle.min.js includes it.'),
      cq('RESPONSIVE_DESIGN', 'A dashboard shows a large chart on desktop but should hide it entirely below 768px. Which classes on the chart wrapper achieve this?', [
        ['d-none d-md-block', true],
        ['d-md-none d-block', false],
        ['visible-md hidden-sm', false],
        ['d-sm-none d-lg-block', false],
      ], 'd-none hides it at every width; d-md-block shows it again from md (768px) up. visible-*/hidden-* were removed long ago, and d-sm-none d-lg-block would leave it visible below 576px.'),
      cq('BOOTSTRAP', 'A designer\'s brand teal is set with $primary in custom.scss, but buttons stay Bootstrap blue. The file imports Bootstrap on line 1 and sets $primary on line 3. Why?', [
        ['The classes were generated at the import, before $primary was set', true],
        ['$primary only affects text colour, so buttons need $btn-primary', false],
        ['Sass variables cannot hold hex colours, only named CSS colours', false],
        ['The compiled CSS needs !important to override the default blue', false],
      ], 'Bootstrap\'s variables are !default and its classes compile during the import. Overrides must be declared before the import to be picked up.'),
      cq('RESPONSIVE_DESIGN', 'On a real phone a Bootstrap page looks like a miniature desktop page, yet resizing a laptop browser shows the layout stacking correctly. What is missing?', [
        ['The viewport meta tag in the page head', true],
        ['A container-fluid around the main content', false],
        ['The sm breakpoint classes on every column', false],
        ['The bootstrap.bundle.min.js script include', false],
      ], 'A desktop browser\'s window width is real, so media queries respond. A phone without the viewport tag lays out at about 980px and scales down, so the small-screen layout never applies.'),
      cq('BOOTSTRAP', 'A form shows red borders on every empty field the moment the page loads, before the user types anything. What is the likely cause?', [
        ['The form already has was-validated in its class list in the HTML', true],
        ['The novalidate attribute is missing from each separate input', false],
        ['The invalid-feedback divs are placed before the input elements', false],
        ['The required attribute only works with form-select controls', false],
      ], 'was-validated makes :invalid controls show their error styling immediately. It should be added by script after the first submit attempt, not in the initial markup.'),
      cq('BOOTSTRAP', 'A developer writes ml-auto on a navbar list to push it right and nothing moves. The page uses Bootstrap 5. What fixes it?', [
        ['Use ms-auto, the Bootstrap 5 name for margin-start auto', true],
        ['Use float-right on the list in place of the margin class', false],
        ['Add d-flex to the list itself so margins can take effect', false],
        ['Use mr-auto on the brand link so it pushes the list away', false],
      ], 'Bootstrap 5 renamed left/right spacing utilities to start/end; ml-* and mr-* no longer exist, so ms-auto is the working class.'),
      cq('RESPONSIVE_DESIGN', 'Four columns with col-md-3 should collapse to two per row on small tablets (576–767px) instead of one. What should be added to each column?', [
        ['col-sm-6, so two per row from 576px until md takes over', true],
        ['col-6, so two per row from 576px until md takes over', false],
        ['col-xs-6, so two per row on every screen under 768px', false],
        ['col-md-6, so two per row at the md breakpoint and below', false],
      ], 'col-sm-6 applies from 576px; col-md-3 overrides it from 768px. col-6 would also make phones under 576px two-across, col-xs-* does not exist in Bootstrap 5, and col-md-6 conflicts with col-md-3.'),
      cq('BOOTSTRAP', 'A page sets a Bootstrap 4-style trigger, data-toggle="modal" with data-target="#help", on Bootstrap 5. Clicking it does nothing. What is wrong?', [
        ['Bootstrap 5 reads data-bs-toggle and data-bs-target instead', true],
        ['Modals in Bootstrap 5 can only be opened from JavaScript', false],
        ['The target must be written without the # in Bootstrap 5', false],
        ['Bootstrap 5 needs data-toggle on the modal, not the button', false],
      ], 'Bootstrap 5 namespaced its data API with bs to avoid clashes, so the old attribute names are ignored.'),
      cq('RESPONSIVE_DESIGN', 'Cards in a row-cols-1 row-cols-md-3 grid touch each other edge to edge with no space between rows. Which change adds even spacing both ways?', [
        ['Add g-4 to the row so gutters apply on both axes', true],
        ['Add mb-4 to the container so rows are pushed apart', false],
        ['Add gx-4 to the row so the gap applies on both axes', false],
        ['Add p-4 to each card body so the cards spread apart', false],
      ], 'g-* sets horizontal and vertical gutters together on the row. gx-* only sets horizontal gutters, and padding inside a card does not separate the cards.'),
    ],
  },
];
