/**
 * T3_FRONTEND_FORMS, T3_FRONTEND_QUALITY and T3_FRONTEND_PROJECT — nine units.
 * Year 3, frontend track. Finishes S13.
 *
 * ── THE TWO TOPICS STUDENTS THINK THEY KNOW ───────────────────────────────────────────────
 *
 * Forms and accessibility both look like solved problems to a third-year, and both are where
 * the most user-visible damage is done.
 *
 * Forms: they can render inputs. What they have not done is keep somebody's work when the
 * submit fails, place a field error where the user is looking, or understand that client
 * validation is a courtesy and the server's is the control. FORMS_BOTH_SIDES attributes to
 * WEB_SECURITY for exactly that reason — it is a security unit wearing a form.
 *
 * Accessibility: usually taught as a list of attributes, which produces students who add
 * aria-labels to everything and have never once tried to use their own interface with the
 * keyboard. So KEYBOARD_AND_SCREEN_READER is written as an exercise rather than a standard:
 * unplug the mouse, and find out.
 *
 * Attribution: T3_FRONTEND_FORMS defaults to HTML_FORMS with BOTH_SIDES on WEB_SECURITY;
 * T3_FRONTEND_QUALITY defaults to RESPONSIVE_DESIGN with the keyboard unit on
 * WEB_ACCESSIBILITY; the project is all PRODUCTION_ENGINEERING.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FRONTEND_REST_BUNDLES: PilotBundle[] = [
  /* ══ T3_FRONTEND_FORMS ══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FRONTEND_FORMS_BOTH_SIDES',
    notes: `**Client validation is a kindness. Server validation is the control.** They are not
two layers of the same thing, and confusing them is how a frontend developer ships a security
hole.

## What each is for

**The client validates to save the user time.** Immediate feedback, no round trip, no lost
work. It is a user-experience feature.

**The server validates because it cannot trust anything.** The request did not necessarily come
from your form — it came over the network, and anybody can send one.

**So the same rule is implemented twice, for different reasons**, and that duplication is
correct rather than a smell.

## Why the client's check is not security

Open the network tab, copy the request as curl, change a value, send it. **That takes fifteen
seconds and requires no skill.** Every client-side check is advisory: the code runs on a
machine you do not control, and the user can change it, disable it or bypass it entirely.

**"But our app is the only client"** — the security topic answered this: your app is not the
only thing that can send a request.

## What to check where

**Both:** required fields, formats, lengths, ranges. The client for speed, the server for
truth.

**Server only:** anything needing data the client does not have or must not have — is this
email already registered, is this discount code valid, does this user own this record, is there
stock. **A client check for uniqueness is an information leak** as well as being unreliable:
it tells an attacker which emails are registered.

**Client only:** genuine presentation. Whether to show a character counter, whether to enable
the button. **Never a rule.**

## Keeping them in step

The realistic problem: two implementations of the same rule, in two languages, drifting apart.

**A shared schema** where your stack allows it — one definition, validated in both places. The
best answer when it is available.

**Otherwise, accept the drift and design for it.** The server is authoritative; the client is
an optimisation. **When they disagree, the server wins and the user must see why** — which
means the form has to be able to display a server error against a field, not just in a banner.
That is the part people forget, and it is what makes a drifted rule survivable rather than
confusing.

## Displaying what the server said

    { "error": { "code": "validation_failed", "details": { "fields": [
        { "field": "email", "code": "already_registered" } ] } } }

**Map it back to the field.** The API topic specified this shape for exactly this reason: a
structured error can be rendered next to the input, and an unstructured one can only be shown
in a banner.

**If your API returns a string, you cannot do this**, and the fix is in the API rather than the
form.

## When to validate on the client

**Not on every keystroke.** Telling somebody their email is invalid while they are typing the
third character is hostile.

**On blur**, for the first validation of a field. They have finished with it.

**Then on change**, once it has been marked invalid — so they can see the error clear as they
fix it, which is the one case where per-keystroke is right.

**And always on submit**, including fields never touched.`,
    mcqs: [
      mcq('Client and server validation are:',
        [['Different things — a kindness and a control', true],
          ['Two layers of the same defence', false],
          ['Redundant, if the client is trusted', false],
          ['The same rule, applied at different times', false]],
        'The duplication is correct rather than a smell.'),
      mcq('Bypassing a client-side check takes:',
        [['Fifteen seconds and no skill', true],
          ['A modified browser build', false],
          ['An intercepting proxy', false],
          ['Knowledge of the application internals', false]],
        'Copy the request as curl, change a value, send it.'),
      mcq('Checking email uniqueness on the client is:',
        [['An information leak as well as being unreliable', true],
          ['A reasonable convenience with a debounce', false],
          ['Acceptable if the server also checks', false],
          ['The standard pattern for registration forms', false]],
        'It tells an attacker which emails are registered.'),
      mcq('When client and server rules drift, the form must be able to:',
        [['Display a server error against a specific field', true],
          ['Fall back to the client rule', false],
          ['Re-fetch the validation rules', false],
          ['Disable submission until they agree', false]],
        'Which is what makes a drifted rule survivable rather than confusing.'),
    ],
    checkpoint: [
      mcq('An API returning a plain error string means:',
        [['The form cannot show it against a field, and the fix is in the API', true],
          ['The form should parse the message', false],
          ['A banner is the correct presentation', false],
          ['The client-side rule should simply be trusted instead of it', false]],
        'The API topic specified a structured shape for exactly this reason.'),
      mcq('First validation of a field should happen:',
        [['On blur', true], ['On every keystroke', false],
          ['On submit only', false], ['After a debounce while typing', false]],
        'Telling somebody their email is invalid at the third character is hostile.'),
      mcq('Once a field has been marked invalid, validating on change is:',
        [['Right, so the error clears as they fix it', true],
          ['Still too aggressive', false],
          ['Only appropriate for short fields', false],
          ['Unnecessary if submit revalidates', false]],
        'The one case where per-keystroke is the correct behaviour.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_FORMS_FORM_STATE',
    notes: `**A form that loses somebody's work is the worst thing a web application routinely
does.** Twenty minutes of typing, a failed submit, and an empty page. It is entirely
preventable and it happens constantly.

## The rules

**Never clear on error.** The submit failed; the data is still what they meant.

**Never navigate away on error.** Including a redirect to a generic error page, which is the
worst version because the back button does not bring the values back.

**Never reset on re-render.** A form that clears when something unrelated changes is a state
problem — usually the component being recreated, which the state debugging unit covered.

**Re-enable the submit button.** Disabled on click, re-enabled when the request settles,
including on failure. A permanently disabled button with their data behind it is its own kind
of cruel.

## Dirty state

**Know whether the form has been changed.** It powers three things:

**Warn before leaving.** Unsaved changes plus a navigation is a confirmation prompt. **Only
when dirty** — prompting on an untouched form trains people to dismiss it, and then the one
that mattered is dismissed too.

**Enable or disable save.** Nothing changed, nothing to save.

**Decide what to keep.** A draft is worth saving only if it differs from what is stored.

**Dirty is derived**, not stored: compare current values with the initial ones. The
derived-state unit's rule, applied.

## Drafts, for long forms

Anything taking more than about two minutes should survive a closed tab.

**Save locally as they type**, debounced. On return, offer to restore — **offer, do not
silently apply**, because silently restoring old values into a form somebody thought was fresh
is its own bug.

**Clear the draft on successful submit**, or they will be offered it forever.

**And be careful what you save.** A draft in browser storage is readable by any script on your
domain and survives on a shared machine. **Passwords, card numbers and anything sensitive stay
out of it** — the same argument as tokens in localStorage.

## Multi-step forms

**Keep all the steps' data together**, above the steps. Each step reads and writes its slice.

**Let them go back without losing anything.** A back button that clears step two is a form
people abandon.

**Validate per step**, and again at the end.

**Put the step in the URL.** Reloadable, shareable with support, and the back button works —
the routing unit's argument, and multi-step forms are where its absence hurts most.

## Submission, done properly

1. Validate everything, including untouched fields.
2. If invalid: show every error, and **move focus to the first one.** Not just scroll —
   focus, so a keyboard or screen reader user is taken there too.
3. If valid: disable, show progress, send.
4. On success: confirm clearly, then clear or navigate.
5. On failure: **keep everything**, show what went wrong, re-enable, offer a retry.

**Step five is the whole unit.** Everything else is ordinary.`,
    mcqs: [
      mcq('The worst version of losing work is:',
        [['Redirecting to a generic error page', true],
          ['Clearing the form on failure', false],
          ['Disabling the submit button permanently', false],
          ['Resetting on an unrelated re-render', false]],
        'Because the back button does not bring the values back.'),
      mcq('An unsaved-changes prompt should appear:',
        [['Only when the form is dirty', true],
          ['Whenever the user navigates from a form', false],
          ['After any field has been focused', false],
          ['Only for forms above a certain length', false]],
        'Prompting on an untouched form trains people to dismiss it.'),
      mcq('Dirty state should be:',
        [['Derived by comparing current values with the initial ones', true],
          ['Stored and set by each field’s change handler', false],
          ['Tracked per field in a separate object', false],
          ['Read from the form element directly', false]],
        'The derived-state rule, applied.'),
      mcq('A restored draft should be:',
        [['Offered, not silently applied', true],
          ['Applied immediately to save a click', false],
          ['Discarded if older than a session', false],
          ['Merged with any current values', false]],
        'Silently restoring old values into an apparently fresh form is its own bug.'),
    ],
    checkpoint: [
      mcq('On a failed validation, focus should move to:',
        [['The first error, so keyboard and screen reader users are taken there', true],
          ['The very top of the form, above everything else on it', false],
          ['The submit button', false],
          ['The error summary', false]],
        'Scrolling alone leaves those users where they were.'),
      mcq('What must stay out of a saved draft is:',
        [['Passwords, card numbers and anything sensitive', true],
          ['Anything at all the user has not yet confirmed', false],
          ['Fields that failed validation', false],
          ['Values copied from another source', false]],
        'Browser storage is readable by any script and survives on a shared machine.'),
      mcq('The step of a multi-step form belongs in the URL because:',
        [['It is reloadable, shareable and the back button then works', true],
          ['It reduces the amount of state held in the component', false],
          ['It allows steps to be linked directly', false],
          ['It lets the server track progress', false]],
        'Multi-step forms are where the absence of that hurts most.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_FORMS_SHOWING_ERRORS',
    notes: `A field is wrong. **Where the message goes and what it says decide whether the
person fixes it or leaves.**

## Where

**Next to the field.** Below it, before the next one. Not in a summary at the top of a
twenty-field form, which makes them hunt.

**A summary as well, for a long form** — with each item linking to its field. Both, not either:
the summary gives the overview, the inline message gives the fix.

**Never only in a toast.** It disappears, and they were reading it.

## What it says

**Say what is wrong and what would be right.**

- "Invalid" — useless.
- "Invalid date" — slightly better.
- "Enter a date after today" — **actionable**, and no longer than the useless one.

**Be specific about the rule.** "Password too short" invites a guess; "Passwords need at least
twelve characters" does not. **And say it before they type it** — a requirement revealed only
on failure is a requirement you hid.

**Do not blame.** "You entered an invalid value" carries no more information than "That date is
in the past" and reads considerably worse.

## Showing it to everybody

A red border is invisible to a screen reader and to somebody who cannot distinguish red.

**Three things, all cheap:**

**Associate the message with the input**, so a screen reader reads it when the field is
focused. In HTML that is \`aria-describedby\` pointing at the message's id.

**Mark the field invalid** — \`aria-invalid="true"\` — so it is announced as invalid rather
than merely having text near it.

**Never rely on colour alone.** Colour plus an icon plus text. **Red border only** fails for a
screen reader user, a colour-blind user, and anybody on a poor screen in sunlight.

## Timing

The previous unit's rule: **blur first, then change once invalid, and always on submit.**

**And do not validate a field they have not reached.** A form that is red before they start is
hostile, and it is the commonest mistake in a "validate everything on mount" implementation.

## Errors that are not the field's fault

**A server error against a field** — "That email is already registered" — goes exactly where a
client error would. The user does not care which side produced it.

**A whole-form error** — "Could not save, try again" — goes near the submit button, where they
are looking.

**A network error** says so specifically, because the action differs: check the connection and
retry, rather than change something.

## The check that finds most of it

**Submit your form with everything wrong, and look at it.**

Can you tell what to fix, without scrolling? Is each message specific? Does anything rely on
colour? **Then do the same with the keyboard only** — tab to the submit, press enter, and see
whether you are taken to the first problem or left guessing.

**That takes two minutes and it finds most of what is wrong** with most forms.`,
    mcqs: [
      mcq('"Enter a date after today" beats "Invalid date" because:',
        [['It is actionable, and no longer', true],
          ['It is more polite in tone', false],
          ['It mentions the field name', false],
          ['It matches the server’s wording', false]],
        'Say what is wrong and what would be right.'),
      mcq('A requirement revealed only when validation fails is:',
        [['A requirement you hid', true],
          ['A reasonable way to keep forms short', false],
          ['Acceptable for uncommon rules', false],
          ['Better than cluttering the field', false]],
        'Say it before they type it.'),
      mcq('A red border alone fails for:',
        [['Screen reader users, colour-blind users and poor screens', true],
          ['Mobile users only', false],
          ['Users with JavaScript disabled', false],
          ['Users in high-contrast mode only', false]],
        'Colour plus an icon plus text.'),
      mcq('A server error against a field should appear:',
        [['Exactly where a client error would', true],
          ['In a banner, since it came from elsewhere', false],
          ['Near the submit button', false],
          ['As a toast with a retry', false]],
        'The user does not care which side produced it.'),
    ],
    checkpoint: [
      mcq('A form showing errors before the user has typed anything is:',
        [['Hostile, and the commonest validate-on-mount mistake', true],
          ['Helpful, since the requirements are visible', false],
          ['Acceptable for required-field indicators', false],
          ['Standard behaviour in most frameworks', false]],
        'Do not validate a field they have not reached.'),
      mcq('Associating a message with its input matters because:',
        [['A screen reader then reads it when the field is focused', true],
          ['It positions the message correctly beneath the field', false],
          ['It groups the error in the summary', false],
          ['It allows the message to be styled', false]],
        'Text near a field is not the same as text belonging to it.'),
      mcq('The two-minute check is:',
        [['Submit with everything wrong, then repeat with the keyboard only', true],
          ['Read every message aloud for tone', false],
          ['Test each field’s validation in isolation', false],
          ['Compare each message against the published API error catalogue', false]],
        'It finds most of what is wrong with most forms.'),
    ],
  },

  /* ══ T3_FRONTEND_QUALITY ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FRONTEND_QUALITY_KEYBOARD_AND_SCREEN_READER',
    notes: `Accessibility is usually taught as a list of attributes, which produces developers
who add \`aria-label\` to everything and have never once tried to use their own interface
without a mouse.

**This unit is an exercise, not a standard. Unplug the mouse.**

## Do it now

Open something you built. **Put the mouse away.** Tab, shift-tab, enter, space, arrow keys,
escape.

Can you reach everything interactive? Can you tell where you are? Can you open the menu, close
the modal, submit the form, dismiss the message?

**Most developers cannot get through their own interface**, and fifteen minutes of this teaches
more than any checklist.

## What breaks, in order of frequency

**A \`div\` with an onClick.** Not focusable, not announced as a button, not activated by enter
or space. **A \`<button>\` gives you all of that for nothing** — and this single substitution
fixes more accessibility problems than everything else combined.

**No visible focus indicator.** Somebody removed the outline because it looked untidy. Now a
keyboard user cannot tell where they are, and the interface is unusable rather than untidy.
**If the default is ugly, style it — do not remove it.**

**A focus trap that does not trap.** A modal opens and tab goes to the page behind it. Focus
should move into the modal, stay there, and return to the trigger on close.

**An unreachable custom control.** A dropdown built from divs that only opens on click.

**Order that does not match the layout.** Usually from positioning things with CSS in a
different order from the markup.

## Screen readers, briefly

You do not need to be expert. **You need to have heard your own interface once.**

Every platform ships one. Turn it on, close your eyes for a minute, and try to complete one
task.

**What you will notice immediately:** images with no alternative text, announced as a filename;
buttons called "button"; form fields with no label; and an entire page read as one
undifferentiated block because there are no headings.

## The five things that fix most of it

**1. Semantic HTML.** \`<button>\`, \`<nav>\`, \`<main>\`, \`<h1>\`, \`<label>\`. **The
platform does the work** — focus, keyboard activation, announcement, landmarks — and it is free.

**2. A label on every input.** Associated properly, not just placed nearby. **A placeholder is
not a label**: it disappears when they type, and it is not announced as one.

**3. Alternative text on meaningful images.** Empty \`alt=""\` on decorative ones, so they are
skipped rather than read.

**4. A visible focus indicator.** Always.

**5. Headings in order.** They are how a screen reader user navigates a page, in the same way a
sighted user scans it.

## Automated checking, and its limit

**Run an automated checker.** It takes a minute and finds missing labels, poor contrast and
missing alt text.

**It finds perhaps a third of real problems.** It cannot tell whether your alt text is
meaningful, whether the tab order makes sense, or whether the interface is usable. **Only using
it can tell you that**, which is why this unit opens with an instruction rather than a list.`,
    mcqs: [
      mcq('The single substitution that fixes the most accessibility problems is:',
        [['A `<button>` instead of a div with an onClick', true],
          ['An aria-label on every control', false],
          ['A role attribute on custom widgets', false],
          ['A tabindex on interactive elements', false]],
        'Focus, keyboard activation and announcement, all for nothing.'),
      mcq('Removing the focus outline because it looks untidy:',
        [['Makes the interface unusable rather than untidy', true],
          ['Is acceptable if hover states are clear', false],
          ['Only affects users who navigate by tab', false],
          ['Is fine on touch-first interfaces', false]],
        'If the default is ugly, style it.'),
      mcq('Using a placeholder in place of a label fails because:',
        [['It disappears when they type and is not announced as one', true],
          ['It cannot be styled consistently', false],
          ['It is truncated on small screens', false],
          ['It is not translated automatically', false]],
        'Every input needs a properly associated label.'),
      mcq('An automated accessibility checker finds:',
        [['Perhaps a third of real problems', true],
          ['Nearly all structural problems', false],
          ['Everything except colour contrast', false],
          ['Only problems in the initial render', false]],
        'It cannot tell whether the interface is usable — only using it can.'),
    ],
    checkpoint: [
      mcq('A modal that opens without moving focus into it:',
        [['Leaves keyboard users tabbing through the page behind', true],
          ['Is acceptable if it can be closed with escape', false],
          ['Only affects screen reader users', false],
          ['Is a styling problem rather than a functional one', false]],
        'Focus should move in, stay, and return to the trigger on close.'),
      mcq('Headings matter to a screen reader user because:',
        [['They are how the page is navigated', true],
          ['They set the reading speed', false],
          ['They group the form controls', false],
          ['They determine the tab order', false]],
        'The same way a sighted user scans a page.'),
      mcq('Decorative images should have:',
        [['An empty alt, so they are skipped', true],
          ['A description of what they show', false],
          ['No alt attribute at all', false],
          ['A role of presentation and a label', false]],
        'Otherwise they are read out and interrupt the content.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_QUALITY_ONE_INTERFACE_EVERY_SIZE',
    notes: `One interface, every size — **not a mobile version and a desktop version**, which
is two things to maintain and two things to get out of step.

## Start small

**Design and build the narrow layout first, then add for wider screens.**

Not because phones matter more, though they usually do. Because **the narrow layout forces the
priority decisions**: what must be visible, what can be hidden, what is actually essential.
Starting wide and removing things produces a phone layout that is a desktop layout with
problems.

    /* the base: narrow */
    .grid { display: block; }

    /* then add */
    @media (min-width: 48rem) {
      .grid { display: grid; grid-template-columns: 1fr 2fr; }
    }

