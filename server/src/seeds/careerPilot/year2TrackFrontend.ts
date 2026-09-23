/**
 * T2_TRACK_FRONTEND — thirteen units. Year 2, direction track.
 *
 * ── THE ORDER THIS TRACK TAKES, AND WHY ───────────────────────────────────────────────────
 *
 * Semantics, layout, the DOM, events, data, async, fetching, state, components, accessibility.
 * Deliberately no framework until the last third, and even then as an idea rather than a product.
 *
 * A student who learns React before the DOM can build a page and cannot fix one. Frameworks change;
 * the browser does not, and everything a framework does is something the platform does underneath.
 * The units name React where it clarifies, and say plainly that the concept is the transferable
 * part.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const FRONTEND_TRACK_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_TRACK_FRONTEND_SEMANTIC_STRUCTURE',
    notes: `HTML says what things *are*. Everything above it — styling, behaviour, accessibility,
search — reads that meaning, and a page built entirely from \`<div>\` has thrown it away.

    <div class="header">
      <div class="nav">
        <div class="link" onclick="go('/orders')">Orders</div>

    <header>
      <nav>
        <a href="/orders">Orders</a>

The second works with a keyboard, can be opened in a new tab, is announced correctly by a screen
reader, and is understood by a search engine. The first is a rectangle that responds to clicks.

**The elements that carry meaning:**

| Element | Means |
|---|---|
| \`<header>\`, \`<nav>\`, \`<main>\`, \`<footer>\` | The regions of a page |
| \`<article>\`, \`<section>\` | Self-contained content, and a thematic grouping |
| \`<h1>\`–\`<h6>\` | The outline, in order and without skipping |
| \`<button>\` | Something that does something |
| \`<a href>\` | Something that goes somewhere |
| \`<ul>\`, \`<ol>\`, \`<li>\` | A list, which assistive technology counts aloud |
| \`<table>\` with \`<th>\` | Tabular data, with headers that label cells |

**Button versus link is the distinction people get wrong daily.** A link navigates; a button acts.
Getting it backwards breaks the back button, breaks opening in a new tab, and breaks the keyboard
behaviour users expect.

**Forms, done properly:**

    <label for="email">Email</label>
    <input id="email" type="email" name="email" required autocomplete="email">

The \`<label>\` gives a screen reader something to announce and makes the text clickable.
\`type="email"\` brings the right keyboard on a phone. \`autocomplete\` lets the browser fill it in.
Three attributes, and each one is a real improvement for a real person.

**Headings are an outline, not a font size.** Screen reader users navigate by heading; skipping from
\`<h1>\` to \`<h4>\` because it looked right is a navigation structure with holes in it. Style with
CSS.

**The test:** turn off CSS. If the page is still readable and its structure is obvious, the HTML is
doing its job. If it becomes an unreadable pile of text, the meaning was in the styling — which no
assistive technology, and no search engine, can see.`,
    mcqs: [
      mcq('A `<div onclick>` acting as a link fails because:',
        [['It has no keyboard behaviour and cannot open in a new tab', true],
          ['It is slower to render', false],
          ['It cannot be styled consistently', false],
          ['Browsers strip inline handlers', false]],
        'It is a rectangle that responds to clicks, not a link.'),
      mcq('The distinction between `<button>` and `<a href>` is that:',
        [['A link navigates and a button acts', true],
          ['A button can be styled and a link cannot', false],
          ['Links work without JavaScript', false],
          ['Buttons are keyboard accessible only', false]],
        'Getting it backwards breaks the back button and the expected keyboard behaviour.'),
      mcq('Skipping from `<h1>` to `<h4>` is a problem because:',
        [['Screen reader users navigate by heading structure', true],
          ['Search engines penalise it', false],
          ['CSS cannot target it reliably', false],
          ['It breaks the document outline algorithm', false]],
        'Headings are an outline, not a font size.'),
      mcq('`<label for="email">` provides:',
        [['Something to announce, and clickable label text', true],
          ['Validation of the email format', false],
          ['The correct keyboard on mobile', false],
          ['Browser autofill behaviour', false]],
        'type and autocomplete give the other two.'),
    ],
    checkpoint: [
      mcq('The test of whether your HTML is semantic is:',
        [['Turn off CSS and see if the structure survives', true],
          ['Run it through a validator', false],
          ['Check it renders the same in every browser', false],
          ['Count the number of div elements', false]],
        'If the meaning was in the styling, nothing else can see it.'),
      mcq('`<ul>` and `<li>` matter beyond appearance because:',
        [['Assistive technology announces the item count', true],
          ['They are easier to style', false],
          ['They improve rendering performance', false],
          ['They are required for navigation menus', false]],
        'Semantics carry information that styling cannot.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_LAYOUT',
    notes: `A layout that works with the content you designed it around is not a layout. It has to
survive a name three times longer than expected, a screen 320 pixels wide, and a user who has set
their font size to 24px.

**Flexbox for one direction:**

    .toolbar { display: flex; gap: 1rem; align-items: center; }
    .toolbar .spacer { flex: 1; }          /* pushes the rest to the right */

**Grid for two:**

    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1rem;
    }

