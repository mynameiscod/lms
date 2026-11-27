import { SeedBook, Y1_Y2 } from '../types';

const book: SeedBook = {
  slug: 'html-css-interview',
  title: 'HTML and CSS Interview Questions',
  kind: 'topic',
  subject: 'HTML and CSS',
  description: 'The HTML and CSS questions freshers face most: semantics, forms, accessibility, specificity, the box model, Flexbox, Grid, positioning and responsive design, with short code examples.',
  color: '#0d9488',
  emblem: '🌐',
  audience: 'all',
  stages: Y1_Y2,
  tracks: [],
  order: 70,
  chapters: [
    {
      title: 'HTML basics and semantics',
      questions: [
        {
          q: `What is HTML?`,
          a: `**HTML (HyperText Markup Language)** is the standard language used to describe the structure of a web page. It is not a programming language: it has no logic or loops. It uses **tags** to mark up content so the browser knows what each piece is: a heading, a paragraph, a link, an image and so on.

An HTML **element** is usually an opening tag, content and a closing tag. Tags can carry **attributes** that add extra information.

\`\`\`html
<h1>Welcome</h1>
<p>Read our <a href="/about">about page</a>.</p>
<img src="logo.png" alt="Company logo">
\`\`\`

The browser reads the HTML, builds the **DOM** (Document Object Model) tree from it, and then CSS styles it and JavaScript makes it interactive. A simple way to remember it: HTML is the structure, CSS is the look, JavaScript is the behaviour.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
          tip: 'Say "markup language, not programming language" early. Interviewers like that distinction.',
        },
        {
          q: `What is the DOCTYPE declaration and why is it needed?`,
          a: `\`<!DOCTYPE html>\` is the very first line of an HTML document. It is not an HTML tag; it is an instruction that tells the browser which version of HTML the page uses, so it renders the page in **standards mode**.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My page</title>
  </head>
  <body>...</body>
</html>
\`\`\`

If the DOCTYPE is missing, browsers switch to **quirks mode**, where they copy the buggy behaviour of very old browsers. In quirks mode the box model, table sizing and some CSS can behave differently, so layouts break in surprising ways.

In HTML5 the declaration is short and simple: \`<!DOCTYPE html>\`. Older versions such as HTML 4.01 needed a long string that pointed to a DTD file. It is also case-insensitive.`,
          d: 'easy',
          at: 'TCS, Cognizant',
        },
        {
          q: `What are semantic HTML tags? Give examples and explain why they matter.`,
          a: `**Semantic tags** describe the *meaning* of the content, not just how it looks. \`<div>\` says nothing about its content, but \`<nav>\` clearly says "this is navigation".

Common semantic tags:
- \`<header>\` and \`<footer>\`: top and bottom of a page or section
- \`<nav>\`: a block of navigation links
- \`<main>\`: the main content (one per page)
- \`<article>\`: a self-contained piece, like a blog post
- \`<section>\`: a themed group of content, usually with a heading
- \`<aside>\`: side content such as a sidebar
- \`<figure>\` and \`<figcaption>\`: an image with its caption

\`\`\`html
<header><nav><a href="/">Home</a></nav></header>
<main>
  <article><h2>Post title</h2><p>...</p></article>
</main>
<footer>&copy; 2026</footer>
\`\`\`

Why they matter: **screen readers** use them to help blind users jump around the page, **search engines** understand the page better (SEO), and the code is easier for other developers to read.`,
          d: 'easy',
          at: 'Accenture, Capgemini, Infosys',
          tip: 'Name three benefits: accessibility, SEO and readable code.',
        },
        {
          q: `What is the difference between div and span?`,
          a: `Both are **generic containers** with no meaning of their own. They are used to group content so you can style it or target it with JavaScript. The difference is how they display by default:

- \`<div>\` is a **block** element. It starts on a new line and takes the full width available. It is used to group larger sections.
- \`<span>\` is an **inline** element. It stays inside the line of text and takes only as much width as its content. It is used to style a small part of text.

\`\`\`html
<div class="card">
  <p>Price: <span class="price">₹499</span> only</p>
</div>
\`\`\`

Here the \`div\` wraps a whole card, while the \`span\` highlights just the price without breaking the sentence.

A good habit: use a semantic tag (\`<section>\`, \`<nav>\`, \`<strong>\`) when one fits, and fall back to \`div\` or \`span\` only when no semantic tag describes the content.`,
          d: 'easy',
          at: 'TCS, Wipro, HCL',
        },
        {
          q: `Explain block, inline and inline-block elements.`,
          a: `These are the three basic \`display\` behaviours:

**Block** (\`div\`, \`p\`, \`h1\`, \`ul\`, \`section\`)
- Starts on a new line and stretches to the full width.
- \`width\`, \`height\`, \`margin\` and \`padding\` all work.

**Inline** (\`span\`, \`a\`, \`strong\`, \`em\`)
- Sits inside a line of text, next to other content.
- \`width\` and \`height\` are **ignored**. Top and bottom margins do not push other lines away.

**Inline-block**
- Sits in the line like inline, **but** respects \`width\`, \`height\` and all margins and padding like block.

\`\`\`css
.tag {
  display: inline-block;
  width: 80px;
  padding: 4px 8px;
  margin: 4px;
}
\`\`\`

Inline-block is useful for buttons, badges or nav items that should sit side by side but still have a fixed size. You can change any element's behaviour with the \`display\` property, for example making an \`<a>\` behave as a block.`,
          d: 'medium',
          at: 'Infosys, Cognizant, Tech Mahindra',
          tip: 'The key point: inline ignores width and height, inline-block does not.',
        },
        {
          q: `What goes inside the head element? Explain common meta tags.`,
          a: `The \`<head>\` holds information **about** the page that is not shown directly in the page body. Typical contents:

- \`<title>\`: the text on the browser tab and in search results
- \`<meta charset="UTF-8">\`: the character encoding, so symbols like ₹ show correctly
- \`<meta name="viewport" ...>\`: controls scaling on mobile screens
- \`<meta name="description" ...>\`: a short summary used by search engines
- \`<link rel="stylesheet">\`: connects a CSS file
- \`<script>\`: loads JavaScript (often placed with \`defer\`)
- \`<link rel="icon">\`: the favicon

\`\`\`html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Online Python course for beginners">
  <title>Learn Python</title>
  <link rel="stylesheet" href="styles.css">
</head>
\`\`\`

Meta tags are self-closing (void) elements. They help with correct rendering, mobile support and SEO.`,
          d: 'easy',
          at: 'TCS, Capgemini',
        },
        {
          q: `What is the difference between id and class in HTML?`,
          a: `Both are attributes used to identify elements for CSS and JavaScript.

**id**
- Must be **unique** in the page: only one element can have a given id.
- Selected in CSS with \`#\`.
- Used for a single special element, page anchors (\`href="#contact"\`) and \`label for\`.

**class**
- Can be **reused** on many elements, and one element can have many classes.
- Selected in CSS with \`.\`.
- Used for shared styles.

\`\`\`html
<section id="contact" class="card highlighted">...</section>
\`\`\`

\`\`\`css
#contact { scroll-margin-top: 60px; }
.card { border: 1px solid #ddd; }
.highlighted { background: #fff7d6; }
\`\`\`

Another difference is **specificity**: an id selector is much stronger than a class selector, so id-based styles are hard to override. That is why most teams style with classes and keep ids for JavaScript hooks and anchors.`,
          d: 'easy',
          at: 'Wipro, Infosys',
        },
        {
          q: `What is the difference between script, script async and script defer?`,
          a: `By default, when the browser meets a \`<script>\` tag, it **stops parsing the HTML**, downloads the script, runs it and only then continues. A big script in the head can make the page look blank for a while.

- **Normal \`<script>\`**: blocks parsing while downloading and running.
- **\`async\`**: downloads in parallel with parsing and **runs as soon as it is ready**, pausing parsing at that moment. Order between async scripts is **not guaranteed**.
- **\`defer\`**: downloads in parallel and runs **after the HTML is fully parsed**, just before \`DOMContentLoaded\`. Deferred scripts run **in the order** they appear.

\`\`\`html
<script src="analytics.js" async></script>
<script src="vendor.js" defer></script>
<script src="app.js" defer></script>
\`\`\`

Rule of thumb: use \`defer\` for your own scripts that need the DOM or depend on each other. Use \`async\` for independent scripts such as analytics or ads. Both attributes work only for external scripts with a \`src\`.`,
          d: 'hard',
          at: 'Zoho, Freshworks, product startups',
          tip: 'Remember: defer keeps order and waits for parsing; async runs whenever it arrives.',
        },
      ],
    },
    {
      title: 'Forms, media and accessibility',
      questions: [
        {
          q: `What are the common HTML5 input types?`,
          a: `HTML5 added many input types so the browser can show the right keyboard on mobile, give built-in pickers and do basic validation.

- \`text\`, \`password\`: plain and hidden text
- \`email\`: checks for a valid email format
- \`number\`: numbers only, with \`min\`, \`max\` and \`step\`
- \`tel\`: shows a phone keypad on mobile
- \`url\`: checks for a valid URL
- \`date\`, \`time\`, \`datetime-local\`: date and time pickers
- \`checkbox\`, \`radio\`: multiple choice and single choice
- \`range\`: a slider
- \`color\`: a colour picker
- \`file\`: file upload
- \`search\`, \`hidden\`, \`submit\`

\`\`\`html
<input type="email" name="email" placeholder="you@example.com">
<input type="number" name="age" min="18" max="60">
<input type="date" name="dob">
\`\`\`

If a browser does not support a type, it falls back to \`text\`, so the form still works.`,
          d: 'easy',
          at: 'TCS, Cognizant',
        },
        {
          q: `How does HTML5 form validation work?`,
          a: `HTML5 can validate forms in the browser without any JavaScript, using attributes:

- \`required\`: the field cannot be empty
- \`type="email"\`, \`type="url"\`: format checks
- \`min\`, \`max\`, \`step\`: number and date limits
- \`minlength\`, \`maxlength\`: text length
- \`pattern\`: a regular expression the value must match

\`\`\`html
<form>
  <input type="text" name="pincode" required
         pattern="[0-9]{6}" title="Enter a 6-digit PIN code">
  <input type="password" name="pwd" required minlength="8">
  <button type="submit">Save</button>
</form>
\`\`\`

If a field is invalid, the browser blocks submission and shows a message. CSS can style the state with \`:valid\` and \`:invalid\`, and \`novalidate\` on the form turns the checks off.

Important: client-side validation is only for **user experience**. Anyone can bypass it with dev tools or by calling the API directly, so the **server must always validate again**.`,
          d: 'medium',
          at: 'Infosys, Accenture',
          tip: 'Always end with "the server must validate too". It shows security awareness.',
        },
        {
          q: `What is the purpose of the label tag and its for attribute?`,
          a: `A \`<label>\` gives a visible, readable name to a form control. Its \`for\` attribute must match the \`id\` of the input it describes.

\`\`\`html
<label for="email">Email address</label>
<input type="email" id="email" name="email">
\`\`\`

You can also wrap the input inside the label, which links them without \`for\`:

\`\`\`html
<label><input type="checkbox" name="terms"> I agree to the terms</label>
\`\`\`

Why it matters:
1. **Accessibility**: screen readers read the label aloud when the input gets focus, so blind users know what to type.
2. **Bigger click area**: clicking the label focuses the input or toggles the checkbox, which helps on mobile.
3. **Clarity**: a placeholder disappears when typing starts, so it is not a replacement for a label.

A common mistake is using a \`for\` value that does not match any \`id\`, which breaks the link silently.`,
          d: 'easy',
          at: 'Wipro, Capgemini',
        },
        {
          q: `How do you add audio and video to a web page in HTML5?`,
          a: `HTML5 has native \`<video>\` and \`<audio>\` elements, so no plugin such as Flash is needed.

\`\`\`html
<video controls width="640" poster="thumb.jpg">
  <source src="intro.webm" type="video/webm">
  <source src="intro.mp4" type="video/mp4">
  <track src="intro-en.vtt" kind="captions" srclang="en" label="English">
  Your browser does not support video.
</video>

<audio controls>
  <source src="song.mp3" type="audio/mpeg">
</audio>
\`\`\`

Useful attributes:
- \`controls\`: shows play, pause and volume buttons
- \`autoplay\`: starts automatically (most browsers allow this only with \`muted\`)
- \`muted\`, \`loop\`, \`poster\` (a preview image for video)
- \`preload\`: \`none\`, \`metadata\` or \`auto\`

Multiple \`<source>\` tags let the browser pick the first format it supports. The \`<track>\` element adds captions, which help deaf users and anyone watching without sound. The text inside is a fallback for very old browsers.`,
          d: 'medium',
          at: 'Cognizant, HCL',
        },
        {
          q: `Why is the alt attribute important on images?`,
          a: `The \`alt\` attribute gives a **text alternative** for an image.

1. **Accessibility**: screen readers read the alt text aloud, so blind users understand the image.
2. **Fallback**: if the image fails to load, the alt text is shown instead.
3. **SEO**: search engines use it to understand what the image shows.

\`\`\`html
<img src="chart.png" alt="Sales grew from 2 lakh to 5 lakh between January and June">
<img src="divider.png" alt="">
\`\`\`

Writing good alt text:
- Describe the **purpose or content**, not "image of".
- Keep it short and useful in context.
- For a purely **decorative** image, use an empty \`alt=""\`. The screen reader then skips it. Do not leave the attribute out completely, or some screen readers read the file name instead.
- For an image inside a link, describe where the link goes.`,
          d: 'easy',
          at: 'TCS, Accenture',
          tip: 'Mention empty alt for decorative images. Many candidates miss it.',
        },
        {
          q: `What is ARIA? When should you use it?`,
          a: `**ARIA (Accessible Rich Internet Applications)** is a set of HTML attributes that give extra information to assistive technology such as screen readers. It does not change how the page looks or behaves; it only changes what is announced.

Common attributes:
- \`role\`: what the element is, e.g. \`role="dialog"\`, \`role="alert"\`
- \`aria-label\`: a name when there is no visible text
- \`aria-expanded\`: whether a menu or accordion is open
- \`aria-hidden="true"\`: hide decorative content from screen readers
- \`aria-live\`: announce content that updates, like a toast message

\`\`\`html
<button aria-label="Close dialog">✕</button>
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" hidden>...</ul>
\`\`\`

The **first rule of ARIA**: if a native HTML element does the job, use it instead. A real \`<button>\` is focusable and works with the keyboard for free, while \`<div role="button">\` needs extra code for all of that. Wrong ARIA is worse than no ARIA.`,
          d: 'medium',
          at: 'Freshworks, Zoho, MNC accessibility teams',
        },
        {
          q: `What is an iframe? What are its uses and risks?`,
          a: `An \`<iframe>\` (inline frame) embeds **another web page inside the current page**. Each iframe has its own document, its own CSS and its own JavaScript.

\`\`\`html
<iframe src="https://www.youtube.com/embed/VIDEO_ID"
        title="Course intro video"
        width="560" height="315"
        loading="lazy"
        allowfullscreen></iframe>
\`\`\`

Common uses: YouTube videos, Google Maps, payment widgets and third-party forms.

Risks and good practice:
- **Security**: content from another site can be harmful. The \`sandbox\` attribute limits what the iframe can do (scripts, forms, pop-ups).
- **Clickjacking**: attackers can load your site invisibly inside their page. Sites protect themselves with the \`X-Frame-Options\` or \`Content-Security-Policy: frame-ancestors\` header.
- **Performance**: each iframe loads a full page, so use \`loading="lazy"\`.
- **Accessibility**: always give a \`title\` so screen readers can describe it.

Because of the same-origin policy, the parent page cannot read the content of an iframe from a different domain.`,
          d: 'medium',
          at: 'Cognizant, Deloitte',
        },
        {
          q: `What is the difference between localStorage, sessionStorage and cookies?`,
          a: `All three store data in the browser, but they differ in lifetime, size and whether the server sees them.

| | localStorage | sessionStorage | Cookies |
|---|---|---|---|
| Lifetime | Until deleted | Until the tab closes | Until the expiry date set |
| Size | About 5–10 MB | About 5 MB | About 4 KB each |
| Sent to server | No | No | **Yes, with every request** |
| Scope | All tabs of the same origin | One tab only | Domain and path rules |

\`\`\`js
localStorage.setItem('theme', 'dark');
sessionStorage.setItem('step', '2');
document.cookie = 'lang=en; max-age=86400; path=/';
\`\`\`

Storage values are always **strings**, so objects need \`JSON.stringify\` and \`JSON.parse\`.

When to use which: localStorage for preferences like theme, sessionStorage for temporary data like a multi-step form, cookies when the **server** needs the value, such as a session id. Sensitive tokens are safer in a cookie marked \`HttpOnly\` and \`Secure\`, because any script on the page (including an XSS attack) can read localStorage.`,
          d: 'hard',
          at: 'Zoho, Infosys, product companies',
          tip: 'The deciding point is often "cookies travel to the server with every request".',
        },
      ],
    },
    {
      title: 'CSS selectors, specificity and the box model',
      questions: [
        {
          q: `What are the different types of CSS selectors?`,
          a: `Selectors choose which elements a rule applies to. The main types:

- **Universal**: \`*\` selects everything
- **Type (element)**: \`p\`, \`h1\`
- **Class**: \`.card\`
- **ID**: \`#header\`
- **Attribute**: \`input[type="email"]\`, \`a[href^="https"]\`
- **Grouping**: \`h1, h2, h3\` applies one rule to several selectors
- **Descendant**: \`nav a\` (any \`a\` inside \`nav\`)
- **Child**: \`ul > li\` (direct children only)
- **Adjacent sibling**: \`h2 + p\` (the first \`p\` right after an \`h2\`)
- **General sibling**: \`h2 ~ p\` (all following \`p\` siblings)
- **Pseudo-class**: \`a:hover\`, \`li:nth-child(2)\`
- **Pseudo-element**: \`p::first-line\`, \`.btn::before\`

\`\`\`css
nav > ul li a:hover { color: #0d9488; }
input[type="checkbox"] + label { cursor: pointer; }
\`\`\`

Combining selectors lets you target elements precisely without adding extra classes everywhere.`,
          d: 'easy',
          at: 'TCS, Wipro, Infosys',
        },
        {
          q: `What is CSS specificity and how is it calculated?`,
          a: `When two rules set the same property on the same element, **specificity** decides which one wins. It is calculated as a score with three parts **(IDs, classes, elements)**:

- **IDs**: \`#nav\` gives (1, 0, 0)
- **Classes, attributes, pseudo-classes**: \`.btn\`, \`[type]\`, \`:hover\` give (0, 1, 0)
- **Elements and pseudo-elements**: \`p\`, \`::before\` give (0, 0, 1)
- \`*\` and combinators add nothing.

Compare from left to right: one ID beats any number of classes.

\`\`\`css
p { color: black; }                 /* (0,0,1) */
.intro { color: blue; }             /* (0,1,0) */
#main p.intro { color: green; }     /* (1,1,1) wins */
\`\`\`

Other rules:
- **Inline styles** (\`style="..."\`) beat all selectors.
- \`!important\` beats everything else; avoid it except as a last resort.
- If specificity is equal, the rule that comes **later** in the CSS wins.

Keeping selectors short and class-based keeps specificity low and styles easy to override.`,
          d: 'medium',
          at: 'Accenture, Capgemini, Zoho',
          tip: 'Work out a live example like (1,1,1) vs (0,3,0). Interviewers love it.',
        },
        {
          q: `Explain the CSS box model.`,
          a: `Every element on a page is drawn as a rectangular **box** made of four layers, from inside to outside:

1. **Content**: the text or image itself, sized by \`width\` and \`height\`.
2. **Padding**: space between the content and the border. It takes the element's background colour.
3. **Border**: the line around the padding.
4. **Margin**: transparent space outside the border that separates the element from its neighbours.

\`\`\`css
.box {
  width: 200px;
  padding: 20px;
  border: 5px solid #333;
  margin: 10px;
}
\`\`\`

With the default \`box-sizing: content-box\`, the visible width is:
200 + 20 + 20 + 5 + 5 = **250px**. The margin adds another 10px of space on each side but is not part of the box's own width.

You can inspect the box model of any element in browser DevTools, which shows the four layers as coloured rings.`,
          d: 'easy',
          at: 'TCS, Infosys, Cognizant',
        },
        {
          q: `What does box-sizing: border-box do?`,
          a: `\`box-sizing\` decides what \`width\` and \`height\` measure.

- **\`content-box\`** (the default): \`width\` is only the content. Padding and border are **added on top**, so the final box is bigger than the width you set.
- **\`border-box\`**: \`width\` includes content **plus padding plus border**. The browser shrinks the content area to fit.

\`\`\`css
.a { box-sizing: content-box; width: 300px; padding: 20px; border: 2px solid; }
/* total width = 344px */

.b { box-sizing: border-box; width: 300px; padding: 20px; border: 2px solid; }
/* total width = 300px */
\`\`\`

\`border-box\` makes layouts much easier. Two columns of \`width: 50%\` with padding will fit side by side instead of wrapping. That is why most projects add this reset at the top of their CSS:

\`\`\`css
*, *::before, *::after { box-sizing: border-box; }
\`\`\`

Margin is never included in either mode.`,
          d: 'medium',
          at: 'Infosys, Accenture',
          tip: 'Quote the universal border-box reset. It shows real project experience.',
        },
        {
          q: `What is margin collapsing in CSS?`,
          a: `**Margin collapsing** happens when the **vertical** margins of block elements touch. Instead of adding up, they merge into a single margin equal to the **larger** one.

\`\`\`css
h2 { margin-bottom: 30px; }
p  { margin-top: 20px; }
/* gap between them is 30px, not 50px */
\`\`\`

It happens in three situations:
1. **Adjacent siblings**: the bottom margin of one and the top margin of the next.
2. **Parent and first or last child**: if the parent has no border, padding or inline content in between, the child's top margin "leaks" out and becomes the parent's margin.
3. **Empty blocks**: an empty element's own top and bottom margins merge.

It does **not** happen with horizontal margins, or inside **flex** and **grid** containers, or with floated and absolutely positioned elements.

To stop parent-child collapsing, give the parent a little \`padding\` or a \`border\`, use \`display: flow-root\`, or make it a flex container. Many developers avoid surprises by using margin in one direction only, such as only \`margin-bottom\`.`,
          d: 'hard',
          at: 'Zoho, Freshworks',
        },
        {
          q: `What is the difference between pseudo-classes and pseudo-elements?`,
          a: `**Pseudo-classes** (one colon \`:\`) select an element when it is in a certain **state** or **position**.
- \`:hover\`, \`:focus\`, \`:active\`, \`:visited\`
- \`:first-child\`, \`:last-child\`, \`:nth-child(odd)\`
- \`:checked\`, \`:disabled\`, \`:invalid\`, \`:not(.active)\`

**Pseudo-elements** (two colons \`::\`) style a **part** of an element, or add content that is not in the HTML.
- \`::before\` and \`::after\`: insert content (need the \`content\` property)
- \`::first-letter\`, \`::first-line\`
- \`::placeholder\`, \`::selection\`

\`\`\`css
button:hover { background: #0f766e; }
li:nth-child(even) { background: #f5f5f5; }

.required::after {
  content: " *";
  color: red;
}
p::first-letter { font-size: 2em; }
\`\`\`

Easy way to remember: a pseudo-class is like adding a class to the element when a condition is true; a pseudo-element is like adding a new, invisible element inside it. Old single-colon forms like \`:before\` still work for backward compatibility.`,
          d: 'medium',
          at: 'Capgemini, Cognizant',
        },
        {
          q: `What is the difference between display: none and visibility: hidden?`,
          a: `Both hide an element, but they treat the **space** differently.

**\`display: none\`**
- The element is removed from the layout completely.
- It takes **no space**; other elements move up to fill the gap.
- Its children are hidden too and cannot be shown.

**\`visibility: hidden\`**
- The element becomes invisible but **still takes up its space**, leaving an empty gap.
- A child can be shown again with \`visibility: visible\`.

Both are hidden from screen readers and cannot be clicked.

\`\`\`css
.removed   { display: none; }
.invisible { visibility: hidden; }
.faded     { opacity: 0; }
\`\`\`

A third option is \`opacity: 0\`: the element is invisible, keeps its space **and can still be clicked and focused**. Opacity and visibility can be animated with transitions, but \`display\` cannot be smoothly transitioned in most cases.`,
          d: 'easy',
          at: 'TCS, Wipro, Infosys',
          tip: 'Mention opacity: 0 as a bonus third option. It stands out.',
        },
        {
          q: `What are the ways to add CSS to a page, and what is the cascade?`,
          a: `There are three ways to add CSS:

1. **Inline**: in a \`style\` attribute on the element.
2. **Internal**: inside a \`<style>\` tag in the \`<head>\`.
3. **External**: in a separate \`.css\` file linked with \`<link>\`.

\`\`\`html
<link rel="stylesheet" href="styles.css">
<style> h1 { color: navy; } </style>
<h1 style="color: teal;">Hello</h1>
\`\`\`

External files are best for real projects: one file styles every page, it is cached by the browser, and HTML stays clean.

The **cascade** is the set of rules the browser uses when several declarations target the same property. It checks, in order:
1. **Importance**: \`!important\` declarations win.
2. **Specificity**: inline styles beat IDs, IDs beat classes, classes beat elements.
3. **Source order**: if everything else is equal, the later rule wins.

Some properties, like \`color\` and \`font-family\`, are also **inherited** by child elements, while others like \`border\` and \`margin\` are not.`,
          d: 'easy',
          at: 'Cognizant, HCL',
        },
      ],
    },
    {
      title: 'Layout: Flexbox, Grid and positioning',
      questions: [
        {
          q: `Explain the CSS position values: static, relative, absolute, fixed and sticky.`,
          a: `- **static** (default): normal document flow. \`top\`, \`left\` and \`z-index\` have no effect.
- **relative**: stays in normal flow, but can be **nudged** with \`top\`/\`left\`. Its original space is kept. It also becomes the reference point for absolute children.
- **absolute**: removed from the flow (takes no space). Positioned relative to the **nearest positioned ancestor** (any position other than static), or the page if there is none.
- **fixed**: removed from the flow and positioned relative to the **viewport**. It stays in place while scrolling, like a sticky header or chat button.
- **sticky**: behaves like relative until you scroll past a threshold, then sticks like fixed within its parent.

\`\`\`css
.card { position: relative; }
.badge { position: absolute; top: 8px; right: 8px; }

.navbar { position: sticky; top: 0; }
.chat-btn { position: fixed; bottom: 20px; right: 20px; }
\`\`\`

The classic pattern is a \`relative\` parent with an \`absolute\` child, so the child is placed inside the parent's corner. Sticky needs a \`top\` value and fails if a parent has \`overflow: hidden\`.`,
          d: 'medium',
          at: 'TCS, Infosys, Accenture',
          tip: 'Explain "nearest positioned ancestor". It is the core of absolute positioning.',
        },
        {
          q: `How does z-index work, and what is a stacking context?`,
          a: `\`z-index\` controls which overlapping element appears **on top**. A higher value comes forward. It works only on **positioned** elements (relative, absolute, fixed, sticky) and on flex or grid items.

\`\`\`css
.modal   { position: fixed; z-index: 1000; }
.overlay { position: fixed; z-index: 999; }
\`\`\`

A **stacking context** is a group of elements that are layered together as one unit. A new one is created by, for example:
- a positioned element with a \`z-index\` other than \`auto\`
- \`opacity\` less than 1
- \`transform\`, \`filter\` or \`will-change\`
- \`position: fixed\` or \`sticky\`

z-index values are only compared **inside the same stacking context**. A child can never rise above something outside its parent's context, even with \`z-index: 9999\`.

\`\`\`css
.parent { position: relative; z-index: 1; }
.child  { position: absolute; z-index: 9999; } /* still under a sibling with z-index: 2 */
\`\`\`

This explains the common bug "my z-index is not working": usually the element is not positioned, or it is trapped in a parent's stacking context.`,
          d: 'hard',
          at: 'Zoho, Freshworks, product companies',
        },
        {
          q: `How do you centre an element horizontally and vertically using Flexbox?`,
          a: `Make the **parent** a flex container and use two properties:

\`\`\`css
.parent {
  display: flex;
  justify-content: center; /* horizontal (main axis) */
  align-items: center;     /* vertical (cross axis) */
  height: 100vh;
}
\`\`\`

\`\`\`html
<div class="parent">
  <div class="box">I am centred</div>
</div>
\`\`\`

- \`justify-content: center\` centres along the **main axis**, which is horizontal by default (\`flex-direction: row\`).
- \`align-items: center\` centres along the **cross axis**, vertical by default.
- The parent needs a **height**, otherwise it is only as tall as its content and vertical centring shows no effect.

If you change to \`flex-direction: column\`, the axes swap, but using both properties set to \`center\` still centres the child in both directions.

A shorter alternative is a flex parent with \`margin: auto\` on the child, which pushes equal space to all sides.`,
          d: 'easy',
          at: 'TCS, Wipro, Cognizant',
        },
        {
          q: `What is the difference between justify-content and align-items in Flexbox?`,
          a: `Flexbox has two axes:
- **Main axis**: set by \`flex-direction\` (horizontal for \`row\`, vertical for \`column\`).
- **Cross axis**: perpendicular to the main axis.

**\`justify-content\`** arranges items along the **main axis**:
\`flex-start\`, \`flex-end\`, \`center\`, \`space-between\`, \`space-around\`, \`space-evenly\`.

**\`align-items\`** aligns items along the **cross axis**:
\`stretch\` (default), \`flex-start\`, \`flex-end\`, \`center\`, \`baseline\`.

\`\`\`css
.navbar {
  display: flex;
  justify-content: space-between; /* logo left, menu right */
  align-items: center;            /* vertically aligned */
}
\`\`\`

Related properties:
- \`align-self\` overrides \`align-items\` for one item.
- \`align-content\` spaces out **rows** when items wrap onto multiple lines.
- \`gap\` adds space between items.

Common trap: with \`flex-direction: column\`, \`justify-content\` now works **vertically** and \`align-items\` **horizontally**.`,
          d: 'medium',
          at: 'Infosys, Accenture, Capgemini',
          tip: 'Say "main axis vs cross axis", then mention that column swaps them.',
        },
        {
          q: `Explain the basics of CSS Grid.`,
          a: `**CSS Grid** is a two-dimensional layout system: it controls **rows and columns at the same time**. You define the grid on the parent, and children are placed into its cells.

\`\`\`css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 equal columns */
  grid-auto-rows: 200px;
  gap: 16px;
}
.featured {
  grid-column: span 2;  /* takes two columns */
}
\`\`\`

Key ideas:
- \`grid-template-columns\` and \`grid-template-rows\` define the tracks.
- The \`fr\` unit means "a fraction of the free space".
- \`repeat()\` avoids writing the same size again and again.
- \`gap\` sets the space between rows and columns.
- \`grid-column\` and \`grid-row\` place or span an item, e.g. \`grid-column: 1 / 3\`.
- \`grid-template-areas\` lets you name regions like \`"header header" "sidebar main"\`.

A popular responsive pattern needs no media query:

\`\`\`css
grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
\`\`\``,
          d: 'medium',
          at: 'Accenture, Zoho',
        },
        {
          q: `When would you use Flexbox and when would you use Grid?`,
          a: `**Flexbox** is **one-dimensional**: it lays items out in a single row *or* a single column. It works from the **content outwards**: items size themselves, and flex distributes the leftover space.

Good for:
- Navigation bars, toolbars, button groups
- Centring one item
- A row of cards whose number changes

**Grid** is **two-dimensional**: rows *and* columns together. It works from the **layout inwards**: you define the structure first and place items into it.

Good for:
- Full page layouts (header, sidebar, main, footer)
- Image galleries and dashboards where items must line up in both directions

\`\`\`css
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-areas: "side main";
}
.header-links { display: flex; gap: 12px; align-items: center; }
\`\`\`

They are not rivals. A common approach is **Grid for the overall page structure** and **Flexbox for the components inside** each area.`,
          d: 'medium',
          at: 'Freshworks, Infosys',
        },
        {
          q: `How do you centre a div? Give multiple ways.`,
          a: `**1. Flexbox** (most common):
\`\`\`css
.parent { display: flex; justify-content: center; align-items: center; height: 300px; }
\`\`\`

**2. Grid** (shortest):
\`\`\`css
.parent { display: grid; place-items: center; height: 300px; }
\`\`\`

**3. Absolute position + transform** (works without knowing the child's size):
\`\`\`css
.parent { position: relative; }
.child {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
\`\`\`

**4. Horizontal only with margin auto** (block element with a width):
\`\`\`css
.child { width: 400px; margin: 0 auto; }
\`\`\`

**5. Text and inline content**: \`text-align: center\` on the parent.

In the absolute method, \`top: 50%\` moves the child's top-left corner to the centre, and \`translate(-50%, -50%)\` pulls it back by half its own size. Today Flexbox or Grid is the preferred answer for most cases.`,
          d: 'easy',
          at: 'TCS, Wipro, Infosys, almost every fresher interview',
          tip: 'Give at least three methods. Mentioning place-items: center is a nice touch.',
        },
        {
          q: `What are floats in CSS, and what is a clearfix?`,
          a: `\`float\` moves an element to the **left or right** of its container and lets text and inline content **wrap around it**. It was made for wrapping text around images, but before Flexbox it was also used to build whole layouts.

\`\`\`css
img.left { float: left; margin-right: 16px; }
\`\`\`

The problem: floated elements are taken out of the normal flow, so a parent that contains only floats **collapses to zero height**. Backgrounds and borders on the parent disappear.

A **clearfix** forces the parent to wrap its floated children:

\`\`\`css
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
\`\`\`

The modern, simpler fix is \`display: flow-root\` on the parent, which creates a new block formatting context.

\`clear: left | right | both\` makes an element move below earlier floats instead of sitting next to them.

Today, use **Flexbox or Grid for layout** and keep floats only for wrapping text around an image.`,
          d: 'medium',
          at: 'Cognizant, HCL, Tech Mahindra',
        },
      ],
    },
    {
      title: 'Responsive design and modern CSS',
      questions: [
        {
          q: `What are media queries and how do you use them?`,
          a: `**Media queries** apply CSS only when certain conditions are true, most often the **screen width**. They are the main tool for responsive design.

\`\`\`css
.cards { display: grid; grid-template-columns: 1fr; gap: 16px; }

@media (min-width: 768px) {
  .cards { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .cards { grid-template-columns: repeat(3, 1fr); }
}
\`\`\`

Here phones get one column, tablets two and laptops three.

Common features you can test:
- \`min-width\`, \`max-width\`: viewport width
- \`orientation: portrait | landscape\`
- \`prefers-color-scheme: dark\`: the user's dark mode setting
- \`prefers-reduced-motion\`: the user wants fewer animations
- \`print\`: styles for printing

Conditions can be combined with \`and\`, e.g. \`@media (min-width: 600px) and (max-width: 900px)\`. Media queries need the **viewport meta tag** in the HTML to work correctly on phones.`,
          d: 'easy',
          at: 'TCS, Infosys, Capgemini',
        },
        {
          q: `What is the viewport meta tag and why is it required?`,
          a: `\`\`\`html
<meta name="viewport" content="width=device-width, initial-scale=1">
\`\`\`

Without this tag, mobile browsers assume the page was built for desktop. They draw it on a **virtual screen about 980px wide** and then shrink it to fit the phone. The text becomes tiny and the user must pinch to zoom. Your media queries also fail, because the browser reports 980px instead of the real width.

What the values mean:
- \`width=device-width\`: make the layout width equal to the device's real screen width in CSS pixels.
- \`initial-scale=1\`: start at 100% zoom, no shrinking.

Avoid \`user-scalable=no\` or \`maximum-scale=1\`. They stop users with poor eyesight from zooming in, which is an accessibility problem.

This one line is the **first step of every responsive website**. It goes inside the \`<head>\`.`,
          d: 'easy',
          at: 'Wipro, Cognizant',
          tip: 'Explain the 980px virtual viewport. It shows you know why, not just what.',
        },
        {
          q: `What is the difference between px, em, rem and % in CSS?`,
          a: `- **px**: an absolute unit. \`16px\` is always 16px, no matter the parent or user settings.
- **em**: relative to the **font size of the element itself** (or the parent, when used for \`font-size\`). It **compounds** in nested elements.
- **rem**: relative to the **root (\`html\`) font size**, which is 16px by default. It does not compound.
- **%**: relative to the **parent**: for \`width\` it is the parent's width, for \`font-size\` the parent's font size.

\`\`\`css
html { font-size: 16px; }
.parent { font-size: 1.25em; }     /* 20px */
.parent .child { font-size: 1.25em; } /* 25px: em compounds */
.title { font-size: 2rem; }        /* always 32px */
.sidebar { width: 25%; }           /* quarter of the parent */
\`\`\`

When to use which:
- **rem** for font sizes and spacing, so the whole site scales if a user increases the browser font size.
- **em** for padding that should grow with a component's own text, like buttons.
- **%** for fluid widths.
- **px** for thin borders and fine details.`,
          d: 'medium',
          at: 'Infosys, Accenture, Zoho',
          tip: 'The key line: em compounds, rem does not.',
        },
        {
          q: `What is mobile-first design?`,
          a: `**Mobile-first** means you write the base CSS for **small screens first**, then add styles for larger screens using \`min-width\` media queries.

\`\`\`css
/* base: phones */
.nav { display: flex; flex-direction: column; }

/* tablets and up */
@media (min-width: 768px) {
  .nav { flex-direction: row; justify-content: space-between; }
}
\`\`\`

The opposite, **desktop-first**, writes desktop styles first and then overrides them with \`max-width\` queries.

Why mobile-first is preferred:
1. **Most Indian users browse on phones**, so the main experience gets the most attention.
2. **Performance**: phones load only the simple base styles; heavier layout rules apply only on bigger screens.
3. **Simpler code**: it is easier to add columns as space grows than to undo a complex desktop layout.
4. **Focus**: a small screen forces you to decide what content really matters.

Frameworks like Bootstrap and Tailwind are mobile-first: an unprefixed class applies to all sizes, and prefixes like \`md:\` add larger-screen rules.`,
          d: 'medium',
          at: 'Capgemini, Freshworks',
        },
        {
          q: `What are CSS variables (custom properties)?`,
          a: `**CSS custom properties** let you store a value once and reuse it. They start with two dashes and are read with \`var()\`.

\`\`\`css
:root {
  --brand: #0d9488;
  --radius: 8px;
  --space: 16px;
}
.button {
  background: var(--brand);
  border-radius: var(--radius);
  padding: var(--space);
}
.card { margin: var(--gap, 12px); } /* 12px is a fallback */
\`\`\`

Key features:
- Declared on \`:root\` they are **global**; declared on an element they apply only inside it.
- They follow the **cascade and inheritance**, so a section can override a value for everything inside it.
- They can be **changed at runtime** with JavaScript, which preprocessor variables (like Sass) cannot do.

\`\`\`css
@media (prefers-color-scheme: dark) {
  :root { --bg: #111; --text: #eee; }
}
\`\`\`

This makes **themes and dark mode** easy: change a few variables and the whole site updates. Names are case-sensitive.`,
          d: 'medium',
          at: 'Zoho, Freshworks, product startups',
          tip: 'Contrast with Sass variables: CSS variables live in the browser and can change at runtime.',
        },
        {
          q: `What is the difference between CSS transitions and animations?`,
          a: `**Transitions** animate a property **from one state to another** when something changes it, such as a hover or a class being added. They need a trigger and have only a start and an end.

\`\`\`css
.btn {
  background: #0d9488;
  transition: background 0.3s ease, transform 0.2s;
}
.btn:hover {
  background: #0f766e;
  transform: scale(1.05);
}
\`\`\`

**Animations** use \`@keyframes\` to define **many steps**. They can start on their own, loop, reverse and pause.

\`\`\`css
@keyframes pulse {
  0%   { opacity: 1; }
  50%  { opacity: 0.4; }
  100% { opacity: 1; }
}
.loader { animation: pulse 1.5s ease-in-out infinite; }
\`\`\`

| | Transition | Animation |
|---|---|---|
| Trigger | Needs a state change | Can run on page load |
| Steps | Start and end only | Any number of keyframes |
| Looping | No | Yes (\`infinite\`) |

For smooth performance, animate \`transform\` and \`opacity\`; changing \`width\` or \`top\` forces the browser to recalculate layout.`,
          d: 'medium',
          at: 'Accenture, Infosys',
        },
        {
          q: `How do you make images responsive?`,
          a: `**1. Basic fluid image**: never wider than its container.
\`\`\`css
img { max-width: 100%; height: auto; }
\`\`\`

**2. \`srcset\` and \`sizes\`**: let the browser download the **right file size** for the screen, saving data on phones.
\`\`\`html
<img src="hero-800.jpg"
     srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1600.jpg 1600w"
     sizes="(max-width: 600px) 100vw, 50vw"
     alt="Students in a classroom"
     width="800" height="450" loading="lazy">
\`\`\`
\`w\` tells the browser each file's real width; \`sizes\` tells it how wide the image will display. The browser picks the best file, considering screen density too.

**3. \`<picture>\`**: for **art direction** (a different crop on mobile) or modern formats.
\`\`\`html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source media="(max-width: 600px)" srcset="hero-square.jpg">
  <img src="hero.jpg" alt="Students in a classroom">
</picture>
\`\`\`

Also set \`width\` and \`height\` so the page does not jump while images load, and use \`object-fit: cover\` to fill a box without stretching.`,
          d: 'hard',
          at: 'Freshworks, product companies',
        },
        {
          q: `What are vw and vh units, and what does the clamp() function do?`,
          a: `**Viewport units** are relative to the browser window:
- \`1vw\` = 1% of the viewport **width**
- \`1vh\` = 1% of the viewport **height**
- \`vmin\` and \`vmax\` use the smaller or larger of the two

\`\`\`css
.hero { height: 100vh; }
\`\`\`

A known issue: on mobile, \`100vh\` can be taller than the visible area because the address bar hides and shows. Newer units fix this: \`dvh\` (dynamic), \`svh\` (small) and \`lvh\` (large).

**\`clamp(min, preferred, max)\`** picks the preferred value but keeps it **between a minimum and a maximum**.

\`\`\`css
h1 {
  font-size: clamp(1.5rem, 4vw + 0.5rem, 3rem);
}
.container {
  width: clamp(320px, 90%, 1200px);
}
\`\`\`

Here the heading grows smoothly with the screen width, but never goes below 1.5rem or above 3rem. This is called **fluid typography**, and it often removes the need for several media queries. Related functions are \`min()\` and \`max()\`. Mixing in \`rem\` keeps text zoomable for accessibility.`,
          d: 'hard',
          at: 'Zoho, Freshworks',
          tip: 'Mention the mobile 100vh problem and dvh. It shows up-to-date knowledge.',
        },
      ],
    },
  ],
};

export default book;