## Break where it breaks

**Not at device sizes.** There is no such thing as "tablet width" any more, and there never
really was.

**Resize the window slowly and watch.** When the layout looks wrong, that is a breakpoint. It
might be 610px, and it should be, because that is where your content needs it.

**Content-driven breakpoints age well.** Device-driven ones are wrong the year after you write
them.

## What actually breaks

**Tables.** They do not fit. Options: scroll horizontally, which is honest; reflow each row
into a card; or show fewer columns and let the row expand. **Pick deliberately** — the common
failure is a table that overflows silently and cuts off content with no scrollbar.

**Fixed widths.** \`width: 800px\` is wrong at 375px. Use maximums, percentages and the modern
layout tools.

**Touch targets.** Anything tappable needs about 44 pixels. A 20-pixel icon button is a
frustration on a phone and it is fine in every desktop test.

**Hover.** There is no hover on touch. **If information is only available on hover, it is
unavailable to a touch user** — and a "tap to show" fallback is not optional if the
information matters.

**Long content.** Names, emails, URLs. They overflow, and they need wrapping or truncation with
the full value available some other way.

**The viewport height.** Mobile browser chrome appears and disappears, so \`100vh\` is not the
visible height. This produces a persistent, maddening layout jump, and the modern units exist
specifically to fix it.

## Images

**Serve a size appropriate to the screen.** A 3000-pixel image on a phone costs the user money
as well as time, and on a metered connection that is a real cost you imposed.

**Give every image a width and height** — or an aspect ratio — so the layout does not jump when
it loads. **Layout shift is the most irritating thing a page does**, and it is caused almost
entirely by this.

## Testing it

**Resize the browser.** Constantly, while building.

**Then use a real phone.** The simulator gets the size right and gets nothing else right: not
the touch target size in your hand, not the network, not the scrolling, not sunlight.

**And test at 200% zoom on a desktop.** It is a requirement for many users, it exercises the
same code paths as a narrow screen, and it is the case nobody checks.`,
    mcqs: [
      mcq('Building the narrow layout first is preferred because:',
        [['It forces the priority decisions', true],
          ['Most traffic is from phones', false],
          ['Narrow layouts are simpler to write', false],
          ['It reduces the amount of CSS needed', false]],
        'Starting wide and removing produces a phone layout that is a desktop layout with problems.'),
      mcq('Breakpoints should be chosen:',
        [['Where the content breaks, whatever the number', true],
          ['At standard device widths', false],
          ['At round numbers for maintainability', false],
          ['At the framework’s defaults', false]],
        'It might be 610px, and it should be.'),
      mcq('Information available only on hover is:',
        [['Unavailable to a touch user', true],
          ['Acceptable if it is supplementary', false],
          ['Handled automatically by mobile browsers', false],
          ['Shown on tap by default', false]],
        'A tap-to-show fallback is not optional if the information matters.'),
      mcq('Layout shift when an image loads is caused by:',
        [['No width, height or aspect ratio being given', true],
          ['The image being too large for the container', false],
          ['Lazy loading being enabled', false],
          ['The image loading after the fonts', false]],
        'The most irritating thing a page does, almost entirely from this.'),
    ],
    checkpoint: [
      mcq('`100vh` on a mobile browser:',
        [['Is not the visible height, because the chrome moves', true],
          ['Excludes the browser address bar correctly', false],
          ['Is recalculated on scroll', false],
          ['Matches the device height exactly', false]],
        'Producing a persistent layout jump that the modern units exist to fix.'),
      mcq('A simulator gets right:',
        [['The size, and almost nothing else', true],
          ['The size and the touch behaviour', false],
          ['Everything except network conditions', false],
          ['The rendering, but not the layout', false]],
        'Not the target size in your hand, not the network, not sunlight.'),
      mcq('Testing at 200% desktop zoom is worthwhile because:',
        [['It is a real requirement and exercises the narrow paths', true],
          ['It reveals font rendering problems', false],
          ['It simulates a low-resolution screen', false],
          ['It is rather faster than resizing the browser window by hand', false]],
        'And it is the case nobody checks.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_QUALITY_FRONTEND_PERFORMANCE',
    notes: `A page is slow. **Frontend performance has three separate causes** and they need
different fixes, so the first job is telling them apart.

## The three

**1. Loading.** How long until anything useful appears. Bundle size, request count, images,
fonts, server response.

**2. Rendering.** How long the browser takes to put it on screen once it has the data.

**3. Interaction.** How long between a click and something happening. Usually JavaScript
blocking the main thread.

**Measure before guessing which.** The instinct is to optimise the bundle, and the problem is
frequently one of the other two.

## Loading

**The bundle is usually the biggest lever**, and the biggest contributor is usually a
dependency somebody added for one function.

**Look at the bundle**, with a visualiser. It is a treemap, it takes two minutes, and the
oversized thing is almost always immediately obvious — a date library, a whole icon set, a
charting package on a page with no chart.

**Then, in order:**

- **Split by route.** The settings page does not need the dashboard's code.
- **Defer what is not needed immediately.** A modal's code loads when the modal opens.
- **Images.** Modern formats, right-sized, lazy below the fold. **Usually more bytes than your
  JavaScript**, and usually ignored.
- **Fonts.** A custom font blocks text from appearing. Use \`font-display\` so something is
  readable immediately.

## Rendering

**Long lists.** A thousand rows in the DOM is slow whatever you do. **Virtualise** — render
only what is visible. It is the single biggest rendering win available and it is a library,
not a project.

**Unnecessary re-renders.** The components topic's subject. The profiler shows what rendered
and why.

**Layout thrashing.** Reading a layout property and then writing one, in a loop, forces the
browser to recalculate every time. Batch the reads, then the writes.

## Interaction

**Long tasks on the main thread.** JavaScript runs there, so does rendering, so does responding
to clicks. **A 300ms function is 300ms of a frozen interface.**

Break the work up, move it to a worker, or do less of it.

**A common and invisible cause:** an expensive computation in a render. It runs on every
render, it blocks, and nothing about the code looks slow.

## What to measure

**The metrics that describe experience**, not the ones that describe your build:

- **Time to something useful on screen.**
- **Time to interactive** — when a click actually responds.
- **Layout shift** — how much things move after appearing.
- **Interaction latency** — click to response.

**Bundle size is not a user-facing metric.** It is a proxy, and a good one, but the user
experiences the four above.

## Measuring honestly

**On a real device, on a real network.** Your laptop on office wifi is not the experience.
**Throttle to a mid-range phone and 3G** — that is a median user in much of the world, and your
application is probably unusable there without anybody knowing.

**Test the cold load.** Your cache is warm; a new user's is not.

**And measure repeatedly.** A single run varies enormously. Median of five, minimum.`,
    mcqs: [
      mcq('The first job when a page is slow is:',
        [['Telling loading, rendering and interaction apart', true],
          ['Measuring the bundle size', false],
          ['Profiling the component tree', false],
          ['Checking the server response time', false]],
        'The instinct is the bundle, and it is frequently one of the other two.'),
      mcq('A bundle visualiser is worth two minutes because:',
        [['The oversized dependency is almost always immediately obvious', true],
          ['It measures the parse time per module', false],
          ['It shows which code is unused', false],
          ['It compares against previous builds', false]],
        'A date library, a whole icon set, a charting package on a page with no chart.'),
      mcq('The single biggest rendering win for long lists is:',
        [['Virtualising, so only visible rows exist', true],
          ['Memoising each row component', false],
          ['Paginating the data', false],
          ['Reducing the DOM depth per row', false]],
        'A library, not a project.'),
      mcq('A 300ms function on the main thread means:',
        [['300ms of a frozen interface', true],
          ['300ms added to the page load', false],
          ['A dropped frame or two', false],
          ['A delay only if it runs during scroll', false]],
        'JavaScript, rendering and click handling share that thread.'),
    ],
    checkpoint: [
      mcq('Images are often ignored despite being:',
        [['More bytes than the JavaScript', true],
          ['The slowest thing to parse', false],
          ['The main cause of layout thrashing', false],
          ['Blocking the initial render', false]],
        'Modern formats, right-sized, lazy below the fold.'),
      mcq('Bundle size is:',
        [['A proxy, not a user-facing metric', true],
          ['The most important metric to track', false],
          ['Irrelevant once code splitting is used', false],
          ['Equivalent to time-to-interactive', false]],
        'The user experiences load time, interactivity, shift and latency.'),
      mcq('An expensive computation inside a render is a common cause because:',
        [['It runs every render and nothing about the code looks slow', true],
          ['It cannot be memoised at all effectively in most cases', false],
          ['It blocks the network requests', false],
          ['It forces a layout recalculation', false]],
        'Invisible in the code and obvious in a profile.'),
    ],
  },

  /* ══ T3_FRONTEND_PROJECT ════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_FRONTEND_PROJECT_BRIEF',
    notes: `Write down what you are building and what done means, before any of it exists. The
backend track's brief unit made the general argument; **this one is about what "done" means for
an interface**, which is a different and longer list.

## Choose something with real interaction

**Not a static site.** Not a page that fetches a list and renders it. You need state that
changes, forms that fail, and screens that depend on each other.

**Good shapes:** a task manager with filters and drag ordering; a booking flow with steps and
validation; a dashboard with filters that live in the URL; an editor with autosave.

**Three to six screens.** Enough for routing and shared state to matter; small enough to
finish.

## The brief

**1. What it does, in three sentences.**

**2. The screens, and how you move between them.** A sketch. This is your route table.

**3. The data it needs**, and from where. A real API, a public one, or one you wrote in the
backend track — **which is the best option if you have it**, because the two projects then
demonstrate a whole system.

**4. The states each screen has.** Loading, empty, error, populated, and any intermediate ones
such as "saving". **Listing these now is what stops you building only the populated one**,
which is the default outcome.

**5. What it does not do.** Explicitly.

## The definition of done, for an interface

- [ ] Every screen handles loading, empty, error and success
- [ ] Every request checks the response and has a timeout
- [ ] No stale response can render — races handled and demonstrated
- [ ] Filters, search and pagination in the URL; back button works; links shareable
- [ ] Forms keep their contents on a failed submit
- [ ] Field errors appear at their field, associated for screen readers
- [ ] Usable with the keyboard alone, start to finish
- [ ] A visible focus indicator everywhere
- [ ] Works at 375px and at 200% zoom
- [ ] Images sized so nothing shifts on load
- [ ] Tested on a real phone on a real network
- [ ] An automated accessibility check passing
- [ ] Deployed, with the build in a pipeline

**Write your own before you start**, and treat additions as a "later" list.

## The failure this prevents

**The happy-path demo.** It looks finished. Every screen shows data because the developer only
ever ran it with data. There is no empty state, the error state is a blank page, and it has
never been opened on a phone.

**An interviewer finds this in one minute** by turning the network off — and every item on the
list above is a thing they might do.

## Time

**Reserve a third** for states, accessibility, responsiveness and deployment. On a frontend
project this third is what separates a portfolio piece from a screenshot, and it is the third
that gets eaten when a feature takes longer than expected.`,
    mcqs: [
      mcq('Listing each screen’s states in the brief prevents:',
        [['Building only the populated state', true],
          ['Scope growing during the build', false],
          ['Choosing the wrong data source', false],
          ['Over-engineering the routing', false]],
        'Which is the default outcome without the list.'),
      mcq('Using an API you built in the backend track is best because:',
        [['The two projects then demonstrate a whole system', true],
          ['You can change it when the frontend needs it', false],
          ['Public APIs are unreliable', false],
          ['It avoids authentication complexity', false]],
        'One thing to show rather than two fragments.'),
      mcq('An interviewer identifies a happy-path demo by:',
        [['Turning the network off', true],
          ['Reading the component structure', false],
          ['Checking the deployment', false],
          ['Asking about state management', false]],
        'One minute, and every item on the done list is something they might try.'),
      mcq('A static page is unsuitable for this project because:',
        [['It has no changing state, failing forms or dependent screens', true],
          ['It cannot demonstrate styling ability', false],
          ['It is too quick to build', false],
          ['It does not require a deployment', false]],
        'Those three are what the track has been about.'),
    ],
    checkpoint: [
      mcq('The reserved third of the time covers:',
        [['States, accessibility, responsiveness and deployment', true],
          ['Refactoring and code review', false],
          ['Styling and visual polish', false],
          ['Testing and written documentation, and nothing else', false]],
        'It separates a portfolio piece from a screenshot.'),
      mcq('The screens sketch in the brief doubles as:',
        [['Your route table', true],
          ['Your component tree', false],
          ['Your state audit', false],
          ['Your test plan', false]],
        'Which is why it is worth drawing before any code.'),
      mcq('An idea you have halfway through building this should be:',
        [['Added to a later list', true],
          ['Into the done list', false],
          ['Into the brief as an amendment', false],
          ['To the mentor to prioritise', false]],
        'Ship what you committed to.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_PROJECT_BUILD',
    notes: `Build it. Every state, every screen size, usable with a keyboard, deployed.

**The order below puts the states first**, before the features. A screen built with its loading
and error states from the start has them; one that plans to add them has a blank page where the
error should be.

Budget around three and a half hours of focused work.`,
    assignment: {
      title: 'Production Frontend Project — Build It',
      description: 'Build the interface from your brief: every state, real URLs, forms that keep work, and a keyboard-usable, responsive, deployed result.',
      instructions: `**Build the application described in your brief**, in this order.

**Part one — the skeleton**

1. Routing for every screen, with a 404 route. Before any content.
2. A deployment pipeline that builds and runs a check. It will deploy an empty shell.
3. The four states as components you will reuse: loading, empty, error, and a not-found.

**Part two — one screen, completely**

4. Take your main list screen and finish it entirely: all four states, filters and pagination
   in the URL, real links, stable keys.
5. **Demonstrate the back button** moving between filter states, and a copied link reproducing
   the view.
6. Handle the stale-response race. Show it under throttling.

**Part three — the rest**

7. The remaining screens, each with all four states.
8. A form with validation on blur, errors at their fields, and **contents kept on a failed
   submit**. Demonstrate the failure.
9. Server validation errors mapped back to their fields. Show one.
10. A detail screen that cannot show the previous record's data when you navigate quickly.

**Part four — quality, not at the end**

11. **Keyboard: complete a full task with the mouse unplugged.** Record it or describe the
    path. Fix everything that blocks you.
12. A visible focus indicator on every interactive element.
13. An automated accessibility check, passing. Report what it found first.
14. 375px and 200% zoom. Screenshots of both.
15. Every image sized so nothing shifts. Show the layout-shift measurement.
16. **Test on a real phone on real mobile data.** Report what was different from your laptop.

**Part five — measure**

17. Bundle size, and the largest dependency. If anything is disproportionate, say what and
    whether you removed it.
18. Time to something useful, throttled to a mid-range phone and a slow network.
19. Renders per keystroke in your main input.

**Part six — deploy**

20. Deployed and reachable. Report the URL or show it running.
21. Roll back to the previous version and time it.

**Submit** the application, the keyboard run, both screenshots, the phone findings, the three
measurements, and the rollback timing.`,
      rubric: [
        { criterion: 'Every state, everywhere', description: 'Loading, empty, error and success on every screen, built from the start.', maxPoints: 20 },
        { criterion: 'The URL is the state', description: 'Filters and pagination shareable, back button demonstrated.', maxPoints: 15 },
        { criterion: 'Races handled', description: 'Stale results and wrong-record data both shown impossible under throttling.', maxPoints: 15 },
        { criterion: 'Forms keep work', description: 'A failed submit demonstrated with everything retained, errors at their fields.', maxPoints: 15 },
        { criterion: 'Keyboard and accessibility', description: 'A full task completed without a mouse, focus visible, checker passing.', maxPoints: 20 },
        { criterion: 'Real device and real measurements', description: 'A phone on mobile data, plus bundle, load and render numbers.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The build order puts the four states first because:',
        [['A screen that plans to add them has a blank page instead', true],
          ['They are much quicker to build before the features exist', false],
          ['The states determine the component structure', false],
          ['Error handling is hard to retrofit', false]],
        'Built from the start means they exist.'),
      mcq('Reporting what the accessibility checker found first:',
        [['Shows what was wrong before it passed', true],
          ['Proves the tool was configured correctly', false],
          ['Documents the remaining known issues', false],
          ['Demonstrates the check runs in the pipeline', false]],
        'A passing check with no history says nothing about the work.'),
      mcq('Testing on a real phone on mobile data reveals what a simulator cannot:',
        [['Touch target size in the hand, real latency, and the screen outdoors', true],
          ['Layout differences that only appear at that viewport size', false],
          ['Font rendering on the device', false],
          ['Whether the deployment succeeded', false]],
        'The simulator gets the size right and almost nothing else.'),
    ],
  },

  {
    unitCode: 'T3_FRONTEND_PROJECT_EXPLAIN',
    notes: `Defend every significant decision. The backend track's version of this unit made the
general case; **the decisions are different here**, and so are the questions.

## Why it matters more on the frontend

**An interviewer can see your work.** They will open it, and within a minute they will have
formed a view from the loading state, the error state and what happens when they press tab.

**So the explanation has to match what they can see.** Claiming you cared about accessibility
while the focus outline is removed is worse than not claiming it.

## The decisions to be ready for

**Where state lives, and why.** The single most likely question. Be able to say why one value
is local, another is in the URL, and another is server state — and why your store is as small
as it is.

**Why the URL holds what it holds.** Demonstrate the shared link. **This lands well**, because
most candidates' projects fail it and the interviewer will have tried.

**How you handled the races.** Most candidates have not thought about this at all. Saying
"typing fast on a slow connection can render stale results, so I sequence the requests" marks
you out immediately.

**What happens when it fails.** Show it. Turn the network off in front of them if the format
allows.

**Your component boundaries.** Why this is one component and that is three.

**What you did not do.** No virtualisation because the list is capped at fifty. No global store
because nothing needed it. **These are strong answers.**

## The four-sentence shape

**What I did. Why. What it cost. What I would change.**

> "Filters live in the URL rather than in component state, so a filtered view can be shared and
> the back button works. It costs a little ceremony on every filter change, and I use replace
> rather than push so typing does not fill the history. If I were doing it again I would put
> the sort order there too — I left it in state and it resets on reload, which is exactly the
> bug this was meant to prevent."

**The fourth sentence is the one that distinguishes you**, and here it names a real
inconsistency in your own work.

## Questions you will get

**"Why this framework?"** An honest answer is fine. "It is what I know best, and for a project
this size the choice is not load-bearing" is better than an invented technical justification.

**"How does this behave on a slow connection?"** You measured. Say the number.

**"Is it accessible?"** Do not say yes. Say what you did, what you tested, and what you know is
still wrong. **"I completed a full task with the keyboard, the automated check passes, and I
have not tested it with a screen reader beyond one pass"** is credible in a way "yes" is not.

**"What would you do with another week?"** Have three specific things.

**"Show me the worst part."** Have one ready.

## Prepare

**A three-minute walkthrough** of the application itself, not the code — the shape, and two or
three decisions.

**Three decisions in the four-sentence form.**

**One thing that broke and how you found it.** The debugging method is what they are listening
for, and a frontend race condition is an excellent story because it is genuinely hard to see.

**Your numbers.** Bundle size, load time on a throttled connection, renders per keystroke.
**Having measured your own interface is rare and it shows.**`,
    mcqs: [
      mcq('Explaining matters more on the frontend because:',
        [['The interviewer can open it and form a view in a minute', true],
          ['Frontend decisions are more subjective', false],
          ['The code is harder to read quickly', false],
          ['Visual work is judged more harshly', false]],
        'So the explanation has to match what they can see.'),
      mcq('Claiming you cared about accessibility while the focus outline is removed is:',
        [['Worse than not claiming it', true],
          ['A minor inconsistency they will overlook', false],
          ['Acceptable if the checker passes', false],
          ['Balanced by the other work you did', false]],
        'The claim is checkable in three seconds.'),
      mcq('Mentioning how you handled request races:',
        [['Marks you out, because most candidates have not considered it', true],
          ['Is too detailed for an interview', false],
          ['Only matters for real-time applications', false],
          ['Is expected of every candidate', false]],
        'Typing fast on a slow connection is a bug almost nobody anticipates.'),
      mcq('"Is it accessible?" is best answered by:',
        [['What you did, what you tested, and what is still wrong', true],
          ['Yes, with the checker result as evidence', false],
          ['Describing the standards you followed', false],
          ['Listing the attributes you added', false]],
        'Credible in a way "yes" is not.'),
    ],
    checkpoint: [
      mcq('"It is what I know best, and the choice is not load-bearing here" is:',
        [['A good answer to why you chose a framework', true],
          ['An admission that will count against you', false],
          ['Acceptable only for small projects', false],
          ['Weaker than a technical justification', false]],
        'Better than an invented one, which will not survive a follow-up.'),
      mcq('The shared-link demonstration lands well because:',
        [['Most candidates’ projects fail it and the interviewer will have tried', true],
          ['It shows the routing was configured correctly', false],
          ['It is a commonly listed requirement in most job specifications', false],
          ['It demonstrates the state management library', false]],
        'They have already found out whether it works.'),
      mcq('A frontend race condition is a good "what broke" story because:',
        [['It is genuinely hard to see, so finding it shows method', true],
          ['It is a fairly common topic in technical interviews', false],
          ['It has a simple explanation', false],
          ['It only appears in production', false]],
        'The debugging method is what they are listening for.'),
    ],
  },
];