**\`gap\` rather than margins** between items: no collapsing, no last-child exception, and it removes
a whole category of spacing bug.

**Responsive, mobile first.** Write the narrow layout as the default, then add complexity as space
allows:

    .layout { display: block; }
    @media (min-width: 768px) {
      .layout { display: grid; grid-template-columns: 240px 1fr; }
    }

That way the smallest screen gets the simplest CSS, and every enhancement is additive.

**Often you need no media query at all:**

    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));

That is a responsive card grid in one line, which reflows at any width.

**Use relative units.** \`rem\` for sizes, so a user who increased their font size gets a layout that
grows with it. A layout in fixed pixels ignores that setting entirely, and for some people it is not
a preference.

**Do not set a fixed height on anything containing text.** Text wraps, translations are longer,
and a fixed height produces the overflow bug that appears only for the one user with a long name.

**Test with hostile content**, every time: a 60-character word with no spaces, an empty list, 200
rows, a missing image, a name in a script you did not anticipate. Ten minutes, and it finds what a
careful reading will not.

**The three widths to check:** 320px (a small phone), 768px (a tablet), and very wide — where an
unconstrained line of text becomes unreadably long. \`max-width\` on your content container solves
the last one.`,
    mcqs: [
      mcq('Mobile-first CSS means:',
        [['The narrow layout is the default and larger screens add to it', true],
          ['Phones receive a separate stylesheet', false],
          ['Media queries use max-width', false],
          ['Desktop styles are loaded conditionally', false]],
        'Every enhancement is then additive rather than a correction.'),
      mcq('`gap` is preferred to margins between flex or grid items because:',
        [['It removes collapsing and last-child exceptions', true],
          ['It renders faster', false],
          ['Margins do not work inside flex containers', false],
          ['It scales with the font size', false]],
        'A whole category of spacing bug disappears.'),
      mcq('Using `rem` rather than `px` for sizes matters because:',
        [['A user who increased their font size gets a layout that grows', true],
          ['It produces smaller stylesheets', false],
          ['Pixels vary between browsers', false],
          ['It is required for media queries', false]],
        'For some people that setting is not a preference.'),
      mcq('A fixed height on a text container produces:',
        [['Overflow for the one user with a long name', true],
          ['Inconsistent spacing between items', false],
          ['A layout that cannot be centred', false],
          ['Slower rendering on reflow', false]],
        'Text wraps, and translations are longer.'),
    ],
    checkpoint: [
      mcq('`repeat(auto-fit, minmax(240px, 1fr))` gives you:',
        [['A responsive card grid, no media query', true],
          ['A fixed three-column layout', false],
          ['Equal-height rows automatically', false],
          ['A grid that scrolls horizontally', false]],
        'It reflows at any width on its own.'),
      mcq('The problem a very wide screen creates is:',
        [['Lines of text too long to read', true],
          ['Images loading at the wrong size', false],
          ['Grid columns collapsing', false],
          ['Media queries not applying', false]],
        'max-width on the content container is the fix.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_JS_IN_THE_PAGE',
    notes: `The DOM is the browser's live model of the page. JavaScript changes the page by changing
that model, and every framework you will ever use is doing this underneath.

**Selecting:**

    const form = document.querySelector("#order-form");
    const rows = document.querySelectorAll(".order-row");     // a static NodeList

**Reading and changing:**

    el.textContent = "Saved";              // safe: text, always
    el.innerHTML = userInput;              // DANGEROUS: parses as HTML
    el.classList.add("is-active");
    el.classList.toggle("is-open", isOpen);
    el.dataset.orderId                     // reads data-order-id

**\`textContent\` rather than \`innerHTML\` for anything from a user or a server.** \`innerHTML\`
parses its input as markup, so a name containing a script tag becomes a script tag. That is the
cross-site scripting flaw from the security topic, in one property.

**Building elements:**

    const li = document.createElement("li");
    li.textContent = order.name;
    li.dataset.id = order.id;
    list.append(li);

**Batch your changes.** Every read of a layout property after a write forces the browser to
recalculate. Adding 500 rows one at a time in a loop is noticeably slow; building a fragment and
appending once is not:

    const frag = document.createDocumentFragment();
    for (const order of orders) frag.append(rowFor(order));
    list.replaceChildren(frag);

**Prefer classes to inline styles.** \`el.classList.add("is-error")\` keeps the appearance in CSS,
where it can be themed, overridden and read in one place. \`el.style.color = "red"\` scatters
presentation through your JavaScript.

**Scripts at the end of the body, or with \`defer\`.** A script in the \`<head>\` runs before the
elements exist, and \`querySelector\` returns \`null\` — which is the first DOM bug almost everybody
meets.

**The DOM is the platform.** React's virtual DOM, Vue's reactivity and every other abstraction end up
calling these same methods. Understanding this layer is what lets you debug the layer above it.`,
    mcqs: [
      mcq('`textContent` is preferred to `innerHTML` for user-supplied values because:',
        [['innerHTML parses its input as markup', true],
          ['textContent is faster to assign', false],
          ['innerHTML strips whitespace', false],
          ['textContent escapes HTML entities automatically', false]],
        'A name containing a script tag becomes a script tag.'),
      mcq('Appending 500 rows one at a time is slow because:',
        [['Each change can force the browser to recalculate layout', true],
          ['createElement is expensive', false],
          ['The DOM limits append operations', false],
          ['Each row triggers a network request', false]],
        'Build a fragment and append once.'),
      mcq('A script in the `<head>` without `defer` causes:',
        [['querySelector to return null, as elements do not exist yet', true],
          ['The page to render more slowly', false],
          ['Event listeners to fire twice', false],
          ['CSS to load after the script', false]],
        'The first DOM bug almost everybody meets.'),
      mcq('Toggling a class is preferred to setting inline styles because:',
        [['Appearance stays in CSS where it can be themed and overridden', true],
          ['Classes apply faster than inline styles', false],
          ['Inline styles cannot be removed', false],
          ['Classes work without a stylesheet', false]],
        'Inline styles scatter presentation through your JavaScript.'),
    ],
    checkpoint: [
      mcq('`el.dataset.orderId` reads the attribute:',
        [['data-order-id', true], ['orderId', false], ['data-orderId', false], ['order-id', false]],
        'Hyphenated data attributes become camelCase in the dataset.'),
      mcq('Understanding the DOM matters even when using a framework because:',
        [['Every framework calls these methods', true],
          ['Frameworks expose the DOM API directly', false],
          ['Frameworks are deprecated periodically', false],
          ['The virtual DOM behaves differently', false]],
        'It is what lets you debug the layer above it.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_EVENTS',
    notes: `Events are how a page responds to a person. The mechanism is simple and the order things
happen in is where the bugs are.

    button.addEventListener("click", (event) => {
      event.preventDefault();          // stop the default action
      save();
    });

**Bubbling.** An event fires on the deepest element, then travels up through its ancestors. That is
why a click on an icon inside a button reaches the button, and it is what makes delegation possible:

    list.addEventListener("click", (event) => {
      const row = event.target.closest(".order-row");
      if (!row) return;
      open(row.dataset.id);
    });

One listener on the list, handling every row — including rows added later. Attaching a listener per
row is the version that breaks the moment the list is re-rendered.

**\`event.target\` is what was clicked; \`event.currentTarget\` is what the listener is on.** Mixing
them up produces the handler that works until somebody clicks the icon inside the button.

**Forms need \`preventDefault\`**, or the browser navigates away and your handler's work vanishes:

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit(new FormData(form));
    });

Use the \`submit\` event on the form rather than \`click\` on the button, so that pressing Enter in a
field works.

**The double-submit bug**, which every beginner ships once: a user clicks Save twice and two orders
are created. Disable the button while the request is in flight, and re-enable it in a \`finally\`.

**Removing listeners.** A listener added and never removed keeps its element alive in memory. In a
long-lived page, adding one per render is a leak — pass the same function reference to
\`removeEventListener\`, or use \`AbortController\`.

**Throttle what fires constantly.** \`scroll\`, \`resize\` and \`mousemove\` fire dozens of times a
second; doing real work in one of those handlers is how a page becomes sluggish. Debounce a search
input, throttle a scroll handler.

**Keyboard events matter.** If something responds to a click and not to Enter or Space, it is
unusable for anybody not using a mouse — and using a real \`<button>\` gives you that for free.`,
    mcqs: [
      mcq('Event delegation — one listener on a parent — works because:',
        [['Events bubble up from the element to its ancestors', true],
          ['Listeners are inherited by children', false],
          ['The browser optimises duplicate listeners', false],
          ['Parent elements capture events first', false]],
        'It also handles rows added after the listener was attached.'),
      mcq('`event.target` differs from `event.currentTarget` in that target is:',
        [['What was actually clicked', true],
          ['The element the listener is attached to', false],
          ['The top-level document element', false],
          ['The element that will handle it next', false]],
        'Mixing them up breaks when somebody clicks the icon inside the button.'),
      mcq('The double-submit bug is prevented by:',
        [['Disabling the button while the request is in flight', true],
          ['Debouncing the click handler', false],
          ['Using preventDefault on the click', false],
          ['Validating on the server only', false]],
        'Re-enable it in a finally so a failure does not lock the form.'),
      mcq('Listening for `submit` on the form rather than `click` on the button means:',
        [['Pressing Enter in a field also works', true],
          ['Validation runs automatically', false],
          ['preventDefault is unnecessary', false],
          ['The form data is easier to read', false]],
        'Keyboard users submit forms with Enter.'),
    ],
    checkpoint: [
      mcq('A listener added on every render and never removed causes:',
        [['A memory leak, as elements stay alive', true],
          ['Events firing in the wrong order', false],
          ['The handler being called only once', false],
          ['Bubbling to stop working', false]],
        'Keep the same function reference, or use AbortController.'),
      mcq('`scroll` and `mousemove` handlers should be throttled because:',
        [['They fire dozens of times a second', true],
          ['They block the network', false],
          ['They do not bubble', false],
          ['They fire before the DOM updates', false]],
        'Real work in one of those handlers makes a page sluggish.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_ARRAYS_OBJECTS',
    notes: `Almost everything a frontend does is transforming a list of things into something on
screen. Doing it with array methods rather than index loops is clearer and much harder to get subtly
wrong.

    const paid = orders.filter(o => o.status === "paid");
    const totals = paid.map(o => o.total);
    const sum = totals.reduce((acc, n) => acc + n, 0);
    const found = orders.find(o => o.id === 42);
    const any = orders.some(o => o.total > 10_000);
    const all = orders.every(o => o.items.length > 0);

**They chain, and the chain reads as a sentence:**

    const names = orders
      .filter(o => o.status === "paid")
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(o => o.customer.name);

**\`sort\` mutates and compares as strings by default.** Two real traps in one method:

    [10, 9, 100].sort()                    // [10, 100, 9]
    [10, 9, 100].sort((a, b) => a - b)     // [9, 10, 100]
    [...orders].sort(byTotal)              // copy first, or you reorder the original

**Copy before mutating**, always, in a frontend. A component that sorts the array it was given has
changed data another part of the page is showing, and the resulting bug is genuinely hard to find.

    const updated = { ...order, status: "paid" };
    const withNew = [...orders, newOrder];
    const without = orders.filter(o => o.id !== id);
    const replaced = orders.map(o => (o.id === id ? updated : o));

Those four cover almost every update you will need.

**Spread is a shallow copy.** \`{...order}\` copies the top level; \`order.customer\` is still the
same object. For nested updates, spread at each level you are changing:

    { ...order, customer: { ...order.customer, city: "Chennai" } }

**Optional chaining and nullish coalescing** remove most defensive code:

    const city = order?.customer?.address?.city ?? "Unknown";

**\`??\` rather than \`||\`** when zero or an empty string is a valid value: \`count || 10\` turns a
real zero into ten, which is a bug that survives a long time because it only shows in one case.`,
    mcqs: [
      mcq('`[10, 9, 100].sort()` returns `[10, 100, 9]` because:',
        [['The default comparison converts values to strings', true],
          ['sort is unstable for small arrays', false],
          ['Numbers must be sorted with a typed array', false],
          ['sort returns a copy in a random order', false]],
        'Pass a comparator, and copy the array first.'),
      mcq('Copying an array before sorting it matters in a frontend because:',
        [['Sorting in place changes data another part of the page shows', true],
          ['sort is slower on shared arrays', false],
          ['Frameworks forbid mutation', false],
          ['The original order cannot be restored', false]],
        'The resulting bug is genuinely hard to find.'),
      mcq('`{...order}` copies:',
        [['The top level only; nested objects are shared', true],
          ['Every level of the object deeply', false],
          ['Only the enumerable primitive values', false],
          ['The object and its prototype', false]],
        'Spread at each level you are changing.'),
      mcq('`count ?? 10` differs from `count || 10` in that:',
        [['A count of zero is kept rather than replaced', true],
          ['It checks the type as well', false],
          ['It throws when count is undefined', false],
          ['It only applies to numbers', false]],
        'A bug that survives a long time because it shows in one case.'),
    ],
    checkpoint: [
      mcq('Replacing one item in a list immutably is done with:',
        [['map, returning the new item', true],
          ['splice at the found index', false],
          ['filter, then push', false],
          ['forEach with an assignment', false]],
        'Spread, filter, map and concat cover almost every update.'),
      mcq('`order?.customer?.city ?? "Unknown"` replaces:',
        [['Several layers of defensive checks', true],
          ['A try/catch around the access', false],
          ['A type check on order', false],
          ['A default parameter value', false]],
        'Optional chaining plus nullish coalescing in one line.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_ASYNC',
    notes: `Anything that takes time — a network call, a timer, reading a file — happens
asynchronously, because the alternative is a frozen page.

    async function loadOrders() {
      const resp = await fetch("/api/v1/orders");
      if (!resp.ok) throw new Error(\`HTTP $\{resp.status}\`);
      return resp.json();
    }

**\`await\` pauses this function, not the page.** The browser continues rendering and responding to
clicks while it waits, which is the entire point.

**Errors need \`try/catch\`, and an unhandled rejection is silent:**

    try {
      const orders = await loadOrders();
      render(orders);
    } catch (err) {
      showError("Could not load orders. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }

**The \`finally\` is what stops a spinner that never goes away**, which is the most common visible
async bug in student projects.

**Parallel rather than sequential**, when calls do not depend on each other:

    // 600ms — one after the other
    const user = await fetchUser();
    const orders = await fetchOrders();

    // 300ms — together
    const [user, orders] = await Promise.all([fetchUser(), fetchOrders()]);

**\`Promise.all\` rejects if any one rejects.** Use \`Promise.allSettled\` when you want the
successes and the failures.

**\`fetch\` does not reject on 404 or 500.** It rejects only on a network failure, so a response has
to be checked:

    if (!resp.ok) { ... }

Forgetting that means parsing an error page as JSON and getting a confusing message about unexpected
tokens.

**The race condition every search box has.** A user types quickly, three requests go out, and the
slowest returns last — so the results shown belong to an earlier query. Track the latest request and
ignore the others, or cancel with \`AbortController\`:

    controller?.abort();
    controller = new AbortController();
    const resp = await fetch(url, { signal: controller.signal });

**Every async operation needs a timeout**, a loading state and an error path. Without all three, a
slow network produces a page that looks broken with no explanation.`,
    mcqs: [
      mcq('`await` pauses:',
        [['That function, while the page keeps responding', true],
          ['The whole page until it resolves', false],
          ['Every pending promise', false],
          ['The event loop for its duration', false]],
        'Which is the entire point of asynchronous code.'),
      mcq('`fetch` rejects only on:',
        [['A network failure, not on a 404 or 500', true],
          ['Any status outside 200-299', false],
          ['A timeout or a network failure', false],
          ['A malformed response body', false]],
        'Check resp.ok, or you parse an error page as JSON.'),
      mcq('A spinner that never disappears is usually caused by:',
        [['The loading state not being cleared in a finally', true],
          ['A request that never times out', false],
          ['Two requests racing each other', false],
          ['An unhandled promise rejection', false]],
        'The most common visible async bug in student projects.'),
      mcq('A search box showing results for an earlier query is:',
        [['A race between responses returning out of order', true],
          ['A caching problem', false],
          ['A debouncing failure', false],
          ['A state update batching issue', false]],
        'Track the latest request, or cancel with AbortController.'),
    ],
    checkpoint: [
      mcq('`Promise.all` differs from `Promise.allSettled` in that it:',
        [['Rejects as soon as any one promise rejects', true],
          ['Runs the promises sequentially', false],
          ['Returns results in completion order', false],
          ['Ignores rejected promises', false]],
        'allSettled gives you the successes and the failures.'),
      mcq('Every async operation in a UI needs:',
        [['A timeout, a loading and an error state', true],
          ['A retry and a cache', false],
          ['A debounce and a throttle', false],
          ['A cancellation token and a log', false]],
        'Without all three a slow network looks like a broken page.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_FETCHING',
    notes: `Showing data from a server is the core of most frontend work, and **every screen that
fetches has four states**, not one.

| State | What the user sees |
|---|---|
| **Loading** | Something is happening, and how long it might take |
| **Error** | What went wrong, and what they can do |
| **Empty** | There is genuinely nothing, and what to do about it |
| **Success** | The data |

Most student projects build the fourth and ship the other three as a blank screen.

    async function load() {
      setState({ status: "loading" });
      try {
        const resp = await fetch(url, { signal });
        if (!resp.ok) throw new HttpError(resp.status);
        const data = await resp.json();
        setState({ status: data.length ? "success" : "empty", data });
      } catch (err) {
        if (err.name === "AbortError") return;
        setState({ status: "error", error: err });
      }
    }

**Empty is not an error**, and the distinction matters to a user. "No orders yet — create your first
one" is a different message from "Could not load your orders", and showing the wrong one is
confusing.

**Error messages should say what to do.** "Something went wrong" is the least useful string in web
development. "Could not reach the server. Check your connection and try again" tells them something,
and a Retry button tells them more.

**Distinguish the errors you can:** a 401 means log in again, a 403 means you do not have access, a
404 means it is gone, a 500 means our fault, and a network failure means check the connection. Each
deserves different words.

**Loading states should not shift the layout.** A spinner that is replaced by content of a different
height makes the page jump. A skeleton matching the shape of what is coming keeps it still.

**Do not show a spinner for a fast request.** Under about 300ms it flashes and looks like a glitch;
delay showing it.

**Always send a timeout.** A request with none can hang until the browser gives up, which on a bad
mobile connection is a very long time to look at a spinner.

**Cache what does not change** and show stale data with a marker while refreshing, rather than a
blank screen. A list that was correct a minute ago is far better than nothing.`,
    mcqs: [
      mcq('Every screen that fetches data has:',
        [['Four states: loading, error, empty and success', true],
          ['Two states: loading and loaded', false],
          ['Three states: loading, error and success', false],
          ['One state, with errors handled globally', false]],
        'Most student projects build the fourth and ship the rest blank.'),
      mcq('Empty should be distinguished from error because:',
        [['"No orders yet" and "could not load" mean different things', true],
          ['Empty responses have a different status code', false],
          ['Errors need to be logged and empties do not', false],
          ['Empty states cannot be retried', false]],
        'Showing the wrong one is confusing to the user.'),
      mcq('A spinner shown for a request under about 300ms:',
        [['Flashes and reads as a glitch', true],
          ['Reassures the user the app is working', false],
          ['Prevents duplicate submissions', false],
          ['Is required for accessibility', false]],
        'Delay showing it by a couple of hundred milliseconds.'),
      mcq('A skeleton matching the coming content prevents:',
        [['The page jumping when content arrives', true],
          ['A second request being sent', false],
          ['The user clicking too early', false],
          ['Layout differences between browsers', false]],
        'A spinner of a different height shifts everything below it.'),
    ],
    checkpoint: [
      mcq('A 401 and a 500 deserve different messages because:',
        [['One means log in again, the other is our fault', true],
          ['One is retryable and the other is not', false],
          ['Status codes must be shown to users', false],
          ['They occur at different layers', false]],
        'Each error the user can act on differently deserves its own words.'),
      mcq('Showing stale cached data with a marker is better than a blank screen because:',
        [['A minute-old list beats nothing', true],
          ['It avoids a second request', false],
          ['Users prefer instant responses', false],
          ['It reduces server load', false]],
        'Mark it, refresh behind it, and say when it was fetched.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_STATE',
    notes: `State is everything the screen remembers: the data, what is loading, what the user has
typed, which tab is open. Most confusing frontend bugs are two copies of one fact disagreeing.

**One source of truth per fact.** If the order total is stored in a variable *and* written into the
DOM *and* held in a component, three things can disagree. Store it once, and derive the rest.

**Derive rather than store:**

    // two facts that can disagree
    state = { orders: [...], total: 4200 };

    // one fact and a calculation
    state = { orders: [...] };
    const total = state.orders.reduce((s, o) => s + o.total, 0);

If a value can be computed from another value, computing it is always correct and storing it is
correct only until something changes.

**The kinds of state, and where each belongs:**

| Kind | Example | Where |
|---|---|---|
| Server data | The orders list | A cache or store, fetched |
| UI state | Which modal is open | The component using it |
| Form state | What is typed | The form component |
| URL state | Filters, page number, selected id | **The URL** |

**Put in the URL anything a user might share or reload.** A filtered, paged list whose state lives
only in memory loses everything on refresh and cannot be sent to a colleague. \`?status=paid&page=3\`
fixes both, and costs a few lines.

**Keep state as local as possible.** Lifting everything to a global store because it might be needed
elsewhere produces a store nobody can reason about. Lift it when a second component genuinely needs
it, and not before.

**Update immutably.** Replace, do not mutate — both because frameworks detect changes by comparison,
and because a mutated shared object produces the hardest class of bug in this topic.

**Form state and server state are different things.** What the user has typed is not what is saved.
Keeping them separate is what lets you show unsaved changes, discard edits and disable Save until
something has actually changed.

**The debugging question that resolves most state bugs: which copy is wrong?** Find every place that
fact is stored, and the answer is usually that one of them was never updated.`,
    mcqs: [
      mcq('Storing a total alongside the list it comes from is a problem because:',
        [['The two can disagree after any change', true],
          ['It uses more memory', false],
          ['Totals should be computed on the server', false],
          ['Frameworks cannot track derived values', false]],
        'Computing it is always correct; storing it is correct only until something changes.'),
      mcq('Filters and the page number belong in:',
        [['The URL, so the view can be shared and survives a reload', true],
          ['A global store', false],
          ['Local component state', false],
          ['Browser local storage', false]],
        'Otherwise a refresh loses everything and nothing can be sent to a colleague.'),
      mcq('Lifting all state to a global store produces:',
        [['A store nobody can reason about', true],
          ['Better performance from fewer updates', false],
          ['Simpler component interfaces', false],
          ['Easier debugging of every value', false]],
        'Lift it when a second component genuinely needs it.'),
      mcq('Form state is kept separate from server state so that you can:',
        [['Show unsaved changes and discard edits', true],
          ['Validate on the server only', false],
          ['Avoid re-rendering the form', false],
          ['Submit without a network request', false]],
        'What the user typed is not what is saved.'),
    ],
    checkpoint: [
      mcq('The question that resolves most state bugs is:',
        [['Which copy of this fact is wrong?', true],
          ['When did the value last change?', false],
          ['Which component owns this state?', false],
          ['Is the render function pure?', false]],
        'Usually one copy was never updated.'),
      mcq('Updating state immutably matters partly because:',
        [['Frameworks detect changes by comparison', true],
          ['Mutation is slower', false],
          ['Immutable objects use less memory', false],
          ['It prevents race conditions', false]],
        'And a mutated shared object is the hardest bug in this topic.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_COMPONENTS',
    notes: `A component is a piece of interface with its own markup, behaviour and data. Thinking in
components is a way of decomposing a screen, and it applies whether or not you use a framework.

**Find them by drawing boxes on a design.** A header, a filter bar, a list, a row, a detail panel.
Each box that has its own data or its own behaviour is a candidate.

**A good component has one job**, a clear input, and no knowledge of where it is used:

    OrderRow({ order, onSelect })
      — displays one order, tells its parent when clicked
      — does not fetch, does not know about the page, does not decide what selection means

**Data flows down, events flow up.** The parent owns the data and passes what a child needs; the
child reports what happened and the parent decides. A child that fetches its own data and updates a
global store is a component you cannot reuse or test in isolation.

**Composition rather than configuration.** A component with eleven boolean props —
\`isCompact\`, \`showHeader\`, \`variant\` — has become a small framework. Two or three simpler
components, or a component that accepts content as children, is easier to read and to change.

**Presentational and container components** are a useful split: one decides what data to show and
fetches it, the other renders and knows nothing about where the data came from. The second is
trivially testable and reusable.

**Name components for what they are**, not where they sit. \`OrderRow\` survives being moved;
\`LeftPanelItem\` does not.

**Do not extract too early.** A component used once, created because it "might be reused", is
indirection with no payment. Extract when there is a second use, or when a piece is big enough to
obscure its parent.

**Keeping a component small pays immediately:** it fits on a screen, it has one reason to change, and
a bug in it has nowhere to hide.

**The framework part is the smallest part.** React, Vue and Svelte differ in syntax and in how they
track changes. Boundaries, one job, data down and events up are the same in all of them, and in
plain JavaScript.`,
    mcqs: [
      mcq('In component design, data and events flow:',
        [['Data down to children, events up to parents', true],
          ['Both in whichever direction is convenient', false],
          ['Through a global store in both directions', false],
          ['Up to the parent and down through siblings', false]],
        'A child that fetches and updates a global store cannot be reused or tested.'),
      mcq('A component with eleven boolean props has become:',
        [['A small framework, better split into simpler components', true],
          ['A well-configured reusable component', false],
          ['A container component', false],
          ['An acceptable design for complex UI', false]],
        'Composition rather than configuration.'),
      mcq('`OrderRow` is a better name than `LeftPanelItem` because:',
        [['It survives the component being moved', true],
          ['It is shorter', false],
          ['It matches the data model', false],
          ['It avoids naming collisions', false]],
        'Name components for what they are, not where they sit.'),
      mcq('Extracting a component used once "in case it is reused" is:',
        [['Indirection with no payment', true],
          ['Good preparation for growth', false],
          ['Required by component conventions', false],
          ['Harmless and worth doing', false]],
        'Extract at the second use, or when size obscures the parent.'),
    ],
    checkpoint: [
      mcq('A presentational component is trivially testable because it:',
        [['It does not know where its data came from', true],
          ['Contains no logic at all', false],
          ['Renders only static markup', false],
          ['Has no event handlers', false]],
        'Give it data, check what it renders.'),
      mcq('Component thinking transfers between React, Vue and plain JavaScript because:',
        [['Boundaries and data flow are the same', true],
          ['They share the same component syntax', false],
          ['They all use a virtual DOM', false],
          ['The APIs are standardised', false]],
        'The framework part is the smallest part.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_ACCESSIBILITY',
    notes: `An interface only some people can use is an unfinished interface. Most of accessibility is
a small number of habits, and semantic HTML has already given you a large part of it.

**Keyboard first, because it is the fastest check.** Put your mouse down and use your page with Tab,
Shift+Tab, Enter, Space and Escape. If you cannot reach a control, or activate it, or see where you
are, that is a bug — and one that also affects power users and anybody with a temporary injury.

**Focus must be visible.** \`outline: none\` with nothing in its place is the single most common
accessibility failure on the web. If the default ring is ugly, replace it:

    :focus-visible { outline: 2px solid #359AAD; outline-offset: 2px; }

**Every input needs a label.** A placeholder is not a label: it disappears when typing starts, it
fails contrast requirements, and screen readers treat it inconsistently.

**Images need alt text that carries the meaning:**

    <img src="chart.png" alt="Revenue by month, rising from 12k in January to 31k in June">
    <img src="divider.png" alt="">          <!-- decorative: empty alt, not omitted -->

**Colour alone is never the message.** Red and green bars are identical to a colourblind reader —
about one in twelve men. Add a label, an icon or a pattern.

**Contrast:** 4.5:1 for normal text, 3:1 for large. Browser tools check it in seconds, and grey text
on a white background is the usual failure.

**ARIA is a last resort.** \`<button>\` is better than \`<div role="button" tabindex="0">\` in every
way. The first rule of ARIA is not to use ARIA when a real element exists — incorrect ARIA is worse
than none, because it lies to assistive technology.

**Announce what changes.** A user who cannot see the screen does not know that a result loaded or a
save succeeded. \`aria-live="polite"\` on a status region announces it.

**Respect motion preferences:**

    @media (prefers-reduced-motion: reduce) { * { animation: none; transition: none; } }

**Test with a real screen reader once.** NVDA on Windows and VoiceOver on macOS are free. Half an
hour changes how you build interfaces permanently, and no amount of reading substitutes for it.`,
    mcqs: [
      mcq('The most common accessibility failure on the web is:',
        [['Removing the focus outline with nothing to replace it', true],
          ['Missing alt text on images', false],
          ['Insufficient colour contrast', false],
          ['Incorrect heading order', false]],
        'Replace it with focus-visible styling rather than deleting it.'),
      mcq('A placeholder is not a label because:',
        [['It disappears once typing starts', true],
          ['It cannot be styled', false],
          ['It is not supported on all inputs', false],
          ['Screen readers ignore it entirely', false]],
        'It also tends to fail contrast requirements.'),
      mcq('A decorative image should have:',
        [['An empty alt attribute, not a missing one', true],
          ['No alt attribute at all', false],
          ['alt="decorative image"', false],
          ['A description of its appearance', false]],
        'A missing alt makes a screen reader read the filename.'),
      mcq('`<div role="button" tabindex="0">` is worse than `<button>` because:',
        [['Incorrect ARIA lies to assistive technology', true],
          ['It renders differently across browsers', false],
          ['It cannot receive focus', false],
          ['ARIA roles are deprecated', false]],
        'The first rule of ARIA is not to use ARIA where a real element exists.'),
    ],
    checkpoint: [
      mcq('Conveying status with red and green alone fails for:',
        [['About one in twelve men', true],
          ['Users with older displays', false],
          ['Keyboard-only users', false],
          ['Users on mobile devices', false]],
        'Add a label, an icon or a pattern.'),
      mcq('`aria-live="polite"` is used to:',
        [['Announce a change a user cannot see', true],
          ['Make a region keyboard focusable', false],
          ['Label a form control', false],
          ['Describe an image', false]],
        'A result loading or a save succeeding is otherwise silent.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_DEBUGGING',
    notes: `Frontend bugs are visible, which makes them feel easy and often makes them harder: the
symptom is in one place and the cause is in another.

**Nothing happens when I click.** In order: is the handler attached (check the Elements panel or log
in the handler), is the element covered by something invisible, did an error earlier in the script
stop execution, is the button disabled.

**It works once and then stops.** Something re-rendered and the listener was attached to the old
element. Use delegation, or reattach after render.

**The layout jumps.** Content arriving at a different height from the placeholder, an image without
dimensions, or a font swapping. Reserve the space.

**It looks right for me and wrong for them.** Screen width, zoom level, font size preference,
browser, or a cached old stylesheet. Ask for a screenshot and their browser; reproduce at their
width first.

**The data is there but not on screen.** Check in this order: did the request return it (Network
tab), did the state update (log it), did the component re-render (log in the render), is it being
filtered out by something.

**Two of something appear.** A listener attached twice, a render called twice, or a key duplicated.
In development, some frameworks deliberately render twice to expose exactly this.

**The page is slow.** Open the Performance tab and record. Usually one of: work in a scroll handler,
a list rendering thousands of nodes, images far larger than displayed, or a layout thrash from
reading and writing styles in a loop.

**The console is the first stop, not the last.** An error near the top of the page stops everything
after it, and half of "nothing works" is a single typo reported clearly in a panel nobody opened.

**The tools, in order of use:** Console for errors, Elements for what is actually rendered and which
styles won, Network for what was requested and returned, Application for storage and cookies,
Performance for slowness.

**Reproduce before fixing.** A bug you cannot reproduce is a bug you cannot verify as fixed, and
frontend is full of fixes that changed nothing because the real cause was elsewhere.`,
    mcqs: [
      mcq('A handler that works once and then stops usually means:',
        [['The element was replaced by a re-render', true],
          ['The listener threw an exception', false],
          ['The event no longer bubbles', false],
          ['The button became disabled', false]],
        'Use delegation, or reattach after rendering.'),
      mcq('When data is returned but not displayed, check:',
        [['The response, then the state, then the render', true],
          ['The render, then the CSS, then the response', false],
          ['The console, then the network, then the cache', false],
          ['The component tree from the root down', false]],
        'Each step eliminates a layer.'),
      mcq('Half of "nothing works at all" turns out to be:',
        [['An earlier error stopping the rest of the script', true],
          ['A missing stylesheet', false],
          ['A failed network request', false],
          ['An incorrect element selector', false]],
        'Reported clearly in a panel nobody opened.'),
      mcq('A page that is slow should first be examined with:',
        [['A Performance recording', true],
          ['The Network tab', false],
          ['The Elements panel', false],
          ['A profiler in the framework devtools', false]],
        'It shows whether the time is in script, layout or paint.'),
    ],
    checkpoint: [
      mcq('"It looks wrong for them but right for me" should be reproduced by:',
        [['Matching their width and browser', true],
          ['Clearing your own cache', false],
          ['Testing on a mobile device', false],
          ['Checking the deployed build', false]],
        'Ask for a screenshot and their browser.'),
      mcq('Fixing a frontend bug without reproducing it:',
        [['Often changes nothing at all', true],
          ['Is acceptable for visual issues', false],
          ['Is faster when the fix is obvious', false],
          ['Works if the tests pass afterwards', false]],
        'You also cannot verify the fix.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_PRACTICE',
    notes: `No new ideas. Build interfaces until the four states, the keyboard and the awkward
content are automatic.

**Do these:**

1. **A list with all four states.** Fetch, and build loading, error, empty and success properly —
   including a Retry that works.
2. **A form done properly.** Labels, validation with messages beside each field, a disabled submit
   while sending, an error summary, and keyboard submission.
3. **A search box without the race.** Debounced, cancelling in-flight requests, showing results for
   the current query only. Prove it with a throttled network.
4. **Hostile content.** Take a layout you built and feed it a 60-character unbroken word, an empty
   list, 500 rows, a missing image and a very long name. Fix what breaks.
5. **Keyboard only.** Use one of your own projects without a mouse for ten minutes. Fix everything
   you could not reach or activate.
6. **Contrast and colour.** Run a contrast check over a project, and view it as a colourblind user
   with the browser tools. Fix what fails.
7. **A slow list.** Render 5,000 rows naively, measure, then improve it — fewer nodes, virtualisation,
   or pagination — and measure again.
8. **A screen reader, for half an hour.** Navigate one of your pages with NVDA or VoiceOver.

**Record for each:** what you expected, what happened, and what you changed.

**The standard this set aims at:** an interface is not finished when it works for you on your laptop
with good data and a mouse. It is finished when it works for somebody else, on a phone, on a bad
connection, with a keyboard, with data you did not anticipate.`,
    mcqs: [
      mcq('Proving a search box has no race condition requires:',
        [['Testing with a throttled network connection', true],
          ['Typing quickly and checking the results', false],
          ['Counting the requests in the Network tab', false],
          ['Adding a longer debounce interval', false]],
        'Out-of-order responses need slow responses to appear.'),
      mcq('The hostile content exercise includes an unbroken 60-character word because:',
        [['It is the classic overflow case layouts miss', true],
          ['It tests font rendering', false],
          ['Long words are common in real data', false],
          ['It exposes memory limits', false]],
        'Along with empty lists, missing images and very long names.'),
      mcq('Using your own project without a mouse for ten minutes finds:',
        [['Controls you cannot reach or activate', true],
          ['Contrast failures', false],
          ['Missing alt text', false],
          ['Slow rendering', false]],
        'The fastest accessibility check there is.'),
      mcq('Improving a 5,000-row list requires measuring because:',
        [['Otherwise you cannot show the change helped', true],
          ['Browsers vary in rendering speed', false],
          ['Virtualisation is complex to implement', false],
          ['The bottleneck is always the DOM', false]],
        'Measure, change, measure again.'),
      mcq('An interface is finished when it works:',
        [['For somebody else, on a phone, with a keyboard', true],
          ['For you, with realistic data', false],
          ['In every supported browser', false],
          ['Without console errors', false]],
        'And on a bad connection, with data you did not anticipate.'),
    ],
    checkpoint: [
      mcq('The Retry in the error state must:',
        [['Actually work, not just reload the page', true],
          ['Appear only after three failures', false],
          ['Be styled differently from other buttons', false],
          ['Clear the cached data first', false]],
        'An error state with a dead button is not an error state.'),
      mcq('Half an hour with a screen reader is included because:',
        [['No reading substitutes for hearing it', true],
          ['It is required for compliance', false],
          ['It finds bugs other tools cannot', false],
          ['Employers test for the skill', false]],
        'It changes how you build interfaces permanently.'),
    ],
  },

  {
    unitCode: 'T2_TRACK_FRONTEND_MINI_PROJECT',
    notes: `A complete interface over a real API: usable with a keyboard, honest about failure, and
holding up against content you did not choose.

**Why over a real API.** Hardcoded data never returns a 500, never takes four seconds, and is never
empty. Every part of this track that matters only appears when the data comes from somewhere you do
not control.

**What is being assessed:** that every screen handles all four states, that the whole thing works
without a mouse, that the semantics are right, and that it does not fall apart under long names,
empty lists and slow connections.

**Build it in this order:**

1. **Semantic HTML for every screen**, before any styling — and check it reads without CSS.
2. **Layout**, mobile first, tested at 320px.
3. **Fetching, with all four states** on the first screen before building the second.
4. **Interaction**: forms, validation, optimistic or explicit feedback.
5. **Accessibility pass**: keyboard, focus, contrast, announcements.
6. **Hostile content and a throttled network.**

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Project — An Interface That Holds Up',
      description: 'Build a multi-screen frontend over a real API with all four data states, full keyboard support and behaviour that survives hostile content and a bad connection.',
      instructions: `**The brief**

Build a frontend with **at least four screens** over a real API — your own backend, a public API, or
a provided one. It must include a list, a detail view, a form that writes, and one more of your
choosing.

Any framework, or none. If you use one, you must be able to explain what it is doing for you.

**Requirements**

1. **Semantic HTML throughout**: correct elements, heading outline, labelled inputs, readable with
   CSS disabled.
2. **Responsive layout**, mobile first, working at 320px and on a very wide screen.
3. **All four states on every screen that fetches**: loading, error with a working retry, empty, and
   success. The empty state must be distinguishable from the error state.
4. **A form that writes to the server**, with per-field validation messages, a disabled submit while
   sending, server error handling, and keyboard submission.
5. **No race conditions**: a search or filter that cancels or ignores stale responses, demonstrated
   on a throttled connection.
6. **Full keyboard operation**: everything reachable and activatable, visible focus, Escape closing
   any overlay, focus managed when content changes.
7. **Accessibility**: alt text, contrast meeting 4.5:1, no colour-only meaning, live region for
   status changes, reduced-motion respected.
8. **Hostile content handled**: long unbroken strings, very long names, 500+ rows, missing images,
   empty lists.
9. **Errors distinguished**: network failure, 401, 403, 404 and 500 produce different messages.

**What to submit**

1. The code and a running deployment, or a README with exact run instructions.
2. A **states catalogue**: a screenshot of every state of every screen, including the awkward ones.
3. A **keyboard walkthrough**: the complete flow performed without a mouse, recorded or written
   step by step.
4. An **accessibility report**: contrast results, a screen reader note, and what you fixed.
5. A **hostile content report**: each case, what broke, and the fix.
6. A **throttled-network recording** showing the loading, race and error behaviour.
7. A **short write-up** (400–500 words): the state you had not thought to build until testing forced
   it; the accessibility problem you would not have found without trying; what you would change
   about the API you consumed.

**Constraints**

- A real API. No hardcoded data standing in for a fetch.
- No control that works with a mouse and not a keyboard.
- No "Something went wrong" as a user-facing message.

**Where the marks are.** The states catalogue and the keyboard walkthrough. A happy path over fast
data is the easy half; what the interface does on a bad day is the project.`,
      rubric: [
        {
          criterion: 'Structure and semantics',
          description: 'Correct elements and heading outline, labelled inputs, meaning intact without CSS, responsive from 320px upward.',
          maxPoints: 20,
        },
        {
          criterion: 'Data states',
          description: 'Loading, error with working retry, empty and success on every fetching screen; errors distinguished by kind; no stale-response races.',
          maxPoints: 30,
        },
        {
          criterion: 'Accessibility',
          description: 'Complete keyboard operation with visible focus and managed focus changes; contrast, alt text, non-colour meaning, live status.',
          maxPoints: 25,
        },
        {
          criterion: 'Robustness',
          description: 'Long strings, large lists, missing images and empty data all handled; behaviour on a throttled connection demonstrated.',
          maxPoints: 15,
        },
        {
          criterion: 'Evidence and write-up',
          description: 'States catalogue and keyboard walkthrough complete; honest account of what testing revealed that design did not.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
